# Conectar los guantes KLAPS por Bluetooth LE (BLE GATT)

Guía técnica de integración entre el firmware del ESP32 y la aplicación web KLAPS.

El firmware oficial completo para compilar y flashear en Arduino IDE se encuentra en:  
**`docs/firmware/klaps-guante/klaps-guante.ino`**

---

## 1. Qué hay ya en la app

La pantalla **`/dispositivos/diagnostico`** abre una conexión **real** con Web Bluetooth:

1. Pulsa «Buscar por Bluetooth».
2. El navegador muestra su selector; elige tu placa (`KLAPS_Guante_D` o `KLAPS_Guante_I`).
3. KLAPS se conecta, **enumera los servicios y características** del ESP32 y permite
   suscribirse a las que tengan `notify`, con un registro en vivo en hexadecimal y texto.
4. Botón «Copiar UUID» para verificar o ajustar la configuración si fuera necesario.

Las tarjetas de `/dispositivos` trabajan en **modo real**: abren la conexión y muestran solo lo
que el guante publica. Lo que no está publicado aparece como «sin lectura»; **no se inventan valores**
(la batería muestra «sin lectura» de forma honesta, ya que el guante se alimenta por USB y no tiene
circuito de medición de carga).

---

## 2. Requisitos imprescindibles

| Requisito | Detalle |
| --- | --- |
| **BLE (GATT)** | Web Bluetooth **no** funciona con Bluetooth clásico (`BluetoothSerial`/SPP). El ESP32 debe anunciar servicios GATT. |
| **Navegador** | Chrome, Edge u Opera en escritorio · Chrome en Android. **Safari (iOS/macOS) y Firefox no lo soportan.** |
| **Contexto seguro** | HTTPS o `localhost`. La vista previa y desarrollo local en `http://localhost:5173` son seguros. |
| **Permiso** | El usuario elige el dispositivo en cada conexión mediante el selector nativo del navegador. |

### 2.1 Cómo conseguir el «contexto seguro»

El navegador solo expone Web Bluetooth en `https://` o en `localhost`. Si abres la app por
`http://192.168.x.x` o `http://10.x.x.x` (la IP de tu equipo en la red), **no habrá Bluetooth**,
aunque uses Chrome. La pantalla de guantes lo detecta y lo explica con la dirección exacta.

| Caso | Dirección correcta | Qué hace falta |
| --- | --- | --- |
| Probar en el **mismo PC** que ejecuta `npm run dev` | `http://localhost:5173` | Nada más. `localhost` cuenta como seguro. Usa el Bluetooth de ese PC. |
| Probar desde el **móvil** o desde otro equipo | `https://…` | Un túnel HTTPS (Cloudflare Tunnel, ngrok o Vercel). Usa el Bluetooth del móvil. |

---

## 3. Arquitectura del Firmware Oficial (`klaps-guante.ino`)

El firmware para el microcontrolador ESP32 DevKit V1 implementa un servidor BLE GATT estándar.

- **Nombres anunciados:**
  - Mano derecha: **`KLAPS_Guante_D`**
  - Mano izquierda: **`KLAPS_Guante_I`**
  *(Se selecciona al inicio del archivo mediante `#define HAND_RIGHT` o `#define HAND_LEFT`).*
- **Servicio GATT:** `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- **Característica de sensores:** `6e400002-b5a3-f393-e0a9-e50e24dcca9e` (con descriptor `0x2902` y propiedad `NOTIFY`).
- **Frecuencia:** **20 Hz** (un paquete cada 50 ms), temporizado de forma no bloqueante con `millis()`.
- **Sensores de flexión:** 5 canales conectados exclusivamente al **ADC1** (GPIO 36, 39, 34, 35 y 32) para evitar conflictos con la radio inalámbrica.
  - El divisor de tensión es: `3.3V -> Flex -> Pin -> 47 kΩ -> GND`.
  - Al doblar el dedo, la resistencia sube y el voltaje en el pin **baja**. El firmware invierte la lectura analógica para entregar un porcentaje de 0 a 100 % (0 = recto, 100 = doblado).
- **IMU MPU-6050:** Conectado por I²C en pines GPIO 21 (SDA) y GPIO 22 (SCL).
  - Rango configurado: acelerómetro a ±2 g (convertido a m/s²) y giroscopio a ±250 °/s (convertido a rad/s).
  - **Inversión de $a_z$:** con el módulo soldado en el dorso de la mano mirando hacia arriba, se invierte el signo de $a_z$ para que con la palma hacia abajo mida $\approx -9.8\text{ m/s}^2$, cumpliendo con la regla física `isRestHand` de la app.
- **Batería:** **No se publica el servicio de batería (`0x180F`)** para evitar datos falsos o simulados.

```cpp
// Estructura de la trama binaria empaquetada (34 bytes contiguos):
struct __attribute__((packed)) SensorFrame {
  int16_t flex[5]; // Bytes 0-9: pulgar, índice, medio, anular, meñique (0-100 %)
  float ax;        // Bytes 10-13: aceleración X en m/s²
  float ay;        // Bytes 14-17: aceleración Y en m/s²
  float az;        // Bytes 18-21: aceleración Z en m/s² (≈ -9.8 con palma abajo)
  float gx;        // Bytes 22-25: giroscopio X en rad/s
  float gy;        // Bytes 26-29: giroscopio Y en rad/s
  float gz;        // Bytes 30-33: giroscopio Z en rad/s
};
```

---

## 4. Formato de datos oficial (34 bytes Little-Endian)

La característica `6e400002-b5a3-f393-e0a9-e50e24dcca9e` emite una notificación de **34 bytes** en cada ciclo de 50 ms (20 Hz), equivalente a un caudal neto de $\approx 680\text{ bytes/s}$:

| Rango de Bytes | Tipo de Dato | Variable | Rango y Unidades |
| :--- | :--- | :--- | :--- |
| **0 – 1** | `int16_t` (LE) | Flexión Dedo Pulgar | 0 a 100 % (0 = recto, 100 = doblado) |
| **2 – 3** | `int16_t` (LE) | Flexión Dedo Índice | 0 a 100 % (0 = recto, 100 = doblado) |
| **4 – 5** | `int16_t` (LE) | Flexión Dedo Medio | 0 a 100 % (0 = recto, 100 = doblado) |
| **6 – 7** | `int16_t` (LE) | Flexión Dedo Anular | 0 a 100 % (0 = recto, 100 = doblado) |
| **8 – 9** | `int16_t` (LE) | Flexión Dedo Meñique | 0 a 100 % (0 = recto, 100 = doblado) |
| **10 – 13** | `float32` (IEEE 754 LE) | Aceleración en eje X ($a_x$) | $\pm 20\text{ m/s}^2$ |
| **14 – 17** | `float32` (IEEE 754 LE) | Aceleración en eje Y ($a_y$) | $\pm 20\text{ m/s}^2$ |
| **18 – 21** | `float32` (IEEE 754 LE) | Aceleración en eje Z ($a_z$) | $\pm 20\text{ m/s}^2$ ($\approx -9.8\text{ m/s}^2$ en reposo) |
| **22 – 25** | `float32` (IEEE 754 LE) | Velocidad angular en eje X ($g_x$) | $\pm 10\text{ rad/s}$ |
| **26 – 29** | `float32` (IEEE 754 LE) | Velocidad angular en eje Y ($g_y$) | $\pm 10\text{ rad/s}$ |
| **30 – 33** | `float32` (IEEE 754 LE) | Velocidad angular en eje Z ($g_z$) | $\pm 10\text{ rad/s}$ |

> **Nota arquitectónica:** La clasificación inteligente del gesto **no se realiza en el ESP32** sino en el cliente web mediante el algoritmo KNN en JavaScript (sobre un vector de 22 dimensiones combinando ambos guantes). Esto permite calibrar los dedos y registrar nuevas señas directamente desde el navegador sin necesidad de recompilar el firmware.

---

## 5. Configuración en la aplicación web (`src/services/bluetooth/bleConfig.js`)

Los UUIDs y nombres oficiales ya vienen precargados en el código de KLAPS:

```js
export const BLE_CONFIG = {
  namePrefixes: ['KLAPS_Guante_D', 'KLAPS_Guante_I', 'KLAPS', 'ESP32', 'Guante'],
  optionalServices: [
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    'battery_service',
    'device_information',
  ],
  UUID: {
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    sensors: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    gesture: null, // inferencia ejecutada en el cliente
  },
}
```

La función `isGloveProtocolConfigured()` devuelve `true`, por lo que la interfaz web inicia la lectura real de sensores en cuanto se conecta la placa.

---

## 6. Diagnóstico y Resolución de Problemas

### 6.1 Prueba rápida de radio
Si la placa no aparece en el selector del navegador:
1. Abre `chrome://bluetooth-internals` en otra pestaña y pulsa **Start Scan**.
2. Si aparece `KLAPS_Guante_D` o `KLAPS_Guante_I`, la radio está funcionando bien y el nombre coincide con el filtro.
3. Si no aparece, verifica que en Arduino IDE no estés usando `BluetoothSerial` (Bluetooth clásico), ya que Web Bluetooth solo soporta BLE.

### 6.2 El IMU llega bien, pero los cinco flex marcan 0 %
1. **Monitor Serie del ESP32 a 115200 baudios:** el firmware imprime el valor de cada dedo cada segundo. Si por Serial ya salen en 0, revisa la alimentación de 3.3V hacia los flex o la resistencia pull-down de 47 kΩ.
2. **Pines analógicos:** asegúrate de haber conectado los flex a los pines GPIO 36, 39, 34, 35 y 32 (pertenecientes a ADC1). Nunca uses pines de ADC2 (GPIO 0, 2, 4, 12-15, 25-27), ya que quedan inhabilitados cuando el Bluetooth está activo.
3. **Calibración de extremos:** si el sensor en reposo no alcanza el valor de `ADC_STRAIGHT` (2600 por defecto), puedes ajustar las constantes `ADC_STRAIGHT` y `ADC_BENT` en el archivo `.ino` para adaptarlo a la resistencia exacta de tus divisores.
