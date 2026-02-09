import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Terminal,
  ScrollText,
  Settings2,
  Zap,
  Globe,
  Edit,
  Trash2,
  GitBranch
} from 'lucide-react'
import { useProjectStore } from '../stores/project-store'
import { useProcessStore } from '../stores/process-store'
import StatusIndicator from '../components/project/StatusIndicator'
import ProjectTypeBadge from '../components/project/ProjectTypeBadge'
import ProcessOutput from '../components/terminal/ProcessOutput'
import TerminalView from '../components/terminal/TerminalView'
import GitControl from '../components/project/GitControl'
import Button from '../components/ui/Button'
import Tabs from '../components/ui/Tabs'
import Card, { CardBody, CardHeader } from '../components/ui/Card'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const projects = useProjectStore((s) => s.projects)
  const runtimes = useProjectStore((s) => s.runtimes)
  const removeProject = useProjectStore((s) => s.removeProject)
  const updateProject = useProjectStore((s) => s.updateProject)

  const startServer = useProcessStore((s) => s.startServer)
  const stopServer = useProcessStore((s) => s.stopServer)
  const restartServer = useProcessStore((s) => s.restartServer)
  const [activeTab, setActiveTab] = useState('output')
  const [editingCommand, setEditingCommand] = useState(false)
  const [command, setCommand] = useState('')

  const project = projects.find((p) => p.id === id)
  const runtime = id ? runtimes[id] : undefined
  const status = runtime?.status || 'idle'
  const isRunning = status === 'running'
  const isTransitioning = status === 'starting' || status === 'stopping'

  useEffect(() => {
    if (project) setCommand(project.startCommand)
  }, [project?.startCommand])

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-dock-muted">Project not found</p>
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mt-2">
          <ArrowLeft size={14} />
          Back to Projects
        </Button>
      </div>
    )
  }

  const handleSaveCommand = async (): Promise<void> => {
    await updateProject({ id: project.id, startCommand: command })
    setEditingCommand(false)
  }

  const handleDelete = async (): Promise<void> => {
    if (isRunning) await stopServer(project.id)
    await removeProject(project.id)
    navigate('/projects')
  }

  const tabs = [
    { id: 'output', label: 'Output', icon: <ScrollText size={14} /> },
    { id: 'terminal', label: 'Terminal', icon: <Terminal size={14} /> },
    { id: 'git', label: 'Git', icon: <GitBranch size={14} /> },
    { id: 'actions', label: 'Quick Actions', icon: <Zap size={14} /> }
  ]

  const quickActions = [
    ...(project.detectedScripts.build ? [{ label: 'Build', cmd: `${project.packageManager || 'npm'} run build`, icon: '📦' }] : []),
    ...(project.detectedScripts.test ? [{ label: 'Test', cmd: `${project.packageManager || 'npm'} run test`, icon: '🧪' }] : []),
    ...(project.detectedScripts.lint ? [{ label: 'Lint', cmd: `${project.packageManager || 'npm'} run lint`, icon: '🔍' }] : []),
    { label: 'Install Deps', cmd: `${project.packageManager || 'npm'} install`, icon: '📥' },
    ...project.customCommands.map((c) => ({ label: c.label, cmd: c.command, icon: '⚡' }))
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/projects')}
          className="text-dock-muted hover:text-dock-text transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-dock-text">{project.name}</h1>
            <ProjectTypeBadge type={project.type} />
            <StatusIndicator status={status} size="md" />
            {runtime?.port && (
              <span className="text-sm text-dock-accent font-mono">
                localhost:{runtime.port}
              </span>
            )}
          </div>
          <p className="text-xs text-dock-muted mt-0.5">{project.path}</p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <Button
                variant="secondary"
                onClick={() => restartServer(project.id)}
                disabled={isTransitioning}
              >
                <RotateCw size={14} />
                Restart
              </Button>
              <Button
                variant="danger"
                onClick={() => stopServer(project.id)}
                disabled={isTransitioning}
              >
                <Square size={14} />
                Stop
              </Button>
            </>
          ) : (
            <Button
              variant="success"
              onClick={() => startServer(project.id)}
              disabled={isTransitioning || !project.startCommand}
            >
              <Play size={14} />
              Start Server
            </Button>
          )}
          <Button variant="ghost" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Start Command */}
      <Card>
        <CardBody className="flex items-center gap-3">
          <span className="text-xs text-dock-muted">Command:</span>
          {editingCommand ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="flex-1 bg-dock-bg border border-dock-border rounded px-2 py-1 text-sm font-mono text-dock-text
                  focus:outline-none focus:ring-2 focus:ring-dock-accent/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveCommand()}
              />
              <Button size="sm" onClick={handleSaveCommand}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingCommand(false)}>Cancel</Button>
            </div>
          ) : (
            <>
              <code className="flex-1 text-sm font-mono text-dock-accent">
                {project.startCommand || 'No command configured'}
              </code>
              <button
                onClick={() => setEditingCommand(true)}
                className="text-dock-muted hover:text-dock-text transition-colors"
              >
                <Edit size={14} />
              </button>
            </>
          )}
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'output' && (
          <div className="h-[400px]">
            <ProcessOutput projectId={project.id} />
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="h-[400px]">
            <TerminalView projectId={project.id} />
          </div>
        )}

        {activeTab === 'git' && (
          <GitControl projectId={project.id} />
        )}

        {activeTab === 'actions' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => window.api.runCommand(project.id, action.cmd)}
                className="flex items-center gap-2 p-3 bg-dock-surface border border-dock-border rounded-lg
                  hover:border-dock-accent/30 transition-colors text-left"
              >
                <span className="text-lg">{action.icon}</span>
                <div>
                  <p className="text-sm font-medium text-dock-text">{action.label}</p>
                  <p className="text-xs text-dock-muted font-mono truncate max-w-[150px]">
                    {action.cmd}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
