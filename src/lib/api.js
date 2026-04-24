const getBase = () => (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** Migração: removê JWT do localStorage (só httpOnly) */
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('altzen_token')
  } catch {
    /* */
  }
}

let csrfToken = null
let refreshInFlight = null

export function getCsrfToken() {
  return csrfToken
}

export function setCsrfToken(t) {
  csrfToken = t || null
}

function mergeResponseCsrf(data) {
  if (data && typeof data === 'object' && data.csrfToken) {
    setCsrfToken(data.csrfToken)
  }
}

async function fetchCsrfFromServer() {
  const base = getBase()
  const url = `${base}/api/auth/csrf`
  const r = await fetch(url, { credentials: 'include' })
  const data = await parseJson(r)
  if (data?.token) setCsrfToken(data.token)
  return r.ok
}

function doRefresh() {
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

function onAuthLost() {
  setCsrfToken(null)
  if (typeof window === 'undefined' || window.__ALTZEN_401) return
  window.__ALTZEN_401 = true
  const pathname = window.location.pathname
  if (pathname === '/' || pathname.startsWith('/login')) return
  const ret = pathname + window.location.search
  window.location.href = `/?from=${encodeURIComponent(ret)}`
}

async function parseJson(r) {
  const text = await r.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

/**
 * @param {string} path e.g. '/me' — será prefixado com /api
 * @param {RequestInit} opts
 */
export async function api(path, opts = {}, _retried = false, _csrfRetried = false) {
  const base = getBase()
  const p = path.startsWith('/') ? path : `/${path}`
  const url = `${base}/api${p}`
  const method = (opts.method || 'GET').toUpperCase()
  const isSafe = ['GET', 'HEAD', 'OPTIONS'].includes(method)
  const headers = { ...opts.headers }
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
  const data = await parseJson(r)
  mergeResponseCsrf(data)

  const isAuthPath =
    p === '/auth/login' || p === '/auth/register' || p === '/auth/refresh' || p === '/auth/logout'
  if (r.status === 401 && !isAuthPath && !_retried) {
    const ok = await doRefresh()
    if (ok) return api(path, opts, true, _csrfRetried)
  }

  if (r.status === 403 && !_csrfRetried) {
    await fetchCsrfFromServer()
    return api(path, opts, _retried, true)
  }

  if (r.status === 401) {
    if (!isAuthPath && p !== '/me') onAuthLost()
  }

  if (!r.ok) {
    const err = new Error(data.error || r.statusText)
    err.status = r.status
    err.data = data
    throw err
  }
  return data
}

/**
 * GET binário (cookies httpOnly, sem body — CSRF não aplicável com este guard).
 * @param {string} path e.g. '/admin/students/1/contracts/42/file'
 * @returns {Promise<{ blob: Blob, contentType: string }>}
 */
export async function apiBlob(path, opts = {}, _retried = false) {
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
      const j = JSON.parse(text)
      if (j.error) msg = j.error
    } catch {
      /* */
    }
    const err = new Error(msg)
    err.status = r.status
    throw err
  }

  const blob = await r.blob()
  return { blob, contentType }
}
