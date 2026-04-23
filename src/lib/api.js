const getBase = () => (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const TOKEN_KEY = 'altzen_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
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
export async function api(path, opts = {}) {
  const base = getBase()
  const p = path.startsWith('/') ? path : `/${path}`
  const url = `${base}/api${p}`
  const token = getToken()
  const headers = { ...opts.headers }
  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const r = await fetch(url, { ...opts, headers })
  const data = await parseJson(r)
  if (r.status === 401 && getToken() && path !== '/auth/login') {
    setToken(null)
    if (typeof window !== 'undefined' && !window.__ALTZEN_401) {
      window.__ALTZEN_401 = true
      if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/login')) {
        const ret = window.location.pathname + window.location.search
        window.location.href = `/?from=${encodeURIComponent(ret)}`
      }
    }
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
 * GET binário com o mesmo token que `api` (ex.: PDF do contrato).
 * @param {string} path e.g. '/admin/students/1/contracts/42/file'
 * @returns {Promise<{ blob: Blob, contentType: string }>}
 */
export async function apiBlob(path) {
  const base = getBase()
  const p = path.startsWith('/') ? path : `/${path}`
  const url = `${base}/api${p}`
  const token = getToken()
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const r = await fetch(url, { headers })
  const contentType = r.headers.get('Content-Type') || ''

  if (r.status === 401 && getToken() && path !== '/auth/login') {
    setToken(null)
    if (typeof window !== 'undefined' && !window.__ALTZEN_401) {
      window.__ALTZEN_401 = true
      if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/login')) {
        const ret = window.location.pathname + window.location.search
        window.location.href = `/?from=${encodeURIComponent(ret)}`
      }
    }
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
