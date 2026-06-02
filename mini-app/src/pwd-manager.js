// Сцена «pwd-manager»: серия решений про пароли. Ребёнок по шагам помогает Капитану Мяу
// навести порядок с ключами от своих аккаунтов и побеждает Короля Подделок.
//
// Каждый шаг — ситуация с 2-3 вариантами. У одного варианта correct:true.
// Верный выбор  → api.hit("step-N") + разбор «почему верно».
// Неверный      → api.miss() + разбор «что было бы, если так сделать».
// После разбора кнопка «Дальше». На последнем шаге — api.verdict("done").
//
// Звёзды считает движок: targets = по одному step-N на каждый шаг, число hit == число шагов.
// verdict "done" должен быть в level.verdicts.good (3★ при всех верных ответах).
//
// Формат data:
// {
//   intro: "Короткое вступление перед первым шагом (опционально)",
//   steps: [
//     {
//       id: "step-1",
//       scene: "Король Подделок предлагает...",   // текст ситуации
//       icon: "🔑",                                // эмодзи-иллюстрация (опц.)
//       options: [
//         { id:"a", text:"Один пароль на всё",  correct:false,
//           explain:"Если утечёт один сайт — взломают все аккаунты сразу." },
//         { id:"b", text:"Разные пароли + менеджер", correct:true,
//           explain:"Менеджер паролей запоминает их за тебя — ты помнишь только один." },
//       ],
//     }, ...
//   ],
//   doneAction: "done",   // id вердикта (по умолчанию "done")
// }

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";
import { impact, notify, select } from "./haptics.js";

function renderPwdManager(data, api) {
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const total = steps.length;
  const doneAction = data.doneAction || "done";

  const root = el("div", { class: "pwd-app" });

  // Шапка с прогрессом-точками
  const header = el("div", { class: "pwd-header" }, [
    el("div", { class: "pwd-header-icon", text: "🔐" }),
    el("div", { class: "pwd-header-titles" }, [
      el("div", { class: "pwd-header-title", text: data.title || "Связка ключей Капитана Мяу" }),
      el("div", { class: "pwd-progress" }),
    ]),
  ]);
  const progressEl = header.querySelector(".pwd-progress");
  root.appendChild(header);

  // Вступление (один раз)
  if (data.intro) {
    root.appendChild(el("div", { class: "pwd-intro", text: data.intro }));
  }

  // Контейнер текущего шага
  const stepHost = el("div", { class: "pwd-step-host" });
  root.appendChild(stepHost);

  const state = { idx: 0, correctCount: 0 };

  function renderProgress() {
    progressEl.replaceChildren(
      ...steps.map((_, i) => {
        let cls = "pwd-dot";
        if (i < state.idx) cls += " done";
        else if (i === state.idx) cls += " active";
        return el("span", { class: cls });
      }),
      el("span", { class: "pwd-progress-label", text: `  Шаг ${Math.min(state.idx + 1, total)} из ${total}` }),
    );
  }

  function showStep() {
    if (state.idx >= total) return finish();
    renderProgress();

    const step = steps[state.idx];
    const card = el("div", { class: "pwd-card" });

    // Иллюстрация-эмодзи + текст ситуации
    if (step.icon) {
      card.appendChild(el("div", { class: "pwd-step-icon", text: step.icon }));
    }
    card.appendChild(el("div", { class: "pwd-step-scene", text: step.scene || "" }));

    // Кнопки вариантов
    const optsWrap = el("div", { class: "pwd-options" });
    const buttons = [];
    for (const opt of (step.options || [])) {
      const btn = el("button", {
        class: "pwd-option",
        attrs: { type: "button" },
      }, [
        el("span", { class: "pwd-option-mark" }),
        el("span", { class: "pwd-option-text", text: opt.text || "" }),
      ]);
      btn.addEventListener("click", () => choose(opt, btn));
      buttons.push({ btn, opt });
      optsWrap.appendChild(btn);
    }
    card.appendChild(optsWrap);

    // Блок разбора (скрыт до выбора)
    const explainBox = el("div", { class: "pwd-explain", attrs: { hidden: "" } });
    card.appendChild(explainBox);

    let answered = false;

    function choose(opt, btn) {
      if (answered) return;
      answered = true;
      select();

      // Подсветить кнопки: верную — зелёным, выбранную неверную — красным
      buttons.forEach(({ btn: b, opt: o }) => {
        b.classList.add("locked");
        if (o.correct) b.classList.add("good");
      });
      if (!opt.correct) btn.classList.add("bad");

      if (opt.correct) {
        state.correctCount++;
        api.hit(step.id || ("step-" + (state.idx + 1)));
        notify("success");
      } else {
        api.miss();
        impact("medium");
        notify("error");
      }

      // Разбор: «почему» выбранного варианта (для верного — почему хорошо,
      // для неверного — почему плохо). Плюс при ошибке — что было бы правильно.
      const correctOpt = (step.options || []).find((o) => o.correct);
      explainBox.className = "pwd-explain " + (opt.correct ? "ok" : "bad");
      const parts = [
        el("div", { class: "pwd-explain-tag", text: opt.correct ? "✓ Верно!" : "✗ Так делать опасно" }),
        el("div", { class: "pwd-explain-text", text: opt.explain || "" }),
      ];
      if (!opt.correct && correctOpt) {
        parts.push(el("div", { class: "pwd-explain-right" }, [
          el("span", { class: "pwd-explain-right-label", text: "Как надо: " }),
          el("span", { text: (correctOpt.text || "") + (correctOpt.explain ? " — " + correctOpt.explain : "") }),
        ]));
      }
      const isLast = state.idx + 1 >= total;
      parts.push(el("button", {
        class: "pwd-next",
        attrs: { type: "button" },
        text: isLast ? "Завершить →" : "Дальше →",
        on: { click: () => {
          select();
          state.idx++;
          if (state.idx >= total) finish();
          else showStep();
        } },
      }));
      explainBox.replaceChildren(...parts);
      explainBox.removeAttribute("hidden");
    }

    stepHost.replaceChildren(card);
  }

  function finish() {
    api.verdict(doneAction);
  }

  showStep();
  return root;
}

registerSceneRenderer("pwd-manager", renderPwdManager);
