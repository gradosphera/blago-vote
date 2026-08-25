import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";
import { config, log } from "./config.js";

const BASE = `https://api.telegram.org/bot${config.botToken}`;

const agent = config.proxy ? new SocksProxyAgent(config.proxy) : undefined;

const http = axios.create({
  baseURL: BASE,
  timeout: 60_000,
  httpsAgent: agent,
  proxy: false,
});

async function request(method, data = {}) {
  try {
    const res = await http.post(`/${method}`, data);
    if (!res.data.ok) {
      log(`Telegram API error [${method}]:`, res.data.description);
      return null;
    }
    return res.data.result;
  } catch (err) {
    const detail = err.response?.data?.description || err.message;
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
