export function onlyDigits(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '')
}

export function maskCpfInput(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11)
  if (!d.length) return ''
  const a = d.slice(0, 3)
  const b = d.slice(3, 6)
  const c = d.slice(6, 9)
  const e = d.slice(9, 11)
  let out = a
  if (b) out += '.' + b
  if (c) out += '.' + c
  if (e) out += '-' + e
  return out
}

export function maskPhoneBrInput(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11)
  if (!d.length) return ''
  if (d.length <= 2) return '(' + d
  const ddd = d.slice(0, 2)
  const r = d.slice(2)
  const head = '(' + ddd + ') '
  if (!r.length) return head.trimEnd()
  if (d.length <= 6) return head + r
  const mobile = r.length > 0 && r[0] === '9'
  if (mobile || d.length >= 11) {
    const a = r.slice(0, 5)
    const b = r.slice(5, 9)
    return b.length ? head + a + '-' + b : head + a
  }
  const a = r.slice(0, 4)
  const b = r.slice(4, 8)
  return b.length ? head + a + '-' + b : head + a
}

export function maskCepInput(raw: string): string {
  const d = onlyDigits(raw).slice(0, 8)
  if (d.length <= 5) return d
  return d.slice(0, 5) + '-' + d.slice(5)
}

export function emailHasValidAt(raw: unknown): boolean {
  const t = String(raw ?? '').trim()
  const i = t.indexOf('@')
  return i > 0 && i < t.length - 1
}

export type ViaCepAddress = {
  street_address: string
  address_district: string
  city: string
  state_region: string
}

export async function fetchAddressByCep(cepDigits8: string): Promise<ViaCepAddress | null> {
  const cep = onlyDigits(cepDigits8).slice(0, 8)
  if (cep.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!res.ok) return null
  const j = (await res.json()) as {
    erro?: boolean
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }
  if (!j || j.erro) return null
  return {
    street_address: String(j.logradouro || '').trim(),
    address_district: String(j.bairro || '').trim(),
    city: String(j.localidade || '').trim(),
    state_region: String(j.uf || '')
      .trim()
      .slice(0, 2)
      .toUpperCase(),
  }
}
