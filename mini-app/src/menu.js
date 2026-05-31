// Меню тем Кибер-Академии — на базе topics из API Фролова.
// Тайлы рисуются по порядку из API, enrichment (наша иконка/злодей) — по slug.
// Замочки и прогресс — из полей topic.games_done / topic.games_total.

import { getEnrichment } from "./enrichments.js";
import { select } from "./haptics.js";
import { el } from "./dom.js";

function isTopicUnlocked(idx, topics) {
  // Dev-обход: открыть все темы для тестирования. Включается в консоли браузера:
  //   localStorage.setItem('cyberdef.dev.unlockAll', '1')   — открыть все
  //   localStorage.removeItem('cyberdef.dev.unlockAll')     — вернуть прогрессию
  try {
    if (localStorage.getItem("cyberdef.dev.unlockAll") === "1") return true;
  } catch {}
  // Тема разблокирована, если все предыдущие темы пройдены полностью
  // (games_done === games_total). Первая всегда открыта.
  for (let i = 0; i < idx; i++) {
    const t = topics[i];
    if ((t.games_total || 0) > 0 && (t.games_done || 0) < (t.games_total || 0)) return false;
  }
  return true;
}

function progressLine(topic, locked) {
  if (locked) return "Откроется после прохождения предыдущей темы";
  const done = topic.games_done || 0;
  const total = topic.games_total || 0;
  if (total === 0) return "Скоро будет — пока заглушка";
  return `${done} / ${total} уровней пройдено`;
}

function tile(topic, locked, onPick) {
  const enr = getEnrichment(topic.slug);
  const iconSrc = (enr && enr.icon) || null;
  const iconNode = iconSrc
    ? el("img", { class: "theme-tile-icon", attrs: { src: iconSrc, alt: "", "aria-hidden": "true" } })
    : el("div", { class: "theme-tile-icon", style: { display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }, text: "✦" });

  const nameRow = el("div", { class: "theme-tile-namerow" }, [
    el("div", { class: "theme-tile-name", text: topic.title }),
    locked ? el("div", { class: "theme-tile-lock", text: "🔒" }) : null,
  ]);

  const subline = el("div", { class: "theme-tile-sub", text: progressLine(topic, locked) });

  const done = topic.games_done || 0;
  const total = topic.games_total || 0;
  const fillPct = locked ? 0 : (total ? Math.round((done / total) * 100) : 0);
  const bar = el("div", { class: "theme-tile-bar" }, [
    el("div", { class: "theme-tile-bar-fill", style: { width: fillPct + "%" } }),
  ]);

  // Звёздная индикация (по доле пройденных)
  const stars = el("div", { class: "theme-tile-stars" });
  for (let i = 0; i < 3; i++) {
    const isOn = !locked && total > 0 && done >= (i + 1) * (total / 3);
    stars.appendChild(el("span", { class: isOn ? "star-on" : "star-off", text: "★" }));
  }

  return el("button", {
    class: "theme-tile" + (locked ? " locked" : ""),
    attrs: { "data-slug": topic.slug, "aria-disabled": String(locked) },
    on: {
      click: () => { if (locked) return; select(); onPick(topic); },
    },
  }, [iconNode, el("div", { class: "theme-tile-body" }, [nameRow, subline, bar]), stars]);
}

export function renderMenu(topics, onPickTopic) {
  const intro = el("div", { class: "intro" }, [
    el("h2", { text: "Кибер-Академия Капитана Мяу" }),
    el("p", { text: "Восемь курсов против восьми ловушек Сети. Проходи по одному — открывай следующий. Магистр кибербезопасности — это ты." }),
  ]);
  const grid = el("div", { class: "theme-grid" });
  const list = topics || [];
  for (let i = 0; i < list.length; i++) {
    const topic = list[i];
    const unlocked = isTopicUnlocked(i, list);
    grid.appendChild(tile(topic, !unlocked, onPickTopic));
  }
  if (!list.length) {
    grid.appendChild(el("div", { class: "placeholder" }, [
      el("h3", { text: "Темы недоступны" }),
      el("p", { text: "Не удалось загрузить курсы. Проверь интернет или попробуй позже." }),
    ]));
  }
  return el("div", {}, [intro, grid]);
}
