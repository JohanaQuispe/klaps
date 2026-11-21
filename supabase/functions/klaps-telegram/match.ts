/**
 * Filtro de mensajes entrantes del bot oficial.
 *
 * Se separa de `index.ts` para poder probarlo sin red ni base de datos: aquí
 * vive la regla que impide que se mezclen los chats de distintos usuarios.
 *
 * Regla: de todos los mensajes que ha recibido el bot, solo cuenta el que
 *   · es de un chat privado,
 *   · empieza por `/start` (o `/start@usuario_del_bot`), y
 *   · trae como argumento **exactamente** el código pedido.
 * Cualquier otro `/start` (de otro código, de otro usuario o sin código) se
 * ignora.
 */

export type TelegramChat = {
  id?: number | string
  type?: string
  first_name?: string
  last_name?: string
  username?: string
  title?: string
}

export type TelegramUpdate = {
  message?: { text?: string; chat?: TelegramChat }
  edited_message?: { text?: string; chat?: TelegramChat }
}

export type ClaimedChat = { chatId: string; chatName: string }

/** Nombre legible del contacto. */
export function chatLabel(chat: TelegramChat): string {
  const full = [chat.first_name, chat.last_name].filter(Boolean).join(' ')
  if (full) return full
  if (chat.username) return `@${chat.username}`
  if (chat.title) return chat.title
  return String(chat.id ?? 'contacto')
}

/** Devuelve el chat que reclamó ese código, o `null` si nadie lo hizo. */
export function pickStartChat(
  updates: TelegramUpdate[] | null | undefined,
  code: string,
): ClaimedChat | null {
  const wanted = String(code ?? '').trim().toUpperCase()
  if (!wanted) return null

  for (const update of updates ?? []) {
    const message = update?.message ?? update?.edited_message
    const text = message?.text
    const chat = message?.chat
    if (!text || !chat?.id) continue
    if (chat.type !== 'private') continue

    const [command, argument] = text.trim().split(/\s+/)
    if (!/^\/start(@\w+)?$/i.test(command ?? '')) continue
    if ((argument ?? '').toUpperCase() !== wanted) continue

    return { chatId: String(chat.id), chatName: chatLabel(chat) }
  }

  return null
}
