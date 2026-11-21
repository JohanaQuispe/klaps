/**
 * Cliente del servidor de alertas (sin token en el navegador).
 *
 * El frontend nunca ve el token del bot. Habla con una función propia —
 * `supabase/functions/klaps-telegram`, o cualquier backend que respete el mismo
 * contrato — y es ella la que guarda los `chat_id` y llama a la Bot API.
 *
 * Contrato (`POST VITE_TELEGRAM_API_URL`, JSON):
 *   { action: 'verify', code }            → { ok, linked, chatId?, chatName?, error? }
 *   { action: 'send',   code, text }      → { ok, delivered, messageId?, error? }
 *   { action: 'unlink', code }            → { ok, linked: false, error? }
 *
 * Nada se da por enviado sin `delivered: true`: si falla la red, el servidor o
 * Telegram, se devuelve el motivo real y la interfaz lo muestra tal cual.
 */

import { TELEGRAM_API_URL, isTelegramServerConfigured } from '../../config/telegram.js'

export const TELEGRAM_TIMEOUT_MS = 15000

const NO_SERVER =
  'Esta instalación no tiene servidor de alertas: falta configurar VITE_TELEGRAM_API_URL (ver docs/etapa-11-telegram-multiusuario.md).'

/** Petición a la función del servidor, con tiempo límite y errores legibles. */
async function callServer(action, payload) {
  if (!isTelegramServerConfigured) return { ok: false, data: null, error: NO_SERVER }

  if (typeof fetch !== 'function') {
    return { ok: false, data: null, error: 'Este navegador no permite hacer peticiones de red.' }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS) : null

  try {
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      signal: controller?.signal,
    })

    const data = await response.json().catch(() => null)

    if (data && typeof data === 'object' && data.ok === false) {
      return { ok: false, data, error: data.error || 'El servidor rechazó la petición.' }
    }

    if (!response.ok) {
      if (response.status === 404) {
        return {
          ok: false,
          data,
          error: `La función del servidor no existe (404) en ${TELEGRAM_API_URL}. Comprueba que la URL termine en /functions/v1/klaps-telegram y que la función esté desplegada en el proyecto.`,
        }
      }
      return {
        ok: false,
        data,
        error: `El servidor respondió con un estado ${response.status}.`,
      }
    }

    if (!data || typeof data !== 'object') {
      return { ok: false, data: null, error: 'El servidor respondió sin un cuerpo legible.' }
    }

    return { ok: true, data, error: '' }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, data: null, error: 'El servidor tardó demasiado en responder.' }
    }
    return {
      ok: false,
      data: null,
      error:
        'No se pudo contactar con el servidor de alertas: revisa la conexión o si el navegador bloqueó la petición (CORS, extensiones de privacidad).',
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Pregunta al servidor si el código ya fue reclamado por un contacto.
 * @returns {Promise<{ok: boolean, linked: boolean, chatId: string, chatName: string, error: string}>}
 */
export async function verifyLinkage(code) {
  const response = await callServer('verify', { code })
  if (!response.ok) {
    return { ok: false, linked: false, chatId: '', chatName: '', error: response.error }
  }

  return {
    ok: true,
    linked: response.data.linked === true,
    chatId: response.data.chatId ? String(response.data.chatId) : '',
    chatName: typeof response.data.chatName === 'string' ? response.data.chatName : '',
    error:
      response.data.linked === true
        ? ''
        : 'Todavía nadie ha abierto el enlace de vinculación. Pide a tu familiar que abra el botón y pulse Iniciar.',
  }
}

/**
 * Envía el mensaje al contacto vinculado con ese código.
 * @returns {Promise<{delivered: boolean, reason: string, messageId?: number}>}
 */
export async function sendAlertToContact({ code, text }) {
  if (!text || !String(text).trim()) {
    return { delivered: false, reason: 'El mensaje está vacío: no se envió nada.' }
  }

  const response = await callServer('send', { code, text: String(text).slice(0, 4000) })
  if (!response.ok) return { delivered: false, reason: response.error }

  if (response.data.delivered !== true) {
    return {
      delivered: false,
      reason: response.data.error || 'El servidor no confirmó la entrega a Telegram.',
    }
  }

  return {
    delivered: true,
    reason: 'Mensaje entregado a Telegram.',
    messageId: response.data.messageId,
  }
}

/** Borra la vinculación en el servidor (el código deja de apuntar a ese chat). */
export async function unlinkContact(code) {
  return callServer('unlink', { code })
}

/** Mensaje de prueba que se envía al pulsar el botón. */
export function buildTestMessage({ botLabel = '' } = {}) {
  return [
    'KLAPS · prueba de conexión',
    `Este chat recibirá las alertas de emergencia${botLabel ? ` de ${botLabel}` : ''}.`,
    `Hora: ${new Date().toLocaleString('es')}`,
  ].join('\n')
}
