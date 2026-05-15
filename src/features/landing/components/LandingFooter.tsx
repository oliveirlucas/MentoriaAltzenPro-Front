import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function LandingFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative border-t border-white/5 bg-slate-950 px-6 py-12 text-slate-400">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <p className="text-xl font-extrabold tracking-tight text-white">AltzenPro</p>
          <p className="max-w-md text-sm text-slate-500">
            Aceleração profissional para a tecnologia moderna. Mentoria, IA aplicada, SDLC e
            posicionamento real de carreira.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-6 text-sm">
            <a href="#metodo" className="transition hover:text-white">
              Método
            </a>
            <a href="#jornada" className="transition hover:text-white">
              Jornada
            </a>
            <a href="#diferenciais" className="transition hover:text-white">
              Diferenciais
            </a>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-400/50 hover:bg-white/10"
          >
            Entrar
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-7xl flex-col items-start justify-between gap-2 border-t border-white/5 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
        <p>© {year} AltzenPro Mentoria. Todos os direitos reservados.</p>
        <p>Construído com mentalidade de produto e foco em resultado.</p>
      </div>
    </footer>
  )
}
