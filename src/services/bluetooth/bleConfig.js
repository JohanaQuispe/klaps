/**
 * Configuración de los guantes KLAPS por Bluetooth LE.
 * -----------------------------------------------------
 * ⚠️ ESTADO: pendiente de los datos del firmware.
 *
 * Web Bluetooth solo puede hablar con dispositivos **BLE (GATT)**. Si el ESP32
 * está programado con Bluetooth clásico (SPP / "BluetoothSerial"), el navegador
 * no podrá conectarse: hay que recompilar el firmware con BLE.
 *
 * Lo único imprescindible para leer datos reales son los UUID del servicio y de
 * la característica que publica el guante. Se obtienen con la pantalla
 * `/dispositivos/diagnostico` (que lista todo lo que expone el dispositivo).
 *
 * Cuando los tengas, rellena `UUID` y la interfaz empezará a leer valores reales.
 */

/** Nombres anunciados por los guantes (se usan como filtro en el selector del navegador). */
export const BLE_GLOVES = {
  derecho: {
    id: 'derecho',
    label: 'Guante derecho',
    board: 'ESP32-D',
    // Nombres que puede anunciar la placa derecha (se prueban todos).
    namePrefixes: ['KLAPS_Guante_D', 'KLAPS-D', 'ESP32-D'],
    namePrefix: 'KLAPS_Guante_D',
  },
  izquierdo: {
    id: 'izquierdo',
    label: 'Guante izquierdo',
    board: 'ESP32-U',
    // Nombres que puede anunciar la placa izquierda (se prueban todos).
    namePrefixes: ['KLAPS_Guante_I', 'KLAPS-U', 'ESP32-U'],
    namePrefix: 'KLAPS_Guante_I',
  },
}

export const BLE_CONFIG = {
  /**
   * Prefijos aceptados al buscar dispositivos.
   * «ESP32» es el prefijo por defecto de fábrica; «KLAPS» permite acotar
   * cuando renombres los guantes en el firmware.
   */
  namePrefixes: ['KLAPS', 'ESP32', 'Guante'],

  /**
   * Servicios que el navegador debe poder explorar además de los de la
   * conexión. battery_service y device_information son estándar y no cuestan
   * nada; el servicio propio del guante hay que añadirlo aquí en cuanto
   * exista su UUID.
   */
  optionalServices: ['battery_service', 'device_information'],

  /** UUID del firmware del guante. Rellenar cuando se conozcan. */
  UUID: {
    service: null, // p. ej. '0000abcd-0000-1000-8000-00805f9b34fb'
    sensors: null, // característica con los sensores flex / MPU6050
    gesture: null, // característica con el gesto reconocido
  },
}

/** ¿Los UUID ya permiten leer datos reales del guante? */
export function isGloveProtocolConfigured() {
  return Boolean(BLE_CONFIG.UUID.service && BLE_CONFIG.UUID.sensors)
}
