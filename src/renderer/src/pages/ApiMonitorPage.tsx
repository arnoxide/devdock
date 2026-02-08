import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Activity, Trash2, RefreshCw } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { ApiEndpointConfig, HttpMethod } from '../../../shared/types'
import { useApiMonitorStore } from '../stores/api-monitor-store'
import EndpointStatusBadge from '../components/monitors/EndpointStatusBadge'
import ResponseTimeChart from '../components/monitors/ResponseTimeChart'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'

export default function ApiMonitorPage() {
  const navigate = useNavigate()
  const { endpoints, results, histories, addEndpoint, removeEndpoint } = useApiMonitorStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    url: '',
    method: 'GET' as HttpMethod,
    expectedStatus: 200,
    intervalMs: 30000,
    timeoutMs: 5000
  })

  const handleAdd = async (): Promise<void> => {
    const config: ApiEndpointConfig = {
      id: uuid(),
      projectId: '',
      ...newEndpoint,
      headers: {},
      body: undefined,
      enabled: true
    }
    await addEndpoint(config)
    setShowAdd(false)
    setNewEndpoint({
      name: '',
      url: '',
      method: 'GET',
      expectedStatus: 200,
      intervalMs: 30000,
      timeoutMs: 5000
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dock-text">API Monitor</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Monitor your API endpoints health and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/api-monitor/metrics')}>
            <Activity size={16} />
            View Metrics
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add Endpoint
          </Button>
        </div>
      </div>

      {endpoints.length === 0 ? (
        <EmptyState
          icon={<Activity size={40} />}
          title="No endpoints monitored"
          description="Add an API endpoint to start monitoring its health and response times."
          action={
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={16} />
              Add Endpoint
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {endpoints.map((endpoint) => {
            const result = results[endpoint.id]
            const history = histories[endpoint.id]

            return (
              <Card key={endpoint.id}>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-1.5 py-0.5 bg-dock-card rounded text-dock-muted">
                      {endpoint.method}
                    </span>
                    <span className="text-sm font-medium text-dock-text">
                      {endpoint.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EndpointStatusBadge status={result?.status || 'unknown'} />
                    <button
                      onClick={() => removeEndpoint(endpoint.id)}
                      className="text-dock-muted hover:text-dock-red transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  <p className="text-xs font-mono text-dock-muted truncate">{endpoint.url}</p>

                  {result && (
                    <div className="flex items-center gap-4 text-xs text-dock-muted">
                      {result.statusCode && <span>Status: {result.statusCode}</span>}
                      {result.responseTimeMs != null && (
                        <span>Response: {result.responseTimeMs}ms</span>
                      )}
                      {result.error && (
                        <span className="text-dock-red">{result.error}</span>
                      )}
                    </div>
                  )}

                  {history && history.results.length > 1 && (
                    <ResponseTimeChart results={history.results} />
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Endpoint Dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add API Endpoint">
        <div className="space-y-3">
          <Input
            label="Name"
            placeholder="e.g. User API Health"
            value={newEndpoint.name}
            onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
          />
          <Input
            label="URL"
            placeholder="http://localhost:3000/api/health"
            value={newEndpoint.url}
            onChange={(e) => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Method"
              value={newEndpoint.method}
              onChange={(e) =>
                setNewEndpoint({ ...newEndpoint, method: e.target.value as HttpMethod })
              }
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'DELETE', label: 'DELETE' }
              ]}
            />
            <Input
              label="Expected Status"
              type="number"
              value={newEndpoint.expectedStatus}
              onChange={(e) =>
                setNewEndpoint({ ...newEndpoint, expectedStatus: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Interval (ms)"
              type="number"
              value={newEndpoint.intervalMs}
              onChange={(e) =>
                setNewEndpoint({ ...newEndpoint, intervalMs: parseInt(e.target.value) })
              }
            />
            <Input
              label="Timeout (ms)"
              type="number"
              value={newEndpoint.timeoutMs}
              onChange={(e) =>
                setNewEndpoint({ ...newEndpoint, timeoutMs: parseInt(e.target.value) })
              }
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newEndpoint.name || !newEndpoint.url}>
              Add Endpoint
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
