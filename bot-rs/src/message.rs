use crate::formatter::*;
use crate::config::Config;

const BLAGO_JETTON_ADDRESS: &str = "EQBlaryI1HCY6hIlW9giBoqKGtuMHfxlULZOhD6UyzpqLcll";
const QUORUM_PERCENT: u32 = 66;

/// Extract a field from markdown-like text: "**FieldName:** value"
fn extract_field(text: &str, field_name: &str) -> (String, String) {
    let prefix = format!("**{}:**", field_name);
    let lines: Vec<&str> = text.split('\n').collect();
    let mut value = String::new();
    let mut rest: Vec<&str> = Vec::new();
    
    for line in lines {
        if line.contains(&prefix) {
            value = line[line.find(&prefix).unwrap() + prefix.len()..].trim().to_string();
        } else {
            rest.push(line);
        }
    }
    
    (value, rest.join("\n"))
}

/// Strip a field from text
fn strip_field(text: &str, field_name: &str) -> String {
    let prefix = format!("**{}:**", field_name);
    text.split('\n')
        .filter(|line| !line.contains(&prefix))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Convert markdown to HTML using regex
fn md_to_html(md: &str) -> String {
    if md.is_empty() {
        return String::new();
    }
    
    use regex::Regex;
    let mut result = md.to_string();
    
    // Bold **text**
    let re = Regex::new(r"\*\*(.+?)\*\*").unwrap();
    result = re.replace_all(&result, "<b>$1</b>").to_string();
    
    // Bold __text__
    let re = Regex::new(r"__(.+?)__").unwrap();
    result = re.replace_all(&result, "<b>$1</b>").to_string();
    
    // Code `text`
    let re = Regex::new(r"`(.+?)`").unwrap();
    result = re.replace_all(&result, "<code>$1</code>").to_string();
    
    // Links [text](url)
    let re = Regex::new(r"\[(.+?)\]\((.+?)\)").unwrap();
    result = re.replace_all(&result, "<a href=\"$2\">$1</a>").to_string();
    
    result
}

/// Strip HTML tags
fn strip_tags(html: &str) -> String {
    use regex::Regex;
    let re = Regex::new(r"<[^>]*>").unwrap();
    re.replace_all(html, "").to_string()
}

/// Shorten text with optional "read more" link
fn shorten(text: &str, max_len: usize, link: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    if text.len() <= max_len {
        return text.to_string();
    }
    let truncated = text[..max_len.min(text.len())].to_string() + "...";
    if !link.is_empty() {
        format!("{} <a href=\"{}\">читать далее</a>", truncated, link)
    } else {
        truncated
    }
}

/// Format a leader address as a tonviewer link
fn format_leader(addr: &str, tonviewer_base: &str) -> String {
    if addr.is_empty() {
        return String::new();
    }
    let short = format!("{}...{}", &addr[..6.min(addr.len())], &addr[addr.len().saturating_sub(4)..]);
    let link = tonviewer_link(tonviewer_base, addr);
    format!("<a href=\"{}\"><code>{}</code></a>", link, short)
}

/// Get choices array from metadata
fn get_choices(meta: &serde_json::Value) -> Vec<String> {
    meta["votingSystem"]["choices"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

/// Build message for a new proposal
pub fn build_new_proposal_message(
    config: &Config,
    dao_name: &str,
    proposal: &serde_json::Value,
    addr: &str,
) -> String {
    let meta = proposal.get("metadata").unwrap_or(&serde_json::Value::Null);
    let title = parse_lang(&meta["title"].as_str().unwrap_or(""), "ru");
    let raw_desc = parse_lang(&meta["description"].as_str().unwrap_or(""), "ru");
    
    let (leader, desc_rest) = extract_field(&raw_desc, "Ведущий/руководитель");
    let description = shorten(
        &strip_tags(&md_to_html(&strip_field(&desc_rest, "Место проведения"))),
        350,
        &proposal_link(&config.site_url, addr),
    );
    
    let start_time = format_date(meta["proposalStartTime"].as_u64().unwrap_or(0) as u64);
    let end_time = format_date(meta["proposalEndTime"].as_u64().unwrap_or(0) as u64);
    let choices = get_choices(meta);
    
    // Determine status
    let now = chrono::Utc::now().timestamp() as u64;
    let start = meta["proposalStartTime"].as_u64().unwrap_or(0) as u64;
    let end = meta["proposalEndTime"].as_u64().unwrap_or(0) as u64;
    
    let status_text = if now < start {
        "⏳ Ожидается"
    } else if now >= start && now < end {
        "🗳 Идёт голосование"
    } else {
        "✅ Завершено"
    };
    
    let mut lines = vec![
        "<b>📋 Новое предложение</b>".to_string(),
        format!("<b>{}</b>", dao_name),
        format!("<b>Предложение:</b> <a href=\"{}\">{}</a>", 
                proposal_link(&config.site_url, addr),
                if title.is_empty() { short_addr(addr) } else { title }),
    ];
    
    if !description.is_empty() {
        lines.push(format!("<blockquote>{}</blockquote>", description));
    }
    if !leader.is_empty() {
        lines.push(format!("<b>Ведущий/руководитель:</b> {}", format_leader(&leader, &config.tonviewer)));
    }
    lines.push(format!("<b>Статус:</b> {}", status_text));
    
    if !choices.is_empty() {
        lines.push(String::new());
        lines.push("<b>Варианты:</b>".to_string());
        for c in &choices {
            lines.push(format!("  ☐ {}", c));
        }
    }
    
    lines.push(String::new());
    lines.push(format!("<b>Начало:</b> {}", start_time));
    lines.push(format!("<b>Окончание:</b> {}", end_time));
    lines.push(String::new());
    lines.push(format!("<a href=\"{}\">🔍 Проводник</a>", tonviewer_link(&config.tonviewer, addr)));
    
    lines.join("\n")
}

/// Build message when voting starts
pub fn build_start_message(
    config: &Config,
    dao_name: &str,
    proposal: &serde_json::Value,
    addr: &str,
) -> String {
    let meta = proposal.get("metadata").unwrap_or(&serde_json::Value::Null);
    let title = parse_lang(&meta["title"].as_str().unwrap_or(""), "ru");
    let raw_desc = parse_lang(&meta["description"].as_str().unwrap_or(""), "ru");
    
    let (leader, desc_rest) = extract_field(&raw_desc, "Ведущий/руководитель");
    let description = shorten(
        &strip_tags(&md_to_html(&strip_field(&desc_rest, "Место проведения"))),
        350,
        &proposal_link(&config.site_url, addr),
    );
    
    let start_time = format_date(meta["proposalStartTime"].as_u64().unwrap_or(0) as u64);
    let end_time = format_date(meta["proposalEndTime"].as_u64().unwrap_or(0) as u64);
    let choices = get_choices(meta);
    
    let mut lines = vec![
        "<b>🗳 Голосование начато</b>".to_string(),
        String::new(),
        format!("<b>{}</b>", dao_name),
        format!("<b>Предложение:</b> <a href=\"{}\">{}</a>", 
                proposal_link(&config.site_url, addr),
                if title.is_empty() { short_addr(addr) } else { title }),
        "<b>Статус:</b> 🗳 Начато голосование".to_string(),
    ];
    
    if !description.is_empty() {
        lines.push(format!("<blockquote>{}</blockquote>", description));
    }
    if !leader.is_empty() {
        lines.push(format!("<b>Ведущий/руководитель:</b> {}", format_leader(&leader, &config.tonviewer)));
    }
    
    if !choices.is_empty() {
        lines.push(String::new());
        lines.push("<b>Варианты:</b>".to_string());
        for c in &choices {
            lines.push(format!("  ☐ {}", c));
        }
    }
    
    lines.push(String::new());
    lines.push(format!("<b>Начало:</b> {}", start_time));
    lines.push(format!("<b>Окончание:</b> {}", end_time));
    lines.push(String::new());
    lines.push(format!("<a href=\"{}\">🔍 Проводник</a>", tonviewer_link(&config.tonviewer, addr)));
    
    lines.join("\n")
}

/// Build mid-voting message ("voting continues")
pub fn build_mid_message(
    config: &Config,
    dao_name: &str,
    proposal: &serde_json::Value,
    addr: &str,
) -> String {
    let meta = proposal.get("metadata").unwrap_or(&serde_json::Value::Null);
    let title = parse_lang(&meta["title"].as_str().unwrap_or(""), "ru");
    let start_time = format_date(meta["proposalStartTime"].as_u64().unwrap_or(0) as u64);
    let end_time = format_date(meta["proposalEndTime"].as_u64().unwrap_or(0) as u64);
    
    vec![
        "<b>🗳 Голосование продолжается</b>".to_string(),
        String::new(),
        format!("<b>{}</b>", dao_name),
        format!("<b>Предложение:</b> <a href=\"{}\">{}</a>", 
                proposal_link(&config.site_url, addr),
                if title.is_empty() { short_addr(addr) } else { title }),
        "<b>Статус:</b> 📣 Голосование продолжается".to_string(),
        String::new(),
        format!("<b>Начало:</b> {}", start_time),
        format!("<b>Окончание:</b> {}", end_time),
        String::new(),
        format!("<a href=\"{}\">🗳 Проголосовать</a>", proposal_link(&config.site_url, addr)),
    ].join("\n")
}

/// Build end voting message with results
pub fn build_end_message(
    config: &Config,
    dao_name: &str,
    proposal: &serde_json::Value,
    addr: &str,
) -> String {
    let meta = proposal.get("metadata").unwrap_or(&serde_json::Value::Null);
    let title = parse_lang(&meta["title"].as_str().unwrap_or(""), "ru");
    let raw_desc = parse_lang(&meta["description"].as_str().unwrap_or(""), "ru");
    
    let (leader, desc_rest) = extract_field(&raw_desc, "Ведущий/руководитель");
    let description = shorten(
        &strip_tags(&md_to_html(&strip_field(&desc_rest, "Место проведения"))),
        350,
        &proposal_link(&config.site_url, addr),
    );
    
    let choices = get_choices(meta);
    
    let result = proposal.get("proposalResult").unwrap_or(&serde_json::Value::Null);
    let total_weight = result["totalWeight"].as_str()
        .or_else(|| result["totalWeights"].as_str())
        .unwrap_or("0");
    
    // Count votes
    let total_votes = proposal.get("votes")
        .and_then(|v| v.as_object())
        .map(|obj| obj.len())
        .unwrap_or(0);
    
    // Calculate percentages
    let percents: Vec<f64> = choices.iter().map(|c| {
        result[c.as_str()].as_f64()
            .or_else(|| result[c.to_lowercase().as_str()].as_f64())
            .unwrap_or(0.0)
    }).collect();
    
    let winner_percent = percents.iter().cloned().fold(0.0, f64::max);
    let is_quorum_passed = winner_percent >= QUORUM_PERCENT as f64;
    
    let mut lines = vec![
        "<b>⏰ Голосование завершено</b>".to_string(),
        String::new(),
        format!("<b>{}</b>", dao_name),
        format!("<b>Предложение:</b> <a href=\"{}\">{}</a>", 
                proposal_link(&config.site_url, addr),
                if title.is_empty() { short_addr(addr) } else { title }),
        "<b>Статус:</b> ⏰ Голосование завершено".to_string(),
    ];
    
    if !description.is_empty() {
        lines.push(format!("<blockquote>{}</blockquote>", description));
    }
    if !leader.is_empty() {
        lines.push(format!("<b>Ведущий/руководитель:</b> {}", format_leader(&leader, &config.tonviewer)));
    }
    
    lines.push(String::new());
    lines.push(format!("<b>Начало:</b> {}", format_date(meta["proposalStartTime"].as_u64().unwrap_or(0) as u64)));
    lines.push(format!("<b>Окончание:</b> {}", format_date(meta["proposalEndTime"].as_u64().unwrap_or(0) as u64)));
    
    if is_quorum_passed {
        lines.push("<b>Кворум 2/3 пройден ✅</b>".to_string());
    } else {
        lines.push("<b>Кворум 2/3 не пройден ❌</b>".to_string());
    }
    
    lines.push(String::new());
    lines.push("<b>Результаты:</b>".to_string());
    
    for (i, choice) in choices.iter().enumerate() {
        let pct = percents.get(i).copied().unwrap_or(0.0);
        lines.push(format!("  <b>{}</b>: {:.2}%", choice, pct));
    }
    
    lines.push(String::new());
    lines.push(format!("<b>Всего голосов:</b> {}", total_votes));
    lines.push(format_total_weight(&config.tonviewer, BLAGO_JETTON_ADDRESS, total_weight));
    lines.push(String::new());
    lines.push(format!("<a href=\"{}\">📊 Подробнее</a>", proposal_link(&config.site_url, addr)));
    
    lines.join("\n")
}
