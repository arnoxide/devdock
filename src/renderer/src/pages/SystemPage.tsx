import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckSquare,
  FolderOpen,
  HardDrive,
  RefreshCw,
  Square,
  Trash2
} from 'lucide-react'
import { useSystemStore } from '../stores/system-store'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import { SystemFileCategory } from '../../../shared/types'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function categoryVariant(category: SystemFileCategory): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' {
  if (category === 'code') return 'info'
  if (category === 'images' || category === 'audio') return 'success'
  if (category === 'video' || category === 'archives') return 'warning'
  if (category === 'executables' || category === 'logs') return 'danger'
  if (category === 'data') return 'purple'
  return 'default'
}

export default function SystemPage() {
  const scanResult = useSystemStore((s) => s.scanResult)
  const isScanning = useSystemStore((s) => s.isScanning)
  const scanError = useSystemStore((s) => s.scanError)
  const scanFiles = useSystemStore((s) => s.scanFiles)
  const deleteFiles = useSystemStore((s) => s.deleteFiles)
  const browseScanPath = useSystemStore((s) => s.browseScanPath)

  const [scanPath, setScanPath] = useState('')
  const [maxFiles, setMaxFiles] = useState(50000)
  const [minSizeMb, setMinSizeMb] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)

  const selectedBytes = useMemo(() => {
    if (!scanResult) return 0
    return scanResult.largestFiles
      .filter((file) => selected.has(file.path))
      .reduce((sum, file) => sum + file.sizeBytes, 0)
  }, [scanResult, selected])

  const categoryTotals = useMemo(() => {
    if (!scanResult) return []
    const grouped = new Map<SystemFileCategory, { category: SystemFileCategory; count: number; totalBytes: number }>()
    for (const summary of scanResult.categories) {
      const current = grouped.get(summary.category) || {
        category: summary.category,
        count: 0,
        totalBytes: 0
      }
      current.count += summary.count
      current.totalBytes += summary.totalBytes
      grouped.set(summary.category, current)
    }
    return [...grouped.values()].sort((a, b) => b.totalBytes - a.totalBytes)
  }, [scanResult])

  const runScan = () => {
    setDeleteMessage(null)
    setSelected(new Set())
    scanFiles({
      path: scanPath.trim() || undefined,
      maxFiles,
      minSizeBytes: Math.round(minSizeMb * 1024 * 1024)
    })
  }

  const browse = async () => {
    const chosenPath = await browseScanPath()
    if (chosenPath) setScanPath(chosenPath)
  }

  const toggleFile = (filePath: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(filePath)) next.delete(filePath)
      else next.add(filePath)
      return next
    })
  }

  const deleteSelected = async () => {
    const paths = [...selected]
    if (paths.length === 0) return
    const ok = window.confirm(`Move ${paths.length} selected file${paths.length === 1 ? '' : 's'} to trash?`)
    if (!ok) return

    const result = await deleteFiles(paths)
    setSelected(new Set())
    setDeleteMessage(
      result.failed.length > 0
        ? `${result.deleted.length} moved to trash, ${result.failed.length} failed`
        : `${result.deleted.length} moved to trash`
    )
  }

  const deleteOne = async (filePath: string) => {
    const ok = window.confirm('Move this file to trash?')
    if (!ok) return
    const result = await deleteFiles([filePath])
    setSelected((current) => {
      const next = new Set(current)
      next.delete(filePath)
      return next
    })
    setDeleteMessage(result.failed.length > 0 ? 'Unable to move file to trash' : 'Moved to trash')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-dock-text">System</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Storage scan, safe file categories, and cleanup
          </p>
        </div>
        <Button onClick={runScan} disabled={isScanning}>
          <RefreshCw size={15} className={isScanning ? 'animate-spin' : ''} />
          {isScanning ? 'Scanning' : 'Scan'}
        </Button>
      </div>

      <Card>
        <CardBody className="grid grid-cols-[1fr_120px_120px_auto] gap-3 items-end">
          <Input
            label="Folder"
            value={scanPath}
            onChange={(event) => setScanPath(event.target.value)}
            placeholder="Home folder"
          />
          <Input
            label="Max files"
            type="number"
            min={100}
            max={250000}
            value={maxFiles}
            onChange={(event) => setMaxFiles(Number(event.target.value))}
          />
          <Input
            label="Min MB"
            type="number"
            min={0}
            step={0.5}
            value={minSizeMb}
            onChange={(event) => setMinSizeMb(Number(event.target.value))}
          />
          <Button variant="secondary" onClick={browse}>
            <FolderOpen size={15} />
            Browse
          </Button>
        </CardBody>
      </Card>

      <div className="flex items-center gap-2 rounded-lg border border-dock-yellow/25 bg-dock-yellow/10 px-3 py-2 text-xs text-dock-yellow">
        <AlertTriangle size={14} />
        Protected OS folders are skipped and cannot be deleted from this page.
      </div>

      {scanError && (
        <div className="flex items-center gap-2 rounded-lg border border-dock-red/30 bg-dock-red/10 px-3 py-2 text-sm text-dock-red">
          <AlertTriangle size={15} />
          {scanError}
        </div>
      )}

      {scanResult && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <h3 className="text-xs font-medium text-dock-muted">Disk Used</h3>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-3">
                  <HardDrive size={28} className="text-dock-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold text-dock-text">
                      {scanResult.disk ? `${scanResult.disk.usedPercent}%` : '--'}
                    </p>
                    <p className="text-xs text-dock-muted truncate">
                      {scanResult.disk
                        ? `${formatBytes(scanResult.disk.freeBytes)} free`
                        : 'Unavailable'}
                    </p>
                  </div>
                </div>
                {scanResult.disk && (
                  <div className="mt-3 h-2 rounded-full bg-dock-bg overflow-hidden">
                    <div
                      className="h-full bg-dock-accent"
                      style={{ width: `${scanResult.disk.usedPercent}%` }}
                    />
                  </div>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="text-xs font-medium text-dock-muted">Scanned</h3>
              </CardHeader>
              <CardBody>
                <p className="text-2xl font-bold text-dock-text">
                  {scanResult.scannedFiles.toLocaleString()}
                </p>
                <p className="text-xs text-dock-muted">files</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="text-xs font-medium text-dock-muted">Measured Size</h3>
              </CardHeader>
              <CardBody>
                <p className="text-2xl font-bold text-dock-text">
                  {formatBytes(scanResult.totalBytes)}
                </p>
                <p className="text-xs text-dock-muted">inside scan</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="text-xs font-medium text-dock-muted">Skipped</h3>
              </CardHeader>
              <CardBody>
                <p className="text-2xl font-bold text-dock-text">
                  {scanResult.skippedEntries.toLocaleString()}
                </p>
                <p className="text-xs text-dock-muted">restricted or linked</p>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex items-center gap-2">
                <BarChart3 size={15} className="text-dock-accent" />
                <h2 className="text-sm font-semibold text-dock-text">Categories</h2>
              </CardHeader>
              <CardBody className="space-y-2">
                {categoryTotals.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <Badge variant={categoryVariant(item.category)}>{item.category}</Badge>
                      <span className="text-dock-text">{formatBytes(item.totalBytes)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-dock-bg overflow-hidden">
                      <div
                        className="h-full bg-dock-accent"
                        style={{ width: `${Math.max((item.totalBytes / scanResult.totalBytes) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-dock-text">File Types</h2>
              </CardHeader>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-dock-surface">
                    <tr className="border-b border-dock-border">
                      <th className="px-4 py-2 text-left text-xs font-medium text-dock-muted">Type</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-dock-muted">Files</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-dock-muted">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.categories.slice(0, 30).map((item) => (
                      <tr key={`${item.category}:${item.extension}`} className="border-b border-dock-border/50">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={categoryVariant(item.category)}>{item.category}</Badge>
                            <span className="font-mono text-xs text-dock-muted">{item.extension}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-dock-text">{item.count.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-dock-text">{formatBytes(item.totalBytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-dock-text">Largest Files</h2>
                <p className="text-xs text-dock-muted mt-0.5">{scanResult.rootPath}</p>
              </div>
              <div className="flex items-center gap-2">
                {deleteMessage && <span className="text-xs text-dock-muted">{deleteMessage}</span>}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={deleteSelected}
                  disabled={selected.size === 0}
                >
                  <Trash2 size={14} />
                  Trash {selected.size > 0 ? `${selected.size} (${formatBytes(selectedBytes)})` : ''}
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dock-border">
                    <th className="w-10 px-4 py-3 text-left text-xs font-medium text-dock-muted"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dock-muted">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">Modified</th>
                    <th className="w-16 px-4 py-3 text-right text-xs font-medium text-dock-muted"></th>
                  </tr>
                </thead>
                <tbody>
                  {scanResult.largestFiles.map((file) => (
                    <tr key={file.path} className="border-b border-dock-border/50 hover:bg-dock-card/30">
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => toggleFile(file.path)}
                          className="text-dock-muted hover:text-dock-text"
                          aria-label={selected.has(file.path) ? 'Unselect file' : 'Select file'}
                        >
                          {selected.has(file.path) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 min-w-[280px]">
                        <p className="text-dock-text truncate">{file.name}</p>
                        <p className="text-xs text-dock-muted truncate">{file.path}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={categoryVariant(file.category)}>{file.category}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-dock-text">
                        {formatBytes(file.sizeBytes)}
                      </td>
                      <td className="px-4 py-2.5 text-dock-muted">{formatDate(file.modifiedAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => deleteOne(file.path)}
                          className="text-dock-muted hover:text-dock-red"
                          aria-label="Move file to trash"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
