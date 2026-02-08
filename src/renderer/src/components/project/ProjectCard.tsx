import { useNavigate } from 'react-router-dom'
import { Play, Square, RotateCw, Folder, Clock } from 'lucide-react'
import { ProjectConfig, ProjectRuntime } from '../../../../shared/types'
import { useProcessStore } from '../../stores/process-store'
import ProjectTypeBadge from './ProjectTypeBadge'
import StatusIndicator from './StatusIndicator'
import Button from '../ui/Button'
import { formatDistanceToNow } from 'date-fns'

interface ProjectCardProps {
  project: ProjectConfig
  runtime?: ProjectRuntime
}

export default function ProjectCard({ project, runtime }: ProjectCardProps) {
  const navigate = useNavigate()
  const { startServer, stopServer, restartServer } = useProcessStore()

  const status = runtime?.status || 'idle'
  const isRunning = status === 'running'
  const isTransitioning = status === 'starting' || status === 'stopping'

  const handleStart = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    await startServer(project.id)
  }

  const handleStop = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    await stopServer(project.id)
  }

  const handleRestart = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    await restartServer(project.id)
  }

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-dock-surface border border-dock-border rounded-xl p-4 hover:border-dock-accent/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: project.color + '20' }}
          >
            <Folder size={16} style={{ color: project.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dock-text group-hover:text-dock-accent transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-dock-muted truncate max-w-[180px]">{project.path}</p>
          </div>
        </div>
        <ProjectTypeBadge type={project.type} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} />
          {runtime?.port && (
            <span className="text-xs text-dock-accent">:{runtime.port}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isRunning ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                disabled={isTransitioning}
                title="Restart"
              >
                <RotateCw size={14} />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleStop}
                disabled={isTransitioning}
              >
                <Square size={12} />
                Stop
              </Button>
            </>
          ) : (
            <Button
              variant="success"
              size="sm"
              onClick={handleStart}
              disabled={isTransitioning || !project.startCommand}
              title={project.startCommand || 'No start command'}
            >
              <Play size={12} />
              Start
            </Button>
          )}
        </div>
      </div>

      {project.lastOpenedAt && (
        <div className="flex items-center gap-1 mt-2 text-xs text-dock-muted/60">
          <Clock size={10} />
          {formatDistanceToNow(new Date(project.lastOpenedAt), { addSuffix: true })}
        </div>
      )}
    </div>
  )
}
