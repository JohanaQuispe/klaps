/**
 * KLAPS · servidor de alertas por Telegram
 * ========================================
 * Único sitio donde vive el token del bot oficial (`TELEGRAM_BOT_TOKEN`).
 * El navegador nunca lo ve: solo manda su código de sesión y el texto.
 *
 * Acciones (POST JSON):
 *   { action: 'verify', code }
 *     Busca en `getUpdates` el mensaje `/start KLAPS-XXXXX` con **ese código
 *     exacto**, guarda `code → chat_id` y lo devuelve. Los chats de otros
 *     usuarios no se mezclan: el que no trae ese código se ignora.
 *
 *   { action: 'send', code, text }
 *     Busca el chat vinculado a ese código y le envía el mensaje.
 *
 *   { action: 'unlink', code }
 *     Borra la vinculación.
 *
 * Despliegue: ver `docs/etapa-11-telegram-multiusuario.md`.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { pickStartChat } from './match.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
/** Origen permitido para el navegador (`*` mientras se prueba en localhost). */
const ALLOWED_ORIGIN = Deno.env.get('KLAPS_ALLOWED_ORIGIN') ?? '*'

const CODE_PATTERN = /^KLAPS-\d{5}$/
const TELEGRAM_API = 'https://api.telegram.org'
const MAX_TEXT = 4000

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}

/** Llamada a la Bot API con el token del servidor. */
async function telegram(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null)
  if (!data) {
    return { ok: false as const, error: `Telegram respondió ${response.status} sin cuerpo legible.` }
  }
  if (data.ok !== true) {
    return { ok: false as const, error: `Telegram rechazó la petición (${data.description ?? response.status}).` }
  }
  return { ok: true as const, result: data.result }
}

/**
 * Busca el `/start <código>` exacto entre los mensajes que han llegado al bot
 * (la regla vive en `match.ts`, probada aparte) y guarda la vinculación.
 */
async function claimCode(code: string) {
  // Sin `offset`: se leen los mensajes pendientes sin confirmarlos, así dos
  // personas pueden verificar a la vez sin «gastarse» el mensaje de la otra.
  const updates = await telegram('getUpdates', { limit: 100, timeout: 0 })
  if (!updates.ok) return { ok: false as const, error: updates.error }

  const claimed = pickStartChat(Array.isArray(updates.result) ? updates.result : [], code)
  if (!claimed) return { ok: true as const, chatId: '', chatName: '' }

  const { error } = await supabase.from('telegram_links').upsert(
    {
      code,
      chat_id: Number(claimed.chatId),
      chat_name: claimed.chatName,
      linked_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
    },
    { onConflict: 'code' },
  )

  if (error) return { ok: false as const, error: `No se pudo guardar la vinculación: ${error.message}` }

  return { ok: true as const, chatId: claimed.chatId, chatName: claimed.chatName }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (request.method !== 'POST') return json({ ok: false, error: 'Usa POST.' }, 405)

  if (!BOT_TOKEN) {
    return json({ ok: false, error: 'Falta el secreto TELEGRAM_BOT_TOKEN en el servidor.' }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'El cuerpo debe ser JSON.' }, 400)
  }

  const action = String(body.action ?? '')
  const code = String(body.code ?? '').trim().toUpperCase()

  if (!CODE_PATTERN.test(code)) {
    return json({ ok: false, error: 'El código no tiene el formato KLAPS-00000.' }, 400)
  }

  try {
    if (action === 'verify') {
      const claimed = await claimCode(code)
      if (!claimed.ok) return json({ ok: false, error: claimed.error }, 502)

      if (!claimed.chatId) {
        return json({
          ok: true,
          linked: false,
          error: 'Todavía nadie abrió el enlace con ese código.',
        })
      }

      return json({ ok: true, linked: true, chatId: claimed.chatId, chatName: claimed.chatName })
    }

    if (action === 'send') {
      const text = String(body.text ?? '').slice(0, MAX_TEXT)
      if (!text.trim()) return json({ ok: false, error: 'El mensaje está vacío.' }, 400)

      const { data, error } = await supabase
        .from('telegram_links')
        .select('chat_id')
        .eq('code', code)
        .maybeSingle()

      if (error) return json({ ok: false, error: `Base de datos: ${error.message}` }, 500)
      if (!data?.chat_id) {
        return json({
          ok: true,
          delivered: false,
          error: 'Ese código no tiene ningún contacto vinculado. Abre el enlace y pulsa Iniciar.',
        })
      }

      const sent = await telegram('sendMessage', {
        chat_id: data.chat_id,
        text,
        disable_web_page_preview: false,
      })

      if (!sent.ok) return json({ ok: true, delivered: false, error: sent.error })

      await supabase
        .from('telegram_links')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('code', code)

      return json({ ok: true, delivered: true, messageId: sent.result?.message_id })
    }

    if (action === 'unlink') {
      const { error } = await supabase.from('telegram_links').delete().eq('code', code)
      if (error) return json({ ok: false, error: `Base de datos: ${error.message}` }, 500)
      return json({ ok: true, linked: false })
    }

    return json({ ok: false, error: 'Acción desconocida. Usa verify, send o unlink.' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado.'
    return json({ ok: false, error: message }, 500)
  }
})
