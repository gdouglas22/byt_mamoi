#!/usr/bin/env node
// Генератор пула сообщений для игры «Ловушка в сообщении» через Grok.
// Каждое сообщение: либо настоящее (доставка, мама, друг), либо фейк (фишинг, скам).
// Сохраняется в mini-app/src/data/messages-phishing.json
//
// Запуск: XAI_API_KEY=xai-... node scripts/generate-messages.mjs

import fs from "node:fs/promises";
import path from "node:path";

const XAI_KEY = process.env.XAI_API_KEY;
if (!XAI_KEY) { console.error("ERROR: XAI_API_KEY not set"); process.exit(1); }

const MODEL = process.env.XAI_MODEL || "grok-4-fast";
const PER_AGE = Number(process.env.PER_AGE || 16); // 8 настоящих + 8 фейков
const OUT = path.resolve(process.cwd(), "src/data/messages-phishing.json");

const SYSTEM = `Ты — генератор тренировочных сообщений для игры «Кибер-Академия» (дети 7-12 лет).

Каждое сообщение — это короткий месседж в мессенджере (Telegram/WhatsApp/SMS), такие реально приходят детям. Половина — НАСТОЯЩИЕ (от семьи, друзей, школы, реальных служб). Половина — ФЕЙКИ (фишинг, скам, мошенничество).

ПРАВИЛА:
- Каждое сообщение от 30 до 220 символов.
- Без эмодзи МЕНЯЕМ настоящие на фейки и наоборот: эмодзи бывают и там и там.
- Sender — реальное имя (Мама, Папа, Лиза с района, Маргарита Петровна), или номер +7..., или название сервиса (Сбербанк, Wildberries).
- Тематика для детей: школа, друзья, родители, игры, доставка, фитнес, кружки.

Признаки фейков (используй разные):
- Запрос кода из СМС
- Просьба перейти по странной ссылке
- "Срочно" и угрозы
- Обещание приза/денег
- Просьба номера карты родителей
- Установить «приложение для безопасности»
- "Никому не говори"
- Опечатки в названии бренда
- Странный домен в ссылке (vk-bonus.ru, sberb*nk.com)

Признаки настоящих:
- Конкретика (имя ребёнка, контекст школы/семьи)
- Без срочности и без секретности
- Понятный отправитель, чьё имя ребёнок узнаёт
- Логичная просьба, никаких кодов/паролей

ВОЗРАСТНЫЕ ОСОБЕННОСТИ:
- easy (7-9): простые ситуации (мама, учитель, кружок). Фейки — детские (бесплатные робаксы, призы из игр).
- medium (9-11): добавляются соцсети, игры, школьные чаты. Фейки — про игровые аккаунты, моды.
- hard (12+): социальные сети, доставки, банковские темы. Фейки — взрослее: банк, доставка, ФСБ.

Без мата, без насилия, без жестокости.`;

const AGES = ["easy", "medium", "hard"];

async function callGrok(messages) {
  let lastErr;
  for (let i = 1; i <= 3; i++) {
    try {
      const resp = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + XAI_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, temperature: 0.95, max_tokens: 2500, messages }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Grok ${resp.status}: ${t.slice(0,160)}`);
      }
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content || "";
    } catch (e) {
      lastErr = e;
      if (i < 3) await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw lastErr;
}

function parseMessages(text) {
  // Ожидаем секции ## REAL ## и ## FAKE ##.
  // В каждой строке формат: Sender :: Text :: Reason
  const result = { real: [], fake: [] };
  const lines = text.split(/\r?\n/);
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^##\s*REAL\s*##/i.test(line)) { cur = "real"; continue; }
    if (/^##\s*FAKE\s*##/i.test(line)) { cur = "fake"; continue; }
    if (!cur) continue;
    const cleaned = line.replace(/^[\-\*•]\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();
    if (!cleaned) continue;
    const parts = cleaned.split(/\s*::\s*/);
    if (parts.length >= 2) {
      const [sender, text, reason] = parts;
      result[cur].push({
        sender: (sender || "Незнакомец").trim(),
        text:   (text || "").trim(),
        reason: (reason || "").trim(),
      });
    }
  }
  return result;
}

await fs.mkdir(path.dirname(OUT), { recursive: true });

let store;
try { store = JSON.parse(await fs.readFile(OUT, "utf8")); } catch {}
if (!store || !store.schema_version) {
  store = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    model: MODEL,
    ages: {},
  };
}
async function save() { await fs.writeFile(OUT, JSON.stringify(store, null, 2), "utf8"); }

for (const age of AGES) {
  if (store.ages[age]
      && (store.ages[age].real || []).length >= 6
      && (store.ages[age].fake || []).length >= 6) {
    console.log(`= ${age}: уже есть достаточно (${store.ages[age].real.length} real / ${store.ages[age].fake.length} fake)`);
    continue;
  }
  console.log(`\n→ ${age}`);
  const userMsg = `Сгенерируй ${PER_AGE / 2} НАСТОЯЩИХ и ${PER_AGE / 2} ФЕЙКОВЫХ сообщений для возрастной группы "${age}".

Формат вывода СТРОГО:
## REAL ##
- Отправитель :: Текст сообщения :: Краткое объяснение почему это безопасно (для финального разбора)
- ...
## FAKE ##
- Отправитель :: Текст сообщения :: Что именно подозрительно
- ...

Никаких других пояснений. Только две секции с маркерами.`;

  try {
    const text = await callGrok([
      { role: "system", content: SYSTEM },
      { role: "user",   content: userMsg },
    ]);
    const parsed = parseMessages(text);
    if (parsed.real.length === 0 && parsed.fake.length === 0) {
      console.warn(`  ! ${age}: пустой парс, пробую снова...`);
      const retryText = await callGrok([
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg + "\n\nПредыдущий ответ нельзя было распарсить. Выведи СТРОГО в формате с маркерами ##, без markdown, без других пояснений." },
      ]);
      const r2 = parseMessages(retryText);
      if (r2.real.length || r2.fake.length) { Object.assign(parsed, r2); }
    }
    store.ages[age] = parsed;
    await save();
    console.log(`  ✓ real=${parsed.real.length}, fake=${parsed.fake.length}`);
    await new Promise((r) => setTimeout(r, 400));
  } catch (e) {
    console.error(`  ✗ ${age}: ${e.message}`);
  }
}

const totalReal = Object.values(store.ages).reduce((s, x) => s + (x.real?.length || 0), 0);
const totalFake = Object.values(store.ages).reduce((s, x) => s + (x.fake?.length || 0), 0);
console.log(`\n✓ Готово. Всего: ${totalReal} настоящих + ${totalFake} фейков. → ${OUT}`);
