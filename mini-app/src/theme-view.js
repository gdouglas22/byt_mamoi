// Экран темы: список игр (после клика по тайлу темы).
// Данные приходят из API.topicDetail(id) → объект с массивом games.
// Маппинг ассетов (наш злодей + реплика Капитана) — по slug через enrichments.

import { getEnrichment, getLevelContent } from "./enrichments.js";
import { select } from "./haptics.js";
import { el } from "./dom.js";
import { pickReplica } from "./replicas.js";
import { getDifficulty } from "./difficulty.js";

function levelRow(game, idx, locked, onPick) {
  const playable = !!getLevelContent(currentSlug, game.id);
  const stars = game.best_stars || 0;

  const head = el("div", { class: "level-row-head" }, [
    el("div", { class: "level-row-num", text: String(idx + 1) }),
    el("div", { class: "level-row-title", text: game.title || ("Уровень " + (idx + 1)) }),
  ]);

  const starsRow = el("div", { class: "level-row-stars" });
  for (let i = 0; i < 3; i++) {
    starsRow.appendChild(el("span", { class: stars > i ? "star-on" : "star-off", text: "★" }));
  }

  const sub = el("div", { class: "level-row-sub" }, [
    starsRow,
    game.difficulty ? el("span", { class: "level-row-tag", text: game.difficulty }) : null,
    !playable ? el("span", { class: "level-row-tag", text: "скоро" }) : null,
    locked   ? el("span", { class: "level-row-tag", text: "🔒" }) : null,
  ]);

  const disabled = locked || !playable;
  return el("button", {
    class: "level-row" + (disabled ? " disabled" : ""),
    attrs: { "data-game": String(game.id), "aria-disabled": String(disabled) },
    on: { click: () => { if (disabled) return; select(); onPick(game); } },
  }, [head, sub]);
}

let currentSlug = null;

export function renderThemeView(topic, onPickGame, onBack) {
  currentSlug = topic.slug;
  const enr = getEnrichment(topic.slug);
  const root = el("div", { class: "theme-view" });

  // Шапка темы с антагонистом
  const villain = (enr && enr.villain) || {};
  const head = el("div", { class: "theme-head" }, [
    villain.image
      ? el("img", { class: "theme-head-villain", attrs: { src: villain.image, alt: villain.name || "" } })
      : null,
    el("div", { class: "theme-head-titles" }, [
      el("div", { class: "theme-head-name", text: topic.title }),
      villain.name
        ? el("div", { class: "theme-head-villain-name", text: "Противник: " + villain.name })
        : (topic.subtitle ? el("div", { class: "theme-head-villain-name", style: { color: "var(--text-dim)" }, text: topic.subtitle }) : null),
    ]),
  ]);
  root.appendChild(head);

  // Реплика-прикол Капитана: текст рандомно из библиотеки (по slug темы), аватар из enrichment
  const quoteText = pickReplica(`theme-intro-${topic.slug}`, {
    age: getDifficulty(),
    fallback: (enr && enr.mentorIntro && enr.mentorIntro.text) || "",
  });
  if (quoteText) {
    const avatar = (enr && enr.mentorIntro && enr.mentorIntro.avatar) || "idle";
    const quote = el("div", { class: "theme-quote" }, [
      el("img", { class: "theme-quote-avatar", attrs: { src: "assets/mentor/" + avatar + ".jpg", alt: "" } }),
      el("div", { class: "theme-quote-bubble" }, [
        el("div", { class: "theme-quote-name", text: "Капитан Мяу" }),
        el("div", { class: "theme-quote-text", text: quoteText }),
      ]),
    ]);
    root.appendChild(quote);
  }

  // Список уровней — последовательное открытие: каждый следующий открыт после прохождения предыдущего.
  // Dev-обход тот же что и для тем: localStorage.cyberdef.dev.unlockAll === "1" → все открыты.
  let devUnlock = false;
  try { devUnlock = localStorage.getItem("cyberdef.dev.unlockAll") === "1"; } catch {}
  const rows = el("div", { class: "level-list" });
  const games = topic.games || [];
  let unlockedNext = true;
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    const playable = !!getLevelContent(topic.slug, g.id);
    const locked = !devUnlock && !unlockedNext;
    rows.appendChild(levelRow(g, i, locked, onPickGame));
    // Only playable levels gate the chain — "скоро" уровни не должны блокировать
    // прогрессию навсегда (их пройти нельзя, потому что контента ещё нет).
    if (playable && !(g.completed || (g.best_stars || 0) > 0)) unlockedNext = false;
  }
  root.appendChild(rows);

  root.appendChild(el("div", { class: "theme-foot" }, [
    el("button", { class: "btn ghost", text: "‹ К списку тем", on: { click: () => { select(); onBack(); } } }),
  ]));

  return root;
}
