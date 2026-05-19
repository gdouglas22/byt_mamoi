import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Shell, TopicIcon, Stars, LoadingScreen, BackRow } from '../components/Shell'
import { IcClock, IcBolt, IcStar, IcPlay, IcArrow, IcX, IcMedal, IcSpark, IcCheck, IcMail } from '../icons'
import { useApi } from '../hooks/useApi'
import { getTopic, startGame, finishGame } from '../api'

// ── Game Launch ────────────────────────────────────────────────────────────
export function GameLaunch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)

  // id is game_id — fetch parent topic to get game details
  // For now load all topics and find the game
  const { data: topics, loading } = useApi(() =>
    fetch('/api/topics', {
      headers: { Authorization: `tma ${window.Telegram?.WebApp?.initData || '{"id":1,"first_name":"Test"}'}` }
    }).then(r => r.json())
  )

  if (loading) return <LoadingScreen />

  const game = topics?.flatMap(t => (t.games || []).map(g => ({ ...g, topic: t }))).find(g => String(g.id) === String(id))
  if (!game) return <LoadingScreen />

  const DIFF_META = { easy: 'Просто', medium: 'Средне', hard: 'Сложно' }

  async function handleStart() {
    setStarting(true)
    try {
      const session = await startGame(id)
      navigate(`/game/${id}/play`, { state: { session } })
    } catch {
      setStarting(false)
    }
  }

  return (
    <Shell>
      <div className="screen-body">
        <BackRow />

        <div className="col" style={{ alignItems: 'center', textAlign: 'center', marginTop: 6, gap: 6 }}>
          <TopicIcon icon={game.topic.icon} tone={game.topic.tone} size="lg" />
          <div className="chip" style={{ marginTop: 6 }}>{game.topic.title} · игра {game.order} из {game.topic.games_total}</div>
          <div className="h-display h1" style={{ marginTop: 4 }}>{game.title}</div>
          <div className="muted" style={{ margin: '8px 16px 0', fontSize: 13 }}>{game.description}</div>
        </div>

        <div className="row gap-8" style={{ marginTop: 18 }}>
          {[
            { I: IcClock, lbl: 'Время', val: `${game.duration_mins} мин`, tone: 'tone-blue' },
            { I: IcBolt,  lbl: 'Уровень', val: DIFF_META[game.difficulty], tone: 'tone-lav' },
            { I: IcStar,  lbl: 'Награда', val: `+${game.points_reward}`, tone: 'tone-honey' },
          ].map(({ I, lbl, val, tone }, i) => (
            <div key={i} className="kpi" style={{ flex: 1, textAlign: 'center', padding: '10px 8px' }}>
              <div className={`topic-ic ${tone}`} style={{ width: 30, height: 30, borderRadius: 10, margin: '0 auto 6px' }}>
                <I size={18} />
              </div>
              <div className="lbl" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>{lbl}</div>
              <div className="val" style={{ fontSize: 15, marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 14, padding: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Как играть</div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>{game.instructions}</p>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 16, paddingBottom: 12 }}>
          <button className="btn btn-primary btn-block btn-lg" onClick={handleStart} disabled={starting}>
            <IcPlay size={16} /> {starting ? 'Загружаем…' : 'Начать игру'}
          </button>
          <div className="muted tiny" style={{ textAlign: 'center', marginTop: 10 }}>
            Лучший результат:{' '}
            <span style={{ color: 'var(--ink-2)', fontWeight: 700 }}>
              {game.best_stars > 0 ? <Stars n={game.best_stars} /> : '— ещё не играл'}
            </span>
          </div>
        </div>
      </div>
    </Shell>
  )
}

// ── Game Play (placeholder — real game logic is per-game) ─────────────────
export function GamePlay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = window.history
  const session = state?.session

  // Demo: instant "finish" with mock result
  // In production each game would have its own interactive component here
  const [score] = useState(7)
  const [total] = useState(8)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState(null)

  async function handleFinish() {
    if (!session?.session_id) {
      navigate(`/game/${id}/finish`, { state: { score: 7, total: 8, stars: 3, points: 60, newAchievements: [] } })
      return
    }
    const res = await finishGame(id, {
      session_id: session.session_id,
      score,
      total,
      time_spent_secs: 180,
    })
    navigate(`/game/${id}/finish`, { state: { score, total, ...res } })
  }

  return (
    <Shell>
      <div className="screen-body" style={{ alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, maxWidth: 280 }}>
          Здесь будет игровой интерфейс для игры #{id}.<br />
          Каждая мини-игра — отдельный компонент.
        </div>
        <button className="btn btn-primary btn-lg" onClick={handleFinish}>
          Завершить игру (демо)
        </button>
      </div>
    </Shell>
  )
}

// ── Game Finish ────────────────────────────────────────────────────────────
export function GameFinish() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loc = window.location
  // Read result from navigation state (set by GamePlay)
  const state = (typeof window !== 'undefined' && window.history?.state?.usr) || {}
  const score = state.score ?? 7
  const total = state.total ?? 8
  const stars = state.stars ?? 3
  const points = state.points_earned ?? 60
  const newAchievements = state.new_achievements || []

  const pct = score / total
  const r = 70
  const c = 2 * Math.PI * r

  return (
    <Shell>
      <div className="screen-body">
        <div className="row gap-8" style={{ marginTop: 4 }}>
          <div
            className="icon-btn"
            style={{ width: 32, height: 32, boxShadow: 'none', background: 'transparent' }}
            onClick={() => navigate('/menu', { replace: true })}
          >
            <IcX size={20} />
          </div>
          <div className="grow" />
        </div>

        <div className="col" style={{ alignItems: 'center', textAlign: 'center', marginTop: 4, gap: 4 }}>
          <span className="chip honey lg">Результат игры</span>
          <div className="h-display h1" style={{ marginTop: 6 }}>
            {pct >= 0.9 ? 'Отлично!' : pct >= 0.7 ? 'Хорошо!' : 'Продолжай!'}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {stars === 3 ? 'Ты прошёл игру и заработал бейдж' : 'Можешь попробовать ещё раз'}
          </div>
        </div>

        {/* Result ring */}
        <div className="ring-wrap" style={{ marginTop: 16 }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r={r} fill="none" stroke="var(--primary-50)" strokeWidth="14" />
            <circle
              cx="90" cy="90" r={r}
              fill="none"
              stroke="url(#gradRing)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${c * pct} ${c}`}
              transform="rotate(-90 90 90)"
            />
            <defs>
              <linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5B8FD9" />
                <stop offset="100%" stopColor="#82B0E8" />
              </linearGradient>
            </defs>
          </svg>
          <div className="label">
            <div className="val">{score}<span style={{ color: 'var(--ink-4)' }}>/{total}</span></div>
            <div className="of">правильно</div>
            <Stars n={stars} />
          </div>
        </div>

        {/* Rewards */}
        <div className="row gap-8" style={{ marginTop: 4 }}>
          <div className="kpi" style={{ flex: 1, textAlign: 'center' }}>
            <div className="topic-ic tone-honey" style={{ width: 30, height: 30, borderRadius: 10, margin: '0 auto 4px' }}>
              <IcStar size={18} />
            </div>
            <div className="val" style={{ fontSize: 18 }}>+{points}</div>
            <div className="lbl">баллов</div>
          </div>
          <div className="kpi" style={{ flex: 1, textAlign: 'center' }}>
            <div className="topic-ic tone-blue" style={{ width: 30, height: 30, borderRadius: 10, margin: '0 auto 4px' }}>
              <IcMedal size={18} />
            </div>
            <div className="val" style={{ fontSize: 18 }}>★ {stars}</div>
            <div className="lbl">звезды</div>
          </div>
        </div>

        {/* New achievements */}
        {newAchievements.map((a, i) => (
          <div key={i} className="card" style={{
            marginTop: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'center',
            background: 'linear-gradient(135deg, #FCEFC9 0%, #FFFFFF 60%)',
          }}>
            <div className={`topic-ic ${a.tone}`} style={{ width: 48, height: 48, borderRadius: 16 }}>
              <IcSpark size={28} />
            </div>
            <div className="col" style={{ gap: 2, flex: 1 }}>
              <div className="eyebrow" style={{ color: '#8A6915' }}>Новое достижение</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{a.name}</div>
              <div className="muted tiny">{a.description}</div>
            </div>
            <span className="chip honey">+{a.points_reward}</span>
          </div>
        ))}

        {/* Parent notification */}
        <div className="row gap-8 card-soft" style={{ marginTop: 12, padding: '10px 12px', alignItems: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: '#fff', color: 'var(--primary-deep)', display: 'grid', placeItems: 'center' }}>
            <IcMail size={16} />
          </div>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)' }}>
            Родитель узнает о твоём успехе
          </div>
          <span className="chip" style={{ background: '#fff' }}>
            <IcCheck size={11} /> Отправлено
          </span>
        </div>

        <div className="row gap-8" style={{ marginTop: 'auto', paddingTop: 14, paddingBottom: 12 }}>
          <button className="btn btn-soft" style={{ flex: 1 }} onClick={() => navigate(-2)}>
            Повторить
          </button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => navigate('/menu')}>
            К темам <IcArrow size={16} />
          </button>
        </div>
      </div>
    </Shell>
  )
}
