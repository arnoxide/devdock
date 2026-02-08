interface MemoryBarProps {
  used: number
  total: number
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

export default function MemoryBar({ used, total }: MemoryBarProps) {
  const percent = total > 0 ? (used / total) * 100 : 0
  const color = percent > 85 ? 'bg-dock-red' : percent > 70 ? 'bg-dock-yellow' : 'bg-dock-accent'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-dock-muted">Memory</span>
        <span className="text-dock-text font-medium">
          {formatBytes(used)} / {formatBytes(total)}
        </span>
      </div>
      <div className="h-2.5 bg-dock-card rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="text-right text-[10px] text-dock-muted">{Math.round(percent)}% used</div>
    </div>
  )
}
