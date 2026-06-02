// Сцена «url-swipe»: свайп карточек-адресных-строк. Игрок видит контекст («хочу зайти на Roblox»)
// и адресную строку браузера, решает: настоящее (вправо) или обман (влево).
//
// Структура item в пуле: { intent, url, reason, fake }
// Загружается через тот же messages-pool (структура { ages: { easy/medium/hard: { real, fake } } }).

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

function splitUrl(url) {
  // Делим URL на протокол + хост + путь для подсветки.
  // Возвращает { protocol, host, path }.
  const m = /^(https?:\/\/)?([^/]+)(\/.*)?$/i.exec(url || "");
  if (!m) return { protocol: "", host: url || "", path: "" };
  return { protocol: m[1] || "", host: m[2] || "", path: m[3] || "" };
}

function renderUrlSwipe(data, api) {
  const root = el("div", { class: "swipe-app url-swipe" });

  // Источник адресов
  let items;
  if (Array.isArray(data.items) && data.items.length) {
    items = data.shuffle === false ? data.items : shuffle(data.items);
  } else if (data.urlsFrom) {
    items = pickMessages(data.urlsFrom, {
      age:   data.age || getDifficulty(),
      count: data.count || 8,
    });
  } else {
    items = [];
  }
  const total = items.length;
  const state = { idx: 0, correct: 0, wrong: 0 };

  // Шапка с прогрессом
  const header = el("div", { class: "swipe-header" }, [
    el("div", { class: "swipe-icon", text: data.icon || "🌐" }),
    el("div", { class: "swipe-titles" }, [
      el("div", { class: "swipe-title", text: data.title || "Сайты" }),
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

  // Зоны (тексты можно переопределить через data.labelLeft / data.labelRight)
  const labelLeft  = data.labelLeft  || "← ОБМАН";
  const labelRight = data.labelRight || "НАСТОЯЩИЙ →";
  const zones = el("div", { class: "swipe-zones" }, [
    el("div", { class: "swipe-zone-left",  text: labelLeft }),
    el("div", { class: "swipe-zone-right", text: labelRight }),
  ]);
  root.appendChild(zones);

  // Подсказка
  root.appendChild(el("div", { class: "swipe-hint", text: data.hint || "Свайпни вправо — это настоящий сайт. Влево — обман. После каждой подскажу почему." }));

  // Блок объяснения после ответа
  const explainBox = el("div", { class: "swipe-explain", attrs: { hidden: "" } });
  root.appendChild(explainBox);

  // Кнопки (тексты тоже можно переопределить через data.btnFakeText / data.btnRealText)
  const btnFakeText = data.btnFakeText || "← Обман";
  const btnRealText = data.btnRealText || "Настоящий →";
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

    const item = items[state.idx];
    const parts = splitUrl(item.url || item.text || "");
    const isHttp  = /^http:\/\//i.test(parts.protocol);
    const isHttps = /^https:\/\//i.test(parts.protocol);

    // Иконка слева от адреса — как в настоящем браузере: замок для https, предупреждение для http
    const lockBadge = isHttps
      ? el("span", { class: "url-card-lock safe", attrs: { title: "Защищённое соединение" }, text: "🔒" })
      : isHttp
        ? el("span", { class: "url-card-lock danger", attrs: { title: "Небезопасно" }, text: "⚠" })
        : null;

    // Бейджи свайпа: тексты можно переопределить через data
    const badgeFake = data.cardBadgeFake || "ОБМАН";
    const badgeReal = data.cardBadgeReal || "НАСТОЯЩИЙ";

    // Карточка: контекст сверху + браузерная панель снизу
    const card = el("div", { class: "swipe-card url-card" }, [
      el("div", { class: "url-card-intent" }, [
        el("span", { class: "url-card-intent-icon", text: "🤔" }),
        el("span", { class: "url-card-intent-text", text: item.intent || item.sender || "Какой это сайт?" }),
      ]),
      el("div", { class: "url-card-browser" }, [
        el("div", { class: "url-card-dots" }, [
          el("span", { class: "url-card-dot dot-red" }),
          el("span", { class: "url-card-dot dot-yellow" }),
          el("span", { class: "url-card-dot dot-green" }),
        ]),
        el("div", { class: "url-card-bar" }, [
          lockBadge,
          parts.protocol
            ? el("span", { class: "url-card-protocol" + (isHttp ? " danger" : "") , text: parts.protocol })
            : null,
          el("span", { class: "url-card-host", text: parts.host }),
          parts.path ? el("span", { class: "url-card-path", text: parts.path }) : null,
        ]),
      ]),
      el("div", { class: "swipe-card-badge-fake", text: badgeFake }),
      el("div", { class: "swipe-card-badge-real", text: badgeReal }),
    ]);

    // Pointer / drag — копия логики chat-swipe
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
      const isCorrect = decision === (item.fake ? "fake" : "real");
      if (isCorrect) {
        state.correct++;
        notify("success");
        api.hit("url-" + (state.idx + 1));
      } else {
        state.wrong++;
        notify("error");
        impact("medium");
        api.miss();
      }
      const dir = decision === "real" ? 1 : -1;
      card.style.transition = "transform 0.32s ease, opacity 0.32s ease";
      card.style.transform = `translate(${dir * 600}px, ${translateY}px) rotate(${dir * 30}deg)`;
      card.style.opacity = "0";
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
      const wrongText = data.cardBadgeFake
        ? ("Мимо. На самом деле — " + (item.fake ? data.cardBadgeFake : (data.cardBadgeReal || "настоящий сайт")))
        : ("Мимо. На самом деле — " + (item.fake ? "ОБМАН" : "настоящий сайт"));
      explainBox.replaceChildren(
        el("div", { class: "swipe-explain-tag", text: isCorrect ? "✓ Верно!" : "✗ " + wrongText }),
        el("div", { class: "swipe-explain-text", text: item.reason || "" }),
        el("button", {
          class: "swipe-explain-next",
          attrs: { type: "button" },
          text: isLast ? "Завершить →" : "Дальше →",
          on: { click: goNext },
        }),
      );
    }

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

registerSceneRenderer("url-swipe", renderUrlSwipe);
