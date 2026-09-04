import { config, log, validateConfig } from "./config.js";
import { sendMessage, getMe, checkProxyReachable, getUpdates, sendPhoto, setMyCommands } from "./telegram.js";
import { fetchDaos, fetchProposal, fetchDao } from "./api.js";
import { createServer } from "http";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "state.json");

const Status = {
  NOT_STARTED: "NOT_STARTED",
  ACTIVE: "ACTIVE",
  CLOSED: "ENDED",
};

// ── State persistence ──
function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch { }
  return { proposals: {} };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Helpers ──
function getProposalStatus(metadata) {
  if (!metadata) return null;
  const now = Date.now();
  const start = Number(metadata.proposalStartTime) * 1000;
  const end = Number(metadata.proposalEndTime) * 1000;

  if (now < start) return Status.NOT_STARTED;
  if (now >= start && now < end) return Status.ACTIVE;
  return Status.CLOSED;
}

function parseLang(json, lang = "ru") {
  if (!json) return "";
  try {
    const parsed = JSON.parse(json);
    return (parsed[lang] || parsed.en || Object.values(parsed)[0] || "").trim();
  } catch {
    return String(json).trim();
  }
}

function formatDate(unixSeconds) {
  if (!unixSeconds) return "—";
  const d = new Date(Number(unixSeconds) * 1000);
  return d.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function proposalLink(address) {
  return `${config.siteUrl}/proposal/${address}`;
}

function tonviewerLink(address) {
  return `${config.tonviewer}/${address}`;
}

// Жетон «Благо» — адрес контракта + ссылка на него (используется для веса голосов).
const BLAGO_JETTON_ADDRESS = "EQBlaryI1HCY6hIlW9giBoqKGtuMHfxlULZOhD6UyzpqLcll";
const BLAGO_JETTON_NAME = "Благо";

// Дробная часть токена: 1 токен = 10^9 (9 знаков после запятой), как на платформе.
// Значение приходит строкой в нано-единицах (целое). Делим программно (BigInt),
// чтобы не терять точность на больших числах.
function fromNano(value) {
  let s = String(value ?? 0);
  if (!s || s === "0") return "0";
  s = s.replace(/^\./, "0.");
  let intPart = "0";
  let fracPart = "";
  if (s.includes(".")) {
    [intPart, fracPart] = s.split(".");
  } else {
    intPart = s;
  }
  const raw = intPart + fracPart;
  try {
    const big = BigInt(raw || "0");
    const scaled = String(big).padStart(9 + 1, "0");
    const int = scaled.slice(0, -9) || "0";
    const frac = scaled.slice(-9).replace(/0+$/, "");
    return frac ? `${int}.${frac}` : int;
  } catch {
    return "0";
  }
}

// Человекочитаемый формат чисел: 12 329 → "12.33 тыс.", 1 234 567 → "1.23 млн."
// Тот же алгоритм, что в src/utils.ts (nFormatter), чтобы вывод совпадал с платформой.
function formatTokens(value) {
  const num = Number(value) || 0;
  const lookup = [
    { value: 1e15, symbol: " квадрлн." },
    { value: 1e12, symbol: " трлн." },
    { value: 1e9, symbol: " млрд." },
    { value: 1e6, symbol: " млн." },
    { value: 1e3, symbol: " тыс." },
    { value: 1, symbol: "" },
  ];
  if (num < 1) return String(Number(value).toFixed(5).replace(/(\.0+$)|(\.[0-9]*[1-9])0+$/, "$1"));
  for (const item of lookup) {
    if (num >= item.value) {
      const formatted = (num / item.value)
        .toFixed(2)
        .replace(/(\.0+$)|(\.[0-9]*[1-9])0+$/, "$1");
      return `${formatted}${item.symbol}`;
    }
  }
  return "0";
}

// Строка «Общий вес» в формате платформы: <значение> жетонов Благо (со ссылкой на жетон).
function formatTotalWeight(totalWeight) {
  const tokens = fromNano(totalWeight);
  return `<b>Общий вес:</b> ${formatTokens(tokens)} ${BLAGO_JETTON_NAME} (<a href="${tonviewerLink(BLAGO_JETTON_ADDRESS)}">жетон ${BLAGO_JETTON_NAME}</a>)`;
}

// Глубокая ссылка в Telegram WebApp (mini app) на конкретное предложение.
// Формат: https://t.me/<бот>/vote?startapp=<адрес-предложения>
// При открытии Telegram передаёт start_param=<адрес> в WebApp, а фронтенд
// (чтение start_param в src/App.tsx) переходит на /proposal/<адрес>.
function webAppProposalLink(address) {
  return `${config.webappUrl}/vote?startapp=${address}`;
}

// Кнопка открытия предложения в Telegram mini app.
// Используется И в канале, и в личных чатах, поскольку web_app-кнопки
// в каналах не поддерживаются — берём обычную url-кнопку на t.me-глубокую ссылку,
// которая запускает WebApp (работает везде).
function openAppMarkup(address) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Открыть в приложении", url: webAppProposalLink(address) }]],
    },
  };
}

// ── Команды /start и /help ──

// Ссылка на запуск WebApp (Mini App) без конкретного предложения — общая страница.
function webAppLink() {
  return `${config.webappUrl}/vote`;
}

// Разметка главной страницы /start с изображением платформы.
function startPhoto() {
  return "https://raw.githubusercontent.com/gradosphera/brand-assets/refs/heads/main/vote/640x360_bot.jpg";
}

// Кнопки для /start: запуск WebApp + переход на сайт.
function startMarkup() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Открыть Платформу Голос", url: webAppLink() }],
        [{ text: "🌐 Сайт платформы", url: config.siteUrl }],
      ],
    },
  };
}

// Общий текст о платформе децентрализованного управления «Голос».
function startText() {
  return [
    `<b>🏛 Платформа «Голос»</b> — децентрализованная платформа управления (governance), работающая на блокчейне <b>TON</b>.`,
    ``,
    `Здесь решения принимают сообщества голосованием: каждый участник может <b>выдвинуть предложение</b>, <b>обсудить</b> его и <b>проголосовать</b> — открыто, прозрачно и без посредников.`,
    ``,
    `<b>Как это работает:</b>`,
    `• Предложения публикуются от имени ДАО и доступны всем участникам;`,
    `• Голосование учитывает вес голоса (в т.ч. жетонов, таких как «Благо»);`,
    `• Результаты подводятся автоматически по итогам периода голосования.`,
    ``,
    `<i>Нажмите «🚀 Открыть Платформу Голос», чтобы перейти в приложение.</i>`,
  ].join("\n");
}

// Текст команды /help.
function helpText() {
  return [
    `<b>ℹ️ Помощь</b>`,
    ``,
    `Это бот платформы децентрализованного управления «Голос» на блокчейне TON.`,
    ``,
    `<b>Команды:</b>`,
    `• <code>/start</code> — информация о платформе и запуск приложения;`,
    `• <code>/help</code> — эта справка.`,
    ``,
    `<b>Что умеет бот:</b>`,
    `• Уведомляет о новых предложениях и голосованиях;`,
    `• Сообщает о старте и завершении голосований с результатами;`,
    `• Открывает конкретное предложение прямо в Mini App.`,
    ``,
    `Возникли вопросы? Обратитесь в сообщество вашего ДАО или на сайт платформы.`,
  ].join("\n");
}

// Обработчик входящих сообщений (команды от пользователей).
async function handleUpdate(update) {
  // Реагируем только на обычные сообщения, не от ботов, в личном чате.
  const msg = update?.message;
  if (!msg) return;
  if (msg.from?.is_bot) return;
  const text = (msg.text || "").trim();
  const chatId = msg.chat?.id;
  if (!chatId) return;

  if (text === "/start") {
    // Фото + подпись с информацией + кнопки WebApp/сайт.
    const ok = await sendPhoto(chatId, startPhoto(), startText(), startMarkup());
    if (ok) log(`[cmd] /start → chat ${chatId}`);
    return;
  }

  if (text === "/help") {
    const ok = await sendMessage(chatId, helpText());
    if (ok) log(`[cmd] /help → chat ${chatId}`);
    return;
  }
}

// Бесконечный long-poll цикл получения команд (запускается отдельно от поллинга предложений).
async function runUpdatesPolling() {
  let offset = 0;
  let failures = 0;
  while (true) {
    try {
      const updates = (await getUpdates({ offset, timeout: 25, limit: 50 })) || [];
      failures = 0;
      for (const u of updates) {
        if (u.update_id >= offset) {
          offset = u.update_id + 1;
          try {
            await handleUpdate(u);
          } catch (e) {
            log("Update handling error:", e.message);
          }
        }
      }
    } catch (err) {
      failures += 1;
      log(`getUpdates failed (${failures}):`, err.message);
      // Раз в нестабильной сети — пауза перед следующим запросом.
      await new Promise((r) => setTimeout(r, Math.min(1000 * failures, 10_000)));
    }
  }
}

// ── Resolve DAO list (handles proposal address in DAO_ADDRESS) ──
let _cachedDaoList = null;

async function resolveDaoEntry(entry) {
  const dao = await fetchDao(entry);
  if (dao?.daoProposals?.length) return dao;

  // Not a DAO — find parent DAO by proposal address
  const allDaos = await fetchDaos();
  for (const d of allDaos) {
    if ((d.daoProposals || []).includes(entry)) return d;
  }
  return null;
}

async function getDaoList() {
  if (_cachedDaoList) return _cachedDaoList;

  const tracked = config.daoAddresses;

  if (tracked.length) {
    const byAddr = new Map();
    for (const entry of tracked) {
      const dao = await resolveDaoEntry(entry);
      if (dao) byAddr.set(dao.daoAddress, dao);
    }
    _cachedDaoList = [...byAddr.values()];
    return _cachedDaoList;
  }

  _cachedDaoList = await fetchDaos();
  return _cachedDaoList;
}

// ── Find latest proposal by status filter ──
// excludeStatus: skip proposals with this status
// onlyStatus: only accept this status (null = any non-excluded)
async function findLatestProposal(excludeStatus, onlyStatus) {
  const daoList = await getDaoList();

  const candidates = [];
  for (const dao of daoList) {
    const daoName = parseLang(dao.daoMetadata?.metadataArgs?.name);
    for (const addr of dao.daoProposals || []) {
      candidates.push({ addr, daoName });
    }
  }

  if (!candidates.length) return null;

  let best = { address: "", time: 0, daoName: "", proposal: null };
  const BATCH = 20;

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (c) => {
        const p = await fetchProposal(c.addr);
        if (!p?.metadata) return null;
        const status = getProposalStatus(p.metadata);
        if (onlyStatus) {
          if (status !== onlyStatus) return null;
        } else if (excludeStatus && status === excludeStatus) {
          return null;
        }
        const t = Math.max(
          Number(p.metadata.proposalStartTime) || 0,
          Number(p.metadata.proposalEndTime) || 0,
        );
        return { address: c.addr, time: t, daoName: c.daoName, proposal: p };
      })
    );
    for (const r of results) {
      if (r && r.time > best.time) best = r;
    }
  }

  return best.address ? best : null;
}

function stripField(text, fieldName) {
  if (!text) return "";
  return text
    .split("\n")
    .filter((line) => !line.includes(`**${fieldName}:**`))
    .join("\n");
}

function extractField(text, fieldName) {
  if (!text) return { value: "", rest: "" };
  const prefix = `**${fieldName}:**`;
  const lines = text.split("\n");
  let value = "";
  const rest = [];
  for (const line of lines) {
    if (line.includes(prefix)) {
      value = line.slice(line.indexOf(prefix) + prefix.length).trim();
    } else {
      rest.push(line);
    }
  }
  return { value, rest: rest.join("\n") };
}

function formatLeader(addr) {
  if (!addr) return "";
  const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  return `<a href="${tonviewerLink(addr)}"><code>${short}</code></a>`;
}

function mdToHtml(md) {
  if (!md) return "";
  return md
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/__(.+?)__/g, "<b>$1</b>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

function shorten(text, len = 350, link) {
  if (!text) return "";
  if (text.length <= len) return text;
  const truncated = text.slice(0, len) + "...";
  return link ? `${truncated} <a href="${link}">читать далее</a>` : truncated;
}

// ── Message builders ──
function buildNewProposalMessage(daoName, proposal, addr) {
  const meta = proposal.metadata;
  const title = parseLang(meta?.title);
  const rawDesc = parseLang(meta?.description);
  const { value: leader, rest: descRest } = extractField(rawDesc, "Ведущий/руководитель");
  const description = shorten(stripTags(mdToHtml(stripField(descRest, "Место проведения"))), 350, proposalLink(addr));
  const startTime = formatDate(meta?.proposalStartTime);
  const endTime = formatDate(meta?.proposalEndTime);
  const choices = meta?.votingSystem?.choices || [];
  const status = getProposalStatus(meta);

  let statusText = "";
  if (status === Status.NOT_STARTED) statusText = "⏳ Ожидается";
  else if (status === Status.ACTIVE) statusText = "🗳 Идёт голосование";
  else if (status === Status.CLOSED) statusText = "✅ Завершено";

  let lines = [
    `<b>📋 Новое предложение</b>`,
    `<b>${daoName || "—"}</b>`,
    `<b>Предложение:</b> <a href="${proposalLink(addr)}">${title || shortAddr(addr)}</a>`,
  ];

  if (description) lines.push(description);
  if (leader) lines.push(`<b>Ведущий/руководитель:</b> ${formatLeader(leader)}`);
  if (statusText) lines.push(`<b>Статус:</b> ${statusText}`);

  if (choices.length) {
    lines.push(
      ``,
      `<b>Варианты:</b>`,
      ...choices.map((c, i) => `  ${i + 1}. ${c}`),
    );
  }

  lines.push(
    ``,
    `<b>Начало:</b> ${startTime}`,
    `<b>Окончание:</b> ${endTime}`,
    ``,
    `<a href="${tonviewerLink(addr)}">🔍 Проводник</a>`,
  );

  return lines.join("\n");
}

function buildStartMessage(daoName, proposal, addr) {
  const meta = proposal.metadata;
  const title = parseLang(meta?.title);
  const rawDesc = parseLang(meta?.description);
  const { value: leader, rest: descRest } = extractField(rawDesc, "Ведущий/руководитель");
  const description = shorten(stripTags(mdToHtml(stripField(descRest, "Место проведения"))), 350, proposalLink(addr));
  const startTime = formatDate(meta?.proposalStartTime);
  const endTime = formatDate(meta?.proposalEndTime);
  const choices = meta?.votingSystem?.choices || [];

  let lines = [
    `<b>🗳 Голосование начато</b>`,
    ``,
    `<b>${daoName || "—"}</b>`,
    `<b>Предложение:</b> <a href="${proposalLink(addr)}">${title || shortAddr(addr)}</a>`,
  ];

  if (description) lines.push(description);
  if (leader) lines.push(`<b>Ведущий/руководитель:</b> ${formatLeader(leader)}`);

  if (choices.length) {
    lines.push(
      ``,
      `<b>Варианты:</b>`,
      ...choices.map((c, i) => `  ${i + 1}. ${c}`),
    );
  }

  lines.push(
    ``,
    `<b>Начало:</b> ${startTime}`,
    `<b>Окончание:</b> ${endTime}`,
    ``,
    `<a href="${tonviewerLink(addr)}">🔍 Проводник</a>`,
  );

  return lines.join("\n");
}

function buildEndMessage(daoName, proposal, addr) {
  const meta = proposal.metadata;
  const title = parseLang(meta?.title);
  const rawDesc = parseLang(meta?.description);
  const { value: leader, rest: descRest } = extractField(rawDesc, "Ведущий/руководитель");
  const description = shorten(stripTags(mdToHtml(stripField(descRest, "Место проведения"))), 350, proposalLink(addr));
  const choices = meta?.votingSystem?.choices || [];
  const result = proposal.proposalResult || {};
  const totalWeight = result.totalWeight || result.totalWeights || "0";
  const totalVotes = Object.keys(proposal.votes || {}).length;

  const QUORUM_PERCENT = 66;
  const percents = choices.map((c) => Number(result[c] ?? result[c.toLowerCase()] ?? 0));
  const winnerPercent = Math.max(...percents, 0);
  const isQuorumPassed = winnerPercent >= QUORUM_PERCENT;

  let lines = [
    `<b>⏰ Голосование завершено</b>`,
    ``,
    `<b>${daoName || "—"}</b>`,
    `<b>Предложение:</b> <a href="${proposalLink(addr)}">${title || shortAddr(addr)}</a>`,
  ];

  if (description) lines.push(description);
  if (leader) lines.push(`<b>Ведущий/руководитель:</b> ${formatLeader(leader)}`);

  if (isQuorumPassed) {
    lines.push(`<b>Кворум 2/3 пройден ✅</b>`);
  } else {
    lines.push(`<b>Кворум 2/3 не пройден ❌</b>`);
  }

  lines.push(``, `<b>Результаты:</b>`);

  for (const choice of choices) {
    const pct = Number(result[choice] ?? result[choice.toLowerCase()] ?? 0).toFixed(2);
    lines.push(`  <b>${choice}</b>: ${pct}%`);
  }

  lines.push(
    ``,
    `<b>Всего голосов:</b> ${totalVotes}`,
    formatTotalWeight(totalWeight),
    ``,
    `<a href="${proposalLink(addr)}">📊 Подробнее</a>`,
  );

  return lines.join("\n");
}

// ── Send to channel + private chats ──
async function sendToAll(text, address, daoName) {
  let ok = false;
  const markup = openAppMarkup(address);
  if (config.channelId) {
    if (await sendMessage(config.channelId, text, markup)) ok = true;
  }
  for (const chatId of config.privateChatIds) {
    await sendMessage(chatId, text, markup);
  }
  return ok;
}

// ── Core polling logic ──
async function pollProposals(state) {
  const daoList = await getDaoList();
  let notificationsSent = 0;

  for (const dao of daoList) {
    const daoName = parseLang(dao.daoMetadata?.metadataArgs?.name);

    for (const proposalAddr of dao.daoProposals || []) {
      const proposal = await fetchProposal(proposalAddr);
      if (!proposal?.metadata) continue;

      const currentStatus = getProposalStatus(proposal.metadata);
      if (!currentStatus) continue;

      const prevStatus = state.proposals[proposalAddr]?.status;

      if (prevStatus === currentStatus) continue;

      if (prevStatus && prevStatus !== currentStatus) {
        if (currentStatus === Status.ACTIVE) {
          const text = buildStartMessage(daoName, proposal, proposalAddr);
          if (await sendToAll(text, proposalAddr, daoName)) {
            notificationsSent++;
            log(`[START] ${proposalAddr} (${daoName})`);
          }
        } else if (currentStatus === Status.CLOSED) {
          const text = buildEndMessage(daoName, proposal, proposalAddr);
          if (await sendToAll(text, proposalAddr, daoName)) {
            notificationsSent++;
            log(`[END] ${proposalAddr} (${daoName})`);
          }
        }
      } else if (!prevStatus && currentStatus === Status.ACTIVE) {
        const text = buildStartMessage(daoName, proposal, proposalAddr);
        if (await sendToAll(text, proposalAddr, daoName)) {
          notificationsSent++;
          log(`[ACTIVE] ${proposalAddr} (${daoName})`);
        }
      }

      state.proposals[proposalAddr] = {
        status: currentStatus,
        daoName,
        lastCheck: Date.now(),
      };
    }
  }

  return notificationsSent;
}

// ── Main ──
async function main() {
  validateConfig();

  // Диагностика прокси перед попыткой connect к Telegram
  if (config.proxy) {
    const pr = await checkProxyReachable(config.proxy);
    if (pr.ok) {
      log(`Proxy OK: ${pr.host}:${pr.port}`);
    } else {
      log(
        `Proxy ${config.proxy} недоступен (${pr.error}). ` +
        `Если gost не запущен: systemctl --user start gost`,
      );
    }
  } else {
    log("PROXY не задан. Если Telegram заблокирован в вашей сети, укажите PROXY=socks5h://... в bot/.env");
  }

  let bot = null;
  let lastError = "";
  for (let attempt = 1; attempt <= 10; attempt++) {
    bot = await getMe();
    if (bot) break;
    lastError = `(attempt ${attempt}/10)`;
    log(`getMe failed (attempt ${attempt}/10), retrying in 5s...`);
    await new Promise((r) => setTimeout(r, 5_000));
  }
  if (!bot) {
    throw new Error(
      `Failed to connect to Telegram after retries. BOT_TOKEN=${config.botToken ? "set" : "MISSING"}, ` +
      `proxy=${config.proxy || "direct"}. Check token and proxy. ${lastError}`,
    );
  }
  log(`Bot started: @${bot.username}`);

  const state = loadState();

  // On first startup: don't publish existing votes (they are already in the channel).
  // Only seed current proposals into state, then track NEW proposals going forward.
  if (!state.seeded) {
    log("Seeding current proposals...");

    const daoList = await getDaoList();
    let seeded = 0;
    for (const dao of daoList) {
      const daoName = parseLang(dao.daoMetadata?.metadataArgs?.name);
      for (const proposalAddr of dao.daoProposals || []) {
        const proposal = await fetchProposal(proposalAddr);
        if (!proposal?.metadata) continue;
        const status = getProposalStatus(proposal.metadata);
        if (!status) continue;
        state.proposals[proposalAddr] = {
          status,
          daoName,
          lastCheck: Date.now(),
        };
        seeded++;
      }
    }

    state.seeded = true;
    saveState(state);
    log(`Seeded ${seeded} proposals.`);

    // Временно: публиковать последние голосования ДАО из списка (SEND_LATEST=true).
    if (config.sendLatest) {
      log("SEND_LATEST=true — публикуем последние голосования ДАО...");

      // Последнее активное/предстоящее (не завершённое)
      const latestActive = await findLatestProposal(Status.CLOSED);
      if (latestActive) {
        const text = buildNewProposalMessage(latestActive.daoName, latestActive.proposal, latestActive.address);
        if (await sendToAll(text, latestActive.address, latestActive.daoName)) {
          log(`[LATEST ACTIVE] ${latestActive.address} (${latestActive.daoName})`);
        }
      }

      // Последнее завершённое
      const latestEnded = await findLatestProposal(null, Status.CLOSED);
      if (latestEnded) {
        const text = buildEndMessage(latestEnded.daoName, latestEnded.proposal, latestEnded.address);
        if (await sendToAll(text, latestEnded.address, latestEnded.daoName)) {
          log(`[LATEST ENDED] ${latestEnded.address} (${latestEnded.daoName})`);
        }
      }
    }
  }

  async function tick() {
    try {
      const sent = await pollProposals(state);
      saveState(state);
      if (sent > 0) log(`Sent ${sent} notification(s)`);
    } catch (err) {
      log("Poll error:", err.message);
    }
  }

  await tick();
  setInterval(tick, config.pollInterval);
  const hours = Math.round((config.pollInterval / 1000 / 3600) * 10) / 10;
  log(`Polling every ${config.pollInterval / 1000}s (${hours}h)`);

  // Регистрируем команды в меню "/" (не критично при сбое — бот всё равно отвечает).
  try {
    await setMyCommands([
      { command: "start", description: "Информация о платформе и запуск приложения" },
      { command: "help", description: "Помощь и справка по боту" },
    ]);
  } catch { }

  // Запускаем приём входящих команд (/start, /help) в отдельном бесконечном цикле.
  runUpdatesPolling();

  if (config.port > 0) {
    createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", bot: bot.username }));
    }).listen(config.port, () => log(`Health-check on port ${config.port}`));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
