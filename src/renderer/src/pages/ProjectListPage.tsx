import { useEffect, useState, useMemo } from 'react'
import { Download, FolderPlus, Github, Search, FolderKanban } from 'lucide-react'
import { useProjectStore } from '../stores/project-store'
import { useGitHubStore } from '../stores/github-store'
import ProjectCard from '../components/project/ProjectCard'
import ProjectGroup from '../components/project/ProjectGroup'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Dialog from '../components/ui/Dialog'
import Input from '../components/ui/Input'

function inferDirectoryName(repoUrl: string): string {
  const cleaned = repoUrl.trim().split('?')[0].replace(/\/$/, '')
  const last = cleaned.split(/[/:]/).filter(Boolean).pop() || ''
  return last.replace(/\.git$/, '')
}

export default function ProjectListPage() {
  const projects = useProjectStore((s) => s.projects)
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const addProject = useProjectStore((s) => s.addProject)
  const cloneProject = useProjectStore((s) => s.cloneProject)
  const githubCredentials = useGitHubStore((s) => s.credentials)
  const githubRepos = useGitHubStore((s) => s.repos)
  const loadGitHubData = useGitHubStore((s) => s.loadAll)

  const [search, setSearch] = useState('')
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [cloneUrl, setCloneUrl] = useState('')
  const [cloneDestination, setCloneDestination] = useState('')
  const [cloneDirectoryName, setCloneDirectoryName] = useState('')
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [isCloning, setIsCloning] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (githubCredentials && githubRepos.length === 0) {
      loadGitHubData()
    }
  }, [githubCredentials?.username])

  const handleAddProject = async (): Promise<void> => {
    const path = await window.api.browseForProject()
    if (path) {
      await addProject(path)
    }
  }

  const handleChooseCloneDestination = async (): Promise<void> => {
    const path = await window.api.browseForProject()
    if (path) setCloneDestination(path)
  }

  const handlePickRepo = (value: string): void => {
    setCloneUrl(value)
    if (!cloneDirectoryName.trim()) {
      setCloneDirectoryName(inferDirectoryName(value))
    }
  }

  const handleCloneProject = async (): Promise<void> => {
    if (!cloneUrl.trim() || !cloneDestination.trim()) return
    setIsCloning(true)
    setCloneError(null)
    try {
      await cloneProject({
        repoUrl: cloneUrl.trim(),
        parentPath: cloneDestination.trim(),
        directoryName: cloneDirectoryName.trim() || undefined
      })
      setShowCloneDialog(false)
      setCloneUrl('')
      setCloneDestination('')
      setCloneDirectoryName('')
    } catch (err: any) {
      setCloneError(err.message || 'Failed to clone repository')
    } finally {
      setIsCloning(false)
    }
  }

  const filtered = useMemo(() => {
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.type && p.type.toLowerCase().includes(search.toLowerCase()))
    )
  }, [projects, search])

  // Organize projects into groups and standalone projects
  const { groups, standaloneProjects } = useMemo(() => {
    const groups = filtered.filter((p) => p.isGroup)
    const standaloneProjects = filtered.filter((p) => !p.isGroup && !p.parentId)
    return { groups, standaloneProjects }
  }, [filtered])

  // Get children for each group (memoized)
  const getGroupChildren = useMemo(() => {
    return (groupId: string) => filtered.filter((p) => p.parentId === groupId)
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dock-text">Projects</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Manage your development projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowCloneDialog(true)}>
            <Download size={16} />
            Clone Repo
          </Button>
          <Button onClick={handleAddProject}>
            <FolderPlus size={16} />
            Add Project
          </Button>
        </div>
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
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCloneDialog(true)}>
                <Download size={16} />
                Clone Repo
              </Button>
              <Button variant="secondary" onClick={handleAddProject}>
                <FolderPlus size={16} />
                Add Project
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Display Groups */}
          {groups.map((group) => (
            <ProjectGroup
              key={group.id}
              group={group}
              childProjects={getGroupChildren(group.id)}
            />
          ))}

          {/* Display Standalone Projects */}
          {standaloneProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {standaloneProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {projects.length > 0 && filtered.length === 0 && (
        <p className="text-center text-sm text-dock-muted py-8">
          No projects match your search
        </p>
      )}

      <Dialog
        open={showCloneDialog}
        onClose={() => {
          if (!isCloning) setShowCloneDialog(false)
        }}
        title="Clone Repository"
      >
        <div className="space-y-4">
          {githubRepos.length > 0 && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-dock-muted">GitHub repository</label>
              <div className="relative">
                <Github size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dock-muted" />
                <select
                  value={cloneUrl}
                  onChange={(e) => handlePickRepo(e.target.value)}
                  className="w-full bg-dock-bg border border-dock-border rounded-lg pl-8 pr-3 py-2 text-sm text-dock-text focus:outline-none focus:ring-2 focus:ring-dock-accent/50"
                >
                  <option value="">Choose a repo or paste a URL below</option>
                  {githubRepos.map((repo) => (
                    <option key={repo.id} value={repo.cloneUrl || repo.htmlUrl}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Input
            label="Repository URL"
            value={cloneUrl}
            onChange={(e) => {
              setCloneUrl(e.target.value)
              if (!cloneDirectoryName.trim()) setCloneDirectoryName(inferDirectoryName(e.target.value))
            }}
            placeholder="git@github.com:username/repo.git"
            disabled={isCloning}
          />

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <Input
              label="Destination folder"
              value={cloneDestination}
              onChange={(e) => setCloneDestination(e.target.value)}
              placeholder="/home/you/Projects"
              disabled={isCloning}
            />
            <Button variant="secondary" onClick={handleChooseCloneDestination} disabled={isCloning}>
              Browse
            </Button>
          </div>

          <Input
            label="Folder name"
            value={cloneDirectoryName}
            onChange={(e) => setCloneDirectoryName(e.target.value)}
            placeholder={inferDirectoryName(cloneUrl) || 'repo-name'}
            disabled={isCloning}
          />

          {cloneError && (
            <div className="text-xs text-dock-red bg-dock-red/10 border border-dock-red/20 rounded-lg p-3">
              {cloneError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCloneDialog(false)} disabled={isCloning}>
              Cancel
            </Button>
            <Button onClick={handleCloneProject} disabled={!cloneUrl.trim() || !cloneDestination.trim() || isCloning}>
              <Download size={14} className={isCloning ? 'animate-pulse' : ''} />
              {isCloning ? 'Cloning...' : 'Clone'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
