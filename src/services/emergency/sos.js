/**
 * Emergencias SOS.
 *
 * El envío real usa Telegram (Bot API) a través de `services/emergency/telegram.js`:
 * no hay backend propio, el token del bot y el destino viven en este navegador.
 *
 * Si Telegram no está configurado, `sendAlert` devuelve `delivered: false` con el
 * motivo: la interfaz lo muestra tal cual. Nunca se simula una alerta enviada.
 */

import { isTelegramConfigured, sendTelegramMessage } from './telegram.js'

export const EMERGENCY_SERVICE = {
  provider: 'telegram',
  name: 'Telegram',
  reason:
    'Configura tu bot de Telegram en esta pantalla para que la alerta llegue a tu contacto.',
}

/** ¿Hay un canal real conectado? */
export function isEmergencyChannelReady(telegram) {
  return isTelegramConfigured(telegram)
}

/** Texto que se envía al contacto. */
export function buildAlertMessage({ contactName, location, gesture = null, repeats = 0, at = Date.now() }) {
  const lines = ['ALERTA KLAPS · EMERGENCIA', 'Necesito ayuda inmediata.']

  if (contactName) lines.push(`Para: ${contactName}`)
  if (repeats > 0) lines.push(`Activada con ${repeats} señas de SOS.`)
  if (gesture) lines.push(`Gesto: ${gesture}.`)

  if (location) {
    lines.push(
      `Ubicación: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} (±${Math.round(location.accuracy ?? 0)} m).`,
    )
    lines.push(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`)
  } else {
    lines.push('Ubicación: no disponible (sin autorización).')
  }

  lines.push(`Hora: ${new Date(at).toLocaleString('es')}`)
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
 * Envío real. Devuelve el estado verdadero, no un éxito simulado.
 *
 * @param {{message: string, contact?: object, telegram?: object}} params
 */
export async function sendAlert({ message, contact = null, telegram = null }) {
  const attemptedAt = Date.now()

  if (!isTelegramConfigured(telegram)) {
    return {
      delivered: false,
      channel: 'ninguno',
      reason:
        'No hay ningún canal conectado todavía. Configura tu bot de Telegram y el contacto en la pantalla de emergencia: sin eso, la alerta no sale de este dispositivo.',
      attemptedAt,
      message,
    }
  }

  const response = await sendTelegramMessage({
    token: telegram.token,
    chatId: telegram.chatId,
    text: message,
  })

  return {
    delivered: response.delivered,
    channel: 'telegram',
    reason: response.delivered
      ? `Enviada por Telegram a ${telegram.chatName || telegram.chatId}.`
      : response.reason,
    messageId: response.messageId,
    attemptAt: attemptedAt,
    attemptedAt,
    contact,
    message,
  }
}
