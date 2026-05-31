// Рендерер сцены «fake-site» — имитация фишинг-страницы (раздача Робаксов).
// Регистрируется в quest-движке. Признаки подделки помечены как hot-spots:
// клик на них = api.hit, выбор финального действия (forsook / enter) = api.verdict.

import { el } from "./dom.js";
import { registerSceneRenderer } from "./quest.js";

function renderFakeSite(data, api) {
  const root = el("div", { class: "site-app" });

  // Браузерная панель с адресом и (отсутствующим) замком
  const browser = el("div", { class: "site-browser-bar" }, [
    el("div", { class: "site-browser-dots" }, [
      el("span", { class: "site-browser-dot site-dot-red" }),
      el("span", { class: "site-browser-dot site-dot-yellow" }),
      el("span", { class: "site-browser-dot site-dot-green" }),
    ]),
    el("div", { class: "site-browser-url" }, [
      data.protocolHot
        ? el("span", { class: "phx-hot site-url-protocol", attrs: { "data-hot": data.protocolHot }, text: data.protocol || "http://" })
        : el("span", { class: "site-url-protocol", text: data.protocol || "http://" }),
      data.urlHot
        ? el("span", { class: "phx-hot site-url-host", attrs: { "data-hot": data.urlHot }, text: data.url })
        : el("span", { class: "site-url-host", text: data.url }),
    ]),
  ]);
  root.appendChild(browser);

  // Контент страницы (тело фейкового сайта)
  const page = el("div", { class: "site-page" });

  // Логотип сайта
  const logo = el("div", { class: "site-logo" });
  if (data.logoHot) {
    logo.appendChild(el("span", { class: "phx-hot site-logo-text", attrs: { "data-hot": data.logoHot }, text: data.logoText || "ROBLOXX" }));
  } else {
    logo.appendChild(el("span", { class: "site-logo-text", text: data.logoText || "ROBLOXX" }));
  }
  page.appendChild(logo);

  // Главный заголовок
  if (data.headline) {
    const h = el("h1", { class: "site-headline" });
    if (data.headlineHot) {
      h.appendChild(el("span", { class: "phx-hot", attrs: { "data-hot": data.headlineHot }, text: data.headline }));
    } else {
      h.textContent = data.headline;
    }
    page.appendChild(h);
  }

  // Countdown-таймер
  if (data.countdown) {
    const timer = el("div", { class: "site-countdown" });
    timer.appendChild(el("span", { class: "site-countdown-label", text: "Осталось до конца акции:" }));
    if (data.countdownHot) {
      timer.appendChild(el("span", { class: "phx-hot site-countdown-value", attrs: { "data-hot": data.countdownHot }, text: data.countdown }));
    } else {
      timer.appendChild(el("span", { class: "site-countdown-value", text: data.countdown }));
    }
    page.appendChild(timer);
  }

  // Форма «получи робаксы»
  if (data.form) {
    const form = el("div", { class: "site-form" });
    for (const field of data.form.fields || []) {
      const row = el("label", { class: "site-form-row" });
      const label = field.hot
        ? el("span", { class: "phx-hot site-form-label", attrs: { "data-hot": field.hot }, text: field.label })
        : el("span", { class: "site-form-label", text: field.label });
      const input = el("input", {
        class: "site-form-input",
        attrs: { type: field.type || "text", placeholder: field.placeholder || "", readonly: "true" },
      });
      row.append(label, input);
      form.appendChild(row);
    }
    page.appendChild(form);
  }

  // Фейковые отзывы (могут быть hot)
  if (data.reviews && data.reviews.length) {
    const block = el("div", { class: "site-reviews" });
    block.appendChild(el("div", { class: "site-reviews-title", text: data.reviewsTitle || "Отзывы счастливчиков:" }));
    const wrap = data.reviewsHot
      ? el("div", { class: "phx-hot site-reviews-list", attrs: { "data-hot": data.reviewsHot } })
      : el("div", { class: "site-reviews-list" });
    for (const r of data.reviews) {
      wrap.appendChild(el("div", { class: "site-review" }, [
        el("div", { class: "site-review-author", text: r.author }),
        el("div", { class: "site-review-text", text: r.text }),
      ]));
    }
    block.appendChild(wrap);
    page.appendChild(block);
  }

  root.appendChild(page);

  // Делегирование hit/miss на тело страницы (не на actions внизу)
  const HIT_TAGS = new Set(["SPAN", "STRONG", "EM", "A", "BUTTON", "P", "H1", "H2", "H3", "DIV", "LABEL"]);
  const trapClicks = (e) => {
    const hotEl = e.target && e.target.closest && e.target.closest("[data-hot]");
    if (hotEl) {
      if (hotEl.classList.contains("found")) return;
      const id = hotEl.getAttribute("data-hot");
      e.stopPropagation();
      hotEl.classList.add("found");
      api.hit(id);
      return;
    }
    const t = e.target;
    if (!t || !t.tagName || !HIT_TAGS.has(t.tagName)) return;
    if (t.closest && t.closest("[data-hot]")) return;
    if (t.closest && t.closest(".site-actions, .site-browser-bar")) return;
    api.miss();
    if (t.classList) {
      t.classList.add("phx-shake");
      setTimeout(() => t.classList.remove("phx-shake"), 320);
    }
  };
  page.addEventListener("click", trapClicks);
  browser.addEventListener("click", trapClicks);

  // Нижняя панель действий
  const actionsBar = el("div", { class: "site-actions" });
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

registerSceneRenderer("fake-site", renderFakeSite);
