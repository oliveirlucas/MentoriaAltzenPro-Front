import React, { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Activity, BookOpen, Calendar, Sparkles, TrendingUp } from 'lucide-react'

export default function ShowcaseSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  /** Parallax sutil */
  const y = useTransform(scrollYProgress, [0, 1], [80, -80])
  const rotate = useTransform(scrollYProgress, [0, 1], [3, -3])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1, 0.98])

  return (
    <section
      id="plataforma"
      aria-label="A plataforma"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#050816] px-6 py-28 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,rgba(34,211,238,0.12),transparent_70%)]" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200/80"
          >
            A plataforma
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Sua carreira em{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-400 bg-clip-text text-transparent">
              um só lugar
            </span>
            .
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mt-5 text-balance text-base text-slate-400 sm:text-lg"
          >
            Diagnóstico, plano de 90 dias, mentoria, anotações, recursos e comunidade —
            tudo conectado para você não perder o foco.
          </motion.p>
        </div>

        {/* Mockup */}
        <motion.div
          style={{ y, rotate, scale }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-2 shadow-[0_60px_120px_-40px_rgba(34,211,238,0.35)] backdrop-blur">
            <div className="rounded-2xl border border-white/5 bg-slate-950 p-6 sm:p-8">
              {/* Header do dashboard mock */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  AltzenPro Mentoria
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Card 1 — progresso */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300/80">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden /> Plano 90 dias
                  </div>
                  <p className="mt-3 text-3xl font-extrabold text-white">68%</p>
                  <p className="text-xs text-slate-400">Em progresso · semana 7 de 12</p>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                  </div>
                </div>

                {/* Card 2 — próxima mentoria */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-violet-300/80">
                    <Calendar className="h-3.5 w-3.5" aria-hidden /> Próxima mentoria
                  </div>
                  <p className="mt-3 text-base font-semibold text-white">
                    Posicionamento estratégico
                  </p>
                  <p className="text-xs text-slate-400">Quinta · 19h · 1:1 com mentor</p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Entrar na sala
                  </button>
                </div>

                {/* Card 3 — recursos */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-300/80">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden /> Trilhas ativas
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    <li className="flex items-center justify-between">
                      <span>IA aplicada ao SDLC</span>
                      <span className="text-xs text-cyan-300">82%</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Posicionamento</span>
                      <span className="text-xs text-violet-300">45%</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Mercado real</span>
                      <span className="text-xs text-sky-300">61%</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Linha de atividade */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                  <Activity className="h-3.5 w-3.5" aria-hidden /> Atividade recente
                </div>
                <div className="mt-4 flex h-24 items-end gap-1">
                  {[18, 32, 24, 56, 40, 72, 65, 88, 70, 95, 78, 84].map((v, i) => (
                    <div
                      key={i}
                      style={{ height: `${v}%` }}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-500/40 to-violet-500/80"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Glow base */}
          <div className="pointer-events-none absolute inset-x-10 -bottom-8 h-16 rounded-[100%] bg-cyan-500/20 blur-3xl" aria-hidden />
        </motion.div>
      </div>
    </section>
  )
}
