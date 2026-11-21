use std::env;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct Config {
    pub bot_token: String,
    pub channel_id: i64,
    pub private_chat_ids: Vec<i64>,
    pub poll_interval: u64,
    pub dao_addresses: Vec<String>,
    pub send_latest: bool,
    pub api_base: String,
    pub telegram_api_base: String,
    pub proxy: Option<String>,
    pub port: u16,
    pub site_url: String,
    pub webapp_url: String,
    pub tonviewer: String,
}

impl Config {
    pub fn load() -> Self {
        // Load .env from project root (bot-rs/.env)
        let env_path = Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
        dotenv::from_path(env_path).ok();

        let env = |key: &str| -> String { env::var(key).unwrap_or_default() };

        let private_chat_ids: Vec<i64> = env("PRIVATE_CHAT_IDS")
            .split(',')
            .filter_map(|s| s.trim().parse().ok())
            .collect();

        let dao_addresses: Vec<String> = env("DAO_ADDRESS")
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        Config {
            bot_token: env("BOT_TOKEN"),
            channel_id: env("CHANNEL_ID").parse().unwrap_or(0),
            private_chat_ids,
            poll_interval: env("POLL_INTERVAL").parse().unwrap_or(60_000),
            dao_addresses,
            send_latest: env("SEND_LATEST") == "true",
            api_base: {
                let v = env("API_BASE");
                if v.is_empty() { "https://api.ton.vote".to_string() } else { v }
            },
            telegram_api_base: if env("TELEGRAM_API_BASE").is_empty() {
                "https://api.telegram.org".to_string()
            } else {
                env("TELEGRAM_API_BASE")
            },
            proxy: {
                let p = env("PROXY");
                if p.is_empty() { None } else { Some(p) }
            },
            port: env("PORT").parse().unwrap_or(0),
            site_url: "https://blago-vote.vercel.app".to_string(),
            webapp_url: if env("WEBAPP_URL").is_empty() {
                "https://t.me/gradosphera_vote_bot".to_string()
            } else {
                env("WEBAPP_URL")
            },
            tonviewer: "https://tonviewer.com".to_string(),
        }
    }
}

pub fn log(msg: &str) {
    let ts = chrono::Utc::now().format("%H:%M:%S");
    println!("[{}] {}", ts, msg);
}

pub fn validate_config(config: &Config) -> Result<(), String> {
    if config.bot_token.is_empty() {
        return Err("BOT_TOKEN is required. Set it in .env file.".to_string());
    }
    if config.channel_id == 0 {
        return Err("CHANNEL_ID is required. Set it in .env file.".to_string());
    }
    Ok(())
}
