import { ProjectType } from '../../../../shared/types'

interface ProjectTypeBadgeProps {
  type: ProjectType
}

const typeConfig: Record<ProjectType, { label: string; color: string }> = {
  vite: { label: 'Vite', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  'react-cra': { label: 'React', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  nextjs: { label: 'Next.js', color: 'bg-white/10 text-white border-white/20' },
  nodejs: { label: 'Node.js', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  python: { label: 'Python', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  'python-django': { label: 'Django', color: 'bg-green-700/10 text-green-300 border-green-700/20' },
  'python-flask': { label: 'Flask', color: 'bg-gray-500/10 text-gray-300 border-gray-500/20' },
  'python-fastapi': { label: 'FastAPI', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  rust: { label: 'Rust', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  go: { label: 'Go', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  unknown: { label: 'Unknown', color: 'bg-dock-card text-dock-muted border-dock-border' }
}

export default function ProjectTypeBadge({ type }: ProjectTypeBadgeProps) {
  const config = typeConfig[type]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.color}`}
    >
      {config.label}
    </span>
  )
}
