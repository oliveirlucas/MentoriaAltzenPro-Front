import { describe, expect, it } from 'vitest'
import {
  computeAdminListAttention,
  shouldSoftenPlanSilenceFromCalendar,
  type AdminStudentListRow,
} from '@/shared/lib/adminStudentInsight'

const baseRow = (): AdminStudentListRow => ({
  enrollment_id: 1,
  enrollment_state: 'ativa',
  started_at: '2026-04-29',
  enrollment_created_at: '2026-04-29',
  enrollment_count: 1,
  snap_plano_updated_at: '2026-05-01T12:00:00.000Z',
  snap_diag_updated_at: '2026-04-30T12:00:00.000Z',
  portal_diagnostico_enabled: true,
  portal_plano_90_enabled: true,
  last_form_activity: '2026-05-01T12:00:00.000Z',
})

describe('shouldSoftenPlanSilenceFromCalendar', () => {
  it('retorna true com cancelamento mútuo + próxima aula em até 21 dias', () => {
    const now = new Date('2026-05-14T18:00:00.000Z')
    const row: AdminStudentListRow = {
      ...baseRow(),
      cal_next_scheduled_starts_at: '2026-05-21T23:00:00.000Z',
      cal_last_cancelled_starts_at: '2026-05-14T23:00:00.000Z',
      cal_last_cancelled_attribution: 'mutual',
      cal_last_cancelled_reason: 'mutual_agreement',
      cal_last_completed_starts_at: '2026-05-07T23:00:00.000Z',
    }
    expect(shouldSoftenPlanSilenceFromCalendar(row, now)).toBe(true)
  })

  it('retorna false sem próxima aula agendada', () => {
    const now = new Date('2026-05-14T18:00:00.000Z')
    const row: AdminStudentListRow = {
      ...baseRow(),
      cal_last_cancelled_starts_at: '2026-05-14T23:00:00.000Z',
      cal_last_cancelled_attribution: 'mutual',
      cal_last_cancelled_reason: 'mutual_agreement',
    }
    expect(shouldSoftenPlanSilenceFromCalendar(row, now)).toBe(false)
  })

  it('ignora caminho de cancelamento com student_no_show mas aceita aula recente + próxima', () => {
    const now = new Date('2026-05-14T18:00:00.000Z')
    const row: AdminStudentListRow = {
      ...baseRow(),
      cal_next_scheduled_starts_at: '2026-05-21T23:00:00.000Z',
      cal_last_cancelled_starts_at: '2026-05-10T23:00:00.000Z',
      cal_last_cancelled_attribution: 'student',
      cal_last_cancelled_reason: 'student_no_show',
      cal_last_completed_starts_at: '2026-05-12T23:00:00.000Z',
    }
    expect(shouldSoftenPlanSilenceFromCalendar(row, now)).toBe(true)
  })

  it('retorna false quando último cancelamento é no-show e não há completed recente', () => {
    const now = new Date('2026-05-14T18:00:00.000Z')
    const row: AdminStudentListRow = {
      ...baseRow(),
      cal_next_scheduled_starts_at: '2026-05-21T23:00:00.000Z',
      cal_last_cancelled_starts_at: '2026-05-14T23:00:00.000Z',
      cal_last_cancelled_attribution: 'student',
      cal_last_cancelled_reason: 'student_no_show',
    }
    expect(shouldSoftenPlanSilenceFromCalendar(row, now)).toBe(false)
  })
})

describe('computeAdminListAttention com calendário', () => {
  it('abaixa prioridade de Atenção para OK quando silêncio no plano é atenuado pelo calendário', () => {
    const now = new Date('2026-05-14T18:00:00.000Z')
    const row: AdminStudentListRow = {
      ...baseRow(),
      snap_plano_updated_at: '2026-05-01T12:00:00.000Z',
      last_form_activity: '2026-05-01T12:00:00.000Z',
      cal_next_scheduled_starts_at: '2026-05-21T23:00:00.000Z',
      cal_last_cancelled_starts_at: '2026-05-14T23:00:00.000Z',
      cal_last_cancelled_attribution: 'mutual',
      cal_last_cancelled_reason: 'mutual_agreement',
      cal_last_completed_starts_at: '2026-05-07T23:00:00.000Z',
    }
    const att = computeAdminListAttention(row, now)
    expect(att.band).toBe('ok')
  })
})
