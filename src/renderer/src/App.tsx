import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import ProjectListPage from './pages/ProjectListPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ApiMonitorPage from './pages/ApiMonitorPage'
import ApiMetricsPage from './pages/ApiMetricsPage'
import DbMonitorPage from './pages/DbMonitorPage'
import PortManagerPage from './pages/PortManagerPage'
import ProcessDashboardPage from './pages/ProcessDashboardPage'
import LogViewerPage from './pages/LogViewerPage'
import SettingsPage from './pages/SettingsPage'
import { useIpcListeners } from './hooks/use-ipc-listeners'
import { useProjectStore } from './stores/project-store'
import { useSystemStore } from './stores/system-store'

export default function App() {
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const startMonitoring = useSystemStore((s) => s.startMonitoring)

  // Subscribe to all IPC events
  useIpcListeners()

  // Initial data load
  useEffect(() => {
    loadProjects()
    startMonitoring()
  }, [])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/api-monitor" element={<ApiMonitorPage />} />
        <Route path="/api-monitor/metrics" element={<ApiMetricsPage />} />
        <Route path="/db-monitor" element={<DbMonitorPage />} />
        <Route path="/ports" element={<PortManagerPage />} />
        <Route path="/processes" element={<ProcessDashboardPage />} />
        <Route path="/logs" element={<LogViewerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
