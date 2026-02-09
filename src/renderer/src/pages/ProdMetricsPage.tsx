import { useEffect, useState } from 'react'
import { Globe, RefreshCw, Settings2 } from 'lucide-react'
import { PlatformProvider } from '../../../shared/types'
import { useProdMetricsStore } from '../stores/prod-metrics-store'
import ProviderStatusCard from '../components/production/ProviderStatusCard'
import ProdServiceCard from '../components/production/ProdServiceCard'
import DeploymentList from '../components/production/DeploymentList'
import DeployLogViewer from '../components/production/DeployLogViewer'
import PerformanceCharts from '../components/production/PerformanceCharts'
import ResourceCharts from '../components/production/ResourceCharts'
import ProdCredentialsForm from '../components/production/ProdCredentialsForm'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

const ALL_PROVIDERS: PlatformProvider[] = ['render', 'railway', 'vercel', 'aws']

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

  useEffect(() => {
    loadCredentials()
    loadServices()
    if (credentials.some((c) => c.enabled)) {
      startMonitoring()
    }
  }, [])

  const selectedService = services.find((s) => s.id === selectedServiceId)
  const selectedDeploys = selectedServiceId ? deployments[selectedServiceId] || [] : []
  const selectedPerf = selectedServiceId ? performance[selectedServiceId] || [] : []
  const selectedResources = selectedServiceId ? resources[selectedServiceId] || [] : []

  const handleSelectService = (serviceId: string) => {
    selectService(serviceId)
    loadDeployments(serviceId)
  }

  const handleTestProvider = async (provider: PlatformProvider) => {
    setTesting((t) => ({ ...t, [provider]: true }))
    await testConnection(provider)
    setTesting((t) => ({ ...t, [provider]: false }))
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

  const hasCredentials = credentials.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dock-text">Production Metrics</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Monitor deployments across Render, Railway, Vercel, and AWS
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
            <div className="space-y-4">
              {/* Provider status cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {ALL_PROVIDERS.map((provider) => (
                  <ProviderStatusCard
                    key={provider}
                    provider={provider}
                    status={providerStatuses[provider]}
                    hasCredentials={credentials.some((c) => c.provider === provider)}
                    onTest={() => handleTestProvider(provider)}
                    testing={testing[provider]}
                  />
                ))}
              </div>

              {/* Service grid */}
              {loading && services.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size={20} />
                  <span className="text-xs text-dock-muted ml-2">
                    Loading services...
                  </span>
                </div>
              ) : services.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-dock-text">
                    Services ({services.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {services.map((svc) => (
                      <ProdServiceCard
                        key={svc.id}
                        service={svc}
                        latestDeploy={deployments[svc.id]?.[0]}
                        selected={selectedServiceId === svc.id}
                        onClick={() => handleSelectService(svc.id)}
                      />
                    ))}
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
            <div className="space-y-4">
              {/* Service selector */}
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => handleSelectService(svc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      selectedServiceId === svc.id
                        ? 'border-dock-accent bg-dock-accent/10 text-dock-accent'
                        : 'border-dock-border text-dock-muted hover:text-dock-text'
                    }`}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>

              {selectedService ? (
                <DeploymentList
                  deployments={selectedDeploys}
                  provider={selectedService.provider}
                  onViewLogs={(deployId) => setLogViewDeploy(deployId)}
                  onRollback={handleRollback}
                />
              ) : (
                <p className="text-xs text-dock-muted text-center py-8">
                  Select a service to view deployments
                </p>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => handleSelectService(svc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      selectedServiceId === svc.id
                        ? 'border-dock-accent bg-dock-accent/10 text-dock-accent'
                        : 'border-dock-border text-dock-muted hover:text-dock-text'
                    }`}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>

              {selectedService ? (
                <PerformanceCharts metrics={selectedPerf} />
              ) : (
                <p className="text-xs text-dock-muted text-center py-8">
                  Select a service to view performance metrics
                </p>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => handleSelectService(svc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      selectedServiceId === svc.id
                        ? 'border-dock-accent bg-dock-accent/10 text-dock-accent'
                        : 'border-dock-border text-dock-muted hover:text-dock-text'
                    }`}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>

              {selectedService ? (
                <ResourceCharts
                  metrics={selectedResources}
                  provider={selectedService.provider}
                />
              ) : (
                <p className="text-xs text-dock-muted text-center py-8">
                  Select a service to view resource usage
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Platform Credentials"
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
