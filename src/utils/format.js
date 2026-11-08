/** Utilidades de formato en español (fechas, números, señal). */

const RELATIVE = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'sin sincronizar'
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  const abs = Math.abs(seconds)

  if (abs < 10) return 'hace instantes'
  if (abs < 60) return RELATIVE.format(Math.round(seconds), 'second')
  if (abs < 3600) return RELATIVE.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return RELATIVE.format(Math.round(seconds / 3600), 'hour')
  return RELATIVE.format(Math.round(seconds / 86400), 'day')
}

export function formatBattery(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'sin dato'
  return `${Math.round(value)} %`
}

export function formatRssi(value) {
  if (value === null || value === undefined) return 'sin señal'
  return `${value} dBm`
}

export function formatLongDate(date = new Date()) {
  const formatted = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
