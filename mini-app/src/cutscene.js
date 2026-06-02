import { el } from "./dom.js";
import { select } from "./haptics.js";
import { MENTOR } from "./mentor.js";

// Базовая скорость тайпрайтера (мс/символ). См. typeSpeedFor — адаптируется по длине.
const TYPE_SPEED = 12;
const FADE_MS = 180;
const TEXT_FADE_MS = 200;

// Кэш картинок по полному src (раньше был по emotion — конфликтовал с виланами).
const imageCache = Object.create(null);

function typeSpeedFor(text) {
  const n = (text || "").length;
  if (n > 100) return 8;
  if (n < 40) return 16;
  return TYPE_SPEED;
}

function loadImageBySrc(src) {
  if (!src) return Promise.resolve(null);
  if (imageCache[src] === false) return Promise.resolve(null);
  if (imageCache[src] instanceof HTMLImageElement) return Promise.resolve(imageCache[src]);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => { imageCache[src] = img; resolve(img); };
    img.onerror = () => { imageCache[src] = false; resolve(null); };
    img.src = src;
  });
}

function resolveAvatarSrcs(scene) {
  if (scene.imageOverride) {
    return Array.isArray(scene.imageOverride) ? scene.imageOverride : [scene.imageOverride];
  }
  return [MENTOR.imagePath(scene.avatar || "idle")];
}

async function loadFirstAvailable(srcs) {
  for (const s of srcs) {
    const img = await loadImageBySrc(s);
    if (img) return img;
  }
  return null;
}

function fadeInNode(node, duration = FADE_MS) {
  if (!node || !node.animate) return;
  try {
    node.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration, easing: "ease", fill: "forwards" }
    );
  } catch {}
}

function makeAvatarNode(scene) {
  const box = el("div", { class: "cs-avatar" });
  const emoji = MENTOR.emojiFallback[scene.avatar] || MENTOR.emojiFallback.idle;
  box.appendChild(el("div", { class: "cs-avatar-emoji", text: emoji }));
  loadFirstAvailable(resolveAvatarSrcs(scene)).then((img) => {
    if (!img) return;
    const clone = img.cloneNode();
    clone.className = "cs-avatar-img";
    clone.alt = "";
    box.replaceChildren(clone);
    fadeInNode(clone, FADE_MS);
  });
  return box;
}

async function swapAvatarWithFade(slotEl, makeNewNode) {
  const oldNode = slotEl.firstChild;
  const ANIM_OPTS = { duration: FADE_MS, easing: "ease", fill: "forwards" };
  // Если старого аватара нет (первая сцена) — только fade-in без задержки.
  if (oldNode && oldNode.animate) {
    try {
      await oldNode.animate([{ opacity: 1 }, { opacity: 0 }], ANIM_OPTS).finished;
    } catch {}
  }
  slotEl.replaceChildren(makeNewNode());
  const newNode = slotEl.firstChild;
  if (newNode && newNode.animate) {
    try {
      newNode.animate([{ opacity: 0 }, { opacity: 1 }], ANIM_OPTS);
    } catch {}
  }
}

export function playCutscene(scenes, onDone) {
  if (!Array.isArray(scenes) || scenes.length === 0) { onDone && onDone(); return; }

  const overlay = el("div", { class: "cs-overlay" });
  const card    = el("div", { class: "cs-card" });
  const avatar  = el("div", { class: "cs-avatar-slot" });
  const right   = el("div", { class: "cs-right" });
  const nameTag = el("div", { class: "cs-name", text: MENTOR.name });
  const textBox = el("div", { class: "cs-text" });
  const hint    = el("div", { class: "cs-hint", text: "Тап для продолжения ▸" });

  right.append(nameTag, textBox);
  card.append(avatar, right, hint);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  let idx = 0;
  let typingTimer = null;

  function showScene(scene) {
    swapAvatarWithFade(avatar, () => makeAvatarNode(scene));
    nameTag.textContent = scene.name || MENTOR.name;
    // Опциональный фон сценки (общий для всех реплик одной сценки).
    if (scene.bg) {
      overlay.classList.add("cs-overlay-themed");
      overlay.style.backgroundImage = `url("${scene.bg}")`;
    } else {
      overlay.classList.remove("cs-overlay-themed");
      overlay.style.backgroundImage = "";
    }
    hint.classList.remove("visible");
    textBox.textContent = "";

    // Мягкий fade-in текстового блока перед началом печати.
    if (textBox.animate) {
      try {
        textBox.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: TEXT_FADE_MS, easing: "ease" }
        );
      } catch {}
    }

    const full = String(scene.text || "");
    const speed = typeSpeedFor(full);
    let i = 0;
    typingTimer = setInterval(() => {
      if (i >= full.length) {
        clearInterval(typingTimer); typingTimer = null;
        hint.classList.add("visible");
        return;
      }
      textBox.textContent += full[i++];
    }, speed);
  }

  function nextOrSkip() {
    if (typingTimer) {
      clearInterval(typingTimer); typingTimer = null;
      textBox.textContent = scenes[idx].text;
      hint.classList.add("visible");
      return;
    }
    idx++;
    if (idx >= scenes.length) return close();
    select();
    showScene(scenes[idx]);
  }

  function close() {
    if (typingTimer) clearInterval(typingTimer);
    overlay.classList.add("closing");
    overlay.removeEventListener("click", nextOrSkip);
    setTimeout(() => {
      overlay.remove();
      onDone && onDone();
    }, 220);
  }

  overlay.addEventListener("click", nextOrSkip);
  showScene(scenes[0]);
}
