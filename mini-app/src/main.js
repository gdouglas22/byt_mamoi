import { applyTheme } from "./theme.js";
import { renderMenu } from "./menu.js";
import { renderThemeView } from "./theme-view.js";
import { getRank, getTotal, isOnboarded, markOnboarded } from "./progress.js";
import { el } from "./dom.js";
import { playCutscene } from "./cutscene.js";
// ONBOARDING больше не статичен — собираем динамически через pickReplica
import { mountPnc } from "./pnc.js";
import { mountDnd } from "./dnd.js";
import { mountQuest } from "./quest.js";
import {
  applyToBody as applyDifficulty, getDifficulty, setDifficulty, hasDifficultyChosen, DIFFICULTY_LABELS,
} from "./difficulty.js";
import { renderDifficultyPicker } from "./dif-picker.js";
import { renderLevelResult } from "./level-result.js";
import * as api from "./api.js";
import { getEnrichment, getLevelContent } from "./enrichments.js";
import { playVillainSceneIfNeeded } from "./villain-scenes.js";
import { maybePlayFinalFinale } from "./final-finale.js";
import { loadReplicas, pickReplica } from "./replicas.js";
import { loadAllMessages } from "./messages-pool.js";
// Регистрирует сцены mail-inbox / mail-email + fake-site + phone-call + chat-swipe + url-swipe в quest-движке
// (импорт ради side-effect: каждый файл сам вызывает registerSceneRenderer)
import "./mail-app.js";
import "./site-app.js";
import "./phone-app.js";
import "./chat-swipe-app.js";
import "./url-swipe-app.js";
import "./story-app.js";
import "./file-pile-app.js";
import "./pwd-strength.js";
import "./pwd-build.js";
import "./pwd-manager.js";
import "./quiz-renderer.js";
import "./toggle-grid.js";

const screen      = document.getElementById("screen");
const screenTitle = document.getElementById("screen-title");
const rankBadge   = document.getElementById("rank-badge");
const scoreEl     = document.getElementById("total-score");
const difBadge    = document.getElementById("dif-badge");

// Когда mini-app встроен в нашу React-обёртку как iframe, родитель ждёт
// сигнал «я на корневом меню» — чтобы показать кнопку возврата к React-шеллу.
// Вне iframe (standalone Telegram) это no-op.
const IS_IFRAMED = (() => { try { return window.parent && window.parent !== window; } catch { return false; } })();
if (IS_IFRAMED) document.documentElement.dataset.iframed = "1";
function notifyParent(type, payload = {}) {
  if (!IS_IFRAMED) return;
  try { window.parent.postMessage(Object.assign({ type }, payload), "*"); } catch {}
}

// ===== Локальный стейт =====
let APP_USER = null;     // user из API.me()
let APP_TOPICS = [];     // массив тем из API.topics()

// ===== Difficulty badge =====
function refreshDifficultyBadge() {
  const cur = getDifficulty();
  const info = DIFFICULTY_LABELS[cur];
  if (difBadge && info) {
    difBadge.textContent = info.emoji;
    difBadge.setAttribute("title", info.title + " · " + info.age);
  }
  applyDifficulty(cur);
}
refreshDifficultyBadge();
window.addEventListener("cyberdef:difficulty", refreshDifficultyBadge);

if (difBadge) {
  difBadge.addEventListener("click", () => openDifficultyOverlay());
}

function openDifficultyOverlay() {
  const overlay = el("div", { class: "dif-overlay" });
  const sheet = el("div", { class: "dif-sheet" });
  const close = el("button", { class: "dif-sheet-close", attrs: { type: "button", "aria-label": "Закрыть" }, text: "✕", on: { click: () => overlay.remove() } });
  const picker = renderDifficultyPicker(() => { overlay.remove(); refreshDifficultyBadge(); });
  sheet.append(close, picker);
  overlay.appendChild(sheet);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}
// applyTheme handles both standalone (tg present) and iframe (tg null) modes,
// and sets up its own listeners for theme changes / parent postMessage.
applyTheme(tg);

let currentBackHandler = null;
function showBackBtn(handler) {
  currentBackHandler = handler;
  if (tg && tg.BackButton) { tg.BackButton.show(); tg.BackButton.onClick(onTgBack); }
}
function hideBackBtn() {
  currentBackHandler = null;
  if (tg && tg.BackButton) { tg.BackButton.offClick(onTgBack); tg.BackButton.hide(); }
}
function onTgBack() { if (currentBackHandler) currentBackHandler(); }

function refreshHeader() {
  // Имя/очки приоритетно из API, fallback на localStorage
  if (APP_USER) {
    rankBadge.textContent = APP_USER.name || getRank();
    scoreEl.textContent   = String(APP_USER.points ?? getTotal());
  } else {
    rankBadge.textContent = getRank();
    scoreEl.textContent   = String(getTotal());
  }
}
function setTitle(t) { screenTitle.textContent = t; }

// ===== Меню тем (из API) =====
async function showMenu() {
  setTitle("Кибер-Академия");
  hideBackBtn();
  refreshHeader();
  // Если topics ещё не загружены — запросить
  if (!APP_TOPICS || !APP_TOPICS.length) {
    try { APP_TOPICS = await api.topics(); } catch { APP_TOPICS = []; }
  }
  screen.replaceChildren(renderMenu(APP_TOPICS, openTopic));
  notifyParent("cyberdef:at-root", { atRoot: true });
}

function buildOnboardingScenes() {
  // Туториал — короткое введение в правила игры. Капитан Мяу представляется,
  // рассказывает про злодеев, объясняет систему звёзд. 4 экрана, ~10 секунд чтения.
  return [
    { avatar: "happy",     name: "Капитан Мяу", text: "Мяу! Я Капитан Мяу — наставник Кибер-Академии Круга Безопасности. Добро пожаловать! 🐱✨" },
    { avatar: "surprised", name: "Капитан Мяу", text: "В Сети живёт банда злодеев. Спам-Барон, Тролль-Хейтер, Босс-Вирус и другие — каждый со своим грязным приёмом. Они охотятся на тех, кто не умеет защищаться." },
    { avatar: "idle",      name: "Капитан Мяу", text: "У нас 8 тем — 8 битв. Каждая тема состоит из нескольких мини-игр. Прошёл все игры темы — победил её злодея и получил награду." },
    { avatar: "happy",     name: "Капитан Мяу", text: "За каждую игру дают звёзды: 0, 1, 2 или 3. Чем больше ловушек заметил — тем больше звёзд. Ошибся — не беда, можно перепройти. Готов? Поехали! 🚀" },
  ];
}

// ===== Открыть тему =====
async function openTopic(topic) {
  if (!topic) return;
  const enr = getEnrichment(topic.slug);
  // mentorIntro: берём аватар из enrichment, текст — рандомный из библиотеки реплик
  const age = getDifficulty();
  const introText = pickReplica(`theme-intro-${topic.slug}`, {
    age,
    fallback: (enr && enr.mentorIntro && enr.mentorIntro.text) || "",
  });
  const intro = introText ? [{ avatar: (enr && enr.mentorIntro && enr.mentorIntro.avatar) || "idle", text: introText }] : [];
  // Подгружаем детали темы (игры)
  let detail;
  try { detail = await api.topicDetail(topic.id); }
  catch { detail = Object.assign({}, topic, { games: [] }); }
  const showView = () => showThemeView(detail);
  const runMentorIntro = () => {
    if (intro.length) playCutscene(intro, showView);
    else showView();
  };
  // Villain intro — только если игрок ещё ни одной игры в теме не прошёл.
  const gamesDone = Number(topic.games_done || 0);
  if (gamesDone === 0) {
    playVillainSceneIfNeeded(topic.slug, "intro", runMentorIntro);
  } else {
    runMentorIntro();
  }
}

function showThemeView(topic) {
  setTitle(topic.title);
  showBackBtn(showMenu);
  refreshHeader();
  screen.replaceChildren(renderThemeView(topic, (game) => openLevel(topic, game), showMenu));
  notifyParent("cyberdef:at-root", { atRoot: false });
}

// ===== Уровень =====
async function openLevel(topic, game) {
  const content = getLevelContent(topic.slug, game.id);
  if (!content) {
    // Контента пока нет — короткое уведомление и возврат
    const msg = el("div", { class: "placeholder" }, [
      el("h3", { text: game.title || "Уровень" }),
      el("p", { text: "Эту игру мы пока готовим. Капитан Мяу сообщит, когда будет готова." }),
      el("button", { class: "btn ghost", text: "Назад", on: { click: () => showThemeView(topic) } }),
    ]);
    screen.replaceChildren(msg);
    return;
  }

  // Прицепляем id-ы для совместимости с движками (level.id для прогресса)
  const level = Object.assign({}, content, {
    id: `${topic.slug}-${game.id}`,
    apiGameId: game.id,
    apiTopicId: topic.id,
    title: content.title || game.title,
  });

  setTitle(topic.title + " · " + (level.title || "уровень"));
  showBackBtn(() => showThemeView(topic));

  // Стартуем игру в бэке Фролова
  try { await api.startGame(game.id); } catch {}
  const startedAt = Date.now();

  const launch = () => {
    const host = el("div", { class: "level-host" });
    screen.replaceChildren(host);

    const onFinish = async (result) => {
      // Бэк Фролова сам считает звёзды/очки из отношения score/total.
      // Шлём ЧЕСТНЫЕ: сколько ловушек нашёл / сколько активно было.
      const score = Number(result?.found) || 0;
      const total = Number(result?.total) || 1;
      const timeSec = Math.round((Date.now() - startedAt) / 1000);

      // Локальные звёзды — учитывают и правильность вердикта (а не только долю находок).
      const localStars = Number(result?.stars) || 0;
      let stars = localStars;
      let pointsEarned = 0;
      let newAchievements = [];
      try {
        const fr = await api.finishGame(game.id, { score, total, time_seconds: timeSec });
        // Бэк грейдит строго по found/total. Берём НЕ МЕНЬШЕ локальных звёзд за верный вердикт,
        // чтобы за правильно пройденную игру (особенно story с хорошим финалом) не получить 0★.
        if (fr && typeof fr.stars === "number") stars = Math.max(fr.stars, localStars);
        pointsEarned    = fr?.points_earned || 0;
        newAchievements = fr?.new_achievements || [];
        // Notify the React shell so it can show a Steam-style achievement toast.
        for (const a of newAchievements) {
          notifyParent("cyberdef:achievement", { achievement: a });
        }
        APP_USER   = await api.me().catch(() => APP_USER);
        APP_TOPICS = await api.topics().catch(() => APP_TOPICS);
      } catch {}
      refreshHeader();

      // Финальный результат для рендеров — со звёздами от бэка (источник истины).
      const finalResult = Object.assign({}, result, { stars, points_earned: pointsEarned, new_achievements: newAchievements });

      // Определяем, нужна ли виланская сценка ПОСЛЕ обычного outro/разбора.
      const freshTopic = (APP_TOPICS || []).find((t) => t.id === topic.id) || topic;
      const topicDone  = Number(freshTopic.games_done  || 0);
      const topicTotal = Number(freshTopic.games_total || (topic.games || []).length || 0);
      let villainType = null;
      if (topicTotal > 0 && topicDone >= topicTotal) villainType = "defeat";
      else if (topicDone === 1)                       villainType = "between0";
      else if (topicDone === 2)                       villainType = "between1";

      const goToThemeView = async () => {
        // Сразу проставляем заработанные звёзды только что пройденной игре в локальном объекте —
        // чтобы на экране тем они появились мгновенно, не дожидаясь бэка (бэк фиксирует best_stars
        // с задержкой, и немедленный перезапрос мог вернуть ещё старое значение → звёзды «не обновлялись»).
        const patchGame = (t) => {
          const gg = t && Array.isArray(t.games) ? t.games.find((x) => x.id === game.id) : null;
          if (gg) {
            gg.best_stars = Math.max(Number(gg.best_stars) || 0, Number(stars) || 0);
            gg.completed = true;
          }
          return t;
        };
        patchGame(topic);
        let freshDetail = topic;
        // Дополнительно перечитываем тему (свежие статусы блокировок след. уровней), но НЕ занижаем
        // только что заработанные звёзды, если бэк ещё не успел их записать.
        try { freshDetail = patchGame(await api.topicDetail(topic.id)) || topic; } catch {}
        showThemeView(freshDetail);
      };
      const afterVillain  = () => maybePlayFinalFinale(APP_TOPICS, goToThemeView);
      const afterOutro = () => {
        if (!villainType) { afterVillain(); return; }
        playVillainSceneIfNeeded(topic.slug, villainType, afterVillain);
      };

      if (level.type === "quest") {
        setTitle(topic.title + " · разбор");
        showBackBtn(goToThemeView);
        screen.replaceChildren(renderLevelResult(level, finalResult, {
          onReplay: () => openLevel(topic, game),
          onMenu:   afterOutro,   // «В меню темы» → виланская сценка (если положена)
        }));
      } else {
        const outroScenes = makeOutroScenes(level, stars);
        playCutscene(outroScenes, afterOutro);
      }
    };

    if (level.type === "pnc")        mountPnc(host, level, onFinish);
    else if (level.type === "dnd")   mountDnd(host, level, onFinish);
    else if (level.type === "quest") mountQuest(host, level, onFinish);
    else                              onFinish({ stars: 0 });
  };

  const introScenes = Array.isArray(level.intro) ? level.intro : (level.intro ? [level.intro] : []);
  if (introScenes.length) playCutscene(introScenes, launch);
  else launch();
}

function makeOutroScenes(level, stars) {
  // Если у уровня свой выигрышный/проигрышный текст — используем его.
  if (stars >= 2 && level.win)  return Array.isArray(level.win)  ? level.win  : [level.win];
  if (stars < 1 && level.lose)  return Array.isArray(level.lose) ? level.lose : [level.lose];
  // Иначе берём рандомную реплику из библиотеки по слоту outro-{win|mid|lose}
  const age = getDifficulty();
  const slot = stars >= 3 ? "outro-win" : stars >= 1 ? "outro-mid" : "outro-lose";
  const avatar = stars >= 2 ? "happy" : stars === 1 ? "idle" : "sad";
  return [{ avatar, text: pickReplica(slot, { age }) }];
}

// ===== Boot =====
async function boot() {
  // Параллельно: профиль, темы из API + библиотека реплик Капитана
  try {
    [APP_USER, APP_TOPICS] = await Promise.all([
      api.me().catch(() => null),
      api.topics().catch(() => []),
      loadReplicas().catch(() => null),
      loadAllMessages().catch(() => null),
    ]);
  } catch { APP_USER = null; APP_TOPICS = []; }

  // Автосложность по возрасту, если игрок не выбирал её вручную
  if (APP_USER && APP_USER.age && !hasDifficultyChosen()) {
    setDifficulty(api.autoDifficultyByAge(APP_USER.age));
  }
  refreshDifficultyBadge();
  refreshHeader();

  // Первый запуск — onboarding-сцены, потом меню
  if (!isOnboarded() && !(APP_USER && APP_USER.onboarding_done)) {
    playCutscene(buildOnboardingScenes(), () => { markOnboarded(); showMenu(); });
  } else {
    showMenu();
  }

  // Пинг активности (no-op если упадёт)
  api.ping();
}

window.addEventListener("error", (e) => {
  console.error("[mini-app]", e && e.error || e && e.message);
});

boot();
