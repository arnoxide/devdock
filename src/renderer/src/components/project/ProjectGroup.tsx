import { useState } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, Folder, Trash2 } from 'lucide-react'
import { ProjectConfig, ProjectRuntime } from '../../../../shared/types'
import { useProjectStore } from '../../stores/project-store'
import ProjectCard from './ProjectCard'

interface ProjectGroupProps {
    group: ProjectConfig
    childProjects: ProjectConfig[]
    runtimes: Record<string, ProjectRuntime>
}

export default function ProjectGroup({ group, childProjects, runtimes }: ProjectGroupProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const { removeProject } = useProjectStore()

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
                className="flex items-center gap-2 px-3 py-2 bg-dock-surface/50 border border-dock-border rounded-lg cursor-pointer hover:border-dock-accent/30 transition-all group relative"
            >
                {/* Delete Button - Shows on hover */}
                <button
                    onClick={handleDelete}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-dock-bg/80 border border-dock-border opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:border-red-500/50 transition-all z-10"
                    title="Remove group and all projects"
                >
                    <Trash2 size={14} className="text-dock-muted hover:text-red-500" />
                </button>

                <div className="flex items-center gap-2 flex-1">
                    {isExpanded ? (
                        <ChevronDown size={16} className="text-dock-muted" />
                    ) : (
                        <ChevronRight size={16} className="text-dock-muted" />
                    )}
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: group.color + '20' }}
                    >
                        {isExpanded ? (
                            <FolderOpen size={14} style={{ color: group.color }} />
                        ) : (
                            <Folder size={14} style={{ color: group.color }} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-dock-text group-hover:text-dock-accent transition-colors">
                            {group.name}
                        </h3>
                        <p className="text-xs text-dock-muted">
                            {childProjects.length} project{childProjects.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="text-xs text-dock-muted/60 truncate max-w-[200px]">
                    {group.path}
                </div>
            </div>

            {/* Nested Projects */}
            {isExpanded && (
                <div className="ml-6 space-y-2 border-l-2 border-dock-border/30 pl-4">
                    {childProjects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            runtime={runtimes[project.id]}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
