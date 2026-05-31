// Vercel Edge Function: финальный отзыв Капитана Мяу по итогам уровня.
// Провайдер выбирается автоматически из env (приоритет xAI Grok → OpenAI).
// При отсутствии всех ключей или ошибке возвращаем 200 c пустым text — фронт оставит шаблонную реплику.

export const config = { runtime: "edge" };

function pickProvider() {
  if (process.env.XAI_API_KEY)       return { name: "xai",       key: process.env.XAI_API_KEY,       url: "https://api.x.ai/v1/chat/completions",     model: process.env.XAI_MODEL    || "grok-4-fast" };
  if (process.env.OPENAI_API_KEY)    return { name: "openai",    key: process.env.OPENAI_API_KEY,    url: "https://api.openai.com/v1/chat/completions", model: process.env.OPENAI_MODEL || "gpt-4o-mini" };
  return null;
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ text: "" }), { status: 200, headers: { "Content-Type": "application/json" } }); }

  const provider = pickProvider();
  if (!provider) {
    return new Response(JSON.stringify({ text: "" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const { levelId, themeName, stars, verdict, action, foundIds, targets } = body || {};
  const total = Array.isArray(targets) ? targets.length : 0;
  const found = Array.isArray(foundIds) ? foundIds.length : 0;
  const foundLabels = (targets || [])
    .filter((t) => Array.isArray(foundIds) && foundIds.includes(t.id))
    .map((t) => t.label);
  const missedLabels = (targets || [])
    .filter((t) => !(Array.isArray(foundIds) && foundIds.includes(t.id)))
    .map((t) => t.label);

  const sys = `Ты — Капитан Мяу, кот-наставник в Кибер-Академии для детей 7-12 лет.
Говоришь коротко (3-4 предложения), просто, с тёплым кошачьим юмором — «мяу», «лапы», «хвост» используй в меру.
Никогда не сюсюкаешься. Подмечаешь СИЛЬНЫЕ стороны игрока и даёшь ОДИН чёткий совет на будущее.
Не повторяй цифры результата. Без markdown. Только текст.`;

  const userMsg = [
    `Уровень: «${themeName || levelId || "—"}»`,
    `Результат: ${stars}/3 звёзд`,
    `Финальное действие: ${action || "—"} (вердикт: ${verdict || "—"})`,
    `Найдено ${found} из ${total} ловушек.`,
    foundLabels.length ? `Заметил: ${foundLabels.join(", ")}.` : "",
    missedLabels.length ? `Упустил: ${missedLabels.join(", ")}.` : "",
    "Напиши финальный отзыв (3-4 предложения): что игрок сделал круто, в чём его сильная сторона, и один конкретный совет на следующий уровень.",
  ].filter(Boolean).join("\n");

  let text = "";
  try {
    // xAI и OpenAI используют одинаковый /v1/chat/completions формат
    const resp = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + provider.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 280,
        temperature: 0.8,
        messages: [
          { role: "system", content: sys },
          { role: "user",   content: userMsg },
        ],
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const choice = data && data.choices && data.choices[0];
      text = (choice && choice.message && choice.message.content ? String(choice.message.content) : "").trim();
    }
  } catch {
    text = "";
  }

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
