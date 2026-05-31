// Multi-scene quest-движок: уровень состоит из нескольких сцен, переходы по результату клика.
// Контракт: mountQuest(container, level, onFinish).
//
// level = {
//   id, type: "quest",
//   start: "inbox-id",
//   scenes: { [sceneId]: { type: "mail-inbox" | "mail-email" | ..., data: {...} } },
//   targets: [{ id, label, why }],     // все возможные «находки» (hot-spots) в любой сцене этого уровня
//   verdicts: { good: ["spam"], ok: ["delete"], bad: ["link","reply"] }, // карта выбранных финальных действий
// }
//
// Рендерер сцены возвращает корневой узел И вызывает API:
//   api.goto(sceneId)             — перейти на другую сцену
//   api.hit(targetId)             — отметить find (если ещё не отмечен)
//   api.miss()                    — отметить промах
//   api.verdict(actionId)         — завершить уровень с выбранным действием
//   api.note(text)                — короткое сообщение в шапку
//
// Звёзды считаются в finish() по найденным признакам + промахам + правильности вердикта.

import { el } from "./dom.js";
import { impact, notify, select } from "./haptics.js";
import { saveResult } from "./progress.js";
import { activeTargets } from "./difficulty.js";

// ===== Регистр рендереров сцен =====
// Рендерер регистрируется через registerSceneRenderer(name, fn).
// Это позволит mail-app или другим темам подписать свои сцены без правки этого файла.

const SCENE_RENDERERS = {};

export function registerSceneRenderer(name, fn) {
  SCENE_RENDERERS[name] = fn;
}

// ===== Подсчёт звёзд =====
function starsFor({ totalFinds, found, misses, verdict }) {
  // Звёзды зависят от того, насколько игрок РАЗОБРАЛСЯ:
  //   3⭐ — нашёл всё И правильный вердикт (мелкие промахи не штрафуем)
  //   2⭐ — почти всё (-1) + верный вердикт ИЛИ всё найдено но вердикт нейтральный
  //   1⭐ — частично нашёл + любой не-плохой вердикт
  //   0⭐ — выбрал откровенно плохой вариант ("Открыть ссылку"/"Ответить")
  if (verdict === "bad") return 0;
  const ratio = totalFinds > 0 ? found / totalFinds : 1;
  if (verdict === "good") {
    if (ratio >= 1)   return 3;
    if (ratio >= 0.7) return 2;
    if (ratio > 0)    return 1;
    return 1;  // даже без находок, верный вердикт — какая-то звезда
  }
  // ok — нейтральный (например, "Удалить" вместо "В спам")
  if (ratio >= 1)   return 2;
  if (ratio >= 0.5) return 1;
  // если совсем ничего не нашёл и вердикт «удалить» — это всё ещё лучше чем «открыть»
  // но и хвалить не за что
  void misses; // намеренно игнорируем: промахи в учебном модуле не штрафуем
  return 0;
}

function verdictKind(verdicts, actionId) {
  if (!verdicts) return "ok";
  if ((verdicts.good || []).includes(actionId)) return "good";
  if ((verdicts.bad  || []).includes(actionId)) return "bad";
  return "ok";
}

// ===== Точка входа =====
export function mountQuest(container, level, onFinish) {
  // Цели фильтруются по сложности: hard-only targets активны только на hard.
  const targets = activeTargets(level.targets || []);
  const totalFinds = targets.length;
  const targetById = Object.fromEntries(targets.map((t) => [t.id, t]));
  const state = {
    sceneId: level.start || Object.keys(level.scenes || {})[0],
    found: new Set(),
    misses: 0,
    actions: [],   // {sceneId, actionId}
    finished: false,
  };

  // Внешняя обёртка: шапка с прогрессом + контейнер активной сцены
  const root = el("div", { class: "quest-root" });
  const status = el("div", { class: "quest-status" });
  const sceneHost = el("div", { class: "quest-scene-host" });
  const noteBar = el("div", { class: "quest-note", attrs: { hidden: "" } });
  root.append(status, noteBar, sceneHost);
  container.replaceChildren(root);

  function updateStatus() {
    status.textContent = totalFinds
      ? `Подозрительные детали: ${state.found.size} / ${totalFinds}  •  Промахов: ${state.misses}`
      : "";
  }
  updateStatus();

  function showNote(text) {
    if (!text) { noteBar.setAttribute("hidden", ""); return; }
    noteBar.textContent = text;
    noteBar.removeAttribute("hidden");
    clearTimeout(noteBar._t);
    noteBar._t = setTimeout(() => noteBar.setAttribute("hidden", ""), 2400);
  }

  function goto(sceneId) {
    if (state.finished) return;
    if (!level.scenes || !level.scenes[sceneId]) {
      console.warn("Quest: no scene", sceneId);
      return;
    }
    state.sceneId = sceneId;
    const scene = level.scenes[sceneId];
    const renderer = SCENE_RENDERERS[scene.type];
    if (!renderer) {
      sceneHost.replaceChildren(el("div", { class: "quest-error", text: "Unknown scene type: " + scene.type }));
      return;
    }
    select();
    const node = renderer(scene.data || {}, api, { sceneId, state, level });
    sceneHost.replaceChildren(node);
    // Деактивируем hot-spots, чьи targetId не входят в активную сложность,
    // и проставляем data-hint (для tooltip на easy).
    const hotEls = node.querySelectorAll("[data-hot]");
    hotEls.forEach((he) => {
      const id = he.getAttribute("data-hot");
      const t = targetById[id];
      if (!t) {
        he.classList.add("phx-inactive");
        he.removeAttribute("data-hot");
      } else if (t.hint || t.label) {
        he.setAttribute("data-hint", t.hint || t.label);
      }
    });
  }

  function hit(targetId) {
    if (state.finished || !targetById[targetId] || state.found.has(targetId)) return;
    state.found.add(targetId);
    notify("success");
    updateStatus();
    showNote("✓ Найдено: " + (targetById[targetId].label || targetId));
  }

  function miss() {
    if (state.finished) return;
    state.misses++;
    impact("medium");
    updateStatus();
  }

  function verdict(actionId) {
    if (state.finished) return;
    state.finished = true;
    state.actions.push({ sceneId: state.sceneId, actionId });
    const kind = verdictKind(level.verdicts, actionId);
    finish(actionId, kind);
  }

  function finish(actionId, kind) {
    const stars = starsFor({ totalFinds, found: state.found.size, misses: state.misses, verdict: kind });
    const score = Math.max(0, state.found.size * 10 - state.misses * 2 + (kind === "good" ? 20 : 0));
    saveResult(level.id, score, stars);
    if (stars === 3) notify("success");
    else if (stars === 0) notify("error");
    onFinish && onFinish({
      stars,
      found: state.found.size,
      total: totalFinds,
      misses: state.misses,
      verdict: kind,
      action: actionId,
      score,
      foundIds: Array.from(state.found),
      activeTargets: targets,
    });
  }

  const api = { goto, hit, miss, verdict, note: showNote };
  goto(state.sceneId);
}
