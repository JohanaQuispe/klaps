import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bluetooth, MonitorSmartphone, ScanLine, SlidersHorizontal } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import ProgressBar from '../../components/common/ProgressBar'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import DeviceCard from '../../components/devices/DeviceCard'
import { useDevices } from '../../context/deviceContext.js'
import { GLOVE_STATUS } from '../../services/bluetooth/gloveState.js'
import {
  describeBluetoothBlockReason,
  getBluetoothBlockReason,
} from '../../services/bluetooth/bleClient.js'
import {
  DEFAULT_CALIBRATION,
  buildQuickCalibration,
  describeCalibration,
  QUICK_CALIBRATION_STEPS,
} from '../../services/bluetooth/calibration.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Devices() {
  const {
    gloves,
    disconnect,
    connect,
    subscribeSensors,
    protocolConfigured,
    readings,
    hasReadings,
    calibration,
    applyCalibrationSettings,
  } = useDevices()
  const [infoGlove, setInfoGlove] = useState(null)

  const readingsRef = useRef(readings)
  useEffect(() => {
    readingsRef.current = readings
  }, [readings])

  // Estado para el asistente de calibración Min-Max
  const [calibrateModalOpen, setCalibrateModalOpen] = useState(false)
  const [calibrating, setCalibrating] = useState(false)
  const [calStep, setCalStep] = useState(0)
  const [calProgress, setCalProgress] = useState(0)
  const [calNotice, setCalNotice] = useState('')
  const [calResult, setCalResult] = useState(() => describeCalibration(calibration))

  const connectedCount = gloves.filter((glove) => glove.status === GLOVE_STATUS.CONECTADO).length
  const blockReason = getBluetoothBlockReason()
  const bluetoothNotice = describeBluetoothBlockReason(
    blockReason,
    typeof window !== 'undefined' ? window.location.host : '',
  )

  const runCalibration = async () => {
    if (!hasReadings) {
      setCalNotice('Conecta los guantes y espera a recibir lecturas antes de iniciar.')
      return
    }

    setCalibrating(true)
    setCalResult(null)
    setCalNotice('')

    const FRAMES_PER_STEP = 20
    const snapshots = { stretched: [], closed: [] }

    try {
      // Paso 1: Mano abierta (2.0 segundos)
      setCalStep(0)
      setCalProgress(0)
      for (let i = 0; i < FRAMES_PER_STEP; i += 1) {
        snapshots.stretched.push({
          derecho: readingsRef.current.derecho?.rawFlex ?? readingsRef.current.derecho?.flex ?? null,
          izquierdo: readingsRef.current.izquierdo?.rawFlex ?? readingsRef.current.izquierdo?.flex ?? null,
        })
        setCalProgress(i + 1)
        await wait(100)
      }

      setCalNotice('¡Mano abierta capturada! Ahora cierra el puño firmemente...')
      await wait(1000)

      // Paso 2: Puño cerrado (2.0 segundos)
      setCalStep(1)
      setCalProgress(0)
      for (let i = 0; i < FRAMES_PER_STEP; i += 1) {
        snapshots.closed.push({
          derecho: readingsRef.current.derecho?.rawFlex ?? readingsRef.current.derecho?.flex ?? null,
          izquierdo: readingsRef.current.izquierdo?.rawFlex ?? readingsRef.current.izquierdo?.flex ?? null,
        })
        setCalProgress(i + 1)
        await wait(100)
      }

      const next = buildQuickCalibration(snapshots)
      applyCalibrationSettings(next)
      const desc = describeCalibration(next)
      setCalResult(desc)
      setCalNotice('¡Calibración completada! Los rangos Min-Max y pesos se han guardado.')
    } finally {
      setCalibrating(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dispositivos"
        title="Guantes inteligentes"
        description="Cada guante lleva un ESP32, sensores flex y un MPU6050. La conexión es real por Bluetooth LE: aquí solo aparece lo que el guante publica."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={connectedCount > 0 ? 'conectado' : 'desconectado'}
              label={connectedCount > 0 ? (connectedCount === 1 ? '1 guante conectado' : `${connectedCount} guantes conectados`) : 'Desconectado'}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => {
                setCalibrateModalOpen(true)
                setCalResult(describeCalibration(calibration))
              }}
            >
              Calibrar mano abierta / puño cerrado
            </Button>
          </div>
        }
      />

      {bluetoothNotice && (
        <ErrorMessage
          className="mb-5"
          title={bluetoothNotice.title}
          description={bluetoothNotice.description}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {gloves.map((glove) => (
          <DeviceCard
            key={glove.id}
            glove={glove}
            onDisconnect={disconnect}
            onReconnect={connect}
            onSubscribe={subscribeSensors}
            onCalibrate={() => {
              setCalibrateModalOpen(true)
              setCalResult(describeCalibration(calibration))
            }}
            sensorsConfigured={protocolConfigured}
            onRequestConnect={setInfoGlove}
          />
        ))}
      </div>

      <Card className="mt-5 flex flex-wrap items-center justify-between gap-4" padding="md">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-700">
            <ScanLine className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display font-bold text-brand-800">Diagnóstico de sensores</p>
            <p className="mt-0.5 max-w-prose text-sm text-ink-soft">
              Conecta tu ESP32 por Bluetooth LE y descubre qué servicios y características publica:
              así obtenemos los UUID para leer los sensores flex, el MPU6050 y la batería.
            </p>
          </div>
        </div>
        <Button as={Link} to="/dispositivos/diagnostico" variant="secondary" size="sm" iconRight={ArrowRight}>
          Abrir diagnóstico
        </Button>
      </Card>

      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <MonitorSmartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Web Bluetooth solo funciona en Chrome, Edge u Opera (escritorio) o Chrome en Android, con la
        página en localhost o HTTPS. El navegador pide permiso una vez por dispositivo.
      </p>

      <Modal
        open={Boolean(infoGlove)}
        onClose={() => setInfoGlove(null)}
        title="Conectar tu ESP32"
        description={
          infoGlove ? `${infoGlove.label}: cómo abrir la conexión real por Bluetooth LE.` : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setInfoGlove(null)} className="sm:mr-auto">
              Cerrar
            </Button>
            <Button as={Link} to="/dispositivos/diagnostico" icon={Bluetooth}>
              Abrir diagnóstico BLE
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-ink">
          <p>
            Pulsa <strong>Conectar</strong> en la tarjeta del guante o usa el{' '}
            <strong>diagnóstico por Bluetooth LE</strong>: el navegador abre su selector, eliges tu
            ESP32 y la conexión queda establecida con tu permiso.
          </p>
          <ul className="space-y-2">
            {[
              'El firmware debe usar BLE (GATT), no Bluetooth clásico.',
              'Abre la página por localhost o HTTPS, en Chrome, Edge u Opera.',
              'El nombre anunciado debe coincidir con el perfil del guante (KLAPS_Guante_D / KLAPS_Guante_I).',
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <Bluetooth className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-md bg-brand-50 p-3 text-ink-soft">
            Si el guante no publica batería, la tarjeta mostrará «sin lectura de batería». Es el
            comportamiento esperado mientras el firmware no incluya el servicio estándar 0x180F.
          </p>
        </div>
      </Modal>

      {/* Modal Calibrar mano abierta / puño cerrado */}
      <Modal
        open={calibrateModalOpen}
        onClose={() => setCalibrateModalOpen(false)}
        title="Calibrar mano abierta / puño cerrado"
        description="Ajusta los extremos Min-Max con los valores crudos del ADC (openRaw y closedRaw) para calcular el 0% al abrir la mano y 100% al cerrar el puño. El anular (raw 0) se ignora con peso 0."
        footer={
          <div className="flex w-full flex-wrap justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                applyCalibrationSettings(DEFAULT_CALIBRATION)
                setCalResult(describeCalibration(DEFAULT_CALIBRATION))
                setCalNotice('Valores medidos de fábrica del ESP32-D restablecidos con éxito.')
              }}
              disabled={calibrating}
            >
              Restablecer valores medidos
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCalibrateModalOpen(false)}
                disabled={calibrating}
              >
                Cerrar
              </Button>
              <Button
                onClick={runCalibration}
                disabled={calibrating || !hasReadings}
              >
                {calibrating ? 'Calibrando…' : 'Iniciar calibración (4 seg)'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-brand-900 mb-1">
              <span>Paso {calStep + 1} de 2: {QUICK_CALIBRATION_STEPS[calStep]?.label}</span>
              <span>{(calProgress / 10).toFixed(1)} / 2.0 s</span>
            </div>
            <p className="text-xs text-ink-soft">
              {QUICK_CALIBRATION_STEPS[calStep]?.instruction}
            </p>

            {calibrating && (
              <ProgressBar
                className="mt-2"
                value={(calProgress / 20) * 100}
                tone="brand"
                size="sm"
              />
            )}

            {calNotice && (
              <p className="mt-2 text-xs font-semibold text-brand-800">{calNotice}</p>
            )}
          </div>

          {calResult && (
            <div className="rounded-md border border-brand-200 bg-white p-3">
              <p className="text-xs font-bold text-brand-900">{calResult.summary}</p>
              <p className="text-[0.72rem] text-ink-soft mt-0.5">
                {calResult.activeFlexCount} sensores activos (peso 1.4) · Anular ignorado (peso 0.0)
              </p>

              <div className="mt-2.5 space-y-1 text-xs">
                {calResult.fingerChannels?.map((ch) => (
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
    </div>
  )
}
