import { Pool as PgPool } from 'pg'
import { MongoClient } from 'mongodb'
import {
  DbConnectionConfig,
  DbConnectionState,
  DbQueryRequest,
  DbQueryResult
} from '../../shared/types'

interface ManagedConnection {
  config: DbConnectionConfig
  pgPool?: PgPool
  mongoClient?: MongoClient
}

export class DbMonitor {
  private connections = new Map<string, ManagedConnection>()

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
        return {
          connectionId: req.connectionId,
          rows: docs as Record<string, unknown>[],
          rowCount: docs.length,
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
