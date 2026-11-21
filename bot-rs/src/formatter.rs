use chrono_tz::Europe::Moscow;

/// Convert nano-unit string to human-readable decimal string.
/// Input: string in nano-units (like BigInt-compatible integer)
/// 1 token = 10^9 nano-units
/// Strips trailing zeros in fractional part.
pub fn from_nano(value: &str) -> String {
    let s = value.trim();
    if s.is_empty() || s == "0" || s == "." {
        return "0".to_string();
    }

    let s = if s.starts_with('.') {
        format!("0{}", s)
    } else {
        s.to_string()
    };

    let (int_part, frac_part) = if let Some((a, b)) = s.split_once('.') {
        (a.to_string(), b.to_string())
    } else {
        (s.clone(), String::new())
    };

    let raw = format!("{}{}", int_part, frac_part);
    let raw = raw.trim_start_matches('-');
    let is_negative = s.starts_with('-');

    // Pad to at least 10 chars (9 fractional + 1 integer)
    let padded = raw.len().max(10);
    let scaled = format!("{:0>width$}", raw, width = padded);

    let int_len = scaled.len() - 9;
    let int = scaled[..int_len].to_string();
    let frac = scaled[int_len..].trim_end_matches('0').to_string();

    let result = if frac.is_empty() {
        int
    } else {
        format!("{}.{}", int, frac)
    };

    if is_negative {
        format!("-{}", result)
    } else {
        result
    }
}

/// Strip trailing zeros from a decimal string like "1.50000" -> "1.5"
fn strip_trailing_zeros(s: &str) -> String {
    if let Some(dot_pos) = s.find('.') {
        let frac = &s[dot_pos + 1..];
        let trimmed = frac.trim_end_matches('0');
        if trimmed.is_empty() {
            s[..dot_pos].to_string()
        } else {
            format!("{}.{}", &s[..dot_pos], trimmed)
        }
    } else {
        s.to_string()
    }
}

/// Human-readable token format: "12.33 тыс.", "1.23 млн.", etc.
/// Same algorithm as src/utils.ts nFormatter.
pub fn format_tokens(value: f64) -> String {
    let num = value;
    
    // For numbers < 1, show 5 decimal places
    if num < 1.0 {
        let formatted = format!("{:.5}", value);
        return strip_trailing_zeros(&formatted);
    }

    let lookup: Vec<(f64, &str)> = vec![
        (1e15, " квадрлн."),
        (1e12, " трлн."),
        (1e9, " млрд."),
        (1e6, " млн."),
        (1e3, " тыс."),
        (1.0, ""),
    ];

    for (val, symbol) in &lookup {
        if num >= *val {
            let formatted = format!("{:.2}", value / val);
            let formatted = strip_trailing_zeros(&formatted);
            return format!("{}{}", formatted, symbol);
        }
    }

    "0".to_string()
}

/// Format Unix timestamp (seconds) to DD.MM.YYYY HH:MM in Europe/Moscow timezone.
pub fn format_date(unix_seconds: u64) -> String {
    if unix_seconds == 0 {
        return "—".to_string();
    }
    
    let dt = chrono::DateTime::from_timestamp(unix_seconds as i64, 0);
    match dt {
        Some(dt) => {
            let moscow = dt.with_timezone(&Moscow);
            moscow.format("%d.%m.%Y %H:%M").to_string()
        }
        None => "—".to_string(),
    }
}

/// Parse localized text from JSON metadata.
/// Fallback: ru → en → first value → raw string.
pub fn parse_lang(json: &str, lang: &str) -> String {
    if json.trim().is_empty() {
        return String::new();
    }

    match serde_json::from_str::<serde_json::Value>(json) {
        Ok(parsed) => {
            if let Some(obj) = parsed.as_object() {
                // Try requested language, then English, then first value
                if let Some(v) = obj.get(lang) {
                    if let Some(s) = v.as_str() {
                        return s.trim().to_string();
                    }
                }
                if let Some(v) = obj.get("en") {
                    if let Some(s) = v.as_str() {
                        return s.trim().to_string();
                    }
                }
                // First value in insertion order
                for v in obj.values() {
                    if let Some(s) = v.as_str() {
                        return s.trim().to_string();
                    }
                }
            } else if let Some(s) = parsed.as_str() {
                return s.trim().to_string();
            }
        }
        Err(_) => {
            return json.trim().to_string();
        }
    }

    String::new()
}

/// Shorten address: "EQBlar...cll"
pub fn short_addr(addr: &str) -> String {
    if addr.is_empty() {
        return "—".to_string();
    }
    let len = addr.len();
    if len <= 10 {
        addr.to_string()
    } else {
        format!("{}...{}", &addr[..6], &addr[len - 4..])
    }
}

/// Create a link to the proposal page.
pub fn proposal_link(site_url: &str, address: &str) -> String {
    format!("{}/proposal/{}", site_url, address)
}

/// Create a link to tonviewer.
pub fn tonviewer_link(tonviewer_base: &str, address: &str) -> String {
    format!("{}/{}", tonviewer_base, address)
}

/// Format total weight with token info and link.
pub fn format_total_weight(tonviewer_base: &str, blago_address: &str, total_weight: &str) -> String {
    let tokens = from_nano(total_weight);
    let link = tonviewer_link(tonviewer_base, blago_address);
    format!(
        "<b>Общий вес:</b> {} Благо (<a href=\"{}\">жетон Благо</a>)",
        format_tokens(tokens.parse::<f64>().unwrap_or(0.0)),
        link
    )
}

/// Deep link to Telegram WebApp for a specific proposal.
pub fn webapp_proposal_link(webapp_url: &str, address: &str) -> String {
    format!("{}/vote?startapp={}", webapp_url, address)
}

/// Inline keyboard markup to open a proposal in the app.
pub fn open_app_markup(address: &str, webapp_url: &str) -> serde_json::Value {
    let url = webapp_proposal_link(webapp_url, address);
    serde_json::json!({
        "inline_keyboard": [[{
            "text": "📋 Открыть в приложении",
            "url": url
        }]]
    })
}

/// Check if a proposal is a test proposal (title contains "тест" or "test").
pub fn is_test_proposal(metadata_json: &str) -> bool {
    let title = parse_lang(metadata_json, "ru");
    let lower = title.to_lowercase();
    lower.contains("тест") || lower.contains("test")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_nano_basic() {
        assert_eq!(from_nano("0"), "0");
        assert_eq!(from_nano("1000000000"), "1");
        assert_eq!(from_nano("1234567890"), "1.23456789");
        assert_eq!(from_nano("10000000000"), "10");
        assert_eq!(from_nano("1234567890123456789"), "1234567890.123456789");
        assert_eq!(from_nano("1"), "0.000000001");
        assert_eq!(from_nano("1500000000"), "1.5");
        assert_eq!(from_nano("15000000000"), "15");
        assert_eq!(from_nano("15000000000000"), "15000");
    }

    #[test]
    fn test_from_nano_edge_cases() {
        assert_eq!(from_nano(""), "0");
        assert_eq!(from_nano("  "), "0");
        assert_eq!(from_nano("123"), "0.000000123");
        assert_eq!(from_nano("999999999999999999"), "999999999.999999999");
    }

    #[test]
    fn test_format_tokens_basic() {
        assert_eq!(format_tokens(0.0), "0");
        assert_eq!(format_tokens(1500.0), "1.5 тыс.");
        assert_eq!(format_tokens(1234567.0), "1.23 млн.");
        assert_eq!(format_tokens(1234567890.0), "1.23 млрд.");
        assert_eq!(format_tokens(1234567890123.0), "1.23 трлн.");
    }

    #[test]
    fn test_format_tokens_small() {
        // Numbers < 1: trailing zeros stripped by regex
        let result = format_tokens(0.5);
        assert_eq!(result, "0.5");
    }

    #[test]
    fn test_format_tokens_strip_zeros() {
        assert_eq!(format_tokens(1000.0), "1 тыс.");
        assert_eq!(format_tokens(2000.0), "2 тыс.");
        assert_eq!(format_tokens(1500.0), "1.5 тыс.");
    }

    #[test]
    fn test_format_date() {
        // 2024-01-15 14:00:00 UTC = 2024-01-15 17:00:00 Moscow (UTC+3)
        let result = format_date(1705327200);
        assert_eq!(result, "15.01.2024 17:00");
    }

    #[test]
    fn test_format_date_zero() {
        assert_eq!(format_date(0), "—");
    }

    #[test]
    fn test_parse_lang() {
        let json = r#"{"ru":"Привет","en":"Hello"}"#;
        assert_eq!(parse_lang(json, "ru"), "Привет");
        assert_eq!(parse_lang(json, "en"), "Hello");
        assert_eq!(parse_lang(json, "de"), "Hello"); // fallback to en, then first

        let json2 = r#"{"en":"Hello"}"#;
        assert_eq!(parse_lang(json2, "ru"), "Hello"); // fallback to en

        let json3 = r#"{"only":"value"}"#;
        assert_eq!(parse_lang(json3, "ru"), "value"); // fallback to first

        // Plain string
        assert_eq!(parse_lang("Plain text", "ru"), "Plain text");
    }

    #[test]
    fn test_parse_lang_invalid_json() {
        assert_eq!(parse_lang("{invalid}", "ru"), "{invalid}");
    }

    #[test]
    fn test_short_addr() {
        assert_eq!(short_addr("EQBlaryI1HCY6hIlW9giBoqKGtuMHfxlULZOhD6UyzpqLcll"), "EQBlar...Lcll");
        assert_eq!(short_addr(""), "—");
        assert_eq!(short_addr("EQ1234"), "EQ1234");
    }

    #[test]
    fn test_is_test_proposal() {
        let meta = r#"{"ru":"Тестовое голосование"}"#;
        assert!(is_test_proposal(meta));

        let meta2 = r#"{"en":"Test proposal"}"#;
        assert!(is_test_proposal(meta2));

        let meta3 = r#"{"ru":"Настоящее голосование"}"#;
        assert!(!is_test_proposal(meta3));
    }
}
