/** Slug gravado em `enrollments.program_type` para o produto atual. */
export const DEFAULT_MENTORSHIP_PROGRAM = 'individual_90d'

const LABELS: Record<string, string> = {
  [DEFAULT_MENTORSHIP_PROGRAM]: 'Individual · 90 dias',
  individual_4s: 'Individual · referência antiga (4s)',
  individual_8s: 'Individual · 8 sessões (legado)',
  imersao_2d: 'Imersão 2d (legado)',
  coletiva_6_8s: 'Mentoria coletiva (legado)',
}

export function formatProgramType(slug: string | null | undefined): string {
  if (slug == null || slug === '') return '—'
  if (LABELS[slug]) return LABELS[slug]
  return String(slug).replace(/_/g, ' ')
}
