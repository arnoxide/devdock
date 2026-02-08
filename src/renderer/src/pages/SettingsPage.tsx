import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settings-store'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

export default function SettingsPage() {
  const { settings, loadSettings, updateSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [])

  if (!settings) {
    return <div className="text-dock-muted text-sm">Loading settings...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-dock-text">Settings</h1>
        <p className="text-sm text-dock-muted mt-0.5">
          Configure DevDock behavior and appearance
        </p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-dock-text">General</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            label="Theme"
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' }
            ]}
          />

          <Input
            label="Default Shell"
            value={settings.defaultShell}
            onChange={(e) => updateSettings({ defaultShell: e.target.value })}
            placeholder="/bin/bash"
          />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dock-text">Start Minimized</p>
              <p className="text-xs text-dock-muted">Launch DevDock in the system tray</p>
            </div>
            <button
              onClick={() => updateSettings({ startMinimized: !settings.startMinimized })}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.startMinimized ? 'bg-dock-accent' : 'bg-dock-card'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.startMinimized ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dock-text">Close to Tray</p>
              <p className="text-xs text-dock-muted">
                Keep DevDock running when the window is closed
              </p>
            </div>
            <button
              onClick={() => updateSettings({ closeToTray: !settings.closeToTray })}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.closeToTray ? 'bg-dock-accent' : 'bg-dock-card'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.closeToTray ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Monitoring */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-dock-text">Monitoring</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dock-text">API Monitor</p>
              <p className="text-xs text-dock-muted">
                Automatically monitor registered API endpoints
              </p>
            </div>
            <button
              onClick={() =>
                updateSettings({ apiMonitorEnabled: !settings.apiMonitorEnabled })
              }
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.apiMonitorEnabled ? 'bg-dock-accent' : 'bg-dock-card'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.apiMonitorEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <Input
            label="System Monitor Interval (ms)"
            type="number"
            value={settings.systemMonitorIntervalMs}
            onChange={(e) =>
              updateSettings({ systemMonitorIntervalMs: parseInt(e.target.value) || 3000 })
            }
          />

          <Input
            label="Log Retention (entries per project)"
            type="number"
            value={settings.logRetentionCount}
            onChange={(e) =>
              updateSettings({ logRetentionCount: parseInt(e.target.value) || 5000 })
            }
          />
        </CardBody>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-dock-text">About</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-xs text-dock-muted">
          <p>
            <span className="text-dock-text font-medium">DevDock</span> v1.0.0
          </p>
          <p>Desktop Development Environment Manager</p>
          <p>
            Built with Electron + React + TypeScript
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
