/** Resposta JSON parcial comuns da API AltzenPro */
export type ApiJsonObject = Record<string, unknown>

export function hasCsrfToken(data: unknown): data is { csrfToken: string } {
  return (
    !!data &&
    typeof data === 'object' &&
    'csrfToken' in data &&
    typeof (data as { csrfToken: unknown }).csrfToken === 'string'
  )
}

export function hasToken(data: unknown): data is { token: string } {
  return (
    !!data &&
    typeof data === 'object' &&
    'token' in data &&
    typeof (data as { token: unknown }).token === 'string'
  )
}

export function hasErrorMessage(data: unknown): data is { error: string } {
  return (
    !!data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  )
}

/** Resposta da API (ex.: Google Calendar) onde 401 significa “voltar a ligar o Google”, não sessão JWT expirada. */
export function hasReauthorizeHint(data: unknown): boolean {
  return !!data && typeof data === 'object' && (data as { reauthorize?: unknown }).reauthorize === true
}
