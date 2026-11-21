# Etapa 10 · SOS real por Telegram

La alerta de emergencia ya se envía de verdad: **tres repeticiones de la seña de SOS** en 15 segundos
mandan un mensaje al contacto configurado a través de un bot de Telegram.

> Sin canal configurado **no se simula nada**: la app dice que la alerta no salió y por qué.

## 1. Conectar el contacto (ya no se crea ningún bot)

Desde la etapa 11 la app usa el **bot oficial `@ai_klaps_bot`** y el token vive en el servidor: el
usuario solo vincula a su familiar con un enlace y un código de sesión (`KLAPS-84920`).

👉 Procedimiento completo en [`etapa-11-telegram-multiusuario.md`](etapa-11-telegram-multiusuario.md).

En resumen, en `/emergencia`:

1. **Vincular contacto en Telegram** (o copiar el enlace y mandarlo al familiar).
2. La persona abre el bot y pulsa **Iniciar** → se envía `/start KLAPS-84920`.
3. **Verificar vinculación** → la app confirma «Vinculado a …».
4. **Enviar prueba** para comprobar que llega.

## 2. Seña física de auxilio (sin entrenamiento)

El clasificador KNN necesita señas grabadas, y con el guante actual los flex solo dan señal en un
dedo: las letras estáticas todavía no son fiables. Por eso la emergencia tiene un camino propio que
usa **solo el MPU-6050** y no depende de ninguna seña entrenada:

> **Agitar el guante de lado a lado, tres veces**, con el guante conectado y la detección en marcha
> en `/traducir`.

Cómo se reconoce cada vaivén (`src/services/emergency/helpSignal.js`):

- Se mira el **cambio de aceleración entre dos tramas seguidas** (20 Hz). Cada salto de 6 m/s² o más
  cuenta como un impulso.
- Un vaivén necesita **3 impulsos y al menos 2 inversiones de dirección**. Esa inversión es lo que
  distingue agitar de un movimiento suelto: saludar, alcanzar un objeto o dejar el guante sobre la
  mesa empujan la aceleración en una sola dirección y no suman.
- Al quedarse quieto 700 ms se cierra el vaivén y se evalúa; un movimiento continuo de más de
  1,6 s se descarta para que no cuente como varias señas.
- Tres vaivenes dentro de 15 s abren el mismo aviso cancelable de 10 s del apartado siguiente.
- Las tramas en ceros (guante sin IMU) se ignoran: nunca disparan nada.

En pantalla, dentro de «Señal en vivo», hay un medidor **«Seña física de auxilio»** que muestra la
intensidad del movimiento y los impulsos del vaivén en curso. Si el medidor se mueve pero el contador
no sube, la sacudida es demasiado suave o no invierte la dirección.

## 3. Cómo se dispara

```
seña SOS reconocida 1×  →  contador 1/3 (aviso en pantalla)
seña SOS reconocida 2×  →  contador 2/3
seña SOS reconocida 3×  →  cuenta atrás de 10 s  →  envío automático a Telegram
```

- Valen las dos vías: la seña **entrenada** llamada `SOS` / `emergencia` / `auxilio` y la **seña
  física** (agitar el guante). También se pueden mezclar.
- Las repeticiones cuentan solo si están separadas menos de **15 s** entre sí.
- Durante la cuenta atrás se puede **cancelar** o pulsar **Enviar ahora**.
- Si el permiso de ubicación está activado, se pide al abrir el aviso y se añade un enlace de Google
  Maps al mensaje.
- El botón **Activar SOS** de la pantalla de emergencia usa el mismo envío con su propio flujo de
  confirmación.

## 4. Contenido del mensaje

```
ALERTA KLAPS · EMERGENCIA
Necesito ayuda inmediata.
Para: María
Activada con 3 señas de SOS.
Ubicación: -12.04318, -77.02824 (±15 m).
https://www.google.com/maps?q=-12.04318,-77.02824
Hora: 14/11/2026, 13:04:22
```

## 5. Estados reales, no simulados

| Situación | Qué muestra la app |
| --- | --- |
| Telegram responde `ok: true` | «Alerta enviada por Telegram a María» |
| Telegram responde `ok: false` | «Telegram rechazó la petición (Bad Request: chat not found)» |
| Red caída o petición bloqueada (CORS/extensiones) | «No se pudo contactar con api.telegram.org…» |
| Sin token o sin contacto | «No hay ningún canal conectado todavía…» |
| Token/contacto inválido | El formulario no deja guardar y explica el formato |
| Sin señas entrenadas | La detección se puede iniciar igual: funciona la seña física de auxilio |

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
