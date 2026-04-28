import React, { useCallback, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { motion, useReducedMotion } from 'framer-motion'
import Particles from 'react-tsparticles'
import { loadFull } from 'tsparticles'
import mentorX from '../assets/mentorX.png'

/**
 * Página principal: login. Logo em `public/logo.png` (ou ajuste `LOGO_SRC`).
 */
const LOGO_SRC = '/logo.png'

export default function Home() {
  const { login } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const fromParam = sp.get('from') || '/dashboard'
  const reduceMotion = useReducedMotion()

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine)
  }, [])

  const particlesOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      detectRetina: true,
      fpsLimit: 60,
      particles: {
        number: { value: reduceMotion ? 0 : 36, density: { enable: true, area: 900 } },
        color: { value: ['#22d3ee', '#6366f1', '#38bdf8'] },
        links: { enable: true, color: '#60a5fa', distance: 150, opacity: 0.18, width: 1 },
        move: { enable: !reduceMotion, speed: 0.8, outModes: { default: 'out' } },
        opacity: { value: { min: 0.08, max: 0.3 } },
        size: { value: { min: 1, max: 3 } },
      },
      interactivity: {
        events: {
          onHover: { enable: !reduceMotion, mode: 'repulse' },
          resize: true,
        },
        modes: { repulse: { distance: 90, duration: 0.4 } },
      },
      background: { color: 'transparent' },
    }),
    [reduceMotion]
  )

  const submit = async (e) => {
    e.preventDefault()
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
      toast.error(e2.message || 'Falha ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen min-h-dvh overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Fundo animado */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_110%_70%_at_20%_0%,rgba(34,211,238,0.25),transparent_55%),radial-gradient(ellipse_90%_70%_at_80%_20%,rgba(99,102,241,0.22),transparent_60%),radial-gradient(ellipse_90%_70%_at_60%_90%,rgba(56,189,248,0.18),transparent_60%)]"
          aria-hidden
        />
        <div className="absolute inset-0 opacity-60" aria-hidden>
          <Particles id="loginParticles" init={particlesInit} options={particlesOptions} />
        </div>
        {!reduceMotion && (
          <motion.div
            className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl"
            animate={{ x: [0, 35, 0], y: [0, 25, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
        )}
        {!reduceMotion && (
          <motion.div
            className="absolute -right-28 top-24 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl"
            animate={{ x: [0, -35, 0], y: [0, 18, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
        )}
      </div>

      <div className="relative mx-auto flex min-h-screen min-h-dvh w-full max-w-[1400px] flex-col md:flex-row">
        {/* Coluna esquerda: marca */}
        <section
          className="flex w-full min-w-0 flex-1 flex-col items-center justify-center px-5 py-10 text-center sm:px-8 md:px-10 md:py-12 lg:px-14
          border-b border-white/10 md:border-b-0 md:border-r md:border-white/10"
          aria-label="Identidade visual"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto flex w-full max-w-lg flex-col items-center text-center"
          >
            {logoOk ? (
              <img
                src={LOGO_SRC}
                alt="AltzenPro — logotipo"
                className="mx-auto h-auto w-full max-w-[20rem] object-contain sm:max-w-md drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
                style={{ maxHeight: 'min(40vh, 20rem)' }}
                width={480}
                height={180}
                decoding="async"
                fetchPriority="high"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <p className="text-3xl font-extrabold tracking-tight text-white">AltzenPro</p>
            )}
            <p className="mt-5 max-w-md text-pretty text-sm text-cyan-50/75">
              Mentoria com foco no que importa: diagnóstico, plano 90d, agenda e recursos — tudo no mesmo portal.
            </p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
              className="relative mt-8 w-full max-w-[22rem]"
            >
              <div
                className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-cyan-400/30 to-indigo-500/20 blur-2xl"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40">
                <img
                  src={mentorX}
                  alt="Mentor X"
                  className="mx-auto h-auto w-full max-w-[18rem] object-contain"
                  decoding="async"
                />
                <p className="mt-3 text-xs text-cyan-50/70">
                  O Mentor X cruza teus dados do portal pra te responder rápido, sem enrolação.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Coluna direita: login */}
        <section
          className="flex w-full min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 md:px-10 md:py-12 lg:px-14"
          aria-label="Entrar na conta"
        >
          <div className="w-full max-w-md">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mb-6 text-center"
            >
              <h2 className="text-lg font-semibold text-white sm:text-xl">Portal de mentoria</h2>
              <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-cyan-50/70">
                Acesse seu painel, diagnóstico, plano de 90 dias e recursos.
              </p>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.05, ease: 'easeOut' }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left shadow-2xl shadow-black/35 backdrop-blur sm:p-8"
            >
              <form onSubmit={submit} className="space-y-4 text-left">
                <div>
                  <label htmlFor="home-email" className="text-sm font-medium text-cyan-50/85">
                    E-mail
                  </label>
                  <input
                    id="home-email"
                    type="email"
                    className="mt-1 w-full min-h-[44px] rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-base text-white shadow-sm placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 sm:text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="home-password" className="text-sm font-medium text-cyan-50/85">
                    Senha
                  </label>
                  <input
                    id="home-password"
                    type="password"
                    className="mt-1 w-full min-h-[44px] rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2.5 text-base text-white shadow-sm placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 sm:text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/10 transition hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      Entrando…
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>
            </motion.div>

            <p className="mt-6 text-left text-xs text-cyan-50/55">
              Acesso fornecido pela equipe. Em caso de dúvida, fale com o suporte.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
