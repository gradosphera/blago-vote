import { config, log } from "./config.js";
import { sendMessage, getMe } from "./telegram.js";
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

function webAppLink(daoName) {
  const path = config.daoWebappMap[daoName] || "";
  return path ? `${config.webappUrl}/${path}` : `${config.siteUrl}`;
}

function tonviewerLink(address) {
  return `${config.tonviewer}/${address}`;
}

function webAppMarkup(daoName) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Открыть в приложении", web_app: { url: webAppLink(daoName) } }]],
    },
  };
}

function urlMarkup(address) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "📋 Открыть в приложении", url: proposalLink(address) }]],
    },
  };
}

// ── Resolve DAO list (handles proposal address in DAO_ADDRESS) ──
let _cachedDaoList = null;

async function getDaoList() {
  if (_cachedDaoList) return _cachedDaoList;

  const trackedDao = config.daoAddress;

  if (trackedDao) {
    const dao = await fetchDao(trackedDao);
    if (dao?.daoProposals?.length) {
      _cachedDaoList = [dao];
      return _cachedDaoList;
    }

    // Not a DAO — find parent DAO by proposal address
    const allDaos = await fetchDaos();
    for (const d of allDaos) {
      if ((d.daoProposals || []).includes(trackedDao)) {
        _cachedDaoList = [d];
        return _cachedDaoList;
      }
    }

    _cachedDaoList = [];
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
    `<b>Общий вес:</b> ${Number(totalWeight).toLocaleString("ru-RU")}`,
    ``,
    `<a href="${proposalLink(addr)}">📊 Подробнее</a>`,
  );

  return lines.join("\n");
}

// ── Send to channel + private chats ──
async function sendToAll(text, address, daoName) {
  let ok = false;
  if (config.channelId) {
    if (await sendMessage(config.channelId, text, urlMarkup(address))) ok = true;
  }
  for (const chatId of config.privateChatIds) {
    await sendMessage(chatId, text, webAppMarkup(daoName));
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
  let bot = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    bot = await getMe();
    if (bot) break;
    log(`getMe failed (attempt ${attempt}/10), retrying in 5s...`);
    await new Promise((r) => setTimeout(r, 5_000));
  }
  if (!bot) {
    throw new Error("Failed to connect to Telegram. Check BOT_TOKEN and proxy.");
  }
  log(`Bot started: @${bot.username}`);

  const state = loadState();

  // On first startup: send latest active/upcoming + latest ended proposals
  if (!state.lastProposalSent) {
    log("Finding latest proposals...");

    // Latest active or upcoming (not ended)
    const latestActive = await findLatestProposal(Status.CLOSED);
    if (latestActive) {
      const text = buildNewProposalMessage(latestActive.daoName, latestActive.proposal, latestActive.address);
      if (await sendToAll(text, latestActive.address, latestActive.daoName)) {
        log(`[LATEST ACTIVE] ${latestActive.address} (${latestActive.daoName})`);
        state.lastProposalSent = latestActive.address;
      }
    }

    // Latest ended
    const latestEnded = await findLatestProposal(null, Status.CLOSED);
    if (latestEnded) {
      const text = buildEndMessage(latestEnded.daoName, latestEnded.proposal, latestEnded.address);
      if (await sendToAll(text, latestEnded.address, latestEnded.daoName)) {
        log(`[LATEST ENDED] ${latestEnded.address} (${latestEnded.daoName})`);
        state.lastEndedSent = latestEnded.address;
      }
    }

    saveState(state);
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
  log(`Polling every ${config.pollInterval / 1000}s`);

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
