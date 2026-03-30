import { useState, useEffect, useCallback } from 'react'
import {
  Folder, FolderOpen, FileText, ChevronRight, ChevronDown,
  RefreshCw, ExternalLink, FileCode, FileJson, Image, FileType
} from 'lucide-react'

interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  ext?: string
  children?: FileEntry[]
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function FileIcon({ ext, type }: { ext?: string; type: 'file' | 'directory' }) {
  if (type === 'directory') return <Folder size={14} className="text-yellow-400 shrink-0" />
  const code = ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'sh', 'css', 'html', 'vue', 'svelte']
  const json = ['json', 'yaml', 'yml', 'toml', 'env']
  const img = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp']
  if (ext && code.includes(ext)) return <FileCode size={14} className="text-blue-400 shrink-0" />
  if (ext && json.includes(ext)) return <FileJson size={14} className="text-green-400 shrink-0" />
  if (ext && img.includes(ext)) return <Image size={14} className="text-purple-400 shrink-0" />
  if (ext === 'md') return <FileType size={14} className="text-orange-400 shrink-0" />
  return <FileText size={14} className="text-dock-muted shrink-0" />
}

interface TreeNodeProps {
  entry: FileEntry
  depth: number
  rootPath: string
}

function TreeNode({ entry, depth, rootPath }: TreeNodeProps) {
  const [open, setOpen] = useState(depth === 0)
  const [children, setChildren] = useState<FileEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (entry.type !== 'directory') {
      window.api.openFile(entry.path)
      return
    }
    if (!open && children === null) {
      setLoading(true)
      const data = await window.api.listFiles(entry.path) as FileEntry[]
      setChildren(data)
      setLoading(false)
    }
    setOpen((v) => !v)
  }

  const indent = depth * 16

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-[3px] rounded-md hover:bg-dock-card cursor-pointer group"
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={toggle}
      >
        {entry.type === 'directory' ? (
          loading ? (
            <RefreshCw size={12} className="text-dock-muted shrink-0 animate-spin" />
          ) : open ? (
            <ChevronDown size={12} className="text-dock-muted shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-dock-muted shrink-0" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {open && entry.type === 'directory'
          ? <FolderOpen size={14} className="text-yellow-400 shrink-0" />
          : <FileIcon ext={entry.ext} type={entry.type} />
        }

        <span className="text-xs text-dock-text truncate flex-1">{entry.name}</span>

        {entry.type === 'file' && entry.size !== undefined && (
          <span className="text-[10px] text-dock-muted opacity-0 group-hover:opacity-100 shrink-0">
            {fileSize(entry.size)}
          </span>
        )}

        {entry.type === 'file' && (
          <button
            onClick={(e) => { e.stopPropagation(); window.api.openInEditor(entry.path) }}
            title="Open in VSCode"
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-dock-muted hover:text-dock-accent transition-all shrink-0"
          >
            <ExternalLink size={11} />
          </button>
        )}
      </div>

      {open && entry.type === 'directory' && children && (
        <div>
          {children.length === 0 ? (
            <p className="text-[10px] text-dock-muted py-1" style={{ paddingLeft: `${8 + indent + 28}px` }}>Empty</p>
          ) : (
            children.map((child) => (
              <TreeNode key={child.path} entry={child} depth={depth + 1} rootPath={rootPath} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface FileExplorerProps {
  projectPath: string
}

export default function FileExplorer({ projectPath }: FileExplorerProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await window.api.listFiles(projectPath) as FileEntry[]
    setEntries(data || [])
    setLoading(false)
  }, [projectPath])

  useEffect(() => { load() }, [load])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-dock-border">
        <span className="text-xs font-medium text-dock-muted uppercase tracking-wide">Files</span>
        <button
          onClick={load}
          className="p-1 rounded text-dock-muted hover:text-dock-text hover:bg-dock-card transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-3 text-dock-muted text-xs">
            <RefreshCw size={13} className="animate-spin" /> Loading...
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-dock-muted px-4 py-3">No files found</p>
        ) : (
          entries.map((entry) => (
            <TreeNode key={entry.path} entry={entry} depth={0} rootPath={projectPath} />
          ))
        )}
      </div>
    </div>
  )
}
