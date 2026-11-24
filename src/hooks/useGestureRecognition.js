import { useEffect, useRef, useState } from 'react'
import {
  CONFIDENCE_THRESHOLD,
  DYNAMIC_DISTANCE_SCALE,
  K,
  STATIC_DISTANCE_SCALE,
  classify,
  classifyTrajectory,
  flattenSamples,
  handDistance,
  similarityFromDistance,
} from '../services/gesture/knnClassifier.js'
import { isRestPose } from '../services/bluetooth/sensorFrame.js'
import { trajectoryFromFrames } from '../services/gesture/trajectory.js'

/** Bucle de clasificación: 20 Hz, igual que la frecuencia de la trama. */
export const LOOP_MS = 50
/**
 * Seña estática: debe mantenerse firme durante 1.4 s continuos
 * antes de darla por buena, evitando disparos accidentales en posturas intermedias.
 */
export const HOLD_MS = 1400
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
  return Boolean(available.right || available.left)
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
 * Reconocimiento en tiempo real con compensación de hardware y Latch & Release estricto:
 *
 * · Auto-detección de canales activos:
 *   Los canales flex muertos o con poco rango (< 12 %) reciben peso 0 en el cálculo.
 *
 * · Bloqueo estricto anti-repetición (Latch & Release):
 *   Al emitir una seña, queda bloqueada y no vuelve a evaluarse ninguna seña
 *   hasta que:
 *     1) La similitud con la postura previa caiga de 65 %, O
 *     2) El MPU6050 detecte movimiento de transición durante ≥ 0.6 s, O
 *     3) La mano pase a reposo físico.
 */
export function useGestureRecognition({
  vector,
  readings,
  signs,
  calibration,
  enabled = false,
  onRecognize,
  threshold = CONFIDENCE_THRESHOLD,
  holdMs = HOLD_MS,
  dynamicConfirmMs = DYNAMIC_CONFIRM_MS,
  cooldownMs = COOLDOWN_MS,
  windowFrames = DYNAMIC_WINDOW_FRAMES,
  availableHands = ALL_HANDS,
  flexOnly = false,
} = {}) {
  const vectorRef = useRef(vector)
  const samplesRef = useRef([])
  const onRecognizeRef = useRef(onRecognize)
  const handsRef = useRef(availableHands)
  const readingsRef = useRef(readings)
  const calibrationRef = useRef(calibration)
  const staticCandidateRef = useRef(null)
  const dynamicCandidateRef = useRef(null)
  const bufferRef = useRef([])
  const cooldownUntilRef = useRef(0)

  // Bloqueo Latch & Release
  const latchedRef = useRef(null)
  const motionDurationRef = useRef(0)

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
    calibrationRef.current = calibration
  }, [calibration])

  useEffect(() => {
    samplesRef.current = flattenSamples(signs)
  }, [signs])

  useEffect(() => {
    staticCandidateRef.current = null
    dynamicCandidateRef.current = null
    bufferRef.current = []
    cooldownUntilRef.current = 0
    latchedRef.current = null
    motionDurationRef.current = 0
    if (!enabled) return undefined

    const timer = window.setInterval(() => {
      const current = vectorRef.current
      const hands = handsRef.current ?? ALL_HANDS
      const samples = (samplesRef.current ?? []).filter((sample) =>
        hasRequiredHands(sample.handMode, hands),
      )

      // Máscara de canales flex activos para asignarles peso 0 a los muertos/saturados
      const activeMask = calibrationRef.current?.flex?.valid ?? null

      // ── 0. Reposo: puños cerrados hacia abajo ─────────────────────────
      const enterRest = (reason) => {
        staticCandidateRef.current = null
        dynamicCandidateRef.current = null
        bufferRef.current = []
        latchedRef.current = null
        motionDurationRef.current = 0
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

      // Las manos se movieron: se sale del reposo
      setRestReason('')

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()

      // ── Control de Latch & Release ────────────────────────────────────
      if (latchedRef.current) {
        const latchedVector = latchedRef.current.vector
        const latchedDist = handDistance(current, latchedVector, 'both', 'static', activeMask, flexOnly)
        const latchedSim = similarityFromDistance(latchedDist, STATIC_DISTANCE_SCALE)

        // Detección de movimiento de transición por MPU6050
        const imuD = readingsRef.current?.derecho?.rawImu ?? readingsRef.current?.derecho?.imu
        const imuI = readingsRef.current?.izquierdo?.rawImu ?? readingsRef.current?.izquierdo?.imu
        const gyroD = imuD ? Math.hypot(imuD.gx, imuD.gy, imuD.gz) : 0
        const gyroI = imuI ? Math.hypot(imuI.gx, imuI.gy, imuI.gz) : 0
        const maxGyro = Math.max(gyroD, gyroI)

        if (maxGyro > 1.2) {
          motionDurationRef.current += LOOP_MS
        } else {
          motionDurationRef.current = Math.max(0, motionDurationRef.current - LOOP_MS * 0.5)
        }

        // Criterios de liberación obligatorios:
        // 1) Similitud cae de 68 % o distancia aumenta (cambió de postura de dedos)
        // 2) Movimiento sostenido de transición durante ≥ 0.5 s
        // 3) Paso a reposo físico
        const released = latchedSim < 0.68 || latchedDist > 14.5 || motionDurationRef.current >= 500

        if (released) {
          latchedRef.current = null
          motionDurationRef.current = 0
        } else {
          // Permanece bloqueado para evitar repeticiones en bucle
          staticCandidateRef.current = null
          setLive({
            label: latchedRef.current.label,
            confidence: 1,
            distance: latchedDist,
            handMode: 'both',
            mode: 'static',
            progress: 1,
            stable: false,
            latched: true,
            latchedLabel: latchedRef.current.label,
          })
          return
        }
      }

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
        const dynamicResult = trajectory
          ? classifyTrajectory(trajectory, dynamicSamples, K, DYNAMIC_DISTANCE_SCALE, activeMask, false)
          : null
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
              latchedRef.current = { label: dynamicResult.label, vector: [...current], at: now }
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

      if (handledByDynamic) return

      // ── 2. Fotograma (señas estáticas) ──────────────────────────────────
      if (staticSamples.length === 0) {
        setLive(null)
        return
      }

      const result = classify(current, staticSamples, K, STATIC_DISTANCE_SCALE, activeMask, true)

      // Seña «0» aprendida: pausa en lugar de palabra
      if (
        result &&
        REST_SIGN_LABELS.test(String(result.label).trim()) &&
        result.confidence >= threshold
      ) {
        enterRest('sign')
        return
      }

      // Descartar gestos ambiguos o por debajo del umbral estricto (≥ 85 %)
      if (!result || result.confidence < threshold || result.isAmbiguous) {
        staticCandidateRef.current = null
        setLive(
          result
            ? liveState(result, 0, false, 'static', { inCooldown, cooldownRemaining })
            : null,
        )
        return
      }

      // Enfriamiento entre señas
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

      // Acumular tiempo de estabilización (Hold Time)
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
        // Bloquear inmediatamente para obligar a soltar la postura
        latchedRef.current = { label: result.label, vector: [...current], at: now }
        motionDurationRef.current = 0
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
      latchedRef.current = null
      motionDurationRef.current = 0
    }
  }, [enabled, threshold, holdMs, dynamicConfirmMs, cooldownMs, windowFrames, flexOnly])

  return {
    live: enabled ? live : null,
    emitted,
    resting: enabled ? Boolean(restReason) : false,
    restReason: enabled ? restReason : '',
  }
}
