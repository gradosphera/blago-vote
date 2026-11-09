// Динамический TonConnect-манифест: определяет домен сайта, на котором открыто
// приложение, и возвращает манифест с правильными url/iconUrl. Так кошелёк
// корректно подключается и на blago-vote.vercel.app, и на vote.gradosphera.org,
// и на любом другом хосте, где развёрнут фронтенд.
const FALLBACK_ORIGIN = "https://blago-vote.vercel.app";

function parseQuery(url) {
  const query = {};
  const idx = url.indexOf("?");
  if (idx === -1) return query;
  const queryString = url.slice(idx + 1);
  const pairs = queryString.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
    }
  }
  return query;
}

function resolveOrigin(req) {
  // Parse URL to get query params
  const url = req.url || "";
  const query = parseQuery(url);

  // 1. Try query param (most reliable when client passes it)
  if (typeof query.origin === "string" && query.origin.length > 0) {
    try {
      const parsed = new URL(query.origin);
      if (parsed.protocol === "https:" || 
          (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))) {
        return parsed.origin;
      }
    } catch {}
  }

  // 2. Try Host header (Vercel sets this to the actual domain)
  const headers = req.headers || {};
  const host = typeof headers.host === "string" ? headers.host : "";
  if (host.length > 0) {
    // Handle "host:port" format
    const hostname = host.split(":")[0];
    const proto = typeof headers["x-forwarded-proto"] === "string" 
      ? headers["x-forwarded-proto"].split(",")[0].trim() 
      : "";
    const protocol = proto || (req.socket && req.socket.encrypted ? "https" : "http");
    
    const origin = `${protocol}://${hostname}`;
    try {
      const parsed = new URL(origin);
      if (parsed.protocol === "https:" || 
          (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))) {
        return origin;
      }
    } catch {}
  }

  // 3. Fallback
  return FALLBACK_ORIGIN;
}

export default function handler(req, res) {
  const origin = resolveOrigin(req);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  res.status(200).send(
    JSON.stringify({
      url: origin,
      name: "Голос",
      iconUrl: `${origin}/logo.png`,
    })
  );
}
