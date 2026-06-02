// Клиент к API Фролова.
// Когда mini-app хостится на том же домене, что и API (наш Railway-деплой под /games/*),
// идём напрямую на /api/* — same-origin, никакого CORS. Иначе используем proxy.
// Авторизация:
//   - iframe из родительской React-обёртки: Authorization: tma <initData>
//     (родитель прокидывает initData через ?tg_init_data= или hash #tg_init_data=)
//   - Standalone в Telegram:                 Authorization: tma <initData> из window.Telegram.WebApp
//   - Dev-браузер:                           Authorization: Bearer bm_<key> из ?token= / localStorage

// Same-origin detect: если на нашем Railway-домене или на localhost dev-сервера, /api/* доступен напрямую.
const SAME_ORIGIN_API = (() => {
  if (typeof location === "undefined") return false;
  // На любом не-Vercel хосте считаем, что /api/* отдаёт наш бэк (Railway, локальный uvicorn).
  // На vercel.app остаётся прокси /api/frolov.
  return !/\.vercel\.app$/i.test(location.hostname);
})();
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

function readInitDataFromURL() {
  // Когда mini-app открыт в iframe внутри нашей React-обёртки,
  // window.Telegram.WebApp недоступен — родитель прокидывает initData через URL.
  if (typeof window === "undefined") return "";
  try {
    const u = new URL(window.location.href);
    const qp = u.searchParams.get("tg_init_data");
    if (qp) return qp;
    const h = (u.hash || "").replace(/^#/, "");
    const m = h.match(/(?:^|&)tg_init_data=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return "";
}

function buildAuthHeader() {
  // 1) Свой Telegram WebApp (standalone)
  const tgInit = (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || "";
  if (tgInit) return "tma " + tgInit;
  // 2) iframe от родительского React-приложения: initData прокинут через URL
  const fromUrl = readInitDataFromURL();
  if (fromUrl) return "tma " + fromUrl;
  // 3) Dev-режим: Bearer-токен из ?token= / localStorage
  const tok = getToken();
  return tok ? "Bearer " + tok : null;
}

async function request(path, opts = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  const auth = buildAuthHeader();
  if (auth) headers["Authorization"] = auth;
  const url = SAME_ORIGIN_API
    ? location.origin + path
    : `${location.origin}/api/frolov?p=${encodeURIComponent(path)}`;
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
