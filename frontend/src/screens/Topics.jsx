import { useNavigate } from 'react-router-dom'
import { Shell, TabBar, TopicIcon, LoadingScreen } from '../components/Shell'
import { IcLock, IcCheck, IcPlay } from '../icons'
import { useApi } from '../hooks/useApi'
import { getTopics } from '../api'

export default function Topics() {
  const navigate = useNavigate()
  const { data: topics, loading } = useApi(getTopics)

  if (loading) return <LoadingScreen />

  const orderedTopics = topics || []
  const currentIdx = orderedTopics.findIndex(t => t.games_done < t.games_total)
  const topicStatus = (idx, t) => {
    if (t.games_total > 0 && t.games_done >= t.games_total) return 'done'
    if (idx === currentIdx) return 'current'
    return 'locked'
  }

  const doneCount = orderedTopics.filter(
    t => t.games_total > 0 && t.games_done >= t.games_total
  ).length

  return (
    <Shell>
      <div className="screen-body">
        <div className="row between" style={{ marginTop: 4, marginBottom: 12, alignItems: 'baseline' }}>
          <div className="h3">Темы</div>
          <span className="muted tiny" style={{ fontWeight: 700 }}>
            {doneCount} / {orderedTopics.length}
          </span>
        </div>

        <div className="scroll-fade">
          <div className="col" style={{ gap: 8, paddingBottom: 80 }}>
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
        </div>
      </div>
      <TabBar active="path" />
    </Shell>
  )
}
