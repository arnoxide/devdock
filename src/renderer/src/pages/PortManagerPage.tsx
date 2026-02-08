import { useEffect, useState } from 'react'
import { RefreshCw, Network, Skull, AlertTriangle } from 'lucide-react'
import { usePortStore } from '../stores/port-store'
import Button from '../components/ui/Button'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Dialog from '../components/ui/Dialog'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

export default function PortManagerPage() {
  const { ports, loading, scanPorts, killPort } = usePortStore()
  const [confirmKill, setConfirmKill] = useState<number | null>(null)

  useEffect(() => {
    scanPorts()
  }, [])

  const handleKill = async (port: number): Promise<void> => {
    await killPort(port)
    setConfirmKill(null)
    scanPorts()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dock-text">Port Manager</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            View and manage processes on network ports
          </p>
        </div>
        <Button variant="secondary" onClick={scanPorts} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {loading && ports.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={24} />
        </div>
      ) : ports.length === 0 ? (
        <EmptyState
          icon={<Network size={40} />}
          title="No listening ports found"
          description="No processes are currently listening on any ports."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dock-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                    Port
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                    PID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                    Process
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                    Protocol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                    State
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dock-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {ports.map((port, i) => (
                  <tr
                    key={`${port.port}-${port.pid}-${i}`}
                    className="border-b border-dock-border/50 hover:bg-dock-card/30"
                  >
                    <td className="px-4 py-2.5 font-mono text-dock-accent font-medium">
                      :{port.port}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-dock-muted">{port.pid}</td>
                    <td className="px-4 py-2.5 text-dock-text">{port.processName}</td>
                    <td className="px-4 py-2.5 text-dock-muted uppercase text-xs">
                      {port.protocol}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-dock-muted text-xs">
                      {port.localAddress}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-dock-green/10 text-dock-green text-xs rounded">
                        {port.state}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmKill(port.port)}
                      >
                        <Skull size={12} />
                        Kill
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Confirm Kill Dialog */}
      <Dialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        title="Kill Process"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-dock-yellow">
            <AlertTriangle size={20} />
            <p className="text-sm">
              Are you sure you want to kill the process on port{' '}
              <span className="font-mono font-bold">{confirmKill}</span>?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmKill(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => confirmKill && handleKill(confirmKill)}>
              Kill Process
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
