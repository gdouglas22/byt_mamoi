import { useNavigate } from 'react-router-dom'
import { Shell, AppHeader, TabBar, LoadingScreen } from '../components/Shell'
import { IcStar, IcMedal, IcFire, IcBolt } from '../icons'
import { useApi } from '../hooks/useApi'
import { getTopics, getMe } from '../api'

const WEEK_DAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В']

export default function MainMenu() {
  const navigate = useNavigate()
  const { data: user } = useApi(getMe)
  const { data: topics, loading } = useApi(getTopics)

  if (loading) return <LoadingScreen />

  const doneGames = topics?.reduce((s, t) => s + t.games_done, 0) || 0
  const streak    = user?.streak_days || 0

  const list = topics || []
  const inProgress = list.find(t => t.games_done > 0 && t.games_done < t.games_total)
  const notDone = list.find(t => t.games_done < t.games_total)
  const current = inProgress || notDone
  const isFresh = current?.games_done === 0

  // TODO: replace with real per-day activity from backend
  const activity = [35, 60, 0, 80, 95, 40, 25]

  return (
    <Shell>
      <AppHeader user={user} onNotifications={() => navigate('/notifications')} />

      <div className="screen-body">
        {/* KPI row */}
        <div className="row gap-8">
          <div className="kpi" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FCEFC9', color: '#D9A93A', display: 'grid', placeItems: 'center' }}>
              <IcStar size={18} />
            </div>
            <div>
              <div className="val">{user?.points || 0}</div>
              <div className="lbl">баллов</div>
            </div>
          </div>
          <div className="kpi" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#D6EEE6', color: '#2E7E64', display: 'grid', placeItems: 'center' }}>
              <IcMedal size={18} />
            </div>
            <div>
              <div className="val">{doneGames}</div>
              <div className="lbl">игр</div>
            </div>
          </div>
          <div className="kpi" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#DEDBF3', color: '#4F4990', display: 'grid', placeItems: 'center' }}>
              <IcFire size={18} />
            </div>
            <div>
              <div className="val">{streak}</div>
              <div className="lbl">дня</div>
            </div>
          </div>
        </div>

        {/* Current topic */}
        {current && (
          <div style={{ marginTop: 14 }}>
            <div style={{
              borderRadius: 24, padding: 18,
              background: 'linear-gradient(135deg, #FCEFC9, #FCE4A0)',
              color: '#5C420C',
              display: 'flex', gap: 14, alignItems: 'center',
              cursor: 'pointer',
            }} onClick={() => navigate(`/topic/${current.id}`)}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: '#fff', color: '#D9A93A',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <IcBolt size={32} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="eyebrow" style={{ color: '#8A6915' }}>
                  {isFresh ? 'Следующая тема' : 'Продолжить'}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginTop: 2 }}>
                  {current.title}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: .8 }}>
                  {current.games_done}/{current.games_total} игр · {isFresh ? 'начать' : 'продолжить'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weekly activity */}
        <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>На этой неделе</div>
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

      <TabBar active="home" />
    </Shell>
  )
}
