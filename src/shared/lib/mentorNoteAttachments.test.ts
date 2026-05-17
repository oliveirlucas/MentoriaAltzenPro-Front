import { describe, expect, it } from 'vitest'
import {
  inferMentorNoteAttachmentMime,
  isMentorNoteAttachmentPreviewable,
} from './mentorNoteAttachments'

describe('inferMentorNoteAttachmentMime', () => {
  it('usa content_type quando válido', () => {
    expect(inferMentorNoteAttachmentMime('application/zip', 'x.pdf')).toBe('application/zip')
  })

  it('infere pela extensão', () => {
    expect(inferMentorNoteAttachmentMime('', 'material.rar')).toBe('application/x-rar-compressed')
  })
})

describe('isMentorNoteAttachmentPreviewable', () => {
  it('true para PDF e imagens', () => {
    expect(isMentorNoteAttachmentPreviewable('application/pdf', 'doc.pdf')).toBe(true)
    expect(isMentorNoteAttachmentPreviewable(null, 'foto.png')).toBe(true)
    expect(isMentorNoteAttachmentPreviewable(null, 'foto.jpeg')).toBe(true)
  })

  it('false para ZIP e RAR', () => {
    expect(isMentorNoteAttachmentPreviewable('application/zip', 'pack.zip')).toBe(false)
    expect(isMentorNoteAttachmentPreviewable(null, 'pack.rar')).toBe(false)
  })
})
