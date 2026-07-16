import React from 'react'
import type { MonthGridCell } from '@/features/admin-calendar/lib/calendarSp'

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export type EventForGrid = {
  id: string
  summary: string
  start: string | null
  sessionStatus?: string
  student?: { full_name?: string | null; email?: string | null } | null
}

type Props = {
  cells: MonthGridCell[]
  todayYmd: string
  selectedYmd: string | null
  onSelectYmd: (ymd: string) => void
  eventsByYmd: Map<string, EventForGrid[]>
}

function chipClass(status?: string): string {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800'
  if (status === 'cancelled' || status === 'not_held') return 'bg-slate-100 text-slate-400 line-through'
  return 'bg-amber-100 text-amber-800'
}

function formatCellTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function getEventName(ev: EventForGrid): string {
  if (ev.student?.full_name?.trim()) {
    return ev.student.full_name.trim().split(/\s+/)[0]
  }
  const m = /[–—-]\s*(.+)/.exec(ev.summary || '')
  if (m) return m[1].trim().split(/\s+/)[0]
  return ev.summary || ''
}

export default function AdminCalendarMonthGrid({
  cells,
  todayYmd,
  selectedYmd,
  onSelectYmd,
  eventsByYmd,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[280px] grid-cols-7 gap-1 sm:gap-1.5">
        {WEEK_LABELS.map((w) => (
          <div
            key={w}
            className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs"
          >
            {w}
          </div>
        ))}
        {cells.map((c) => {
          if (c.kind === 'pad') {
            return (
              <div
                key={c.key}
                className="min-h-[3.25rem] rounded-lg bg-slate-50/50 sm:min-h-[4rem]"
                aria-hidden
              />
            )
          }

          const dayEvs = eventsByYmd.get(c.ymd) || []
          const isToday = c.ymd === todayYmd
          const isSelected = c.ymd === selectedYmd

          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelectYmd(c.ymd)}
              className={`flex min-h-[3.25rem] flex-col items-start gap-0.5 rounded-lg border px-1 py-1 text-left transition sm:min-h-[4rem] sm:px-1.5 sm:py-1.5 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-100 ring-2 ring-indigo-400'
                  : isToday
                    ? 'border-indigo-300 bg-white ring-2 ring-indigo-300/80 hover:bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                className={`self-end text-xs font-semibold tabular-nums leading-none sm:text-sm ${
                  isToday || isSelected ? 'text-indigo-700' : 'text-slate-900'
                }`}
              >
                {c.dayNum}
              </span>

              {dayEvs.length > 0 && (
                <div className="flex w-full flex-col gap-px">
                  {dayEvs.map((ev) => (
                    <span
                      key={ev.id}
                      className={`flex w-full min-w-0 items-center gap-0.5 rounded px-0.5 py-px text-[8px] leading-tight sm:text-[9px] ${chipClass(ev.sessionStatus)}`}
                    >
                      <span className="shrink-0 tabular-nums">{formatCellTime(ev.start)}</span>
                      <span className="truncate">{getEventName(ev)}</span>
                    </span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 sm:text-xs">
        Fuso: <strong>Brasília</strong> ·{' '}
        <span className="text-amber-700">agendada</span> ·{' '}
        <span className="text-emerald-700">realizada</span> ·{' '}
        <span className="text-slate-400">cancelada / não realizada</span>
      </p>
    </div>
  )
}
