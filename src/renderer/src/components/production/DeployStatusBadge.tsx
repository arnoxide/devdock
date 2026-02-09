import { DeployStatus } from '../../../../shared/types'

const statusConfig: Record<DeployStatus, { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-dock-green/10 text-dock-green border-dock-green/30' },
  building: {
    label: 'Building',
    className: 'bg-dock-yellow/10 text-dock-yellow border-dock-yellow/30'
  },
  deploying: {
    label: 'Deploying',
    className: 'bg-dock-yellow/10 text-dock-yellow border-dock-yellow/30'
  },
  queued: { label: 'Queued', className: 'bg-dock-muted/10 text-dock-muted border-dock-border' },
  failed: { label: 'Failed', className: 'bg-dock-red/10 text-dock-red border-dock-red/30' },
  crashed: { label: 'Crashed', className: 'bg-dock-red/10 text-dock-red border-dock-red/30' },
  canceled: {
    label: 'Canceled',
    className: 'bg-dock-muted/10 text-dock-muted border-dock-border'
  },
  unknown: { label: 'Unknown', className: 'bg-dock-muted/10 text-dock-muted border-dock-border' }
}

interface DeployStatusBadgeProps {
  status: DeployStatus
}

export default function DeployStatusBadge({ status }: DeployStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unknown

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'live'
            ? 'bg-dock-green'
            : status === 'building' || status === 'deploying'
              ? 'bg-dock-yellow animate-pulse'
              : status === 'failed' || status === 'crashed'
                ? 'bg-dock-red'
                : 'bg-dock-muted'
        }`}
      />
      {config.label}
    </span>
  )
}
