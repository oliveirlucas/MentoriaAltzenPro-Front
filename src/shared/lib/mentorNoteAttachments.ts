/** Alinhado a `MENTOR_NOTE_ATTACHMENT_ALLOWED_TYPES` na API. */
export const MENTOR_NOTE_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
])

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
}

/** Valor do atributo `accept` em `<input type="file">` para anexos de notas. */
export const MENTOR_NOTE_ATTACHMENT_ACCEPT_ATTR = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.zip',
  '.rar',
  ...MENTOR_NOTE_ATTACHMENT_TYPES,
].join(',')

/**
 * Resolve o MIME a enviar à API: usa `file.type` se permitido; senão infere pela extensão.
 */
export function resolveMentorNoteAttachmentMime(file: File): string | null {
  const raw = (file.type || '').toLowerCase().split(';')[0].trim()
  if (raw && MENTOR_NOTE_ATTACHMENT_TYPES.has(raw)) return raw
  const m = /\.([a-z0-9]+)$/i.exec(file.name.trim())
  if (!m) return null
  const ext = m[1].toLowerCase()
  const inferred = EXTENSION_TO_MIME[ext]
  return inferred && MENTOR_NOTE_ATTACHMENT_TYPES.has(inferred) ? inferred : null
}

export function isMentorNoteAttachmentFileAllowed(file: File): boolean {
  return resolveMentorNoteAttachmentMime(file) != null
}

const PREVIEWABLE_MIMES = new Set(['application/pdf', 'image/png', 'image/jpeg'])

/** MIME a partir de `content_type` da API ou extensão do `file_name`. */
export function inferMentorNoteAttachmentMime(
  contentType?: string | null,
  fileName?: string | null
): string | null {
  const ct = (contentType || '').toLowerCase().split(';')[0].trim()
  if (ct && MENTOR_NOTE_ATTACHMENT_TYPES.has(ct)) return ct
  const m = /\.([a-z0-9]+)$/i.exec(String(fileName || '').trim())
  if (!m) return null
  const ext = m[1].toLowerCase()
  const inferred = EXTENSION_TO_MIME[ext]
  return inferred && MENTOR_NOTE_ATTACHMENT_TYPES.has(inferred) ? inferred : null
}

/** PDF e imagens podem abrir no modal; ZIP/RAR e outros só download. */
export function isMentorNoteAttachmentPreviewable(
  contentType?: string | null,
  fileName?: string | null
): boolean {
  const mime = inferMentorNoteAttachmentMime(contentType, fileName)
  if (!mime) return false
  return PREVIEWABLE_MIMES.has(mime)
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (fileName || 'anexo').replace(/["\r\n]/g, '_')
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
