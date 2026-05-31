// Универсальный Drag-and-Drop движок.
// Контракт: mountDnd(container, level, onFinish).
//   level: {
//     id, theme, type: "dnd",
//     zones: [{ id, label, icon }],          // 2..4 зон
//     cards: [{ id, icon, text, zone, why }] // правильная зона у каждой карточки
//   }
//   onFinish({ stars, correct, total })

import { el } from "./dom.js";
import { impact, notify, select } from "./haptics.js";
import { saveResult } from "./progress.js";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function starsFor(correct, total) {
  const r = correct / total;
  if (r >= 0.9) return 3;
  if (r >= 0.7) return 2;
  if (r >= 0.5) return 1;
  return 0;
}

function makeCard(card) {
  return el("div", { class: "dd-card", attrs: { "data-zone": card.zone } }, [
    el("div", { class: "dd-card-icon", text: card.icon }),
    el("div", { class: "dd-card-text", text: card.text }),
  ]);
}

function makeZone(zone) {
  return el("div", { class: "dd-zone", attrs: { "data-zone": zone.id } }, [
    el("div", { class: "dd-zone-icon", text: zone.icon }),
    el("div", { class: "dd-zone-label", text: zone.label }),
  ]);
}

export function mountDnd(container, level, onFinish) {
  const zones = level.zones || [];
  const order = shuffle(level.cards || []);
  const zonesById = Object.fromEntries(zones.map((z) => [z.id, z]));
  const total = order.length;
  const state = { idx: 0, correct: 0, dragging: false };

  const root = el("div", { class: "dd-root" });
  container.replaceChildren(root);

  const header = el("div", { class: "dd-header" });
  const title  = el("div", { class: "dd-title", text: level.instructions || "Куда отнести эту карточку?" });
  const counter = el("div", { class: "dd-counter" });
  header.appendChild(title);
  header.appendChild(counter);

  const stage = el("div", { class: "dd-stage" });

  // Сетка зон — авто-адаптируется под количество
  const zonesRow = el("div", { class: "dd-zones", style: { gridTemplateColumns: `repeat(${zones.length}, 1fr)` } });
  const zoneNodes = zones.map((z) => makeZone(z));
  zoneNodes.forEach((n) => zonesRow.appendChild(n));

  const explainBox = el("div", { class: "dd-explain", attrs: { hidden: "" } });
  const nextBtn = el("button", { class: "btn", text: "Дальше →", attrs: { hidden: "" }, on: { click: () => nextCard() } });

  root.appendChild(header);
  root.appendChild(stage);
  root.appendChild(zonesRow);
  root.appendChild(explainBox);
  root.appendChild(el("div", { class: "actions" }, [nextBtn]));

  function updateCounter() {
    counter.textContent = `${Math.min(state.idx + 1, total)} / ${total} • ★ ${state.correct}`;
  }

  function nextCard() {
    nextBtn.setAttribute("hidden", "");
    explainBox.setAttribute("hidden", "");
    explainBox.replaceChildren();
    state.idx++;
    if (state.idx >= total) return finish();
    showCard();
  }

  function finish() {
    const stars = starsFor(state.correct, total);
    const score = state.correct * 10;
    saveResult(level.id, score, stars);
    if (stars === 3) notify("success");
    onFinish && onFinish({ stars, correct: state.correct, total, score });
  }

  function zoneUnderPoint(x, y) {
    for (const zn of zoneNodes) {
      const r = zn.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return zn;
    }
    return null;
  }

  function commitDrop(card, node, zoneEl) {
    const chosen = zoneEl.dataset.zone;
    const isRight = chosen === card.zone;
    if (isRight) { state.correct++; notify("success"); zoneEl.classList.add("ok"); }
    else        { notify("error"); impact("medium"); zoneEl.classList.add("bad"); }
    node.classList.add(isRight ? "settled-ok" : "settled-bad");
    node.style.pointerEvents = "none";
    explainBox.classList.toggle("ok", isRight);
    explainBox.classList.toggle("bad", !isRight);
    const correctZoneLabel = (zonesById[card.zone] && zonesById[card.zone].label) || card.zone;
    explainBox.replaceChildren(
      el("div", { class: "explain-tag", text: isRight ? "Верно" : "На самом деле — " + correctZoneLabel }),
      el("div", { class: "explain-text", text: card.why || "" }),
    );
    explainBox.removeAttribute("hidden");
    nextBtn.removeAttribute("hidden");
    updateCounter();
  }

  function showCard() {
    updateCounter();
    zoneNodes.forEach((z) => z.classList.remove("hot", "ok", "bad"));
    stage.replaceChildren();

    const card = order[state.idx];
    const node = makeCard(card);
    stage.appendChild(node);

    let pointerId = null;
    let startX = 0, startY = 0, baseLeft = 0, baseTop = 0;
    let nodeRectStart = null;

    const onDown = (e) => {
      if (state.dragging) return;
      pointerId = e.pointerId;
      node.setPointerCapture(pointerId);
      state.dragging = true;
      const rect = node.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      nodeRectStart = { left: rect.left - stageRect.left, top: rect.top - stageRect.top };
      baseLeft = nodeRectStart.left;
      baseTop  = nodeRectStart.top;
      startX = e.clientX;
      startY = e.clientY;
      node.classList.add("dragging");
      node.style.left = baseLeft + "px";
      node.style.top  = baseTop + "px";
      select();
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!state.dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      node.style.left = (baseLeft + dx) + "px";
      node.style.top  = (baseTop + dy) + "px";
      const target = zoneUnderPoint(e.clientX, e.clientY);
      zoneNodes.forEach((zn) => zn.classList.toggle("hot", zn === target));
    };
    const onUp = (e) => {
      if (!state.dragging || e.pointerId !== pointerId) return;
      state.dragging = false;
      node.classList.remove("dragging");
      const target = zoneUnderPoint(e.clientX, e.clientY);
      zoneNodes.forEach((zn) => zn.classList.remove("hot"));
      if (target) {
        commitDrop(card, node, target);
      } else {
        node.style.transition = "left 0.2s ease, top 0.2s ease";
        node.style.left = nodeRectStart.left + "px";
        node.style.top  = nodeRectStart.top + "px";
        setTimeout(() => { node.style.transition = ""; }, 220);
      }
    };
    node.addEventListener("pointerdown", onDown);
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
  }

  showCard();
}
