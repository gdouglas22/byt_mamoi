import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { IcShield, IcMap, IcMedal, IcArrow, IcStar, IcSpark, IcHeart, IcKey, IcFire, IcBolt } from '../icons'
import { updateMe } from '../api'

const AVATARS = [
  { c: '#DBE8F8', f: '#2F5B9A', I: IcShield  },
  { c: '#FCEFC9', f: '#8A6915', I: IcSpark   },
  { c: '#D6EEE6', f: '#2E7E64', I: IcHeart   },
  { c: '#F8DADA', f: '#9A3E3E', I: IcKey     },
  { c: '#DEDBF3', f: '#4F4990', I: IcFire    },
  { c: '#F8DCC7', f: '#9A5526', I: IcBolt    },
  { c: '#C8DEF0', f: '#25517A', I: IcStar    },
  { c: '#E0D2F0', f: '#6A3FA3', I: IcMedal   },
]

const AGES = [7, 8, 9, 10, 11, 12]

// Step 1 — Welcome
function Step1({ onNext, onParent }) {
  return (
    <div className="screen-body" style={{ padding: 0 }}>
      <div style={{ padding: '24px 18px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #fff, #DCE9F8 70%)',
          display: 'grid', placeItems: 'center', position: 'relative',
          boxShadow: 'inset 0 0 0 12px rgba(255,255,255,.7), 0 24px 40px rgba(91,143,217,0.18)',
        }}>
          <div style={{
            width: 130, height: 150,
            background: 'linear-gradient(160deg, #5B8FD9, #82B0E8)',
            clipPath: 'path("M65 0 L130 25 L130 90 Q130 130 65 150 Q0 130 0 90 L0 25 Z")',
            display: 'grid', placeItems: 'center', color: '#fff',
          }}>
            <IcShield size={64} />
          </div>
          <div style={{ position: 'absolute', top: 18, right: 24, width: 18, height: 18, background: '#F4C95D', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: 32, left: 12, width: 14, height: 14, background: '#9FD8C7', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: 70, left: -4, width: 10, height: 10, background: '#C7C4EF', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -2, right: 28, width: 22, height: 22, background: '#FCEFC9', borderRadius: '50%' }} />
        </div>
      </div>

      <div style={{ padding: '28px 22px 0', textAlign: 'center' }}>
        <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--primary-deep)' }}>Фонд «Быть мамой»</div>
        <h1 className="h-display h1">Привет, юный<br />защитник!</h1>
        <p className="muted" style={{ margin: '12px 6px 0', fontSize: 14 }}>
          Здесь ты научишься распознавать<br />опасности в интернете — играя.
        </p>
      </div>

      <div style={{ padding: '24px 22px 22px', marginTop: 'auto' }}>
        <div className="dots" style={{ marginBottom: 18 }}>
          <i className="on" /><i /><i />
        </div>
        <button className="btn btn-primary btn-block btn-lg" onClick={onNext}>
          Поехали <IcArrow size={18} />
        </button>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
          У меня уже есть аккаунт родителя ·{' '}
          <span className="linklike" onClick={onParent}>Я — родитель</span>
        </div>
      </div>
    </div>
  )
}

// Step 2 — How it works
function Step2({ onNext }) {
  const steps = [
    { n: 1, t: 'Выбери тему', d: 'Фишинг, пароли, личные данные — что хочешь изучить', tone: 'tone-blue', I: IcMap },
    { n: 2, t: 'Сыграй в мини-игру', d: 'Короткая игра 3–5 минут с разбором ошибок', tone: 'tone-honey', I: IcShield },
    { n: 3, t: 'Получи бейдж', d: 'Открой достижение и поднимись в рейтинге', tone: 'tone-mint', I: IcMedal },
  ]
  return (
    <div className="screen-body" style={{ padding: 0 }}>
      <div style={{ padding: '20px 22px 0' }}>
        <h2 className="h-display h2" style={{ textAlign: 'center' }}>Как устроена<br />тренировка</h2>
        <p className="muted" style={{ textAlign: 'center', margin: '10px 0 0', fontSize: 13 }}>
          Три простых шага и ты в безопасности
        </p>
      </div>

      <div className="col gap-12" style={{ padding: '24px 22px 0' }}>
        {steps.map(({ n, t, d, tone, I }) => (
          <div key={n} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className={`topic-ic ${tone}`} style={{ position: 'relative' }}>
              <I />
              <div style={{
                position: 'absolute', bottom: -4, right: -4, width: 20, height: 20,
                background: 'var(--surface)', borderRadius: '50%', display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: 'var(--ink)',
                boxShadow: 'var(--shadow-sm)',
              }}>{n}</div>
            </div>
            <div className="col" style={{ gap: 2 }}>
              <div className="h3">{t}</div>
              <div className="muted" style={{ fontSize: 12 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '24px 22px 22px', marginTop: 'auto' }}>
        <div className="dots" style={{ marginBottom: 18 }}>
          <i /><i className="on" /><i />
        </div>
        <button className="btn btn-primary btn-block btn-lg" onClick={onNext}>
          Дальше <IcArrow size={18} />
        </button>
      </div>
    </div>
  )
}

// Step 3 — Personalization
function Step3({ onDone }) {
  const [avatar, setAvatar] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState(9)
  const [saving, setSaving] = useState(false)

  async function handleDone() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateMe({
        name: name.trim(),
        age,
        avatar: AVATARS[avatar].I.name || String(avatar),
        onboarding_done: true,
      })
      onDone()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="screen-body" style={{ padding: 0 }}>
      <div style={{ padding: '20px 22px 0' }}>
        <h2 className="h-display h2" style={{ textAlign: 'center' }}>Расскажи о себе</h2>
        <p className="muted" style={{ textAlign: 'center', margin: '10px 0 0', fontSize: 13 }}>
          Выбери аватар — он встретит тебя в игре
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '24px 22px 0' }}>
        {AVATARS.map(({ c, f, I }, i) => (
          <div
            key={i}
            onClick={() => setAvatar(i)}
            style={{
              aspectRatio: 1, borderRadius: 18,
              background: c, color: f,
              display: 'grid', placeItems: 'center',
              border: avatar === i ? '3px solid var(--primary)' : '3px solid transparent',
              boxShadow: avatar === i ? '0 4px 14px rgba(91,143,217,.25)' : 'none',
              cursor: 'pointer',
            }}
          >
            <I size={28} />
          </div>
        ))}
      </div>

      <div className="col gap-10" style={{ padding: '22px 22px 0' }}>
        <label className="eyebrow">Как тебя зовут?</label>
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Введи своё имя"
        />
      </div>

      <div className="col gap-10" style={{ padding: '18px 22px 0' }}>
        <label className="eyebrow">Сколько тебе лет?</label>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          {AGES.map(a => (
            <span
              key={a}
              className={a === age ? 'chip lg' : 'chip lg ghost'}
              onClick={() => setAge(a)}
              style={{ cursor: 'pointer' }}
            >{a}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 22px 22px', marginTop: 'auto' }}>
        <div className="dots" style={{ marginBottom: 18 }}>
          <i /><i /><i className="on" />
        </div>
        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={handleDone}
          disabled={!name.trim() || saving}
          style={{ opacity: !name.trim() ? .5 : 1 }}
        >
          {saving ? 'Сохраняем…' : 'Начать обучение'}
        </button>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export default function Onboarding() {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  return (
    <Shell>
      {step === 1 && (
        <Step1
          onNext={() => setStep(2)}
          onParent={() => navigate('/parent/link')}
        />
      )}
      {step === 2 && <Step2 onNext={() => setStep(3)} />}
      {step === 3 && <Step3 onDone={() => navigate('/menu', { replace: true })} />}
    </Shell>
  )
}
