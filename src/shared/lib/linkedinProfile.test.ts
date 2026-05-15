import { describe, expect, it } from 'vitest'
import { linkedInAvatarUrlFromProfileField, parseLinkedInProfileSlug } from './linkedinProfile'

describe('parseLinkedInProfileSlug', () => {
  it('extrai slug de URL completa', () => {
    expect(parseLinkedInProfileSlug('https://www.linkedin.com/in/alvarociribelli/')).toBe('alvarociribelli')
  })

  it('aceita slug sozinho', () => {
    expect(parseLinkedInProfileSlug('alvarociribelli')).toBe('alvarociribelli')
  })

  it('aceita host sem https', () => {
    expect(parseLinkedInProfileSlug('www.linkedin.com/in/foo-bar')).toBe('foo-bar')
  })

  it('retorna null para vazio ou inválido', () => {
    expect(parseLinkedInProfileSlug('')).toBeNull()
    expect(parseLinkedInProfileSlug(null)).toBeNull()
    expect(parseLinkedInProfileSlug('https://example.com/')).toBeNull()
  })
})

describe('linkedInAvatarUrlFromProfileField', () => {
  it('monta URL unavatar com slug', () => {
    expect(linkedInAvatarUrlFromProfileField('https://www.linkedin.com/in/alvarociribelli/')).toBe(
      'https://unavatar.io/linkedin/alvarociribelli'
    )
  })

  it('codifica slug com caracteres especiais', () => {
    expect(linkedInAvatarUrlFromProfileField('https://www.linkedin.com/in/jos%C3%A9-silva/')).toBe(
      'https://unavatar.io/linkedin/jos%C3%A9-silva'
    )
  })
})
