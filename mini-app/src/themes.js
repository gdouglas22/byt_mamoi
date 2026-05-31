// 8 тем Кибер-Академии Капитана Мяу.
// Каждая тема:
//   id, name, icon, villain (имя + картинка), mentorIntro (реплика-прикол),
//   levels[] — массив уровней JSON-формата для pnc.js / dnd.js
//
// Уровни без поля level.scene/cards считаются «скоро будет» и в меню рендерятся как locked.

export const THEMES = [
  {
    id: "phishing",
    name: "Фишинг",
    icon: "assets/icons-new/phishing.jpg",
    villain: { id: "spam_baron", name: "Спам-Барон Фишинго", image: "assets/villains/spam_baron.jpg" },
    mentorIntro: {
      avatar: "happy",
      text: "Фишинг — от рыбной ловли. Только рыба тут — ты, а наживка — фейковое письмо от банка. Я люблю рыбку, но сам ей быть — мяу-категорически! Поехали ловить ловцов.",
    },
    levels: [
      {
        id: "phishing-1",
        title: "Письмо от «банка»",
        type: "quest",
        intro: [
          { avatar: "idle", text: "Открой свою почту. Среди писем затесался гость от Спам-Барона. Найди подозрительное письмо и разбери его на молекулы." },
        ],
        start: "inbox",
        scenes: {
          inbox: {
            type: "mail-inbox",
            data: {
              title: "Входящие",
              hint: "Открывай письма. Одно из них — подделка от Спам-Барона.",
              letters: [
                {
                  id: "lisa", avatar: "🐱", from: "Лиза с района", subject: "Глянь мемы из лагеря 😹",
                  preview: "Я ща тебе пришлю фотки с пикника, не спал три ночи рисовал...",
                  time: "12:34", unread: true,
                  onClick: { note: "Это Лиза, реальная подруга. Не наша цель сегодня." },
                },
                {
                  id: "teacher", avatar: "🎓", from: "Маргарита Петровна", subject: "Лабораторная по информатике",
                  preview: "Срок сдачи — пятница. Не забудь приложить скриншоты программы…",
                  time: "11:12", unread: false,
                  onClick: { note: "Это учительница. Обычное письмо, не тут ловушка." },
                },
                {
                  id: "fake_bank", avatar: "🏦", from: "СБРЕРБАНК — Служба Безопасности", subject: "СРОЧНО! Ваш аккаунт будет удалён через 24 часа",
                  preview: "Дорогой Пользователь, ваш аккаунт скомпрометирован. Пожалуста подтвердите…",
                  time: "Только что", unread: true, suspect: true,
                  onClick: { goto: "email" },
                },
                {
                  id: "ozon", avatar: "🛒", from: "Ozon-Уведомления", subject: "Скидки до 50% на технику",
                  preview: "Каждую среду — день скидок. Загляни в приложение.",
                  time: "Вчера", unread: false,
                  onClick: { note: "Реклама от Ozon. Не интересно сейчас." },
                },
              ],
            },
          },
          email: {
            type: "mail-email",
            data: {
              back: "inbox",
              letter: {
                avatar: "🏦", suspect: true,
                fromName: "СБРЕРБАНК — Служба Безопасности",
                fromNameHot: "brandTypo",
                fromAddr: "support@goog1e-account.ru",
                fromAddrHot: "domainFrom",
                to: "you@mail.example",
                time: "Только что",
                subject: "СРОЧНО! Ваш аккаунт будет удалён через 24 часа",
                subjectHot: "urgency",
                body: [
                  [{ hot: "impersonal", text: "Дорогой Пользователь" }, ","],
                  [
                    "Ваш аккаунт скомпрометирован. ",
                    { hot: "typo", text: "Пожалуста" },
                    " немедленно подтвердите ваш ",
                    { hot: "cyrLatMix", text: "паpoль" },
                    " — иначе доступ будет заблокирован.",
                  ],
                  { kind: "cta", text: "Подтвердить пароль" },
                  { kind: "link", prefix: "Ссылка для входа: ", hot: "linkFake", text: "https://accounts.googl3.com/login" },
                  { kind: "ps", prefix: "P.S. ", hot: "secrecy", text: "Никому не сообщайте об этом письме — это закрытая процедура безопасности." },
                ],
              },
              actions: [
                { id: "spam",   icon: "🚫", label: "В спам" },
                { id: "delete", icon: "🗑️", label: "Удалить" },
                { id: "link",   icon: "🔗", label: "Открыть ссылку" },
                { id: "reply",  icon: "↩️", label: "Ответить" },
              ],
            },
          },
        },
        verdicts: {
          good: ["spam"],
          bad: ["link", "reply"],
          // ok (по умолчанию): delete
        },
        targets: [
          {
            id: "domainFrom", label: "поддельный отправитель",
            hint: "Странный адрес — посмотри внимательнее",
            why: "Настоящий домен — google.com. Цифра 1 вместо буквы l — подделка.",
            risk: "Кликнув на «Подтвердить пароль», ты отдал бы свой пароль в чужие руки. Мошенник зашёл бы в твой Google и переписал бы переписку с друзьями.",
          },
          {
            id: "urgency", label: "давление срочностью",
            hint: "Тебя торопят — не дают подумать",
            why: "Сервисы не пугают «удалением через 24 часа». Спешка нужна, чтобы ты не успел подумать.",
            risk: "От страха «потерять аккаунт» ты бы поспешил кликнуть и не заметил остальные ловушки. Это главный приём фишеров.",
          },
          {
            id: "impersonal", label: "безличное обращение",
            hint: "К тебе не по имени — массовая рассылка",
            why: "Настоящие письма обращаются по имени. «Дорогой пользователь» — массовая рассылка-обманка.",
            risk: "Письмо ушло тысячам людей одновременно. Если бы хоть один процент попался — мошенник собрал бы тысячи паролей за вечер.",
          },
          {
            id: "typo", label: "опечатка в тексте",
            hint: "«Пожалуста» — без ‘й’. Где это видано?",
            why: "В письмах от компаний редакторы вычитывают каждое слово. Опечатки — почерк мошенников.",
            risk: "Опечатки в письмах от банков — почти всегда мошенничество. Настоящий банк не отправил бы такое.",
          },
          {
            id: "cyrLatMix", label: "латинские буквы в русском слове",
            hint: "В слове «пароль» спрятаны латинские буквы",
            why: "Чтобы антиспам не увидел слово «пароль», в нём подменили буквы на похожие латинские.",
            risk: "Так мошенники прячут «триггерные» слова от автоматических фильтров. Видишь смесь алфавитов — почти всегда подвох.",
          },
          {
            id: "linkFake", label: "поддельная ссылка",
            hint: "googl3 ≠ google. Проверь домен до первой точки",
            why: "«googl3» ≠ google. Всегда проверяй домен до первой точки — он должен совпадать с настоящим.",
            risk: "Перейдя по ссылке, ты попал бы на фейковую страницу ввода пароля. Всё что ты введёшь — уйдёт мошеннику.",
          },
          {
            id: "secrecy", label: "просьба секретности",
            hint: "«Никому не говори» — главный звоночек",
            why: "«Никому не говори» — главный сигнал обмана. Настоящему сервису нечего скрывать от твоих родителей.",
            risk: "Если бы ты послушался — родители не успели бы тебе помочь. Мошенники изолируют жертву от взрослых именно так.",
          },
          {
            id: "brandTypo", label: "подделка названия бренда",
            difficulty: "hard",
            hint: "В названии «СБРЕРБАНК» — лишняя ‘Р’. Должно быть СБЕРБАНК",
            why: "Настоящий банк называется «Сбербанк». Здесь буквы переставлены — это типичный приём подделки имени.",
            risk: "Опечатка в названии бренда — самый стойкий маркер фейка. Настоящие компании никогда не ошибаются в собственном названии. Это последний шанс заметить обман.",
          },
        ],
        win:  { avatar: "happy", text: "Идеально, кадет! Спам-Барон побеждён и плещется в холодной воде. Письмо — в фарш!" },
        lose: { avatar: "sad",   text: "Письмо тебя поймало. Спам-Барон жмёт лапы — он получил твой пароль. Перезайди и попробуй снова." },
      },
    ],
  },

  {
    id: "passwords",
    name: "Пароли",
    icon: "assets/icons-new/passwords.jpg",
    villain: { id: "king_fakery", name: "Король Подделок", image: "assets/villains/king_fakery.jpg" },
    mentorIntro: {
      avatar: "idle",
      text: "Пароль — это твой ключ от квартиры. Только не такой, как у бабушки: «12345» приклеенный к коврику. Учимся ковать ключи, которые никто не подделает.",
    },
    levels: [],
  },

  {
    id: "personal-data",
    name: "Личные данные",
    icon: "assets/icons-new/personal_data.jpg",
    villain: { id: "generous_schlop", name: "Щедрый Шлёп", image: "assets/villains/generous_schlop.jpg" },
    mentorIntro: {
      avatar: "idle",
      text: "Твои данные — как мои усы. Показывай только тем, кому доверяешь. А то залезут чужие лапы. Хранить — это не жадность, это уважение к себе.",
    },
    levels: [
      {
        id: "personal-data-1",
        title: "Три круга доверия",
        type: "dnd",
        instructions: "Разложи карточки по трём кругам доверия.",
        intro: [
          { avatar: "idle", text: "Каждая карточка — кусочек тебя. Решай, кому это можно знать: всем подряд, только знакомым, или только семье." },
        ],
        zones: [
          { id: "public",    label: "Всем",       icon: "🌍" },
          { id: "friends",   label: "Знакомым",   icon: "👋" },
          { id: "family",    label: "Только семье", icon: "🔒" },
        ],
        cards: [
          { id: "nick",   icon: "🎮", text: "Прозвище в игре",                  zone: "public",
            why: "Игровой ник — это твой образ в игре. Им можно делиться спокойно." },
          { id: "food",   icon: "🍕", text: "Любимая еда",                      zone: "public",
            why: "Вкусы — безобидная информация. Делись смело." },
          { id: "color",  icon: "🎨", text: "Любимый цвет",                     zone: "public",
            why: "Безобидно. Можно даже в анкете написать." },
          { id: "avatar", icon: "🦸", text: "Аватарка с супергероем",           zone: "public",
            why: "Картинка героя ничего о тебе не выдаёт — ставь смело." },
          { id: "game",   icon: "🕹️", text: "Любимая игра",                     zone: "public",
            why: "Хобби — отличный повод найти друзей по интересам." },
          { id: "phone",  icon: "📱", text: "Личный номер телефона",            zone: "friends",
            why: "Номер — это прямая связь. Дай его тому, кого знаешь в жизни. Незнакомцам — нет." },
          { id: "photo",  icon: "📸", text: "Фото в обычной одежде из дома",    zone: "friends",
            why: "Если фото показывает обстановку дома — лучше делиться только с теми, кого знаешь лично." },
          { id: "school", icon: "🏫", text: "Школа, класс и расписание",        zone: "family",
            why: "Где ты бываешь и в какое время — это твой маршрут. Это знают только родители и доверенные взрослые." },
          { id: "addr",   icon: "🏠", text: "Домашний адрес",                   zone: "family",
            why: "Адрес — это вход в твой дом. Его знают только семья и доверенные взрослые." },
          { id: "card",   icon: "💳", text: "Номер банковской карты родителей", zone: "family",
            why: "По номеру карты можно списать деньги. Этим не делятся даже в чате с друзьями." },
          { id: "pwd",    icon: "🔑", text: "Пароль от аккаунта",               zone: "family",
            why: "Пароль — ключ ко всем твоим данным. Не делись им даже с лучшим другом." },
          { id: "route",  icon: "🚸", text: "Фото по дороге в школу с табличкой улицы", zone: "family",
            why: "По таким фото можно вычислить маршрут и подкараулить тебя. Не выкладывать публично." },
        ],
      },
    ],
  },

  {
    id: "cyberbullying",
    name: "Кибербуллинг",
    icon: "assets/icons-new/cyberbullying.jpg",
    villain: { id: "troll_hater", name: "Тролль-Хейтер", image: "assets/villains/troll_hater.jpg" },
    mentorIntro: {
      avatar: "idle",
      text: "В Сети тоже водятся коты. Не все мирные. Некоторые шипят, фыркают и царапают словами. Сегодня учимся не становиться их добычей и не становиться ими сами.",
    },
    levels: [],
  },

  {
    id: "viruses",
    name: "Вирусы",
    icon: "assets/icons-new/viruses.jpg",
    villain: { id: "boss_virus", name: "Босс-Вирус", image: "assets/villains/boss_virus.jpg" },
    mentorIntro: {
      avatar: "surprised",
      text: "Вирусы — блохи у компьютера. Чешется, тормозит, нервничает. Я знаю, чем их вычесывать. Бери шампунь, поехали!",
    },
    levels: [],
  },

  {
    id: "safe-sites",
    name: "Безопасные сайты",
    icon: "assets/icons-new/safe_sites.jpg",
    villain: { id: "king_fakery", name: "Король Подделок", image: "assets/villains/king_fakery.jpg" },
    mentorIntro: {
      avatar: "idle",
      text: "Не каждый дом — твой. Не каждый сайт — настоящий. Сегодня учимся различать гостиную и мышеловку.",
    },
    levels: [],
  },

  {
    id: "scams",
    name: "Мошенничество",
    icon: "assets/icons-new/scams.jpg",
    villain: { id: "generous_schlop", name: "Щедрый Шлёп", image: "assets/villains/generous_schlop.jpg" },
    mentorIntro: {
      avatar: "idle",
      text: "«Бесплатный сыр бывает только в мышеловке». Это сказал какой-то мудрый кот. Сегодня учимся не быть мышью.",
    },
    levels: [],
  },

  {
    id: "privacy",
    name: "Цифровой след",
    icon: "assets/icons-new/privacy.jpg",
    villain: { id: "jabber_mocker", name: "Джаббер-Дразнилка", image: "assets/villains/jabber_mocker.jpg" },
    mentorIntro: {
      avatar: "idle",
      text: "За тобой остаются следы. Не такие, как у меня — мои лапки исчезают. Твои — нет. Учимся ходить тихо.",
    },
    levels: [],
  },
];

// ===== Помощники =====

export function getTheme(themeId) {
  return THEMES.find((t) => t.id === themeId);
}

export function getLevel(themeId, levelId) {
  const t = getTheme(themeId);
  if (!t) return null;
  return (t.levels || []).find((lv) => lv.id === levelId) || null;
}

// Отрисовываемое ли уровень — у него есть scene (pnc) или cards (dnd) или scenes (quest)
export function isLevelPlayable(level) {
  if (!level) return false;
  if (level.type === "pnc")   return !!(level.scene && level.targets && level.targets.length);
  if (level.type === "dnd")   return !!(level.zones && level.cards && level.cards.length);
  if (level.type === "quest") return !!(level.scenes && level.start && level.scenes[level.start]);
  return false;
}
