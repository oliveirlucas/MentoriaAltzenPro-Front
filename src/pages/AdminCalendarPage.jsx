import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User,
  Video,
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

function formatDayTitle(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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

function sessionStatusLabel(s) {
  if (s === 'completed') return 'Realizada'
  if (s === 'cancelled') return 'Cancelada'
  if (s === 'scheduled') return 'Agendada'
  return '—'
}

function sessionChipClass(s) {
  if (s === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (s === 'cancelled') return 'border-slate-300 bg-slate-100 text-slate-700'
  if (s === 'scheduled') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

export default function AdminCalendarPage() {
  const { profile, loading: authLoading } = useAuth()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [flash, setFlash] = useState(null)
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [loadErr, setLoadErr] = useState('')
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
  const [editingEventId, setEditingEventId] = useState(null)
  const [eventActionBusy, setEventActionBusy] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const deleteModalTitleId = useId()

  useEffect(() => {
    const ok = searchParams.get('calendar')
    const err = searchParams.get('calendar_error')
    if (ok === 'connected') {
      setFlash({ type: 'ok', text: 'Conta Google ligada. Já pode ver e criar eventos no calendário principal.' })
    } else if (err) {
      setFlash({ type: 'err', text: err })
    }
    if (ok || err) {
      nav('/admin/calendario', { replace: true })
    }
  }, [searchParams, nav])

  const loadStatus = useCallback(async () => {
    if (profile?.role !== 'admin') return
    setLoadErr('')
    try {
      const d = await api('/admin/google-calendar/status')
      setStatus(d)
    } catch (e) {
      setLoadErr(e.message || 'Não foi possível carregar o estado.')
    } finally {
      setBusy(false)
    }
  }, [profile?.role])

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
    setLoadErr('')
    try {
      const q = new URLSearchParams({ from: range.fromIso, to: range.toIso }).toString()
      const d = await api(`/admin/google-calendar/events?${q}`)
      setEvents(d.events || [])
    } catch (e) {
      setEvents([])
      setLoadErr(e.message || 'Não foi possível carregar eventos.')
    } finally {
      setEventsBusy(false)
    }
  }, [profile?.role, status?.connected, range.fromIso, range.toIso])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (!deleteTarget) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !deleteBusy) setDeleteTarget(null)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [deleteTarget, deleteBusy])

  const eventsByDay = useMemo(() => {
    const m = new Map()
    for (const ev of events) {
      const key = ev.start ? String(ev.start).slice(0, 10) : '_'
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(ev)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  const connectGoogle = async () => {
    setConnectBusy(true)
    setLoadErr('')
    try {
      const d = await api('/admin/google-calendar/oauth-url')
      if (d?.url) window.location.href = d.url
      else setLoadErr('Resposta inválida do servidor.')
    } catch (e) {
      setLoadErr(e.message || 'Não foi possível iniciar a ligação.')
    } finally {
      setConnectBusy(false)
    }
  }

  const disconnectGoogle = async () => {
    if (!window.confirm('Desligar o Google Calendar desta conta admin?')) return
    setDisconnectBusy(true)
    setLoadErr('')
    try {
      await api('/admin/google-calendar/disconnect', { method: 'POST', body: '{}' })
      setEvents([])
      await loadStatus()
    } catch (e) {
      setLoadErr(e.message || 'Erro ao desligar.')
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
    setFormCreateMeet(false)
    setFormStudentId(ev.student?.id != null ? String(ev.student.id) : '')
    setFormSessionStatus(ev.sessionStatus || 'scheduled')
    setShowForm(true)
    setLoadErr('')
  }

  const submitEvent = async (e) => {
    e.preventDefault()
    if (!formSummary.trim()) {
      setLoadErr('Indique um título para o evento.')
      return
    }
    if (!formStartDate || !formStartTime || !formEndDate || !formEndTime) {
      setLoadErr('Preencha data e hora de início e de fim.')
      return
    }
    const wantedMeet = formCreateMeet
    setFormSaving(true)
    setLoadErr('')
    const basePayload = {
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
    try {
      if (editingEventId) {
        await api(`/admin/google-calendar/events/${encodeURIComponent(editingEventId)}`, {
          method: 'PATCH',
          body: JSON.stringify(basePayload),
        })
        setFlash({ type: 'ok', text: 'Agendamento atualizado.' })
      } else {
        const createPayload = { ...basePayload }
        if (!createPayload.studentId) delete createPayload.studentId
        if (createPayload.sessionStatus === 'scheduled') delete createPayload.sessionStatus
        const d = await api('/admin/google-calendar/events', {
          method: 'POST',
          body: JSON.stringify(createPayload),
        })
        if (d?.event?.meetLink) {
          setFlash({
            type: 'ok',
            text: `Evento criado. Link da reunião Meet: ${d.event.meetLink}`,
          })
        } else if (wantedMeet) {
          setFlash({
            type: 'ok',
            text: 'Evento criado. Se não vir link Meet, abra o evento no Google Calendar — a sala pode demorar uns segundos.',
          })
        } else {
          setFlash({ type: 'ok', text: 'Evento criado no Google Calendar.' })
        }
      }
      resetForm()
      setShowForm(false)
      await loadEvents()
    } catch (err) {
      setLoadErr(err.message || 'Erro ao guardar evento.')
    } finally {
      setFormSaving(false)
    }
  }

  const markSessionCompleted = async (ev) => {
    if (!ev?.id) return
    setEventActionBusy(ev.id)
    setLoadErr('')
    try {
      await api(`/admin/google-calendar/events/${encodeURIComponent(ev.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ sessionStatus: 'completed' }),
      })
      setFlash({ type: 'ok', text: 'Marcado como aula realizada.' })
      await loadEvents()
    } catch (err) {
      setLoadErr(err.message || 'Erro ao atualizar estado.')
    } finally {
      setEventActionBusy(null)
    }
  }

  const openDeleteModal = (ev) => {
    if (!ev?.id) return
    setDeleteTarget(ev)
    setLoadErr('')
  }

  const confirmDeleteEvent = async () => {
    const ev = deleteTarget
    if (!ev?.id) return
    setDeleteBusy(true)
    setLoadErr('')
    try {
      await api(`/admin/google-calendar/events/${encodeURIComponent(ev.id)}`, { method: 'DELETE' })
      setFlash({ type: 'ok', text: 'Agendamento eliminado.' })
      setDeleteTarget(null)
      if (editingEventId === ev.id) {
        resetForm()
        setShowForm(false)
      }
      await loadEvents()
    } catch (err) {
      setLoadErr(err.message || 'Erro ao eliminar.')
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
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

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
            aparecem no calendário <strong>principal</strong> da conta que autorizar — ideal para aulas e
            agendamentos.
          </p>
        </div>
      </div>

      {flash && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            flash.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
          role="status"
        >
          {flash.text}
        </div>
      )}

      {busy && (
        <p className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> A carregar…
        </p>
      )}

      {!busy && status && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {!status.configured ? (
            <p className="text-sm text-amber-800">
              O servidor ainda não tem as variáveis <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_*</code>{' '}
              no <code className="rounded bg-amber-100 px-1">.env</code> da API. Peça à equipa técnica para configurar a
              consola Google Cloud (OAuth tipo Web) e reiniciar a API.
            </p>
          ) : status.connected ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">Ligado ao Google Calendar</p>
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
                <LogOut className="h-4 w-4" aria-hidden />
                {disconnectBusy ? 'A desligar…' : 'Desligar Google'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-700">
                Ligue a sua conta Google para listar e criar eventos. Será pedido consentimento para{' '}
                <strong>eventos do calendário</strong> e <strong>e-mail</strong> (só para mostrar qual conta ficou
                ligada).
              </p>
              <button
                type="button"
                onClick={connectGoogle}
                disabled={connectBusy}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                <Link2 className="h-4 w-4" aria-hidden />
                {connectBusy ? 'A redirecionar…' : 'Ligar Google Calendar'}
              </button>
            </div>
          )}
        </div>
      )}

      {loadErr && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {loadErr}
        </p>
      )}

      {status?.connected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthCursor((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1)))}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-[10rem] text-center text-lg font-semibold capitalize text-slate-900">{range.label}</h2>
              <button
                type="button"
                onClick={() => setMonthCursor((d) => startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)))}
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

          {showForm && (
            <form
              onSubmit={submitEvent}
              className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm"
            >
              <h3 className="text-base font-bold text-slate-900">
                {editingEventId ? 'Editar agendamento' : 'Criar evento no calendário principal'}
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Datas em <strong>AAAA-MM-DD</strong>, horas em <strong>HH:mm</strong> (24h). Opcionalmente cria uma
                sala <strong>Google Meet</strong> ligada ao evento. Associe um <strong>aluno</strong> para acompanhar
                aulas realizadas no detalhe do aluno.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-slate-600">Título (ex.: Aula — João)</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    required
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-slate-600">Notas (opcional)</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-slate-600">Aluno (opcional)</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                  >
                    <option value="">— Sem aluno associado —</option>
                    {studentOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.full_name || s.email || '').trim() || `Utilizador #${s.id}`} ({s.email})
                      </option>
                    ))}
                  </select>
                </label>
                {editingEventId ? (
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Estado da aula</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={formSessionStatus}
                      onChange={(e) => setFormSessionStatus(e.target.value)}
                    >
                      <option value="scheduled">Agendada</option>
                      <option value="completed">Realizada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </label>
                ) : null}
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Data de início</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Hora de início</span>
                  <input
                    type="time"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Data de fim</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Hora de fim</span>
                  <input
                    type="time"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    required
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-slate-600">Fuso horário (IANA)</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                    disabled={Boolean(editingEventId)}
                  />
                  <span className="text-sm text-slate-800">
                    Criar sala Google Meet para este agendamento
                    {editingEventId ? (
                      <span className="block text-xs font-normal text-slate-500">
                        Na edição, o Meet existente mantém-se; só é criado se ainda não houver link e marcar aqui.
                      </span>
                    ) : null}
                  </span>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={formSaving}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
                >
                  {formSaving ? 'A guardar…' : editingEventId ? 'Atualizar agendamento' : 'Guardar no Google Calendar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setShowForm(false)
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </form>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">Eventos do mês</h3>
            {eventsBusy ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> A carregar eventos…
              </p>
            ) : eventsByDay.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Sem eventos neste período.</p>
            ) : (
              <ul className="mt-4 space-y-6">
                {eventsByDay.map(([dayKey, dayEvents]) => (
                  <li key={dayKey}>
                    <p className="border-b border-slate-200 pb-1 text-sm font-semibold text-slate-800">
                      {formatDayTitle(dayKey === '_' ? dayEvents[0]?.start : `${dayKey}T12:00:00`)}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {dayEvents.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900">{ev.summary}</p>
                              {ev.sessionStatus ? (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sessionChipClass(ev.sessionStatus)}`}
                                >
                                  {sessionStatusLabel(ev.sessionStatus)}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-500">
                              {formatTimeRange(ev.start, ev.end, ev.allDay)}
                            </p>
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
                              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-600">
                                {ev.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={eventActionBusy === ev.id}
                              onClick={() => openEditEvent(ev)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={
                                eventActionBusy === ev.id ||
                                (deleteBusy && deleteTarget?.id === ev.id)
                              }
                              onClick={() => openDeleteModal(ev)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 sm:text-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              Eliminar
                            </button>
                            {ev.sessionDbId && ev.sessionStatus !== 'completed' ? (
                              <button
                                type="button"
                                disabled={eventActionBusy === ev.id}
                                onClick={() => markSessionCompleted(ev)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 sm:text-sm"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Marcar realizada
                              </button>
                            ) : null}
                            {ev.meetLink && (
                              <a
                                href={ev.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 sm:text-sm"
                              >
                                <Video className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                Entrar no Meet
                              </a>
                            )}
                            {ev.htmlLink && (
                              <a
                                href={ev.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline"
                              >
                                Google Calendar
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              Eliminar agendamento?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              O evento será removido do <strong>Google Calendar</strong> e, se estiver associado a um aluno, deixa de
              contar no portal. Esta ação não pode ser anulada aqui.
            </p>
            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="font-medium text-slate-900">{deleteTarget.summary || '(sem título)'}</p>
              <p className="mt-1 text-xs text-slate-600">
                {formatTimeRange(deleteTarget.start, deleteTarget.end, deleteTarget.allDay)}
                {deleteTarget.student ? (
                  <span className="mt-1 block text-indigo-800">
                    Aluno: {deleteTarget.student.full_name || deleteTarget.student.email}
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
                    A eliminar…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
