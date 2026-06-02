import { useEffect, useLayoutEffect, useState } from 'react'

/**
 * Product tour with spotlight + tooltip.
 *
 * Props:
 *   steps: [{ target: 'data-tour="…"' selector, title?, text, placement?: 'top'|'bottom'|'auto' }]
 *   onDone: () => void
 *
 * The spotlight is a single transparent box positioned over the target element
 * with a giant inset box-shadow that darkens the entire viewport around it —
 * one DOM node, smooth resize on step change.
 */
export default function Tour({ steps, onDone }) {
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null)

  const step = steps[idx]

  // Measure target on step change / window resize / scroll.
  useLayoutEffect(() => {
    if (!step) return
    function measure() {
      const sel = `[data-tour="${step.target}"]`
      const el = document.querySelector(sel)
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      // Add a little padding around the highlight so it doesn't hug pixels.
      const pad = 6
      setRect({
        top:    r.top - pad,
        left:   r.left - pad,
        width:  r.width + pad * 2,
        height: r.height + pad * 2,
      })
    }
    measure()
    // After paint — some layouts (sticky tabbar) settle one frame later.
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

  // Lock background scroll while tour is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (!step) return null

  const isLast = idx === steps.length - 1

  function next() {
    if (isLast) onDone?.()
    else setIdx(i => i + 1)
  }
  function skip() { onDone?.() }

  // Compute tooltip position
  const vh = window.innerHeight
  const tooltipBelow = rect ? (rect.top + rect.height / 2) < vh / 2 : true
  const tooltipStyle = rect ? {
    position: 'fixed',
    left: 12,
    right: 12,
    top: tooltipBelow ? rect.top + rect.height + 14 : undefined,
    bottom: tooltipBelow ? undefined : (vh - rect.top + 14),
    zIndex: 1002,
  } : {
    position: 'fixed',
    left: 12,
    right: 12,
    bottom: 24,
    zIndex: 1002,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'auto' }}>
      {/* Spotlight box — transparent, with huge box-shadow forming the dim overlay */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top, left: rect.left,
            width: rect.width, height: rect.height,
            borderRadius: 16,
            boxShadow: '0 0 0 9999px rgba(8, 12, 20, .72)',
            transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease',
            pointerEvents: 'none',
            zIndex: 1001,
          }}
        />
      )}
      {/* Full overlay when target missing (fallback) */}
      {!rect && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(8, 12, 20, .72)',
          zIndex: 1001,
        }} />
      )}

      <div style={tooltipStyle}>
        <div style={{
          background: 'var(--surface)',
          color: 'var(--ink)',
          borderRadius: 18,
          padding: '16px 16px 14px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border, rgba(0,0,0,.08))',
        }}>
          {step.title && (
            <div style={{
              fontSize: 11, fontWeight: 800, color: 'var(--primary-deep)',
              letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4,
            }}>
              {step.title}
            </div>
          )}
          <div style={{ fontSize: 14, lineHeight: 1.45 }}>{step.text}</div>

          <div className="row between" style={{ marginTop: 14, alignItems: 'center' }}>
            <span className="muted tiny" style={{ fontWeight: 700 }}>
              {idx + 1} / {steps.length}
            </span>
            <div className="row gap-8">
              {!isLast && (
                <button className="btn btn-soft" style={{ padding: '8px 14px', minHeight: 0 }} onClick={skip}>
                  Пропустить
                </button>
              )}
              <button className="btn btn-primary" style={{ padding: '8px 16px', minHeight: 0 }} onClick={next}>
                {isLast ? 'Понятно' : 'Дальше'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
