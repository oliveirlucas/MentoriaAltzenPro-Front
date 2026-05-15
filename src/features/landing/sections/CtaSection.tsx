import React, { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const CoreScene = lazy(() => import('@/features/landing/scenes/CoreScene'))

export default function CtaSection() {
  return (
    <section
      id="cta"
      aria-label="Comece agora"
      className="relative isolate overflow-hidden bg-[#050816] px-6 py-32 sm:py-40"
    >
      {/* Cena 3D em segundo plano (mais discreta) */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <Suspense fallback={null}>
          <CoreScene />
        </Suspense>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(124,58,237,0.20),transparent_60%)]" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <motion.h2
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl"
        >
          Pare de estudar sem direção.
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 bg-clip-text text-transparent">
            Comece a acelerar sua carreira.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="mt-8 max-w-2xl text-balance text-base text-slate-300 sm:text-lg"
        >
          Você não precisa de mais um curso. Você precisa de um sistema que conecta
          mentoria, IA, SDLC e posicionamento em uma única jornada.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <Link
            to="/login"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-8 py-4 text-base font-semibold text-slate-950 shadow-[0_25px_60px_-15px_rgba(34,211,238,0.6)] transition hover:opacity-95"
          >
            Entrar para AltzenPro
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>

          <a
            href="#metodo"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:border-cyan-400/50 hover:bg-white/10"
          >
            Ver o método
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 text-xs uppercase tracking-[0.22em] text-slate-500"
        >
          Mercado real · IA · SDLC · Posicionamento
        </motion.p>
      </div>
    </section>
  )
}
