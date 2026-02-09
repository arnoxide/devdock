interface CpuGaugeProps {
  percent: number
  cores: number
}

export default function CpuGauge({ percent, cores }: CpuGaugeProps) {
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (percent / 100) * circumference
  const color = percent > 80 ? 'var(--dock-red)' : percent > 60 ? 'var(--dock-yellow)' : 'var(--dock-green)'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            cx="48"
            cy="48"
            r="40"
            strokeWidth="6"
            stroke="var(--dock-border)"
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            strokeWidth="6"
            stroke={color}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-dock-text">{Math.round(percent)}%</span>
          <span className="text-[10px] text-dock-muted">CPU</span>
        </div>
      </div>
      <span className="text-xs text-dock-muted mt-1">{cores} cores</span>
    </div>
  )
}
