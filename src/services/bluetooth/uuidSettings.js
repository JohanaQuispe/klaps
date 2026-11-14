/**
 * Configuración de UUID del firmware, compartida por la app.
 * Se guarda en localStorage para no tocar código al cambiar de placa.
 */

const SERVICE_KEY = 'klaps.ble.serviceUuid'
const SENSORS_KEY = 'klaps.ble.sensorsUuid'

const EMPTY = { service: '', sensors: '' }

/**
 * Normaliza un UUID pegado desde el firmware.
 * Acepta 16 bits («180F»), 128 bits con guiones, 32 caracteres sin guiones,
 * prefijo 0x, mayúsculas, espacios y llaves. Devuelve '' si no es válido.
 */
export function normalizeUuid(value = '') {
  let uuid = String(value).trim().toLowerCase().replace(/^0x/, '').replace(/[{}\s]/g, '')

  if (/^[0-9a-f]{32}$/.test(uuid)) {
    uuid = `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`
  }

  if (/^[0-9a-f]{4}$/.test(uuid)) return uuid
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)) return uuid
  return ''
}

/** ¿Tiene forma de UUID de Bluetooth (16 o 128 bits)? */
export function isValidUuid(value = '') {
  return normalizeUuid(value) !== ''
}

export function loadUuidSettings() {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    return {
      service: window.localStorage.getItem(SERVICE_KEY) ?? '',
      sensors: window.localStorage.getItem(SENSORS_KEY) ?? '',
    }
  } catch {
    return { ...EMPTY }
  }
}

/**
 * Guarda los UUID. Si un campo llega vacío o inválido se conserva el valor
 * guardado previamente, para no borrar el otro por accidente.
 */
export function saveUuidSettings({ service = '', sensors = '' }) {
  const previous = loadUuidSettings()
  const nextService = normalizeUuid(service)
  const nextSensors = normalizeUuid(sensors)

  const next = {
    service: service.trim() === '' ? '' : nextService || previous.service,
    sensors: sensors.trim() === '' ? '' : nextSensors || previous.sensors,
  }

  if (typeof window !== 'undefined') {
    try {
      if (next.service) window.localStorage.setItem(SERVICE_KEY, next.service)
      else window.localStorage.removeItem(SERVICE_KEY)

      if (next.sensors) window.localStorage.setItem(SENSORS_KEY, next.sensors)
      else window.localStorage.removeItem(SENSORS_KEY)
    } catch {
      // almacenamiento no disponible (modo privado): se usa solo en memoria
    }
  }

  return next
}

/** ¿Se pueden leer ya los sensores con la configuración actual? */
export function isSensorProtocolConfigured(settings = loadUuidSettings()) {
  return Boolean(settings.service && settings.sensors)
}
