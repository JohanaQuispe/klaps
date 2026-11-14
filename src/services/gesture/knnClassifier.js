/**
 * Clasificador KNN (K-Nearest Neighbors) con distancia euclidiana.
 * JavaScript puro: sin dependencias, se ejecuta en el navegador.
 *
 * Los vectores llegan ya normalizados a 0-100 en cada dimensión
 * (ver services/bluetooth/sensorFrame.js), así que ningún eje domina.
 *
 * Dos tipos de seña:
 *   · estática → un vector de 22 dimensiones (postura fija).
 *   · dinámica → 10 pasos clave × 22 dimensiones = 220 (recorrido en el tiempo).
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
export const DYNAMIC_STEPS = 10
/** Dimensiones de una trayectoria completa (10 × 22). */
export const DYNAMIC_FEATURE_SIZE = FEATURE_SIZE * DYNAMIC_STEPS

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
 * Funciona igual con un fotograma (22) o con una trayectoria (220): recorre
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
 * Distancia entre dos vectores comparando solo las dimensiones de la mano.
 * Se divide por la raíz del número de dimensiones para que una seña de una
 * mano (11 por paso) y una bimanual (22 por paso) sean comparables.
 */
export function handDistance(a, b, handMode = 'both') {
  const viewA = handView(a, handMode)
  const viewB = handView(b, handMode)
  if (viewA.length === 0 || viewB.length === 0) return Infinity
  return euclideanDistance(viewA, viewB) / Math.sqrt(viewA.length)
}

/** Vecinos más cercanos y confianza ponderada por cercanía. */
function rank(vector, samples, k, scale) {
  if (!Array.isArray(vector) || vector.length === 0) return null
  if (!Array.isArray(samples) || samples.length === 0) return null

  const distances = samples
    .filter((sample) => Array.isArray(sample?.vector) && sample.vector.length === vector.length)
    .map((sample) => ({
      label: sample.label,
      handMode: normalizeHandMode(sample.handMode),
      distance: handDistance(vector, sample.vector, sample.handMode),
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

  let bestLabel = neighbors[0].label
  let bestWeight = -1
  for (const [label, weight] of weights.entries()) {
    if (weight > bestWeight) {
      bestLabel = label
      bestWeight = weight
    }
  }

  const votes = neighbors.filter((neighbor) => neighbor.label === bestLabel).length
  const winner = neighbors.find((neighbor) => neighbor.label === bestLabel)
  // Reparto de peso entre vecinos, ajustado por unanimidad (3/3 sube, 1/3 baja).
  const voteConfidence = (bestWeight / total) * (votes / neighbors.length)
  const proximity = similarityFromDistance(neighbors[0].distance, scale)

  return {
    label: bestLabel,
    // La cercanía real importa: una seña parecida al 90 % no es lo mismo que "la menos mala".
    confidence: voteConfidence * proximity,
    voteConfidence,
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
  return rank(vector, statics, k, scale)
}

/**
 * Clasifica una trayectoria (señas dinámicas).
 *
 * @param {number[]} trajectory vector de 220 dimensiones (10 pasos × 22)
 * @param {{label: string, vector: number[], handMode?: string, type?: string}[]} samples
 * @param {number} k número de vecinos
 */
export function classifyTrajectory(trajectory, samples, k = K, scale = DYNAMIC_DISTANCE_SCALE) {
  const dynamics = (samples ?? []).filter((sample) => sample.type === 'dynamic')
  return rank(trajectory, dynamics, k, scale)
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
