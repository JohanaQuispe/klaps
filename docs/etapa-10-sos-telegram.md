# Etapa 10 · SOS real por Telegram

La alerta de emergencia ya se envía de verdad: **tres repeticiones de la seña de SOS** en 15 segundos
mandan un mensaje al contacto configurado a través de un bot de Telegram.

> Sin canal configurado **no se simula nada**: la app dice que la alerta no salió y por qué.

## 1. Preparar el bot (una sola vez)

1. En Telegram, abre **@BotFather** y envía `/newbot`. Elige nombre y usuario; te devuelve un token
   con la forma `123456789:AAEhBOweik…`.
2. Abre la pantalla **Emergencia SOS** de KLAPS y pega el token en «Token del bot».
3. El contacto de emergencia debe **abrir ese bot y enviarle `/start`** una vez. Telegram no permite
   que un bot escriba a alguien que no lo haya iniciado; el número de teléfono no basta.
4. Pulsa **Buscar contactos**: la app llama a `getUpdates` y lista los chats que escribieron al bot.
   Elige el contacto y guarda.
5. Pulsa **Enviar prueba** para confirmar que llega.

Todo se guarda en `localStorage['klaps.telegram.v1']` (`token`, `chatId`, `chatName`), solo en ese
navegador.

## 2. Cómo se dispara

```
seña SOS reconocida 1×  →  contador 1/3 (aviso en pantalla)
seña SOS reconocida 2×  →  contador 2/3
seña SOS reconocida 3×  →  cuenta atrás de 10 s  →  envío automático a Telegram
```

- Las repeticiones cuentan solo si están separadas menos de **15 s** entre sí.
- Durante la cuenta atrás se puede **cancelar** o pulsar **Enviar ahora**.
- Si el permiso de ubicación está activado, se pide al abrir el aviso y se añade un enlace de Google
  Maps al mensaje.
- El botón **Activar SOS** de la pantalla de emergencia usa el mismo envío con su propio flujo de
  confirmación.

## 3. Contenido del mensaje

```
ALERTA KLAPS · EMERGENCIA
Necesito ayuda inmediata.
Para: María
Activada con 3 señas de SOS.
Ubicación: -12.04318, -77.02824 (±15 m).
https://www.google.com/maps?q=-12.04318,-77.02824
Hora: 14/11/2026, 13:04:22
```

## 4. Estados reales, no simulados

| Situación | Qué muestra la app |
| --- | --- |
| Telegram responde `ok: true` | «Alerta enviada por Telegram a María» |
| Telegram responde `ok: false` | «Telegram rechazó la petición (Bad Request: chat not found)» |
| Red caída o petición bloqueada (CORS/extensiones) | «No se pudo contactar con api.telegram.org…» |
| Sin token o sin contacto | «No hay ningún canal conectado todavía…» |
| Token/contacto inválido | El formulario no deja guardar y explica el formato |

El estado solo pasa a «enviada» con la respuesta de Telegram. Nunca se marca como entregada una
alerta que no salió.

## 5. Seguridad y limitaciones

- **El token vive en el navegador.** Cualquiera con acceso a ese equipo puede leerlo; usa un bot
  creado solo para KLAPS y no lo reutilices. Para un despliegue público, mueve el token a un
  servidor propio (Cloudflare Worker, Express…) y deja en la app solo la URL del proxy.
- La app llama directamente a `api.telegram.org`. Si una extensión de privacidad o el propio
  navegador bloquea la petición, verás el error de red: no es un fallo silencioso.
- Telegram no permite escribir a un número de teléfono: hace falta el `chat_id` del contacto (por eso
  el botón «Buscar contactos»).
- La alerta depende de que haya internet. Para emergencias reales, añade también una llamada
  telefónica: el aviso incluye un botón «Llamar» cuando hay teléfono guardado.

## 6. Archivos

| Archivo | Cambio |
| --- | --- |
| `src/services/emergency/telegram.js` | **nuevo**: token/chat, `sendTelegramMessage`, `fetchTelegramChats`, prueba, mensaje |
| `src/services/emergency/sos.js` | `sendAlert` real por Telegram, mensaje con mapa y número de repeticiones |
| `src/pages/Emergency/Emergency.jsx` | tarjeta de configuración (token, buscar contactos, prueba, borrar) y resultado real |
| `src/pages/Translation/Translation.jsx` | contador 3/3, cuenta atrás de 10 s, modal y envío |

## 7. Cómo probarlo sin guantes

1. Configura el bot y el contacto (pasos 1-5 de arriba) y pulsa **Enviar prueba**.
2. Si ya tienes una seña `SOS` entrenada, entra en `/traducir`, pulsa **Iniciar detección** y hazla
   tres veces seguidas.
3. Debe aparecer el contador «1 de 3», «2 de 3» y el aviso con la cuenta atrás.
4. Cancela la primera vez para comprobar que no envía nada; repite y deja que envíe.
5. Revisa el mensaje en el chat del contacto.
