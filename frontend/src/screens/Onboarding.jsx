import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { IcArrow } from '../icons'
import { updateMe, getMe } from '../api'
import { useApi } from '../hooks/useApi'

// Captain Мяу assets are served by our backend from mini-app/ at /games/*.
const MENTOR = {
  happy:     '/games/assets/mentor/happy.jpg',
  idle:      '/games/assets/mentor/idle.jpg',
  surprised: '/games/assets/mentor/surprised.jpg',
  sad:       '/games/assets/mentor/sad.jpg',
}

const AGES = [7, 8, 9, 10, 11, 12]

function SceneShell({ avatar, name = 'Капитан Мяу', text, children, footer, totalDots = 4, activeDot = 0 }) {
  return (
    <div className="screen-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{
        flex: '0 0 auto',
        padding: '24px 18px 12px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #fff, #DCE9F8 70%)',
          display: 'grid', placeItems: 'center',
          boxShadow: 'inset 0 0 0 12px rgba(255,255,255,.7), 0 24px 40px rgba(91,143,217,.18)',
          overflow: 'hidden',
        }}>
          <img
            src={MENTOR[avatar] || MENTOR.idle}
            alt={name}
            style={{ width: '78%', height: '78%', objectFit: 'cover', borderRadius: '50%' }}
          />
        </div>
      </div>

      <div style={{ padding: '8px 22px 0', textAlign: 'center' }}>
        <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--primary-deep)' }}>{name}</div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--ink-1)' }}>{text}</p>
      </div>

      {children && (
        <div style={{ padding: '20px 22px 0' }}>
          {children}
        </div>
      )}

      <div style={{ padding: '24px 22px 22px', marginTop: 'auto' }}>
        <div className="dots" style={{ marginBottom: 18 }}>
          {Array.from({ length: totalDots }).map((_, i) => (
            <i key={i} className={i === activeDot ? 'on' : ''} />
          ))}
        </div>
        {footer}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { data: me } = useApi(getMe)

  // Если HashRouter восстановил URL /onboarding, а пользователь уже одобрен как
  // родитель — никакого детского онбординга. Сразу в родительский дашборд.
  // Аналогично если онбординг уже пройден — на /menu.
  useEffect(() => {
    if (!me) return
    if (me.is_parent) navigate('/parent', { replace: true })
    else if (me.onboarding_done) navigate('/menu', { replace: true })
  }, [me, navigate])

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState(9)
  const [saving, setSaving] = useState(false)

  const trimmedName = name.trim()

  async function finish() {
    if (!trimmedName) return
    setSaving(true)
    try {
      // Завершение онбординга → тур ещё не пройден (флаг живёт на сервере).
      await updateMe({ name: trimmedName, age, onboarding_done: true, tour_home_done: false })
      navigate('/menu', { replace: true })
    } catch {
      setSaving(false)
    }
  }

  // Scene 0 — Greeting + name
  if (step === 0) {
    return (
      <Shell>
        <SceneShell
          avatar="happy"
          text="Мяу! Я Капитан Мяу — наставник Кибер-Академии Круга Безопасности. А как тебя зовут? 🐱"
          totalDots={4}
          activeDot={0}
          footer={
            <>
              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={() => setStep(1)}
                disabled={!trimmedName}
                style={{ opacity: !trimmedName ? .5 : 1 }}
              >
                Дальше <IcArrow size={18} />
              </button>
              <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
                У меня уже есть аккаунт родителя ·{' '}
                <span className="linklike" onClick={() => navigate('/parent/link')}>Я — родитель</span>
              </div>
            </>
          }
        >
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Введи своё имя"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && trimmedName) setStep(1) }}
          />
        </SceneShell>
      </Shell>
    )
  }

  // Scene 1 — Age
  if (step === 1) {
    return (
      <Shell>
        <SceneShell
          avatar="surprised"
          text={`Здорово, ${trimmedName}! А сколько тебе лет? Я подберу игры по возрасту.`}
          totalDots={4}
          activeDot={1}
          footer={
            <button className="btn btn-primary btn-block btn-lg" onClick={() => setStep(2)}>
              Дальше <IcArrow size={18} />
            </button>
          }
        >
          <div className="row gap-8" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {AGES.map(a => (
              <span
                key={a}
                className={a === age ? 'chip lg' : 'chip lg ghost'}
                onClick={() => setAge(a)}
                style={{ cursor: 'pointer', minWidth: 38, textAlign: 'center' }}
              >{a}</span>
            ))}
          </div>
        </SceneShell>
      </Shell>
    )
  }

  // Scene 2 — Villains
  if (step === 2) {
    return (
      <Shell>
        <SceneShell
          avatar="idle"
          text="В Сети живёт банда злодеев — Спам-Барон, Тролль-Хейтер, Босс-Вирус. Они охотятся на тех, кто не умеет защищаться."
          totalDots={4}
          activeDot={2}
          footer={
            <button className="btn btn-primary btn-block btn-lg" onClick={() => setStep(3)}>
              Дальше <IcArrow size={18} />
            </button>
          }
        />
      </Shell>
    )
  }

  // Scene 3 — Stars + final
  return (
    <Shell>
      <SceneShell
        avatar="happy"
        text="За каждую игру дают звёзды: 0, 1, 2 или 3. А за серии побед — бейджи: это твои достижения, их видно в одноимённой вкладке. Готов? Поехали! 🚀"
        totalDots={4}
        activeDot={3}
        footer={
          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={finish}
            disabled={saving}
          >
            {saving ? 'Запускаем…' : 'Начать обучение'}
          </button>
        }
      />
    </Shell>
  )
}
