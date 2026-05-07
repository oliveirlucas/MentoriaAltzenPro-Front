import { useEffect, useRef } from 'react'
import { api } from '@/shared/api/client'

function useResetSkipOnKeyChange(draftKey: string) {
  const initialSkip = useRef(true)
  const lastKey = useRef(draftKey)
  if (lastKey.current !== draftKey) {
    lastKey.current = draftKey
    initialSkip.current = true
  }
  return initialSkip
}

export function useFormAutosave(
  formType: string,
  formOwnerUserId: string | number | null | undefined,
  hydrated: boolean,
  snapshot: string,
  debounceMs = 1500,
  options?: { isAdmin?: boolean; skip?: boolean }
): void {
  const { isAdmin, skip } = options || {}
  const draftKeyBase = isAdmin
    ? `altzen_draft_${formType}_admin_${formOwnerUserId}`
    : `altzen_draft_${formType}_${formOwnerUserId}`
  const initialSkip = useResetSkipOnKeyChange(`${formType}|${formOwnerUserId ?? ''}|${isAdmin ? '1' : '0'}`)

  useEffect(() => {
    if (skip) return
    if (!hydrated || !formOwnerUserId) return
    if (initialSkip.current) {
      initialSkip.current = false
      return
    }
    const draftKey = draftKeyBase
    let payloadObj: unknown
    try {
      payloadObj = JSON.parse(snapshot)
    } catch {
      return
    }
    const t = setTimeout(() => {
      void (async () => {
        try {
          const path = isAdmin
            ? `/admin/students/${formOwnerUserId}/forms/${encodeURIComponent(formType)}`
            : `/forms/${encodeURIComponent(formType)}`
          await api(path, {
            method: 'PUT',
            body: JSON.stringify({ payload: payloadObj }),
          })
          try {
            localStorage.removeItem(draftKey)
          } catch {
            /* */
          }
        } catch {
          try {
            localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), payload: payloadObj }))
          } catch {
            /* */
          }
        }
      })()
    }, debounceMs)
    return () => clearTimeout(t)
  }, [formOwnerUserId, hydrated, snapshot, formType, debounceMs, isAdmin, draftKeyBase, skip])
}
