/**
 * Emergencias SOS.
 *
 * El envío real pasa por el servidor de alertas (`telegramApi.js`): el navegador
 * solo manda su **código de vinculación** y el texto, y el servidor decide a qué
 * `chat_id` entregarlo con el token del bot oficial `@ai_klaps_bot`. Así el
 * token nunca está en el frontend y cada usuario queda aislado con su contacto.
 *
 * Si no hay vinculación o falta el servidor, `sendAlert` devuelve
 * `delivered: false` con el motivo real: la interfaz lo muestra tal cual.
 * Nunca se simula una alerta enviada.
 */

import { isLinked } from './linkCode.js'
import { isTelegramServerConfigured } from '../../config/telegram.js'
import { sendAlertToContact } from './telegramApi.js'
import { describeLocationAge, resolveEmergencyLocation } from './location.js'

export const EMERGENCY_SERVICE = {
  provider: 'telegram',
  name: 'Telegram',
  reason:
    'Vincula a tu contacto desde esta pantalla con el botón «Vincular contacto en Telegram» para que la alerta llegue.',
}

/** ¿Hay un contacto vinculado y un servidor configurado? */
export function isEmergencyChannelReady(link) {
  return isLinked(link) && isTelegramServerConfigured
}

/**
 * Texto que se envía al contacto.
 * `locationNote` añade la procedencia cuando las coordenadas son guardadas.
 */
export function buildAlertMessage({
  contactName,
  location,
  locationNote = '',
  gesture = null,
  repeats = 0,
  at = Date.now(),
}) {
  const lines = ['ALERTA KLAPS · EMERGENCIA', 'Necesito ayuda inmediata.']

  if (contactName) lines.push(`Para: ${contactName}`)
  if (repeats > 0) lines.push(`Activada con ${repeats} señas de SOS.`)
  if (gesture) lines.push(`Gesto: ${gesture}.`)

  if (location) {
    const accuracy = Number.isFinite(Number(location.accuracy))
      ? ` (±${Math.round(location.accuracy)} m)`
      : ''
    lines.push(
      `Ubicación: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}${accuracy}.`,
    )
    lines.push(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`)
    if (locationNote) lines.push(`Referencia: ${locationNote}.`)
  } else {
    lines.push('Ubicación: no disponible (sin autorización).')
  }

  lines.push(`Hora: ${new Date(at).toLocaleString('es')}`)
  return lines.join('\n')
}

/**
 * Ubicación de la alerta: la del momento o, si falla, la que se guardó desde
 * `/emergencia`. Devuelve además la nota que acompaña al mensaje.
 */
export async function prepareAlertLocation({ timeout } = {}) {
  const result = await resolveEmergencyLocation({ timeout })
  return {
    location: result.location,
    note: result.source === 'saved' ? `ubicación guardada ${describeLocationAge(result.location)}` : '',
    source: result.source,
    error: result.error,
  }
}

/**
 * Envío real. Devuelve el estado verdadero, no un éxito simulado.
 *
 * @param {{message: string, contact?: object, link?: object}} params
 */
export async function sendAlert({ message, contact = null, link = null }) {
  const attemptedAt = Date.now()

  if (!isTelegramServerConfigured) {
    return {
      delivered: false,
      channel: 'ninguno',
      reason:
        'Esta instalación no tiene servidor de alertas configurado (VITE_TELEGRAM_API_URL), así que el mensaje no puede salir del navegador. El token del bot vive en el servidor, nunca aquí.',
      attemptedAt,
      message,
    }
  }

  if (!isLinked(link)) {
    return {
      delivered: false,
      channel: 'ninguno',
      reason:
        'No hay ningún contacto vinculado todavía. Pulsa «Vincular contacto en Telegram» en la pantalla de emergencia y espera a que tu familiar pulse Iniciar: sin eso la alerta no sale de este dispositivo.',
      attemptedAt,
      message,
    }
  }

  const response = await sendAlertToContact({ code: link.code, text: message })

  return {
    delivered: response.delivered,
    channel: 'telegram',
    reason: response.delivered
      ? `Enviada por Telegram a ${link.chatName || 'tu contacto vinculado'}.`
      : response.reason,
    messageId: response.messageId,
    attemptedAt,
    contact,
    message,
  }
}

export { requestLocation } from './location.js'
