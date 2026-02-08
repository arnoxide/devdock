// ==========================================
// PROJECT MODELS
// ==========================================

export type ProjectType =
  | 'vite'
  | 'react-cra'
  | 'nextjs'
  | 'nodejs'
  | 'python'
  | 'python-django'
  | 'python-flask'
  | 'python-fastapi'
  | 'rust'
  | 'go'
  | 'unknown'

export type ProjectStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error'

export interface ProjectConfig {
  id: string
  name: string
  path: string
  type: ProjectType
  detectedScripts: Record<string, string>
  startCommand: string
  packageManager: string | null
  customCommands: CustomCommand[]
  envFiles: string[]
  apiEndpoints: ApiEndpointConfig[]
  dbConnections: DbConnectionConfig[]
  color: string
  createdAt: string
  lastOpenedAt: string
}

export interface ProjectRuntime {
  projectId: string
  status: ProjectStatus
  pid: number | null
  port: number | null
  startedAt: string | null
  cpu: number
  memory: number
  uptime: number
}

// ==========================================
// CUSTOM COMMANDS / QUICK ACTIONS
// ==========================================

export interface CustomCommand {
  id: string
  label: string
  command: string
  icon?: string
  category: 'build' | 'test' | 'lint' | 'deploy' | 'custom'
}

// ==========================================
// API MONITORING
// ==========================================

export type EndpointStatus = 'healthy' | 'degraded' | 'down' | 'unknown'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface ApiEndpointConfig {
  id: string
  projectId: string
  name: string
  url: string
  method: HttpMethod
  headers?: Record<string, string>
  body?: string
  expectedStatus: number
  intervalMs: number
  timeoutMs: number
  enabled: boolean
}

export interface ApiEndpointResult {
  endpointId: string
  status: EndpointStatus
  statusCode: number | null
  responseTimeMs: number | null
  error: string | null
  timestamp: string
}

export interface ApiEndpointHistory {
  endpointId: string
  results: ApiEndpointResult[]
}

// ==========================================
// DATABASE MONITORING
// ==========================================

export type DbType = 'mongodb' | 'postgresql'
export type DbConnectionStatus = 'connected' | 'disconnected' | 'error' | 'connecting'

export interface DbConnectionConfig {
  id: string
  projectId: string
  name: string
  type: DbType
  connectionString: string
  enabled: boolean
}

export interface DbConnectionState {
  configId: string
  status: DbConnectionStatus
  error: string | null
  serverVersion: string | null
  latencyMs: number | null
  lastCheckedAt: string
}

export interface DbQueryRequest {
  connectionId: string
  query: string
  params?: unknown[]
}

export interface DbQueryResult {
  connectionId: string
  rows: Record<string, unknown>[]
  rowCount: number
  executionTimeMs: number
  error: string | null
}

// ==========================================
// PORT MANAGEMENT
// ==========================================

export interface PortInfo {
  port: number
  pid: number
  processName: string
  protocol: 'tcp' | 'udp'
  state: string
  localAddress: string
  projectId: string | null
}

// ==========================================
// SYSTEM MONITORING
// ==========================================

export interface SystemMetrics {
  cpuUsagePercent: number
  cpuCores: number
  memoryTotalBytes: number
  memoryUsedBytes: number
  memoryFreeBytes: number
  uptimeSeconds: number
  platform: string
  hostname: string
  timestamp: string
}

export interface ProcessMetrics {
  pid: number
  projectId: string
  cpuPercent: number
  memoryBytes: number
  memoryPercent: number
  timestamp: string
}

// ==========================================
// TERMINAL
// ==========================================

export interface TerminalSession {
  id: string
  projectId: string
  title: string
  cwd: string
  isActive: boolean
  createdAt: string
}

// ==========================================
// LOGS
// ==========================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogSource = 'stdout' | 'stderr' | 'system' | 'api-monitor' | 'db-monitor'

export interface LogEntry {
  id: string
  projectId: string
  source: LogSource
  level: LogLevel
  message: string
  timestamp: string
  processName?: string
}

export interface LogFilter {
  projectId?: string
  level?: LogLevel[]
  source?: LogSource[]
  search?: string
  limit?: number
}

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

export interface EnvFile {
  projectId: string
  filePath: string
  variables: EnvVariable[]
  lastModified: string
}

export interface EnvVariable {
  key: string
  value: string
  isSecret: boolean
  comment?: string
}

export interface EnvTemplate {
  id: string
  name: string
  variables: Omit<EnvVariable, 'value'>[]
}

// ==========================================
// APP CONFIGURATION
// ==========================================

export interface AppConfig {
  projects: ProjectConfig[]
  globalSettings: GlobalSettings
  envTemplates: EnvTemplate[]
  windowBounds: { x: number; y: number; width: number; height: number }
}

export interface GlobalSettings {
  theme: 'dark' | 'light'
  defaultShell: string
  apiMonitorEnabled: boolean
  systemMonitorIntervalMs: number
  logRetentionCount: number
  startMinimized: boolean
  closeToTray: boolean
}
