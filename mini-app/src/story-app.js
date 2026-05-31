// Сцена «story»: интерактивная история с ветвящимся сюжетом.
// Игрок видит картинку + текст + 2-3 варианта действия. Каждый выбор ведёт к другому узлу.
// В концевом узле — финал и кнопка «Завершить», которая вызывает api.verdict(ending).
//
// Формат данных:
// {
//   start: "node_id_to_start_with",
//   nodes: {
//     "node_id": {
//       image: "assets/story/x/y.jpg",       // опционально
//       character: "Маша",                   // опционально, кто говорит/чьё действие
//       text: "Тебе пишет Маша: «Привет...»",
//       choices: [
//         { text: "Ха-ха, прикольно",    goto: "next_node", score: 0 },  // 0 = плохой выбор → api.miss()
//         { text: "Это ужасно. Я с тобой",goto: "next_node", score: 3 },  // ≥2 = правильный → api.hit()
//       ],
//     },
//     "ending_node": {
//       image: "...",
//       text: "Маша вышла из чата и больше не вернулась.",
//       ending: "good" | "ok" | "bad",       // финал
//       title:  "Хороший финал",              // опционально, иначе по умолчанию
//     },
//   }
// }

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";
import { select, impact, notify } from "./haptics.js";

function endingDefaults(ending) {
  if (ending === "good") return { icon: "🏆", title: "Хороший финал",   tone: "good" };
  if (ending === "ok")   return { icon: "👌", title: "Можно лучше",     tone: "ok"   };
  return                        { icon: "💔", title: "Плохой финал",    tone: "bad"  };
}

function renderStory(data, api) {
  const root = el("div", { class: "story-app" });

  function showNode(nodeId) {
    const node = data.nodes && data.nodes[nodeId];
    if (!node) {
      console.warn("Story: missing node", nodeId);
      root.replaceChildren(el("div", { class: "story-error", text: "Сценарий не найден: " + nodeId }));
      return;
    }
    select();

    const card = el("div", { class: "story-card" });

    if (node.image) {
      card.appendChild(el("div", { class: "story-image-wrap" }, [
        el("img", { class: "story-image", attrs: { src: node.image, alt: "" } }),
      ]));
    }

    if (node.character) {
      card.appendChild(el("div", { class: "story-character", text: node.character }));
    }

    if (node.text) {
      card.appendChild(el("div", { class: "story-text", text: node.text }));
    }

    if (node.ending) {
      // Концевой узел — финал
      const ed = Object.assign(endingDefaults(node.ending), {
        icon:  node.icon  || endingDefaults(node.ending).icon,
        title: node.title || endingDefaults(node.ending).title,
      });
      card.appendChild(el("div", { class: "story-ending " + ed.tone }, [
        el("div", { class: "story-ending-icon",  text: ed.icon }),
        el("div", { class: "story-ending-title", text: ed.title }),
      ]));
      card.appendChild(el("button", {
        class: "btn story-finish-btn",
        attrs: { type: "button" },
        text: "Завершить историю",
        on: { click: () => {
          if (node.ending === "good")     notify("success");
          else if (node.ending === "bad") notify("error");
          api.verdict(node.ending);
        }},
      }));
    } else if (Array.isArray(node.choices) && node.choices.length) {
      // Узел с вариантами — показываем кнопки-выборы
      const choicesEl = el("div", { class: "story-choices" });
      for (const choice of node.choices) {
        choicesEl.appendChild(el("button", {
          class: "story-choice",
          attrs: { type: "button" },
          text: choice.text,
          on: { click: () => {
            // Засчитываем правильность шага: ≥2 = hit, 0 = miss, 1 = нейтрально
            const score = Number(choice.score) || 0;
            if (score >= 2) { api.hit("step-" + nodeId); impact("light"); }
            else if (score === 0) { api.miss(); impact("medium"); }
            else { impact("light"); }
            showNode(choice.goto);
          }},
        }));
      }
      card.appendChild(choicesEl);
    }

    root.replaceChildren(card);
  }

  showNode(data.start);
  return root;
}

registerSceneRenderer("story", renderStory);
