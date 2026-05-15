import React, { useEffect, useMemo, useState, useId, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useToast } from '@/shared/ui/ToastContext'
import { api, apiBlob } from '@/shared/api/client'
import {
  maskCpfInput,
  maskPhoneBrInput,
  maskCepInput,
  onlyDigits,
  emailHasValidAt,
  fetchAddressByCep,
} from '@/shared/lib/brInputs'
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  Activity,
  Calendar,
  FileText,
  BookOpen,
  History,
  AlertTriangle,
  CheckCircle2,
  Target,
  UserCog,
  X,
  Upload,
  Eye,
  Trash2,
  ScrollText,
  Lock,
  Plus,
  Link2,
  Paperclip,
  Pencil,
  Video,
  ExternalLink,
} from 'lucide-react'
import {
  buildTimeline,
  buildAdminStudentListRowFromDetail,
  computeAdminListAttention,
  computeMentorHealth,
  adminAttentionBandSurfaceClass,
  getDiagnosticoSummary,
  getEnrollmentCycleProgress,
  getPlanoSummary,
  isLiveFormPredatesPrimaryEnrollment,
  isProgramStartDateInFuture,
  shouldSoftenPlanSilenceFromCalendar,
  FORM_TYPES,
} from '@/shared/lib/adminStudentInsight'
import { formatProgramType } from '@/shared/lib/programType'
import {
  sessionStatusLabelPt,
  sessionStatusChipClass,
  sessionAttributionLabelPt,
  sessionReasonLabelPt,
} from '@/shared/lib/calendarSessionLabels'
import { normalizeTipTapBody, stripHtmlToPlain } from '@/shared/lib/noteHtml'
import MentorNoteRichTextEditor from '@/features/student-notes/components/MentorNoteRichTextEditor'
import StudentAssistantWidget from '@/shared/components/StudentAssistantWidget'
import { CalendarSessionsKpiGrid } from '@/shared/components/CalendarSessionsKpiGrid'
import {
  NOTE_ANEXOS_MAX,
  fileToBase64,
} from '@/features/admin-students/admin-student-detail/helpers'
import { formatDateTimePt as formatPt, toDateInputValue as toDateInput } from '@/shared/lib/date'
import {
  MENTOR_NOTE_ATTACHMENT_ACCEPT_ATTR,
  isMentorNoteAttachmentFileAllowed,
  resolveMentorNoteAttachmentMime,
} from '@/shared/lib/mentorNoteAttachments'
import { linkedInAvatarUrlFromProfileField } from '@/shared/lib/linkedinProfile'

export default function AdminStudentDetail() {
  const { id } = useParams()
  const { profile, loading: authLoad } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [initialLoadErr, setInitialLoadErr] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [noteVisibleToStudent, setNoteVisibleToStudent] = useState(true)
  const [noteLinks, setNoteLinks] = useState([{ label: '', url: '' }])
  const [notePendingFiles, setNotePendingFiles] = useState([])
  const [noteExistingFiles, setNoteExistingFiles] = useState([])
  const [noteRemovedFileIds, setNoteRemovedFileIds] = useState([])
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteDraftKey, setNoteDraftKey] = useState(0)
  const noteFileInputRef = useRef(null)

  const [cadEmail, setCadEmail] = useState('')
  const [cadFullName, setCadFullName] = useState('')
  const [cadPhone, setCadPhone] = useState('')
  const [cadCity, setCadCity] = useState('')
  const [cadLinkedin, setCadLinkedin] = useState('')
  const [cadGithub, setCadGithub] = useState('')
  const [cadCpf, setCadCpf] = useState('')
  const [cadRg, setCadRg] = useState('')
  const [cadBirthDate, setCadBirthDate] = useState('')
  const [cadStreet, setCadStreet] = useState('')
  const [cadComplement, setCadComplement] = useState('')
  const [cadDistrict, setCadDistrict] = useState('')
  const [cadState, setCadState] = useState('')
  const [cadPostal, setCadPostal] = useState('')
  const [cadCountry, setCadCountry] = useState('')
  const [cadPassword, setCadPassword] = useState('')
  const [cadBusy, setCadBusy] = useState(false)
  const [cadCepLoading, setCadCepLoading] = useState(false)
  const [cadModalOpen, setCadModalOpen] = useState(false)
  const cadCepLastLookupRef = useRef('')
  const cadModalTitleId = useId()
  const contractInputRef = useRef(null)
  const [contractBusy, setContractBusy] = useState(false)
  const [contractPreviewOpen, setContractPreviewOpen] = useState(false)
  const [contractPreviewUrl, setContractPreviewUrl] = useState('')
  const [contractPreviewKind, setContractPreviewKind] = useState('pdf')
  const [contractPreviewLabel, setContractPreviewLabel] = useState('')
  const contractPreviewTitleId = useId()
  const [addCycleBusy, setAddCycleBusy] = useState(false)
  const [newCycleModalOpen, setNewCycleModalOpen] = useState(false)
  const newCycleModalTitleId = useId()
  const [contractDeleteTarget, setContractDeleteTarget] = useState(null)
  const [contractDeleteBusy, setContractDeleteBusy] = useState(false)
  const contractDeleteModalTitleId = useId()
  const [snapBusyId, setSnapBusyId] = useState(null)
  const [portalAccessBusy, setPortalAccessBusy] = useState(false)
  const [linkedinAvatarFailed, setLinkedinAvatarFailed] = useState(false)

  const patchStudentPortalAccess = useCallback(async (partial) => {
    if (!id) return
    setPortalAccessBusy(true)
    try {
      await api(`/admin/students/${id}`, { method: 'PATCH', body: JSON.stringify(partial) })
      const d = await api(`/admin/students/${id}`)
      setData(d)
    } catch (e) {
      toast.error(e?.message || 'Não foi possível atualizar o acesso.')
    } finally {
      setPortalAccessBusy(false)
    }
  }, [id, toast])

  const studentSyncKey = useMemo(() => {
    if (!data?.student) return ''
    const u = data.student
    return [
      id,
      u.email,
      u.full_name,
      u.phone,
      u.city,
      u.linkedin,
      u.github,
      u.cpf,
      u.rg,
      u.birth_date,
      u.street_address,
      u.address_complement,
      u.address_district,
      u.state_region,
      u.postal_code,
      u.country,
    ].join('\u0000')
  }, [id, data?.student])

  useEffect(() => {
    setLinkedinAvatarFailed(false)
  }, [studentSyncKey])

  useEffect(() => {
    if (!cadModalOpen || !data?.student) return
    const u = data.student
    setCadEmail(u.email || '')
    setCadFullName(u.full_name || '')
    setCadPhone(maskPhoneBrInput(u.phone || ''))
    setCadCity(u.city || '')
    setCadLinkedin(u.linkedin || '')
    setCadGithub(u.github || '')
    setCadCpf(maskCpfInput(u.cpf || ''))
    setCadRg(u.rg || '')
    setCadBirthDate(u.birth_date ? toDateInput(u.birth_date) : '')
    setCadStreet(u.street_address || '')
    setCadComplement(u.address_complement || '')
    setCadDistrict(u.address_district || '')
    setCadState((u.state_region || '').toUpperCase().slice(0, 2))
    setCadPostal(maskCepInput(u.postal_code || ''))
    setCadCountry(u.country || '')
    setCadPassword('')
    cadCepLastLookupRef.current = onlyDigits(u.postal_code || '').slice(0, 8)
  }, [cadModalOpen, studentSyncKey])

  const cadCepDigits = onlyDigits(cadPostal).slice(0, 8)
  useEffect(() => {
    if (!cadModalOpen || cadCepDigits.length !== 8) return
    if (cadCepDigits === cadCepLastLookupRef.current) return
    let cancelled = false
    const t = setTimeout(async () => {
      setCadCepLoading(true)
      try {
        const addr = await fetchAddressByCep(cadCepDigits)
        if (cancelled || !addr) return
        cadCepLastLookupRef.current = cadCepDigits
        setCadStreet((s) => addr.street_address || s)
        setCadDistrict((s) => addr.address_district || s)
        setCadCity((s) => addr.city || s)
        setCadState((s) => addr.state_region || s)
      } catch {
        /* ignorar falha de rede */
      } finally {
        if (!cancelled) setCadCepLoading(false)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [cadModalOpen, cadCepDigits])

  useEffect(() => {
    setCadModalOpen(false)
    setNewCycleModalOpen(false)
    setContractDeleteTarget(null)
    setTitle('')
    setBody('')
    setNoteVisibleToStudent(true)
    setNoteLinks([{ label: '', url: '' }])
    setNotePendingFiles([])
    setNoteExistingFiles([])
    setNoteRemovedFileIds([])
    setEditingNoteId(null)
    setNoteDraftKey((k) => k + 1)
  }, [id])

  useEffect(() => {
    if (!cadModalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setCadModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [cadModalOpen])

  useEffect(() => {
    if (!newCycleModalOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setNewCycleModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [newCycleModalOpen])

  useEffect(() => {
    if (!contractDeleteTarget) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !contractDeleteBusy) setContractDeleteTarget(null)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [contractDeleteTarget, contractDeleteBusy])

  useEffect(() => {
    if (profile?.role !== 'admin') return
    setData(null)
    setInitialLoadErr('')
    let ok = true
    ;(async () => {
      try {
        const d = await api(`/admin/students/${id}`)
        if (ok) setData(d)
      } catch (e) {
        if (ok) setInitialLoadErr(e.message || 'Não foi possível carregar o aluno.')
      }
    })()
    return () => {
      ok = false
    }
  }, [id, profile?.role])

  const resetNoteComposer = useCallback(() => {
    setTitle('')
    setBody('')
    setNoteVisibleToStudent(true)
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
  }, [])

  const openAdminNoteFile = useCallback(async (fileId, _fileName) => {
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
  }, [toast])

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
      toast.error(`No máximo ${NOTE_ANEXOS_MAX} anexos por nota (existentes + novos).`)
      return
    }
    setNoteSaving(true)
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
        visible_to_student: noteVisibleToStudent,
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
      const d = await api(`/admin/students/${id}`)
      setData(d)
      toast.success('Nota guardada.')
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar a nota.')
    } finally {
      setNoteSaving(false)
    }
  }

  const updateEnrollment = async (enrollment, patch) => {
    try {
      await api(`/admin/enrollments/${enrollment.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      const d = await api(`/admin/students/${id}`)
      setData(d)
    } catch (e) {
      toast.error(e.message || 'Não foi possível atualizar a inscrição.')
    }
  }

  const addMentorshipCycle = async () => {
    if (!id) return
    setAddCycleBusy(true)
    try {
      await api('/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify({ user_id: Number(id), state: 'ativa' }),
      })
      const d = await api(`/admin/students/${id}`)
      setData(d)
      setNewCycleModalOpen(false)
      toast.success('Nova inscrição criada.')
    } catch (e) {
      toast.error(e.message || 'Não foi possível criar a inscrição.')
    } finally {
      setAddCycleBusy(false)
    }
  }

  const snapshotFormsForEnrollment = async (enrollmentId) => {
    if (!id) return
    setSnapBusyId(enrollmentId)
    try {
      await api(`/admin/students/${id}/enrollments/${enrollmentId}/snapshot-forms`, {
        method: 'POST',
        body: '{}',
      })
      const d = await api(`/admin/students/${id}`)
      setData(d)
      toast.success('Cópia dos formulários guardada para este ciclo.')
    } catch (e) {
      toast.error(e.message || 'Não foi possível arquivar os formulários.')
    } finally {
      setSnapBusyId(null)
    }
  }

  useEffect(() => {
    return () => {
      if (contractPreviewUrl) URL.revokeObjectURL(contractPreviewUrl)
    }
  }, [contractPreviewUrl])

  const closeContractPreview = useCallback(() => {
    setContractPreviewOpen(false)
    setContractPreviewLabel('')
    setContractPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }, [])

  useEffect(() => {
    if (!contractPreviewOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeContractPreview()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [contractPreviewOpen, closeContractPreview])

  const openContractPreview = async (contractId, label) => {
    if (!id || contractId == null) return
    setContractPreviewLabel(label || 'Contrato')
    try {
      const { blob, contentType } = await apiBlob(
        `/admin/students/${id}/contracts/${contractId}/file`
      )
      const url = URL.createObjectURL(blob)
      setContractPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      const ct = (contentType || '').toLowerCase()
      setContractPreviewKind(ct.includes('pdf') ? 'pdf' : 'image')
      setContractPreviewOpen(true)
    } catch (e) {
      setContractPreviewLabel('')
      toast.error(e.message || 'Não foi possível abrir o contrato.')
    }
  }

  const handleContractFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !id) return
    const mime = (file.type || '').toLowerCase().split(';')[0].trim()
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(mime)) {
      toast.error('Use PDF ou imagem PNG/JPEG.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 8 MB).')
      return
    }
    setContractBusy(true)
    try {
      const data_base64 = await fileToBase64(file)
      await api(`/admin/students/${id}/contracts`, {
        method: 'POST',
        body: JSON.stringify({
          file_name: file.name,
          content_type: mime,
          data_base64,
        }),
      })
      const d = await api(`/admin/students/${id}`)
      setData(d)
      toast.success('Contrato enviado.')
    } catch (e) {
      toast.error(e.message || 'Não foi possível enviar o contrato.')
    } finally {
      setContractBusy(false)
    }
  }

  const confirmRemoveContract = async () => {
    if (!id || !contractDeleteTarget) return
    const contractId = contractDeleteTarget.id
    setContractDeleteBusy(true)
    try {
      await api(`/admin/students/${id}/contracts/${contractId}`, { method: 'DELETE' })
      const d = await api(`/admin/students/${id}`)
      setData(d)
      setContractDeleteTarget(null)
      toast.success('Contrato removido.')
    } catch (e) {
      toast.error(e.message || 'Não foi possível remover o contrato.')
    } finally {
      setContractDeleteBusy(false)
    }
  }

  const saveCadastro = async (e) => {
    e.preventDefault()
    if (!id) return
    if (!emailHasValidAt(cadEmail)) {
      toast.error('Informe um e-mail válido (deve conter @).')
      return
    }
    setCadBusy(true)
    try {
      const body: Record<string, unknown> = {
        email: cadEmail.trim(),
        full_name: cadFullName,
        phone: cadPhone,
        city: cadCity,
        linkedin: cadLinkedin,
        github: cadGithub,
        cpf: cadCpf,
        rg: cadRg,
        birth_date: cadBirthDate || null,
        street_address: cadStreet,
        address_complement: cadComplement,
        address_district: cadDistrict,
        state_region: cadState,
        postal_code: cadPostal,
        country: cadCountry,
      }
      if (cadPassword.trim()) {
        body.password = cadPassword
      }
      await api(`/admin/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      const d = await api(`/admin/students/${id}`)
      setData(d)
      setCadPassword('')
      toast.success('Cadastro salvo com sucesso.')
    } catch (e) {
      toast.error(e.message || 'Não foi possível salvar o cadastro.')
    } finally {
      setCadBusy(false)
    }
  }

  const {
    health,
    listAttention,
    timeline,
    diagSummary,
    planoSummary,
    primaryEnrollment,
    diagStaleForCurrentCycle,
    planoStaleForCurrentCycle,
  } = useMemo(() => {
    if (!data) {
      return {
        health: null,
        listAttention: null,
        timeline: [],
        diagSummary: null,
        planoSummary: null,
        primaryEnrollment: null,
        diagStaleForCurrentCycle: false,
        planoStaleForCurrentCycle: false,
      }
    }
    const forms = data.form_snapshots || []
    const by = Object.fromEntries(forms.map((f) => [f.form_type, f]))
    const enrs = data.enrollments || []
    const primary = enrs.length ? enrs[enrs.length - 1] : null
    const nEnr = enrs.length
    const diagF = by[FORM_TYPES.DIAG]
    const planoF = by[FORM_TYPES.PLANO]
    const diagStale = isLiveFormPredatesPrimaryEnrollment(primary, diagF?.updated_at, nEnr)
    const planoStale = isLiveFormPredatesPrimaryEnrollment(primary, planoF?.updated_at, nEnr)
    const formsForCurrentCycle = forms.map((f) =>
      isLiveFormPredatesPrimaryEnrollment(primary, f.updated_at, nEnr)
        ? { form_type: f.form_type, updated_at: null, payload: null }
        : f
    )
    const stu = data.student
    const portalForHealth =
      stu.portal_diagnostico_enabled !== undefined || stu.portal_plano_90_enabled !== undefined
        ? {
            portal_diagnostico_enabled: !!stu.portal_diagnostico_enabled,
            portal_plano_90_enabled: !!stu.portal_plano_90_enabled,
          }
        : undefined
    const listRow = buildAdminStudentListRowFromDetail({
      student: data.student,
      enrollments: data.enrollments,
      form_snapshots: data.form_snapshots,
      calendar_sessions: data.calendar_sessions,
    })
    const calendarSoftens = listRow ? shouldSoftenPlanSilenceFromCalendar(listRow) : false
    const h = computeMentorHealth({
      enrollment: primary,
      form_snapshots: formsForCurrentCycle,
      portal: portalForHealth,
      calendarSoftensPlanSilence: calendarSoftens,
    })
    const listAttention = listRow ? computeAdminListAttention(listRow) : null
    const t = buildTimeline({
      notes: data.notes,
      form_snapshots: forms,
      enrollments: enrs,
    })
    return {
      health: h,
      listAttention,
      timeline: t,
      diagSummary:
        !diagStale && diagF?.payload ? getDiagnosticoSummary(diagF.payload) : null,
      planoSummary:
        !planoStale && planoF?.payload ? getPlanoSummary(planoF.payload) : null,
      primaryEnrollment: primary,
      diagStaleForCurrentCycle: diagStale,
      planoStaleForCurrentCycle: planoStale,
    }
  }, [data])

  const archiveByEnrollment = useMemo(() => {
    const m = new Map()
    for (const r of data?.enrollment_archive_index || []) {
      const eid = Number(r.enrollment_id)
      if (!Number.isFinite(eid)) continue
      if (!m.has(eid)) m.set(eid, {})
      m.get(eid)[r.form_type] = r.archived_at
    }
    return m
  }, [data])

  if (authLoad) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center text-slate-500" aria-hidden>
        …
      </div>
    )
  }
  if (initialLoadErr && !data) return <p className="text-red-600">{initialLoadErr}</p>
  if (!data) return <p className="text-slate-500">Carregando…</p>

  const s = data.student
  const linkedinAvatarUrl = linkedInAvatarUrlFromProfileField(s.linkedin)
  const contracts = data.contracts ?? []
  const calCounts = data.calendar_session_counts ?? {
    total: 0,
    completed: 0,
    scheduled: 0,
    cancelled: 0,
    not_held: 0,
  }
  const calSessions = data.calendar_sessions ?? []
  const dayPercent = health?.day != null ? Math.min(100, Math.round((health.day / 90) * 100)) : null
  const notesVisibleToStudent = (data.notes || []).filter((n) => n.visible_to_student !== false)

  return (
    <div className="space-y-8 pb-12">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a lista
        </Link>
        <button
          type="button"
          onClick={() => setCadModalOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <UserCog className="h-4 w-4 shrink-0" aria-hidden />
          Editar cadastro
        </button>
      </div>

      {/* Cabeçalho */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6 text-white shadow-lg sm:px-8 sm:py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-4 sm:gap-5">
            <div className="shrink-0">
              <div
                className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-2xl border-2 border-white/35 bg-white/10 shadow-md sm:h-[5.5rem] sm:w-[5.5rem]"
                title={linkedinAvatarUrl ? 'Foto via LinkedIn (serviço externo)' : undefined}
              >
                {linkedinAvatarUrl && !linkedinAvatarFailed ? (
                  <img
                    src={linkedinAvatarUrl}
                    alt=""
                    width={88}
                    height={88}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={() => setLinkedinAvatarFailed(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/50" aria-hidden>
                    <User className="h-9 w-9 sm:h-11 sm:w-11" />
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="h-5 w-5 shrink-0" aria-hidden />
                <span className="text-sm font-medium">Aluno</span>
              </div>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {s?.full_name || s?.email}
              </h1>
              <p className="mt-0.5 text-slate-400">{s?.email}</p>
              <p className="mt-2 text-sm text-slate-500">ID #{s?.id}</p>
              {(s?.phone || s?.city) && (
                <p className="mt-3 text-sm text-slate-300">
                  {[s.phone, s.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
          {listAttention && (
            <div
              className={`shrink-0 self-start rounded-xl border-2 px-3 py-2.5 sm:px-4 ${adminAttentionBandSurfaceClass(listAttention.band)}`}
              title={listAttention.detail}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situação (portal)</p>
              <p className="mt-0.5 flex items-center gap-2 text-sm font-bold">
                {listAttention.band === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                ) : (
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                )}
                {listAttention.label}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
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
          <Link
            to={`/admin/alunos/${id}/anotacoes-internas`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <Lock className="h-4 w-4" />
            Anotações internas
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Acesso no portal (aluno)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Novos alunos começam com diagnóstico e plano bloqueados no portal. Ao ativar abaixo, o aluno passa a ver os
          menus e o painel e pode preencher e salvar os formulários. Você continua podendo abrir e editar pela ficha de
          administração.
        </p>
        <ul className="mt-4 space-y-3">
          <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">Diagnóstico de carreira</p>
              <p className="text-xs text-slate-500">Formulário atual, arquivo e API do aluno</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <span className="sr-only">Liberar diagnóstico no portal do aluno</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={Boolean(s.portal_diagnostico_enabled)}
                disabled={portalAccessBusy}
                onChange={(e) => patchStudentPortalAccess({ portal_diagnostico_enabled: e.target.checked })}
              />
              {s.portal_diagnostico_enabled ? 'Liberado' : 'Bloqueado'}
            </label>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">Plano de 90 dias</p>
              <p className="text-xs text-slate-500">Formulário atual, arquivo e API do aluno</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <span className="sr-only">Liberar plano de 90 dias no portal do aluno</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={Boolean(s.portal_plano_90_enabled)}
                disabled={portalAccessBusy}
                onChange={(e) => patchStudentPortalAccess({ portal_plano_90_enabled: e.target.checked })}
              />
              {s.portal_plano_90_enabled ? 'Liberado' : 'Bloqueado'}
            </label>
          </li>
        </ul>
      </section>

      {/* Resumo operacional: ritmo 90d */}
      {health && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Dia no programa</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {health.day != null ? `Dia ${health.day} / 90` : '—'}
            </p>
            {health.day != null && dayPercent != null && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${dayPercent}%` }}
                />
              </div>
            )}
            {primaryEnrollment?.started_at == null && (
              <p className="mt-2 text-xs text-amber-700">Defina o início na inscrição para acompanhar o ritmo.</p>
            )}
            {health.day == null &&
              primaryEnrollment?.started_at &&
              isProgramStartDateInFuture(primaryEnrollment.started_at) && (
                <p className="mt-2 text-xs text-slate-600">
                  Início previsto em{' '}
                  <strong>
                    {new Date(primaryEnrollment.started_at).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}
                  </strong>
                  . O dia 1 do programa é nessa data — até lá não há contagem de dias.
                </p>
              )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Semana (referência)</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {health.week != null ? `Semana ${health.week} / 12` : '—'}
            </p>
            <p className="mt-2 text-xs text-slate-500">Baseada no início da inscrição (1 aula/sem. típica).</p>
            {health.week == null &&
              primaryEnrollment?.started_at &&
              isProgramStartDateInFuture(primaryEnrollment.started_at) && (
                <p className="mt-1 text-xs text-slate-600">A semana 1 passa a aplicar a partir do dia de início.</p>
              )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Últ. plano (portal)</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-800">{formatPt(health.lastPlanoAt)}</p>
            {health.daysSincePlano != null && (
              <p className="mt-1 text-xs text-slate-600">Há {health.daysSincePlano} dia(s) sem registro (salvamento automático).</p>
            )}
            {!health.hasPlano &&
              !(primaryEnrollment?.started_at && isProgramStartDateInFuture(primaryEnrollment.started_at)) && (
                <p className="mt-1 text-xs text-amber-700">Nenhum plano salvo ainda.</p>
              )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Últ. diagnóstico</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-800">{formatPt(health.lastDiagAt)}</p>
            {!health.hasDiag &&
              !(primaryEnrollment?.started_at && isProgramStartDateInFuture(primaryEnrollment.started_at)) && (
                <p className="mt-1 text-xs text-amber-700">Ainda sem diagnóstico salvo.</p>
              )}
          </div>
        </div>
      )}

      {data.enrollments && data.enrollments.length > 1 && (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="prev-cycles-heading"
        >
          <h2 id="prev-cycles-heading" className="text-lg font-bold text-slate-900">
            Ciclos anteriores (referência)
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            O quadro de ritmo no topo corresponde só à inscrição mais recente. Aqui mantém-se o contexto das linhas
            anteriores (datas e dia/semana calculados com base no início de cada uma; se existir data de fim, usa-se
            essa data como referência do “dia no programa”). Quando uma linha passa a <strong>concluída</strong> ou{' '}
            <strong>encerrada</strong>, o portal salva automaticamente uma cópia do diagnóstico e do plano daquele
            momento — abra com os botões abaixo (imprimir / PDF na tela seguinte).
          </p>
          <ul className="mt-4 space-y-3">
            {data.enrollments
              .slice(0, -1)
              .reverse()
              .map((en) => {
                const eidPrev = Number(en.id)
                const prog = getEnrollmentCycleProgress(en)
                const arch = archiveByEnrollment.get(eidPrev) || {}
                const hasDiagArch = Boolean(arch[FORM_TYPES.DIAG])
                const hasPlanoArch = Boolean(arch[FORM_TYPES.PLANO])
                const isClosed = en.state === 'concluida' || en.state === 'encerrada'
                return (
                  <li
                    key={en.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        Inscrição <span className="font-mono">#{en.id}</span>
                        <span className="ml-2 font-normal text-slate-600">
                          {formatProgramType(en.program_type)} · {en.state || '—'}
                        </span>
                      </span>
                      <span className="text-xs text-slate-500">Criada em {formatPt(en.created_at)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      Início: {en.started_at ? toDateInput(en.started_at) : '—'} · Fim:{' '}
                      {en.ended_at ? toDateInput(en.ended_at) : '—'}
                    </p>
                    <p className="mt-2 text-sm">
                      {prog?.day != null ? (
                        <>
                          Dia no programa ({prog.refLabel}): <strong>Dia {prog.day} / 90</strong>
                          {prog.week != null && (
                            <>
                              {' '}
                              · Semana <strong>{prog.week} / 12</strong>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-600">
                          {prog?.refLabel === 'sem data de início'
                            ? 'Sem data de início — defina nas linhas abaixo para ver o ritmo histórico.'
                            : prog?.refLabel === 'antes do início'
                              ? `Início previsto ${
                                  en.started_at
                                    ? new Date(en.started_at).toLocaleDateString('pt-BR', { dateStyle: 'medium' })
                                    : '—'
                                } — ritmo (dia/semana) só após essa data.`
                              : '—'}
                        </span>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">
                      {hasDiagArch && (
                        <Link
                          to={`/admin/alunos/${id}/diagnostico?arquivo=${eidPrev}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 sm:text-sm"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-blue-700" aria-hidden />
                          Diagnóstico (arquivo)
                          <span className="text-slate-500">· {formatPt(arch[FORM_TYPES.DIAG])}</span>
                        </Link>
                      )}
                      {hasPlanoArch && (
                        <Link
                          to={`/admin/alunos/${id}/plano-90-dias?arquivo=${eidPrev}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 sm:text-sm"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
                          Plano 90d (arquivo)
                          <span className="text-slate-500">· {formatPt(arch[FORM_TYPES.PLANO])}</span>
                        </Link>
                      )}
                      {isClosed && (!hasDiagArch || !hasPlanoArch) && (
                        <div className="w-full text-xs text-amber-950">
                          <p className="mb-2">
                            {!hasDiagArch && !hasPlanoArch
                              ? 'Ainda não há arquivo de formulários para este ciclo (vazio no encerramento ou encerrado antes desta funcionalidade).'
                              : 'Falta parte do arquivo. Você pode salvar uma cópia com os formulários que estão agora no portal — atenção: isso reflete o estado atual, não o passado, se já foram alterados para o ciclo novo.'}
                          </p>
                          <button
                            type="button"
                            disabled={snapBusyId === en.id}
                            onClick={() => snapshotFormsForEnrollment(en.id)}
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                          >
                            {snapBusyId === en.id ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                            ) : null}
                            {snapBusyId === en.id ? 'Salvando…' : 'Arquivar formulários atuais nesta inscrição'}
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
          </ul>
        </section>
      )}

      {health && health.messages.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Avisos automáticos</h2>
          <ul className="space-y-2">
            {health.messages.map((m, i) => (
              <li
                key={i}
                className={
                  m.level === 'high'
                    ? 'rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900'
                    : m.level === 'medium'
                      ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950'
                      : m.level === 'info'
                        ? 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800'
                        : 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800'
                }
              >
                {m.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inscrição e gestão */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">Inscrições (mentoria)</h2>
          <button
            type="button"
            disabled={addCycleBusy}
            onClick={() => setNewCycleModalOpen(true)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
          >
            {addCycleBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
            )}
            Nova inscrição (novo ciclo)
          </button>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p>
            Cada inscrição é um <strong>ciclo</strong> (datas, estado). O bloco de ritmo dos 90 dias no topo desta página
            usa sempre a inscrição <strong>mais recente</strong> (última criada). Novo ciclo = nova linha abaixo, mesmo
            produto <strong>Individual · 90 dias</strong>.
          </p>
          <p className="mt-2">
            <strong>Formulários ativos</strong> (diagnóstico e plano) são <strong>um registro por aluno</strong> no
            portal. Ao encerrar uma inscrição como <strong>concluída</strong> ou <strong>encerrada</strong>, o sistema
            salva uma <strong>cópia</strong> vinculada a essa linha (links na própria linha quando está encerrada e em{' '}
            <strong>Ciclos anteriores</strong>). Se a <strong>inscrição atual</strong> voltar a <strong>ativa</strong> e
            já existir cópia de um encerramento anterior, os links aparecem num bloco separado «último encerramento desta
            inscrição» — não confundir com o ciclo anterior nem com o formulário ao vivo.
            O resumo abaixo e as páginas de edição mostram sempre o último salvamento ao vivo.
          </p>
        </div>
        {(!data.enrollments || data.enrollments.length === 0) && (
          <p className="mt-4 text-slate-600">
            Sem inscrição registrada — use <strong>Nova inscrição</strong> ou crie o aluno pelo painel.
          </p>
        )}
        {data.enrollments && data.enrollments.length > 0 && (
          <div className="mt-4 space-y-4">
            {data.enrollments.map((en) => {
              const eid = Number(en.id)
              const isLast = eid === Number(primaryEnrollment?.id)
              const archRow = archiveByEnrollment.get(eid) || {}
              const hasDiagRow = Boolean(archRow[FORM_TYPES.DIAG])
              const hasPlanoRow = Boolean(archRow[FORM_TYPES.PLANO])
              const closedRow = en.state === 'concluida' || en.state === 'encerrada'
              const openRow = en.state === 'ativa' || en.state === 'agendada'
              /** Na inscrição atual em aberto, não misturar com os mesmos botões do estado — o arquivo é do último encerramento desta linha, não do “ciclo ao vivo”. */
              const showInlineArchiveLinks =
                (hasDiagRow || hasPlanoRow) && (!isLast || closedRow)
              const showSnapshotOnly = closedRow && (!hasDiagRow || !hasPlanoRow)
              const showReopenedArchiveBox = isLast && openRow && (hasDiagRow || hasPlanoRow)
              return (
                <div
                  key={en.id}
                  className={
                    isLast
                      ? 'rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-4'
                      : 'rounded-xl border border-slate-200 p-4'
                  }
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-500">
                      Inscrição <span className="font-mono text-slate-700">#{en.id}</span>
                      {isLast && <span className="ml-2 text-indigo-600">(atual / ritmo 90d)</span>}
                    </p>
                    <p className="text-xs text-slate-500">Criada em {formatPt(en.created_at)}</p>
                  </div>
                  <p className="text-sm text-slate-800">
                    Programa: <span className="font-medium">{formatProgramType(en.program_type)}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="text-xs text-slate-500">Estado</label>
                      <select
                        className="mt-0.5 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                        value={en.state}
                        onChange={(e) => updateEnrollment(en, { state: e.target.value })}
                      >
                        <option value="ativa">ativa</option>
                        <option value="agendada">agendada</option>
                        <option value="concluida">concluida</option>
                        <option value="encerrada">encerrada</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Início (data)</label>
                      <input
                        type="date"
                        className="mt-0.5 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                        value={toDateInput(en.started_at)}
                        onChange={(e) => updateEnrollment(en, { started_at: e.target.value || null })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Fim (data)</label>
                      <input
                        type="date"
                        className="mt-0.5 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                        value={toDateInput(en.ended_at)}
                        onChange={(e) => updateEnrollment(en, { ended_at: e.target.value || null })}
                      />
                    </div>
                  </div>
                  {(showInlineArchiveLinks || showSnapshotOnly) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">
                      {showInlineArchiveLinks && hasDiagRow && (
                        <Link
                          to={`/admin/alunos/${id}/diagnostico?arquivo=${eid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 sm:text-sm"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-blue-700" aria-hidden />
                          Diagnóstico (arquivo)
                          <span className="text-slate-500">· {formatPt(archRow[FORM_TYPES.DIAG])}</span>
                        </Link>
                      )}
                      {showInlineArchiveLinks && hasPlanoRow && (
                        <Link
                          to={`/admin/alunos/${id}/plano-90-dias?arquivo=${eid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 sm:text-sm"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
                          Plano 90d (arquivo)
                          <span className="text-slate-500">· {formatPt(archRow[FORM_TYPES.PLANO])}</span>
                        </Link>
                      )}
                      {showSnapshotOnly && (
                        <button
                          type="button"
                          disabled={snapBusyId === en.id}
                          onClick={() => snapshotFormsForEnrollment(en.id)}
                          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50 sm:text-sm"
                        >
                          {snapBusyId === en.id ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          ) : null}
                          {snapBusyId === en.id ? 'Salvando…' : 'Arquivar formulários atuais nesta inscrição'}
                        </button>
                      )}
                    </div>
                  )}
                  {showReopenedArchiveBox && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 shadow-sm">
                      <p className="font-semibold text-slate-900">
                        Arquivo do último encerramento desta inscrição (#{eid})
                      </p>
                      <p className="mt-1 leading-snug text-slate-600">
                        Cópia salva quando esta <strong>mesma linha</strong> esteve concluída ou encerrada antes de
                        voltar a ativa. Não corresponde ao formulário ao vivo dos cartões no topo (nem ao arquivo das
                        inscrições anteriores na secção «Ciclos anteriores»).
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {hasDiagRow && (
                          <Link
                            to={`/admin/alunos/${id}/diagnostico?arquivo=${eid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-100 sm:text-sm"
                          >
                            <FileText className="h-4 w-4 shrink-0 text-blue-700" aria-hidden />
                            Diagnóstico (último arquivo)
                            <span className="text-slate-500">· {formatPt(archRow[FORM_TYPES.DIAG])}</span>
                          </Link>
                        )}
                        {hasPlanoRow && (
                          <Link
                            to={`/admin/alunos/${id}/plano-90-dias?arquivo=${eid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-100 sm:text-sm"
                          >
                            <BookOpen className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
                            Plano 90d (último arquivo)
                            <span className="text-slate-500">· {formatPt(archRow[FORM_TYPES.PLANO])}</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Agendamentos (calendário) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Calendar className="h-5 w-5 text-indigo-700" aria-hidden />
              Agendamentos e aulas
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Aulas associadas a este aluno no Google Calendar do admin. Crie ou edite encontros em{' '}
              <Link to="/admin/calendario" className="font-medium text-indigo-700 hover:underline">
                Calendário
              </Link>
              .
            </p>
          </div>
        </div>
        <CalendarSessionsKpiGrid counts={calCounts} />
        {calSessions.length === 0 ? (
          <p className="text-sm text-slate-600">
            Ainda sem agendamentos associados a este aluno. No calendário admin, crie um evento e escolha este aluno
            na lista.
          </p>
        ) : (
          <ul className="space-y-3" aria-label="Lista de agendamentos">
            {calSessions.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{row.title || '(sem título)'}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sessionStatusChipClass(row.session_status)}`}
                    >
                      {sessionStatusLabelPt(row.session_status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {formatPt(row.starts_at)}
                    {row.ends_at ? ` · até ${formatPt(row.ends_at)}` : ''}
                    {row.time_zone ? ` · ${row.time_zone}` : ''}
                  </p>
                  {(row.session_reason_code || row.session_attribution) && (
                    <p className="mt-2 text-xs text-slate-700">
                      <span className="font-medium text-slate-800">Registo:</span>{' '}
                      {sessionAttributionLabelPt(row.session_attribution)} ·{' '}
                      {sessionReasonLabelPt(row.session_reason_code)}
                      {row.session_reason_note ? ` — ${row.session_reason_note}` : ''}
                    </p>
                  )}
                  {row.mentor_private_note ? (
                    <p className="mt-1 rounded border border-slate-200 bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Nota interna:</span> {row.mentor_private_note}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {row.meet_link ? (
                    <a
                      href={row.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-800 sm:text-sm"
                    >
                      <Video className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Meet
                    </a>
                  ) : null}
                  {row.google_html_link ? (
                    <a
                      href={row.google_html_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-slate-50 sm:text-sm"
                    >
                      Google Calendar
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Contratos assinados */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
          <ScrollText className="h-5 w-5 text-slate-600" aria-hidden />
          Contratos assinados
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Importe um ou mais PDFs ou imagens (PNG/JPEG). Cada envio adiciona um novo documento; você pode excluir arquivos individualmente.
        </p>
        <input
          ref={contractInputRef}
          type="file"
          accept=".pdf,application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={handleContractFile}
        />
        {contracts.length > 0 && (
          <ul className="mb-4 space-y-3" aria-label="Lista de contratos carregados">
            {contracts.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{c.file_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.content_type} · carregado em {formatPt(c.uploaded_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openContractPreview(c.id, c.file_name)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                  >
                    <Eye className="h-4 w-4 shrink-0" aria-hidden />
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractDeleteTarget({ id: c.id, file_name: c.file_name })}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={contractBusy}
          onClick={() => contractInputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-60"
        >
          {contractBusy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : contracts.length > 0 ? (
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Upload className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {contractBusy ? 'A enviar…' : contracts.length > 0 ? 'Adicionar outro contrato' : 'Importar contrato (PDF ou imagem)'}
        </button>
      </section>

      {/* Resultados resumidos (JSON) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">Diagnóstico — resumo</h2>
            <Link
              to={`/admin/alunos/${id}/diagnostico`}
              className="text-sm font-medium text-indigo-700 hover:underline"
            >
              Editar
            </Link>
          </div>
          {diagStaleForCurrentCycle ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              O último salvamento no portal é <strong>anterior</strong> à inscrição atual (novo ciclo), por isso este
              resumo não reflete o período em curso. Abra <strong>Editar</strong> para salvar o diagnóstico alinhado a
              este ciclo.
            </p>
          ) : diagSummary ? (
            <dl className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between gap-2">
                <dt>Total técnico</dt>
                <dd className="font-semibold">
                  {diagSummary.tech} <span className="text-slate-400">/ {diagSummary.techMax}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Total carreira</dt>
                <dd className="font-semibold">
                  {diagSummary.career} <span className="text-slate-400">/ {diagSummary.careerMax}</span>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Perfil</dt>
                <dd className="mt-0.5">{diagSummary.profileLabel}</dd>
              </div>
              {diagSummary.goals?.length > 0 && (
                <div>
                  <dt className="text-slate-500">Objetivos (até 2)</dt>
                  <dd className="mt-0.5">{diagSummary.goals.join(' · ')}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-slate-600">Ainda sem dados de diagnóstico salvos.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">Plano 90d — resumo</h2>
            <Link
              to={`/admin/alunos/${id}/plano-90-dias`}
              className="text-sm font-medium text-indigo-700 hover:underline"
            >
              Editar
            </Link>
          </div>
          {planoStaleForCurrentCycle ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              O último salvamento no portal é <strong>anterior</strong> à inscrição atual (novo ciclo), por isso este
              resumo não reflete o período em curso. Abra <strong>Editar</strong> para atualizar o plano a este ciclo.
            </p>
          ) : planoSummary ? (
            <div className="text-sm text-slate-700">
              <p className="text-slate-500">Foco / objetivo principal</p>
              <p className="mt-1 line-clamp-4 font-medium leading-relaxed text-slate-900">{planoSummary.headline}</p>
              <p className="mt-2 text-xs text-slate-500">
                Tabela semanal: {planoSummary.hasWeeksWithText ? 'com anotações' : 'a preencher'}
              </p>
            </div>
          ) : (
            <p className="text-slate-600">Ainda sem plano salvo.</p>
          )}
        </div>
      </div>

      {/* Linha do tempo (histórico) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
          <History className="h-5 w-5 text-slate-600" />
          Histórico
        </h2>
        <p className="mb-6 text-sm text-slate-600">Notas do mentor, envios de formulários e criação de inscrição (mais recente primeiro).</p>
        {timeline.length === 0 && <p className="text-slate-500">Sem eventos registrados ainda.</p>}
        {timeline.length > 0 && (
          <ol className="ml-0.5 space-y-0 border-l-2 border-slate-200 pl-5">
            {timeline.map((ev: Record<string, unknown>) => {
              return (
                <li key={String(ev.id)} className="relative pb-6 pl-1 last:pb-0">
                  <span
                    className="absolute -left-[9px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400"
                    aria-hidden
                  />
                  <p className="text-xs font-medium uppercase text-slate-500">
                    {formatPt(ev.at as string)}
                    {ev.kind === 'formulario' && ' · Formulário'}
                    {ev.kind === 'nota' && ' · Nota'}
                    {ev.kind === 'inscricao' && ' · Inscrição'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {ev.title as React.ReactNode}
                    {ev.kind === 'formulario' && ev.form_type && (
                      <span className="ml-1 font-normal text-slate-500">
                        ({String(ev.form_type).replace(/^altzen-/, '')})
                      </span>
                    )}
                  </p>
                  {ev.kind === 'nota' && ev.sub && (
                    <p className="text-xs text-slate-500">{ev.sub as React.ReactNode}</p>
                  )}
                  {ev.body && (
                    <p className="mt-1 line-clamp-3 text-sm text-slate-600">{stripHtmlToPlain(ev.body as string)}</p>
                  )}
                  {ev.kind === 'nota' && ev.noteId != null && (() => {
                    const n = (data?.notes || []).find((x) => x.id === ev.noteId)
                    if (!n) return null
                    if (n.visible_to_student === false) {
                      return (
                        <Link
                          to={`/admin/alunos/${id}/anotacoes-internas?edit=${ev.noteId}`}
                          className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100"
                        >
                          <Lock className="h-3.5 w-3.5" aria-hidden />
                          Ver na ficha interna
                        </Link>
                      )
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => startEditNote(n)}
                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Editar nota
                      </button>
                    )
                  })()}
                  {ev.kind === 'inscricao' && ev.details && (
                    <p className="text-sm text-slate-600">{ev.details as React.ReactNode}</p>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* Notas (ação) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Notas ao aluno</h2>
        <p className="mt-1 text-sm text-slate-600">
          Conteúdo com <strong>formatação</strong> (negrito, títulos, listas, links no texto), mais links e anexos em
          baixo (PDF, imagens, ZIP ou RAR). Aparece em Recursos quando estiver <strong>visível</strong>. Para relatório
          só da mentoria, use{' '}
          <Link
            to={`/admin/alunos/${id}/anotacoes-internas`}
            className="font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
          >
            Anotações internas
          </Link>
          .
        </p>

        {notesVisibleToStudent.length > 0 && (
          <ul className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            {notesVisibleToStudent.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{n.title || 'Sem título'}</p>
                  <p className="text-xs text-slate-500">
                    {formatPt(n.created_at)}
                    {n.updated_at && n.updated_at !== n.created_at ? ` · editada ${formatPt(n.updated_at)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEditNote(n)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={saveNote} className="mt-4 space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">
              {editingNoteId != null ? `Editar nota #${editingNoteId}` : 'Nova nota'}
            </p>
            {editingNoteId != null && (
              <button
                type="button"
                onClick={resetNoteComposer}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancelar edição
              </button>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              checked={noteVisibleToStudent}
              onChange={(e) => setNoteVisibleToStudent(e.target.checked)}
            />
            Visível ao aluno (Recursos)
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="Título (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Mensagem</p>
            <MentorNoteRichTextEditor
              key={editingNoteId != null ? `edit-${editingNoteId}` : `draft-${noteDraftKey}`}
              initialContent={body}
              onChange={setBody}
              disabled={noteSaving}
              placeholder="Escreva para o aluno. Use a barra para negrito, secções e listas."
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
              Anexos (PDF, PNG, JPEG, ZIP, RAR — máx. 8 MB cada, até {NOTE_ANEXOS_MAX} por nota)
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
                          onClick={() => openAdminNoteFile(f.id, f.file_name)}
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
            {noteSaving ? 'Salvando…' : editingNoteId != null ? 'Salvar alterações' : 'Enviar nota'}
          </button>
        </form>
      </section>

      {newCycleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={newCycleModalTitleId}
        >
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden
            onClick={() => !addCycleBusy && setNewCycleModalOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={newCycleModalTitleId} className="text-lg font-bold text-slate-900">
              Iniciar novo ciclo?
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Será criada uma <strong>nova inscrição</strong> (Individual · 90 dias). O ritmo no topo da ficha passará a
              seguir esta linha. Confirme apenas se for intencional — não é possível excluir inscrições aqui.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={addCycleBusy}
                onClick={() => setNewCycleModalOpen(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={addCycleBusy}
                onClick={addMentorshipCycle}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                {addCycleBusy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : null}
                {addCycleBusy ? 'A criar…' : 'Sim, criar novo ciclo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {contractDeleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={contractDeleteModalTitleId}
        >
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden
            onClick={() => !contractDeleteBusy && setContractDeleteTarget(null)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={contractDeleteModalTitleId} className="text-lg font-bold text-slate-900">
              Remover contrato?
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              O arquivo <strong className="break-all font-medium text-slate-900">{contractDeleteTarget.file_name}</strong>{' '}
              será removido da ficha deste aluno. Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={contractDeleteBusy}
                onClick={() => setContractDeleteTarget(null)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={contractDeleteBusy}
                onClick={confirmRemoveContract}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {contractDeleteBusy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : null}
                {contractDeleteBusy ? 'A remover…' : 'Sim, remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={cadModalTitleId}
        >
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden
            onClick={() => setCadModalOpen(false)}
          />
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id={cadModalTitleId} className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <UserCog className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
                Editar cadastro do aluno
              </h2>
              <button
                type="button"
                onClick={() => setCadModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              E-mail de acesso, dados pessoais e endereço. Nova senha (mín. 6 caracteres) só se quiser alterar — deixe em
              branco para manter.
            </p>
            <form onSubmit={saveCadastro} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Acesso</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase text-slate-500">E-mail</label>
                <input
                  type="text"
                  inputMode="email"
                  required
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadEmail}
                  onChange={(e) => setCadEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="nome@exemplo.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase text-slate-500">Nova senha (opcional)</label>
                <input
                  type="password"
                  className="mt-0.5 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadPassword}
                  onChange={(e) => setCadPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••"
                />
              </div>
              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Identificação</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase text-slate-500">Nome completo</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadFullName}
                  onChange={(e) => setCadFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">Telefone</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadPhone}
                  onChange={(e) => setCadPhone(maskPhoneBrInput(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">Data de nascimento</label>
                <input
                  type="date"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadBirthDate}
                  onChange={(e) => setCadBirthDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">CPF</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadCpf}
                  onChange={(e) => setCadCpf(maskCpfInput(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">RG / documento</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadRg}
                  onChange={(e) => setCadRg(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Endereço</p>
              </div>
              <div className="sm:col-span-2 sm:max-w-xs">
                <label className="text-xs font-medium uppercase text-slate-500">CEP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadPostal}
                  onChange={(e) => {
                    const next = maskCepInput(e.target.value)
                    setCadPostal(next)
                    if (onlyDigits(next).length !== 8) cadCepLastLookupRef.current = ''
                  }}
                  placeholder="00000-000"
                  aria-busy={cadCepLoading}
                />
                {cadCepLoading && (
                  <p className="mt-1 text-xs text-slate-500">Buscando endereço pelo CEP…</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase text-slate-500">Logradouro e número</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadStreet}
                  onChange={(e) => setCadStreet(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">Complemento</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadComplement}
                  onChange={(e) => setCadComplement(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">Bairro</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadDistrict}
                  onChange={(e) => setCadDistrict(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">Cidade</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadCity}
                  onChange={(e) => setCadCity(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadState}
                  onChange={(e) =>
                    setCadState(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))
                  }
                  placeholder="SP"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase text-slate-500">País</label>
                <input
                  type="text"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadCountry}
                  onChange={(e) => setCadCountry(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Links</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase text-slate-500">LinkedIn</label>
                <input
                  type="url"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadLinkedin}
                  onChange={(e) => setCadLinkedin(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase text-slate-500">GitHub</label>
                <input
                  type="url"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={cadGithub}
                  onChange={(e) => setCadGithub(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={cadBusy}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {cadBusy ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {cadBusy ? 'Salvando…' : 'Salvar cadastro'}
                </button>
                <button
                  type="button"
                  onClick={() => setCadModalOpen(false)}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contractPreviewOpen && contractPreviewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={contractPreviewTitleId}
        >
          <div
            className="absolute inset-0 bg-slate-900/50"
            aria-hidden
            onClick={closeContractPreview}
          />
          <div
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h2 id={contractPreviewTitleId} className="truncate text-lg font-bold text-slate-900">
                {contractPreviewLabel || 'Contrato'}
              </h2>
              <button
                type="button"
                onClick={closeContractPreview}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-2">
              {contractPreviewKind === 'pdf' ? (
                <iframe
                  title="Pré-visualização do contrato"
                  src={contractPreviewUrl}
                  className="h-[min(80vh,720px)] w-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={contractPreviewUrl}
                  alt="Contrato assinado"
                  className="mx-auto max-h-[min(80vh,720px)] w-auto max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <StudentAssistantWidget
        firstName={profile?.full_name ? String(profile.full_name).split(/\s+/)[0] : 'mentor'}
        adminStudentId={Number(id)}
        adminStudentLabel={data?.student?.full_name ? String(data.student.full_name) : `Aluno #${id}`}
      />
    </div>
  )
}
