import { formatProgramType } from './programType.js'

/** Tipos conhecidos (mesmos da API) */
export const FORM_TYPES = {
  DIAG: 'altzen-diagnostico-carreira',
  PLANO: 'altzen-plano-90-dias',
}

/**
 * O portal mantém um único par de snapshots (diagnóstico / plano) por aluno.
 * Com uma nova inscrição (novo ciclo), se o último salvamento do formulário for
 * anterior à criação da inscrição mais recente, o conteúdo ainda corresponde ao
 * ciclo anterior — não deve alimentar resumo nem alertas do ciclo atual.
 *
 * @param {object|null|undefined} primaryEnrollment inscrição mais recente (última da lista)
 * @param {string|null|undefined} formUpdatedAt `updated_at` do snapshot
 * @param {number} enrollmentCount número de linhas de inscrição
 */
export function isLiveFormPredatesPrimaryEnrollment(primaryEnrollment, formUpdatedAt, enrollmentCount) {
  if (enrollmentCount < 2 || !primaryEnrollment || !formUpdatedAt) return false
  const anchor = primaryEnrollment.created_at
  if (anchor == null || String(anchor).trim() === '') return false
  const tForm = new Date(formUpdatedAt).getTime()
  const tEnr = new Date(anchor).getTime()
  if (Number.isNaN(tForm) || Number.isNaN(tEnr)) return false
  return tForm < tEnr
}

const PROFILE_MAP = {
  A: 'Transição p/ dev',
  B: 'Júnior consolidando base',
  C: 'Pleno → senioridade',
  D: 'Outro',
  E: 'Estagiário, iniciando a carreira',
  F: 'Ainda pensando em entrar pra área',
}

function sumScoredObject(obj) {
  if (!obj || typeof obj !== 'object') return 0
  return Object.values(obj).reduce((acc, v) => acc + (Number(v) || 0), 0)
}

/**
 * @param {object|null} payload
 */
export function getDiagnosticoSummary(payload) {
  if (!payload || typeof payload !== 'object') return null
  const tech = sumScoredObject(payload.techScores)
  const career = sumScoredObject(payload.careerScores)
  const p = payload.profile
  const other = typeof payload.profileOther === 'string' ? payload.profileOther.trim() : ''
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

/**
 * @param {object|null} payload
 */
export function getPlanoSummary(payload) {
  if (!payload || typeof payload !== 'object') return null
  const objective = typeof payload.mainGoal?.objective === 'string' ? payload.mainGoal.objective.trim() : ''
  const capaTitle = typeof payload.capa?.title === 'string' ? payload.capa.title.trim() : ''
  const firstLine = objective || capaTitle
  return {
    headline: firstLine ? (firstLine.length > 200 ? `${firstLine.slice(0, 200)}…` : firstLine) : '—',
    hasWeeksWithText:
      Array.isArray(payload.weeks) &&
      payload.weeks.some(
        (w) =>
          w &&
          ['weekObjective', 'techFocus', 'entregas', 'evidence'].some((k) => String(w[k] || '').trim())
      ),
  }
}

/** Fuso usado para “hoje” no ritmo do programa (portal Brasil). */
const PROGRAM_DAY_TIMEZONE = 'America/Sao_Paulo'

/**
 * Postgres `DATE` costuma serializar como `YYYY-MM-DDT00:00:00.000Z`. Usar
 * `getDate()` no fuso local empurra o dia civil para trás em BRT e gera “Dia 2”
 * no primeiro dia esperado. Extraímos YYYY-MM-DD do início da string quando existir.
 * @returns {{ y: number, mo: number, d: number } | null}
 */
function parseEnrollmentDateParts(startedAt) {
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

/**
 * Dia civil no fuso do programa (para “hoje” e para timestamps como fecho).
 * @returns {{ y: number, mo: number, d: number } | null}
 */
function getCivilDatePartsInTimezone(date, timeZone) {
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

function compareCivil(a, b) {
  if (a.y !== b.y) return a.y - b.y
  if (a.mo !== b.mo) return a.mo - b.mo
  return a.d - b.d
}

function civilDiffDays(start, end) {
  const t0 = Date.UTC(start.y, start.mo - 1, start.d)
  const t1 = Date.UTC(end.y, end.mo - 1, end.d)
  return Math.round((t1 - t0) / 864e5)
}

/**
 * Dia 1 = primeiro dia civil do programa (data de início). Antes desse dia, retorna null.
 * Depois: 1..90 enquanto dentro do período; após o 90.º dia continua 90 (teto).
 * @param {string|null|undefined} startedAt - ISO date do Postgres
 * @param {Date} [now]
 */
export function getDayInProgram(startedAt, now = new Date()) {
  const start = parseEnrollmentDateParts(startedAt)
  const ref = getCivilDatePartsInTimezone(now, PROGRAM_DAY_TIMEZONE)
  if (!start || !ref) return null
  const diff = civilDiffDays(start, ref) + 1
  if (diff < 1) return null
  if (diff > 90) return 90
  return diff
}

/**
 * Verdadeiro quando a data de início (calendário do programa em America/Sao_Paulo) é estritamente posterior a `now`.
 * @param {string|null|undefined} startedAt
 * @param {Date} [now]
 */
export function isProgramStartDateInFuture(startedAt, now = new Date()) {
  const start = parseEnrollmentDateParts(startedAt)
  const today = getCivilDatePartsInTimezone(now, PROGRAM_DAY_TIMEZONE)
  if (!start || !today) return false
  return compareCivil(today, start) < 0
}

/**
 * @param {number|null} day 1-90
 */
export function getExpectedMentorWeek12(day) {
  if (day == null) return null
  return Math.min(12, Math.max(1, Math.floor((day - 1) / 7) + 1))
}

/**
 * Ritmo 90d de uma inscrição concreta (para comparar ciclos quando há várias linhas).
 * Usa `ended_at` como referência temporal quando existe; caso contrário, `now`.
 * @param {object|null|undefined} enrollment
 * @param {Date} [now]
 * @returns {{ day: number|null, week: number|null, refLabel: string }|null}
 */
export function getEnrollmentCycleProgress(enrollment, now = new Date()) {
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

/**
 * @param {{
 *  enrollment: object|null
 *  form_snapshots: Array<{ form_type: string, updated_at: string }>
 *  now?: Date
 *  portal?: { portal_diagnostico_enabled?: boolean, portal_plano_90_enabled?: boolean }
 * }} p
 */
export function computeMentorHealth({ enrollment, form_snapshots, now = new Date(), portal }) {
  const usePlano = portal == null ? true : !!portal.portal_plano_90_enabled
  const useDiag = portal == null ? true : !!portal.portal_diagnostico_enabled
  const forms = form_snapshots || []
  const by = Object.fromEntries(forms.map((f) => [f.form_type, f]))
  const state = enrollment?.state || ''
  const activeLike = state === 'ativa' || state === 'agendada'
  const started = enrollment?.started_at

  const day = getDayInProgram(started, now)
  const week = getExpectedMentorWeek12(day)
  const notYetStarted = isProgramStartDateInFuture(started, now)

  const planU = by[FORM_TYPES.PLANO]?.updated_at
  const diaU = by[FORM_TYPES.DIAG]?.updated_at

  const lastPlanoAt = planU ? new Date(planU) : null
  const daysSincePlano =
    lastPlanoAt && !Number.isNaN(lastPlanoAt.getTime())
      ? Math.floor((now - lastPlanoAt) / 864e5)
      : null

  /** @type {{ level: 'high'|'medium'|'low'|'info', text: string }[]} */
  const messages = []
  if (state === 'ativa' && (started == null || String(started).trim() === '')) {
    messages.push({ level: 'low', text: 'Defina a data de início da mentoria para acompanhar semanas e atraso.' })
  }
  if (notYetStarted && (state === 'ativa' || state === 'agendada')) {
    messages.push({
      level: 'info',
      text: 'A data de início ainda não chegou — dia e semana de referência só passam a contar a partir desse dia (dia 1 = dia de início).',
    })
  }
  if (!notYetStarted) {
    if (usePlano && state === 'ativa' && day && day > 1 && !planU) {
      messages.push({ level: 'high', text: 'Plano 90 dias ainda sem registro com o programa em curso (início +2 dias ou mais).' })
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
      messages.push({ level: 'low', text: 'Alguns dias sem registro do plano — acompanhe na mentoria de rotina.' })
    }
  }
  if (useDiag && activeLike && !diaU && !notYetStarted) {
    if (day && day >= 14) {
      messages.push({ level: 'medium', text: 'Diagnóstico ainda vazio após 2 semanas (recomendado no início do ciclo).' })
    } else if (day && day >= 7) {
      messages.push({ level: 'low', text: 'Ainda sem diagnóstico salvo — alinhe preenchimento com o aluno.' })
    }
  }
  if (day && day >= 80 && state === 'ativa') {
    messages.push({ level: 'info', text: 'Aproximando o fim da janela de 90 dias — preparar o fechamento ou redefinir o plano.' })
  }

  let status = 'ok' // ok | atencao | atraso | critico
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

/**
 * Resumo para a tabela de alunos (admin): prioridade com base na última inscrição e snapshots.
 * @param {object} row linha de GET /api/admin/students
 * @param {Date} [now]
 * @returns {{ band: 'ok'|'info'|'watch'|'late'|'critical', label: string, detail: string }}
 */
export function computeAdminListAttention(row, now = new Date()) {
  if (!row?.enrollment_id) {
    return { band: 'critical', label: 'Crítico', detail: 'Sem inscrição de mentoria — criar ou associar inscrição.' }
  }
  const st = row.enrollment_state || ''
  if (st === 'concluida' || st === 'encerrada') {
    return { band: 'ok', label: 'Encerrado', detail: 'Ciclo concluído ou encerrado — sem alertas de ritmo ativos.' }
  }

  const enrollment = {
    state: st,
    started_at: row.started_at,
    ended_at: row.ended_at,
    created_at: row.enrollment_created_at,
  }
  const primary = enrollment
  const nEnr = Number(row.enrollment_count) || 1
  const rawForms = []
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

  let band =
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

const FORM_TITLES = {
  [FORM_TYPES.DIAG]: 'Formulário: diagnóstico de carreira',
  [FORM_TYPES.PLANO]: 'Formulário: plano de 90 dias',
}

/**
 * @param {{ notes: object[], form_snapshots: object[], enrollments: object[] }} p
 */
export function buildTimeline({ notes, form_snapshots, enrollments }) {
  const ev = []
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
    .sort((a, b) => new Date(b.at) - new Date(a.at))
}

export function formIconLabel(type) {
  if (type === FORM_TYPES.DIAG) return 'Diagnóstico'
  if (type === FORM_TYPES.PLANO) return 'Plano 90d'
  return (type || '').replace(/^altzen-/, '')
}
