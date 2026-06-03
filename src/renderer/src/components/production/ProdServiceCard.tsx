import type { MouseEvent } from 'react'
import { ExternalLink, Globe2, MapPin } from 'lucide-react'
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
  const openService = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (service.url) window.open(service.url, '_blank')
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick()
      }}
      className={`group relative flex items-start gap-3 p-3 rounded-lg border text-left transition-all w-full cursor-pointer ${
        selected
          ? 'border-dock-accent bg-dock-accent/10 shadow-[inset_3px_0_0_rgba(34,211,238,0.85)]'
          : 'border-dock-border bg-dock-card/25 hover:border-dock-accent/35 hover:bg-dock-card/60'
      }`}
    >
      <ProviderIcon provider={service.provider} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-dock-text truncate">{service.name}</p>
          {latestDeploy && <DeployStatusBadge status={latestDeploy.status} />}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-dock-muted mt-1">
          <span className="capitalize">{service.type}</span>
          {service.accountName && <span>{service.accountName}</span>}
          {service.region && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin size={10} />
              {service.region}
            </span>
          )}
        </div>
        {service.url && (
          <p className="flex items-center gap-1 text-[10px] text-dock-muted/80 mt-2 truncate">
            <Globe2 size={10} />
            {service.url.replace(/^https?:\/\//, '')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {service.url && (
          <button
            type="button"
            onClick={openService}
            className="opacity-70 group-hover:opacity-100 text-dock-muted hover:text-dock-accent transition-colors"
            aria-label={`Open ${service.name}`}
          >
            <ExternalLink size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
