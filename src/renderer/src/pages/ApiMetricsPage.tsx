import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Activity,
    TrendingUp,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    Zap
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useApiMonitorStore } from '../stores/api-monitor-store'
import { EndpointStatus } from '../../../shared/types'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function ApiMetricsPage() {
    const navigate = useNavigate()
    const endpoints = useApiMonitorStore(useShallow((state) => state.endpoints ?? []))
    const results = useApiMonitorStore(useShallow((state) => state.results ?? {}))
    const histories = useApiMonitorStore(useShallow((state) => state.histories ?? {}))
    const logEvents = useApiMonitorStore(useShallow((state) => state.logEvents ?? []))

    // Calculate overall metrics
    const metrics = useMemo(() => {
        try {
            const totalEndpoints = endpoints.length
            let healthyCount = 0
            let degradedCount = 0
            let downCount = 0
            let totalResponseTime = 0
            let responseTimeCount = 0
            let totalUptimePct = 0

            endpoints.forEach((endpoint) => {
                if (!endpoint?.id) return

                const result = results[endpoint.id]
                if (result) {
                    if (result.status === 'healthy') healthyCount++
                    else if (result.status === 'degraded') degradedCount++
                    else if (result.status === 'down') downCount++

                    if (typeof result.responseTimeMs === 'number' && !isNaN(result.responseTimeMs)) {
                        totalResponseTime += result.responseTimeMs
                        responseTimeCount++
                    }
                }

                const history = histories[endpoint.id]
                const resultsArr = Array.isArray(history?.results) ? history.results : []
                if (resultsArr.length > 0) {
                    const successfulChecks = resultsArr.filter(
                        (r) => r && (r.status === 'healthy' || r.status === 'degraded')
                    ).length
                    totalUptimePct += (successfulChecks / resultsArr.length) * 100
                }
            })

            const avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0
            const avgUptime = totalEndpoints > 0 ? totalUptimePct / totalEndpoints : 0

            return {
                total: totalEndpoints,
                healthy: healthyCount,
                degraded: degradedCount,
                down: downCount,
                avgResponseTime: Math.round(avgResponseTime),
                avgUptime: Math.round(avgUptime * 10) / 10
            }
        } catch (err) {
            console.error('Error computing metrics:', err)
            return { total: 0, healthy: 0, degraded: 0, down: 0, avgResponseTime: 0, avgUptime: 0 }
        }
    }, [endpoints, results, histories])

    // Prepare chart data
    const responseTimeData = useMemo(() => {
        try {
            const dataMap = new Map<string, Record<string, unknown>>()

            endpoints.forEach((endpoint) => {
                if (!endpoint?.id) return
                const history = histories[endpoint.id]
                const resultsArr = Array.isArray(history?.results) ? history.results : []

                resultsArr.forEach((result) => {
                    if (!result?.timestamp) return

                    const timeKey = result.timestamp
                    if (!dataMap.has(timeKey)) {
                        let displayTime = 'Unknown'
                        try {
                            displayTime = new Date(timeKey).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        } catch { /* ignore */ }

                        dataMap.set(timeKey, {
                            timestamp: timeKey,
                            displayTime
                        })
                    }
                    const point = dataMap.get(timeKey)!
                    if (typeof result.responseTimeMs === 'number') {
                        point[endpoint.id] = result.responseTimeMs
                    }
                })
            })

            return Array.from(dataMap.values())
                .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
                .slice(-20)
        } catch (err) {
            console.error('Error preparing response time data:', err)
            return []
        }
    }, [endpoints, histories])

    const getStatusIcon = (status: EndpointStatus) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 size={16} className="text-green-500" />
            case 'degraded':
                return <AlertTriangle size={16} className="text-yellow-500" />
            case 'down':
                return <XCircle size={16} className="text-red-500" />
            default:
                return <Activity size={16} className="text-gray-500" />
        }
    }

    const computeUptime = (endpointId: string): number => {
        try {
            const history = histories[endpointId]
            const resultsArr = Array.isArray(history?.results) ? history.results : []
            if (resultsArr.length === 0) return 0
            const successCount = resultsArr.filter((r) => r && r.status !== 'down').length
            return (successCount / resultsArr.length) * 100
        } catch {
            return 0
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/api-monitor')}>
                        <ArrowLeft size={16} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-dock-text">API Metrics</h1>
                        <p className="text-sm text-dock-muted mt-0.5">
                            Comprehensive analytics and performance metrics
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardBody className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-dock-muted">Total Endpoints</p>
                            <p className="text-2xl font-bold text-dock-text mt-1">{metrics.total}</p>
                        </div>
                        <Activity size={32} className="text-dock-accent opacity-50" />
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-dock-muted">Avg Response Time</p>
                            <p className="text-2xl font-bold text-dock-text mt-1">
                                {metrics.avgResponseTime}
                                <span className="text-sm text-dock-muted ml-1">ms</span>
                            </p>
                        </div>
                        <Zap size={32} className="text-yellow-500 opacity-50" />
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-dock-muted">Avg Uptime</p>
                            <p className="text-2xl font-bold text-dock-text mt-1">
                                {metrics.avgUptime || 0}
                                <span className="text-sm text-dock-muted ml-1">%</span>
                            </p>
                        </div>
                        <TrendingUp size={32} className="text-green-500 opacity-50" />
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-dock-muted">Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-green-500">{metrics.healthy} ok</span>
                                <span className="text-sm text-yellow-500">{metrics.degraded} warn</span>
                                <span className="text-sm text-red-500">{metrics.down} down</span>
                            </div>
                        </div>
                        <CheckCircle2 size={32} className="text-green-500 opacity-50" />
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <h2 className="text-sm font-semibold text-dock-text">Response Time Trends</h2>
                </CardHeader>
                <CardBody>
                    <div className="h-[300px] w-full">
                        {responseTimeData.length > 0 && endpoints.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={responseTimeData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--dock-border)" vertical={false} opacity={0.3} />
                                    <XAxis
                                        dataKey="displayTime"
                                        stroke="var(--dock-muted)"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="var(--dock-muted)"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--dock-surface)',
                                            border: '1px solid var(--dock-border)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: 'var(--dock-text)'
                                        }}
                                        itemStyle={{ color: 'var(--dock-text)' }}
                                        formatter={(value: number) => [`${value}ms`, '']}
                                    />
                                    {endpoints.map((endpoint, index) =>
                                        endpoint?.id ? (
                                            <Line
                                                key={endpoint.id}
                                                type="monotone"
                                                name={endpoint.name || 'Endpoint'}
                                                dataKey={endpoint.id}
                                                stroke={`hsl(${(index * 137) % 360}, 70%, 60%)`}
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                                connectNulls
                                            />
                                        ) : null
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-dock-muted text-sm italic">
                                Collecting performance data...
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-sm font-semibold text-dock-text">Endpoint Details</h2>
                </CardHeader>
                <CardBody>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-dock-border">
                                    <th className="text-left text-xs font-medium text-dock-muted py-2 px-3">Status</th>
                                    <th className="text-left text-xs font-medium text-dock-muted py-2 px-3">Endpoint</th>
                                    <th className="text-left text-xs font-medium text-dock-muted py-2 px-3">Method</th>
                                    <th className="text-right text-xs font-medium text-dock-muted py-2 px-3">Response</th>
                                    <th className="text-right text-xs font-medium text-dock-muted py-2 px-3">Code</th>
                                    <th className="text-right text-xs font-medium text-dock-muted py-2 px-3">Uptime</th>
                                </tr>
                            </thead>
                            <tbody>
                                {endpoints.map((endpoint) => {
                                    if (!endpoint?.id) return null
                                    const result = results[endpoint.id]
                                    const uptime = computeUptime(endpoint.id)

                                    return (
                                        <tr key={endpoint.id} className="border-b border-dock-border/50 hover:bg-dock-surface/20 transition-colors">
                                            <td className="py-3 px-3">
                                                {result ? getStatusIcon(result.status) : <Activity size={16} className="text-gray-500" />}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div>
                                                    <p className="text-sm text-dock-text font-medium">{endpoint.name || '-'}</p>
                                                    <p className="text-[10px] text-dock-muted font-mono truncate max-w-xs opacity-60">
                                                        {endpoint.url || '-'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-dock-bg border border-dock-border rounded text-dock-muted">
                                                    {endpoint.method || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <span className="text-sm text-dock-text">
                                                    {typeof result?.responseTimeMs === 'number' ? `${result.responseTimeMs}ms` : '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <span className="text-sm text-dock-text">
                                                    {result?.statusCode || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <span className={`text-sm font-semibold ${uptime >= 95 ? 'text-green-500' : uptime >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {uptime.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-sm font-semibold text-dock-text">Process Log Events</h2>
                    <p className="text-xs text-dock-muted">Real-time alerts from server logs</p>
                </CardHeader>
                <CardBody>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                        {logEvents.length > 0 ? (
                            logEvents.slice(0, 50).map((event, idx) => {
                                if (!event?.timestamp) return null

                                let dateDisplay = 'Unknown'
                                try {
                                    dateDisplay = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                } catch { /* ignore */ }

                                const patternId = event.patternId || 'event'
                                const data = event.data || ''

                                let badgeClass = 'bg-dock-muted/10 text-dock-muted border border-dock-muted/20'
                                if (patternId === 'error_log') badgeClass = 'bg-red-500/10 text-red-400 border border-red-500/20'
                                else if (patternId === 'login_attempt') badgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                else if (patternId === 'http_request') badgeClass = 'bg-green-500/10 text-green-400 border border-green-500/20'

                                return (
                                    <div key={event.id || `log-${idx}`} className="flex items-start gap-3 p-1.5 border-b border-dock-border/10 last:border-0 text-[13px]">
                                        <div className="min-w-[70px] text-[10px] text-dock-muted font-mono py-1">
                                            {dateDisplay}
                                        </div>
                                        <div className="flex-1 font-mono text-dock-text/90 break-all">
                                            <span className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[9px] uppercase mr-2 font-bold tracking-tighter ${badgeClass}`}>
                                                {patternId.replace('_', ' ')}
                                            </span>
                                            <span>{data}</span>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-12 text-dock-muted text-sm border border-dashed border-dock-border rounded-lg opacity-50">
                                <p>No events detected yet</p>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    )
}
