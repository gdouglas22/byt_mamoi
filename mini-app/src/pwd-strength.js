// Сцена «pwd-strength»: тренажёр «Сила пароля».
// Ребёнку по одному показываются пароли. Для каждого он выбирает одну из трёх кнопок:
// «слабый» / «средний» / «сильный». Верная оценка → api.hit("pwd-N"), ошибка → api.miss().
// После каждого пароля — короткий разбор (почему он такой). После всех → api.verdict("done").
//
// Формат data:
// {
//   title: "Кузница паролей",
//   icon: "🔑",
//   hint: "Оцени каждый пароль...",
//   passwords: [
//     { value: "12345",          strength: "weak",   why: "Пять цифр подряд — ..." },
//     { value: "Кот",            strength: "weak",   why: "Слишком коротко и словарное слово ..." },
//     { value: "Tr0pic#Banana7", strength: "strong", why: "Длинный, есть буквы, цифры, знак ..." },
//     ...
//   ],
// }
// strength: "weak" | "medium" | "strong"

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";
import { impact, notify, select } from "./haptics.js";

// Подписи и пояснения для трёх уровней силы пароля — словами ребёнка.
const STRENGTH_META = {
  weak:   { label: "Слабый",  emoji: "🔓", cls: "weak" },
  medium: { label: "Средний", emoji: "🔐", cls: "medium" },
  strong: { label: "Сильный", emoji: "🔒", cls: "strong" },
};

function renderPwdStrength(data, api) {
  const root = el("div", { class: "pwd-strength" });

  const passwords = Array.isArray(data.passwords) ? data.passwords : [];
  const total = passwords.length;
  const state = { idx: 0, correct: 0, wrong: 0, locked: false };

  // Шапка с прогрессом
  const header = el("div", { class: "pwd-header" }, [
    el("div", { class: "pwd-header-icon", text: data.icon || "🔑" }),
    el("div", { class: "pwd-header-titles" }, [
      el("div", { class: "pwd-header-title", text: data.title || "Сила пароля" }),
      el("div", { class: "pwd-header-counter" }),
    ]),
  ]);
  const counterEl = header.querySelector(".pwd-header-counter");
  root.appendChild(header);

  // Подсказка
  if (data.hint) {
    root.appendChild(el("div", { class: "pwd-hint", text: data.hint }));
  }

  // Карточка с паролем
  const cardWrap = el("div", { class: "pwd-card-wrap" });
  root.appendChild(cardWrap);

  // Три кнопки выбора
  const choicesBar = el("div", { class: "pwd-choices" });
  root.appendChild(choicesBar);

  // Блок разбора + кнопка «Дальше»
  const explainBox = el("div", { class: "pwd-explain", attrs: { hidden: "" } });
  root.appendChild(explainBox);

  function updateCounter() {
    counterEl.textContent =
      `Пароль ${Math.min(state.idx + 1, total)} / ${total}  •  верно: ${state.correct}`;
  }

  function makeChoiceButton(key) {
    const meta = STRENGTH_META[key];
    return el("button", {
      class: "pwd-choice pwd-choice-" + meta.cls,
      attrs: { type: "button", "data-strength": key },
      on: { click: () => decide(key) },
    }, [
      el("span", { class: "pwd-choice-emoji", text: meta.emoji }),
      el("span", { class: "pwd-choice-label", text: meta.label }),
    ]);
  }

  function showCard() {
    if (state.idx >= total) return finish();
    state.locked = false;
    updateCounter();
    explainBox.setAttribute("hidden", "");
    explainBox.replaceChildren();

    const pw = passwords[state.idx];

    // Карточка-«экранчик» с паролем крупно
    cardWrap.replaceChildren(
      el("div", { class: "pwd-card" }, [
        el("div", { class: "pwd-card-caption", text: "Этот пароль —" }),
        el("div", { class: "pwd-card-value", text: pw.value || "" }),
        el("div", { class: "pwd-card-len", text: "длина: " + String((pw.value || "").length) + " знаков" }),
      ]),
    );

    // Кнопки активны
    choicesBar.replaceChildren(
      makeChoiceButton("weak"),
      makeChoiceButton("medium"),
      makeChoiceButton("strong"),
    );
  }

  function decide(choice) {
    if (state.locked) return;
    state.locked = true;
    select();

    const pw = passwords[state.idx];
    const correctKey = pw.strength;
    const isCorrect = choice === correctKey;

    if (isCorrect) {
      state.correct++;
      notify("success");
      api.hit("pwd-" + (state.idx + 1));
    } else {
      state.wrong++;
      notify("error");
      impact("medium");
      api.miss();
    }

    // Подсветить кнопки: правильную — зелёным, ошибочный выбор — красным.
    const btns = choicesBar.querySelectorAll(".pwd-choice");
    btns.forEach((b) => {
      const key = b.getAttribute("data-strength");
      b.setAttribute("disabled", "");
      if (key === correctKey) b.classList.add("pwd-choice-right");
      else if (key === choice) b.classList.add("pwd-choice-wrong");
    });

    const correctMeta = STRENGTH_META[correctKey];
    const isLast = state.idx + 1 >= total;

    explainBox.className = "pwd-explain " + (isCorrect ? "ok" : "bad");
    explainBox.removeAttribute("hidden");
    explainBox.replaceChildren(
      el("div", { class: "pwd-explain-tag" },
        isCorrect
          ? [el("span", { text: "✓ Верно! Это " }), el("strong", { text: correctMeta.label.toLowerCase() + " пароль" })]
          : [el("span", { text: "✗ Мимо. На самом деле это " }), el("strong", { text: correctMeta.label.toLowerCase() + " пароль" })]
      ),
      el("div", { class: "pwd-explain-text", text: pw.why || "" }),
      el("button", {
        class: "pwd-explain-next",
        attrs: { type: "button" },
        text: isLast ? "Завершить →" : "Дальше →",
        on: { click: goNext },
      }),
    );
  }

  function goNext() {
    state.idx++;
    if (state.idx >= total) finish();
    else showCard();
  }

  function finish() {
    api.verdict("done");
  }

  showCard();
  return root;
}

registerSceneRenderer("pwd-strength", renderPwdStrength);
