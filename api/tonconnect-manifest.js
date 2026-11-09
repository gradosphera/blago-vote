// Динамический TonConnect-манифест: определяет домен сайта, на котором открыто
// приложение, и возвращает манифест с правильными url/iconUrl. Так кошелёк
// корректно подключается и на blago-vote.vercel.app, и на vote.gradosphera.org,
// и на любом другом хосте, где развёрнут фронтенд.
const FALLBACK_ORIGIN = "https://blago-vote.vercel.app";

function resolveOrigin(req) {
  // Try Host header (Vercel sets this to the actual domain being accessed)
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
    } catch (e) {
      console.error("[tonconnect-manifest] Invalid origin from host:", origin, e);
    }
  }

  // Fallback
  console.warn("[tonconnect-manifest] Using fallback origin:", FALLBACK_ORIGIN);
  return FALLBACK_ORIGIN;
}

export default function handler(req, res) {
  const origin = resolveOrigin(req);

  // Log for debugging (visible in Vercel function logs)
  console.log("[tonconnect-manifest] Host:", req.headers.host, "→ Origin:", origin);

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
