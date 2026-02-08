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

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  updateSettings: (settings: unknown) => ipcRenderer.invoke(IPC.SETTINGS_UPDATE, settings),

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
  onLogNewEntry: createListener(IPC.LOG_NEW_ENTRY)
}

contextBridge.exposeInMainWorld('api', api)

export type DevDockAPI = typeof api
