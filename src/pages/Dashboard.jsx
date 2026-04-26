import React, { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { NOTES_READ_CHANGED } from '../components/StudentNotesBell.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { FileText, Calendar, ArrowRight, ScrollText, Video, ExternalLink, Target, Activity } from 'lucide-react'
import { api } from '../lib/api.js'
import { formatProgramType } from '../lib/programType.js'
import {
  getEnrollmentCycleProgress,
  isLiveFormPredatesPrimaryEnrollment,
  isProgramStartDateInFuture,
  FORM_TYPES,
} from '../lib/adminStudentInsight.js'
import {
  sessionStatusLabelPt,
  sessionAttributionLabelPt,
  sessionReasonLabelPt,
} from '../lib/calendarSessionLabels.js'
import { useEffect, useState } from 'react'

function formatDatePt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

function formatDateTimePt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

/** Agrupa linhas de enrollment_form_archives por inscrição */
function archivesByEnrollment(archiveRows) {
  const m = new Map()
  for (const r of archiveRows || []) {
    const id = r.enrollment_id
    if (!m.has(id)) {
      m.set(id, {
        enrollment_id: id,
        state: r.state,
        program_type: r.program_type,
        enrollment_created_at: r.enrollment_created_at,
        diagAt: null,
        planoAt: null,
      })
    }
    const row = m.get(id)
    if (r.form_type === FORM_TYPES.DIAG) row.diagAt = r.archived_at
    if (r.form_type === FORM_TYPES.PLANO) row.planoAt = r.archived_at
  }
  return [...m.values()].sort((a, b) => b.enrollment_id - a.enrollment_id)
}

function SessionRegistroAluno({ s }) {
  if (!s?.session_reason_code && !s?.session_attribution) return null
  return (
    <p className="mt-2 text-xs text-slate-700">
      <span className="font-medium text-slate-800">Registo:</span>{' '}
      {sessionAttributionLabelPt(s.session_attribution)} · {sessionReasonLabelPt(s.session_reason_code)}
      {s.session_reason_note ? ` — ${s.session_reason_note}` : ''}
    </p>
  )
}

export default function Dashboard() {
  const { profile, enrollments, enrollmentFormArchives, user } = useAuth()
  const toast = useToast()
  const [formActivity, setFormActivity] = useState({ diagAt: null, planoAt: null })
  const [calendarSessions, setCalendarSessions] = useState([])
  const [mentorNotesUnread, setMentorNotesUnread] = useState(0)

  const archiveGroups = useMemo(
    () => archivesByEnrollment(enrollmentFormArchives),
    [enrollmentFormArchives]
  )
  const archiveEnrollmentIds = useMemo(
    () => new Set(archiveGroups.map((g) => g.enrollment_id)),
    [archiveGroups]
  )

  const scheduledSessions = useMemo(() => {
    const list = (calendarSessions || []).filter((s) => s.session_status === 'scheduled')
    return [...list].sort((a, b) => {
      const ta = new Date(a.starts_at).getTime()
      const tb = new Date(b.starts_at).getTime()
      return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0)
    })
  }, [calendarSessions])

  const completedSessions = useMemo(() => {
    const list = (calendarSessions || []).filter((s) => s.session_status === 'completed')
    return [...list].sort((a, b) => {
      const ta = new Date(a.starts_at).getTime()
      const tb = new Date(b.starts_at).getTime()
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
    })
  }, [calendarSessions])

  const cancelledSessions = useMemo(
    () => (calendarSessions || []).filter((s) => s.session_status === 'cancelled'),
    [calendarSessions]
  )

  const notHeldSessions = useMemo(
    () => (calendarSessions || []).filter((s) => s.session_status === 'not_held'),
    [calendarSessions]
  )

  const sessionStats = useMemo(() => {
    const list = calendarSessions || []
    return {
      completed: list.filter((s) => s.session_status === 'completed').length,
      scheduled: list.filter((s) => s.session_status === 'scheduled').length,
      cancelled: list.filter((s) => s.session_status === 'cancelled').length,
      notHeld: list.filter((s) => s.session_status === 'not_held').length,
    }
  }, [calendarSessions])

  const portalDiag = profile?.portal_diagnostico_enabled === true
  const portalPlano = profile?.portal_plano_90_enabled === true

  const currentEnrollment = enrollments?.[0]

  const cycleProgress = useMemo(() => {
    if (!currentEnrollment) return null
    return getEnrollmentCycleProgress(currentEnrollment)
  }, [currentEnrollment])

  const dayPercent =
    cycleProgress?.day != null ? Math.min(100, Math.round((cycleProgress.day / 90) * 100)) : null

  useEffect(() => {
    if (!user?.id) return
    let ok = true
    ;(async () => {
      try {
        if (!portalDiag && !portalPlano) {
          if (ok) setFormActivity({ diagAt: null, planoAt: null })
          return
        }
        const primary = enrollments?.[0]
        const nEnr = enrollments?.length ?? 0
        const next = { diagAt: null, planoAt: null }
        if (portalDiag) {
          const r = await api('/forms/altzen-diagnostico-carreira')
          const u = r?.updated_at
          if (u && primary && isLiveFormPredatesPrimaryEnrollment(primary, u, nEnr)) {
            next.diagAt = null
          } else {
            next.diagAt = u || null
          }
        }
        if (portalPlano) {
          const r = await api('/forms/altzen-plano-90-dias')
          const u = r?.updated_at
          if (u && primary && isLiveFormPredatesPrimaryEnrollment(primary, u, nEnr)) {
            next.planoAt = null
          } else {
            next.planoAt = u || null
          }
        }
        if (ok) setFormActivity(next)
      } catch (e) {
        if (ok) {
          setFormActivity({ diagAt: null, planoAt: null })
          toast.error(e.message || 'Não foi possível carregar as datas dos formulários.')
        }
      }
    })()
    return () => {
      ok = false
    }
  }, [user?.id, portalDiag, portalPlano, toast, enrollments])

  useEffect(() => {
    if (!user?.id || profile?.role === 'admin') return
    let ok = true
    ;(async () => {
      try {
        const d = await api('/me/calendar-sessions')
        if (ok) setCalendarSessions(d.sessions || [])
      } catch (e) {
        if (ok) {
          setCalendarSessions([])
          toast.error(e.message || 'Não foi possível carregar os agendamentos.')
        }
      }
    })()
    return () => {
      ok = false
    }
  }, [user?.id, profile?.role, toast])

  useEffect(() => {
    if (profile?.role !== 'student' || !user?.id) return
    let ok = true
    ;(async () => {
      try {
        const d = await api('/notes/summary')
        if (ok) setMentorNotesUnread(d.unread_count ?? 0)
      } catch {
        if (ok) setMentorNotesUnread(0)
      }
    })()
    return () => {
      ok = false
    }
  }, [user?.id, profile?.role])

  useEffect(() => {
    if (profile?.role !== 'student') return
    const onUpd = () => {
      let ok = true
      ;(async () => {
        try {
          const d = await api('/notes/summary')
          if (ok) setMentorNotesUnread(d.unread_count ?? 0)
        } catch {
          if (ok) setMentorNotesUnread(0)
        }
      })()
    }
    window.addEventListener(NOTES_READ_CHANGED, onUpd)
    return () => window.removeEventListener(NOTES_READ_CHANGED, onUpd)
  }, [profile?.role])

  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  const current = currentEnrollment
  const statusLabel = current?.state === 'concluida' ? 'Concluída' : current?.state || 'ativa'
  const program = formatProgramType(current?.program_type)
  const multiEnroll = (enrollments?.length || 0) > 1
  const futureStart = Boolean(current?.started_at && isProgramStartDateInFuture(current.started_at))

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Seu painel</h1>
      <p className="mt-1 text-slate-600">
        Acompanhe o <strong>ciclo atual</strong> (inscrição mais recente). Formulários em branco significam que ainda
        não guardou respostas neste ciclo. O arquivo do ciclo anterior, quando existir, fica na secção de histórico.
      </p>

      {mentorNotesUnread > 0 && (
        <div
          className="mt-6 flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-3 text-sm text-indigo-950 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p>
            Você tem <strong>{mentorNotesUnread === 1 ? 'uma nota nova' : `${mentorNotesUnread} notas novas`}</strong> do
            mentor em <strong>Recursos</strong>.
          </p>
          <Link
            to="/recursos"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Ver notas
          </Link>
        </div>
      )}

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Ritmo no programa (ciclo atual)</h2>
        <p className="mt-1 text-sm text-slate-600">
          <strong>Dia no programa</strong>: onde você está nos 90 dias (conta a partir da data de início).{' '}
          <strong>Semana</strong>: semana de referência nesse mesmo percurso (cerca de 1 aula por semana). As datas dos
          formulários são do <strong>ciclo atual</strong>; se você entrou em um ciclo novo, salve de novo no diagnóstico
          ou no plano para atualizar.
        </p>
        {current ? (
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{program}</span>
            <span className="text-slate-500"> · </span>
            Inscrição <span className="font-mono">#{current.id}</span>
            <span className="text-slate-500"> · </span>
            Estado: {statusLabel}
            {current.started_at && (
              <>
                <span className="text-slate-500"> · </span>
                Início:{' '}
                <span className="font-medium text-slate-800">
                  {new Date(current.started_at).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}
                </span>
              </>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-800">Ainda sem inscrição associada à sua conta.</p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Dia no programa</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {cycleProgress?.day != null ? `Dia ${cycleProgress.day} / 90` : '—'}
            </p>
            {cycleProgress?.day != null && dayPercent != null && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${dayPercent}%` }}
                />
              </div>
            )}
            {current?.started_at == null && (
              <p className="mt-2 text-xs text-amber-800">Quando o mentor definir a data de início, o dia aparece aqui.</p>
            )}
            {futureStart && (
              <p className="mt-2 text-xs text-slate-600">
                O programa ainda não começou — a contagem começa na data de início acima.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Target className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Semana (referência)</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {cycleProgress?.week != null ? `Semana ${cycleProgress.week} / 12` : '—'}
            </p>
            <p className="mt-2 text-xs text-slate-500">Referência 1 aula por semana ao longo de 12 semanas.</p>
            {futureStart && (
              <p className="mt-1 text-xs text-slate-600">A semana 1 começa no dia de início do programa.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4 shrink-0 text-blue-700" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Últ. diagnóstico</span>
            </div>
            {!portalDiag ? (
              <p className="mt-2 text-sm text-slate-600">Disponível quando o mentor liberar o formulário.</p>
            ) : (
              <>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formActivity.diagAt ? formatDateTimePt(formActivity.diagAt) : 'Ainda sem registro neste ciclo'}
                </p>
                {portalDiag && (
                  <Link
                    to="/diagnostico"
                    className="mt-2 inline-flex text-xs font-medium text-blue-800 underline decoration-blue-300 hover:text-blue-950"
                  >
                    Abrir diagnóstico
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Últ. plano 90 dias</span>
            </div>
            {!portalPlano ? (
              <p className="mt-2 text-sm text-slate-600">Disponível quando o mentor liberar o formulário.</p>
            ) : (
              <>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formActivity.planoAt ? formatDateTimePt(formActivity.planoAt) : 'Ainda sem registro neste ciclo'}
                </p>
                {portalPlano && (
                  <Link
                    to="/plano-90-dias"
                    className="mt-2 inline-flex text-xs font-medium text-indigo-800 underline decoration-indigo-300 hover:text-indigo-950"
                  >
                    Abrir plano
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-slate-800">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">As suas sessões com o mentor</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Sessões associadas à sua conta no portal. Quando o mentor o associa a um agendamento, o Google envia convite
          para o e-mail da sua conta (aparece na sua agenda, por exemplo no Google Calendar). O estado de cada encontro
          (realizada, não realizada, cancelada) e o registo visível abaixo são definidos pelo mentor — refletem o que
          ocorreu na prática, independentemente do dia no programa (90 dias).
        </p>

        {calendarSessions.length > 0 && (
          <p className="mt-3 text-sm font-medium text-slate-800">
            Resumo: <span className="text-emerald-800">{sessionStats.completed} realizada(s)</span>
            {' · '}
            <span className="text-amber-900">{sessionStats.scheduled} agendada(s)</span>
            {' · '}
            <span className="text-slate-700">{sessionStats.cancelled} cancelada(s)</span>
            {' · '}
            <span className="text-rose-800">{sessionStats.notHeld} não realizada(s)</span>
          </p>
        )}

        {calendarSessions.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            Ainda não há sessões registradas. Quando o mentor associar o aluno a um evento no calendário, elas aparecem aqui.
          </p>
        )}

          {scheduledSessions.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-800">Agendadas</h3>
              <ul className="mt-2 space-y-3">
                {scheduledSessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800"
                  >
                    <p className="font-medium text-slate-900">{s.title || 'Sessão'}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateTimePt(s.starts_at)} — {formatDateTimePt(s.ends_at)}
                      {s.time_zone ? ` · ${s.time_zone}` : ''}
                    </p>
                    {s.mentor_full_name && (
                      <p className="mt-1 text-xs text-slate-500">Mentor: {s.mentor_full_name}</p>
                    )}
                    <p className="mt-1 text-xs font-medium text-indigo-700">
                      {sessionStatusLabelPt(s.session_status)}
                    </p>
                    {s.meet_link && (
                      <a
                        href={s.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:underline"
                      >
                        <Video className="h-3.5 w-3.5 shrink-0" />
                        Entrar no Google Meet
                      </a>
                    )}
                    {s.google_html_link && (
                      <a
                        href={s.google_html_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 ml-3 inline-flex items-center gap-1.5 text-xs text-slate-600 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        Abrir no Google Calendar
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {completedSessions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-800">Realizadas</h3>
              <ul className="mt-2 space-y-3">
                {completedSessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                  >
                    <p className="font-medium text-slate-900">{s.title || 'Sessão'}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateTimePt(s.starts_at)} — {formatDateTimePt(s.ends_at)}
                    </p>
                    {s.mentor_full_name && (
                      <p className="mt-1 text-xs text-slate-500">Mentor: {s.mentor_full_name}</p>
                    )}
                    <p className="mt-1 text-xs font-medium text-emerald-800">
                      {sessionStatusLabelPt(s.session_status)}
                    </p>
                    <SessionRegistroAluno s={s} />
                    {s.meet_link && (
                      <a
                        href={s.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-600 hover:underline"
                      >
                        <Video className="h-3.5 w-3.5 shrink-0" />
                        Link Meet (salvo)
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {notHeldSessions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-rose-900">Não realizadas</h3>
              <ul className="mt-2 space-y-3">
                {notHeldSessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-3 text-sm text-slate-800"
                  >
                    <p className="font-medium text-slate-900">{s.title || 'Sessão'}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateTimePt(s.starts_at)} — {formatDateTimePt(s.ends_at)}
                    </p>
                    {s.mentor_full_name && (
                      <p className="mt-1 text-xs text-slate-500">Mentor: {s.mentor_full_name}</p>
                    )}
                    <p className="mt-1 text-xs font-medium text-rose-900">
                      {sessionStatusLabelPt(s.session_status)}
                    </p>
                    <SessionRegistroAluno s={s} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cancelledSessions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-600">Canceladas</h3>
              <ul className="mt-2 space-y-3">
                {cancelledSessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800"
                  >
                    <p className="font-medium text-slate-900">{s.title || 'Sessão'}</p>
                    <p className="mt-1 text-xs text-slate-600">{formatDateTimePt(s.starts_at)}</p>
                    {s.mentor_full_name && (
                      <p className="mt-1 text-xs text-slate-500">Mentor: {s.mentor_full_name}</p>
                    )}
                    <p className="mt-1 text-xs font-medium text-slate-700">
                      {sessionStatusLabelPt(s.session_status)}
                    </p>
                    <SessionRegistroAluno s={s} />
                  </li>
                ))}
              </ul>
            </div>
          )}
      </section>

      {multiEnroll && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Há <strong>inscrições anteriores</strong> na sua conta — os formulários editáveis e o ritmo acima usam sempre a
          inscrição mais recente.
        </p>
      )}

      <h2 className="mt-8 text-lg font-bold text-slate-800">Formulários do ciclo atual</h2>
      {portalDiag || portalPlano ? (
        <p className="mt-1 text-sm text-slate-600">
          Estes links abrem o diagnóstico e o plano que serão usados na mentoria <strong>agora</strong> (gravam na sua
          conta).
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-600">
          O seu mentor pode liberar o diagnóstico e o plano de 90 dias quando for o momento; até lá, estes atalhos ficam
          ocultos.
        </p>
      )}
      {!portalDiag && !portalPlano && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          <p className="font-medium text-amber-900">Diagnóstico e plano de 90 dias</p>
          <p className="mt-1 text-amber-900/90">
            Ainda não estão disponíveis no seu portal. Quando forem liberados, aparecem aqui e no menu superior.
          </p>
        </div>
      )}
      <ul className="mt-3 space-y-3">
        {portalDiag && (
          <li>
            <Link
              to="/diagnostico"
              className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-4 transition hover:shadow"
            >
              <span className="flex items-center gap-2 font-medium text-slate-900">
                <FileText className="h-5 w-5 text-blue-700" />
                Diagnóstico de carreira
              </span>
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </Link>
          </li>
        )}
        {portalPlano && (
          <li>
            <Link
              to="/plano-90-dias"
              className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 transition hover:shadow"
            >
              <span className="flex items-center gap-2 font-medium text-slate-900">
                <Calendar className="h-5 w-5 text-indigo-700" />
                Plano de 90 dias
              </span>
              <ArrowRight className="h-5 w-5 text-indigo-600" />
            </Link>
          </li>
        )}
        <li>
          <Link
            to="/recursos#contratos"
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 transition hover:shadow"
          >
            <span className="flex items-center gap-2 font-medium text-slate-900">
              <ScrollText className="h-5 w-5 text-emerald-800" />
              Contratos assinados
            </span>
            <ArrowRight className="h-5 w-5 text-emerald-700" />
          </Link>
        </li>
      </ul>

      {archiveGroups.length > 0 && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-base font-bold text-slate-900">Histórico por inscrição (arquivo)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Quando um ciclo foi marcado como <strong>concluída</strong> ou <strong>encerrada</strong>, o portal pode
            ter guardado uma cópia do diagnóstico e do plano na altura do fecho. Aqui pode consultar (só leitura) ou
            exportar por PDF a partir da página.
          </p>
          <ul className="mt-4 space-y-4">
            {archiveGroups.map((g) => {
              const enRow = enrollments?.find((e) => e.id === g.enrollment_id)
              const prog = enRow ? getEnrollmentCycleProgress(enRow) : null
              return (
                <li
                  key={g.enrollment_id}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                >
                  <p className="font-medium text-slate-900">
                    Inscrição <span className="font-mono">#{g.enrollment_id}</span> ·{' '}
                    {formatProgramType(g.program_type)} · {g.state === 'concluida' ? 'Concluída' : g.state || '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Criada em {formatDateTimePt(g.enrollment_created_at)}
                    {g.diagAt && (
                      <>
                        {' '}
                        · Diagnóstico arquivado em {formatDateTimePt(g.diagAt)}
                      </>
                    )}
                    {g.planoAt && (
                      <>
                        {' '}
                        · Plano arquivado em {formatDateTimePt(g.planoAt)}
                      </>
                    )}
                  </p>
                  {prog?.day != null && (
                    <p className="mt-1 text-xs text-slate-600">
                      Ritmo de referência ({prog.refLabel}): dia {prog.day}/90
                      {prog.week != null ? ` · semana ${prog.week}/12` : ''}
                    </p>
                  )}
                  {prog?.day == null && prog?.refLabel === 'antes do início' && enRow?.started_at && (
                    <p className="mt-1 text-xs text-slate-600">
                      Ritmo ainda não aplicável — início em{' '}
                      {new Date(enRow.started_at).toLocaleDateString('pt-BR', { dateStyle: 'medium' })} (contagem a
                      partir desse dia).
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.diagAt && portalDiag && (
                      <Link
                        to={`/diagnostico?arquivo=${g.enrollment_id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900 hover:bg-blue-100 sm:text-sm"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        Ver diagnóstico (arquivo)
                      </Link>
                    )}
                    {g.planoAt && portalPlano && (
                      <Link
                        to={`/plano-90-dias?arquivo=${g.enrollment_id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-900 hover:bg-indigo-100 sm:text-sm"
                      >
                        <Calendar className="h-4 w-4 shrink-0" />
                        Ver plano (arquivo)
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {multiEnroll && enrollments.some((en, i) => i > 0 && !archiveEnrollmentIds.has(en.id)) && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">Outras inscrições (referência)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Inscrições antigas sem secção de arquivo acima (ex.: fecho antes do arquivo automático ou sem formulários
            guardados na altura).
          </p>
          <ul className="mt-3 space-y-3">
            {enrollments.slice(1).filter((en) => !archiveEnrollmentIds.has(en.id)).map((en) => {
              const prog = getEnrollmentCycleProgress(en)
              return (
                <li
                  key={en.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-800"
                >
                  <p className="font-medium text-slate-900">
                    Inscrição <span className="font-mono">#{en.id}</span> · {formatProgramType(en.program_type)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Estado: {en.state === 'concluida' ? 'Concluída' : en.state || '—'} · Início{' '}
                    {formatDatePt(en.started_at)} · Fim {formatDatePt(en.ended_at)}
                  </p>
                  {prog?.day != null && (
                    <p className="mt-1 text-xs text-slate-600">
                      Ritmo de referência ({prog.refLabel}): dia {prog.day}/90
                      {prog.week != null ? ` · semana ${prog.week}/12` : ''}
                    </p>
                  )}
                  {prog?.day == null && prog?.refLabel === 'antes do início' && en.started_at && (
                    <p className="mt-1 text-xs text-slate-600">
                      Ritmo ainda não aplicável — início em{' '}
                      {new Date(en.started_at).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
