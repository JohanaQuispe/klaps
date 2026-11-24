/**
 * Trama binaria del firmware KLAPS · 34 bytes
 * -------------------------------------------
 *   5 × int16  (little-endian) → sensores flex, en porcentaje 0-100
 *   6 × float32 (little-endian) → MPU-6050: ax, ay, az, gx, gy, gz
 *
 * El navegador entrega las notificaciones BLE como DataView; aquí se convierten
 * en un objeto legible y, después, en el vector de 22 dimensiones que usa el
 * clasificador KNN.
 *
 * `applyCalibration` reescala los flex con los extremos reales medidos en la
 * calibración guiada y centra el MPU-6050 con su línea base. Las lecturas sin
 * calibrar se conservan en `rawFlex` / `rawImu` para diagnóstico.
 */

import {
  DEFAULT_CALIBRATION,
  DEFAULT_CLOSED_RAW,
  DEFAULT_OPEN_RAW,
  DEFAULT_VALID,
} from './calibration.js'

export const FRAME_LENGTH = 34

/** Rangos de normalización, para que el IMU pese igual que los flex (0-100). */
export const ACCEL_RANGE = 20 // ±20 m/s²
export const GYRO_RANGE = 10 // ±10 rad/s

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * Convierte un valor crudo ADC de un sensor flex en porcentaje de flexión (0-100%).
 * Fórmula oficial: clamp((openRaw - raw) / (openRaw - closedRaw), 0, 1) * 100
 *
 * Al cerrar el puño, los valores crudos del ADC disminuyen (openRaw > closedRaw),
 * por lo que (openRaw - raw) crece de 0 a (openRaw - closedRaw) y genera 0% a 100%.
 *
 * Si el sensor está desconectado (raw === 0), devuelve 0%.
 */
export function calculateFlexPercentage(raw, openRaw, closedRaw) {
  if (!Number.isFinite(raw) || raw === 0) return 0
  if (!Number.isFinite(openRaw) || !Number.isFinite(closedRaw)) return 0

  const span = openRaw - closedRaw
  if (Math.abs(span) < 12) return 0

  const ratio = (openRaw - raw) / span
  return clamp(ratio, 0, 1) * 100
}

/**
 * Convierte un paquete BLE en una lectura.
 * @param {DataView|ArrayBuffer|Uint8Array|null} payload
 * @returns {{flex: number[], rawFlex: number[], imu: {ax:number, ay:number, az:number, gx:number, gy:number, gz:number}, at: number}|null}
 */
export function parseFrame(payload, at = Date.now()) {
  if (!payload) return null

  const view =
    payload instanceof DataView
      ? payload
      : payload instanceof ArrayBuffer
        ? new DataView(payload)
        : new DataView(payload.buffer, payload.byteOffset, payload.byteLength)

  if (view.byteLength < FRAME_LENGTH) return null

  // Lectura del valor ADC int16 directo sin recortar artificialmente a 100
  const rawFlex = []
  for (let index = 0; index < 5; index += 1) {
    rawFlex.push(view.getInt16(index * 2, true))
  }

  const imu = {}
  const names = ['ax', 'ay', 'az', 'gx', 'gy', 'gz']
  names.forEach((name, index) => {
    const value = view.getFloat32(10 + index * 4, true)
    imu[name] = Number.isFinite(value) ? value : 0
  })

  return { flex: rawFlex, rawFlex, imu, at, bytes: view.byteLength }
}

/**
 * Aplica la calibración guardada a una lectura de un guante.
 *
 * · Flex: calcula el porcentaje de flexión exacto mediante Min-Max
 *   con valores invertidos del ADC:
 *   flex % = clamp((openRaw - raw) / (openRaw - closedRaw), 0, 1) * 100
 *   Canales con raw === 0 (como el Anular desconectado) quedan en 0%.
 * · IMU: se resta la línea base del paso «neutro», tanto en aceleración como en
 *   giroscopio. El valor original queda en `rawImu` porque la regla del estado
 *   «0» (palma hacia abajo) es física y trabaja sobre la aceleración absoluta.
 *
 * @param {{flex: number[], rawFlex?: number[], imu: object, at: number}|null} reading
 * @param {object|null} calibration contenido de `klaps.calibration.v1`
 * @param {'derecho'|'izquierdo'} side guante del que viene la lectura
 */
export function applyCalibration(reading, calibration, side = 'derecho') {
  if (!reading) return null

  const activeCal = calibration ?? DEFAULT_CALIBRATION
  const rawList = reading.rawFlex ?? reading.flex ?? []
  const base = side === 'izquierdo' ? 5 : 0

  const flex = rawList.map((rawVal, index) => {
    const position = base + index
    // Ignorar si raw === 0 (ej. Anular desconectado)
    if (rawVal === 0) return 0

    const openRaw = activeCal?.flex?.openRaw?.[position] ?? DEFAULT_OPEN_RAW[position]
    const closedRaw = activeCal?.flex?.closedRaw?.[position] ?? DEFAULT_CLOSED_RAW[position]
    const isValid = activeCal?.flex?.valid?.[position] ?? DEFAULT_VALID[position]

    if (!isValid) return 0

    return calculateFlexPercentage(rawVal, openRaw, closedRaw)
  })

  const offset = activeCal?.imu?.[side]
  const imu = offset
    ? {
        ax: reading.imu.ax - (offset.ax ?? 0),
        ay: reading.imu.ay - (offset.ay ?? 0),
        az: reading.imu.az - (offset.az ?? 0),
        gx: reading.imu.gx - (offset.gx ?? 0),
        gy: reading.imu.gy - (offset.gy ?? 0),
        gz: reading.imu.gz - (offset.gz ?? 0),
      }
    : reading.imu

  return {
    ...reading,
    flex,
    imu,
    rawFlex: rawList,
    rawImu: reading.rawImu ?? reading.imu,
    calibrated: true,
  }
}

/** Aceleración (±20 m/s²) → 0-100. */
export function normalizeAccel(value) {
  return ((clamp(value, -ACCEL_RANGE, ACCEL_RANGE) + ACCEL_RANGE) / (ACCEL_RANGE * 2)) * 100
}

/** Giroscopio (±10 rad/s) → 0-100. */
export function normalizeGyro(value) {
  return ((clamp(value, -GYRO_RANGE, GYRO_RANGE) + GYRO_RANGE) / (GYRO_RANGE * 2)) * 100
}

/**
 * Vector de 11 dimensiones de un guante: [flex0..flex4, ax, ay, az, gx, gy, gz].
 * Si el guante no tiene lectura, devuelve ceros (modo unimanual).
 */
export function gloveVector(reading) {
  if (!reading) return Array.from({ length: 11 }, () => 0)

  const { flex, imu } = reading
  return [
    ...flex.slice(0, 5),
    normalizeAccel(imu.ax),
    normalizeAccel(imu.ay),
    normalizeAccel(imu.az),
    normalizeGyro(imu.gx),
    normalizeGyro(imu.gy),
    normalizeGyro(imu.gz),
  ]
}

/**
 * Vector bimanual de 22 dimensiones: KLAPS-D (11) + KLAPS-U (11).
 * El guante que falte se rellena con ceros.
 */
export function buildFeatureVector({ derecho, izquierdo } = {}) {
  return [...gloveVector(derecho), ...gloveVector(izquierdo)]
}

/** Trama en hexadecimal, agrupada para poder leerla a simple vista. */
export function frameToHex(bytes) {
  if (!bytes) return ''
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
}

/**
 * Diagnóstico rápido del contenido de una trama ya decodificada.
 * Devuelve un aviso cuando los flex llegan todos a cero (el firmware los
 * envía vacíos) o cuando el tamaño no es el esperado.
 */
export function describeFrameContent(frame, byteLength = 0) {
  if (!frame) {
    if (byteLength > 0 && byteLength !== FRAME_LENGTH) {
      return `Trama de ${byteLength} bytes; se esperaban ${FRAME_LENGTH}.`
    }
    return ''
  }

  if (frame.flex.every((value) => value === 0)) {
    return 'Los cinco sensores flex llegan a 0. El IMU sí trae datos, así que la trama está bien alineada: el firmware está enviando ceros en los bytes 0-9.'
  }

  return ''
}

/**
 * Regla física del estado «0» (reposo):
 * Dedos activos cerrados (flex ≥ 75 %) y la palma hacia abajo (az ≤ −7,5 m/s²).
 * Si un dedo tiene el sensor dañado o desconectado (marca ≤ 5 %), no bloquea
 * la detección del puño, evaluando los demás dedos activos (mínimo 2).
 */
export const REST_FLEX_THRESHOLD = 65
export const REST_ACCEL_THRESHOLD = -7.5
export const REST_FINGERS = 4

/** ¿Esta mano está cerrada y apuntando hacia abajo? */
export function isRestHand(reading) {
  if (!reading?.flex || !reading?.imu) return false

  const allFingers = reading.flex.slice(0, 5)
  // Dedos activos que registran señal por encima del umbral de desconexión (> 5 %) y raw !== 0
  const activeFingers = allFingers.filter((val, idx) => {
    const raw = reading.rawFlex?.[idx]
    if (raw === 0) return false
    return Number.isFinite(val) && val > 5
  })

  // Si hay al menos 2 dedos activos (ej. pulgar, índice, medio, meñique),
  // todos los activos deben estar cerrados (flex >= 65 %)
  const closed =
    activeFingers.length >= 2
      ? activeFingers.every((value) => value >= REST_FLEX_THRESHOLD)
      : allFingers.slice(0, REST_FINGERS).every((value) => Number.isFinite(value) && value >= REST_FLEX_THRESHOLD)

  // La orientación se mide sobre la lectura sin calibrar: es una regla física.
  const az = reading.rawImu?.az ?? reading.imu.az
  const pointingDown = Number.isFinite(az) && az <= REST_ACCEL_THRESHOLD

  return closed && pointingDown
}

/**
 * ¿Las manos están en reposo? Se evalúan solo los guantes que envían datos y
 * todos deben cumplir la regla: así se puede seguir firmando con una mano
 * mientras la otra descansa... salvo que ambas estén cerradas.
 */
export function isRestPose({ derecho, izquierdo } = {}) {
  const hands = [derecho, izquierdo].filter(Boolean)
  return hands.length > 0 && hands.every(isRestHand)
}

/** ¿Hay al menos un guante enviando datos válidos? */
export function hasAnyReading({ derecho, izquierdo } = {}) {
  return Boolean(derecho || izquierdo)
}
