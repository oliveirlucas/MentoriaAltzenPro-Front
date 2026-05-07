export function sessionStatusLabelPt(status: string | undefined): string {
  if (status === 'completed') return 'Realizada'
  if (status === 'cancelled') return 'Cancelada'
  if (status === 'not_held') return 'Não realizada'
  if (status === 'scheduled') return 'Agendada'
  return '—'
}

export function sessionStatusChipClass(status: string | undefined): string {
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (status === 'cancelled') return 'border-slate-300 bg-slate-100 text-slate-700'
  if (status === 'not_held') return 'border-rose-200 bg-rose-50 text-rose-950'
  if (status === 'scheduled') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

export const SESSION_ATTRIBUTION_OPTIONS = [
  { value: 'mutual', label: 'Combinado / mútuo' },
  { value: 'student', label: 'Aluno' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'external', label: 'Externo (força maior, plataforma, etc.)' },
] as const

export const SESSION_REASON_OPTIONS = [
  { value: 'mutual_agreement', label: 'Acordo para não realizar / remarcar' },
  { value: 'student_no_show', label: 'Aluno não compareceu (no-show)' },
  { value: 'student_cancelled_early', label: 'Aluno cancelou com antecedência' },
  { value: 'mentor_cancelled', label: 'Mentor cancelou / remarcou' },
  { value: 'technical', label: 'Problema técnico (Meet, link, etc.)' },
  { value: 'health', label: 'Saúde / imprevisto' },
  { value: 'other', label: 'Outro' },
] as const

export function sessionAttributionLabelPt(v: string | undefined): string {
  const o = SESSION_ATTRIBUTION_OPTIONS.find((x) => x.value === v)
  return o?.label || v || '—'
}

export function sessionReasonLabelPt(v: string | undefined): string {
  const o = SESSION_REASON_OPTIONS.find((x) => x.value === v)
  return o?.label || v || '—'
}
