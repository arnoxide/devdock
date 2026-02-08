import { EventEmitter } from 'node:events'
import {
  ApiEndpointConfig,
  ApiEndpointResult,
  ApiEndpointHistory,
  EndpointStatus
} from '../../shared/types'

const MAX_HISTORY = 100

export class ApiMonitor extends EventEmitter {
  private intervals = new Map<string, NodeJS.Timeout>()
  private histories = new Map<string, ApiEndpointResult[]>()

  startMonitoring(endpoint: ApiEndpointConfig): void {
    this.stopMonitoring(endpoint.id)

    if (!endpoint.enabled) return

    // Initial check
    this.checkEndpoint(endpoint)

    // Set up polling
    const interval = setInterval(() => {
      this.checkEndpoint(endpoint)
    }, endpoint.intervalMs)

    this.intervals.set(endpoint.id, interval)
  }

  stopMonitoring(endpointId: string): void {
    const interval = this.intervals.get(endpointId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(endpointId)
    }
  }

  async checkEndpoint(endpoint: ApiEndpointConfig): Promise<ApiEndpointResult> {
    const startTime = performance.now()
    let result: ApiEndpointResult

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), endpoint.timeoutMs)

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers || {},
        body: ['POST', 'PUT', 'PATCH'].includes(endpoint.method)
          ? endpoint.body
          : undefined,
        signal: controller.signal
      })

      clearTimeout(timeout)

      const responseTime = Math.round(performance.now() - startTime)
      const statusMatches = response.status === endpoint.expectedStatus

      let status: EndpointStatus = 'down'
      if (statusMatches && responseTime < 500) {
        status = 'healthy'
      } else if (statusMatches) {
        status = 'degraded'
      }

      result = {
        endpointId: endpoint.id,
        status,
        statusCode: response.status,
        responseTimeMs: responseTime,
        error: null,
        timestamp: new Date().toISOString()
      }
    } catch (err) {
      result = {
        endpointId: endpoint.id,
        status: 'down',
        statusCode: null,
        responseTimeMs: Math.round(performance.now() - startTime),
        error: (err as Error).message,
        timestamp: new Date().toISOString()
      }
    }

    // Store in history
    const history = this.histories.get(endpoint.id) || []
    history.push(result)
    if (history.length > MAX_HISTORY) {
      history.shift()
    }
    this.histories.set(endpoint.id, history)

    this.emit('result', result)
    return result
  }

  getHistory(endpointId: string): ApiEndpointHistory {
    return {
      endpointId,
      results: this.histories.get(endpointId) || []
    }
  }

  shutdown(): void {
    for (const [id] of this.intervals) {
      this.stopMonitoring(id)
    }
  }
}

export const apiMonitor = new ApiMonitor()
