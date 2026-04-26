import DOMPurify from 'dompurify'

let purifyHooksInstalled = false

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'hr',
  'code',
  'pre',
]

/** Conteúdo antigo (só texto) não deve passar por innerHTML. */
export function isLikelyHtml(body) {
  if (body == null || typeof body !== 'string') return false
  return /<[a-z][a-z0-9]*[\s>/]/i.test(body.trim())
}

/** Texto para pré-visualizações (sino, linha do tempo, etc.). */
export function stripHtmlToPlain(html) {
  if (html == null || html === '') return ''
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** HTML guardado pelo editor TipTap — só tags seguras e hrefs http(s)/mailto. */
export function sanitizeMentorNoteHtml(dirty) {
  if (dirty == null || typeof dirty !== 'string') return ''
  if (!purifyHooksInstalled) {
    purifyHooksInstalled = true
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        const href = node.getAttribute('href')
        if (href && (/^https?:\/\//i.test(href) || /^mailto:/i.test(href))) {
          node.setAttribute('target', '_blank')
          node.setAttribute('rel', 'noopener noreferrer')
        }
      }
    })
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'class', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

/** Remove documento vazio do TipTap antes de gravar. */
export function normalizeTipTapBody(html) {
  if (html == null || typeof html !== 'string') return null
  if (!stripHtmlToPlain(html)) return null
  return html
}
