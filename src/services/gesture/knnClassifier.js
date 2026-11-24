/**
 * Clasificador KNN (K-Nearest Neighbors) con distancia euclidiana.
 * JavaScript puro: sin dependencias, se ejecuta en el navegador.
 *
 * Los vectores llegan ya normalizados a 0-100 en cada dimensión
 * (ver services/bluetooth/sensorFrame.js), así que ningún eje domina.
 *
 * Dos tipos de seña:
 *   · estática → un vector de 22 dimensiones (postura fija).
 *   · dinámica → 16 pasos clave × 22 dimensiones = 352 (recorrido en el tiempo).
 *
 * En las dinámicas el movimiento pesa más que la postura: el IMU (sobre todo el
 * giroscopio) va ponderado por encima de los flex, para distinguir letras que
 * se hacen con los mismos dedos y distinto movimiento (N vs Ñ).
 *
 * Y tres vistas por mano:
 *   · 'right' → solo dimensiones 0-10 de cada paso (guante KLAPS-D).
 *   · 'left'  → solo dimensiones 11-21 de cada paso (guante KLAPS-U).
 *   · 'both'  → las 22 dimensiones de cada paso.
 */

/** Dimensiones de un fotograma: 11 del guante derecho + 11 del izquierdo. */
export const FEATURE_SIZE = 22
/** Dimensiones de una sola mano. */
export const HAND_SIZE = 11
/** Pasos clave que resumen una seña dinámica. */
export const DYNAMIC_STEPS = 16
/** Dimensiones de una trayectoria completa (16 × 22). */
export const DYNAMIC_FEATURE_SIZE = FEATURE_SIZE * DYNAMIC_STEPS

/**
 * Ponderación por sensor dentro de un fotograma.
 * Cada guante aporta: flex0..4, ax, ay, az, gx, gy, gz.
 *
 * En señas estáticas:
 *   · flex 1,4 → evalúa cada dedo por separado con gran peso.
 *   · aceleración 1,8 → inclinación de muñeca (pitch/roll/az), clave para
 *     diferenciar señas con dedos similares pero distinta orientación (ej. Hola vs Bien).
 *   · giroscopio 0,2 → peso mínimo para que el ruido de reposo no diluya la postura.
 *
 * En señas dinámicas:
 *   · flex 0,7 → la postura de los dedos no debe dominar una palabra con movimiento.
 *   · aceleración 2,5 → dirección e inclinación de la mano.
 *   · giroscopio 3,2 → el giro de la muñeca (Ñ, doble letra, cambios de sentido).
 */
export const STATIC_FLEX_WEIGHT = 1.4
export const STATIC_ACCEL_WEIGHT = 1.8
export const STATIC_GYRO_WEIGHT = 0.2

export const FLEX_WEIGHT = 0.7
export const ACCEL_WEIGHT = 2.5
export const GYRO_WEIGHT = 3.2

const STATIC_ONE_HAND_WEIGHTS = [
  STATIC_FLEX_WEIGHT, STATIC_FLEX_WEIGHT, STATIC_FLEX_WEIGHT, STATIC_FLEX_WEIGHT, STATIC_FLEX_WEIGHT,
  STATIC_ACCEL_WEIGHT, STATIC_ACCEL_WEIGHT, STATIC_ACCEL_WEIGHT,
  STATIC_GYRO_WEIGHT, STATIC_GYRO_WEIGHT, STATIC_GYRO_WEIGHT,
]

const ONE_HAND_WEIGHTS = [
  FLEX_WEIGHT, FLEX_WEIGHT, FLEX_WEIGHT, FLEX_WEIGHT, FLEX_WEIGHT,
  ACCEL_WEIGHT, ACCEL_WEIGHT, ACCEL_WEIGHT,
  GYRO_WEIGHT, GYRO_WEIGHT, GYRO_WEIGHT,
]

const FRAME_WEIGHTS = {
  static: [...STATIC_ONE_HAND_WEIGHTS, ...STATIC_ONE_HAND_WEIGHTS],
  dynamic: [...ONE_HAND_WEIGHTS, ...ONE_HAND_WEIGHTS],
}

export const K = 3
/** Confianza mínima estricta (≥ 85 %) para dar por buena una seña sin falsos positivos. */
export const CONFIDENCE_THRESHOLD = 0.85

/** Margen mínimo de separación relativo entre la seña ganadora y la segunda candidata. */
export const MIN_SEPARATION_MARGIN = 0.25

/**
 * Distancia (RMS por dimensión, sobre valores 0-100) a la que la similitud ya
 * es cero. Escala ajustada a 45 para mayor rigor anatómico en señas estáticas.
 */
export const STATIC_DISTANCE_SCALE = 45
export const DYNAMIC_DISTANCE_SCALE = 70

/** Convierte distancia en similitud 0-1 (1 = idéntico). */
export function similarityFromDistance(distance, scale = STATIC_DISTANCE_SCALE) {
  if (!Number.isFinite(distance) || scale <= 0) return 0
  return Math.min(1, Math.max(0, 1 - distance / scale))
}

export const HAND_MODES = ['right', 'left', 'both']
export const GESTURE_TYPES = ['static', 'dynamic']

export const HAND_MODE_LABELS = {
  right: 'Solo derecha',
  left: 'Solo izquierda',
  both: 'Bimanual',
}

export const GESTURE_TYPE_LABELS = {
  static: 'Estática',
  dynamic: 'Dinámica',
}

/** Rangos de dimensión dentro de un fotograma para cada modo de mano. */
const HAND_RANGES = {
  right: [[0, HAND_SIZE]],
  left: [[HAND_SIZE, FEATURE_SIZE]],
  both: [[0, FEATURE_SIZE]],
}

export const isHandMode = (value) => HAND_MODES.includes(value)
export const isGestureType = (value) => GESTURE_TYPES.includes(value)

/** Cualquier valor desconocido (o ausente) cae a bimanual / estática. */
export const normalizeHandMode = (value) => (isHandMode(value) ? value : 'both')
export const normalizeGestureType = (value) => (isGestureType(value) ? value : 'static')

/** Dimensiones comparadas por paso según la mano: 11 o 22. */
export function handDims(handMode) {
  return normalizeHandMode(handMode) === 'both' ? FEATURE_SIZE : HAND_SIZE
}

/**
 * Extrae las dimensiones de la mano indicada.
 * Funciona igual con un fotograma (22) o con una trayectoria (352): recorre
 * la secuencia paso a paso y se queda con las dimensiones de esa mano.
 */
export function handView(vector, handMode = 'both') {
  if (!Array.isArray(vector)) return []
  const ranges = HAND_RANGES[normalizeHandMode(handMode)]
  const steps = Math.max(1, Math.round(vector.length / FEATURE_SIZE))
  const view = []

  for (let step = 0; step < steps; step += 1) {
    const base = step * FEATURE_SIZE
    for (const [start, end] of ranges) {
      for (let index = start; index < end && base + index < vector.length; index += 1) {
        view.push(vector[base + index])
      }
    }
  }

  return view
}

/**
 * Pesos de un paso clave según la mano, el tipo de seña y la máscara de canales activos.
 * Si un canal flex está marcado como inactivo o con rango insuficiente en la calibración,
 * se le asigna peso 0 para compensar el hardware por software.
 */
export function weightView(handMode = 'both', type = 'static', activeMask = null) {
  const mode = normalizeHandMode(handMode)
  const kind = normalizeGestureType(type)
  const perStep = [...FRAME_WEIGHTS[kind]]

  // Si hay máscara de canales flex (10 booleanos: 0..4 derecha, 5..9 izquierda)
  if (Array.isArray(activeMask)) {
    // Guante derecho (flex: índices globales 0..4)
    for (let i = 0; i < 5; i++) {
      if (activeMask[i] === false) {
        perStep[i] = 0
      }
    }
    // Guante izquierdo (flex: índices globales 11..15)
    for (let i = 0; i < 5; i++) {
      if (activeMask[5 + i] === false) {
        perStep[11 + i] = 0
      }
    }
  }

  const weights = []
  for (const [start, end] of HAND_RANGES[mode]) {
    weights.push(...perStep.slice(start, end))
  }

  return weights
}

/** Distancia euclidiana entre dos vectores de la misma longitud. */
export function euclideanDistance(a, b) {
  let sum = 0
  const length = Math.min(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const diff = a[index] - b[index]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

/**
 * Distancia entre dos vectores comparando solo las dimensiones de la mano y
 * ponderando cada sensor (RMS ponderada: queda en la misma escala 0-100 que
 * la distancia normal, así los umbrales siguen valiendo).
 *
 * En señas estáticas:
 *   · flex 1,4 por dedo activo: evalúa dedos individuales. Canales muertos reciben peso 0.
 *   · ax, ay, az 1,8: inclinación y orientación de muñeca (pitch y roll).
 *   · penalización por discrepancia aislada: si un sensor activo discrepa (> 40 %),
 *     no se enmascara en el promedio global.
 *
 * En señas dinámicas:
 *   · IMU pesa ×2,5 (giroscopio ×3,2) y los flex ×0,7.
 */
export function handDistance(a, b, handMode = 'both', type = 'static', activeMask = null) {
  const viewA = handView(a, handMode)
  const viewB = handView(b, handMode)
  if (viewA.length === 0 || viewB.length === 0) return Infinity

  const weights = weightView(handMode, type, activeMask)
  let sum = 0
  let total = 0
  let maxSingleDiff = 0

  for (let index = 0; index < viewA.length; index += 1) {
    const weight = weights[index % weights.length]
    // Ignorar por completo canales inactivos / muertos (peso 0)
    if (weight <= 0) continue

    const diff = Math.abs(viewA[index] - viewB[index])
    sum += weight * diff * diff
    total += weight

    // En señas estáticas, verificar si algún sensor activo discrepa
    if (diff > maxSingleDiff) {
      maxSingleDiff = diff
    }
  }

  const rms = Math.sqrt(sum / Math.max(total, 1e-9))

  // Penalización si algún sensor activo o ángulo de inclinación discrepa fuertemente (> 40 %)
  if (type === 'static' && maxSingleDiff > 40) {
    const excess = maxSingleDiff - 40
    return rms + excess * 0.35
  }

  return rms
}

/** Vecinos más cercanos y confianza ponderada por cercanía y margen de separación. */
function rank(vector, samples, k, scale, type = 'static', activeMask = null) {
  if (!Array.isArray(vector) || vector.length === 0) return null
  if (!Array.isArray(samples) || samples.length === 0) return null

  const distances = samples
    .filter((sample) => Array.isArray(sample?.vector) && sample.vector.length === vector.length)
    .map((sample) => ({
      label: sample.label,
      handMode: normalizeHandMode(sample.handMode),
      distance: handDistance(vector, sample.vector, sample.handMode, type, activeMask),
    }))

  if (distances.length === 0) return null

  distances.sort((a, b) => a.distance - b.distance)
  const neighbors = distances.slice(0, Math.max(1, Math.min(k, distances.length)))

  const weights = new Map()
  let total = 0
  for (const neighbor of neighbors) {
    const weight = 1 / (neighbor.distance + 1e-6)
    weights.set(neighbor.label, (weights.get(neighbor.label) ?? 0) + weight)
    total += weight
  }

  const byWeight = [...weights.entries()].sort((a, b) => b[1] - a[1])
  const bestLabel = byWeight[0][0]
  const bestWeight = byWeight[0][1]
  const runnerUp = byWeight[1]
  const runnerUpLabel = runnerUp ? runnerUp[0] : null
  const runnerUpWeight = runnerUp ? runnerUp[1] : 0

  const votes = neighbors.filter((neighbor) => neighbor.label === bestLabel).length
  const winner = neighbors.find((neighbor) => neighbor.label === bestLabel)

  // Margen de reparto entre ganador y segundo candidato
  const labelMargin = bestWeight / (bestWeight + runnerUpWeight || 1)
  const separation = runnerUpWeight > 0 ? (bestWeight - runnerUpWeight) / bestWeight : 1

  // Si dos señas distintas compiten con puntuación similar, se marca como gesto ambiguo
  const isAmbiguous = runnerUpWeight > 0 && separation < MIN_SEPARATION_MARGIN
  const separationFactor = isAmbiguous
    ? Math.max(0, separation / MIN_SEPARATION_MARGIN) * 0.4
    : 1

  const proximity = similarityFromDistance(neighbors[0].distance, scale)
  const confidence = labelMargin * proximity * separationFactor

  return {
    label: bestLabel,
    confidence,
    labelMargin,
    separation,
    proximity,
    distance: neighbors[0].distance,
    handMode: winner?.handMode ?? 'both',
    neighbors,
    votes,
    isAmbiguous,
    ambiguousLabels: isAmbiguous && runnerUpLabel ? [bestLabel, runnerUpLabel] : null,
  }
}

/**
 * Clasifica un fotograma (señas estáticas).
 *
 * @param {number[]} vector vector de 22 dimensiones
 * @param {{label: string, vector: number[], handMode?: string, type?: string}[]} samples
 * @param {number} k número de vecinos
 * @param {number} scale escala de distancia
 * @param {boolean[]} [activeMask] máscara de canales flex válidos
 */
export function classify(vector, samples, k = K, scale = STATIC_DISTANCE_SCALE, activeMask = null) {
  const statics = (samples ?? []).filter((sample) => normalizeGestureType(sample.type) === 'static')
  return rank(vector, statics, k, scale, 'static', activeMask)
}

/**
 * Clasifica una trayectoria (señas dinámicas).
 *
 * @param {number[]} trajectory vector de 352 dimensiones (16 pasos × 22)
 * @param {{label: string, vector: number[], handMode?: string, type?: string}[]} samples
 * @param {number} k número de vecinos
 * @param {number} scale escala de distancia
 * @param {boolean[]} [activeMask] máscara de canales flex válidos
 */
export function classifyTrajectory(trajectory, samples, k = K, scale = DYNAMIC_DISTANCE_SCALE, activeMask = null) {
  const dynamics = (samples ?? []).filter((sample) => sample.type === 'dynamic')
  return rank(trajectory, dynamics, k, scale, 'dynamic', activeMask)
}

/** Convierte el entrenamiento guardado en la lista plana de muestras. */
export function flattenSamples(signs = []) {
  return signs.flatMap((sign) => {
    const handMode = normalizeHandMode(sign.handMode)
    const type = normalizeGestureType(sign.gestureType)
    return (sign.samples ?? []).map((sample) => ({
      label: sign.label,
      vector: sample.vector,
      handMode,
      type,
    }))
  })
}

/** Número de señas de cada tipo y modo, para resúmenes en pantalla. */
export function summarizeSigns(signs = []) {
  return signs.reduce(
    (summary, sign) => {
      summary.total += 1
      summary[normalizeGestureType(sign.gestureType)] += 1
      return summary
    },
    { total: 0, static: 0, dynamic: 0 },
  )
}
