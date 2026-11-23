/**
 * Configuración de tiempos y velocidades para el motor de reconocimiento de señas KLAPS.
 */

export const RECOGNITION_SPEEDS = {
  rapido: {
    value: 'rapido',
    label: 'Rápido',
    fullLabel: 'Rápido (0.9s)',
    holdMs: 900,
    cooldownMs: 1400,
    description: 'Captación en 0.9 s · Mayor fluidez para usuarios experimentados.',
  },
  normal: {
    value: 'normal',
    label: 'Normal',
    fullLabel: 'Normal (1.3s)',
    holdMs: 1300,
    cooldownMs: 1800,
    description: 'Captación en 1.3 s · Recomendado: filtra posturas intermedias y estabiliza.',
  },
  preciso: {
    value: 'preciso',
    label: 'Preciso',
    fullLabel: 'Preciso (1.8s)',
    holdMs: 1800,
    cooldownMs: 2200,
    description: 'Captación en 1.8 s · Máxima estabilidad y precisión para demostración y evaluación.',
  },
}

export const DEFAULT_SPEED = 'normal'

export function getRecognitionSpeed(key = DEFAULT_SPEED) {
  return RECOGNITION_SPEEDS[key] ?? RECOGNITION_SPEEDS[DEFAULT_SPEED]
}
