/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { api, getHost, setHost, setToken, setRefreshToken } from '../api'
import { useAppStore } from '../store'

export default function SetupPage() {
  const navigate = useNavigate()
  const { setLoggedIn } = useAppStore()

  const [host, setHostState] = useState(getHost())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleHostChange(v: string) {
    setHostState(v)
    setHost(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const data = await api.setup(username, password)
      if (data.accessToken) setToken(data.accessToken)
      if (data.refreshToken) setRefreshToken(data.refreshToken)
      setSuccess(true)
      setLoggedIn(true)
      setTimeout(() => navigate('/', { replace: true }), 1000)
    } catch (err: any) {
      setError(err.message || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <Server size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#e4e6f0]">Setup DevDock</h1>
          <p className="text-[#8b8fa3] text-sm mt-1">Create your admin account</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1d27] border border-[#2e3348] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 text-red-400 text-sm rounded-xl p-3">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-green-900/30 border border-green-700/50 text-green-400 text-sm rounded-xl p-3">
              <CheckCircle size={16} className="shrink-0" />
              <span>Setup complete! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Host */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide">
                Host URL
              </label>
              <input
                type="url"
                value={host}
                onChange={(e) => handleHostChange(e.target.value)}
                placeholder="http://localhost:7777"
                className="w-full h-11 px-3 rounded-xl bg-[#0f1117] border border-[#2e3348] text-[#e4e6f0] placeholder-[#8b8fa3] text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
                className="w-full h-11 px-3 rounded-xl bg-[#0f1117] border border-[#2e3348] text-[#e4e6f0] placeholder-[#8b8fa3] text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  className="w-full h-11 px-3 pr-11 rounded-xl bg-[#0f1117] border border-[#2e3348] text-[#e4e6f0] placeholder-[#8b8fa3] text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8fa3] hover:text-[#e4e6f0] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                  className={`w-full h-11 px-3 pr-11 rounded-xl bg-[#0f1117] border text-[#e4e6f0] placeholder-[#8b8fa3] text-sm focus:outline-none transition-colors ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-green-500 focus:border-green-400'
                        : 'border-red-500 focus:border-red-400'
                      : 'border-[#2e3348] focus:border-blue-500'
                  }`}
                />
                {confirmPassword.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <AlertCircle size={16} className="text-red-500" />
                    )}
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Server size={16} />
              )}
              {loading ? 'Setting up...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
