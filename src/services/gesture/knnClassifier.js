/**
 * Clasificador KNN (K-Nearest Neighbors) con distancia euclidiana.
 * JavaScript puro: sin dependencias, se ejecuta en el navegador.
 *
 * Los vectores llegan ya normalizados a 0-100 en sus 22 dimensiones
 * (ver services/bluetooth/sensorFrame.js), así que ningún eje domina el cálculo.
 */

export const FEATURE_SIZE = 22
export const K = 3
/** Confianza mínima para dar por buena una seña. */
export const CONFIDENCE_THRESHOLD = 0.75

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
 * Clasifica un vector contra las muestras entrenadas.
 *
 * @param {number[]} vector vector de 22 dimensiones
 * @param {{label: string, vector: number[]}[]} samples muestras de todas las señas
 * @param {number} k número de vecinos
 * @returns {{label: string, confidence: number, distance: number, neighbors: {label: string, distance: number}[]}|null}
 */
export function classify(vector, samples, k = K) {
  if (!Array.isArray(vector) || vector.length === 0) return null
  if (!Array.isArray(samples) || samples.length === 0) return null

  const distances = samples
    .filter((sample) => Array.isArray(sample?.vector) && sample.vector.length === vector.length)
    .map((sample) => ({ label: sample.label, distance: euclideanDistance(vector, sample.vector) }))

  if (distances.length === 0) return null

  distances.sort((a, b) => a.distance - b.distance)
  const neighbors = distances.slice(0, Math.max(1, Math.min(k, distances.length)))

  // Voto ponderado por cercanía: un vecino muy próximo pesa más que uno lejano.
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

  return {
    label: bestLabel,
    // Reparto de peso entre vecinos, ajustado por unanimidad (3/3 sube, 1/3 baja).
    confidence: (bestWeight / total) * (votes / neighbors.length),
    distance: neighbors[0].distance,
    neighbors,
    votes,
  }
}

/** Convierte el entrenamiento guardado en la lista plana de muestras. */
export function flattenSamples(signs = []) {
  return signs.flatMap((sign) =>
    (sign.samples ?? []).map((sample) => ({ label: sign.label, vector: sample.vector })),
  )
}
