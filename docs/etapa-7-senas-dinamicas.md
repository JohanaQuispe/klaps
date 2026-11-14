# Etapa 7 · Señas estáticas y dinámicas, modo de mano

Ampliación del reconocimiento para tres escenarios que antes no se cubrían:

| Escenario | Antes | Ahora |
| --- | --- | --- |
| Seña hecha solo con la mano derecha | Se comparaban 22 dimensiones (la izquierda quieta contaminaba) | Solo las 11 dimensiones del guante derecho |
| Seña hecha solo con la izquierda | Igual | Solo las 11 del guante izquierdo |
| Palabra con movimiento (saludo, «adiós», «buenos días») | No se podía grabar | Trayectoria de 4 s resumida en 16 pasos clave |

## 1. Modo de mano (`handMode`)

Cada seña guarda `handMode: 'right' | 'left' | 'both'` y la distancia se calcula **solo** sobre las
dimensiones de esa mano:

| `handMode` | Dimensiones por fotograma | Seña estática | Seña dinámica |
| --- | --- | --- | --- |
| `right` | `0..10` (KLAPS-D) | 11 | 176 (16 pasos) |
| `left` | `11..21` (KLAPS-U) | 11 | 176 (16 pasos) |
| `both` | `0..21` | 22 | 352 (16 pasos) |

`handView(vector, handMode)` (`src/services/gesture/knnClassifier.js`) hace el recorte y funciona
igual con un fotograma (22) que con una trayectoria (352): recorre la secuencia paso a paso.

La distancia se divide por `√dimensiones`, así una seña de una mano y una bimanual son comparables
entre sí.

Además, si el guante que necesita una seña no está enviando datos, **esa seña no se evalúa**
(`availableHands` en `useGestureRecognition`): evita que una seña «de la izquierda» coincida por
casualidad con los ceros de un guante desconectado.

## 2. Señas estáticas

- Captura: **40 fotogramas a 20 Hz** (2 segundos).
- Clasificación: fotograma a fotograma contra las muestras estáticas.
- Emisión: confianza ≥ 75 % sostenida **600 ms**.
- Enfriamiento: 1,5 s.

## 3. Señas dinámicas (con movimiento)

- Captura: **80 fotogramas a 20 Hz** (4 segundos), el recorrido completo.
- `trajectory.js` recorta el silencio de los extremos (`trimMovement`) y submuestrea a
  **16 pasos clave** (`buildTrajectory`) → vector de 352 dimensiones.
- Reconocimiento: **ventana deslizante** de los últimos 80 fotogramas; en cada ciclo se recorta, se
  submuestrea y se compara contra las trayectorias grabadas.
- Emisión: confianza ≥ 75 % confirmada en dos ciclos (**100 ms**). No se pide quedarse quieto: el
  gesto se dispara al terminar el movimiento.
- Enfriamiento: 1,5 s (compartido con las estáticas).
- Si no hay movimiento, no hay trayectoria y el camino dinámico no interviene (la mano quieta se
  evalúa con las estáticas).

Cada captura añade **una repetición**. Repite la grabación 2-3 veces para que el gesto se reconozca
con distintas velocidades; se guardan como muestras de la misma seña (máximo 60 repeticiones).

## 4. Confianza con similitud absoluta

Antes, con una sola muestra, el reparto de votos daba 100 % aunque la postura no se pareciera.
Ahora:

```
confianza = margen entre etiquetas × similitud
margen    = peso del ganador / (peso del ganador + peso del segundo)
similitud = 1 − distancia / escala      (escala: 50 estáticas · 70 dinámicas)
```

El margen sustituye a la unanimidad sobre K: con solo dos señas entrenadas, dividir por 3 dejaba la
confianza en el 50 % y ninguna seña se reconocía nunca.

Con el umbral en 0,75, una postura debe quedar a menos de **12,5** unidades RMS de distancia
(estáticas) o **17,5** (dinámicas) para considerarse válida.

## 5. Formato de almacenamiento

La clave sigue siendo `klaps.training.v1` para no perder entrenamientos ya grabados.

```json
{
  "version": 2,
  "signs": [
    {
      "id": "sign-…",
      "label": "Hola",
      "createdAt": 1763000000000,
      "handMode": "right",
      "gestureType": "dynamic",
      "samples": [{ "vector": [352 números], "at": 1763000000000 }]
    }
  ]
}
```

- Los datos de la versión 1 se leen como `handMode: 'both'` y `gestureType: 'static'`.
- `normalizeTraining` acepta los alias `hand` y `type` en importaciones externas.
- `withSamples` valida el tamaño del vector según el tipo: una estática no admite 352 dimensiones.
- Las trayectorias antiguas de 10 pasos (220) se **remuestrean** a 16 (352) al cargar: no se pierde
  nada de lo ya grabado.
- Exportar e importar conserva mano y tipo; el importador fusiona sumando muestras.

## 6. Pantallas

### `/entrenamiento`

- Selectores **Mano de la seña** (Derecha / Izquierda / Ambas) y **Tipo de seña**
  (Estática / Dinámica).
- La captura usa 40 u 80 fotogramas según el tipo y avisa si no se detecta movimiento.
- La lista de señas muestra etiquetas de mano y tipo, y el número de muestras o de recorridos.
- «Probar el reconocimiento» indica si la candidata es estática (con su progreso de 600 ms) o
  dinámica (confirmando / confirmada).

### `/traducir`

- Usa las mismas reglas y muestra «Estabilización» o «Confirmación del recorrido» según el tipo.
- Solo evalúa las señas cuyos guantes están enviando datos.

### `/dispositivos`

- La tarjeta del guante ya no muestra la fila «Señal (RSSI)»: Web Bluetooth no expone el RSSI de un
  dispositivo conectado, así que solo ocupaba espacio. Quedan el estado de conexión, la batería
  publicada por el dispositivo y el estado de los sensores.

## 7. Cómo probarlo

1. `npm run dev` → `/entrenamiento`.
2. Conecta los guantes y guarda los UUID.
3. Graba «Hola» con **Derecha + Estática**: mantén la postura 1 s.
4. Graba «Adiós» con **Derecha + Dinámica**: mueve la mano durante los 2 s (la barra de captura
   avanza 40 pasos).
5. Pulsa **Iniciar prueba** y reproduce cada gesto: la estática exige 0,6 s de quietud; la dinámica
   sale al terminar el movimiento.
6. Repite una captura dinámica para sumar repeticiones y comprobar que el acierto mejora.

> La versión actual (etapa 8) usa 40/80 fotogramas, 16 pasos clave y ponderación por sensor en las
> dinámicas: ver `docs/etapa-8-prioridad-movimiento-y-reposo.md`.

## 8. Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/services/gesture/knnClassifier.js` | `handView`, `handDistance`, `classify`, `classifyTrajectory`, similitud absoluta, etiquetas |
| `src/services/gesture/trajectory.js` | **nuevo**: movimiento, recorte, submuestreo a 16 pasos |
| `src/services/gesture/trainingStore.js` | formato v2, validación por tipo, fusión por etiqueta + mano + tipo |
| `src/hooks/useGestureRecognition.js` | ventana deslizante, dos caminos de emisión, `availableHands` |
| `src/pages/Training/Training.jsx` | selectores de mano y tipo, captura 20/40, etiquetas en la lista |
| `src/pages/Translation/Translation.jsx` | reglas por tipo y guantes disponibles |
| `src/components/devices/DeviceCard.jsx` | sin fila de RSSI |
