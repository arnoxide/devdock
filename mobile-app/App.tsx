import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { io, Socket } from 'socket.io-client'

type Screen = 'boot' | 'auth' | 'dashboard' | 'project' | 'processes' | 'production' | 'databases' | 'git' | 'vault' | 'settings'
type ProjectTab = 'output' | 'terminal' | 'git' | 'files'
type ConnectionMode = 'local' | 'cloud'

type Project = {
  id: string
  name: string
  path?: string
  type?: string
  status?: string
  port?: number
  command?: string
  isGroup?: boolean
  parentId?: string
  color?: string
  startCommand?: string
}

type Runtime = {
  projectId: string
  status: string
  pid: number | null
  port: number | null
  startedAt: string | null
  uptime: number
}

type ProcessItem = {
  project: Project
  runtime: Runtime
  output: string[]
}

type DatabaseConnection = {
  id: string
  name: string
  type: string
  hasConnectionString?: boolean
  status?: { status: string; error?: string | null; latencyMs?: number | null; serverVersion?: string | null }
  tables?: DbTable[]
}

type DbTable = {
  name: string
  type: 'table' | 'view' | 'collection'
  rowCount: number | null
  sizeBytes: number | null
}

type DbTableData = {
  connectionId: string
  tableName: string
  columns: Array<{ name: string; dataType: string }>
  rows: Record<string, unknown>[]
  totalRows: number
  page: number
  pageSize: number
  executionTimeMs: number
  error: string | null
}

type ProdService = {
  id: string
  provider: string
  name: string
  url: string | null
  type: string
  region: string | null
  accountName?: string
}

type ProdDeployment = {
  id: string
  serviceId: string
  provider: string
  status: string
  commitHash: string | null
  commitMessage: string | null
  branch: string | null
  createdAt: string
  finishedAt: string | null
}

type VaultSummary = {
  vaults: Array<{ projectId: string; projectName: string; variables: Array<{ id: string; key: string; value: string; environment: string; isSecret: boolean }> }>
  passwords: Array<{ id: string; title: string; category: string; username: string; url: string }>
  defaultPasswordLength?: number
}

type GitFile = {
  path: string
  status: string
  staged?: boolean
}

type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const MODE_KEY = 'devdock.mobile.mode'
const HOST_KEY = 'devdock.mobile.host'
const CLOUD_HOST_KEY = 'devdock.mobile.cloud_host'
const ACCESS_KEY = 'devdock.mobile.access'
const CLOUD_ACCESS_KEY = 'devdock.mobile.cloud_access'
const REFRESH_KEY = 'devdock.mobile.refresh'
const DEFAULT_HOST = 'http://localhost:7777'
const DEFAULT_CLOUD_HOST = 'https://devdock-production.up.railway.app'

const palette = {
  bg: '#020307',
  panel: 'rgba(18, 22, 34, 0.92)',
  panel2: 'rgba(31, 38, 56, 0.84)',
  border: 'rgba(148, 163, 184, 0.22)',
  text: '#e4e6f0',
  muted: '#9ca3b8',
  blue: '#38bdf8',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#eab308',
  purple: '#c084fc',
  cyan: '#22d3ee',
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  )
}

function AppContent() {
  const insets = useSafeAreaInsets()
  const [screen, setScreen] = useState<Screen>('boot')
  const [mode, setModeState] = useState<ConnectionMode>('local')
  const [host, setHostState] = useState(DEFAULT_HOST)
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const api = useMemo(() => createApi(mode, host, accessToken, refreshToken, setAccessToken, setRefreshToken, signOut), [mode, host, accessToken, refreshToken])

  async function setHost(value: string) {
    const clean = value.trim().replace(/\/+$/, '')
    setHostState(clean)
    await AsyncStorage.setItem(mode === 'cloud' ? CLOUD_HOST_KEY : HOST_KEY, clean)
  }

  async function setMode(nextMode: ConnectionMode) {
    setModeState(nextMode)
    await AsyncStorage.setItem(MODE_KEY, nextMode)
    const nextHost = await AsyncStorage.getItem(nextMode === 'cloud' ? CLOUD_HOST_KEY : HOST_KEY)
    const nextAccess = await SecureStore.getItemAsync(nextMode === 'cloud' ? CLOUD_ACCESS_KEY : ACCESS_KEY)
    const nextRefresh = nextMode === 'local' ? await SecureStore.getItemAsync(REFRESH_KEY) : null
    setHostState(nextHost || (nextMode === 'cloud' ? DEFAULT_CLOUD_HOST : DEFAULT_HOST))
    setAccessTokenState(nextAccess)
    setRefreshTokenState(nextRefresh)
  }

  async function setAccessToken(token: string | null) {
    setAccessTokenState(token)
    const key = mode === 'cloud' ? CLOUD_ACCESS_KEY : ACCESS_KEY
    if (token) await SecureStore.setItemAsync(key, token)
    else await SecureStore.deleteItemAsync(key)
  }

  async function setRefreshToken(token: string | null) {
    setRefreshTokenState(token)
    if (token) await SecureStore.setItemAsync(REFRESH_KEY, token)
    else await SecureStore.deleteItemAsync(REFRESH_KEY)
  }

  async function signOut() {
    await setAccessToken(null)
    await setRefreshToken(null)
    setProjects([])
    setSelectedProject(null)
    setScreen('auth')
  }

  const loadProjects = useCallback(async () => {
    const data = await api.projects()
    const list = Array.isArray(data) ? data : data.projects || []
    const enriched = await Promise.all(list.map(async (project) => {
      if (project.isGroup) return project
      try {
        const status = await api.projectStatus(project.id)
        return { ...project, status: status?.status || project.status, port: status?.port ?? project.port }
      } catch {
        return project
      }
    }))
    setProjects(enriched)
  }, [api])

  useEffect(() => {
    async function boot() {
      const savedMode = ((await AsyncStorage.getItem(MODE_KEY)) as ConnectionMode | null) || 'local'
      const savedHost = await AsyncStorage.getItem(savedMode === 'cloud' ? CLOUD_HOST_KEY : HOST_KEY)
      const savedAccess = await SecureStore.getItemAsync(savedMode === 'cloud' ? CLOUD_ACCESS_KEY : ACCESS_KEY)
      const savedRefresh = savedMode === 'local' ? await SecureStore.getItemAsync(REFRESH_KEY) : null
      setModeState(savedMode)
      setHostState(savedHost || (savedMode === 'cloud' ? DEFAULT_CLOUD_HOST : DEFAULT_HOST))
      if (savedAccess) setAccessTokenState(savedAccess)
      if (savedRefresh) setRefreshTokenState(savedRefresh)
      setScreen(savedAccess ? 'dashboard' : 'auth')
    }
    boot()
  }, [])

  useEffect(() => {
    if (screen !== 'dashboard') return
    loadProjects().catch(() => undefined)
    const timer = setInterval(() => loadProjects().catch(() => undefined), 10000)
    return () => clearInterval(timer)
  }, [loadProjects, screen])

  function openProject(project: Project) {
    setSelectedProject(project)
    setScreen('project')
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <StatusBar style="light" />
      {screen === 'boot' && <BootScreen />}
      {screen === 'auth' && (
        <AuthScreen
          host={host}
          mode={mode}
          setHost={setHost}
          setMode={setMode}
          api={api}
          onAuthed={async (tokens) => {
            await setAccessToken(tokens.accessToken)
            await setRefreshToken(tokens.refreshToken || null)
            setScreen('dashboard')
          }}
        />
      )}
      {screen === 'dashboard' && (
        <DashboardScreen
          host={host}
          mode={mode}
          projects={projects}
          refresh={loadProjects}
          openProject={openProject}
          signOut={signOut}
          navigate={setScreen}
        />
      )}
      {screen === 'processes' && <ProcessesScreen api={api} navigate={setScreen} openProject={openProject} />}
      {screen === 'production' && <ProductionScreen api={api} navigate={setScreen} />}
      {screen === 'databases' && <DatabasesScreen api={api} navigate={setScreen} />}
      {screen === 'git' && <GitOverviewScreen api={api} navigate={setScreen} openProject={openProject} />}
      {screen === 'vault' && <VaultScreen api={api} navigate={setScreen} />}
      {screen === 'settings' && <SettingsScreen api={api} host={host} mode={mode} navigate={setScreen} signOut={signOut} />}
      {screen === 'project' && selectedProject && (
        <ProjectScreen
          api={api}
          host={host}
          mode={mode}
          token={accessToken}
          initialProject={selectedProject}
          goBack={() => setScreen('dashboard')}
          refreshProjects={loadProjects}
        />
      )}
    </View>
  )
}

function createApi(
  mode: ConnectionMode,
  host: string,
  accessToken: string | null,
  refreshToken: string | null,
  setAccessToken: (token: string | null) => Promise<void>,
  setRefreshToken: (token: string | null) => Promise<void>,
  signOut: () => Promise<void>,
) {
  async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out. Check your DevDock host or network.')
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  async function request(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
    const res = await fetchWithTimeout(`${host}${path}`, { ...options, headers }, path.includes('/databases/') ? 12000 : 15000)

    if (mode === 'local' && res.status === 401 && retry && refreshToken) {
      const refreshRes = await fetchWithTimeout(`${host}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!refreshRes.ok) {
        await signOut()
        throw new Error('Session expired')
      }
      const data = await refreshRes.json()
      await setAccessToken(data.accessToken)
      await setRefreshToken(data.refreshToken)
      return request(path, options, false)
    }

    return res
  }

  async function json<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await request(path, options)
    const text = await res.text()
    let data: any = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        const looksLikeHtml = text.trimStart().startsWith('<')
        throw new Error(looksLikeHtml ? `Remote API route is not available yet: ${path}` : `Invalid JSON from server: ${path}`)
      }
    }
    if (!res.ok) {
      let message = `HTTP ${res.status}`
      if (data) message = data.message || data.error || message
      throw new Error(message)
    }
    return data as T
  }

  async function publicJson<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithTimeout(`${host}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let data: any = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        const looksLikeHtml = text.trimStart().startsWith('<')
        throw new Error(looksLikeHtml ? `Remote API route is not available yet: ${path}` : `Invalid JSON from server: ${path}`)
      }
    }
    if (!res.ok) {
      let message = `HTTP ${res.status}`
      if (data) message = data.message || data.error || message
      throw new Error(message)
    }
    return data as T
  }

  async function command(targetType: string, targetId: string | null, action: string, payload: Record<string, unknown> = {}) {
    return json('/api/commands', { method: 'POST', body: JSON.stringify({ targetType, targetId, action, payload }) })
  }

  async function cloudProjects() {
    const data = await json<{ projects: any[] }>('/api/projects')
    return { projects: (data.projects || []).map(normalizeCloudProject) }
  }

  async function cloudProcesses() {
    const data = await json<{ processes: any[] }>('/api/processes')
    return {
      processes: (data.processes || []).map((row) => {
        const project = normalizeCloudProject({
          id: row.project_id,
          name: row.name || row.project_id,
          path: row.path,
          type: row.type,
          status: row.status,
          port: row.port,
        })
        return {
          project,
          runtime: {
            projectId: row.project_id,
            status: row.status || 'idle',
            pid: row.pid || null,
            port: row.port || null,
            startedAt: row.created_at || null,
            uptime: 0,
          },
          output: Array.isArray(row.output) ? row.output : [],
        }
      }),
    }
  }

  async function cloudGit(projectId?: string) {
    const data = await json<{ repos: any[] }>('/api/git')
    const repos = data.repos || []
    if (!projectId) return repos
    const repo = repos.find((item) => item.project_id === projectId)
    if (!repo) throw new Error('No cloud git snapshot for this project yet. Sync DevDock on desktop once.')
    return {
      branch: repo.branch,
      changes: Array.isArray(repo.changes) ? repo.changes.map(normalizeGitChange) : [],
      files: Array.isArray(repo.changes) ? repo.changes.map(normalizeGitChange) : [],
      commits: Array.isArray(repo.commits) ? repo.commits : [],
      error: repo.error,
      updatedAt: repo.updated_at,
    }
  }

  async function cloudProduction() {
    const data = await json<{ services: any[] }>('/api/production')
    const services: ProdService[] = []
    const deploymentsByService: Record<string, ProdDeployment[]> = {}
    for (const row of data.services || []) {
      const service = row.service || {}
      const id = row.service_id || service.id
      services.push({
        id,
        provider: row.provider || service.provider || 'cloud',
        name: service.name || id,
        url: service.url || null,
        type: service.type || 'service',
        region: service.region || null,
        accountName: service.accountName,
      })
      deploymentsByService[id] = Array.isArray(row.deployments) ? row.deployments : []
    }
    return { settings: {}, credentials: [], providerStatuses: {}, services, deploymentsByService }
  }

  async function cloudDatabases() {
    const data = await json<{ databases: any[] }>('/api/databases')
    return {
      connections: (data.databases || []).map((row) => ({
        id: row.connection_id,
        name: row.name || row.connection_id,
        type: row.type || 'database',
        status: { status: row.status || 'unknown' },
        tables: Array.isArray(row.tables) ? row.tables : [],
      })),
    }
  }

  if (mode === 'cloud') {
    return {
      mode,
      ping: () => publicJson<{ ok: boolean }>('/health'),
      authStatus: async () => ({ configured: true, hasUser: true }),
      setup: async (email: string, password: string) => {
        const data = await publicJson<{ token: string }>('/api/auth/register', { email, password, displayName: email.split('@')[0] || 'DevDock' })
        return { accessToken: data.token, refreshToken: '' }
      },
      login: async (email: string, password: string) => {
        const data = await publicJson<{ token: string }>('/api/auth/login', { email, password })
        return { accessToken: data.token, refreshToken: '' }
      },
      projects: cloudProjects,
      projectStatus: async (id: string) => {
        const processes = await cloudProcesses()
        const item = processes.processes.find((process) => process.project.id === id)
        if (item) return { ...item.runtime, status: item.runtime.status, port: item.runtime.port, output: item.output }
        const data = await cloudProjects()
        const project = data.projects.find((candidate) => candidate.id === id)
        return { status: project?.status || 'idle', port: project?.port || null, output: [] }
      },
      startProject: (id: string, commandText?: string) => command('project', id, 'start', commandText ? { command: commandText } : {}),
      stopProject: (id: string) => command('project', id, 'stop'),
      restartProject: (id: string) => command('project', id, 'restart'),
      gitStatus: (id: string) => cloudGit(id),
      gitStage: async () => unsupportedCloud('staging files'),
      gitCommit: async () => unsupportedCloud('committing changes'),
      gitPush: (id: string) => command('git', id, 'push'),
      gitPull: (id: string) => command('git', id, 'pull'),
      fileTree: async () => unsupportedCloud('file browsing'),
      readFile: async () => unsupportedCloud('file reading'),
      writeFile: async () => unsupportedCloud('file editing'),
      dockProcesses: cloudProcesses,
      dockDatabases: cloudDatabases,
      testDatabase: async (id: string) => ({ status: 'snapshot', connectionId: id }),
      dbTables: async (id: string) => {
        const data = await cloudDatabases()
        const connection = data.connections.find((item) => item.id === id)
        return { tables: connection?.tables || [] }
      },
      dbTableData: async (id: string, table: string, page = 1) => ({
        connectionId: id,
        tableName: table,
        columns: [],
        rows: [],
        totalRows: 0,
        page,
        pageSize: 25,
        executionTimeMs: 0,
        error: 'Cloud Hub stores database metadata only right now. Use local mode for live table rows.',
      }),
      dockProduction: cloudProduction,
      refreshProduction: async () => ({ ok: true, ...(await cloudProduction()) }),
      dockVault: async () => ({ vaults: [], passwords: [] }),
      dockSettings: async () => ({ settings: {}, remote: { configured: true, username: 'Cloud Hub' } }),
      updateSettings: async () => unsupportedCloud('editing settings'),
    }
  }

  return {
    mode,
    ping: () => publicJson<{ ok: boolean }>('/api/ping'),
    authStatus: () => publicJson<{ configured?: boolean; hasUser?: boolean }>('/api/auth/status'),
    setup: (username: string, password: string) => publicJson<{ accessToken: string; refreshToken: string }>('/api/auth/setup', { username, password }),
    login: (username: string, password: string) => publicJson<{ accessToken: string; refreshToken: string }>('/api/auth/login', { username, password }),
    projects: () => json<Project[] | { projects: Project[] }>('/api/projects'),
    projectStatus: (id: string) => json<any>(`/api/projects/${id}/status`),
    startProject: (id: string, command?: string) => json(`/api/projects/${id}/start`, { method: 'POST', body: JSON.stringify({ command }) }),
    stopProject: (id: string) => json(`/api/projects/${id}/stop`, { method: 'POST' }),
    restartProject: (id: string) => json(`/api/projects/${id}/restart`, { method: 'POST' }),
    gitStatus: (id: string) => json<any>(`/api/git/${id}/status`),
    gitStage: (id: string, files?: string[]) => json(`/api/git/${id}/stage`, { method: 'POST', body: JSON.stringify({ files }) }),
    gitCommit: (id: string, message: string) => json(`/api/git/${id}/commit`, { method: 'POST', body: JSON.stringify({ message }) }),
    gitPush: (id: string) => json(`/api/git/${id}/push`, { method: 'POST' }),
    gitPull: (id: string) => json(`/api/git/${id}/pull`, { method: 'POST' }),
    fileTree: (id: string, path?: string) => json<FileNode[] | { files?: FileNode[]; tree?: FileNode[] }>(`/api/files/${id}/tree${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    readFile: (id: string, path: string) => json<{ content: string }>(`/api/files/${id}/file?path=${encodeURIComponent(path)}`),
    writeFile: (id: string, path: string, content: string) => json(`/api/files/${id}/file?path=${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    dockProcesses: () => json<{ processes: ProcessItem[] }>('/api/dock/processes'),
    dockDatabases: () => json<{ connections: DatabaseConnection[] }>('/api/dock/databases'),
    testDatabase: (id: string) => json(`/api/dock/databases/${id}/test`, { method: 'POST' }),
    dbTables: (id: string) => json<{ tables: DbTable[] }>(`/api/dock/databases/${id}/tables`),
    dbTableData: (id: string, table: string, page = 1) => json<DbTableData>(`/api/dock/databases/${id}/tables/${encodeURIComponent(table)}?page=${page}&pageSize=25`),
    dockProduction: () => json<{ settings: any; credentials: any[]; providerStatuses: Record<string, any>; services: ProdService[]; deploymentsByService: Record<string, ProdDeployment[]> }>('/api/dock/production'),
    refreshProduction: () => json<{ ok: boolean; providerStatuses: Record<string, any>; services: ProdService[]; deploymentsByService: Record<string, ProdDeployment[]> }>('/api/dock/production/refresh', { method: 'POST' }),
    dockVault: () => json<VaultSummary>('/api/dock/vault'),
    dockSettings: () => json<{ settings: any; remote: { configured: boolean; username: string } }>('/api/dock/settings'),
    updateSettings: (settings: Record<string, unknown>) => json('/api/dock/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
  }
}

type Api = ReturnType<typeof createApi>

function BootScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={palette.blue} />
      <Text style={styles.mutedText}>Opening DevDock...</Text>
    </View>
  )
}

function AuthScreen({ host, mode, setHost, setMode, api, onAuthed }: { host: string; mode: ConnectionMode; setHost: (value: string) => Promise<void>; setMode: (mode: ConnectionMode) => Promise<void>; api: Api; onAuthed: (tokens: { accessToken: string; refreshToken?: string }) => void }) {
  const [hostDraft, setHostDraft] = useState(host)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [setupMode, setSetupMode] = useState(false)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(mode === 'cloud' ? 'Use your Railway Hub login to see synced snapshots away from your PC.' : 'Use your computer LAN address, for example http://192.168.1.20:7777')

  useEffect(() => {
    setHostDraft(host)
    setMessage(mode === 'cloud' ? 'Use your Railway Hub login to see synced snapshots away from your PC.' : 'Use your computer LAN address, for example http://192.168.1.20:7777')
  }, [host, mode])

  async function checkServer() {
    setChecking(true)
    try {
      await setHost(hostDraft)
      await api.ping()
      if (mode === 'cloud') {
        setMessage('Cloud Hub found. Log in with your Railway Hub account.')
      } else {
        const status = await api.authStatus()
        setSetupMode(!(status.configured ?? status.hasUser))
        setMessage((status.configured ?? status.hasUser) ? 'Server found. Log in to control DevDock.' : 'Server found. Create the remote account first.')
      }
    } catch (err: any) {
      setMessage(err.message || 'Could not reach DevDock')
    } finally {
      setChecking(false)
    }
  }

  async function submit() {
    if (!username.trim() || !password) {
      setMessage(mode === 'cloud' ? 'Email and password are required.' : 'Username and password are required.')
      return
    }
    setBusy(true)
    try {
      await setHost(hostDraft)
      const tokens = setupMode ? await api.setup(username.trim(), password) : await api.login(username.trim(), password)
      onAuthed(tokens)
    } catch (err: any) {
      setMessage(err.message || 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Ionicons name="cube" size={30} color={palette.text} />
        </View>
        <Text style={styles.title}>DevDock</Text>
        <Text style={styles.subtitle}>Phone control for your development dock.</Text>

        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode('cloud')} style={[styles.segment, mode === 'cloud' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'cloud' && styles.segmentTextActive]}>Cloud Hub</Text>
          </Pressable>
          <Pressable onPress={() => setMode('local')} style={[styles.segment, mode === 'local' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'local' && styles.segmentTextActive]}>Local</Text>
          </Pressable>
        </View>

        <View style={styles.formBlock}>
          <Text style={styles.label}>{mode === 'cloud' ? 'Hub URL' : 'Server'}</Text>
          <TextInput value={hostDraft} onChangeText={setHostDraft} autoCapitalize="none" keyboardType="url" placeholder={mode === 'cloud' ? DEFAULT_CLOUD_HOST : DEFAULT_HOST} placeholderTextColor={palette.muted} style={styles.input} />
          <Pressable style={styles.secondaryButton} onPress={checkServer} disabled={checking}>
            {checking ? <ActivityIndicator color={palette.text} /> : <Ionicons name="wifi" size={18} color={palette.text} />}
            <Text style={styles.buttonText}>{mode === 'cloud' ? 'Check Hub' : 'Check Server'}</Text>
          </Pressable>
        </View>

        <View style={styles.formBlock}>
          <View style={styles.modeRow}>
            <Pressable onPress={() => setSetupMode(false)} style={[styles.segment, !setupMode && styles.segmentActive]}>
              <Text style={[styles.segmentText, !setupMode && styles.segmentTextActive]}>Login</Text>
            </Pressable>
            <Pressable onPress={() => setSetupMode(true)} style={[styles.segment, setupMode && styles.segmentActive]}>
              <Text style={[styles.segmentText, setupMode && styles.segmentTextActive]}>{mode === 'cloud' ? 'Register' : 'Setup'}</Text>
            </Pressable>
          </View>
          <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" keyboardType={mode === 'cloud' ? 'email-address' : 'default'} placeholder={mode === 'cloud' ? 'Email' : 'Username'} placeholderTextColor={palette.muted} style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={palette.muted} style={styles.input} />
          <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name={setupMode ? 'person-add' : 'log-in'} size={18} color="#fff" />}
            <Text style={styles.primaryButtonText}>{setupMode ? 'Create Access' : 'Connect'}</Text>
          </Pressable>
        </View>

        <Text style={styles.helpText}>{message}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function DashboardScreen({ host, mode, projects, refresh, openProject, signOut, navigate }: { host: string; mode: ConnectionMode; projects: Project[]; refresh: () => Promise<void>; openProject: (project: Project) => void; signOut: () => void; navigate: (screen: Screen) => void }) {
  const [refreshing, setRefreshing] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const grouped = useMemo(() => {
    const groups = projects.filter((project) => project.isGroup)
    const childIds = new Set<string>()
    const childrenByGroup = new Map<string, Project[]>()

    const addChild = (groupId: string, project: Project) => {
      const existing = childrenByGroup.get(groupId) || []
      const normalizedPath = normalizePath(project.path)
      if (existing.some((child) => normalizePath(child.path) === normalizedPath)) {
        childIds.add(project.id)
        return
      }
      childrenByGroup.set(groupId, [...existing, project])
      childIds.add(project.id)
    }

    for (const project of projects) {
      if (!project.isGroup && project.parentId && groups.some((group) => group.id === project.parentId)) {
        addChild(project.parentId, project)
      }
    }

    for (const project of projects) {
      if (project.isGroup || childIds.has(project.id)) continue
      const pathGroup = findPathGroup(project, groups)
      if (pathGroup) addChild(pathGroup.id, project)
    }

    const standalone = projects.filter((project) => !project.isGroup && !childIds.has(project.id))
    return { groups, standalone, childrenByGroup }
  }, [projects])

  async function doRefresh() {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>DevDock</Text>
          <Text style={styles.headerSub}>{mode === 'cloud' ? 'Cloud Hub' : 'Local'} · {host}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={22} color={palette.text} />
        </Pressable>
      </View>
      <ScrollView refreshControl={<RefreshControl tintColor={palette.blue} refreshing={refreshing} onRefresh={doRefresh} />} contentContainerStyle={styles.dashboardList}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Projects</Text>
          <Text style={styles.pill}>{projects.filter((project) => !project.isGroup).length}</Text>
        </View>
        {projects.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={42} color={palette.muted} />
            <Text style={styles.mutedText}>No projects yet.</Text>
          </View>
        ) : (
          <>
            {grouped.groups.map((group) => {
              const children = grouped.childrenByGroup.get(group.id) || []
              const expanded = expandedGroups[group.id] ?? false
              return (
                <ProjectGroupCard
                  key={group.id}
                  group={group}
                  childrenProjects={children}
                  expanded={expanded}
                  toggle={() => setExpandedGroups((old) => ({ ...old, [group.id]: !expanded }))}
                  openProject={openProject}
                />
              )
            })}
            {grouped.standalone.map((project) => <ProjectCard key={project.id} project={project} onPress={() => openProject(project)} />)}
          </>
        )}
      </ScrollView>
      <DockNav active="dashboard" navigate={navigate} />
    </View>
  )
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const running = project.status === 'running'
  return (
    <Pressable style={({ pressed }) => [styles.projectCard, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.projectTop}>
        <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
        <View style={[styles.dot, { backgroundColor: running ? palette.green : palette.muted }]} />
      </View>
      <Text style={styles.projectPath} numberOfLines={1}>{project.path || project.type || project.id}</Text>
      <View style={styles.projectMeta}>
        <Text style={[styles.statusText, { color: running ? palette.green : palette.muted }]}>{running ? 'Running' : project.status || 'Idle'}</Text>
        {project.port ? <Text style={styles.portText}>:{project.port}</Text> : null}
      </View>
    </Pressable>
  )
}

function ProjectGroupCard({ group, childrenProjects, expanded, toggle, openProject }: { group: Project; childrenProjects: Project[]; expanded: boolean; toggle: () => void; openProject: (project: Project) => void }) {
  return (
    <View style={styles.groupCard}>
      <Pressable style={styles.groupHeader} onPress={toggle}>
        <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color={palette.muted} />
        <View style={[styles.groupIcon, { backgroundColor: `${group.color || palette.blue}25` }]}>
          <Ionicons name={expanded ? 'folder-open' : 'folder'} size={18} color={group.color || palette.blue} />
        </View>
        <View style={styles.headerProject}>
          <Text style={styles.projectName} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.projectPath} numberOfLines={1}>{childrenProjects.length} project{childrenProjects.length === 1 ? '' : 's'} · {group.path}</Text>
        </View>
      </Pressable>
      {expanded && (
        <View style={styles.groupChildren}>
          {childrenProjects.map((project) => <ProjectCard key={project.id} project={project} onPress={() => openProject(project)} />)}
          {childrenProjects.length === 0 && <Text style={styles.mutedText}>No child projects found.</Text>}
        </View>
      )}
    </View>
  )
}

const dockTabs: Array<{ screen: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { screen: 'dashboard', label: 'Projects', icon: 'folder' },
  { screen: 'processes', label: 'Proc', icon: 'pulse' },
  { screen: 'production', label: 'Prod', icon: 'cloud' },
  { screen: 'databases', label: 'DB', icon: 'server' },
  { screen: 'git', label: 'Git', icon: 'git-branch' },
  { screen: 'vault', label: 'Vault', icon: 'lock-closed' },
  { screen: 'settings', label: 'Settings', icon: 'settings' },
]

function DockNav({ active, navigate }: { active: Screen; navigate: (screen: Screen) => void }) {
  return (
    <View style={styles.dockNav}>
      {dockTabs.map((tab) => {
        const selected = active === tab.screen
        return (
          <Pressable key={tab.screen} style={styles.dockNavItem} onPress={() => navigate(tab.screen)}>
            <Ionicons name={tab.icon} size={19} color={selected ? palette.blue : palette.muted} />
            <Text style={[styles.dockNavText, selected && styles.dockNavTextActive]} numberOfLines={1}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function SectionHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon: keyof typeof Ionicons.glyphMap; action?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={20} color={palette.blue} />
        </View>
        <View style={styles.headerProject}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {action}
    </View>
  )
}

function ProcessesScreen({ api, navigate, openProject }: { api: Api; navigate: (screen: Screen) => void; openProject: (project: Project) => void }) {
  const [items, setItems] = useState<ProcessItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.dockProcesses()
      setItems(data.processes || [])
      setError(null)
    } catch (err: any) {
      if (!isRouteUnavailable(err)) throw err
      const data = await api.projects()
      const projects = (Array.isArray(data) ? data : data.projects || []).filter((project) => !project.isGroup)
      const fallback = await Promise.all(projects.map(async (project) => {
        const status = await api.projectStatus(project.id).catch(() => ({ status: project.status || 'idle', port: project.port || null }))
        return {
          project: { ...project, status: status?.status, port: status?.port ?? project.port },
          runtime: {
            projectId: project.id,
            status: status?.status || 'idle',
            pid: null,
            port: status?.port ?? null,
            startedAt: null,
            uptime: 0
          },
          output: []
        }
      }))
      setItems(fallback)
      setError('Using basic process status. Restart DevDock remote to unlock full process output.')
    }
  }, [api])

  useEffect(() => {
    load().catch((err) => Alert.alert('Processes', err.message))
    const timer = setInterval(() => load().catch(() => undefined), 5000)
    return () => clearInterval(timer)
  }, [load])

  async function refresh() {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }

  const running = items.filter((item) => item.runtime.status === 'running')

  return (
    <View style={styles.flex}>
      <SectionHeader title="Processes" subtitle={`${running.length} running · ${items.length} projects`} icon="pulse" />
      <ScrollView refreshControl={<RefreshControl tintColor={palette.blue} refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={styles.dashboardList}>
        {error ? <NoticePanel text={error} /> : null}
        {items.map((item) => (
          <Pressable key={item.project.id} style={styles.projectCard} onPress={() => openProject(item.project)}>
            <View style={styles.projectTop}>
              <Text style={styles.projectName} numberOfLines={1}>{item.project.name}</Text>
              <Text style={[styles.statusText, { color: item.runtime.status === 'running' ? palette.green : palette.muted }]}>{item.runtime.status}</Text>
            </View>
            <Text style={styles.projectPath} numberOfLines={1}>{item.project.startCommand || item.project.path}</Text>
            <View style={styles.projectMeta}>
              <Text style={styles.projectPath}>{item.runtime.pid ? `pid ${item.runtime.pid}` : 'not running'}</Text>
              {item.runtime.port ? <Text style={styles.portText}>:{item.runtime.port}</Text> : null}
            </View>
          </Pressable>
        ))}
        {items.length === 0 && <EmptyPanel icon="pulse-outline" text="No processes to show." />}
      </ScrollView>
      <DockNav active="processes" navigate={navigate} />
    </View>
  )
}

function ProductionScreen({ api, navigate }: { api: Api; navigate: (screen: Screen) => void }) {
  const [data, setData] = useState<{ credentials: any[]; providerStatuses: Record<string, any>; services: ProdService[]; deploymentsByService: Record<string, ProdDeployment[]> } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api.dockProduction())
      setError(null)
    } catch (err: any) {
      if (!isRouteUnavailable(err)) throw err
      setData({ credentials: [], providerStatuses: {}, services: [], deploymentsByService: {} })
      setError('Production data needs the updated DevDock remote API. Restart DevDock on the host machine.')
    }
  }, [api])

  useEffect(() => {
    load().catch((err) => Alert.alert('Production', err.message))
  }, [load])

  async function refreshNow() {
    setRefreshing(true)
    try {
      const next = await api.refreshProduction()
      setData((old) => ({ credentials: old?.credentials || [], providerStatuses: next.providerStatuses, services: next.services, deploymentsByService: next.deploymentsByService || {} }))
    } catch (err: any) {
      Alert.alert('Production', err.message || 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ProdService[]>()
    for (const service of data?.services || []) map.set(service.provider, [...(map.get(service.provider) || []), service])
    return Array.from(map.entries())
  }, [data])

  return (
    <View style={styles.flex}>
      <SectionHeader title="Production" subtitle={`${data?.services.length || 0} services · ${data?.credentials.length || 0} accounts`} icon="cloud" action={<Pressable style={styles.iconButton} onPress={refreshNow}>{refreshing ? <ActivityIndicator color={palette.blue} /> : <Ionicons name="refresh" size={20} color={palette.text} />}</Pressable>} />
      <ScrollView contentContainerStyle={styles.dashboardList}>
        {error ? <NoticePanel text={error} /> : null}
        {grouped.map(([provider, services]) => (
          <View key={provider} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={styles.groupIcon}><Ionicons name="cloud" size={18} color={palette.blue} /></View>
              <View style={styles.headerProject}>
                <Text style={styles.projectName}>{provider}</Text>
                <Text style={styles.projectPath}>{services.length} service{services.length === 1 ? '' : 's'}</Text>
              </View>
            </View>
            <View style={styles.groupChildren}>
              {services.map((service) => {
                const latest = (data?.deploymentsByService?.[service.id] || [])[0]
                const color = deploymentColor(latest?.status)
                return (
                <View key={service.id} style={styles.serviceRow}>
                  <Ionicons name={deploymentIcon(latest?.status)} size={18} color={color} />
                  <View style={styles.headerProject}>
                    <Text style={styles.fileName} numberOfLines={1}>{service.name}</Text>
                    <Text style={styles.projectPath} numberOfLines={1}>{latest?.status || 'unknown'} · {service.type}{service.region ? ` · ${service.region}` : ''}</Text>
                  </View>
                  <Text style={[styles.statusChip, { color, borderColor: `${color}66` }]}>{latest?.status || 'sync'}</Text>
                </View>
              )})}
            </View>
          </View>
        ))}
        {(data?.services.length || 0) === 0 && <EmptyPanel icon="cloud-outline" text="No production services loaded." />}
      </ScrollView>
      <DockNav active="production" navigate={navigate} />
    </View>
  )
}

function GitOverviewScreen({ api, navigate, openProject }: { api: Api; navigate: (screen: Screen) => void; openProject: (project: Project) => void }) {
  const [items, setItems] = useState<Array<{ project: Project; git: any; error?: string }>>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const data = await api.projects()
    const projects = (Array.isArray(data) ? data : data.projects || []).filter((project) => !project.isGroup)
    const next = await Promise.all(projects.map(async (project) => {
      try {
        return { project, git: await api.gitStatus(project.id) }
      } catch (err: any) {
        return { project, git: null, error: err.message || 'Not a git repo' }
      }
    }))
    setItems(next)
  }, [api])

  useEffect(() => {
    load().catch((err) => Alert.alert('Git', err.message))
  }, [load])

  async function refresh() {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }

  const repos = items.filter((item) => item.git)
  const dirty = repos.filter((item) => (item.git?.changes || item.git?.files || []).length > 0)

  return (
    <View style={styles.flex}>
      <SectionHeader title="Git" subtitle={`${dirty.length} changed · ${repos.length} repos`} icon="git-branch" />
      <ScrollView refreshControl={<RefreshControl tintColor={palette.blue} refreshing={refreshing} onRefresh={refresh} />} contentContainerStyle={styles.dashboardList}>
        {items.map((item) => {
          const changes = item.git?.changes || item.git?.files || []
          return (
            <Pressable key={item.project.id} style={styles.projectCard} onPress={() => openProject(item.project)}>
              <View style={styles.projectTop}>
                <Text style={styles.projectName} numberOfLines={1}>{item.project.name}</Text>
                <Ionicons name={changes.length > 0 ? 'git-compare' : item.git ? 'checkmark-circle' : 'remove-circle'} size={20} color={changes.length > 0 ? palette.amber : item.git ? palette.green : palette.muted} />
              </View>
              <Text style={styles.projectPath} numberOfLines={1}>{item.git?.branch || item.error || item.project.path}</Text>
              <View style={styles.projectMeta}>
                <Text style={styles.projectPath}>{changes.length} change{changes.length === 1 ? '' : 's'}</Text>
                {item.git ? <Text style={styles.portText}>open</Text> : null}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
      <DockNav active="git" navigate={navigate} />
    </View>
  )
}

function DatabasesScreen({ api, navigate }: { api: Api; navigate: (screen: Screen) => void }) {
  const [connections, setConnections] = useState<DatabaseConnection[]>([])
  const [testing, setTesting] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, DatabaseConnection['status']>>({})
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null)
  const [tables, setTables] = useState<DbTable[]>([])
  const [tablesLoading, setTablesLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<DbTable | null>(null)
  const [tableData, setTableData] = useState<DbTableData | null>(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.dockDatabases()
      setConnections(data.connections || [])
      setError(null)
    } catch (err: any) {
      if (!isRouteUnavailable(err)) throw err
      setConnections([])
      setError('Database data needs the updated DevDock remote API. Restart DevDock on the host machine.')
    }
  }, [api])

  useEffect(() => {
    load().catch((err) => Alert.alert('Databases', err.message))
  }, [load])

  async function test(id: string) {
    setTesting(id)
    try {
      const result: any = await api.testDatabase(id)
      setResults((old) => ({ ...old, [id]: result }))
      await load()
    } catch (err: any) {
      setResults((old) => ({
        ...old,
        [id]: {
          status: 'error',
          error: err.message || 'Connection test failed',
          latencyMs: null,
          serverVersion: null
        }
      }))
    } finally {
      setTesting(null)
    }
  }

  async function openConnection(connection: DatabaseConnection) {
    setSelectedConnection(connection)
    setSelectedTable(null)
    setTableData(null)
    setTables([])
    setTablesLoading(true)
    try {
      const data = await api.dbTables(connection.id)
      setTables(data.tables || [])
    } catch (err: any) {
      Alert.alert('Database', err.message || 'Failed to load tables')
    } finally {
      setTablesLoading(false)
    }
  }

  async function openTable(table: DbTable) {
    if (!selectedConnection) return
    setSelectedTable(table)
    setTableData(null)
    setTableLoading(true)
    try {
      setTableData(await api.dbTableData(selectedConnection.id, table.name))
    } catch (err: any) {
      Alert.alert('Database', err.message || 'Failed to load table data')
    } finally {
      setTableLoading(false)
    }
  }

  if (selectedConnection) {
    return (
      <View style={styles.flex}>
        <SectionHeader
          title={selectedTable ? selectedTable.name : selectedConnection.name}
          subtitle={selectedTable ? `${selectedConnection.name} · ${selectedTable.type}` : `${tables.length} tables / collections`}
          icon="server"
          action={
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                if (selectedTable) {
                  setSelectedTable(null)
                  setTableData(null)
                } else {
                  setSelectedConnection(null)
                }
              }}
            >
              <Ionicons name="chevron-back" size={22} color={palette.text} />
            </Pressable>
          }
        />
        {selectedTable ? (
          <TableDataView data={tableData} loading={tableLoading} />
        ) : (
          <ScrollView contentContainerStyle={styles.dashboardList}>
            {tablesLoading ? <LoadingPanel text="Loading tables..." /> : null}
            {tables.map((table) => (
              <Pressable key={table.name} style={styles.fileRow} onPress={() => openTable(table)}>
                <Ionicons name={table.type === 'collection' ? 'albums' : 'grid'} size={20} color={palette.blue} />
                <View style={styles.headerProject}>
                  <Text style={styles.fileName} numberOfLines={1}>{table.name}</Text>
                  <Text style={styles.projectPath}>{table.type}{table.rowCount !== null ? ` · ${table.rowCount} rows` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </Pressable>
            ))}
            {!tablesLoading && tables.length === 0 ? <EmptyPanel icon="grid-outline" text="No tables or collections found." /> : null}
          </ScrollView>
        )}
        <DockNav active="databases" navigate={navigate} />
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <SectionHeader title="Databases" subtitle={`${connections.length} configured`} icon="server" />
      <ScrollView contentContainerStyle={styles.dashboardList}>
        {error ? <NoticePanel text={error} /> : null}
        {connections.map((connection) => (
          <DatabaseCard
            key={connection.id}
            connection={connection}
            status={results[connection.id] || connection.status}
            testing={testing === connection.id}
            onTest={() => test(connection.id)}
            onOpen={() => openConnection(connection)}
          />
        ))}
        {connections.length === 0 && <EmptyPanel icon="server-outline" text="No database connections configured." />}
      </ScrollView>
      <DockNav active="databases" navigate={navigate} />
    </View>
  )
}

function DatabaseCard({ connection, status, testing, onTest, onOpen }: { connection: DatabaseConnection; status?: DatabaseConnection['status']; testing: boolean; onTest: () => void; onOpen: () => void }) {
  const state = status?.status || 'unknown'
  const color = state === 'connected' ? palette.green : state === 'error' ? palette.red : palette.muted

  return (
    <Pressable style={styles.projectCard} onPress={onOpen}>
      <View style={styles.projectTop}>
        <View style={styles.headerProject}>
          <Text style={styles.projectName} numberOfLines={1}>{connection.name}</Text>
          <Text style={styles.projectPath}>{connection.type}{status?.latencyMs ? ` · ${status.latencyMs}ms` : ''}</Text>
        </View>
        <Text style={[styles.statusChip, { color, borderColor: `${color}66` }]}>{testing ? 'testing' : state}</Text>
      </View>
      {status?.serverVersion ? <Text style={styles.projectPath} numberOfLines={2}>{status.serverVersion}</Text> : null}
      {status?.error ? <Text style={styles.errorText} numberOfLines={3}>{status.error}</Text> : null}
      <Pressable style={styles.secondaryButton} onPress={onTest} disabled={testing}>
        {testing ? <ActivityIndicator color={palette.text} /> : <Ionicons name="flash" size={17} color={palette.text} />}
        <Text style={styles.buttonText}>{testing ? 'Testing...' : 'Test Connection'}</Text>
      </Pressable>
    </Pressable>
  )
}

function TableDataView({ data, loading }: { data: DbTableData | null; loading: boolean }) {
  if (loading) return <LoadingPanel text="Loading rows..." />
  if (!data) return <EmptyPanel icon="grid-outline" text="No table data loaded." />
  if (data.error) return <NoticePanel text={data.error} />

  const columns = data.columns.length > 0 ? data.columns.map((column) => column.name) : Object.keys(data.rows[0] || {})
  const visibleColumns = columns.slice(0, 5)

  return (
    <ScrollView contentContainerStyle={styles.dashboardList}>
      <View style={styles.projectCard}>
        <Text style={styles.label}>Rows</Text>
        <Text style={styles.projectName}>{data.totalRows}</Text>
        <Text style={styles.projectPath}>{data.executionTimeMs}ms · showing {data.rows.length}</Text>
      </View>
      {data.rows.map((row, index) => (
        <View key={index} style={styles.projectCard}>
          <Text style={styles.label}>Row {index + 1}</Text>
          {visibleColumns.map((column) => (
            <View key={column} style={styles.dbCell}>
              <Text style={styles.dbCellKey} numberOfLines={1}>{column}</Text>
              <Text style={styles.dbCellValue} numberOfLines={3}>{formatDbValue(row[column])}</Text>
            </View>
          ))}
        </View>
      ))}
      {data.rows.length === 0 ? <EmptyPanel icon="grid-outline" text="This table is empty." /> : null}
    </ScrollView>
  )
}

function VaultScreen({ api, navigate }: { api: Api; navigate: (screen: Screen) => void }) {
  const [data, setData] = useState<VaultSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api.dockVault())
      setError(null)
    } catch (err: any) {
      if (!isRouteUnavailable(err)) throw err
      setData({ vaults: [], passwords: [] })
      setError('Vault data needs the updated DevDock remote API. Restart DevDock on the host machine.')
    }
  }, [api])

  useEffect(() => {
    load().catch((err) => Alert.alert('Vault', err.message))
  }, [load])

  return (
    <View style={styles.flex}>
      <SectionHeader title="Security Vault" subtitle={`${data?.vaults.length || 0} env vaults · ${data?.passwords.length || 0} passwords`} icon="lock-closed" />
      <ScrollView contentContainerStyle={styles.dashboardList}>
        {error ? <NoticePanel text={error} /> : null}
        {data?.vaults.map((vault) => (
          <View key={vault.projectId} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={styles.groupIcon}><Ionicons name="key" size={18} color={palette.amber} /></View>
              <View style={styles.headerProject}>
                <Text style={styles.projectName} numberOfLines={1}>{vault.projectName}</Text>
                <Text style={styles.projectPath}>{vault.variables.length} variable{vault.variables.length === 1 ? '' : 's'}</Text>
              </View>
            </View>
            <View style={styles.groupChildren}>
              {vault.variables.slice(0, 6).map((variable) => (
                <View key={variable.id} style={styles.fileRow}>
                  <Text style={styles.fileStatus}>{variable.environment.slice(0, 3)}</Text>
                  <Text style={styles.fileName} numberOfLines={1}>{variable.key}</Text>
                  <Text style={styles.projectPath}>{variable.isSecret ? 'secret' : 'plain'}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        {data?.passwords.map((entry) => (
          <View key={entry.id} style={styles.fileRow}>
            <Ionicons name="person-circle" size={21} color={palette.muted} />
            <View style={styles.headerProject}>
              <Text style={styles.fileName} numberOfLines={1}>{entry.title}</Text>
              <Text style={styles.projectPath} numberOfLines={1}>{entry.category} · {entry.username || 'no username'}</Text>
            </View>
          </View>
        ))}
        {!data || (data.vaults.length === 0 && data.passwords.length === 0) ? <EmptyPanel icon="lock-closed-outline" text="Vault is empty." /> : null}
      </ScrollView>
      <DockNav active="vault" navigate={navigate} />
    </View>
  )
}

function SettingsScreen({ api, host, mode, navigate, signOut }: { api: Api; host: string; mode: ConnectionMode; navigate: (screen: Screen) => void; signOut: () => void }) {
  const [data, setData] = useState<{ settings: any; remote: { configured: boolean; username: string } } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await api.dockSettings())
      setError(null)
    } catch (err: any) {
      if (!isRouteUnavailable(err)) throw err
      const status = await api.authStatus().catch(() => ({ configured: false }))
      setData({ settings: {}, remote: { configured: !!status.configured, username: '' } })
      setError('Full settings need the updated DevDock remote API. Restart DevDock on the host machine.')
    }
  }, [api])

  useEffect(() => {
    load().catch((err) => Alert.alert('Settings', err.message))
  }, [load])

  async function toggle(key: string) {
    if (!data) return
    setSaving(key)
    try {
      const settings = await api.updateSettings({ [key]: !data.settings?.[key] })
      setData((old) => old ? { ...old, settings } : old)
    } catch (err: any) {
      Alert.alert('Settings', err.message || 'Could not update setting')
    } finally {
      setSaving(null)
    }
  }

  return (
    <View style={styles.flex}>
      <SectionHeader title="Settings" subtitle={`${mode === 'cloud' ? 'Cloud Hub' : 'Local'} · ${host}`} icon="settings" action={<Pressable style={styles.iconButton} onPress={signOut}><Ionicons name="log-out-outline" size={22} color={palette.text} /></Pressable>} />
      <ScrollView contentContainerStyle={styles.dashboardList}>
        {error ? <NoticePanel text={error} /> : null}
        <View style={styles.projectCard}>
          <Text style={styles.label}>Remote Access</Text>
          <Text style={styles.projectName}>{data?.remote.configured ? data.remote.username : 'Not configured'}</Text>
          <Text style={styles.projectPath}>{mode === 'cloud' ? 'Cloud snapshots are managed by the Railway Hub and desktop sync agent.' : 'Server credentials are managed on the DevDock host.'}</Text>
        </View>
        {mode === 'cloud' ? <NoticePanel text="Cloud mode shows the latest synced state. Switch to local mode when you are on the same network and need terminal, file editing, or live table rows." /> : null}
        {mode === 'local' ? ['apiMonitorEnabled', 'startMinimized', 'closeToTray', 'launchAtStartup'].map((key) => (
          <Pressable key={key} style={styles.fileRow} onPress={() => toggle(key)}>
            {saving === key ? <ActivityIndicator color={palette.blue} /> : <Ionicons name={data?.settings?.[key] ? 'toggle' : 'toggle-outline'} size={24} color={data?.settings?.[key] ? palette.blue : palette.muted} />}
            <Text style={styles.fileName}>{labelFromKey(key)}</Text>
          </Pressable>
        )) : null}
      </ScrollView>
      <DockNav active="settings" navigate={navigate} />
    </View>
  )
}

function EmptyPanel({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={42} color={palette.muted} />
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  )
}

function LoadingPanel({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={palette.blue} />
      <Text style={styles.mutedText}>{text}</Text>
    </View>
  )
}

function NoticePanel({ text }: { text: string }) {
  return (
    <View style={styles.noticePanel}>
      <Ionicons name="information-circle" size={20} color={palette.amber} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  )
}

function labelFromKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
}

function deploymentColor(status?: string): string {
  if (status === 'live') return palette.green
  if (status === 'building' || status === 'deploying' || status === 'queued') return palette.amber
  if (status === 'failed' || status === 'crashed' || status === 'canceled') return palette.red
  return palette.muted
}

function deploymentIcon(status?: string): keyof typeof Ionicons.glyphMap {
  if (status === 'live') return 'checkmark-circle'
  if (status === 'building' || status === 'deploying' || status === 'queued') return 'construct'
  if (status === 'failed' || status === 'crashed' || status === 'canceled') return 'warning'
  return 'ellipse'
}

function formatDbValue(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function isRouteUnavailable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('Remote API route is not available yet') || message.includes('API route not found')
}

function normalizeCloudProject(row: any): Project {
  return {
    id: String(row.id || row.project_id || ''),
    name: row.name || row.id || row.project_id || 'Project',
    path: row.path || undefined,
    type: row.type || undefined,
    status: row.runtime_status || row.status || 'idle',
    port: row.runtime_port || row.port || undefined,
    isGroup: !!row.is_group,
    parentId: row.parent_id || undefined,
    color: row.color || undefined,
    startCommand: row.start_command || undefined,
  }
}

function normalizeGitChange(change: any): GitFile {
  if (typeof change === 'string') return { path: change, status: 'M' }
  return {
    path: change.path || change.file || change.name || 'unknown',
    status: change.status || change.index || change.workingTree || '?',
    staged: !!change.staged,
  }
}

function unsupportedCloud(action: string): never {
  throw new Error(`Cloud mode does not support ${action} yet. Switch to local mode on the same network for this action.`)
}

function normalizePath(path?: string): string {
  return (path || '').replace(/\/+$/, '')
}

function findPathGroup(project: Project, groups: Project[]): Project | null {
  const projectPath = normalizePath(project.path)
  if (!projectPath) return null

  const matches = groups
    .filter((group) => {
      const groupPath = normalizePath(group.path)
      return groupPath && projectPath !== groupPath && projectPath.startsWith(`${groupPath}/`)
    })
    .sort((a, b) => normalizePath(b.path).length - normalizePath(a.path).length)

  return matches[0] || null
}

function ProjectScreen({ api, host, mode, token, initialProject, goBack, refreshProjects }: { api: Api; host: string; mode: ConnectionMode; token: string | null; initialProject: Project; goBack: () => void; refreshProjects: () => Promise<void> }) {
  const [project, setProject] = useState(initialProject)
  const [tab, setTab] = useState<ProjectTab>('output')
  const [status, setStatus] = useState<any>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    const next = await api.projectStatus(project.id)
    setStatus(next)
    setProject((old) => ({ ...old, ...next }))
  }, [api, project.id])

  useEffect(() => {
    loadStatus().catch(() => undefined)
    const timer = setInterval(() => loadStatus().catch(() => undefined), 4000)
    return () => clearInterval(timer)
  }, [loadStatus])

  async function runAction(action: 'start' | 'stop' | 'restart') {
    setBusy(action)
    try {
      if (action === 'start') await api.startProject(project.id)
      if (action === 'stop') await api.stopProject(project.id)
      if (action === 'restart') await api.restartProject(project.id)
      await loadStatus()
      await refreshProjects()
    } catch (err: any) {
      Alert.alert('DevDock', err.message || `${action} failed`)
    } finally {
      setBusy(null)
    }
  }

  const currentStatus = status?.status || project.status || 'idle'

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={goBack}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <View style={styles.headerProject}>
          <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
          <Text style={[styles.headerSub, { color: currentStatus === 'running' ? palette.green : palette.muted }]}>{currentStatus}{project.port ? ` on :${project.port}` : ''}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <ActionButton icon="play" label="Start" color={palette.green} disabled={currentStatus === 'running' || !!busy} busy={busy === 'start'} onPress={() => runAction('start')} />
        <ActionButton icon="stop" label="Stop" color={palette.red} disabled={currentStatus !== 'running' || !!busy} busy={busy === 'stop'} onPress={() => runAction('stop')} />
        <ActionButton icon="refresh" label="Restart" color={palette.blue} disabled={!!busy} busy={busy === 'restart'} onPress={() => runAction('restart')} />
      </View>

      <View style={styles.tabRow}>
        <TabButton active={tab === 'output'} icon="pulse" label="Output" onPress={() => setTab('output')} />
        <TabButton active={tab === 'terminal'} icon="terminal" label="Terminal" onPress={() => setTab('terminal')} />
        <TabButton active={tab === 'git'} icon="git-branch" label="Git" onPress={() => setTab('git')} />
        <TabButton active={tab === 'files'} icon="document-text" label="Files" onPress={() => setTab('files')} />
      </View>

      {tab === 'output' && <OutputPanel host={host} mode={mode} token={token} projectId={project.id} initialLines={status?.output || status?.logs || []} />}
      {tab === 'terminal' && <TerminalPanel host={host} mode={mode} token={token} projectId={project.id} />}
      {tab === 'git' && <GitPanel api={api} projectId={project.id} />}
      {tab === 'files' && <FilesPanel api={api} projectId={project.id} />}
    </View>
  )
}

function ActionButton({ icon, label, color, disabled, busy, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; disabled: boolean; busy: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.actionButton, { borderColor: `${color}70` }, disabled && styles.disabled]} disabled={disabled} onPress={onPress}>
      {busy ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={17} color={color} />}
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  )
}

function TabButton({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabActive]} onPress={onPress}>
      <Ionicons name={icon} size={15} color={active ? '#fff' : palette.muted} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  )
}

function useAuthedSocket(host: string, token: string | null, enabled = true) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled || !token) return
    const socket = io(host, { auth: { token }, transports: ['websocket'] })
    socketRef.current = socket
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [host, token, enabled])

  return { socketRef, connected }
}

function OutputPanel({ host, mode, token, projectId, initialLines }: { host: string; mode: ConnectionMode; token: string | null; projectId: string; initialLines: string[] }) {
  const [lines, setLines] = useState<string[]>(initialLines.slice(-200))
  const { socketRef, connected } = useAuthedSocket(host, token, mode === 'local')

  useEffect(() => {
    setLines(initialLines.slice(-200))
  }, [projectId, initialLines.length])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('output:subscribe', { projectId })
    socket.on('output:history', (history: string[]) => setLines(history.slice(-250)))
    socket.on('output:line', (line: string) => setLines((old) => [...old.slice(-249), line]))
    return () => {
      socket.emit('output:unsubscribe')
      socket.off('output:history')
      socket.off('output:line')
    }
  }, [projectId, socketRef, connected])

  return <LogBox lines={lines} empty="No process output yet." footer={mode === 'cloud' ? 'Cloud snapshot output' : connected ? 'Live output connected' : 'Waiting for stream'} />
}

function TerminalPanel({ host, mode, token, projectId }: { host: string; mode: ConnectionMode; token: string | null; projectId: string }) {
  const [lines, setLines] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const { socketRef, connected } = useAuthedSocket(host, token, mode === 'local')

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('terminal:create', { projectId, cols: 80, rows: 24 })
    socket.on('terminal:ready', () => setLines((old) => [...old, '$ connected']))
    socket.on('terminal:data', (data: string) => setLines((old) => [...old.slice(-250), data]))
    socket.on('terminal:error', (message: string) => setLines((old) => [...old, message]))
    return () => {
      socket.off('terminal:ready')
      socket.off('terminal:data')
      socket.off('terminal:error')
    }
  }, [projectId, socketRef, connected])

  if (mode === 'cloud') {
    return <NoticePanel text="Terminal is local-only for now. Cloud mode can queue project start, stop, restart, git pull, and git push through the Hub." />
  }

  function sendCommand() {
    if (!command.trim()) return
    socketRef.current?.emit('terminal:write', { projectId, data: `${command}\r` })
    setCommand('')
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <LogBox lines={lines.flatMap((line) => line.split('\n')).slice(-260)} empty="Terminal not connected yet." footer={connected ? 'PTY connected' : 'Connecting terminal'} />
      <View style={styles.commandRow}>
        <TextInput value={command} onChangeText={setCommand} autoCapitalize="none" autoCorrect={false} placeholder="Command" placeholderTextColor={palette.muted} style={[styles.input, styles.commandInput]} onSubmitEditing={sendCommand} />
        <Pressable style={styles.sendButton} onPress={sendCommand}>
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

function GitPanel({ api, projectId }: { api: Api; projectId: string }) {
  const [data, setData] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => setData(await api.gitStatus(projectId)), [api, projectId])

  useEffect(() => {
    load().catch((err) => Alert.alert('Git', err.message))
  }, [load])

  const files: GitFile[] = data?.files || data?.changes || []

  async function action(name: 'pull' | 'push' | 'commit') {
    setBusy(name)
    try {
      if (name === 'pull') await api.gitPull(projectId)
      if (name === 'push') await api.gitPush(projectId)
      if (name === 'commit') {
        if (!message.trim()) throw new Error('Commit message required')
        if (selected.size > 0) await api.gitStage(projectId, Array.from(selected))
        await api.gitCommit(projectId, message.trim())
        setMessage('')
        setSelected(new Set())
      }
      await load()
    } catch (err: any) {
      Alert.alert('Git', err.message || 'Git action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.panelContent}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>{data?.branch || 'Git'}</Text>
        <Pressable onPress={load} style={styles.iconButton}><Ionicons name="refresh" size={20} color={palette.text} /></Pressable>
      </View>
      <View style={styles.actionRow}>
        <ActionButton icon="download" label="Pull" color={palette.text} disabled={!!busy} busy={busy === 'pull'} onPress={() => action('pull')} />
        <ActionButton icon="cloud-upload" label="Push" color={palette.blue} disabled={!!busy} busy={busy === 'push'} onPress={() => action('push')} />
      </View>
      <Text style={styles.label}>Changes</Text>
      {files.length === 0 ? <Text style={styles.mutedText}>Working tree is clean.</Text> : files.map((file) => {
        const active = selected.has(file.path)
        return (
          <Pressable key={file.path} style={styles.fileRow} onPress={() => setSelected((old) => {
            const next = new Set(old)
            active ? next.delete(file.path) : next.add(file.path)
            return next
          })}>
            <Ionicons name={active ? 'checkbox' : 'square-outline'} size={21} color={active ? palette.blue : palette.muted} />
            <Text style={styles.fileStatus}>{file.status || '?'}</Text>
            <Text style={styles.fileName} numberOfLines={1}>{file.path}</Text>
          </Pressable>
        )
      })}
      <TextInput value={message} onChangeText={setMessage} placeholder="Commit message" placeholderTextColor={palette.muted} style={styles.input} />
      <Pressable style={[styles.primaryButton, !!busy && styles.disabled]} disabled={!!busy} onPress={() => action('commit')}>
        {busy === 'commit' ? <ActivityIndicator color="#fff" /> : <Ionicons name="git-commit" size={18} color="#fff" />}
        <Text style={styles.primaryButtonText}>Commit Selected</Text>
      </Pressable>
    </ScrollView>
  )
}

function FilesPanel({ api, projectId }: { api: Api; projectId: string }) {
  const [path, setPath] = useState('')
  const [nodes, setNodes] = useState<FileNode[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  const loadTree = useCallback(async (nextPath = '') => {
    const data = await api.fileTree(projectId, nextPath || undefined)
    setPath(nextPath)
    setNodes(Array.isArray(data) ? data : data.files || data.tree || [])
  }, [api, projectId])

  useEffect(() => {
    loadTree().catch((err) => Alert.alert('Files', err.message))
  }, [loadTree])

  async function openNode(node: FileNode) {
    if (node.type === 'directory') {
      setFilePath(null)
      setContent('')
      await loadTree(node.path)
      return
    }
    setBusy(true)
    try {
      const data = await api.readFile(projectId, node.path)
      setFilePath(node.path)
      setContent(data.content || '')
    } catch (err: any) {
      Alert.alert('Files', err.message || 'Could not read file')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!filePath) return
    setBusy(true)
    try {
      await api.writeFile(projectId, filePath, content)
      Alert.alert('Saved', filePath)
    } catch (err: any) {
      Alert.alert('Files', err.message || 'Could not save file')
    } finally {
      setBusy(false)
    }
  }

  if (filePath) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.editorHeader}>
          <Pressable style={styles.iconButton} onPress={() => setFilePath(null)}>
            <Ionicons name="chevron-back" size={22} color={palette.text} />
          </Pressable>
          <Text style={styles.fileTitle} numberOfLines={1}>{filePath}</Text>
          <Pressable style={styles.iconButton} onPress={save} disabled={busy}>
            {busy ? <ActivityIndicator color={palette.blue} /> : <Ionicons name="save" size={21} color={palette.blue} />}
          </Pressable>
        </View>
        <TextInput value={content} onChangeText={setContent} multiline autoCapitalize="none" autoCorrect={false} textAlignVertical="top" style={styles.editor} />
      </KeyboardAvoidingView>
    )
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.panelContent}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle} numberOfLines={1}>{path || 'Files'}</Text>
        {path ? <Pressable style={styles.iconButton} onPress={() => loadTree(path.split('/').slice(0, -1).join('/'))}><Ionicons name="arrow-up" size={20} color={palette.text} /></Pressable> : null}
      </View>
      {nodes.map((node) => (
        <Pressable key={node.path} style={styles.fileRow} onPress={() => openNode(node)}>
          <Ionicons name={node.type === 'directory' ? 'folder' : 'document-text'} size={20} color={node.type === 'directory' ? palette.amber : palette.muted} />
          <Text style={styles.fileName} numberOfLines={1}>{node.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </Pressable>
      ))}
      {nodes.length === 0 && <Text style={styles.mutedText}>No files to show.</Text>}
    </ScrollView>
  )
}

function LogBox({ lines, empty, footer }: { lines: string[]; empty: string; footer: string }) {
  const scrollRef = useRef<ScrollView>(null)
  return (
    <View style={styles.logWrap}>
      <ScrollView ref={scrollRef} style={styles.logBox} contentContainerStyle={styles.logContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {lines.length === 0 ? <Text style={styles.mutedText}>{empty}</Text> : lines.map((line, index) => <Text key={`${index}-${line.slice(0, 8)}`} style={styles.logLine}>{line}</Text>)}
      </ScrollView>
      <Text style={styles.logFooter}>{footer}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  authContent: { flexGrow: 1, padding: 22, justifyContent: 'center', gap: 18 },
  brandMark: { width: 62, height: 62, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blue },
  title: { color: palette.text, fontSize: 34, fontWeight: '800' },
  subtitle: { color: palette.muted, fontSize: 16, lineHeight: 22 },
  formBlock: { gap: 10, marginTop: 6 },
  label: { color: palette.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  input: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, color: palette.text, paddingHorizontal: 14, fontSize: 15 },
  primaryButton: { minHeight: 48, borderRadius: 8, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryButton: { minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { color: palette.text, fontWeight: '700' },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
  helpText: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  modeRow: { flexDirection: 'row', backgroundColor: palette.panel, borderRadius: 8, padding: 4, borderWidth: 1, borderColor: palette.border },
  segment: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: palette.blue },
  segmentText: { color: palette.muted, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  header: { minHeight: 72, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerProject: { flex: 1 },
  headerTitle: { color: palette.text, fontSize: 20, fontWeight: '800' },
  headerSub: { color: palette.muted, fontSize: 12, marginTop: 3 },
  iconButton: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panel },
  dashboardList: { padding: 16, paddingBottom: 92, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  sectionTitle: { color: palette.text, fontSize: 17, fontWeight: '800' },
  pill: { overflow: 'hidden', color: palette.text, backgroundColor: palette.panel2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.panel },
  mutedText: { color: palette.muted },
  noticePanel: { minHeight: 52, borderRadius: 8, borderWidth: 1, borderColor: `${palette.amber}55`, backgroundColor: `${palette.amber}18`, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeText: { flex: 1, color: palette.text, fontSize: 13, lineHeight: 18 },
  projectCard: { minHeight: 112, borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, padding: 14, gap: 9, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  projectTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  projectName: { flex: 1, color: palette.text, fontSize: 17, fontWeight: '800' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  projectPath: { color: palette.muted, fontSize: 13 },
  errorText: { color: palette.red, fontSize: 12, lineHeight: 17 },
  projectMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  portText: { color: palette.text, backgroundColor: palette.panel2, overflow: 'hidden', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panel },
  groupCard: { borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  groupHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  groupIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panel2 },
  groupChildren: { gap: 8, paddingHorizontal: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: palette.border },
  actionRow: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: palette.panel },
  actionText: { fontWeight: '800', fontSize: 13 },
  disabled: { opacity: 0.42 },
  tabRow: { flexDirection: 'row', gap: 6, padding: 10, borderBottomWidth: 1, borderBottomColor: palette.border },
  tabButton: { flex: 1, minHeight: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, backgroundColor: palette.panel },
  tabActive: { backgroundColor: palette.blue },
  tabText: { color: palette.muted, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: '#fff' },
  logWrap: { flex: 1, padding: 12 },
  logBox: { flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: '#080b10' },
  logContent: { padding: 12, gap: 2 },
  logLine: { color: palette.text, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12, lineHeight: 18 },
  logFooter: { color: palette.muted, fontSize: 12, marginTop: 8 },
  commandRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  commandInput: { flex: 1 },
  sendButton: { width: 48, minHeight: 48, borderRadius: 8, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center' },
  panelContent: { padding: 14, gap: 12 },
  rowBetween: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fileRow: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panel, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceRow: { minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: 'rgba(5, 8, 16, 0.52)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusChip: { overflow: 'hidden', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  dbCell: { paddingVertical: 7, borderTopWidth: 1, borderTopColor: palette.border, gap: 3 },
  dbCellKey: { color: palette.blue, fontSize: 12, fontWeight: '800' },
  dbCellValue: { color: palette.text, fontSize: 13, lineHeight: 18 },
  fileStatus: { width: 24, color: palette.amber, fontWeight: '800', textAlign: 'center' },
  fileName: { flex: 1, color: palette.text, fontSize: 14 },
  editorHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  fileTitle: { flex: 1, color: palette.text, fontWeight: '800' },
  editor: { flex: 1, color: palette.text, backgroundColor: '#080b10', padding: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13, lineHeight: 19 },
  dockNav: { minHeight: 66, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  dockNavItem: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dockNavText: { color: palette.muted, fontSize: 10, fontWeight: '800' },
  dockNavTextActive: { color: palette.blue },
})
