import { useEffect, useState } from 'react'
import { User, Mail, Save, RefreshCw, Terminal, GitBranch, Shield, Info, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import type { GlobalSettings } from '../../../shared/types'

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('') || '?'
}

export default function ProfilePage() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null)
  const [form, setForm] = useState({ displayName: '', username: '', email: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Remote credentials
  const [remoteStatus, setRemoteStatus] = useState<{ configured: boolean; username: string } | null>(null)
  const [remoteForm, setRemoteForm] = useState({ username: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [remoteSaving, setRemoteSaving] = useState(false)
  const [remoteMsg, setRemoteMsg] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    window.api.getSettings().then((s: GlobalSettings) => {
      setSettings(s)
      setForm({
        displayName: s.profile?.displayName || '',
        username: s.profile?.username || '',
        email: s.profile?.email || '',
        bio: s.profile?.bio || '',
      })
    })
    window.api.getRemoteStatus().then((s: { configured: boolean; username: string }) => {
      setRemoteStatus(s)
      if (s.username) setRemoteForm((f) => ({ ...f, username: s.username }))
    })
  }, [])

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    const updated: GlobalSettings = { ...settings, profile: { ...form } }
    await window.api.updateSettings(updated)
    setSettings(updated)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  async function applyGitIdentity() {
    const cmd = `git config --global user.name "${form.displayName}" && git config --global user.email "${form.email}"`
    await navigator.clipboard.writeText(cmd)
  }

  async function handleRemoteSave() {
    setRemoteMsg(null)
    if (!remoteForm.username.trim() || !remoteForm.password) {
      setRemoteMsg({ text: 'Username and password are required.', ok: false })
      return
    }
    if (remoteForm.password !== remoteForm.confirm) {
      setRemoteMsg({ text: 'Passwords do not match.', ok: false })
      return
    }
    setRemoteSaving(true)
    try {
      await window.api.setRemoteCredentials(remoteForm.username.trim(), remoteForm.password)
      setRemoteStatus({ configured: true, username: remoteForm.username.trim() })
      setRemoteForm((f) => ({ ...f, password: '', confirm: '' }))
      setRemoteMsg({ text: 'Credentials updated. Restart the app for changes to take effect.', ok: true })
    } catch (e: any) {
      setRemoteMsg({ text: e.message || 'Failed to save credentials.', ok: false })
    } finally {
      setRemoteSaving(false)
    }
  }

  const avatarText = initials(form.displayName)

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-dock-accent to-dock-purple flex items-center justify-center text-white text-2xl font-bold border-4 border-dock-surface shadow-xl select-none">
          {avatarText}
        </div>
        <div>
          <h1 className="text-xl font-bold text-dock-text">{form.displayName || 'Your Name'}</h1>
          {form.email && (
            <p className="text-dock-muted flex items-center gap-1.5 text-sm mt-0.5">
              <Mail size={13} /> {form.email}
            </p>
          )}
          {form.username && (
            <p className="text-dock-muted flex items-center gap-1.5 text-xs mt-0.5">
              <User size={12} /> @{form.username}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Identity */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <User size={15} className="text-dock-accent" /> Identity
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-dock-muted ml-1">Display Name</label>
                  <Input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="Arnold Masutha" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-dock-muted ml-1">Username</label>
                  <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="arnoxide" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-dock-muted ml-1">Email</label>
                <Input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="arnold.letscode@gmail.com" type="email" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-dock-muted ml-1">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                  className="w-full bg-dock-bg border border-dock-border rounded-lg p-3 text-sm text-dock-text focus:outline-none focus:ring-1 focus:ring-dock-accent transition-all min-h-[80px] resize-none placeholder:text-dock-muted/40"
                  placeholder="Full-stack dev, coffee addict..."
                />
              </div>
              <div className="flex justify-end pt-1">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : saved ? <Save size={14} className="text-dock-green" /> : <Save size={14} />}
                  {saved ? 'Saved!' : 'Save Profile'}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Git Identity */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <GitBranch size={15} className="text-dock-accent" /> Git Identity
              </h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-xs text-dock-muted leading-relaxed">
                Your display name and email are used for git commits. Click below to copy the setup commands.
              </p>
              <div className="bg-dock-bg border border-dock-border rounded-lg p-3 font-mono text-xs text-dock-muted space-y-1">
                <p>git config --global user.name "{form.displayName || 'Your Name'}"</p>
                <p>git config --global user.email "{form.email || 'your@email.com'}"</p>
              </div>
              <Button variant="secondary" size="sm" onClick={applyGitIdentity} disabled={!form.displayName || !form.email}>
                <Terminal size={13} /> Copy commands to clipboard
              </Button>
            </CardBody>
          </Card>

          {/* Remote Server Credentials */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Shield size={15} className="text-dock-accent" /> Remote Access Credentials
                </h2>
                {remoteStatus?.configured && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-dock-green/10 text-dock-green border border-dock-green/20 font-semibold flex items-center gap-1">
                    <Check size={9} /> Configured
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-xs text-dock-muted leading-relaxed">
                Set the login credentials for the DevDock remote web app (port <span className="font-mono text-dock-text">7777</span>). Use this to reset your password if locked out.
              </p>

              {remoteMsg && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-xs border ${remoteMsg.ok ? 'bg-dock-green/10 border-dock-green/20 text-dock-green' : 'bg-dock-red/10 border-dock-red/20 text-dock-red'}`}>
                  {remoteMsg.ok ? <Check size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                  {remoteMsg.text}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-dock-muted ml-1">Username</label>
                  <Input
                    value={remoteForm.username}
                    onChange={(e) => setRemoteForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="admin"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-dock-muted ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={remoteForm.password}
                      onChange={(e) => setRemoteForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full h-10 px-3 pr-10 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm focus:outline-none focus:ring-1 focus:ring-dock-accent transition-all"
                    />
                    <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dock-muted hover:text-dock-text transition-colors">
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-dock-muted ml-1">Confirm Password</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={remoteForm.confirm}
                    onChange={(e) => setRemoteForm((f) => ({ ...f, confirm: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full h-10 px-3 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm focus:outline-none focus:ring-1 focus:ring-dock-accent transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleRemoteSave} disabled={remoteSaving}>
                  {remoteSaving ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                  {remoteStatus?.configured ? 'Reset Password' : 'Set Credentials'}
                </Button>
              </div>
            </CardBody>
          </Card>

        </div>

        <div className="space-y-6">

          {/* GitHub */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <GitBranch size={15} className="text-dock-accent" /> GitHub
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-xs text-dock-muted mb-3">
                Connect your GitHub account to enable PR tracking, issue monitoring and repo management.
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                <GitBranch size={13} /> Configure in Settings
              </Button>
            </CardBody>
          </Card>

          {/* About */}
          <Card className="border-dock-accent/20 bg-dock-accent/5">
            <CardBody className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-dock-accent" />
                <span className="text-sm font-semibold text-dock-text">DevDock</span>
                <span className="text-[10px] text-dock-muted font-mono ml-auto">v1.0.0</span>
              </div>
              <p className="text-xs text-dock-muted leading-relaxed">
                Open source local dev environment manager. Built for developers who want full control over their workflow.
              </p>
            </CardBody>
          </Card>

        </div>
      </div>
    </div>
  )
}
