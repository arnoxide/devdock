/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Server, User, Lock, LogOut, Download,
  AlertCircle, CheckCircle, Eye, EyeOff
} from 'lucide-react'
import { api, getHost, setHost, clearAuth } from '../api'
import { useAppStore } from '../store'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#1a1d27] border border-[#2e3348] rounded-2xl p-4 space-y-3">
      <h2 className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  )
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl z-50 ${
      type === 'success' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'
    }`}>
      {type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { setLoggedIn } = useAppStore()

  const [host, setHostState] = useState(getHost())
  const [me, setMe] = useState<any>(null)
  const [meLoading, setMeLoading] = useState(true)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)

  const hostInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.me().then((data: any) => setMe(data)).catch(() => {}).finally(() => setMeLoading(false))
  }, [])

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleHostBlur() {
    setHost(host)
    showToast('Host URL saved')
  }

  function handleHostKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      setHost(host)
      showToast('Host URL saved')
      hostInputRef.current?.blur()
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error')
      return
    }
    setChangingPassword(true)
    try {
      // The server is expected to have POST /api/auth/change-password
      const res = await fetch(`${getHost()}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('devdock_token')}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message || d.error || `HTTP ${res.status}`)
      }
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password changed successfully')
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  function handleLogout() {
    clearAuth()
    setLoggedIn(false)
    navigate('/login', { replace: true })
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setCanInstall(false)
      showToast('App installed!')
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e4e6f0] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f1117]/90 backdrop-blur border-b border-[#2e3348] px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-semibold text-[#e4e6f0]">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Host URL */}
        <Section title="Connection">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8b8fa3] flex items-center gap-1.5">
              <Server size={12} /> Host URL
            </label>
            <input
              ref={hostInputRef}
              type="url"
              value={host}
              onChange={(e) => setHostState(e.target.value)}
              onBlur={handleHostBlur}
              onKeyDown={handleHostKeyDown}
              placeholder="http://localhost:7777"
              className="w-full h-11 px-3 rounded-xl bg-[#0f1117] border border-[#2e3348] text-[#e4e6f0] placeholder-[#8b8fa3] text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-xs text-[#8b8fa3]">Press Enter or click away to save</p>
          </div>
        </Section>

        {/* Account Info */}
        <Section title="Account">
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <User size={18} className="text-white" />
            </div>
            <div>
              {meLoading ? (
                <div className="h-4 w-28 bg-[#2e3348] rounded animate-pulse" />
              ) : (
                <p className="text-[#e4e6f0] font-medium">{me?.username || me?.user || 'Unknown'}</p>
              )}
              <p className="text-xs text-[#8b8fa3] mt-0.5">Logged in</p>
            </div>
          </div>
        </Section>

        {/* Change Password */}
        <Section title="Change Password">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-[#8b8fa3]">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full h-11 px-3 pr-11 rounded-xl bg-[#0f1117] border border-[#2e3348] text-[#e4e6f0] placeholder-[#8b8fa3] text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8fa3] hover:text-[#e4e6f0] transition-colors"
                >
                  {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#8b8fa3]">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
                className="w-full h-11 px-3 rounded-xl bg-[#0f1117] border border-[#2e3348] text-[#e4e6f0] placeholder-[#8b8fa3] text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#8b8fa3]">Confirm New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
                className={`w-full h-11 px-3 rounded-xl bg-[#0f1117] border text-[#e4e6f0] placeholder-[#8b8fa3] text-sm focus:outline-none transition-colors ${
                  confirmPassword.length > 0
                    ? newPassword === confirmPassword
                      ? 'border-green-500'
                      : 'border-red-500'
                    : 'border-[#2e3348] focus:border-blue-500'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              {changingPassword ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock size={14} />
              )}
              {changingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </Section>

        {/* PWA Install */}
        {canInstall && (
          <Section title="Install App">
            <div className="flex items-start gap-3">
              <Download size={18} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-[#e4e6f0]">Install DevDock as a native app</p>
                <p className="text-xs text-[#8b8fa3]">Works offline and feels like a native experience on your phone.</p>
                <button
                  onClick={handleInstall}
                  className="h-10 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  <Download size={14} />
                  Install as App
                </button>
              </div>
            </div>
          </Section>
        )}

        {!canInstall && (
          <Section title="Install App">
            <div className="flex items-start gap-3">
              <Download size={18} className="text-[#8b8fa3] mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-[#e4e6f0]">Install as PWA</p>
                <p className="text-xs text-[#8b8fa3]">
                  To install: tap the share icon in your browser and choose "Add to Home Screen".
                  On desktop, look for the install icon in the address bar.
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full h-12 flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700/30 hover:border-red-700/60 text-red-400 text-sm font-medium rounded-2xl transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}
