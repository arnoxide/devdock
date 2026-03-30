import { useEffect, useState } from 'react'
import {
    GitBranch,
    GitCommit,
    ArrowUp,
    ArrowDown,
    RefreshCw,
    AlertCircle,
    Clock,
    User,
    CheckCircle2,
    GitPullRequest,
    FileEdit,
    FilePlus,
    FileX,
    FileDiff,
    RotateCcw
} from 'lucide-react'
import { useGitStore } from '../../stores/git-store'
import { GitFileStatus } from '../../../../shared/types'
import Button from '../ui/Button'
import Card, { CardBody } from '../ui/Card'
import Badge from '../ui/Badge'
import Dialog from '../ui/Dialog'
import Input from '../ui/Input'

interface GitControlProps {
    projectId: string
}

function fileIcon(status: GitFileStatus['status']) {
    switch (status) {
        case 'added': return <FilePlus size={13} className="text-dock-green" />
        case 'deleted': return <FileX size={13} className="text-dock-red" />
        case 'renamed': return <FileDiff size={13} className="text-dock-purple" />
        case 'untracked': return <FilePlus size={13} className="text-dock-muted" />
        default: return <FileEdit size={13} className="text-dock-yellow" />
    }
}

function statusLabel(status: GitFileStatus['status']) {
    switch (status) {
        case 'added': return 'Added'
        case 'deleted': return 'Deleted'
        case 'renamed': return 'Renamed'
        case 'modified': return 'Modified'
        case 'untracked': return 'New file'
        default: return status
    }
}

function statusBadgeVariant(status: GitFileStatus['status']): 'success' | 'warning' | 'danger' | 'purple' | 'default' {
    switch (status) {
        case 'added': return 'success'
        case 'deleted': return 'danger'
        case 'renamed': return 'purple'
        case 'modified': return 'warning'
        default: return 'default'
    }
}

export default function GitControl({ projectId }: GitControlProps) {
    const status = useGitStore((s) => s.statuses[projectId])
    const isLoading = useGitStore((s) => s.loading[projectId])
    const err = useGitStore((s) => s.error[projectId])

    const loadStatus = useGitStore((s) => s.loadStatus)
    const commit = useGitStore((s) => s.commit)
    const push = useGitStore((s) => s.push)
    const pull = useGitStore((s) => s.pull)
    const sync = useGitStore((s) => s.sync)
    const init = useGitStore((s) => s.init)
    const setRemote = useGitStore((s) => s.setRemote)
    const getRemote = useGitStore((s) => s.getRemote)

    const [commitMessage, setCommitMessage] = useState('')
    const [isCommitting, setIsCommitting] = useState(false)
    const [isSettingRemote, setIsSettingRemote] = useState(false)
    const [remoteUrl, setRemoteUrl] = useState('')
    const [showRemoteDialog, setShowRemoteDialog] = useState(false)

    useEffect(() => {
        loadStatus(projectId)
    }, [projectId])

    const handleCommit = async () => {
        if (!commitMessage.trim()) return
        setIsCommitting(true)
        try {
            await commit(projectId, commitMessage)
            setCommitMessage('')
        } finally {
            setIsCommitting(false)
        }
    }

    const handleOpenRemoteDialog = async () => {
        const currentRemote = await getRemote(projectId)
        setRemoteUrl(currentRemote || '')
        setShowRemoteDialog(true)
    }

    const handleSetRemote = async () => {
        if (!remoteUrl.trim()) return
        setIsSettingRemote(true)
        try {
            await setRemote(projectId, remoteUrl)
            setShowRemoteDialog(false)
        } finally {
            setIsSettingRemote(false)
        }
    }

    if (isLoading && !status) {
        return (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
                <div className="p-3 rounded-full bg-dock-accent/10">
                    <RefreshCw size={24} className="text-dock-accent animate-spin" />
                </div>
                <p className="text-sm text-dock-muted">Loading repository status...</p>
            </div>
        )
    }

    if (status && !status.isRepo) {
        return (
            <Card className="border-dashed">
                <CardBody className="flex flex-col items-center justify-center p-16 text-center space-y-5">
                    <div className="p-5 rounded-full bg-dock-muted/10">
                        <GitBranch size={36} className="text-dock-muted" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-dock-text">Not a Git Repository</h3>
                        <p className="text-sm text-dock-muted max-w-sm mx-auto leading-relaxed">
                            This project isn't tracked by Git yet. Initialize a repository to start managing your code with version control.
                        </p>
                    </div>
                    <Button onClick={() => init(projectId)} size="lg">
                        <GitBranch size={16} />
                        Initialize Git Repository
                    </Button>
                </CardBody>
            </Card>
        )
    }

    if (!status) return null

    const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length
    const hasChangesToCommit = totalChanges > 0
    const isBehind = status.behind > 0
    const isAhead = status.ahead > 0

    const syncStatus = !status.hasRemote
        ? 'Local repository (no remote tracking)'
        : isAhead && isBehind
            ? 'Your branch has diverged from remote'
            : isAhead
                ? `${status.ahead} commit${status.ahead > 1 ? 's' : ''} ready to push`
                : isBehind
                    ? `${status.behind} commit${status.behind > 1 ? 's' : ''} to pull from remote`
                    : 'Up to date with remote'

    return (
        <div className="space-y-5">

            {/* ── Incoming changes warning ── */}
            {isBehind && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-400">
                            {status.behind} incoming commit{status.behind > 1 ? 's' : ''} — pull first
                        </p>
                        <p className="text-xs text-amber-400/70 mt-0.5">
                            Committing or pushing now may cause conflicts. Pull the latest changes before continuing.
                        </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => pull(projectId)} disabled={isLoading}>
                        <ArrowDown size={13} /> Pull now
                    </Button>
                </div>
            )}

            {/* ── Uncommitted changes blocking push ── */}
            {!isBehind && hasChangesToCommit && isAhead && (
                <div className="flex items-start gap-3 p-3.5 bg-dock-accent/10 border border-dock-accent/30 rounded-xl">
                    <AlertCircle size={16} className="text-dock-accent mt-0.5 shrink-0" />
                    <p className="text-xs text-dock-accent/80">
                        You have uncommitted changes. Commit them before pushing.
                    </p>
                </div>
            )}

            {/* Branch & Sync Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-dock-surface border border-dock-border rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-dock-accent/10">
                        <GitBranch size={18} className="text-dock-accent" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-dock-text font-mono">{status.branch}</span>
                            <Badge variant="info">Active Branch</Badge>
                        </div>
                        <p className="text-xs text-dock-muted mt-0.5">{syncStatus}</p>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5" title="Commits ahead of remote">
                            <ArrowUp size={14} className={status.ahead > 0 ? 'text-dock-green' : 'text-dock-muted/40'} />
                            <span className={`text-sm font-bold ${status.ahead > 0 ? 'text-dock-green' : 'text-dock-muted/60'}`}>
                                {status.ahead}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Commits behind remote">
                            <ArrowDown size={14} className={status.behind > 0 ? 'text-dock-red' : 'text-dock-muted/40'} />
                            <span className={`text-sm font-bold ${status.behind > 0 ? 'text-dock-red' : 'text-dock-muted/60'}`}>
                                {status.behind}
                            </span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-dock-border" />
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => loadStatus(projectId)} disabled={isLoading} title="Refresh status">
                            <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => pull(projectId)} disabled={isLoading || !status.hasRemote} title="Pull changes from remote">
                            <ArrowDown size={14} /> Pull
                        </Button>
                        <Button
                            variant="secondary" size="sm"
                            onClick={() => push(projectId)}
                            disabled={isLoading || !status.hasRemote || isBehind || hasChangesToCommit}
                            title={isBehind ? 'Pull first before pushing' : hasChangesToCommit ? 'Commit your changes first' : 'Push to remote'}
                        >
                            <ArrowUp size={14} /> Push
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => sync(projectId)} disabled={isLoading || !status.hasRemote} title="Sync with remote (Pull then Push)">
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Sync
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {err && (
                <div className="flex items-start gap-3 p-3.5 text-sm bg-dock-red/5 border border-dock-red/15 rounded-lg">
                    <AlertCircle size={16} className="text-dock-red mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium text-dock-red">Git operation failed</p>
                        <p className="text-dock-red/80 text-xs mt-0.5">{err}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Working Tree & Commit */}
                <div className="lg:col-span-2">
                    <Card>
                        <div className="p-4 border-b border-dock-border flex items-center justify-between">
                            <h3 className="text-sm font-bold text-dock-text flex items-center gap-2">
                                <GitCommit size={16} className="text-dock-accent" />
                                Working Tree
                            </h3>
                            <div className="flex items-center gap-3">
                                {status.staged.length > 0 && (
                                    <span className="text-[10px] font-semibold text-dock-green flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-dock-green" />
                                        {status.staged.length} staged
                                    </span>
                                )}
                                {status.unstaged.length > 0 && (
                                    <span className="text-[10px] font-semibold text-dock-yellow flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-dock-yellow" />
                                        {status.unstaged.length} modified
                                    </span>
                                )}
                                {status.untracked.length > 0 && (
                                    <span className="text-[10px] font-semibold text-dock-muted flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-dock-muted/40" />
                                        {status.untracked.length} new
                                    </span>
                                )}
                            </div>
                        </div>
                        <CardBody className="space-y-4">
                            <div className="max-h-[300px] overflow-y-auto space-y-0.5 pr-1">
                                {status.staged.map((f, i) => (
                                    <div key={`s-${i}`} className="flex items-center justify-between p-2 rounded-md hover:bg-dock-bg/60">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {fileIcon(f.status)}
                                            <span className="text-xs text-dock-text font-mono truncate">{f.path}</span>
                                        </div>
                                        <Badge variant="success" className="text-[9px] shrink-0">{statusLabel(f.status)}</Badge>
                                    </div>
                                ))}
                                {status.unstaged.map((f, i) => (
                                    <div key={`u-${i}`} className="flex items-center justify-between p-2 rounded-md hover:bg-dock-bg/60">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {fileIcon(f.status)}
                                            <span className="text-xs text-dock-muted font-mono truncate">{f.path}</span>
                                        </div>
                                        <Badge variant={statusBadgeVariant(f.status)} className="text-[9px] shrink-0">{statusLabel(f.status)}</Badge>
                                    </div>
                                ))}
                                {status.untracked.map((f, i) => (
                                    <div key={`t-${i}`} className="flex items-center justify-between p-2 rounded-md hover:bg-dock-bg/60">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {fileIcon('untracked')}
                                            <span className="text-xs text-dock-muted/70 font-mono truncate">{f.path}</span>
                                        </div>
                                        <Badge variant="default" className="text-[9px] shrink-0">New file</Badge>
                                    </div>
                                ))}
                                {totalChanges === 0 && (
                                    <div className="flex flex-col items-center justify-center py-10 text-dock-muted">
                                        <CheckCircle2 size={28} className="mb-3 text-dock-green/30" />
                                        <p className="text-sm font-medium">All clean</p>
                                        <p className="text-xs mt-0.5">No uncommitted changes in this project</p>
                                    </div>
                                )}
                            </div>

                            {/* Commit Input */}
                            <div className="pt-4 border-t border-dock-border">
                                <textarea
                                    placeholder="Describe your changes..."
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    className="w-full h-20 p-3 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text
                                        focus:outline-none focus:ring-2 focus:ring-dock-accent/40 focus:border-dock-accent/60
                                        resize-none placeholder:text-dock-muted/40"
                                />
                                <div className="flex items-center justify-between mt-3">
                                    <p className="text-[10px] text-dock-muted">
                                        {hasChangesToCommit
                                            ? `${totalChanges} file${totalChanges > 1 ? 's' : ''} will be staged and committed`
                                            : 'No changes to commit'}
                                    </p>
                                    <Button
                                        onClick={handleCommit}
                                        disabled={!commitMessage.trim() || isCommitting || !hasChangesToCommit || isBehind}
                                        title={isBehind ? 'Pull incoming changes first' : undefined}
                                    >
                                        {isCommitting
                                            ? <RefreshCw size={14} className="animate-spin" />
                                            : <GitCommit size={14} />}
                                        {isCommitting ? 'Committing...' : 'Commit All Changes'}
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                    {/* Latest Commit */}
                    <Card>
                        <div className="p-4 border-b border-dock-border">
                            <h3 className="text-sm font-bold text-dock-text flex items-center gap-2">
                                <Clock size={14} className="text-dock-accent" />
                                Latest Commit
                            </h3>
                        </div>
                        <CardBody>
                            {status.lastCommit ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-dock-bg rounded-lg border border-dock-border">
                                        <p className="text-sm text-dock-text leading-snug line-clamp-3">
                                            {status.lastCommit.message}
                                        </p>
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <Badge variant="purple" className="text-[9px] font-mono">
                                                {status.lastCommit.hash.slice(0, 7)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-2.5 text-xs">
                                            <User size={13} className="text-dock-accent shrink-0" />
                                            <span className="font-medium text-dock-text">{status.lastCommit.author}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-xs">
                                            <Clock size={13} className="text-dock-accent shrink-0" />
                                            <span className="text-dock-muted">
                                                {new Date(status.lastCommit.date).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-8 text-dock-muted">
                                    <GitCommit size={20} className="mb-2 opacity-20" />
                                    <p className="text-xs">No commits yet</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Remote Sync Status */}
                    <Card className={`${!status.hasRemote
                        ? 'bg-dock-bg border-dock-border'
                        : status.ahead === 0 && status.behind === 0
                            ? 'bg-dock-green/5 border-dock-green/15'
                            : 'bg-dock-accent/5 border-dock-accent/15'
                        }`}>
                        <CardBody className="p-4 flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${!status.hasRemote
                                ? 'bg-dock-muted/10 text-dock-muted'
                                : status.ahead === 0 && status.behind === 0
                                    ? 'bg-dock-green/10 text-dock-green'
                                    : 'bg-dock-accent/10 text-dock-accent'
                                }`}>
                                <GitPullRequest size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-xs font-bold text-dock-text">
                                        {!status.hasRemote ? 'No Remote' : status.ahead === 0 && status.behind === 0 ? 'In Sync' : 'Out of Sync'}
                                    </p>
                                    <button
                                        onClick={handleOpenRemoteDialog}
                                        className="text-[10px] text-dock-accent hover:underline flex items-center gap-1"
                                    >
                                        <RefreshCw size={10} />
                                        {status.hasRemote ? 'Change' : 'Set Remote'}
                                    </button>
                                </div>
                                <p className="text-[11px] text-dock-muted leading-relaxed">
                                    {!status.hasRemote
                                        ? 'This branch is not tracking a remote repository.'
                                        : status.ahead === 0 && status.behind === 0
                                            ? 'Your local branch matches the remote repository.'
                                            : syncStatus + '. Use Sync to update.'}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Remote Management Dialog */}
            <Dialog
                open={showRemoteDialog}
                onClose={() => setShowRemoteDialog(false)}
                title="Manage Remote Repository"
                maxWidth="max-w-md"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-dock-text tracking-tight">How to connect to GitHub:</p>
                        <ol className="text-[11px] text-dock-muted space-y-1.5 list-decimal ml-4">
                            <li>Create a new repository on <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-dock-accent hover:underline">github.com/new</a>.</li>
                            <li>Copy the <strong>SSH URL</strong> (starts with git@github.com).</li>
                            <li>Paste the URL into the field below.</li>
                        </ol>
                    </div>

                    <Input
                        label="Remote URL (origin)"
                        placeholder="git@github.com:username/repository.git"
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setShowRemoteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSetRemote}
                            disabled={isSettingRemote || !remoteUrl.trim()}
                        >
                            {isSettingRemote ? 'Saving...' : 'Save Remote'}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
