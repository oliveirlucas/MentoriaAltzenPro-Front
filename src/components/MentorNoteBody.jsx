import React from 'react'
import { isLikelyHtml, sanitizeMentorNoteHtml } from '../lib/noteHtml.js'

/**
 * Corpo de nota do mentor no portal do aluno (HTML sanitizado) ou texto legado.
 */
export function MentorNoteBodyOrPlain({ body, className = '' }) {
  if (body == null || String(body).trim() === '') return null
  const raw = String(body)
  if (!isLikelyHtml(raw)) {
    return <p className={`whitespace-pre-wrap ${className}`.trim()}>{raw}</p>
  }
  const safe = sanitizeMentorNoteHtml(raw)
  if (!safe.trim()) return null
  return (
    <div
      className={`mentor-note-rich ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
