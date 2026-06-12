const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// Where the owner-console session token lives. Set on login, cleared on logout/401.
export const TOKEN_STORAGE_KEY = 'nexus_admin_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
  else localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { params, ...init } = config
  const base = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value))
    })
  }

  const token = getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers ?? {}),
  }

  const response = await fetch(url.toString(), { ...init, headers })

  if (!response.ok) {
    // Session expired or invalid — drop the token and bounce to login.
    if (response.status === 401 && typeof window !== 'undefined') {
      setToken(null)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`
      }
    }
    const body = await response.json().catch(() => ({}))
    throw {
      message: (body as { message?: string }).message ?? response.statusText,
      code: (body as { code?: string }).code,
      status: response.status,
    }
  }

  if (response.status === 204) return undefined as T

  // Some endpoints (CSV export) return text, not JSON.
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return (await response.text()) as unknown as T
  }
  return response.json() as Promise<T>
}

export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) =>
    request<T>(endpoint, { ...config, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
    request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, config?: RequestConfig) =>
    request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, config?: RequestConfig) =>
    request<T>(endpoint, { ...config, method: 'DELETE' }),
}
