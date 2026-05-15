import React from 'react'
import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote: 'Em 3 meses consegui minha primeira entrevista de verdade.',
    name: 'Carolina M.',
    role: 'Dev Frontend Júnior',
  },
  {
    quote: 'Saí do "sei muita coisa, mas ninguém me chama" para ter direção.',
    name: 'Rafael S.',
    role: 'Engenheiro de Software',
  },
  {
    quote: 'A mentoria mudou meu posicionamento — e o salário também mudou.',
    name: 'Bianca P.',
    role: 'Product Engineer',
  },
] as const

export default function TestimonialsSection() {
  return (
    <section
      id="depoimentos"
      aria-label="Depoimentos"
      className="relative overflow-hidden bg-[#050816] px-6 py-28 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(56,189,248,0.10),transparent_60%)]" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200/80"
          >
            Resultado real
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            O que muda quando há{' '}
            <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
              direção.
            </span>
          </motion.h2>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t, idx) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-8 backdrop-blur"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl transition group-hover:bg-cyan-500/20" />
              <Quote className="relative h-6 w-6 text-cyan-300/80" aria-hidden />
              <blockquote className="relative mt-6 text-balance text-xl font-medium leading-snug text-white sm:text-2xl">
                “{t.quote}”
              </blockquote>
              <figcaption className="relative mt-8 text-sm">
                <span className="block font-semibold text-white">{t.name}</span>
                <span className="block text-slate-400">{t.role}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
