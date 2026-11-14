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
