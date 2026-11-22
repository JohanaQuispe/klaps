/**
 * Configuración de los guantes KLAPS por Bluetooth LE.
 * -----------------------------------------------------
 * Firmware oficial: docs/firmware/klaps-guante/klaps-guante.ino
 *
 * Web Bluetooth se comunica mediante BLE (GATT). Cada guante anuncia un nombre
 * según la mano ("KLAPS_Guante_D" o "KLAPS_Guante_I") y publica la trama binaria
 * contigua de 34 bytes a 20 Hz (5 flex + 6 IMU) bajo el servicio y característica
 * propios definidos aquí.
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
   * «KLAPS_Guante_D» y «KLAPS_Guante_I» corresponden al firmware oficial;
   * los demás prefijos permiten retrocompatibilidad con placas de prueba.
   */
  namePrefixes: ['KLAPS_Guante_D', 'KLAPS_Guante_I', 'KLAPS', 'ESP32', 'Guante'],

  /**
   * Servicios que el navegador debe poder explorar además de los de la
   * conexión. El servicio propio del guante se declara aquí para que
   * Web Bluetooth permita su acceso tras el emparejamiento.
   */
  optionalServices: [
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    'battery_service',
    'device_information',
  ],

  /**
   * UUID oficiales del firmware del guante (docs/firmware/klaps-guante/klaps-guante.ino).
   */
  UUID: {
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    sensors: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // característica con NOTIFY (trama 34 B)
    gesture: null, // la clasificación se ejecuta en el navegador (KNN en JavaScript)
  },
}

/** ¿Los UUID ya permiten leer datos reales del guante? */
export function isGloveProtocolConfigured() {
  return Boolean(BLE_CONFIG.UUID.service && BLE_CONFIG.UUID.sensors)
}
