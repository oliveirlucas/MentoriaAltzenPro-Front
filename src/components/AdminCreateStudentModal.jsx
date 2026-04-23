import React, { useState, useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { api } from '../lib/api.js'
import { emitAdminStudentsRefresh } from '../lib/adminEvents.js'
import { DEFAULT_MENTORSHIP_PROGRAM, formatProgramType } from '../lib/programType.js'

const emptyForm = () => ({
  email: '',
  password: '',
  full_name: '',
  phone: '',
  cpf: '',
  rg: '',
  birth_date: '',
  street_address: '',
  address_complement: '',
  address_district: '',
  city: '',
  state_region: '',
  postal_code: '',
  country: 'Brasil',
  linkedin: '',
  github: '',
})

export default function AdminCreateStudentModal({ open, onClose }) {
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const titleId = useId()

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!open) {
      setMessage('')
      return
    }
    setForm(emptyForm())
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)
    try {
      const body = {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim() || null,
        phone: form.phone.trim() || null,
        cpf: form.cpf.trim() || null,
        rg: form.rg.trim() || null,
        birth_date: form.birth_date.trim() || null,
        street_address: form.street_address.trim() || null,
        address_complement: form.address_complement.trim() || null,
        address_district: form.address_district.trim() || null,
        city: form.city.trim() || null,
        state_region: form.state_region.trim() || null,
        postal_code: form.postal_code.trim() || null,
        country: form.country.trim() || null,
        linkedin: form.linkedin.trim() || null,
        github: form.github.trim() || null,
      }
      await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setForm(emptyForm())
      emitAdminStudentsRefresh()
      onClose()
    } catch (err) {
      setMessage(err.message || 'Erro ao criar conta')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const inputCls = 'mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden onClick={onClose} />
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-lg font-bold text-slate-900">
            Criar aluno
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Preencha o máximo possível — tudo é opcional exceto <strong>e-mail</strong> e <strong>senha</strong>. O aluno
          entra no portal com esses dados de acesso.
        </p>
        <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 text-sm text-indigo-950">
          <p className="font-medium text-indigo-900">Mentoria oferecida</p>
          <p className="mt-0.5 text-indigo-900/90">
            {formatProgramType(DEFAULT_MENTORSHIP_PROGRAM)} — é criada automaticamente a primeira inscrição. Novo
            ciclo depois: na ficha use <strong>Nova inscrição</strong>.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-6">
          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Acesso ao portal</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">E-mail</label>
                <input
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                  type="email"
                  autoComplete="off"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">Senha (mín. 6)</label>
                <input
                  className={inputCls}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  minLength={6}
                  required
                  type="password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Identificação</legend>
            <div>
              <label className="text-xs font-medium text-slate-600">Nome completo</label>
              <input className={inputCls} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Telefone</label>
                <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Data de nascimento</label>
                <input
                  className={inputCls}
                  value={form.birth_date}
                  onChange={(e) => set('birth_date', e.target.value)}
                  type="date"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">CPF</label>
                <input className={inputCls} value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">RG / documento</label>
                <input className={inputCls} value={form.rg} onChange={(e) => set('rg', e.target.value)} />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Endereço</legend>
            <div>
              <label className="text-xs font-medium text-slate-600">Logradouro e número</label>
              <input
                className={inputCls}
                value={form.street_address}
                onChange={(e) => set('street_address', e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Complemento</label>
                <input
                  className={inputCls}
                  value={form.address_complement}
                  onChange={(e) => set('address_complement', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Bairro</label>
                <input
                  className={inputCls}
                  value={form.address_district}
                  onChange={(e) => set('address_district', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Cidade</label>
                <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">UF</label>
                <input
                  className={inputCls}
                  value={form.state_region}
                  onChange={(e) => set('state_region', e.target.value)}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">CEP</label>
                <input className={inputCls} value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">País</label>
                <input className={inputCls} value={form.country} onChange={(e) => set('country', e.target.value)} />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Links</legend>
            <div>
              <label className="text-xs font-medium text-slate-600">LinkedIn</label>
              <input
                className={inputCls}
                value={form.linkedin}
                onChange={(e) => set('linkedin', e.target.value)}
                placeholder="https://…"
                type="url"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">GitHub</label>
              <input
                className={inputCls}
                value={form.github}
                onChange={(e) => set('github', e.target.value)}
                placeholder="https://…"
                type="url"
              />
            </div>
          </fieldset>

          {message && <p className="text-sm text-red-600">{message}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-800 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Criando…' : 'Criar aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
