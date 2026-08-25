import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: join(__dirname, ".env") });

const env = process.env;

export const config = {
  botToken: env.BOT_TOKEN,
  channelId: env.CHANNEL_ID,
  privateChatIds: (env.PRIVATE_CHAT_IDS || "").split(",").filter(Boolean),
  pollInterval: Number(env.POLL_INTERVAL) || 60_000,
  daoAddress: env.DAO_ADDRESS || "",
  apiBase: env.API_BASE || "https://api.ton.vote",
  port: Number(env.PORT) || 0,
  debug: env.DEBUG === "true",

  // SOCKS5 proxy (Tor 127.0.0.1:9050 or any other)
  proxy: env.PROXY || "socks5://127.0.0.1:9150",

  siteUrl: "https://blago-vote.vercel.app",
  webappUrl: env.WEBAPP_URL || "https://t.me/gradosphera_vote_bot",
  tonviewer: "https://tonscan.org/ru/address",

  // Маппинг названий ДАО → path в Telegram WebApp
  // Формат: "Название": "path"
  daoWebappMap: JSON.parse(env.DAO_WEBAPP_MAP || '{"ДАО Градосфера":"gradosphera","ДАО «Городские дебаты»":"urbandebates"}'),
};

export function log(...args) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}]`, ...args);
}

export function validateConfig() {
  if (!config.botToken) {
    throw new Error("BOT_TOKEN is required. Set it in .env file.");
  }
  if (!config.channelId) {
    throw new Error("CHANNEL_ID is required. Set it in .env file.");
  }
}
