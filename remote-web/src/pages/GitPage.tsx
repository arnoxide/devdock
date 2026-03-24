/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, GitBranch, GitCommit, Upload, Download,
  CheckSquare, Square, RefreshCw, AlertCircle, CheckCircle,
  ChevronDown, ChevronRight, Minus, Plus, FileText
} from 'lucide-react'
import { api } from '../api'

interface GitFile {
  path: string
  status: string // M, A, D, ?, R, etc.
  staged?: boolean
}

interface Toast {
  msg: string
  type: 'success' | 'error'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    M: { label: 'M', class: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40' },
    A: { label: 'A', class: 'bg-green-900/40 text-green-400 border-green-700/40' },
    D: { label: 'D', class: 'bg-red-900/40 text-red-400 border-red-700/40' },
    '?': { label: '?', class: 'bg-[#2e3348] text-[#8b8fa3] border-[#2e3348]' },
    R: { label: 'R', class: 'bg-blue-900/40 text-blue-400 border-blue-700/40' },
  }
  const s = map[status] || map['?']
  return (
    <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded border ${s.class} shrink-0`}>
      {s.label}
    </span>
  )
}

function DiffViewer({ diff }: { diff: string }) {
  const lines = diff.split('\n')
  return (
    <div className="bg-[#0a0c12] rounded-xl border border-[#2e3348] overflow-auto max-h-72">
      <div className="font-mono text-xs">
        {lines.map((line, i) => {
          let cls = 'text-[#8b8fa3]'
          let icon = null
          if (line.startsWith('+') && !line.startsWith('+++')) {
            cls = 'text-green-400 bg-green-900/10'
            icon = <Plus size={10} className="shrink-0 mt-0.5" />
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            cls = 'text-red-400 bg-red-900/10'
            icon = <Minus size={10} className="shrink-0 mt-0.5" />
          } else if (line.startsWith('@@')) {
            cls = 'text-blue-400 bg-blue-900/10'
          }
          return (
            <div key={i} className={`flex gap-1.5 px-3 py-0.5 ${cls}`}>
              <span className="w-3 shrink-0">{icon}</span>
              <span className="whitespace-pre-wrap break-all">{line}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GitPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [gitData, setGitData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set())
  const [commitMsg, setCommitMsg] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null)
  const [diffs, setDiffs] = useState<Record<string, string>>({})
  const [diffLoading, setDiffLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchGitStatus = useCallback(async (showRefresh = false) => {
    if (!id) return
    if (showRefresh) setRefreshing(true)
    try {
      const data = await api.gitStatus(id)
      setGitData(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load git status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useEffect(() => { fetchGitStatus() }, [fetchGitStatus])

  async function toggleDiff(filepath: string) {
    if (expandedDiff === filepath) { setExpandedDiff(null); return }
    setExpandedDiff(filepath)
    if (!diffs[filepath] && id) {
      setDiffLoading(filepath)
      try {
        const data: any = await api.gitDiff(id, filepath)
        setDiffs((prev) => ({ ...prev, [filepath]: typeof data === 'string' ? data : data.diff || '' }))
      } catch { /* ignore */ } finally { setDiffLoading(null) }
    }
  }

  function toggleCheck(filepath: string) {
    setCheckedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(filepath)) { next.delete(filepath) } else { next.add(filepath) }
      return next
    })
  }

  function toggleAll(files: GitFile[]) {
    if (checkedFiles.size === files.length) {
      setCheckedFiles(new Set())
    } else {
      setCheckedFiles(new Set(files.map((f) => f.path)))
    }
  }

  async function handleCommit() {
    if (!id || !commitMsg.trim()) return
    setActionLoading('commit')
    try {
      const filesToStage = Array.from(checkedFiles)
      if (filesToStage.length > 0) {
        await api.gitStage(id, filesToStage)
      }
      await api.gitCommit(id, commitMsg.trim())
      setCommitMsg('')
      setCheckedFiles(new Set())
      showToast('Committed successfully')
      fetchGitStatus(true)
    } catch (err: any) {
      showToast(err.message || 'Commit failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handlePush() {
    if (!id) return
    setActionLoading('push')
    try {
      await api.gitPush(id)
      showToast('Pushed successfully')
    } catch (err: any) {
      showToast(err.message || 'Push failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handlePull() {
    if (!id) return
    setActionLoading('pull')
    try {
      await api.gitPull(id)
      showToast('Pull successful')
      fetchGitStatus(true)
    } catch (err: any) {
      showToast(err.message || 'Pull failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const files: GitFile[] = gitData?.files || gitData?.changes || []
  const branch: string = gitData?.branch || 'unknown'
  const commits: any[] = gitData?.commits || gitData?.log || []
  const allChecked = files.length > 0 && checkedFiles.size === files.length

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e4e6f0] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f1117]/90 backdrop-blur border-b border-[#2e3348] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/project/${id}`)}
            className="p-2 rounded-xl text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <GitBranch size={16} className="text-[#8b8fa3]" />
            <h1 className="font-semibold text-[#e4e6f0]">Git</h1>
            {branch !== 'unknown' && (
              <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-400 border border-blue-700/40 rounded-full">{branch}</span>
            )}
          </div>
          <button
            onClick={() => fetchGitStatus(true)}
            disabled={refreshing}
            className="p-2 rounded-xl text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 text-red-400 text-sm rounded-xl p-3">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-[#1a1d27] border border-[#2e3348] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Push/Pull */}
            <div className="flex gap-2">
              <button
                onClick={handlePull}
                disabled={!!actionLoading}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#1a1d27] border border-[#2e3348] hover:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-[#e4e6f0] text-sm font-medium rounded-xl transition-colors"
              >
                {actionLoading === 'pull' ? <span className="w-4 h-4 border-2 border-[#8b8fa3]/30 border-t-[#e4e6f0] rounded-full animate-spin" /> : <Download size={15} />}
                Pull
              </button>
              <button
                onClick={handlePush}
                disabled={!!actionLoading}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
              >
                {actionLoading === 'push' ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={15} />}
                Push
              </button>
            </div>

            {/* Changed Files */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide">
                  Changes
                  {files.length > 0 && <span className="ml-1.5 text-[#e4e6f0]">{files.length}</span>}
                </h2>
                {files.length > 0 && (
                  <button
                    onClick={() => toggleAll(files)}
                    className="flex items-center gap-1 text-xs text-[#8b8fa3] hover:text-[#e4e6f0] transition-colors"
                  >
                    {allChecked ? <CheckSquare size={13} className="text-blue-400" /> : <Square size={13} />}
                    {allChecked ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {files.length === 0 ? (
                <div className="text-center py-8 text-[#8b8fa3] text-sm bg-[#1a1d27] border border-[#2e3348] rounded-xl">
                  Working tree is clean
                </div>
              ) : (
                <div className="space-y-1.5">
                  {files.map((file) => (
                    <div key={file.path} className="bg-[#1a1d27] border border-[#2e3348] rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5 min-h-[44px]">
                        <button
                          onClick={() => toggleCheck(file.path)}
                          className="text-[#8b8fa3] hover:text-blue-400 transition-colors shrink-0"
                        >
                          {checkedFiles.has(file.path)
                            ? <CheckSquare size={16} className="text-blue-400" />
                            : <Square size={16} />}
                        </button>
                        <StatusBadge status={file.status} />
                        <button
                          onClick={() => toggleDiff(file.path)}
                          className="flex-1 text-left text-sm text-[#e4e6f0] hover:text-blue-400 transition-colors truncate"
                        >
                          {file.path}
                        </button>
                        <button
                          onClick={() => toggleDiff(file.path)}
                          className="text-[#8b8fa3] shrink-0"
                        >
                          {expandedDiff === file.path
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />}
                        </button>
                      </div>

                      {expandedDiff === file.path && (
                        <div className="px-3 pb-3">
                          {diffLoading === file.path ? (
                            <div className="flex items-center gap-2 text-[#8b8fa3] text-xs py-3">
                              <span className="w-3.5 h-3.5 border border-[#2e3348] border-t-blue-500 rounded-full animate-spin" />
                              Loading diff...
                            </div>
                          ) : diffs[file.path] ? (
                            <DiffViewer diff={diffs[file.path]} />
                          ) : (
                            <p className="text-xs text-[#8b8fa3] py-2">No diff available</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Commit */}
            <section className="bg-[#1a1d27] border border-[#2e3348] rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide">Commit</h2>
              <textarea
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Commit message..."
                rows={3}
                className="w-full bg-[#0f1117] border border-[#2e3348] rounded-xl px-3 py-2 text-sm text-[#e4e6f0] placeholder-[#8b8fa3] resize-none focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleCommit}
                disabled={!commitMsg.trim() || !!actionLoading}
                className="w-full h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
              >
                {actionLoading === 'commit' ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <GitCommit size={15} />
                )}
                {checkedFiles.size > 0 ? `Stage ${checkedFiles.size} file(s) & Commit` : 'Commit'}
              </button>
            </section>

            {/* Recent Commits */}
            {commits.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-[#8b8fa3] uppercase tracking-wide mb-2">
                  Recent Commits
                </h2>
                <div className="space-y-1.5">
                  {commits.slice(0, 10).map((commit: any, i: number) => (
                    <div key={i} className="bg-[#1a1d27] border border-[#2e3348] rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                      <FileText size={13} className="text-[#8b8fa3] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#e4e6f0] truncate">{commit.message || commit.msg}</p>
                        <p className="text-xs text-[#8b8fa3] mt-0.5">
                          {commit.hash?.slice(0, 7) || ''}
                          {commit.author && ` · ${commit.author}`}
                          {commit.date && ` · ${new Date(commit.date).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl z-50 ${
          toast.type === 'success' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
