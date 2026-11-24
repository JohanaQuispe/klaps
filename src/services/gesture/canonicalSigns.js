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
    description: 'Mano abierta extendida con los 4 dedos activos rectos (0-5% Flex)',
    samples: [
      { vector: buildStaticVector([0, 0, 0, 0, 0]), at: now },
      { vector: buildStaticVector([2, 0, 0, 0, 0]), at: now + 50 },
      { vector: buildStaticVector([3, 2, 2, 0, 2]), at: now + 100 },
      { vector: buildStaticVector([0, 2, 0, 0, 0]), at: now + 150 },
    ],
  },
  {
    label: 'Bien',
    handMode: 'right',
    gestureType: 'static',
    description: 'Pulgar arriba (0%), índice, medio y meñique doblados en puño (75-100%)',
    samples: [
      { vector: buildStaticVector([0, 80, 98, 0, 84]), at: now },
      { vector: buildStaticVector([2, 78, 100, 0, 82]), at: now + 50 },
      { vector: buildStaticVector([0, 82, 96, 0, 85]), at: now + 100 },
      { vector: buildStaticVector([3, 90, 100, 0, 92]), at: now + 150 },
    ],
  },
  {
    label: 'Ayuda',
    handMode: 'right',
    gestureType: 'static',
    description: 'Mano en puño firme con pulgar erecto en posición de socorro',
    samples: [
      { vector: buildStaticVector([0, 78, 98, 0, 82]), at: now },
      { vector: buildStaticVector([2, 80, 100, 0, 85]), at: now + 50 },
      { vector: buildStaticVector([5, 82, 96, 0, 80]), at: now + 100 },
    ],
  },
  {
    label: 'Adiós',
    handMode: 'right',
    gestureType: 'dynamic',
    description: 'Mano abierta oscilando de lado a lado en el aire (Giroscopio gx + Flex)',
    samples: [
      { vector: buildWavingTrajectory([0, 0, 0, 0, 0]), at: now },
      { vector: buildWavingTrajectory([2, 0, 0, 0, 2]), at: now + 50 },
      { vector: buildWavingTrajectory([5, 4, 3, 0, 4]), at: now + 100 },
    ],
  },
  {
    label: 'Gracias',
    handMode: 'right',
    gestureType: 'dynamic',
    description: 'Mano extendida con avance frontal hacia adelante (Aceleración ay + Flex)',
    samples: [
      { vector: buildForwardTrajectory([0, 0, 0, 0, 0]), at: now },
      { vector: buildForwardTrajectory([2, 2, 0, 0, 2]), at: now + 50 },
      { vector: buildForwardTrajectory([5, 4, 3, 0, 4]), at: now + 100 },
    ],
  },
  {
    label: 'Por favor',
    handMode: 'right',
    gestureType: 'dynamic',
    description: 'Mano sobre el pecho con desplazamiento circular suave (Aceleración ax/ay)',
    samples: [
      { vector: buildCircularTrajectory([0, 0, 0, 0, 0]), at: now },
      { vector: buildCircularTrajectory([4, 4, 3, 0, 4]), at: now + 50 },
      { vector: buildCircularTrajectory([5, 6, 5, 0, 5]), at: now + 100 },
    ],
  },
]

export const CANONICAL_VOWELS = [
  {
    label: 'A',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal A: Puño cerrado con pulgar apoyado contra el índice doblado',
    samples: [
      { vector: buildStaticVector([100, 80, 100, 0, 82]), at: now },
      { vector: buildStaticVector([98, 78, 98, 0, 85]), at: now + 50 },
      { vector: buildStaticVector([98, 81, 100, 0, 82]), at: now + 100 },
      { vector: buildStaticVector([45, 78, 98, 0, 82]), at: now + 150 }, // pulgar semi-lateral
    ],
  },
  {
    label: 'E',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal E: Dedos curvados en garra sobre la palma apoyados en el pulgar',
    samples: [
      { vector: buildStaticVector([50, 55, 55, 0, 55]), at: now },
      { vector: buildStaticVector([52, 58, 58, 0, 58]), at: now + 50 },
      { vector: buildStaticVector([48, 52, 52, 0, 52]), at: now + 100 },
    ],
  },
  {
    label: 'I',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal I: Puño cerrado con solo el dedo meñique levantado y recto',
    samples: [
      { vector: buildStaticVector([98, 78, 98, 0, 0]), at: now },
      { vector: buildStaticVector([100, 80, 100, 0, 2]), at: now + 50 },
      { vector: buildStaticVector([96, 76, 96, 0, 5]), at: now + 100 },
    ],
  },
  {
    label: 'O',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal O: Todos los dedos curvados formando un círculo cerrado con el pulgar',
    samples: [
      { vector: buildStaticVector([40, 45, 45, 0, 45]), at: now },
      { vector: buildStaticVector([42, 48, 48, 0, 48]), at: now + 50 },
      { vector: buildStaticVector([38, 42, 42, 0, 42]), at: now + 100 },
    ],
  },
  {
    label: 'U',
    handMode: 'right',
    gestureType: 'static',
    description: 'Vocal U: Dedo índice y medio erguidos juntos, pulgar y meñique doblados',
    samples: [
      { vector: buildStaticVector([98, 0, 0, 0, 82]), at: now },
      { vector: buildStaticVector([100, 2, 2, 0, 85]), at: now + 50 },
      { vector: buildStaticVector([96, 5, 5, 0, 80]), at: now + 100 },
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
