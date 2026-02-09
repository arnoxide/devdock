import { useEffect } from 'react'
import { useProjectStore } from '../stores/project-store'
import { useProcessStore } from '../stores/process-store'
import { useLogStore } from '../stores/log-store'
import { useSystemStore } from '../stores/system-store'
import { useApiMonitorStore } from '../stores/api-monitor-store'
import { useDbMonitorStore } from '../stores/db-monitor-store'
import { useProdMetricsStore } from '../stores/prod-metrics-store'
import { useGitHubStore } from '../stores/github-store'

export function useIpcListeners(): void {
  const updateRuntime = useProjectStore((s) => s.updateRuntime)
  const appendOutput = useProcessStore((s) => s.appendOutput)
  const addLogEntry = useLogStore((s) => s.addEntry)
  const updateMetrics = useSystemStore((s) => s.updateMetrics)
  const updateProcessMetrics = useSystemStore((s) => s.updateProcessMetrics)
  const updateApiResult = useApiMonitorStore((s) => s.updateResult)
  const updateDbStatus = useDbMonitorStore((s) => s.updateStatus)

  useEffect(() => {
    const cleanups: (() => void)[] = []

    cleanups.push(
      window.api.onProcessOutput((data: any) => {
        appendOutput(data.projectId, data.data)
      })
    )

    cleanups.push(
      window.api.onProcessStatusChanged((runtime: any) => {
        updateRuntime(runtime)
      })
    )

    cleanups.push(
      window.api.onSystemMetricsUpdate((metrics: any) => {
        updateMetrics(metrics)
      })
    )

    cleanups.push(
      window.api.onProcessMetricsUpdate((metrics: any) => {
        updateProcessMetrics(metrics)
      })
    )

    cleanups.push(
      window.api.onApiResult((result: any) => {
        updateApiResult(result)
      })
    )

    cleanups.push(
      window.api.onApiEndpointsDetected((endpoints: any) => {
        useApiMonitorStore.getState().addDetectedEndpoints(endpoints)
      })
    )

    cleanups.push(
      window.api.onLogMetricUpdate((event: any) => {
        if (event.type === 'event') {
          useApiMonitorStore.getState().addLogEvent(event.payload)
        }
      })
    )

    cleanups.push(
      window.api.onDbStatusChanged((state: any) => {
        updateDbStatus(state)
      })
    )

    cleanups.push(
      window.api.onLogNewEntry((entry: any) => {
        addLogEntry(entry)
      })
    )

    // Production Metrics listeners
    cleanups.push(
      window.api.onProdServicesUpdate((services: any) => {
        useProdMetricsStore.getState().updateServices(services)
      })
    )
    cleanups.push(
      window.api.onProdDeploymentsUpdate((data: any) => {
        useProdMetricsStore.getState().updateDeployments(data)
      })
    )
    cleanups.push(
      window.api.onProdPerformanceUpdate((data: any) => {
        useProdMetricsStore.getState().updatePerformance(data)
      })
    )
    cleanups.push(
      window.api.onProdResourcesUpdate((data: any) => {
        useProdMetricsStore.getState().updateResources(data)
      })
    )
    cleanups.push(
      window.api.onProdProviderStatusUpdate((status: any) => {
        useProdMetricsStore.getState().updateProviderStatus(status)
      })
    )

    // GitHub listeners
    cleanups.push(
      window.api.onGitHubReposUpdate((repos: any) => {
        useGitHubStore.getState().updateRepos(repos)
      })
    )
    cleanups.push(
      window.api.onGitHubPRsUpdate((prs: any) => {
        useGitHubStore.getState().updatePRs(prs)
      })
    )
    cleanups.push(
      window.api.onGitHubIssuesUpdate((issues: any) => {
        useGitHubStore.getState().updateIssues(issues)
      })
    )
    cleanups.push(
      window.api.onGitHubActionsUpdate((actions: any) => {
        useGitHubStore.getState().updateActions(actions)
      })
    )
    cleanups.push(
      window.api.onGitHubNotificationsUpdate((notifications: any) => {
        useGitHubStore.getState().updateNotifications(notifications)
      })
    )

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])
}
