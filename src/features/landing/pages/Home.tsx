import React, { useEffect } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import LandingHeader from '@/features/landing/components/LandingHeader'
import LandingFooter from '@/features/landing/components/LandingFooter'
import HeroSection from '@/features/landing/sections/HeroSection'
import ProblemSection from '@/features/landing/sections/ProblemSection'
import MarketSection from '@/features/landing/sections/MarketSection'
import MethodSection from '@/features/landing/sections/MethodSection'
import JourneySection from '@/features/landing/sections/JourneySection'
import DifferentialsSection from '@/features/landing/sections/DifferentialsSection'
import ShowcaseSection from '@/features/landing/sections/ShowcaseSection'
import TestimonialsSection from '@/features/landing/sections/TestimonialsSection'
import CtaSection from '@/features/landing/sections/CtaSection'
import { useLenis } from '@/features/landing/hooks/useLenis'

/**
 * Landing page pública da AltzenPro Mentoria.
 *
 * Stack:
 * - Framer Motion para reveals e parallax
 * - Lenis para smooth scroll global (respeita prefers-reduced-motion)
 * - React Three Fiber + Drei na cena 3D do Hero/CTA
 *
 * O cabeçalho expõe um botão "Entrar" que leva para `/login` (tela de login atual).
 */
export default function Home() {
  useLenis()

  /** Barra de progresso de scroll no topo */
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.4,
  })

  useEffect(() => {
    document.documentElement.classList.add('altzenpro-landing')
    return () => {
      document.documentElement.classList.remove('altzenpro-landing')
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full bg-[#050816] text-white antialiased">
      {/* Barra de progresso */}
      <motion.div
        style={{ scaleX: progress }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500"
        aria-hidden
      />

      <LandingHeader />

      <main>
        <HeroSection />
        <ProblemSection />
        <MarketSection />
        <MethodSection />
        <JourneySection />
        <DifferentialsSection />
        <ShowcaseSection />
        <TestimonialsSection />
        <CtaSection />
      </main>

      <LandingFooter />
    </div>
  )
}
