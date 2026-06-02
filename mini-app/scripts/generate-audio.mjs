#!/usr/bin/env node
// Генератор аудио-реплик для игры «Призовой звонок» через OpenAI TTS.
// Запуск: OPENAI_API_KEY=sk-... node scripts/generate-audio.mjs
// Сохраняет mp3 в mini-app/assets/audio/phishing-3/

import fs from "node:fs/promises";
import path from "node:path";

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error("ERROR: OPENAI_API_KEY not set"); process.exit(1); }

const OUT_DIR = path.resolve(process.cwd(), "assets/audio/phishing-3");
const TTS_URL = "https://api.openai.com/v1/audio/speech";
const VOICE = "alloy";
const INSTRUCTIONS = "Голос телефонной мошенницы под видом банковского сотрудника. Спокойный, чуть приторно-доброжелательный, женский, ровный темп, как у автоответчицы из банка. Лёгкое психологическое давление — слегка ускоряется к концу фразы, когда говорит про срочность.";

// Сценарий разговора. Каждая запись = отдельный mp3 файл.
const SCRIPT = [
  { id: "01-intro",     text: "Здравствуйте! Это служба безопасности Сбербанка. Меня зовут Анна Петровна. Поздравляю — вы выиграли в розыгрыше нашего банка десять тысяч рублей." },
  { id: "02-name",      text: "Чтобы начислить деньги, мне нужно подтвердить, что вы — это вы. Подскажите, пожалуйста, как вас зовут и сколько вам лет?" },
  { id: "03-code",      text: "Замечательно. Сейчас на ваш телефон придёт эс-эм-эс с кодом из шести цифр. У нас очень мало времени — назовите код в течение тридцати секунд, и приз будет ваш." },
  { id: "04-secret",    text: "И ещё одно — это очень важно. Никому не говорите про этот звонок. Ни маме, ни папе, ни друзьям. Это закрытая процедура, иначе приз сгорит." },
  { id: "05-card",      text: "Отлично. И последнее: продиктуйте, пожалуйста, номер банковской карты, которая лежит у мамы или папы. Четыре группы по четыре цифры. Это нужно для перевода приза." },
];

async function tts(text) {
  const resp = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Authorization": "Bearer " + KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: VOICE,
      input: text,
      instructions: INSTRUCTIONS,
      response_format: "mp3",
      speed: 0.98,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`TTS ${resp.status}: ${t.slice(0, 200)}`);
  }
  const buf = await resp.arrayBuffer();
  return Buffer.from(buf);
}

await fs.mkdir(OUT_DIR, { recursive: true });

for (const item of SCRIPT) {
  const outPath = path.join(OUT_DIR, `${item.id}.mp3`);
  try {
    const stat = await fs.stat(outPath);
    if (stat.size > 1000) { console.log(`= ${item.id}: уже есть (${stat.size} б), пропускаю`); continue; }
  } catch {}
  console.log(`→ ${item.id}: «${item.text.slice(0, 50)}...»`);
  try {
    const mp3 = await tts(item.text);
    await fs.writeFile(outPath, mp3);
    console.log(`  ✓ ${outPath} (${mp3.length} б)`);
    await new Promise((r) => setTimeout(r, 300));
  } catch (e) {
    console.error(`  ✗ ${item.id}: ${e.message}`);
  }
}
console.log(`\n✓ Готово. Аудио в ${OUT_DIR}`);
