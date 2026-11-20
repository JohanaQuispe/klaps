import { useEffect, useRef, useState } from 'react'
import { createHelpSignalDetector } from '../services/emergency/helpSignal.js'

const HANDS = ['derecho', 'izquierdo']
const IDLE = { level: 0, impulses: 0 }

/**
 * Escucha la seña física de auxilio (agitar el guante) en las tramas del MPU-6050.
 *
 * Se ejecuta solo mientras la detección está activa (`enabled`), igual que el
 * clasificador: la alerta nunca se arma sola fuera de una sesión de traducción.
 * Funciona con uno o con los dos guantes conectados y no necesita señas
 * entrenadas; cada guante tiene su propio detector para que un solo movimiento
 * no se cuente dos veces.
 *
 * @param {object}   options
 * @param {object}   options.readings lecturas por guante del DeviceProvider
 * @param {boolean}  [options.enabled] detección en marcha
 * @param {Function} [options.onSignal] se llama una vez por cada vaivén válido
 * @returns {{level: number, impulses: number}} movimiento en vivo, para la pantalla
 */
export function useHelpSignal({ readings, enabled = false, onSignal } = {}) {
  const onSignalRef = useRef(onSignal)
  const detectorsRef = useRef({
    derecho: createHelpSignalDetector(),
    izquierdo: createHelpSignalDetector(),
  })
  const lastAtRef = useRef({ derecho: 0, izquierdo: 0 })
  const [live, setLive] = useState({ level: 0, impulses: 0 })

  useEffect(() => {
    onSignalRef.current = onSignal
  }, [onSignal])

  useEffect(() => {
    // Al detener la detección no debe quedar un vaivén a medio contar.
    if (!enabled) {
      detectorsRef.current.derecho.reset()
      detectorsRef.current.izquierdo.reset()
      lastAtRef.current = { derecho: 0, izquierdo: 0 }
      return
    }

    let level = 0
    let impulses = 0
    let signals = 0

    for (const hand of HANDS) {
      const reading = readings?.[hand]
      // `rawImu` es el valor absoluto del sensor; la calibración solo resta la
      // línea base, así que los cambios entre tramas son los mismos.
      const imu = reading?.rawImu ?? reading?.imu
      if (!imu) continue

      const at = reading.at ?? Date.now()
      if (at <= lastAtRef.current[hand]) continue
      lastAtRef.current[hand] = at

      const result = detectorsRef.current[hand].push(imu, at)
      level = Math.max(level, result.level)
      impulses = Math.max(impulses, result.impulses)
      if (result.signal) signals += 1
    }

    const nextLevel = Math.round(level * 10) / 10
    setLive((previous) =>
      previous.level === nextLevel && previous.impulses === impulses
        ? previous
        : { level: nextLevel, impulses },
    )

    for (let index = 0; index < signals; index += 1) onSignalRef.current?.()
  }, [readings, enabled])

  // Detenida la detección el medidor vuelve a cero sin tocar el estado.
  return enabled ? live : IDLE
}
