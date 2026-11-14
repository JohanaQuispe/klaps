# Etapa 8 · Prioridad del movimiento y estado «0» (reposo)

Ajustes basados en las pruebas con los guantes `ESP32-D` (derecho) y `ESP32-U` (izquierdo).

| Cambio | Antes | Ahora |
| --- | --- | --- |
| Fotogramas por captura estática | 20 (1 s) | **40 (2 s)** |
| Fotogramas por captura dinámica | 40 (2 s) | **80 (4 s)** |
| Pasos clave de una trayectoria | 10 | **16** (352 dimensiones) |
| Peso de los sensores en dinámicas | Todos 1 | IMU 2,5 · giroscopio 3,2 · flex 0,7 |
| Estado de reposo | No existía | **«0»** por postura física o por seña entrenada |

## 1. Doble de fotogramas

- **Estáticas:** 40 fotogramas a 20 Hz (2 s). Registran las micro-variaciones naturales de los dedos.
- **Dinámicas:** 80 fotogramas a 20 Hz (4 s), resumidos en **16 pasos clave** (16 × 22 = 352
  dimensiones). La ventana deslizante del reconocimiento también es de 80 fotogramas.

Las trayectorias guardadas con 10 pasos se **remuestrean** a 16 al cargar (`resampleTrajectory`,
interpolación lineal): los entrenamientos anteriores siguen sirviendo.

El umbral de detección de movimiento bajó a **0,6** unidades por fotograma, porque en una ventana de
4 segundos un gesto suave avanza poco entre fotogramas.

## 2. El movimiento pesa más que la postura (N vs Ñ)

En `knnClassifier.js`, la distancia de las señas dinámicas es una **RMS ponderada**, así que sigue en
la misma escala 0-100 y los umbrales no cambian:

| Sensor | Dimensiones | Peso |
| --- | --- | --- |
| Flex | `flex0..4` | **0,7** |
| Aceleración | `ax, ay, az` | **2,5** |
| Giroscopio | `gx, gy, gz` | **3,2** |

Dentro del IMU el giroscopio pesa más porque el giro de la muñeca es lo que distingue letras con la
misma posición de dedos. Ejemplo medido en las pruebas:

```
N  (sin giro) vs Ñ (con giro de muñeca)
  distancia sin ponderar: N=9,03  Ñ=0,60   margen 8,43
  distancia ponderada:    N=11,80 Ñ=0,60   margen 11,20  ← más separación
  clasificación: Ñ al 94 %
```

Las señas **estáticas** mantienen todos los pesos en 1: ahí la postura es toda la información.

## 3. Modo de mano

Ya implementado en la etapa 7 y sin cambios: `handMode: 'right' | 'left' | 'both'` por seña, con
comparación sobre `0..10`, `11..21` o las 22 dimensiones (176 o 352 en trayectorias).

## 4. Estado «0»: reposo / pausa

`src/services/bluetooth/sensorFrame.js` (regla física) y `src/hooks/useGestureRecognition.js`
(efecto sobre la traducción).

**Activación dual:** basta con que se cumpla una de las dos.

1. **Regla física:** los cuatro dedos principales flexionados (`flex0..3 ≥ 75 %`) y la palma hacia
   abajo (`az ≤ −7,5 m/s²`). Se evalúan solo los guantes que envían datos y todos deben cumplirla,
   así se puede seguir firmando con una mano mientras la otra descansa.
2. **Seña entrenada** llamada `0`, `REPOSO` o `PAUSA` reconocida con confianza ≥ 75 %.

**Mientras el estado «0» está activo:**

- se reinician los temporizadores de estabilización y se vacía la ventana deslizante;
- no se emite ninguna seña, así que no se acumulan palabras ni se habla;
- se mantiene el enfriamiento normal de 1,5 s para la reanudación;
- la pantalla muestra **«Manos en reposo (0) — traducción pausada»** (en `/traducir` dentro del panel
  de señal en vivo, y en `/entrenamiento` en la tarjeta de prueba).

Se sale del reposo en cuanto las manos se mueven o se hace otra seña.

> Si el firmware todavía envía `0` en los cinco flex (ver `docs/ble-conexion.md` §8.2), la regla
> física no puede activarse: mientras tanto, la pausa funciona entrenando una seña `0`.

## 5. Confianza: margen en lugar de unanimidad

Con dos señas entrenadas, dividir los votos por K = 3 dejaba la confianza máxima en el 50 % y
**ninguna seña se reconocía nunca**. Ahora:

```
confianza = margen × similitud
margen    = peso del ganador / (peso del ganador + peso del segundo)
similitud = 1 − distancia / escala     (50 estáticas · 70 dinámicas)
```

Prueba: dos señas estáticas entrenadas («Hola», «Adiós») → la postura correcta se reconoce al **96 %**.

## 6. Tarjetas de `/dispositivos`

La fila «Señal (RSSI)» y su nota se retiraron en la etapa 7; se mantiene la vista limpia con estado
de conexión, batería publicada por el dispositivo y estado de los sensores.

## 7. Cómo probarlo

1. `/entrenamiento` → conecta los guantes y guarda los UUID.
2. Graba **N** con *Ambas + Dinámica*: haz el gesto sin girar la muñeca.
3. Graba **Ñ** con *Ambas + Dinámica*: el mismo movimiento, añadiendo el giro de muñeca.
4. **Iniciar prueba** y repite cada gesto: debe acertar sin confundirlos.
5. Cierra los puños con la palma hacia abajo y comprueba el aviso *«Manos en reposo (0)»*.
6. Alternativa si los flex aún no leen: entrena una seña llamada `0` con la postura de reposo.
7. `/traducir` → **Iniciar detección** y repite el paso 5: no se añaden palabras mientras está en
   reposo.

## 8. Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/services/gesture/knnClassifier.js` | 16 pasos, pesos por sensor, `weightView`, margen de confianza |
| `src/services/gesture/trajectory.js` | `resampleTrajectory`, umbral de movimiento 0,6 |
| `src/services/gesture/trainingStore.js` | 40 / 80 fotogramas, migración de trayectorias de 10 → 16 pasos |
| `src/services/bluetooth/sensorFrame.js` | `isRestHand`, `isRestPose`, umbrales del estado 0 |
| `src/hooks/useGestureRecognition.js` | ventana de 80 fotogramas, estado «0», `resting` / `restReason` |
| `src/pages/Translation/Translation.jsx` | aviso de traducción pausada |
| `src/pages/Training/Training.jsx` | textos de 40/80 fotogramas, aviso de reposo en la prueba |
