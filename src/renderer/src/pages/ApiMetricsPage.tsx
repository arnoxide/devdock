import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    Zap
} from 'lucide-react'
import { useApiMonitorStore } from '../stores/api-monitor-store'
import { EndpointStatus } from '../../../shared/types'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function ApiMetricsPage() {
    const navigate = useNavigate()
    const { endpoints, results, histories, logEvents } = useApiMonitorStore((state) => ({
        endpoints: state.endpoints || [],
        results: state.results || {},
        histories: state.histories || {},
        logEvents: state.logEvents || []
    }))

    // Calculate overall metrics
    const metrics = useMemo(() => {
        const totalEndpoints = endpoints.length
        let healthyCount = 0
        let degradedCount = 0
        let downCount = 0
        let totalResponseTime = 0
        let responseTimeCount = 0
        let uptimeCount = 0

        endpoints.forEach((endpoint) => {
            const result = results[endpoint.id]
            if (result) {
                if (result.status === 'healthy') healthyCount++
                else if (result.status === 'degraded') degradedCount++
                else if (result.status === 'down') downCount++

                if (result.responseTimeMs !== null) {
                    totalResponseTime += result.responseTimeMs
                    responseTimeCount++
                }
            }

            // Calculate uptime from history
            const history = histories[endpoint.id]
            if (history && history.results.length > 0) {
                const successCount = history.results.filter(
                    (r) => r.status === 'healthy' || r.status === 'degraded'
                ).length
                uptimeCount += (successCount / history.results.length) * 100
            }
        })

        const avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0
        const avgUptime = totalEndpoints > 0 ? uptimeCount / totalEndpoints : 0

        return {
            total: totalEndpoints,
            healthy: healthyCount,
            degraded: degradedCount,
            down: downCount,
            avgResponseTime: Math.round(avgResponseTime),
            avgUptime: Math.round(avgUptime * 10) / 10
        }
    }, [endpoints, results, histories])

    // Prepare chart data for response times
    const responseTimeData = useMemo(() => {
        const dataMap = new Map<string, { timestamp: string;[key: string]: any }>()

        endpoints.forEach((endpoint) => {
            const history = histories[endpoint.id]
            if (history) {
                history.results.forEach((result) => {
                    const time = new Date(result.timestamp).toLocaleTimeString()
                    if (!dataMap.has(time)) {
                        dataMap.set(time, { timestamp: time })
                    }
                    const data = dataMap.get(time)!
                    data[endpoint.name] = result.responseTimeMs
                })
            }
        })

        return Array.from(dataMap.values()).slice(-20) // Last 20 data points
    }, [endpoints, histories])

    // Status distribution data
    const statusData = [
        { name: 'Healthy', value: metrics.healthy, color: '#10b981' },
        { name: 'Degraded', value: metrics.degraded, color: '#f59e0b' },
        { name: 'Down', value: metrics.down, color: '#ef4444' }
    ]

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

    return (
        <div className="space-y-6">
            {/* Header */}
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

            {/* Overview Cards */}
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
                                {metrics.avgUptime}
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
                                <span className="text-sm text-green-500">{metrics.healthy} ✓</span>
                                <span className="text-sm text-yellow-500">{metrics.degraded} ⚠</span>
                                <span className="text-sm text-red-500">{metrics.down} ✗</span>
                            </div>
                        </div>
                        <CheckCircle2 size={32} className="text-green-500 opacity-50" />
                    </CardBody>
                </Card>
            </div>

            {/* Response Time Chart */}
            <Card>
                <CardHeader>
                    <h2 className="text-sm font-semibold text-dock-text">Response Time Trends</h2>
                </CardHeader>
                <CardBody>
                    {responseTimeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={responseTimeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                                <XAxis
                                    dataKey="timestamp"
                                    stroke="#718096"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="#718096"
                                    fontSize={12}
                                    label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1a202c',
                                        border: '1px solid #2d3748',
                                        borderRadius: '8px'
                                    }}
                                />
                                {endpoints.map((endpoint, index) => (
                                    <Line
                                        key={endpoint.id}
                                        type="monotone"
                                        dataKey={endpoint.name}
                                        stroke={`hsl(${(index * 360) / endpoints.length}, 70%, 60%)`}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-dock-muted">
                            No data available yet
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Endpoint Details Table */}
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
                                    <th className="text-right text-xs font-medium text-dock-muted py-2 px-3">Response Time</th>
                                    <th className="text-right text-xs font-medium text-dock-muted py-2 px-3">Status Code</th>
                                    <th className="text-right text-xs font-medium text-dock-muted py-2 px-3">Uptime</th>
                                </tr>
                            </thead>
                            <tbody>
                                {endpoints.map((endpoint) => {
                                    const result = results[endpoint.id]
                                    const history = histories[endpoint.id]
                                    const uptime = history
                                        ? (history.results.filter((r) => r.status !== 'down').length /
                                            history.results.length) *
                                        100
                                        : 0

                                    return (
                                        <tr key={endpoint.id} className="border-b border-dock-border/50 hover:bg-dock-surface/50">
                                            <td className="py-3 px-3">
                                                {result && getStatusIcon(result.status)}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div>
                                                    <p className="text-sm text-dock-text font-medium">{endpoint.name}</p>
                                                    <p className="text-xs text-dock-muted font-mono truncate max-w-xs">
                                                        {endpoint.url}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="text-xs font-mono px-2 py-1 bg-dock-card rounded text-dock-muted">
                                                    {endpoint.method}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <span className="text-sm text-dock-text">
                                                    {result?.responseTimeMs !== null ? `${result?.responseTimeMs}ms` : '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <span className="text-sm text-dock-text">
                                                    {result?.statusCode || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <span className={`text-sm font-medium ${uptime >= 95 ? 'text-green-500' : uptime >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
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

            {/* Process Log Events */}
            <Card>
                <CardHeader>
                    <h2 className="text-sm font-semibold text-dock-text">Process Log Events</h2>
                    <p className="text-xs text-dock-muted">Real-time events detected from application logs</p>
                </CardHeader>
                <CardBody>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {logEvents.length > 0 ? (
                            logEvents.map((event) => (
                                <div key={event.id} className="flex items-start gap-3 p-2 border-b border-dock-border/30 last:border-0 text-sm animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="min-w-[80px] text-xs text-dock-muted py-0.5">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </div>
                                    <div className="flex-1 font-mono text-dock-text break-all">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase mr-2 font-bold tracking-wider ${event.patternId === 'error_log' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            event.patternId === 'login_attempt' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                event.patternId === 'http_request' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                    'bg-dock-muted/10 text-dock-muted border border-dock-muted/20'
                                            }`}>
                                            {event.patternId.replace('_', ' ')}
                                        </span>
                                        <span className="opacity-90">{event.data}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-dock-muted text-sm border-2 border-dashed border-dock-border/50 rounded-lg">
                                <p>Waiting for log events...</p>
                                <p className="text-xs opacity-50 mt-1">Try interacting with your API</p>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    )
}
