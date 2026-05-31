// Сцена «quiz»: викторина по одному вопросу за раз.
// Игрок тапает вариант ответа → сразу видит, верно или нет, и короткое объяснение.
// Верный ответ = api.hit("q-<номер>"); ошибка = api.miss(). После последнего вопроса — api.verdict("done").
//
// Формат сцены:
// {
//   title: "Цифровой след",
//   hint:  "Тапни ответ — сразу скажу, верно ли, и почему.",   // опц.
//   questions: [
//     { q: "Текст вопроса",
//       options: [
//         { text: "Вариант 1", correct: true,  explain: "Почему это верно" },
//         { text: "Вариант 2", correct: false, explain: "Почему это неверно" },
//         { text: "Вариант 3", correct: false, explain: "..." },
//       ] },
//     // ...5-7 вопросов, в каждом ровно один correct:true
//   ],
// }

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";
import { impact, notify, select } from "./haptics.js";

// Перемешиваем варианты, чтобы верный ответ не был всегда первым
// (иначе ребёнок выигрывает, не читая — просто жмёт верхнюю кнопку).
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderQuiz(data, api) {
  const root = el("div", { class: "quiz" });

  const questions = Array.isArray(data.questions) ? data.questions : [];
  const total = questions.length;
  const state = { idx: 0, answered: false };

  // Шапка с прогрессом
  const header = el("div", { class: "quiz-header" }, [
    el("div", { class: "quiz-icon", text: "🧭" }),
    el("div", { class: "quiz-titles" }, [
      el("div", { class: "quiz-title", text: data.title || "Викторина" }),
      el("div", { class: "quiz-counter" }),
    ]),
  ]);
  const counterEl = header.querySelector(".quiz-counter");
  root.appendChild(header);

  // Полоска прогресса
  const progressWrap = el("div", { class: "quiz-progress" });
  const progressBar = el("div", { class: "quiz-progress-bar" });
  progressWrap.appendChild(progressBar);
  root.appendChild(progressWrap);

  // Подсказка
  if (data.hint) {
    root.appendChild(el("div", { class: "quiz-hint", text: data.hint }));
  }

  // Тело вопроса
  const body = el("div", { class: "quiz-body" });
  root.appendChild(body);

  function updateHeader() {
    counterEl.textContent = `Вопрос ${Math.min(state.idx + 1, total)} из ${total}`;
    const pct = total > 0 ? (state.idx / total) * 100 : 0;
    progressBar.style.width = pct + "%";
  }

  function showQuestion() {
    if (state.idx >= total) return finish();
    state.answered = false;
    updateHeader();

    const item = questions[state.idx];
    const opts = shuffle(Array.isArray(item.options) ? item.options : []);

    const card = el("div", { class: "quiz-card" }, [
      el("div", { class: "quiz-q", text: item.q || "" }),
    ]);

    const optsWrap = el("div", { class: "quiz-options" });
    const optButtons = [];

    opts.forEach((opt) => {
      const btn = el("button", {
        class: "quiz-option",
        attrs: { type: "button" },
      }, [
        el("span", { class: "quiz-option-mark", text: "" }),
        el("span", { class: "quiz-option-text", text: opt.text || "" }),
      ]);
      btn.addEventListener("click", () => choose(opt, btn));
      optButtons.push({ opt, btn });
      optsWrap.appendChild(btn);
    });
    card.appendChild(optsWrap);

    // Блок объяснения + кнопка «Дальше» (появляется после ответа)
    const explainBox = el("div", { class: "quiz-explain", attrs: { hidden: "" } });
    card.appendChild(explainBox);

    function choose(opt, btn) {
      if (state.answered) return;
      state.answered = true;
      select();

      // Заблокировать все варианты, подсветить верный и выбранный
      optButtons.forEach(({ opt: o, btn: b }) => {
        b.classList.add("quiz-option-locked");
        b.disabled = true;
        if (o.correct) {
          b.classList.add("quiz-option-correct");
          b.querySelector(".quiz-option-mark").textContent = "✓";
        }
      });

      if (opt.correct) {
        notify("success");
        api.hit("q-" + (state.idx + 1));
        explainBox.className = "quiz-explain ok";
      } else {
        impact("medium");
        notify("error");
        api.miss();
        btn.classList.add("quiz-option-wrong");
        btn.querySelector(".quiz-option-mark").textContent = "✗";
        explainBox.className = "quiz-explain bad";
      }

      const isLast = state.idx + 1 >= total;
      explainBox.replaceChildren(
        el("div", {
          class: "quiz-explain-tag",
          text: opt.correct ? "✓ Верно!" : "✗ Не совсем",
        }),
        el("div", { class: "quiz-explain-text", text: opt.explain || "" }),
        el("button", {
          class: "quiz-explain-next",
          attrs: { type: "button" },
          text: isLast ? "Завершить →" : "Дальше →",
          on: {
            click: () => {
              select();
              state.idx++;
              if (state.idx >= total) finish();
              else showQuestion();
            },
          },
        }),
      );
      explainBox.removeAttribute("hidden");
      explainBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    body.replaceChildren(card);
  }

  function finish() {
    progressBar.style.width = "100%";
    api.verdict("done");
  }

  showQuestion();
  return root;
}

registerSceneRenderer("quiz", renderQuiz);
