import React from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'

const COMMON_COURSE = [
  'Muito conteúdo, pouca direção',
  'Sem mentoria real',
  'Aulas genéricas e desconectadas',
  'Foco em "aprender", não em entregar',
  'Sem aplicação de IA no fluxo',
  'Você termina e fica parado',
] as const

const ALTZENPRO = [
  'Estratégia e plano de 90 dias',
  'Mentoria 1:1 com mercado real',
  'Trilhas integradas e sequenciais',
  'Foco em execução e portfolio',
  'IA aplicada no SDLC moderno',
  'Posicionamento até a recolocação',
] as const

export default function DifferentialsSection() {
  return (
    <section
      id="diferenciais"
      aria-label="Diferenciais"
      className="relative overflow-hidden bg-[#050816] px-6 py-28 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(99,102,241,0.12),transparent_70%)]" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-violet-200/80"
          >
            Diferenciais
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Curso comum vs.{' '}
            <span className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-transparent">
              AltzenPro
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mt-5 text-balance text-base text-slate-400 sm:text-lg"
          >
            Você não está procurando mais um curso. Está procurando direção.
          </motion.p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Curso comum */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-8 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                Curso comum
              </p>
              <span className="rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold text-rose-300">
                Estagnação
              </span>
            </div>
            <h3 className="mt-3 text-2xl font-bold text-slate-300">Muito conteúdo. Pouca direção.</h3>
            <ul className="mt-6 space-y-3">
              {COMMON_COURSE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-400">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
                    <X className="h-3 w-3" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* AltzenPro */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 backdrop-blur shadow-[0_30px_70px_-30px_rgba(34,211,238,0.45)]"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/15 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" aria-hidden />

            <div className="relative flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200/90">
                AltzenPro
              </p>
              <span className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-1 text-[11px] font-semibold text-white">
                Aceleração
              </span>
            </div>
            <h3 className="relative mt-3 text-2xl font-bold text-white">
              Estratégia. Execução. Mercado real.
            </h3>
            <ul className="relative mt-6 space-y-3">
              {ALTZENPRO.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
