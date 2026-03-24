/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, ChevronRight, ChevronDown, File, Folder, PanelLeftClose, PanelLeftOpen, AlertCircle, CheckCircle } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { api } from '../api'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', html: 'html', css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', py: 'python', go: 'go', rs: 'rust', java: 'java',
    c: 'c', cpp: 'cpp', cs: 'csharp', rb: 'ruby', php: 'php',
    sh: 'shell', bash: 'shell', zsh: 'shell', yml: 'yaml', yaml: 'yaml',
    toml: 'ini', env: 'ini', xml: 'xml', sql: 'sql', graphql: 'graphql',
    dockerfile: 'dockerfile', tf: 'hcl', vue: 'html', svelte: 'html',
  }
  if (filename.toLowerCase() === 'dockerfile') return 'dockerfile'
  return map[ext] || 'plaintext'
}

function FileTreeNode({
  node,
  level,
  selectedPath,
  onSelect,
  projectId,
}: {
  node: FileNode
  level: number
  selectedPath: string | null
  onSelect: (path: string) => void
  projectId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<FileNode[]>(node.children || [])
  const [loading, setLoading] = useState(false)

  async function toggleDir() {
    if (expanded) { setExpanded(false); return }
    if (children.length === 0 && !expanded) {
      setLoading(true)
      try {
        const data: any = await api.fileTree(projectId, node.path)
        setChildren(Array.isArray(data) ? data : data.files || [])
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    setExpanded(true)
  }

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={toggleDir}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[#2e3348] text-[#e4e6f0] text-sm transition-colors min-h-[36px]"
          style={{ paddingLeft: `${8 + level * 12}px` }}
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border border-[#8b8fa3]/30 border-t-[#8b8fa3] rounded-full animate-spin shrink-0" />
          ) : expanded ? (
            <ChevronDown size={13} className="shrink-0 text-[#8b8fa3]" />
          ) : (
            <ChevronRight size={13} className="shrink-0 text-[#8b8fa3]" />
          )}
          <Folder size={13} className="shrink-0 text-yellow-500/80" />
          <span className="truncate text-left">{node.name}</span>
        </button>
        {expanded && children.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            level={level + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
            projectId={projectId}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors min-h-[36px] ${
        selectedPath === node.path
          ? 'bg-blue-600 text-white'
          : 'hover:bg-[#2e3348] text-[#8b8fa3] hover:text-[#e4e6f0]'
      }`}
      style={{ paddingLeft: `${8 + level * 12}px` }}
    >
      <File size={13} className="shrink-0" />
      <span className="truncate text-left">{node.name}</span>
    </button>
  )
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [tree, setTree] = useState<FileNode[]>([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [savedContent, setSavedContent] = useState<string>('')
  const [fileLoading, setFileLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<any>(null)

  const isDirty = fileContent !== savedContent && selectedPath !== null

  useEffect(() => {
    if (!id) return
    api.fileTree(id).then((data: any) => {
      setTree(Array.isArray(data) ? data : data.files || [])
    }).catch(() => setError('Failed to load file tree')).finally(() => setTreeLoading(false))
  }, [id])

  const openFile = useCallback(async (path: string) => {
    if (!id) return
    setSelectedPath(path)
    setFileLoading(true)
    setError(null)
    try {
      const data: any = await api.readFile(id, path)
      const content = typeof data === 'string' ? data : data.content || ''
      setFileContent(content)
      setSavedContent(content)
      setSaveStatus('idle')
    } catch (err: any) {
      setError(err.message || 'Failed to read file')
    } finally {
      setFileLoading(false)
    }
  }, [id])

  const saveFile = useCallback(async () => {
    if (!id || !selectedPath) return
    setSaving(true)
    try {
      await api.writeFile(id, selectedPath, fileContent)
      setSavedContent(fileContent)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err: any) {
      setSaveStatus('error')
      setError(err.message || 'Save failed')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }, [id, selectedPath, fileContent])

  // Ctrl+S shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty) saveFile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveFile, isDirty])

  const filename = selectedPath?.split('/').pop() || ''
  const language = detectLanguage(filename)

  return (
    <div className="h-screen bg-[#0f1117] text-[#e4e6f0] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-[#2e3348] shrink-0 bg-[#0f1117]">
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="p-2 rounded-xl text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-2 rounded-xl text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          {selectedPath ? (
            <>
              <span className="text-sm text-[#e4e6f0] truncate">{selectedPath}</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
              )}
            </>
          ) : (
            <span className="text-sm text-[#8b8fa3]">No file open</span>
          )}
        </div>

        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-green-400 text-xs">
            <CheckCircle size={13} /> Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-red-400 text-xs">
            <AlertCircle size={13} /> Error
          </span>
        )}

        <button
          onClick={saveFile}
          disabled={!isDirty || saving}
          className="flex items-center gap-1.5 px-3 h-9 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-w-[44px]"
        >
          {saving ? (
            <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={14} />
          )}
          <span className="hidden sm:inline">Save</span>
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-56 shrink-0 border-r border-[#2e3348] overflow-y-auto bg-[#1a1d27] p-2">
            {treeLoading ? (
              <div className="space-y-1.5 p-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-6 bg-[#2e3348] rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                ))}
              </div>
            ) : tree.length === 0 ? (
              <p className="text-xs text-[#8b8fa3] p-3">No files found</p>
            ) : (
              tree.map((node) => (
                <FileTreeNode
                  key={node.path}
                  node={node}
                  level={0}
                  selectedPath={selectedPath}
                  onSelect={openFile}
                  projectId={id!}
                />
              ))
            )}
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 min-w-0 relative">
          {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-red-900/80 border border-red-700 text-red-300 text-xs rounded-xl px-3 py-2">
              <AlertCircle size={13} />
              <span>{error}</span>
            </div>
          )}

          {fileLoading ? (
            <div className="flex items-center justify-center h-full text-[#8b8fa3] gap-2">
              <span className="w-5 h-5 border-2 border-[#2e3348] border-t-blue-500 rounded-full animate-spin" />
              <span>Loading file...</span>
            </div>
          ) : selectedPath ? (
            <Editor
              height="100%"
              language={language}
              value={fileContent}
              theme="vs-dark"
              onChange={(v) => setFileContent(v || '')}
              onMount={(editor) => { editorRef.current = editor }}
              options={{
                fontSize: 13,
                fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'gutter',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8b8fa3]">
              <File size={40} className="text-[#2e3348]" />
              <p>Select a file to start editing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
