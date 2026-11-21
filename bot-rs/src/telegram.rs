use reqwest::Client;
use serde::Deserialize;
use tracing::{error, info, warn};

use crate::config::Config;

/// Telegram API response wrapper.
#[derive(Debug, Deserialize, Clone)]
pub struct TelegramResponse<T = serde_json::Value> {
    pub ok: bool,
    #[serde(default)]
    pub result: Option<T>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub is_bot: bool,
    pub username: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Message {
    pub message_id: i32,
    pub chat: Chat,
    pub text: Option<String>,
    pub from: Option<User>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Chat {
    pub id: i64,
    #[serde(rename = "type")]
    pub chat_type: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Update {
    pub update_id: i64,
    #[serde(default)]
    pub message: Option<Message>,
}

/// Build a reqwest Client configured for Telegram API.
fn build_client(timeout_ms: u64, proxy: Option<&str>) -> Client {
    let mut builder = Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms));

    if let Some(proxy_str) = proxy {
        if let Ok(proxy) = reqwest::Proxy::all(proxy_str) {
            builder = builder.proxy(proxy);
        } else {
            warn!("Failed to create proxy for Telegram client: {}", proxy_str);
        }
    }

    builder.build().expect("Failed to build Telegram HTTP client")
}

/// Check if an error is transient and worth retrying.
fn is_transient_network_error(err: &reqwest::Error) -> bool {
    if err.is_timeout() {
        return true;
    }
    
    // Check for connection reset, pipe, etc.
    let detail = err.to_string().to_lowercase();
    detail.contains("connection reset")
        || detail.contains("broken pipe")
        || detail.contains("net unreachable")
        || detail.contains("net down")
        || detail.contains("socket hang up")
        || detail.contains("fetch failed")
        || detail.contains("econnreset")
        || detail.contains("epipe")
        || detail.contains("enetunreach")
        || detail.contains("enetdown")
        || detail.contains("eaagain")
}

/// Make a request to the Telegram Bot API with retries.
async fn request(client: &Client, method: &str, token: &str, data: &serde_json::Value, retries: u32) -> Option<serde_json::Value> {
    let url = format!("https://api.telegram.org/bot{}{}", token, method);

    for attempt in 0..=retries {
        match client.post(&url).json(data).send().await {
            Ok(resp) => {
                match resp.json::<TelegramResponse>().await {
                    Ok(response) => {
                        if response.ok {
                            return response.result;
                        } else {
                            info!("Telegram API error [{}]: {}", method, response.description.unwrap_or_default());
                            return None;
                        }
                    }
                    Err(e) => {
                        warn!("Failed to parse Telegram response [{}]: {}", method, e);
                        return None;
                    }
                }
            }
            Err(err) => {
                let detail = err.to_string();
                
                if is_transient_network_error(&err) && attempt < retries {
                    let wait_ms = 1500_u64 * (attempt + 1) as u64;
                    warn!("Telegram API request failed [{}]: {} (retry {}/{} in {}ms)", 
                          method, detail, attempt + 1, retries, wait_ms);
                    tokio::time::sleep(std::time::Duration::from_millis(wait_ms)).await;
                    continue;
                }
                
                error!("Telegram API request failed [{}]: {}", method, detail);
                return None;
            }
        }
    }
    
    None
}

/// Get bot info (getMe).
pub async fn get_me(config: &Config) -> Option<User> {
    match request(
        &build_client(10_000, config.proxy.as_deref()),
        "getMe",
        &config.bot_token,
        &serde_json::json!({}),
        0,
    ).await {
        Some(serde_json::Value::Object(obj)) => {
            serde_json::from_value::<User>(serde_json::Value::Object(obj)).ok()
        }
        _ => None,
    }
}

/// Send a text message.
pub async fn send_message(
    config: &Config,
    chat_id: i64,
    text: &str,
    extra: Option<serde_json::Value>,
) -> Option<serde_json::Value> {
    let mut data = serde_json::json!({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": true,
    });

    if let Some(extra_obj) = extra {
        if let Some(obj) = data.as_object_mut() {
            if let Some(extra_obj) = extra_obj.as_object() {
                for (k, v) in extra_obj {
                    obj.insert(k.clone(), v.clone());
                }
            }
        }
    }

    request(
        &build_client(40_000, config.proxy.as_deref()),
        "sendMessage",
        &config.bot_token,
        &data,
        2,
    ).await
}

/// Send a photo with caption.
pub async fn send_photo(
    config: &Config,
    chat_id: i64,
    photo: &str,
    caption: &str,
    extra: Option<serde_json::Value>,
) -> Option<serde_json::Value> {
    let mut data = serde_json::json!({
        "chat_id": chat_id,
        "photo": photo,
        "caption": caption,
        "parse_mode": "HTML",
        "disable_web_page_preview": true,
    });

    if let Some(extra_obj) = extra {
        if let Some(obj) = data.as_object_mut() {
            if let Some(extra_obj) = extra_obj.as_object() {
                for (k, v) in extra_obj {
                    obj.insert(k.clone(), v.clone());
                }
            }
        }
    }

    request(
        &build_client(40_000, config.proxy.as_deref()),
        "sendPhoto",
        &config.bot_token,
        &data,
        2,
    ).await
}

/// Edit a message text.
pub async fn edit_message(
    config: &Config,
    chat_id: i64,
    message_id: i32,
    text: &str,
    extra: Option<serde_json::Value>,
) -> Option<serde_json::Value> {
    let mut data = serde_json::json!({
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": true,
    });

    if let Some(extra_obj) = extra {
        if let Some(obj) = data.as_object_mut() {
            if let Some(extra_obj) = extra_obj.as_object() {
                for (k, v) in extra_obj {
                    obj.insert(k.clone(), v.clone());
                }
            }
        }
    }

    request(
        &build_client(40_000, config.proxy.as_deref()),
        "editMessageText",
        &config.bot_token,
        &data,
        2,
    ).await
}

/// Long-polling for updates (getUpdates with extended timeout).
pub async fn get_updates(
    config: &Config,
    offset: i64,
    limit: i64,
    timeout: i64,
) -> Vec<Update> {
    let data = serde_json::json!({
        "offset": offset,
        "limit": limit,
        "timeout": timeout,
    });

    match request(
        &build_client(60_000, config.proxy.as_deref()),
        "getUpdates",
        &config.bot_token,
        &data,
        2,
    ).await {
        Some(serde_json::Value::Array(updates)) => {
            updates
                .into_iter()
                .filter_map(|u| serde_json::from_value::<Update>(u).ok())
                .collect()
        }
        Some(_) => Vec::new(),
        None => Vec::new(),
    }
}

/// Set bot commands (shown in "/" menu).
pub async fn set_my_commands(
    config: &Config,
    commands: Vec<(String, String)>,
) -> bool {
    let data = serde_json::json!({
        "commands": commands.into_iter().map(|(c, d)| {
            serde_json::json!({"command": c, "description": d})
        }).collect::<Vec<_>>(),
    });

    match request(
        &build_client(10_000, config.proxy.as_deref()),
        "setMyCommands",
        &config.bot_token,
        &data,
        0,
    ).await {
        Some(serde_json::Value::Bool(b)) => b,
        Some(serde_json::Value::Object(_)) => true,
        _ => false,
    }
}

/// Check if a SOCKS5 proxy is reachable.
pub async fn check_proxy_reachable(proxy_url: &str) -> ProxyCheckResult {
    use tokio::net::TcpStream;
    
    let parsed = match url::Url::parse(proxy_url) {
        Ok(u) => u,
        Err(_) => return ProxyCheckResult {
            ok: false,
            host: "127.0.0.1".to_string(),
            port: 9100,
            error: "Invalid proxy URL".to_string(),
        },
    };

    let host = parsed.host_str().unwrap_or("127.0.0.1").to_string();
    let port = parsed.port().unwrap_or(9100);

    match tokio::time::timeout(
        std::time::Duration::from_secs(3),
        TcpStream::connect(format!("{}:{}", host, port))
    ).await {
        Ok(Ok(_)) => ProxyCheckResult {
            ok: true,
            host,
            port,
            error: String::new(),
        },
        Ok(Err(e)) => ProxyCheckResult {
            ok: false,
            host,
            port,
            error: e.to_string(),
        },
        Err(_) => ProxyCheckResult {
            ok: false,
            host,
            port,
            error: "timeout".to_string(),
        },
    }
}

#[derive(Debug, Clone)]
pub struct ProxyCheckResult {
    pub ok: bool,
    pub host: String,
    pub port: u16,
    pub error: String,
}
