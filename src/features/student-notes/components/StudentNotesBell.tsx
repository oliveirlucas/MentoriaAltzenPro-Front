import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { api } from '@/shared/api/client'
import { useToast } from '@/shared/ui/ToastContext'

/** Disparado após marcar nota(s) como lida(s) para sincronizar o contador no header. */
export const NOTES_READ_CHANGED = 'altzen:notes-read-changed'

export function dispatchNotesReadChanged() {
  window.dispatchEvent(new CustomEvent(NOTES_READ_CHANGED))
}

function formatShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function StudentNotesBell() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState([])
  const rootRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const d = await api('/notes/summary')
      setUnreadCount(d.unread_count ?? 0)
      setItems(Array.isArray(d.items) ? d.items : [])
    } catch {
      setUnreadCount(0)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    const onChanged = () => {
      load()
    }
    window.addEventListener(NOTES_READ_CHANGED, onChanged)
    return () => window.removeEventListener(NOTES_READ_CHANGED, onChanged)
  }, [load])

  const markAllRead = async () => {
    try {
      await api('/notes/mark-all-read', { method: 'POST' })
      setUnreadCount(0)
      setItems([])
      dispatchNotesReadChanged()
      setOpen(false)
    } catch (e) {
      toast.error(e.message || 'Não foi possível marcar como lidas.')
    }
  }

  const badge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label={unreadCount > 0 ? `Notas novas: ${unreadCount}` : 'Notas do mentor'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-800">Notas do mentor</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
                onClick={markAllRead}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="px-3 py-4 text-center text-sm text-slate-500">Carregando…</p>}
            {!loading && items.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate-500">Nenhuma nota nova.</p>
            )}
            {!loading &&
              items.map((it) => (
                <Link
                  key={it.id}
                  to={`/recursos#nota-${it.id}`}
                  className="block border-b border-slate-50 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <p className="truncate text-sm font-medium text-slate-900">{it.title || 'Nota do mentor'}</p>
                  {it.preview && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{it.preview}</p>}
                  <p className="mt-1 text-[10px] text-slate-400">{formatShort(it.updated_at || it.created_at)}</p>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
