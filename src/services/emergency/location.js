/**
 * Ubicación para emergencias.
 *
 * El permiso del navegador no se puede pedir en el momento crítico: si el
 * usuario tiene el móvil en el bolsillo y el aviso salta solo, el navegador
 * puede bloquear la petición (o tardar más que la cuenta atrás) y el mensaje
 * saldría sin coordenadas. Por eso `/emergencia` permite **autorizar y guardar
 * la ubicación antes**, y la alerta usa esa lectura cuando la del momento no
 * está disponible.
 *
 * Se guarda solo en este navegador (`klaps.location.v1`): latitud, longitud,
 * precisión en metros y la hora de la medición. Nada se envía a ningún sitio
 * hasta que se dispara una alerta.
 */

export const LOCATION_KEY = 'klaps.location.v1'
/** Pasado este tiempo las coordenadas se consideran viejas y no se usan solas. */
export const LOCATION_MAX_AGE_MS = 6 * 60 * 60 * 1000

/** Pide la ubicación al navegador. Nunca se llama sin una acción del usuario. */
export function requestLocation({ timeout = 9000 } = {}) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ location: null, error: 'Este navegador no ofrece geolocalización.' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            at: Date.now(),
          },
          error: '',
        }),
      (error) => {
        const messages = {
          1: 'No autorizaste el acceso a tu ubicación. Puedes permitirlo desde el candado de la barra de direcciones.',
          2: 'No se pudo determinar tu ubicación en este momento.',
          3: 'La ubicación tardó demasiado en responder.',
        }
        resolve({ location: null, error: messages[error.code] ?? 'No se pudo obtener la ubicación.' })
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    )
  })
}

export function normalizeLocation(raw) {
  if (!raw || typeof raw !== 'object') return null
  const latitude = Number(raw.latitude)
  const longitude = Number(raw.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(Number(raw.accuracy)) ? Number(raw.accuracy) : null,
    at: Number.isFinite(raw.at) ? raw.at : 0,
  }
}

export function loadSavedLocation() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCATION_KEY)
    if (!raw) return null
    return normalizeLocation(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveSavedLocation(location) {
  const safe = normalizeLocation({ ...location, at: location?.at ?? Date.now() })
  if (!safe) return null
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCATION_KEY, JSON.stringify(safe))
    } catch {
      // modo privado: se queda solo en memoria
    }
  }
  return safe
}

export function clearSavedLocation() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LOCATION_KEY)
    } catch {
      // nada que limpiar
    }
  }
  return null
}

/** Edad de la lectura en ms (Infinity si no hay hora). */
export function locationAge(location) {
  if (!location?.at) return Infinity
  return Math.max(0, Date.now() - location.at)
}

export function isFreshLocation(location) {
  return Boolean(location) && locationAge(location) <= LOCATION_MAX_AGE_MS
}

/** «hace 3 min», «hace 2 h», «sin hora». */
export function describeLocationAge(location) {
  const age = locationAge(location)
  if (!Number.isFinite(age)) return 'sin hora'
  const minutes = Math.round(age / 60000)
  if (minutes < 1) return 'hace menos de un minuto'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.round(hours / 24)} días`
}

/**
 * Ubicación para la alerta: la del momento y, si no se puede, la guardada.
 * @returns {Promise<{location: object|null, source: 'live'|'saved'|'none', ageMs: number, error: string}>}
 */
export async function resolveEmergencyLocation({ timeout } = {}) {
  const saved = loadSavedLocation()
  const live = await requestLocation({ timeout })

  if (live.location) {
    // La lectura buena también queda guardada para la próxima vez.
    saveSavedLocation(live.location)
    return { location: live.location, source: 'live', ageMs: 0, error: '' }
  }

  if (isFreshLocation(saved)) {
    return { location: saved, source: 'saved', ageMs: locationAge(saved), error: live.error }
  }

  return { location: null, source: 'none', ageMs: 0, error: live.error }
}
