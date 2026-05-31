// Сцена «file-pile»: сетка иконок-файлов на фоне «рабочего стола».
// Ребёнок кликает на подозрительные файлы (api.hit). По безопасным — shake-анимация (api.miss).
// Внизу — кнопки действий (api.verdict).
//
// Формат:
// {
//   title: "Папка «Загрузки»",
//   bg: "assets/X/desktop.jpg",        // опционально, фон сетки
//   hint: "Найди все подозрительные файлы...",
//   files: [
//     { id: "ok-1",   icon: "📄", name: "Домашка.docx", suspect: false },
//     { id: "trap-1", icon: "⚠",  name: "Бонус.exe",   suspect: true,
//       why: "Файлы .exe из неизвестных писем — программы. Запустишь — вирус" },
//     ...
//   ],
//   actions: [
//     { id: "scan",   icon: "🛡", label: "Запустить антивирус" },  // good
//     { id: "close",  icon: "🚪", label: "Закрыть папку" },         // ok
//     { id: "open",   icon: "📂", label: "Открыть подозрительные" }, // bad
//   ],
// }

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";
import { impact, notify, select } from "./haptics.js";

function renderFilePile(data, api) {
  const root = el("div", { class: "file-pile" });

  const files = Array.isArray(data.files) ? data.files : [];
  const suspectIds = files.filter((f) => f.suspect).map((f) => f.id);
  const totalSuspects = suspectIds.length;
  const found = new Set();

  // Шапка папки
  const header = el("div", { class: "file-pile-header" }, [
    el("div", { class: "file-pile-folder-icon", text: "📁" }),
    el("div", { class: "file-pile-titles" }, [
      el("div", { class: "file-pile-title", text: data.title || "Папка" }),
      el("div", { class: "file-pile-counter", text: `0 / ${totalSuspects} подозрительных найдено` }),
    ]),
  ]);
  const counterEl = header.querySelector(".file-pile-counter");
  root.appendChild(header);

  // Сетка файлов на фоне (если задан bg)
  const gridWrap = el("div", { class: "file-pile-grid-wrap" });
  if (data.bg) {
    gridWrap.style.backgroundImage = `url('${data.bg}')`;
  }
  const grid = el("div", { class: "file-pile-grid" });

  for (const f of files) {
    const item = el("button", {
      class: "file-pile-item",
      attrs: { type: "button", "data-file": f.id },
    }, [
      el("div", { class: "file-pile-item-icon", text: f.icon || "📄" }),
      el("div", { class: "file-pile-item-name", text: f.name || f.id }),
    ]);
    item.addEventListener("click", () => {
      if (item.classList.contains("found") || item.classList.contains("safe-checked")) return;
      if (f.suspect) {
        item.classList.add("found");
        found.add(f.id);
        api.hit(f.id);
        notify("success");
        counterEl.textContent = `${found.size} / ${totalSuspects} подозрительных найдено`;
      } else {
        // Безопасный файл — лёгкий шейк, отметка что проверен (можно ещё раз кликнуть, но без штрафа)
        item.classList.add("phx-shake", "safe-checked");
        setTimeout(() => item.classList.remove("phx-shake"), 320);
        api.miss();
        impact("medium");
      }
    });
    grid.appendChild(item);
  }
  gridWrap.appendChild(grid);
  root.appendChild(gridWrap);

  // Подсказка
  if (data.hint) {
    root.appendChild(el("div", { class: "file-pile-hint", text: data.hint }));
  }

  // Действия внизу
  const actionsBar = el("div", { class: "file-pile-actions" });
  for (const a of (data.actions || [])) {
    actionsBar.appendChild(el("button", {
      class: "file-pile-action",
      attrs: { type: "button", "data-action": a.id },
      on: { click: () => { select(); api.verdict(a.id); } },
    }, [
      el("span", { class: "file-pile-action-icon", text: a.icon || "" }),
      el("span", { class: "file-pile-action-label", text: a.label || a.id }),
    ]));
  }
  root.appendChild(actionsBar);

  return root;
}

registerSceneRenderer("file-pile", renderFilePile);
