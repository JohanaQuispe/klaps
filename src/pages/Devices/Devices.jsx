import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bluetooth, FlaskConical, MonitorSmartphone, ScanLine } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import DeviceCard from '../../components/devices/DeviceCard'
import { useDevices } from '../../context/deviceContext.js'

export default function Devices() {
  const { gloves, mode, bluetoothSupported, disconnect, reconnect } = useDevices()
  const [infoGlove, setInfoGlove] = useState(null)

  return (
    <div>
      <PageHeader
        eyebrow="Dispositivos"
        title="Guantes inteligentes"
        description="Cada guante lleva un ESP32, sensores flex y un MPU6050. Aquí ves su estado, batería y señal por separado."
        actions={<StatusBadge status="demo" />}
      />

      <Card tone="butter" padding="md" className="mb-5 flex items-start gap-3">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="font-display font-bold text-brand-800">Modo demostración activo</p>
          <p className="mt-1 text-sm text-ink">
            Los porcentajes de batería, el RSSI y las sincronizaciones son <strong>simulados</strong>.
            KLAPS todavía no ha establecido una conexión Bluetooth con hardware real.
          </p>
        </div>
      </Card>

      {!bluetoothSupported && (
        <ErrorMessage
          className="mb-5"
          title="Web Bluetooth no está disponible en este navegador"
          description="Podrás ver los guantes en modo demostración, pero para conectarlos necesitarás Chrome o Edge en un contexto seguro (HTTPS o localhost)."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {gloves.map((glove) => (
          <DeviceCard
            key={glove.id}
            glove={glove}
            onDisconnect={disconnect}
            onReconnect={reconnect}
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
              Vista de las lecturas de sensores flex y del MPU6050. Se activará cuando el firmware
              del guante envíe datos por BLE.
            </p>
          </div>
        </div>
        <Button as={Link} to="/dispositivos/diagnostico" variant="secondary" size="sm" iconRight={ArrowRight}>
          Abrir diagnóstico
        </Button>
      </Card>

      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <MonitorSmartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Modo actual: <strong className="font-semibold">{mode}</strong>. La interfaz está preparada
        para cambiar a datos reales sin modificar las pantallas.
      </p>

      <Modal
        open={Boolean(infoGlove)}
        onClose={() => setInfoGlove(null)}
        title="Conexión Bluetooth en preparación"
        description={
          infoGlove
            ? `${infoGlove.label}: la conexión real con el guante todavía no está habilitada.`
            : undefined
        }
        footer={<Button onClick={() => setInfoGlove(null)}>Entendido</Button>}
      >
        <div className="space-y-4 text-sm text-ink">
          <p>
            Para vincular un guante hace falta completar tres piezas que aún están en desarrollo:
          </p>
          <ul className="space-y-2">
            {[
              'El servicio BLE del ESP32 con sus UUID de servicio y característica.',
              'El firmware que publica las lecturas de los sensores flex y del MPU6050.',
              'La autorización HTTPS del navegador para usar Web Bluetooth.',
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <Bluetooth className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-md bg-brand-50 p-3 text-ink-soft">
            Mientras tanto, los estados de batería y señal que ves son simulados y se muestran con
            la etiqueta «Modo demostración».
          </p>
        </div>
      </Modal>
    </div>
  )
}
