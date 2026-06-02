import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTelegram } from './hooks/useTelegram'
import { useTheme } from './hooks/useTheme'
import { getMe, pingActivity } from './api'
import { LoadingScreen } from './components/Shell'
import AchievementToast from './components/AchievementToast'

import Onboarding from './screens/Onboarding'
import MainMenu from './screens/MainMenu'
import PlayScreen from './screens/PlayScreen'
import Profile from './screens/Profile'
import Achievements from './screens/Achievements'
import NotificationsScreen from './screens/Notifications'
import {
  ParentLink1, ParentLink2, ParentLinkEnter,
  ParentDashboard, ParentNotifications,
} from './screens/ParentScreens'

export default function App() {
  useTelegram()
  useTheme()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      try {
        const me = await getMe()
        setUser(me)
        await pingActivity().catch(() => {})
      } catch {
        // auth failed — still render onboarding
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [])

  if (loading) return <LoadingScreen />

  const startRoute = !user?.onboarding_done ? '/onboarding' : '/menu'

  return (
    <HashRouter>
      <AchievementToast />
      <Routes>
        <Route path="/" element={<Navigate to={startRoute} replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/menu" element={<MainMenu />} />
        <Route path="/play" element={<PlayScreen />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/notifications" element={<NotificationsScreen />} />
        <Route path="/parent/link" element={<ParentLink1 />} />
        <Route path="/parent/link/code" element={<ParentLink2 />} />
        <Route path="/parent/link/enter" element={<ParentLinkEnter />} />
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/notifications" element={<ParentNotifications />} />
        <Route path="*" element={<Navigate to={startRoute} replace />} />
      </Routes>
    </HashRouter>
  )
}
