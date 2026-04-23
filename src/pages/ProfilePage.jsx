import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { Save } from 'lucide-react'

const inputClass = 'mt-0.5 w-full rounded border border-slate-300 px-3 py-2 text-sm'

export default function ProfilePage() {
  const { profile, user, refreshMe } = useAuth()
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
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setPhone(profile.phone || '')
      setCity(profile.city || '')
      setLinkedin(profile.linkedin || '')
      setGithub(profile.github || '')
      setCpf(profile.cpf || '')
      setRg(profile.rg || '')
      setBirthDate(profile.birth_date ? String(profile.birth_date).slice(0, 10) : '')
      setStreet(profile.street_address || '')
      setComplement(profile.address_complement || '')
      setDistrict(profile.address_district || '')
      setStateRegion(profile.state_region || '')
      setPostal(profile.postal_code || '')
      setCountry(profile.country || '')
    }
  }, [profile])

  const save = async (e) => {
    e.preventDefault()
    setMessage('')
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
      setMessage('Salvo.')
    } catch (e) {
      setMessage(e.message || 'Erro')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Perfil e cadastro</h1>
      <p className="text-slate-600">E-mail: {user?.email} (não editável aqui)</p>
      {profile?.role && (
        <p className="text-sm text-slate-500">
          Função:{' '}
          <span className="font-medium">
            {profile.role === 'admin' ? 'Administrador' : 'Aluno'}
          </span>
        </p>
      )}

      <form onSubmit={save} className="mt-6 max-w-2xl space-y-6">
        {message && (
          <p className={`text-sm ${message === 'Salvo.' ? 'text-emerald-700' : 'text-red-600'}`}>{message}</p>
        )}

        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Identificação</legend>
          <div>
            <label className="text-sm text-slate-600">Nome completo</label>
            <input className={inputClass} value={full_name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-slate-600">Telefone</label>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Data de nascimento</label>
              <input className={inputClass} type="date" value={birth_date} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">CPF</label>
              <input className={inputClass} value={cpf} onChange={(e) => setCpf(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">RG / documento</label>
              <input className={inputClass} value={rg} onChange={(e) => setRg(e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Endereço</legend>
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
                onChange={(e) => setStateRegion(e.target.value)}
                maxLength={2}
                placeholder="SP"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">CEP</label>
              <input className={inputClass} value={postal_code} onChange={(e) => setPostal(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">País</label>
              <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
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

        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white">
          <Save className="h-4 w-4" />
          Salvar
        </button>
      </form>
    </div>
  )
}
