/**
 * Envío de la alerta SOS por Telegram (Bot API).
 *
 * Funciona sin servidor propio: la app llama directamente a
 * `api.telegram.org` con el token del bot que crea el usuario. El token y el
 * destino se guardan SOLO en este navegador (`klaps.telegram.v1`).
 *
 * Aviso de seguridad (también visible en la interfaz): cualquier persona con
 * acceso a este navegador puede leer el token. Usa un bot creado para KLAPS y
 * no lo compartas.
 *
 * Nada se da por enviado sin respuesta `ok: true` de Telegram: si falla la red
 * o el navegador bloquea la petición, se devuelve el motivo real.
 */

export const TELEGRAM_KEY = 'klaps.telegram.v1'
export const TELEGRAM_API = 'https://api.telegram.org'
export const TELEGRAM_TIMEOUT_MS = 12000

const EMPTY = { token: '', chatId: '', chatName: '' }

/** El token tiene la forma `123456789:AA...` (a veces se copia con «bot» delante). */
export function normalizeToken(value) {
  return String(value ?? '')
    .trim()
    .replace(/^bot/i, '')
}

export function isValidToken(value) {
  return /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(normalizeToken(value))
}

/**
 * Destino válido: id numérico (12, -1001234567890) o @usuario de canal público.
 */
export function normalizeChatId(value) {
  const clean = String(value ?? '').trim()
  if (!clean) return ''
  if (clean.startsWith('@')) return clean
  return clean.replace(/\s+/g, '')
}

export function isValidChatId(value) {
  const clean = normalizeChatId(value)
  if (!clean) return false
  if (/^@[A-Za-z][A-Za-z0-9_]{4,}$/.test(clean)) return true
  return /^-?\d{5,20}$/.test(clean)
}

export function isTelegramConfigured(config) {
  return Boolean(config && isValidToken(config.token) && isValidChatId(config.chatId))
}

export function normalizeTelegramConfig(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY }
  return {
    token: normalizeToken(raw.token),
    chatId: normalizeChatId(raw.chatId),
    chatName: typeof raw.chatName === 'string' ? raw.chatName.slice(0, 80) : '',
  }
}

export function loadTelegramConfig() {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    const raw = window.localStorage.getItem(TELEGRAM_KEY)
    if (!raw) return { ...EMPTY }
    return normalizeTelegramConfig(JSON.parse(raw))
  } catch {
    return { ...EMPTY }
  }
}

export function saveTelegramConfig(config) {
  const safe = normalizeTelegramConfig(config)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(TELEGRAM_KEY, JSON.stringify(safe))
    } catch {
      // sin espacio o modo privado: se mantiene solo en memoria
    }
  }
  return safe
}

export function clearTelegramConfig() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(TELEGRAM_KEY)
    } catch {
      // nada que limpiar
    }
  }
  return { ...EMPTY }
}

/** Mensaje que recibe el contacto. */
export function buildTelegramMessage({ contactName, location, repeats = 3, at = Date.now() }) {
  const lines = ['ALERTA KLAPS · EMERGENCIA', 'Necesito ayuda inmediata.']

  if (contactName) lines.push(`Para: ${contactName}`)
  if (repeats > 0) lines.push(`Activada con ${repeats} señas de SOS.`)

  if (location) {
    const { latitude, longitude, accuracy } = location
    lines.push(`Ubicación: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy ?? 0)} m)`)
    lines.push(`https://www.google.com/maps?q=${latitude},${longitude}`)
  } else {
    lines.push('Ubicación: no disponible.')
  }

  lines.push(`Hora: ${new Date(at).toLocaleString('es')}`)
  return lines.join('\n')
}

/** Petición a la Bot API con tiempo límite y errores legibles. */
async function callTelegram(token, method, payload, { httpMethod = 'POST' } = {}) {
  const clean = normalizeToken(token)
  if (!isValidToken(clean)) {
    return { ok: false, error: 'El token del bot no tiene el formato correcto (123456789:AA…).' }
  }

  if (typeof fetch !== 'function') {
    return { ok: false, error: 'Este navegador no permite hacer peticiones de red.' }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS) : null

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${clean}/${method}`, {
      method: httpMethod,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    })

    const data = await response.json().catch(() => null)

    if (!data) {
      return { ok: false, error: `Telegram respondió con un estado ${response.status} sin cuerpo legible.` }
    }

    if (data.ok !== true) {
      const description = data.description ? ` (${data.description})` : ''
      return { ok: false, error: `Telegram rechazó la petición${description}.` }
    }

    return { ok: true, result: data.result }
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, error: 'Telegram tardó demasiado en responder. Revisa tu conexión.' }
    }
    return {
      ok: false,
      error:
        'No se pudo contactar con api.telegram.org: revisa la conexión a internet o si el navegador bloqueó la petición (CORS/extensiones de privacidad).',
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Envía la alerta. Devuelve el estado real.
 * @returns {Promise<{delivered: boolean, reason: string, messageId?: number}>}
 */
export async function sendTelegramMessage({ token, chatId, text }) {
  const target = normalizeChatId(chatId)
  if (!isValidChatId(target)) {
    return { delivered: false, reason: 'El destino de Telegram no es válido: falta el ID del chat.' }
  }
  if (!text || !String(text).trim()) {
    return { delivered: false, reason: 'El mensaje está vacío: no se envió nada.' }
  }

  const response = await callTelegram(token, 'sendMessage', {
    chat_id: target,
    text: String(text).slice(0, 4000),
    disable_web_page_preview: false,
  })

  if (!response.ok) return { delivered: false, reason: response.error }

  return {
    delivered: true,
    reason: 'Mensaje entregado a Telegram.',
    messageId: response.result?.message_id,
  }
}

/** Mensaje de prueba manual (el usuario pulsa un botón). */
export async function sendTelegramTest(config) {
  const text = [
    'KLAPS · prueba de conexión',
    'Si recibes este mensaje, tu alerta SOS llegará a este chat.',
    `Hora: ${new Date().toLocaleString('es')}`,
  ].join('\n')

  return sendTelegramMessage({ token: config?.token, chatId: config?.chatId, text })
}

/**
 * Chats que han escrito al bot. Permite elegir el contacto sin buscar el ID a
 * mano: la persona abre el bot, pulsa /start y aparece aquí.
 */
export async function fetchTelegramChats(token) {
  const response = await callTelegram(token, 'getUpdates', { limit: 100, timeout: 0 })
  if (!response.ok) return { ok: false, chats: [], error: response.error }

  const updates = Array.isArray(response.result) ? response.result : []
  const seen = new Map()

  for (const update of updates) {
    const candidate =
      update.message?.chat ??
      update.edited_message?.chat ??
      update.channel_post?.chat ??
      update.my_chat_member?.chat

    if (!candidate?.id) continue

    const name =
      [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') ||
      candidate.title ||
      candidate.username ||
      String(candidate.id)

    seen.set(String(candidate.id), {
      id: String(candidate.id),
      name,
      username: candidate.username ? `@${candidate.username}` : '',
      type: candidate.type ?? 'private',
    })
  }

  const chats = [...seen.values()]
  return {
    ok: true,
    chats,
    error: chats.length === 0 ? 'Nadie ha escrito todavía al bot. Pide a tu contacto que abra el bot y pulse /start.' : '',
  }
}
