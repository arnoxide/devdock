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
  parentId?: string // ID of parent group/folder
  isGroup?: boolean // True if this is a folder group (not a runnable project)
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

export interface DbTableInfo {
  name: string
  type: 'table' | 'view' | 'collection'
  rowCount: number | null
  sizeBytes: number | null
}

export interface DbColumnInfo {
  name: string
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  defaultValue: string | null
}

export interface DbTableData {
  connectionId: string
  tableName: string
  columns: DbColumnInfo[]
  rows: Record<string, unknown>[]
  totalRows: number
  page: number
  pageSize: number
  executionTimeMs: number
  error: string | null
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
// PRODUCTION METRICS
// ==========================================

export type PlatformProvider = 'render' | 'railway' | 'vercel' | 'aws'

export type DeployStatus =
  | 'live'
  | 'building'
  | 'deploying'
  | 'failed'
  | 'canceled'
  | 'queued'
  | 'crashed'
  | 'unknown'

export type ProviderConnectionStatus = 'connected' | 'disconnected' | 'error' | 'checking'

export interface PlatformCredentials {
  provider: PlatformProvider
  token: string
  accessKeyId?: string
  secretAccessKey?: string
  region?: string
  enabled: boolean
  addedAt: string
}

export interface ProviderStatus {
  provider: PlatformProvider
  connectionStatus: ProviderConnectionStatus
  error: string | null
  lastCheckedAt: string
  serviceCount: number
}

export interface ProdService {
  id: string
  provider: PlatformProvider
  name: string
  url: string | null
  type: string
  region: string | null
  createdAt: string
}

export interface ProdDeployment {
  id: string
  serviceId: string
  provider: PlatformProvider
  status: DeployStatus
  commitHash: string | null
  commitMessage: string | null
  branch: string | null
  createdAt: string
  finishedAt: string | null
  duration: number | null
}

export interface ProdPerformanceMetrics {
  serviceId: string
  provider: PlatformProvider
  timestamp: string
  responseTimeMs: number | null
  requestCount: number | null
  errorRate: number | null
  bandwidthBytes: number | null
  functionInvocations: number | null
}

export interface ProdResourceMetrics {
  serviceId: string
  provider: PlatformProvider
  timestamp: string
  cpuPercent: number | null
  memoryPercent: number | null
  memoryUsedBytes: number | null
  memoryLimitBytes: number | null
  diskUsedBytes: number | null
  diskLimitBytes: number | null
}

export interface ProductionMetricsSettings {
  credentials: PlatformCredentials[]
  pollingIntervalMs: number
  enabled: boolean
}

// ==========================================
// GITHUB INTEGRATION
// ==========================================

export interface GitHubCredentials {
  token: string
  username: string
  avatarUrl: string
  enabled: boolean
}

export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  language: string | null
  stargazersCount: number
  forksCount: number
  openIssuesCount: number
  isPrivate: boolean
  updatedAt: string
  defaultBranch: string
}

export interface GitHubPR {
  id: number
  number: number
  title: string
  state: string
  htmlUrl: string
  repoFullName: string
  user: string
  createdAt: string
  updatedAt: string
  draft: boolean
  labels: string[]
  headBranch: string
  baseBranch: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  state: string
  htmlUrl: string
  repoFullName: string
  user: string
  createdAt: string
  updatedAt: string
  labels: string[]
  commentCount: number
}

export interface GitHubWorkflowRun {
  id: number
  name: string
  status: string
  conclusion: string | null
  htmlUrl: string
  repoFullName: string
  headBranch: string
  event: string
  createdAt: string
  updatedAt: string
}

export interface GitHubNotification {
  id: string
  reason: string
  subject: { title: string; type: string; url: string | null }
  repository: string
  unread: boolean
  updatedAt: string
}

export interface GitHubSettings {
  credentials: GitHubCredentials | null
  pollingIntervalMs: number
  enabled: boolean
}

// ==========================================
// APP CONFIGURATION
// ==========================================

export interface AppConfig {
  projects: ProjectConfig[]
  databaseConnections: DbConnectionConfig[]
  globalSettings: GlobalSettings
  envTemplates: EnvTemplate[]
  windowBounds: { x: number; y: number; width: number; height: number }
  productionMetrics: ProductionMetricsSettings
  github: GitHubSettings
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
// ==========================================
// GIT INTEGRATION
// ==========================================

export interface GitStatus {
  isRepo: boolean
  branch: string
  behind: number
  ahead: number
  staged: GitFileStatus[]
  unstaged: GitFileStatus[]
  untracked: GitFileStatus[]
  lastCommit?: {
    hash: string
    message: string
    author: string
    date: string
  }
}

export interface GitFileStatus {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'staged'
}

export interface GitCommitRequest {
  projectId: string
  message: string
  files?: string[] // if empty, commit all staged
}
