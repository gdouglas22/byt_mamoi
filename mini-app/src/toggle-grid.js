// Сцена «toggle-grid»: экран настроек приватности соцсети.
// Ребёнок выставляет каждый переключатель/селектор в безопасное положение,
// потом жмёт «Сохранить». За каждую ВЕРНО выставленную настройку — api.hit("set-N"),
// за каждую неверную — api.miss(). После сохранения — api.verdict("save").
//
// Формат данных сцены:
// {
//   title: "Настройки приватности",
//   profile: "Соцсеть «МяуГрам»",        // опционально, подпись-шапка
//   hint: "Поставь каждую настройку безопасно. Потом нажми «Сохранить».",
//   settings: [
//     { id: "set-1",
//       label: "Кто видит мой профиль",
//       options: ["Все", "Только друзья"],   // 2..3 варианта
//       safeIndex: 1,                          // индекс безопасного варианта
//       why: "Незнакомцы не должны видеть твои фото и записи." },
//     ...
//   ],
//   saveLabel: "Сохранить",               // опционально
// }
//
// targets уровня = по одной на каждую настройку (set-1..N), verdict "save" = good.
// Тогда 3⭐ даются, когда ВСЕ настройки выставлены безопасно.

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";
import { impact, notify, select } from "./haptics.js";

function renderToggleGrid(data, api) {
  const root = el("div", { class: "toggle-grid" });

  const settings = Array.isArray(data.settings) ? data.settings : [];
  // Текущий выбор по каждой настройке. Старт — НЕбезопасный вариант,
  // чтобы у ребёнка была задача исправить, а не просто пролистать.
  const choice = {};
  for (const s of settings) {
    const safe = typeof s.safeIndex === "number" ? s.safeIndex : 0;
    const opts = Array.isArray(s.options) ? s.options : [];
    // Старт: первый НЕбезопасный вариант (если есть), иначе безопасный.
    let start = safe;
    for (let i = 0; i < opts.length; i++) {
      if (i !== safe) { start = i; break; }
    }
    choice[s.id] = start;
  }

  // Шапка
  const header = el("div", { class: "toggle-grid-header" }, [
    el("div", { class: "toggle-grid-shield", text: "🔒" }),
    el("div", { class: "toggle-grid-titles" }, [
      el("div", { class: "toggle-grid-title", text: data.title || "Настройки приватности" }),
      el("div", { class: "toggle-grid-profile", text: data.profile || "Моя страница" }),
    ]),
  ]);
  root.appendChild(header);

  if (data.hint) {
    root.appendChild(el("div", { class: "toggle-grid-hint", text: data.hint }));
  }

  // Список настроек
  const list = el("div", { class: "toggle-grid-list" });

  for (const s of settings) {
    const opts = Array.isArray(s.options) ? s.options : [];
    const row = el("div", { class: "toggle-grid-row", attrs: { "data-setting": s.id } });

    const labelWrap = el("div", { class: "toggle-grid-label-wrap" }, [
      el("div", { class: "toggle-grid-label", text: s.label || s.id }),
    ]);
    // Подпись «почему» появляется при выборе безопасного варианта.
    const whyEl = el("div", { class: "toggle-grid-why", attrs: { hidden: "" }, text: s.why || "" });
    labelWrap.appendChild(whyEl);
    row.appendChild(labelWrap);

    // Кнопки-варианты (сегментированный переключатель)
    const seg = el("div", { class: "toggle-grid-seg" });
    const optButtons = [];
    opts.forEach((optText, i) => {
      const btn = el("button", {
        class: "toggle-grid-opt",
        attrs: { type: "button", "data-opt": String(i) },
        text: optText,
      });
      btn.addEventListener("click", () => {
        if (choice[s.id] === i) return;
        choice[s.id] = i;
        select();
        refreshRow();
      });
      seg.appendChild(btn);
      optButtons.push(btn);
    });
    row.appendChild(seg);

    function refreshRow() {
      const safe = typeof s.safeIndex === "number" ? s.safeIndex : 0;
      const cur = choice[s.id];
      optButtons.forEach((b, i) => {
        b.classList.toggle("selected", i === cur);
      });
      const isSafe = cur === safe;
      row.classList.toggle("is-safe", isSafe);
      row.classList.toggle("is-unsafe", !isSafe);
      if (isSafe && s.why) {
        whyEl.removeAttribute("hidden");
      } else {
        whyEl.setAttribute("hidden", "");
      }
    }
    refreshRow();

    list.appendChild(row);
  }
  root.appendChild(list);

  // Кнопка «Сохранить»
  const saveBar = el("div", { class: "toggle-grid-savebar" });
  const saveBtn = el("button", {
    class: "toggle-grid-save",
    attrs: { type: "button" },
    text: data.saveLabel || "💾 Сохранить настройки",
  });
  saveBtn.addEventListener("click", () => {
    let allSafe = true;
    for (const s of settings) {
      const safe = typeof s.safeIndex === "number" ? s.safeIndex : 0;
      const row = list.querySelector(`[data-setting="${s.id}"]`);
      if (choice[s.id] === safe) {
        api.hit(s.id);
        if (row) row.classList.add("saved-ok");
      } else {
        api.miss();
        allSafe = false;
        if (row) {
          row.classList.add("saved-bad", "phx-shake");
          setTimeout(() => row.classList.remove("phx-shake"), 320);
        }
      }
    }
    if (allSafe) {
      notify("success");
      api.note("Отлично! Все настройки в безопасности 🛡️");
    } else {
      impact("medium");
      notify("error");
      api.note("Некоторые настройки ещё небезопасны — но сохраняю.");
    }
    saveBtn.disabled = true;
    // Небольшая пауза, чтобы ребёнок увидел подсветку строк перед финалом.
    setTimeout(() => api.verdict("save"), 650);
  });
  saveBar.appendChild(saveBtn);
  root.appendChild(saveBar);

  return root;
}

registerSceneRenderer("toggle-grid", renderToggleGrid);
