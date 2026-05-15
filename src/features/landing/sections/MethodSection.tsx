import React from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Briefcase,
  Code2,
  Megaphone,
  Network,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

const PILLARS = [
  {
    icon: Users,
    title: 'Mentoria 1:1',
    body: 'Acompanhamento real, individual, com mentores que vivem o mercado.',
    accent: 'from-cyan-400/30 to-cyan-400/0',
  },
  {
    icon: Sparkles,
    title: 'Imersões',
    body: 'Sprints intensivos para destravar etapas decisivas da sua carreira.',
    accent: 'from-sky-400/30 to-sky-400/0',
  },
  {
    icon: Brain,
    title: 'IA aplicada',
    body: 'Você aprende a usar IA como vantagem competitiva no dia a dia.',
    accent: 'from-violet-400/30 to-violet-400/0',
  },
  {
    icon: Code2,
    title: 'SDLC moderno',
    body: 'Do produto ao deploy: arquitetura, processos e qualidade reais.',
    accent: 'from-fuchsia-400/30 to-fuchsia-400/0',
  },
  {
    icon: Megaphone,
    title: 'Posicionamento',
    body: 'LinkedIn, narrativa e marca pessoal coerentes com seu próximo passo.',
    accent: 'from-emerald-400/30 to-emerald-400/0',
  },
  {
    icon: Network,
    title: 'Networking',
    body: 'Comunidade de alunos e mentores trocando oportunidades em tempo real.',
    accent: 'from-amber-400/30 to-amber-400/0',
  },
  {
    icon: Briefcase,
    title: 'Projetos reais',
    body: 'Desafios e cases que você realmente pode mostrar em entrevista.',
    accent: 'from-rose-400/30 to-rose-400/0',
  },
  {
    icon: Target,
    title: 'Estratégia',
    body: 'Direção clara, metas semanais e um plano de 90 dias para destravar.',
    accent: 'from-indigo-400/30 to-indigo-400/0',
  },
] as const

export default function MethodSection() {
  return (
    <section
      id="metodo"
      aria-label="Método AltzenPro"
      className="relative overflow-hidden bg-[#050816] px-6 py-28 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,58,237,0.18),transparent_60%)]" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-violet-200/80"
          >
            O método
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Um ecossistema que se{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 bg-clip-text text-transparent">
              conecta com sua carreira
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mt-5 text-balance text-base text-slate-400 sm:text-lg"
          >
            Cada peça do método foi desenhada para se conectar à anterior — formando um
            sistema único que acelera entrega, clareza e empregabilidade.
          </motion.p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {PILLARS.map((pillar, idx) => (
            <motion.article
              key={pillar.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: idx * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${pillar.accent} blur-2xl transition group-hover:scale-125`}
              />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200">
                  <pillar.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">{pillar.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{pillar.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
