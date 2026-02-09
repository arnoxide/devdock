import { Star, GitFork, Circle, Lock, ExternalLink } from 'lucide-react'
import { GitHubRepo } from '../../../../shared/types'

const languageColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  Ruby: '#701516',
  PHP: '#4f5d95',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Swift: '#fa7343',
  Kotlin: '#a97bff',
  Dart: '#00b4ab',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Vue: '#41b883'
}

interface Props {
  repos: GitHubRepo[]
}

export default function GitHubRepoCard({ repos }: Props) {
  if (repos.length === 0) {
    return (
      <div className="text-center py-12 text-dock-muted text-sm">
        No repositories found
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {repos.map((repo) => (
        <div
          key={repo.id}
          className="bg-dock-card border border-dock-border rounded-lg p-4 hover:border-dock-accent/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {repo.isPrivate && <Lock size={12} className="text-dock-muted shrink-0" />}
              <h4 className="text-sm font-medium text-dock-accent truncate">{repo.name}</h4>
            </div>
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="text-dock-muted hover:text-dock-text shrink-0"
              onClick={(e) => {
                e.preventDefault()
                window.open(repo.htmlUrl, '_blank')
              }}
            >
              <ExternalLink size={14} />
            </a>
          </div>
          {repo.description && (
            <p className="text-xs text-dock-muted mb-3 line-clamp-2">{repo.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-dock-muted">
            {repo.language && (
              <span className="flex items-center gap-1">
                <Circle
                  size={8}
                  fill={languageColors[repo.language] || '#8b8b8b'}
                  stroke="none"
                />
                {repo.language}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star size={12} />
              {repo.stargazersCount}
            </span>
            <span className="flex items-center gap-1">
              <GitFork size={12} />
              {repo.forksCount}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
