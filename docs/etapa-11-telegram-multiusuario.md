# Etapa 11 · Telegram multi‑usuario (bot oficial + código de vinculación)

Hasta la etapa 10 cada persona **creaba su propio bot** en `@BotFather` y pegaba el token en el
navegador. Eso servía para una demostración, pero no es un producto: el token quedaba en
`localStorage` (visible para cualquiera con acceso al equipo), cada usuario tenía que aprender a
crear un bot, y `getUpdates` devolvía los chats de **todos** los que hablaban con el bot.

Esta etapa lo cambia por completo: **un solo bot oficial, `@ai_klaps_bot`, y el token solo en el
servidor.**

---

## 1. Cómo funciona

```
┌──────────────┐   1. código KLAPS-84920 (localStorage)     ┌────────────────────────┐
│  KLAPS (web) │ ─────────────────────────────────────────► │  función klaps-telegram│
│  sin token   │ ◄──── 4. ¿ya vinculado? chat / nombre ──── │  TELEGRAM_BOT_TOKEN    │
└──────────────┘                                           └────────────────────────┘
        │ 2. tu familiar abre t.me/ai_klaps_bot?start=KLAPS-84920      │
        ▼                                                             │ 5. sendMessage
   Telegram del familiar ── 3. /start KLAPS-84920 ────────────────────►│
                                                         tabla telegram_links
```

1. La app genera un **código único por navegador** (`KLAPS-84920`, 5 dígitos aleatorios) y lo
   guarda en `localStorage['klaps.telegram.v2']`. No es una credencial del bot: es un identificador
   de sesión.
2. El usuario abre **«Vincular contacto en Telegram»** — o copia el enlace y se lo manda a su
   familiar. Es `https://t.me/ai_klaps_bot?start=KLAPS-84920`.
3. El familiar pulsa **Iniciar**. Telegram envía al bot `/start KLAPS-84920` junto a su `chat_id`
   real.
4. **«Verificar vinculación»** llama a la función del servidor. La función lee `getUpdates` y
   acepta **solo** el mensaje cuyo texto empieza por `/start` y cuyo argumento coincide **exactamente**
   con el código pedido. Los demás chats se descartan, así que cien usuarios vinculando a la vez
   no se mezclan. La pareja `código → chat_id` queda en la tabla `telegram_links`.
5. Cuando salta el SOS, el navegador manda `{action:'send', code, text}`. El servidor busca el chat
   de ese código y llama a `sendMessage`. El token **nunca** viaja al cliente.

---

## 2. Variables de entorno

`.env` (no se versiona — `.gitignore` lo excluye; hay plantilla en `.env.example`):

```env
# Públicas (las ve el navegador)
VITE_TELEGRAM_BOT_USERNAME=ai_klaps_bot
VITE_TELEGRAM_API_URL=https://<project-ref>.supabase.co/functions/v1/klaps-telegram
```

Secretos **del servidor** (nunca con prefijo `VITE_`):

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN=123456789:AA... \
  KLAPS_ALLOWED_ORIGIN=http://localhost:5173
```

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `VITE_TELEGRAM_BOT_USERNAME` | navegador | arma el enlace `t.me/...?start=` |
| `VITE_TELEGRAM_API_URL` | navegador | función que vincula y envía |
| `TELEGRAM_BOT_TOKEN` | servidor | hablar con la Bot API |
| `KLAPS_ALLOWED_ORIGIN` | servidor | CORS: origen permitido (`*` o `https://tu-dominio`) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | servidor | las inyecta Supabase en la función |

---

## 3. Despliegue (Supabase)

```bash
# 1. Proyecto enlazado
supabase link --project-ref <project-ref>

# 2. Tabla de vinculaciones
supabase db push            # aplica supabase/migrations/*_telegram_links.sql

# 3. Función (sin verificación JWT: la app es anónima)
supabase functions deploy klaps-telegram --no-verify-jwt

# 4. Token y CORS
supabase secrets set TELEGRAM_BOT_TOKEN=... KLAPS_ALLOWED_ORIGIN=...
```

Sin CLI también vale el panel de Supabase: *SQL Editor* → pegar la migración; *Edge Functions* →
crear `klaps-telegram` con el contenido de `supabase/functions/klaps-telegram/index.ts`; *Edge
Functions → Secrets* → añadir `TELEGRAM_BOT_TOKEN`.

Cualquier otro backend (FastAPI, Cloudflare Worker, Vercel) sirve si respeta el contrato del punto 5.

---

## 4. Requisitos del bot oficial

- El bot debe existir y su usuario coincidir con `VITE_TELEGRAM_BOT_USERNAME`.
- **Sin webhook configurado.** Si el bot tiene webhook, `getUpdates` responde `409 Conflict`.
  Para quitar el webhook: `curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"`.
- Telegram guarda los mensajes pendientes de `getUpdates` **24 h**: la vinculación debe verificarse
  el mismo día en que el familiar pulsa Iniciar. Una vez guardada la pareja en la base de datos,
  ya no hace falta `getUpdates` nunca más.

---

## 5. Contrato del servidor

`POST $VITE_TELEGRAM_API_URL`, JSON, siempre `200` con `ok` dentro:

| Petición | Respuesta |
| --- | --- |
| `{action:'verify', code}` | `{ok:true, linked:true, chatId:'123456789', chatName:'María'}` · `{ok:true, linked:false}` |
| `{action:'send', code, text}` | `{ok:true, delivered:true, messageId:42}` · `{ok:true, delivered:false, error:'…'}` |
| `{action:'unlink', code}` | `{ok:true, linked:false}` |

Errores del servidor: `{ok:false, error:'texto legible'}` con estado 4xx/5xx. La app muestra ese
texto tal cual y **nunca** marca una alerta como enviada sin `delivered: true`.

---

## 6. Ubicación autorizada por adelantado

En `/emergencia`, **«Activar ubicación para emergencias»** pide el permiso una vez y guarda
`klaps.location.v1 = {latitude, longitude, accuracy, at}` en el navegador.

Cuando el SOS se dispara, la app intenta la ubicación del momento; si el navegador la niega, tarda
más que la cuenta atrás o no hay respuesta, usa la guardada **si tiene menos de 6 horas** y lo
indica en el mensaje:

```
Ubicación: -12.04318, -77.02824 (±15 m).
https://www.google.com/maps?q=-12.04318,-77.02824
Referencia: ubicación guardada hace 2 h.
```

Nunca se inventan coordenadas: sin permiso y sin lectura previa, el mensaje dice
`Ubicación: no disponible (sin autorización).`

---

## 7. Seguridad y límites (leer antes de producción)

- **El código de vinculación es un identificador con privilegio**: quien lo conozca puede vincular
  *su* chat a *tu* alerta (recibiría tu ubicación) o, en teoría, empujar mensajes a un chat ya
  vinculado. `KLAPS-` + 5 dígitos es fácil de dictar por teléfono, pero el espacio es de 100 000
  combinaciones. Mitigaciones ya incluidas: el botón **«Generar otro código»** rota el código y da
  de baja el anterior, y la verificación solo acepta el `/start` exacto.
- **La función es pública** (`--no-verify-jwt`) porque la app no tiene login. Para producción se
  recomienda activar Supabase Auth anónima + JWT, o limitar por IP en un Worker/proxy.
- **RLS activo y sin políticas**: la tabla `telegram_links` no es legible desde el cliente.
- **El token no está en el bundle.** Cualquiera puede revisar `dist/assets/*.js` y solo verá
  `VITE_TELEGRAM_BOT_USERNAME` y `VITE_TELEGRAM_API_URL`.
- Si el token se filtró alguna vez (se pegó en un chat, en un commit, en una captura),
  `@BotFather` → `/revoke` y actualizar el secreto del servidor.

---

## 8. Qué cambió en el código

| Archivo | Papel |
| --- | --- |
| `src/config/telegram.js` | lee las variables públicas y arma el enlace profundo |
| `src/services/emergency/linkCode.js` | código de sesión, persistencia, rotación y baja |
| `src/services/emergency/telegramApi.js` | cliente del servidor (`verify` / `send` / `unlink`) |
| `src/services/emergency/location.js` | ubicación autorizada, edad y respaldo para la alerta |
| `src/services/emergency/sos.js` | canal listo = vinculado + servidor; envío real |
| `src/pages/Emergency/Emergency.jsx` | tarjeta nueva: código, enlace, verificar, prueba, desvincular, ubicación |
| `src/pages/Translation/Translation.jsx` | 3 señas → aviso cancelable → `send` con ubicación de respaldo |
| `supabase/functions/klaps-telegram/index.ts` | servidor: token, `getUpdates` filtrado y `sendMessage` |
| `supabase/migrations/20261120000000_telegram_links.sql` | tabla `código → chat_id` |

Eliminado: `src/services/emergency/telegram.js` (token en el navegador y `getUpdates` desde el
cliente). El flujo antiguo de `@BotFather` ya no se muestra en la interfaz.

---

## 9. Probarlo sin desplegar

Sin `VITE_TELEGRAM_API_URL`, la app arranca, muestra el código y explica en la tarjeta que falta el
servidor; los botones de vincular y enviar están desactivados. Es el comportamiento correcto: **no
se simula** una alerta enviada.

Con el servidor desplegado:

1. `/emergencia` → copia el enlace → ábrelo en el móvil del familiar → **Iniciar**.
2. **Verificar vinculación** → debe decir «Vinculado a …».
3. **Enviar prueba** → el mensaje llega al chat.
4. **Activar ubicación para emergencias** → acepta el permiso del navegador.
5. `/traducir` → **Iniciar detección** → agita el guante 3 veces → cuenta atrás de 10 s → mensaje
   con coordenadas.

---

## 10. Problemas frecuentes al desplegar

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| **«La función del servidor no existe (404)»** | la URL no es la de la función, la función no está desplegada o el proyecto se estaba restaurando | comprobar que `VITE_TELEGRAM_API_URL` sea `https://<ref>.supabase.co/functions/v1/klaps-telegram` (la app muestra ahora la URL exacta que llama) |
| La migración figura en el historial pero la tabla no existe | se aplicó mientras el proyecto estaba `COMING_UP` (restauración) y el DDL no llegó a persistir | volver a aplicarla y comprobar `select to_regclass('public.telegram_links');` |
| «Falta el secreto TELEGRAM_BOT_TOKEN en el servidor.» | secreto no creado o creado en otro proyecto | *Edge Functions → Secrets* o `supabase secrets set` |
| «Telegram rechazó la petición (Unauthorized)» | token revocado o mal copiado | `/revoke` en @BotFather y actualizar el secreto |
| «Todavía nadie abrió el enlace con ese código.» | no se pulsó **Iniciar**, o pasaron más de 24 h desde el mensaje | repetir el enlace y verificar en el día |

### Comprobar el endpoint sin abrir la app

```powershell
curl.exe -i -X POST "https://<ref>.supabase.co/functions/v1/klaps-telegram" `
  -H "Content-Type: application/json" `
  -d "{\"action\":\"verify\",\"code\":\"KLAPS-12345\"}"
```

| Respuesta | Significado |
| --- | --- |
| `200` + `{"ok":true,"linked":false,...}` | ✅ la función está viva; falta que alguien abra el enlace |
| `404` | la función no está desplegada en ese proyecto o la URL no es la correcta |
| `500` «Falta el secreto…» | falta `TELEGRAM_BOT_TOKEN` |
| `401` | `verify_jwt` está activado: desplegar con `--no-verify-jwt` |
