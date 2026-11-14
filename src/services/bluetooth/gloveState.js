/**
 * Estado de los guantes KLAPS · MODO REAL
 * ---------------------------------------
 * Aquí NO hay datos simulados: todo lo que se muestra viene de la conexión
 * Bluetooth LE real (services/bluetooth/bleClient.js).
 *
 * Regla: si el guante no publica un dato, el valor es `null` y la interfaz
 * escribe «sin lectura». Nunca se inventa una batería ni una señal.
 */

export const GLOVE_STATUS = {
  CONECTADO: 'conectado',
  CONECTANDO: 'conectando',
  DESCONECTADO: 'desconectado',
  ERROR: 'error',
}

export const GLOVE_META = {
  izquierdo: {
    id: 'izquierdo',
    label: 'Guante izquierdo',
    hand: 'izquierda',
    role: 'Mano no dominante',
  },
  derecho: {
    id: 'derecho',
    label: 'Guante derecho',
    hand: 'derecha',
    role: 'Mano dominante',
  },
}

/** Estado inicial: dos guantes conocidos, apagados y sin lecturas. */
export function createInitialGloves() {
  return [
    {
      ...GLOVE_META.izquierdo,
      status: GLOVE_STATUS.DESCONECTADO,
      battery: null,
      rssi: null,
      lastSyncAt: null,
      firmware: null,
      model: null,
      deviceName: null,
      error: '',
    },
    {
      ...GLOVE_META.derecho,
      status: GLOVE_STATUS.DESCONECTADO,
      battery: null,
      rssi: null,
      lastSyncAt: null,
      firmware: null,
      model: null,
      deviceName: null,
      error: '',
    },
  ]
}

/** Batería legible (con etiqueta, nunca solo color). */
export function batteryState(battery) {
  if (battery === null || battery === undefined) {
    return { label: 'Sin lectura de batería', tone: 'neutral' }
  }
  if (battery <= 15) return { label: 'Batería crítica', tone: 'danger' }
  if (battery <= 30) return { label: 'Batería baja', tone: 'warning' }
  if (battery >= 80) return { label: 'Batería alta', tone: 'success' }
  return { label: 'Batería media', tone: 'neutral' }
}

/**
 * Calidad de señal a partir del RSSI (dBm).
 * Web Bluetooth no expone el RSSI de un dispositivo conectado, así que en la
 * práctica casi siempre será «No disponible» hasta que el firmware lo publique.
 */
export function signalState(rssi) {
  if (rssi === null || rssi === undefined) {
    return { label: 'No disponible', bars: 0, tone: 'neutral' }
  }
  if (rssi >= -60) return { label: 'Señal excelente', bars: 4, tone: 'success' }
  if (rssi >= -70) return { label: 'Señal buena', bars: 3, tone: 'success' }
  if (rssi >= -80) return { label: 'Señal débil', bars: 2, tone: 'warning' }
  return { label: 'Señal muy débil', bars: 1, tone: 'danger' }
}
