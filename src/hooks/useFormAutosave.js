import { useEffect, useRef } from 'react'
import { api } from '../lib/api.js'

function useResetSkipOnKeyChange(draftKey) {
  const initialSkip = useRef(true)
  const lastKey = useRef(draftKey)
  if (lastKey.current !== draftKey) {
    lastKey.current = draftKey
    initialSkip.current = true
  }
  return initialSkip
}

/**
 * Grava na API com debounce. Em falha, grava rascunho em localStorage.
 * @param {string} formType
 * @param {string|number|null|undefined} formOwnerUserId — usuário dono do payload (aluno) ou, em modo admin, o aluno alvo
 * @param {boolean} hydrated
 * @param {string} snapshot JSON.stringify do payload — muda quando o form muda
 * @param {number} debounceMs
 * @param {{ isAdmin?: boolean, skip?: boolean }} [options] — isAdmin: PUT em /admin/students/:id/forms/... e rascunho com chave distinta; skip: não grava (ex.: modo arquivo)
 */
export function useFormAutosave(
  formType,
  formOwnerUserId,
  hydrated,
  snapshot,
  debounceMs = 1500,
  options
) {
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
    let payloadObj
    try {
      payloadObj = JSON.parse(snapshot)
    } catch {
      return
    }
    const t = setTimeout(() => {
      ;(async () => {
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
            localStorage.setItem(
              draftKey,
              JSON.stringify({ savedAt: Date.now(), payload: payloadObj })
            )
          } catch {
            /* */
          }
        }
      })()
    }, debounceMs)
    return () => clearTimeout(t)
  }, [formOwnerUserId, hydrated, snapshot, formType, debounceMs, isAdmin, draftKeyBase, skip])
}
