import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, TabBar, LoadingScreen } from '../components/Shell'
import { IcArrowL, IcTrophy, IcStar, TOPIC_ICONS } from '../icons'
import { useApi } from '../hooks/useApi'
import { getAchievements } from '../api'

export default function Achievements() {
  const navigate = useNavigate()
  const { data: achievements, loading } = useApi(getAchievements)
  const [filter, setFilter] = useState('all') // all | earned | locked

  if (loading) return <LoadingScreen />

  const earned = (achievements || []).filter(a => a.earned)
  const visible = (achievements || []).filter(a =>
    filter === 'all' ? true : filter === 'earned' ? a.earned : !a.earned
  )

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
          <div className="h3">Награды</div>
          <div className="grow" />
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

        <div className="scroll-fade" style={{ marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingBottom: 80 }}>
            {visible.map((a, i) => {
              const Ic = (TOPIC_ICONS && TOPIC_ICONS[a.icon]) || IcStar
              return (
                <div key={i} className={`badge${!a.earned ? ' locked' : ''}`} style={{ padding: '14px 6px' }}>
                  <div className={`badge-art ${a.tone}`}>
                    <Ic />
                  </div>
                  <div className="badge-name">{a.name}</div>
                  {a.earned && (
                    <div className="tiny" style={{ color: 'var(--honey-deep)', fontWeight: 700, marginTop: 2 }}>
                      +{a.points_reward}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <TabBar active="awards" />
    </Shell>
  )
}
