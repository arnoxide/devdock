import { useState } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, Folder, Trash2, RefreshCw, Code2 } from 'lucide-react'
import { ProjectConfig } from '../../../../shared/types'
import { useProjectStore } from '../../stores/project-store'
import ProjectCard from './ProjectCard'

interface ProjectGroupProps {
    group: ProjectConfig
    childProjects: ProjectConfig[]
}

export default function ProjectGroup({ group, childProjects }: ProjectGroupProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [syncMsg, setSyncMsg] = useState<string | null>(null)
    const removeProject = useProjectStore((s) => s.removeProject)
    const syncGroup = useProjectStore((s) => s.syncGroup)
    const runtimes = useProjectStore((s) => s.runtimes)

    const handleSync = async (e: React.MouseEvent): Promise<void> => {
        e.stopPropagation()
        setSyncing(true)
        setSyncMsg(null)
        try {
            const added = await syncGroup(group.id)
            setSyncMsg(added.length > 0 ? `+${added.length} new project${added.length > 1 ? 's' : ''} found` : 'Already up to date')
            if (added.length > 0) setIsExpanded(true)
        } catch (err) {
            setSyncMsg('Sync failed')
        } finally {
            setSyncing(false)
            setTimeout(() => setSyncMsg(null), 3000)
        }
    }

    const handleDelete = async (e: React.MouseEvent): Promise<void> => {
        e.stopPropagation()

        // Check if any child project is running
        const runningProjects = childProjects.filter(
            (child) => runtimes[child.id]?.status === 'running'
        )

        if (runningProjects.length > 0) {
            alert(
                `Please stop all running projects before deleting this group.\n\nRunning: ${runningProjects.map((p) => p.name).join(', ')}`
            )
            return
        }

        const confirmed = confirm(
            `Are you sure you want to remove "${group.name}" and all its ${childProjects.length} project(s) from DevDock?\n\nThis will only remove them from the list, not delete the actual files.`
        )

        if (confirmed) {
            // Delete all child projects first
            for (const child of childProjects) {
                await removeProject(child.id)
            }
            // Then delete the group
            await removeProject(group.id)
        }
    }

    return (
        <div className="space-y-2">
            {/* Group Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-3 py-2 bg-dock-surface/50 border border-dock-border rounded-lg cursor-pointer hover:border-dock-accent/30 transition-all group"
            >
                {/* Chevron + icon */}
                {isExpanded ? (
                    <ChevronDown size={16} className="text-dock-muted shrink-0" />
                ) : (
                    <ChevronRight size={16} className="text-dock-muted shrink-0" />
                )}
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: group.color + '20' }}
                >
                    {isExpanded ? (
                        <FolderOpen size={14} style={{ color: group.color }} />
                    ) : (
                        <Folder size={14} style={{ color: group.color }} />
                    )}
                </div>

                {/* Name + count */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-dock-text group-hover:text-dock-accent transition-colors">
                        {group.name}
                    </h3>
                    <p className="text-xs text-dock-muted">
                        {childProjects.length} project{childProjects.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Right side: path hides on hover, buttons appear */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-dock-muted/60 truncate max-w-[180px] group-hover:hidden">
                        {group.path}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1">
                        {syncMsg && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                syncMsg.startsWith('+') ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-dock-muted border-dock-border'
                            }`}>
                                {syncMsg}
                            </span>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); window.api.openInEditor(group.path) }}
                            className="p-1.5 rounded-lg border border-dock-border hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
                            title="Open folder in VSCode"
                        >
                            <Code2 size={13} className="text-dock-muted hover:text-blue-400" />
                        </button>
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="p-1.5 rounded-lg border border-dock-border hover:bg-dock-accent/10 hover:border-dock-accent/50 transition-all"
                            title="Sync folder — detect new projects"
                        >
                            <RefreshCw size={13} className={`text-dock-muted ${syncing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-1.5 rounded-lg border border-dock-border hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                            title="Remove group"
                        >
                            <Trash2 size={13} className="text-dock-muted hover:text-red-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Nested Projects */}
            {isExpanded && (
                <div className="ml-6 space-y-2 border-l-2 border-dock-border/30 pl-4">
                    {childProjects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
