// Уровень сложности игрока.
// easy   (7-9 лет):  подсвечиваются hot-spots при наведении + всплывающая подсказка
// medium (9-11):     дефолт. без подсветок, ищем глазами
// hard   (12+):      без подсветок + активны «секретные» цели (target.difficulty === "hard")
//
// Хранится в localStorage, применяется как класс body.dif-<level>.

const KEY = "cyberdef.difficulty";
const DEFAULT = "medium";
const LEVELS = ["easy", "medium", "hard"];

export const DIFFICULTY_LABELS = {
  easy:   { emoji: "🐱", title: "Лёгкий",  age: "7-9 лет",  hint: "Подозрительное подсвечивается на наведении" },
  medium: { emoji: "🐯", title: "Средний", age: "9-11 лет", hint: "Ищем глазами, без подсказок (рекомендуем)" },
  hard:   { emoji: "🦁", title: "Сложный", age: "12+",       hint: "Без подсказок + скрытые секреты" },
};

export function getDifficulty() {
  try {
    const v = localStorage.getItem(KEY);
    return LEVELS.includes(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setDifficulty(level) {
  if (!LEVELS.includes(level)) return;
  try { localStorage.setItem(KEY, level); } catch {}
  applyToBody(level);
  window.dispatchEvent(new CustomEvent("cyberdef:difficulty", { detail: level }));
}

export function hasDifficultyChosen() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function applyToBody(level) {
  level = level || getDifficulty();
  for (const l of LEVELS) document.body.classList.remove("dif-" + l);
  document.body.classList.add("dif-" + level);
}

// Фильтр targets по выбранной сложности.
// На hard — все цели активны. На easy/medium — без `difficulty: "hard"`.
export function activeTargets(targets) {
  const cur = getDifficulty();
  if (cur === "hard") return targets || [];
  return (targets || []).filter((t) => !t.difficulty || t.difficulty !== "hard");
}
