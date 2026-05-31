// Виланские сценки: intro перед первой игрой темы, between между играми, defeat после последней.
// Каждая сценка — массив реплик [{avatar, name, text}], где name=Капитан Мяу → реплика Кота,
// иначе → реплика вилана из enrichments[slug].villain.

import { playCutscene } from "./cutscene.js";
import { getEnrichment } from "./enrichments.js";
import { MENTOR } from "./mentor.js";

const LS_KEY = (slug, type) => `cyberdef.villain.${slug}.${type}.shown`;

function wasShown(slug, type) {
  try { return localStorage.getItem(LS_KEY(slug, type)) === "1"; } catch { return false; }
}
function markShown(slug, type) {
  try { localStorage.setItem(LS_KEY(slug, type), "1"); } catch {}
}

function hydrateScenes(rawScenes, villain) {
  const bg = villain.scenesBg || null;
  return rawScenes.map((s) => {
    const isVillain = !!s.name && s.name !== MENTOR.name;
    const imageOverride = isVillain
      ? [`assets/villains/${villain.id}_${s.avatar}.jpg`, `assets/villains/${villain.id}.jpg`]
      : [`assets/mentor/${s.avatar}.jpg`, `assets/mentor/idle.jpg`];
    return Object.assign({}, s, { imageOverride, bg });
  });
}

// type: "intro" | "between0" | "between1" | "defeat"
export function playVillainSceneIfNeeded(slug, type, onDone) {
  const done = () => { onDone && onDone(); };
  const enr = getEnrichment(slug);
  const v = enr && enr.villain;
  if (!v) { done(); return false; }
  let raw = null;
  if (type === "intro")    raw = v.intro;
  if (type === "between0") raw = v.between && v.between[0];
  if (type === "between1") raw = v.between && v.between[1];
  if (type === "defeat")   raw = v.defeat;
  if (!Array.isArray(raw) || raw.length === 0) { done(); return false; }
  if (wasShown(slug, type)) { done(); return false; }
  markShown(slug, type);
  playCutscene(hydrateScenes(raw, v), done);
  return true;
}
