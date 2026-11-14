/**
 * Entrenamiento de señas en localStorage.
 *
 * Formato:
 * {
 *   version: 1,
 *   signs: [
 *     { id, label, createdAt, samples: [{ vector: number[22], at }] }
 *   ]
 * }
 */

export const STORAGE_KEY = 'klaps.training.v1'
export const SAMPLES_PER_SIGN = 20
export const SAMPLE_INTERVAL_MS = 50 // 20 Hz
export const MAX_SAMPLES_PER_SIGN = 400

const EMPTY = { version: 1, signs: [] }

const isVector = (value) => Array.isArray(value) && value.length === 22 && value.every(Number.isFinite)

/** Valida y normaliza cualquier objeto que llegue de localStorage o de un JSON importado. */
export function normalizeTraining(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.signs)) return { ...EMPTY }

  const signs = raw.signs
    .filter((sign) => sign && typeof sign.label === 'string' && sign.label.trim())
    .map((sign, index) => ({
      id: typeof sign.id === 'string' && sign.id ? sign.id : `sign-${index}-${Date.now()}`,
      label: sign.label.trim().slice(0, 60),
      createdAt: Number.isFinite(sign.createdAt) ? sign.createdAt : Date.now(),
      samples: (Array.isArray(sign.samples) ? sign.samples : [])
        .filter((sample) => isVector(sample?.vector))
        .map((sample) => ({
          vector: sample.vector.map((value) => Number(value)),
          at: Number.isFinite(sample.at) ? sample.at : Date.now(),
        }))
        .slice(0, MAX_SAMPLES_PER_SIGN),
    }))
    .filter((sign) => sign.samples.length > 0)

  return { version: 1, signs }
}

export function loadTraining() {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    return normalizeTraining(JSON.parse(raw))
  } catch {
    return { ...EMPTY }
  }
}

export function saveTraining(training) {
  const safe = normalizeTraining(training)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
    } catch {
      // sin espacio o modo privado: se mantiene solo en memoria
    }
  }
  return safe
}

/** Añade una seña nueva o suma muestras a una existente con la misma etiqueta. */
export function withSamples(training, label, samples) {
  const clean = String(label ?? '').trim().slice(0, 60)
  if (!clean || !Array.isArray(samples) || samples.length === 0) return normalizeTraining(training)

  const base = normalizeTraining(training)
  const existing = base.signs.find((sign) => sign.label.toLowerCase() === clean.toLowerCase())

  if (existing) {
    existing.samples = [...existing.samples, ...samples].slice(-MAX_SAMPLES_PER_SIGN)
    return base
  }

  return {
    version: 1,
    signs: [
      ...base.signs,
      {
        id: `sign-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        label: clean,
        createdAt: Date.now(),
        samples: samples.slice(0, MAX_SAMPLES_PER_SIGN),
      },
    ],
  }
}

export function withoutSign(training, id) {
  const base = normalizeTraining(training)
  return { version: 1, signs: base.signs.filter((sign) => sign.id !== id) }
}

export function exportTraining(training) {
  return JSON.stringify(normalizeTraining(training), null, 2)
}

/**
 * Importa un JSON exportado. Si ya hay señas guardadas, se combinan sumando muestras.
 * @throws {Error} cuando el texto no es un entrenamiento válido
 */
export function importTraining(text, current = { ...EMPTY }) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }

  const incoming = normalizeTraining(parsed)
  if (incoming.signs.length === 0) {
    throw new Error('El JSON no contiene señas con muestras válidas.')
  }

  let merged = normalizeTraining(current)
  for (const sign of incoming.signs) {
    merged = withSamples(merged, sign.label, sign.samples)
  }

  return merged
}

/** Total de muestras de todas las señas. */
export function totalSamples(training) {
  return (training?.signs ?? []).reduce((sum, sign) => sum + (sign.samples?.length ?? 0), 0)
}
