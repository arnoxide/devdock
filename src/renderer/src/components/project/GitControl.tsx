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
    RotateCcw,
    Github,
    ExternalLink,
    Sparkles
} from 'lucide-react'
import { useGitStore } from '../../stores/git-store'
import { useGitHubStore } from '../../stores/github-store'
import { GitCreatePullRequestResult, GitFileStatus } from '../../../../shared/types'
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
    const lastOperation = useGitStore((s) => s.lastOperation[projectId])

    const loadStatus = useGitStore((s) => s.loadStatus)
    const commit = useGitStore((s) => s.commit)
    const push = useGitStore((s) => s.push)
    const pull = useGitStore((s) => s.pull)
    const sync = useGitStore((s) => s.sync)
    const init = useGitStore((s) => s.init)
    const setRemote = useGitStore((s) => s.setRemote)
    const getRemote = useGitStore((s) => s.getRemote)
    const createPullRequest = useGitStore((s) => s.createPullRequest)
    const githubCredentials = useGitHubStore((s) => s.credentials)
    const githubAccounts = useGitHubStore((s) => s.accounts)
    const switchGitHubAccount = useGitHubStore((s) => s.switchAccount)

    const [commitMessage, setCommitMessage] = useState('')
    const [isCommitting, setIsCommitting] = useState(false)
    const [isSettingRemote, setIsSettingRemote] = useState(false)
    const [isSwitchingAccount, setIsSwitchingAccount] = useState(false)
    const [isCreatingPr, setIsCreatingPr] = useState(false)
    const [remoteUrl, setRemoteUrl] = useState('')
    const [showRemoteDialog, setShowRemoteDialog] = useState(false)
    const [showPrDialog, setShowPrDialog] = useState(false)
    const [prTitle, setPrTitle] = useState('')
    const [prBody, setPrBody] = useState('')
    const [prBase, setPrBase] = useState('main')
    const [prDraft, setPrDraft] = useState(false)
    const [prError, setPrError] = useState<string | null>(null)
    const [createdPr, setCreatedPr] = useState<GitCreatePullRequestResult | null>(null)

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

    const handleSwitchGitHubAccount = async (username: string) => {
        if (!username || username === githubCredentials?.username) return
        setIsSwitchingAccount(true)
        try {
            await switchGitHubAccount(username)
        } finally {
            setIsSwitchingAccount(false)
        }
    }

    const handleOpenPrDialog = () => {
        const defaultTitle = status?.lastCommit?.message || `${status?.branch || 'branch'} changes`
        setPrTitle(defaultTitle)
        setPrBody([
            '## Summary',
            '- ',
            '',
            '## Testing',
            '- '
        ].join('\n'))
        setPrBase(status?.branch === 'main' ? 'develop' : 'main')
        setPrDraft(false)
        setPrError(null)
        setCreatedPr(null)
        setShowPrDialog(true)
    }

    const handleCreatePr = async () => {
        if (!prTitle.trim()) return
        setIsCreatingPr(true)
        setPrError(null)
        setCreatedPr(null)
        try {
            const result = await createPullRequest({
                projectId,
                title: prTitle.trim(),
                body: prBody.trim(),
                base: prBase.trim() || 'main',
                draft: prDraft
            })
            setCreatedPr(result)
        } catch (err: any) {
            setPrError(err.message || 'Failed to create pull request')
        } finally {
            setIsCreatingPr(false)
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
    const hasDiverged = isAhead && isBehind
    const hasRemoteWithoutUpstream = status.hasRemote && !status.hasUpstream && status.branch !== 'HEAD (no commits)'
    const showRebaseAction = hasDiverged || Boolean(err?.includes('pull with rebase'))
    const operationOutput = lastOperation?.output
        .split('\n')
        .filter(Boolean)
        .slice(0, 12)
        .join('\n')

    const syncStatus = !status.hasRemote
        ? 'Local repository (no remote tracking)'
        : hasRemoteWithoutUpstream
            ? 'Branch is not published yet'
            : isAhead && isBehind
                ? 'Your branch has diverged from remote'
                : isAhead
                    ? `${status.ahead} commit${status.ahead > 1 ? 's' : ''} ready to push`
                    : isBehind
                        ? `${status.behind} commit${status.behind > 1 ? 's' : ''} to pull from remote`
                        : 'Up to date with remote'

    return (
        <div className="space-y-5">

            {/* Unpublished branch guidance */}
            {hasRemoteWithoutUpstream && (
                <div className="flex flex-col gap-3 p-4 bg-dock-accent/10 border border-dock-accent/25 rounded-xl sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-dock-accent/10 text-dock-accent shrink-0">
                            <ArrowUp size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-dock-text">Publish this branch first</p>
                            <p className="text-xs text-dock-muted mt-1 leading-relaxed">
                                <span className="font-mono text-dock-text">{status.branch}</span> has a remote repository, but it is not tracking a remote branch yet. Publish once to set upstream tracking, then Pull, Push, and Sync will work normally.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => push(projectId)}
                        disabled={isLoading || hasChangesToCommit}
                        title={hasChangesToCommit ? 'Commit your changes before publishing this branch' : 'Publish this branch and set upstream tracking'}
                        className="shrink-0"
                    >
                        <ArrowUp size={13} />
                        Publish Branch
                    </Button>
                </div>
            )}

            {/* ── Incoming changes warning ── */}
            {isBehind && status.hasUpstream && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-400">
                            {hasDiverged ? 'Branch has diverged' : `${status.behind} incoming commit${status.behind > 1 ? 's' : ''} — pull first`}
                        </p>
                        <p className="text-xs text-amber-400/70 mt-0.5">
                            {hasDiverged
                                ? 'Your branch and the remote both have commits. Merge keeps your local commits as-is; rebase replays them on top of remote.'
                                : 'Committing or pushing now may cause conflicts. Pull the latest changes before continuing.'}
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="secondary" onClick={() => pull(projectId)} disabled={isLoading}>
                            <ArrowDown size={13} /> Pull Merge
                        </Button>
                        {hasDiverged && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => pull(projectId, { rebase: true })}
                                disabled={isLoading || hasChangesToCommit}
                                title={hasChangesToCommit ? 'Commit or stash local changes before rebasing' : 'Pull with rebase'}
                            >
                                <RefreshCw size={13} /> Pull Rebase
                            </Button>
                        )}
                    </div>
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
                            {status.upstreamBranch && <Badge variant="success">{status.upstreamBranch}</Badge>}
                            {hasRemoteWithoutUpstream && <Badge variant="warning">Unpublished</Badge>}
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
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => pull(projectId)}
                            disabled={isLoading || !status.hasRemote || !status.hasUpstream}
                            title={
                                !status.hasRemote
                                    ? 'Set a remote first'
                                    : !status.hasUpstream
                                        ? 'Publish this branch before pulling'
                                        : 'Pull changes from remote'
                            }
                        >
                            <ArrowDown size={14} /> Pull
                        </Button>
                        <Button
                            variant="secondary" size="sm"
                            onClick={() => push(projectId)}
                            disabled={isLoading || !status.hasRemote || isBehind || hasChangesToCommit}
                            title={isBehind ? 'Pull first before pushing' : hasChangesToCommit ? 'Commit your changes first' : hasRemoteWithoutUpstream ? 'Publish this branch and set upstream tracking' : 'Push to remote'}
                        >
                            <ArrowUp size={14} /> {hasRemoteWithoutUpstream ? 'Publish' : 'Push'}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => sync(projectId)}
                            disabled={isLoading || !status.hasRemote || !status.hasUpstream}
                            title={!status.hasUpstream ? 'Publish this branch before syncing' : 'Sync with remote (Pull then Push)'}
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Sync
                        </Button>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {err && (
                <div className="flex items-start gap-3 p-3.5 text-sm bg-dock-red/5 border border-dock-red/15 rounded-lg">
                    <AlertCircle size={16} className="text-dock-red mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-dock-red">
                            {err.includes('not published yet') ? 'Branch needs publishing' : 'Git operation failed'}
                        </p>
                        <p className="text-dock-red/80 text-xs mt-0.5">{err}</p>
                    </div>
                    {showRebaseAction && (
                        <div className="flex shrink-0 gap-2">
                            <Button size="sm" variant="secondary" onClick={() => pull(projectId)} disabled={isLoading}>
                                <ArrowDown size={13} /> Merge
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => pull(projectId, { rebase: true })}
                                disabled={isLoading || hasChangesToCommit}
                                title={hasChangesToCommit ? 'Commit or stash local changes before rebasing' : 'Pull with rebase'}
                            >
                                <RefreshCw size={13} /> Rebase
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {lastOperation && !err && (
                <div className="flex items-start gap-3 p-3.5 text-sm bg-dock-green/5 border border-dock-green/15 rounded-lg">
                    <CheckCircle2 size={16} className="text-dock-green mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-dock-green">{lastOperation.title}</p>
                        {operationOutput && (
                            <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-md border border-dock-border bg-dock-bg/60 p-2 text-[11px] leading-relaxed text-dock-muted">
                                {operationOutput}
                            </pre>
                        )}
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

                            {/* Commit Input — sticky so it's always visible */}
                            <div className="sticky bottom-0 pt-4 border-t border-dock-border bg-dock-surface -mx-4 px-4 pb-1 shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.3)]">
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
                    {githubAccounts.length > 0 && (
                        <Card>
                            <div className="p-4 border-b border-dock-border">
                                <h3 className="text-sm font-bold text-dock-text flex items-center gap-2">
                                    <Github size={14} className="text-dock-accent" />
                                    GitHub Account
                                </h3>
                            </div>
                            <CardBody className="space-y-3">
                                <select
                                    value={githubCredentials?.username || ''}
                                    onChange={(e) => handleSwitchGitHubAccount(e.target.value)}
                                    disabled={isSwitchingAccount}
                                    className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text focus:outline-none focus:ring-2 focus:ring-dock-accent/40"
                                >
                                    {githubAccounts.map((account) => (
                                        <option key={account.username} value={account.username}>
                                            {account.username}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-dock-muted leading-relaxed">
                                    Active for DevDock GitHub data. Git push and pull still use this repo's configured remote and your local Git credentials.
                                </p>
                            </CardBody>
                        </Card>
                    )}

                    <Card className="border-dock-accent/20">
                        <CardBody className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-dock-accent/10 text-dock-accent shrink-0">
                                    <GitPullRequest size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-dock-text">Pull Request</p>
                                    <p className="text-[11px] text-dock-muted leading-relaxed mt-0.5">
                                        Open a readable PR from <span className="font-mono text-dock-text">{status.branch}</span> using the active GitHub account.
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="w-full"
                                onClick={handleOpenPrDialog}
                                disabled={!status.hasRemote || !githubCredentials || status.branch === 'HEAD (no commits)' || hasChangesToCommit || isAhead}
                                title={
                                    !githubCredentials
                                        ? 'Connect a GitHub account first'
                                        : !status.hasRemote
                                            ? 'Set a GitHub remote first'
                                            : hasChangesToCommit
                                                ? 'Commit your changes first'
                                                : isAhead
                                                    ? 'Push your branch before opening a PR'
                                                    : undefined
                                }
                            >
                                <Sparkles size={14} />
                                Create Pull Request
                            </Button>
                        </CardBody>
                    </Card>

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
                                        {!status.hasRemote ? 'No Remote' : hasRemoteWithoutUpstream ? 'Not Published' : status.ahead === 0 && status.behind === 0 ? 'In Sync' : 'Out of Sync'}
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
                                        : hasRemoteWithoutUpstream
                                            ? 'Publish this branch once to create upstream tracking.'
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
                            <li>Copy the <strong>SSH URL</strong> when possible, or use HTTPS with a configured Git credential helper.</li>
                            <li>Paste the URL into the field below.</li>
                        </ol>
                    </div>

                    <Input
                        label="Remote URL (origin)"
                        placeholder="git@github.com:username/repo.git or https://github.com/username/repo.git"
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                    />
                    <p className="text-[11px] text-dock-muted leading-relaxed">
                        DevDock supports SSH and HTTPS remotes. HTTPS needs credentials already available to Git, otherwise GitHub will reject the operation instead of prompting inside the app.
                    </p>
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

            <Dialog
                open={showPrDialog}
                onClose={() => {
                    if (!isCreatingPr) setShowPrDialog(false)
                }}
                title="Create Pull Request"
                maxWidth="max-w-2xl"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="rounded-lg border border-dock-border bg-dock-bg/30 p-3">
                            <p className="text-dock-muted">From</p>
                            <p className="font-mono text-dock-text truncate mt-1">{status.branch}</p>
                        </div>
                        <div className="rounded-lg border border-dock-border bg-dock-bg/30 p-3">
                            <p className="text-dock-muted">Into</p>
                            <p className="font-mono text-dock-text truncate mt-1">{prBase || 'main'}</p>
                        </div>
                        <div className="rounded-lg border border-dock-border bg-dock-bg/30 p-3">
                            <p className="text-dock-muted">Account</p>
                            <p className="text-dock-text truncate mt-1">{githubCredentials?.username || 'Not connected'}</p>
                        </div>
                    </div>

                    <Input
                        label="Title"
                        value={prTitle}
                        onChange={(e) => setPrTitle(e.target.value)}
                        placeholder="Describe the change clearly"
                        disabled={isCreatingPr || Boolean(createdPr)}
                    />

                    <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                        <Input
                            label="Base branch"
                            value={prBase}
                            onChange={(e) => setPrBase(e.target.value)}
                            placeholder="main"
                            disabled={isCreatingPr || Boolean(createdPr)}
                        />
                        <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dock-border bg-dock-bg/30 text-xs text-dock-muted">
                            <input
                                type="checkbox"
                                checked={prDraft}
                                onChange={(e) => setPrDraft(e.target.checked)}
                                disabled={isCreatingPr || Boolean(createdPr)}
                            />
                            Draft
                        </label>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-medium text-dock-muted">Description</label>
                        <textarea
                            value={prBody}
                            onChange={(e) => setPrBody(e.target.value)}
                            disabled={isCreatingPr || Boolean(createdPr)}
                            className="w-full min-h-[180px] glass-control rounded-lg px-3 py-2 text-sm text-dock-text placeholder:text-dock-muted/50 focus:outline-none focus:ring-2 focus:ring-dock-accent/50 focus:border-dock-accent resize-y font-mono"
                        />
                    </div>

                    {isAhead && (
                        <div className="rounded-lg border border-dock-yellow/20 bg-dock-yellow/10 px-3 py-2 text-xs text-dock-yellow">
                            Push your local commits before creating a PR so GitHub can see this branch.
                        </div>
                    )}

                    {prError && (
                        <div className="rounded-lg border border-dock-red/20 bg-dock-red/10 px-3 py-2 text-xs text-dock-red">
                            {prError}
                        </div>
                    )}

                    {createdPr && (
                        <div className="rounded-lg border border-dock-green/20 bg-dock-green/10 px-3 py-3 text-sm">
                            <p className="font-semibold text-dock-green">Pull request created</p>
                            <p className="text-xs text-dock-muted mt-1">
                                #{createdPr.number} {createdPr.repoFullName}: {createdPr.headBranch} → {createdPr.baseBranch}
                            </p>
                            <button
                                onClick={() => window.open(createdPr.htmlUrl, '_blank')}
                                className="inline-flex items-center gap-1.5 mt-3 text-xs text-dock-accent hover:underline"
                            >
                                <ExternalLink size={13} />
                                Open PR
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setShowPrDialog(false)} disabled={isCreatingPr}>
                            {createdPr ? 'Close' : 'Cancel'}
                        </Button>
                        {!createdPr && (
                            <Button onClick={handleCreatePr} disabled={isCreatingPr || !prTitle.trim() || !prBase.trim()}>
                                {isCreatingPr ? <RefreshCw size={14} className="animate-spin" /> : <GitPullRequest size={14} />}
                                {isCreatingPr ? 'Creating...' : 'Create PR'}
                            </Button>
                        )}
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
