import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";
import { createConnection } from "net";
import { config, log } from "./config.js";

const BASE = `${config.telegramApiBase}/bot${config.botToken}`;

if (config.telegramApiBase !== "https://api.telegram.org") {
  log(`Telegram API host: ${config.telegramApiBase} (релей)`);
}

const proxy = config.proxy;
const agent = proxy ? new SocksProxyAgent(proxy) : undefined;

if (proxy) {
  log(`Telegram egress proxy: ${proxy}`);
} else {
  log("Telegram egress proxy: не задан (прямое подключение)");
}

const http = axios.create({
  baseURL: BASE,
  timeout: 40_000,
  httpsAgent: agent,
  proxy: false,
});

// Проверяет, что SOCKS5-прокси слушает host:port. Быстрый fail-fast диагностики.
export async function checkProxyReachable(proxyUrl) {
  let host = "127.0.0.1";
  let port = 9100;
  try {
    const u = new URL(proxyUrl);
    host = u.hostname;
    if (u.port) port = Number(u.port);
  } catch {}
  return new Promise((resolve) => {
    const sock = createConnection({ host, port, timeout: 3000 });
    sock.once("connect", () => {
      sock.destroy();
      resolve({ ok: true, host, port });
    });
    sock.once("error", (e) => {
      sock.destroy();
      resolve({ ok: false, host, port, error: e.code || e.message });
    });
    sock.once("timeout", () => {
      sock.destroy();
      resolve({ ok: false, host, port, error: "timeout" });
    });
  });
}

function isTransientNetworkError(err, detail) {
  // Timeout/abort — всегда ретраим, даже если заголовки 200 пришли (тело зависло).
  if (["ECONNABORTED", "ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(err.code)) return true;
  // Другие сетевые ошибки — только если Telegram не ответил (нет response).
  if (err.response) return false;
  return /ECONNRESET|EPIPE|ENETUNREACH|ENETDOWN|EAI_AGAIN|socket hang up|fetch failed/i.test(
    String(detail),
  );
}

async function request(method, data = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await http.post(`/${method}`, data);
      if (!res.data.ok) {
        log(`Telegram API error [${method}]:`, res.data.description);
        return null;
      }
      return res.data.result;
    } catch (err) {
      const detail =
        err.response?.data?.description ||
        err.response?.statusText ||
        err.code ||
        err.message ||
        "unknown error";

      // Транзиентные сетевые сбои (DPI/сеть режет часть соединений к релею) — пробуем ещё раз.
      if (isTransientNetworkError(err, detail) && attempt < retries) {
        const wait = 1500 * (attempt + 1);
        log(`Telegram API request failed [${method}]: ${detail} (retry ${attempt + 1}/${retries}, ${wait}ms)`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      log(`Telegram API request failed [${method}]:`, err.code || detail);
      return null;
    }
  }
}

export async function sendMessage(chatId, text, options = {}) {
  return request("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...options,
  });
}

export async function editMessage(chatId, messageId, text, options = {}) {
  return request("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...options,
  });
}

export async function getMe() {
  return request("getMe");
}
