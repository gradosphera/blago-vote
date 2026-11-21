use crate::api::{self, Dao};
use crate::config::{self, Config};
use crate::formatter::*;
use crate::message::*;
use crate::state::*;
use crate::telegram::{self, send_message};
use std::collections::HashMap;
use std::path::Path;

/// Resolve a DAO entry (could be DAO address or proposal address)
async fn resolve_dao_entry(config: &Config, entry: &str) -> Option<Dao> {
    // Try as DAO address first
    if let Some(dao) = api::fetch_dao(config, entry).await {
        if dao.dao_proposals.as_ref().map(|p| !p.is_empty()).unwrap_or(false) {
            return Some(dao);
        }
    }
    
    // Not a DAO — find parent DAO by proposal address
    let all_daos = api::fetch_daos(config).await;
    for d in all_daos {
        if let Some(proposals) = &d.dao_proposals {
            if proposals.contains(&entry.to_string()) {
                return Some(d);
            }
        }
    }
    
    None
}

/// Get the list of DAOs to track
async fn get_dao_list(config: &Config) -> Vec<Dao> {
    let tracked = &config.dao_addresses;
    
    if !tracked.is_empty() {
        let mut by_addr = HashMap::new();
        for entry in tracked {
            if let Some(dao) = resolve_dao_entry(config, entry).await {
                if let Some(addr) = &dao.dao_address {
                    by_addr.insert(addr.clone(), dao);
                }
            }
        }
        return by_addr.into_values().collect();
    }
    
    api::fetch_daos(config).await
}

/// Get proposal status from metadata
fn get_proposal_status(metadata: &serde_json::Value) -> Option<ProposalStatus> {
    let now = chrono::Utc::now().timestamp() as u64;
    let start = metadata["proposalStartTime"].as_u64()? as u64;
    let end = metadata["proposalEndTime"].as_u64()? as u64;
    
    if now < start {
        Some(ProposalStatus::NotStarted)
    } else if now >= start && now < end {
        Some(ProposalStatus::Active)
    } else {
        Some(ProposalStatus::Closed)
    }
}

/// Build seed milestones for initial state
fn build_seed_milestones(metadata: &serde_json::Value) -> HashMap<String, u64> {
    let now = chrono::Utc::now().timestamp_millis() as u64;
    let start = metadata["proposalStartTime"].as_u64().unwrap_or(0) as u64 * 1000;
    let end = metadata["proposalEndTime"].as_u64().unwrap_or(0) as u64 * 1000;
    let mid = start + (end - start) / 2;
    let status = get_proposal_status(metadata);
    
    let mut m = HashMap::new();
    match status {
        Some(ProposalStatus::Active) => {
            m.insert("started".to_string(), now);
            if now >= mid {
                m.insert("mid".to_string(), now);
            }
        }
        Some(ProposalStatus::Closed) => {
            m.insert("started".to_string(), now);
            m.insert("mid".to_string(), now);
            m.insert("closed".to_string(), now);
        }
        _ => {}
    }
    m
}

/// Send message to channel and private chats
async fn send_to_all(
    config: &Config,
    text: &str,
    address: &str,
    _dao_name: &str,
) -> bool {
    let mut ok = false;
    let markup = open_app_markup(address, &config.webapp_url);
    
    if config.channel_id != 0 {
        if send_message(config, config.channel_id, text, Some(markup.clone())).await.is_some() {
            ok = true;
        }
    }
    
    for chat_id in &config.private_chat_ids {
        send_message(config, *chat_id, text, Some(markup.clone())).await;
    }
    
    ok
}

/// Core polling logic - check all proposals and send notifications for milestone changes
pub async fn poll_proposals(config: &Config, state: &mut State) -> usize {
    let dao_list = get_dao_list(config).await;
    let mut notifications_sent = 0;
    let now = chrono::Utc::now().timestamp_millis() as u64;
    
    for dao in &dao_list {
        let dao_name = parse_lang(
            &dao.dao_metadata
                .as_ref()
                .and_then(|d| d["metadataArgs"]["name"].as_str())
                .unwrap_or(""),
            "ru",
        );
        
        if let Some(proposals) = &dao.dao_proposals {
            for proposal_addr in proposals {
                let proposal = match api::fetch_proposal(config, proposal_addr).await {
                    Some(p) => p,
                    None => continue,
                };
                
                let meta = match proposal.metadata.as_ref() {
                    Some(m) => m,
                    None => continue,
                };
                
                // Skip test proposals
                let title = parse_lang(&meta["title"].as_str().unwrap_or(""), "ru");
                if title.to_lowercase().contains("тест") || title.to_lowercase().contains("test") {
                    continue;
                }
                
                let current_status = match get_proposal_status(meta) {
                    Some(s) => s,
                    None => continue,
                };
                
                let rec = state.proposals.entry(proposal_addr.clone()).or_insert(ProposalRecord {
                    status: current_status.clone(),
                    dao_name: dao_name.clone(),
                    last_check: now,
                    milestones: HashMap::new(),
                });
                
                let prev_status = rec.status.clone();
                let milestones = &mut rec.milestones;
                
                let start_ms = meta["proposalStartTime"].as_u64().unwrap_or(0) as u64 * 1000;
                let end_ms = meta["proposalEndTime"].as_u64().unwrap_or(0) as u64 * 1000;
                let mid_ms = start_ms + (end_ms - start_ms) / 2;
                
                // 1) "Voting started" - immediately after voting starts
                if current_status == ProposalStatus::Active 
                    && prev_status != ProposalStatus::Active 
                    && !milestones.contains_key("started") {
                    
                    let proposal_value = serde_json::to_value(&proposal).unwrap_or_default();
                    let text = build_start_message(config, &dao_name, &proposal_value, proposal_addr);
                    if send_to_all(config, &text, proposal_addr, &dao_name).await {
                        milestones.insert("started".to_string(), now);
                        notifications_sent += 1;
                        config::log(&format!("[START] {} ({})", proposal_addr, dao_name));
                    }
                }
                
                // 2) "Voting continues" - at the midpoint
                if current_status == ProposalStatus::Active 
                    && now >= mid_ms 
                    && !milestones.contains_key("mid") {
                    
                    let proposal_value = serde_json::to_value(&proposal).unwrap_or_default();
                    let text = build_mid_message(config, &dao_name, &proposal_value, proposal_addr);
                    if send_to_all(config, &text, proposal_addr, &dao_name).await {
                        milestones.insert("mid".to_string(), now);
                        notifications_sent += 1;
                        config::log(&format!("[MID] {} ({})", proposal_addr, dao_name));
                    }
                }
                
                // 3) "Voting ended" - after voting ends
                if current_status == ProposalStatus::Closed 
                    && prev_status != ProposalStatus::Closed 
                    && !milestones.contains_key("closed") {
                    
                    let proposal_value = serde_json::to_value(&proposal).unwrap_or_default();
                    let text = build_end_message(config, &dao_name, &proposal_value, proposal_addr);
                    if send_to_all(config, &text, proposal_addr, &dao_name).await {
                        milestones.insert("closed".to_string(), now);
                        notifications_sent += 1;
                        config::log(&format!("[END] {} ({})", proposal_addr, dao_name));
                    }
                }
                
                rec.status = current_status;
                rec.dao_name = dao_name.clone();
                rec.last_check = now;
            }
        }
    }
    
    notifications_sent
}

/// Run updates polling (commands /start, /help)
pub async fn run_updates_polling(config: &Config) {
    let mut offset: i64 = 0;
    let mut failures = 0;
    
    loop {
        let updates = telegram::get_updates(config, offset, 50, 25).await;
        failures = 0;
        
        for update in updates {
            if update.update_id >= offset {
                offset = update.update_id + 1;
                
                if let Some(ref msg) = update.message {
                    if let Some(ref text) = msg.text {
                        if msg.from.as_ref().map(|f| f.is_bot).unwrap_or(false) {
                            continue;
                        }
                        let chat_id = msg.chat.id;
                        crate::commands::handle_update(config, text, chat_id).await;
                    }
                }
            }
        }
        
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
}

/// Seed initial state from current proposals
pub async fn seed_state(config: &Config, state: &mut State, state_path: &Path) {
    config::log("Seeding current proposals...");
    
    let dao_list = get_dao_list(config).await;
    let mut seeded = 0;
    
    for dao in &dao_list {
        let dao_name = parse_lang(
            &dao.dao_metadata
                .as_ref()
                .and_then(|d| d["metadataArgs"]["name"].as_str())
                .unwrap_or(""),
            "ru",
        );
        
        if let Some(proposals) = &dao.dao_proposals {
            for proposal_addr in proposals {
                let proposal = match api::fetch_proposal(config, proposal_addr).await {
                    Some(p) => p,
                    None => continue,
                };
                
                let meta = match proposal.metadata.as_ref() {
                    Some(m) => m,
                    None => continue,
                };
                
                // Skip test proposals
                let title = parse_lang(&meta["title"].as_str().unwrap_or(""), "ru");
                if title.to_lowercase().contains("тест") || title.to_lowercase().contains("test") {
                    continue;
                }
                
                let status = match get_proposal_status(meta) {
                    Some(s) => s,
                    None => continue,
                };
                
                state.proposals.insert(proposal_addr.clone(), ProposalRecord {
                    status,
                    dao_name: dao_name.clone(),
                    last_check: chrono::Utc::now().timestamp_millis() as u64,
                    milestones: build_seed_milestones(meta),
                });
                seeded += 1;
            }
        }
    }
    
    state.seeded = true;
    save_state(state_path, state);
    config::log(&format!("Seeded {} proposals.", seeded));
}

/// Main tick function
pub async fn tick(config: &Config, state: &mut State, state_path: &Path) {
    match poll_proposals(config, state).await {
        sent if sent > 0 => {
            config::log(&format!("Sent {} notification(s)", sent));
            save_state(state_path, state);
        }
        _ => {}
    }
}
