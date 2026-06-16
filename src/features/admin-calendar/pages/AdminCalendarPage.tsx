import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useToast } from '@/shared/ui/ToastContext'
import { api } from '@/shared/api/client'
import {
  SESSION_ATTRIBUTION_OPTIONS,
  SESSION_REASON_OPTIONS,
} from '@/shared/lib/calendarSessionLabels'
import AdminCalendarMonthGrid from '@/features/admin-calendar/components/AdminCalendarMonthGrid'
import CalendarEventRow from '@/features/admin-calendar/components/CalendarEventRow'
import {
  ADMIN_CALENDAR_VIEW_TZ,
  buildMonthGridCells,
  civilYmdFromInstantInZone,
  civilYmdTodayInZone,
  formatWeekdayLongFromYmd,
} from '@/features/admin-calendar/lib/calendarSp'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  LogOut,
  Plus,
  Shield,
  Trash2,
} from 'lucide-react'

const TIME_ZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'Brasília (São Paulo)' },
  { value: 'America/Manaus', label: 'Manaus' },
  { value: 'America/Fortaleza', label: 'Fortaleza' },
  { value: 'America/Belem', label: 'Belém' },
  { value: 'America/Recife', label: 'Recife' },
  { value: 'America/Noronha', label: 'Fernando de Noronha' },
  { value: 'America/Rio_Branco', label: 'Rio Branco' },
  { value: 'UTC', label: 'UTC' },
]

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

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

function todayYmd() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Converte início/fim ISO do Google para inputs locais (data + hora). */
function isoToDateTimeParts(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

export default function AdminCalendarPage() {
  const { profile, loading: authLoading } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [busy, setBusy] = useState(true)
  const [eventsBusy, setEventsBusy] = useState(false)
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [connectBusy, setConnectBusy] = useState(false)
  const [disconnectBusy, setDisconnectBusy] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [formSummary, setFormSummary] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formTimeZone, setFormTimeZone] = useState('America/Sao_Paulo')
  const [formCreateMeet, setFormCreateMeet] = useState(true)
  const [formSaving, setFormSaving] = useState(false)
  const [studentOptions, setStudentOptions] = useState([])
  const [formStudentId, setFormStudentId] = useState('')
  const [formSessionStatus, setFormSessionStatus] = useState('scheduled')
  const [formSessionAttribution, setFormSessionAttribution] = useState('')
  const [formSessionReasonCode, setFormSessionReasonCode] = useState('')
  const [formSessionReasonNote, setFormSessionReasonNote] = useState('')
  const [formMentorPrivateNote, setFormMentorPrivateNote] = useState('')
  const [editingEventId, setEditingEventId] = useState(null)
  const [eventActionBusy, setEventActionBusy] = useState(null)
  const [outcomeModal, setOutcomeModal] = useState(null)
  const [outcomeSaving, setOutcomeSaving] = useState(false)
  const [outcomeStatus, setOutcomeStatus] = useState('not_held')
  const [outcomeAttribution, setOutcomeAttribution] = useState('')
  const [outcomeReasonCode, setOutcomeReasonCode] = useState('')
  const [outcomeReasonNote, setOutcomeReasonNote] = useState('')
  const [outcomePrivateNote, setOutcomePrivateNote] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const deleteModalTitleId = useId()
  const eventFormModalTitleId = useId()
  /** Dia civil em {ADMIN_CALENDAR_VIEW_TZ} selecionado na grelha; null = mostrar todo o mês. */
  const [selectedDayYmd, setSelectedDayYmd] = useState(null)

  useEffect(() => {
    const ok = searchParams.get('calendar')
    const err = searchParams.get('calendar_error')
    if (ok === 'connected') {
      toast.success(
        'Conta Google conectada. Você já pode ver e criar eventos no calendário principal.'
      )
    } else if (err) {
      let msg = err
      try {
        msg = decodeURIComponent(String(err).replace(/\+/g, ' '))
      } catch {
        /* mantém texto bruto */
      }
      toast.error(msg)
    }
    if (ok || err) {
      nav('/admin/calendario', { replace: true })
    }
  }, [searchParams, nav, toast])

  const loadStatus = useCallback(async () => {
    if (profile?.role !== 'admin') return
    try {
      const d = await api('/admin/google-calendar/status')
      setStatus(d)
    } catch (e) {
      toast.error(e.message || 'Não foi possível carregar o estado.')
    } finally {
      setBusy(false)
    }
  }, [profile?.role, toast])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (profile?.role !== 'admin' || !status?.connected) return
    let ok = true
    ;(async () => {
      try {
        const d = await api('/admin/students')
        if (ok) setStudentOptions(d.students || [])
      } catch {
        if (ok) setStudentOptions([])
      }
    })()
    return () => {
      ok = false
    }
  }, [profile?.role, status?.connected])

  const range = useMemo(() => {
    const from = startOfMonth(monthCursor)
    const to = endOfMonth(monthCursor)
    return {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
      label: from.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    }
  }, [monthCursor])

  const loadEvents = useCallback(async () => {
    if (profile?.role !== 'admin' || !status?.connected) return
    setEventsBusy(true)
    try {
      const q = new URLSearchParams({ from: range.fromIso, to: range.toIso }).toString()
      const d = await api(`/admin/google-calendar/events?${q}`)
      setEvents(d.events || [])
    } catch (e) {
      setEvents([])
      toast.error(e.message || 'Não foi possível carregar eventos.')
    } finally {
      setEventsBusy(false)
    }
  }, [profile?.role, status?.connected, range.fromIso, range.toIso, toast])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    const anyModalOpen = Boolean(showForm || outcomeModal || deleteTarget)
    if (!anyModalOpen) return
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [showForm, outcomeModal, deleteTarget])

  useEffect(() => {
    if (!deleteTarget) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !deleteBusy) setDeleteTarget(null)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [deleteTarget, deleteBusy])

  const eventsByDay = useMemo(() => {
    const m = new Map()
    for (const ev of events) {
      const key = civilYmdFromInstantInZone(ev.start, ADMIN_CALENDAR_VIEW_TZ)
      if (key === '_') continue
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(ev)
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const ta = a.start ? new Date(a.start).getTime() : 0
        const tb = b.start ? new Date(b.start).getTime() : 0
        return ta - tb
      })
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  const summaryByYmd = useMemo(() => {
    const out = new Map()
    for (const ev of events) {
      const ymd = civilYmdFromInstantInZone(ev.start, ADMIN_CALENDAR_VIEW_TZ)
      if (ymd === '_') continue
      const cur = out.get(ymd) || {
        total: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        notHeld: 0,
      }
      cur.total += 1
      const st = ev.sessionStatus || ''
      if (st === 'scheduled') cur.scheduled += 1
      else if (st === 'completed') cur.completed += 1
      else if (st === 'cancelled') cur.cancelled += 1
      else if (st === 'not_held') cur.notHeld += 1
      else cur.scheduled += 1
      out.set(ymd, cur)
    }
    return out
  }, [events])

  const monthGridCells = useMemo(
    () => buildMonthGridCells(monthCursor.getFullYear(), monthCursor.getMonth(), true),
    [monthCursor]
  )

  const todayYmdSp = useMemo(() => civilYmdTodayInZone(ADMIN_CALENDAR_VIEW_TZ), [])

  const displayedDayBlocks = useMemo(() => {
    if (!selectedDayYmd) return eventsByDay
    const hit = eventsByDay.find(([k]) => k === selectedDayYmd)
    if (hit) return [hit]
    return [[selectedDayYmd, []]]
  }, [selectedDayYmd, eventsByDay])

  const connectGoogle = async () => {
    setConnectBusy(true)
    try {
      const d = await api('/admin/google-calendar/oauth-url')
      if (d?.url) window.location.href = d.url
      else toast.error('Resposta inválida do servidor.')
    } catch (e) {
      toast.error(e.message || 'Não foi possível iniciar a conexão.')
    } finally {
      setConnectBusy(false)
    }
  }

  const disconnectGoogle = async () => {
    if (!window.confirm('Desconectar o Google Calendar desta conta de administrador?')) return
    setDisconnectBusy(true)
    try {
      await api('/admin/google-calendar/disconnect', { method: 'POST', body: '{}' })
      setEvents([])
      await loadStatus()
      toast.success('Google Calendar desconectado.')
    } catch (e) {
      toast.error(e.message || 'Erro ao desconectar.')
    } finally {
      setDisconnectBusy(false)
    }
  }

  const resetForm = () => {
    setFormSummary('')
    setFormDescription('')
    setFormStartDate('')
    setFormStartTime('')
    setFormEndDate('')
    setFormEndTime('')
    setFormTimeZone('America/Sao_Paulo')
    setFormCreateMeet(true)
    setFormStudentId('')
    setFormSessionStatus('scheduled')
    setFormSessionAttribution('')
    setFormSessionReasonCode('')
    setFormSessionReasonNote('')
    setFormMentorPrivateNote('')
    setEditingEventId(null)
  }

  const openEditEvent = (ev) => {
    const a = isoToDateTimeParts(ev.start)
    const b = isoToDateTimeParts(ev.end)
    setEditingEventId(ev.id)
    setFormSummary(ev.summary || '')
    setFormDescription(ev.description || '')
    setFormStartDate(a.date)
    setFormStartTime(a.time)
    setFormEndDate(b.date)
    setFormEndTime(b.time)
    setFormTimeZone(ev.timeZone || 'America/Sao_Paulo')
    setFormCreateMeet(!ev.meetLink)
    setFormStudentId(ev.student?.id != null ? String(ev.student.id) : '')
    setFormSessionStatus(ev.sessionStatus || 'scheduled')
    setFormSessionAttribution(ev.sessionAttribution || '')
    setFormSessionReasonCode(ev.sessionReasonCode || '')
    setFormSessionReasonNote(ev.sessionReasonNote || '')
    setFormMentorPrivateNote(ev.mentorPrivateNote || '')
    setShowForm(true)
  }

  const openOutcomeModal = (ev) => {
    if (!ev?.sessionDbId) return
    setOutcomeModal(ev)
    setOutcomeStatus(ev.sessionStatus === 'cancelled' ? 'cancelled' : 'not_held')
    setOutcomeAttribution(ev.sessionAttribution || '')
    setOutcomeReasonCode(ev.sessionReasonCode || '')
    setOutcomeReasonNote(ev.sessionReasonNote || '')
    setOutcomePrivateNote(ev.mentorPrivateNote || '')
  }

  const submitOutcomeModal = async (e) => {
    e.preventDefault()
    const ev = outcomeModal
    if (!ev?.id) return
    if (!outcomeAttribution || !outcomeReasonCode) {
      toast.error('Informe atribuição e motivo.')
      return
    }
    setOutcomeSaving(true)
    try {
      await api(`/admin/google-calendar/events/${encodeURIComponent(ev.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sessionStatus: outcomeStatus,
          sessionAttribution: outcomeAttribution,
          sessionReasonCode: outcomeReasonCode,
          sessionReasonNote: outcomeReasonNote.trim() || null,
          mentorPrivateNote: outcomePrivateNote.trim() || null,
        }),
      })
      if (outcomeStatus === 'cancelled' || outcomeStatus === 'not_held') {
        const wasAlreadyOrphan = ev.googleEventDeleted === true
        if (wasAlreadyOrphan) {
          toast.success('Registo da sessão atualizado.')
        } else {
          toast.success(
            outcomeStatus === 'cancelled'
              ? 'Sessão marcada como cancelada. Evento removido do Google Calendar; o registo permanece aqui na lista e no perfil do aluno.'
              : 'Sessão marcada como não realizada. Evento removido do Google Calendar; o registo permanece aqui na lista e no perfil do aluno.'
          )
        }
      } else {
        toast.success('Registo da sessão atualizado.')
      }
      setOutcomeModal(null)
      await loadEvents()
    } catch (err) {
      toast.error(err.message || 'Erro ao guardar.')
    } finally {
      setOutcomeSaving(false)
    }
  }

  const submitEvent = async (e) => {
    e.preventDefault()
    if (!formSummary.trim()) {
      toast.error('Indique um título para o evento.')
      return
    }
    if (!formStartDate || !formStartTime || !formEndDate || !formEndTime) {
      toast.error('Preencha data e hora de início e de fim.')
      return
    }
    const wantedMeet = formCreateMeet
    setFormSaving(true)
    if (
      formStudentId &&
      (formSessionStatus === 'cancelled' || formSessionStatus === 'not_held') &&
      (!formSessionAttribution || !formSessionReasonCode)
    ) {
      toast.error('Para «Não realizada» ou «Cancelada», preencha atribuição e motivo.')
      return
    }
    const basePayload: Record<string, unknown> = {
      summary: formSummary.trim(),
      description: formDescription.trim() || undefined,
      startDate: formStartDate,
      startTime: formStartTime,
      endDate: formEndDate,
      endTime: formEndTime,
      timeZone: formTimeZone,
      createMeet: wantedMeet,
      studentId: formStudentId ? Number(formStudentId) : null,
      sessionStatus: formSessionStatus,
    }
    if (
      editingEventId &&
      formStudentId &&
      (formSessionStatus === 'cancelled' || formSessionStatus === 'not_held')
    ) {
      basePayload.sessionAttribution = formSessionAttribution
      basePayload.sessionReasonCode = formSessionReasonCode
      basePayload.sessionReasonNote = formSessionReasonNote.trim() || null
      basePayload.mentorPrivateNote = formMentorPrivateNote.trim() || null
    }
    try {
      if (editingEventId) {
        await api(`/admin/google-calendar/events/${encodeURIComponent(editingEventId)}`, {
          method: 'PATCH',
          body: JSON.stringify(basePayload),
        })
        toast.success('Agendamento atualizado.')
      } else {
        const createPayload = { ...basePayload }
        if (!createPayload.studentId) delete createPayload.studentId
        if (createPayload.sessionStatus === 'scheduled') delete createPayload.sessionStatus
        const d = await api('/admin/google-calendar/events', {
          method: 'POST',
          body: JSON.stringify(createPayload),
        })
        if (d?.event?.meetLink) {
          toast.success(`Evento criado. Link da reunião Meet: ${d.event.meetLink}`)
        } else if (wantedMeet) {
          toast.success(
            'Evento criado. Se não vir link Meet, abra o evento no Google Calendar — a sala pode demorar uns segundos.'
          )
        } else {
          toast.success('Evento criado no Google Calendar.')
        }
      }
      resetForm()
      setShowForm(false)
      await loadEvents()
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar evento.')
    } finally {
      setFormSaving(false)
    }
  }

  const markSessionCompleted = async (ev) => {
    if (!ev?.id) return
    setEventActionBusy(ev.id)
    try {
      await api(`/admin/google-calendar/events/${encodeURIComponent(ev.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ sessionStatus: 'completed' }),
      })
      toast.success('Marcado como aula realizada.')
      await loadEvents()
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar estado.')
    } finally {
      setEventActionBusy(null)
    }
  }

  const openDeleteModal = (ev) => {
    if (!ev?.id) return
    setDeleteTarget(ev)
  }

  const handleSelectGridDay = useCallback((ymd) => {
    setSelectedDayYmd((prev) => (prev === ymd ? null : ymd))
  }, [])

  const goToToday = useCallback(() => {
    const now = new Date()
    setMonthCursor(startOfMonth(now))
    setSelectedDayYmd(civilYmdTodayInZone(ADMIN_CALENDAR_VIEW_TZ))
  }, [])

  const confirmDeleteEvent = async () => {
    const ev = deleteTarget
    if (!ev?.id) return
    setDeleteBusy(true)
    try {
      const out = await api<{ ok: boolean; mode?: string }>(
        `/admin/google-calendar/events/${encodeURIComponent(ev.id)}`,
        { method: 'DELETE' }
      )
      const mode = out?.mode
      if (mode === 'orphaned') {
        toast.success('Evento removido do Google Calendar. O histórico desta sessão continua aqui na lista e no perfil do aluno.')
      } else if (mode === 'history_purged') {
        toast.success('Histórico desta sessão apagado.')
      } else {
        toast.success('Agendamento eliminado.')
      }
      setDeleteTarget(null)
      if (editingEventId === ev.id) {
        resetForm()
        setShowForm(false)
      }
      await loadEvents()
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir.')
    } finally {
      setDeleteBusy(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
          >
            <Shield className="h-4 w-4" aria-hidden />
            Voltar aos alunos
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <CalendarDays className="h-8 w-8 shrink-0 text-indigo-700" aria-hidden />
            Calendário
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Integração com o <strong>Google Calendar</strong> da mesma conta Google que usa para o Gmail. Os eventos
            aparecem no calendário <strong>principal</strong> da conta que autorizar, ideal para aulas e
            agendamentos.
          </p>
        </div>
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando…
        </p>
      )}

      {!busy && status && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {!status.configured ? (
            <p className="text-sm text-amber-800">
              O servidor ainda não tem as variáveis <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_*</code>{' '}
              no <code className="rounded bg-amber-100 px-1">.env</code> da API. Peça à equipe técnica para configurar o
              Console do Google Cloud (OAuth tipo Web) e reiniciar a API.
            </p>
          ) : status.connected ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">Conectado ao Google Calendar</p>
                <p className="text-sm text-slate-600">
                  Conta: <strong>{status.google_email || '—'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={disconnectGoogle}
                disabled={disconnectBusy}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {disconnectBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden />
                )}
                {disconnectBusy ? 'Desconectando…' : 'Desconectar Google'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-700">
                Conecte sua conta Google para listar e criar eventos. Será solicitado consentimento para{' '}
                <strong>eventos do calendário</strong> e <strong>e-mail</strong> (apenas para mostrar qual conta ficou
                conectada).
              </p>
              <button
                type="button"
                onClick={connectGoogle}
                disabled={connectBusy}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                {connectBusy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {connectBusy ? 'Redirecionando…' : 'Conectar Google Calendar'}
              </button>
            </div>
          )}
        </div>
      )}

      {status?.connected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDayYmd(null)
                  setMonthCursor((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1)))
                }}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-[10rem] text-center text-lg font-semibold capitalize text-slate-900">{range.label}</h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedDayYmd(null)
                  setMonthCursor((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)))
                }}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                aria-label="Mês seguinte"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showForm) {
                  resetForm()
                  setShowForm(false)
                  return
                }
                setEditingEventId(null)
                setFormStudentId('')
                setFormSessionStatus('scheduled')
                const t = todayYmd()
                setFormStartDate(t)
                setFormEndDate(t)
                setFormStartTime('09:00')
                setFormEndTime('10:00')
                setFormTimeZone('America/Sao_Paulo')
                setFormCreateMeet(true)
                setFormSummary('')
                setFormDescription('')
                setShowForm(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-100"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Novo agendamento
            </button>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Vista do mês</h3>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  Toque num dia para filtrar a lista abaixo. Cores: <span className="text-amber-700">agendada</span>,{' '}
                  <span className="text-emerald-700">realizada</span>, <span className="text-slate-600">cancelada / não realizada</span>.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Ir para hoje
                </button>
                {selectedDayYmd ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDayYmd(null)}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-100"
                  >
                    Ver mês inteiro na lista
                  </button>
                ) : null}
              </div>
            </div>
            {eventsBusy ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando grelha…
              </p>
            ) : (
              <div className="mt-4">
                <AdminCalendarMonthGrid
                  cells={monthGridCells}
                  todayYmd={todayYmdSp}
                  selectedYmd={selectedDayYmd}
                  onSelectYmd={handleSelectGridDay}
                  summaryByYmd={summaryByYmd}
                />
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              {selectedDayYmd
                ? `Agendamentos — ${formatWeekdayLongFromYmd(selectedDayYmd)}`
                : `Todos os agendamentos — ${range.label}`}
            </h3>
            {eventsBusy ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando eventos…
              </p>
            ) : events.length === 0 && !selectedDayYmd ? (
              <p className="mt-4 text-sm text-slate-500">Sem eventos neste período.</p>
            ) : (
              <ul className="mt-4 space-y-6">
                {displayedDayBlocks.map(([dayKey, dayEvents]) => (
                  <li key={dayKey}>
                    <p className="border-b border-slate-200 pb-1 text-sm font-semibold text-slate-800">
                      {formatWeekdayLongFromYmd(dayKey)}
                    </p>
                    {dayEvents.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">Nenhum agendamento neste dia.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {dayEvents.map((ev) => (
                          <CalendarEventRow
                            key={ev.id}
                            ev={ev}
                            eventActionBusy={eventActionBusy}
                            deleteBusy={deleteBusy}
                            deleteTargetId={deleteTarget?.id}
                            outcomeSaving={outcomeSaving}
                            onEdit={openEditEvent}
                            onDelete={openDeleteModal}
                            onMarkCompleted={markSessionCompleted}
                            onOutcome={openOutcomeModal}
                          />
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {outcomeModal ? (
        <div className="fixed inset-0 z-[100] flex max-h-[100dvh] items-center justify-center overflow-y-auto overscroll-contain p-4">
          <button
            type="button"
            className="absolute inset-0 z-0 cursor-default border-0 bg-slate-900/50 p-0"
            onClick={() => {
              if (!outcomeSaving) setOutcomeModal(null)
            }}
            aria-label="Fechar"
          />
          <form
            onSubmit={submitOutcomeModal}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">Registo da sessão (visível ao aluno)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use quando a aula <strong>não foi realizada</strong> ou foi <strong>cancelada</strong>. O aluno vê o
              estado, a atribuição, o motivo e a nota pública (não a nota interna).
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Tipo</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={outcomeStatus}
                  onChange={(e) => setOutcomeStatus(e.target.value)}
                >
                  <option value="not_held">Não realizada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Atribuição</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={outcomeAttribution}
                  onChange={(e) => setOutcomeAttribution(e.target.value)}
                  required
                >
                  <option value="">— Escolher —</option>
                  {SESSION_ATTRIBUTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Motivo</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={outcomeReasonCode}
                  onChange={(e) => setOutcomeReasonCode(e.target.value)}
                  required
                >
                  <option value="">— Escolher —</option>
                  {SESSION_REASON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Nota ao aluno (opcional)</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={outcomeReasonNote}
                  onChange={(e) => setOutcomeReasonNote(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Nota interna (só mentor)</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={outcomePrivateNote}
                  onChange={(e) => setOutcomePrivateNote(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={outcomeSaving}
                onClick={() => setOutcomeModal(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={outcomeSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-60"
              >
                {outcomeSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteTarget ? (() => {
        const dt = deleteTarget
        const isOrphan = dt.googleEventDeleted === true
        const status = dt.sessionStatus || ''
        const isTerminalLive = !isOrphan && (status === 'cancelled' || status === 'not_held' || status === 'completed')

        let title = 'Excluir agendamento?'
        let description: React.ReactNode = (
          <>
            O evento será removido do <strong>Google Calendar</strong> e, se estiver associado a um aluno, deixa de
            contar no portal. Esta ação não pode ser desfeita por aqui.
          </>
        )
        let confirmLabel = 'Excluir'
        let confirmBusyLabel = 'Excluindo…'

        if (isOrphan) {
          title = 'Apagar histórico desta sessão?'
          description = (
            <>
              Esta sessão já <strong>não existe no Google Calendar</strong>. Apagar agora <strong>remove o registo histórico</strong>
              {' '}da lista do calendário e do perfil do aluno. Esta ação não pode ser desfeita.
            </>
          )
          confirmLabel = 'Apagar histórico'
          confirmBusyLabel = 'Apagando…'
        } else if (isTerminalLive) {
          title = 'Remover evento do Google Calendar?'
          description = (
            <>
              O evento será removido do <strong>Google Calendar</strong>. O histórico desta sessão (estado, atribuição,
              motivo e notas) <strong>permanece no perfil do aluno</strong> e nesta lista, marcado como removido do Google.
              Para apagar o histórico, clique em «Excluir» de novo depois.
            </>
          )
          confirmLabel = 'Remover do Google'
          confirmBusyLabel = 'Removendo…'
        }

        return (
          <div className="fixed inset-0 z-[100] flex max-h-[100dvh] items-center justify-center overflow-y-auto overscroll-contain p-4">
            <button
              type="button"
              className="absolute inset-0 z-0 cursor-default border-0 bg-slate-900/50 p-0"
              onClick={() => {
                if (!deleteBusy) setDeleteTarget(null)
              }}
              aria-label="Fechar"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={deleteModalTitleId}
              className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            >
              <h2 id={deleteModalTitleId} className="text-lg font-bold text-slate-900">
                {title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="font-medium text-slate-900">{dt.summary || '(sem título)'}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatTimeRange(dt.start, dt.end, dt.allDay)}
                  {dt.student ? (
                    <span className="mt-1 block text-indigo-800">
                      Aluno: {dt.student.full_name || dt.student.email}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => confirmDeleteEvent()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {deleteBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      {confirmBusyLabel}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                      {confirmLabel}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })() : null}

      {showForm ? (
        <div className="fixed inset-0 z-[100] flex max-h-[100dvh] items-start justify-center overflow-y-auto overscroll-contain p-4 py-8 sm:py-10">
          <button
            type="button"
            className="absolute inset-0 z-0 cursor-default border-0 bg-slate-900/50 p-0"
            onClick={() => {
              if (!formSaving) {
                resetForm()
                setShowForm(false)
              }
            }}
            aria-label="Fechar"
          />
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={eventFormModalTitleId}
            onSubmit={submitEvent}
            className="relative z-10 w-full max-h-[min(90vh,56rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 id={eventFormModalTitleId} className="text-lg font-bold text-slate-900">
              {editingEventId ? 'Editar agendamento' : 'Novo agendamento'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Datas em <strong>AAAA-MM-DD</strong>, horas em <strong>HH:mm</strong> (24h). Opcionalmente cria uma sala{' '}
              <strong>Google Meet</strong> vinculada ao evento. Associe um <strong>aluno</strong> para acompanhar aulas
              realizadas no detalhe do aluno.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Título (ex.: Aula — João)</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Notas (opcional)</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Aluno (opcional)</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                >
                  <option value="">— Sem aluno associado —</option>
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {(s.full_name || s.email || '').trim() || `Usuário #${s.id}`} ({s.email})
                    </option>
                  ))}
                </select>
              </label>
              {editingEventId ? (
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-slate-600">Estado da aula</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={formSessionStatus}
                    onChange={(e) => setFormSessionStatus(e.target.value)}
                  >
                    <option value="scheduled">Agendada</option>
                    <option value="completed">Realizada</option>
                    <option value="not_held">Não realizada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </label>
              ) : null}
              {editingEventId &&
              formStudentId &&
              (formSessionStatus === 'not_held' || formSessionStatus === 'cancelled') ? (
                <>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Atribuição (quem caracteriza a situação)</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={formSessionAttribution}
                      onChange={(e) => setFormSessionAttribution(e.target.value)}
                      required
                    >
                      <option value="">— Escolher —</option>
                      {SESSION_ATTRIBUTION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Motivo</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={formSessionReasonCode}
                      onChange={(e) => setFormSessionReasonCode(e.target.value)}
                      required
                    >
                      <option value="">— Escolher —</option>
                      {SESSION_REASON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Nota visível ao aluno (opcional)</span>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      rows={2}
                      value={formSessionReasonNote}
                      onChange={(e) => setFormSessionReasonNote(e.target.value)}
                      placeholder="Ex.: remarcamos para a terça; aluno avisou com 24h."
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">
                      Nota interna (só mentor, não aparece ao aluno)
                    </span>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      rows={2}
                      value={formMentorPrivateNote}
                      onChange={(e) => setFormMentorPrivateNote(e.target.value)}
                    />
                  </label>
                </>
              ) : null}
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Data de início</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Hora de início</span>
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Data de fim</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Hora de fim</span>
                <input
                  type="time"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-600">Fuso horário (IANA)</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={formTimeZone}
                  onChange={(e) => setFormTimeZone(e.target.value)}
                >
                  {TIME_ZONE_OPTIONS.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  checked={formCreateMeet}
                  onChange={(e) => setFormCreateMeet(e.target.checked)}
                />
                <span className="text-sm text-slate-800">
                  Criar sala Google Meet para este agendamento
                  {editingEventId ? (
                    <span className="block text-xs font-normal text-slate-500">
                      Ao editar: se o evento <strong>ainda não tiver</strong> link Meet, marque aqui e guarde para a API
                      criar a sala. Se já existir Meet, o Google mantém o link (desmarcar não remove a reunião).
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                disabled={formSaving}
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                {formSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    Salvando…
                  </>
                ) : editingEventId ? (
                  'Atualizar agendamento'
                ) : (
                  'Salvar no Google Calendar'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
