import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../lib/api.js'
import { Plus, Trash2, StickyNote, Pencil, X, Save } from 'lucide-react'
import MentorNoteRichTextEditor from '../components/MentorNoteRichTextEditor.jsx'
import { normalizeTipTapBody, stripHtmlToPlain } from '../lib/noteHtml.js'
import { MentorNoteBodyOrPlain } from '../components/MentorNoteBody.jsx'

function fmtPt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function StudentSelfNotesPage() {
  const { profile, loading: authLoading } = useAuth()
  const toast = useToast()
  const isStudent = profile?.role === 'student'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedPreviewBody, setSelectedPreviewBody] = useState('')
  const listScrollRef = useRef(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteTitleId = React.useId()

  const [composerOpen, setComposerOpen] = useState(false)
  const composerTitleId = React.useId()
  const [composerMode, setComposerMode] = useState('create') // 'create' | 'edit'
  const [composerTargetId, setComposerTargetId] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')

  const selected = useMemo(() => notes.find((n) => String(n.id) === String(selectedId)) || null, [notes, selectedId])
  const composerEditorKey = useMemo(
    () => `composer-${composerMode}-${composerTargetId || 'new'}`,
    [composerMode, composerTargetId]
  )

  useEffect(() => {
    if (authLoading) return
    if (!isStudent) {
      setLoading(false)
      setNotes([])
      return
    }
    let ok = true
    setLoading(true)
    ;(async () => {
      try {
        const d = await api('/me/self-notes')
        const list = Array.isArray(d.notes) ? d.notes : []
        if (!ok) return
        setNotes(list)
        const first = list[0]?.id ?? null
        setSelectedId(first)
        setSelectedPreviewBody(first ? String(list[0]?.body || '') : '')
      } catch (e) {
        if (ok) toast.error(e?.message || 'Não foi possível carregar suas anotações.')
      } finally {
        if (ok) setLoading(false)
      }
    })()
    return () => {
      ok = false
    }
  }, [authLoading, isStudent, toast])

  useEffect(() => {
    if (!selected) return
    setSelectedPreviewBody(String(selected.body || ''))
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = useCallback(
    (id) => {
      setSelectedId(id)
      const n = notes.find((x) => String(x.id) === String(id))
      setSelectedPreviewBody(n ? String(n.body || '') : '')
    },
    [setSelectedId, notes]
  )

  const openCreateModal = useCallback(() => {
    if (!isStudent || saving) return
    setComposerMode('create')
    setComposerTargetId(null)
    setDraftTitle('')
    setDraftBody('')
    setComposerOpen(true)
  }, [isStudent, saving])

  const openEditModal = useCallback(
    (note) => {
      if (!isStudent || saving) return
      if (!note?.id) return
      setComposerMode('edit')
      setComposerTargetId(note.id)
      setDraftTitle(String(note.title || ''))
      setDraftBody(String(note.body || ''))
      setComposerOpen(true)
    },
    [isStudent, saving]
  )

  const saveComposer = useCallback(async () => {
    if (!isStudent || saving) return
    const bodyNorm = normalizeTipTapBody(draftBody) || ''
    const titleNorm = (draftTitle || '').trim() || null

    setSaving(true)
    try {
      if (composerMode === 'create') {
        const d = await api('/me/self-notes', {
          method: 'POST',
          body: JSON.stringify({ title: titleNorm, body: bodyNorm }),
        })
        const note = d?.note
        if (!note?.id) throw new Error('Servidor não devolveu a nota.')
        setNotes((prev) => [note, ...prev])
        setSelectedId(note.id)
        setSelectedPreviewBody(String(note.body || ''))
        toast.success('Anotação criada.')
      } else {
        if (!composerTargetId) throw new Error('Nota inválida.')
        const d = await api(`/me/self-notes/${composerTargetId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: titleNorm, body: bodyNorm }),
        })
        const note = d?.note
        if (!note?.id) throw new Error('Servidor não devolveu a nota.')
        setNotes((prev) => prev.map((n) => (String(n.id) === String(note.id) ? note : n)))
        if (String(selectedId) === String(note.id)) setSelectedPreviewBody(String(note.body || ''))
        toast.success('Anotação salva.')
      }
      setComposerOpen(false)
    } catch (e) {
      toast.error(e?.message || 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }, [
    isStudent,
    saving,
    draftBody,
    draftTitle,
    composerMode,
    composerTargetId,
    toast,
    selectedId,
  ])

  const requestDelete = useCallback(() => {
    if (!isStudent || saving) return
    if (!selectedId) return
    setDeleteOpen(true)
  }, [isStudent, saving, selectedId])

  const del = useCallback(async () => {
    if (!isStudent || saving) return
    if (!selectedId) return
    setSaving(true)
    try {
      await api(`/me/self-notes/${selectedId}`, { method: 'DELETE' })
      setNotes((prev) => prev.filter((n) => String(n.id) !== String(selectedId)))
      setSelectedId(null)
      setSelectedPreviewBody('')
      toast.success('Anotação apagada.')
    } catch (e) {
      toast.error(e?.message || 'Não foi possível apagar.')
    } finally {
      setSaving(false)
      setDeleteOpen(false)
    }
  }, [isStudent, saving, selectedId, toast])

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="text-slate-600">Carregando…</div>
      </div>
    )
  }

  if (!isStudent) return <Navigate to="/dashboard" replace />

  const selectedTitle = selected?.title ? String(selected.title) : 'Sem título'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Minhas anotações</h1>
          <p className="mt-1 text-sm text-slate-600">
            Seu espaço pra rabiscar durante as mentorias e voltar depois. Só você vê.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Nova
          </button>
          <button
            type="button"
            onClick={requestDelete}
            disabled={saving || !selectedId}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Apagar
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <StickyNote className="h-4 w-4 text-indigo-600" />
              Suas notas
            </div>
            <span className="text-xs text-slate-500">{notes.length}</span>
          </div>
          <div ref={listScrollRef} className="max-h-[60vh] overflow-y-auto p-2">
            {loading ? (
              <div className="p-3 text-sm text-slate-600">Carregando…</div>
            ) : notes.length === 0 ? (
              <div className="p-3 text-sm text-slate-600">
                Sem notas ainda. Clica em <strong>Nova</strong> e manda bala.
              </div>
            ) : (
              <div className="space-y-1">
                {notes.map((n) => {
                  const active = String(n.id) === String(selectedId)
                  const label = (n.title && String(n.title).trim()) || 'Sem título'
                  const preview = stripHtmlToPlain((n.body && String(n.body).trim()) || '')
                  return (
                    <div
                      key={n.id}
                      className={`flex items-stretch gap-1 rounded-xl border px-2 py-2 text-left transition ${
                        active
                          ? 'border-indigo-200 bg-indigo-50 text-slate-900'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <button type="button" onClick={() => pick(n.id)} className="min-w-0 flex-1 px-1 text-left">
                        <div className="truncate text-sm font-semibold">{label}</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{preview || '—'}</div>
                        <div className="mt-1 text-[0.7rem] text-slate-400">{fmtPt(n.updated_at || n.created_at)}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(n)}
                        className="inline-flex w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-white/70 hover:text-slate-900"
                        aria-label="Editar anotação"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(n.id)
                          setSelectedPreviewBody(String(n.body || ''))
                          setDeleteOpen(true)
                        }}
                        className="inline-flex w-10 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-white/70 hover:text-red-700"
                        aria-label="Apagar anotação"
                        title="Apagar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Visualização</h2>
          {!selected ? (
            <p className="mt-2 text-sm text-slate-500">Selecione uma nota na lista ao lado, ou crie uma nova.</p>
          ) : (
            <div
              className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
              aria-label="Cartão da anotação"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900">{selectedTitle}</p>
                <p className="text-xs text-slate-500">
                  {fmtPt(selected.created_at)}
                  {selected.updated_at && String(selected.updated_at) !== String(selected.created_at)
                    ? ` · atualizada ${fmtPt(selected.updated_at)}`
                    : ''}
                </p>
              </div>
              {stripHtmlToPlain(selectedPreviewBody) ? (
                <MentorNoteBodyOrPlain body={selectedPreviewBody} className="mt-2 text-slate-700" />
              ) : (
                <p className="mt-2 text-sm text-slate-500">Sem texto ainda.</p>
              )}
              <div className="mt-3 text-xs text-slate-500">
                {stripHtmlToPlain(selectedPreviewBody).length.toLocaleString('pt-BR')} caracteres
              </div>
            </div>
          )}
        </section>
      </div>

      {composerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={composerTitleId}
        >
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden
            onClick={() => {
              if (saving) return
              setComposerOpen(false)
            }}
          />
          <div
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id={composerTitleId} className="truncate text-lg font-bold text-slate-900">
                  {composerMode === 'create' ? 'Nova anotação' : 'Editar anotação'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">Título e descrição só aparecem aqui, na edição.</p>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Fechar"
                disabled={saving}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Título (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-50"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  disabled={saving}
                  placeholder="Ex.: Mentoria 03 — dúvidas e próximos passos"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Descrição</label>
                <div className="mt-1">
                  <MentorNoteRichTextEditor
                    key={composerEditorKey}
                    initialContent={draftBody || ''}
                    onChange={setDraftBody}
                    placeholder="Escreve aqui… (negrito, sublinhado, listas, links)"
                    disabled={saving}
                    contentClassName="min-h-[520px]"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{stripHtmlToPlain(draftBody).length.toLocaleString('pt-BR')} caracteres</span>
                  <span className="hidden sm:inline">Dica: salva quando terminar e pronto.</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveComposer}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={deleteTitleId}
        >
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden
            onClick={() => {
              if (saving) return
              setDeleteOpen(false)
            }}
          />
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 id={deleteTitleId} className="text-lg font-bold text-slate-900">
                Apagar anotação?
              </h2>
              <p className="mt-1 text-sm text-slate-600">Essa ação não tem volta. Se quiser, salva um copy antes.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={del}
                disabled={saving}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? 'Apagando…' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

