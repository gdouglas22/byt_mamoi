import { useNavigate } from 'react-router-dom'
import { Shell, TabBar, TopicIcon, LoadingScreen } from '../components/Shell'
import { IcShield, IcStar, IcMedal, IcSettings, IcArrowL, IcLock, IcCheck, IcPlay } from '../icons'
import { useApi } from '../hooks/useApi'
import { getMe, getAchievements, getTopics } from '../api'

const WEEK_DAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В']

export default function Profile() {
  const navigate = useNavigate()
  const { data: user, loading: lu } = useApi(getMe)
  const { data: achievements, loading: la } = useApi(getAchievements)
  const { data: topics, loading: lt } = useApi(getTopics)

  if (lu || la || lt) return <LoadingScreen />

  const earned = (achievements || []).filter(a => a.earned)

  // Compute topic statuses: completed → current → locked.
  // The first not-completed topic in order becomes "current"; everything after is locked.
  const orderedTopics = topics || []
  const currentIdx = orderedTopics.findIndex(t => t.games_done < t.games_total)
  const topicStatus = (idx, t) => {
    if (t.games_total > 0 && t.games_done >= t.games_total) return 'done'
    if (idx === currentIdx) return 'current'
    return 'locked'
  }

  // Mock activity bars (0-100%)
  const activity = [35, 60, 0, 80, 95, 40, 25]

  const level = Math.floor((user?.points || 0) / 100) + 1
  const levelLabel = ['Новичок', 'Любопытный', 'Знающий', 'Знающий защитник', 'Эксперт'][Math.min(level - 1, 4)]
  const pointsToNext = 100 - ((user?.points || 0) % 100)
  const levelPct = ((user?.points || 0) % 100)

  return (
    <Shell>
      <div className="screen-body">
        <div className="row gap-8" style={{ marginTop: 4 }}>
          <div
            className="icon-btn"
            style={{ width: 32, height: 32, boxShadow: 'none', background: 'transparent' }}
            onClick={() => navigate(-1)}
          >
            <IcArrowL size={20} />
          </div>
          <div className="grow" />
          <div className="icon-btn"><IcSettings /></div>
        </div>

        {/* Profile header */}
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', marginTop: 6, gap: 4 }}>
          <div className="avatar lg" style={{ background: '#DBE8F8', color: '#2F5B9A' }}>
            <IcShield size={40} />
          </div>
          <div className="h-display h2" style={{ marginTop: 8 }}>
            {user?.name || 'Игрок'}{user?.age ? `, ${user.age} лет` : ''}
          </div>
          <div className="muted tiny">Защитник · с {new Date(user?.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'long' })}</div>
          <div className="row gap-8" style={{ marginTop: 10 }}>
            <span className="chip honey lg"><IcStar size={12} /> {user?.points || 0} баллов</span>
            <span className="chip lg"><IcMedal size={12} /> {earned.length} бейджей</span>
          </div>
        </div>

        {/* Level */}
        <div className="card" style={{ marginTop: 16, padding: 14 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <div className="row gap-8">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#DBE8F8', color: '#2F5B9A', display: 'grid', placeItems: 'center' }}>
                <IcShield size={18} />
              </div>
              <div className="col" style={{ gap: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Уровень {level}</div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{levelLabel}</div>
              </div>
            </div>
            <div className="muted tiny" style={{ fontWeight: 700 }}>{user?.points || 0} / {level * 100}</div>
          </div>
          <div className="bar"><i style={{ width: `${levelPct}%` }} /></div>
        </div>

        {/* Topics path: completed → current → locked */}
        <div className="row between" style={{ marginTop: 16, marginBottom: 8, alignItems: 'baseline' }}>
          <div className="eyebrow">Твой путь</div>
          <span className="muted tiny" style={{ fontWeight: 700 }}>
            {orderedTopics.filter(t => t.games_total > 0 && t.games_done >= t.games_total).length} / {orderedTopics.length}
          </span>
        </div>
        <div className="col" style={{ gap: 8 }}>
          {orderedTopics.map((t, i) => {
            const status = topicStatus(i, t)
            const locked = status === 'locked'
            const done = status === 'done'
            const current = status === 'current'
            const pct = t.games_total > 0 ? Math.round(t.games_done / t.games_total * 100) : 0
            return (
              <div
                key={t.id}
                className="card"
                onClick={() => { if (!locked) navigate(`/topic/${t.id}`) }}
                style={{
                  padding: 12,
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: locked ? 'default' : 'pointer',
                  opacity: locked ? 0.5 : 1,
                  border: current ? '2px solid var(--honey-deep, #D9A93A)' : undefined,
                }}
              >
                <TopicIcon icon={t.icon} tone={t.tone} />
                <div className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{t.title}</div>
                    {done && (
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#9FD8C7', color: '#fff',
                        display: 'grid', placeItems: 'center', flexShrink: 0,
                      }}>
                        <IcCheck size={14} />
                      </span>
                    )}
                    {current && (
                      <span className="chip" style={{ background: '#FCEFC9', color: '#8A6915', fontWeight: 800 }}>
                        <IcPlay size={10} /> сейчас
                      </span>
                    )}
                    {locked && (
                      <span style={{ color: 'var(--ink-4)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <IcLock size={16} />
                      </span>
                    )}
                  </div>
                  <div className="bar" style={{ height: 5 }}>
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <div className="meta tiny">{t.games_done}/{t.games_total} игр</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Activity chart */}
        <div className="eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>На этой неделе</div>
        <div className="card" style={{ padding: 14, marginBottom: 80 }}>
          <div className="row gap-8" style={{ alignItems: 'flex-end', height: 70, marginBottom: 10 }}>
            {activity.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: `${Math.max(h, 6)}%`,
                  background: h ? 'linear-gradient(180deg, #82B0E8, #5B8FD9)' : 'var(--primary-50)',
                  borderRadius: 6,
                }} />
              </div>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-4)', fontWeight: 700 }}>
            {WEEK_DAYS.map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>
      </div>
      <TabBar active="me" />
    </Shell>
  )
}
