# Etapa 9 · Calibración guiada de dedos e IMU

Los guantes no llegan a 0 % con la mano abierta ni a 100 % con el puño cerrado, y el MPU-6050
arrastra un pequeño sesgo. Hasta ahora eso obligaba a retocar el firmware. La calibración guiada
mide los extremos reales **en el navegador** y reescala las lecturas sin tocar el ESP32.

## 1. Asistente de tres pasos

En `/entrenamiento`, tarjeta **«Calibración guiada»** (antes de «Grabar nueva seña»). Cada paso dura
**2 segundos a 20 Hz = 40 muestras**, con 900 ms de pausa previa para colocarse.

| Paso | Qué pide | Qué mide |
| --- | --- | --- |
| 1 · Dedos estirados (0 %) | Abrir las dos manos al máximo | `min[0..9]` real de cada dedo |
| 2 · Dedos doblados (100 %) | Cerrar los dos puños con fuerza | `max[0..9]` real de cada dedo |
| 3 · Movimiento de referencia | Subir, bajar y dejar al centro | línea base del MPU-6050 (`imuOffset`) |

`min` y `max` son 10 valores: `0..4` guante derecho (KLAPS-D) y `5..9` izquierdo (KLAPS-U).

Al terminar se guarda automáticamente y el botón pasa a **«Recalibrar»**; **«Quitar calibración»**
vuelve a los valores del firmware.

## 2. Almacenamiento (`klaps.calibration.v1`)

```json
{
  "version": 1,
  "createdAt": 1763000000000,
  "flex": {
    "min": [12, 15, 10, 18, 14, 20, 22, 18, 25, 19],
    "max": [78, 82, 74, 88, 80, 70, 72, 68, 75, 71],
    "valid": [true, true, true, true, true, true, true, true, true, true]
  },
  "imu": {
    "derecho": { "ax": 0.1, "ay": -0.2, "az": 9.7, "gx": 0.4, "gy": -0.2, "gz": 0.1 },
    "izquierdo": { "ax": -0.1, "ay": 0.2, "az": 9.6, "gx": -0.4, "gy": 0.2, "gz": -0.1 }
  },
  "samples": { "stretched": 40, "closed": 40, "neutral": 40 }
}
```

Si un dedo **no cambia** lo suficiente entre mano abierta y puño cerrado (menos de 5 puntos), se
marca `valid: false` y se deja tal cual: mejor eso que estropear el vector de una mano entera cuando
el firmware todavía no lee los flex. La interfaz lo muestra como «sin cambios».

## 3. Cómo se aplica (`sensorFrame.js`)

`applyCalibration(reading, calibration, side)` se ejecuta en `DeviceProvider` justo después de
decodificar la trama de 34 bytes, así que **todas** las pantallas (traducción, entrenamiento,
diagnóstico) usan los mismos valores:

- **Flex:** `(valor − min) / (max − min) × 100`, recortado a 0-100. Con el ejemplo de arriba, un
  45 crudo pasa a 50 %.
- **IMU:** se resta la línea base de cada eje (aceleración y giroscopio), guante por guante.
- Las lecturas originales se conservan en `rawFlex` / `rawImu`.

La regla física del estado «0» (palma hacia abajo, `az ≤ −7,5 m/s²`) sigue usando **`rawImu`**: es
una condición de orientación absoluta y no debe depender de la línea base elegida al calibrar.

## 4. Cuándo recalibrar

- Después de cambiar las baterías, el firmware o la posición de los sensores en el guante.
- Si notas que un dedo se queda siempre al 0 % o al 100 %.
- Tras cambiar de persona que usa los guantes.

> Si ya tenías señas grabadas, **vuélvelas a grabar** después de calibrar: las muestras antiguas se
> guardaron con los valores del firmware y ahora se comparan con lecturas calibradas. La app avisa
> de esto al terminar.

## 5. Cómo probarlo

1. `/entrenamiento` → conecta los guantes y guarda los UUID.
2. Pulsa **Iniciar calibración guiada**.
3. Sigue los tres pasos. Al terminar aparece el resumen: rango medido de cada dedo y la hora.
4. En «Lectura en vivo» debe verse el aviso *«Lecturas calibradas…»* y los porcentajes moverse
   entre 0 y 100 con más recorrido que antes.
5. Graba una seña estática (40 fotogramas, 2 s) y otra dinámica (80 fotogramas, 4 s).
6. Prueba en `/traducir` y comprueba la pausa con los puños cerrados hacia abajo.

## 6. Archivos

| Archivo | Cambio |
| --- | --- |
| `src/services/bluetooth/calibration.js` | **nuevo**: modelo, pasos, `buildCalibration`, guardado en `klaps.calibration.v1` |
| `src/services/bluetooth/sensorFrame.js` | `applyCalibration`, campos `rawFlex` / `rawImu`, reposo sobre `rawImu` |
| `src/context/DeviceProvider.jsx` | lecturas calibradas y calibración expuesta al contexto |
| `src/pages/Training/Training.jsx` | tarjeta del asistente, captura de los tres pasos y resumen |

## 7. Lo que ya venía de la etapa 8

Esta entrega incluye también, sin cambios respecto al PR #14: 40/80 fotogramas por captura,
16 pasos clave, ponderación IMU ×2,5 / giroscopio ×3,2 · flex ×0,7, selector de mano por seña,
estado «0» de reposo y tarjetas de `/dispositivos` sin RSSI.
