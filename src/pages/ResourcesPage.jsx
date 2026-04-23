import React, { useCallback, useEffect, useId, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api, apiBlob } from '../lib/api.js'
import { ScrollText, Eye, X, Link2, Paperclip } from 'lucide-react'

function formatPt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function ResourcesPage() {
  const { profile, loading: authLoading } = useAuth()
  const loc = useLocation()
  const [notes, setNotes] = useState([])
  const [contracts, setContracts] = useState([])
  const [contractsErr, setContractsErr] = useState('')
  const [contractsLoading, setContractsLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewKind, setPreviewKind] = useState('pdf')
  const [previewLabel, setPreviewLabel] = useState('')
  const previewTitleId = useId()

  useEffect(() => {
    let ok = true
    ;(async () => {
      try {
        const d = await api('/notes')
        if (ok) setNotes(d.notes || [])
      } catch {
        /* */
      }
    })()
    return () => {
      ok = false
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (profile?.role !== 'student') {
      setContractsLoading(false)
      setContracts([])
      return
    }
    let ok = true
    setContractsLoading(true)
    setContractsErr('')
    ;(async () => {
      try {
        const d = await api('/me/contracts')
        if (ok) setContracts(d.contracts || [])
      } catch (e) {
        if (ok) setContractsErr(e.message || 'Não foi possível carregar os contratos.')
      } finally {
        if (ok) setContractsLoading(false)
      }
    })()
    return () => {
      ok = false
    }
  }, [authLoading, profile?.role])

  useEffect(() => {
    if (loc.hash !== '#contratos') return
    const t = requestAnimationFrame(() => {
      document.getElementById('contratos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(t)
  }, [loc.hash, loc.pathname])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewLabel('')
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }, [])

  useEffect(() => {
    if (!previewOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closePreview()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [previewOpen, closePreview])

  const openNoteAttachmentPreview = async (fileId, label) => {
    setContractsErr('')
    setPreviewLabel(label || 'Anexo')
    try {
      const { blob, contentType } = await apiBlob(`/me/mentor-note-files/${fileId}/file`)
      const url = URL.createObjectURL(blob)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      const ct = (contentType || '').toLowerCase()
      setPreviewKind(ct.includes('pdf') ? 'pdf' : 'image')
      setPreviewOpen(true)
    } catch (e) {
      setPreviewLabel('')
      setContractsErr(e.message || 'Não foi possível abrir o anexo.')
    }
  }

  const openPreview = async (contractId, label) => {
    setContractsErr('')
    setPreviewLabel(label || 'Contrato')
    try {
      const { blob, contentType } = await apiBlob(`/me/contracts/${contractId}/file`)
      const url = URL.createObjectURL(blob)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      const ct = (contentType || '').toLowerCase()
      setPreviewKind(ct.includes('pdf') ? 'pdf' : 'image')
      setPreviewOpen(true)
    } catch (e) {
      setPreviewLabel('')
      setContractsErr(e.message || 'Não foi possível abrir o ficheiro.')
    }
  }

  if (!authLoading && profile?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Recursos e notas do mentor</h1>
      <p className="max-w-2xl text-pretty text-slate-600">
        Aqui você acompanha o que o mentor compartilha com você: atualizações importantes, links de acesso,
        documentação de apoio e resumos dos encontros num só lugar, junto das anotações pessoais quando o mentor as
        publicar para você. Os <strong>contratos assinados</strong> enviados pelo mentor ficam na secção abaixo para
        consulta ou impressão.
      </p>

      <section
        id="contratos"
        className="mt-10 scroll-mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="contratos-heading"
      >
        <h2 id="contratos-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ScrollText className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
          Contratos assinados
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Todos os contratos carregados pela equipa para a sua conta. Pode pré-visualizar ou usar o visualizador do
          browser para imprimir / guardar PDF.
        </p>
        {contractsErr && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {contractsErr}
          </p>
        )}
        {contractsLoading && <p className="mt-4 text-sm text-slate-500">A carregar…</p>}
        {!contractsLoading && !contractsErr && contracts.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">Ainda não há contratos disponíveis. Quando o mentor enviar, eles
            aparecerão aqui.</p>
        )}
        {!contractsLoading && contracts.length > 0 && (
          <ul className="mt-4 space-y-3" aria-label="Lista de contratos">
            {contracts.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{c.file_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.content_type} · disponível desde {formatPt(c.uploaded_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openPreview(c.id, c.file_name)}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                >
                  <Eye className="h-4 w-4 shrink-0" aria-hidden />
                  Ver
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="mt-10 text-lg font-bold text-slate-900">Anotações para você</h2>
      {notes.length === 0 ? (
        <p className="text-slate-500">Ainda sem notas visíveis do mentor.</p>
      ) : (
        <ul className="mt-2 space-y-4">
          {notes.map((n) => {
            const rawLinks = n.attachment_links
            const linkList = Array.isArray(rawLinks)
              ? rawLinks
              : typeof rawLinks === 'string'
                ? (() => {
                    try {
                      return JSON.parse(rawLinks)
                    } catch {
                      return []
                    }
                  })()
                : []
            const fileList = Array.isArray(n.attachment_files) ? n.attachment_files : []
            return (
              <li key={n.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  {n.title && <p className="font-semibold text-slate-900">{n.title}</p>}
                  <p className="text-xs text-slate-500">
                    {formatPt(n.created_at)}
                    {n.updated_at && String(n.updated_at) !== String(n.created_at)
                      ? ` · atualizada ${formatPt(n.updated_at)}`
                      : ''}
                  </p>
                </div>
                {n.body && <p className="mt-2 whitespace-pre-wrap text-slate-700">{n.body}</p>}
                {linkList.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                      Links
                    </p>
                    <ul className="mt-1 space-y-1">
                      {linkList.map((l, i) => {
                        const href = typeof l?.url === 'string' ? l.url : ''
                        const lab = typeof l?.label === 'string' && l.label.trim() ? l.label.trim() : href
                        if (!href) return null
                        return (
                          <li key={i}>
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-indigo-700 underline decoration-indigo-300 hover:text-indigo-900"
                            >
                              {lab}
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                {fileList.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                      <Paperclip className="h-3.5 w-3.5" aria-hidden />
                      Anexos
                    </p>
                    <ul className="mt-2 space-y-2">
                      {fileList.map((f) => (
                        <li
                          key={f.id}
                          className="flex flex-col gap-2 rounded border border-white bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="min-w-0 truncate font-medium text-slate-800">{f.file_name}</span>
                          <button
                            type="button"
                            onClick={() => openNoteAttachmentPreview(f.id, f.file_name)}
                            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-800 sm:text-sm"
                          >
                            <Eye className="h-4 w-4 shrink-0" aria-hidden />
                            Ver
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {previewOpen && previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={previewTitleId}
        >
          <div className="absolute inset-0 bg-slate-900/50" aria-hidden onClick={closePreview} />
          <div
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2 id={previewTitleId} className="truncate text-lg font-bold text-slate-900">
                {previewLabel || 'Contrato'}
              </h2>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-2">
                {previewKind === 'pdf' ? (
                <iframe
                  title="Pré-visualização"
                  src={previewUrl}
                  className="h-[min(80vh,720px)] w-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Pré-visualização do documento"
                  className="mx-auto max-h-[min(80vh,720px)] w-auto max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
