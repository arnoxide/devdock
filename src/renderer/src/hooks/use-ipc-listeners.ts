import { useEffect } from 'react'
import { useProjectStore } from '../stores/project-store'
import { useProcessStore } from '../stores/process-store'
import { useLogStore } from '../stores/log-store'
import { useSystemStore } from '../stores/system-store'
import { useApiMonitorStore } from '../stores/api-monitor-store'
import { useDbMonitorStore } from '../stores/db-monitor-store'

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
      window.api.onDbStatusChanged((state: any) => {
        updateDbStatus(state)
      })
    )

    cleanups.push(
      window.api.onLogNewEntry((entry: any) => {
        addLogEntry(entry)
      })
    )

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])
}
