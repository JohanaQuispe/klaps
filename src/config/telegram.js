/**
 * Configuración pública de Telegram (la que sí puede ver el navegador).
 *
 * Aquí solo hay datos que puede conocer cualquiera: el usuario del bot oficial
 * y la dirección de la función del servidor. El **token del bot no está en el
 * frontend**: se guarda como secreto `TELEGRAM_BOT_TOKEN` en el servidor
 * (`supabase/functions/klaps-telegram`), y desde ahí se habla con Telegram.
 *
 * Variables (archivo `.env`, ver `.env.example`):
 *   VITE_TELEGRAM_BOT_USERNAME=ai_klaps_bot   (opcional: por defecto es el bot oficial)
 *   VITE_TELEGRAM_API_URL=https://<ref>.supabase.co/functions/v1/klaps-telegram
 */

const env =
  typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

/** Usuario del bot oficial, sin «@» (el de KLAPS si no hay variable). */
export const TELEGRAM_BOT_USERNAME =
  String(env.VITE_TELEGRAM_BOT_USERNAME ?? '').trim().replace(/^@/, '') || 'ai_klaps_bot'

/** URL de la función que guarda los chats y envía los mensajes. */
export const TELEGRAM_API_URL = String(env.VITE_TELEGRAM_API_URL ?? '')
  .trim()
  .replace(/\/+$/, '')

/** ¿Esta instalación tiene servidor de alertas? Sin esto no se puede vincular ni enviar. */
export const isTelegramServerConfigured = Boolean(TELEGRAM_API_URL)

/**
 * Diagnóstico de la URL configurada. Devuelve `''` si tiene buena pinta o el
 * motivo concreto del fallo más común: apuntar a la raíz del proyecto en vez de
 * a la función (eso da 404 aunque el servidor exista).
 */
export const telegramEndpointIssue = (() => {
  if (!TELEGRAM_API_URL) return ''

  let url
  try {
    url = new URL(TELEGRAM_API_URL)
  } catch {
    return 'La URL del servidor no es válida. Debe empezar por https:// y no llevar espacios.'
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return 'La URL del servidor debe empezar por https://'
  }
  if (url.pathname.includes('[') || url.pathname.includes(']') || url.pathname.includes('(')) {
    return 'La URL parece pegada con formato de enlace (corchetes o paréntesis). Copia solo la dirección.'
  }
  if (!url.pathname.includes('/functions/v1/')) {
    return 'A la URL le falta /functions/v1/klaps-telegram: así apunta a la raíz del proyecto y responde 404.'
  }
  return ''
})()

/** Enlace que abre el bot con el código de vinculación ya escrito. */
export function buildTelegramDeepLink(code) {
  if (!code) return ''
  if (!TELEGRAM_BOT_USERNAME) return ''
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(code)}`
}

/** Nombre del bot listo para mostrar: `@ai_klaps_bot`. */
export const TELEGRAM_BOT_LABEL = TELEGRAM_BOT_USERNAME ? `@${TELEGRAM_BOT_USERNAME}` : ''
