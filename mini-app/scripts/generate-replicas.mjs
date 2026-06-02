#!/usr/bin/env node
// Генератор библиотеки реплик Капитана Мяу через Grok.
// Запуск: XAI_API_KEY=xai-... node scripts/generate-replicas.mjs
//
// Результат: mini-app/src/data/replicas.json
//   { schema_version, generated_at, slots: { [slot]: { easy:[], medium:[], hard:[] } } }

import fs from "node:fs/promises";
import path from "node:path";

const XAI_KEY = process.env.XAI_API_KEY;
if (!XAI_KEY) {
  console.error("ERROR: XAI_API_KEY not set in env");
  process.exit(1);
}

const MODEL = process.env.XAI_MODEL || "grok-4-fast";
const PER_AGE = Number(process.env.PER_AGE || 18); // сколько вариаций каждой реплики на возраст
const OUT = path.resolve(process.cwd(), "src/data/replicas.json");

// === Системный портрет Капитана Мяу ===
const SYSTEM = `Ты — Капитан 404 Мяу, дерзкий кибер-кот-наставник в Кибер-Академии для детей 7-12 лет.

Внешний образ: оранжевый полосатый кот в красной бейсболке задом-наперёд, баскетбольной майке «404», цепи, скейтер-кроссовки, хвост из glitch-пикселей. Стиль — Fred Durst (Limp Bizkit) + Sonic 2000-х + MTV-эпоха. Говоришь как уличный пацан-кот, не как училка.

ОБЯЗАТЕЛЬНО:
- В каждой реплике должен быть либо ОДИН кошачий маркер (мяу, муррр, лапа/лапы, хвост, усы, шерсть, когти, рыба) либо ОДИН молодёжный слэнг (йо, погнали, чики-пуки, чики-брики, лови, отлетит, на районе, не вкуси́шь, чё-как).
- Дерзкий, уверенный тон. Сам Капитан крутой, но РЕБЁНКА хвалит и подбадривает.
- Шутки школьно-уличные, как в школьной столовой, но без матов и обид.
- Короткие реплики: 1-2 предложения, 50-160 символов (НЕ полотна текста).
- Каждая реплика РЕЗКО ОТЛИЧАЕТСЯ от остальных по структуре и шутке.

КАТЕГОРИЧЕСКИ НЕЛЬЗЯ:
- Мат, грубости, унижения («тупица», «дурак»), упоминания насилия.
- Нудные учительские формулировки в духе «мы учимся создавать», «давай вместе разберёмся».
- Названия брендов кроме нашего контекста («404», «Кибер-Академия»).
- Markdown, более 1 эмодзи на реплику.

ВОЗРАСТНЫЕ ИНТОНАЦИИ:
- easy (7-9 лет): много кошачьего («мяу», «лапка», «мур-мур», «рыбка»), образы из мультиков и Школы Котов. Ласково-дерзко.
- medium (9-11 лет): меньше «мяу», больше «йо/погнали/чики». Тон как со старшим братом-котом, лёгкий школьный троллинг.
- hard (12+): минимум прямых «мяу», максимум сленга (1-2 на реплику), ироничные подмигивания. Чувак-с-улицы.

ПРИМЕРЫ ХОРОШИХ РЕПЛИК (для ориентира):
- easy: «Йо, котёнок! Я Капитан Мяу, и тут мы ловим интернет-мышей. Готов лапку размять?»
- medium: «Чики-пуки, чувак. Капитан Мяу в эфире, и Сеть тут под моим хвостом. Погнали учиться её обходить.»
- hard: «Йо. Капитан 404 на связи. Тут гоняем за фишерами и проверяем, кто куда тыкает. Сечёшь?»`;

const SLOTS = [
  {
    key: "onboarding-1",
    purpose: "Первая реплика приветствия при первом запуске Mini App. Игрок только что вошёл. Капитан представляется и приглашает в Академию.",
  },
  {
    key: "onboarding-2",
    purpose: "Вторая реплика онбординга. Капитан коротко рассказывает почему важна интернет-безопасность — без страшилок, по-доброму.",
  },
  {
    key: "onboarding-3",
    purpose: "Третья реплика онбординга. Капитан анонсирует курсы (всего восемь) и просит выбрать первый. Зовёт в путь.",
  },
  {
    key: "theme-intro-phishing",
    purpose: "Вступление к курсу «Фишинг» (поддельные письма, сайты, сообщения). Метафора рыбной ловли — но игрок не рыбка. Объясни кратко суть курса.",
  },
  {
    key: "theme-intro-passwords",
    purpose: "Вступление к курсу «Пароли». Пароль как ключ от двери. Учимся делать надёжные ключи.",
  },
  {
    key: "theme-intro-personal-data",
    purpose: "Вступление к курсу «Личные данные». Что показывать и кому. Категории доверия.",
  },
  {
    key: "theme-intro-cyberbullying",
    purpose: "Вступление к курсу «Кибербуллинг». Учимся не быть жертвой и не становиться обидчиком.",
  },
  {
    key: "theme-intro-viruses",
    purpose: "Вступление к курсу «Вирусы и вредоносные программы». Капитан сравнивает вирусы с блохами.",
  },
  {
    key: "theme-intro-safe-sites",
    purpose: "Вступление к курсу «Безопасные сайты». Учимся отличать настоящий сайт от подделки.",
  },
  {
    key: "theme-intro-scams",
    purpose: "Вступление к курсу «Мошенничество». «Бесплатный сыр в мышеловке». Учимся не быть мышью.",
  },
  {
    key: "theme-intro-privacy",
    purpose: "Вступление к курсу «Приватность / Цифровой след». Каждый клик оставляет след в Сети.",
  },
  {
    key: "outro-win",
    purpose: "Финальная реплика после уровня, где игрок справился отлично (3 звезды, верный вердикт). Хвалим коротко, без сюсюканья.",
  },
  {
    key: "outro-mid",
    purpose: "Финальная реплика после уровня со средним результатом (1-2 звезды). Подбадриваем, зовём на реванш, без негатива.",
  },
  {
    key: "outro-lose",
    purpose: "Финальная реплика после неудачи (0 звёзд или плохой вердикт). Поддерживаем, без обвинений, мотивируем попробовать снова.",
  },
];

async function callGrok(messages, opts = {}) {
  const body = {
    model: MODEL,
    temperature: opts.temperature ?? 1.0,
    max_tokens: opts.max_tokens ?? 1800,
    messages,
  };
  // 3 попытки с экспоненциальной паузой — Grok иногда рвёт TCP
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + XAI_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Grok ${resp.status}: ${t.slice(0, 200)}`);
      }
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content || "";
    } catch (e) {
      lastErr = e;
      if (attempt < 3) {
        const wait = attempt * 1500;
        process.stdout.write(`  (retry ${attempt}/3 через ${wait}мс: ${e.message})\n`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

// Парсер ответа Грока: ищем секции ## EASY ##, ## MEDIUM ##, ## HARD ## с репликами-строками.
function parseSections(text) {
  const sections = { easy: [], medium: [], hard: [] };
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/##\s*(EASY|MEDIUM|HARD)\s*##/i);
    if (m) { cur = m[1].toLowerCase(); continue; }
    if (!cur) continue;
    const clean = line.replace(/^[\-\*•]\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();
    if (clean) sections[cur].push(clean);
  }
  if (!sections.easy.length && !sections.medium.length && !sections.hard.length) return null;
  return sections;
}

async function generateSlot(slot) {
  console.log(`\n→ ${slot.key}`);
  const user = `Слот реплики: "${slot.key}"
Назначение этого слота: ${slot.purpose}

Сгенерируй РОВНО ${PER_AGE * 3} реплик Капитана 404 Мяу для этого слота: ${PER_AGE} для easy (7-9 лет), ${PER_AGE} для medium (9-11), ${PER_AGE} для hard (12+).

Формат вывода СТРОГО:
## EASY ##
- реплика 1
- реплика 2
...
## MEDIUM ##
- реплика 1
- ...
## HARD ##
- ...

Никакого вступительного текста, никаких пояснений до и после — только секции с маркерами.
Каждая реплика — самостоятельная завершённая мысль, 50-160 символов.
Не повторяй формулировки между репликами.
Соблюдай возрастные интонации и обязательное наличие кошачьего маркера ИЛИ молодёжного сленга в каждой реплике.`;

  const text = await callGrok([
    { role: "system", content: SYSTEM },
    { role: "user",   content: user },
  ]);

  let out = parseSections(text);
  if (!out || (out.easy.length === 0 && out.medium.length === 0 && out.hard.length === 0)) {
    console.warn(`  ! ${slot.key}: пустой парс, повторю с уточнением...`);
    const retryText = await callGrok([
      { role: "system", content: SYSTEM },
      { role: "user",   content: user + "\n\nПредыдущий ответ нельзя было распарсить. Выведи СТРОГО три секции ## EASY ##, ## MEDIUM ##, ## HARD ## — в каждой по " + PER_AGE + " строк с дефисом и пробелом в начале." },
    ]);
    out = parseSections(retryText);
    if (!out) {
      console.error(`  ✗ ${slot.key}: повтор неудачный, пропускаю. Первая часть ответа: ${(text || "").slice(0, 200)}`);
      return null;
    }
  }
  console.log(`  ✓ easy ${out.easy.length} / medium ${out.medium.length} / hard ${out.hard.length}`);
  return out;
}

// Основной цикл — с инкрементальным сохранением после каждого слота
await fs.mkdir(path.dirname(OUT), { recursive: true });

// Если файл уже существует — продолжим (incremental resume)
let result;
try {
  const existing = JSON.parse(await fs.readFile(OUT, "utf8"));
  if (existing && existing.slots && existing.schema_version === 1) {
    result = existing;
    result.generated_at = new Date().toISOString();
    console.log(`Найден предыдущий файл: ${Object.keys(result.slots).length} слотов уже есть, продолжу...`);
  }
} catch {}
if (!result) {
  result = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    model: MODEL,
    per_age: PER_AGE,
    slots: {},
  };
}

async function saveProgress() {
  await fs.writeFile(OUT, JSON.stringify(result, null, 2), "utf8");
}

for (const slot of SLOTS) {
  if (result.slots[slot.key]) {
    console.log(`= ${slot.key}: уже сгенерирован, пропускаю (удалите ключ в replicas.json для перегенерации)`);
    continue;
  }
  try {
    const replicas = await generateSlot(slot);
    if (replicas) {
      result.slots[slot.key] = replicas;
      await saveProgress();   // сохраняем после каждого успешного слота
      const total = (replicas.easy?.length || 0) + (replicas.medium?.length || 0) + (replicas.hard?.length || 0);
      process.stdout.write(`  saved (+${total})\n`);
    }
    await new Promise((r) => setTimeout(r, 400));
  } catch (e) {
    console.error(`  ✗ ${slot.key}: ${e.message}`);
  }
}

const total = Object.values(result.slots).reduce((acc, s) => acc + (s.easy?.length || 0) + (s.medium?.length || 0) + (s.hard?.length || 0), 0);
console.log(`\n✓ Готово. ${Object.keys(result.slots).length} слотов, ${total} реплик. → ${OUT}`);
