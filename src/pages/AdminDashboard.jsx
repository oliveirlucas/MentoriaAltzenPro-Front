import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../lib/api.js'
import { Navigate } from 'react-router-dom'
import {
  Users,
  UserPlus,
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
import AdminStudentsDataTable from '../components/AdminStudentsDataTable.jsx'

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
  const toast = useToast()
  const [students, setStudents] = useState([])
  const [busy, setBusy] = useState(true)
  const [createStudentOpen, setCreateStudentOpen] = useState(false)

  const loadStudents = useCallback(async () => {
    if (profile?.role !== 'admin') return
    setBusy(true)
    try {
      const d = await api('/admin/students')
      setStudents(d.students || [])
    } catch (e) {
      toast.error(e.message || 'Não foi possível carregar a lista de alunos.')
    } finally {
      setBusy(false)
    }
  }, [profile?.role, toast])

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
          vários ciclos, o número entre parênteses indica quantas inscrições existem (detalhe na ficha). A coluna{' '}
          <strong>Prioridade</strong> resume atrasos, pendências de formulários e situações que pedem atenção (passe o
          rato para ver o detalhe).
        </p>
      </div>

      <AdminCreateStudentModal open={createStudentOpen} onClose={() => setCreateStudentOpen(false)} />

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

      {busy ? <p className="mt-4 text-slate-500">Carregando lista…</p> : <AdminStudentsDataTable students={students} />}
    </div>
  )
}
