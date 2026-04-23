import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../lib/api.js'
import {
  maskCpfInput,
  maskPhoneBrInput,
  maskCepInput,
  onlyDigits,
  fetchAddressByCep,
} from '../lib/brInputs.js'
import { KeyRound, Loader2, Save, User } from 'lucide-react'

const inputClass = 'mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-sm'

export default function ProfilePage() {
  const { profile, user, refreshMe } = useAuth()
  const toast = useToast()
  const [full_name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [github, setGithub] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [birth_date, setBirthDate] = useState('')
  const [street_address, setStreet] = useState('')
  const [address_complement, setComplement] = useState('')
  const [address_district, setDistrict] = useState('')
  const [state_region, setStateRegion] = useState('')
  const [postal_code, setPostal] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const profileCepLookupRef = useRef('')

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setPhone(maskPhoneBrInput(profile.phone || ''))
      setCity(profile.city || '')
      setLinkedin(profile.linkedin || '')
      setGithub(profile.github || '')
      setCpf(maskCpfInput(profile.cpf || ''))
      setRg(profile.rg || '')
      setBirthDate(profile.birth_date ? String(profile.birth_date).slice(0, 10) : '')
      setStreet(profile.street_address || '')
      setComplement(profile.address_complement || '')
      setDistrict(profile.address_district || '')
      setStateRegion(String(profile.state_region || '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 2))
      const cepMasked = maskCepInput(profile.postal_code || '')
      setPostal(cepMasked)
      setCountry(profile.country || '')
      profileCepLookupRef.current = onlyDigits(cepMasked).slice(0, 8)
    }
  }, [profile])

  const profileCepDigits = onlyDigits(postal_code).slice(0, 8)
  useEffect(() => {
    if (!profile || profileCepDigits.length !== 8) return
    if (profileCepDigits === profileCepLookupRef.current) return
    let cancelled = false
    const t = setTimeout(async () => {
      setCepLoading(true)
      try {
        const addr = await fetchAddressByCep(profileCepDigits)
        if (cancelled || !addr) return
        profileCepLookupRef.current = profileCepDigits
        setStreet((s) => addr.street_address || s)
        setDistrict((s) => addr.address_district || s)
        setCity((s) => addr.city || s)
        setStateRegion((s) => addr.state_region || s)
      } catch {
        /* ignorar */
      } finally {
        if (!cancelled) setCepLoading(false)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [profile, profileCepDigits])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name,
          phone,
          city,
          linkedin,
          github,
          cpf,
          rg,
          birth_date: birth_date || null,
          street_address,
          address_complement,
          address_district,
          state_region,
          postal_code,
          country,
        }),
      })
      await refreshMe()
      toast.success('Cadastro salvo com sucesso.')
    } catch (e2) {
      toast.error(e2.message || 'Não foi possível salvar o cadastro.')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da nova senha não coincide.')
      return
    }
    if (String(newPassword).length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (!currentPassword) {
      toast.error('Digite a senha atual.')
      return
    }
    setPasswordSaving(true)
    try {
      await api('/me/password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Senha alterada com sucesso.')
    } catch (e2) {
      toast.error(e2.message || 'Não foi possível alterar a senha.')
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">Perfil e cadastro</h1>
      <p className="text-slate-600">E-mail: {user?.email} (não editável aqui)</p>
      {profile?.role && (
        <p className="text-sm text-slate-500">
          Função:{' '}
          <span className="font-medium">
            {profile.role === 'admin' ? 'Administrador' : 'Aluno'}
          </span>
        </p>
      )}

      <section
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="perfil-cadastro-heading"
      >
        <h2 id="perfil-cadastro-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <User className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
          Dados do cadastro
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Informações pessoais, endereço e links. Use <strong>Salvar</strong> para enviar as alterações ao servidor.
        </p>

        <form onSubmit={save} className="mt-4 space-y-6" aria-busy={saving}>
        <fieldset className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Identificação</legend>
          <div>
            <label className="text-sm text-slate-600">Nome completo</label>
            <input className={inputClass} value={full_name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-slate-600">Telefone</label>
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(maskPhoneBrInput(e.target.value))}
                inputMode="numeric"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Data de nascimento</label>
              <input className={inputClass} type="date" value={birth_date} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">CPF</label>
              <input
                className={inputClass}
                value={cpf}
                onChange={(e) => setCpf(maskCpfInput(e.target.value))}
                inputMode="numeric"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">RG / documento</label>
              <input className={inputClass} value={rg} onChange={(e) => setRg(e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Endereço</legend>
          <div className="max-w-xs">
            <label className="text-sm text-slate-600">CEP</label>
            <input
              className={inputClass}
              value={postal_code}
              onChange={(e) => {
                const next = maskCepInput(e.target.value)
                setPostal(next)
                if (onlyDigits(next).length !== 8) profileCepLookupRef.current = ''
              }}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              aria-busy={cepLoading}
            />
            {cepLoading && <p className="mt-1 text-xs text-slate-500">Buscando endereço pelo CEP…</p>}
          </div>
          <div>
            <label className="text-sm text-slate-600">Logradouro e número</label>
            <input className={inputClass} value={street_address} onChange={(e) => setStreet(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-slate-600">Complemento</label>
              <input className={inputClass} value={address_complement} onChange={(e) => setComplement(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Bairro</label>
              <input className={inputClass} value={address_district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Cidade</label>
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">UF</label>
              <input
                className={inputClass}
                value={state_region}
                onChange={(e) =>
                  setStateRegion(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))
                }
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">País</label>
              <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Links</legend>
          <div>
            <label className="text-sm text-slate-600">LinkedIn</label>
            <input className={inputClass} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">GitHub</label>
            <input className={inputClass} value={github} onChange={(e) => setGithub(e.target.value)} />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Salvando…
            </>
          ) : (
            <>
              <Save className="h-4 w-4 shrink-0" aria-hidden />
              Salvar
            </>
          )}
        </button>
        </form>
      </section>

      <section
        className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="perfil-seguranca-heading"
      >
        <h2 id="perfil-seguranca-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <KeyRound className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
          Segurança
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Troque a senha de acesso ao portal informando a senha atual e a nova senha duas vezes para confirmar.
        </p>

        <form onSubmit={changePassword} className="mt-4 space-y-4" aria-busy={passwordSaving}>
        <fieldset className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Trocar senha</legend>
          <p className="text-xs text-slate-500">É preciso informar a senha atual, a nova senha e a confirmação.</p>
          <div>
            <label className="text-sm text-slate-600" htmlFor="perfil-senha-atual">
              Senha atual
            </label>
            <input
              id="perfil-senha-atual"
              className={inputClass}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600" htmlFor="perfil-nova-senha">
              Nova senha
            </label>
            <input
              id="perfil-nova-senha"
              className={inputClass}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600" htmlFor="perfil-confirmar-senha">
              Confirmar nova senha
            </label>
            <input
              id="perfil-confirmar-senha"
              className={inputClass}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={passwordSaving}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {passwordSaving ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Atualizando…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
              Atualizar senha
            </>
          )}
        </button>
        </form>
      </section>
    </div>
  )
}
