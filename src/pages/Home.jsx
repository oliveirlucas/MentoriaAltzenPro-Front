import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { motion, useReducedMotion } from 'framer-motion'
import Particles from 'react-tsparticles'
import { loadFull } from 'tsparticles'

/**
 * Página principal: login. Logo em `public/logo.png` (ou ajuste `LOGO_SRC`).
 */
const LOGO_SRC = '/logo.png'

/** URLs alternativas (nome no bucket pode ser com espaço ou com + literal). */
const LOGIN_BG_VIDEO_URLS = [
  typeof import.meta.env.VITE_LOGIN_BG_VIDEO_URL === 'string' && import.meta.env.VITE_LOGIN_BG_VIDEO_URL.trim()
    ? import.meta.env.VITE_LOGIN_BG_VIDEO_URL.trim()
    : null,
  'https://portfoliocasamento.s3.us-east-2.amazonaws.com/Video+intro.mp4',
  `https://portfoliocasamento.s3.us-east-2.amazonaws.com/${encodeURIComponent('Video intro.mp4')}`,
  'https://portfoliocasamento.s3.us-east-2.amazonaws.com/Video%2Bintro.mp4',
].filter(Boolean)

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
  const bgVideoRef = useRef(null)
  const [videoUrlIndex, setVideoUrlIndex] = useState(0)
  const loginBgVideoSrc = LOGIN_BG_VIDEO_URLS[videoUrlIndex] ?? LOGIN_BG_VIDEO_URLS[0]

  /** Autoplay com vídeo remoto: muted + play() após metadados. Vídeo sempre montado. */
  useEffect(() => {
    const el = bgVideoRef.current
    if (!el) return

    const kickPlay = () => {
      el.muted = true
      el.defaultMuted = true
      el.setAttribute('muted', '')
      if (!el.paused) return
      const playAttempt = el.play()
      if (playAttempt !== undefined) playAttempt.catch(() => {})
    }

    kickPlay()
    el.addEventListener('loadeddata', kickPlay)
    el.addEventListener('canplay', kickPlay)

    const onVis = () => {
      if (document.visibilityState === 'visible' && el.paused) kickPlay()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      el.removeEventListener('loadeddata', kickPlay)
      el.removeEventListener('canplay', kickPlay)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [loginBgVideoSrc])

  const onBgVideoError = useCallback(() => {
    setVideoUrlIndex((i) => (i + 1 < LOGIN_BG_VIDEO_URLS.length ? i + 1 : i))
  }, [])

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
      {/* Vídeo em fixed — CSP precisa de media-src https: (vite.config.js) */}
      <video
        ref={bgVideoRef}
        key={loginBgVideoSrc}
        className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-full object-cover object-center"
        src={loginBgVideoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        referrerPolicy="no-referrer"
        aria-hidden
        onError={onBgVideoError}
      />

      <div className="pointer-events-none fixed inset-0 z-[1] min-h-[100dvh]">
        <div className="absolute inset-0 bg-slate-950/30" aria-hidden />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_110%_70%_at_20%_0%,rgba(34,211,238,0.22),transparent_55%),radial-gradient(ellipse_90%_70%_at_80%_20%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(ellipse_90%_70%_at_60%_90%,rgba(56,189,248,0.14),transparent_60%)]"
          aria-hidden
        />
        <div className="absolute inset-0 opacity-25" aria-hidden>
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

      <div className="relative z-10 mx-auto flex min-h-screen min-h-dvh w-full max-w-[1400px] flex-col md:flex-row">
        {/* Coluna esquerda: só logo */}
        <section
          className="flex w-full min-w-0 flex-1 flex-col items-center justify-center px-5 py-10 text-center sm:px-8 md:px-10 md:py-12 lg:px-14
          border-b border-white/10 md:border-b-0 md:border-r md:border-white/10"
          aria-label="Identidade visual"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto flex w-full max-w-lg flex-col items-center justify-center text-center"
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
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.05, ease: 'easeOut' }}
              className="rounded-2xl border border-white/[0.035] bg-white/[0.012] p-6 text-left shadow-2xl shadow-black/35 backdrop-blur sm:p-8"
            >
              <form onSubmit={submit} className="space-y-4 text-left">
                <div>
                  <label htmlFor="home-email" className="text-sm font-medium text-cyan-50/85">
                    E-mail
                  </label>
                  <input
                    id="home-email"
                    type="email"
                    className="mt-1 w-full min-h-[44px] rounded-lg border border-white/[0.035] bg-slate-950/[0.06] px-3 py-2.5 text-base text-white shadow-sm placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 sm:text-sm"
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
                    className="mt-1 w-full min-h-[44px] rounded-lg border border-white/[0.035] bg-slate-950/[0.06] px-3 py-2.5 text-base text-white shadow-sm placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 sm:text-sm"
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
