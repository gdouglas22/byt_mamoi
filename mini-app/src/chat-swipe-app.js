// Сцена «chat-swipe»: Tinder-стиль свайпов сообщений. Игрок свайпает каждую карточку
// вправо (настоящее) или влево (фейк). После всех — verdict good/ok/bad по % правильности.
// Каждое правильное угадывание = api.hit(`msg-N`); ошибка = api.miss().

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";
import { impact, notify, select } from "./haptics.js";
import { pickMessages } from "./messages-pool.js";
import { getDifficulty } from "./difficulty.js";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderChatSwipe(data, api) {
  const root = el("div", { class: "swipe-app" });

  // Источник сообщений: либо явный массив data.messages, либо динамический пул
  let messages;
  if (Array.isArray(data.messages) && data.messages.length) {
    messages = data.shuffle === false ? data.messages : shuffle(data.messages);
  } else if (data.messagesFrom) {
    messages = pickMessages(data.messagesFrom, {
      age:   data.age || getDifficulty(),
      count: data.count || 8,
    });
  } else {
    messages = [];
  }
  const total = messages.length;
  const state = { idx: 0, correct: 0, wrong: 0 };

  // Шапка с прогрессом
  const header = el("div", { class: "swipe-header" }, [
    el("div", { class: "swipe-icon", text: data.icon || "💬" }),
    el("div", { class: "swipe-titles" }, [
      el("div", { class: "swipe-title", text: data.title || "Входящие сообщения" }),
      el("div", { class: "swipe-counter" }),
    ]),
  ]);
  const counterEl = header.querySelector(".swipe-counter");
  function updateCounter() {
    counterEl.textContent = `${Math.min(state.idx + 1, total)} / ${total}  •  ✓ ${state.correct}  •  ✗ ${state.wrong}`;
  }
  root.appendChild(header);

  // Колода карточек
  const deck = el("div", { class: "swipe-deck" });
  root.appendChild(deck);

  // Подписи зон и кнопок — можно переопределить через data (для тем где «настоящее/обман» не звучит)
  const labelLeft  = data.labelLeft   || "← ОБМАН";
  const labelRight = data.labelRight  || "НАСТОЯЩЕЕ →";
  const btnFakeText = data.btnFakeText || "← Обман";
  const btnRealText = data.btnRealText || "Настоящее →";

  // Лейблы зон
  const zones = el("div", { class: "swipe-zones" }, [
    el("div", { class: "swipe-zone-left",  text: labelLeft }),
    el("div", { class: "swipe-zone-right", text: labelRight }),
  ]);
  root.appendChild(zones);

  // Подсказка
  root.appendChild(el("div", { class: "swipe-hint", text: data.hint || "Свайпни вправо — настоящее, влево — обман. После каждой подскажу, что было не так." }));

  // Объяснение для прошедшей карточки
  const explainBox = el("div", { class: "swipe-explain", attrs: { hidden: "" } });
  root.appendChild(explainBox);

  // Кнопки на случай если не получается свайп
  const buttonsRow = el("div", { class: "swipe-buttons" }, [
    el("button", { class: "swipe-btn swipe-btn-fake",
      attrs: { type: "button" }, text: btnFakeText,
      on: { click: () => decideCurrent("fake") } }),
    el("button", { class: "swipe-btn swipe-btn-real",
      attrs: { type: "button" }, text: btnRealText,
      on: { click: () => decideCurrent("real") } }),
  ]);
  root.appendChild(buttonsRow);

  let topCard = null;
  let dragging = false;
  let startX = 0, startY = 0;
  let pointerId = null;
  let translateX = 0, translateY = 0;

  function showNextCard() {
    if (state.idx >= total) return finish();
    updateCounter();
    explainBox.setAttribute("hidden", "");
    explainBox.replaceChildren();

    const msg = messages[state.idx];
    const card = el("div", { class: "swipe-card" }, [
      el("div", { class: "swipe-card-head" }, [
        el("div", { class: "swipe-card-avatar", text: msg.avatar || senderInitial(msg.sender) }),
        el("div", { class: "swipe-card-from" }, [
          el("div", { class: "swipe-card-sender", text: msg.sender || "Незнакомец" }),
          el("div", { class: "swipe-card-time",   text: msg.time || "только что" }),
        ]),
      ]),
      el("div", { class: "swipe-card-text", text: msg.text || "" }),
      el("div", { class: "swipe-card-badge-fake", text: "ОБМАН" }),
      el("div", { class: "swipe-card-badge-real", text: "НАСТОЯЩЕЕ" }),
    ]);

    // Pointer events для drag
    const onDown = (e) => {
      if (dragging) return;
      dragging = true;
      pointerId = e.pointerId;
      card.setPointerCapture(pointerId);
      startX = e.clientX; startY = e.clientY;
      translateX = 0; translateY = 0;
      card.classList.add("dragging");
      select();
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      translateX = e.clientX - startX;
      translateY = (e.clientY - startY) * 0.4;
      const rot = translateX * 0.08;
      card.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rot}deg)`;
      card.classList.toggle("swipe-towards-real", translateX > 50);
      card.classList.toggle("swipe-towards-fake", translateX < -50);
    };
    const onUp = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      card.classList.remove("dragging", "swipe-towards-real", "swipe-towards-fake");
      const threshold = 90;
      if (translateX >= threshold) decide("real");
      else if (translateX <= -threshold) decide("fake");
      else {
        // вернуть на место
        card.style.transition = "transform 0.22s ease";
        card.style.transform = "translate(0,0) rotate(0)";
        setTimeout(() => { card.style.transition = ""; }, 230);
      }
    };
    card.addEventListener("pointerdown", onDown);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup", onUp);
    card.addEventListener("pointercancel", onUp);

    function decide(decision) {
      const isCorrect = decision === (msg.fake ? "fake" : "real");
      if (isCorrect) {
        state.correct++;
        notify("success");
        api.hit("msg-" + (state.idx + 1));
      } else {
        state.wrong++;
        notify("error");
        impact("medium");
        api.miss();
      }
      // Анимация улёта
      const dir = decision === "real" ? 1 : -1;
      card.style.transition = "transform 0.32s ease, opacity 0.32s ease";
      card.style.transform = `translate(${dir * 600}px, ${translateY}px) rotate(${dir * 30}deg)`;
      card.style.opacity = "0";
      // Показать объяснение и кнопку «Дальше». Ребёнок сам решает когда читать дочитал.
      explainBox.removeAttribute("hidden");
      explainBox.className = "swipe-explain " + (isCorrect ? "ok" : "bad");
      const goNext = () => {
        if (deck.contains(card)) deck.removeChild(card);
        state.idx++;
        topCard = null;
        if (state.idx >= total) finish();
        else showNextCard();
      };
      const isLast = state.idx + 1 >= total;
      // «На самом деле — X» берём из подписей карточки если они переопределены (для тем где «обман/настоящее» не звучит)
      const realLabel = data.cardBadgeReal || "настоящее";
      const fakeLabel = data.cardBadgeFake || "ОБМАН";
      explainBox.replaceChildren(
        el("div", { class: "swipe-explain-tag", text: isCorrect ? "✓ Верно!" : "✗ Мимо. На самом деле — " + (msg.fake ? fakeLabel : realLabel) }),
        el("div", { class: "swipe-explain-text", text: msg.reason || "" }),
        el("button", {
          class: "swipe-explain-next",
          attrs: { type: "button" },
          text: isLast ? "Завершить →" : "Дальше →",
          on: { click: goNext },
        }),
      );
    }

    // Сохраним ссылку для управления кнопками
    topCard = { decide, card };

    deck.appendChild(card);
  }

  function decideCurrent(decision) {
    if (topCard && topCard.decide) topCard.decide(decision);
  }

  function finish() {
    const ratio = total > 0 ? state.correct / total : 0;
    let verdictId;
    if (ratio >= 0.85)      verdictId = "good";
    else if (ratio >= 0.55) verdictId = "ok";
    else                    verdictId = "bad";
    api.verdict(verdictId);
  }

  showNextCard();
  return root;
}

function senderInitial(name) {
  if (!name) return "?";
  const ch = String(name).trim().charAt(0).toUpperCase();
  return ch || "?";
}

registerSceneRenderer("chat-swipe", renderChatSwipe);
