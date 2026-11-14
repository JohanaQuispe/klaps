/**
 * Configuración de UUID del firmware, compartida por la app.
 * Se guarda en localStorage para no tocar código al cambiar de placa.
 */

const SERVICE_KEY = 'klaps.ble.serviceUuid'
const SENSORS_KEY = 'klaps.ble.sensorsUuid'

const EMPTY = { service: '', sensors: '' }

/** ¿Tiene forma de UUID de Bluetooth (16 o 128 bits)? */
export function isValidUuid(value = '') {
  const uuid = value.trim().toLowerCase()
  return (
    /^[0-9a-f]{4}$/.test(uuid) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)
  )
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

export function saveUuidSettings({ service = '', sensors = '' }) {
  const next = {
    service: isValidUuid(service) ? service.trim().toLowerCase() : '',
    sensors: isValidUuid(sensors) ? sensors.trim().toLowerCase() : '',
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
