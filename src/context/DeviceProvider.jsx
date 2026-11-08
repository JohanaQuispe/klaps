import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeviceContext } from './deviceContext.js'
import { GLOVE_STATUS, createInitialGloves, tickGlove } from '../services/bluetooth/mockGuards.js'

/**
 * Estado de los guantes KLAPS.
 *
 * `mode` es SIEMPRE explícito:
 *   'demo' → datos simulados (services/bluetooth/mockGuards.js). Es el modo
 *            actual, porque el hardware ESP32 aún no expone un servicio BLE.
 *   'real' → reservado para services/bluetooth/bleClient.js (pendiente).
 */
export default function DeviceProvider({ children }) {
  const [gloves, setGloves] = useState(createInitialGloves)
  const [mode] = useState('demo')
  const timers = useRef(new Map())

  const bluetoothSupported =
    typeof navigator !== 'undefined' && typeof navigator.bluetooth !== 'undefined'

  // Simulación: refresco suave de batería y señal mientras el guante está conectado
  useEffect(() => {
    if (mode !== 'demo') return undefined
    const interval = window.setInterval(() => {
      setGloves((prev) => prev.map(tickGlove))
    }, 3000)
    return () => window.clearInterval(interval)
  }, [mode])

  const setStatus = useCallback((id, status) => {
    setGloves((prev) => prev.map((glove) => (glove.id === id ? { ...glove, status } : glove)))
  }, [])

  const disconnect = useCallback(
    (id) => {
      setStatus(id, GLOVE_STATUS.DESCONECTADO)
      setGloves((prev) =>
        prev.map((glove) => (glove.id === id ? { ...glove, rssi: null } : glove)),
      )
    },
    [setStatus],
  )

  const reconnect = useCallback(
    (id) => {
      setStatus(id, GLOVE_STATUS.CONECTANDO)
      const existing = timers.current.get(id)
      if (existing) window.clearTimeout(existing)

      const timer = window.setTimeout(() => {
        setGloves((prev) =>
          prev.map((glove) =>
            glove.id === id
              ? { ...glove, status: GLOVE_STATUS.CONECTADO, rssi: -58, lastSyncAt: Date.now() }
              : glove,
          ),
        )
        timers.current.delete(id)
      }, 1800)

      timers.current.set(id, timer)
    },
    [setStatus],
  )

  // Limpieza de temporizadores al desmontar
  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((timer) => window.clearTimeout(timer))
      map.clear()
    }
  }, [])

  const value = useMemo(
    () => ({ gloves, mode, bluetoothSupported, disconnect, reconnect, setStatus }),
    [gloves, mode, bluetoothSupported, disconnect, reconnect, setStatus],
  )

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}
