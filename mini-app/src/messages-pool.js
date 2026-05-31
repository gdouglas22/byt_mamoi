// Пул сообщений для игр со свайпами. Загружается из JSON-файлов:
//   src/data/messages-phishing.json   { ages: { easy: {real, fake}, medium, hard } }
// Каждая игра берёт N сообщений (50% настоящих, 50% фейков) случайно из пула возраста.

const POOL_PATHS = {
  phishing: "./src/data/messages-phishing.json",
  scams: "./src/data/messages-scams.json",
  cyberbullying: "./src/data/messages-cyberbullying.json",
  "urls-safe-sites": "./src/data/urls-safe-sites.json",
  "urls-https": "./src/data/urls-https.json",
  personaldata: "./src/data/messages-personaldata.json",
};

const _data = {};       // { phishing: <json data> }
const _loaded = new Set();

export async function loadMessages(poolName) {
  if (_loaded.has(poolName)) return _data[poolName];
  const url = POOL_PATHS[poolName];
  if (!url) return null;
  try {
    const r = await fetch(url, { cache: "no-cache" });
    if (r.ok) {
      _data[poolName] = await r.json();
      _loaded.add(poolName);
    }
  } catch {}
  return _data[poolName] || null;
}

export async function loadAllMessages() {
  await Promise.all(Object.keys(POOL_PATHS).map(loadMessages));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickMessages(poolName, { age = "medium", count = 8 } = {}) {
  const data = _data[poolName];
  if (!data) return [];
  const ageData = data.ages?.[age] || data.ages?.medium || data.ages?.easy || { real: [], fake: [] };
  const half = Math.ceil(count / 2);
  const reals = shuffle(ageData.real || []).slice(0, half).map((m) => ({ ...m, fake: false }));
  const fakes = shuffle(ageData.fake || []).slice(0, count - reals.length).map((m) => ({ ...m, fake: true }));
  return shuffle([...reals, ...fakes]);
}
