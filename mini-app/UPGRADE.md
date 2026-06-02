# Уникализация Mini App — план апгрейда

> Что есть сейчас (2026-05-11): MVP-каркас + 6 играбельных мини-игр + Lucide-иконки в меню + Kenney-спрайты в Phaser-играх. Выглядит как «учебный набор прототипов в одной тёмной обвязке». Эта дорожная карта — как из MVP сделать **узнаваемый продукт** для защиты курсовой и портфолио.

---

## 4 слоя индивидуальности

| Слой | Что именно | Почему важно |
|---|---|---|
| 1. Визуальный стиль | Фирменная палитра, шрифт, кастомные иконки и фоны в едином языке | Первое впечатление, узнаваемость |
| 2. Персонаж-наставник | Сова/робот/хакер, реагирует на действия игрока | Эмоциональная связь, мотивация продолжать |
| 3. Нарратив-обвязка | «Академия Кибер-Защитников», звания, сертификат, диалоги между играми | Превращает набор мини-игр в продукт со смыслом |
| 4. Аудио-дизайн | 1 фоновый трек + 8-10 SFX + (опц.) озвучка наставника | +50% к ощущению с минимальным бюджетом |

---

## Сервисы и инструменты

### Графика и иконки
| Сервис | Что | Цена |
|---|---|---|
| **Midjourney** | Иллюстрации, фоны, концепты персонажа | $10/мес, через Discord |
| **Leonardo.ai** | Аналог MJ, есть бесплатный план | Free 150 ген/день |
| **Recraft.ai** | Векторные иконки в едином стиле, brand-kit | Free, есть Pro |
| **Ideogram.ai** | Иконки с текстом, логотипы | Free + Pro |
| **DALL·E 3** (через ChatGPT Plus) | Универсальная генерация | $20/мес ChatGPT |
| **Krea.ai** | Параллакс-фоны и текстуры | Free + Pro |

### Анимация
| Сервис | Что | Цена |
|---|---|---|
| **rive.app** | Интерактивные анимации, есть community-сток | Free + Pro |
| **lottiefiles.com** | Lottie JSON для UI (звёзды, конфетти) | Free сток |

### Звук и музыка
| Сервис | Что | Цена |
|---|---|---|
| **ElevenLabs SFX** | Генерация SFX по описанию | Free 10K симв/мес |
| **Suno.ai** / **Udio.ai** | Генерация музыки по промту | Free 10 треков/день (Suno) |
| **freesound.org** | Банк CC-звуков | Free |
| **incompetech.com** | Бесплатная фоновая музыка (Kevin MacLeod) | Free, требует атрибуции |

### Шрифты
| Сервис | Что | Цена |
|---|---|---|
| **Google Fonts** | Russo One, Orbitron, Press Start 2P, Bebas Neue | Free |
| **fonts.bunny.net** | Зеркало Google Fonts без трекинга | Free |

### Тексты и диалоги
| Сервис | Что | Цена |
|---|---|---|
| **ChatGPT** | Сгенерить 30 фраз наставника в нужном характере | Free / Plus |

### Услуги под заказ (если бюджет)
| Сервис | Что | Цена |
|---|---|---|
| **kwork.ru** | Иллюстратор, character sheet, 1-2 ключевых арта | от 500₽ |
| **fl.ru** | Профессионалы повыше уровня | от 2000₽ |

---

## Три пути по бюджету

### A. Бесплатный (~8-12 часов)
- Leonardo.ai → персонаж + 6 иконок
- Google Fonts → Orbitron/Russo One
- Suno free → 1 фоновый трек
- ChatGPT → диалоги наставника
- canvas-confetti → конфетти на победу
- **Итог:** заметно лучше дефолта, но видно бесплатность

### B. Средний (~$10, 15-20 часов) ⭐ оптимум
- Midjourney $10 на 1 месяц → весь визуал в одном стиле
- ElevenLabs free → 8-10 SFX
- Suno free → джингл + фон
- ChatGPT → диалоги
- **Итог:** уверенный «продуктовый» вид, защита-портфолио

### C. Портфолио (~$30-50, 30-40 часов)
- Midjourney + ElevenLabs Pro
- 1-2 иллюстрации от художника на kwork (character sheet наставника, ключевой постер)
- Полный SFX-пак с freesound + лицензионная музыка
- Анимация на Rive (transitions)
- **Итог:** материал для CV/портфолио

---

## Сессия 2026-05-24 — переход к ассетам через Recraft MCP

**Контекст:**
- Подписка Recraft Basic ($10/мес, 1000 кредитов) — оформлена
- Аккаунт Recraft: `Rom Serg`
- MCP сервер для подключения: `https://mcp.recraft.ai/mcp` (Remote, OAuth)
- Канва визуала: **Sega 90s style** — Sonic the Hedgehog + Earthworm Jim
- Маскот: **Капитан Мяу** (cybersecurity cat hero), 4 эмоции (idle/happy/sad/surprised)
- Враги (для cutscene): Спамтон (фишинг), Тролль-Хейтер (буллинг), Джаббер-Дразнилка (буллинг), Босс-Вирус (вирусы), Щедрый Шлёп (мошенничество), Король Подделок (поддельные сайты)
- Темы у Фролова в БД (под которые адаптируемся): phishing, passwords, personal-data, cyberbullying, viruses, safe-sites, scams, privacy

**Бэкенд партнёра Фролова (живой):**
- URL: `https://bytmamoi-production.up.railway.app`
- Swagger: `/docs`, OpenAPI: `/openapi.json`
- Auth: `Authorization: Bearer bm_<token>`
- Юрин токен: `bm_D5IawreXnEx5aj18LGgyjh0XUT7_KhXgwvbe_yxM50Y` (role: child, name: Nikel)
- Структура: 8 тем × 3-4 игры = 25 игр в БД (но эти 25 — заглушки от Фролова, договариваемся переписать под наши)
- Концепция продукта: «Круг безопасности» / «Быть мамой» (семейный Mini App: ребёнок + родитель)
- Игры в БД имеют поле `difficulty` (easy/medium/hard) — вероятно 3 игры в теме = 3 уровня сложности одной механики
- Возрастная фильтрация: по `user.age` фронтом; маппинг 6-8→easy, 9-11→+medium, 12+→+hard (наше предложение, нужно согласовать)

**Документ-канва от Фролова:** `~/Downloads/Игровые примеры.docx` — Undertale-нарратив (сценки с врагами, моральный выбор) + Neverhood-метафора (сбор кассет знаний) + теория 3 кругов доверия (семья/знакомые/чужие). Что берём из него:
- 3 круга доверия → переделать наш drag-drop с 2 на 3 зоны
- Сценки в стиле Undertale перед игрой через cutscene-движок Капитана Мяу
- Финальный экран «Твой стиль защиты» (характеристика игрока)
- Коллекция «Кассет киберигры» (правил)

**Подключение Recraft:**
Зарегистрироваться на recraft.ai и генерировать иконки/фоны через веб-интерфейс или API (ключ в Settings → API).

**План генерации ассетов (через Recraft API):**
| Категория | Шт. | Куда |
|---|---|---|
| Капитан Мяу (4 эмоции) | 4 | `mini-app/assets/mentor/{idle,happy,sad,surprised}.png` |
| Враги-персонажи | 6 | `mini-app/assets/villains/` |
| Иконки 8 тем (заменим Lucide) | 8 | `mini-app/assets/icons/` |
| Иконка Mini App (640×360) | 1 | для BotFather |
| Фоны меню/cutscene | 2 | `mini-app/assets/bg/` |

**Базовый промт Капитана Мяу (Sega 90s):**
```
Anthropomorphic cat hero mascot in the style of Sonic the Hedgehog and Earthworm Jim,
90s Sega cartoon aesthetic, bold thick black outlines, vibrant saturated colors with cell shading,
exaggerated cartoon proportions, dynamic action pose, big expressive shiny eyes,
wearing dark blue cyber commando hoodie with cat ears, yellow visor on forehead,
neon blue and purple cyber accents, dark gradient background, mascot character centered,
looking at viewer, square format, high quality, [EXPRESSION]
```
Эмоции: idle=`confident smirk, thumbs up`, happy=`fist pump, jumping, joy`, sad=`ears drooping, tear in eye`, surprised=`shocked wide eyes, jaw dropped`.

---

## Хостинг — Vercel ✅ (2026-05-17)

- **Бот:** @HotLover_bot
- **Mini App URL (постоянный):** `https://cyberdef-mini-app.vercel.app`
- **Vercel project:** `romsergs-projects/cyberdef-mini-app`
- **Vercel inspect:** https://vercel.com/romsergs-projects/cyberdef-mini-app
- **Аккаунт:** romansergeev7680

**Обновление кода после правок:**
```bash
cd "/mnt/c/Users/frosa/Рабочий стол/ВШЭ/Курсовая/mini-app"
npx vercel --prod --yes
```
~30 секунд → правки на проде. URL не меняется, в @BotFather ничего перенастраивать не надо.

**Если понадобится свой домен:** Vercel → Project Settings → Domains → Add (бесплатно). Например `app.cyberdef.ru`.

**Альтернативы (если Vercel сломается):**
- Cloudflare Pages: `npx wrangler pages deploy ./`
- Netlify: `npx netlify deploy --prod`
- GitHub Pages: push + включить в Settings → Pages

## Минимальная программа на ближайший вечер (3 часа)

- [ ] **Аватарка наставника** (30 мин): Leonardo.ai/Midjourney, промт `"cybersecurity owl mascot, friendly, kid-friendly, flat illustration, neon blue and purple, dark background"`. Скинуть PNG в `mini-app/assets/mentor/`.
- [ ] **Шрифт** (10 мин кода): Orbitron / Russo One через Google Fonts → подключить в `index.html`, заменить в CSS у `h1/h2/h3` и шапки.
- [ ] **30 фраз наставника** (40 мин в ChatGPT): по 5 на игру (приветствие / похвала / подсказка / реакция на ошибку / прощание). Сохранить в `mini-app/games/<id>/mentor_lines.js`.
- [ ] **Подключение** (1 ч моей работы): аватарка в шапке игр и онбординга, фразы появляются в нужные моменты.

---

## Полный апгрейд по этапам

### Неделя 1 — Визуальная идентичность
- [ ] Сгенерировать аватарку и характер наставника (имя, манера речи)
- [ ] Подключить шрифт (Orbitron / Russo One)
- [ ] Расширить палитру: основной neon-blue, акцент cyber-pink, фон midnight-blue
- [ ] Сгенерировать 6 кастом-иконок игр в едином стиле (Recraft brand-kit или MJ)
- [ ] Заменить Lucide-иконки на свои
- [ ] Сгенерировать иконку Mini App для @BotFather
- [ ] Сгенерировать логотип «Академия Кибер-Защитников»

### Неделя 2 — Нарратив и тексты
- [ ] Прописать концепцию: лор Академии (откуда, зачем, кто игрок)
- [ ] 30+ фраз наставника по ситуациям
- [ ] Онбординг 2-3 экрана при первом запуске
- [ ] Подсказки перед каждой игрой (контекст и совет)
- [ ] Финальный экран-сертификат «Магистр кибербезопасности»
- [ ] Микро-юмор: шутливые названия достижений, реакции на ошибки

### Неделя 3 — Геймплейная глубина
- [ ] Параллакс-фоны для Phaser-игр (3 слоя в раннере, фон-небо в платформере)
- [ ] Частицы и confetti на победу
- [ ] Glitch-transition между играми
- [ ] Лидерборд (требует API Фролова)

### Неделя 4 — Звук
- [ ] Фоновая музыка (1 трек loop, ~$0 через Suno)
- [ ] 8-10 SFX (тап, успех, ошибка, выстрел, прыжок, монетка, взрыв)
- [ ] Mute-кнопка в шапке
- [ ] (Опц.) озвучка наставника через ElevenLabs

---

## Подсказки по промтам

**Для персонажа-наставника (Midjourney/Leonardo):**
```
cybersecurity owl mascot, friendly wise expression, glowing neon blue and purple,
flat vector illustration, kid-friendly, simple shapes, transparent background,
mascot character pose, looking forward, --ar 1:1 --style raw
```

**Для 6 иконок игр в одном стиле (Recraft brand-kit):**
```
Single icon: <тема>. Style: glowing neon outline, dark gradient background,
flat 3D, blue and pink palette, isometric, simple geometric shapes,
no text, square, 256x256.
```

Темы для подстановки: lock & key, fishing hook with envelope, ID card,
virus shield, chat bubbles, footprint trail.

**Для джингла Mini App (Suno):**
```
8-bit chiptune, upbeat cyber adventure, looping, 30 seconds,
energetic but kid-friendly, no vocals
```

**Для SFX (ElevenLabs):**
- "Short upbeat 8-bit success chime"
- "Cyber alert error buzz, short"
- "Coin pickup glitch sound"
- "Soft UI tap click"

---

## Продолжение

Когда вернёмся к этому файлу — выбираем путь (A/B/C), дальше идём по чеклисту и я подключаю всё в код по мере появления ассетов.
