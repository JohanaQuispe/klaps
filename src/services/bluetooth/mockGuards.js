/**
 * MODO DEMOSTRACIÓN · Datos simulados de los guantes KLAPS
 * ---------------------------------------------------------
 * Los guantes reales (ESP32 + sensores flex + MPU6050) todavía no tienen
 * servicio BLE publicado, por lo que la app NO puede leer hardware.
 *
 * Todo lo que devuelve este archivo es SIMULADO y la interfaz lo muestra
 * siempre bajo la etiqueta "Modo demostración".
 *
 * Cuando el hardware esté listo:
 *   1. Configura los UUID en services/bluetooth/bleClient.js
 *   2. Cambia `mode` a 'real' en DeviceContext
 *   3. Elimina este archivo de la ruta de datos de la interfaz
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

export function createInitialGloves() {
  return [
    {
      ...GLOVE_META.izquierdo,
      status: GLOVE_STATUS.CONECTADO,
      battery: 82,
      rssi: -54,
      lastSyncAt: Date.now() - 4000,
      firmware: 'esp32-demo 0.1',
    },
    {
      ...GLOVE_META.derecho,
      status: GLOVE_STATUS.CONECTANDO,
      battery: 67,
      rssi: -71,
      lastSyncAt: Date.now() - 12000,
      firmware: 'esp32-demo 0.1',
    },
  ]
}

/** Deriva un estado de batería legible (con etiqueta, nunca solo color). */
export function batteryState(battery) {
  if (battery <= 15) return { label: 'Batería crítica', tone: 'danger' }
  if (battery <= 30) return { label: 'Batería baja', tone: 'warning' }
  if (battery >= 80) return { label: 'Batería alta', tone: 'success' }
  return { label: 'Batería media', tone: 'neutral' }
}

/** Calidad de señal a partir del RSSI (dBm). */
export function signalState(rssi) {
  if (rssi === null || rssi === undefined) return { label: 'Sin señal', bars: 0, tone: 'neutral' }
  if (rssi >= -60) return { label: 'Señal excelente', bars: 4, tone: 'success' }
  if (rssi >= -70) return { label: 'Señal buena', bars: 3, tone: 'success' }
  if (rssi >= -80) return { label: 'Señal débil', bars: 2, tone: 'warning' }
  return { label: 'Señal muy débil', bars: 1, tone: 'danger' }
}

/** Variación suave y realista de los datos simulados. */
export function tickGlove(glove) {
  if (glove.status !== GLOVE_STATUS.CONECTADO) return glove

  const battery = Math.max(5, Math.min(100, glove.battery - Math.random() * 0.03))
  const rssi = Math.max(-92, Math.min(-45, glove.rssi + (Math.random() - 0.5) * 4))

  return {
    ...glove,
    battery: Number(battery.toFixed(1)),
    rssi: Math.round(rssi),
    lastSyncAt: Date.now(),
  }
}
