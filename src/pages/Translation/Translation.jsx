import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bluetooth,
  CheckCircle2,
  Copy,
  GraduationCap,
  History,
  Layers,
  Lock,
  MessageCircle,
  Pause,
  Play,
  Save,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
} from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import SectionTitle from '../../components/common/SectionTitle'
import ProgressBar from '../../components/common/ProgressBar'
import Modal from '../../components/common/Modal'
import { useAccessibility } from '../../context/accessibilityContext.js'
import { useDevices } from '../../context/deviceContext.js'
import { useHistory } from '../../context/historyContext.js'
import { useAppSpeech } from '../../hooks/useAppSpeech.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import { useGestureRecognition } from '../../hooks/useGestureRecognition.js'
import { useHelpSignal } from '../../hooks/useHelpSignal.js'
import { CONFIDENCE_THRESHOLD } from '../../services/gesture/knnClassifier.js'
import {
  DEFAULT_CALIBRATION,
  buildQuickCalibration,
  describeCalibration,
  QUICK_CALIBRATION_STEPS,
} from '../../services/bluetooth/calibration.js'
import { improveSentence, synthesizeNaturalSentence } from '../../services/gesture/sentence.js'
import { loadTraining } from '../../services/gesture/trainingStore.js'
import {
  getRecognitionSpeed,
  RECOGNITION_SPEEDS,
} from '../../services/gesture/recognitionConfig.js'
import { cn } from '../../utils/cn'
import {
  buildAlertMessage,
  isEmergencyChannelReady,
  sendAlert,
} from '../../services/emergency/sos.js'
import { loadLink } from '../../services/emergency/linkCode.js'
import {
  describeLocationAge,
  isFreshLocation,
  loadSavedLocation,
  resolveEmergencyLocation,
} from '../../services/emergency/location.js'
import { HELP_MIN_IMPULSES } from '../../services/emergency/helpSignal.js'
import { formatRelativeTime } from '../../utils/format.js'

/** Etiquetas que disparan el flujo de emergencia. */
const SOS_LABELS = /^(sos|emergencia|auxilio)$/i
/** Repeticiones necesarias para que la alerta se envíe sola. */
export const SOS_REPEATS = 3
/** Ventana en la que cuentan las repeticiones. */
export const SOS_WINDOW_MS = 15000
/** Margen para cancelar antes del envío automático. */
export const SOS_COUNTDOWN_SECONDS = 10
/** Nombre con el que se anuncia la seña física de auxilio (agitar el guante). */
export const HELP_SIGNAL_LABEL = 'Auxilio'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Translation() {
  const { entries, addEntry } = useHistory()
  const { supported: speechSupported, speak, speaking, stop: stopSpeech } = useAppSpeech()
  const { copied, error: copyError, copy } = useClipboard()
  const {
    featureVector,
    readings,
    hasReadings,
    protocolConfigured,
    gloves,
    calibration,
    applyCalibrationSettings,
  } = useDevices()

  const readingsRef = useRef(readings)
  useEffect(() => {
    readingsRef.current = readings
  }, [readings])

  const [training, setTraining] = useState(loadTraining)
  const [listening, setListening] = useState(false)
  const [words, setWords] = useState([])
  const [lastMatch, setLastMatch] = useState(null)
  const [corrected, setCorrected] = useState(null)
  const [correctionNotes, setCorrectionNotes] = useState([])
  const [sosSign, setSosSign] = useState(null)

  // ── Modo de traducción: Palabras y frases vs Deletreo (Vocales) ──
  const [translationMode, setTranslationMode] = useState(() => {
    if (typeof window === 'undefined') return 'words'
    return window.localStorage.getItem('klaps.translation.mode') || 'words'
  })

  const handleSetTranslationMode = (mode) => {
    setTranslationMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('klaps.translation.mode', mode)
    }
  }

  // ── Síntesis y Redacción con IA tras pausa de 2.2 segundos ──
  const [redactedText, setRedactedText] = useState('')
  const [isAiRedacting, setIsAiRedacting] = useState(false)
  const pendingWordsRef = useRef([])
  const aiTimerRef = useRef(null)

  // ── Asistente de auto-calibración rápida de 2 pasos ──
  const [calibratingQuick, setCalibratingQuick] = useState(false)
  const [quickModalOpen, setQuickModalOpen] = useState(false)
  const [quickStep, setQuickStep] = useState(0)
  const [quickProgress, setQuickProgress] = useState(0)
  const [quickResult, setQuickResult] = useState(() => describeCalibration(calibration))
  const [quickNotice, setQuickNotice] = useState('')

  // ── SOS por 3 repeticiones + Telegram ──
  const { preferences, updatePreference } = useAccessibility()
  const [link, setLink] = useState(loadLink)
  const [sosCount, setSosCount] = useState(0)
  const [sosPrompt, setSosPrompt] = useState(null)
  const [sosLocation, setSosLocation] = useState(null)
  const sosTimesRef = useRef([])

  const channelReady = isEmergencyChannelReady(link)
  const currentSpeed = getRecognitionSpeed(preferences.recognitionSpeed)

  // La vinculación puede cambiar en otra pantalla o pestaña.
  useEffect(() => {
    const refresh = () => setLink(loadLink())
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const signs = training.signs
  const isVowelSign = (label) => /^[aeiouáéíóú]$/i.test(String(label).trim())

  const activeSigns = useMemo(() => {
    if (translationMode === 'words') {
      return signs.filter((sign) => !isVowelSign(sign.label))
    }
    return signs
  }, [signs, translationMode])

  const connected = gloves.filter((glove) => glove.status === 'conectado').length
  const text = words.join(' ')
  const displayText = redactedText || corrected || text
  const sessionEntries = entries.filter((entry) => entry.type === 'gesto').slice(0, 5)

  // El entrenamiento puede cambiar en otra pestaña o pantalla.
  useEffect(() => {
    // Se relee al volver de la pantalla de entrenamiento o desde otra pestaña.
    const refresh = () => setTraining(loadTraining())
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const openSosPrompt = useCallback(() => {
    setSosPrompt({
      phase: channelReady ? 'countdown' : 'missing',
      countdown: SOS_COUNTDOWN_SECONDS,
      result: null,
      message: '',
    })
    speak('Emergencia')

    if (preferences.shareLocation) {
      // Si el navegador no puede dar la ubicación ahora (o tarda más que la
      // cuenta atrás), se usa la que se autorizó y guardó en /emergencia.
      resolveEmergencyLocation().then((result) => setSosLocation(result.location))
    }
  }, [channelReady, preferences.shareLocation, speak])

  /**
   * Suma una repetición de la seña de emergencia. Lo usan los dos caminos:
   * la seña entrenada que reconoce el KNN y la seña física de auxilio
   * (`useHelpSignal`), que no necesita entrenamiento.
   */
  const registerEmergencyRepeat = useCallback(
    (label, origin) => {
      // Tres repeticiones dentro de la ventana disparan la alerta.
      const now = Date.now()
      const times = [...sosTimesRef.current, now].filter((time) => now - time <= SOS_WINDOW_MS)
      sosTimesRef.current = times
      setSosCount(times.length)
      setSosSign({ label, origin, at: now, count: times.length })

      if (times.length >= SOS_REPEATS) {
        sosTimesRef.current = []
        setSosCount(0)
        openSosPrompt()
      }
    },
    [openSosPrompt],
  )

  const handleRecognize = useCallback(
    (result) => {
      const label = result.label.trim()
      if (!label) return

      setLastMatch({ label, confidence: result.confidence, at: Date.now() })
      setCorrected(null)
      setCorrectionNotes([])

      if (SOS_LABELS.test(label)) {
        registerEmergencyRepeat(label, 'sign')
        return
      }

      // Acumula la palabra captada en el historial y en el búfer de IA
      pendingWordsRef.current.push(label)
      setWords((previous) => [...previous, label])

      // Reinicia temporizador de 2.2 segundos para redacción y síntesis con IA
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current)
      }
      setIsAiRedacting(true)

      aiTimerRef.current = setTimeout(() => {
        const wordsToSynthesize = [...pendingWordsRef.current]
        if (wordsToSynthesize.length === 0) {
          setIsAiRedacting(false)
          return
        }

        const synthesized = synthesizeNaturalSentence(wordsToSynthesize)
        setRedactedText(synthesized.text)
        setIsAiRedacting(false)
        pendingWordsRef.current = []

        // Reproducir por TTS la frase fluida sintetizada
        speak(synthesized.text)
        addEntry({ type: 'gesto', text: synthesized.text, source: 'Guantes BLE (IA)' })
      }, 2200)
    },
    [registerEmergencyRepeat, speak, addEntry],
  )

  // Si un guante no envía datos, sus señas no se evalúan (evita falsos positivos con ceros).
  const availableHands = useMemo(
    () => ({ right: Boolean(readings.derecho), left: Boolean(readings.izquierdo) }),
    [readings],
  )

  const activeReading = readings.derecho || readings.izquierdo
  const activeHandFlex = activeReading?.flex ?? [0, 0, 0, 0, 0]

  const { live, resting, restReason } = useGestureRecognition({
    vector: featureVector,
    readings,
    signs: activeSigns,
    calibration,
    enabled: listening,
    availableHands,
    threshold: CONFIDENCE_THRESHOLD,
    holdMs: 1400,
    cooldownMs: currentSpeed.cooldownMs,
    flexOnly: true,
    onRecognize: handleRecognize,
  })

  // Seña física de auxilio: agitar el guante. No depende de señas entrenadas
  // ni de los flex, así que también funciona con el guante como está hoy.
  const handleHelpSignal = useCallback(
    () => registerEmergencyRepeat(HELP_SIGNAL_LABEL, 'physical'),
    [registerEmergencyRepeat],
  )

  const helpSignal = useHelpSignal({
    readings,
    enabled: listening,
    onSignal: handleHelpSignal,
  })

  const sendSos = useCallback(async () => {
    const stored = loadSavedLocation()
    const location = sosLocation ?? (isFreshLocation(stored) ? stored : null)
    const locationNote =
      !sosLocation && location ? `ubicación guardada ${describeLocationAge(location)}` : ''

    const message = buildAlertMessage({
      contactName: preferences.emergencyContact?.name || link.chatName,
      location,
      locationNote,
      repeats: SOS_REPEATS,
    })

    setSosPrompt((previous) => (previous ? { ...previous, phase: 'sending' } : previous))

    const response = await sendAlert({
      message,
      contact: preferences.emergencyContact,
      link,
    })

    setSosPrompt((previous) =>
      previous ? { ...previous, phase: 'done', result: response, message } : previous,
    )
  }, [link, preferences, sosLocation])

  // Cuenta atrás del aviso automático (el envío ocurre en el temporizador).
  useEffect(() => {
    if (sosPrompt?.phase !== 'countdown') return undefined

    const timer = window.setTimeout(() => {
      if (sosPrompt.countdown > 1) {
        setSosPrompt((previous) =>
          previous ? { ...previous, countdown: previous.countdown - 1 } : previous,
        )
      } else {
        sendSos()
      }
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [sosPrompt, sendSos])

  // ── SOS Compuesto: Puño cerrado + Agitación continua por 4.0 segundos ──
  const [sosHoldTime, setSosHoldTime] = useState(0)

  useEffect(() => {
    if (!listening) {
      return undefined
    }

    const interval = setInterval(() => {
      const activeReading = readings.derecho || readings.izquierdo
      if (!activeReading?.flex) {
        setSosHoldTime(0)
        return
      }

      const flex = activeReading.flex
      // Puño cerrado: los 4 dedos activos (pulgar, índice, medio, meñique) con flexión >= 60%
      // El anular (flex[3]) tiene raw === 0 y flex === 0, por lo que se ignora
      const activeFingers = [flex[0], flex[1], flex[2], flex[4]]
      const isFistClosed = activeFingers.every((v) => Number.isFinite(v) && v >= 60)

      // Agitación sostenida del MPU6050
      const imu = activeReading.rawImu ?? activeReading.imu
      const gyroMag = imu ? Math.hypot(imu.gx, imu.gy, imu.gz) : 0
      const isShaking = helpSignal.level >= 0.28 || gyroMag > 1.6

      if (isFistClosed && isShaking) {
        setSosHoldTime((prev) => {
          const next = prev + 100
          if (next >= 4000) {
            openSosPrompt()
            return 0
          }
          return next
        })
      } else {
        // Si abre la mano o detiene la agitación, se reinicia inmediatamente a 0
        setSosHoldTime(0)
      }
    }, 100)

    return () => {
      clearInterval(interval)
      setSosHoldTime(0)
    }
  }, [listening, readings, helpSignal.level, openSosPrompt])

  const runQuickCalibration = async () => {
    if (!hasReadings) {
      setQuickNotice('Conecta los guantes y espera a recibir lecturas antes de iniciar.')
      return
    }

    setCalibratingQuick(true)
    setQuickResult(null)
    setQuickNotice('')

    const FRAMES_PER_STEP = 20
    const snapshots = { stretched: [], closed: [] }

    try {
      // Paso 1: Mano abierta (2.0 segundos)
      setQuickStep(0)
      setQuickProgress(0)
      for (let i = 0; i < FRAMES_PER_STEP; i += 1) {
        snapshots.stretched.push({
          derecho: readingsRef.current.derecho?.rawFlex ?? readingsRef.current.derecho?.flex ?? null,
          izquierdo: readingsRef.current.izquierdo?.rawFlex ?? readingsRef.current.izquierdo?.flex ?? null,
        })
        setQuickProgress(i + 1)
        await wait(100)
      }

      // Intervalo de transición para cambiar postura
      setQuickNotice('¡Mano abierta capturada! Ahora cierra el puño firmemente...')
      await wait(1000)

      // Paso 2: Puño cerrado (2.0 segundos)
      setQuickStep(1)
      setQuickProgress(0)
      for (let i = 0; i < FRAMES_PER_STEP; i += 1) {
        snapshots.closed.push({
          derecho: readingsRef.current.derecho?.rawFlex ?? readingsRef.current.derecho?.flex ?? null,
          izquierdo: readingsRef.current.izquierdo?.rawFlex ?? readingsRef.current.izquierdo?.flex ?? null,
        })
        setQuickProgress(i + 1)
        await wait(100)
      }

      const next = buildQuickCalibration(snapshots)
      applyCalibrationSettings(next)
      const desc = describeCalibration(next)
      setQuickResult(desc)
      setQuickNotice('¡Auto-calibración completada! Canales activos y pesos asignados.')
    } finally {
      setCalibratingQuick(false)
    }
  }

  const applyCorrection = () => {
    const baseText = redactedText || text
    const { text: improved, applied } = improveSentence(baseText)
    setCorrected(improved)
    setCorrectionNotes(applied)
    speak(improved)
  }

  const clearText = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    pendingWordsRef.current = []
    setWords([])
    setRedactedText('')
    setIsAiRedacting(false)
    setCorrected(null)
    setCorrectionNotes([])
    setLastMatch(null)
    setListening(false)
  }

  const saveToHistory = () => {
    if (!displayText) return
    addEntry({ type: 'gesto', text: displayText, source: 'Guantes BLE' })
  }

  const status = useMemo(() => {
    if (!protocolConfigured) return { status: 'pendiente', label: 'Falta configurar UUID' }
    if (connected === 0) return { status: 'desconectado', label: 'Sin guantes conectados' }
    if (!hasReadings) return { status: 'conectando', label: 'Esperando tramas' }
    if (listening) return { status: 'conectado', label: 'Reconociendo' }
    return { status: 'pendiente', label: 'Listo para reconocer' }
  }, [protocolConfigured, connected, hasReadings, listening])

  return (
    <div>
      <PageHeader
        eyebrow="Traducción"
        title="Traducción de gestos"
        description="Tus guantes leen la postura de las dos manos y KLAPS la convierte en texto y voz en tiempo real."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status.status} label={status.label} />
            <Button
              variant="secondary"
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => {
                setQuickModalOpen(true)
                setQuickResult(describeCalibration(calibration))
              }}
            >
              Calibrar mano abierta / puño cerrado
            </Button>
          </div>
        }
      />

      {!protocolConfigured && (
        <ErrorMessage
          className="mb-5"
          title="Falta configurar los UUID del firmware"
          description="La app necesita el UUID del servicio y de la característica de sensores para leer la trama de 34 bytes. Los configuras en la pantalla de entrenamiento y se guardan en este navegador."
        />
      )}

      {protocolConfigured && signs.length === 0 && (
        <Card tone="butter" padding="md" className="mb-5 flex items-start gap-3">
          <GraduationCap className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="font-display font-bold text-brand-800">Todavía no hay señas entrenadas</p>
            <p className="mt-1 text-sm text-ink">
              Las palabras necesitan muestras: graba cada seña 20 veces desde el{' '}
              <Link to="/entrenamiento" className="font-semibold text-brand-700 underline underline-offset-2">
                panel de entrenamiento
              </Link>
              . La <strong className="font-semibold text-ink">seña física de auxilio</strong> (agitar
              el guante tres veces) ya funciona sin entrenar nada.
            </p>
          </div>
        </Card>
      )}

      <Card padding="lg">
        {/* Selector de modo: Palabras y frases vs Deletreo */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50/80 p-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-brand-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-brand-900">Modo de traducción</p>
              <p className="text-[0.7rem] text-ink-soft">
                {translationMode === 'words'
                  ? 'Modo Palabras: vocales A E I O U descartadas para evitar falsos positivos con palabras completas.'
                  : 'Modo Deletreo: evalúa tanto vocales como palabras.'}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 rounded-md bg-white p-1 border border-brand-200">
            <button
              type="button"
              onClick={() => handleSetTranslationMode('words')}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-bold transition-all',
                translationMode === 'words'
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-brand-800 hover:bg-brand-50',
              )}
            >
              💬 Modo Palabras y Frases
            </button>
            <button
              type="button"
              onClick={() => handleSetTranslationMode('spelling')}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-bold transition-all',
                translationMode === 'spelling'
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-brand-800 hover:bg-brand-50',
              )}
            >
              🔤 Modo Deletreo (Vocales)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">
            Texto reconocido
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <span
              className={`inline-block size-2.5 rounded-full ${listening ? 'bg-success animate-pulse-soft' : 'bg-brand-200'}`}
              aria-hidden="true"
            />
            {listening ? 'Escuchando a tus guantes…' : 'En espera'}
          </span>
        </div>

        {/* Área de texto traducido / redactado con IA */}
        <div className="mt-4 rounded-md bg-brand-50 px-4 py-5 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-brand-600" aria-hidden="true" />
              {redactedText ? 'Frase sintetizada (Español fluido)' : 'Traducción en tiempo real'}
            </span>
            {isAiRedacting && (
              <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-brand-600 animate-pulse bg-brand-100/80 px-2.5 py-0.5 rounded-full">
                <span className="size-1.5 rounded-full bg-brand-600" />
                Redactando con IA tras pausa (2.2s)...
              </span>
            )}
          </div>

          <p
            aria-live="polite"
            className="font-display text-2xl leading-snug font-extrabold text-brand-900 sm:text-3xl"
          >
            {displayText || (
              <span className="font-sans text-base font-normal text-ink-soft sm:text-lg">
                Aquí aparecerán las palabras que reconozcan tus guantes.
              </span>
            )}
          </p>

          {/* Chips de palabras reconocidas */}
          {words.length > 0 && (
            <div className="mt-3 pt-3 border-t border-brand-200/60 flex flex-wrap items-center gap-1.5">
              <span className="text-[0.7rem] font-medium text-ink-soft mr-1">Señas captadas:</span>
              {words.map((w, idx) => (
                <span
                  key={`${w}-${idx}`}
                  className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-brand-800 border border-brand-200 shadow-xs"
                >
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-4 text-brand-600" aria-hidden="true" />
            Última seña:{' '}
            <strong className="font-semibold text-ink">{lastMatch?.label ?? '—'}</strong>
            {lastMatch && ` · ${Math.round(lastMatch.confidence * 100)} %`}
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            {words.length} {words.length === 1 ? 'palabra' : 'palabras'}
          </span>
        </div>

        {/* Selector de velocidad de captación */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50/60 p-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-brand-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-brand-800">Velocidad de captación</p>
              <p className="text-[0.7rem] text-ink-soft">{currentSpeed.description}</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-full bg-white p-1 border border-brand-200">
            {Object.values(RECOGNITION_SPEEDS).map((option) => {
              const active = (preferences.recognitionSpeed || 'normal') === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updatePreference('recognitionSpeed', option.value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-bold transition-all',
                    active
                      ? 'bg-brand-600 text-white shadow-soft'
                      : 'text-brand-700 hover:bg-brand-50',
                  )}
                >
                  {option.label} ({(option.holdMs / 1000).toFixed(1)}s)
                </button>
              )
            })}
          </div>
        </div>

        {/* Indicador de Motor: 100% Flex (MPU6050 solo SOS) y barras de flexión en vivo */}
        <div className="mt-4 rounded-xl border border-brand-200 bg-linear-to-b from-brand-50/90 to-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-brand-900">
                Motor: 100% Flex (MPU6050 solo SOS)
              </span>
            </div>
            <span className="text-[0.7rem] font-semibold text-brand-700">
              Muñeca/MPU6050 peso 0 · Anular ignorado (peso 0)
            </span>
          </div>

          <p className="mt-1 text-[0.7rem] text-ink-soft">
            La coincidencia de la seña depende exclusivamente de los 4 dedos activos (tolerancia ±12%, descarte inmediato si &gt;18%). Mover la muñeca en el aire no altera el porcentaje de coincidencia.
          </p>

          {/* Barras porcentuales en vivo de los 4 dedos flex activos */}
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { id: 0, label: 'Pulgar', short: 'Pul', val: activeHandFlex[0] ?? 0 },
              { id: 1, label: 'Índice', short: 'Índ', val: activeHandFlex[1] ?? 0 },
              { id: 2, label: 'Medio', short: 'Med', val: activeHandFlex[2] ?? 0 },
              { id: 4, label: 'Meñique', short: 'Meñ', val: activeHandFlex[4] ?? 0 },
            ].map((finger) => (
              <div
                key={finger.id}
                className="rounded-lg border border-brand-200/90 bg-white p-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs font-bold text-ink">
                  <span className="flex items-center gap-1">
                    <span>{finger.short}</span>
                    <span className="text-[0.65rem] font-normal text-ink-soft">({finger.label})</span>
                  </span>
                  <span className="font-mono text-brand-800">{Math.round(finger.val)}%</span>
                </div>
                <ProgressBar
                  className="mt-1.5"
                  value={finger.val}
                  tone={finger.val >= 60 ? 'brand' : finger.val >= 25 ? 'brand' : 'ink'}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Señal en vivo: etiqueta, confianza y tiempo estabilizado */}
        <div className="mt-4 rounded-md border border-brand-100 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-ink">
              {live?.isAmbiguous
                ? 'Gesto ambiguo'
                : live?.label
                  ? `Candidata: ${live.label}`
                  : 'Sin seña estable'}
            </span>
            <span className="text-ink-soft">
              Confianza{' '}
              <strong className="font-semibold text-ink">
                {live ? `${Math.round(live.confidence * 100)} %` : '—'}
              </strong>{' '}
              · umbral estricto {Math.round(CONFIDENCE_THRESHOLD * 100)} %
            </span>
          </div>

          {/* Detección de ambigüedad entre señas cercanas */}
          {live?.isAmbiguous && live.ambiguousLabels && (
            <div className="mt-3 flex items-start gap-2.5 rounded-md bg-warning-soft px-3.5 py-2.5 text-xs text-warning border border-warning/30">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-bold">Gesto ambiguo detectado</p>
                <p className="mt-0.5 text-ink">
                  Similitud muy cercana entre <strong>«{live.ambiguousLabels[0]}»</strong> y <strong>«{live.ambiguousLabels[1]}»</strong>.
                  Define con mayor precisión la postura de los 4 dedos activos (pulgar, índice, medio, meñique) para desempatar.
                </p>
              </div>
            </div>
          )}

          {/* Cooldown activo tras una seña */}
          {live?.inCooldown && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 border border-brand-100">
              <Pause className="size-4 text-brand-600 shrink-0" aria-hidden="true" />
              <span>
                Pausa de estabilidad ({live.cooldownRemaining}s)... Relaja la mano o cambia de postura antes de la siguiente seña.
              </span>
            </div>
          )}

          {/* Bloqueo estricto anti-repetición Latch & Release */}
          {live?.latched && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 border border-brand-200">
              <Lock className="size-4 text-brand-600 shrink-0" aria-hidden="true" />
              <span>
                Postura bloqueada para <strong>«{live.latchedLabel}»</strong>. Suelta la mano o cambia de postura para desbloquear la siguiente palabra.
              </span>
            </div>
          )}

          {/* Misma seña sostenida */}
          {live?.heldSame && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-xs text-ink-soft border border-brand-100">
              <span>
                Seña <strong>«{live.label}»</strong> ya emitida. Para repetirla, suelta la postura de la mano o regresa a reposo.
              </span>
            </div>
          )}

          {/* Captando seña firme con barra de progreso */}
          {live && live.progress > 0 && !live.stable && !live.inCooldown && !live.heldSame && !live.isAmbiguous && (
            <div className="mt-3 rounded-md bg-brand-50/80 p-3 border border-brand-200">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-brand-800">
                  <span className="inline-block size-2.5 rounded-full bg-brand-600 animate-pulse" aria-hidden="true" />
                  Captando seña: «{live.label}»
                </span>
                <span className="font-mono text-xs font-bold text-brand-700">
                  {((live.progress) * (currentSpeed.holdMs / 1000)).toFixed(1)} / {(currentSpeed.holdMs / 1000).toFixed(1)} s
                </span>
              </div>
              <ProgressBar
                className="mt-2"
                value={(live.progress ?? 0) * 100}
                tone="brand"
                size="sm"
              />
              <p className="mt-1.5 text-[0.7rem] text-ink-soft">
                Mantén firme la mano {(currentSpeed.holdMs / 1000).toFixed(1)} segundos continuos para validar y reproducir la voz.
              </p>
            </div>
          )}

          {/* Seña validada */}
          {live?.stable && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-success-soft px-3 py-2 text-xs font-bold text-success border border-success/30">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span>¡Seña «{live.label}» validada y reproducida!</span>
            </div>
          )}

          {listening && sosCount > 0 && (
            <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              Señas de emergencia: {sosCount} de {SOS_REPEATS} · al llegar a {SOS_REPEATS} se envía la
              alerta a tu contacto.
            </p>
          )}

          {/* Seña física de auxilio: agitar el guante. Funciona sin entrenamiento. */}
          {listening && (
            <div className="mt-3 rounded-md border border-danger/25 bg-danger-soft/40 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-ink">Seña física de auxilio</span>
                <span className="text-xs text-ink-soft">
                  {helpSignal.impulses > 0
                    ? `Vaivén en curso (${Math.min(helpSignal.impulses, HELP_MIN_IMPULSES)} de ${HELP_MIN_IMPULSES} impulsos)`
                    : 'Agita el guante de lado a lado'}
                </span>
              </div>
              <ProgressBar
                className="mt-2"
                value={helpSignal.level * 100}
                label="Movimiento del MPU-6050"
                valueLabel={helpSignal.level >= 0.4 ? 'Detectando' : 'Quieto'}
                tone={helpSignal.level >= 0.4 ? 'danger' : 'brand'}
                size="sm"
              />
            </div>
          )}

          {/* SOS Compuesto: Puño cerrado + Agitación continua sostenida durante 4.0 segundos */}
          {listening && sosHoldTime > 0 && (
            <div className="mt-3 rounded-md bg-danger-soft p-3 border border-danger/40 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-danger">
                <span>🚨 ALERTA SOS: Puño cerrado + Agitación en curso</span>
                <span>{(sosHoldTime / 1000).toFixed(1)} / 4.0 s</span>
              </div>
              <ProgressBar
                className="mt-2"
                value={(sosHoldTime / 4000) * 100}
                tone="danger"
                size="sm"
              />
              <p className="mt-1 text-[0.7rem] text-danger">
                Mantén el puño cerrado agitando 4 segundos continuos. Si abres la mano, se cancela y reinicia a 0 de inmediato.
              </p>
            </div>
          )}

          {resting && (
            <p
              role="status"
              className="mt-3 rounded-md bg-lavender px-3 py-2 text-sm font-semibold text-brand-800"
            >
              Manos en reposo (0) — traducción pausada
              <span className="block text-xs font-normal text-ink-soft">
                {restReason === 'pose'
                  ? 'Puños cerrados con la palma hacia abajo: se reanuda al abrirlos.'
                  : 'Se reconoció la seña de pausa: se reanuda al hacer otra seña.'}
              </span>
            </p>
          )}

          {(!live || live.progress === 0) && !resting && (
            <p className="mt-3 text-xs text-ink-soft">
              {listening
                ? 'Esperando postura firme… Adopta la seña y mantén la mano estable para iniciar captación.'
                : 'Pulsa «Iniciar detección» para comenzar.'}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {listening ? (
            <Button size="lg" variant="secondary" icon={Pause} onClick={() => setListening(false)}>
              Detener
            </Button>
          ) : (
            <Button
              size="lg"
              icon={Play}
              onClick={() => setListening(true)}
              disabled={!hasReadings}
            >
              Iniciar detección
            </Button>
          )}

          <Button
            size="lg"
            variant="secondary"
            icon={Volume2}
            onClick={() => (speaking ? stopSpeech() : speak(displayText))}
            disabled={!displayText || !speechSupported}
          >
            {speaking ? 'Detener voz' : 'Reproducir'}
          </Button>

          <Button
            size="lg"
            variant="secondary"
            icon={Wand2}
            onClick={applyCorrection}
            disabled={!text}
          >
            Corregir sintaxis
          </Button>

          <Button size="lg" variant="ghost" icon={Copy} onClick={() => copy(displayText)} disabled={!displayText}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>

          <Button size="lg" variant="ghost" icon={Save} onClick={saveToHistory} disabled={!displayText}>
            Guardar
          </Button>

          <Button size="lg" variant="ghost" icon={Trash2} onClick={clearText} disabled={!text && !corrected}>
            Limpiar
          </Button>
        </div>

        {corrected && (
          <div className="mt-4 rounded-md bg-mint px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">Frase corregida</p>
            <p className="mt-1 text-sm text-ink">{corrected}</p>
            <p className="mt-2 text-xs text-ink-soft">
              Reglas aplicadas:{' '}
              {correctionNotes.length > 0 ? correctionNotes.join(' · ') : 'nada que corregir'}
            </p>
          </div>
        )}

        {!speechSupported && (
          <p className="mt-3 text-sm text-ink-soft">
            Este navegador no admite la síntesis de voz: el texto seguirá disponible en pantalla.
          </p>
        )}
        {copyError && <ErrorMessage className="mt-4" title="No se pudo copiar" description={copyError} />}
      </Card>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-brand-50 px-4 py-3">
        <p className="text-sm text-ink-soft">
          <strong className="font-semibold text-ink">{signs.length}</strong>{' '}
          {signs.length === 1 ? 'seña entrenada' : 'señas entrenadas'} ·{' '}
          <strong className="font-semibold text-ink">{connected}</strong> de 2 guantes conectados
        </p>
        <Button as={Link} to="/entrenamiento" variant="secondary" size="sm" icon={Bluetooth}>
          Calibrar y entrenar
        </Button>
      </div>

      {/* Emergencia detectada por una seña */}
      {sosSign && (
        <Card tone="danger" padding="md" className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display font-bold text-danger">Seña de emergencia detectada</p>
              <p className="mt-1 text-sm text-ink">
                {sosSign.origin === 'physical'
                  ? `Vaivén de auxilio (${sosSign.count ?? 1} de ${SOS_REPEATS}). Agita el guante ${SOS_REPEATS} veces en 15 segundos para que la alerta se envíe sola`
                  : `Se reconoció «${sosSign.label}» (${sosSign.count ?? 1} de ${SOS_REPEATS}). Repite la seña ${SOS_REPEATS} veces en 15 segundos para que la alerta se envíe sola`}
                {channelReady ? ` a ${link.chatName || 'tu contacto'}.` : '.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSosSign(null)}>
                Ignorar
              </Button>
              <Button as={Link} to="/emergencia" variant="danger" size="sm">
                Abrir emergencia
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Aviso automático tras 3 señas de SOS */}
      <Modal
        open={Boolean(sosPrompt)}
        onClose={() => setSosPrompt(null)}
        title={
          !sosPrompt
            ? ''
            : sosPrompt.phase === 'sending'
              ? 'Enviando la alerta'
              : sosPrompt.phase === 'done'
                ? sosPrompt.result?.delivered
                  ? 'Alerta enviada'
                  : 'La alerta no se envió'
                : sosPrompt.phase === 'missing'
                  ? 'Falta configurar el envío'
                  : 'Señal de emergencia detectada'
        }
        description={
          sosPrompt?.phase === 'countdown'
            ? `Se reconoció la seña de SOS ${SOS_REPEATS} veces. La alerta se enviará sola si no la cancelas.`
            : undefined
        }
        footer={
          !sosPrompt || sosPrompt.phase === 'sending' ? null : (
            <>
              {sosPrompt.phase === 'countdown' && (
                <>
                  <Button variant="secondary" onClick={() => setSosPrompt(null)} className="sm:mr-auto">
                    Cancelar
                  </Button>
                  <Button variant="danger" icon={Siren} onClick={sendSos}>
                    Enviar ahora
                  </Button>
                </>
              )}

              {sosPrompt.phase === 'missing' && (
                <>
                  <Button variant="secondary" onClick={() => setSosPrompt(null)} className="sm:mr-auto">
                    Cerrar
                  </Button>
                  <Button as={Link} to="/emergencia" variant="danger" icon={MessageCircle}>
                    Configurar Telegram
                  </Button>
                </>
              )}

              {sosPrompt.phase === 'done' && (
                <>
                  {!sosPrompt.result?.delivered && (
                    <Button variant="danger" onClick={sendSos} className="sm:mr-auto">
                      Reintentar
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setSosPrompt(null)}>
                    Cerrar
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {sosPrompt?.phase === 'countdown' && (
          <div className="text-center">
            <p aria-live="assertive" className="font-display text-6xl font-extrabold text-danger">
              {sosPrompt.countdown}
            </p>
            <p className="mt-2 text-sm text-ink">
              Se enviará por Telegram a{' '}
              <strong>{link.chatName || preferences.emergencyContact?.name || 'tu contacto'}</strong>
              {sosLocation ? ' con tu ubicación aproximada.' : '.'}
            </p>
            {!sosLocation && preferences.shareLocation && (
              <p className="mt-2 text-xs text-ink-soft">Solicitando tu ubicación…</p>
            )}
          </div>
        )}

        {sosPrompt?.phase === 'missing' && (
          <div className="space-y-2 text-sm text-ink">
            <p>
              Sin un canal conectado, KLAPS no puede avisar a nadie: el mensaje se prepararía pero no
              saldría de este dispositivo. No se simula un envío.
            </p>
            <p className="text-ink-soft">
              Ve a <strong className="text-ink">Emergencia SOS</strong>, crea el bot con @BotFather y
              elige el contacto. Después vuelve aquí: la seña de SOS enviará la alerta sola.
            </p>
          </div>
        )}

        {sosPrompt?.phase === 'sending' && (
          <p className="text-sm text-ink">Esperando la respuesta de Telegram…</p>
        )}

        {sosPrompt?.phase === 'done' && (
          <div className="space-y-3 text-sm">
            <p
              className={
                sosPrompt.result?.delivered ? 'font-semibold text-success' : 'font-semibold text-danger'
              }
            >
              {sosPrompt.result?.reason}
            </p>
            <pre className="overflow-x-auto rounded-md bg-brand-50 p-3 text-xs whitespace-pre-wrap text-ink">
              {sosPrompt.message}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={Copy} onClick={() => copy(sosPrompt.message)}>
                {copied ? 'Copiado' : 'Copiar mensaje'}
              </Button>
              {preferences.emergencyContact?.phone && (
                <Button
                  as="a"
                  href={`tel:${preferences.emergencyContact.phone}`}
                  size="sm"
                  variant="secondary"
                >
                  Llamar a {preferences.emergencyContact.name || 'contacto'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal del Asistente de Calibración Rápida Min-Max */}
      <Modal
        open={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        title="Calibrar mano abierta / puño cerrado"
        description="Mide los valores crudos del ADC (openRaw y closedRaw) para calcular el 0% al abrir la mano y 100% al cerrar el puño. El anular desconectado (raw 0) se ignora con peso 0."
        footer={
          <div className="flex w-full flex-wrap justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                applyCalibrationSettings(DEFAULT_CALIBRATION)
                setQuickResult(describeCalibration(DEFAULT_CALIBRATION))
                setQuickNotice('Valores medidos de fábrica del ESP32-D restablecidos con éxito.')
              }}
              disabled={calibratingQuick}
            >
              Restablecer valores medidos
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setQuickModalOpen(false)}
                disabled={calibratingQuick}
              >
                Cerrar
              </Button>
              <Button
                onClick={runQuickCalibration}
                disabled={calibratingQuick || !hasReadings}
              >
                {calibratingQuick ? 'Calibrando…' : 'Iniciar calibración (4 seg)'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-brand-900 mb-1">
              <span>Paso {quickStep + 1} de 2: {QUICK_CALIBRATION_STEPS[quickStep]?.label}</span>
              <span>{(quickProgress / 10).toFixed(1)} / 2.0 s</span>
            </div>
            <p className="text-xs text-ink-soft">
              {QUICK_CALIBRATION_STEPS[quickStep]?.instruction}
            </p>

            {calibratingQuick && (
              <ProgressBar
                className="mt-2"
                value={(quickProgress / 20) * 100}
                tone="brand"
                size="sm"
              />
            )}

            {quickNotice && (
              <p className="mt-2 text-xs font-semibold text-brand-800">{quickNotice}</p>
            )}
          </div>

          {quickResult && (
            <div className="rounded-md border border-brand-200 bg-white p-3">
              <p className="text-xs font-bold text-brand-900">{quickResult.summary}</p>
              <p className="text-[0.72rem] text-ink-soft mt-0.5">
                {quickResult.activeFlexCount} activos (peso 1.4) · {quickResult.deadFlexCount} inactivos / muertos (peso 0.0)
              </p>

              <div className="mt-2.5 space-y-1 text-xs">
                {quickResult.fingerChannels?.map((ch) => (
                  <div
                    key={ch.finger}
                    className="flex items-center justify-between rounded bg-brand-50/60 px-2 py-1"
                  >
                    <span className="font-semibold text-ink">{ch.name}:</span>
                    <span className={ch.isActive ? 'font-bold text-success' : 'font-bold text-warning'}>
                      {ch.statusText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasReadings && (
            <p className="text-xs text-warning font-semibold">
              ⚠️ Conecta tus guantes BLE y espera a recibir tramas para iniciar la calibración.
            </p>
          )}
        </div>
      </Modal>

      <section aria-labelledby="sesion-titulo" className="mt-6">
        <SectionTitle
          id="sesion-titulo"
          title="Traducciones de esta sesión"
          description="Puedes guardar cada frase en tu historial."
          action={
            <Button as={Link} to="/historial" variant="ghost" size="sm" iconRight={ArrowRight}>
              Historial
            </Button>
          }
        />

        <div className="mt-3">
          {sessionEntries.length === 0 ? (
            <p className="flex items-center gap-2 rounded-md border border-dashed border-brand-200 bg-white/70 px-4 py-5 text-sm text-ink-soft">
              <History className="size-4 shrink-0" aria-hidden="true" />
              Todavía no has traducido ningún gesto en esta sesión.
            </p>
          ) : (
            <ul className="space-y-2">
              {sessionEntries.map((entry) => (
                <li key={entry.id}>
                  <Card padding="sm" className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-sm font-semibold text-ink">{entry.text}</p>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
