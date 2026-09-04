# Telegram-бот «Голос» — запуск и прокси

Бот читает `BOT_TOKEN`, `CHANNEL_ID` и `PROXY` из `bot/.env` (см. `bot/.env.example`).
Для отправки уведомлений в Telegram требуется рабочий **SOCKS5-прокси** — без него бот
не подключится и будет выдавать ошибку `Failed to connect to Telegram` (GETME fails).

## Команды бота

Бот отвечает на команды в личных чатах (long-polling `getUpdates`):

- `/start` — изображение и общая информация о платформе «Голос» + кнопка запуска Mini App;
- `/help` — справка по возможностям бота.

Команды автоматически регистрируются в меню `/` через `setMyCommands`.

Помимо этого бот уведомляет о новых, начавшихся и завершённых голосованиях, а кнопка
«📋 Открыть в приложении» запускает Telegram Mini App сразу на странице конкретного предложения.


## 0. Быстрый старт локально (Ubuntu / любой Linux)

Если сервер, на котором запускается бот, имеет **прямой доступ** к
`api.telegram.org` (не в РФ / не в сети с блокировкой Telegram), прокси не нужен:

```bash
# Предусловия: Node.js 20+ (или bun)
node --version

# Установка зависимостей
cd bot
npm install

# Настройка
cp .env.example .env
nano .env        # заполнить BOT_TOKEN и CHANNEL_ID (PROXY можно не задавать)

# Запуск (с автоперезапуском при изменениях)
npm run dev

# или однократный запуск
npm start
```

В логах при успешном старте должно появиться: `Bot started: @<username>`.

> **Важно.** Если в сети блокируется Telegram (например, в РФ), прямое подключение
> даст таймаут `Telegram API request failed [getMe]: ECONNABORTED`. В этом случае
> используйте Cloudflare Worker-релей (раздел 0.1) или задайте `PROXY` (разделы 2–3).

### 0.1. Запуск в РФ/сети с блокировкой Telegram — через Cloudflare Worker-релей

TL;DR: `api.telegram.org` блокируется на уровне IP (весь диапазон Telegram). Зато сеть
`*.workers.dev` доступна. Поэтому Bot API проксируется через **свой** Cloudflare Worker
(токен бота ходит только через ваш воркер).

1) Задеплоить релей (готовый код в `bot/cf-api-relay/`):

```bash
cd bot/cf-api-relay
wrangler login            # один раз, авторизация в Cloudflare
wrangler deploy           # получите URL вида https://blago-vote-tg-api-relay.<subdomain>.workers.dev
```

2) Указать его боту в `bot/.env`:

```
TELEGRAM_API_BASE=https://blago-vote-tg-api-relay.<subdomain>.workers.dev
```

3) Запуск — как в разделе 0 (`npm run dev` / `npm start`). В логе появится
`Telegram API host: https://... (релей)`, затем `Bot started: @<username>`.

> Ручная проверка релея:
> ```bash
> curl -s "https://blago-vote-tg-api-relay.<subdomain>.workers.dev/bot<TOKEN>/getMe"
> # ожидается {"ok":true,"result":{"id":...}}
> ```

### 0.2. Запуск через SOCKS5-прокси (gost/VPS)

Если проще поднять свой egress-прокси — см. разделы 1–3 (задать `PROXY` в `.env`).

## 1. Подготовить `.env`

Скопируйте шаблон и заполните токен/канал и адрес прокси:

```bash
cp bot/.env.example bot/.env
```

Ключевые переменные:

- `BOT_TOKEN` — токен бота от [@BotFather](https://t.me/BotFather).
- `BOT_TOKEN` требует `CHANNEL_ID` (например `@your_channel`).
- `PROXY` — адрес SOCKS5-прокси, через который бот ходит в Telegram.

## 2. Поднять SOCKS5-прокси (gost) на edge-узле

Прокси поднимается на выделенном узле в локальной сети (внешний интернет у него
может идти через WireGuard-туннель к зарубежному VPS).

Установите `gost` (бинарник на Go, поддерживает RISC-V):

```bash
# пример для linux/riscv64 (для x86_64 замените riscv64 на amd64)
curl -L -o /tmp/gost.tar.gz \
  https://github.com/ginuerzh/gost/releases/latest/download/gost_linux_riscv64.tar.gz
tar -xzf /tmp/gost.tar.gz -C /usr/local/bin gost
chmod +x /usr/local/bin/gost
```

Включите системный сервис `bot/gost.service` (в нём уже прописан порт `9100`
и зависимость от WireGuard-интерфейса):

```bash
cp bot/gost.service ~/.config/systemd/user/
# если egress идёт через WireGuard-интерфейс wg0 — укажите его в инстансе сервиса:
systemctl --user enable gost.service
systemctl --user start gost.service
systemctl --user status gost.service
```

Проверьте, что прокси отвечает:

```bash
curl -sS -x socks5h://127.0.0.1:9100 https://api.telegram.org -o /dev/null -w "%{http_code}\n"
# ожидается 302
```

## 3. Указать адрес прокси в `.env`

Если бот живёт на том же узле, что и gost:

```
PROXY=socks5h://127.0.0.1:9100
```

Если бот на другом узле локальной сети — укажите IP edge-узла:

```
PROXY=socks5h://192.168.0.10:9100
```

## 4. Запустить бота

Через systemd (уже настроен перезапуск, `Restart=always`):

```bash
cp bot/blago-bot.service ~/.config/systemd/user/
loginctl enable-linger "$USER"
systemctl --user daemon-reload
systemctl --user enable --now blago-bot.service
journalctl --user -u blago-bot.service -f
```

Или вручную для быстрой проверки:

```bash
cd bot
npm run dev      # или: node bot.js
```

В логах при успешном старте должно появиться: `Bot started: @<username>`.

## Типичные ошибки

| Ошибка                              | Причина                              | Решение                                   |
|-------------------------------------|--------------------------------------|-------------------------------------------|
| `Failed to connect to Telegram`     | прокси не запущен / адрес неверный   | проверить шаг 2–3, `curl ... -x socks5h://` |
| `timeout of 60000ms`                | прокси медленный или недоступен      | проверить сеть до edge-узла, сменить прокси |