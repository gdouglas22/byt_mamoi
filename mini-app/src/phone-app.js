// Сцена «phone-call»: симуляция телефонного звонка от мошенника.
// Реплики проигрываются последовательно как аудио + появляются текстом снизу,
// в тексте подсвечены подозрительные фразы (hot-spots). Игрок может в любой момент
// положить трубку (action: hangup → verdict good) или ответить на запросы (бады).

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";

function renderPhoneCall(data, api) {
  const root = el("div", { class: "phone-call" });
  const lines = data.lines || [];      // [{ audio, text, segments: [{text} | {hot, text}] }]
  let idx = 0;
  let audioEl = null;
  let isHangedUp = false;

  // Шапка-вызов
  const header = el("div", { class: "phone-header" }, [
    el("div", { class: "phone-caller-avatar", text: data.callerAvatar || "🏦" }),
    el("div", { class: "phone-caller-body" }, [
      el("div", { class: "phone-caller-name", text: data.callerName || "Сбербанк · Служба безопасности" }),
      el("div", { class: "phone-caller-status", text: "идёт разговор" }),
    ]),
    el("div", { class: "phone-caller-bars" }, [
      el("span"), el("span"), el("span"), el("span"),
    ]),
  ]);
  root.appendChild(header);

  // Поток сообщений (chat-стиль)
  const stream = el("div", { class: "phone-stream" });
  root.appendChild(stream);

  // Подпись внизу
  const hint = el("div", { class: "phone-hint", text: data.hint || "🔍 Кликай на подозрительные слова в тексте. Положи трубку, когда поймёшь, что это обман." });
  root.appendChild(hint);

  // Нижние кнопки действий
  const actionsBar = el("div", { class: "phone-actions" });
  for (const a of (data.actions || [])) {
    actionsBar.appendChild(el("button", {
      class: "phone-action " + (a.kind === "danger" ? "phone-action-danger" : "phone-action-safe"),
      attrs: { type: "button", "data-action": a.id },
      on: { click: () => {
        if (audioEl) { try { audioEl.pause(); } catch {} }
        isHangedUp = true;
        api.verdict(a.id);
      }},
    }, [
      el("span", { class: "phone-action-icon", text: a.icon || "" }),
      el("span", { class: "phone-action-label", text: a.label || a.id }),
    ]));
  }
  root.appendChild(actionsBar);

  // Делегирование hits на stream
  stream.addEventListener("click", (e) => {
    const hotEl = e.target && e.target.closest && e.target.closest("[data-hot]");
    if (hotEl && !hotEl.classList.contains("found")) {
      e.stopPropagation();
      hotEl.classList.add("found");
      api.hit(hotEl.getAttribute("data-hot"));
    }
  });

  // Последовательное проигрывание реплик
  function playNext() {
    if (isHangedUp) return;
    if (idx >= lines.length) return; // конец — игрок должен сам принять решение
    const line = lines[idx];
    idx++;

    // Создаём bubble с текстом (пустой, заполнится по мере воспроизведения)
    const bubble = el("div", { class: "phone-bubble" });
    const bubbleText = el("div", { class: "phone-bubble-text" });
    for (const seg of (line.segments || [])) {
      if (typeof seg === "string") {
        bubbleText.appendChild(el("span", { text: seg }));
      } else if (seg && seg.hot) {
        bubbleText.appendChild(el("span", { class: "phx-hot", attrs: { "data-hot": seg.hot }, text: seg.text }));
      } else {
        bubbleText.appendChild(el("span", { text: (seg && seg.text) || "" }));
      }
    }
    bubble.appendChild(bubbleText);
    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;

    // Если есть audio — играем; после завершения — следующая реплика
    if (line.audio) {
      try {
        audioEl = new Audio(line.audio);
        audioEl.addEventListener("ended", () => {
          if (isHangedUp) return;
          setTimeout(playNext, 600);
        });
        audioEl.addEventListener("error", () => setTimeout(playNext, 1200));
        audioEl.play().catch(() => setTimeout(playNext, 1200));
      } catch {
        setTimeout(playNext, 1500);
      }
    } else {
      setTimeout(playNext, 1500);
    }
  }
  // Стартуем после небольшой паузы для эффекта «звонок поднят»
  setTimeout(playNext, 400);

  return root;
}

registerSceneRenderer("phone-call", renderPhoneCall);
