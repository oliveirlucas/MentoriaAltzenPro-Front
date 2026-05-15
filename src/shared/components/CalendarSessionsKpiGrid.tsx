import React from 'react'

export type CalendarSessionKpiCounts = {
  total: number
  completed: number
  scheduled: number
  cancelled: number
  not_held?: number
}

type Props = {
  counts: CalendarSessionKpiCounts
  /** Classes extra no contentor da grelha (ex.: margem). */
  className?: string
}

export function CalendarSessionsKpiGrid({ counts, className = 'mb-5' }: Props) {
  const notHeld = counts.not_held ?? 0
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${className}`.trim()}>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total registrado</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{counts.total}</p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">Realizadas</p>
        <p className="mt-1 text-2xl font-bold text-emerald-950">{counts.completed}</p>
        <p className="mt-1 text-xs text-emerald-900">Encontro realizado</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-900">Agendadas</p>
        <p className="mt-1 text-2xl font-bold text-amber-950">{counts.scheduled}</p>
        <p className="mt-1 text-xs text-amber-900">Futuras ou por fechar</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Canceladas</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{counts.cancelled}</p>
        <p className="mt-1 text-xs text-slate-600">Cancelamento com registo</p>
      </div>
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-rose-900">Não realizadas</p>
        <p className="mt-1 text-2xl font-bold text-rose-950">{notHeld}</p>
        <p className="mt-1 text-xs text-rose-900">Falta, no-show, etc.</p>
      </div>
    </div>
  )
}
