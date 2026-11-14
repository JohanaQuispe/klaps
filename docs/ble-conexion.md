# Conectar los guantes ESP32-D y ESP32-U por Bluetooth LE

## 1. Qué hay ya en la app

La pantalla **`/dispositivos/diagnostico`** abre una conexión **real** con Web Bluetooth:

1. Pulsa «Buscar por Bluetooth».
2. El navegador muestra su selector; elige tu placa.
3. KLAPS se conecta, **enumera los servicios y características** del ESP32 y permite
   suscribirse a las que tengan `notify`, con un registro en vivo en hexadecimal y texto.
4. Botón «Copiar UUID» para pegar el resultado y configurar la lectura de sensores.

Las tarjetas de `/dispositivos` siguen en **modo demostración**: no muestran datos del guante
real hasta que exista el protocolo (UUID + formato), para no inventar lecturas.

## 2. Requisitos imprescindibles

| Requisito | Detalle |
| --- | --- |
| **BLE (GATT)** | Web Bluetooth **no** funciona con Bluetooth clásico (`BluetoothSerial`/SPP). El ESP32 debe anunciar servicios GATT. |
| Navegador | Chrome, Edge u Opera en escritorio · Chrome en Android. **Safari (iOS/macOS) y Firefox no lo soportan.** |
| Contexto seguro | HTTPS o `localhost`. La vista previa de Arena ya es HTTPS. |
| Permiso | El usuario elige el dispositivo en cada conexión; no hay escaneo silencioso. |

## 2.1 Cómo conseguir el «contexto seguro»

El navegador solo expone Web Bluetooth en `https://` o en `localhost`. Si abres la app por
`http://192.168.x.x` o `http://10.x.x.x` (la IP de tu equipo en la red), **no habrá Bluetooth**,
aunque uses Chrome. La pantalla de guantes lo detecta y lo explica con la dirección exacta.

| Caso | Dirección correcta | Qué hace falta |
| --- | --- | --- |
| Probar en el **mismo PC** que ejecuta `npm run dev` | `http://localhost:5173` | Nada más. `localhost` cuenta como seguro. Usa el Bluetooth de ese PC. |
| Probar desde el **móvil** o desde otro equipo | `https://…` | Un certificado válido (ver abajo). Usa el Bluetooth del móvil. |

### Opción A — Túnel HTTPS (la más rápida para el móvil)

En el PC, con el servidor corriendo, en otra terminal:

```powershell
cloudflared tunnel --url http://localhost:5173
```

Instalación: `winget install Cloudflare.cloudflared`. Te da una URL `https://algo.trycloudflare.com`:
ábrela en Chrome del móvil y el botón de Bluetooth funcionará. La URL cambia en cada ejecución y
necesita internet. El tráfico pasa por Cloudflare, así que úsalo solo con datos de prueba.

### Opción B — Certificado local con mkcert

```powershell
winget install FiloSottile.mkcert
mkcert -install
mkcert 192.168.1.50 localhost
```

Luego hay que configurar Vite con `https` y ese certificado, e **instalar la CA de mkcert en el
móvil** (Ajustes → Seguridad → Instalar certificado). Más trabajo, pero la dirección es fija y no
depende de internet.

### Opción C — Solo escritorio, sin HTTPS

En Chrome de escritorio: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, añade
`http://10.68.48.214:5173` y reinicia el navegador. Sirve para desarrollo; no existe en móvil y no
debe usarse en producción.

### Permisos: qué se pide y qué no

- La **única** autorización es el selector de dispositivos del navegador: eliges tu ESP32 y Chrome
  recuerda esa autorización.
- Windows: Bluetooth activo en *Configuración → Bluetooth y dispositivos*.
- Android: permiso de «Dispositivos cercanos» para Chrome.
- La app **no** pide ubicación ni escanea en segundo plano.

## 2.2 ¿Y un APK?

Un APK nativo **no** es un simple empaquetado de esta web: el WebView de Android no implementa
Web Bluetooth, así que la app quedaría sin Bluetooth. Para tener BLE real en un APK haría falta
añadir código nativo — por ejemplo **Capacitor + `@capacitor-community/bluetooth-le`** o React
Native BLE —, lo que implica otro conjunto de dependencias, Android Studio y un flujo de compilación
distinto.

Alternativa intermedia: **instalar la web como aplicación (PWA)** desde Chrome del móvil
(«Añadir a pantalla de inicio»). Se ve como una app, pero sigue necesitando HTTPS y el navegador
Chrome para acceder al Bluetooth.

## 3. Firmware mínimo recomendado (ESP32 Arduino)

Servicio propio + característica con `notify`, y —muy recomendable— el servicio estándar de
batería para que la app muestre el porcentaje sin configuración extra.

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Cambia el nombre en cada placa: KLAPS-D (derecha) / KLAPS-U (izquierda)
#define DEVICE_NAME "KLAPS-D"

// UUID propios (puedes generar los tuyos; avísame cuáles usas)
#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define SENSORS_CHAR_UUID   "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define GESTURE_CHAR_UUID   "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

BLECharacteristic *sensorsChar;
BLECharacteristic *gestureChar;

void setup() {
  BLEDevice::init(DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();

  BLEService *service = server->createService(SERVICE_UUID);

  sensorsChar = service->createCharacteristic(
      SENSORS_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  sensorsChar->addDescriptor(new BLE2902());

  gestureChar = service->createCharacteristic(
      GESTURE_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  gestureChar->addDescriptor(new BLE2902());

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  BLEDevice::startAdvertising();
}

void loop() {
  // Trama propuesta: 5 flex (uint16, 0-4095) + 6 valores del MPU6050 (int16)
  uint8_t payload[22];
  // ... rellena con las lecturas reales ...
  sensorsChar->setValue(payload, sizeof(payload));
  sensorsChar->notify();

  uint8_t gesture = 3; // código de gesto reconocido
  gestureChar->setValue(&gesture, 1);
  gestureChar->notify();

  delay(100); // 10 Hz es suficiente para la traducción
}
```

### Batería (opcional pero recomendado)

Con el servicio estándar `0x180F` y la característica `0x2A19` (nivel, uint8 0-100), la app
muestra el porcentaje automáticamente **sin** configuración adicional.

## 4. Formato de datos propuesto

| Característica | Bytes | Contenido |
| --- | --- | --- |
| Sensores | 22 | `uint16 flex[5]` (0-4095) + `int16 accel[3]` + `int16 gyro[3]` |
| Gesto | 1 | Código del gesto reconocido (1-255) |

Cualquier otro formato es válido: solo necesito saber el orden y el tipo de cada campo.

## 5. Lo que necesito de ti para activar la lectura real

1. Los **UUID** del servicio y de la característica de sensores (y la de gesto, si existe).
2. El **formato** de la trama (tipos y orden de los campos) y la frecuencia de envío.
3. El **nombre anunciado** por cada placa (por ejemplo `KLAPS-D` y `KLAPS-U`).
4. Si el firmware publica batería y con qué UUID.

Puedes obtener los tres primeros puntos sin tocar código: conecta la placa en
`/dispositivos/diagnostico`, pulsa «Copiar UUID» y pégame el resultado.

## 6. Límites que conviene conocer

- **RSSI**: Web Bluetooth no expone la intensidad de señal de un dispositivo conectado. El valor
  que ves en las tarjetas es simulado; en modo real se mostrará solo si el firmware lo publica
  como dato propio.
- **iOS**: cualquier navegador en iPhone/iPad queda fuera por decisión de Apple (WebKit no
  implementa Web Bluetooth). La alternativa sería una app nativa.
- **Sin emparejamiento previo**: no se puede reconectar solo con el identificador. El usuario
  vuelve a elegir el dispositivo en cada sesión; Chrome recuerda los que ya autorizaste.

## 7. Configuración en el código

`src/services/bluetooth/bleConfig.js`:

```js
namePrefixes: ['KLAPS', 'ESP32', 'Guante'],  // filtros del selector
UUID: { service: null, sensors: null, gesture: null }, // ← rellenar aquí
```

`isGloveProtocolConfigured()` indica si ya se puede leer el hardware. Mientras devuelva `false`,
la aplicación mantiene el modo demostración y lo avisa en pantalla.

## 8. Si tu ESP32 no aparece en el selector

### Paso 0 — la prueba decisiva

Abre `chrome://bluetooth-internals` en otra pestaña y pulsa **Start Scan**. Es la herramienta
interna de Chrome, sin relación con KLAPS:

| Resultado | Significado |
| --- | --- |
| Tu placa **no** aparece allí | No está anunciándose por BLE. El problema es del firmware o del hardware, no de la app. |
| Aparece allí, pero no en KLAPS | El filtro de nombre la está descartando: elige «Cualquier dispositivo BLE (sin filtro de nombre)». |

### Caso A — la ventana del selector no se abre

1. La dirección no es segura: debe ser `http://localhost:5173` o `https://…`.
2. El navegador no tiene Web Bluetooth: usa Chrome, Edge u Opera. Safari y Firefox no lo tienen.
3. El adaptador está apagado o no existe (en Windows: *Configuración → Bluetooth y dispositivos*).
   Chrome muestra `NotFoundError` si no hay adaptador disponible.

### Caso B — la ventana se abre pero tu placa no está en la lista

1. **Bluetooth clásico en vez de BLE.** Si el sketch usa `BluetoothSerial` (SPP), el navegador
   nunca lo verá. Hay que recompilar con `BLEDevice`, NimBLE o la librería `ArduinoBLE`.
2. **No hay anuncio.** Falta `BLEDevice::startAdvertising()` o se detuvo tras una conexión
   anterior: reinicia la placa con el botón **EN**.
3. **Está conectada a otro central** (otro móvil, otra pestaña, una app de pruebas). Mientras tiene
   conexión, deja de anunciarse.
4. **La variante no tiene Bluetooth.** ESP32-S2 no incluye radio; ESP32, S3 y C3 sí (BLE).
5. **Nombre distinto al filtro.** Una placa llamada `KLAPS-D`, `GuanteU` o `MiESP` no coincide con
   el prefijo `ESP32`. Usa la opción sin filtro.

### Caso C — conecta, pero no aparece ningún servicio

Web Bluetooth solo deja leer servicios **declarados antes de conectar**. Los estándar (batería,
información del dispositivo) ya están declarados; el servicio propio del guante hay que añadirlo:

- En la pantalla de diagnóstico, tarjeta **«Servicio propio del guante»**: pega el UUID del
  firmware y pulsa *Guardar UUID*. Se guarda en el navegador y se aplica en la siguiente conexión.
- O en el código, en `BLE_CONFIG.optionalServices`.
- Los UUID también se leen en `chrome://bluetooth-internals`: conecta la placa ahí y mira la
  pestaña de servicios y características.

### 8.1 Prueba de radio con un sketch mínimo

Si en `chrome://bluetooth-internals` aparecen televisiones, altavoces y móviles pero **no tu
placa**, el escaneo funciona: lo que falta es que el ESP32 anuncie. Para descartar el firmware
propio, sube el sketch de prueba:

**`docs/firmware/prueba-ble/prueba-ble.ino`**

- Anuncia el nombre **`KLAPS-TEST`**, que es fácil de localizar en la lista.
- Publica el servicio `6e400001-b5a3-f393-e0a9-e50e24dcca9e` y la batería estándar al 87 %.
- Envía un contador cada segundo: sirve para comprobar que las notificaciones llegan.
- **No lee sensores**: solo valida la radio y el GATT.

Pasos: Arduino IDE → placa «ESP32 Dev Module» → subir → Monitor Serie a 115200 → debe imprimir
`Anunciando como KLAPS-TEST`. Después, en KLAPS, elige «Cualquier dispositivo BLE (sin filtro de
nombre)».

| Resultado con el sketch de prueba | Conclusión |
| --- | --- |
| Aparece y conecta | La radio y el navegador están bien: el problema está en tu sketch real. |
| No aparece ni en bluetooth-internals | Revisa la placa elegida en el IDE y el modelo del módulo (ESP32-S2 no tiene radio). |
| Aparece pero KLAPS no lo ve | Actualiza a la versión con el selector sin filtro. |

> Nota: un ESP32 sin nombre configurado puede aparecer como «Dispositivo desconocido» con solo su
> MAC. Ese es el motivo de usar un nombre identificable en la prueba.

