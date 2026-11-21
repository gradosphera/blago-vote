use crate::config::Config;
use crate::telegram::{send_message, send_photo};

const START_PHOTO_URL: &str = "https://raw.githubusercontent.com/gradosphera/brand-assets/refs/heads/main/vote/640x360_bot.jpg";

/// Get the WebApp link (without proposal address)
fn webapp_link(config: &Config) -> String {
    format!("{}/vote", config.webapp_url)
}

/// Build the inline keyboard for /start command
fn start_markup(config: &Config) -> serde_json::Value {
    serde_json::json!({
        "inline_keyboard": [
            [{
                "text": "🚀 Открыть Платформу Голос",
                "url": webapp_link(config)
            }],
            [{
                "text": "🌐 Сайт платформы",
                "url": config.site_url.clone()
            }]
        ]
    })
}

/// Build the text for /start command
fn start_text() -> String {
    vec![
        "<b>🏛 Платформа «Голос»</b> — децентрализованная платформа управления (governance), работающая на блокчейне <b>TON</b>.",
        "",
        "Здесь решения принимают сообщества голосованием: каждый участник может <b>выдвинуть предложение</b>, <b>обсудить</b> его и <b>проголосовать</b> — открыто, прозрачно и без посредников.",
        "",
        "<b>Как это работает:</b>",
        "• Предложения публикуются от имени ДАО и доступны всем участникам;",
        "• Голосование учитывает вес голоса (в т.ч. жетонов, таких как «Благо»);",
        "• Результаты подводятся автоматически по итогам периода голосования.",
        "",
        "<i>Нажмите «🚀 Открыть Платформу Голос», чтобы перейти в приложение.</i>",
    ].join("\n")
}

/// Build the text for /help command
fn help_text() -> String {
    vec![
        "<b>ℹ️ Помощь</b>",
        "",
        "Это бот платформы децентрализованного управления «Голос» на блокчейне TON.",
        "",
        "<b>Команды:</b>",
        "• <code>/start</code> — информация о платформе и запуск приложения;",
        "• <code>/help</code> — эта справка.",
        "",
        "<b>Что умеет бот:</b>",
        "• Уведомляет о новых предложениях и голосованиях;",
        "• Сообщает о старте и завершении голосований с результатами;",
        "• Открывает конкретное предложение прямо в Mini App.",
        "",
        "Возникли вопросы? Обратитесь в сообщество вашего ДАО или на сайт платформы.",
    ].join("\n")
}

/// Handle an incoming update (message/command from user)
pub async fn handle_update(config: &Config, update_text: &str, chat_id: i64) {
    let text = update_text.trim();
    
    if text == "/start" {
        let ok = send_photo(
            config,
            chat_id,
            START_PHOTO_URL,
            &start_text(),
            Some(start_markup(config)),
        ).await;
        if ok.is_some() {
            crate::config::log(&format!("[cmd] /start → chat {}", chat_id));
        }
        return;
    }
    
    if text == "/help" {
        let ok = send_message(config, chat_id, &help_text(), None).await;
        if ok.is_some() {
            crate::config::log(&format!("[cmd] /help → chat {}", chat_id));
        }
    }
}
