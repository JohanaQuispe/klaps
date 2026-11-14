import { useEffect, useRef, useState } from 'react'
import {
  CONFIDENCE_THRESHOLD,
  K,
  classify,
  flattenSamples,
} from '../services/gesture/knnClassifier.js'

/** Bucle de clasificación: 20 Hz, igual que la frecuencia de la trama. */
export const LOOP_MS = 50
/** La misma seña debe mantenerse este tiempo antes de darla por buena. */
export const HOLD_MS = 600
/** Tras reconocer una seña no se repite hasta pasado este tiempo. */
export const COOLDOWN_MS = 1500

/**
 * Reconocimiento en tiempo real con estabilización (anti-rebote).
 *
 * Cada 50 ms clasifica el vector bimanual contra las muestras entrenadas.
 * Solo emite cuando la confianza supera el umbral Y la misma etiqueta se
 * mantiene estable durante `holdMs`; después aplica un tiempo de espera para
 * no repetir la palabra mientras la mano sigue en la misma postura.
 */
export function useGestureRecognition({
  vector,
  signs,
  enabled = false,
  onRecognize,
  threshold = CONFIDENCE_THRESHOLD,
  holdMs = HOLD_MS,
  cooldownMs = COOLDOWN_MS,
} = {}) {
  const vectorRef = useRef(vector)
  const samplesRef = useRef([])
  const onRecognizeRef = useRef(onRecognize)
  const candidateRef = useRef(null)
  const cooldownUntilRef = useRef(0)

  const [live, setLive] = useState(null)
  const [emitted, setEmitted] = useState(null)

  useEffect(() => {
    vectorRef.current = vector
  }, [vector])

  useEffect(() => {
    onRecognizeRef.current = onRecognize
  }, [onRecognize])

  useEffect(() => {
    samplesRef.current = flattenSamples(signs)
  }, [signs])

  useEffect(() => {
    candidateRef.current = null
    cooldownUntilRef.current = 0
    if (!enabled) return undefined

    const timer = window.setInterval(() => {
      const samples = samplesRef.current
      const current = vectorRef.current

      if (!samples || samples.length === 0 || !current) {
        candidateRef.current = null
        setLive(null)
        return
      }

      const result = classify(current, samples, K)
      if (!result) {
        candidateRef.current = null
        setLive(null)
        return
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

      if (result.confidence < threshold) {
        candidateRef.current = null
        setLive({ label: result.label, confidence: result.confidence, progress: 0, stable: false })
        return
      }

      if (!candidateRef.current || candidateRef.current.label !== result.label) {
        candidateRef.current = { label: result.label, since: now }
        setLive({ label: result.label, confidence: result.confidence, progress: 0, stable: false })
        return
      }

      const held = now - candidateRef.current.since
      const progress = Math.min(1, held / holdMs)
      const readyToEmit = held >= holdMs && now >= cooldownUntilRef.current

      setLive({
        label: result.label,
        confidence: result.confidence,
        progress,
        stable: readyToEmit,
      })

      if (readyToEmit) {
        cooldownUntilRef.current = now + cooldownMs
        candidateRef.current = null
        setEmitted({ ...result, at: Date.now() })
        onRecognizeRef.current?.(result)
      }
    }, LOOP_MS)

    return () => {
      window.clearInterval(timer)
      candidateRef.current = null
    }
  }, [enabled, threshold, holdMs, cooldownMs])

  // Al detener, la interfaz no debe seguir mostrando la última candidata.
  return { live: enabled ? live : null, emitted }
}
