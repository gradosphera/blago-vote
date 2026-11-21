use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::config::log;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProposalStatus {
    NotStarted,
    Active,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalRecord {
    pub status: ProposalStatus,
    pub dao_name: String,
    pub last_check: u64,
    pub milestones: HashMap<String, u64>, // started, mid, closed
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct State {
    pub seeded: bool,
    #[serde(default = "default_last_startup_publish")]
    #[serde(rename = "lastStartupPublish")]
    pub last_startup_publish: Option<String>,
    #[serde(default)]
    pub proposals: HashMap<String, ProposalRecord>,
}

fn default_last_startup_publish() -> Option<String> {
    None
}

impl Default for State {
    fn default() -> Self {
        State {
            seeded: false,
            last_startup_publish: None,
            proposals: HashMap::new(),
        }
    }
}

/// Load state from state.json file.
pub fn load_state(path: &Path) -> State {
    match fs::read_to_string(path) {
        Ok(contents) => {
            match serde_json::from_str::<State>(&contents) {
                Ok(state) => {
                    log(&format!("Loaded state with {} proposals", state.proposals.len()));
                    state
                }
                Err(e) => {
                    log(&format!("Failed to parse state.json: {}, using empty state", e));
                    State::default()
                }
            }
        }
        Err(_) => {
            log("No state.json found, starting fresh");
            State::default()
        }
    }
}

/// Save state to state.json file.
pub fn save_state(path: &Path, state: &State) {
    match fs::write(path, serde_json::to_string_pretty(state).unwrap_or_default()) {
        Ok(_) => {}
        Err(e) => {
            log(&format!("Failed to save state: {}", e));
        }
    }
}
