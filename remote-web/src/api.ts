export const DEFAULT_HOST = 'http://localhost:7777'

export function getHost(): string {
  return localStorage.getItem('devdock_host') || DEFAULT_HOST
}

export function setHost(h: string): void {
  localStorage.setItem('devdock_host', h)
}

export function getToken(): string | null {
  return localStorage.getItem('devdock_token')
}

export function setToken(t: string): void {
  localStorage.setItem('devdock_token', t)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('devdock_refresh')
}

export function setRefreshToken(t: string): void {
  localStorage.setItem('devdock_refresh', t)
}

export function clearAuth(): void {
  localStorage.removeItem('devdock_token')
  localStorage.removeItem('devdock_refresh')
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${getHost()}${path}`, { ...options, headers })

  if (res.status === 401) {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAuth()
      throw new Error('Unauthorized')
    }

    try {
      const refreshRes = await fetch(`${getHost()}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!refreshRes.ok) {
        clearAuth()
        throw new Error('Refresh failed')
      }

      const data = await refreshRes.json()
      if (data.accessToken) setToken(data.accessToken)
      if (data.refreshToken) setRefreshToken(data.refreshToken)

      const retryHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
        Authorization: `Bearer ${data.accessToken}`,
      }
      return fetch(`${getHost()}${path}`, { ...options, headers: retryHeaders })
    } catch {
      clearAuth()
      throw new Error('Session expired')
    }
  }

  return res
}

async function json<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const d = await res.json(); msg = d.message || d.error || msg } catch { /* noop */ }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  async login(username: string, password: string) {
    const res = await fetch(`${getHost()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { const d = await res.json(); msg = d.message || d.error || msg } catch { /* noop */ }
      throw new Error(msg)
    }
    return res.json()
  },

  async refresh() {
    const refreshToken = getRefreshToken()
    return json('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },

  async me() {
    return json('/api/auth/me')
  },

  async authStatus() {
    const res = await fetch(`${getHost()}/api/auth/status`)
    if (!res.ok) throw new Error('Not reachable')
    return res.json()
  },

  async setup(username: string, password: string) {
    const res = await fetch(`${getHost()}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { const d = await res.json(); msg = d.message || d.error || msg } catch { /* noop */ }
      throw new Error(msg)
    }
    return res.json()
  },

  async projects() {
    return json('/api/projects')
  },

  async projectStatus(id: string) {
    return json(`/api/projects/${id}/status`)
  },

  async startProject(id: string, cmd?: string) {
    return json(`/api/projects/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ cmd }),
    })
  },

  async stopProject(id: string) {
    return json(`/api/projects/${id}/stop`, { method: 'POST' })
  },

  async restartProject(id: string) {
    return json(`/api/projects/${id}/restart`, { method: 'POST' })
  },

  async gitStatus(id: string) {
    return json(`/api/git/${id}/status`)
  },

  async gitDiff(id: string, file?: string) {
    const q = file ? `?file=${encodeURIComponent(file)}` : ''
    return json(`/api/git/${id}/diff${q}`)
  },

  async gitStage(id: string, files?: string[]) {
    return json(`/api/git/${id}/stage`, {
      method: 'POST',
      body: JSON.stringify({ files }),
    })
  },

  async gitCommit(id: string, message: string) {
    return json(`/api/git/${id}/commit`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  async gitPush(id: string) {
    return json(`/api/git/${id}/push`, { method: 'POST' })
  },

  async gitPull(id: string) {
    return json(`/api/git/${id}/pull`, { method: 'POST' })
  },

  async fileTree(id: string, path?: string) {
    const q = path ? `?path=${encodeURIComponent(path)}` : ''
    return json(`/api/files/${id}/tree${q}`)
  },

  async readFile(id: string, path: string) {
    return json(`/api/files/${id}/file?path=${encodeURIComponent(path)}`)
  },

  async writeFile(id: string, path: string, content: string) {
    return json(`/api/files/${id}/file?path=${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
  },

  async ping() {
    return json('/api/ping')
  },
}
