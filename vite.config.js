import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** CSP no HTML: endurece XSS; `connect-src` inclui API (VITE_API_URL) e ViaCEP. */
function cspMetaPlugin(mode, env) {
  const apiUrl = (env.VITE_API_URL || '').trim()
  const connectParts = new Set(["'self'", 'blob:', 'https://viacep.com.br', 'ws:', 'wss:'])
  if (apiUrl) {
    try {
      connectParts.add(new URL(apiUrl).origin)
    } catch {
      /* URL inválida em .env — mantém só 'self' + ViaCEP */
    }
  }
  const connectSrc = [...connectParts].join(' ')
  const directives = [
    "default-src 'self'",
    mode === 'development'
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]
  if (mode === 'production') {
    directives.push('upgrade-insecure-requests')
  }
  const csp = directives.join('; ')
  return {
    name: 'csp-meta-index',
    transformIndexHtml(html) {
      if (html.includes('Content-Security-Policy')) return html
      const esc = csp.replace(/"/g, '&quot;')
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${esc}" />`
      )
    },
  }
}

const staticSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Frame-Options': 'DENY',
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), cspMetaPlugin(mode, env)],
    server: {
      headers: staticSecurityHeaders,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
    },
    preview: {
      headers: staticSecurityHeaders,
    },
  }
})
