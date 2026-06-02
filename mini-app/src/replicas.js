// Библиотека реплик Капитана Мяу. Загружается один раз на boot из data/replicas.json
// (fetch), потом доступ синхронный через pickReplica(slot, {age, fallback}).
//
// Если loadReplicas() не был вызван или JSON не загрузился — pickReplica вернёт fallback
// или дефолтную фразу из DEFAULTS.

const DEFAULTS = {
  "onboarding-1": "Мяу-привет! Я — Капитан Мяу, и сегодня ты поступаешь в Кибер-Академию.",
  "onboarding-2": "В Сети полно ловушек: пароли крадут, под письмами от банков — подделка, в чатах подкарауливают мошенники.",
  "onboarding-3": "Восемь курсов. Восемь злодеев. И диплом Магистра Кибербезопасности. Готов? Выбирай первый курс — мяу!",
  "outro-win":  "Идеально! Ни одного промаха. Зачёт по этому уровню, мяу!",
  "outro-mid":  "Кое-что поймал. Перезайди — звёзд можно собрать больше.",
  "outro-lose": "Злодей одержал верх. Не сдавайся, попробуй ещё!",
};

let DATA = null;

export async function loadReplicas() {
  if (DATA) return DATA;
  try {
    const resp = await fetch("./src/data/replicas.json", { cache: "no-cache" });
    if (resp.ok) DATA = await resp.json();
  } catch {}
  return DATA;
}

export function pickReplica(slotKey, opts = {}) {
  const age = (opts.age || "medium").toLowerCase();
  const slot = DATA?.slots?.[slotKey];
  if (slot && Array.isArray(slot[age]) && slot[age].length) return rand(slot[age]);
  if (slot && Array.isArray(slot.medium) && slot.medium.length) return rand(slot.medium);
  return opts.fallback ?? DEFAULTS[slotKey] ?? "";
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function libraryStats() {
  if (!DATA) return { totalSlots: 0, totalReplicas: 0, loaded: false };
  const slots = DATA.slots || {};
  let totalReplicas = 0;
  let totalSlots = 0;
  for (const k of Object.keys(slots)) {
    totalSlots++;
    for (const age of ["easy", "medium", "hard"]) {
      totalReplicas += slots[k]?.[age]?.length || 0;
    }
  }
  return { totalSlots, totalReplicas, loaded: true };
}
