/**
 * Trayectorias para señas dinámicas.
 *
 * Una seña con movimiento se graba durante 4 segundos (80 fotogramas a 20 Hz).
 * De esa ventana se recorta el silencio de los extremos y se submuestrea a
 * `DYNAMIC_STEPS` pasos clave (16 por defecto): el resultado es un vector de
 * 16 × 22 = 352 dimensiones comparable con `classifyTrajectory`.
 */

import { DYNAMIC_STEPS, FEATURE_SIZE } from './knnClassifier.js'

/**
 * Movimiento mínimo entre dos fotogramas (unidades normalizadas 0-100) para
 * considerar que hay gesto. Con ventanas de 4 s un gesto suave avanza poco
 * entre fotogramas, así que el umbral es bajo: el ruido de los sensores queda
 * por debajo de 0,5.
 */
export const MOTION_FLOOR = 0.6
/** Fragmento proporcional del pico que también cuenta como movimiento. */
const MOTION_RATIO = 0.15
/** Con menos fotogramas no hay trayectoria fiable. */
export const MIN_TRAJECTORY_FRAMES = 6

/** Cuánto cambió la postura entre dos fotogramas (RMS de las diferencias). */
export function frameMotion(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0

  let sum = 0
  for (let index = 0; index < a.length; index += 1) {
    const diff = a[index] - b[index]
    sum += diff * diff
  }
  return Math.sqrt(sum / a.length)
}

/** Movimiento medio de una secuencia completa. */
export function sequenceMotion(frames = []) {
  if (frames.length < 2) return 0

  let total = 0
  for (let index = 1; index < frames.length; index += 1) {
    total += frameMotion(frames[index - 1], frames[index])
  }
  return total / (frames.length - 1)
}

/**
 * Quita los fotogramas iniciales y finales sin movimiento.
 * Si no hay movimiento suficiente devuelve un arreglo vacío.
 */
export function trimMovement(frames = [], floor = MOTION_FLOOR) {
  if (!Array.isArray(frames) || frames.length < 2) return []

  const moves = []
  for (let index = 1; index < frames.length; index += 1) {
    moves.push(frameMotion(frames[index - 1], frames[index]))
  }

  const peak = Math.max(...moves)
  if (!(peak > 0)) return []

  const threshold = Math.max(floor, peak * MOTION_RATIO)
  const first = moves.findIndex((motion) => motion >= threshold)
  if (first === -1) return []

  let last = first
  for (let index = moves.length - 1; index >= first; index -= 1) {
    if (moves[index] >= threshold) {
      last = index
      break
    }
  }

  // `moves[i - 1]` une los fotogramas i-1 e i, por eso el corte termina en last + 2.
  return frames.slice(first, Math.min(frames.length, last + 2))
}

/**
 * Submuestrea la secuencia a `steps` fotogramas equidistantes y los concatena.
 * @returns {number[]|null} vector de steps × 22 dimensiones
 */
export function buildTrajectory(frames = [], steps = DYNAMIC_STEPS) {
  if (!Array.isArray(frames) || frames.length === 0) return null

  const trajectory = []
  for (let step = 0; step < steps; step += 1) {
    const index = steps === 1 ? 0 : Math.round((step * (frames.length - 1)) / (steps - 1))
    const frame = frames[index]
    if (!Array.isArray(frame) || frame.length !== FEATURE_SIZE) return null
    trajectory.push(...frame)
  }

  return trajectory
}

/**
 * Trayectoria lista para clasificar a partir de una ventana de fotogramas.
 * Recorta el silencio de los extremos y submuestrea; devuelve `null` si no
 * hay movimiento suficiente (por ejemplo, con la mano quieta).
 */
export function trajectoryFromFrames(frames = [], { floor = MOTION_FLOOR, steps = DYNAMIC_STEPS } = {}) {
  const segment = trimMovement(frames, floor)
  if (segment.length < MIN_TRAJECTORY_FRAMES) return null
  return buildTrajectory(segment, steps)
}

/**
 * Cambia el número de pasos clave de una trayectoria (interpolación lineal).
 * Sirve para reutilizar entrenamientos grabados con 10 pasos cuando ahora se
 * comparan 16, sin perder lo ya grabado.
 */
export function resampleTrajectory(vector, targetSteps = DYNAMIC_STEPS) {
  if (!Array.isArray(vector) || vector.length === 0) return null
  if (vector.length % FEATURE_SIZE !== 0) return null

  const steps = vector.length / FEATURE_SIZE
  if (steps === targetSteps) return vector.slice()

  const result = []
  for (let step = 0; step < targetSteps; step += 1) {
    const position = targetSteps === 1 ? 0 : (step * (steps - 1)) / (targetSteps - 1)
    const lower = Math.floor(position)
    const upper = Math.min(steps - 1, lower + 1)
    const blend = position - lower

    for (let index = 0; index < FEATURE_SIZE; index += 1) {
      const a = vector[lower * FEATURE_SIZE + index]
      const b = vector[upper * FEATURE_SIZE + index]
      result.push(a + (b - a) * blend)
    }
  }

  return result
}

/** ¿La ventana contiene un gesto con movimiento suficiente? */
export function hasMovement(frames = [], floor = MOTION_FLOOR) {
  return trimMovement(frames, floor).length >= MIN_TRAJECTORY_FRAMES
}
