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

export function isLikelyHtml(body: unknown): boolean {
  if (body == null || typeof body !== 'string') return false
  return /<[a-z][a-z0-9]*[\s>/]/i.test(body.trim())
}

export function stripHtmlToPlain(html: unknown): string {
  if (html == null || html === '') return ''
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeMentorNoteHtml(dirty: unknown): string {
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

export function normalizeTipTapBody(html: unknown): string | null {
  if (html == null || typeof html !== 'string') return null
  if (!stripHtmlToPlain(html)) return null
  return html
}
