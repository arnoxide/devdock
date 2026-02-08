interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  children: React.ReactNode
  className?: string
}

const variants = {
  default: 'bg-dock-card text-dock-muted border-dock-border',
  success: 'bg-dock-green/10 text-dock-green border-dock-green/20',
  warning: 'bg-dock-yellow/10 text-dock-yellow border-dock-yellow/20',
  danger: 'bg-dock-red/10 text-dock-red border-dock-red/20',
  info: 'bg-dock-accent/10 text-dock-accent border-dock-accent/20',
  purple: 'bg-dock-purple/10 text-dock-purple border-dock-purple/20'
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
