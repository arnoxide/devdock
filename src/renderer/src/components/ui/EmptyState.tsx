interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-dock-muted">{icon}</div>
      <h3 className="text-sm font-semibold text-dock-text mb-1">{title}</h3>
      <p className="text-xs text-dock-muted max-w-xs mb-4">{description}</p>
      {action}
    </div>
  )
}
