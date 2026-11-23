import { useEffect, useRef, useState } from 'react'
import {
  CONFIDENCE_THRESHOLD,
  K,
  classify,
  classifyTrajectory,
  flattenSamples,
} from '../services/gesture/knnClassifier.js'
import { isRestPose } from '../services/bluetooth/sensorFrame.js'
import { trajectoryFromFrames } from '../services/gesture/trajectory.js'

/** Bucle de clasificación: 20 Hz, igual que la frecuencia de la trama. */
export const LOOP_MS = 50
/**
 * Seña estática: debe mantenerse firme durante este tiempo (~1.3 s)
 * antes de darla por buena, evitando disparos accidentales en posturas intermedias.
 */
export const HOLD_MS = 1300
/**
 * Seña dinámica: basta con que la trayectoria supere el umbral durante
 * dos ciclos (100 ms). No se exige quedarse quieto al terminar el gesto.
 */
export const DYNAMIC_CONFIRM_MS = 100
/** Tras reconocer una seña no se repite hasta pasado este tiempo (1.8 s). */
export const COOLDOWN_MS = 1800
/** Ventana deslizante de la seña dinámica: 80 fotogramas = 4 s a 20 Hz. */
export const DYNAMIC_WINDOW_FRAMES = 80

/**
 * Estado «0» (reposo). Se activa con la regla física (puños cerrados hacia
 * abajo) o al reconocer una seña entrenada con alguno de estos nombres.
 */
export const REST_SIGN_LABELS = /^(0|reposo|pausa)$/i

const ALL_HANDS = { right: true, left: true }

/** ¿Está conectado el guante (o guantes) que necesita la seña? */
function hasRequiredHands(handMode, available) {
  if (handMode === 'right') return Boolean(available.right)
  if (handMode === 'left') return Boolean(available.left)
  return Boolean(available.right && available.left)
}

const liveState = (result, progress, stable, mode, extra = {}) => ({
  label: result?.label ?? '',
  confidence: result?.confidence ?? 0,
  distance: result?.distance ?? 0,
  handMode: result?.handMode ?? 'both',
  mode,
  progress,
  stable,
  isAmbiguous: Boolean(result?.isAmbiguous),
  ambiguousLabels: result?.ambiguousLabels ?? null,
  separation: result?.separation ?? 1,
  ...extra,
})

/**
 * Reconocimiento en tiempo real con dos caminos y alta estabilidad:
 *
 * · Estáticas: cada 50 ms clasifica el fotograma y exige que la misma etiqueta
 *   se mantenga `holdMs` (por defecto 1.3 s) continua por encima del umbral (≥ 85 %),
 *   sin ambigüedad con segundas candidatas (ej. Hola vs Bien).
 *
 * · Dinámicas: mantiene una ventana deslizante de 4 s (80 fotogramas),
 *   recorta el silencio de los extremos, la resume en 16 pasos clave y la
 *   compara con las trayectorias grabadas.
 *
 * Ambas aplican un periodo de enfriamiento (`cooldownMs`, por defecto 1.8 s)
 * y exigen relajar la postura o retornar a reposo antes de poder repetir la misma palabra.
 */
export function useGestureRecognition({
  vector,
  readings,
  signs,
  enabled = false,
  onRecognize,
  threshold = CONFIDENCE_THRESHOLD,
  holdMs = HOLD_MS,
  dynamicConfirmMs = DYNAMIC_CONFIRM_MS,
  cooldownMs = COOLDOWN_MS,
  windowFrames = DYNAMIC_WINDOW_FRAMES,
  availableHands = ALL_HANDS,
} = {}) {
  const vectorRef = useRef(vector)
  const samplesRef = useRef([])
  const onRecognizeRef = useRef(onRecognize)
  const handsRef = useRef(availableHands)
  const readingsRef = useRef(readings)
  const staticCandidateRef = useRef(null)
  const dynamicCandidateRef = useRef(null)
  const bufferRef = useRef([])
  const cooldownUntilRef = useRef(0)
  const lastEmittedLabelRef = useRef(null)

  const [live, setLive] = useState(null)
  const [emitted, setEmitted] = useState(null)
  // '' = traduciendo · 'pose' = regla física · 'sign' = seña 0/REPOSO/PAUSA
  const [restReason, setRestReason] = useState('')

  useEffect(() => {
    vectorRef.current = vector
  }, [vector])

  useEffect(() => {
    onRecognizeRef.current = onRecognize
  }, [onRecognize])

  useEffect(() => {
    handsRef.current = availableHands
  }, [availableHands])

  useEffect(() => {
    readingsRef.current = readings
  }, [readings])

  useEffect(() => {
    samplesRef.current = flattenSamples(signs)
  }, [signs])

  useEffect(() => {
    staticCandidateRef.current = null
    dynamicCandidateRef.current = null
    bufferRef.current = []
    cooldownUntilRef.current = 0
    lastEmittedLabelRef.current = null
    if (!enabled) return undefined

    const timer = window.setInterval(() => {
      const current = vectorRef.current
      const hands = handsRef.current ?? ALL_HANDS
      const samples = (samplesRef.current ?? []).filter((sample) =>
        hasRequiredHands(sample.handMode, hands),
      )

      // ── 0. Reposo: puños cerrados hacia abajo ─────────────────────────
      // Al entrar en reposo, se reinicia la memoria y se permite repetir señas previas.
      const enterRest = (reason) => {
        staticCandidateRef.current = null
        dynamicCandidateRef.current = null
        bufferRef.current = []
        lastEmittedLabelRef.current = null
        setLive(null)
        setRestReason(reason)
      }

      if (isRestPose(readingsRef.current)) {
        enterRest('pose')
        return
      }

      if (!current || samples.length === 0) {
        staticCandidateRef.current = null
        dynamicCandidateRef.current = null
        setLive(null)
        setRestReason('')
        return
      }

      // Las manos se movieron: se sale del reposo y se vuelve a traducir.
      setRestReason('')

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const inCooldown = now < cooldownUntilRef.current
      const cooldownRemaining = inCooldown
        ? Math.max(0.1, Number(((cooldownUntilRef.current - now) / 1000).toFixed(1)))
        : 0

      const dynamicSamples = samples.filter((sample) => sample.type === 'dynamic')
      const staticSamples = samples.filter((sample) => sample.type !== 'dynamic')

      // ── 1. Trayectoria (señas dinámicas) ────────────────────────────────
      let handledByDynamic = false

      if (dynamicSamples.length > 0) {
        const buffer = bufferRef.current
        buffer.push(current)
        if (buffer.length > windowFrames) buffer.splice(0, buffer.length - windowFrames)

        const trajectory = trajectoryFromFrames(buffer)
        const dynamicResult = trajectory ? classifyTrajectory(trajectory, dynamicSamples, K) : null
        const withinThreshold =
          dynamicResult &&
          dynamicResult.confidence >= threshold &&
          !inCooldown

        if (!withinThreshold) {
          dynamicCandidateRef.current = null
        } else if (REST_SIGN_LABELS.test(String(dynamicResult.label).trim())) {
          if (dynamicResult.confidence >= threshold) {
            enterRest('sign')
            return
          }
          dynamicCandidateRef.current = null
        } else {
          handledByDynamic = true
          const candidate = dynamicCandidateRef.current

          if (!candidate || candidate.label !== dynamicResult.label) {
            dynamicCandidateRef.current = { label: dynamicResult.label, since: now }
            setLive(liveState(dynamicResult, 0, false, 'dynamic'))
          } else {
            const held = now - candidate.since
            const progress = Math.min(1, held / dynamicConfirmMs)
            const ready = held >= dynamicConfirmMs

            setLive(liveState(dynamicResult, progress, ready, 'dynamic'))

            if (ready) {
              cooldownUntilRef.current = now + cooldownMs
              lastEmittedLabelRef.current = dynamicResult.label
              dynamicCandidateRef.current = null
              staticCandidateRef.current = null
              bufferRef.current = []
              const result = { ...dynamicResult, mode: 'dynamic' }
              setEmitted({ ...result, at: Date.now() })
              onRecognizeRef.current?.(result)
              return
            }
          }
        }
      }

      // La trayectoria tiene prioridad: no se mezcla con la clasificación estática.
      if (handledByDynamic) return

      // ── 2. Fotograma (señas estáticas) ──────────────────────────────────
      if (staticSamples.length === 0) {
        setLive(null)
        return
      }

      const result = classify(current, staticSamples, K)

      // Seña «0» aprendida: pausa en lugar de palabra.
      if (
        result &&
        REST_SIGN_LABELS.test(String(result.label).trim()) &&
        result.confidence >= threshold
      ) {
        enterRest('sign')
        return
      }

      // Descartar gestos ambiguos o por debajo del umbral estricto
      if (!result || result.confidence < threshold || result.isAmbiguous) {
        staticCandidateRef.current = null

        // Si la postura se desarmó claramente, liberar la última seña emitida
        if (!result || result.confidence < threshold * 0.6) {
          lastEmittedLabelRef.current = null
        }

        setLive(
          result
            ? liveState(result, 0, false, 'static', { inCooldown, cooldownRemaining })
            : null,
        )
        return
      }

      // Si la seña es la misma que se acaba de emitir, exigir relajar la postura antes de repetir
      if (result.label === lastEmittedLabelRef.current) {
        staticCandidateRef.current = null
        setLive(
          liveState(result, 1, false, 'static', {
            heldSame: true,
            inCooldown,
            cooldownRemaining,
          }),
        )
        return
      }

      // Si estamos en ventana de cooldown tras otra seña, no acumular hold time
      if (inCooldown) {
        staticCandidateRef.current = null
        setLive(
          liveState(result, 0, false, 'static', {
            inCooldown: true,
            cooldownRemaining,
          }),
        )
        return
      }

      // Acumular tiempo de estabilización (Hold Time de ~1.3 s)
      const candidate = staticCandidateRef.current
      if (!candidate || candidate.label !== result.label) {
        staticCandidateRef.current = { label: result.label, since: now }
        setRestReason('')
        setLive(liveState(result, 0, false, 'static'))
        return
      }

      const held = now - candidate.since
      const progress = Math.min(1, held / holdMs)
      const readyToEmit = held >= holdMs

      setLive(liveState(result, progress, readyToEmit, 'static'))

      if (readyToEmit) {
        cooldownUntilRef.current = now + cooldownMs
        lastEmittedLabelRef.current = result.label
        staticCandidateRef.current = null
        const payload = { ...result, mode: 'static' }
        setEmitted({ ...payload, at: Date.now() })
        onRecognizeRef.current?.(payload)
      }
    }, LOOP_MS)

    return () => {
      window.clearInterval(timer)
      staticCandidateRef.current = null
      dynamicCandidateRef.current = null
      bufferRef.current = []
      lastEmittedLabelRef.current = null
    }
  }, [enabled, threshold, holdMs, dynamicConfirmMs, cooldownMs, windowFrames])

  // Al detener, la interfaz no debe seguir mostrando la última candidata.
  return {
    live: enabled ? live : null,
    emitted,
    resting: enabled ? Boolean(restReason) : false,
    restReason: enabled ? restReason : '',
  }
}
