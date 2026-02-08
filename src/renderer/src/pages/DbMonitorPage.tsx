import { useState } from 'react'
import { Plus, Database } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { DbConnectionConfig, DbType } from '../../../shared/types'
import { useDbMonitorStore } from '../stores/db-monitor-store'
import DbConnectionCard from '../components/monitors/DbConnectionCard'
import QueryRunner from '../components/monitors/QueryRunner'
import DataBrowser from '../components/monitors/DataBrowser'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import EmptyState from '../components/ui/EmptyState'
import Tabs from '../components/ui/Tabs'

export default function DbMonitorPage() {
  const { connections, statuses, addConnection, removeConnection, testConnection, runQuery } =
    useDbMonitorStore()
  const [showAdd, setShowAdd] = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'browse' | 'query'>('browse')
  const [newConn, setNewConn] = useState({
    name: '',
    type: 'postgresql' as DbType,
    connectionString: ''
  })

  const handleAdd = async (): Promise<void> => {
    const config: DbConnectionConfig = {
      id: uuid(),
      projectId: '',
      name: newConn.name,
      type: newConn.type,
      connectionString: newConn.connectionString,
      enabled: true
    }
    await addConnection(config)
    setShowAdd(false)
    setNewConn({ name: '', type: 'postgresql', connectionString: '' })
  }

  const connectedIds = connections.filter(
    (c) => statuses[c.id]?.status === 'connected'
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dock-text">Database Monitor</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Monitor MongoDB and PostgreSQL connections
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add Connection
        </Button>
      </div>

      {connections.length === 0 ? (
        <EmptyState
          icon={<Database size={40} />}
          title="No database connections"
          description="Add a MongoDB or PostgreSQL connection to monitor its status and run queries."
          action={
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={16} />
              Add Connection
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((conn) => (
              <DbConnectionCard
                key={conn.id}
                config={conn}
                state={statuses[conn.id]}
                onTest={() => testConnection(conn)}
                onRemove={() => removeConnection(conn.id)}
              />
            ))}
          </div>

          {/* Data Browser & Query Runner */}
          {connectedIds.length > 0 && (
            <div className="space-y-3">
              <Select
                label="Connection"
                value={selectedConnection || ''}
                onChange={(e) => setSelectedConnection(e.target.value)}
                options={[
                  { value: '', label: 'Select a connection...' },
                  ...connectedIds.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.type})`
                  }))
                ]}
              />
              {selectedConnection && (
                <div className="space-y-4">
                  <Tabs
                    tabs={[
                      { id: 'browse', label: 'Browse Data' },
                      { id: 'query', label: 'Query Runner' }
                    ]}
                    activeTab={activeTab}
                    onChange={(tab) => setActiveTab(tab as 'browse' | 'query')}
                  />
                  {activeTab === 'browse' ? (
                    <DataBrowser
                      connectionId={selectedConnection}
                      dbType={
                        connections.find((c) => c.id === selectedConnection)?.type || 'postgresql'
                      }
                    />
                  ) : (
                    <QueryRunner
                      connectionId={selectedConnection}
                      onRunQuery={(connId, query) => runQuery(connId, query)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Connection Dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Database Connection">
        <div className="space-y-3">
          <Input
            label="Name"
            placeholder="e.g. Local PostgreSQL"
            value={newConn.name}
            onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
          />
          <Select
            label="Database Type"
            value={newConn.type}
            onChange={(e) => setNewConn({ ...newConn, type: e.target.value as DbType })}
            options={[
              { value: 'postgresql', label: 'PostgreSQL' },
              { value: 'mongodb', label: 'MongoDB' }
            ]}
          />
          <Input
            label="Connection String"
            placeholder={
              newConn.type === 'postgresql'
                ? 'postgresql://user:pass@localhost:5432/dbname'
                : 'mongodb://localhost:27017/dbname'
            }
            value={newConn.connectionString}
            onChange={(e) => setNewConn({ ...newConn, connectionString: e.target.value })}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!newConn.name || !newConn.connectionString}
            >
              Add Connection
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
