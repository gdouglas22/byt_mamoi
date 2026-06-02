// Экран разбора уровня: звёзды, что нашёл, что упустил, чем это грозило,
// финальный отзыв Капитана. Заменяет минимальный outro-cutscene на полноценный
// «отчёт» — самое важное для обучения: разбор последствий.

import { el } from "./dom.js";
import { select } from "./haptics.js";

// Подписи действий — из самой сцены уровня (enrichments). Жёстких хардкодов нет:
// игра-почта даёт «В спам/Удалить/...», сайт — «Закрыть сайт/Получить робаксы», звонок — «Положить трубку» и т.д.
// Если по какой-то причине подпись не нашлась — возвращаем сам id (а не пустую строку).
function buildActionLabels(level) {
  const map = {};
  for (const scene of Object.values(level && level.scenes || {})) {
    const acts = (scene && scene.data && scene.data.actions) || [];
    for (const a of acts) {
      if (a && a.id) map[a.id] = a.label || a.id;
    }
  }
  return map;
}

function verdictHeadline(stars, verdict) {
  // Источник правды — звёзды от сервера. «Мошенник победил» только если
  // звёзд ноль И игрок явно выбрал плохой вариант (открыл ссылку / назвал код / итп).
  if (stars >= 3) return { icon: "🏆", title: "Идеально!" };
  if (stars === 2) return { icon: "👍", title: "Хорошо" };
  if (stars === 1) return { icon: "🐱", title: "Кое-что поймал" };
  if (verdict === "bad") return { icon: "💥", title: "Мошенник победил" };
  return { icon: "😿", title: "Не повезло" };
}

function captainQuip(level, result) {
  // Если в уровне прописан тематический win/lose (с упоминанием вилана) —
  // используем его как приоритетную реплику. Это работает для всех типов quest.
  const { stars, verdict, foundIds = [] } = result;
  if (stars >= 2 && level && level.win && level.win.text) return level.win.text;
  if ((stars <= 0 || verdict === "bad") && level && level.lose && level.lose.text) return level.lose.text;

  // Шаблонная реплика — для случаев когда у уровня нет своего текста.
  const has = (ids) => ids.some((id) => foundIds.includes(id));
  const strongMessages = [];
  if (has(["domainFrom", "linkFake", "brandTypo"])) strongMessages.push("ты внимателен к адресам и брендам");
  if (has(["urgency", "secrecy"]))                  strongMessages.push("ты не ведёшься на психологическое давление");
  if (has(["typo", "cyrLatMix", "impersonal"]))     strongMessages.push("ты тонко видишь подделки в тексте");

  let head;
  if (stars >= 3) {
    head = "Идеально, кадет! Мошенник побеждён, ловушка обезврежена. Так держать!";
  } else if (stars === 2) {
    head = "Молодец! Ты заметил почти всё — мошеннику тут ничего не светит.";
  } else if (stars === 1) {
    head = "Кое-что заметил, но половину пропустил. Возьми реванш — будет больше звёзд.";
  } else if (verdict === "bad") {
    head = "Эх, ты попался в ловушку. В следующий раз — присмотрись внимательнее.";
  } else {
    head = "Почти ничего не нашёл. Не сдавайся — попробуй ещё раз, ты справишься.";
  }
  const strong = strongMessages.length ? "Что у тебя особенно сильно: " + strongMessages.join("; ") + "." : "";
  return head + (strong ? " " + strong : "");
}

export function renderLevelResult(level, result, handlers = {}) {
  const { stars, verdict, action, foundIds = [], activeTargets = [], misses, total, found } = result;
  const foundSet = new Set(foundIds);
  const targets = activeTargets;
  const actionLabels = buildActionLabels(level);
  const labelFor = (id) => actionLabels[id] || id || "";

  const head = verdictHeadline(stars, verdict);
  const root = el("div", { class: "level-result" });

  // Шапка
  root.appendChild(el("div", { class: "lr-head" }, [
    el("div", { class: "lr-icon", text: head.icon }),
    el("h2", { class: "lr-title", text: head.title }),
    starsRow(stars),
    el("div", { class: "lr-counter", text: `Нашёл ${found} из ${total}  •  Промахов: ${misses}` }),
  ]));

  // Вердикт-комментарий (что выбрал и к чему это привело).
  // Не показываем для свайп-формата: там action == verdict ("good"/"ok"/"bad") — это автоитог,
  // а не выбор кнопки. Игроку и так всё понятно из счётчика и звёзд.
  if (action && action !== verdict) {
    const verdictNote = verdict === "bad"
      ? `Ты выбрал «${labelFor(action)}» — это и было ловушкой. Так атакующий получает доступ к твоим данным.`
      : verdict === "good"
      ? `Ты выбрал «${labelFor(action)}» — правильно. Мошенник остался ни с чем.`
      : `Ты выбрал «${labelFor(action)}» — допустимо, но можно было аккуратнее.`;
    root.appendChild(el("div", { class: "lr-verdict " + (verdict === "bad" ? "bad" : verdict === "good" ? "good" : "ok") }, [
      el("div", { class: "lr-verdict-tag", text: verdict === "bad" ? "Ошибка" : verdict === "good" ? "Верное решение" : "Можно лучше" }),
      el("div", { class: "lr-verdict-text", text: verdictNote }),
    ]));
  }

  // Что нашёл
  const foundTargets = targets.filter((t) => foundSet.has(t.id));
  if (foundTargets.length) {
    const sec = el("div", { class: "lr-section" }, [
      el("h3", { class: "lr-section-title", text: `Ты заметил: ${foundTargets.length}` }),
    ]);
    for (const t of foundTargets) {
      sec.appendChild(el("div", { class: "lr-item ok" }, [
        el("div", { class: "lr-item-icon", text: "✓" }),
        el("div", { class: "lr-item-body" }, [
          el("div", { class: "lr-item-label", text: t.label }),
          t.why ? el("div", { class: "lr-item-why", text: t.why }) : null,
        ]),
      ]));
    }
    root.appendChild(sec);
  }

  // Что упустил
  const missed = targets.filter((t) => !foundSet.has(t.id));
  if (missed.length) {
    const sec = el("div", { class: "lr-section" }, [
      el("h3", { class: "lr-section-title", text: `Упустил: ${missed.length}` }),
      el("div", { class: "lr-section-sub", text: "Если бы ты не заметил — вот что могло случиться:" }),
    ]);
    for (const t of missed) {
      sec.appendChild(el("div", { class: "lr-item miss" }, [
        el("div", { class: "lr-item-icon", text: "!" }),
        el("div", { class: "lr-item-body" }, [
          el("div", { class: "lr-item-label", text: t.label }),
          t.risk ? el("div", { class: "lr-item-risk", text: t.risk }) : (t.why ? el("div", { class: "lr-item-why", text: t.why }) : null),
        ]),
      ]));
    }
    root.appendChild(sec);
  }

  // Реплика Капитана — карточка-цитата
  const quip = el("div", { class: "lr-quip" });
  quip.appendChild(el("img", { class: "lr-quip-avatar", attrs: { src: "assets/mentor/" + (stars >= 2 ? "happy" : stars === 1 ? "idle" : "sad") + ".jpg", alt: "" } }));
  const bubble = el("div", { class: "lr-quip-bubble" }, [
    el("div", { class: "lr-quip-name", text: "Капитан Мяу" }),
    el("div", { class: "lr-quip-text", text: captainQuip(level, result) }),
  ]);
  // AI-отзыв через Грока отключён — Грок выдавал общие шаблоны и стирал наши тексты с виланами.
  // Если когда-нибудь захочется вернуть — снять комментарии (тогда captainQuip станет fallback'ом).
  // loadAIGrade(level, result).then((text) => {
  //   if (text) bubble.querySelector(".lr-quip-text").textContent = text;
  // }).catch(() => {});
  quip.appendChild(bubble);
  root.appendChild(quip);

  // Кнопки
  const actions = el("div", { class: "actions" }, [
    el("button", {
      class: "btn ghost", text: "↻ Перепройти", attrs: { type: "button" },
      on: { click: () => { select(); handlers.onReplay && handlers.onReplay(); } },
    }),
    el("button", {
      class: "btn", text: "К уровням темы", attrs: { type: "button" },
      on: { click: () => { select(); handlers.onMenu && handlers.onMenu(); } },
    }),
  ]);
  root.appendChild(actions);

  return root;
}

function starsRow(stars) {
  const row = el("div", { class: "lr-stars" });
  for (let i = 0; i < 3; i++) {
    row.appendChild(el("span", { class: i < stars ? "star-on" : "star-off", text: "★" }));
  }
  return row;
}

// ===== AI-grading (опционально) =====
// Кэширует результат в localStorage по сигнатуре (levelId|stars|verdict|foundCount).
// Если /api/grade недоступен или возвращает ошибку — тихо игнорируем, остаётся шаблонная реплика.

async function loadAIGrade(level, result) {
  const sig = [level.id, result.stars, result.verdict, result.found, (result.foundIds || []).join(",")].join("|");
  const cacheKey = "cyberdef.ai.grade." + sig;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch {}
  try {
    const resp = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        levelId: level.id,
        themeName: level.title,
        stars: result.stars,
        verdict: result.verdict,
        action: result.action,
        foundIds: result.foundIds,
        targets: (result.activeTargets || []).map(({ id, label }) => ({ id, label })),
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = (data && data.text) ? String(data.text).trim() : null;
    if (text) {
      try { localStorage.setItem(cacheKey, text); } catch {}
    }
    return text;
  } catch {
    return null;
  }
}
