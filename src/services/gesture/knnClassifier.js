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
 * Motor: 100% Flex (MPU6050 solo SOS)
 *
 * El MPU6050 (ax, ay, az, gx, gy, gz) tiene peso 0.0 absoluto en el reconocimiento
 * y entrenamiento de señas, para que girar o mover la muñeca en el aire no altere
 * la palabra reconocida.
 *
 * La comparación se evalúa EXCLUSIVAMENTE con el vector de los 4 sensores flex
 * activos calibrados (Pulgar, Índice, Medio y Meñique). El Anular tiene peso 0.
 */
export const STATIC_FLEX_WEIGHT = 1.4
export const STATIC_ACCEL_WEIGHT = 0.0
export const STATIC_GYRO_WEIGHT = 0.0

export const FLEX_WEIGHT = 1.4
export const ACCEL_WEIGHT = 0.0
export const GYRO_WEIGHT = 0.0

/** Tolerancia estricta por dedo individual (±12%). */
export const STRICT_FINGER_TOLERANCE = 12

/** Descarte inmediato: Si alguno de los 4 dedos se desvía más de 18%, descarta la seña. */
export const STRICT_MAX_FINGER_DIFF = 18

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
/** Confianza mínima estricta (≥ 80 %) para dar por buena una seña sin falsos positivos. */
export const CONFIDENCE_THRESHOLD = 0.8

/** Margen mínimo de separación relativo entre la seña ganadora y la segunda candidata. */
export const MIN_SEPARATION_MARGIN = 0.25

/**
 * Escala de distancia ajustada a 35 para discriminación estricta de dedos:
 * Si los 4 dedos coinciden dentro de ±8%, la similitud es > 80%.
 * Si algún dedo difiere más de 18%, la distancia es Infinity y la similitud es 0.
 */
export const STATIC_DISTANCE_SCALE = 35
export const DYNAMIC_DISTANCE_SCALE = 50

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
 * Pesos de un paso clave según la mano, el tipo de seña, la máscara de canales activos y el modo.
 *
 * Motor: 100% Flex (MPU6050 peso 0 absoluto):
 * Se anula el peso de los 6 ejes del MPU6050 (ax, ay, az, gx, gy, gz = peso 0),
 * evaluando al 100% únicamente los 4 dedos activos calibrados (pulgar, índice, medio, meñique).
 * El canal del dedo Anular (desconectado) se fuerza siempre a peso 0.
 */
export function weightView(handMode = 'both', type = 'static', activeMask = null, _flexOnly = true) {
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

  // El Anular desconectado (índice 3 derecha, índice 14 izquierda) siempre tiene peso 0
  perStep[3] = 0
  perStep[14] = 0

  // 100% Flex: El MPU6050 (ax, ay, az, gx, gy, gz) SIEMPRE tiene peso 0.0 absoluto en comparación de señas
  // Guante derecho IMU: dimensiones 5..10 en el fotograma de 22
  for (let i = 5; i <= 10; i++) {
    perStep[i] = 0
  }
  // Guante izquierdo IMU: dimensiones 16..21 en el fotograma de 22
  for (let i = 16; i <= 21; i++) {
    perStep[i] = 0
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
 * Distancia entre dos vectores evaluando EXCLUSIVAMENTE los 4 sensores flex calibrados.
 * El MPU6050 tiene peso 0.0 absoluto y el Anular tiene peso 0.0 absoluto.
 *
 * Criterios de discriminación y contraste estricto:
 * 1. Descarte inmediato: Si alguno de los 4 dedos activos (pulgar, índice, medio, meñique)
 *    se desvía más de 18% respecto a la seña entrenada, se descarta la coincidencia de inmediato
 *    (retorna Infinity). Esto previene que «Hola», «Bien» y «Gracias» se confundan entre sí.
 * 2. Curva de contraste: Tolerancia estricta de ±12% por dedo. Si la diferencia excede 12%,
 *    se penaliza cuadráticamente para que una seña solo coincida si cada uno de los 4 dedos
 *    está en la posición correcta.
 */
export function handDistance(
  a,
  b,
  handMode = 'both',
  type = 'static',
  activeMask = null,
  flexOnly = true,
) {
  const viewA = handView(a, handMode)
  const viewB = handView(b, handMode)
  if (viewA.length === 0 || viewB.length === 0) return Infinity

  const weights = weightView(handMode, type, activeMask, flexOnly)
  let sum = 0
  let total = 0

  for (let index = 0; index < viewA.length; index += 1) {
    const weight = weights[index % weights.length]
    // Ignorar por completo canales inactivos / muertos o ejes MPU6050 (peso 0)
    if (weight <= 0) continue

    const diff = Math.abs(viewA[index] - viewB[index])

    // REGLA CRÍTICA 1: Si alguno de los 4 dedos activos se desvía más de 18%,
    // descarta la coincidencia inmediatamente.
    if (diff > STRICT_MAX_FINGER_DIFF) {
      return Infinity
    }

    // REGLA CRÍTICA 2: Curva de contraste estricta con tolerancia de ±12%
    const contrastDiff =
      diff <= STRICT_FINGER_TOLERANCE
        ? diff
        : diff + (diff - STRICT_FINGER_TOLERANCE) * 2.2

    sum += weight * contrastDiff * contrastDiff
    total += weight
  }

  if (total === 0) return Infinity

  const rms = Math.sqrt(sum / total)
  return rms
}

/** Vecinos más cercanos y confianza ponderada por cercanía y margen de separación. */
function rank(vector, samples, k, scale, type = 'static', activeMask = null, flexOnly = true) {
  if (!Array.isArray(vector) || vector.length === 0) return null
  if (!Array.isArray(samples) || samples.length === 0) return null

  const distances = samples
    .filter((sample) => Array.isArray(sample?.vector) && sample.vector.length === vector.length)
    .map((sample) => ({
      label: sample.label,
      handMode: normalizeHandMode(sample.handMode),
      distance: handDistance(vector, sample.vector, sample.handMode, type, activeMask, flexOnly),
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
 * @param {boolean} [flexOnly] si es true, evalúa solo flex (100% flex, MPU6050 peso 0)
 */
export function classify(
  vector,
  samples,
  k = K,
  scale = STATIC_DISTANCE_SCALE,
  activeMask = null,
  flexOnly = true,
) {
  const statics = (samples ?? []).filter((sample) => normalizeGestureType(sample.type) === 'static')
  return rank(vector, statics, k, scale, 'static', activeMask, flexOnly)
}

/**
 * Clasifica una trayectoria (señas dinámicas).
 *
 * @param {number[]} trajectory vector de 352 dimensiones (16 pasos × 22)
 * @param {{label: string, vector: number[], handMode?: string, type?: string}[]} samples
 * @param {number} k número de vecinos
 * @param {number} scale escala de distancia
 * @param {boolean[]} [activeMask] máscara de canales flex válidos
 * @param {boolean} [flexOnly] si es true, evalúa solo flex (100% flex, MPU6050 peso 0)
 */
export function classifyTrajectory(
  trajectory,
  samples,
  k = K,
  scale = DYNAMIC_DISTANCE_SCALE,
  activeMask = null,
  flexOnly = true,
) {
  const dynamics = (samples ?? []).filter((sample) => sample.type === 'dynamic')
  return rank(trajectory, dynamics, k, scale, 'dynamic', activeMask, flexOnly)
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
