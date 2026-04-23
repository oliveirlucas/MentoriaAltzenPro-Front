import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

const VARIANT_STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-100',
  error: 'border-red-200 bg-red-50 text-red-950 shadow-red-100',
  info: 'border-slate-200 bg-white text-slate-900 shadow-slate-200',
}

function ToastItem({ id, message, variant, onDismiss }) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info
  const Icon = variant === 'success' ? CheckCircle2 : variant === 'error' ? XCircle : Info
  const iconClass =
    variant === 'success'
      ? 'text-emerald-600'
      : variant === 'error'
        ? 'text-red-600'
        : 'text-slate-500'

  return (
    <div
      role="status"
      className={`pointer-events-auto flex max-w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${styles}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-black/5 hover:text-slate-800"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())
  const idRef = useRef(0)

  const remove = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId))
    const t = timersRef.current.get(toastId)
    if (t) clearTimeout(t)
    timersRef.current.delete(toastId)
  }, [])

  const push = useCallback(
    (message, variant = 'info', duration = 5200) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message: String(message || ''), variant }])
      const timer = setTimeout(() => remove(id), duration)
      timersRef.current.set(id, timer)
      return id
    },
    [remove]
  )

  const api = useMemo(
    () => ({
      success: (message, duration) => push(message, 'success', duration),
      error: (message, duration) => push(message, 'error', duration ?? 7000),
      info: (message, duration) => push(message, 'info', duration),
    }),
    [push]
  )

  const toastLayer =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex flex-col items-end gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:p-4 sm:pt-[max(1rem,env(safe-area-inset-top,0px))]"
            aria-live="polite"
            aria-relevant="additions text"
          >
            <div className="flex w-full max-w-md flex-col-reverse items-end gap-2 sm:ml-auto">
              {toasts.map((t) => (
                <ToastItem key={t.id} {...t} onDismiss={remove} />
              ))}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toastLayer}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de ToastProvider')
  }
  return ctx
}
