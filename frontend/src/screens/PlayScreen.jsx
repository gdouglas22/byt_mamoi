import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IcArrowL } from '../icons'

// Full-screen iframe host for the colleague's mini-app (the actual game player).
// initData is forwarded via URL hash so it doesn't leak through HTTP referer.
export default function PlayScreen() {
  const navigate = useNavigate()
  const iframeRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  // The inner app posts `cyberdef:at-root` so we know when to show the exit button.
  // Default to true — at boot we land on his menu (root).
  const [atRoot, setAtRoot] = useState(true)

  const initData = window.Telegram?.WebApp?.initData || ''
  const src = `/games/index.html?embed=1#tg_init_data=${encodeURIComponent(initData)}`

  useEffect(() => {
    function onMessage(e) {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return
      const data = e.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'cyberdef:exit') {
        navigate('/menu', { replace: true })
      } else if (data.type === 'cyberdef:at-root') {
        setAtRoot(!!data.atRoot)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [navigate])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg, #fff)',
      display: 'flex', flexDirection: 'column',
    }}>
      <iframe
        ref={iframeRef}
        src={src}
        title="Кибер-Академия"
        style={{ flex: 1, width: '100%', border: 'none' }}
        allow="autoplay; fullscreen"
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'var(--bg, #fff)',
          display: 'grid', placeItems: 'center',
          zIndex: 5,
        }}>
          <div className="spinner" />
        </div>
      )}
      {atRoot && (
        <button
          type="button"
          aria-label="Назад"
          onClick={() => navigate('/menu', { replace: true })}
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            left: 8,
            width: 36, height: 36,
            borderRadius: 18,
            border: 'none',
            background: 'rgba(0,0,0,.55)',
            color: '#fff',
            display: 'grid', placeItems: 'center',
            cursor: 'pointer',
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <IcArrowL size={18} />
        </button>
      )}
    </div>
  )
}
