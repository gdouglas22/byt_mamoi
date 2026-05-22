import { useNavigate } from 'react-router-dom'
import { Shell, AppHeader, TabBar, TopicIcon, LoadingScreen } from '../components/Shell'
import { IcStar, IcMedal, IcFire, IcBolt, IcCheck } from '../icons'
import { useApi } from '../hooks/useApi'
import { getTopics, getMe } from '../api'

function TopicTile({ topic, onClick }) {
  const pct = topic.games_total > 0 ? Math.round(topic.games_done / topic.games_total * 100) : 0
  return (
    <div className="grid-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <TopicIcon icon={topic.icon} tone={topic.tone} />
        {topic.games_done >= topic.games_total && topic.games_total > 0 && (
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: '#9FD8C7', color: '#fff',
            display: 'grid', placeItems: 'center',
          }}>
            <IcCheck size={14} />
          </div>
        )}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>{topic.title}</div>
        <div className="meta">{topic.games_done}/{topic.games_total} игр</div>
      </div>
      <div className="bar" style={{ height: 5 }}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function MainMenu() {
  const navigate = useNavigate()
  const { data: user } = useApi(getMe)
  const { data: topics, loading } = useApi(getTopics)

  if (loading) return <LoadingScreen />

  const totalGames = topics?.reduce((s, t) => s + t.games_total, 0) || 0
  const doneGames  = topics?.reduce((s, t) => s + t.games_done, 0) || 0
  const streak     = user?.streak_days || 0
  const badges     = 0 // loaded separately

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

        {/* Current topic — first started-but-not-finished, else first not-finished */}
        {(() => {
          const list = topics || []
          const inProgress = list.find(t => t.games_done > 0 && t.games_done < t.games_total)
          const notDone = list.find(t => t.games_done < t.games_total)
          const current = inProgress || notDone
          if (!current) return null
          const isFresh = current.games_done === 0
          return (
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
          )
        })()}

        <div className="row between" style={{ margin: '16px 0 10px' }}>
          <div className="h3">Темы</div>
          <span className="muted tiny" style={{ fontWeight: 700 }}>{topics?.length || 0} тем</span>
        </div>

        <div className="scroll-fade">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 80 }}>
            {(topics || []).map(t => (
              <TopicTile
                key={t.id}
                topic={t}
                onClick={() => navigate(`/topic/${t.id}`)}
              />
            ))}
          </div>
        </div>
      </div>

      <TabBar active="home" />
    </Shell>
  )
}
