import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { PlatformProvider } from '../../../../shared/types'
import { useProdMetricsStore } from '../../stores/prod-metrics-store'
import Dialog from '../ui/Dialog'

interface DeployLogViewerProps {
  open: boolean
  onClose: () => void
  provider: PlatformProvider
  serviceId: string
  deployId: string
}

export default function DeployLogViewer({
  open,
  onClose,
  provider,
  serviceId,
  deployId
}: DeployLogViewerProps) {
  const { deployLogs, loadDeployLogs } = useProdMetricsStore()
  const logs = deployLogs[deployId]

  useEffect(() => {
    if (open && deployId && !logs) {
      loadDeployLogs(provider, serviceId, deployId)
    }
  }, [open, deployId])

  return (
    <Dialog open={open} onClose={onClose} title="Deploy Logs">
      <div className="max-h-[500px] overflow-auto">
        {logs === undefined ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-dock-muted" />
            <span className="text-xs text-dock-muted ml-2">Loading logs...</span>
          </div>
        ) : (
          <pre className="text-[11px] font-mono text-dock-text whitespace-pre-wrap leading-relaxed bg-dock-bg p-3 rounded-lg border border-dock-border">
            {logs || 'No logs available'}
          </pre>
        )}
      </div>
    </Dialog>
  )
}
