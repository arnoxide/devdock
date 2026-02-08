import { ProjectStatus } from '../../../../shared/types'

interface StatusIndicatorProps {
  status: ProjectStatus
  size?: 'sm' | 'md'
}

const statusColors: Record<ProjectStatus, string> = {
  idle: 'bg-dock-muted/40',
  starting: 'bg-dock-yellow',
  running: 'bg-dock-green',
  stopping: 'bg-dock-yellow',
  error: 'bg-dock-red'
}

const statusLabels: Record<ProjectStatus, string> = {
  idle: 'Idle',
  starting: 'Starting...',
  running: 'Running',
  stopping: 'Stopping...',
  error: 'Error'
}

export default function StatusIndicator({ status, size = 'sm' }: StatusIndicatorProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${dotSize} rounded-full ${statusColors[status]} ${
          status === 'running' ? 'animate-pulse-green' : ''
        } ${status === 'starting' || status === 'stopping' ? 'animate-pulse' : ''}`}
      />
      <span className="text-xs text-dock-muted">{statusLabels[status]}</span>
    </div>
  )
}
