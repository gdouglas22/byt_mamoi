import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, TabBar, LoadingScreen } from '../components/Shell'
import { IcTrophy, IcStar, TOPIC_ICONS } from '../icons'
import { useApi } from '../hooks/useApi'
import { getAchievements } from '../api'

export default function Achievements() {
  const navigate = useNavigate()
  const { data: achievements, loading } = useApi(getAchievements)
  const [filter, setFilter] = useState('all') // all | earned | locked
  const [open, setOpen] = useState(null)

  if (loading) return <LoadingScreen />

  const earned = (achievements || []).filter(a => a.earned)
  const visible = (achievements || []).filter(a =>
    filter === 'all' ? true : filter === 'earned' ? a.earned : !a.earned
  )

  return (
    <Shell>
      <div className="screen-body">
        <div className="row between" style={{ marginTop: 4, alignItems: 'center' }}>
          <div className="h3">Награды</div>
          <span className="chip lg">{earned.length} из {achievements?.length || 0}</span>
        </div>

        {/* Progress */}
        <div className="card" style={{ marginTop: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 18,
            background: 'linear-gradient(135deg, #FCEFC9, #F4C95D)',
            color: '#5C420C',
            display: 'grid', placeItems: 'center',
          }}>
            <IcTrophy size={28} />
          </div>
          <div className="col" style={{ gap: 4, flex: 1 }}>
            <div className="row between">
              <div style={{ fontWeight: 800, fontSize: 14 }}>Собрано бейджей</div>
              <div className="tiny" style={{ color: 'var(--ink-3)', fontWeight: 700 }}>
                {earned.length}/{achievements?.length || 0}
              </div>
            </div>
            <div className="bar" style={{ height: 6 }}>
              <i style={{ width: `${achievements?.length ? Math.round(earned.length / achievements.length * 100) : 0}%` }} />
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="seg" style={{ marginTop: 14 }}>
          {['all', 'earned', 'locked'].map(f => (
            <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Все' : f === 'earned' ? 'Открыты' : 'Закрыты'}
            </button>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: 10,
          marginTop: 12,
          paddingBottom: 96,
          width: '100%',
          minWidth: 0,
        }}>
          {visible.map((a, i) => {
            const Ic = (TOPIC_ICONS && TOPIC_ICONS[a.icon]) || IcStar
            return (
              <button
                key={a.id ?? i}
                type="button"
                className={`badge${!a.earned ? ' locked' : ''}`}
                onClick={() => setOpen(a)}
                style={{
                  padding: '14px 6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                }}
              >
                <div className={`badge-art ${a.tone}`}>
                  <Ic />
                </div>
                <div className="badge-name">{a.name}</div>
                {a.earned && (
                  <div className="tiny" style={{ color: 'var(--honey-deep)', fontWeight: 700, marginTop: 2 }}>
                    +{a.points_reward}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {open && (
        <AchievementSheet
          item={open}
          onClose={() => setOpen(null)}
        />
      )}

      <TabBar active="awards" />
    </Shell>
  )
}

function AchievementSheet({ item, onClose }) {
  const Ic = (TOPIC_ICONS && TOPIC_ICONS[item.icon]) || IcStar
  const earnedAt = item.earned_at ? new Date(item.earned_at) : null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 30,
        background: 'rgba(0,0,0,.45)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--surface)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 22px calc(28px + env(safe-area-inset-bottom, 0px))',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--ink-4)', opacity: .35,
          margin: '-4px auto 14px',
        }} />

        <div className="col" style={{ alignItems: 'center', gap: 8 }}>
          <div className={`badge-art ${item.tone}`} style={{
            width: 84, height: 84, borderRadius: 24,
            opacity: item.earned ? 1 : 0.45,
            filter: item.earned ? 'none' : 'grayscale(1)',
          }}>
            <Ic size={42} />
          </div>
          <div className="h-display h2" style={{ marginTop: 6, textAlign: 'center' }}>
            {item.name}
          </div>
          {item.earned ? (
            <span className="chip honey lg">
              <IcStar size={12} /> +{item.points_reward} баллов
            </span>
          ) : (
            <span className="chip lg" style={{ color: 'var(--ink-3)' }}>
              Ещё не открыта
            </span>
          )}
        </div>

        <div className="card-soft" style={{ marginTop: 14, padding: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {item.earned ? 'За что получено' : 'Как получить'}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            {item.description || 'Описание появится позже.'}
          </div>
        </div>

        {earnedAt && (
          <div className="muted tiny" style={{ textAlign: 'center', marginTop: 12 }}>
            Получено · {earnedAt.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}

        <button
          type="button"
          className="btn btn-soft btn-block"
          style={{ marginTop: 14 }}
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}
