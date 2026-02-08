export const IPC = {
  // Project Management
  PROJECT_ADD: 'project:add',
  PROJECT_REMOVE: 'project:remove',
  PROJECT_UPDATE: 'project:update',
  PROJECT_LIST: 'project:list',
  PROJECT_DETECT_TYPE: 'project:detect-type',
  PROJECT_BROWSE: 'project:browse',

  // Process / Dev Server Control
  PROCESS_START: 'process:start',
  PROCESS_STOP: 'process:stop',
  PROCESS_RESTART: 'process:restart',
  PROCESS_STATUS: 'process:status',
  PROCESS_STATUS_ALL: 'process:status-all',
  PROCESS_RUN_COMMAND: 'process:run-command',
  // Main -> Renderer pushes
  PROCESS_OUTPUT: 'process:output',
  PROCESS_STATUS_CHANGED: 'process:status-changed',
  PROCESS_METRICS_UPDATE: 'process:metrics-update',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  // Main -> Renderer pushes
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',

  // Port Management
  PORT_SCAN: 'port:scan',
  PORT_KILL: 'port:kill',

  // API Monitoring
  API_ADD_ENDPOINT: 'api:add-endpoint',
  API_REMOVE_ENDPOINT: 'api:remove-endpoint',
  API_UPDATE_ENDPOINT: 'api:update-endpoint',
  API_CHECK_NOW: 'api:check-now',
  API_GET_HISTORY: 'api:get-history',
  API_START_MONITORING: 'api:start-monitoring',
  API_STOP_MONITORING: 'api:stop-monitoring',
  // Main -> Renderer pushes
  API_RESULT: 'api:result',

  // Database Monitoring
  DB_ADD_CONNECTION: 'db:add-connection',
  DB_REMOVE_CONNECTION: 'db:remove-connection',
  DB_TEST_CONNECTION: 'db:test-connection',
  DB_GET_STATUS: 'db:get-status',
  DB_RUN_QUERY: 'db:run-query',
  // Main -> Renderer pushes
  DB_STATUS_CHANGED: 'db:status-changed',

  // System Monitoring
  SYSTEM_METRICS: 'system:metrics',
  SYSTEM_START_MONITORING: 'system:start-monitoring',
  SYSTEM_STOP_MONITORING: 'system:stop-monitoring',
  // Main -> Renderer pushes
  SYSTEM_METRICS_UPDATE: 'system:metrics-update',

  // Logs
  LOG_GET: 'log:get',
  LOG_CLEAR: 'log:clear',
  // Main -> Renderer pushes
  LOG_NEW_ENTRY: 'log:new-entry',

  // Environment Variables
  ENV_READ_FILE: 'env:read-file',
  ENV_WRITE_FILE: 'env:write-file',
  ENV_LIST_FILES: 'env:list-files',
  ENV_SAVE_TEMPLATE: 'env:save-template',
  ENV_LIST_TEMPLATES: 'env:list-templates',
  ENV_APPLY_TEMPLATE: 'env:apply-template',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update'
} as const
