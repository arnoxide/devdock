import { EndpointStatus } from '../../../../shared/types'

interface EndpointStatusBadgeProps {
  status: EndpointStatus
}

const statusConfig: Record<EndpointStatus, { label: string; color: string; dot: string }> = {
  healthy: {
    label: 'Healthy',
    color: 'bg-dock-green/10 text-dock-green border-dock-green/20',
    dot: 'bg-dock-green'
  },
  degraded: {
    label: 'Degraded',
    color: 'bg-dock-yellow/10 text-dock-yellow border-dock-yellow/20',
    dot: 'bg-dock-yellow'
  },
  down: {
    label: 'Down',
    color: 'bg-dock-red/10 text-dock-red border-dock-red/20',
    dot: 'bg-dock-red'
  },
  unknown: {
    label: 'Unknown',
    color: 'bg-dock-card text-dock-muted border-dock-border',
    dot: 'bg-dock-muted'
  }
}

export default function EndpointStatusBadge({ status }: EndpointStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${config.color}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
