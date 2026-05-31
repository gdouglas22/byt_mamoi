// Сцены mail-app: Inbox (список писем) и Email (открытое письмо с подсветками + действия внизу).
// Стилизованы как «МЯУ-МЭЙЛ» — наш кибер-почтовый клиент в фирменной палитре.
// Регистрируются в quest-движке через registerSceneRenderer.

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";

// ===== Inbox =====
function renderMailInbox(data, api) {
  const root = el("div", { class: "mail-app" });

  // Шапка приложения
  const appBar = el("div", { class: "mail-appbar" }, [
    el("div", { class: "mail-appbar-logo" }, [
      el("span", { class: "mail-appbar-icon", text: "📨" }),
      el("span", { class: "mail-appbar-name", text: "МЯУ-МЭЙЛ" }),
    ]),
    el("div", { class: "mail-appbar-badge", text: data.title || "Входящие" }),
  ]);
  root.appendChild(appBar);

  // Список писем
  const list = el("div", { class: "mail-list" });
  const letters = data.letters || [];
  for (const letter of letters) {
    const item = el("button", {
      class: "mail-item" + (letter.unread ? " unread" : "") + (letter._opened ? " opened" : ""),
      attrs: { "data-letter": letter.id, type: "button" },
      on: {
        click: () => {
          letter._opened = true;
          // Реакция: либо переход на сцену, либо короткая нота
          if (letter.onClick && letter.onClick.goto) {
            api.goto(letter.onClick.goto);
          } else if (letter.onClick && letter.onClick.note) {
            api.note(letter.onClick.note);
            item.classList.add("opened");
            item.classList.remove("unread");
          } else {
            api.note("Письмо открыто.");
          }
        },
      },
    }, [
      el("div", { class: "mail-item-avatar" + (letter.suspect ? " suspect" : ""), text: letter.avatar || "✉️" }),
      el("div", { class: "mail-item-body" }, [
        el("div", { class: "mail-item-from" }, [
          el("span", { class: "mail-item-fromname", text: letter.from || "(без имени)" }),
          letter.suspect ? el("span", { class: "mail-item-warn", text: "⚠" }) : null,
        ]),
        el("div", { class: "mail-item-subject", text: letter.subject || "" }),
        el("div", { class: "mail-item-preview", text: letter.preview || "" }),
      ]),
      el("div", { class: "mail-item-time", text: letter.time || "" }),
    ]);
    list.appendChild(item);
  }
  root.appendChild(list);

  // Подсказка-инструкция
  root.appendChild(el("div", { class: "mail-hint", text: data.hint || "Тапни на письмо, которое выглядит подозрительно." }));

  return root;
}

// ===== Email =====
function renderMailEmail(data, api) {
  const root = el("div", { class: "mail-app mail-email-view" });
  const letter = data.letter || {};

  // Шапка приложения с кнопкой «Назад»
  const appBar = el("div", { class: "mail-appbar" }, [
    el("button", {
      class: "mail-appbar-back",
      attrs: { type: "button" },
      text: "‹ Входящие",
      on: { click: () => { if (data.back) api.goto(data.back); } },
    }),
    el("div", { class: "mail-appbar-badge", text: "Письмо" }),
  ]);
  root.appendChild(appBar);

  // Карточка письма
  const head = el("div", { class: "mail-email-head" }, [
    el("div", { class: "mail-email-avatar" + (letter.suspect ? " suspect" : ""), text: letter.avatar || "✉️" }),
    el("div", { class: "mail-email-head-titles" }, [
      el("div", { class: "mail-email-from-row" }, [
        letter.fromNameHot
          ? el("span", { class: "phx-hot mail-email-fromname", attrs: { "data-hot": letter.fromNameHot }, text: letter.fromName || "" })
          : el("span", { class: "mail-email-fromname", text: letter.fromName || "" }),
        letter.fromAddrHot
          ? el("span", { class: "phx-hot mail-email-fromaddr", attrs: { "data-hot": letter.fromAddrHot }, text: "<" + letter.fromAddr + ">" })
          : el("span", { class: "mail-email-fromaddr", text: letter.fromAddr ? "<" + letter.fromAddr + ">" : "" }),
      ]),
      el("div", { class: "mail-email-to", text: letter.to ? "Кому: " + letter.to : "" }),
      el("div", { class: "mail-email-time", text: letter.time || "" }),
    ]),
  ]);
  root.appendChild(head);

  // Тема
  if (letter.subject) {
    const subjEl = letter.subjectHot
      ? el("h2", { class: "mail-email-subject" }, [
          el("span", { class: "phx-hot", attrs: { "data-hot": letter.subjectHot }, text: letter.subject }),
        ])
      : el("h2", { class: "mail-email-subject", text: letter.subject });
    root.appendChild(subjEl);
  }

  // Тело
  const body = el("div", { class: "mail-email-body" });
  for (const block of (letter.body || [])) {
    if (Array.isArray(block)) {
      body.appendChild(el("p", {}, renderInline(block)));
    } else if (block && block.kind === "cta") {
      body.appendChild(el("div", { class: "mail-email-cta-wrap" }, [
        block.hot
          ? el("button", { class: "phx-hot mail-email-cta", attrs: { "data-hot": block.hot, type: "button" }, text: block.text })
          : el("button", { class: "mail-email-cta", attrs: { type: "button" }, text: block.text }),
      ]));
    } else if (block && block.kind === "link") {
      const line = el("p", { class: "mail-email-link-line" });
      if (block.prefix) line.appendChild(el("span", { text: block.prefix }));
      line.appendChild(block.hot
        ? el("span", { class: "phx-hot mail-email-link", attrs: { "data-hot": block.hot }, text: block.text })
        : el("span", { class: "mail-email-link", text: block.text }));
      body.appendChild(line);
    } else if (block && block.kind === "ps") {
      const line = el("p", { class: "mail-email-ps" });
      if (block.prefix) line.appendChild(el("span", { text: block.prefix }));
      line.appendChild(block.hot
        ? el("span", { class: "phx-hot", attrs: { "data-hot": block.hot }, text: block.text })
        : el("span", { text: block.text }));
      body.appendChild(line);
    }
  }
  root.appendChild(body);

  // Делегирование hit/miss на body+head+subject (всё что внутри карточки)
  // Miss считается только если клик попал на КОНКРЕТНЫЙ кликабельный текстовый элемент
  // (span/p/button и т.п.), который НЕ помечен как hot. Клики в пустые места
  // (на padding/wrapper-div) игнорируем — иначе невозможно играть без штрафов.
  const HIT_TAGS = new Set(["SPAN", "STRONG", "EM", "A", "BUTTON", "P", "H2", "H3"]);
  const trapClicks = (e) => {
    const hotEl = e.target && e.target.closest && e.target.closest("[data-hot]");
    if (hotEl) {
      const id = hotEl.getAttribute("data-hot");
      if (hotEl.classList.contains("found")) return;
      e.stopPropagation();
      hotEl.classList.add("found");
      api.hit(id);
      return;
    }
    // Промах — только клик по реально кликабельному элементу-обманке
    const t = e.target;
    if (!t || !t.tagName) return;
    if (!HIT_TAGS.has(t.tagName)) return;
    if (t.closest && t.closest("[data-hot]")) return;
    api.miss();
    if (t.classList) {
      t.classList.add("phx-shake");
      setTimeout(() => t.classList.remove("phx-shake"), 320);
    }
  };
  head.addEventListener("click", trapClicks);
  body.addEventListener("click", trapClicks);
  // если есть subject как hot — клики уже обработаются через root delegation выше? Нет — нужен отдельный listener
  const subjEl = root.querySelector(".mail-email-subject");
  if (subjEl) subjEl.addEventListener("click", trapClicks);

  // Нижняя панель действий
  const actionsBar = el("div", { class: "mail-actions" });
  for (const a of (data.actions || [])) {
    actionsBar.appendChild(el("button", {
      class: "mail-action",
      attrs: { type: "button", "data-action": a.id },
      on: { click: () => api.verdict(a.id) },
    }, [
      el("span", { class: "mail-action-icon", text: a.icon || "" }),
      el("span", { class: "mail-action-label", text: a.label || a.id }),
    ]));
  }
  root.appendChild(actionsBar);

  return root;
}

function renderInline(parts) {
  return parts.map((p) => {
    if (typeof p === "string") return el("span", { text: p });
    if (p && p.hot) return el("span", { class: "phx-hot", attrs: { "data-hot": p.hot }, text: p.text });
    return el("span", { text: (p && p.text) || "" });
  });
}

// Регистрируем сцены в quest-движке
registerSceneRenderer("mail-inbox", renderMailInbox);
registerSceneRenderer("mail-email", renderMailEmail);
