/**
 * Secuencias de gestos SIMULADAS para la pantalla de traducción.
 *
 * Los guantes reales enviarán por BLE la lectura de los sensores flex y del
 * MPU6050; esas lecturas se convertirán en palabras. Mientras el hardware no
 * esté disponible, este módulo imita esa llegada de datos, despacio y en
 * orden, para poder probar toda la interfaz.
 */

export const DEMO_SEQUENCES = [
  { id: 'seq-1', words: ['Hola,', '¿cómo', 'estás?'] },
  { id: 'seq-2', words: ['Necesito', 'agua,', 'por favor.'] },
  { id: 'seq-3', words: ['¿Puedes', 'escribirlo', 'en', 'papel?'] },
  { id: 'seq-4', words: ['Me', 'duele', 'la', 'cabeza.'] },
  { id: 'seq-5', words: ['Gracias', 'por', 'tu', 'ayuda.'] },
]

let lastIndex = -1

/** Devuelve una secuencia distinta a la anterior. */
export function pickSequence() {
  let index = Math.floor(Math.random() * DEMO_SEQUENCES.length)
  if (index === lastIndex) index = (index + 1) % DEMO_SEQUENCES.length
  lastIndex = index
  return DEMO_SEQUENCES[index]
}

export const GESTURE_LATENCY_MS = 1050
