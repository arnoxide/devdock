export const IPC = {
  // Project Management
  PROJECT_ADD: 'project:add',
  PROJECT_REMOVE: 'project:remove',
  PROJECT_UPDATE: 'project:update',
  PROJECT_LIST: 'project:list',
  PROJECT_DETECT_TYPE: 'project:detect-type',
  PROJECT_BROWSE: 'project:browse',
  PROJECT_OPEN: 'project:open',
  PROJECT_GROUP_SYNC: 'project:group-sync',
  PROJECT_OPEN_IN_EDITOR: 'project:open-in-editor',

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
  TERMINAL_GET_SCROLLBACK: 'terminal:get-scrollback',
  TERMINAL_GET_BY_PROJECT: 'terminal:get-by-project',
  // Main -> Renderer pushes
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',

  // Port Management
  PORT_SCAN: 'port:scan',
  PORT_KILL: 'port:kill',
  // Main -> Renderer pushes
  PORT_STILL_IN_USE: 'port:still-in-use',

  // API Monitoring
  API_ADD_ENDPOINT: 'api:add-endpoint',
  API_REMOVE_ENDPOINT: 'api:remove-endpoint',
  API_UPDATE_ENDPOINT: 'api:update-endpoint',
  API_CHECK_NOW: 'api:check-now',
  API_GET_HISTORY: 'api:get-history',
  API_GET_ALL_ENDPOINTS: 'api:get-all-endpoints',
  API_START_MONITORING: 'api:start-monitoring',
  API_STOP_MONITORING: 'api:stop-monitoring',
  // Main -> Renderer pushes
  API_RESULT: 'api:result',
  API_ENDPOINTS_DETECTED: 'api:endpoints-detected',
  API_LOG_METRIC_UPDATE: 'api:log-metric-update',

  // Database Monitoring
  DB_ADD_CONNECTION: 'db:add-connection',
  DB_REMOVE_CONNECTION: 'db:remove-connection',
  DB_TEST_CONNECTION: 'db:test-connection',
  DB_GET_STATUS: 'db:get-status',
  DB_RUN_QUERY: 'db:run-query',
  DB_LIST_TABLES: 'db:list-tables',
  DB_GET_TABLE_DATA: 'db:get-table-data',
  DB_GET_TABLE_COLUMNS: 'db:get-table-columns',
  DB_GET_CONNECTIONS: 'db:get-connections',
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

  // Production Metrics
  PROD_SET_CREDENTIALS: 'prod:set-credentials',
  PROD_REMOVE_CREDENTIALS: 'prod:remove-credentials',
  PROD_GET_CREDENTIALS: 'prod:get-credentials',
  PROD_TEST_CONNECTION: 'prod:test-connection',
  PROD_GET_SERVICES: 'prod:get-services',
  PROD_GET_DEPLOYMENTS: 'prod:get-deployments',
  PROD_GET_DEPLOY_LOGS: 'prod:get-deploy-logs',
  PROD_GET_PERFORMANCE: 'prod:get-performance',
  PROD_GET_RESOURCES: 'prod:get-resources',
  PROD_START_MONITORING: 'prod:start-monitoring',
  PROD_STOP_MONITORING: 'prod:stop-monitoring',
  PROD_TRIGGER_ROLLBACK: 'prod:trigger-rollback',
  PROD_REFRESH_NOW: 'prod:refresh-now',
  // Main -> Renderer pushes
  PROD_SERVICES_UPDATE: 'prod:services-update',
  PROD_DEPLOYMENTS_UPDATE: 'prod:deployments-update',
  PROD_PERFORMANCE_UPDATE: 'prod:performance-update',
  PROD_RESOURCES_UPDATE: 'prod:resources-update',
  PROD_PROVIDER_STATUS_UPDATE: 'prod:provider-status-update',

  // GitHub Integration
  GITHUB_SET_TOKEN: 'github:set-token',
  GITHUB_REMOVE_TOKEN: 'github:remove-token',
  GITHUB_GET_CREDENTIALS: 'github:get-credentials',
  GITHUB_TEST_CONNECTION: 'github:test-connection',
  GITHUB_GET_REPOS: 'github:get-repos',
  GITHUB_GET_PRS: 'github:get-prs',
  GITHUB_GET_ISSUES: 'github:get-issues',
  GITHUB_GET_ACTIONS: 'github:get-actions',
  GITHUB_GET_NOTIFICATIONS: 'github:get-notifications',
  GITHUB_MARK_NOTIFICATION_READ: 'github:mark-notification-read',
  GITHUB_MARK_ALL_NOTIFICATIONS_READ: 'github:mark-all-notifications-read',
  GITHUB_START_POLLING: 'github:start-polling',
  GITHUB_STOP_POLLING: 'github:stop-polling',
  // Main -> Renderer pushes
  GITHUB_REPOS_UPDATE: 'github:repos-update',
  GITHUB_PRS_UPDATE: 'github:prs-update',
  GITHUB_ISSUES_UPDATE: 'github:issues-update',
  GITHUB_ACTIONS_UPDATE: 'github:actions-update',
  GITHUB_NOTIFICATIONS_UPDATE: 'github:notifications-update',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_EXPORT: 'settings:export',
  SETTINGS_RESET: 'settings:reset',

  // Git operations
  GIT_STATUS: 'git:status',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',
  GIT_CHECK_REPO: 'git:check-repo',
  GIT_INIT: 'git:init',
  GIT_SYNC: 'git:sync',
  GIT_GET_REMOTE: 'git:get-remote',
  GIT_SET_REMOTE: 'git:set-remote',

  // SSH Management
  SSH_GET_KEY: 'ssh:get-key',
  SSH_GENERATE_KEY: 'ssh:generate-key',
  SSH_TEST_CONNECTION: 'ssh:test-connection',
  SSH_LIST_KEYS: 'ssh:list-keys',

  // Security Vault
  VAULT_GET_VAULTS: 'vault:get-vaults',
  VAULT_SAVE_VAULT: 'vault:save-vault',
  VAULT_DELETE_VAULT: 'vault:delete-vault',
  VAULT_EXPORT_ENV: 'vault:export-env',
  VAULT_IMPORT_ENV: 'vault:import-env',
  VAULT_ENCRYPT_VALUE: 'vault:encrypt-value',
  VAULT_DECRYPT_VALUE: 'vault:decrypt-value',

  // Local Tunnel / Link Sharing
  TUNNEL_START: 'tunnel:start',
  TUNNEL_STOP: 'tunnel:stop',
  TUNNEL_GET_URL: 'tunnel:get-url',
  TUNNEL_PATCH_VITE: 'tunnel:patch-vite'
} as const
