/**
 * Señas Canónicas Maestras de KLAPS · Arquitectura Híbrida
 * --------------------------------------------------------
 * Juego oficial de señas base precalibradas y optimizadas para el motor híbrido:
 *
 * 1. Estáticas (100% Flex, MPU6050 peso 0):
 *    · «Hola»     → Mano abierta extendida (flex ~10%).
 *    · «Bien»     → Pulgar arriba / Thumbs-up (pulgar ~10%, índice, medio, meñique cerrados ~88%).
 *    · «Ayuda»    → Mano en puño firme de auxilio / pulgar extendido.
 *
 * 2. Dinámicas (Trayectoria 16 pasos: MPU6050 + Flex):
 *    · «Adiós»    → Mano abierta con vaivén lateral de muñeca (oscilación de giroscopio gx).
 *    · «Gracias»  → Mano extendida con avance frontal desde la barbilla/pecho (vector de aceleración ay).
 *    · «Por favor» → Mano plana trazando un arco o frotación circular en el pecho (fase ax / ay).
 *
 * Se guardan de forma permanente en localStorage («guardar para siempre») para que el sistema
 * esté siempre listo para demostraciones y uso continuo.
 */

import { saveTraining, withSamples } from './trainingStore.js'

const DYNAMIC_STEPS = 16

/** Genera vector estático de 22 dimensiones (mano derecha activa, izquierda en ceros). */
function buildStaticVector(flex) {
  // [flex0..4, ax, ay, az, gx, gy, gz, 11 ceros izquierda]
  return [
    flex[0],
    flex[1],
    flex[2],
    0, // anular desconectado siempre 0
    flex[4],
    50, 50, 50, 50, 50, 50, // IMU neutro
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // izquierda
  ]
}

/** Genera trayectoria dinámica de 352 dimensiones con vaivén de oscilación de muñeca (Adiós). */
function buildWavingTrajectory(flex) {
  const trajectory = []
  for (let step = 0; step < DYNAMIC_STEPS; step += 1) {
    const wave = Math.sin((step / DYNAMIC_STEPS) * 4 * Math.PI) // 2 oscilaciones completas
    const gx = Math.round(50 + wave * 25)
    const frame = [
      flex[0],
      flex[1],
      flex[2],
      0,
      flex[4],
      50, 50, 50,
      gx, 50, 50,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]
    trajectory.push(...frame)
  }
  return trajectory
}

/** Genera trayectoria dinámica de 352 dimensiones con empuje y avance frontal (Gracias). */
function buildForwardTrajectory(flex) {
  const trajectory = []
  for (let step = 0; step < DYNAMIC_STEPS; step += 1) {
    const push = Math.sin((step / DYNAMIC_STEPS) * Math.PI)
    const ay = Math.round(50 + push * 26)
    const az = Math.round(50 + push * 12)
    const frame = [
      flex[0],
      flex[1],
      flex[2],
      0,
      flex[4],
      50, ay, az,
      50, 50, 50,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]
    trajectory.push(...frame)
  }
  return trajectory
}

/** Genera trayectoria dinámica de 352 dimensiones con movimiento circular en el pecho (Por favor). */
function buildCircularTrajectory(flex) {
  const trajectory = []
  for (let step = 0; step < DYNAMIC_STEPS; step += 1) {
    const angle = (step / DYNAMIC_STEPS) * 2 * Math.PI
    const ax = Math.round(50 + Math.cos(angle) * 18)
    const ay = Math.round(50 + Math.sin(angle) * 18)
    const frame = [
      flex[0],
      flex[1],
      flex[2],
      0,
      flex[4],
      ax, ay, 50,
      50, 50, 50,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]
    trajectory.push(...frame)
  }
  return trajectory
}

const now = Date.now()

export const CANONICAL_SIGNS = [
  {
    label: 'Hola',
    handMode: 'right',
    gestureType: 'static',
    description: 'Mano abierta extendida con los 4 dedos activos rectos (100% Flex)',
    samples: [
      { vector: buildStaticVector([8, 10, 8, 0, 10]), at: now },
      { vector: buildStaticVector([10, 12, 10, 0, 12]), at: now + 50 },
      { vector: buildStaticVector([7, 9, 8, 0, 9]), at: now + 100 },
    ],
  },
  {
    label: 'Bien',
    handMode: 'right',
    gestureType: 'static',
    description: 'Pulgar arriba, índice, medio y meñique doblados en puño (100% Flex)',
    samples: [
      { vector: buildStaticVector([10, 88, 86, 0, 90]), at: now },
      { vector: buildStaticVector([12, 90, 88, 0, 92]), at: now + 50 },
      { vector: buildStaticVector([9, 86, 85, 0, 88]), at: now + 100 },
    ],
  },
  {
    label: 'Ayuda',
    handMode: 'right',
    gestureType: 'static',
    description: 'Mano en puño firme con pulgar erecto en posición de socorro',
    samples: [
      { vector: buildStaticVector([15, 84, 84, 0, 86]), at: now },
      { vector: buildStaticVector([18, 86, 86, 0, 88]), at: now + 50 },
      { vector: buildStaticVector([14, 82, 83, 0, 84]), at: now + 100 },
    ],
  },
  {
    label: 'Adiós',
    handMode: 'right',
    gestureType: 'dynamic',
    description: 'Mano abierta oscilando de lado a lado en el aire (Giroscopio gx + Flex)',
    samples: [
      { vector: buildWavingTrajectory([10, 10, 10, 0, 12]), at: now },
      { vector: buildWavingTrajectory([12, 12, 11, 0, 14]), at: now + 50 },
    ],
  },
  {
    label: 'Gracias',
    handMode: 'right',
    gestureType: 'dynamic',
    description: 'Mano extendida con avance frontal hacia adelante (Aceleración ay + Flex)',
    samples: [
      { vector: buildForwardTrajectory([12, 14, 12, 0, 14]), at: now },
      { vector: buildForwardTrajectory([14, 16, 14, 0, 16]), at: now + 50 },
    ],
  },
  {
    label: 'Por favor',
    handMode: 'right',
    gestureType: 'dynamic',
    description: 'Mano sobre el pecho con desplazamiento circular suave (Aceleración ax/ay)',
    samples: [
      { vector: buildCircularTrajectory([15, 18, 18, 0, 18]), at: now },
      { vector: buildCircularTrajectory([18, 20, 20, 0, 20]), at: now + 50 },
    ],
  },
]

export const CANONICAL_VOWELS = [
  {
    label: 'A',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal A: Puño cerrado con pulgar lateral apoyado contra el índice doblado',
    samples: [
      { vector: buildStaticVector([30, 92, 90, 0, 92]), at: now },
      { vector: buildStaticVector([28, 90, 88, 0, 90]), at: now + 50 },
      { vector: buildStaticVector([32, 94, 92, 0, 94]), at: now + 100 },
    ],
  },
  {
    label: 'E',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal E: Dedos curvados en garra sobre la palma apoyados en el pulgar',
    samples: [
      { vector: buildStaticVector([55, 65, 65, 0, 65]), at: now },
      { vector: buildStaticVector([58, 68, 67, 0, 68]), at: now + 50 },
      { vector: buildStaticVector([52, 62, 63, 0, 62]), at: now + 100 },
    ],
  },
  {
    label: 'I',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal I: Puño cerrado con solo el dedo meñique levantado y recto',
    samples: [
      { vector: buildStaticVector([88, 90, 90, 0, 8]), at: now },
      { vector: buildStaticVector([86, 92, 92, 0, 10]), at: now + 50 },
      { vector: buildStaticVector([90, 88, 88, 0, 7]), at: now + 100 },
    ],
  },
  {
    label: 'O',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal O: Todos los dedos curvados formando un círculo cerrado con el pulgar',
    samples: [
      { vector: buildStaticVector([48, 52, 50, 0, 52]), at: now },
      { vector: buildStaticVector([50, 54, 52, 0, 54]), at: now + 50 },
      { vector: buildStaticVector([46, 50, 48, 0, 50]), at: now + 100 },
    ],
  },
  {
    label: 'U',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal U: Dedo índice y medio erguidos juntos, pulgar y meñique doblados',
    samples: [
      { vector: buildStaticVector([88, 8, 8, 0, 88]), at: now },
      { vector: buildStaticVector([86, 10, 10, 0, 86]), at: now + 50 },
      { vector: buildStaticVector([90, 7, 7, 0, 90]), at: now + 100 },
    ],
  },
]

export const ALL_CANONICAL = [...CANONICAL_SIGNS, ...CANONICAL_VOWELS]

/**
 * Guarda las señas canónicas maestras de forma permanente en localStorage («guardar para siempre»).
 * Si ya existen señas grabadas por el usuario, se combinan sin sobreescribir las personalizadas.
 *
 * @param {object} currentTraining estado actual de entrenamiento
 * @returns {object} estado de entrenamiento actualizado y persistido
 */
export function saveCanonicalSigns(currentTraining) {
  let merged = currentTraining || { version: 2, signs: [] }

  for (const canonical of ALL_CANONICAL) {
    merged = withSamples(merged, canonical.label, canonical.samples, {
      handMode: canonical.handMode,
      gestureType: canonical.gestureType,
    })
  }

  return saveTraining(merged)
}

/**
 * Guarda exclusivamente las 5 vocales canónicas (A, E, I, O, U) en localStorage.
 */
export function saveCanonicalVowels(currentTraining) {
  let merged = currentTraining || { version: 2, signs: [] }

  for (const vowel of CANONICAL_VOWELS) {
    merged = withSamples(merged, vowel.label, vowel.samples, {
      handMode: vowel.handMode,
      gestureType: vowel.gestureType,
    })
  }

  return saveTraining(merged)
}

/**
 * Restablece el almacén de señas a las señas maestras y vocales oficiales,
 * eliminando registros corruptos o pruebas desactualizadas.
 *
 * @returns {object} estado de entrenamiento con las señas canónicas y vocales
 */
export function resetToCanonicalSigns() {
  const training = {
    version: 2,
    signs: ALL_CANONICAL.map((sign, index) => ({
      id: `canonical-${index}-${sign.label.toLowerCase()}`,
      label: sign.label,
      handMode: sign.handMode,
      gestureType: sign.gestureType,
      description: sign.description,
      createdAt: Date.now(),
      samples: sign.samples,
    })),
  }
  return saveTraining(training)
}

/** Comprueba si el entrenamiento ya tiene cargadas las señas maestras principales. */
export function hasCanonicalSigns(training) {
  if (!training?.signs || training.signs.length === 0) return false
  const labels = new Set(training.signs.map((s) => s.label.toLowerCase()))
  return ['hola', 'bien', 'gracias', 'adiós'].every((word) => labels.has(word))
}
