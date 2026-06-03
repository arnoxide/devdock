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
import { Activity, AlertTriangle, Gauge, Network } from 'lucide-react'
import type { ReactNode } from 'react'

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

function average(values: Array<number | null>): number | null {
  const usable = values.filter((v): v is number => v !== null)
  if (usable.length === 0) return null
  return usable.reduce((sum, value) => sum + value, 0) / usable.length
}

function total(values: Array<number | null>): number | null {
  const usable = values.filter((v): v is number => v !== null)
  if (usable.length === 0) return null
  return usable.reduce((sum, value) => sum + value, 0)
}

function StatTile({
  label,
  value,
  sublabel,
  icon
}: {
  label: string
  value: string
  sublabel: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3 min-h-[82px]">
        <div className="w-10 h-10 rounded-lg bg-dock-bg border border-dock-border flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-dock-text leading-tight">{value}</p>
          <p className="text-xs text-dock-muted">{label}</p>
          <p className="text-[10px] text-dock-muted/70 truncate">{sublabel}</p>
        </div>
      </CardBody>
    </Card>
  )
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
  if (metrics.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <Activity size={30} className="mx-auto text-dock-muted mb-3" />
          <p className="text-sm font-medium text-dock-text">No performance metrics yet</p>
          <p className="text-xs text-dock-muted mt-1">
            Metrics will appear after monitoring collects samples from this provider.
          </p>
        </CardBody>
      </Card>
    )
  }

  const chartData = metrics.map((m) => ({
    time: formatTime(m.timestamp),
    responseTime: m.responseTimeMs,
    requests: m.requestCount,
    errorRate: m.errorRate,
    bandwidth: m.bandwidthBytes
  }))
  const latest = metrics[metrics.length - 1]
  const avgResponse = average(metrics.map((m) => m.responseTimeMs))
  const avgErrorRate = average(metrics.map((m) => m.errorRate))
  const requestTotal = total(metrics.map((m) => m.requestCount))
  const bandwidthTotal = total(metrics.map((m) => m.bandwidthBytes))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatTile
          label="Latest Response"
          value={latest.responseTimeMs !== null ? `${Math.round(latest.responseTimeMs)}ms` : '--'}
          sublabel={avgResponse !== null ? `${Math.round(avgResponse)}ms average` : 'No average'}
          icon={<Gauge size={18} className="text-dock-accent" />}
        />
        <StatTile
          label="Requests"
          value={requestTotal !== null ? requestTotal.toLocaleString() : '--'}
          sublabel={`${metrics.length} samples`}
          icon={<Activity size={18} className="text-dock-purple" />}
        />
        <StatTile
          label="Error Rate"
          value={latest.errorRate !== null ? `${latest.errorRate.toFixed(1)}%` : '--'}
          sublabel={avgErrorRate !== null ? `${avgErrorRate.toFixed(1)}% average` : 'No average'}
          icon={<AlertTriangle size={18} className="text-dock-red" />}
        />
        <StatTile
          label="Bandwidth"
          value={bandwidthTotal !== null ? formatBytes(bandwidthTotal) : '--'}
          sublabel="Total measured"
          icon={<Network size={18} className="text-dock-green" />}
        />
      </div>

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
    </div>
  )
}
