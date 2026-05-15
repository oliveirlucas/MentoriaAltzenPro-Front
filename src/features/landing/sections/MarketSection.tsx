import React from 'react'
import { motion } from 'framer-motion'

const WORDS = ['Velocidade.', 'IA.', 'Posicionamento.', 'Execução.'] as const

export default function MarketSection() {
  return (
    <section
      id="mercado"
      aria-label="O mercado atual"
      className="relative overflow-hidden bg-[#050816] px-6 py-28 sm:py-40"
    >
      {/* Linhas digitais */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#22d3ee_1px,transparent_1px),linear-gradient(to_bottom,#22d3ee_1px,transparent_1px)] [background-size:96px_96px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_50%,transparent_100%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200/80"
        >
          O mercado atual
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="text-balance text-3xl font-semibold leading-tight tracking-tight text-slate-200 sm:text-4xl md:text-5xl"
        >
          O mercado exige
        </motion.h2>

        <div className="mt-6 flex flex-col items-center gap-3 sm:gap-5 md:gap-6">
          {WORDS.map((word, idx) => (
            <motion.p
              key={word}
              initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance bg-gradient-to-br from-white via-cyan-100 to-violet-200 bg-clip-text text-5xl font-extrabold leading-none tracking-tight text-transparent sm:text-7xl md:text-[88px] lg:text-[110px]"
            >
              {word}
            </motion.p>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, delay: 0.4 }}
          className="mt-12 max-w-2xl text-balance text-base text-slate-400 sm:text-lg"
        >
          Quem domina IA, entende o ciclo de software e sabe se posicionar entrega 10×.
          Quem só consome conteúdo, fica para trás.
        </motion.p>
      </div>
    </section>
  )
}
