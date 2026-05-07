export const NOTE_ANEXOS_MAX = 8

export function statusChipStyle(status: string): string {
  switch (status) {
    case 'critico':
      return 'border-red-200 bg-red-50 text-red-900'
    case 'atraso':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'atencao':
      return 'border-yellow-200 bg-yellow-50 text-yellow-900'
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'critico':
      return 'Atenção: possível atraso crítico'
    case 'atraso':
      return 'Atraso / acompanhar de perto'
    case 'atencao':
      return 'Atenção'
    default:
      return 'Em dia'
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = String(reader.result)
      const i = s.indexOf(',')
      resolve(i >= 0 ? s.slice(i + 1) : s)
    }
    reader.onerror = () => reject(new Error('Leitura do arquivo falhou'))
    reader.readAsDataURL(file)
  })
}
