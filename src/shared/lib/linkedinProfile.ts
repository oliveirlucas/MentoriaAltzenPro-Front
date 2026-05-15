/**
 * Extrai o identificador público do perfil (parte após /in/) a partir do URL ou texto colado no cadastro.
 */
export function parseLinkedInProfileSlug(input: string | null | undefined): string | null {
  if (input == null) return null
  const raw = String(input).trim()
  if (!raw) return null

  const tryUrl = (href: string) => {
    try {
      const u = new URL(href)
      const m = /\/in\/([^/?#]+)/i.exec(u.pathname)
      if (m?.[1]) {
        const slug = decodeURIComponent(m[1]).replace(/\/$/, '').trim()
        return slug || null
      }
    } catch {
      /* ignore */
    }
    return null
  }

  const fromHttp = tryUrl(raw.startsWith('http') ? raw : `https://${raw}`)
  if (fromHttp) return fromHttp.slice(0, 200)

  // Só o slug (ex.: alvarociribelli), sem domínio
  if (/^[a-zA-Z0-9_-]+$/.test(raw)) return raw.slice(0, 200)

  return null
}

/** URL de avatar resolvida por serviço externo (pode falhar ou ter limites de uso). */
export function linkedInAvatarUrlFromProfileField(linkedin: string | null | undefined): string | null {
  const slug = parseLinkedInProfileSlug(linkedin)
  if (!slug) return null
  return `https://unavatar.io/linkedin/${encodeURIComponent(slug)}`
}
