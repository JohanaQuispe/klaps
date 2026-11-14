/**
 * Entrenamiento de señas en localStorage.
 *
 * Formato (versión 2):
 * {
 *   version: 2,
 *   signs: [
 *     {
 *       id, label, createdAt,
 *       handMode: 'right' | 'left' | 'both',
 *       gestureType: 'static' | 'dynamic',
 *       samples: [{ vector: number[22] | number[352], at }]
 *     }
 *   ]
 * }
 *
 * La clave de almacenamiento sigue siendo `klaps.training.v1` para no perder
 * los entrenamientos ya grabados: los datos viejos se leen como estáticas
 * bimanuales y se guardan actualizados la próxima vez.
 */

import {
  DYNAMIC_FEATURE_SIZE,
  FEATURE_SIZE,
  normalizeGestureType,
  normalizeHandMode,
} from './knnClassifier.js'
import { resampleTrajectory } from './trajectory.js'

export const STORAGE_KEY = 'klaps.training.v1'
export const SAMPLE_INTERVAL_MS = 50 // 20 Hz
/** Seña estática: 40 fotogramas en 2 segundos (captura las micro-variaciones). */
export const STATIC_SAMPLES = 40
/** Seña dinámica: 80 fotogramas en 4 segundos (palabras largas sin cortes). */
export const DYNAMIC_SAMPLES = 80
export const MAX_SAMPLES_PER_SIGN = 400
export const MAX_DYNAMIC_SAMPLES_PER_SIGN = 60

const EMPTY = { version: 2, signs: [] }

/** Fotogramas que hay que capturar según el tipo de seña. */
export const samplesForType = (gestureType) =>
  normalizeGestureType(gestureType) === 'dynamic' ? DYNAMIC_SAMPLES : STATIC_SAMPLES

const isStaticVector = (value) =>
  Array.isArray(value) && value.length === FEATURE_SIZE && value.every(Number.isFinite)

/** Trayectoria de cualquier longitud válida (22 × pasos), ya remuestreada a 16. */
const normalizeDynamicVector = (value) => {
  if (!Array.isArray(value) || value.length === 0 || value.length % FEATURE_SIZE !== 0) return null
  if (!value.every(Number.isFinite)) return null
  const resampled = resampleTrajectory(value, DYNAMIC_FEATURE_SIZE / FEATURE_SIZE)
  return resampled?.every(Number.isFinite) ? resampled : null
}

/** Valida y normaliza cualquier objeto que llegue de localStorage o de un JSON importado. */
export function normalizeTraining(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.signs)) return { ...EMPTY }

  const signs = raw.signs
    .filter((sign) => sign && typeof sign.label === 'string' && sign.label.trim())
    .map((sign, index) => {
      // `type` es el nombre usado en exportaciones externas: se acepta como alias.
      const gestureType = normalizeGestureType(sign.gestureType ?? sign.type)
      const handMode = normalizeHandMode(sign.handMode ?? sign.hand)
      const limit =
        gestureType === 'dynamic' ? MAX_DYNAMIC_SAMPLES_PER_SIGN : MAX_SAMPLES_PER_SIGN

      return {
        id: typeof sign.id === 'string' && sign.id ? sign.id : `sign-${index}-${Date.now()}`,
        label: sign.label.trim().slice(0, 60),
        createdAt: Number.isFinite(sign.createdAt) ? sign.createdAt : Date.now(),
        handMode,
        gestureType,
        samples: (Array.isArray(sign.samples) ? sign.samples : [])
          .map((sample) => {
            const vector =
              gestureType === 'dynamic'
                ? normalizeDynamicVector(sample?.vector)
                : isStaticVector(sample?.vector)
                  ? sample.vector.map((value) => Number(value))
                  : null
            return vector ? { vector, at: Number.isFinite(sample.at) ? sample.at : Date.now() } : null
          })
          .filter(Boolean)
          .slice(0, limit),
      }
    })
    .filter((sign) => sign.samples.length > 0)

  return { version: 2, signs }
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

/** La misma etiqueta con distinto modo o tipo son señas distintas. */
const sameSign = (sign, label, handMode, gestureType) =>
  sign.label.toLowerCase() === label.toLowerCase() &&
  normalizeHandMode(sign.handMode) === handMode &&
  normalizeGestureType(sign.gestureType) === gestureType

/**
 * Añade una seña nueva o suma muestras a una existente con la misma etiqueta,
 * mano y tipo.
 */
export function withSamples(
  training,
  label,
  samples,
  { handMode = 'both', gestureType = 'static' } = {},
) {
  const clean = String(label ?? '').trim().slice(0, 60)
  if (!clean || !Array.isArray(samples) || samples.length === 0) return normalizeTraining(training)

  const mode = normalizeHandMode(handMode)
  const type = normalizeGestureType(gestureType)
  const valid = samples
    .map((sample) => {
      const vector =
        type === 'dynamic'
          ? normalizeDynamicVector(sample?.vector)
          : isStaticVector(sample?.vector)
            ? sample.vector.map((value) => Number(value))
            : null
      return vector ? { vector, at: Number.isFinite(sample.at) ? sample.at : Date.now() } : null
    })
    .filter(Boolean)
  if (valid.length === 0) return normalizeTraining(training)

  const base = normalizeTraining(training)
  const existing = base.signs.find((sign) => sameSign(sign, clean, mode, type))
  const limit = type === 'dynamic' ? MAX_DYNAMIC_SAMPLES_PER_SIGN : MAX_SAMPLES_PER_SIGN

  if (existing) {
    existing.samples = [...existing.samples, ...valid].slice(-limit)
    return base
  }

  return {
    version: 2,
    signs: [
      ...base.signs,
      {
        id: `sign-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        label: clean,
        createdAt: Date.now(),
        handMode: mode,
        gestureType: type,
        samples: valid.slice(0, limit),
      },
    ],
  }
}

export function withoutSign(training, id) {
  const base = normalizeTraining(training)
  return { version: 2, signs: base.signs.filter((sign) => sign.id !== id) }
}

export function exportTraining(training) {
  return JSON.stringify(normalizeTraining(training), null, 2)
}

/**
 * Importa un JSON exportado. Si ya hay señas guardadas, se combinan sumando
 * muestras (respetando mano y tipo de cada una).
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
    merged = withSamples(merged, sign.label, sign.samples, {
      handMode: sign.handMode,
      gestureType: sign.gestureType,
    })
  }

  return merged
}

/** Total de muestras de todas las señas. */
export function totalSamples(training) {
  return (training?.signs ?? []).reduce((sum, sign) => sum + (sign.samples?.length ?? 0), 0)
}
