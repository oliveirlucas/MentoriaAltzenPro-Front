import { describe, expect, it } from 'vitest'
import { DEFAULT_MENTORSHIP_PROGRAM, formatProgramType } from '@/shared/lib/programType'

describe('formatProgramType', () => {
  it('retorna rótulo para o programa padrão', () => {
    expect(formatProgramType(DEFAULT_MENTORSHIP_PROGRAM)).toContain('90')
  })

  it('retorna em dash para vazio', () => {
    expect(formatProgramType(null)).toBe('—')
    expect(formatProgramType('')).toBe('—')
  })
})
