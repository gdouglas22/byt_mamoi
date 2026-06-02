// Универсальный Point-and-Click движок.
// Контракт: mountPnc(container, level, onFinish).
//   level: { id, theme, type: "pnc", scene: { type, data }, targets: [{id, label, why}], win, lose }
//   onFinish({ stars, found, total, misses }) — вызывается при выходе любого типа.
//
// Сцены строятся по scene.type через регистр RENDERERS. Каждый рендерер возвращает корневой DOM-узел,
// в котором кликабельные «горячие точки» помечены class="phx-hot" data-hot="<targetId>".
// Все клики ВНЕ горячих точек внутри сцены считаются промахом.

import { el } from "./dom.js";
import { impact, notify, select } from "./haptics.js";
import { saveResult } from "./progress.js";

// ===== Помощник: построитель «hot»-узла для контента =====

export function hot(id, text, tag = "span") {
  return el(tag, { class: "phx-hot", attrs: { "data-hot": id }, text });
}

// ===== Регистр рендереров =====

const RENDERERS = {
  // Email-письмо (фишинг, мошенничество)
  email(data) {
    const renderInline = (parts) => parts.map((p) => {
      if (typeof p === "string") return el("span", { text: p });
      if (p && p.hot) return hot(p.hot, p.text);
      return el("span", { text: String(p && p.text || "") });
    });

    const headerRow = (label, value, hotId) =>
      el("div", { class: "phx-row" }, [
        el("span", { class: "phx-label", text: label }),
        hotId ? hot(hotId, value) : el("span", { class: "phx-val", text: value }),
      ]);

    const head = el("div", { class: "phx-head" }, [
      headerRow("От:", data.from.value, data.from.hot),
      headerRow("Кому:", data.to ? data.to.value : "you@mail.example", data.to && data.to.hot),
      el("div", { class: "phx-row phx-subj" }, [
        el("span", { class: "phx-label", text: "Тема:" }),
        data.subject.hot ? hot(data.subject.hot, data.subject.value) : el("span", { class: "phx-val", text: data.subject.value }),
      ]),
    ]);

    const bodyChildren = [];
    for (const block of (data.body || [])) {
      if (Array.isArray(block)) {
        bodyChildren.push(el("p", {}, renderInline(block)));
      } else if (block && block.kind === "cta") {
        bodyChildren.push(el("div", { class: "phx-cta-wrap" }, [
          el("div", { class: "phx-cta", text: block.text }),
        ]));
      } else if (block && block.kind === "link") {
        const line = el("p", { class: "phx-link-line" });
        if (block.prefix) line.appendChild(el("span", { text: block.prefix }));
        line.appendChild(block.hot ? hot(block.hot, block.text) : el("span", { text: block.text }));
        bodyChildren.push(line);
      } else if (block && block.kind === "ps") {
        const line = el("p", { class: "phx-ps" });
        if (block.prefix) line.appendChild(el("span", { text: block.prefix }));
        line.appendChild(block.hot ? hot(block.hot, block.text) : el("span", { text: block.text }));
        bodyChildren.push(line);
      }
    }
    const body = el("div", { class: "phx-body" }, bodyChildren);

    return el("div", { class: "phx-email pnc-scene" }, [head, body]);
  },

  // Заглушки для будущих рендереров — пока fallback на текст
  chat(data)    { return el("div", { class: "pnc-scene pnc-stub" }, [el("p", { text: "[chat scene placeholder] " + JSON.stringify(data).slice(0, 60) })]); },
  site()        { return el("div", { class: "pnc-scene pnc-stub" }, [el("p", { text: "[site scene placeholder]" })]); },
  desktop()     { return el("div", { class: "pnc-scene pnc-stub" }, [el("p", { text: "[desktop scene placeholder]" })]); },
  image(data)   {
    // Простая картинка с прямоугольными hot-зонами в относительных координатах (0..1).
    const wrap = el("div", { class: "pnc-image-wrap pnc-scene" });
    const img = el("img", { class: "pnc-image", attrs: { src: data.src, alt: "" } });
    wrap.appendChild(img);
    for (const z of (data.zones || [])) {
      const h = el("button", {
        class: "phx-hot pnc-image-hot",
        attrs: { "data-hot": z.hot, "aria-label": z.hot, type: "button" },
        style: {
          left:   (z.x * 100) + "%",
          top:    (z.y * 100) + "%",
          width:  (z.w * 100) + "%",
          height: (z.h * 100) + "%",
        },
      });
      wrap.appendChild(h);
    }
    return wrap;
  },
};

// ===== Звёзды по числу промахов =====
function starsFor(misses) {
  if (misses === 0) return 3;
  if (misses <= 2)  return 2;
  return 1;
}

// ===== Точка входа =====
export function mountPnc(container, level, onFinish) {
  const targets = level.targets || [];
  const targetById = Object.fromEntries(targets.map((t) => [t.id, t]));
  const total = targets.length;

  const state = { found: new Set(), misses: 0 };

  const root = el("div", { class: "phx-root" });
  container.replaceChildren(root);

  // Шапка с инструкцией и счётчиком
  const head = el("div", { class: "phx-toolbar" }, [
    el("div", { class: "phx-instructions", text: level.instructions || "Найди все подозрительные элементы." }),
    el("div", { class: "phx-counter" }),
  ]);
  const counter = head.querySelector(".phx-counter");
  const updateCounter = () => {
    counter.textContent = `Найдено ${state.found.size} / ${total}  •  Промахов: ${state.misses}`;
  };

  // Сцена
  const renderer = RENDERERS[level.scene && level.scene.type] || RENDERERS.email;
  const sceneNode = renderer(level.scene && level.scene.data || {});

  // Делегируем клики на корне сцены: hit если data-hot, иначе miss.
  sceneNode.addEventListener("click", (e) => {
    const hotEl = e.target && e.target.closest && e.target.closest("[data-hot]");
    if (hotEl) {
      const id = hotEl.getAttribute("data-hot");
      if (state.found.has(id)) return;
      e.stopPropagation();
      onHit(id, hotEl);
    } else {
      const t = e.target;
      onMiss(t);
    }
  });

  const findings = el("div", { class: "phx-findings" });

  const actions = el("div", { class: "actions" }, [
    el("button", { class: "btn ghost", text: "Закончить", on: { click: () => finish(false) } }),
  ]);

  function onHit(id, hotEl) {
    state.found.add(id);
    hotEl.classList.add("found");
    select();
    notify("success");
    const info = targetById[id] || { label: id, why: "" };
    findings.appendChild(el("div", { class: "phx-find" }, [
      el("div", { class: "phx-find-tag", text: info.label }),
      el("div", { class: "phx-find-why", text: info.why }),
    ]));
    updateCounter();
    if (state.found.size === total) finish(true);
  }
  function onMiss(target) {
    state.misses++;
    impact("medium");
    if (target && target.classList) {
      target.classList.add("phx-shake");
      setTimeout(() => target.classList.remove("phx-shake"), 350);
    }
    updateCounter();
  }

  function finish(allFound) {
    const found = state.found.size;
    const baseStars = starsFor(state.misses);
    const stars = allFound ? baseStars : Math.max(0, baseStars - 1);
    const score = Math.max(0, found * 10 - state.misses * 2);
    saveResult(level.id, score, stars);
    if (stars === 3) notify("success");
    onFinish && onFinish({ stars, found, total, misses: state.misses, score });
  }

  root.appendChild(head);
  root.appendChild(sceneNode);
  root.appendChild(findings);
  root.appendChild(actions);
  updateCounter();
}
