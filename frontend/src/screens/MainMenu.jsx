import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, AppHeader, TabBar, LoadingScreen } from '../components/Shell'
import Tour from '../components/Tour'
import { IcStar, IcFire, IcBolt } from '../icons'
import { useApi } from '../hooks/useApi'
import { getTopics, getMe, getActivityWeek } from '../api'

const WEEK_DAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В']
const TOUR_KEY = 'cyberdef.tour.home.done'

const TOUR_STEPS = [
  { target: 'current-topic', title: 'Текущая тема',
    text: 'Здесь видна твоя следующая тема. Жми, чтобы продолжить или начать новую.' },
  { target: 'tab-home',     title: 'Главная',
    text: 'Сюда возвращаешься в любой момент — баллы, серия дней и текущая тема.' },
  { target: 'tab-play',     title: 'Играть',
    text: 'Вкладка с играми. Тут открывается Кибер-Академия с курсами и мини-играми.' },
  { target: 'tab-awards',   title: 'Награды',
    text: 'Все бейджи: открытые и закрытые. Жми на любой — увидишь, за что он даётся.' },
  { target: 'tab-me',       title: 'Профиль',
    text: 'Имя, возраст, тема оформления и привязка к родителю.' },
]

export default function MainMenu() {
  const navigate = useNavigate()
  const { data: user } = useApi(getMe)
  const { data: topics, loading } = useApi(getTopics)
  const { data: week } = useApi(getActivityWeek)

  const [showTour, setShowTour] = useState(false)
  useEffect(() => {
    if (loading) return
    let done = false
    try { done = localStorage.getItem(TOUR_KEY) === '1' } catch {}
    if (!done) {
      // Wait a frame so layout settles and target elements are measurable.
      const t = setTimeout(() => setShowTour(true), 120)
      return () => clearTimeout(t)
    }
  }, [loading])

  function finishTour() {
    try { localStorage.setItem(TOUR_KEY, '1') } catch {}
    setShowTour(false)
  }

  if (loading) return <LoadingScreen />

  const streak = user?.streak_days || 0

  const list = topics || []
  const inProgress = list.find(t => t.games_done > 0 && t.games_done < t.games_total)
  const notDone = list.find(t => t.games_done < t.games_total)
  const current = inProgress || notDone
  const isFresh = current?.games_done === 0

  // Per-day session counts (Mon..Sun), normalized to %-of-max for the chart height.
  const counts = week?.counts || [0, 0, 0, 0, 0, 0, 0]
  const peak = Math.max(1, ...counts)
  const activity = counts.map(c => Math.round((c / peak) * 100))
  const hasActivity = counts.some(c => c > 0)

  return (
    <Shell>
      <AppHeader user={user} onNotifications={() => navigate('/notifications')} />

      <div className="screen-body">
        {/* KPI row — only what isn't duplicated inside the player iframe */}
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
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#DEDBF3', color: '#4F4990', display: 'grid', placeItems: 'center' }}>
              <IcFire size={18} />
            </div>
            <div>
              <div className="val">{streak}</div>
              <div className="lbl">дн. подряд</div>
            </div>
          </div>
        </div>

        {/* Current topic */}
        {current && (
          <div style={{ marginTop: 14 }} data-tour="current-topic">
            <div style={{
              borderRadius: 24, padding: 18,
              background: 'linear-gradient(135deg, #FCEFC9, #FCE4A0)',
              color: '#5C420C',
              display: 'flex', gap: 14, alignItems: 'center',
              cursor: 'pointer',
            }} onClick={() => navigate('/play')}>
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
          {!hasActivity && (
            <div className="muted tiny" style={{ textAlign: 'center', marginTop: 8 }}>
              Пока пусто — начни первую игру, чтобы заполнить неделю
            </div>
          )}
        </div>
      </div>

      <TabBar active="home" />

      {showTour && <Tour steps={TOUR_STEPS} onDone={finishTour} />}
    </Shell>
  )
}
