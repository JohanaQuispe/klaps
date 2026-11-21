/**
 * Código de vinculación del contacto de emergencia.
 *
 * Cada navegador tiene un código propio (`KLAPS-84920`) que se pasa al bot
 * oficial en el enlace `https://t.me/ai_klaps_bot?start=KLAPS-84920`. Cuando el
 * familiar lo abre y pulsa **Iniciar**, Telegram le entrega al bot su `chat_id`
 * junto con ese texto; el servidor compara el código **exacto** y guarda la
 * pareja `código → chat`. Así, aunque mil personas usen el mismo bot, cada una
 * queda vinculada solo con su contacto.
 *
 * El código vive en este navegador (`klaps.telegram.v2`). No contiene ningún
 * secreto del bot: es un identificador de sesión, no una credencial de envío.
 */

export const LINK_KEY = 'klaps.telegram.v2'
export const LINK_PREFIX = 'KLAPS-'
/** 5 dígitos: fácil de dictar por teléfono y de sobra para un código de sesión. */
export const LINK_DIGITS = 5

const EMPTY = { code: '', createdAt: 0, chatId: '', chatName: '', linkedAt: 0, verifiedAt: 0 }

/** `KLAPS-84920` (se acepta sin prefijo o en minúsculas al leer). */
export function normalizeCode(value) {
  const clean = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
  if (!clean) return ''
  return clean.startsWith(LINK_PREFIX) ? clean : `${LINK_PREFIX}${clean}`
}

export function isValidCode(value) {
  return new RegExp(`^${LINK_PREFIX}\\d{${LINK_DIGITS}}$`).test(normalizeCode(value))
}

/** Código nuevo con `crypto.getRandomValues` (no se repite entre sesiones). */
export function generateCode() {
  const digits = []
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(LINK_DIGITS)
    crypto.getRandomValues(buffer)
    for (const value of buffer) digits.push(value % 10)
  } else {
    for (let index = 0; index < LINK_DIGITS; index += 1) {
      digits.push(Math.floor(Math.random() * 10))
    }
  }
  return `${LINK_PREFIX}${digits.join('')}`
}

export function normalizeLink(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY }
  const code = normalizeCode(raw.code)
  return {
    code: isValidCode(code) ? code : '',
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
    chatId: typeof raw.chatId === 'string' ? raw.chatId : '',
    chatName: typeof raw.chatName === 'string' ? raw.chatName.slice(0, 80) : '',
    linkedAt: Number.isFinite(raw.linkedAt) ? raw.linkedAt : 0,
    verifiedAt: Number.isFinite(raw.verifiedAt) ? raw.verifiedAt : 0,
  }
}

export function loadLink() {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    const raw = window.localStorage.getItem(LINK_KEY)
    if (!raw) return { ...EMPTY }
    return normalizeLink(JSON.parse(raw))
  } catch {
    return { ...EMPTY }
  }
}

export function saveLink(link) {
  const safe = normalizeLink(link)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LINK_KEY, JSON.stringify(safe))
    } catch {
      // modo privado o sin espacio: queda solo en memoria
    }
  }
  return safe
}

/** Devuelve el código guardado; si no hay, crea uno y lo persiste. */
export function ensureLink() {
  const current = loadLink()
  if (isValidCode(current.code)) return current
  return saveLink({ code: generateCode(), createdAt: Date.now() })
}

/** Código nuevo y vinculación borrada (útil si el código se filtró). */
export function rotateLink() {
  return saveLink({ code: generateCode(), createdAt: Date.now() })
}

/** Guarda el contacto que confirmó el servidor. */
export function linkContact(code, { chatId, chatName }) {
  const current = loadLink()
  return saveLink({
    ...current,
    code: normalizeCode(code) || current.code,
    chatId: String(chatId ?? ''),
    chatName: String(chatName ?? '').slice(0, 80),
    linkedAt: Date.now(),
    verifiedAt: Date.now(),
  })
}

export function clearLink() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LINK_KEY)
    } catch {
      // nada que limpiar
    }
  }
  return { ...EMPTY }
}

/** ¿Hay un contacto confirmado por el servidor? */
export function isLinked(link) {
  return Boolean(link && link.chatId)
}
