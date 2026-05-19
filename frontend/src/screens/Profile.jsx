import { useNavigate } from 'react-router-dom'
import { Shell, TabBar, Stars, LoadingScreen } from '../components/Shell'
import { IcShield, IcFire, IcKey, IcSpark, IcStar, IcMedal, IcSettings, IcArrowL } from '../icons'
import { useApi } from '../hooks/useApi'
import { getMe, getAchievements } from '../api'
import { TOPIC_ICONS } from '../icons'

const WEEK_DAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В']

export default function Profile() {
  const navigate = useNavigate()
  const { data: user, loading: lu } = useApi(getMe)
  const { data: achievements, loading: la } = useApi(getAchievements)

  if (lu || la) return <LoadingScreen />

  const earned = (achievements || []).filter(a => a.earned)
  const preview = (achievements || []).slice(0, 4)

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

        {/* Badges preview */}
        <div className="row between" style={{ marginTop: 16, marginBottom: 8, alignItems: 'baseline' }}>
          <div className="eyebrow">Достижения</div>
          <span className="linklike tiny" onClick={() => navigate('/achievements')}>
            Все {achievements?.length || 0} →
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {preview.map((a, i) => (
            <div key={i} className={`badge${!a.earned ? ' locked' : ''}`}>
              <div className={`badge-art ${a.tone}`}>
                {(() => { const Ic = TOPIC_ICONS[a.icon] || IcStar; return <Ic /> })()}
              </div>
              <div className="badge-name">{a.name}</div>
            </div>
          ))}
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
