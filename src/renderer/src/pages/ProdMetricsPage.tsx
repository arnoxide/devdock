import { useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  Clock,
  ExternalLink,
  Globe,
  HardDrive,
  RefreshCw,
  Rocket,
  Server,
  Settings2,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import {
  PlatformProvider,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  ProdService
} from '../../../shared/types'
import { useProdMetricsStore } from '../stores/prod-metrics-store'
import ProviderIcon, { getProviderLabel } from '../components/production/ProviderIcon'
import ProviderStatusCard from '../components/production/ProviderStatusCard'
import ProdServiceCard from '../components/production/ProdServiceCard'
import DeploymentList from '../components/production/DeploymentList'
import DeployLogViewer from '../components/production/DeployLogViewer'
import PerformanceCharts from '../components/production/PerformanceCharts'
import ResourceCharts from '../components/production/ResourceCharts'
import ProdCredentialsForm from '../components/production/ProdCredentialsForm'
import DeployStatusBadge from '../components/production/DeployStatusBadge'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import Card, { CardBody, CardHeader } from '../components/ui/Card'

const ALL_PROVIDERS: PlatformProvider[] = [
  'vercel',
  'netlify',
  'cloudflare',
  'render',
  'railway',
  'fly',
  'heroku',
  'digitalocean',
  'aws'
]

interface ProviderGroup {
  provider: PlatformProvider
  services: ProdService[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function ServiceSelector({
  groups,
  selectedServiceId,
  onSelect
}: {
  groups: ProviderGroup[]
  selectedServiceId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.provider}>
          <div className="flex items-center gap-2 mb-2">
            <ProviderIcon provider={group.provider} size="sm" />
            <span className="text-[11px] font-semibold text-dock-muted uppercase tracking-wide">
              {getProviderLabel(group.provider)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-7">
            {group.services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => onSelect(svc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors text-left ${selectedServiceId === svc.id
                  ? 'border-dock-accent bg-dock-accent/10 text-dock-accent font-medium'
                  : 'border-dock-border text-dock-muted hover:text-dock-text hover:border-dock-accent/30'
                  }`}
              >
                <span>{svc.name}</span>
                {svc.accountName && (
                  <span className="block text-[10px] opacity-70 mt-0.5">{svc.accountName}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <p className="text-xs text-dock-muted text-center py-4">
          No services available
        </p>
      )}
    </div>
  )
}

function ProductionTabShell({
  title,
  subtitle,
  service,
  groups,
  selectedServiceId,
  onSelect,
  children
}: {
  title: string
  subtitle: string
  service: ProdService | undefined
  groups: ProviderGroup[]
  selectedServiceId: string | null
  onSelect: (id: string) => void
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[minmax(260px,340px)_1fr] gap-5 items-start">
      <Card className="overflow-hidden">
        <CardHeader>
          <h2 className="text-sm font-semibold text-dock-text">Service</h2>
          <p className="text-xs text-dock-muted mt-0.5">Switch production target</p>
        </CardHeader>
        <CardBody>
          <ServiceSelector
            groups={groups}
            selectedServiceId={selectedServiceId}
            onSelect={onSelect}
          />
        </CardBody>
      </Card>

      <div className="space-y-4 min-w-0">
        <Card>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-dock-muted">{subtitle}</p>
              <h2 className="text-lg font-semibold text-dock-text truncate">{title}</h2>
              {service ? (
                <div className="flex items-center gap-2 text-xs text-dock-muted mt-1">
                  <ProviderIcon provider={service.provider} size="sm" />
                  <span>{getProviderLabel(service.provider)}</span>
                  <span className="capitalize">{service.type}</span>
                  {service.region && <span>{service.region}</span>}
                </div>
              ) : (
                <p className="text-xs text-dock-muted mt-1">No service selected</p>
              )}
            </div>
            {service?.url && (
              <Button variant="secondary" size="sm" onClick={() => window.open(service.url!, '_blank')}>
                <ExternalLink size={13} />
                Open
              </Button>
            )}
          </CardBody>
        </Card>

        {children}
      </div>
    </div>
  )
}

function SelectedServicePanel({
  service,
  deployments,
  performance,
  resources,
  onOpenDeployments,
  onOpenPerformance,
  onOpenResources,
  onViewLogs,
  onRollback
}: {
  service: ProdService | undefined
  deployments: ProdDeployment[]
  performance: ProdPerformanceMetrics[]
  resources: ProdResourceMetrics[]
  onOpenDeployments: () => void
  onOpenPerformance: () => void
  onOpenResources: () => void
  onViewLogs: (deployId: string) => void
  onRollback: (deployId: string) => void
}) {
  if (!service) {
    return (
      <Card className="h-full">
        <CardBody className="min-h-[340px] flex items-center justify-center text-center">
          <div>
            <Server size={34} className="mx-auto text-dock-muted mb-3" />
            <p className="text-sm font-medium text-dock-text">Select a service</p>
            <p className="text-xs text-dock-muted mt-1">
              Choose a production service to inspect deployments and metrics.
            </p>
          </div>
        </CardBody>
      </Card>
    )
  }

  const latestDeploy = deployments?.[0]
  const latestPerf = performance?.[performance.length - 1]
  const latestResource = resources?.[resources.length - 1]

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ProviderIcon provider={service.provider} />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-dock-text truncate">
                {service.name}
              </h2>
              <p className="text-xs text-dock-muted truncate">
                {getProviderLabel(service.provider)} · {service.type}
                {service.region ? ` · ${service.region}` : ''}
              </p>
            </div>
          </div>
        </div>
        {service.url && (
          <Button variant="secondary" size="sm" onClick={() => window.open(service.url!, '_blank')}>
            <ExternalLink size={13} />
            Open
          </Button>
        )}
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onOpenDeployments}
            className="rounded-lg border border-dock-border bg-dock-bg/60 p-3 text-left hover:border-dock-accent/35 hover:bg-dock-card/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-dock-muted">
              <Rocket size={13} />
              Latest Deploy
            </div>
            <div className="mt-2">
              {latestDeploy ? <DeployStatusBadge status={latestDeploy.status} /> : <span className="text-sm text-dock-text">--</span>}
            </div>
            <p className="text-[10px] text-dock-muted mt-2">
              {latestDeploy ? timeAgo(latestDeploy.createdAt) : 'No deployments loaded'}
            </p>
          </button>

          <button
            onClick={onOpenPerformance}
            className="rounded-lg border border-dock-border bg-dock-bg/60 p-3 text-left hover:border-dock-accent/35 hover:bg-dock-card/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-dock-muted">
              <Activity size={13} />
              Response
            </div>
            <p className="mt-2 text-xl font-bold text-dock-text">
              {latestPerf?.responseTimeMs !== null && latestPerf?.responseTimeMs !== undefined
                ? `${Math.round(latestPerf.responseTimeMs)}ms`
                : '--'}
            </p>
            <p className="text-[10px] text-dock-muted mt-1">
              {latestPerf?.errorRate !== null && latestPerf?.errorRate !== undefined
                ? `${latestPerf.errorRate}% errors`
                : 'Performance metrics'}
            </p>
          </button>

          <button
            onClick={onOpenResources}
            className="rounded-lg border border-dock-border bg-dock-bg/60 p-3 text-left hover:border-dock-accent/35 hover:bg-dock-card/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-dock-muted">
              <HardDrive size={13} />
              Memory
            </div>
            <p className="mt-2 text-xl font-bold text-dock-text">
              {latestResource?.memoryPercent !== null && latestResource?.memoryPercent !== undefined
                ? `${Math.round(latestResource.memoryPercent)}%`
                : '--'}
            </p>
            <p className="text-[10px] text-dock-muted mt-1">
              {formatBytes(latestResource?.memoryUsedBytes ?? null)}
            </p>
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-dock-muted uppercase tracking-wide">
              Recent Deployments
            </h3>
            <button onClick={onOpenDeployments} className="text-xs text-dock-muted hover:text-dock-text">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {(deployments || []).slice(0, 4).map((deploy) => (
              <div
                key={deploy.id}
                className="flex items-center gap-3 rounded-lg border border-dock-border/70 bg-dock-bg/40 px-3 py-2"
              >
                <DeployStatusBadge status={deploy.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-dock-text truncate">
                    {deploy.commitMessage || deploy.commitHash || deploy.id}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-dock-muted mt-0.5">
                    {deploy.branch && <span>{deploy.branch}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Clock size={9} />
                      {timeAgo(deploy.createdAt)}
                    </span>
                    <span>{formatDuration(deploy.duration)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onViewLogs(deploy.id)}>
                  Logs
                </Button>
                {(deploy.status === 'live' || deploy.status === 'failed') && (
                  <Button variant="ghost" size="sm" onClick={() => onRollback(deploy.id)}>
                    Rollback
                  </Button>
                )}
              </div>
            ))}
            {(!deployments || deployments.length === 0) && (
              <div className="rounded-lg border border-dock-border/70 bg-dock-bg/40 px-3 py-8 text-center text-xs text-dock-muted">
                No deployments loaded for this service yet
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default function ProdMetricsPage() {
  const {
    credentials,
    services,
    deployments,
    performance,
    resources,
    providerStatuses,
    selectedServiceId,
    loading,
    loadCredentials,
    loadServices,
    loadDeployments,
    testConnection,
    refreshNow,
    startMonitoring,
    selectService,
    triggerRollback
  } = useProdMetricsStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [showSettings, setShowSettings] = useState(false)
  const [logViewDeploy, setLogViewDeploy] = useState<string | null>(null)
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadCredentials()
    loadServices()
  }, [])

  useEffect(() => {
    if (credentials.some((c) => c.enabled)) {
      startMonitoring()
    }
  }, [credentials])

  const providerGroups = useMemo((): ProviderGroup[] => {
    const grouped = new Map<PlatformProvider, ProdService[]>()
    for (const svc of services) {
      if (!grouped.has(svc.provider)) grouped.set(svc.provider, [])
      grouped.get(svc.provider)!.push(svc)
    }

    // Maintain consistent order
    return ALL_PROVIDERS
      .filter((p) => grouped.has(p))
      .map((p) => ({ provider: p, services: grouped.get(p)! }))
  }, [services])

  useEffect(() => {
    setExpandedProviders((current) => {
      const next = { ...current }
      for (const group of providerGroups) {
        if (next[group.provider] === undefined) next[group.provider] = true
      }
      return next
    })
  }, [providerGroups])

  const configuredProviders = useMemo(() => {
    return ALL_PROVIDERS.filter((p) => credentials.some((c) => c.provider === p))
  }, [credentials])
  const configuredCredentials = useMemo(() => {
    return credentials.filter((credential) => credential.enabled)
  }, [credentials])

  const selectedService = services.find((s) => s.id === selectedServiceId)
  const selectedDeploys = selectedServiceId ? deployments[selectedServiceId] || [] : []
  const selectedPerf = selectedServiceId ? performance[selectedServiceId] || [] : []
  const selectedResources = selectedServiceId ? resources[selectedServiceId] || [] : []

  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      handleSelectService(services[0].id)
    }
  }, [services, selectedServiceId])

  const handleSelectService = (serviceId: string) => {
    selectService(serviceId)
    loadDeployments(serviceId)
  }

  const handleTestAccount = async (provider: PlatformProvider, accountId: string) => {
    setTesting((t) => ({ ...t, [accountId]: true }))
    await testConnection(provider, accountId)
    setTesting((t) => ({ ...t, [accountId]: false }))
  }

  const handleRollback = async (deployId: string) => {
    if (!selectedService) return
    const result = await triggerRollback(
      selectedService.provider,
      selectedService.id,
      deployId
    )
    if (!result.ok) {
      console.error('Rollback failed:', result.error)
    }
  }

  const toggleProvider = (provider: string) => {
    setExpandedProviders((prev: Record<string, boolean>) => ({ ...prev, [provider]: !prev[provider] }))
  }

  const hasCredentials = credentials.length > 0
  const latestDeployments = services
    .map((service) => deployments[service.id]?.[0])
    .filter((deploy): deploy is ProdDeployment => Boolean(deploy))
  const liveCount = latestDeployments.filter((deploy) => deploy.status === 'live').length
  const issueCount = latestDeployments.filter((deploy) =>
    deploy.status === 'failed' || deploy.status === 'crashed'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dock-text">Production Metrics</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Monitor deployments across your cloud platforms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshNow}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
            <Settings2 size={14} />
          </Button>
        </div>
      </div>

      {!hasCredentials ? (
        <EmptyState
          icon={<Globe size={40} />}
          title="No platforms configured"
          description="Add API tokens for Render, Railway, Vercel, or AWS to monitor your production deployments."
          action={
            <Button onClick={() => setShowSettings(true)}>
              <Settings2 size={16} />
              Configure Platforms
            </Button>
          }
        />
      ) : (
        <>
          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'deployments', label: 'Deployments' },
              { id: 'performance', label: 'Performance' },
              { id: 'resources', label: 'Resources' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-3">
                <Card>
                  <CardBody className="flex items-center gap-3 min-h-[86px]">
                    <div className="w-10 h-10 rounded-lg bg-dock-accent/10 border border-dock-accent/20 flex items-center justify-center">
                      <Server size={18} className="text-dock-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-dock-text">{services.length}</p>
                      <p className="text-xs text-dock-muted">Services</p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="flex items-center gap-3 min-h-[86px]">
                    <div className="w-10 h-10 rounded-lg bg-dock-green/10 border border-dock-green/20 flex items-center justify-center">
                      <Rocket size={18} className="text-dock-green" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-dock-text">{liveCount}</p>
                      <p className="text-xs text-dock-muted">Live</p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="flex items-center gap-3 min-h-[86px]">
                    <div className="w-10 h-10 rounded-lg bg-dock-red/10 border border-dock-red/20 flex items-center justify-center">
                      <Activity size={18} className="text-dock-red" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-dock-text">{issueCount}</p>
                      <p className="text-xs text-dock-muted">Needs attention</p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="flex items-center gap-3 min-h-[86px]">
                    <div className="w-10 h-10 rounded-lg bg-dock-purple/10 border border-dock-purple/20 flex items-center justify-center">
                      <Globe size={18} className="text-dock-purple" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-dock-text">{configuredProviders.length}</p>
                      <p className="text-xs text-dock-muted">Platforms</p>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {loading && services.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size={20} />
                  <span className="text-xs text-dock-muted ml-2">
                    Loading services...
                  </span>
                </div>
              ) : providerGroups.length > 0 ? (
                <div className="grid grid-cols-[minmax(320px,420px)_1fr] gap-5 items-start">
                  <Card className="overflow-hidden">
                    <CardHeader className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-dock-text">Production Services</h2>
                      <Badge variant="default">{services.length}</Badge>
                    </CardHeader>
                    <div className="max-h-[620px] overflow-y-auto">
                      {providerGroups.map((group) => {
                        const isExpanded = !!expandedProviders[group.provider]

                        return (
                          <div key={group.provider} className="border-t border-dock-border/70 first:border-t-0">
                            <button
                              onClick={() => toggleProvider(group.provider)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-dock-surface/70 hover:bg-dock-card/60 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                {isExpanded
                                  ? <ChevronDown size={15} className="text-dock-muted" />
                                  : <ChevronRight size={15} className="text-dock-muted" />}
                                <ProviderIcon provider={group.provider} size="sm" />
                                <span className="text-xs font-semibold text-dock-text">
                                  {getProviderLabel(group.provider)}
                                </span>
                                <Badge variant="default" className="text-[10px]">
                                  {group.services.length}
                                </Badge>
                              </div>
                              <Badge variant="default" className="text-[10px]">
                                {new Set(group.services.map((svc) => svc.accountId)).size} account
                                {new Set(group.services.map((svc) => svc.accountId)).size === 1 ? '' : 's'}
                              </Badge>
                            </button>

                            {isExpanded && (
                              <div className="p-3 space-y-2">
                                {group.services.map((svc) => (
                                  <ProdServiceCard
                                    key={svc.id}
                                    service={svc}
                                    latestDeploy={deployments[svc.id]?.[0]}
                                    selected={selectedServiceId === svc.id}
                                    onClick={() => handleSelectService(svc.id)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  <div className="space-y-4">
                    <SelectedServicePanel
                      service={selectedService}
                      deployments={selectedDeploys}
                      performance={selectedPerf}
                      resources={selectedResources}
                      onOpenDeployments={() => setActiveTab('deployments')}
                      onOpenPerformance={() => setActiveTab('performance')}
                      onOpenResources={() => setActiveTab('resources')}
                      onViewLogs={(deployId) => setLogViewDeploy(deployId)}
                      onRollback={handleRollback}
                    />
                    <div className={`grid gap-3 ${configuredCredentials.length <= 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      }`}>
                      {configuredCredentials.map((credential) => {
                        const accountId = credential.id || `${credential.provider}:default`
                        return (
                        <ProviderStatusCard
                          key={accountId}
                          provider={credential.provider}
                          accountName={credential.accountName}
                          status={providerStatuses[accountId]}
                          hasCredentials={true}
                          onTest={() => handleTestAccount(credential.provider, accountId)}
                          testing={testing[accountId]}
                        />
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-dock-muted text-center py-8">
                  No services found. Click Refresh or check your API tokens.
                </p>
              )}
            </div>
          )}

          {activeTab === 'deployments' && (
            <ProductionTabShell
              title={selectedService ? selectedService.name : 'Deployments'}
              subtitle="Deployment history"
              service={selectedService}
              groups={providerGroups}
              selectedServiceId={selectedServiceId}
              onSelect={handleSelectService}
            >
              {selectedService ? (
                <DeploymentList
                  deployments={selectedDeploys}
                  provider={selectedService.provider}
                  onViewLogs={(deployId) => setLogViewDeploy(deployId)}
                  onRollback={handleRollback}
                />
              ) : (
                <Card>
                  <CardBody className="py-10 text-center text-xs text-dock-muted">
                    Select a service to view its deployments
                  </CardBody>
                </Card>
              )}
            </ProductionTabShell>
          )}

          {activeTab === 'performance' && (
            <ProductionTabShell
              title={selectedService ? selectedService.name : 'Performance'}
              subtitle="Traffic and latency"
              service={selectedService}
              groups={providerGroups}
              selectedServiceId={selectedServiceId}
              onSelect={handleSelectService}
            >
              {selectedService ? (
                <PerformanceCharts metrics={selectedPerf} />
              ) : (
                <Card>
                  <CardBody className="py-10 text-center text-xs text-dock-muted">
                    Select a service to view performance metrics
                  </CardBody>
                </Card>
              )}
            </ProductionTabShell>
          )}

          {activeTab === 'resources' && (
            <ProductionTabShell
              title={selectedService ? selectedService.name : 'Resources'}
              subtitle="Compute, memory, and disk"
              service={selectedService}
              groups={providerGroups}
              selectedServiceId={selectedServiceId}
              onSelect={handleSelectService}
            >
              {selectedService ? (
                <ResourceCharts
                  metrics={selectedResources}
                  provider={selectedService.provider}
                />
              ) : (
                <Card>
                  <CardBody className="py-10 text-center text-xs text-dock-muted">
                    Select a service to view resource usage
                  </CardBody>
                </Card>
              )}
            </ProductionTabShell>
          )}
        </>
      )}

      {/* Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Platform Credentials"
        maxWidth="max-w-6xl max-h-[88vh] overflow-y-auto"
      >
        <p className="text-xs text-dock-muted mb-4">
          Add your API tokens to connect to production platforms. Tokens are stored locally.
        </p>
        <ProdCredentialsForm />
      </Dialog>

      {/* Deploy Log Viewer */}
      {logViewDeploy && selectedService && (
        <DeployLogViewer
          open={!!logViewDeploy}
          onClose={() => setLogViewDeploy(null)}
          provider={selectedService.provider}
          serviceId={selectedService.id}
          deployId={logViewDeploy}
        />
      )}
    </div>
  )
}
