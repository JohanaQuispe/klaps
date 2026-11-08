/**
 * Reconocimiento de voz (Web Speech API).
 *
 * La API todavía es experimental y solo está en algunos navegadores
 * (Chrome y Edge en escritorio, Chrome en Android). KLAPS comprueba el
 * soporte antes de ofrecer el botón de micrófono.
 */

export function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function isRecognitionSupported() {
  return Boolean(getRecognitionConstructor())
}

/** Mensajes de error comprensibles, con la acción recomendada. */
export const RECOGNITION_ERRORS = {
  'not-allowed':
    'No diste permiso al micrófono. Actívalo en los ajustes del navegador y vuelve a intentarlo.',
  'service-not-allowed':
    'El navegador bloqueó el servicio de reconocimiento. Revisa los permisos del micrófono.',
  'audio-capture': 'No se encontró un micrófono disponible en este dispositivo.',
  'no-speech': 'No se detectó voz. Acércate al micrófono y vuelve a intentarlo.',
  network: 'El reconocimiento necesita conexión y no se pudo completar. Revisa tu red.',
  aborted: 'La escucha se detuvo antes de terminar.',
  'language-not-supported': 'Este navegador no admite el reconocimiento en español.',
}

export function describeRecognitionError(code) {
  return RECOGNITION_ERRORS[code] ?? 'No se pudo completar el reconocimiento de voz.'
}

export function createRecognition(options = {}) {
  const Recognition = getRecognitionConstructor()
  if (!Recognition) return null

  const recognition = new Recognition()
  recognition.lang = options.lang ?? 'es-ES'
  recognition.continuous = options.continuous ?? true
  recognition.interimResults = options.interimResults ?? true
  recognition.maxAlternatives = 1

  return recognition
}
