import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ApiEndpointResult } from '../../../../shared/types'
import { format } from 'date-fns'

interface ResponseTimeChartProps {
  results: ApiEndpointResult[]
}

export default function ResponseTimeChart({ results }: ResponseTimeChartProps) {
  const data = results.map((r) => ({
    time: format(new Date(r.timestamp), 'HH:mm:ss'),
    responseTime: r.responseTimeMs || 0,
    status: r.status
  }))

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="time"
            stroke="#8b8fa3"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#8b8fa3"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `${v}ms`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1d27',
              border: '1px solid #2e3348',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelStyle={{ color: '#8b8fa3' }}
          />
          <Line
            type="monotone"
            dataKey="responseTime"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
