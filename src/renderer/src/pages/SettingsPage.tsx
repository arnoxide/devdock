import { useEffect, useState } from 'react'
import { useSettingsStore } from '../stores/settings-store'
import { useGitStore } from '../stores/git-store'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import { AlertTriangle, Download, RotateCcw, GitBranch, Key, Copy, CheckCircle, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const exportSettings = useSettingsStore((s) => s.exportSettings)
  const resetSettings = useSettingsStore((s) => s.resetSettings)

  const sshKey = useGitStore((s) => s.sshKey)
  const loadSshKey = useGitStore((s) => s.loadSshKey)
  const generateSshKey = useGitStore((s) => s.generateSshKey)
  const testSshConnection = useGitStore((s) => s.testSshConnection)

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadSettings()
    loadSshKey()
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

  const handleGenerateKey = async () => {
    const email = prompt('Enter your GitHub email for the SSH key:')
    if (!email) return
    setIsGeneratingKey(true)
    try {
      await generateSshKey(email)
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      const result = await testSshConnection()
      setTestResult(result)
    } finally {
      setIsTesting(false)
    }
  }

  const copyToClipboard = () => {
    if (sshKey?.publicKey) {
      navigator.clipboard.writeText(sshKey.publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!settings) {
    return <div className="text-dock-muted text-sm px-6 py-4">Loading settings...</div>
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
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

                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-dock-bg/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-dock-text">Launch at Startup</p>
                    <p className="text-xs text-dock-muted">
                      Start DevDock automatically when you log in
                    </p>
                  </div>
                  <button
                    onClick={() => updateSettings({ launchAtStartup: !settings.launchAtStartup })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-dock-surface focus:ring-2 focus:ring-dock-accent focus:ring-offset-2 ${settings.launchAtStartup ? 'bg-dock-accent' : 'bg-dock-card border border-dock-border'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.launchAtStartup ? 'translate-x-6' : 'translate-x-1'
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

      {/* SSH & Git Configuration */}
      <section className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-4 bg-dock-accent rounded-full" />
          <h2 className="text-sm font-bold text-dock-text uppercase tracking-wider">SSH & Git Configuration</h2>
        </div>

        <Card>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-dock-accent/10 text-dock-accent">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-dock-text">SSH Key Management</h3>
                  <p className="text-xs text-dock-muted">Authenticate with GitHub via SSH</p>
                </div>
              </div>

              {!sshKey?.hasKey ? (
                <div className="p-4 rounded-xl border border-dashed border-dock-border bg-dock-bg/30 text-center space-y-3">
                  <p className="text-xs text-dock-muted italic">No SSH key found in ~/.ssh/id_rsa</p>
                  <Button
                    size="sm"
                    onClick={handleGenerateKey}
                    disabled={isGeneratingKey}
                  >
                    {isGeneratingKey ? 'Generating...' : 'Generate New SSH Key'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-dock-bg border border-dock-border font-mono text-[10px] break-all relative group">
                    <div className="max-h-24 overflow-y-auto pr-8">
                      {sshKey.publicKey}
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 p-1.5 rounded bg-dock-surface border border-dock-border text-dock-muted hover:text-dock-accent transition-colors"
                    >
                      {copied ? <CheckCircle size={14} className="text-dock-green" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={copyToClipboard} className="flex-1">
                      <Copy size={14} className="mr-2" />
                      Copy Public Key
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleGenerateKey} className="text-dock-muted">
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-dock-accent/10 text-dock-accent">
                  <GitBranch size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-dock-text">Git Auth Test</h3>
                  <p className="text-xs text-dock-muted">Verify your connection to GitHub</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-dock-surface border border-dock-border space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-dock-text">GitHub (SSH)</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={isTesting || !sshKey?.hasKey}
                  >
                    {isTesting ? <RefreshCw size={14} className="animate-spin mr-2" /> : null}
                    Test Connection
                  </Button>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-lg text-[11px] leading-relaxed ${testResult.success ? 'bg-dock-green/10 text-dock-green border border-dock-green/20' : 'bg-dock-red/10 text-dock-red border border-dock-red/20'
                    }`}>
                    <p className="font-bold mb-1">{testResult.success ? 'Success' : 'Failed'}</p>
                    <p className="opacity-90">{testResult.message}</p>
                  </div>
                )}

                <div className="text-[10px] text-dock-muted space-y-1 mt-2">
                  <p>• Make sure to add your public key to GitHub settings.</p>
                  <p>• Only id_rsa is currently supported for automatic configuration.</p>
                </div>
              </div>

              {/* Troubleshooting Info */}
              <div className="p-4 rounded-xl bg-dock-accent/5 border border-dock-accent/10 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-dock-accent" />
                  <h4 className="text-xs font-bold text-dock-text">Why see "Key already in use"?</h4>
                </div>
                <p className="text-[11px] text-dock-muted leading-relaxed">
                  If GitHub says your key is already in use, it means you've already added this public key to an account.
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] text-dock-text font-medium">What to do:</p>
                  <p className="text-[10px] text-dock-muted ml-2">1. Use the "Test Connection" button above.</p>
                  <p className="text-[10px] text-dock-muted ml-2">2. If it succeeds, your key is ready! You don't need to add it again.</p>
                  <p className="text-[10px] text-dock-muted ml-2">3. If it fails, check if you added the key to a different GitHub account.</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

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
              <p>Built by theboxco | <span className="text-dock-accent font-medium">Arnold Masutha.</span></p>
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
