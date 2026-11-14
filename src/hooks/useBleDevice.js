import { useCallback, useEffect, useRef, useState } from 'react'
import {
  describeBluetoothError,
  getBluetoothBlockReason,
  inspectDevice,
  isSecureContext,
  isWebBluetoothAvailable,
  readStandardInfo,
  requestGloveDevice,
  shortUuid,
  subscribeToCharacteristic,
  toAscii,
  toHex,
} from '../services/bluetooth/bleClient.js'

/**
 * Conexión BLE real con un guante KLAPS.
 *
 * Estados: idle → requesting → connecting → connected | error
 * También expone el registro de notificaciones y una suscripción por característica.
 */
export function useBleDevice() {
  const supported = isWebBluetoothAvailable()
  const secure = isSecureContext()
  const blockReason = getBluetoothBlockReason()

  const [status, setStatus] = useState('idle')
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [services, setServices] = useState([])
  const [standardInfo, setStandardInfo] = useState(null)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [subscriptions, setSubscriptions] = useState([])

  const serverRef = useRef(null)
  const unsubscribersRef = useRef([])
  const deviceRef = useRef(null)

  const pushLog = useCallback((entry) => {
    setLogs((previous) =>
      [{ id: `${Date.now()}-${Math.random()}`, at: Date.now(), ...entry }, ...previous].slice(0, 50),
    )
  }, [])

  const teardown = useCallback(() => {
    unsubscribersRef.current.forEach((unsubscribe) => {
      try {
        unsubscribe()
      } catch {
        // la característica ya podía estar cerrada
      }
    })
    unsubscribersRef.current = []
    setSubscriptions([])

    if (deviceRef.current?.gatt?.connected) {
      try {
        deviceRef.current.gatt.disconnect()
      } catch {
        // sin conexión que cerrar
      }
    }

    serverRef.current = null
    deviceRef.current = null
  }, [])

  const handleDisconnected = useCallback(() => {
    setStatus('idle')
    setServices([])
    setStandardInfo(null)
    setSubscriptions([])
    unsubscribersRef.current = []
    serverRef.current = null
    pushLog({ label: 'Dispositivo desconectado', hex: '', ascii: '' })
  }, [pushLog])

  const connect = useCallback(
    async ({ namePrefix, acceptAll = false, extraServices = [] } = {}) => {
      setError('')
      setLogs([])
      setServices([])
      setStandardInfo(null)
      setStatus('requesting')

      let device
      try {
        device = await requestGloveDevice({ namePrefix, acceptAll, extraServices })
      } catch (requestError) {
        if (requestError?.name === 'NotFoundError') {
          setStatus('idle')
          return
        }
        setStatus('error')
        setError(describeBluetoothError(requestError))
        return
      }

      deviceRef.current = device
      device.addEventListener('gattserverdisconnected', handleDisconnected)
      setDeviceInfo({ name: device.name || 'Guante sin nombre', id: device.id })
      setStatus('connecting')

      try {
        const { server, services: foundServices } = await inspectDevice(device)
        serverRef.current = server
        setServices(foundServices)
        setStandardInfo(await readStandardInfo(server))
        setStatus('connected')
        pushLog({
          label: `Conectado a ${device.name || 'un dispositivo'}`,
          hex: '',
          ascii: '',
        })
      } catch (connectionError) {
        setStatus('error')
        setError(describeBluetoothError(connectionError))
        teardown()
      }
    },
    [handleDisconnected, pushLog, teardown],
  )

  const disconnect = useCallback(() => {
    teardown()
    setStatus('idle')
    setServices([])
    setStandardInfo(null)
    setDeviceInfo(null)
  }, [teardown])

  const subscribe = useCallback(
    async ({ serviceUuid, characteristicUuid }) => {
      const key = `${serviceUuid}:${characteristicUuid}`
      if (subscriptions.includes(key)) return
      if (!serverRef.current) {
        setError('Conecta un guante antes de escuchar notificaciones.')
        return
      }

      try {
        const unsubscribe = await subscribeToCharacteristic(
          serverRef.current,
          serviceUuid,
          characteristicUuid,
          (value) => {
            pushLog({
              label: shortUuid(characteristicUuid),
              hex: toHex(value),
              ascii: toAscii(value),
            })
          },
        )
        unsubscribersRef.current.push(unsubscribe)
        setSubscriptions((previous) => [...previous, key])
      } catch (subscribeError) {
        setError(describeBluetoothError(subscribeError))
      }
    },
    [pushLog, subscriptions],
  )

  useEffect(() => {
    const device = deviceRef.current
    return () => {
      device?.removeEventListener?.('gattserverdisconnected', handleDisconnected)
      teardown()
    }
  }, [handleDisconnected, teardown])

  return {
    supported,
    secure,
    blockReason,
    status,
    deviceInfo,
    services,
    standardInfo,
    logs,
    error,
    subscriptions,
    connect,
    disconnect,
    subscribe,
    clearLogs: () => setLogs([]),
  }
}
