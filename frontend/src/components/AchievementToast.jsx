import { useEffect, useState } from 'react'
import { IcStar, IcMedal, TOPIC_ICONS } from '../icons'

// Steam-style achievement toast — slides in from the top, auto-dismisses.
// Listens to postMessage({type:'cyberdef:achievement', achievement: {...}})
// from any same-origin source (the colleague's mini-app iframe posts these).
export default function AchievementToast() {
  // Queue of pending toasts; we render the first one for ~4s then pop.
  const [queue, setQueue] = useState([])

  useEffect(() => {
    function onMessage(e) {
      const data = e?.data
      if (!data || typeof data !== 'object') return
      if (data.type !== 'cyberdef:achievement') return
      const a = data.achievement
      if (!a) return
      setQueue(q => [...q, { ...a, _key: Date.now() + Math.random() }])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (queue.length === 0) return
    const t = setTimeout(() => setQueue(q => q.slice(1)), 4200)
    return () => clearTimeout(t)
  }, [queue])

  const current = queue[0]
  if (!current) return null

  const Ic = (TOPIC_ICONS && TOPIC_ICONS[current.icon]) || IcMedal

  return (
    <div
      key={current._key}
      onClick={() => setQueue(q => q.slice(1))}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'min(420px, calc(100vw - 24px))',
        background: 'var(--surface)',
        color: 'var(--ink)',
        borderRadius: 18,
        padding: 12,
        display: 'flex', gap: 12, alignItems: 'center',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border, rgba(0,0,0,.06))',
        animation: 'cyberdef-toast-in .35s cubic-bezier(.2,.7,.2,1)',
        cursor: 'pointer',
      }}
    >
      <div className={`badge-art ${current.tone || 'tone-honey'}`} style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
      }}>
        <Ic size={26} />
      </div>
      <div className="col" style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, color: 'var(--honey-deep)', fontWeight: 800,
          letterSpacing: '.06em', textTransform: 'uppercase',
        }}>
          Новое достижение
        </div>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>{current.name}</div>
        {current.description && (
          <div className="muted tiny" style={{
            fontSize: 11, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {current.description}
          </div>
        )}
      </div>
      <span className="chip honey" style={{ flexShrink: 0 }}>
        <IcStar size={11} /> +{current.points_reward || 0}
      </span>
      <style>{`
        @keyframes cyberdef-toast-in {
          from { opacity: 0; transform: translate(-50%, -16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}
