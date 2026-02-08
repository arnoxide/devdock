import { useEffect, useState } from 'react'
import { FolderPlus, Search, FolderKanban } from 'lucide-react'
import { useProjectStore } from '../stores/project-store'
import ProjectCard from '../components/project/ProjectCard'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'

export default function ProjectListPage() {
  const { projects, runtimes, loadProjects, addProject } = useProjectStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const handleAddProject = async (): Promise<void> => {
    const path = await window.api.browseForProject()
    if (path) {
      await addProject(path)
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dock-text">Projects</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Manage your development projects
          </p>
        </div>
        <Button onClick={handleAddProject}>
          <FolderPlus size={16} />
          Add Project
        </Button>
      </div>

      {projects.length > 0 && (
        <div className="relative max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dock-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-dock-surface border border-dock-border rounded-lg pl-8 pr-3 py-2 text-sm text-dock-text
              placeholder:text-dock-muted/50 focus:outline-none focus:ring-2 focus:ring-dock-accent/50"
          />
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={40} />}
          title="No projects yet"
          description="Add your first project to get started. DevDock will auto-detect the project type and start command."
          action={
            <Button onClick={handleAddProject}>
              <FolderPlus size={16} />
              Add Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              runtime={runtimes[project.id]}
            />
          ))}
        </div>
      )}

      {projects.length > 0 && filtered.length === 0 && (
        <p className="text-center text-sm text-dock-muted py-8">
          No projects match your search
        </p>
      )}
    </div>
  )
}
