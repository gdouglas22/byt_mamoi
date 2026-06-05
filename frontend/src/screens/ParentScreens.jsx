import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, TabBar, TopicIcon, LoadingScreen } from '../components/Shell'
import {
  IcArrowL, IcMail, IcBell, IcMap, IcShield, IcClock, IcQR, IcCopy,
  IcChevron, IcSettings, IcPlus, IcStar, IcMedal, IcFire, IcCheck,
  IcEye, IcSpark,
} from '../icons'
import { useApi } from '../hooks/useApi'
import { requestLinkCode, confirmLink, getChildren, getChildStats, getNotifications, markAllRead, getMe } from '../api'

// ── Parent Link Step 1 ────────────────────────────────────────────────────
export function ParentLink1() {
  const navigate = useNavigate()
  return (
    <Shell>
      <div className="screen-body">
        <div className="row gap-8" style={{ marginTop: 4 }}>
          <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate(-1)}>
            <IcArrowL />
          </span>
          <div className="eyebrow">Аккаунт родителя</div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{
            width: 96, height: 96, margin: '8px auto 16px',
            borderRadius: 28, background: 'var(--honey-soft)',
            display: 'grid', placeItems: 'center', color: '#8A6915',
          }}>
            <IcMail size={48} />
          </div>
          <h2 className="h-display h2">Связаться<br />с ребёнком</h2>
          <p className="muted" style={{ margin: '10px 16px 0', fontSize: 14 }}>
            Получайте уведомления о прогрессе ребёнка и видьте его статистику.
          </p>
        </div>

        <div className="col gap-10" style={{ marginTop: 24 }}>
          {[
            { t: 'Получать уведомления', d: 'Когда ребёнок проходит тему — придёт сообщение', I: IcBell },
            { t: 'Видеть прогресс', d: 'Темы, баллы, время в игре', I: IcMap },
            { t: 'Конфиденциально', d: 'Видите только статистику, не переписку', I: IcShield },
          ].map(({ t, d, I }, i) => (
            <div key={i} className="row gap-12 card-soft">
              <div className="topic-ic tone-blue"><I /></div>
              <div className="col" style={{ gap: 2, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div>
                <div className="muted tiny">{d}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 14, paddingTop: 16 }}>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate('/parent/link/code')}>
            Получить код привязки
          </button>
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--ink-3)' }}>
            У меня уже есть код ·{' '}
            <span className="linklike" onClick={() => navigate('/parent/link/enter')}>Ввести</span>
          </div>
        </div>
      </div>
    </Shell>
  )
}

// ── Parent Link Step 2 (child generates code) ─────────────────────────────
export function ParentLink2() {
  const navigate = useNavigate()
  const { data: linkData, loading, error } = useApi(requestLinkCode)

  const [copied, setCopied] = useState(false)

  function copyCode() {
    if (!linkData?.code) return
    navigator.clipboard?.writeText(linkData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const code = linkData?.code || '------'
  const expires = linkData?.expires_at ? new Date(linkData.expires_at) : null

  // Countdown
  const [now, setNow] = useState(Date.now())
  if (expires) {
    // poor man's interval — just show static for now
  }
  const remaining = expires ? Math.max(0, Math.floor((expires - Date.now()) / 1000)) : 600
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')

  return (
    <Shell>
      <div className="screen-body">
        <div className="row gap-8" style={{ marginTop: 4 }}>
          <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate(-1)}>
            <IcArrowL />
          </span>
          <div className="eyebrow">Шаг 2 из 2</div>
        </div>

        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <h2 className="h-display h2">Покажите код<br />родителю</h2>
          <p className="muted" style={{ margin: '8px 12px 0', fontSize: 13 }}>
            Откройте этого же бота в Telegram родителя и введите этот код. Он действует 10 минут.
          </p>
        </div>

        <div style={{ marginTop: 22 }}>
          <div className="otp">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <span key={i}>·</span>)
              : code.split('').map((ch, i) => <span key={i}>{ch}</span>)
            }
          </div>
          <div className="row gap-8" style={{ justifyContent: 'center', marginTop: 14 }}>
            <span className="chip honey">
              <IcClock size={12} /> Истекает через {mins}:{secs}
            </span>
          </div>
        </div>

        <div className="col gap-10" style={{ marginTop: 22 }}>
          <div className="card row gap-12" style={{ cursor: 'pointer' }} onClick={copyCode}>
            <div className="topic-ic tone-honey"><IcCopy /></div>
            <div className="col" style={{ gap: 2, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{copied ? 'Скопировано!' : 'Скопировать код'}</div>
              <div className="muted tiny">Отправить в любой чат</div>
            </div>
            <span style={{ color: 'var(--ink-4)' }}><IcChevron size={18} /></span>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 14, paddingTop: 16 }}>
          <button className="btn btn-soft btn-block btn-lg" onClick={() => navigate('/menu', { replace: true })}>
            Готово, родитель ввёл код
          </button>
        </div>
      </div>
    </Shell>
  )
}

// ── Parent Link Enter (parent enters code) ────────────────────────────────
export function ParentLinkEnter() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleConfirm() {
    if (code.length < 6) return
    setSaving(true)
    setError(null)
    try {
      await confirmLink(code)
      setSubmitted(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <Shell>
        <div className="screen-body" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, paddingTop: 60 }}>
          <div style={{
            width: 84, height: 84, borderRadius: 26,
            background: 'linear-gradient(135deg, #FCEFC9, #F4C95D)', color: '#5C420C',
            display: 'grid', placeItems: 'center',
          }}>
            <IcMail size={42} />
          </div>
          <h2 className="h-display h2">Заявка отправлена</h2>
          <p className="muted" style={{ margin: '0 16px', fontSize: 14, lineHeight: 1.5 }}>
            Мы проверим, что это действительно вы (а не одноклассник ребёнка 😅).
            Когда модератор одобрит — придёт сообщение от бота, и в приложении станет
            доступен раздел с прогрессом ребёнка.
          </p>
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 24, maxWidth: 280 }}
            onClick={() => navigate('/parent', { replace: true })}>
            Понятно
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="screen-body">
        <div className="row gap-8" style={{ marginTop: 4 }}>
          <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => navigate(-1)}>
            <IcArrowL />
          </span>
          <div className="eyebrow">Ввести код</div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <h2 className="h-display h2">Введите код<br />от ребёнка</h2>
          <p className="muted" style={{ margin: '10px 16px 0', fontSize: 14 }}>
            Ребёнок видит этот код в разделе «Привязка родителя» своего приложения.
            Заявка пройдёт быструю модерацию.
          </p>
        </div>

        <div className="col gap-10" style={{ marginTop: 28 }}>
          <input
            className="input"
            style={{ fontSize: 22, letterSpacing: '0.18em', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700 }}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="XXXXXX"
            maxLength={6}
          />
          {error && <div className="tiny" style={{ color: '#c0392b', textAlign: 'center' }}>{error}</div>}
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 14, paddingTop: 16 }}>
          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={handleConfirm}
            disabled={code.length < 6 || saving}
            style={{ opacity: code.length < 6 ? .5 : 1 }}
          >
            {saving ? 'Отправляем…' : 'Отправить заявку'}
          </button>
        </div>
      </div>
    </Shell>
  )
}

// ── Parent Dashboard ──────────────────────────────────────────────────────
export function ParentDashboard() {
  const navigate = useNavigate()
  const { data: me } = useApi(getMe)
  const { data: children, loading: lc } = useApi(getChildren)
  const [selectedId, setSelectedId] = useState(null)

  // Если юзер ещё не одобрен (заявка pending или вообще не подавал) — не показываем
  // дашборд родителя. Это случается, если в HashRouter сохранён URL /parent.
  useEffect(() => {
    if (me && !me.is_parent) navigate('/menu', { replace: true })
  }, [me, navigate])

  const childId = selectedId || children?.[0]?.id
  const { data: stats } = useApi(
    () => childId ? getChildStats(childId) : Promise.resolve(null),
    [childId]
  )

  if (lc) return <LoadingScreen />

  return (
    <Shell>
      <div className="screen-body">
        <div className="col" style={{ gap: 4, marginTop: 6, marginBottom: 14 }}>
          <div className="h-display h2">Добрый день,<br />уважаемый родитель!</div>
          <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Ваши дети:</div>
        </div>

        {children?.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div className="muted" style={{ marginBottom: 16 }}>Пока нет привязанных детей</div>
            <button className="btn btn-primary" onClick={() => navigate('/parent/link/enter')}>
              Привязать ребёнка
            </button>
          </div>
        ) : (
          <>
            {/* Список детей */}
            <div className="col gap-8">
              {children.map(c => {
                const isActive = c.id === childId
                return (
                  <div
                    key={c.id}
                    className="card row gap-12"
                    onClick={() => setSelectedId(c.id)}
                    style={{
                      padding: 12,
                      cursor: 'pointer',
                      border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                  >
                    <div className="avatar" style={{ width: 40, height: 40, background: '#DBE8F8', color: '#2F5B9A' }}>
                      <IcShield size={22} />
                    </div>
                    <div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        {c.name}{c.age ? `, ${c.age} лет` : ''}
                      </div>
                      <div className="muted tiny">
                        {c.points} баллов · {c.streak_days || 0} дн. подряд
                      </div>
                    </div>
                    <IcChevron size={16} style={{ color: 'var(--ink-4)' }} />
                  </div>
                )
              })}

              {/* Добавить ещё одного ребёнка */}
              <button
                className="card row gap-12"
                onClick={() => navigate('/parent/link/enter')}
                style={{
                  padding: 12, cursor: 'pointer',
                  border: '2px dashed var(--border, #DCE6F2)',
                  background: 'transparent',
                  width: '100%', textAlign: 'left',
                  fontFamily: 'inherit', fontSize: 'inherit',
                  color: 'var(--ink-2)',
                }}
              >
                <div className="avatar" style={{
                  width: 40, height: 40,
                  background: 'var(--primary-50, #DCE9F8)', color: 'var(--primary, #5B8FD9)',
                }}>
                  <IcPlus size={22} />
                </div>
                <div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Привязать ещё одного ребёнка</div>
                  <div className="muted tiny">Введите код от ребёнка</div>
                </div>
              </button>
            </div>

            {stats && (
              <>
                {/* Детальная статистика выбранного ребёнка */}
                <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>
                  Прогресс · {stats.child?.name}
                </div>

                <div className="head-stats">
                  <div className="row between">
                    <div>
                      <div className="label">Общий прогресс</div>
                      <div className="score">{stats.total_progress_pct}%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="label">Игр пройдено</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
                        {stats.games_done}/{stats.games_total}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="row between" style={{ marginBottom: 6, fontSize: 11, opacity: .9 }}>
                      <span>{stats.games_done} из {stats.games_total} игр</span>
                      <span style={{ fontWeight: 800 }}>{stats.topics_done} из {stats.topics_total} тем</span>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${stats.total_progress_pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="row gap-8" style={{ marginTop: 12, marginBottom: 24 }}>
                  <div className="kpi" style={{ flex: 1, padding: '10px 12px' }}>
                    <div className="lbl" style={{ fontSize: 10 }}>Время за неделю</div>
                    <div className="val" style={{ fontSize: 18, marginTop: 2 }}>
                      {Math.floor(stats.week_time_mins / 60) > 0
                        ? `${Math.floor(stats.week_time_mins / 60)}ч ${stats.week_time_mins % 60}м`
                        : `${stats.week_time_mins}м`}
                    </div>
                  </div>
                  <div className="kpi" style={{ flex: 1, padding: '10px 12px' }}>
                    <div className="lbl" style={{ fontSize: 10 }}>Серия</div>
                    <div className="val" style={{ fontSize: 18, marginTop: 2 }}>
                      {stats.child?.streak_days || 0} дн.
                    </div>
                  </div>
                  <div className="kpi" style={{ flex: 1, padding: '10px 12px' }}>
                    <div className="lbl" style={{ fontSize: 10 }}>Бейджи</div>
                    <div className="val" style={{ fontSize: 18, marginTop: 2 }}>
                      {stats.badges_earned}/{stats.badges_total}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <TabBar active="home" role="parent" />
    </Shell>
  )
}

// ── Parent Notifications ──────────────────────────────────────────────────
export function ParentNotifications() {
  const navigate = useNavigate()
  const { data: notes, loading, reload } = useApi(getNotifications)
  const [filter, setFilter] = useState('all')

  if (loading) return <LoadingScreen />

  const ICONS = { achievement: IcMedal, progress: IcCheck, tip: IcEye, streak: IcFire }
  const TONES = { achievement: 'tone-honey', progress: 'tone-mint', tip: 'tone-blue', streak: 'tone-coral' }

  const filtered = filter === 'all' ? (notes || []) : (notes || []).filter(n => n.type === filter)
  const unread = (notes || []).filter(n => !n.is_read).length

  async function handleMarkAll() {
    await markAllRead()
    reload()
  }

  function groupByDate(items) {
    const now = new Date()
    const today = [], yesterday = [], older = []
    for (const n of items) {
      const d = new Date(n.created_at)
      const diff = Math.floor((now - d) / 86400000)
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

  const groups = groupByDate(filtered)

  return (
    <Shell>
      <div className="screen-body">
        <div className="row between" style={{ marginTop: 4, alignItems: 'center' }}>
          <div className="h3">Уведомления</div>
          {unread > 0 && (
            <span className="linklike tiny" onClick={handleMarkAll}>Прочитать всё</span>
          )}
        </div>

        <div className="row gap-8" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {['all', 'achievement', 'progress', 'tip'].map(f => (
            <span
              key={f}
              className={`chip lg${filter === f ? '' : ' ghost'}`}
              style={filter === f ? { background: 'var(--primary)', color: '#fff' } : {}}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `Все · ${notes?.length || 0}` : f === 'achievement' ? 'Достижения' : f === 'progress' ? 'Прогресс' : 'Советы'}
            </span>
          ))}
        </div>

        <div className="scroll-fade" style={{ marginTop: 14 }}>
          <div className="col gap-14" style={{ paddingBottom: 80 }}>
            {groups.length === 0 && (
              <div className="muted" style={{ textAlign: 'center', marginTop: 32 }}>Уведомлений нет</div>
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
      <TabBar active="notes" role="parent" />
    </Shell>
  )
}
