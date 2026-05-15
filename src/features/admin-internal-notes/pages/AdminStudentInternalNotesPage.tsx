import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Link2,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  Save,
  ScrollText,
  User,
} from 'lucide-react'
import { useAuth } from '@/features/auth'
import { useToast } from '@/shared/ui/ToastContext'
import { api, apiBlob } from '@/shared/api/client'
import { normalizeTipTapBody } from '@/shared/lib/noteHtml'
import {
  MENTOR_NOTE_ATTACHMENT_ACCEPT_ATTR,
  isMentorNoteAttachmentFileAllowed,
  resolveMentorNoteAttachmentMime,
} from '@/shared/lib/mentorNoteAttachments'
import { MentorNoteBodyOrPlain } from '@/features/student-notes/components/MentorNoteBody'
import MentorNoteRichTextEditor from '@/features/student-notes/components/MentorNoteRichTextEditor'

const NOTE_ANEXOS_MAX = 8

function formatPt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = String(reader.result)
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    reader.onerror = () => reject(new Error('Leitura do arquivo falhou'))
    reader.readAsDataURL(file)
  })
}

export default function AdminStudentInternalNotesPage() {
  const { id } = useParams()
  const { profile, loading: authLoad } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [student, setStudent] = useState(null)
  const [notes, setNotes] = useState([])

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [noteVisibleToStudent, setNoteVisibleToStudent] = useState(false)
  const [noteLinks, setNoteLinks] = useState([{ label: '', url: '' }])
  const [notePendingFiles, setNotePendingFiles] = useState([])
  const [noteExistingFiles, setNoteExistingFiles] = useState([])
  const [noteRemovedFileIds, setNoteRemovedFileIds] = useState([])
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteDraftKey, setNoteDraftKey] = useState(0)
  const noteFileInputRef = useRef(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadErr('')
    try {
      const d = await api(`/admin/students/${id}/internal-mentor-notes`)
      setStudent(d.student || null)
      setNotes(Array.isArray(d.notes) ? d.notes : [])
    } catch (e) {
      setLoadErr(e?.message || 'Não foi possível carregar as anotações.')
      setStudent(null)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (profile?.role !== 'admin') return
    load()
  }, [profile?.role, load])

  useEffect(() => {
    setTitle('')
    setBody('')
    setNoteVisibleToStudent(false)
    setNoteLinks([{ label: '', url: '' }])
    setNotePendingFiles([])
    setNoteExistingFiles([])
    setNoteRemovedFileIds([])
    setEditingNoteId(null)
    setNoteDraftKey((k) => k + 1)
  }, [id])

  const resetNoteComposer = useCallback(() => {
    setTitle('')
    setBody('')
    setNoteVisibleToStudent(false)
    setNoteLinks([{ label: '', url: '' }])
    setNotePendingFiles([])
    setNoteExistingFiles([])
    setNoteRemovedFileIds([])
    setEditingNoteId(null)
    setNoteDraftKey((k) => k + 1)
  }, [])

  const startEditNote = useCallback((note) => {
    if (!note) return
    setEditingNoteId(note.id)
    setTitle(note.title || '')
    setBody(note.body || '')
    setNoteVisibleToStudent(note.visible_to_student !== false)
    const rawLinks = Array.isArray(note.attachment_links) ? note.attachment_links : []
    setNoteLinks(
      rawLinks.length
        ? rawLinks.map((l) => ({
            label: typeof l?.label === 'string' ? l.label : '',
            url: typeof l?.url === 'string' ? l.url : '',
          }))
        : [{ label: '', url: '' }]
    )
    setNoteExistingFiles(Array.isArray(note.attachment_files) ? note.attachment_files : [])
    setNoteRemovedFileIds([])
    setNotePendingFiles([])
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    if (notes.length === 0) return
    const raw = searchParams.get('edit')
    if (!raw) return
    const eid = Number(raw)
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
    if (Number.isInteger(eid) && eid > 0) {
      const n = notes.find((x) => x.id === eid)
      if (n) startEditNote(n)
    }
  }, [notes, searchParams, setSearchParams, startEditNote])

  const openAdminNoteFile = async (fileId) => {
    try {
      const { blob } = await apiBlob(`/admin/mentor-note-files/${fileId}/file`)
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) {
        URL.revokeObjectURL(url)
        toast.error('O navegador bloqueou a nova janela. Permita pop-ups ou use o download.')
        return
      }
      setTimeout(() => URL.revokeObjectURL(url), 120_000)
    } catch (e) {
      toast.error(e?.message || 'Não foi possível abrir o anexo.')
    }
  }

  const saveNote = async (e) => {
    e.preventDefault()
    if (!id) return
    const linksPayload = noteLinks
      .map((r) => ({
        label: (r.label || '').trim() || null,
        url: (r.url || '').trim(),
      }))
      .filter((r) => r.url)
    const existingKept =
      editingNoteId != null
        ? noteExistingFiles.filter((f) => !noteRemovedFileIds.includes(f.id)).length
        : 0
    if (existingKept + notePendingFiles.length > NOTE_ANEXOS_MAX) {
      toast.error(`No máximo ${NOTE_ANEXOS_MAX} anexos por entrada (existentes + novos).`)
      return
    }
    setNoteSaving(true)
    const wasEdit = editingNoteId != null
    try {
      for (const file of notePendingFiles) {
        if (!resolveMentorNoteAttachmentMime(file)) {
          toast.error(`Tipo não permitido: ${file.name}. Use PDF, PNG, JPEG, ZIP ou RAR.`)
          setNoteSaving(false)
          return
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name}: máximo 8 MB.`)
          setNoteSaving(false)
          return
        }
      }
      let attachment_files
      if (notePendingFiles.length) {
        attachment_files = await Promise.all(
          notePendingFiles.map(async (file) => ({
            file_name: file.name,
            content_type: resolveMentorNoteAttachmentMime(file)!,
            data_base64: await fileToBase64(file),
          }))
        )
      }
      const basePayload: Record<string, unknown> = {
        title: title.trim() || null,
        body: normalizeTipTapBody(body),
        visible_to_student: editingNoteId != null ? noteVisibleToStudent : false,
        attachment_links: linksPayload,
      }
      if (editingNoteId != null) {
        const patch: Record<string, unknown> = { ...basePayload }
        if (attachment_files?.length) patch.attachment_files = attachment_files
        if (noteRemovedFileIds.length) patch.remove_attachment_file_ids = noteRemovedFileIds
        await api(`/admin/notes/${editingNoteId}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })
      } else {
        await api('/admin/notes', {
          method: 'POST',
          body: JSON.stringify({
            student_id: Number(id),
            ...basePayload,
            ...(attachment_files?.length ? { attachment_files } : {}),
          }),
        })
      }
      resetNoteComposer()
      await load()
      toast.success(wasEdit ? 'Entrada atualizada.' : 'Entrada registada.')
    } catch (err) {
      toast.error(err?.message || 'Erro ao guardar.')
    } finally {
      setNoteSaving(false)
    }
  }

  if (authLoad) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center text-slate-500" aria-hidden>
        …
      </div>
    )
  }
  if (loadErr && !student && !loading) return <p className="text-red-600">{loadErr}</p>

  const displayName = student?.full_name || student?.email || (id ? `Aluno #${id}` : 'Aluno')

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Lista de alunos
        </Link>
        <Link
          to={`/admin/alunos/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à ficha
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-7">
        <div className="flex items-center gap-2 text-slate-300">
          <ScrollText className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-sm font-medium">Relatório interno</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Anotações internas</h1>
        <p className="mt-1 flex items-center gap-2 text-slate-300">
          <User className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span className="truncate">{displayName}</span>
        </p>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Registo cronológico só para a equipa de mentoria. O aluno <strong className="text-slate-200">não</strong> vê
          estas entradas no portal — use também as notas visíveis na ficha quando quiser comunicar algo em Recursos.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
          <Link
            to={`/admin/alunos/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/15"
          >
            <User className="h-4 w-4" />
            Ficha do aluno
          </Link>
          <Link
            to={`/admin/alunos/${id}/diagnostico`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <FileText className="h-4 w-4" />
            Diagnóstico
          </Link>
          <Link
            to={`/admin/alunos/${id}/plano-90-dias`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <BookOpen className="h-4 w-4" />
            Plano 90 dias
          </Link>
          <span className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100">
            <Lock className="h-4 w-4" />
            Anotações internas
          </span>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Conteúdo confidencial. Pode anexar PDF ou imagem, e guardar links de referência — tudo permanece fora da vista
          do aluno.
        </p>
      </div>

      {loading && <p className="text-slate-500">Carregando…</p>}

      {!loading && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {editingNoteId != null ? `Editar entrada #${editingNoteId}` : 'Nova entrada'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Ex.: resumo de sessão, combinados, riscos, próximos passos. Use a barra de ferramentas para negrito,
              títulos, listas e links no texto; em baixo, links e anexos extra.
            </p>

            <form onSubmit={saveNote} className="mt-4 space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
              {editingNoteId != null && (
                <button
                  type="button"
                  onClick={resetNoteComposer}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancelar edição
                </button>
              )}
              {editingNoteId != null && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    checked={noteVisibleToStudent}
                    onChange={(e) => setNoteVisibleToStudent(e.target.checked)}
                  />
                  Visível ao aluno em Recursos (deixa de aparecer só nesta lista)
                </label>
              )}
              <input
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Título (opcional), ex. Sessão 12 — revisão de entregas"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">Conteúdo</p>
                <MentorNoteRichTextEditor
                  key={editingNoteId != null ? `edit-${editingNoteId}` : `draft-${noteDraftKey}`}
                  initialContent={body}
                  onChange={setBody}
                  disabled={noteSaving}
                  placeholder="Texto livre com formatação — negrito, secções, listas…"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                  <Link2 className="h-3.5 w-3.5" aria-hidden />
                  Links
                </p>
                <div className="mt-2 space-y-2">
                  {noteLinks.map((row, idx) => (
                    <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm sm:max-w-[12rem]"
                        placeholder="Rótulo (opcional)"
                        value={row.label}
                        onChange={(e) => {
                          const v = e.target.value
                          setNoteLinks((prev) => prev.map((r, i) => (i === idx ? { ...r, label: v } : r)))
                        }}
                      />
                      <input
                        className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                        placeholder="https://…"
                        value={row.url}
                        onChange={(e) => {
                          const v = e.target.value
                          setNoteLinks((prev) => prev.map((r, i) => (i === idx ? { ...r, url: v } : r)))
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setNoteLinks((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={noteLinks.length <= 1}
                        className="shrink-0 text-xs text-red-700 hover:underline disabled:opacity-40"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNoteLinks((prev) => [...prev, { label: '', url: '' }])}
                  className="mt-2 text-sm font-medium text-indigo-700 hover:underline"
                >
                  + Adicionar link
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                  <Paperclip className="h-3.5 w-3.5" aria-hidden />
                  Anexos (PDF, PNG, JPEG, ZIP, RAR — máx. 8 MB cada, até {NOTE_ANEXOS_MAX} por entrada)
                </p>
                {editingNoteId != null && noteExistingFiles.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {noteExistingFiles
                      .filter((f) => !noteRemovedFileIds.includes(f.id))
                      .map((f) => (
                        <li
                          key={f.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-white bg-white px-2 py-1.5"
                        >
                          <span className="min-w-0 truncate text-slate-800">{f.file_name}</span>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => openAdminNoteFile(f.id)}
                              className="text-xs font-medium text-indigo-700 hover:underline"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => setNoteRemovedFileIds((prev) => [...prev, f.id])}
                              className="text-xs font-medium text-red-700 hover:underline"
                            >
                              Remover
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
                <input
                  ref={noteFileInputRef}
                  type="file"
                  multiple
                  accept={MENTOR_NOTE_ATTACHMENT_ACCEPT_ATTR}
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-800"
                  onChange={(e) => {
                    const picked = [...(e.target.files || [])]
                    e.target.value = ''
                    const allowed: File[] = []
                    for (const file of picked) {
                      if (!isMentorNoteAttachmentFileAllowed(file)) {
                        toast.error(`Tipo não permitido: ${file.name}. Use PDF, PNG, JPEG, ZIP ou RAR.`)
                        continue
                      }
                      if (file.size > 8 * 1024 * 1024) {
                        toast.error(`${file.name}: máximo 8 MB.`)
                        continue
                      }
                      allowed.push(file)
                    }
                    setNotePendingFiles((prev) => {
                      const merged = [...prev, ...allowed]
                      return merged.slice(0, NOTE_ANEXOS_MAX)
                    })
                  }}
                />
                {notePendingFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {notePendingFiles.map((file, i) => (
                      <li
                        key={`${file.name}-${i}`}
                        className="flex items-center justify-between gap-2 rounded border border-white bg-white px-2 py-1 text-sm"
                      >
                        <span className="min-w-0 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setNotePendingFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 text-xs text-red-700 hover:underline"
                        >
                          Tirar da fila
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={noteSaving}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-800 disabled:opacity-60"
              >
                {noteSaving ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {noteSaving ? 'A guardar…' : editingNoteId != null ? 'Guardar alterações' : 'Registar entrada'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Histórico</h2>
            <p className="mt-1 text-sm text-slate-600">Mais recentes primeiro.</p>
            {notes.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">Ainda não há anotações internas para este aluno.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    id={`nota-${n.id}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{n.title || 'Sem título'}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatPt(n.created_at)}
                          {n.updated_at && n.updated_at !== n.created_at ? ` · editada ${formatPt(n.updated_at)}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditNote(n)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-50"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Editar
                      </button>
                    </div>
                    {n.body ? (
                      <MentorNoteBodyOrPlain body={n.body} className="mt-3 text-sm text-slate-700" />
                    ) : null}
                    {Array.isArray(n.attachment_links) && n.attachment_links.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {n.attachment_links.map((l, i) => (
                          <li key={i}>
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-indigo-700 hover:underline"
                            >
                              {l.label || l.url || 'Link'}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {Array.isArray(n.attachment_files) && n.attachment_files.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                        {n.attachment_files.map((f) => (
                          <li key={f.id}>
                            <button
                              type="button"
                              onClick={() => openAdminNoteFile(f.id)}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50"
                            >
                              {f.file_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
