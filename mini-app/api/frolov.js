// Прокси к API Фролова (https://bytmamoi-production.up.railway.app).
// Mini App вызывает /api/frolov?p=/api/me — мы форвардим на target и возвращаем ответ.
// Снимает CORS-ограничения для браузерного фронта на cyberdef-mini-app.vercel.app.

export const config = { runtime: "edge" };

const TARGET_BASE = "https://bytmamoi-production.up.railway.app";

export default async function handler(req) {
  const url = new URL(req.url);
  const p = url.searchParams.get("p") || "/";
  // Аккуратно склеиваем, чтобы не было двойного слеша
  const sep = p.startsWith("/") ? "" : "/";
  const target = `${TARGET_BASE}${sep}${p}`;

  // Перекидываем заголовки запроса, пропуская служебные
  const out = {};
  for (const [k, v] of req.headers.entries()) {
    const lk = k.toLowerCase();
    if (lk === "host" || lk === "connection" || lk === "accept-encoding") continue;
    if (lk.startsWith("x-vercel-")) continue;
    out[k] = v;
  }

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  let upstream;
  try {
    upstream = await fetch(target, { method: req.method, headers: out, body });
  } catch (e) {
    return new Response(JSON.stringify({ error: "proxy_upstream_unreachable", message: String(e) }), {
      status: 502, headers: { "Content-Type": "application/json" },
    });
  }

  const respBody = await upstream.text();
  return new Response(respBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}
