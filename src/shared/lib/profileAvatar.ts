/**
 * Avatares externos a partir dos campos linkedin / github do cadastro.
 * Ordem de tentativa no UI: LinkedIn (unavatar) → GitHub (avatar público) → ícone padrão.
 */

export type ProfileAvatarStage = 'linkedin' | 'github' | 'default'

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

  if (/^[a-zA-Z0-9_-]+$/.test(raw)) return raw.slice(0, 200)

  return null
}

const GITHUB_RESERVED_PATHS = new Set([
  'settings',
  'orgs',
  'organizations',
  'marketplace',
  'features',
  'login',
  'signup',
  'about',
  'explore',
  'topics',
  'collections',
  'trending',
  'sponsors',
])

/** Utilizador GitHub (segmento após github.com/). */
export function parseGitHubUsername(input: string | null | undefined): string | null {
  if (input == null) return null
  const raw = String(input).trim()
  if (!raw) return null

  const tryUrl = (href: string) => {
    try {
      const u = new URL(href)
      const host = u.hostname.replace(/^www\./i, '').toLowerCase()
      if (host !== 'github.com') return null
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length === 0) return null
      const user = decodeURIComponent(parts[0]).replace(/\/$/, '').trim()
      if (!user || GITHUB_RESERVED_PATHS.has(user.toLowerCase())) return null
      return user.slice(0, 39)
    } catch {
      /* ignore */
    }
    return null
  }

  const fromHttp = tryUrl(raw.startsWith('http') ? raw : `https://${raw}`)
  if (fromHttp) return fromHttp

  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(raw)) return raw

  return null
}

export function linkedInAvatarUrlFromProfileField(linkedin: string | null | undefined): string | null {
  const slug = parseLinkedInProfileSlug(linkedin)
  if (!slug) return null
  return `https://unavatar.io/linkedin/${encodeURIComponent(slug)}`
}

/** Avatar público do GitHub (sem unavatar). */
export function gitHubAvatarUrlFromProfileField(github: string | null | undefined): string | null {
  const user = parseGitHubUsername(github)
  if (!user) return null
  return `https://github.com/${encodeURIComponent(user)}.png?size=200`
}

export function initialProfileAvatarStage(
  linkedin: string | null | undefined,
  github: string | null | undefined
): ProfileAvatarStage {
  if (linkedInAvatarUrlFromProfileField(linkedin)) return 'linkedin'
  if (gitHubAvatarUrlFromProfileField(github)) return 'github'
  return 'default'
}

export function profileAvatarUrlForStage(
  stage: ProfileAvatarStage,
  linkedin: string | null | undefined,
  github: string | null | undefined
): string | null {
  if (stage === 'linkedin') return linkedInAvatarUrlFromProfileField(linkedin)
  if (stage === 'github') return gitHubAvatarUrlFromProfileField(github)
  return null
}

export function profileAvatarTitleForStage(stage: ProfileAvatarStage): string | undefined {
  if (stage === 'linkedin') return 'Foto via LinkedIn (serviço externo)'
  if (stage === 'github') return 'Foto via GitHub'
  return undefined
}
