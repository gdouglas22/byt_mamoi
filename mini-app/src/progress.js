const KEY = "cyberdef.progress.v1";

const RANKS = [
  { min: 0,   name: "Новичок" },
  { min: 50,  name: "Стажёр" },
  { min: 150, name: "Защитник" },
  { min: 350, name: "Эксперт" },
  { min: 700, name: "Мастер кибербезопасности" },
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, games: {}, total: 0, onboarded: false };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return { version: 1, games: {}, total: 0, onboarded: false };
    if (typeof parsed.onboarded !== "boolean") parsed.onboarded = false;
    return parsed;
  } catch {
    return { version: 1, games: {}, total: 0, onboarded: false };
  }
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore quota */ }
}

export function getProgress(gameId) {
  const s = load();
  return s.games[gameId] || { best: 0, stars: 0, plays: 0 };
}

export function getAll() { return load(); }

export function saveResult(gameId, score, stars = 0) {
  const s = load();
  const cur = s.games[gameId] || { best: 0, stars: 0, plays: 0 };
  const next = {
    best: Math.max(cur.best, score | 0),
    stars: Math.max(cur.stars, stars | 0),
    plays: cur.plays + 1,
  };
  s.games[gameId] = next;
  s.total = Object.values(s.games).reduce((a, g) => a + (g.best || 0), 0);
  save(s);
  return { game: next, total: s.total, rank: getRank(s.total) };
}

export function getTotal() { return load().total; }

export function getRank(total = load().total) {
  let r = RANKS[0];
  for (const candidate of RANKS) if (total >= candidate.min) r = candidate;
  return r.name;
}

export function reset() { save({ version: 1, games: {}, total: 0, onboarded: false }); }

export function isOnboarded() { return !!load().onboarded; }
export function markOnboarded() { const s = load(); s.onboarded = true; save(s); }
