import React from 'react'
import type { MonthGridCell } from '@/features/admin-calendar/lib/calendarSp'

const WEEK_LABELS_MON = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

type DaySummary = {
  total: number
  scheduled: number
  completed: number
  cancelled: number
  notHeld: number
}

type Props = {
  cells: MonthGridCell[]
  todayYmd: string
  selectedYmd: string | null
  onSelectYmd: (ymd: string) => void
  summaryByYmd: Map<string, DaySummary>
}

function dotClass(s: DaySummary): string {
  if (s.total === 0) return ''
  if (s.scheduled > 0) return 'bg-amber-500'
  if (s.completed > 0 && s.scheduled === 0) return 'bg-emerald-500'
  if (s.cancelled > 0 || s.notHeld > 0) return 'bg-slate-400'
  return 'bg-indigo-400'
}

export default function AdminCalendarMonthGrid({
  cells,
  todayYmd,
  selectedYmd,
  onSelectYmd,
  summaryByYmd,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[280px] grid-cols-7 gap-1 sm:gap-1.5">
        {WEEK_LABELS_MON.map((w) => (
          <div
            key={w}
            className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs"
          >
            {w}
          </div>
        ))}
        {cells.map((c) => {
          if (c.kind === 'pad') {
            return <div key={c.key} className="min-h-[3.25rem] rounded-lg bg-slate-50/50 sm:min-h-[4rem]" aria-hidden />
          }
          const sum = summaryByYmd.get(c.ymd) || {
            total: 0,
            scheduled: 0,
            completed: 0,
            cancelled: 0,
            notHeld: 0,
          }
          const isToday = c.ymd === todayYmd
          const isSelected = c.ymd === selectedYmd
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelectYmd(c.ymd)}
              className={`flex min-h-[3.25rem] flex-col items-center justify-between rounded-lg border px-1 py-1.5 text-center transition sm:min-h-[4rem] sm:px-2 sm:py-2 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-100 ring-2 ring-indigo-400'
                  : isToday
                    ? 'border-indigo-300 bg-white ring-2 ring-indigo-300/80 hover:bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                className={`text-sm font-semibold tabular-nums sm:text-base ${
                  isToday || isSelected ? 'text-indigo-950' : 'text-slate-900'
                }`}
              >
                {c.dayNum}
              </span>
              <span className="mt-0.5 flex h-4 items-center justify-center gap-0.5" aria-hidden>
                {sum.total > 0 ? (
                  <>
                    <span className={`h-1.5 w-1.5 rounded-full ${dotClass(sum)}`} />
                    {sum.total > 1 ? (
                      <span className="text-[10px] font-medium leading-none text-slate-600 sm:text-xs">+{sum.total}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-[9px] text-slate-300">·</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 sm:text-xs">
        Fuso: <strong>Brasília</strong> · Ponto = dia com sessão · +N = total no dia
      </p>
    </div>
  )
}
