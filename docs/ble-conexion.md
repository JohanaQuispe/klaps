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
