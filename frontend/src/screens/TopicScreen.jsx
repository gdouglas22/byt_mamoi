import { useNavigate, useParams } from 'react-router-dom'
import { Shell, TabBar, TopicIcon, Stars, LoadingScreen, BackRow } from '../components/Shell'
import { IcCheck, IcClock, IcHeart } from '../icons'
import { useApi } from '../hooks/useApi'
import { getTopic } from '../api'

const DIFF_LABEL = { easy: 'Просто', medium: 'Средне', hard: 'Сложно' }
const STATUS_STYLE = {
  done:   { bg: '#D6EEE6', color: '#2E7E64' },
  next:   { bg: '#FCEFC9', color: '#8A6915' },
  locked: { bg: 'var(--bg-soft)', color: 'var(--ink-4)' },
}

export default function TopicScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: topic, loading } = useApi(() => getTopic(id), [id])

  if (loading) return <LoadingScreen />
  if (!topic) return null

  const pct = topic.games_total > 0 ? Math.round(topic.games_done / topic.games_total * 100) : 0

  return (
    <Shell>
      <div className="screen-body">
        <BackRow right={
          <div className="icon-btn" style={{ width: 32, height: 32, boxShadow: 'none', background: 'transparent' }}>
            <IcHeart size={20} />
          </div>
        } />

        {/* Hero */}
        <div className="card" style={{ marginTop: 8, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <TopicIcon icon={topic.icon} tone={topic.tone} size="lg" />
          <div className="col" style={{ gap: 2, flex: 1 }}>
            <div className="eyebrow">Тема · {topic.games_total} игр</div>
            <div className="h-display h2">{topic.title}</div>
            <div className="muted tiny" style={{ marginTop: 2 }}>{topic.subtitle}</div>
          </div>
        </div>

        {/* KPI row */}
        <div className="row gap-8" style={{ marginTop: 12 }}>
          <div className="kpi" style={{ flex: 1 }}>
            <div className="lbl">Пройдено</div>
            <div className="val" style={{ fontSize: 18 }}>{topic.games_done}/{topic.games_total}</div>
          </div>
          <div className="kpi" style={{ flex: 1 }}>
            <div className="lbl">Прогресс</div>
            <div className="val" style={{ fontSize: 18 }}>{pct}%</div>
          </div>
          <div className="kpi" style={{ flex: 1 }}>
            <div className="lbl">Баллы</div>
            <div className="val" style={{ fontSize: 18 }}>{topic.points_earned}</div>
          </div>
        </div>

        <div className="bar" style={{ marginTop: 12, height: 6 }}>
          <i style={{ width: `${pct}%` }} />
        </div>

        <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Мини-игры</div>

        <div className="scroll-fade">
          <div className="col gap-10" style={{ paddingBottom: 24 }}>
            {(topic.games || []).map((g, idx) => {
              const status = g.completed ? 'done' : idx === topic.games_done ? 'next' : idx > topic.games_done ? 'locked' : 'done'
              const st = STATUS_STYLE[status]
              return (
                <div
                  key={g.id}
                  className="card row gap-12"
                  style={{ opacity: status === 'locked' ? .5 : 1, cursor: status !== 'locked' ? 'pointer' : 'default' }}
                  onClick={() => status !== 'locked' && navigate(`/game/${g.id}/launch`)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: st.bg, color: st.color,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                  }}>
                    {status === 'done' ? <IcCheck size={20} /> : g.order}
                  </div>
                  <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                    <div className="row between">
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{g.title}</div>
                      {status === 'next' && <span className="chip honey">Дальше</span>}
                      {status === 'done' && g.best_stars > 0 && <Stars n={g.best_stars} />}
                    </div>
                    <div className="muted tiny">{g.description}</div>
                    <div className="row gap-8 tiny" style={{ marginTop: 4, color: 'var(--ink-3)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <IcClock size={11} /> {g.duration_mins} мин
                      </span>
                      <span>·</span>
                      <span>{DIFF_LABEL[g.difficulty] || g.difficulty}</span>
                      <span>·</span>
                      <span style={{ color: 'var(--honey-deep)', fontWeight: 700 }}>+{g.points_reward}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <TabBar active="home" />
    </Shell>
  )
}
