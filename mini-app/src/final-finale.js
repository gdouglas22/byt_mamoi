// Финал всей игры — когда игрок прошёл ВСЕ темы (games_done === games_total в каждой темe).
// Большая поздравительная сценка от Капитана Мяу + перечисление побеждённых злодеев.
// Показывается ОДИН раз — флаг в localStorage.

import { playCutscene } from "./cutscene.js";

const LS_KEY = "cyberdef.final-finale.shown";

function wasShown() {
  try { return localStorage.getItem(LS_KEY) === "1"; } catch { return false; }
}
function markShown() {
  try { localStorage.setItem(LS_KEY, "1"); } catch {}
}

// Проверка: все ли темы пройдены. topics — массив из api.topics().
function allTopicsCompleted(topics) {
  if (!Array.isArray(topics) || topics.length === 0) return false;
  for (const t of topics) {
    const total = Number(t.games_total || 0);
    const done  = Number(t.games_done  || 0);
    if (total === 0) continue;       // тему без игр не учитываем
    if (done < total) return false;  // хоть одна не пройдена → ещё не финал
  }
  return true;
}

function buildFinaleScenes() {
  return [
    { avatar: "surprised", name: "Капитан Мяу", text: "Невероятно… ты прошёл ВСЕ восемь тем. 😯 Я думал, до этого никто не дойдёт." },
    { avatar: "happy",     name: "Капитан Мяу", text: "Смотри что ты наделал: Спам-Барон уплыл в свой грязный океан. Король Подделок рыдает в фейковом замке. Щедрый Шлёп никому не может всучить подарок." },
    { avatar: "happy",     name: "Капитан Мяу", text: "Тролль-Хейтер сдулся как шарик. Босс-Вирус растворился в карантине. Джаббер-Дразнилка летит в пустое дупло без секретиков. 🏆" },
    { avatar: "happy",     name: "Капитан Мяу", text: "По правилам Кибер-Академии ты теперь — **Магистр Кибер-Защитник**. 🎓 Это не игрушки — настоящий титул." },
    { avatar: "idle",      name: "Капитан Мяу", text: "Но главное — ты теперь сам учитель. Расскажи друзьям, маленькому брату, родителям. Покажи как защищаться. Сеть станет чуть безопаснее благодаря тебе." },
    { avatar: "happy",     name: "Капитан Мяу", text: "Мяу-победа! Спасибо, друг. 🐱✨🎉" },
  ];
}

// Вызывается из main.js после каждого finishGame и обновления APP_TOPICS.
// Если все темы пройдены и финал ещё не показывали — играем его.
// onDone вызывается ВСЕГДА (показали или нет), чтобы навигация продолжалась.
export function maybePlayFinalFinale(topics, onDone) {
  const done = () => { onDone && onDone(); };
  if (wasShown()) { done(); return false; }
  if (!allTopicsCompleted(topics)) { done(); return false; }
  markShown();
  playCutscene(buildFinaleScenes(), done);
  return true;
}
