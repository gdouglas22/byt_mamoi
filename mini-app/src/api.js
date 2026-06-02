// Клиент к API Фролова: https://bytmamoi-production.up.railway.app
// Авторизация:
//   - В Telegram WebApp:  Authorization: tma <initData>  (бэк валидирует HMAC-SHA256)
//   - В dev-браузере:     Authorization: Bearer <token>  (токен из ?token=, localStorage или DEV_TOKEN)

// Всегда идём через same-origin прокси /api/frolov?p=... — снимает CORS и в проде, и в dev.
//   - На Vercel: api/frolov.js (Edge Function)
//   - Локально:  scripts/dev-server.py (статика + проксирование /api/frolov)
// DIRECT_BASE оставлен для отладки (если кто-то явно отключит прокси).
const USE_PROXY = typeof location !== "undefined" && location.protocol !== "file:";
const DIRECT_BASE = "https://bytmamoi-production.up.railway.app";
const LS_TOKEN_KEY = "cyberdef.api.token";

// Никакого захардкоженного DEV_TOKEN: исходники без бандлера отдаются клиенту as-is.
// Для dev-доступа открыть один раз: http://localhost:PORT/?token=bm_xxx — он сохранится в localStorage.
const DEV_TOKEN = null;

let _token = null;
let _user = null;
let _topicsCache = null;

function readTokenFromURL() {
  try {
    const u = new URL(window.location.href);
    const qp = u.searchParams.get("token");
    if (qp) return qp;
    // Tg WebApp иногда кладёт start_param в hash, проверим оба
    const h = (u.hash || "").replace(/^#/, "");
    const m = h.match(/(?:^|&)token=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return null;
}

export function getToken() {
  if (_token) return _token;
  // Приоритет: URL → localStorage → DEV_TOKEN
  const fromUrl = readTokenFromURL();
  if (fromUrl) { _token = fromUrl; try { localStorage.setItem(LS_TOKEN_KEY, fromUrl); } catch {} return _token; }
  try {
    const cached = localStorage.getItem(LS_TOKEN_KEY);
    if (cached) { _token = cached; return _token; }
  } catch {}
  _token = DEV_TOKEN;
  return _token;
}

export function setToken(token) {
  _token = token || null;
  try { token ? localStorage.setItem(LS_TOKEN_KEY, token) : localStorage.removeItem(LS_TOKEN_KEY); } catch {}
}

function buildAuthHeader() {
  // Приоритет в Telegram: используем initData — бэк сам проверит HMAC и узнает пользователя.
  const initData = (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || "";
  if (initData) return "tma " + initData;
  // Иначе dev-режим: Bearer из URL/localStorage/DEV_TOKEN. В проде DEV_TOKEN = null.
  const tok = getToken();
  return tok ? "Bearer " + tok : null;
}

async function request(path, opts = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  const auth = buildAuthHeader();
  if (auth) headers["Authorization"] = auth;
  const url = USE_PROXY
    ? `${location.origin}/api/frolov?p=${encodeURIComponent(path)}`
    : DIRECT_BASE + path;
  const resp = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!resp.ok) {
    const err = new Error(`API ${resp.status} ${path}`);
    err.status = resp.status;
    try { err.body = await resp.json(); } catch {}
    throw err;
  }
  return resp.json();
}

// ===== User =====
export async function me() {
  if (_user) return _user;
  _user = await request("/api/me");
  return _user;
}
export function meCached() { return _user; }
export async function updateMe(patch) {
  _user = await request("/api/me", { method: "PATCH", body: patch });
  return _user;
}
export async function myStats() {
  return request("/api/me/stats");
}
export async function ping() {
  try { await request("/api/me/ping", { method: "POST" }); } catch {}
}

// ===== Topics =====
export async function topics() {
  if (_topicsCache) return _topicsCache;
  _topicsCache = await request("/api/topics");
  return _topicsCache;
}
export async function topicDetail(topicId) {
  return request(`/api/topics/${topicId}`);
}
export function invalidateTopicsCache() { _topicsCache = null; }

// ===== Games =====
// Хранит активные session_id, чтобы finish мог их передать.
const _activeSessions = new Map();

export async function startGame(gameId) {
  const out = await request(`/api/topics/games/${gameId}/start`, { method: "POST" });
  if (out && out.session_id) _activeSessions.set(gameId, out.session_id);
  return out;
}

export async function finishGame(gameId, { score, total = 1, time_seconds }) {
  invalidateTopicsCache();
  const session_id = _activeSessions.get(gameId);
  // Бэк сам считает stars и points из score/total — не пихаем лишних полей.
  const body = {
    score: Number(score) || 0,
    total: Number(total) || 1,
    time_spent_secs: Number(time_seconds) || 0,
  };
  if (session_id) body.session_id = session_id;
  const out = await request(`/api/topics/games/${gameId}/finish`, { method: "POST", body });
  _activeSessions.delete(gameId);
  return out;
}

// ===== Achievements & notifications =====
export async function achievements() { return request("/api/achievements"); }
export async function notifications() { return request("/api/notifications"); }

// ===== Helpers =====
export function autoDifficultyByAge(age) {
  // 7-8: easy; 9-11: medium; 12+: hard
  const a = Number(age) || 0;
  if (a <= 8)  return "easy";
  if (a <= 11) return "medium";
  return "hard";
}
