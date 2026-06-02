import { useNavigate } from 'react-router-dom'
import { Shell, LoadingScreen } from '../components/Shell'
import { IcArrowL, IcBell, IcMedal, IcCheck, IcEye, IcFire } from '../icons'
import { useApi } from '../hooks/useApi'
import { getNotifications, markAllRead } from '../api'

const ICONS = { achievement: IcMedal, progress: IcCheck, tip: IcEye, streak: IcFire }
const TONES = { achievement: 'tone-honey', progress: 'tone-mint', tip: 'tone-blue', streak: 'tone-coral' }

function groupByDate(items) {
  const now = new Date()
  const today = [], yesterday = [], older = []
  for (const n of items) {
    const diff = Math.floor((now - new Date(n.created_at)) / 86400000)
    if (diff === 0) today.push(n)
    else if (diff === 1) yesterday.push(n)
    else older.push(n)
  }
  return [
    today.length && { label: 'Сегодня', items: today },
    yesterday.length && { label: 'Вчера', items: yesterday },
    older.length && { label: 'Раньше', items: older },
  ].filter(Boolean)
}

export default function NotificationsScreen() {
  const navigate = useNavigate()
  const { data: notes, loading, reload } = useApi(getNotifications)

  if (loading) return <LoadingScreen />

  const unread = (notes || []).filter(n => !n.is_read).length
  const groups = groupByDate(notes || [])

  async function handleMarkAll() {
    await markAllRead()
    reload()
  }

  return (
    <Shell>
      <div className="screen-body">
        <div className="row gap-8" style={{ marginTop: 4, alignItems: 'center' }}>
          <div
            className="icon-btn"
            style={{ width: 32, height: 32, boxShadow: 'none', background: 'transparent' }}
            onClick={() => navigate(-1)}
          >
            <IcArrowL size={20} />
          </div>
          <div className="h3">Уведомления</div>
          <div className="grow" />
          {unread > 0 && (
            <span className="linklike tiny" onClick={handleMarkAll}>Прочитать всё</span>
          )}
        </div>

        <div className="scroll-fade" style={{ marginTop: 14 }}>
          <div className="col gap-14" style={{ paddingBottom: 24 }}>
            {groups.length === 0 && (
              <div className="col" style={{ alignItems: 'center', marginTop: 48, gap: 10 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'var(--primary-50, #EEF3FB)', color: 'var(--ink-3)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <IcBell size={28} />
                </div>
                <div className="muted">Пока тихо. Играй — и здесь появятся новости.</div>
              </div>
            )}
            {groups.map(group => (
              <div key={group.label}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>{group.label}</div>
                <div className="col gap-8">
                  {group.items.map(n => {
                    const Ic = ICONS[n.type] || IcBell
                    const tone = TONES[n.type] || 'tone-blue'
                    return (
                      <div key={n.id} className={`note-item${n.is_read ? ' read' : ''}`}>
                        <div className="dot" />
                        <div className={`topic-ic ${n.tone || tone}`} style={{ width: 34, height: 34, borderRadius: 11 }}>
                          <Ic size={20} />
                        </div>
                        <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{n.title}</div>
                          {n.subtitle && <div className="muted tiny">{n.subtitle}</div>}
                        </div>
                        <div className="tiny" style={{ color: 'var(--ink-4)', whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {new Date(n.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}
