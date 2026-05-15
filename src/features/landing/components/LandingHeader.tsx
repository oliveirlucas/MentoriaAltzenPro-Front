import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'

const NAV_ITEMS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Método', href: '#metodo' },
  { label: 'Jornada', href: '#jornada' },
  { label: 'Diferenciais', href: '#diferenciais' },
  { label: 'Depoimentos', href: '#depoimentos' },
]

const LOGO_SRC = '/logo.png'

/**
 * Header sticky com efeito glass ao rolar e CTA principal levando para /login.
 * Mobile: menu drawer minimalista.
 */
export default function LandingHeader() {
  const reduceMotion = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  return (
    <motion.header
      initial={reduceMotion ? false : { y: -24, opacity: 0 }}
      animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/10 bg-slate-950/70 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-white">
          {logoOk ? (
            <img
              src={LOGO_SRC}
              alt="AltzenPro"
              className="h-8 w-auto object-contain"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="text-lg font-extrabold tracking-tight">AltzenPro</span>
          )}
          <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/70 sm:inline-block">
            Mentoria
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Seções">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="group hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:border-cyan-400/50 hover:bg-white/10 sm:inline-flex"
            aria-label="Acessar área de login"
          >
            Entrar
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_8px_30px_-8px_rgba(34,211,238,0.5)] transition hover:opacity-95 sm:px-5"
          >
            <span className="hidden sm:inline">Acessar plataforma</span>
            <span className="sm:hidden">Entrar</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Drawer mobile */}
      <motion.div
        initial={false}
        animate={open ? { opacity: 1, y: 0, pointerEvents: 'auto' } : { opacity: 0, y: -8, pointerEvents: 'none' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="md:hidden"
      >
        <div className="border-t border-white/5 bg-slate-950/95 px-6 py-6 backdrop-blur-xl">
          <ul className="flex flex-col gap-4">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block text-base font-medium text-slate-200 transition hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white"
              >
                Entrar
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          </ul>
        </div>
      </motion.div>
    </motion.header>
  )
}
