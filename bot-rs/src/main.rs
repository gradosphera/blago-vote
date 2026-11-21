mod api;
mod commands;
mod config;
mod formatter;
mod message;
mod poller;
mod state;
mod telegram;

use config::{log, validate_config, Config};
use poller::{run_updates_polling, seed_state, tick};
use state::load_state;
use telegram::{check_proxy_reachable, get_me, set_my_commands};
use std::path::Path;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("bot_rs=info".parse().unwrap()),
        )
        .init();

    // Load configuration
    let config = Config::load();
    
    if let Err(e) = validate_config(&config) {
        eprintln!("Config error: {}", e);
        std::process::exit(1);
    }

    log("Starting bot...");

    // Check proxy if configured
    if let Some(ref proxy) = config.proxy {
        match check_proxy_reachable(proxy).await {
            result if result.ok => {
                log(&format!("Proxy OK: {}:{}", result.host, result.port));
            }
            result => {
                log(&format!(
                    "Proxy {} недоступен ({}). Если gost не запущен: systemctl --user start gost",
                    proxy, result.error
                ));
            }
        }
    } else {
        log("PROXY не задан. Если Telegram заблокирован в вашей сети, укажите PROXY=socks5h://... в .env");
    }

    // Try to get bot info with retries
    let mut bot_username = String::new();
    let mut last_error = String::new();
    
    for attempt in 1..=10 {
        match get_me(&config).await {
            Some(user) => {
                if let Some(username) = user.username {
                    bot_username = username;
                    break;
                }
            }
            None => {
                last_error = format!("(attempt {}/10)", attempt);
                log(&format!("getMe failed {}, retrying in 5s...", last_error));
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }
    }

    if bot_username.is_empty() {
        let error_msg = format!(
            "Failed to connect to Telegram after retries. BOT_TOKEN={}, proxy={}. {}",
            if !config.bot_token.is_empty() { "set" } else { "MISSING" },
            config.proxy.as_deref().unwrap_or("direct"),
            last_error
        );
        eprintln!("Fatal: {}", error_msg);
        std::process::exit(1);
    }

    log(&format!("Bot started: @{}", bot_username));

    // Load or initialize state
    let state_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("state.json");
    let mut state = load_state(&state_path);

    // Seed state on first run
    if !state.seeded {
        seed_state(&config, &mut state, &state_path).await;
    }

    // SEND_LATEST: publish latest active proposal on every startup
    if config.send_latest {
        log("SEND_LATEST is enabled but not yet implemented in Rust version");
    }

    // Run initial tick
    tick(&config, &mut state, &state_path).await;

    let hours = (config.poll_interval as f64 / 3600000.0).round();
    log(&format!("Polling every {}s ({:.1}h)", config.poll_interval, hours));

    // Register bot commands
    set_my_commands(
        &config,
        vec![
            ("start".to_string(), "Информация о платформе и запуск приложения".to_string()),
            ("help".to_string(), "Помощь и справка по боту".to_string()),
        ],
    )
    .await;

    // Start updates polling in background
    let config_clone = config.clone();
    tokio::spawn(async move {
        run_updates_polling(&config_clone).await;
    });

    // Main polling loop
    let poll_interval = std::time::Duration::from_millis(config.poll_interval);
    loop {
        tokio::time::sleep(poll_interval).await;
        tick(&config, &mut state, &state_path).await;
    }
}
