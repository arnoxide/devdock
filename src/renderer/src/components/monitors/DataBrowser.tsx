import { useEffect, useState } from 'react'
import {
  Table2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Columns3,
  HardDrive,
  Hash,
  Key
} from 'lucide-react'
import { DbTableInfo, DbTableData, DbColumnInfo } from '../../../../shared/types'
import { useDbMonitorStore } from '../../stores/db-monitor-store'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import Card, { CardBody, CardHeader } from '../ui/Card'

interface DataBrowserProps {
  connectionId: string
  dbType: 'postgresql' | 'mongodb'
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function DataBrowser({ connectionId, dbType }: DataBrowserProps) {
  const {
    tables,
    tableData,
    loadingTables,
    loadingData,
    loadTables,
    loadTableData
  } = useDbMonitorStore()

  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 50

  const tableList = tables[connectionId] || []
  const isLoadingTables = loadingTables[connectionId] || false
  const dataKey = `${connectionId}:${selectedTable}`
  const currentData = selectedTable ? tableData[dataKey] : null
  const isLoadingData = loadingData[dataKey] || false

  useEffect(() => {
    loadTables(connectionId)
  }, [connectionId])

  const handleSelectTable = (tableName: string): void => {
    setSelectedTable(tableName)
    setPage(1)
    loadTableData(connectionId, tableName, 1, pageSize)
  }

  const handlePageChange = (newPage: number): void => {
    if (!selectedTable) return
    setPage(newPage)
    loadTableData(connectionId, selectedTable, newPage, pageSize)
  }

  const totalPages = currentData ? Math.ceil(currentData.totalRows / pageSize) : 0

  return (
    <div className="space-y-4">
      {/* Table/Collection List */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={14} className="text-dock-accent" />
            <h3 className="text-sm font-semibold text-dock-text">
              {dbType === 'postgresql' ? 'Tables & Views' : 'Collections'}
            </h3>
            <span className="text-xs text-dock-muted">({tableList.length})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTables(connectionId)}
            disabled={isLoadingTables}
          >
            <RefreshCw size={12} className={isLoadingTables ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          {isLoadingTables ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size={20} />
              <span className="text-xs text-dock-muted ml-2">Loading...</span>
            </div>
          ) : tableList.length === 0 ? (
            <p className="text-xs text-dock-muted text-center py-6">
              No {dbType === 'postgresql' ? 'tables' : 'collections'} found
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {tableList.map((table) => (
                <button
                  key={table.name}
                  onClick={() => handleSelectTable(table.name)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    selectedTable === table.name
                      ? 'border-dock-accent bg-dock-accent/5'
                      : 'border-dock-border hover:border-dock-accent/30 hover:bg-dock-card/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-md bg-dock-card flex items-center justify-center flex-shrink-0">
                    <Table2
                      size={14}
                      className={
                        selectedTable === table.name ? 'text-dock-accent' : 'text-dock-muted'
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-dock-text truncate">{table.name}</p>
                    <div className="flex items-center gap-3 text-[10px] text-dock-muted">
                      <span className="capitalize">{table.type}</span>
                      {table.rowCount !== null && (
                        <span className="flex items-center gap-0.5">
                          <Hash size={8} />
                          {table.rowCount.toLocaleString()} rows
                        </span>
                      )}
                      {table.sizeBytes !== null && (
                        <span>{formatBytes(table.sizeBytes)}</span>
                      )}
                    </div>
                  </div>
                  <Eye
                    size={14}
                    className={`flex-shrink-0 ${
                      selectedTable === table.name ? 'text-dock-accent' : 'text-dock-muted/30'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Data Viewer */}
      {selectedTable && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table2 size={14} className="text-dock-accent" />
              <h3 className="text-sm font-semibold text-dock-text">{selectedTable}</h3>
              {currentData && !currentData.error && (
                <span className="text-xs text-dock-muted">
                  {currentData.totalRows.toLocaleString()} rows total
                  {currentData.executionTimeMs > 0 && ` | ${currentData.executionTimeMs}ms`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Column info badges */}
              {currentData?.columns && currentData.columns.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-dock-muted bg-dock-card px-2 py-0.5 rounded">
                  <Columns3 size={10} />
                  {currentData.columns.length} columns
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadTableData(connectionId, selectedTable, page, pageSize)}
                disabled={isLoadingData}
              >
                <RefreshCw size={12} className={isLoadingData ? 'animate-spin' : ''} />
              </Button>
            </div>
          </CardHeader>

          {/* Column Schema Bar */}
          {currentData?.columns && currentData.columns.length > 0 && (
            <div className="px-4 py-2 border-b border-dock-border bg-dock-card/30 flex flex-wrap gap-2">
              {currentData.columns.map((col) => (
                <span
                  key={col.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border border-dock-border bg-dock-bg"
                  title={`${col.dataType}${col.nullable ? ', nullable' : ', not null'}${col.defaultValue ? `, default: ${col.defaultValue}` : ''}`}
                >
                  {col.isPrimaryKey && <Key size={8} className="text-dock-yellow" />}
                  <span className="font-medium text-dock-text">{col.name}</span>
                  <span className="text-dock-muted">{col.dataType}</span>
                </span>
              ))}
            </div>
          )}

          <CardBody className="p-0">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size={20} />
                <span className="text-xs text-dock-muted ml-2">Loading data...</span>
              </div>
            ) : currentData?.error ? (
              <div className="p-4 text-xs text-dock-red">{currentData.error}</div>
            ) : currentData && currentData.rows.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-dock-card border-b border-dock-border">
                      <th className="px-3 py-2 text-left font-medium text-dock-muted w-10">#</th>
                      {Object.keys(currentData.rows[0]).map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left font-medium text-dock-muted whitespace-nowrap"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-dock-border/30 hover:bg-dock-card/30 transition-colors"
                      >
                        <td className="px-3 py-1.5 text-dock-muted/50 font-mono">
                          {(page - 1) * pageSize + i + 1}
                        </td>
                        {Object.values(row).map((val, j) => (
                          <td
                            key={j}
                            className="px-3 py-1.5 text-dock-text font-mono max-w-xs truncate"
                            title={typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? 'NULL')}
                          >
                            {val === null ? (
                              <span className="text-dock-muted/40 italic">NULL</span>
                            ) : typeof val === 'object' ? (
                              <span className="text-dock-purple">
                                {JSON.stringify(val).substring(0, 80)}
                                {JSON.stringify(val).length > 80 ? '...' : ''}
                              </span>
                            ) : typeof val === 'boolean' ? (
                              <span className={val ? 'text-dock-green' : 'text-dock-red'}>
                                {String(val)}
                              </span>
                            ) : typeof val === 'number' ? (
                              <span className="text-dock-cyan">{val}</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-xs text-dock-muted text-center">
                No data in this {dbType === 'postgresql' ? 'table' : 'collection'}
              </div>
            )}

            {/* Pagination */}
            {currentData && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-dock-border">
                <span className="text-xs text-dock-muted">
                  Showing {(page - 1) * pageSize + 1}-
                  {Math.min(page * pageSize, currentData.totalRows)} of{' '}
                  {currentData.totalRows.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || isLoadingData}
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="text-xs text-dock-text px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || isLoadingData}
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
