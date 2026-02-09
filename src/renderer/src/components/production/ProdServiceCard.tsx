import { ExternalLink } from 'lucide-react'
import { ProdService, ProdDeployment } from '../../../../shared/types'
import ProviderIcon from './ProviderIcon'
import DeployStatusBadge from './DeployStatusBadge'

interface ProdServiceCardProps {
  service: ProdService
  latestDeploy?: ProdDeployment
  selected: boolean
  onClick: () => void
}

export default function ProdServiceCard({
  service,
  latestDeploy,
  selected,
  onClick
}: ProdServiceCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full ${
        selected
          ? 'border-dock-accent bg-dock-accent/5'
          : 'border-dock-border hover:border-dock-accent/30 hover:bg-dock-card/50'
      }`}
    >
      <ProviderIcon provider={service.provider} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dock-text truncate">{service.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-dock-muted">
          <span className="capitalize">{service.type}</span>
          {service.region && <span>· {service.region}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {latestDeploy && <DeployStatusBadge status={latestDeploy.status} />}
        {service.url && (
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-dock-muted hover:text-dock-accent transition-colors"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </button>
  )
}
