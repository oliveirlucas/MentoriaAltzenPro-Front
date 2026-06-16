import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  meetLink?: string | null
  htmlLink?: string | null
  sessionStatus?: string
  sessionDbId?: number
  googleEventDeleted?: boolean
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

const MENU_WIDTH_PX = 224
const MENU_GUTTER_PX = 8
const MOBILE_BREAKPOINT_PX = 640

type MenuLayout =
  | { mode: 'sheet' }
  | { mode: 'dropdown'; top: number; left: number; width: number; ready: boolean }

function computeDropdownInitial(rect: DOMRect): MenuLayout {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const desiredLeft = rect.right - MENU_WIDTH_PX
  const minLeft = MENU_GUTTER_PX
  const maxLeft = vw - MENU_WIDTH_PX - MENU_GUTTER_PX
  const left = Math.max(minLeft, Math.min(desiredLeft, maxLeft))
  return {
    mode: 'dropdown',
    top: rect.bottom + 4,
    left,
    width: MENU_WIDTH_PX,
    ready: false,
  }
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
  const [layout, setLayout] = useState<MenuLayout | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // 1ª passagem: decide modo (sheet / dropdown) + posição inicial sem altura medida.
  useLayoutEffect(() => {
    if (!menuOpen) {
      setLayout(null)
      return
    }
    const compute = () => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
      if (vw < MOBILE_BREAKPOINT_PX) {
        setLayout({ mode: 'sheet' })
        return
      }
      const btn = buttonRef.current
      if (!btn) return
      setLayout(computeDropdownInitial(btn.getBoundingClientRect()))
    }
    compute()
  }, [menuOpen])

  // 2ª passagem (desktop): mede o menu e faz flip vertical se transbordar abaixo.
  useLayoutEffect(() => {
    if (!layout || layout.mode !== 'dropdown' || layout.ready) return
    const menu = menuRef.current
    const btn = buttonRef.current
    if (!menu || !btn) return
    const menuHeight = menu.offsetHeight
    const rect = btn.getBoundingClientRect()
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768

    let top = rect.bottom + 4
    if (top + menuHeight > vh - MENU_GUTTER_PX) {
      const aboveTop = rect.top - menuHeight - 4
      if (aboveTop >= MENU_GUTTER_PX) {
        top = aboveTop
      } else {
        top = Math.max(MENU_GUTTER_PX, vh - menuHeight - MENU_GUTTER_PX)
      }
    }

    setLayout((prev) =>
      prev && prev.mode === 'dropdown' ? { ...prev, top, ready: true } : prev
    )
  }, [layout])

  // Fechamento + reposicionamento.
  useEffect(() => {
    if (!menuOpen) return

    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const onResize = () => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
      if (vw < MOBILE_BREAKPOINT_PX) {
        setLayout({ mode: 'sheet' })
      } else if (buttonRef.current) {
        setLayout(computeDropdownInitial(buttonRef.current.getBoundingClientRect()))
      }
    }
    const onScroll = () => setMenuOpen(false)

    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuOpen])

  // Trava o scroll do body enquanto o bottom sheet do mobile estiver aberto,
  // para evitar que o utilizador role a página por trás do overlay.
  useEffect(() => {
    if (!menuOpen || layout?.mode !== 'sheet') return
    const prevBody = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
    }
  }, [menuOpen, layout?.mode])

  const busyHere = eventActionBusy === ev.id || (deleteBusy && deleteTargetId === ev.id) || outcomeSaving
  const isOrphan = ev.googleEventDeleted === true
  const showMeetButton = Boolean(ev.meetLink) && !isOrphan
  const showHtmlLink = Boolean(ev.htmlLink) && !isOrphan
  const showEditItem = !isOrphan
  const showMarkCompleted = Boolean(ev.sessionDbId && ev.student && ev.sessionStatus !== 'completed')
  const showOutcomeItem = Boolean(ev.sessionDbId && ev.student)

  const menuItems = (
    <>
      {showEditItem ? (
        <li>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-800 hover:bg-slate-50 sm:py-2"
            onClick={() => {
              setMenuOpen(false)
              onEdit(ev)
            }}
          >
            <Pencil className="h-4 w-4 shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" aria-hidden />
            Editar
          </button>
        </li>
      ) : null}
      <li>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-700 hover:bg-red-50 sm:py-2"
          onClick={() => {
            setMenuOpen(false)
            onDelete(ev)
          }}
        >
          <Trash2 className="h-4 w-4 shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" aria-hidden />
          Excluir
        </button>
      </li>
      {showMarkCompleted ? (
        <li>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-emerald-800 hover:bg-emerald-50 sm:py-2"
            onClick={() => {
              setMenuOpen(false)
              onMarkCompleted(ev)
            }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" aria-hidden />
            Marcar realizada
          </button>
        </li>
      ) : null}
      {showOutcomeItem ? (
        <li>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-rose-800 hover:bg-rose-50 sm:py-2"
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
      {showHtmlLink ? (
        <li>
          <a
            role="menuitem"
            href={ev.htmlLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-indigo-700 hover:bg-indigo-50 sm:py-2"
            onClick={() => setMenuOpen(false)}
          >
            Google Calendar
            <ExternalLink className="h-4 w-4 shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" aria-hidden />
          </a>
        </li>
      ) : null}
    </>
  )

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
          {isOrphan ? (
            <span
              className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              title="O evento foi removido do Google Calendar; o registo desta sessão fica preservado aqui e no perfil do aluno."
            >
              removido do Google
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

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
        {showMeetButton ? (
          <a
            href={ev.meetLink!}
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
            ref={buttonRef}
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
          {menuOpen && !busyHere && layout
            ? createPortal(
                layout.mode === 'sheet' ? (
                  <div
                    className="fixed inset-0 z-[200] flex flex-col justify-end"
                    role="presentation"
                  >
                    <button
                      type="button"
                      aria-label="Fechar"
                      className="absolute inset-0 cursor-default border-0 bg-slate-900/40 p-0"
                      onClick={closeMenu}
                    />
                    <div
                      ref={menuRef}
                      role="menu"
                      aria-label="Mais ações"
                      className="relative max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl"
                      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
                    >
                      <div className="flex items-center justify-center pt-3 pb-1">
                        <span className="h-1.5 w-10 rounded-full bg-slate-300" aria-hidden />
                      </div>
                      <ul className="py-1">{menuItems}</ul>
                    </div>
                  </div>
                ) : (
                  <div
                    ref={menuRef}
                    role="menu"
                    className="fixed z-[200] rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                    style={{
                      top: `${layout.top}px`,
                      left: `${layout.left}px`,
                      width: `${layout.width}px`,
                      visibility: layout.ready ? 'visible' : 'hidden',
                    }}
                  >
                    <ul>{menuItems}</ul>
                  </div>
                ),
                document.body
              )
            : null}
        </div>
      </div>
    </li>
  )
}
