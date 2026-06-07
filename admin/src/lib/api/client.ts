const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

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

  const storedApiKey =
    typeof window !== 'undefined' ? localStorage.getItem('nexus_admin_api_key') : null

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
    ...(init.headers ?? {}),
  }

  const response = await fetch(url.toString(), { ...init, headers })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw {
      message: (body as { message?: string }).message ?? response.statusText,
      code: (body as { code?: string }).code,
      status: response.status,
    }
  }

  if (response.status === 204) return undefined as T
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
