import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Activity,
  Database,
  Network,
  Cpu,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Globe,
  Zap,
  Github
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/api-monitor', icon: Activity, label: 'API Monitor' },
  { to: '/db-monitor', icon: Database, label: 'Databases' },
  { to: '/production', icon: Globe, label: 'Production' },
  { to: '/github', icon: Github, label: 'GitHub' },
  { to: '/ports', icon: Network, label: 'Ports' },
  { to: '/processes', icon: Cpu, label: 'Processes' },
  { to: '/logs', icon: ScrollText, label: 'Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' }
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`flex flex-col h-full bg-dock-surface border-r border-dock-border transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo area */}
      <div className="flex items-center h-12 px-3 border-b border-dock-border drag-region">
        <div className="flex items-center gap-2 no-drag">
          <div className="w-8 h-8 rounded-lg bg-dock-accent flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-base text-dock-text tracking-tight">
              DevDock
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-dock-accent/10 text-dock-accent'
                  : 'text-dock-muted hover:text-dock-text hover:bg-dock-card'
              }`
            }
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-dock-border text-dock-muted hover:text-dock-text transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
