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
  timeout: 60_000,
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

async function request(method, data = {}) {
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
    log(`Telegram API request failed [${method}]:`, detail);
    return null;
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
