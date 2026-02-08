import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { SystemMetrics } from '../../../../shared/types'
import { format } from 'date-fns'

interface MetricsChartProps {
  data: SystemMetrics[]
  metric: 'cpu' | 'memory'
}

export default function MetricsChart({ data, metric }: MetricsChartProps) {
  const chartData = data.map((m) => ({
    time: format(new Date(m.timestamp), 'HH:mm:ss'),
    value:
      metric === 'cpu'
        ? m.cpuUsagePercent
        : (m.memoryUsedBytes / m.memoryTotalBytes) * 100
  }))

  const color = metric === 'cpu' ? '#3b82f6' : '#a855f7'

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            stroke="#8b8fa3"
            fontSize={9}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#8b8fa3"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            width={30}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1d27',
              border: '1px solid #2e3348',
              borderRadius: '8px',
              fontSize: '11px'
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, metric === 'cpu' ? 'CPU' : 'Memory']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${metric})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
