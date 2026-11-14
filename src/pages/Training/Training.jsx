import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bluetooth,
  Download,
  Hand,
  Play,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import SectionTitle from '../../components/common/SectionTitle'
import ProgressBar from '../../components/common/ProgressBar'
import SegmentedControl from '../../components/common/SegmentedControl'
import { useDevices } from '../../context/deviceContext.js'
import { useGestureRecognition } from '../../hooks/useGestureRecognition.js'
import { isValidUuid } from '../../services/bluetooth/uuidSettings.js'
import {
  CALIBRATION_FRAMES,
  CALIBRATION_SETTLE_MS,
  CALIBRATION_STEPS,
  buildCalibration,
  describeCalibration,
} from '../../services/bluetooth/calibration.js'
import {
  CONFIDENCE_THRESHOLD,
  DYNAMIC_STEPS,
  GESTURE_TYPE_LABELS,
  HAND_MODE_LABELS,
  flattenSamples,
  summarizeSigns,
} from '../../services/gesture/knnClassifier.js'
import { trajectoryFromFrames } from '../../services/gesture/trajectory.js'
import {
  DYNAMIC_SAMPLES,
  SAMPLE_INTERVAL_MS,
  STATIC_SAMPLES,
  exportTraining,
  importTraining,
  loadTraining,
  samplesForType,
  saveTraining,
  totalSamples,
  withSamples,
  withoutSign,
} from '../../services/gesture/trainingStore.js'
import { formatRelativeTime } from '../../utils/format.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const IMU_FIELDS = [
  ['ax', 'ax'],
  ['ay', 'ay'],
  ['az', 'az'],
  ['gx', 'gx'],
  ['gy', 'gy'],
  ['gz', 'gz'],
]

export default function Training() {
  const {
    gloves,
    readings,
    featureVector,
    hasReadings,
    protocolConfigured,
    uuidSettings,
    applyUuidSettings,
    calibration,
    applyCalibrationSettings,
    removeCalibration,
    connect,
    disconnect,
  } = useDevices()

  const vectorRef = useRef(featureVector)
  useEffect(() => {
    vectorRef.current = featureVector
  }, [featureVector])

  const readingsRef = useRef(readings)
  useEffect(() => {
    readingsRef.current = readings
  }, [readings])

  const [training, setTraining] = useState(loadTraining)
  const [serviceUuid, setServiceUuid] = useState(uuidSettings.service)
  const [sensorsUuid, setSensorsUuid] = useState(uuidSettings.sensors)

  const [label, setLabel] = useState('')
  const [handMode, setHandMode] = useState('both')
  const [gestureType, setGestureType] = useState('static')
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [testing, setTesting] = useState(false)
  const [lastTest, setLastTest] = useState(null)

  const [calibrating, setCalibrating] = useState(false)
  const [calibrationStep, setCalibrationStep] = useState(0)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [calibrationNotice, setCalibrationNotice] = useState('')

  const signs = training.signs
  const samples = flattenSamples(signs)
  const summary = summarizeSigns(signs)
  const calibrationSummary = useMemo(() => describeCalibration(calibration), [calibration])
  const connected = gloves.filter((glove) => glove.status === 'conectado').length
  const total = samplesForType(gestureType)

  // Solo se comparan las señas cuyos guantes están enviando datos.
  const availableHands = useMemo(
    () => ({ right: Boolean(readings.derecho), left: Boolean(readings.izquierdo) }),
    [readings],
  )

  const { live, resting, restReason } = useGestureRecognition({
    vector: featureVector,
    readings,
    signs,
    enabled: testing,
    availableHands,
    onRecognize: (result) => setLastTest({ ...result, at: Date.now() }),
  })

  // Señas que no se pueden evaluar ahora mismo por falta de algún guante.
  const skippedSigns = signs.filter((sign) => {
    if (sign.handMode === 'right') return !availableHands.right
    if (sign.handMode === 'left') return !availableHands.left
    return !(availableHands.right && availableHands.left)
  })

  const saveUuids = () => {
    const service = serviceUuid.trim()
    const sensor = sensorsUuid.trim()

    if (!isValidUuid(service) || !isValidUuid(sensor)) {
      setError('Escribe UUID válidos: 4 caracteres (16 bits) o 8-4-4-4-12 (128 bits).')
      return
    }

    setError('')
    applyUuidSettings({ service, sensors: sensor })
    setMessage('UUID guardados. Desconecta y vuelve a conectar los guantes para suscribirte.')
  }

  const capture = async () => {
    const name = label.trim()
    if (!name) {
      setError('Escribe el nombre de la seña antes de capturar.')
      return
    }
    if (!hasReadings) {
      setError('No hay lecturas de los guantes. Conéctalos y espera a recibir tramas.')
      return
    }

    if (handMode === 'right' && !readings.derecho) {
      setError('Esta seña es solo de la mano derecha: conecta el guante KLAPS-D.')
      return
    }
    if (handMode === 'left' && !readings.izquierdo) {
      setError('Esta seña es solo de la mano izquierda: conecta el guante KLAPS-U.')
      return
    }
    if (handMode === 'both' && !(readings.derecho && readings.izquierdo)) {
      setError('Una seña bimanual necesita los dos guantes enviando datos.')
      return
    }

    setError('')
    setMessage('')
    setCapturing(true)
    setCaptureProgress(0)

    const captured = []
    for (let index = 0; index < total; index += 1) {
      captured.push({ vector: vectorRef.current, at: Date.now() })
      setCaptureProgress(index + 1)
      await wait(SAMPLE_INTERVAL_MS)
    }

    let stored = captured

    if (gestureType === 'dynamic') {
      const trajectory = trajectoryFromFrames(captured.map((sample) => sample.vector))

      if (!trajectory) {
        setCapturing(false)
        setCaptureProgress(0)
        setError(
          'No se detectó movimiento en la captura. Repite el gesto completo dentro de los 4 segundos de la ventana.',
        )
        return
      }

      stored = [{ vector: trajectory, at: Date.now() }]
    }

    const next = saveTraining(withSamples(training, name, stored, { handMode, gestureType }))
    setTraining(next)
    setCapturing(false)
    setCaptureProgress(0)
    setLabel('')
    setMessage(
      gestureType === 'dynamic'
        ? `«${name}» guardada como dinámica: 1 recorrido de ${captured.length} fotogramas resumido en ${DYNAMIC_STEPS} pasos. Repite la captura para sumar repeticiones y mejorar el acierto.`
        : `«${name}» guardada: ${stored.length} muestras de ${HAND_MODE_LABELS[handMode].toLowerCase()}.`,
    )
  }

  const runCalibration = async () => {
    if (!hasReadings) {
      setError('Conecta los guantes y espera a recibir tramas antes de calibrar.')
      return
    }

    setError('')
    setCalibrationNotice('')
    setCalibrating(true)

    const snapshots = { stretched: [], closed: [], neutral: [] }

    try {
      for (let index = 0; index < CALIBRATION_STEPS.length; index += 1) {
        setCalibrationStep(index)
        setCalibrationProgress(0)
        // Pausa para que la persona se coloque antes de medir.
        await wait(CALIBRATION_SETTLE_MS)

        for (let frame = 0; frame < CALIBRATION_FRAMES; frame += 1) {
          snapshots[CALIBRATION_STEPS[index].key].push(readingsRef.current ?? {})
          setCalibrationProgress(frame + 1)
          await wait(SAMPLE_INTERVAL_MS)
        }
      }

      const next = buildCalibration(snapshots)
      applyCalibrationSettings(next)
      const valid = next.flex.valid.filter(Boolean).length

      const base =
        valid === 0
          ? 'Calibración guardada, pero ningún dedo cambió entre mano abierta y puño cerrado: revisa los sensores flex del firmware.'
          : `Calibración guardada: ${valid} de 10 dedos con rango real y MPU-6050 centrado con su línea base.`

      setCalibrationNotice(
        signs.length > 0
          ? `${base} Ya había señas grabadas: vuelve a grabarlas para que se comparen con las lecturas calibradas.`
          : base,
      )
    } finally {
      setCalibrating(false)
      setCalibrationStep(0)
      setCalibrationProgress(0)
    }
  }

  const forgetCalibration = () => {
    removeCalibration()
    setCalibrationNotice('Calibración eliminada: las lecturas vuelven a los valores del firmware.')
  }

  const removeSign = (id) => {
    const next = saveTraining(withoutSign(training, id))
    setTraining(next)
  }

  const download = () => {
    const blob = new Blob([exportTraining(training)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `klaps-entrenamiento-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const merged = saveTraining(importTraining(text, training))
      setTraining(merged)
      setMessage(`Entrenamiento importado: ${merged.signs.length} señas en total.`)
      setError('')
    } catch (importError) {
      setError(importError.message)
    } finally {
      event.target.value = ''
    }
  }

  const flexOf = (side) => readings[side]?.flex ?? null
  const imuOf = (side) => readings[side]?.imu ?? null

  return (
    <div>
      <PageHeader
        backTo="/traducir"
        backLabel="Volver a traducción"
        eyebrow="Calibración"
        title="Entrenamiento de señas"
        description="Conecta los guantes, graba cada seña y comprueba el reconocimiento antes de usarlo."
        actions={
          <StatusBadge
            status={connected > 0 ? 'conectado' : 'desconectado'}
            label={`${connected} de 2 guantes`}
          />
        }
      />

      {error && <ErrorMessage className="mb-5" title="Revisa esto" description={error} />}

      {/* 1. Conexión y UUID del firmware */}
      <Card as="section" aria-labelledby="conexion-titulo" padding="lg">
        <h2 id="conexion-titulo" className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
          <Bluetooth className="size-5 text-brand-600" aria-hidden="true" />
          Conexión y UUID del firmware
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          La app lee una trama de <strong>34 bytes</strong>: 5 enteros de 16 bits con los flex en
          porcentaje y 6 flotantes con el MPU-6050.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="service-uuid" className="text-sm font-semibold text-ink">
              UUID del servicio
            </label>
            <input
              id="service-uuid"
              value={serviceUuid}
              onChange={(event) => setServiceUuid(event.target.value)}
              placeholder="0000abcd-0000-1000-8000-00805f9b34fb"
              spellCheck="false"
              className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 font-mono text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="sensors-uuid" className="text-sm font-semibold text-ink">
              UUID de la característica de sensores
            </label>
            <input
              id="sensors-uuid"
              value={sensorsUuid}
              onChange={(event) => setSensorsUuid(event.target.value)}
              placeholder="0000abce-0000-1000-8000-00805f9b34fb"
              spellCheck="false"
              className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 font-mono text-sm text-ink"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" icon={Save} onClick={saveUuids}>
            Guardar UUID
          </Button>
          {gloves.map((glove) => (
            <Button
              key={glove.id}
              size="sm"
              variant="secondary"
              icon={glove.status === 'conectado' ? Square : Bluetooth}
              onClick={() => (glove.status === 'conectado' ? disconnect(glove.id) : connect(glove.id))}
            >
              {glove.status === 'conectado' ? `Desconectar ${glove.label.toLowerCase()}` : `Conectar ${glove.label.toLowerCase()}`}
            </Button>
          ))}
        </div>

        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {gloves.map((glove) => (
            <li
              key={glove.id}
              className="flex items-center justify-between gap-2 rounded-md bg-brand-50 px-3 py-2"
            >
              <span className="font-semibold text-ink">{glove.label}</span>
              <span className="text-xs text-ink-soft">
                {glove.status} · {glove.frames} tramas ·{' '}
                {glove.sensorsListening ? 'escuchando' : 'sin suscribir'}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-ink-soft">
          {protocolConfigured
            ? 'UUID configurados: la app se suscribe automáticamente al conectar.'
            : 'Sin UUID configurados todavía: no se pueden leer los sensores.'}
        </p>
      </Card>

      {/* 2. Lectura en vivo */}
      <Card as="section" aria-labelledby="lectura-titulo" padding="lg" className="mt-5">
        <h2 id="lectura-titulo" className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
          <Hand className="size-5 text-brand-600" aria-hidden="true" />
          Lectura en vivo
        </h2>

        {calibration && (
          <p className="mt-2 text-xs font-medium text-success">
            Lecturas calibradas con los extremos medidos en este navegador.
          </p>
        )}

        {!hasReadings ? (
          <p className="mt-2 text-sm text-ink-soft">
            Sin datos todavía. Conecta un guante y espera a que empiece a enviar tramas. Si aparece
            «sin suscribir», pulsa «Guardar UUID» y vuelve a conectar: el navegador exige declarar el
            servicio <em>antes</em> de abrir la conexión.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {['derecho', 'izquierdo'].map((side) => {
              const flex = flexOf(side)
              const imu = imuOf(side)
              return (
                <div key={side} className="rounded-md border border-brand-100 p-3">
                  <p className="text-sm font-semibold text-brand-800">
                    {side === 'derecho' ? 'KLAPS-D' : 'KLAPS-U'}
                  </p>
                  {flex ? (
                    <>
                      <ul className="mt-2 space-y-1.5">
                        {flex.map((value, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="w-12 text-xs text-ink-soft">flex {index}</span>
                            <ProgressBar value={value} size="sm" className="flex-1" />
                            <span className="w-10 text-right text-xs font-semibold text-ink">
                              {Math.round(value)} %
                            </span>
                          </li>
                        ))}
                      </ul>
                      {imu && (
                        <p className="mt-2 font-mono text-[0.7rem] leading-relaxed text-ink-soft">
                          {IMU_FIELDS.map(([key, label]) => `${label} ${imu[key].toFixed(2)}`).join(' · ')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-ink-soft">sin lectura de este guante</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* 3. Calibración guiada */}
      <Card as="section" aria-labelledby="calibracion-titulo" padding="lg" className="mt-5">
        <h2
          id="calibracion-titulo"
          className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800"
        >
          <Wand2 className="size-5 text-brand-600" aria-hidden="true" />
          Calibración guiada
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Mide los extremos reales de tus dedos y la línea base del MPU-6050 en tres pasos de 2
          segundos ({CALIBRATION_FRAMES} muestras cada uno). Se guarda en este navegador y se aplica
          a todas las pantallas, sin tocar el código del ESP32.
        </p>

        {!calibrating && (
          <ol className="mt-3 grid gap-1.5 rounded-md bg-brand-50 px-3 py-2.5 text-xs text-ink-soft">
            {CALIBRATION_STEPS.map((step, index) => (
              <li key={step.key}>
                <span className="font-semibold text-brand-800">
                  Paso {index + 1} · {step.title}
                </span>{' '}
                — {step.instruction}
              </li>
            ))}
          </ol>
        )}

        {calibrating ? (
          <div className="mt-4" role="status" aria-live="polite">
            <p className="font-display font-bold text-brand-800">
              Paso {calibrationStep + 1} de {CALIBRATION_STEPS.length} ·{' '}
              {CALIBRATION_STEPS[calibrationStep].title}
            </p>
            <p className="mt-1 text-sm text-ink">{CALIBRATION_STEPS[calibrationStep].instruction}</p>
            <ProgressBar
              className="mt-3"
              value={(calibrationProgress / CALIBRATION_FRAMES) * 100}
              label="Captura del paso"
              valueLabel={`${calibrationProgress} de ${CALIBRATION_FRAMES}`}
              tone="success"
              size="sm"
            />
            <ol className="mt-3 grid gap-1 text-xs">
              {CALIBRATION_STEPS.map((step, index) => (
                <li
                  key={step.key}
                  className={
                    index < calibrationStep
                      ? 'text-success'
                      : index === calibrationStep
                        ? 'font-semibold text-brand-800'
                        : 'text-ink-soft'
                  }
                >
                  {index + 1}. {step.title}
                  {' · '}
                  {index < calibrationStep ? 'hecho' : index === calibrationStep ? 'en curso' : 'pendiente'}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button icon={Wand2} onClick={runCalibration} disabled={!hasReadings}>
                {calibration ? 'Recalibrar' : 'Iniciar calibración guiada'}
              </Button>
              {calibration && (
                <Button size="sm" variant="ghost" icon={RotateCcw} onClick={forgetCalibration}>
                  Quitar calibración
                </Button>
              )}
              {calibrationSummary && (
                <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-success">
                  Calibrada · {formatRelativeTime(calibrationSummary.createdAt)}
                </span>
              )}
            </div>

            {!hasReadings && (
              <p className="mt-2 text-xs text-ink-soft">
                Conecta los guantes y espera a que lleguen tramas para poder calibrar.
              </p>
            )}

            {calibrationNotice && (
              <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-sm text-ink">
                {calibrationNotice}
              </p>
            )}

            {calibrationSummary && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Guante derecho', calibrationSummary.derecho],
                  ['Guante izquierdo', calibrationSummary.izquierdo],
                ].map(([title, fingers]) => (
                  <div key={title} className="rounded-md border border-brand-100 p-3">
                    <p className="text-sm font-semibold text-brand-800">{title}</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {fingers.map((item) => (
                        <li key={item.finger} className="flex items-center justify-between gap-2">
                          <span className="text-ink-soft">flex {item.finger}</span>
                          <span
                            className={
                              item.valid ? 'font-semibold text-ink' : 'text-ink-soft italic'
                            }
                          >
                            {item.valid ? `${item.min} % → ${item.max} %` : 'sin cambios'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* 4. Grabar nueva seña */}
      <Card as="section" aria-labelledby="grabar-titulo" padding="lg" className="mt-5">
        <h2 id="grabar-titulo" className="font-display text-lg font-extrabold text-brand-800">
          Grabar nueva seña
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Elige qué mano y qué tipo de seña vas a grabar. Estáticas: postura fija de 2 s (
          {STATIC_SAMPLES} fotogramas). Dinámicas: recorrido completo de 4 s ({DYNAMIC_SAMPLES}{' '}
          fotogramas) resumido en {DYNAMIC_STEPS} pasos clave.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SegmentedControl
            label="Mano de la seña"
            description="Solo derecha (ESP32-D), solo izquierda (ESP32-U) o ambas manos."
            options={[
              { value: 'right', label: 'Derecha' },
              { value: 'left', label: 'Izquierda' },
              { value: 'both', label: 'Ambas' },
            ]}
            value={handMode}
            onChange={setHandMode}
          />

          <SegmentedControl
            label="Tipo de seña"
            description={
              gestureType === 'dynamic'
                ? `Con movimiento: ${DYNAMIC_SAMPLES} fotogramas en 4 s → ${DYNAMIC_STEPS} pasos clave.`
                : `Postura fija: ${STATIC_SAMPLES} fotogramas en 2 s.`
            }
            options={[
              { value: 'static', label: 'Estática' },
              { value: 'dynamic', label: 'Dinámica' },
            ]}
            value={gestureType}
            onChange={setGestureType}
          />
        </div>

        <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-xs text-ink-soft">
          {handMode === 'both'
            ? 'Se comparan las 22 dimensiones: 11 del guante derecho (KLAPS-D) y 11 del izquierdo (KLAPS-U).'
            : `Se comparan solo las 11 dimensiones del guante ${handMode === 'right' ? 'derecho (KLAPS-D)' : 'izquierdo (KLAPS-U)'}; el otro guante se ignora aunque se mueva.`}
          {gestureType === 'dynamic' &&
            ' El gesto puede empezar en cualquier momento de la ventana: la app recorta el silencio de los extremos antes de comparar.'}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="sign-label" className="text-sm font-semibold text-ink">
              Nombre de la seña
            </label>
            <input
              id="sign-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Hola, Gracias, Ayuda, Sí, No, Buenos días…"
              maxLength={60}
              className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 text-ink"
            />
          </div>
          <Button icon={capturing ? undefined : Play} onClick={capture} disabled={capturing || !hasReadings}>
            {capturing ? `Capturando ${captureProgress}/${total}…` : 'Capturar seña'}
          </Button>
        </div>

        {capturing && (
          <ProgressBar
            className="mt-4"
            value={(captureProgress / total) * 100}
            label="Captura"
            valueLabel={`${captureProgress} de ${total}`}
            tone="success"
            size="sm"
          />
        )}

        {message && <p className="mt-3 rounded-md bg-mint px-3 py-2 text-sm text-ink">{message}</p>}
      </Card>

      {/* 5. Señas guardadas */}
      <section aria-labelledby="senas-titulo" className="mt-6">
        <SectionTitle
          id="senas-titulo"
          title="Señas guardadas"
          description={`${signs.length} señas (${summary.static} estáticas, ${summary.dynamic} dinámicas) · ${totalSamples(training)} muestras en este navegador`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={Download} onClick={download} disabled={signs.length === 0}>
                Exportar
              </Button>
              <Button
                as="label"
                size="sm"
                variant="secondary"
                icon={Upload}
                className="cursor-pointer"
              >
                Importar
                <input type="file" accept="application/json,.json" onChange={importFile} className="sr-only" />
              </Button>
            </div>
          }
        />

        <div className="mt-3">
          {signs.length === 0 ? (
            <p className="rounded-md border border-dashed border-brand-200 bg-white/70 px-4 py-5 text-sm text-ink-soft">
              Todavía no hay señas. Graba la primera con el formulario de arriba.
            </p>
          ) : (
            <ul className="space-y-2">
              {signs.map((sign) => (
                <li key={sign.id}>
                  <Card padding="sm" className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-brand-800">{sign.label}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                          {HAND_MODE_LABELS[sign.handMode] ?? HAND_MODE_LABELS.both}
                        </span>
                        <span
                          className={
                            sign.gestureType === 'dynamic'
                              ? 'rounded-full bg-lavender px-2 py-0.5 font-semibold text-brand-800'
                              : 'rounded-full bg-mint px-2 py-0.5 font-semibold text-success'
                          }
                        >
                          {GESTURE_TYPE_LABELS[sign.gestureType] ?? GESTURE_TYPE_LABELS.static}
                        </span>
                        <span className="text-ink-soft">
                          {sign.gestureType === 'dynamic'
                            ? `${sign.samples.length} ${sign.samples.length === 1 ? 'recorrido' : 'recorridos'}`
                            : `${sign.samples.length} muestras`}{' '}
                          · {formatRelativeTime(sign.createdAt)}
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => removeSign(sign.id)}
                      aria-label={`Eliminar la seña ${sign.label}`}
                    >
                      Eliminar
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 6. Prueba de reconocimiento */}
      <Card as="section" aria-labelledby="prueba-titulo" padding="lg" className="mt-6">
        <h2 id="prueba-titulo" className="font-display text-lg font-extrabold text-brand-800">
          Probar el reconocimiento
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Clasificación KNN con K = 3 y umbral {Math.round(CONFIDENCE_THRESHOLD * 100)} %. Las
          estáticas exigen 0,6 s de estabilidad; las dinámicas se disparan al completar el recorrido,
          sin esperar a que la mano se quede quieta. Las mismas reglas que usa la traducción.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant={testing ? 'secondary' : 'primary'}
            icon={testing ? Square : Play}
            onClick={() => setTesting((value) => !value)}
            disabled={samples.length === 0 || !hasReadings}
          >
            {testing ? 'Detener prueba' : 'Iniciar prueba'}
          </Button>

          <div className="text-sm text-ink-soft">
            {live ? (
              <>
                <strong className="font-semibold text-ink">{live.label}</strong> ·{' '}
                {Math.round(live.confidence * 100)} % ·{' '}
                {live.mode === 'dynamic'
                  ? live.stable
                    ? 'recorrido confirmado'
                    : 'confirmando recorrido'
                  : `${Math.round((live.progress ?? 0) * 100)} % de estabilización`}
              </>
            ) : (
              'Sin candidata'
            )}
          </div>
        </div>

        {testing && resting && (
          <p role="status" className="mt-3 rounded-md bg-lavender px-3 py-2 text-sm font-semibold text-brand-800">
            Manos en reposo (0) — traducción pausada
            <span className="block text-xs font-normal text-ink-soft">
              {restReason === 'pose'
                ? 'Regla física: 4 dedos a ≥75 % de flexión y az ≤ −7,5 m/s².'
                : 'Seña de pausa reconocida (0, REPOSO o PAUSA).'}
            </span>
          </p>
        )}

        {skippedSigns.length > 0 && (
          <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
            {skippedSigns.length}{' '}
            {skippedSigns.length === 1 ? 'seña no se evalúa' : 'señas no se evalúan'} porque falta el
            guante de su modo:{' '}
            {skippedSigns
              .slice(0, 4)
              .map((sign) => `${sign.label} (${(HAND_MODE_LABELS[sign.handMode] ?? '').toLowerCase()})`)
              .join(', ')}
            {skippedSigns.length > 4 ? '…' : ''}
          </p>
        )}

        {lastTest && (
          <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-sm text-ink">
            Reconocido: <strong className="font-semibold">{lastTest.label}</strong> ·{' '}
            {Math.round(lastTest.confidence * 100)} % · distancia{' '}
            {lastTest.distance.toFixed(2)} · {lastTest.votes}/3 vecinos ·{' '}
            {GESTURE_TYPE_LABELS[lastTest.mode] ?? GESTURE_TYPE_LABELS.static}
          </p>
        )}

        <p className="mt-4 text-xs text-ink-soft">
          <Link to="/traducir" className="inline-flex items-center gap-1 font-semibold text-brand-700 underline underline-offset-2">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Ir a la traducción en vivo
          </Link>
        </p>
      </Card>
    </div>
  )
}
