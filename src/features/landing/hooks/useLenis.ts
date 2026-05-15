import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Smooth scroll global com Lenis.
 *
 * Respeita `prefers-reduced-motion` (não monta o Lenis se o usuário pediu redução de movimento).
 * Retorna a instância do Lenis para integrações pontuais (ex.: ScrollTrigger).
 */
export function useLenis(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])
}

export default useLenis
