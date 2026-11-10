/**
 * Emergencias SOS.
 *
 * IMPORTANTE · Todavía NO existe integración con un servicio de emergencias.
 * `sendAlert` devuelve siempre `delivered: false` y la interfaz lo muestra
 * tal cual: nunca se simula una alerta enviada.
 *
 * Cuando exista el servicio real (API, SMS o llamada), se sustituye el
 * cuerpo de `sendAlert` y se mantiene el mismo contrato de respuesta.
 */

export const EMERGENCY_SERVICE = {
  available: false,
  provider: null,
  reason:
    'Todavía no hay un servicio de emergencias conectado a KLAPS. La alerta se prepara, pero no se envía.',
}

/** Texto que se prepararía para enviar a un contacto o servicio. */
export function buildAlertMessage({ contactName, location, gesture = null }) {
  const lines = [
    'ALERTA KLAPS',
    contactName ? `Para: ${contactName}` : 'Para: contacto de emergencia',
    'Necesito ayuda inmediata.',
  ]

  if (gesture) lines.push(`Activada con el gesto: ${gesture}.`)
  if (location) {
    lines.push(
      `Ubicación aproximada: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} (±${Math.round(location.accuracy)} m).`,
    )
  } else {
    lines.push('Ubicación: no disponible (sin autorización).')
  }

  lines.push(`Hora: ${new Date().toLocaleString('es')}`)
  return lines.join('\n')
}

/**
 * Pide la ubicación al navegador.
 * Nunca se llama sin una acción explícita del usuario.
 */
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
          },
          error: '',
        }),
      (error) => {
        const messages = {
          1: 'No autorizaste el acceso a tu ubicación.',
          2: 'No se pudo determinar tu ubicación en este momento.',
          3: 'La ubicación tardó demasiado en responder.',
        }
        resolve({ location: null, error: messages[error.code] ?? 'No se pudo obtener la ubicación.' })
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    )
  })
}

/**
 * Intento de envío. Devuelve el estado REAL, no un éxito simulado.
 */
export async function sendAlert({ message, contact }) {
  return {
    delivered: false,
    reason: EMERGENCY_SERVICE.reason,
    attemptedAt: Date.now(),
    channel: contact?.phone ? 'telefono' : 'ninguno',
    message,
  }
}
