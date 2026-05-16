import { describe, expect, it } from 'vitest'
import {
  gitHubAvatarUrlFromProfileField,
  initialProfileAvatarStage,
  linkedInAvatarUrlFromProfileField,
  parseGitHubUsername,
  parseLinkedInProfileSlug,
  profileAvatarUrlForStage,
} from './profileAvatar'

describe('parseLinkedInProfileSlug', () => {
  it('extrai slug de URL completa', () => {
    expect(parseLinkedInProfileSlug('https://www.linkedin.com/in/alvarociribelli/')).toBe('alvarociribelli')
  })

  it('aceita slug sozinho', () => {
    expect(parseLinkedInProfileSlug('alvarociribelli')).toBe('alvarociribelli')
  })

  it('retorna null para vazio ou inválido', () => {
    expect(parseLinkedInProfileSlug('')).toBeNull()
    expect(parseLinkedInProfileSlug(null)).toBeNull()
  })
})

describe('parseGitHubUsername', () => {
  it('extrai utilizador de URL', () => {
    expect(parseGitHubUsername('https://github.com/octocat')).toBe('octocat')
  })

  it('aceita username sozinho', () => {
    expect(parseGitHubUsername('my-user')).toBe('my-user')
  })

  it('ignora paths reservados', () => {
    expect(parseGitHubUsername('https://github.com/settings/profile')).toBeNull()
  })
})

describe('avatar URLs', () => {
  it('monta URL unavatar LinkedIn', () => {
    expect(linkedInAvatarUrlFromProfileField('https://www.linkedin.com/in/alvarociribelli/')).toBe(
      'https://unavatar.io/linkedin/alvarociribelli'
    )
  })

  it('monta URL GitHub png', () => {
    expect(gitHubAvatarUrlFromProfileField('https://github.com/octocat')).toBe(
      'https://github.com/octocat.png?size=200'
    )
  })
})

describe('initialProfileAvatarStage', () => {
  it('prioriza linkedin quando ambos existem', () => {
    expect(
      initialProfileAvatarStage('https://www.linkedin.com/in/foo', 'https://github.com/bar')
    ).toBe('linkedin')
  })

  it('usa github sem linkedin', () => {
    expect(initialProfileAvatarStage('', 'https://github.com/bar')).toBe('github')
  })

  it('default sem perfis', () => {
    expect(initialProfileAvatarStage(null, null)).toBe('default')
  })
})

describe('profileAvatarUrlForStage', () => {
  it('devolve URL do estágio atual', () => {
    expect(
      profileAvatarUrlForStage('github', null, 'https://github.com/octocat')
    ).toBe('https://github.com/octocat.png?size=200')
  })
})
