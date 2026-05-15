import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Compass, GraduationCap } from 'lucide-react'

const PROBLEMS = [
  {
    icon: GraduationCap,
    title: 'Faculdade não é mercado.',
    body: 'Você sai com diploma e zero clareza de como o mercado real opera.',
  },
  {
    icon: Compass,
    title: 'Cursos sem direção.',
    body: 'Conteúdo demais, contexto de menos. Você estuda muito e não anda.',
  },
  {
    icon: AlertTriangle,
    title: 'Você compete com IA.',
    body: 'Quem não usa IA hoje está atrasado. Quem só consome IA, é dispensável.',
  },
] as const

export default function ProblemSection() {
  return (
    <section
      id="problema"
      aria-label="O problema"
      className="relative overflow-hidden bg-[#050816] px-6 py-24 sm:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"
        aria-hidden
      />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-rose-500/10 blur-[120px]" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-300"
        >
          O problema
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl"
        >
          Faculdade não prepara você para o
          <span className="bg-gradient-to-r from-rose-300 via-amber-300 to-amber-200 bg-clip-text text-transparent">
            {' '}
            mercado real.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="mt-6 max-w-2xl text-balance text-base text-slate-400 sm:text-lg"
        >
          Você acumula horas de estudo, mas continua sem direção. Sem projeto. Sem
          posicionamento. Sem entrevista. E o mercado não espera.
        </motion.p>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {PROBLEMS.map((p, idx) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 text-left backdrop-blur"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/5 blur-2xl transition group-hover:bg-cyan-500/10" />
              <div className="relative">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-cyan-300">
                  <p.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
