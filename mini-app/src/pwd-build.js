// Сцена «pwd-build»: придумай надёжный пароль.
// Поле ввода + живой индикатор силы + чек-лист правил, которые загораются по мере набора.
// Кнопка «Проверить пароль»: каждое выполненное правило → api.hit("rule-N").
// Если выполнены ВСЕ правила → api.verdict("good"). Иначе — мягко подсказываем, что докрутить.
//
// targets уровня = правила (по одному hit на каждое выполненное правило).
//
// Формат data:
// {
//   title: "Кузница паролей",
//   hint: "Набирай пароль — кружочки правил загораются сами.",
//   // Личные данные ребёнка-героя, которые НЕЛЬЗЯ пихать в пароль (проверка «не личное»):
//   personal: ["барсик", "2015", "роман", "москва"],
//   rules: [
//     { id: "rule-len",     label: "Не меньше 8 знаков",            why: "..." },
//     { id: "rule-upper",   label: "Есть ЗАГЛАВНАЯ буква",         why: "..." },
//     { id: "rule-digit",   label: "Есть цифра",                   why: "..." },
//     { id: "rule-special", label: "Есть значок (! ? # $ * и т.п.)", why: "..." },
//     { id: "rule-noword",  label: "Это не простое слово",         why: "..." },
//     { id: "rule-nopriv",  label: "Тут нет твоего имени и даты рождения", why: "..." },
//   ],
// }
//
// Проверки правил реализованы здесь, в JS. Порядок rules в data ДОЛЖЕН совпадать
// с порядком/id в level.targets.

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";
import { impact, notify, select } from "./haptics.js";

// Небольшой словарик самых частых «плохих» паролей и простых слов.
// Если пароль (без учёта регистра) целиком совпадает с одним из них или состоит
// только из таких букв/цифр подряд — считаем его «простым словом».
const COMMON_WEAK = [
  "пароль", "password", "qwerty", "йцукен", "admin", "user", "login",
  "12345", "123456", "1234567", "12345678", "123456789", "1234567890",
  "111111", "000000", "qwerty123", "qweasd", "iloveyou", "люблю",
  "привет", "hello", "kitty", "котик", "барсик", "dragon", "monkey",
  "football", "футбол", "minecraft", "roblox", "робакс", "солнышко",
  "abc123", "abcdef", "letmein", "welcome", "master", "superman",
];

// Латиница раскладкой накладывается на кириллицу — но для детей хватит прямого сравнения.
function looksLikeCommonWord(pw) {
  const low = pw.toLowerCase().trim();
  if (!low) return true;
  // Точное совпадение с известным слабым паролем.
  if (COMMON_WEAK.includes(low)) return true;
  // Пароль из одних букв (одно слово без цифр/значков) длиной до 9 — это «просто слово».
  if (/^[a-zа-яё]+$/i.test(low) && low.length <= 9) return true;
  // Пароль из одних цифр — это вообще не слово, но и не надёжно: считаем «простым».
  if (/^[0-9]+$/.test(low)) return true;
  // Подряд идущие одинаковые символы (ааааааа, 1111111) — «простой».
  if (/^(.)\1+$/.test(low)) return true;
  // Известное слабое слово как явная часть пароля (parol123, qwerty!).
  for (const w of COMMON_WEAK) {
    if (w.length >= 4 && low.includes(w)) return true;
  }
  return false;
}

function containsPersonal(pw, personal) {
  const low = pw.toLowerCase();
  for (const p of (personal || [])) {
    const pp = String(p).toLowerCase().trim();
    if (pp.length >= 3 && low.includes(pp)) return true;
  }
  return false;
}

// Оценка каждого правила. Возвращает массив {rule, ok}.
function evaluate(pw, rules, personal) {
  return rules.map((r) => {
    let ok = false;
    switch (r.id) {
      case "rule-len":     ok = pw.length >= 8; break;
      case "rule-upper":   ok = /[A-ZА-ЯЁ]/.test(pw); break;
      case "rule-digit":   ok = /[0-9]/.test(pw); break;
      case "rule-special": ok = /[^A-Za-zА-Яа-яЁё0-9]/.test(pw); break;
      case "rule-noword":  ok = pw.length > 0 && !looksLikeCommonWord(pw); break;
      case "rule-nopriv":  ok = pw.length > 0 && !containsPersonal(pw, personal); break;
      default:             ok = false;
    }
    return { rule: r, ok };
  });
}

// Грубая прикидка «сколько вариантов придётся перебрать злодею» — для объяснения энтропии.
// Считаем размер набора символов × длину. Не точная формула, а понятная ребёнку картинка.
function strengthInfo(pw, evals) {
  const passed = evals.filter((e) => e.ok).length;
  let alphabet = 0;
  if (/[a-zа-яё]/.test(pw)) alphabet += 33; // строчные (берём кириллицу как больший алфавит)
  if (/[A-ZА-ЯЁ]/.test(pw)) alphabet += 33;
  if (/[0-9]/.test(pw)) alphabet += 10;
  if (/[^A-Za-zА-Яа-яЁё0-9]/.test(pw)) alphabet += 20;
  if (alphabet === 0) alphabet = 1;
  // Количество вариантов = alphabet^length. Берём логарифм по 10, чтобы показать «число с N нулями».
  const digits = pw.length > 0 ? Math.round(pw.length * Math.log10(alphabet)) : 0;

  // Уровень силы по числу выполненных правил.
  let level, levelText, color;
  if (passed <= 2)      { level = 1; levelText = "Слабый"; color = "var(--danger)"; }
  else if (passed <= 4) { level = 2; levelText = "Средний"; color = "var(--warning)"; }
  else if (passed === 5){ level = 3; levelText = "Хороший"; color = "var(--accent)"; }
  else                  { level = 4; levelText = "Крепость!"; color = "var(--success)"; }

  return { passed, digits, level, levelText, color };
}

function renderPwdBuild(data, api) {
  const rules = Array.isArray(data.rules) ? data.rules : [];
  const personal = Array.isArray(data.personal) ? data.personal : [];
  const root = el("div", { class: "pwd-build" });

  // Шапка
  root.appendChild(el("div", { class: "pwd-header" }, [
    el("div", { class: "pwd-icon", text: data.icon || "🔑" }),
    el("div", { class: "pwd-titles" }, [
      el("div", { class: "pwd-title", text: data.title || "Кузница паролей" }),
      el("div", { class: "pwd-sub", text: data.hint || "Набирай пароль — кружочки правил загораются сами." }),
    ]),
  ]));

  // Поле ввода + кнопка «показать/скрыть»
  const input = el("input", {
    class: "pwd-input",
    attrs: {
      type: "text",
      inputmode: "text",
      autocomplete: "off",
      autocapitalize: "off",
      autocorrect: "off",
      spellcheck: "false",
      placeholder: "Придумай свой пароль…",
      "aria-label": "Поле для пароля",
    },
  });
  const inputWrap = el("div", { class: "pwd-input-wrap" }, [input]);
  root.appendChild(inputWrap);

  // Индикатор силы: полоса + подпись + «сколько вариантов перебирать злодею»
  const bar = el("div", { class: "pwd-bar" }, [el("div", { class: "pwd-bar-fill" })]);
  const barFill = bar.querySelector(".pwd-bar-fill");
  const strengthLabel = el("div", { class: "pwd-strength-label", text: "Сила пароля: —" });
  const entropyLine = el("div", { class: "pwd-entropy", text: "Набери пароль — покажу, сколько его придётся подбирать." });
  root.appendChild(bar);
  root.appendChild(strengthLabel);
  root.appendChild(entropyLine);

  // Чек-лист правил (живой)
  const list = el("ul", { class: "pwd-rules" });
  const ruleEls = {};
  for (const r of rules) {
    const dot = el("span", { class: "pwd-rule-dot", text: "○" });
    const label = el("span", { class: "pwd-rule-label", text: r.label || r.id });
    const li = el("li", { class: "pwd-rule", attrs: { "data-rule": r.id } }, [dot, label]);
    // Тап по правилу — короткое «почему».
    li.addEventListener("click", () => {
      select();
      if (r.why) api.note(r.why);
    });
    ruleEls[r.id] = { li, dot };
    list.appendChild(li);
  }
  root.appendChild(list);

  // Совет про фразу-пароль
  root.appendChild(el("div", { class: "pwd-tip", text:
    data.tip ||
    "💡 Хитрость Капитана Мяу: пароль из нескольких слов запомнить легко, а взломать почти нельзя. Например: «РыжийКот7Ловит$Мышей». Длинно, но в голове держится само." }));

  // Кнопка проверки
  const checkBtn = el("button", {
    class: "pwd-check-btn",
    attrs: { type: "button" },
    text: data.checkLabel || "Проверить пароль",
  });
  root.appendChild(checkBtn);

  // Сообщение после проверки
  const result = el("div", { class: "pwd-result", attrs: { hidden: "" } });
  root.appendChild(result);

  let checked = false; // чтобы verdict срабатывал один раз

  function refresh() {
    const pw = input.value;
    const evals = evaluate(pw, rules, personal);
    // Подсветка правил
    for (const { rule, ok } of evals) {
      const e = ruleEls[rule.id];
      if (!e) continue;
      e.li.classList.toggle("done", ok);
      e.dot.textContent = ok ? "●" : "○";
    }
    // Индикатор силы
    const s = strengthInfo(pw, evals);
    barFill.style.width = (s.passed / Math.max(1, rules.length) * 100) + "%";
    barFill.style.background = s.color;
    strengthLabel.textContent = pw ? `Сила пароля: ${s.levelText}` : "Сила пароля: —";
    strengthLabel.style.color = pw ? s.color : "var(--text-dim)";
    if (pw && s.digits > 0) {
      // «Энтропия» простыми словами: примерное число вариантов.
      entropyLine.textContent =
        `Чтобы подобрать такой пароль, злодею пришлось бы перебрать огромное число вариантов — длиной примерно в ${s.digits} цифр. Это почти невозможно: чем длиннее это число, тем лучше.`;
    } else {
      entropyLine.textContent = "Набери пароль — покажу, сколько его придётся подбирать.";
    }
    return evals;
  }

  input.addEventListener("input", () => { refresh(); });

  checkBtn.addEventListener("click", () => {
    select();
    const evals = refresh();
    const passedRules = evals.filter((e) => e.ok);
    const failedRules = evals.filter((e) => !e.ok);

    // Засчитываем находку за каждое выполненное правило (hit идемпотентен в движке).
    for (const { rule } of passedRules) {
      api.hit(rule.id);
    }

    result.removeAttribute("hidden");

    if (failedRules.length === 0) {
      // Все правила выполнены — победа.
      if (!checked) {
        checked = true;
        notify("success");
        result.className = "pwd-result good";
        result.replaceChildren(
          el("div", { class: "pwd-result-tag", text: "🛡 Несокрушимый пароль!" }),
          el("div", { class: "pwd-result-text", text:
            "Король Подделок ломает свою отмычку об такой ключ. Все правила выполнены — отличная работа!" }),
          el("button", {
            class: "pwd-check-btn",
            attrs: { type: "button" },
            text: "Готово →",
            on: { click: () => api.verdict("good") },
          }),
        );
      }
    } else {
      // Что-то не докручено — мягко подсказываем (без штрафа звёзд, но засчитываем miss для статистики).
      notify("error");
      impact("medium");
      api.miss();
      result.className = "pwd-result bad";
      const first = failedRules[0].rule;
      result.replaceChildren(
        el("div", { class: "pwd-result-tag", text: `Почти! Осталось докрутить: ${failedRules.length}` }),
        el("div", { class: "pwd-result-text", text:
          (first.why ? first.why + " " : "") + "Поправь пароль и нажми «Проверить» ещё раз." }),
      );
    }
  });

  // Первичная отрисовка
  refresh();
  return root;
}

registerSceneRenderer("pwd-build", renderPwdBuild);
