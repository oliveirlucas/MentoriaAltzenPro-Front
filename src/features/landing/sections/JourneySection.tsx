import React from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  CheckCircle2,
  Compass,
  Hammer,
  MessageSquare,
  Rocket,
  Trophy,
} from 'lucide-react'

const STEPS = [
  {
    icon: Compass,
    title: 'Iniciante',
    body: 'Você chega perdido — e isso é normal. Primeiro passo: enxergar o cenário.',
  },
  {
    icon: CheckCircle2,
    title: 'Clareza profissional',
    body: 'Diagnóstico, plano de 90 dias e a visão do que realmente importa fazer.',
  },
  {
    icon: Hammer,
    title: 'Projetos reais',
    body: 'Você executa entregas com qualidade de mercado — não exercícios soltos.',
  },
  {
    icon: Rocket,
    title: 'Posicionamento',
    body: 'LinkedIn, narrativa e portfolio refletindo sua nova versão.',
  },
  {
    icon: MessageSquare,
    title: 'Entrevistas',
    body: 'Treino estratégico de comportamental e técnica até dominar o pitch.',
  },
  {
    icon: Trophy,
    title: 'Recolocação',
    body: 'Você entra (ou sobe) no mercado com clareza, repertório e direção.',
  },
] as const

export default function JourneySection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 80%', 'end 20%'],
  })

  /** Linha vertical que cresce conforme o scroll (apenas em md+). */
  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section
      id="jornada"
      aria-label="Jornada do aluno"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#050816] px-6 py-28 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(34,211,238,0.18),transparent_60%)]" aria-hidden />

      <div className="relative mx-auto w-full max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200/80"
          >
            A jornada
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Do iniciante ao{' '}
            <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
              recolocado
            </span>{' '}
            — etapa por etapa.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mt-5 text-balance text-base text-slate-400 sm:text-lg"
          >
            Uma trilha construída para acontecer no tempo certo, com mentoria perto de
            você em cada virada.
          </motion.p>
        </div>

        <div className="relative mt-16">
          {/* Linha base (md+) */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-white/10 md:block"
            aria-hidden
          />
          {/* Linha que cresce */}
          <motion.div
            style={{ height: lineHeight }}
            className="pointer-events-none absolute left-1/2 top-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-cyan-400 via-sky-400 to-violet-500 md:block"
            aria-hidden
          />

          <ol className="space-y-10 md:space-y-16">
            {STEPS.map((step, idx) => {
              const isLeft = idx % 2 === 0
              return (
                <li key={step.title} className="relative">
                  <div
                    className={`grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12 ${
                      isLeft ? '' : 'md:[&>*:first-child]:order-2'
                    }`}
                  >
                    {/* Conteúdo */}
                    <motion.div
                      initial={{ opacity: 0, x: isLeft ? -28 : 28 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.6, delay: 0.05 }}
                      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur ${
                        isLeft ? 'md:text-right' : ''
                      }`}
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80">
                        Etapa {String(idx + 1).padStart(2, '0')}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
                        {step.body}
                      </p>
                    </motion.div>

                    {/* Ícone (centro) */}
                    <div className="relative flex md:justify-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-slate-950 text-cyan-300 shadow-[0_0_25px_-2px_rgba(34,211,238,0.4)]"
                      >
                        <step.icon className="h-6 w-6" aria-hidden />
                        <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-cyan-400/30 via-transparent to-violet-500/30 blur-md" />
                      </motion.div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
