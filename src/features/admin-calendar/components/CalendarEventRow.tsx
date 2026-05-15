import React, { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  Video,
} from 'lucide-react'
import { sessionStatusChipClass, sessionStatusLabelPt } from '@/shared/lib/calendarSessionLabels'

function formatTimeRange(start, end, allDay) {
  if (allDay) return 'Dia inteiro'
  const a = start ? new Date(start) : null
  const b = end ? new Date(end) : null
  if (!a || Number.isNaN(a.getTime())) return '—'
  const t1 = a.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (!b || Number.isNaN(b.getTime())) return t1
  const t2 = b.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${t1} – ${t2}`
}

export type CalendarEventRowEv = {
  id: string
  start?: string
  end?: string
  allDay?: boolean
  summary?: string
  description?: string
  meetLink?: string
  htmlLink?: string
  sessionStatus?: string
  sessionDbId?: number
  student?: { id?: number; full_name?: string; email?: string }
}

type Props = {
  ev: CalendarEventRowEv
  eventActionBusy: string | null
  deleteBusy: boolean
  deleteTargetId: string | undefined
  outcomeSaving: boolean
  onEdit: (ev: CalendarEventRowEv) => void
  onDelete: (ev: CalendarEventRowEv) => void
  onMarkCompleted: (ev: CalendarEventRowEv) => void
  onOutcome: (ev: CalendarEventRowEv) => void
}

export default function CalendarEventRow({
  ev,
  eventActionBusy,
  deleteBusy,
  deleteTargetId,
  outcomeSaving,
  onEdit,
  onDelete,
  onMarkCompleted,
  onOutcome,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const busyHere = eventActionBusy === ev.id || (deleteBusy && deleteTargetId === ev.id) || outcomeSaving

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">{ev.summary}</p>
          {ev.sessionStatus ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sessionStatusChipClass(ev.sessionStatus)}`}
            >
              {sessionStatusLabelPt(ev.sessionStatus)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{formatTimeRange(ev.start, ev.end, ev.allDay)}</p>
        {ev.student ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-indigo-800">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {ev.student.full_name || ev.student.email}
              {ev.student.full_name && ev.student.email ? ` · ${ev.student.email}` : ''}
            </span>
          </p>
        ) : null}
        {ev.description ? (
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-600">{ev.description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end" ref={wrapRef}>
        {ev.meetLink ? (
          <a
            href={ev.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 sm:text-sm"
          >
            <Video className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Meet
          </a>
        ) : null}

        <div className="relative">
          <button
            type="button"
            disabled={busyHere}
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Mais ações"
          >
            {busyHere ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            )}
          </button>
          {menuOpen && !busyHere ? (
            <ul
              role="menu"
              className="absolute right-0 z-30 mt-1 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(ev)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  Editar
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(ev)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  Excluir
                </button>
              </li>
              {ev.sessionDbId && ev.student && ev.sessionStatus !== 'completed' ? (
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-800 hover:bg-emerald-50"
                    onClick={() => {
                      setMenuOpen(false)
                      onMarkCompleted(ev)
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    Marcar realizada
                  </button>
                </li>
              ) : null}
              {ev.sessionDbId && ev.student ? (
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-800 hover:bg-rose-50"
                    onClick={() => {
                      setMenuOpen(false)
                      onOutcome(ev)
                    }}
                  >
                    {ev.sessionStatus === 'not_held' || ev.sessionStatus === 'cancelled'
                      ? 'Editar falta / cancelamento'
                      : 'Não realizada / cancelada'}
                  </button>
                </li>
              ) : null}
              {ev.htmlLink ? (
                <li>
                  <a
                    role="menuitem"
                    href={ev.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Google Calendar
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  )
}
