import { useCallback, useEffect, useState } from 'react'

// Theme preference: 'system' | 'light' | 'dark' (what the user picked)
// Effective theme: 'light' | 'dark' (what is actually applied to <html>)
const STORAGE_KEY = 'cyberdef.theme.pref'

function resolveSystem() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  // Telegram's colorScheme is the source of truth inside the Mini App; fall back
  // to OS preference when running outside Telegram.
  const tg = window.Telegram?.WebApp
  if (tg && (tg.colorScheme === 'light' || tg.colorScheme === 'dark')) {
    return tg.colorScheme
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function readPref() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'system' || v === 'light' || v === 'dark') return v
  } catch {}
  return 'system'
}

function applyToDom(effective) {
  document.documentElement.dataset.theme = effective
  // Broadcast to any same-origin iframe (mini-app) so they stay in sync.
  document.querySelectorAll('iframe').forEach(f => {
    try { f.contentWindow?.postMessage({ type: 'cyberdef:set-theme', theme: effective }, '*') } catch {}
  })
}

export function useTheme() {
  const [pref, setPrefState] = useState(readPref)
  const [effective, setEffective] = useState(() => pref === 'system' ? resolveSystem() : pref)

  // Apply when pref or system changes.
  useEffect(() => {
    const next = pref === 'system' ? resolveSystem() : pref
    setEffective(next)
    applyToDom(next)
  }, [pref])

  // React to TG theme changes (only when on 'system').
  useEffect(() => {
    if (pref !== 'system') return
    const tg = window.Telegram?.WebApp
    if (!tg || typeof tg.onEvent !== 'function') return
    const handler = () => {
      const next = resolveSystem()
      setEffective(next)
      applyToDom(next)
    }
    tg.onEvent('themeChanged', handler)
    return () => { try { tg.offEvent?.('themeChanged', handler) } catch {} }
  }, [pref])

  // React to OS prefers-color-scheme changes too (only when on 'system').
  useEffect(() => {
    if (pref !== 'system' || typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      const next = resolveSystem()
      setEffective(next)
      applyToDom(next)
    }
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [pref])

  const setPref = useCallback((next) => {
    if (next !== 'system' && next !== 'light' && next !== 'dark') return
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    setPrefState(next)
  }, [])

  return { pref, effective, setPref }
}
