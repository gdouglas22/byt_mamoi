"""
Populate the database with static reference data:
  - Topics
  - Games per topic
  - Achievements

Run once (idempotent — uses INSERT OR IGNORE semantics via merge).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Achievement, Game, Topic

# ── Topics ─────────────────────────────────────────────────────────────────
TOPICS_DATA = [
    {
        "slug": "phishing",
        "title": "Фишинг",
        "subtitle": "Учись распознавать поддельные письма, сайты и сообщения",
        "icon": "fish",
        "tone": "tone-blue",
        "order": 1,
    },
    {
        "slug": "passwords",
        "title": "Пароли",
        "subtitle": "Создавай надёжные пароли и храни их безопасно",
        "icon": "key",
        "tone": "tone-honey",
        "order": 2,
    },
    {
        "slug": "personal-data",
        "title": "Личные данные",
        "subtitle": "Что можно и нельзя рассказывать в интернете",
        "icon": "shield",
        "tone": "tone-mint",
        "order": 3,
    },
    {
        "slug": "cyberbullying",
        "title": "Кибербуллинг",
        "subtitle": "Как реагировать на травлю в сети и помочь другим",
        "icon": "heart",
        "tone": "tone-coral",
        "order": 4,
    },
    {
        "slug": "viruses",
        "title": "Вирусы и вредоносные программы",
        "subtitle": "Как не подхватить вирус и что делать, если это случилось",
        "icon": "bolt",
        "tone": "tone-lav",
        "order": 5,
    },
    {
        "slug": "safe-sites",
        "title": "Безопасные сайты",
        "subtitle": "Отличай настоящие сайты от поддельных",
        "icon": "eye",
        "tone": "tone-violet",
        "order": 6,
    },
    {
        "slug": "scams",
        "title": "Мошенничество",
        "subtitle": "Распознавай обман и не попадайся на уловки",
        "icon": "spark",
        "tone": "tone-rose",
        "order": 7,
    },
    {
        "slug": "privacy",
        "title": "Приватность",
        "subtitle": "Настраивай приватность и управляй своим цифровым следом",
        "icon": "lock",
        "tone": "tone-blue",
        "order": 8,
    },
]

# ── Games ──────────────────────────────────────────────────────────────────
# slug → list of games
GAMES_DATA: dict[str, list[dict]] = {
    "phishing": [
        {
            "title": "Шпион в почте",
            "description": "Находи поддельные письма среди настоящих",
            "instructions": "Читай письмо внимательно. Свайпни вправо — настоящее, влево — обман. После каждого ответа узнаешь, почему.",
            "duration_mins": 3,
            "difficulty": "easy",
            "points_reward": 30,
            "order": 1,
        },
        {
            "title": "Настоящий или фейк?",
            "description": "Сравни сайт банка и его подделку",
            "instructions": "Два сайта — найди 5 отличий. Отметь всё подозрительное, что указывает на фальшивку.",
            "duration_mins": 4,
            "difficulty": "easy",
            "points_reward": 40,
            "order": 2,
        },
        {
            "title": "Призовой звонок",
            "description": "Отличи мошенника по телефонному разговору",
            "instructions": "Слушай диалог и отвечай на вопросы. Распознай признаки телефонного мошенничества.",
            "duration_mins": 5,
            "difficulty": "medium",
            "points_reward": 50,
            "order": 3,
        },
        {
            "title": "Ловушка в сообщении",
            "description": "Распознай фишинг в мессенджере",
            "instructions": "Тебе придёт 8 сообщений. Реши, какие из них настоящие, а где — обман. Свайпни вправо — настоящее, влево — обман.",
            "duration_mins": 6,
            "difficulty": "hard",
            "points_reward": 70,
            "order": 4,
        },
    ],
    "passwords": [
        {
            "title": "Сила пароля",
            "description": "Оцени надёжность паролей",
            "instructions": "Посмотри на каждый пароль и поставь ему оценку от 1 до 5. Потом узнаешь правильный ответ.",
            "duration_mins": 3,
            "difficulty": "easy",
            "points_reward": 30,
            "order": 1,
        },
        {
            "title": "Придумай пароль",
            "description": "Создай пароль, который невозможно взломать",
            "instructions": "Используй подсказки, чтобы составить максимально надёжный пароль. Система оценит его.",
            "duration_mins": 4,
            "difficulty": "medium",
            "points_reward": 50,
            "order": 2,
        },
        {
            "title": "Мастер-пароли",
            "description": "Научись пользоваться менеджером паролей",
            "instructions": "Пройди мини-квест: сохрани пароли правильно и быстро найди нужный.",
            "duration_mins": 5,
            "difficulty": "medium",
            "points_reward": 60,
            "order": 3,
        },
    ],
    "personal-data": [
        {
            "title": "Что рассказывать?",
            "description": "Определи, какую информацию можно публиковать",
            "instructions": "Тебе покажут сообщения. Реши: можно ли это отправить незнакомцу в интернете?",
            "duration_mins": 3,
            "difficulty": "easy",
            "points_reward": 30,
            "order": 1,
        },
        {
            "title": "Профиль в соцсетях",
            "description": "Настрой безопасный профиль",
            "instructions": "Посмотри на профиль и найди всё, что нужно скрыть или изменить.",
            "duration_mins": 4,
            "difficulty": "easy",
            "points_reward": 40,
            "order": 2,
        },
        {
            "title": "Цифровой след",
            "description": "Узнай, что о тебе знает интернет",
            "instructions": "Пройди квиз о том, какую информацию мы оставляем в сети и как её защитить.",
            "duration_mins": 5,
            "difficulty": "medium",
            "points_reward": 55,
            "order": 3,
        },
    ],
    "cyberbullying": [
        {
            "title": "Это буллинг?",
            "description": "Научись распознавать кибербуллинг",
            "instructions": "Читай переписку и отвечай: это обычный спор или кибербуллинг? Объясни почему.",
            "duration_mins": 4,
            "difficulty": "easy",
            "points_reward": 35,
            "order": 1,
        },
        {
            "title": "Как ответить",
            "description": "Выбери правильную реакцию на травлю",
            "instructions": "В каждой ситуации выбери лучший ответ из трёх вариантов.",
            "duration_mins": 4,
            "difficulty": "medium",
            "points_reward": 50,
            "order": 2,
        },
        {
            "title": "Помогаю другу",
            "description": "Поддержи друга, которого обижают в интернете",
            "instructions": "Прочти историю и помоги другу шаг за шагом: что сказать, кому сообщить, как заблокировать обидчика.",
            "duration_mins": 5,
            "difficulty": "medium",
            "points_reward": 60,
            "order": 3,
        },
    ],
    "viruses": [
        {
            "title": "Опасный файл",
            "description": "Определи, какие файлы опасно открывать",
            "instructions": "Тебе придут вложения. Решай: открыть или удалить?",
            "duration_mins": 3,
            "difficulty": "easy",
            "points_reward": 30,
            "order": 1,
        },
        {
            "title": "Заражённый компьютер",
            "description": "Почисти виртуальный компьютер от вирусов",
            "instructions": "Найди и удали все подозрительные программы, которые прячутся в системе.",
            "duration_mins": 5,
            "difficulty": "medium",
            "points_reward": 55,
            "order": 2,
        },
        {
            "title": "Обновления и защита",
            "description": "Узнай, зачем нужны обновления",
            "instructions": "Квиз о цифровой гигиене: обновления, антивирус, резервные копии.",
            "duration_mins": 4,
            "difficulty": "medium",
            "points_reward": 50,
            "order": 3,
        },
    ],
    "safe-sites": [
        {
            "title": "HTTPS или HTTP?",
            "description": "Пойми, что означает замочек в браузере",
            "instructions": "Смотри на адресную строку сайта и отвечай: безопасно подключиться или нет?",
            "duration_mins": 3,
            "difficulty": "easy",
            "points_reward": 30,
            "order": 1,
        },
        {
            "title": "Правильный адрес",
            "description": "Найди опечатки в адресах сайтов",
            "instructions": "Сравни адрес из письма с настоящим. Найди все отличия — тайпсквоттинг в действии.",
            "duration_mins": 4,
            "difficulty": "medium",
            "points_reward": 45,
            "order": 2,
        },
        {
            "title": "Доверяй, но проверяй",
            "description": "Проверь сайт перед покупкой",
            "instructions": "Тебе нужно купить что-то онлайн. Проверь магазин по чеклисту безопасности.",
            "duration_mins": 5,
            "difficulty": "hard",
            "points_reward": 65,
            "order": 3,
        },
    ],
    "scams": [
        {
            "title": "Выигрыш миллиона",
            "description": "Распознай мошенничество с «призами»",
            "instructions": "Читай сообщения о выигрышах и призах. Реши: настоящее или обман?",
            "duration_mins": 3,
            "difficulty": "easy",
            "points_reward": 30,
            "order": 1,
        },
        {
            "title": "Ложная благотворительность",
            "description": "Отличи настоящий фонд от мошенников",
            "instructions": "Посмотри на страницы сбора денег и найди признаки мошенничества.",
            "duration_mins": 5,
            "difficulty": "medium",
            "points_reward": 55,
            "order": 2,
        },
        {
            "title": "Схемы обмана",
            "description": "Изучи самые популярные схемы мошенников",
            "instructions": "Квиз: по описанию схемы назови её тип и объясни, как защититься.",
            "duration_mins": 6,
            "difficulty": "hard",
            "points_reward": 70,
            "order": 3,
        },
    ],
    "privacy": [
        {
            "title": "Настройки приватности",
            "description": "Настрой приватность в соцсетях",
            "instructions": "Зайди в виртуальные настройки соцсети и выстави максимальную приватность.",
            "duration_mins": 4,
            "difficulty": "easy",
            "points_reward": 35,
            "order": 1,
        },
        {
            "title": "Что видят другие",
            "description": "Посмотри на свой профиль глазами незнакомца",
            "instructions": "Проверь, какую информацию видят незнакомые люди. Найди всё лишнее.",
            "duration_mins": 4,
            "difficulty": "easy",
            "points_reward": 40,
            "order": 2,
        },
        {
            "title": "Геолокация и трекинг",
            "description": "Узнай, кто следит за твоим местоположением",
            "instructions": "Квиз о том, как приложения используют твои данные и как это ограничить.",
            "duration_mins": 5,
            "difficulty": "medium",
            "points_reward": 55,
            "order": 3,
        },
    ],
}

# ── Achievements ────────────────────────────────────────────────────────────
ACHIEVEMENTS_DATA = [
    {
        "slug": "first-shield",
        "name": "Первый щит",
        "description": "Пройди свою первую игру",
        "icon": "shield",
        "tone": "tone-blue",
        "points_reward": 30,
    },
    {
        "slug": "streak-3",
        "name": "Серия 3",
        "description": "Занимайся 3 дня подряд",
        "icon": "fire",
        "tone": "tone-coral",
        "points_reward": 40,
    },
    {
        "slug": "streak-7",
        "name": "Серия недели",
        "description": "Занимайся 7 дней подряд",
        "icon": "fire",
        "tone": "tone-coral",
        "points_reward": 100,
    },
    {
        "slug": "password-master",
        "name": "Мастер паролей",
        "description": "Пройди тему «Пароли» полностью",
        "icon": "key",
        "tone": "tone-honey",
        "points_reward": 80,
    },
    {
        "slug": "lightning",
        "name": "Молния",
        "description": "Пройди игру менее чем за 2 минуты",
        "icon": "bolt",
        "tone": "tone-lav",
        "points_reward": 60,
    },
    {
        "slug": "kind",
        "name": "Доброта",
        "description": "Пройди тему «Кибербуллинг»",
        "icon": "heart",
        "tone": "tone-rose",
        "points_reward": 70,
    },
    {
        "slug": "sharp-eye",
        "name": "Острый глаз",
        "description": "Узнай 5 фишинг-сообщений подряд без ошибки",
        "icon": "eye",
        "tone": "tone-mint",
        "points_reward": 50,
    },
    {
        "slug": "points-100",
        "name": "100 баллов",
        "description": "Набери 100 баллов",
        "icon": "star",
        "tone": "tone-honey",
        "points_reward": 25,
    },
    {
        "slug": "points-500",
        "name": "500 баллов",
        "description": "Набери 500 баллов",
        "icon": "star",
        "tone": "tone-honey",
        "points_reward": 50,
    },
    {
        "slug": "topic-champion",
        "name": "Чемпион темы",
        "description": "Пройди любую тему с тремя звёздами во всех играх",
        "icon": "medal",
        "tone": "tone-violet",
        "points_reward": 100,
    },
    {
        "slug": "perfect",
        "name": "Идеально",
        "description": "Набери 100% в любой игре",
        "icon": "spark",
        "tone": "tone-lav",
        "points_reward": 75,
    },
    {
        "slug": "all-topics",
        "name": "Все темы",
        "description": "Завершь все темы",
        "icon": "shield",
        "tone": "tone-blue",
        "points_reward": 200,
    },
]


async def run_seed(db: AsyncSession) -> None:
    """Insert static data if not already present."""

    # Topics
    topic_map: dict[str, int] = {}
    for td in TOPICS_DATA:
        existing = await db.scalar(select(Topic).where(Topic.slug == td["slug"]))
        if existing is None:
            t = Topic(**td)
            db.add(t)
            await db.flush()
            topic_map[td["slug"]] = t.id
        else:
            topic_map[td["slug"]] = existing.id

    # Games
    for slug, games in GAMES_DATA.items():
        tid = topic_map.get(slug)
        if tid is None:
            continue
        for gd in games:
            existing_g = await db.scalar(
                select(Game).where(Game.topic_id == tid, Game.title == gd["title"])
            )
            if existing_g is None:
                db.add(Game(topic_id=tid, **gd))

    # Achievements
    for ad in ACHIEVEMENTS_DATA:
        existing_a = await db.scalar(
            select(Achievement).where(Achievement.slug == ad["slug"])
        )
        if existing_a is None:
            db.add(Achievement(**ad))

    await db.commit()
