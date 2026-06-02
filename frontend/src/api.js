const BASE = import.meta.env.VITE_API_URL || '/api'

function getInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData
  }
  // Dev fallback — set VITE_DEV_USER in .env.local
  return import.meta.env.VITE_DEV_USER || '{"id":1,"first_name":"Test"}'
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `tma ${getInitData()}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

// ── Users ──────────────────────────────────────────────────────────────────
export const getMe = () => request('/me')
export const updateMe = (body) => request('/me', { method: 'PATCH', body: JSON.stringify(body) })
export const pingActivity = () => request('/me/ping', { method: 'POST' })
export const getMyStats = () => request('/me/stats')
export const getActivityWeek = () => request('/me/activity-week')

// ── Topics ─────────────────────────────────────────────────────────────────
export const getTopics = () => request('/topics')
export const getTopic = (id) => request(`/topics/${id}`)

// ── Games ──────────────────────────────────────────────────────────────────
export const startGame = (gameId) => request(`/topics/games/${gameId}/start`, { method: 'POST' })
export const finishGame = (gameId, body) =>
  request(`/topics/games/${gameId}/finish`, { method: 'POST', body: JSON.stringify(body) })

// ── Achievements ────────────────────────────────────────────────────────────
export const getAchievements = () => request('/achievements')

// ── Parent ──────────────────────────────────────────────────────────────────
export const requestLinkCode = () => request('/parent/link/request', { method: 'POST' })
export const confirmLink = (code) =>
  request('/parent/link/confirm', { method: 'POST', body: JSON.stringify({ code }) })
export const getChildren = () => request('/parent/children')
export const getChildStats = (id) => request(`/parent/children/${id}/stats`)

// ── Notifications ───────────────────────────────────────────────────────────
export const getNotifications = () => request('/notifications')
export const markAllRead = () => request('/notifications/read-all', { method: 'POST' })
export const markRead = (id) => request(`/notifications/${id}/read`, { method: 'POST' })
