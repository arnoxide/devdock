import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'

function createListener(channel: string) {
  return (callback: (data: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown): void => callback(data)
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  }
}

const api = {
  // Project
  addProject: (path: string) => ipcRenderer.invoke(IPC.PROJECT_ADD, path),
  removeProject: (id: string) => ipcRenderer.invoke(IPC.PROJECT_REMOVE, id),
  updateProject: (config: unknown) => ipcRenderer.invoke(IPC.PROJECT_UPDATE, config),
  listProjects: () => ipcRenderer.invoke(IPC.PROJECT_LIST),
  detectProjectType: (path: string) => ipcRenderer.invoke(IPC.PROJECT_DETECT_TYPE, path),
  browseForProject: () => ipcRenderer.invoke(IPC.PROJECT_BROWSE),

  // Process
  startProcess: (projectId: string, command?: string) =>
    ipcRenderer.invoke(IPC.PROCESS_START, projectId, command),
  stopProcess: (projectId: string) => ipcRenderer.invoke(IPC.PROCESS_STOP, projectId),
  restartProcess: (projectId: string) => ipcRenderer.invoke(IPC.PROCESS_RESTART, projectId),
  getProcessStatus: (projectId: string) => ipcRenderer.invoke(IPC.PROCESS_STATUS, projectId),
  getAllProcessStatuses: () => ipcRenderer.invoke(IPC.PROCESS_STATUS_ALL),
  runCommand: (projectId: string, command: string) =>
    ipcRenderer.invoke(IPC.PROCESS_RUN_COMMAND, projectId, command),

  // Terminal
  createTerminal: (projectId: string) => ipcRenderer.invoke(IPC.TERMINAL_CREATE, projectId),
  writeTerminal: (sessionId: string, data: string) =>
    ipcRenderer.invoke(IPC.TERMINAL_WRITE, sessionId, data),
  resizeTerminal: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke(IPC.TERMINAL_RESIZE, sessionId, cols, rows),
  closeTerminal: (sessionId: string) => ipcRenderer.invoke(IPC.TERMINAL_CLOSE, sessionId),

  // Port
  scanPorts: () => ipcRenderer.invoke(IPC.PORT_SCAN),
  killPort: (port: number) => ipcRenderer.invoke(IPC.PORT_KILL, port),

  // API Monitor
  addApiEndpoint: (config: unknown) => ipcRenderer.invoke(IPC.API_ADD_ENDPOINT, config),
  removeApiEndpoint: (id: string) => ipcRenderer.invoke(IPC.API_REMOVE_ENDPOINT, id),
  updateApiEndpoint: (config: unknown) => ipcRenderer.invoke(IPC.API_UPDATE_ENDPOINT, config),
  checkApiNow: (id: string) => ipcRenderer.invoke(IPC.API_CHECK_NOW, id),
  getApiHistory: (id: string) => ipcRenderer.invoke(IPC.API_GET_HISTORY, id),
  getApiEndpoints: () => ipcRenderer.invoke(IPC.API_GET_ALL_ENDPOINTS),
  startApiMonitoring: (id: string) => ipcRenderer.invoke(IPC.API_START_MONITORING, id),
  stopApiMonitoring: (id: string) => ipcRenderer.invoke(IPC.API_STOP_MONITORING, id),

  // Database
  addDbConnection: (config: unknown) => ipcRenderer.invoke(IPC.DB_ADD_CONNECTION, config),
  removeDbConnection: (id: string) => ipcRenderer.invoke(IPC.DB_REMOVE_CONNECTION, id),
  testDbConnection: (config: unknown) => ipcRenderer.invoke(IPC.DB_TEST_CONNECTION, config),
  getDbStatus: (id: string) => ipcRenderer.invoke(IPC.DB_GET_STATUS, id),
  runDbQuery: (req: unknown) => ipcRenderer.invoke(IPC.DB_RUN_QUERY, req),
  listDbTables: (connectionId: string) =>
    ipcRenderer.invoke(IPC.DB_LIST_TABLES, connectionId),
  getDbTableData: (connectionId: string, tableName: string, page?: number, pageSize?: number) =>
    ipcRenderer.invoke(IPC.DB_GET_TABLE_DATA, connectionId, tableName, page, pageSize),
  getDbTableColumns: (connectionId: string, tableName: string) =>
    ipcRenderer.invoke(IPC.DB_GET_TABLE_COLUMNS, connectionId, tableName),
  getDbConnections: () => ipcRenderer.invoke(IPC.DB_GET_CONNECTIONS),

  // System
  getSystemMetrics: () => ipcRenderer.invoke(IPC.SYSTEM_METRICS),
  startSystemMonitoring: () => ipcRenderer.invoke(IPC.SYSTEM_START_MONITORING),
  stopSystemMonitoring: () => ipcRenderer.invoke(IPC.SYSTEM_STOP_MONITORING),

  // Logs
  getLogs: (projectId: string, filter?: unknown) =>
    ipcRenderer.invoke(IPC.LOG_GET, projectId, filter),
  clearLogs: (projectId: string) => ipcRenderer.invoke(IPC.LOG_CLEAR, projectId),

  // Env
  readEnvFile: (projectId: string, filePath: string) =>
    ipcRenderer.invoke(IPC.ENV_READ_FILE, projectId, filePath),
  writeEnvFile: (envFile: unknown) => ipcRenderer.invoke(IPC.ENV_WRITE_FILE, envFile),
  listEnvFiles: (projectId: string) => ipcRenderer.invoke(IPC.ENV_LIST_FILES, projectId),
  saveEnvTemplate: (template: unknown) => ipcRenderer.invoke(IPC.ENV_SAVE_TEMPLATE, template),
  listEnvTemplates: () => ipcRenderer.invoke(IPC.ENV_LIST_TEMPLATES),
  applyEnvTemplate: (templateId: string, projectId: string) =>
    ipcRenderer.invoke(IPC.ENV_APPLY_TEMPLATE, templateId, projectId),

  // Production Metrics
  setProdCredentials: (creds: unknown) => ipcRenderer.invoke(IPC.PROD_SET_CREDENTIALS, creds),
  removeProdCredentials: (provider: string) =>
    ipcRenderer.invoke(IPC.PROD_REMOVE_CREDENTIALS, provider),
  getProdCredentials: () => ipcRenderer.invoke(IPC.PROD_GET_CREDENTIALS),
  testProdConnection: (provider: string) =>
    ipcRenderer.invoke(IPC.PROD_TEST_CONNECTION, provider),
  getProdServices: () => ipcRenderer.invoke(IPC.PROD_GET_SERVICES),
  getProdDeployments: (serviceId: string) =>
    ipcRenderer.invoke(IPC.PROD_GET_DEPLOYMENTS, serviceId),
  getProdDeployLogs: (provider: string, serviceId: string, deployId: string) =>
    ipcRenderer.invoke(IPC.PROD_GET_DEPLOY_LOGS, provider, serviceId, deployId),
  getProdPerformance: (serviceId: string) =>
    ipcRenderer.invoke(IPC.PROD_GET_PERFORMANCE, serviceId),
  getProdResources: (serviceId: string) =>
    ipcRenderer.invoke(IPC.PROD_GET_RESOURCES, serviceId),
  startProdMonitoring: () => ipcRenderer.invoke(IPC.PROD_START_MONITORING),
  stopProdMonitoring: () => ipcRenderer.invoke(IPC.PROD_STOP_MONITORING),
  triggerProdRollback: (provider: string, serviceId: string, deployId: string) =>
    ipcRenderer.invoke(IPC.PROD_TRIGGER_ROLLBACK, provider, serviceId, deployId),
  refreshProdNow: () => ipcRenderer.invoke(IPC.PROD_REFRESH_NOW),

  // GitHub
  setGitHubToken: (token: string) => ipcRenderer.invoke(IPC.GITHUB_SET_TOKEN, token),
  removeGitHubToken: () => ipcRenderer.invoke(IPC.GITHUB_REMOVE_TOKEN),
  getGitHubCredentials: () => ipcRenderer.invoke(IPC.GITHUB_GET_CREDENTIALS),
  testGitHubConnection: (token?: string) =>
    ipcRenderer.invoke(IPC.GITHUB_TEST_CONNECTION, token),
  getGitHubRepos: () => ipcRenderer.invoke(IPC.GITHUB_GET_REPOS),
  getGitHubPRs: () => ipcRenderer.invoke(IPC.GITHUB_GET_PRS),
  getGitHubIssues: () => ipcRenderer.invoke(IPC.GITHUB_GET_ISSUES),
  getGitHubActions: () => ipcRenderer.invoke(IPC.GITHUB_GET_ACTIONS),
  getGitHubNotifications: () => ipcRenderer.invoke(IPC.GITHUB_GET_NOTIFICATIONS),
  markGitHubNotificationRead: (threadId: string) =>
    ipcRenderer.invoke(IPC.GITHUB_MARK_NOTIFICATION_READ, threadId),
  markAllGitHubNotificationsRead: () =>
    ipcRenderer.invoke(IPC.GITHUB_MARK_ALL_NOTIFICATIONS_READ),
  startGitHubPolling: () => ipcRenderer.invoke(IPC.GITHUB_START_POLLING),
  stopGitHubPolling: () => ipcRenderer.invoke(IPC.GITHUB_STOP_POLLING),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  updateSettings: (settings: unknown) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, settings),
  exportSettings: () => ipcRenderer.invoke(IPC.SETTINGS_EXPORT),
  resetSettings: () => ipcRenderer.invoke(IPC.SETTINGS_RESET),

  // Git
  gitStatus: (projectId: string) => ipcRenderer.invoke(IPC.GIT_STATUS, projectId),
  gitCommit: (projectId: string, message: string) =>
    ipcRenderer.invoke(IPC.GIT_COMMIT, { projectId, message }),
  gitPush: (projectId: string) => ipcRenderer.invoke(IPC.GIT_PUSH, projectId),
  gitPull: (projectId: string) => ipcRenderer.invoke(IPC.GIT_PULL, projectId),
  gitInit: (projectId: string) => ipcRenderer.invoke(IPC.GIT_INIT, projectId),
  gitSync: (projectId: string) => ipcRenderer.invoke(IPC.GIT_SYNC, projectId),
  gitGetRemote: (projectId: string) => ipcRenderer.invoke(IPC.GIT_GET_REMOTE, projectId),
  gitSetRemote: (projectId: string, url: string) => ipcRenderer.invoke(IPC.GIT_SET_REMOTE, { projectId, url }),

  // SSH
  sshGetKey: () => ipcRenderer.invoke(IPC.SSH_GET_KEY),
  sshGenerateKey: (email: string) => ipcRenderer.invoke(IPC.SSH_GENERATE_KEY, email),
  sshTestConnection: () => ipcRenderer.invoke(IPC.SSH_TEST_CONNECTION),
  sshListKeys: () => ipcRenderer.invoke(IPC.SSH_LIST_KEYS),

  // Security Vault
  vaultGetVaults: () => ipcRenderer.invoke(IPC.VAULT_GET_VAULTS),
  vaultSaveVault: (vault: unknown) => ipcRenderer.invoke(IPC.VAULT_SAVE_VAULT, vault),
  vaultDeleteVault: (projectId: string) => ipcRenderer.invoke(IPC.VAULT_DELETE_VAULT, projectId),
  vaultExportEnv: (projectId: string, environment: string) => ipcRenderer.invoke(IPC.VAULT_EXPORT_ENV, projectId, environment),
  vaultImportEnv: (projectId: string, projectName: string, environment: string) => ipcRenderer.invoke(IPC.VAULT_IMPORT_ENV, projectId, projectName, environment),
  vaultEncryptValue: (value: string) => ipcRenderer.invoke(IPC.VAULT_ENCRYPT_VALUE, value),
  vaultDecryptValue: (encrypted: string) => ipcRenderer.invoke(IPC.VAULT_DECRYPT_VALUE, encrypted),

  // Event listeners (Main -> Renderer)
  onProcessOutput: createListener(IPC.PROCESS_OUTPUT),
  onProcessStatusChanged: createListener(IPC.PROCESS_STATUS_CHANGED),
  onProcessMetricsUpdate: createListener(IPC.PROCESS_METRICS_UPDATE),
  onTerminalData: createListener(IPC.TERMINAL_DATA),
  onTerminalExit: createListener(IPC.TERMINAL_EXIT),
  onApiResult: createListener(IPC.API_RESULT),
  onApiEndpointsDetected: createListener(IPC.API_ENDPOINTS_DETECTED),
  onLogMetricUpdate: createListener(IPC.API_LOG_METRIC_UPDATE),
  onDbStatusChanged: createListener(IPC.DB_STATUS_CHANGED),
  onSystemMetricsUpdate: createListener(IPC.SYSTEM_METRICS_UPDATE),
  onLogNewEntry: createListener(IPC.LOG_NEW_ENTRY),
  onProdServicesUpdate: createListener(IPC.PROD_SERVICES_UPDATE),
  onProdDeploymentsUpdate: createListener(IPC.PROD_DEPLOYMENTS_UPDATE),
  onProdPerformanceUpdate: createListener(IPC.PROD_PERFORMANCE_UPDATE),
  onProdResourcesUpdate: createListener(IPC.PROD_RESOURCES_UPDATE),
  onProdProviderStatusUpdate: createListener(IPC.PROD_PROVIDER_STATUS_UPDATE),
  onGitHubReposUpdate: createListener(IPC.GITHUB_REPOS_UPDATE),
  onGitHubPRsUpdate: createListener(IPC.GITHUB_PRS_UPDATE),
  onGitHubIssuesUpdate: createListener(IPC.GITHUB_ISSUES_UPDATE),
  onGitHubActionsUpdate: createListener(IPC.GITHUB_ACTIONS_UPDATE),
  onGitHubNotificationsUpdate: createListener(IPC.GITHUB_NOTIFICATIONS_UPDATE)
}

contextBridge.exposeInMainWorld('api', api)

export type DevDockAPI = typeof api
