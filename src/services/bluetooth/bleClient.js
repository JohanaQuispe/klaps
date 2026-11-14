import { BLE_CONFIG } from './bleConfig.js'

/**
 * Cliente Web Bluetooth (BLE) para los guantes KLAPS.
 *
 * Todo lo que hay aquí es API real del navegador: no simula nada.
 * La pantalla de diagnóstico usa este módulo para descubrir qué publica
 * realmente el ESP32 (servicios, características y notificaciones).
 */

export function isWebBluetoothAvailable() {
  return typeof navigator !== 'undefined' && typeof navigator.bluetooth !== 'undefined'
}

/** ¿El contexto es seguro? Web Bluetooth solo funciona en HTTPS o localhost. */
export function isSecureContext() {
  if (typeof window === 'undefined') return false
  return window.isSecureContext || window.location.hostname === 'localhost'
}

/**
 * Motivo por el que Web Bluetooth no se puede usar en esta página.
 * Devuelve null cuando todo está en orden.
 *
 * - 'insecure-lan'  → abierto por http:// con una IP o dominio de red (no localhost)
 * - 'insecure'      → el navegador exige HTTPS
 * - 'unsupported'   → el navegador no implementa Web Bluetooth
 * - 'ssr'           → no hay window (renderizado en servidor)
 */
export function getBluetoothBlockReason() {
  if (typeof window === 'undefined') return 'ssr'

  if (!isSecureContext()) {
    const { protocol, hostname } = window.location
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.localhost')
    return protocol === 'http:' && !isLocal ? 'insecure-lan' : 'insecure'
  }

  return isWebBluetoothAvailable() ? null : 'unsupported'
}

/** Título y explicación accionable para cada motivo de bloqueo. */
export function describeBluetoothBlockReason(reason, hostname = '') {
  const address = hostname || 'esta dirección'

  switch (reason) {
    case 'insecure-lan':
      return {
        title: 'Bluetooth bloqueado: la página no es segura',
        description: `Estás abriendo ${address}. El navegador solo permite Web Bluetooth en https:// o en localhost. Abre http://localhost:5173 en el equipo donde corre el servidor, o sirve la app por HTTPS para usarla desde el móvil.`,
      }
    case 'insecure':
      return {
        title: 'Hace falta una conexión segura',
        description: 'Web Bluetooth solo funciona en HTTPS o en localhost. Abre la aplicación desde esa dirección para poder conectar el guante.',
      }
    case 'unsupported':
      return {
        title: 'Este navegador no admite Web Bluetooth',
        description: 'Se necesita Chrome, Edge u Opera en escritorio, o Chrome en Android. Safari (iOS y macOS) y Firefox no lo incluyen.',
      }
    default:
      return null
  }
}

/** Traduce los errores del navegador a mensajes comprensibles. */
export function describeBluetoothError(error) {
  const messages = {
    NotFoundError:
      'No elegiste ningún dispositivo (o el navegador no encontró ninguno con ese nombre).',
    SecurityError: 'El navegador bloqueó la conexión por permisos o por falta de HTTPS.',
    NetworkError: 'El guante se desconectó o no respondió durante la conexión.',
    InvalidStateError: 'Ya hay una petición de Bluetooth en curso. Espera un momento.',
    NotSupportedError: 'El dispositivo no ofrece el servicio o la característica solicitada.',
    NotAllowedError: 'No se autorizó el acceso a Bluetooth. Revisa los permisos del navegador.',
  }
  return messages[error?.name] ?? error?.message ?? 'No se pudo completar la operación Bluetooth.'
}

/**
 * Abre el selector de dispositivos del navegador.
 * Debe llamarse desde un clic del usuario.
 */
export async function requestGloveDevice({ namePrefix, acceptAll = false, extraServices = [] } = {}) {
  if (!isWebBluetoothAvailable()) {
    throw new Error('Este navegador no admite Web Bluetooth.')
  }

  /**
   * El navegador solo permite leer los servicios declarados de antemano.
   * `extraServices` añade los UUID propios del guante sin tocar el código.
   */
  const optionalServices = [...new Set([...BLE_CONFIG.optionalServices, ...extraServices])]
  const options =
    acceptAll || !namePrefix
      ? { acceptAllDevices: true, optionalServices }
      : { filters: [{ namePrefix }], optionalServices }

  return navigator.bluetooth.requestDevice(options)
}

/** ¿Tiene forma de UUID de Bluetooth (16 o 128 bits)? */
export function isValidUuid(value = '') {
  const uuid = value.trim().toLowerCase()
  return (
    /^[0-9a-f]{4}$/.test(uuid) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)
  )
}

/** Convierte una característica en un objeto serializable (para la interfaz). */
function serializeCharacteristic(characteristic) {
  return {
    uuid: characteristic.uuid,
    properties: {
      read: Boolean(characteristic.properties.read),
      write: Boolean(characteristic.properties.write),
      writeWithoutResponse: Boolean(characteristic.properties.writeWithoutResponse),
      notify: Boolean(characteristic.properties.notify),
      indicate: Boolean(characteristic.properties.indicate),
    },
    canSubscribe: Boolean(characteristic.properties.notify || characteristic.properties.indicate),
    canRead: Boolean(characteristic.properties.read),
  }
}

/** Conecta y enumera todos los servicios y características visibles. */
export async function inspectDevice(device) {
  const server = await device.gatt.connect()
  const services = await server.getPrimaryServices()

  const result = []
  for (const bluetoothService of services) {
    const characteristics = await bluetoothService.getCharacteristics()
    result.push({
      uuid: bluetoothService.uuid,
      characteristics: characteristics.map(serializeCharacteristic),
    })
  }

  return { server, services: result }
}

/** Lee la batería y los datos de identificación cuando el dispositivo los ofrece. */
export async function readStandardInfo(server) {
  const info = { battery: null, manufacturer: null, model: null, firmware: null }

  try {
    const service = await server.getPrimaryService('battery_service')
    const characteristic = await service.getCharacteristic('battery_level')
    const value = await characteristic.readValue()
    info.battery = value.getUint8(0)
  } catch {
    // El guante no expone el servicio estándar de batería
  }

  const readString = async (uuid) => {
    try {
      const service = await server.getPrimaryService('device_information')
      const characteristic = await service.getCharacteristic(uuid)
      const value = await characteristic.readValue()
      return new TextDecoder().decode(value).replace(/\0/g, '').trim()
    } catch {
      return null
    }
  }

  info.manufacturer = await readString('manufacturer_name_string')
  info.model = await readString('model_number')
  info.firmware = await readString('firmware_revision_string')

  return info
}

/** Suscribe a las notificaciones de una característica y entrega los bytes. */
export async function subscribeToCharacteristic(server, serviceUuid, characteristicUuid, onValue) {
  const service = await server.getPrimaryService(serviceUuid)
  const characteristic = await service.getCharacteristic(characteristicUuid)
  await characteristic.startNotifications()

  const handler = (event) => onValue(event.target.value)
  characteristic.addEventListener('characteristicvaluechanged', handler)

  return () => {
    characteristic.removeEventListener('characteristicvaluechanged', handler)
    characteristic.stopNotifications().catch(() => {})
  }
}

/** DataView → «01 2a ff …» */
export function toHex(value) {
  if (!value) return ''
  const bytes = []
  for (let i = 0; i < value.byteLength; i++) {
    bytes.push(value.getUint8(i).toString(16).padStart(2, '0'))
  }
  return bytes.join(' ')
}

/** DataView → texto imprimible (útil para tramas ASCII tipo «HOLA») */
export function toAscii(value) {
  if (!value) return ''
  let text = ''
  for (let i = 0; i < value.byteLength; i++) {
    const code = value.getUint8(i)
    text += code >= 32 && code <= 126 ? String.fromCharCode(code) : '·'
  }
  return text
}

/** UUID corto para la interfaz (0x180f se lee mejor que la cadena completa). */
export function shortUuid(uuid) {
  const match = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i.exec(uuid)
  return match ? `0x${match[1]}` : uuid
}
