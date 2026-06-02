import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, TabBar, LoadingScreen } from '../components/Shell'
import {
  IcShield, IcStar, IcMedal,
  IcUser, IcLink, IcCheck, IcX, IcChevron, IcSpark,
} from '../icons'
import { useApi } from '../hooks/useApi'
import { useTheme } from '../hooks/useTheme'
import { getMe, getAchievements, updateMe } from '../api'

const THEME_LABEL = { system: 'Системная', light: 'Светлая', dark: 'Тёмная' }

export default function Profile() {
  const navigate = useNavigate()
  const { pref: themePref, setPref: setThemePref } = useTheme()
  const { data: user, loading: lu, reload: reloadUser } = useApi(getMe)
  const { data: achievements, loading: la } = useApi(getAchievements)

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [editingAge, setEditingAge] = useState(false)
  const [ageDraft, setAgeDraft] = useState('')
  const [saving, setSaving] = useState(false)

  if (lu || la) return <LoadingScreen />

  const earned = (achievements || []).filter(a => a.earned)

  const level = Math.floor((user?.points || 0) / 100) + 1
  const levelLabel = ['Новичок', 'Любопытный', 'Знающий', 'Знающий защитник', 'Эксперт'][Math.min(level - 1, 4)]
  const levelPct = ((user?.points || 0) % 100)

  async function saveName() {
    const name = nameDraft.trim()
    if (!name || name === user?.name) { setEditingName(false); return }
    setSaving(true)
    try {
      await updateMe({ name })
      await reloadUser?.()
    } finally {
      setSaving(false)
      setEditingName(false)
    }
  }

  async function saveAge() {
    const n = parseInt(ageDraft, 10)
    if (!Number.isFinite(n) || n < 6 || n > 18 || n === user?.age) {
      setEditingAge(false)
      return
    }
    setSaving(true)
    try {
      await updateMe({ age: n })
      await reloadUser?.()
    } finally {
      setSaving(false)
      setEditingAge(false)
    }
  }

  return (
    <Shell>
      <div className="screen-body">
        <div className="row between" style={{ marginTop: 4, alignItems: 'center' }}>
          <div className="h3">Профиль</div>
        </div>

        {/* Profile header */}
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', marginTop: 6, gap: 4 }}>
          <div className="avatar lg" style={{ background: '#DBE8F8', color: '#2F5B9A' }}>
            <IcShield size={40} />
          </div>
          <div className="h-display h2" style={{ marginTop: 8 }}>
            {user?.name || 'Игрок'}{user?.age ? `, ${user.age} лет` : ''}
          </div>
          <div className="muted tiny">
            Защитник · с {new Date(user?.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'long' })}
          </div>
          <div className="row gap-8" style={{ marginTop: 10 }}>
            <span className="chip honey lg"><IcStar size={12} /> {user?.points || 0} баллов</span>
            <span className="chip lg"><IcMedal size={12} /> {earned.length} бейджей</span>
          </div>
        </div>

        {/* Level */}
        <div className="card" style={{ marginTop: 16, padding: 14 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <div className="row gap-8">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#DBE8F8', color: '#2F5B9A', display: 'grid', placeItems: 'center' }}>
                <IcShield size={18} />
              </div>
              <div className="col" style={{ gap: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Уровень {level}</div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{levelLabel}</div>
              </div>
            </div>
            <div className="muted tiny" style={{ fontWeight: 700 }}>{user?.points || 0} / {level * 100}</div>
          </div>
          <div className="bar"><i style={{ width: `${levelPct}%` }} /></div>
        </div>

        {/* Settings */}
        <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Настройки</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 80 }}>
          {/* Name */}
          <SettingsRow
            icon={<IcUser size={18} />}
            label="Имя"
            value={
              editingName ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  style={{
                    border: 'none', outline: 'none', background: 'transparent',
                    textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', width: 140,
                  }}
                />
              ) : (user?.name || '—')
            }
            right={
              editingName ? (
                <div className="row gap-8">
                  <button className="icon-btn" disabled={saving} onClick={saveName}><IcCheck size={16} /></button>
                  <button className="icon-btn" onClick={() => setEditingName(false)}><IcX size={16} /></button>
                </div>
              ) : <IcChevron size={14} />
            }
            onClick={() => {
              if (editingName) return
              setNameDraft(user?.name || '')
              setEditingName(true)
            }}
          />

          {/* Age */}
          <SettingsRow
            icon={<IcStar size={18} />}
            label="Возраст"
            value={
              editingAge ? (
                <input
                  autoFocus
                  type="number"
                  min={6}
                  max={18}
                  value={ageDraft}
                  onChange={e => setAgeDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveAge(); if (e.key === 'Escape') setEditingAge(false) }}
                  style={{
                    border: 'none', outline: 'none', background: 'transparent',
                    textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', width: 60,
                  }}
                />
              ) : (user?.age ? `${user.age} лет` : '—')
            }
            right={
              editingAge ? (
                <div className="row gap-8">
                  <button className="icon-btn" disabled={saving} onClick={saveAge}><IcCheck size={16} /></button>
                  <button className="icon-btn" onClick={() => setEditingAge(false)}><IcX size={16} /></button>
                </div>
              ) : <IcChevron size={14} />
            }
            onClick={() => {
              if (editingAge) return
              setAgeDraft(user?.age ? String(user.age) : '')
              setEditingAge(true)
            }}
          />

          {/* Theme — inline segmented control */}
          <div className="row" style={{
            padding: '14px 14px', gap: 12, alignItems: 'center',
            borderBottom: '1px solid var(--ink-line, rgba(0,0,0,.06))',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--primary-50, #EEF3FB)', color: 'var(--ink-2, #4B5A78)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <IcSpark size={18} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Тема</div>
            <div className="seg">
              {['system', 'light', 'dark'].map(t => (
                <button
                  key={t}
                  className={themePref === t ? 'on' : ''}
                  onClick={() => setThemePref(t)}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  {THEME_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Parent link */}
          <SettingsRow
            icon={<IcLink size={18} />}
            label={user?.parent_linked ? 'Родитель' : 'Привязать родителя'}
            value={user?.parent_linked ? 'Привязан' : ''}
            right={user?.parent_linked
              ? <IcCheck size={16} style={{ color: 'var(--mint-deep, #2E7E64)' }} />
              : <IcChevron size={14} />}
            onClick={() => { if (!user?.parent_linked) navigate('/parent/link') }}
            last
          />
        </div>
      </div>
      <TabBar active="me" />
    </Shell>
  )
}

function SettingsRow({ icon, label, value, right, onClick, last }) {
  return (
    <div
      className="row"
      onClick={onClick}
      style={{
        padding: '14px 14px',
        gap: 12,
        alignItems: 'center',
        borderBottom: last ? 'none' : '1px solid var(--ink-line, rgba(0,0,0,.06))',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--primary-50, #EEF3FB)', color: 'var(--ink-2, #4B5A78)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{label}</div>
      <div className="muted tiny" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{value}</div>
      <div style={{ color: 'var(--ink-4)', display: 'grid', placeItems: 'center' }}>{right}</div>
    </div>
  )
}
