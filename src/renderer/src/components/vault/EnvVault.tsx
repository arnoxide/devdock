import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Eye, EyeOff, Download, Upload, Copy, Check } from 'lucide-react'
import { useVaultStore } from '../../stores/vault-store'
import { useProjectStore } from '../../stores/project-store'
import { ProjectEnvVault, EnvVarEntry, VaultEnvironment } from '../../../../shared/types'

const ENVIRONMENTS: VaultEnvironment[] = ['development', 'staging', 'production', 'test']
const ENV_COLORS: Record<VaultEnvironment, string> = {
  development: 'text-dock-accent',
  staging: 'text-dock-yellow',
  production: 'text-dock-red',
  test: 'text-dock-green'
}

export default function EnvVault() {
  const { vaults, loadVaults, saveVault, deleteVault, exportEnv, importEnv, encryptValue, decryptValue } = useVaultStore()
  const projects = useProjectStore((s) => s.projects)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedEnv, setSelectedEnv] = useState<VaultEnvironment>('development')
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [decryptedValues, setDecryptedValues] = useState<Record<string, string>>({})
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newIsSecret, setNewIsSecret] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { loadVaults() }, [])
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0].id)
    }
  }, [projects])

  const vault = vaults.find((v) => v.projectId === selectedProject)
  const envVars = vault?.variables.filter((v) => v.environment === selectedEnv) || []

  const toggleReveal = useCallback(async (entry: EnvVarEntry) => {
    const id = entry.id
    if (revealedKeys.has(id)) {
      setRevealedKeys((s) => { const n = new Set(s); n.delete(id); return n })
    } else {
      if (!decryptedValues[id] && entry.isSecret) {
        const val = await decryptValue(entry.value)
        setDecryptedValues((s) => ({ ...s, [id]: val }))
      }
      setRevealedKeys((s) => new Set(s).add(id))
    }
  }, [revealedKeys, decryptedValues, decryptValue])

  const addVariable = async () => {
    if (!newKey.trim() || !selectedProject) return
    const project = projects.find((p) => p.id === selectedProject)
    if (!project) return

    const value = newIsSecret ? await encryptValue(newValue) : newValue
    const entry: EnvVarEntry = {
      id: crypto.randomUUID(),
      key: newKey.trim(),
      value,
      environment: selectedEnv,
      isSecret: newIsSecret,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const existing = vault || { projectId: selectedProject, projectName: project.name, variables: [] }
    await saveVault({ ...existing, variables: [...existing.variables, entry] })
    setNewKey('')
    setNewValue('')
  }

  const removeVariable = async (varId: string) => {
    if (!vault) return
    await saveVault({ ...vault, variables: vault.variables.filter((v) => v.id !== varId) })
  }

  const copyValue = async (entry: EnvVarEntry) => {
    const val = entry.isSecret ? (decryptedValues[entry.id] || await decryptValue(entry.value)) : entry.value
    navigator.clipboard.writeText(val)
    setCopied(entry.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Project + environment selectors */}
      <div className="flex gap-3">
        <select
          value={selectedProject}
          onChange={(e) => { setSelectedProject(e.target.value); setRevealedKeys(new Set()); setDecryptedValues({}) }}
          className="flex-1 bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm text-dock-text"
        >
          <option value="">Select project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Environment tabs */}
      <div className="flex gap-1 bg-dock-bg rounded-lg p-1">
        {ENVIRONMENTS.map((env) => (
          <button
            key={env}
            onClick={() => { setSelectedEnv(env); setRevealedKeys(new Set()) }}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
              selectedEnv === env ? 'bg-dock-card text-dock-text' : 'text-dock-muted hover:text-dock-text'
            }`}
          >
            {env}
          </button>
        ))}
      </div>

      {/* Import/Export */}
      {selectedProject && (
        <div className="flex gap-2">
          <button onClick={() => importEnv(selectedProject, projects.find((p) => p.id === selectedProject)?.name || '', selectedEnv)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dock-card border border-dock-border rounded-lg text-dock-muted hover:text-dock-text transition-colors">
            <Upload size={12} /> Import .env
          </button>
          <button onClick={() => exportEnv(selectedProject, selectedEnv)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dock-card border border-dock-border rounded-lg text-dock-muted hover:text-dock-text transition-colors">
            <Download size={12} /> Export .env
          </button>
        </div>
      )}

      {/* Variables list */}
      <div className="space-y-1.5">
        {envVars.length === 0 && selectedProject && (
          <p className="text-sm text-dock-muted py-4 text-center">No variables for {selectedEnv}</p>
        )}
        {envVars.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 bg-dock-card border border-dock-border rounded-lg px-3 py-2">
            <span className="text-sm font-mono text-dock-accent min-w-[120px]">{entry.key}</span>
            <span className="flex-1 text-sm font-mono text-dock-text truncate">
              {entry.isSecret
                ? (revealedKeys.has(entry.id) ? (decryptedValues[entry.id] || entry.value) : '••••••••')
                : entry.value
              }
            </span>
            {entry.isSecret && (
              <button onClick={() => toggleReveal(entry)} className="p-1 text-dock-muted hover:text-dock-text" title={revealedKeys.has(entry.id) ? 'Hide' : 'Reveal'}>
                {revealedKeys.has(entry.id) ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
            <button onClick={() => copyValue(entry)} className="p-1 text-dock-muted hover:text-dock-text" title="Copy value">
              {copied === entry.id ? <Check size={14} className="text-dock-green" /> : <Copy size={14} />}
            </button>
            <button onClick={() => removeVariable(entry.id)} className="p-1 text-dock-muted hover:text-dock-red" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add variable */}
      {selectedProject && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              placeholder="KEY_NAME"
              className="w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm font-mono text-dock-text placeholder-dock-muted"
            />
          </div>
          <div className="flex-1">
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="value"
              type={newIsSecret ? 'password' : 'text'}
              className="w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm font-mono text-dock-text placeholder-dock-muted"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-dock-muted whitespace-nowrap">
            <input type="checkbox" checked={newIsSecret} onChange={() => setNewIsSecret(!newIsSecret)} className="accent-dock-accent" />
            Secret
          </label>
          <button onClick={addVariable} className="p-2 bg-dock-accent text-white rounded-lg hover:bg-dock-accent/80 transition-colors">
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
