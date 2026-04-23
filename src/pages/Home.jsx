import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Página principal: login. Logo em `public/logo.png` (ou ajuste `LOGO_SRC`).
 */
const LOGO_SRC = '/logo.png'

export default function Home() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const fromParam = sp.get('from') || '/dashboard'

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const d = await login(email, password)
      if (d.user?.role === 'admin') {
        nav('/admin', { replace: true })
        return
      }
      const dest =
        !fromParam || fromParam === '/' || fromParam.startsWith('/login') ? '/dashboard' : fromParam
      nav(dest, { replace: true })
    } catch (e2) {
      setErr(e2.message || 'Falha ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-b from-slate-100 to-slate-200/90 font-sans text-slate-800">
      <div className="mx-auto flex min-h-screen min-h-dvh w-full max-w-[1400px] flex-col md:flex-row">
        {/* Coluna esquerda: marca */}
        <section
          className="flex w-full min-w-0 flex-1 flex-col items-center justify-center px-5 py-10 text-center sm:px-8 md:px-10 md:py-12 lg:px-14
          border-b border-slate-200/80 md:border-b-0 md:border-r"
          aria-label="Identidade visual"
        >
          <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
            {logoOk ? (
              <img
                src={LOGO_SRC}
                alt="AltzenPro — logotipo"
                className="mx-auto h-auto w-full max-w-[20rem] object-contain sm:max-w-md"
                style={{ maxHeight: 'min(40vh, 20rem)' }}
                width={480}
                height={180}
                decoding="async"
                fetchPriority="high"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <p className="text-2xl font-extrabold tracking-tight text-slate-900">AltzenPro</p>
            )}
          </div>
        </section>

        {/* Coluna direita: login */}
        <section
          className="flex w-full min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 md:px-10 md:py-12 lg:px-14"
          aria-label="Entrar na conta"
        >
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-medium text-slate-800 sm:text-xl">Portal de mentoria</h2>
              <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-slate-600">
                Acesse seu painel, diagnóstico, plano de 90 dias e recursos.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-lg shadow-slate-200/50 sm:p-8">
              <form onSubmit={submit} className="space-y-4 text-left">
                {err && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                    {err}
                  </p>
                )}
                <div>
                  <label htmlFor="home-email" className="text-sm font-medium text-slate-700">
                    E-mail
                  </label>
                  <input
                    id="home-email"
                    type="email"
                    className="mt-1 w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="home-password" className="text-sm font-medium text-slate-700">
                    Senha
                  </label>
                  <input
                    id="home-password"
                    type="password"
                    className="mt-1 w-full min-h-[44px] rounded-lg border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? 'Entrando…' : 'Entrar'}
                </button>
              </form>
            </div>
            <p className="mt-6 text-left text-xs text-slate-500">
              Acesso fornecido pela equipe. Em caso de dúvida, fale com o suporte.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
