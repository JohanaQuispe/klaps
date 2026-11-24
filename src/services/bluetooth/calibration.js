/**
 * Calibración de los guantes en localStorage · `klaps.calibration.v1`
 *
 * El firmware envía los flex como porcentaje 0-100 y el MPU-6050 en unidades
 * físicas. Cada guante, sin embargo, no llega ni a 0 % con la mano abierta ni a
 * 100 % con el puño cerrado, y el giroscopio puede tener un sesgo distinto de
 * cero. La calibración guiada mide esos extremos reales y el sesgo del IMU para
 * reescalar las lecturas sin tocar el código del ESP32.
 *
 * Formato:
 * {
 *   version: 1,
 *   createdAt: 1763000000000,
 *   flex: {
 *     min: [10 números],   // 0..4 guante derecho, 5..9 guante izquierdo
 *     max: [10 números],
 *     valid: [10 booleanos]  // false = ese dedo no cambió lo suficiente
 *   },
 *   imu: {
 *     derecho:   { ax, ay, az, gx, gy, gz },
 *     izquierdo: { ax, ay, az, gx, gy, gz }
 *   },
 *   samples: { stretched, closed, neutral }
 * }
 */

export const CALIBRATION_KEY = 'klaps.calibration.v1'

/** Fotogramas por paso: 2 segundos a 20 Hz (40 muestras). */
export const CALIBRATION_FRAMES = 40
/** Pausa antes de cada paso para que la persona se coloque. */
export const CALIBRATION_SETTLE_MS = 900
/**
 * Diferencia mínima estricta entre mínimo y máximo para dar un dedo por activo (12 %).
 * Sensores con menor variación se consideran muertos/saturados y se les asigna peso 0.
 */
export const MIN_FLEX_SPAN = 12

export const FINGER_NAMES = [
  'Pulgar (GPIO 36)',
  'Índice (GPIO 39)',
  'Medio (GPIO 34)',
  'Anular (GPIO 35)',
  'Meñique (GPIO 32)',
]

/**
 * Calibración predeterminada compatible con el firmware oficial KLAPS (0-100%):
 * - Dedo recto (mano abierta)  -> 0 % de flexión.
 * - Dedo doblado (puño cerrado) -> 100 % de flexión.
 * - Anular desconectado        -> 0 % fijo (ignorado con peso 0).
 */
export const DEFAULT_OPEN_RAW = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
export const DEFAULT_CLOSED_RAW = [100, 100, 100, 0, 100, 100, 100, 100, 0, 100]
export const DEFAULT_VALID = [true, true, true, false, true, true, true, true, false, true]

export const DEFAULT_CALIBRATION = {
  version: 1,
  createdAt: 1763000000000,
  flex: {
    openRaw: [...DEFAULT_OPEN_RAW],
    closedRaw: [...DEFAULT_CLOSED_RAW],
    min: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    max: [100, 100, 100, 0, 100, 100, 100, 100, 0, 100],
    valid: [...DEFAULT_VALID],
  },
  imu: {
    derecho: { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
    izquierdo: { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
  },
  samples: { stretched: 40, closed: 40, neutral: 40 },
}

/** Asistente rápido de 2 pasos para compensación de hardware en tiempo real */
export const QUICK_CALIBRATION_STEPS = [
  {
    key: 'stretched',
    title: 'Paso 1: Mano abierta (2s)',
    instruction:
      'Extiende todos los dedos al máximo con la palma hacia abajo. Se registrarán los valores abiertos (0 % de flexión).',
    icon: 'open',
  },
  {
    key: 'closed',
    title: 'Paso 2: Puño cerrado (2s)',
    instruction:
      'Cierra el puño con firmeza con todos los dedos apretados. Se registrarán los valores cerrados (100 % de flexión).',
    icon: 'fist',
  },
]

export const CALIBRATION_STEPS = [
  {
    key: 'stretched',
    title: 'Dedos estirados (0 %)',
    instruction: 'Abre las dos manos al máximo, con los dedos bien separados, y mantén la postura.',
    icon: 'open',
  },
  {
    key: 'closed',
    title: 'Dedos doblados (100 %)',
    instruction: 'Cierra los dos puños con fuerza y mantén la presión durante la captura.',
    icon: 'fist',
  },
  {
    key: 'neutral',
    title: 'Movimiento de referencia',
    instruction:
      'Sube las manos, bájalas y déjalas al centro. Así se registra la línea base del MPU-6050.',
    icon: 'move',
  },
]

const EMPTY_OFFSET = { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 }
const AXES = ['ax', 'ay', 'az', 'gx', 'gy', 'gz']

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

/** ¿Hay una calibración utilizable? */
export function isCalibrationUsable(calibration) {
  if (!calibration?.flex) return false
  if (Array.isArray(calibration.flex.openRaw) && Array.isArray(calibration.flex.closedRaw)) {
    return calibration.flex.openRaw.length === 10 && calibration.flex.closedRaw.length === 10
  }
  return Boolean(calibration.flex.min?.length === 10 && calibration.flex.max?.length === 10)
}

/** Valida y normaliza lo que venga de localStorage o de la captura. */
export function normalizeCalibration(raw) {
  if (!isCalibrationUsable(raw)) return DEFAULT_CALIBRATION

  const openRaw = Array.isArray(raw.flex.openRaw)
    ? raw.flex.openRaw.map((value, i) => (isFiniteNumber(value) ? value : DEFAULT_OPEN_RAW[i]))
    : (raw.flex.max ?? DEFAULT_OPEN_RAW).map((value, i) =>
        isFiniteNumber(value) ? value : DEFAULT_OPEN_RAW[i],
      )

  const closedRaw = Array.isArray(raw.flex.closedRaw)
    ? raw.flex.closedRaw.map((value, i) => (isFiniteNumber(value) ? value : DEFAULT_CLOSED_RAW[i]))
    : (raw.flex.min ?? DEFAULT_CLOSED_RAW).map((value, i) =>
        isFiniteNumber(value) ? value : DEFAULT_CLOSED_RAW[i],
      )

  const valid = openRaw.map((openVal, index) => {
    const closedVal = closedRaw[index]
    // Si el valor crudo en abierto y cerrado es 0 (ej. Anular desconectado)
    if (openVal === 0 && closedVal === 0) return false
    if (Array.isArray(raw.flex.valid) && typeof raw.flex.valid[index] === 'boolean') {
      return raw.flex.valid[index]
    }
    return Math.abs(openVal - closedVal) >= MIN_FLEX_SPAN
  })

  const min = openRaw.map((o, i) => Math.min(o, closedRaw[i]))
  const max = openRaw.map((o, i) => Math.max(o, closedRaw[i]))

  const offset = (side) => {
    const source = raw.imu?.[side] ?? {}
    return AXES.reduce((accumulator, axis) => {
      accumulator[axis] = isFiniteNumber(source[axis]) ? source[axis] : 0
      return accumulator
    }, {})
  }

  return {
    version: 1,
    createdAt: isFiniteNumber(raw.createdAt) ? raw.createdAt : Date.now(),
    flex: { openRaw, closedRaw, min, max, valid },
    imu: { derecho: offset('derecho'), izquierdo: offset('izquierdo') },
    samples: {
      stretched: raw.samples?.stretched ?? 0,
      closed: raw.samples?.closed ?? 0,
      neutral: raw.samples?.neutral ?? 0,
    },
  }
}

export function loadCalibration() {
  if (typeof window === 'undefined') return DEFAULT_CALIBRATION
  try {
    const raw = window.localStorage.getItem(CALIBRATION_KEY)
    if (!raw) return DEFAULT_CALIBRATION
    return normalizeCalibration(JSON.parse(raw)) ?? DEFAULT_CALIBRATION
  } catch {
    return DEFAULT_CALIBRATION
  }
}

export function saveCalibration(calibration) {
  const safe = normalizeCalibration(calibration)
  if (safe && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CALIBRATION_KEY, JSON.stringify(safe))
    } catch {
      // sin espacio o modo privado: se mantiene solo en memoria
    }
  }
  return safe
}

export function clearCalibration() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(CALIBRATION_KEY)
    } catch {
      // nada que limpiar
    }
  }
  return DEFAULT_CALIBRATION
}

/** Media de un eje del IMU en una lista de lecturas (ignora lecturas vacías). */
function averageImu(readings = []) {
  const valid = readings.filter((reading) => reading?.imu)
  if (valid.length === 0) return { ...EMPTY_OFFSET }

  return AXES.reduce((accumulator, axis) => {
    const total = valid.reduce((sum, reading) => {
      const value = reading.imu[axis]
      return Number.isFinite(value) ? sum + value : sum
    }, 0)
    accumulator[axis] = total / valid.length
    return accumulator
  }, {})
}

/** Diez valores de flex por instantánea: 5 del guante derecho y 5 del izquierdo. */
function flexSnapshot(snapshot) {
  const right = Array.isArray(snapshot?.derecho)
    ? snapshot.derecho
    : snapshot?.derecho?.rawFlex ?? snapshot?.derecho?.flex ?? []
  const left = Array.isArray(snapshot?.izquierdo)
    ? snapshot.izquierdo
    : snapshot?.izquierdo?.rawFlex ?? snapshot?.izquierdo?.flex ?? []
  return [...Array.from({ length: 5 }, (_, index) => right[index]), ...Array.from({ length: 5 }, (_, index) => left[index])]
}

/**
 * Construye la calibración a partir de las capturas de mano abierta y puño cerrado.
 * Promedia los valores crudos del ADC para openRaw y closedRaw.
 *
 * Fórmula oficial de porcentaje:
 * flex % = clamp((openRaw - raw) / (openRaw - closedRaw), 0, 1) * 100
 *
 * El dedo anular desconectado (raw === 0) se marca como valid = false y peso = 0.
 */
export function buildCalibration({ stretched = [], closed = [], neutral = [] } = {}) {
  const openSamples = Array.from({ length: 10 }, () => [])
  const closedSamples = Array.from({ length: 10 }, () => [])

  for (const snapshot of stretched) {
    flexSnapshot(snapshot).forEach((value, index) => {
      if (!isFiniteNumber(value)) return
      openSamples[index].push(value)
    })
  }

  for (const snapshot of closed) {
    flexSnapshot(snapshot).forEach((value, index) => {
      if (!isFiniteNumber(value)) return
      closedSamples[index].push(value)
    })
  }

  const openRaw = openSamples.map((vals, idx) => {
    if (vals.length === 0) return DEFAULT_OPEN_RAW[idx]
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return Math.round(avg)
  })

  const closedRaw = closedSamples.map((vals, idx) => {
    if (vals.length === 0) return DEFAULT_CLOSED_RAW[idx]
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return Math.round(avg)
  })

  const valid = openRaw.map((openVal, index) => {
    const closedVal = closedRaw[index]
    if (openVal === 0 && closedVal === 0) return false
    return Math.abs(openVal - closedVal) >= MIN_FLEX_SPAN
  })

  const min = openRaw.map((o, i) => Math.min(o, closedRaw[i]))
  const max = openRaw.map((o, i) => Math.max(o, closedRaw[i]))

  return {
    version: 1,
    createdAt: Date.now(),
    flex: {
      openRaw,
      closedRaw,
      min,
      max,
      valid,
    },
    imu: {
      derecho: averageImu(neutral.map((snapshot) => snapshot?.derecho)),
      izquierdo: averageImu(neutral.map((snapshot) => snapshot?.izquierdo)),
    },
    samples: { stretched: stretched.length, closed: closed.length, neutral: neutral.length },
  }
}

/**
 * Asistente rápido de 2 pasos: mano abierta + puño cerrado.
 * Usa la muestra de mano abierta como línea base neutral para el IMU.
 */
export function buildQuickCalibration({ stretched = [], closed = [] } = {}) {
  return buildCalibration({ stretched, closed, neutral: stretched })
}

/** Resumen legible para la interfaz con detalle de canales activos y pesos asignados. */
export function describeCalibration(calibration) {
  const safeCal = normalizeCalibration(calibration) ?? DEFAULT_CALIBRATION

  const ranges = (offset, handLabel = '') =>
    Array.from({ length: 5 }, (_, index) => {
      const position = offset + index
      const open = Math.round(safeCal.flex.openRaw[position])
      const closed = Math.round(safeCal.flex.closedRaw[position])
      const span = Math.abs(open - closed)
      const valid =
        Boolean(safeCal.flex.valid[position]) && (open > 0 || closed > 0) && span >= MIN_FLEX_SPAN

      let status = 'activo'
      let statusText = `Abierto ${open} → Cerrado ${closed} (Δ${span} · peso 1.4)`
      if (!valid) {
        status = open === 0 && closed === 0 ? 'desconectado / 0V' : 'rango insuficiente (< 12 %)'
        statusText =
          open === 0 && closed === 0
            ? 'raw 0 · peso 0 (desconectado / ignorado)'
            : `Abierto ${open} → Cerrado ${closed} (inactivo · peso 0)`
      }

      const fingerName = FINGER_NAMES[index] || `Dedo ${index}`
      return {
        finger: `${handLabel ? `${handLabel}-` : ''}${fingerName.toLowerCase()}`,
        name: handLabel ? `${fingerName} (${handLabel})` : fingerName,
        valid,
        isActive: valid,
        openRaw: open,
        closedRaw: closed,
        min: Math.min(open, closed),
        max: Math.max(open, closed),
        span,
        status,
        statusText,
        weight: valid ? 1.4 : 0,
      }
    })

  const derechoRanges = ranges(0, '')
  const izquierdoRanges = ranges(5, 'izq')
  const validCount = safeCal.flex.valid.filter(Boolean).length

  return {
    createdAt: safeCal.createdAt,
    validCount,
    activeFlexCount: validCount,
    deadFlexCount: 10 - validCount,
    ready: true,
    summary:
      validCount > 0
        ? `${validCount} sensores flex activos (peso 1.4) · Anular ignorado (peso 0)`
        : 'Calibración activa basada en MPU6050 (pitch/roll)',
    derecho: derechoRanges,
    izquierdo: izquierdoRanges,
    fingerChannels: derechoRanges,
    imu: safeCal.imu,
  }
}
