/**
 * Opciones de accesibilidad de KLAPS.
 * Se mantienen en un módulo aparte para que el contexto solo contenga
 * el provider (Fast Refresh) y para poder reutilizarlas en cualquier pantalla.
 */

export const STORAGE_KEY = 'klaps.preferences.v1'

export const FONT_SIZES = [
  { value: 'normal', label: 'Normal' },
  { value: 'grande', label: 'Grande' },
  { value: 'muy-grande', label: 'Muy grande' },
]

export const CONTRAST_OPTIONS = [
  { value: 'normal', label: 'Estándar' },
  { value: 'alto', label: 'Alto contraste' },
]

export const MOTION_OPTIONS = [
  { value: 'auto', label: 'Como el sistema' },
  { value: 'normal', label: 'Con animaciones' },
  { value: 'reducido', label: 'Reducir movimiento' },
]

export const HAND_OPTIONS = [
  { value: 'derecha', label: 'Derecha' },
  { value: 'izquierda', label: 'Izquierda' },
]

export const EMERGENCY_GESTURES = [
  { value: 'punio-doble', label: 'Puño cerrado dos veces' },
  { value: 'palma-abierta', label: 'Palma abierta tres segundos' },
  { value: 'manos-cruzadas', label: 'Manos cruzadas' },
  { value: 'sin-gesto', label: 'Sin gesto configurado' },
]

export const DEFAULT_PREFERENCES = {
  fontSize: 'normal',
  contrast: 'normal',
  motion: 'auto',
  dominantHand: 'derecha',
  speechRate: 1,
  speechPitch: 1,
  speechVoice: '',
  emergencyContact: { name: '', phone: '' },
  emergencyGesture: 'punio-doble',
  shareLocation: false,
}
