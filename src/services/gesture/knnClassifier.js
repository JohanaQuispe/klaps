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
 * Ponderación por sensor dentro de un fotograma (solo señas dinámicas).
 * Cada guante aporta: flex0..4, ax, ay, az, gx, gy, gz.
 *   · flex 0,7 → la postura de los dedos no debe dominar una palabra con movimiento.
 *   · aceleración 2,5 → dirección e inclinación de la mano.
 *   · giroscopio 3,2 → el giro de la muñeca (Ñ, doble letra, cambios de sentido).
 * En las estáticas todos los pesos valen 1.
 */
export const FLEX_WEIGHT = 0.7
export const ACCEL_WEIGHT = 2.5
export const GYRO_WEIGHT = 3.2

const ONE_HAND_WEIGHTS = [
  FLEX_WEIGHT, FLEX_WEIGHT, FLEX_WEIGHT, FLEX_WEIGHT, FLEX_WEIGHT,
  ACCEL_WEIGHT, ACCEL_WEIGHT, ACCEL_WEIGHT,
  GYRO_WEIGHT, GYRO_WEIGHT, GYRO_WEIGHT,
]

const FRAME_WEIGHTS = {
  static: Array.from({ length: FEATURE_SIZE }, () => 1),
  dynamic: [...ONE_HAND_WEIGHTS, ...ONE_HAND_WEIGHTS],
}

export const K = 3
/** Confianza mínima para dar por buena una seña. */
export const CONFIDENCE_THRESHOLD = 0.75

/**
 * Distancia (RMS por dimensión, sobre valores 0-100) a la que la similitud ya
 * es cero. Es el freno absoluto: sin él, con una sola muestra entrenada, el
 * reparto de votos daría 100 % aunque la postura no se pareciera en nada.
 * Las señas con movimiento varían más entre repeticiones, por eso su escala
 * es mayor. Si el reconocimiento resulta demasiado estricto, se suben.
 */
export const STATIC_DISTANCE_SCALE = 50
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
 * Pesos de un paso clave según la mano y el tipo de seña.
 * Se reutilizan por paso: una trayectoria repite este bloque.
 */
const weightCache = new Map()

export function weightView(handMode = 'both', type = 'static') {
  const mode = normalizeHandMode(handMode)
  const kind = normalizeGestureType(type)
  const key = `${kind}:${mode}`
  const cached = weightCache.get(key)
  if (cached) return cached

  const perStep = FRAME_WEIGHTS[kind]
  const weights = []
  for (const [start, end] of HAND_RANGES[mode]) {
    weights.push(...perStep.slice(start, end))
  }

  weightCache.set(key, weights)
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
 * En señas dinámicas el IMU pesa ×2,5 (giroscopio ×3,2) y los flex ×0,7: dos
 * señas con los mismos dedos pero distinto movimiento (N vs Ñ) se separan.
 */
export function handDistance(a, b, handMode = 'both', type = 'static') {
  const viewA = handView(a, handMode)
  const viewB = handView(b, handMode)
  if (viewA.length === 0 || viewB.length === 0) return Infinity

  const weights = weightView(handMode, type)
  let sum = 0
  let total = 0
  for (let index = 0; index < viewA.length; index += 1) {
    const weight = weights[index % weights.length]
    const diff = viewA[index] - viewB[index]
    sum += weight * diff * diff
    total += weight
  }

  return Math.sqrt(sum / Math.max(total, 1e-9))
}

/** Vecinos más cercanos y confianza ponderada por cercanía. */
function rank(vector, samples, k, scale, type = 'static') {
  if (!Array.isArray(vector) || vector.length === 0) return null
  if (!Array.isArray(samples) || samples.length === 0) return null

  const distances = samples
    .filter((sample) => Array.isArray(sample?.vector) && sample.vector.length === vector.length)
    .map((sample) => ({
      label: sample.label,
      handMode: normalizeHandMode(sample.handMode),
      distance: handDistance(vector, sample.vector, sample.handMode, type),
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
  const runnerUpWeight = byWeight[1]?.[1] ?? 0

  const votes = neighbors.filter((neighbor) => neighbor.label === bestLabel).length
  const winner = neighbors.find((neighbor) => neighbor.label === bestLabel)
  /**
   * Margen entre la etiqueta ganadora y la segunda: 1 = no hay rival cercano.
   * Antes se multiplicaba por la unanimidad sobre K, pero con dos señas
   * entrenadas nunca se pasaba del 50 % y el reconocimiento era imposible.
   */
  const labelMargin = bestWeight / (bestWeight + runnerUpWeight || 1)
  const proximity = similarityFromDistance(neighbors[0].distance, scale)

  return {
    label: bestLabel,
    // Margen entre etiquetas × cercanía real: "la menos mala" no basta.
    confidence: labelMargin * proximity,
    labelMargin,
    proximity,
    distance: neighbors[0].distance,
    handMode: winner?.handMode ?? 'both',
    neighbors,
    votes,
  }
}

/**
 * Clasifica un fotograma (señas estáticas).
 *
 * @param {number[]} vector vector de 22 dimensiones
 * @param {{label: string, vector: number[], handMode?: string, type?: string}[]} samples
 * @param {number} k número de vecinos
 */
export function classify(vector, samples, k = K, scale = STATIC_DISTANCE_SCALE) {
  const statics = (samples ?? []).filter((sample) => normalizeGestureType(sample.type) === 'static')
  return rank(vector, statics, k, scale, 'static')
}

/**
 * Clasifica una trayectoria (señas dinámicas).
 *
 * @param {number[]} trajectory vector de 352 dimensiones (16 pasos × 22)
 * @param {{label: string, vector: number[], handMode?: string, type?: string}[]} samples
 * @param {number} k número de vecinos
 */
export function classifyTrajectory(trajectory, samples, k = K, scale = DYNAMIC_DISTANCE_SCALE) {
  const dynamics = (samples ?? []).filter((sample) => sample.type === 'dynamic')
  return rank(trajectory, dynamics, k, scale, 'dynamic')
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
