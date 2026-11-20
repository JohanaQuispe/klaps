/**
 * Seña física de auxilio · sin entrenamiento
 * ------------------------------------------
 * El guante puede disparar la alerta sin que exista una seña entrenada: basta
 * con **agitar el guante** de forma alterna. La regla usa solo el MPU-6050, así
 * que no depende de los flex (los que no están dando señal en el guante actual)
 * ni del clasificador KNN.
 *
 * Un **vaivén** cuenta cuando llegan varios «impulsos» (cambios bruscos de la
 * aceleración entre dos tramas seguidas) y la dirección del cambio se invierte
 * al menos dos veces. Esa inversión es lo que separa agitar de un movimiento
 * suelto: saludar, cerrar el puño o dejar el guante sobre la mesa empujan la
 * aceleración en una sola dirección y no suman.
 *
 * Tres vaivenes en 15 s abren el aviso de emergencia, que sigue siendo
 * cancelable durante 10 s antes de enviar el mensaje (ver `Translation.jsx`).
 */

/** Cambio mínimo de aceleración entre dos tramas (m/s²) para contar un impulso. */
export const HELP_JERK_THRESHOLD = 6
/** Impulsos necesarios dentro de un vaivén (≈1,5 ciclos a 20 Hz). */
export const HELP_MIN_IMPULSES = 3
/** Inversiones de dirección necesarias: distinguen agitar de mover el brazo. */
export const HELP_MIN_REVERSALS = 2
/** Separación mínima entre impulsos (evita contar la misma sacudida dos veces). */
export const HELP_MIN_GAP_MS = 70
/** Silencio que cierra el vaivén y lo evalúa. */
export const HELP_RELEASE_MS = 700
/** Un movimiento continuo más largo que esto no es una seña: se descarta. */
export const HELP_WINDOW_MS = 1600
/** Hueco entre tramas mayor que esto = el guante se reconectó o se detuvo. */
export const HELP_MAX_STEP_MS = 400

/**
 * Crea un detector independiente (uno por guante).
 *
 * `push(imu, at)` devuelve `{ signal, level, impulses }`:
 *   · `signal`   → acaba de cerrarse un vaivén válido (cuenta como una seña).
 *   · `level`    → 0-1, intensidad del movimiento, para el medidor de pantalla.
 *   · `impulses` → impulsos del vaivén en curso, para dar respuesta inmediata.
 *
 * @param {object} [options] umbrales; se pueden ajustar sin tocar la lógica.
 */
export function createHelpSignalDetector(options = {}) {
  const config = {
    jerkThreshold: HELP_JERK_THRESHOLD,
    minImpulses: HELP_MIN_IMPULSES,
    minReversals: HELP_MIN_REVERSALS,
    minGapMs: HELP_MIN_GAP_MS,
    releaseMs: HELP_RELEASE_MS,
    windowMs: HELP_WINDOW_MS,
    maxStepMs: HELP_MAX_STEP_MS,
    ...options,
  }

  let previous = null
  let previousAt = 0
  let previousDelta = null
  let impulses = 0
  let reversals = 0
  let startedAt = 0
  let lastImpulseAt = 0
  let level = 0

  function resetBurst() {
    impulses = 0
    reversals = 0
    startedAt = 0
    lastImpulseAt = 0
    previousDelta = null
  }

  function reset() {
    previous = null
    previousAt = 0
    level = 0
    resetBurst()
  }

  function push(imu, at = Date.now()) {
    if (!imu || !Number.isFinite(imu.ax) || !Number.isFinite(imu.az)) {
      reset()
      return { signal: false, level: 0, impulses: 0 }
    }

    // Hueco grande (o tiempo hacia atrás): se reinicia el vaivén en curso.
    if (previous && (at - previousAt > config.maxStepMs || at < previousAt)) resetBurst()

    const dx = previous ? imu.ax - previous.ax : 0
    const dy = previous ? imu.ay - previous.ay : 0
    const dz = previous ? imu.az - previous.az : 0
    const jerk = previous ? Math.hypot(dx, dy, dz) : 0

    previous = { ax: imu.ax, ay: imu.ay, az: imu.az }
    previousAt = at

    // Medidor suavizado para la pantalla: 0 quieto · 1 sacudida clara.
    level = level * 0.6 + Math.min(1, jerk / (config.jerkThreshold * 2)) * 0.4

    if (jerk >= config.jerkThreshold && at - lastImpulseAt >= config.minGapMs) {
      if (impulses === 0) startedAt = at
      if (previousDelta) {
        const dot = dx * previousDelta.x + dy * previousDelta.y + dz * previousDelta.z
        if (dot < 0) reversals += 1
      }
      impulses += 1
      lastImpulseAt = at
      previousDelta = { x: dx, y: dy, z: dz }

      // Se mueve sin parar: no es un vaivén, se descarta y se espera el silencio.
      if (at - startedAt > config.windowMs) resetBurst()

      return { signal: false, level, impulses }
    }

    // Silencio suficiente: se evalúa el vaivén y se cierra.
    if (impulses > 0 && at - lastImpulseAt >= config.releaseMs) {
      const signal = impulses >= config.minImpulses && reversals >= config.minReversals
      resetBurst()
      return { signal, level, impulses: 0 }
    }

    return { signal: false, level, impulses }
  }

  return { push, reset }
}
