import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Bluetooth,
  Download,
  Hand,
  Play,
  Save,
  Square,
  Trash2,
  Upload,
} from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import SectionTitle from '../../components/common/SectionTitle'
import ProgressBar from '../../components/common/ProgressBar'
import { useDevices } from '../../context/deviceContext.js'
import { useGestureRecognition } from '../../hooks/useGestureRecognition.js'
import { isValidUuid } from '../../services/bluetooth/uuidSettings.js'
import { CONFIDENCE_THRESHOLD, flattenSamples } from '../../services/gesture/knnClassifier.js'
import {
  SAMPLES_PER_SIGN,
  SAMPLE_INTERVAL_MS,
  exportTraining,
  importTraining,
  loadTraining,
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
    connect,
    disconnect,
  } = useDevices()

  const vectorRef = useRef(featureVector)
  useEffect(() => {
    vectorRef.current = featureVector
  }, [featureVector])

  const [training, setTraining] = useState(loadTraining)
  const [serviceUuid, setServiceUuid] = useState(uuidSettings.service)
  const [sensorsUuid, setSensorsUuid] = useState(uuidSettings.sensors)

  const [label, setLabel] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [captureProgress, setCaptureProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [testing, setTesting] = useState(false)
  const [lastTest, setLastTest] = useState(null)

  const signs = training.signs
  const samples = flattenSamples(signs)
  const connected = gloves.filter((glove) => glove.status === 'conectado').length

  const { live } = useGestureRecognition({
    vector: featureVector,
    signs,
    enabled: testing,
    onRecognize: (result) => setLastTest({ ...result, at: Date.now() }),
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

    setError('')
    setMessage('')
    setCapturing(true)
    setCaptureProgress(0)

    const captured = []
    for (let index = 0; index < SAMPLES_PER_SIGN; index += 1) {
      captured.push({ vector: vectorRef.current, at: Date.now() })
      setCaptureProgress(index + 1)
      await wait(SAMPLE_INTERVAL_MS)
    }

    const next = saveTraining(withSamples(training, name, captured))
    setTraining(next)
    setCapturing(false)
    setLabel('')
    setMessage(`«${name}» guardada con ${captured.length} muestras.`)
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
                {glove.status} · {glove.frames} tramas
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

        {!hasReadings ? (
          <p className="mt-2 text-sm text-ink-soft">
            Sin datos todavía. Conecta un guante y espera a que empiece a enviar tramas.
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

      {/* 3. Grabar nueva seña */}
      <Card as="section" aria-labelledby="grabar-titulo" padding="lg" className="mt-5">
        <h2 id="grabar-titulo" className="font-display text-lg font-extrabold text-brand-800">
          Grabar nueva seña
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Escribe la palabra o frase, pon las manos en la postura y captura {SAMPLES_PER_SIGN}{' '}
          muestras seguidas (1 segundo a 20 Hz).
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
            {capturing ? `Capturando ${captureProgress}/${SAMPLES_PER_SIGN}…` : 'Capturar muestras'}
          </Button>
        </div>

        {capturing && (
          <ProgressBar
            className="mt-4"
            value={(captureProgress / SAMPLES_PER_SIGN) * 100}
            label="Captura"
            valueLabel={`${captureProgress} de ${SAMPLES_PER_SIGN}`}
            tone="success"
            size="sm"
          />
        )}

        {message && <p className="mt-3 rounded-md bg-mint px-3 py-2 text-sm text-ink">{message}</p>}
      </Card>

      {/* 4. Señas guardadas */}
      <section aria-labelledby="senas-titulo" className="mt-6">
        <SectionTitle
          id="senas-titulo"
          title="Señas guardadas"
          description={`${signs.length} señas · ${totalSamples(training)} muestras en este navegador`}
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
                      <p className="text-xs text-ink-soft">
                        {sign.samples.length} muestras · {formatRelativeTime(sign.createdAt)}
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

      {/* 5. Prueba de reconocimiento */}
      <Card as="section" aria-labelledby="prueba-titulo" padding="lg" className="mt-6">
        <h2 id="prueba-titulo" className="font-display text-lg font-extrabold text-brand-800">
          Probar el reconocimiento
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Clasificación KNN con K = 3, umbral {Math.round(CONFIDENCE_THRESHOLD * 100)} % y 0,6 s de
          estabilización. Las mismas reglas que usa la pantalla de traducción.
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
                {Math.round((live.progress ?? 0) * 100)} % de estabilización
              </>
            ) : (
              'Sin candidata'
            )}
          </div>
        </div>

        {lastTest && (
          <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-sm text-ink">
            Reconocido: <strong className="font-semibold">{lastTest.label}</strong> ·{' '}
            {Math.round(lastTest.confidence * 100)} % · distancia {lastTest.distance.toFixed(2)} ·{' '}
            {lastTest.votes}/3 vecinos
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
