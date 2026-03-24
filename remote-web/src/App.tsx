import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { api, getToken, clearAuth } from './api'
import { useAppStore } from './store'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import EditorPage from './pages/EditorPage'
import GitPage from './pages/GitPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn)
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppInit({ children }: { children: React.ReactNode }) {
  const { setLoggedIn } = useAppStore()
  const navigate = useNavigate()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function init() {
      // Check if server is configured — only redirect to /setup if explicitly not configured
      try {
        const status = await api.authStatus()
        if (!status.configured) {
          navigate('/setup', { replace: true })
          return
        }
      } catch {
        // Server unreachable — stay put, don't redirect to setup
        navigate('/login', { replace: true })
        return
      }

      const token = getToken()
      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      try {
        await api.me()
        setLoggedIn(true)
      } catch {
        clearAuth()
        setLoggedIn(false)
        navigate('/login', { replace: true })
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:id"
            element={
              <ProtectedRoute>
                <ProjectPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:id/editor"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:id/git"
            element={
              <ProtectedRoute>
                <GitPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppInit>
    </BrowserRouter>
  )
}
