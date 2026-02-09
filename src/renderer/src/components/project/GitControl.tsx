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
    GitPullRequest
} from 'lucide-react'
import { useGitStore } from '../../stores/git-store'
import Button from '../ui/Button'
import Card, { CardBody } from '../ui/Card'
import Badge from '../ui/Badge'

interface GitControlProps {
    projectId: string
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

    const [commitMessage, setCommitMessage] = useState('')
    const [isCommiting, setIsCommiting] = useState(false)

    useEffect(() => {
        loadStatus(projectId)
    }, [projectId])

    const handleCommit = async () => {
        if (!commitMessage.trim()) return
        setIsCommiting(true)
        try {
            await commit(projectId, commitMessage)
            setCommitMessage('')
        } finally {
            setIsCommiting(false)
        }
    }

    if (isLoading && !status) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <RefreshCw size={32} className="text-dock-accent animate-spin" />
                <p className="text-sm text-dock-muted">Reading Git repository...</p>
            </div>
        )
    }

    if (status && !status.isRepo) {
        return (
            <Card className="border-dashed">
                <CardBody className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="p-4 rounded-full bg-dock-muted/10">
                        <GitBranch size={40} className="text-dock-muted" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-dock-text">No Git Repository</h3>
                        <p className="text-sm text-dock-muted max-w-md mx-auto mt-1">
                            This project is not currently tracked by Git. Initialize a repository to start versioning your code.
                        </p>
                    </div>
                    <Button onClick={() => init(projectId)}>
                        Initialize Repository
                    </Button>
                </CardBody>
            </Card>
        )
    }

    if (!status) return null

    const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length

    return (
        <div className="space-y-6">
            {/* Git Header Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-dock-surface border border-dock-border rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-dock-accent/10 text-dock-accent">
                        <GitBranch size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-dock-text">{status.branch}</span>
                            <Badge variant="info">Branch</Badge>
                        </div>
                        <p className="text-xs text-dock-muted mt-0.5">
                            Local repository is tracked
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <ArrowUp size={16} className={status.ahead > 0 ? 'text-dock-green' : 'text-dock-muted'} />
                        <div className="text-right">
                            <p className="text-sm font-bold text-dock-text">{status.ahead}</p>
                            <p className="text-[10px] uppercase text-dock-muted">Ahead</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ArrowDown size={16} className={status.behind > 0 ? 'text-dock-red' : 'text-dock-muted'} />
                        <div className="text-right">
                            <p className="text-sm font-bold text-dock-text">{status.behind}</p>
                            <p className="text-[10px] uppercase text-dock-muted">Behind</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-dock-border" />
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => pull(projectId)} disabled={isLoading}>
                            <ArrowDown size={14} className="mr-1.5" /> Pull
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => push(projectId)} disabled={isLoading}>
                            <ArrowUp size={14} className="mr-1.5" /> Push
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => sync(projectId)} disabled={isLoading}>
                            <RefreshCw size={14} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Sync
                        </Button>
                    </div>
                </div>
            </div>

            {err && (
                <div className="flex items-center gap-3 p-3 text-sm text-dock-red bg-dock-red/5 border border-dock-red/10 rounded-lg">
                    <AlertCircle size={16} />
                    {err}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Commit Section */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <div className="p-4 border-b border-dock-border flex items-center justify-between">
                            <h3 className="text-sm font-bold text-dock-text flex items-center gap-2">
                                <GitCommit size={16} className="text-dock-accent" />
                                Changes ({totalChanges})
                            </h3>
                            <div className="flex gap-2">
                                <span className="text-[10px] font-bold text-dock-green flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-dock-green" /> {status.staged.length} Staged
                                </span>
                                <span className="text-[10px] font-bold text-dock-yellow flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-dock-yellow" /> {status.unstaged.length + status.untracked.length} Unstaged
                                </span>
                            </div>
                        </div>
                        <CardBody className="space-y-4">
                            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
                                {status.staged.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-dock-bg text-xs">
                                        <span className="text-dock-text font-mono truncate">{f.path}</span>
                                        <Badge variant="success" className="text-[8px] uppercase">{f.status}</Badge>
                                    </div>
                                ))}
                                {status.unstaged.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-dock-bg text-xs">
                                        <span className="text-dock-muted font-mono truncate">{f.path}</span>
                                        <Badge variant="warning" className="text-[8px] uppercase">{f.status}</Badge>
                                    </div>
                                ))}
                                {status.untracked.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-dock-bg text-xs">
                                        <span className="text-dock-muted italic font-mono truncate">{f.path}</span>
                                        <Badge variant="default" className="text-[8px] uppercase text-dock-muted">untracked</Badge>
                                    </div>
                                ))}
                                {totalChanges === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-dock-muted">
                                        <CheckCircle2 size={24} className="mb-2 opacity-20" />
                                        <p>No changes detected</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-dock-border">
                                <textarea
                                    placeholder="Commit message..."
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    className="w-full h-24 p-3 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text focus:outline-none focus:ring-1 focus:ring-dock-accent resize-none placeholder:text-dock-muted/50"
                                />
                                <div className="flex justify-end mt-3">
                                    <Button
                                        onClick={handleCommit}
                                        disabled={!commitMessage.trim() || isCommiting || (status.staged.length === 0 && status.unstaged.length === 0)}
                                    >
                                        {isCommiting ? <RefreshCw size={14} className="animate-spin mr-1.5" /> : <GitCommit size={14} className="mr-1.5" />}
                                        Commit Changes
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Sidebar / Last Commit */}
                <div className="space-y-4">
                    <Card>
                        <div className="p-4 border-b border-dock-border">
                            <h3 className="text-sm font-bold text-dock-text">Last Commit</h3>
                        </div>
                        <CardBody>
                            {status.lastCommit ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-dock-bg rounded-lg border border-dock-border">
                                        <p className="text-sm font-medium text-dock-text line-clamp-2">
                                            {status.lastCommit.message}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2 text-[10px] text-dock-muted font-mono">
                                            <Badge variant="purple" className="px-1 text-[8px]">{status.lastCommit.hash.slice(0, 7)}</Badge>
                                            <span>{status.lastCommit.date.split(' ')[0]}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs text-dock-muted">
                                            <User size={14} className="text-dock-accent" />
                                            <span className="font-medium text-dock-text">{status.lastCommit.author}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-dock-muted">
                                            <Clock size={14} className="text-dock-accent" />
                                            <span>{new Date(status.lastCommit.date).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-dock-muted italic text-xs">
                                    No commits found
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    <Card className="bg-dock-accent/5 border-dock-accent/20">
                        <CardBody className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-dock-accent/10 text-dock-accent">
                                <GitPullRequest size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-dock-text">GitHub Tracking</p>
                                <p className="text-[10px] text-dock-muted leading-tight mt-0.5">
                                    Local changes are synced with your remote repository.
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    )
}
