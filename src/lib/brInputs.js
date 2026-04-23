/** @param {unknown} s */
export function onlyDigits(s) {
  return String(s ?? '').replace(/\D/g, '')
}

/** Máscara CPF: até 11 dígitos → 000.000.000-00 */
export function maskCpfInput(raw) {
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

/** Celular/fixo BR: até 11 dígitos (DDD + número). Máscara (00) 00000-0000 ou (00) 0000-0000 */
export function maskPhoneBrInput(raw) {
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

/** CEP: 8 dígitos → 00000-000 */
export function maskCepInput(raw) {
  const d = onlyDigits(raw).slice(0, 8)
  if (d.length <= 5) return d
  return d.slice(0, 5) + '-' + d.slice(5)
}

/** E-mail deve conter @ e caractere após o @ */
export function emailHasValidAt(raw) {
  const t = String(raw ?? '').trim()
  const i = t.indexOf('@')
  return i > 0 && i < t.length - 1
}

/**
 * @param {string} cepDigits8
 * @returns {Promise<{ street_address: string, address_district: string, city: string, state_region: string } | null>}
 */
export async function fetchAddressByCep(cepDigits8) {
  const cep = onlyDigits(cepDigits8).slice(0, 8)
  if (cep.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!res.ok) return null
  const j = await res.json()
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
