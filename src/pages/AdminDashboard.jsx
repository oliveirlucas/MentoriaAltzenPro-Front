import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { Navigate } from 'react-router-dom'
import {
  Users,
  Eye,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CalendarClock,
  CalendarDays,
  CircleCheck,
  Ban,
  HelpCircle,
  Layers,
} from 'lucide-react'
import { ADMIN_STUDENTS_REFRESH } from '../lib/adminEvents.js'
import AdminCreateStudentModal from '../components/AdminCreateStudentModal.jsx'
import { formatProgramType } from '../lib/programType.js'
import { computeAdminListAttention } from '../lib/adminStudentInsight.js'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

function enrollmentStateLabel(state) {
  switch (state) {
    case 'ativa':
      return 'Ativa'
    case 'agendada':
      return 'Agendada'
    case 'concluida':
      return 'Concluída'
    case 'encerrada':
      return 'Encerrada'
    default:
      return state ? String(state) : '—'
  }
}

function attentionChipClass(band) {
  switch (band) {
    case 'critical':
      return 'border-rose-300 bg-rose-50 text-rose-950'
    case 'late':
      return 'border-orange-300 bg-orange-50 text-orange-950'
    case 'watch':
      return 'border-amber-300 bg-amber-50 text-amber-950'
    case 'info':
      return 'border-sky-300 bg-sky-50 text-sky-950'
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }
}

function enrollmentStateChipClass(state) {
  switch (state) {
    case 'ativa':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'agendada':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'concluida':
      return 'border-indigo-200 bg-indigo-50 text-indigo-950'
    case 'encerrada':
      return 'border-slate-300 bg-slate-100 text-slate-800'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

function KpiCard({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
  }
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-white/80 p-2 text-slate-600 shadow-sm" aria-hidden>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { profile, loading } = useAuth()
  const [students, setStudents] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(true)
  const [createStudentOpen, setCreateStudentOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadStudents = useCallback(async () => {
    if (profile?.role !== 'admin') return
    setBusy(true)
    setErr('')
    try {
      const d = await api('/admin/students')
      setStudents(d.students || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }, [profile?.role])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    const handler = () => {
      loadStudents()
    }
    window.addEventListener(ADMIN_STUDENTS_REFRESH, handler)
    return () => window.removeEventListener(ADMIN_STUDENTS_REFRESH, handler)
  }, [loadStudents])

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const kpis = useMemo(() => {
    let ativos = 0
    let agendados = 0
    let fechados = 0
    let semInscricao = 0
    let multiCiclo = 0
    let outros = 0

    const now = Date.now()
    const ms7d = 7 * 864e5
    let atividade7d = 0

    for (const s of students) {
      if (s.enrollment_count > 1) multiCiclo += 1

      if (s.last_form_activity) {
        const t = new Date(s.last_form_activity).getTime()
        if (!Number.isNaN(t) && now - t <= ms7d) atividade7d += 1
      }

      if (!s.enrollment_id) {
        semInscricao += 1
        continue
      }
      const st = s.enrollment_state
      if (st === 'ativa') ativos += 1
      else if (st === 'agendada') agendados += 1
      else if (st === 'concluida' || st === 'encerrada') fechados += 1
      else outros += 1
    }

    return {
      total: students.length,
      ativos,
      agendados,
      fechados,
      semInscricao,
      multiCiclo,
      outros,
      atividade7d,
    }
  }, [students])

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => {
      const name = (s.full_name || '').toLowerCase()
      const email = (s.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [students, searchQuery])

  const totalFiltered = filteredStudents.length
  const totalPages = useMemo(
    () => (totalFiltered === 0 ? 0 : Math.ceil(totalFiltered / pageSize)),
    [totalFiltered, pageSize]
  )

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages)

  const pageRows = useMemo(() => {
    if (totalPages === 0) return []
    const start = (safePage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, safePage, pageSize, totalPages])

  if (loading) return <div className="text-slate-500">Carregando…</div>
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-col gap-3 sm:hidden">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users className="h-8 w-8 shrink-0" aria-hidden />
            Alunos
          </h1>
          <Link
            to="/admin/calendario"
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
            Calendário
          </Link>
          <button
            type="button"
            onClick={() => setCreateStudentOpen(true)}
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-900 hover:bg-indigo-100"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
            Criar aluno
          </button>
        </div>

        <div className="hidden sm:block sm:overflow-hidden sm:pt-0.5">
          <div className="float-right mb-2 ml-4 flex flex-wrap items-center justify-end gap-2">
            <Link
              to="/admin/calendario"
              className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
              Calendário
            </Link>
            <button
              type="button"
              onClick={() => setCreateStudentOpen(true)}
              className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-100"
            >
              <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
              Criar aluno
            </button>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users className="h-8 w-8 shrink-0" aria-hidden />
            Alunos
          </h1>
        </div>

        <p className="clear-both mt-1 text-slate-600">
          Visão geral de progresso. A coluna <strong>Mentoria</strong> mostra a última inscrição do aluno; se tiver
          vários ciclos, o número entre parêntesis indica quantas inscrições existem (detalhe na ficha). A coluna{' '}
          <strong>Prioridade</strong> resume atrasos, pendências de formulários e situações que pedem atenção (passe o
          rato para ver o detalhe).
        </p>
      </div>

      <AdminCreateStudentModal open={createStudentOpen} onClose={() => setCreateStudentOpen(false)} />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      {!busy && students.length > 0 && (
        <section className="mt-6" aria-label="Indicadores">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Resumo</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
            <KpiCard icon={Users} label="Total de alunos" value={kpis.total} tone="slate" hint="Conta no portal" />
            <KpiCard
              icon={UserCheck}
              label="Mentoria ativa"
              value={kpis.ativos}
              tone="emerald"
              hint="Última inscrição com estado «ativa»"
            />
            <KpiCard
              icon={CalendarClock}
              label="Agendados"
              value={kpis.agendados}
              tone="amber"
              hint="Última inscrição «agendada»"
            />
            <KpiCard
              icon={CircleCheck}
              label="Concluídos / encerrados"
              value={kpis.fechados}
              tone="violet"
              hint="Última inscrição «concluída» ou «encerrada»"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Layers}
              label="Com mais de um ciclo"
              value={kpis.multiCiclo}
              tone="indigo"
              hint="Várias inscrições na conta"
            />
            <KpiCard
              icon={Users}
              label="Atividade (7 dias)"
              value={kpis.atividade7d}
              tone="emerald"
              hint="Algum formulário gravado na última semana"
            />
            {kpis.semInscricao > 0 && (
              <KpiCard
                icon={HelpCircle}
                label="Sem inscrição"
                value={kpis.semInscricao}
                tone="rose"
                hint="Sem linha de mentoria — rever dados"
              />
            )}
            {kpis.outros > 0 && (
              <KpiCard
                icon={Ban}
                label="Outro estado"
                value={kpis.outros}
                tone="slate"
                hint="Última inscrição com estado fora do conjunto habitual"
              />
            )}
          </div>
        </section>
      )}

      {busy ? (
        <p className="mt-4 text-slate-500">Carregando lista…</p>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <label htmlFor="admin-student-search" className="text-xs font-medium uppercase text-slate-500">
                Filtrar por nome ou e-mail
              </label>
              <div className="relative mt-1 max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  id="admin-student-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex.: Maria ou @gmail"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-indigo-500/30 focus:border-indigo-500 focus:ring-2"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="admin-page-size" className="text-xs text-slate-500">
                Por página
              </label>
              <select
                id="admin-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {searchQuery.trim()
              ? `${totalFiltered} resultado(s) com o filtro atual.`
              : `${students.length} aluno(s) no total.`}
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 font-semibold">Nome / E-mail</th>
                  <th className="p-3 font-semibold">Mentoria</th>
                  <th className="p-3 font-semibold">Estado</th>
                  <th className="p-3 font-semibold">Prioridade</th>
                  <th className="p-3 font-semibold">Último envio</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {students.length === 0
                        ? 'Nenhum aluno registado.'
                        : 'Nenhum aluno corresponde ao filtro. Limpe a pesquisa ou tente outro termo.'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s) => {
                    const att = computeAdminListAttention(s)
                    return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{s.full_name || '—'}</div>
                        <div className="text-xs text-slate-500">{s.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-800">{formatProgramType(s.program_type)}</span>
                        {s.enrollment_count > 1 && (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            ({s.enrollment_count} inscrições)
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {!s.enrollment_id ? (
                          <span className="inline-flex rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                            Sem inscrição
                          </span>
                        ) : (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${enrollmentStateChipClass(s.enrollment_state)}`}
                          >
                            {enrollmentStateLabel(s.enrollment_state)}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[220px] p-3">
                        <span
                          className={`inline-flex max-w-full cursor-default rounded-full border px-2.5 py-0.5 text-xs font-semibold ${attentionChipClass(att.band)}`}
                          title={att.detail}
                        >
                          <span className="truncate">{att.label}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {s.last_form_activity
                          ? new Date(s.last_form_activity).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/admin/alunos/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detalhe
                        </Link>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-col items-stretch justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-600">
                Página <span className="font-semibold text-slate-900">{safePage}</span> de{' '}
                <span className="font-semibold text-slate-900">{totalPages}</span>
                <span className="text-slate-500"> · {totalFiltered} linha(s)</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Seguinte
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
