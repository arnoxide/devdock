import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/settings-store'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import { AlertTriangle, Download, RotateCcw } from 'lucide-react'

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const exportSettings = useSettingsStore((s) => s.exportSettings)
  const resetSettings = useSettingsStore((s) => s.resetSettings)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportSettings()
    } finally {
      setIsExporting(false)
    }
  }

  const handleReset = async () => {
    await resetSettings()
    setShowResetConfirm(false)
  }

  if (!settings) {
    return <div className="text-dock-muted text-sm px-6 py-4">Loading settings...</div>
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dock-text tracking-tight">System Settings</h1>
          <p className="text-sm text-dock-muted mt-1">
            Manage your development environment preferences and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download size={14} className="mr-2" />
            {isExporting ? 'Exporting...' : 'Export Config'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-dock-red hover:bg-dock-red/10"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw size={14} className="mr-2" />
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset to Factory Defaults"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-dock-red/5 border border-dock-red/10 text-dock-red">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Are you absolutely sure?</p>
              <p className="mt-1 opacity-90">
                This will reset all your theme preferences, monitoring intervals,
                and behavior settings to their initial state. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset Everything
            </Button>
          </div>
        </div>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-4 bg-dock-accent rounded-full" />
            <h2 className="text-sm font-bold text-dock-text uppercase tracking-wider">Interface & Behavior</h2>
          </div>

          <Card className="h-full">
            <CardBody className="space-y-5">
              <Select
                label="Appearance Theme"
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
                options={[
                  { value: 'dark', label: 'Dark Mode (Default)' },
                  { value: 'light', label: 'Light Mode' }
                ]}
              />

              <Input
                label="Default Terminal Shell"
                value={settings.defaultShell}
                onChange={(e) => updateSettings({ defaultShell: e.target.value })}
                placeholder="/bin/bash"
              />

              <div className="h-px bg-dock-border/30 my-2" />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-dock-bg/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-dock-text">Start Minimized</p>
                    <p className="text-xs text-dock-muted">Automatically start in system tray</p>
                  </div>
                  <button
                    onClick={() => updateSettings({ startMinimized: !settings.startMinimized })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-dock-surface focus:ring-2 focus:ring-dock-accent focus:ring-offset-2 ${settings.startMinimized ? 'bg-dock-accent' : 'bg-dock-card border border-dock-border'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.startMinimized ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-dock-bg/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-dock-text">Close to Tray</p>
                    <p className="text-xs text-dock-muted">
                      Keep running when clicking the close button
                    </p>
                  </div>
                  <button
                    onClick={() => updateSettings({ closeToTray: !settings.closeToTray })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-dock-surface focus:ring-2 focus:ring-dock-accent focus:ring-offset-2 ${settings.closeToTray ? 'bg-dock-accent' : 'bg-dock-card border border-dock-border'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.closeToTray ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Monitoring */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-4 bg-dock-accent rounded-full" />
            <h2 className="text-sm font-bold text-dock-text uppercase tracking-wider">Health & Metrics</h2>
          </div>

          <Card className="h-full">
            <CardBody className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-dock-accent/5 border border-dock-accent/10">
                <div>
                  <p className="text-sm font-bold text-dock-text">API Monitoring</p>
                  <p className="text-xs text-dock-muted">
                    Global switch for all registered endpoints
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateSettings({ apiMonitorEnabled: !settings.apiMonitorEnabled })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.apiMonitorEnabled ? 'bg-dock-accent shadow-lg shadow-dock-accent/20' : 'bg-dock-card border border-dock-border'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.apiMonitorEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Monitor Interval (ms)"
                  type="number"
                  value={settings.systemMonitorIntervalMs}
                  onChange={(e) =>
                    updateSettings({ systemMonitorIntervalMs: parseInt(e.target.value) || 3000 })
                  }
                />

                <Input
                  label="Max Log Entries"
                  type="number"
                  value={settings.logRetentionCount}
                  onChange={(e) =>
                    updateSettings({ logRetentionCount: parseInt(e.target.value) || 5000 })
                  }
                />
              </div>

              <div className="pt-2 px-1">
                <p className="text-[10px] text-dock-muted italic">
                  Note: Sorter intervals increase CPU usage. Default is 3000ms.
                </p>
              </div>
            </CardBody>
          </Card>
        </section>
      </div>

      {/* About Section - Visual Overhaul */}
      <Card className="overflow-hidden bg-gradient-to-br from-dock-surface to-dock-card border-dock-border/50">
        <div className="relative p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-dock-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-dock-accent/10 flex items-center justify-center text-dock-accent border border-dock-accent/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-lg font-bold text-dock-text">DevDock <span className="text-dock-accent text-sm font-medium ml-2">v1.2.4</span></h3>
              <p className="text-sm text-dock-muted mt-1 leading-relaxed">
                The ultimate companion for local development. Automating your workflow,
                monitoring your resources, and streamlining your project management.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1.5 text-xs text-dock-muted border-t md:border-t-0 md:border-l border-dock-border/30 pt-4 md:pt-0 md:pl-6">
              <p className="text-dock-text font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Latest Version Installed
              </p>
              <p>Built by theboxco | <span className="text-dock-accent font-medium">Arnold J.</span></p>
              <div className="flex gap-4 mt-2">
                <a href="#" className="hover:text-dock-accent transition-colors">Changelog</a>
                <a href="#" className="hover:text-dock-accent transition-colors">Documentation</a>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
