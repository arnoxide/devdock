import { useEffect, ReactNode } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ErrorBoundary from './components/ui/ErrorBoundary'
import DashboardPage from './pages/DashboardPage'
import ProjectListPage from './pages/ProjectListPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ApiMonitorPage from './pages/ApiMonitorPage'
import ApiMetricsPage from './pages/ApiMetricsPage'
import DbMonitorPage from './pages/DbMonitorPage'
import PortManagerPage from './pages/PortManagerPage'
import ProcessDashboardPage from './pages/ProcessDashboardPage'
import LogViewerPage from './pages/LogViewerPage'
import ProdMetricsPage from './pages/ProdMetricsPage'
import GitHubPage from './pages/GitHubPage'
import SettingsPage from './pages/SettingsPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import { useIpcListeners } from './hooks/use-ipc-listeners'
import { useProjectStore } from './stores/project-store'
import { useSystemStore } from './stores/system-store'
import { useApiMonitorStore } from './stores/api-monitor-store'
import { useDbMonitorStore } from './stores/db-monitor-store'
import { useGitHubStore } from './stores/github-store'
import { useSettingsStore } from './stores/settings-store'

function PageBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <ErrorBoundary key={pathname} fallbackMessage="This page encountered an error">{children}</ErrorBoundary>
}

export default function App() {
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const startMonitoring = useSystemStore((s) => s.startMonitoring)
  const loadEndpoints = useApiMonitorStore((s) => s.loadEndpoints)
  const loadGitHubCredentials = useGitHubStore((s) => s.loadCredentials)
  const startGitHubPolling = useGitHubStore((s) => s.startPolling)
  const theme = useSettingsStore((s) => s.settings?.theme)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const loadDbConnections = useDbMonitorStore((s) => s.loadConnections)

  // Subscribe to all IPC events
  useIpcListeners()

  // Initial data load
  useEffect(() => {
    loadProjects()
    startMonitoring()
    loadEndpoints()
    loadSettings()
    loadDbConnections()
    loadGitHubCredentials().then(() => startGitHubPolling())
  }, [])

  // Apply theme
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<PageBoundary><DashboardPage /></PageBoundary>} />
        <Route path="/projects" element={<PageBoundary><ProjectListPage /></PageBoundary>} />
        <Route path="/projects/:id" element={<PageBoundary><ProjectDetailPage /></PageBoundary>} />
        <Route path="/api-monitor" element={<PageBoundary><ApiMonitorPage /></PageBoundary>} />
        <Route path="/api-monitor/metrics" element={<PageBoundary><ApiMetricsPage /></PageBoundary>} />
        <Route path="/db-monitor" element={<PageBoundary><DbMonitorPage /></PageBoundary>} />
        <Route path="/production" element={<PageBoundary><ProdMetricsPage /></PageBoundary>} />
        <Route path="/github" element={<PageBoundary><GitHubPage /></PageBoundary>} />
        <Route path="/ports" element={<PageBoundary><PortManagerPage /></PageBoundary>} />
        <Route path="/processes" element={<PageBoundary><ProcessDashboardPage /></PageBoundary>} />
        <Route path="/logs" element={<PageBoundary><LogViewerPage /></PageBoundary>} />
        <Route path="/settings" element={<PageBoundary><SettingsPage /></PageBoundary>} />
        <Route path="/notifications" element={<PageBoundary><NotificationsPage /></PageBoundary>} />
        <Route path="/profile" element={<PageBoundary><ProfilePage /></PageBoundary>} />
      </Route>
    </Routes>
  )
}
