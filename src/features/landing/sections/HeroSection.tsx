import React, { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react'

const CoreScene = lazy(() => import('@/features/landing/scenes/CoreScene'))

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function HeroSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      className="relative isolate flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#050816] pt-24 pb-16 text-white"
      id="hero"
      aria-label="Apresentação"
    >
      {/* Cena 3D no fundo */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Suspense fallback={null}>
          <CoreScene />
        </Suspense>
      </div>

      {/* Halos de cor por trás */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        <div className="absolute -left-32 top-32 h-[28rem] w-[28rem] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute -right-32 bottom-10 h-[30rem] w-[30rem] rounded-full bg-violet-600/15 blur-[140px]" />
      </div>

      {/* Grade fina sutil */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:48px_48px]"
        aria-hidden
      />

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 text-center">
        <motion.span
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-cyan-200/90 backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          AltzenPro Mentoria
        </motion.span>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="mt-8 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-[88px]"
        >
          O mercado mudou.
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 bg-clip-text text-transparent">
            Sua carreira também
          </span>{' '}
          <span className="text-white">precisa mudar.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-7 max-w-2xl text-balance text-base text-slate-300 sm:text-lg md:text-xl"
        >
          Mentorias, cursos e imersões para acelerar sua entrada e crescimento na tecnologia
          com IA, SDLC e posicionamento profissional.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <Link
            to="/login"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-7 py-4 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_-12px_rgba(34,211,238,0.55)] transition hover:opacity-95 sm:text-base"
          >
            Quero acelerar minha carreira
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold text-white backdrop-blur transition hover:border-cyan-400/50 hover:bg-white/10 sm:text-base"
          >
            Já sou aluno
          </Link>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-400 sm:text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Mentoria 1:1
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            IA aplicada
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            SDLC moderno
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
            Posicionamento real
          </div>
        </motion.div>
      </div>

      {/* Indicador de scroll */}
      {!reduceMotion && (
        <motion.div
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-xs text-slate-400"
          animate={{ y: [0, 8, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <span className="uppercase tracking-[0.22em]">Scroll</span>
            <ChevronDown className="h-4 w-4" aria-hidden />
          </div>
        </motion.div>
      )}

      {/* Fade para a próxima seção */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-32 bg-gradient-to-b from-transparent to-[#050816]" />
    </section>
  )
}
