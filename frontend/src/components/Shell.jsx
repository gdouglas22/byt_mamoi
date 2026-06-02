import { useNavigate } from 'react-router-dom'
import { IcHome, IcMap, IcPlay, IcTrophy, IcUser, IcBell, IcStar, IcArrowL } from '../icons'
import { TOPIC_ICONS } from '../icons'

// ── Tab bar ───────────────────────────────────────────────────────────────
const CHILD_TABS = [
  { id: 'home',   path: '/menu',         label: 'Главная', Icon: IcHome   },
  { id: 'play',   path: '/play',         label: 'Играть',  Icon: IcPlay   },
  { id: 'awards', path: '/achievements', label: 'Награды', Icon: IcTrophy },
  { id: 'me',     path: '/profile',      label: 'Я',       Icon: IcUser   },
]

const PARENT_TABS = [
  { id: 'home',    path: '/parent',               label: 'Главная',     Icon: IcHome },
  { id: 'stats',   path: '/parent',               label: 'Прогресс',    Icon: IcMap  },
  { id: 'notes',   path: '/parent/notifications', label: 'Уведомления', Icon: IcBell },
  { id: 'profile', path: '/parent',               label: 'Профиль',     Icon: IcUser },
]

export function TabBar({ active, role = 'child' }) {
  const navigate = useNavigate()
  const items = role === 'parent' ? PARENT_TABS : CHILD_TABS
  return (
    <nav className="tabbar">
      {items.map(({ id, path, label, Icon }) => (
        <a
          key={id}
          className={active === id ? 'active' : ''}
          data-tour={`tab-${id}`}
          onClick={() => navigate(path)}
        >
          <Icon />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  )
}

// ── App shell wrapper ─────────────────────────────────────────────────────
// StatusBar и TgBar убраны — Telegram рисует их сам поверх Mini App
export function Shell({ children }) {
  return <div className="app">{children}</div>
}

// ── Topic icon ────────────────────────────────────────────────────────────
export function TopicIcon({ icon, tone, size = 'md' }) {
  const Ic = TOPIC_ICONS[icon] || TOPIC_ICONS.shield
  const cls = `topic-ic${size === 'lg' ? ' lg' : size === 'xl' ? ' xl' : ''} ${tone}`
  return <div className={cls}><Ic /></div>
}

// ── Stars ─────────────────────────────────────────────────────────────────
export function Stars({ n = 3, total = 3 }) {
  return (
    <span className="stars">
      {Array.from({ length: total }).map((_, i) => (
        <IcStar key={i} style={{ opacity: i < n ? 1 : 0.25 }} />
      ))}
    </span>
  )
}

// ── App header ────────────────────────────────────────────────────────────
export function AppHeader({ user, onNotifications }) {
  const name = user?.name || 'Привет!'
  return (
    <div className="app-header">
      <div className="row gap-12">
        <div className="avatar">{name[0]}</div>
        <div className="col" style={{ gap: 0 }}>
          <div className="greeting">Привет,</div>
          <div className="name">{name}!</div>
        </div>
      </div>
      <div className="row gap-8">
        <span className="chip honey lg">
          <IcStar size={12} /> {user?.points || 0}
        </span>
        <div className="icon-btn" onClick={onNotifications}>
          <IcBell />
        </div>
      </div>
    </div>
  )
}

// ── Loading screen ────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )
}

// ── Back button row ───────────────────────────────────────────────────────
export function BackRow({ onBack, right }) {
  const navigate = useNavigate()
  return (
    <div className="row gap-8" style={{ marginTop: 4 }}>
      <div
        className="icon-btn"
        style={{ width: 32, height: 32, boxShadow: 'none', background: 'transparent' }}
        onClick={onBack || (() => navigate(-1))}
      >
        <IcArrowL size={20} />
      </div>
      <div className="grow" />
      {right}
    </div>
  )
}
