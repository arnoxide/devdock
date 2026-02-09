import { Pool as PgPool } from 'pg'
import { MongoClient } from 'mongodb'
import {
  DbConnectionConfig,
  DbConnectionState,
  DbQueryRequest,
  DbQueryResult,
  DbTableInfo,
  DbColumnInfo,
  DbTableData
} from '../../shared/types'

import store from '../store'

interface ManagedConnection {
  config: DbConnectionConfig
  pgPool?: PgPool
  mongoClient?: MongoClient
}

export class DbMonitor {
  private connections = new Map<string, ManagedConnection>()

  constructor() {
    this.loadConnections()
  }

  private loadConnections(): void {
    const saved = store.get('databaseConnections', []) as DbConnectionConfig[]
    saved.forEach((config) => {
      this.connections.set(config.id, { config })
      // We don't automatically connect here to avoid heavy startup
      // Connections will be established on first query or test
    })
  }

  private saveConnections(): void {
    const configs = Array.from(this.connections.values()).map((m) => m.config)
    store.set('databaseConnections', configs)
  }

  getAllConfigs(): DbConnectionConfig[] {
    return Array.from(this.connections.values()).map(m => m.config)
  }

  async testConnection(config: DbConnectionConfig): Promise<DbConnectionState> {
    const startTime = performance.now()

    try {
      if (config.type === 'postgresql') {
        return await this.testPostgres(config, startTime)
      } else {
        return await this.testMongo(config, startTime)
      }
    } catch (err) {
      return {
        configId: config.id,
        status: 'error',
        error: (err as Error).message,
        serverVersion: null,
        latencyMs: Math.round(performance.now() - startTime),
        lastCheckedAt: new Date().toISOString()
      }
    }
  }

  async runQuery(req: DbQueryRequest): Promise<DbQueryResult> {
    const managed = this.connections.get(req.connectionId)
    if (!managed) {
      return {
        connectionId: req.connectionId,
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'Connection not found. Test the connection first.'
      }
    }

    const startTime = performance.now()

    try {
      if (managed.config.type === 'postgresql' && managed.pgPool) {
        const result = await managed.pgPool.query(req.query, req.params as unknown[])
        return {
          connectionId: req.connectionId,
          rows: result.rows,
          rowCount: result.rowCount ?? 0,
          executionTimeMs: Math.round(performance.now() - startTime),
          error: null
        }
      } else if (managed.config.type === 'mongodb' && managed.mongoClient) {
        // For MongoDB, parse the query as a simple find
        const db = managed.mongoClient.db()
        // Expect query like: db.collection.find({}) or just collection name
        const parts = req.query.trim().split('.')
        const collectionName = parts[0] || 'test'
        let filter = {}
        try {
          if (req.params && req.params[0]) {
            filter = req.params[0] as Record<string, unknown>
          }
        } catch {
          // ignore
        }

        const docs = await db.collection(collectionName).find(filter).limit(100).toArray()
        // Serialize BSON types (ObjectId, etc.) to plain JSON for IPC transfer
        const rows = JSON.parse(JSON.stringify(docs)) as Record<string, unknown>[]
        return {
          connectionId: req.connectionId,
          rows,
          rowCount: rows.length,
          executionTimeMs: Math.round(performance.now() - startTime),
          error: null
        }
      }

      return {
        connectionId: req.connectionId,
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'No active connection'
      }
    } catch (err) {
      return {
        connectionId: req.connectionId,
        rows: [],
        rowCount: 0,
        executionTimeMs: Math.round(performance.now() - startTime),
        error: (err as Error).message
      }
    }
  }

  getStatus(connectionId: string): DbConnectionState {
    const managed = this.connections.get(connectionId)
    if (!managed) {
      return {
        configId: connectionId,
        status: 'disconnected',
        error: null,
        serverVersion: null,
        latencyMs: null,
        lastCheckedAt: new Date().toISOString()
      }
    }

    return {
      configId: connectionId,
      status: 'connected',
      error: null,
      serverVersion: null,
      latencyMs: null,
      lastCheckedAt: new Date().toISOString()
    }
  }

  async listTables(connectionId: string): Promise<DbTableInfo[]> {
    const managed = this.connections.get(connectionId)
    if (!managed) return []

    try {
      if (managed.config.type === 'postgresql' && managed.pgPool) {
        const result = await managed.pgPool.query(`
          SELECT
            t.table_name AS name,
            CASE t.table_type WHEN 'BASE TABLE' THEN 'table' ELSE 'view' END AS type,
            (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) AS row_count,
            pg_total_relation_size(quote_ident(t.table_name))::bigint AS size_bytes
          FROM information_schema.tables t
          WHERE t.table_schema = 'public'
          ORDER BY t.table_name
        `)
        return result.rows.map((r: Record<string, unknown>) => ({
          name: r.name as string,
          type: r.type as 'table' | 'view',
          rowCount: Number(r.row_count) || null,
          sizeBytes: Number(r.size_bytes) || null
        }))
      } else if (managed.config.type === 'mongodb' && managed.mongoClient) {
        const db = managed.mongoClient.db()
        const collections = await db.listCollections().toArray()
        const results: DbTableInfo[] = []
        for (const col of collections) {
          let rowCount: number | null = null
          try {
            rowCount = await db.collection(col.name).estimatedDocumentCount()
          } catch {
            // ignore
          }
          results.push({
            name: col.name,
            type: 'collection',
            rowCount,
            sizeBytes: null
          })
        }
        return results
      }
    } catch {
      // ignore
    }
    return []
  }

  async getTableColumns(connectionId: string, tableName: string): Promise<DbColumnInfo[]> {
    const managed = this.connections.get(connectionId)
    if (!managed) return []

    try {
      if (managed.config.type === 'postgresql' && managed.pgPool) {
        const result = await managed.pgPool.query(
          `
          SELECT
            c.column_name AS name,
            c.data_type,
            c.is_nullable = 'YES' AS nullable,
            COALESCE(
              (SELECT true FROM information_schema.table_constraints tc
               JOIN information_schema.key_column_usage kcu
                 ON tc.constraint_name = kcu.constraint_name
               WHERE tc.table_name = c.table_name
                 AND kcu.column_name = c.column_name
                 AND tc.constraint_type = 'PRIMARY KEY'
              ), false
            ) AS is_primary_key,
            c.column_default AS default_value
          FROM information_schema.columns c
          WHERE c.table_schema = 'public' AND c.table_name = $1
          ORDER BY c.ordinal_position
          `,
          [tableName]
        )
        return result.rows.map((r: Record<string, unknown>) => ({
          name: r.name as string,
          dataType: r.data_type as string,
          nullable: r.nullable as boolean,
          isPrimaryKey: r.is_primary_key as boolean,
          defaultValue: (r.default_value as string) || null
        }))
      } else if (managed.config.type === 'mongodb' && managed.mongoClient) {
        // MongoDB is schemaless — sample first doc to infer fields
        const db = managed.mongoClient.db()
        const sample = await db.collection(tableName).findOne()
        if (!sample) return []
        return Object.keys(sample).map((key) => ({
          name: key,
          dataType: typeof sample[key] === 'object'
            ? (Array.isArray(sample[key]) ? 'array' : 'object')
            : typeof sample[key],
          nullable: true,
          isPrimaryKey: key === '_id',
          defaultValue: null
        }))
      }
    } catch {
      // ignore
    }
    return []
  }

  async getTableData(
    connectionId: string,
    tableName: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<DbTableData> {
    const managed = this.connections.get(connectionId)
    if (!managed) {
      return {
        connectionId, tableName, columns: [], rows: [],
        totalRows: 0, page, pageSize, executionTimeMs: 0,
        error: 'Connection not found'
      }
    }

    const startTime = performance.now()
    const offset = (page - 1) * pageSize

    try {
      if (managed.config.type === 'postgresql' && managed.pgPool) {
        const columns = await this.getTableColumns(connectionId, tableName)
        const countResult = await managed.pgPool.query(
          `SELECT COUNT(*)::int AS total FROM ${this.pgQuoteIdent(tableName)}`
        )
        const totalRows = countResult.rows[0]?.total || 0
        const dataResult = await managed.pgPool.query(
          `SELECT * FROM ${this.pgQuoteIdent(tableName)} LIMIT $1 OFFSET $2`,
          [pageSize, offset]
        )
        return {
          connectionId, tableName, columns,
          rows: dataResult.rows,
          totalRows, page, pageSize,
          executionTimeMs: Math.round(performance.now() - startTime),
          error: null
        }
      } else if (managed.config.type === 'mongodb' && managed.mongoClient) {
        const db = managed.mongoClient.db()
        const col = db.collection(tableName)
        const columns = await this.getTableColumns(connectionId, tableName)
        const totalRows = await col.estimatedDocumentCount()
        const docs = await col.find().skip(offset).limit(pageSize).toArray()
        // Serialize BSON types (ObjectId, etc.) to plain JSON for IPC transfer
        const rows = JSON.parse(JSON.stringify(docs)) as Record<string, unknown>[]
        return {
          connectionId, tableName, columns,
          rows,
          totalRows, page, pageSize,
          executionTimeMs: Math.round(performance.now() - startTime),
          error: null
        }
      }

      return {
        connectionId, tableName, columns: [], rows: [],
        totalRows: 0, page, pageSize, executionTimeMs: 0,
        error: 'Unsupported database type'
      }
    } catch (err) {
      return {
        connectionId, tableName, columns: [], rows: [],
        totalRows: 0, page, pageSize,
        executionTimeMs: Math.round(performance.now() - startTime),
        error: (err as Error).message
      }
    }
  }

  private pgQuoteIdent(name: string): string {
    return '"' + name.replace(/"/g, '""') + '"'
  }

  async disconnect(connectionId: string): Promise<void> {
    const managed = this.connections.get(connectionId)
    if (!managed) return

    try {
      if (managed.pgPool) await managed.pgPool.end()
      if (managed.mongoClient) await managed.mongoClient.close()
    } catch {
      // ignore
    }
    this.connections.delete(connectionId)
    this.saveConnections()
  }

  async shutdown(): Promise<void> {
    const disconnects = Array.from(this.connections.keys()).map((id) =>
      this.disconnect(id)
    )
    await Promise.allSettled(disconnects)
  }

  private async testPostgres(
    config: DbConnectionConfig,
    startTime: number
  ): Promise<DbConnectionState> {
    // Close existing if any
    await this.disconnect(config.id)

    const pool = new PgPool({
      connectionString: config.connectionString,
      connectionTimeoutMillis: 5000,
      max: 3
    })

    const result = await pool.query('SELECT version()')
    const version = result.rows[0]?.version || 'unknown'

    this.connections.set(config.id, { config, pgPool: pool })
    this.saveConnections()

    return {
      configId: config.id,
      status: 'connected',
      error: null,
      serverVersion: version,
      latencyMs: Math.round(performance.now() - startTime),
      lastCheckedAt: new Date().toISOString()
    }
  }

  private async testMongo(
    config: DbConnectionConfig,
    startTime: number
  ): Promise<DbConnectionState> {
    await this.disconnect(config.id)

    const client = new MongoClient(config.connectionString, {
      serverSelectionTimeoutMS: 5000
    })

    await client.connect()
    const adminDb = client.db().admin()
    const info = await adminDb.serverInfo()

    this.connections.set(config.id, { config, mongoClient: client })
    this.saveConnections()

    return {
      configId: config.id,
      status: 'connected',
      error: null,
      serverVersion: info.version || 'unknown',
      latencyMs: Math.round(performance.now() - startTime),
      lastCheckedAt: new Date().toISOString()
    }
  }
}

export const dbMonitor = new DbMonitor()
