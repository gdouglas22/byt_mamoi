// Экран выбора сложности — показывается в onboarding и при тапе на кнопку в шапке.
// renderDifficultyPicker(onChoose) возвращает DOM-узел для встраивания в #screen.

import { el } from "./dom.js";
import { select } from "./haptics.js";
import { DIFFICULTY_LABELS, getDifficulty, setDifficulty } from "./difficulty.js";

const ORDER = ["easy", "medium", "hard"];

export function renderDifficultyPicker(onChoose) {
  const current = getDifficulty();
  const root = el("div", { class: "dif-picker" });

  root.appendChild(el("div", { class: "dif-picker-head" }, [
    el("img", { class: "dif-picker-avatar", attrs: { src: "assets/mentor/idle.jpg", alt: "" } }),
    el("div", { class: "dif-picker-bubble" }, [
      el("div", { class: "dif-picker-name", text: "КАПИТАН МЯУ" }),
      el("div", {
        class: "dif-picker-text",
        text: "Скажи, кадет, сколько тебе вёсен? От этого зависит, насколько хитро прятать ловушки.",
      }),
    ]),
  ]));

  const list = el("div", { class: "dif-picker-list" });
  for (const id of ORDER) {
    const info = DIFFICULTY_LABELS[id];
    const isActive = id === current;
    const card = el("button", {
      class: "dif-picker-card" + (isActive ? " active" : ""),
      attrs: { type: "button", "data-dif": id },
      on: {
        click: () => {
          select();
          setDifficulty(id);
          onChoose && onChoose(id);
        },
      },
    }, [
      el("div", { class: "dif-picker-emoji", text: info.emoji }),
      el("div", { class: "dif-picker-body" }, [
        el("div", { class: "dif-picker-title", text: info.title }),
        el("div", { class: "dif-picker-age", text: info.age }),
        el("div", { class: "dif-picker-hint", text: info.hint }),
      ]),
    ]);
    list.appendChild(card);
  }
  root.appendChild(list);

  return root;
}
