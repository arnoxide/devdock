import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Activity,
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
  Globe
} from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { ApiEndpointConfig, HttpMethod } from '../../../shared/types'
import { useApiMonitorStore } from '../stores/api-monitor-store'
import { useProjectStore } from '../stores/project-store'
import EndpointStatusBadge from '../components/monitors/EndpointStatusBadge'
import ResponseTimeChart from '../components/monitors/ResponseTimeChart'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'

interface EndpointGroup {
  id: string
  name: string
  endpoints: ApiEndpointConfig[]
}

export default function ApiMonitorPage() {
  const navigate = useNavigate()
  const { endpoints, results, histories, addEndpoint, removeEndpoint } = useApiMonitorStore()
  const projects = useProjectStore((s) => s.projects)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    url: '',
    method: 'GET' as HttpMethod,
    expectedStatus: 200,
    intervalMs: 30000,
    timeoutMs: 5000,
    projectId: ''
  })

  const groups = useMemo((): EndpointGroup[] => {
    const projectMap = new Map<string, ApiEndpointConfig[]>()

    for (const ep of endpoints) {
      const key = ep.projectId || '__ungrouped__'
      if (!projectMap.has(key)) projectMap.set(key, [])
      projectMap.get(key)!.push(ep)
    }

    const result: EndpointGroup[] = []

    // Named project groups first
    for (const project of projects) {
      const eps = projectMap.get(project.id)
      if (eps && eps.length > 0) {
        result.push({ id: project.id, name: project.name, endpoints: eps })
        projectMap.delete(project.id)
      }
    }

    // Any remaining project IDs not in the project list
    for (const [key, eps] of projectMap) {
      if (key === '__ungrouped__') continue
      result.push({ id: key, name: key, endpoints: eps })
    }

    // Ungrouped last
    const ungrouped = projectMap.get('__ungrouped__')
    if (ungrouped && ungrouped.length > 0) {
      result.push({ id: '__ungrouped__', name: 'General', endpoints: ungrouped })
    }

    return result
  }, [endpoints, projects])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev: Record<string, boolean>) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const handleAdd = async (): Promise<void> => {
    const config: ApiEndpointConfig = {
      id: uuid(),
      projectId: newEndpoint.projectId,
      name: newEndpoint.name,
      url: newEndpoint.url,
      method: newEndpoint.method,
      expectedStatus: newEndpoint.expectedStatus,
      intervalMs: newEndpoint.intervalMs,
      timeoutMs: newEndpoint.timeoutMs,
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
      timeoutMs: 5000,
      projectId: ''
    })
  }

  const getGroupHealth = (group: EndpointGroup) => {
    let healthy = 0
    let unhealthy = 0
    let unknown = 0
    for (const ep of group.endpoints) {
      const r = results[ep.id]
      if (!r || r.status === 'unknown') unknown++
      else if (r.status === 'healthy') healthy++
      else unhealthy++
    }
    return { healthy, unhealthy, unknown }
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
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = !!expandedGroups[group.id]
            const health = getGroupHealth(group)

            return (
              <div key={group.id} className="border border-dock-border rounded-xl overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between p-3.5 bg-dock-surface hover:bg-dock-card/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {isExpanded
                      ? <ChevronDown size={16} className="text-dock-muted" />
                      : <ChevronRight size={16} className="text-dock-muted" />}
                    <div className="p-1.5 rounded-md bg-dock-accent/10">
                      {group.id === '__ungrouped__'
                        ? <Globe size={14} className="text-dock-accent" />
                        : <Folder size={14} className="text-dock-accent" />}
                    </div>
                    <span className="text-sm font-semibold text-dock-text">{group.name}</span>
                    <Badge variant="default" className="text-[10px]">
                      {group.endpoints.length} endpoint{group.endpoints.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {health.healthy > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-dock-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-dock-green" />
                        {health.healthy}
                      </span>
                    )}
                    {health.unhealthy > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-dock-red">
                        <span className="w-1.5 h-1.5 rounded-full bg-dock-red" />
                        {health.unhealthy}
                      </span>
                    )}
                    {health.unknown > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-dock-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-dock-muted/40" />
                        {health.unknown}
                      </span>
                    )}
                  </div>
                </button>

                {/* Endpoints Grid */}
                {isExpanded && (
                  <div className="p-3 bg-dock-bg/30">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {group.endpoints.map((endpoint) => {
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
                  </div>
                )}
              </div>
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
          <Select
            label="Project"
            value={newEndpoint.projectId}
            onChange={(e) =>
              setNewEndpoint({ ...newEndpoint, projectId: e.target.value })
            }
            options={[
              { value: '', label: 'General (no project)' },
              ...projects.map((p) => ({ value: p.id, label: p.name }))
            ]}
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
