import { hasCsrfToken, hasErrorMessage, hasReauthorizeHint, hasToken } from '@/shared/api/types'

const getBase = () => (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

if (typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('altzen_token')
  } catch {
    /* */
  }
}

let csrfToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null

export function getCsrfToken(): string | null {
  return csrfToken
}

export function setCsrfToken(t: string | null): void {
  csrfToken = t || null
}

function mergeResponseCsrf(data: unknown): void {
  if (hasCsrfToken(data)) {
    setCsrfToken(data.csrfToken)
  }
}

async function fetchCsrfFromServer(): Promise<boolean> {
  const base = getBase()
  const url = `${base}/api/auth/csrf`
  const r = await fetch(url, { credentials: 'include' })
  const data = await parseJson(r)
  if (hasToken(data)) setCsrfToken(data.token)
  return r.ok
}

function doRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  const base = getBase()
  const url = `${base}/api/auth/refresh`
  refreshInFlight = (async () => {
    const r = await fetch(url, { method: 'POST', credentials: 'include' })
    const data = await parseJson(r)
    mergeResponseCsrf(data)
    return r.ok
  })()
  return refreshInFlight.finally(() => {
    refreshInFlight = null
  })
}

function onAuthLost(): void {
  setCsrfToken(null)
  if (typeof window === 'undefined' || window.__ALTZEN_401) return
  window.__ALTZEN_401 = true
  const pathname = window.location.pathname
  if (pathname === '/' || pathname.startsWith('/login')) return
  const ret = pathname + window.location.search
  window.location.href = `/?from=${encodeURIComponent(ret)}`
}

async function parseJson(r: Response): Promise<unknown> {
  const text = await r.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const AUTH_API_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
])

export async function api<T = any>(
  path: string,
  opts: RequestInit = {},
  _retried = false,
  _csrfRetried = false
): Promise<T> {
  const base = getBase()
  const p = path.startsWith('/') ? path : `/${path}`
  const url = `${base}/api${p}`
  const method = (opts.method || 'GET').toUpperCase()
  const isSafe = ['GET', 'HEAD', 'OPTIONS'].includes(method)
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  }
  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (!isSafe) {
    if (!getCsrfToken()) {
      try {
        await fetchCsrfFromServer()
      } catch {
        /* */
      }
    }
    const c = getCsrfToken()
    if (c) headers['X-CSRF-Token'] = c
  }

  const r = await fetch(url, { ...opts, headers, credentials: 'include' })
  const data: unknown = await parseJson(r)
  mergeResponseCsrf(data)

  const isAuthPath = AUTH_API_PATHS.has(p)
  if (r.status === 401 && !isAuthPath && !_retried) {
    const ok = await doRefresh()
    if (ok) return api<T>(path, opts, true, _csrfRetried)
  }

  if (r.status === 403 && !_csrfRetried) {
    await fetchCsrfFromServer()
    return api<T>(path, opts, _retried, true)
  }

  if (r.status === 401) {
    // 401 em rotas Google Calendar com `reauthorize` = problema OAuth Google, não logout da sessão do portal.
    if (!isAuthPath && p !== '/me' && !hasReauthorizeHint(data)) onAuthLost()
  }

  if (!r.ok) {
    const msg = hasErrorMessage(data) ? data.error : r.statusText
    throw new ApiError(msg, r.status, data)
  }
  return data as T
}

export async function apiBlob(
  path: string,
  opts: RequestInit = {},
  _retried = false
): Promise<{ blob: Blob; contentType: string }> {
  const base = getBase()
  const p = path.startsWith('/') ? path : `/${path}`
  const url = `${base}/api${p}`

  const r = await fetch(url, { ...opts, credentials: 'include' })
  const contentType = r.headers.get('Content-Type') || ''
  if (r.status === 401 && !_retried) {
    const ok = await doRefresh()
    if (ok) return apiBlob(path, opts, true)
    onAuthLost()
  }

  if (!r.ok) {
    const text = await r.text()
    let msg = r.statusText
    try {
      const j = JSON.parse(text) as unknown
      if (hasErrorMessage(j)) msg = j.error
    } catch {
      /* */
    }
    throw new ApiError(msg, r.status, text)
  }

  const blob = await r.blob()
  return { blob, contentType }
}
