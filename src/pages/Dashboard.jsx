import React, { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { FileText, Calendar, ArrowRight, TrendingUp, ScrollText, Video, ExternalLink } from 'lucide-react'
import { api } from '../lib/api.js'
import { formatProgramType } from '../lib/programType.js'
import { getEnrollmentCycleProgress, FORM_TYPES } from '../lib/adminStudentInsight.js'
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

function sessionStatusLabel(status) {
  if (status === 'completed') return 'Concluída'
  if (status === 'cancelled') return 'Cancelada'
  if (status === 'scheduled') return 'Agendada'
  return status || '—'
}

export default function Dashboard() {
  const { profile, enrollments, enrollmentFormArchives, user } = useAuth()
  const toast = useToast()
  const [lastActivity, setLastActivity] = useState(null)
  const [calendarSessions, setCalendarSessions] = useState([])

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

  const portalDiag = profile?.portal_diagnostico_enabled === true
  const portalPlano = profile?.portal_plano_90_enabled === true

  useEffect(() => {
    if (!user?.id) return
    let ok = true
    ;(async () => {
      try {
        const reqs = []
        if (portalDiag) reqs.push(api('/forms/altzen-diagnostico-carreira'))
        if (portalPlano) reqs.push(api('/forms/altzen-plano-90-dias'))
        if (!reqs.length) {
          if (ok) setLastActivity(null)
          return
        }
        const results = await Promise.all(reqs)
        const times = results.map((r) => r.updated_at).filter(Boolean).map((t) => new Date(t).getTime())
        if (ok && times.length) setLastActivity(new Date(Math.max(...times)).toLocaleString('pt-BR'))
        if (ok && !times.length) setLastActivity(null)
      } catch (e) {
        if (ok) toast.error(e.message || 'Não foi possível carregar a última atividade nos formulários.')
      }
    })()
    return () => {
      ok = false
    }
  }, [user?.id, portalDiag, portalPlano, toast])

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

  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  const current = enrollments?.[0]
  const statusLabel = current?.state === 'concluida' ? 'Concluída' : current?.state || 'ativa'
  const program = formatProgramType(current?.program_type)
  const multiEnroll = (enrollments?.length || 0) > 1

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Seu painel</h1>
      <p className="mt-1 text-slate-600">
        Acompanhe o <strong>ciclo atual</strong> (inscrição mais recente). Formulários em branco significam que ainda
        não guardou respostas neste ciclo. O arquivo do ciclo anterior, quando existir, fica na secção de histórico.
      </p>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-slate-800">
          <Calendar className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">As suas sessões com o mentor</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Sessões associadas à sua conta no portal. Quando o mentor o associa a um agendamento, o Google envia convite
          para o e-mail da sua conta (aparece na sua agenda, por exemplo no Google Calendar).
        </p>

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
                    <p className="mt-1 text-xs font-medium text-indigo-700">{sessionStatusLabel(s.session_status)}</p>
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
              <h3 className="text-sm font-semibold text-slate-800">Concluídas</h3>
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

          {cancelledSessions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-600">Canceladas</h3>
              <ul className="mt-2 space-y-2">
                {cancelledSessions.map((s) => (
                  <li key={s.id} className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{s.title || 'Sessão'}</span>
                    {' · '}
                    {formatDateTimePt(s.starts_at)}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">Ciclo atual (inscrição)</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900">{program}</p>
          <p className="text-sm text-slate-600">
            Inscrição #{current?.id ?? '—'} · Estado: {statusLabel}
          </p>
          {current?.started_at && (
            <p className="mt-1 text-xs text-slate-500">Início: {formatDatePt(current.started_at)}</p>
          )}
          {multiEnroll && (
            <p className="mt-2 text-xs text-slate-500">
              Há inscrições anteriores na sua conta — o portal usa sempre a linha mais recente para os formulários
              editáveis abaixo.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Último salvamento (ciclo atual)</p>
          <p className="mt-2 text-lg text-slate-900">{lastActivity || 'Ainda sem dados salvos neste ciclo'}</p>
        </div>
      </div>

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
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
