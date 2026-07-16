/** Calendário admin alinhado ao fuso da mentoria (mesmo critério que o portal em SP). */
export const ADMIN_CALENDAR_VIEW_TZ = 'America/Sao_Paulo'

export function civilYmdFromInstantInZone(iso: string | null | undefined, timeZone = ADMIN_CALENDAR_VIEW_TZ): string {
  if (iso == null || String(iso).trim() === '') return '_'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '_'
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const mo = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  if (!y || !mo || !day) return '_'
  return `${y}-${mo}-${day}`
}

export function civilYmdTodayInZone(timeZone = ADMIN_CALENDAR_VIEW_TZ, now = new Date()): string {
  return civilYmdFromInstantInZone(now.toISOString(), timeZone)
}

/** Rótulo longo para cabeçalho de dia (ex.: «segunda-feira, 14 de maio de 2026»). */
export function formatWeekdayLongFromYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return ymd
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  const d = new Date(y, mo, day, 12, 0, 0, 0)
  if (Number.isNaN(d.getTime())) return ymd
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export type MonthGridCell =
  | { kind: 'pad'; key: string }
  | { kind: 'day'; key: string; ymd: string; dayNum: number }

/**
 * Células do mês em grelha 7×n; `weekStartsMonday` = true → cabeçalho seg…dom.
 */
export function buildMonthGridCells(
  viewYear: number,
  viewMonth0: number,
  weekStartsMonday = false
): MonthGridCell[] {
  const first = new Date(viewYear, viewMonth0, 1)
  const lastDay = new Date(viewYear, viewMonth0 + 1, 0).getDate()
  const firstDow = first.getDay() // 0 dom … 6 sáb
  const pad = weekStartsMonday ? (firstDow + 6) % 7 : firstDow
  const cells: MonthGridCell[] = []
  for (let i = 0; i < pad; i++) {
    cells.push({ kind: 'pad', key: `pad-${viewYear}-${viewMonth0}-${i}` })
  }
  for (let dayNum = 1; dayNum <= lastDay; dayNum++) {
    const mo = String(viewMonth0 + 1).padStart(2, '0')
    const dd = String(dayNum).padStart(2, '0')
    const ymd = `${viewYear}-${mo}-${dd}`
    cells.push({ kind: 'day', key: `day-${ymd}`, ymd, dayNum })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ kind: 'pad', key: `trail-${cells.length}` })
  }
  return cells
}
