import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeviceContext } from './deviceContext.js'
import { GLOVE_META, GLOVE_STATUS } from '../services/bluetooth/gloveState.js'
import { BLE_GLOVES } from '../services/bluetooth/bleConfig.js'
import { useBleDevice } from '../hooks/useBleDevice.js'
import {
  buildFeatureVector,
  hasAnyReading,
  parseFrame,
} from '../services/bluetooth/sensorFrame.js'
import {
  isSensorProtocolConfigured,
  loadUuidSettings,
  saveUuidSettings,
} from '../services/bluetooth/uuidSettings.js'

/**
 * Estado de los guantes KLAPS · MODO REAL
 * ---------------------------------------
 * Cada guante tiene su propia sesión Bluetooth LE (useBleDevice).
 *
 * Además del estado de conexión, el proveedor decodifica la trama de 34 bytes
 * que envían los guantes (5 flex + 6 del MPU-6050) y publica:
 *   · readings      → última lectura de cada guante
 *   · featureVector → vector bimanual de 22 dimensiones para el clasificador
 *
 * Los UUID del servicio y de la característica se configuran desde la app
 * (services/bluetooth/uuidSettings.js) porque dependen del firmware.
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
    // Estado del flujo de sensores
    frames: session.packetCount ?? 0,
    lastFrameAt: session.lastPacket?.at ?? null,
  }
}

export default function DeviceProvider({ children }) {
  const izquierdo = useBleDevice()
  const derecho = useBleDevice()

  const [uuidSettings, setUuidSettings] = useState(loadUuidSettings)
  const attemptedSubscriptions = useRef(new Set())

  const configured = isSensorProtocolConfigured(uuidSettings)

  // Si los UUID se guardan desde otra pantalla o pestaña, se aplican sin recargar.
  useEffect(() => {
    const refresh = () => setUuidSettings(loadUuidSettings())
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const applyUuidSettings = useCallback((next) => {
    attemptedSubscriptions.current = new Set()
    setUuidSettings(saveUuidSettings(next))
  }, [])

  // Lecturas decodificadas (34 bytes → flex + MPU-6050)
  const derechoReading = useMemo(
    () => parseFrame(derecho.lastPacket?.bytes ?? null, derecho.lastPacket?.at),
    [derecho.lastPacket],
  )
  const izquierdoReading = useMemo(
    () => parseFrame(izquierdo.lastPacket?.bytes ?? null, izquierdo.lastPacket?.at),
    [izquierdo.lastPacket],
  )

  const featureVector = useMemo(
    () => buildFeatureVector({ derecho: derechoReading, izquierdo: izquierdoReading }),
    [derechoReading, izquierdoReading],
  )

  // Suscripción automática a la característica de sensores al conectar
  useEffect(() => {
    if (!configured) return

    const sessions = [
      ['derecho', derecho],
      ['izquierdo', izquierdo],
    ]

    for (const [id, session] of sessions) {
      if (session.status !== 'connected') continue
      const key = `${id}:${uuidSettings.service}:${uuidSettings.sensors}`
      if (attemptedSubscriptions.current.has(key)) continue

      attemptedSubscriptions.current.add(key)
      session.subscribe({
        serviceUuid: uuidSettings.service,
        characteristicUuid: uuidSettings.sensors,
      })
    }
  }, [configured, uuidSettings.service, uuidSettings.sensors, derecho, izquierdo])

  const connect = useCallback(
    (id) => {
      const session = id === 'izquierdo' ? izquierdo : derecho
      const glove = BLE_GLOVES[id]
      if (!session || !glove) return
      attemptedSubscriptions.current = new Set()
      session.connect({ namePrefixes: glove.namePrefixes ?? [glove.namePrefix] })
    },
    [izquierdo, derecho],
  )

  const disconnect = useCallback(
    (id) => {
      const session = id === 'izquierdo' ? izquierdo : derecho
      if (!session) return
      attemptedSubscriptions.current = new Set()
      session.disconnect()
    },
    [izquierdo, derecho],
  )

  const gloves = useMemo(
    () => [toGlove('izquierdo', izquierdo), toGlove('derecho', derecho)],
    [izquierdo, derecho],
  )

  const readings = useMemo(
    () => ({ derecho: derechoReading, izquierdo: izquierdoReading }),
    [derechoReading, izquierdoReading],
  )

  const bluetoothSupported =
    typeof navigator !== 'undefined' && typeof navigator.bluetooth !== 'undefined'

  const value = useMemo(
    () => ({
      gloves,
      mode: 'real',
      bluetoothSupported,
      protocolConfigured: configured,
      uuidSettings,
      applyUuidSettings,
      readings,
      featureVector,
      hasReadings: hasAnyReading(readings),
      packetCount: (derecho.packetCount ?? 0) + (izquierdo.packetCount ?? 0),
      connect,
      disconnect,
      // `reconnect` se mantiene como alias para no romper las pantallas existentes.
      reconnect: connect,
    }),
    [
      gloves,
      bluetoothSupported,
      configured,
      uuidSettings,
      applyUuidSettings,
      readings,
      featureVector,
      derecho.packetCount,
      izquierdo.packetCount,
      connect,
      disconnect,
    ],
  )

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}
