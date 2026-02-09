import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { PlatformProvider, ProviderStatus } from '../../../../shared/types'
import ProviderIcon, { getProviderLabel } from './ProviderIcon'
import Button from '../ui/Button'

interface ProviderStatusCardProps {
  provider: PlatformProvider
  status?: ProviderStatus
  hasCredentials: boolean
  onTest: () => void
  testing?: boolean
}

export default function ProviderStatusCard({
  provider,
  status,
  hasCredentials,
  onTest,
  testing
}: ProviderStatusCardProps) {
  const connected = status?.connectionStatus === 'connected'
  const isError = status?.connectionStatus === 'error'
  const checking = status?.connectionStatus === 'checking' || testing

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        connected
          ? 'border-dock-green/30 bg-dock-green/5'
          : isError
            ? 'border-dock-red/30 bg-dock-red/5'
            : 'border-dock-border bg-dock-card/50'
      }`}
    >
      <ProviderIcon provider={provider} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dock-text">{getProviderLabel(provider)}</p>
        <div className="flex items-center gap-2 text-[10px] text-dock-muted">
          {checking ? (
            <span className="flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> Checking...
            </span>
          ) : connected ? (
            <span className="flex items-center gap-1 text-dock-green">
              <Wifi size={10} /> Connected
              {status?.serviceCount !== undefined && ` · ${status.serviceCount} services`}
            </span>
          ) : isError ? (
            <span className="text-dock-red truncate">{status?.error || 'Connection failed'}</span>
          ) : hasCredentials ? (
            <span>Not tested</span>
          ) : (
            <span className="flex items-center gap-1">
              <WifiOff size={10} /> No credentials
            </span>
          )}
        </div>
      </div>
      {hasCredentials && (
        <Button variant="ghost" size="sm" onClick={onTest} disabled={checking}>
          Test
        </Button>
      )}
    </div>
  )
}
