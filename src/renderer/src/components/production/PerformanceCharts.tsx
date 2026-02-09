import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { ProdPerformanceMetrics } from '../../../../shared/types'
import Card, { CardBody, CardHeader } from '../ui/Card'

interface PerformanceChartsProps {
  metrics: ProdPerformanceMetrics[]
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface MiniChartProps {
  title: string
  data: Array<{ time: string; value: number | null }>
  color: string
  formatter?: (v: number) => string
}

function MiniChart({ title, data, color, formatter }: MiniChartProps) {
  const hasData = data.some((d) => d.value !== null)

  return (
    <Card>
      <CardHeader>
        <h4 className="text-xs font-medium text-dock-muted">{title}</h4>
      </CardHeader>
      <CardBody className="p-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: '#666' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#666' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}
                formatter={(v: number) => [formatter ? formatter(v) : v, title]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#grad-${title})`}
                strokeWidth={2}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[120px] text-xs text-dock-muted">
            No data available
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default function PerformanceCharts({ metrics }: PerformanceChartsProps) {
  const chartData = metrics.map((m) => ({
    time: formatTime(m.timestamp),
    responseTime: m.responseTimeMs,
    requests: m.requestCount,
    errorRate: m.errorRate,
    bandwidth: m.bandwidthBytes
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MiniChart
        title="Response Time (ms)"
        data={chartData.map((d) => ({ time: d.time, value: d.responseTime }))}
        color="#06b6d4"
        formatter={(v) => `${v}ms`}
      />
      <MiniChart
        title="Request Count"
        data={chartData.map((d) => ({ time: d.time, value: d.requests }))}
        color="#8b5cf6"
      />
      <MiniChart
        title="Error Rate (%)"
        data={chartData.map((d) => ({ time: d.time, value: d.errorRate }))}
        color="#ef4444"
        formatter={(v) => `${v.toFixed(1)}%`}
      />
      <MiniChart
        title="Bandwidth"
        data={chartData.map((d) => ({ time: d.time, value: d.bandwidth }))}
        color="#22c55e"
        formatter={(v) => formatBytes(v)}
      />
    </div>
  )
}
