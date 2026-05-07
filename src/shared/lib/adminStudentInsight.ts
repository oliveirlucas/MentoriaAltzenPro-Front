import { formatProgramType } from '@/shared/lib/programType'

export const FORM_TYPES = {
  DIAG: 'altzen-diagnostico-carreira',
  PLANO: 'altzen-plano-90-dias',
} as const

export type FormTypeValue = (typeof FORM_TYPES)[keyof typeof FORM_TYPES]

type EnrollmentLike = {
  state?: string
  started_at?: string | null
  ended_at?: string | null
  created_at?: string | null
}

export function isLiveFormPredatesPrimaryEnrollment(
  primaryEnrollment: EnrollmentLike | null | undefined,
  formUpdatedAt: string | null | undefined,
  enrollmentCount: number
): boolean {
  if (enrollmentCount < 2 || !primaryEnrollment || !formUpdatedAt) return false
  const anchor = primaryEnrollment.created_at
  if (anchor == null || String(anchor).trim() === '') return false
  const tForm = new Date(formUpdatedAt).getTime()
  const tEnr = new Date(anchor).getTime()
  if (Number.isNaN(tForm) || Number.isNaN(tEnr)) return false
  return tForm < tEnr
}

const PROFILE_MAP: Record<string, string> = {
  A: 'Transição p/ dev',
  B: 'Júnior consolidando base',
  C: 'Pleno → senioridade',
  D: 'Outro',
  E: 'Estagiário, iniciando a carreira',
  F: 'Ainda pensando em entrar pra área',
}

function sumScoredObject(obj: unknown): number {
  if (!obj || typeof obj !== 'object') return 0
  return Object.values(obj as Record<string, unknown>).reduce<number>(
    (acc, v) => acc + (Number(v) || 0),
    0
  )
}

export function getDiagnosticoSummary(payload: Record<string, unknown> | null): {
  tech: number
  career: number
  techMax: number
  careerMax: number
  profileCode: string
  profileLabel: string
  goals: unknown[]
} | null {
  if (!payload || typeof payload !== 'object') return null
  const tech = sumScoredObject(payload.techScores)
  const career = sumScoredObject(payload.careerScores)
  const p = typeof payload.profile === 'string' ? payload.profile : ''
  const other =
    typeof payload.profileOther === 'string' ? payload.profileOther.trim() : ''
  const profileLine =
    p && PROFILE_MAP[p]
      ? p === 'D' && other
        ? `Perfil D: outro — ${other}`
        : `Perfil ${p}: ${PROFILE_MAP[p]}`
      : p
        ? `Perfil ${p}`
        : '—'
  return {
    tech,
    career,
    techMax: 140,
    careerMax: 100,
    profileCode: p || '—',
    profileLabel: profileLine,
    goals: Array.isArray(payload.goals) ? payload.goals : [],
  }
}

export function getPlanoSummary(payload: Record<string, unknown> | null): {
  headline: string
  hasWeeksWithText: boolean
} | null {
  if (!payload || typeof payload !== 'object') return null
  const mainGoal = payload.mainGoal as { objective?: string } | undefined
  const capa = payload.capa as { title?: string } | undefined
  const objective = typeof mainGoal?.objective === 'string' ? mainGoal.objective.trim() : ''
  const capaTitle = typeof capa?.title === 'string' ? capa.title.trim() : ''
  const firstLine = objective || capaTitle
  return {
    headline: firstLine ? (firstLine.length > 200 ? `${firstLine.slice(0, 200)}…` : firstLine) : '—',
    hasWeeksWithText:
      Array.isArray(payload.weeks) &&
      (payload.weeks as unknown[]).some(
        (w) =>
          w &&
          typeof w === 'object' &&
          ['weekObjective', 'techFocus', 'entregas', 'evidence'].some((k) =>
            String((w as Record<string, unknown>)[k] || '').trim()
          )
      ),
  }
}

const PROGRAM_DAY_TIMEZONE = 'America/Sao_Paulo'

function parseEnrollmentDateParts(startedAt: string | null | undefined): {
  y: number
  mo: number
  d: number
} | null {
  if (startedAt == null || String(startedAt).trim() === '') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(startedAt).trim())
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null
    return { y, mo, d }
  }
  const t = new Date(startedAt)
  if (Number.isNaN(t.getTime())) return null
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

function getCivilDatePartsInTimezone(date: Date, timeZone: string): { y: number; mo: number; d: number } | null {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(date)
  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const mo = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  return { y, mo, d }
}

function compareCivil(a: { y: number; mo: number; d: number }, b: { y: number; mo: number; d: number }): number {
  if (a.y !== b.y) return a.y - b.y
  if (a.mo !== b.mo) return a.mo - b.mo
  return a.d - b.d
}

function civilDiffDays(
  start: { y: number; mo: number; d: number },
  end: { y: number; mo: number; d: number }
): number {
  const t0 = Date.UTC(start.y, start.mo - 1, start.d)
  const t1 = Date.UTC(end.y, end.mo - 1, end.d)
  return Math.round((t1 - t0) / 864e5)
}

export function getDayInProgram(startedAt: string | null | undefined, now = new Date()): number | null {
  const start = parseEnrollmentDateParts(startedAt ?? undefined)
  const ref = getCivilDatePartsInTimezone(now, PROGRAM_DAY_TIMEZONE)
  if (!start || !ref) return null
  const diff = civilDiffDays(start, ref) + 1
  if (diff < 1) return null
  if (diff > 90) return 90
  return diff
}

export function isProgramStartDateInFuture(startedAt: string | null | undefined, now = new Date()): boolean {
  const start = parseEnrollmentDateParts(startedAt ?? undefined)
  const today = getCivilDatePartsInTimezone(now, PROGRAM_DAY_TIMEZONE)
  if (!start || !today) return false
  return compareCivil(today, start) < 0
}

export function getExpectedMentorWeek12(day: number | null): number | null {
  if (day == null) return null
  return Math.min(12, Math.max(1, Math.floor((day - 1) / 7) + 1))
}

export function getEnrollmentCycleProgress(
  enrollment: EnrollmentLike | null | undefined,
  now = new Date()
): { day: number | null; week: number | null; refLabel: string } | null {
  if (!enrollment) return null
  const started = enrollment.started_at
  if (started == null || String(started).trim() === '') {
    return { day: null, week: null, refLabel: 'sem data de início' }
  }
  let ref = now
  let refLabel = 'hoje'
  const endedRaw = enrollment.ended_at
  if (endedRaw != null && String(endedRaw).trim() !== '') {
    const endD = new Date(endedRaw)
    if (!Number.isNaN(endD.getTime())) {
      ref = endD
      refLabel = 'no fecho'
    }
  }
  const day = getDayInProgram(started, ref)
  const week = getExpectedMentorWeek12(day)
  if (day == null && isProgramStartDateInFuture(started, ref)) {
    return { day: null, week: null, refLabel: 'antes do início' }
  }
  return { day, week, refLabel }
}

type HealthLevel = 'high' | 'medium' | 'low' | 'info'

export function computeMentorHealth({
  enrollment,
  form_snapshots,
  now = new Date(),
  portal,
}: {
  enrollment: EnrollmentLike | null | undefined
  form_snapshots: Array<{ form_type: string; updated_at: string | null }>
  now?: Date
  portal?: { portal_diagnostico_enabled?: boolean; portal_plano_90_enabled?: boolean }
}): {
  day: number | null
  week: number | null
  state: string
  daysSincePlano: number | null
  lastPlanoAt: string | undefined
  lastDiagAt: string | undefined
  hasPlano: boolean
  hasDiag: boolean
  status: string
  messages: { level: HealthLevel; text: string }[]
} {
  const usePlano = portal == null ? true : !!portal.portal_plano_90_enabled
  const useDiag = portal == null ? true : !!portal.portal_diagnostico_enabled
  const forms = form_snapshots || []
  const by = Object.fromEntries(forms.map((f) => [f.form_type, f])) as Record<
    string,
    { updated_at: string } | undefined
  >
  const state = enrollment?.state || ''
  const started = enrollment?.started_at

  const day = getDayInProgram(started, now)
  const week = getExpectedMentorWeek12(day)
  const notYetStarted = isProgramStartDateInFuture(started, now)

  const planU = by[FORM_TYPES.PLANO]?.updated_at
  const diaU = by[FORM_TYPES.DIAG]?.updated_at

  const lastPlanoAt = planU ? new Date(planU) : null
  const daysSincePlano =
    lastPlanoAt && !Number.isNaN(lastPlanoAt.getTime())
      ? Math.floor((now.getTime() - lastPlanoAt.getTime()) / 864e5)
      : null

  const messages: { level: HealthLevel; text: string }[] = []
  if (state === 'ativa' && (started == null || String(started).trim() === '')) {
    messages.push({
      level: 'low',
      text: 'Defina a data de início da mentoria para acompanhar semanas e atraso.',
    })
  }
  if (notYetStarted && (state === 'ativa' || state === 'agendada')) {
    messages.push({
      level: 'info',
      text: 'A data de início ainda não chegou — dia e semana de referência só passam a contar a partir desse dia (dia 1 = dia de início).',
    })
  }
  if (!notYetStarted) {
    if (usePlano && state === 'ativa' && day && day > 1 && !planU) {
      messages.push({
        level: 'high',
        text: 'Plano 90 dias ainda sem registro com o programa em curso (início +2 dias ou mais).',
      })
    } else if (usePlano && state === 'ativa' && planU && (daysSincePlano ?? 0) > 14 && day && day > 1) {
      messages.push({
        level: 'high',
        text: `Plano sem atualização há cerca de ${daysSincePlano} dia(s) — risco de atraso de execução (aulas/ritmo).`,
      })
    } else if (usePlano && state === 'ativa' && planU && (daysSincePlano ?? 0) > 7) {
      messages.push({
        level: 'medium',
        text: `Cerca de ${daysSincePlano} dia(s) sem novo salvamento do plano no portal.`,
      })
    } else if (usePlano && state === 'ativa' && planU && (daysSincePlano ?? 0) > 3) {
      messages.push({
        level: 'low',
        text: 'Alguns dias sem registro do plano — acompanhe na mentoria de rotina.',
      })
    }
  }
  if (useDiag && (state === 'ativa' || state === 'agendada') && !diaU && !notYetStarted) {
    if (day && day >= 14) {
      messages.push({
        level: 'medium',
        text: 'Diagnóstico ainda vazio após 2 semanas (recomendado no início do ciclo).',
      })
    } else if (day && day >= 7) {
      messages.push({ level: 'low', text: 'Ainda sem diagnóstico salvo — alinhe preenchimento com o aluno.' })
    }
  }
  if (day && day >= 80 && state === 'ativa') {
    messages.push({
      level: 'info',
      text: 'Aproximando o fim da janela de 90 dias — preparar o fechamento ou redefinir o plano.',
    })
  }

  let status = 'ok'
  if (messages.some((n) => n.level === 'high')) status = 'critico'
  else if (messages.some((n) => n.level === 'medium')) status = 'atraso'
  else if (messages.some((n) => n.level === 'low')) status = 'atencao'

  return {
    day,
    week,
    state,
    daysSincePlano,
    lastPlanoAt: planU,
    lastDiagAt: diaU,
    hasPlano: !!planU,
    hasDiag: !!diaU,
    status,
    messages,
  }
}

export type AdminStudentListRow = Record<string, unknown> & {
  enrollment_id?: number
  enrollment_state?: string
  started_at?: string | null
  ended_at?: string | null
  enrollment_created_at?: string | null
  enrollment_count?: number
  snap_diag_updated_at?: string | null
  snap_plano_updated_at?: string | null
  portal_diagnostico_enabled?: boolean
  portal_plano_90_enabled?: boolean
  last_form_activity?: string | null
}

export function computeAdminListAttention(
  row: AdminStudentListRow,
  now = new Date()
): { band: 'ok' | 'info' | 'watch' | 'late' | 'critical'; label: string; detail: string } {
  if (!row?.enrollment_id) {
    return { band: 'critical', label: 'Crítico', detail: 'Sem inscrição de mentoria — criar ou associar inscrição.' }
  }
  const st = row.enrollment_state || ''
  if (st === 'concluida' || st === 'encerrada') {
    return { band: 'ok', label: 'Encerrado', detail: 'Ciclo concluído ou encerrado — sem alertas de ritmo ativos.' }
  }

  const enrollment: EnrollmentLike = {
    state: st,
    started_at: row.started_at,
    ended_at: row.ended_at,
    created_at: row.enrollment_created_at,
  }
  const primary = enrollment
  const nEnr = Number(row.enrollment_count) || 1
  const rawForms: { form_type: string; updated_at: string }[] = []
  if (row.snap_diag_updated_at) {
    rawForms.push({ form_type: FORM_TYPES.DIAG, updated_at: row.snap_diag_updated_at })
  }
  if (row.snap_plano_updated_at) {
    rawForms.push({ form_type: FORM_TYPES.PLANO, updated_at: row.snap_plano_updated_at })
  }
  const formsForCurrentCycle = rawForms.map((f) =>
    isLiveFormPredatesPrimaryEnrollment(primary, f.updated_at, nEnr)
      ? { form_type: f.form_type, updated_at: null }
      : f
  )

  const portal =
    row.portal_diagnostico_enabled !== undefined || row.portal_plano_90_enabled !== undefined
      ? {
          portal_diagnostico_enabled: !!row.portal_diagnostico_enabled,
          portal_plano_90_enabled: !!row.portal_plano_90_enabled,
        }
      : undefined

  const h = computeMentorHealth({
    enrollment,
    form_snapshots: formsForCurrentCycle,
    now,
    portal,
  })

  if (st === 'agendada') {
    return {
      band: 'watch',
      label: 'Agendada',
      detail: 'Mentoria ainda não iniciada — confirmar data de início e onboarding com o aluno.',
    }
  }

  let band:
    | 'ok'
    | 'info'
    | 'watch'
    | 'late'
    | 'critical' =
    h.status === 'critico'
      ? 'critical'
      : h.status === 'atraso'
        ? 'late'
        : h.status === 'atencao'
          ? 'watch'
          : h.messages.some((m) => m.level === 'info')
            ? 'info'
            : 'ok'

  const pickDetail = () => {
    const m =
      h.messages.find((n) => n.level === 'high') ||
      h.messages.find((n) => n.level === 'medium') ||
      h.messages.find((n) => n.level === 'low') ||
      h.messages.find((n) => n.level === 'info')
    return m?.text || ''
  }

  let detail = pickDetail()

  if (st === 'ativa' && row.last_form_activity) {
    const t = new Date(row.last_form_activity).getTime()
    if (!Number.isNaN(t)) {
      const days = Math.floor((now.getTime() - t) / 864e5)
      if (days > 21 && (band === 'ok' || band === 'info')) {
        band = 'watch'
        detail = `Sem salvamento em qualquer formulário há ${days} dia(s) — vale uma conversa na mentoria.`
      }
    }
  } else if (st === 'ativa' && !row.last_form_activity && h.day && h.day > 7) {
    if (band === 'ok' || band === 'info') {
      band = 'watch'
      detail = 'Nenhum formulário salvo no portal após vários dias de ciclo em curso.'
    }
  }

  if (!detail) {
    detail =
      band === 'ok'
        ? 'Ritmo e formulários dentro do esperado na lista automática (ver ficha para contexto completo).'
        : '—'
  }

  const label =
    band === 'critical'
      ? 'Crítico'
      : band === 'late'
        ? 'Atraso'
        : band === 'watch'
          ? 'Atenção'
          : band === 'info'
            ? 'Info'
            : 'OK'

  return { band, label, detail }
}

const FORM_TITLES: Record<string, string> = {
  [FORM_TYPES.DIAG]: 'Formulário: diagnóstico de carreira',
  [FORM_TYPES.PLANO]: 'Formulário: plano de 90 dias',
}

type NoteLike = {
  id?: number
  created_at?: string
  visible_to_student?: boolean
  attachment_links?: unknown[]
  attachment_files?: unknown[]
  title?: string
  body?: string
}

type EnrollmentRow = { id?: number; created_at?: string; program_type?: string; state?: string }

export function buildTimeline({
  notes,
  form_snapshots,
  enrollments,
}: {
  notes?: NoteLike[]
  form_snapshots?: Array<{ form_type: string; updated_at: string }>
  enrollments?: EnrollmentRow[]
}): Array<Record<string, unknown>> {
  const ev: Array<Record<string, unknown>> = []
  for (const n of notes || []) {
    const links = Array.isArray(n.attachment_links) ? n.attachment_links.length : 0
    const files = Array.isArray(n.attachment_files) ? n.attachment_files.length : 0
    const bits = [n.visible_to_student ? 'Visível ao aluno' : 'Apenas mentor']
    if (links) bits.push(`${links} link(s)`)
    if (files) bits.push(`${files} anexo(s)`)
    ev.push({
      kind: 'nota',
      at: n.created_at,
      title: n.title || 'Nota do mentor',
      sub: bits.join(' · '),
      body: n.body,
      id: `n-${n.id}`,
      noteId: n.id,
    })
  }
  for (const f of form_snapshots || []) {
    ev.push({
      kind: 'formulario',
      at: f.updated_at,
      form_type: f.form_type,
      title: FORM_TITLES[f.form_type] || f.form_type,
      id: `f-${f.form_type}`,
    })
  }
  for (const e of enrollments || []) {
    ev.push({
      kind: 'inscricao',
      at: e.created_at,
      title: 'Inscrição / mentoria',
      details: `${formatProgramType(e.program_type)} — estado: ${e.state || '—'}`,
      id: `e-${e.id}`,
    })
  }
  return ev
    .filter((x) => x.at)
    .sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime())
}

export function formIconLabel(type: string | undefined): string {
  if (type === FORM_TYPES.DIAG) return 'Diagnóstico'
  if (type === FORM_TYPES.PLANO) return 'Plano 90d'
  return (type || '').replace(/^altzen-/, '')
}
