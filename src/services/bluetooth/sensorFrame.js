/**
 * Trama binaria del firmware KLAPS · 34 bytes
 * -------------------------------------------
 *   5 × int16  (little-endian) → sensores flex, en porcentaje 0-100
 *   6 × float32 (little-endian) → MPU-6050: ax, ay, az, gx, gy, gz
 *
 * El navegador entrega las notificaciones BLE como DataView; aquí se convierten
 * en un objeto legible y, después, en el vector de 22 dimensiones que usa el
 * clasificador KNN.
 */

export const FRAME_LENGTH = 34

/** Rangos de normalización, para que el IMU pese igual que los flex (0-100). */
export const ACCEL_RANGE = 20 // ±20 m/s²
export const GYRO_RANGE = 10 // ±10 rad/s

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * Convierte un paquete BLE en una lectura.
 * @param {DataView|ArrayBuffer|Uint8Array|null} payload
 * @returns {{flex: number[], imu: {ax:number, ay:number, az:number, gx:number, gy:number, gz:number}, at: number}|null}
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

  const flex = []
  for (let index = 0; index < 5; index += 1) {
    flex.push(clamp(view.getInt16(index * 2, true), 0, 100))
  }

  const imu = {}
  const names = ['ax', 'ay', 'az', 'gx', 'gy', 'gz']
  names.forEach((name, index) => {
    const value = view.getFloat32(10 + index * 4, true)
    imu[name] = Number.isFinite(value) ? value : 0
  })

  return { flex, imu, at, bytes: view.byteLength }
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

/** ¿Hay al menos un guante enviando datos válidos? */
export function hasAnyReading({ derecho, izquierdo } = {}) {
  return Boolean(derecho || izquierdo)
}
