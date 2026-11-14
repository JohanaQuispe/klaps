import { useCallback, useMemo } from 'react'
import { DeviceContext } from './deviceContext.js'
import { GLOVE_META, GLOVE_STATUS } from '../services/bluetooth/gloveState.js'
import { BLE_GLOVES, isGloveProtocolConfigured } from '../services/bluetooth/bleConfig.js'
import { useBleDevice } from '../hooks/useBleDevice.js'

/**
 * Estado de los guantes KLAPS · MODO REAL
 * ---------------------------------------
 * Cada guante tiene su propia sesión Bluetooth LE (useBleDevice). No hay
 * simulación: la batería, el firmware y el modelo salen de lo que el ESP32
 * publica de verdad; si no publica nada, el valor queda en `null`.
 *
 * La conexión siempre la inicia el usuario con un clic, porque el navegador
 * exige un gesto para abrir el selector de dispositivos.
 */

const BLE_TO_GLOVE_STATUS = {
  idle: GLOVE_STATUS.DESCONECTADO,
  requesting: GLOVE_STATUS.CONECTANDO,
  connecting: GLOVE_STATUS.CONECTANDO,
  connected: GLOVE_STATUS.CONECTADO,
  error: GLOVE_STATUS.ERROR,
}

/** Traduce una sesión BLE a la forma que consumen las pantallas. */
function toGlove(id, session) {
  const standard = session.standardInfo
  const lastLog = session.logs[0]
  const connected = session.status === 'connected'

  return {
    ...GLOVE_META[id],
    board: BLE_GLOVES[id].board,
    status: BLE_TO_GLOVE_STATUS[session.status] ?? GLOVE_STATUS.DESCONECTADO,
    battery: standard?.battery ?? null,
    // Web Bluetooth no expone el RSSI de una conexión abierta.
    rssi: null,
    lastSyncAt: connected ? (lastLog?.at ?? null) : null,
    firmware: standard?.firmware ?? null,
    model: standard?.model ?? null,
    manufacturer: standard?.manufacturer ?? null,
    deviceName: session.deviceInfo?.name ?? null,
    error: session.error ?? '',
  }
}

export default function DeviceProvider({ children }) {
  const izquierdo = useBleDevice()
  const derecho = useBleDevice()

  const connect = useCallback(
    (id) => {
      const session = id === 'izquierdo' ? izquierdo : derecho
      const glove = BLE_GLOVES[id]
      if (!session || !glove) return
      session.connect({ namePrefix: glove.namePrefix })
    },
    [izquierdo, derecho],
  )

  const disconnect = useCallback(
    (id) => {
      const session = id === 'izquierdo' ? izquierdo : derecho
      session?.disconnect()
    },
    [izquierdo, derecho],
  )

  const gloves = useMemo(
    () => [toGlove('izquierdo', izquierdo), toGlove('derecho', derecho)],
    [izquierdo, derecho],
  )

  const bluetoothSupported =
    typeof navigator !== 'undefined' && typeof navigator.bluetooth !== 'undefined'

  const value = useMemo(
    () => ({
      gloves,
      mode: 'real',
      bluetoothSupported,
      protocolConfigured: isGloveProtocolConfigured(),
      connect,
      disconnect,
      // `reconnect` se mantiene como alias para no romper las pantallas existentes.
      reconnect: connect,
    }),
    [gloves, bluetoothSupported, connect, disconnect],
  )

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}
