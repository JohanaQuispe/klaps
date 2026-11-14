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
import {
  describeBluetoothBlockReason,
  getBluetoothBlockReason,
} from '../../services/bluetooth/bleClient.js'

export default function Devices() {
  const { gloves, mode, disconnect, reconnect } = useDevices()
  const [infoGlove, setInfoGlove] = useState(null)
  const blockReason = getBluetoothBlockReason()
  const bluetoothNotice = describeBluetoothBlockReason(
    blockReason,
    typeof window !== 'undefined' ? window.location.host : '',
  )

  return (
    <div>
      <PageHeader
        eyebrow="Dispositivos"
        title="Guantes inteligentes"
        description="Cada guante lleva un ESP32, sensores flex y un MPU6050. Aquí ves su estado simulado y puedes probar la conexión real por Bluetooth LE."
        actions={<StatusBadge status="demo" />}
      />

      <Card tone="butter" padding="md" className="mb-5 flex items-start gap-3">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="font-display font-bold text-brand-800">Modo demostración activo</p>
          <p className="mt-1 text-sm text-ink">
            Los porcentajes de batería, el RSSI y las sincronizaciones de estas tarjetas son{' '}
            <strong>simulados</strong>. Para conectar tu ESP32 de verdad usa el{' '}
            <Link
              to="/dispositivos/diagnostico"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              diagnóstico por Bluetooth LE
            </Link>
            , que abre una conexión real con el navegador.
          </p>
        </div>
      </Card>

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
        Modo actual: <strong className="font-semibold">{mode}</strong>. La interfaz está preparada
        para cambiar a datos reales sin modificar las pantallas.
      </p>

      <Modal
        open={Boolean(infoGlove)}
        onClose={() => setInfoGlove(null)}
        title="Conectar tu ESP32"
        description={
          infoGlove
            ? `${infoGlove.label}: abre el diagnóstico para vincular el guante real.`
            : undefined
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
            La conexión real se hace desde el <strong>diagnóstico por Bluetooth LE</strong>, que
            pide permiso al navegador y muestra lo que publica tu ESP32 (ESP32-D y ESP32-U).
          </p>
          <ul className="space-y-2">
            {[
              'El firmware debe usar BLE (GATT), no Bluetooth clásico.',
              'Necesitas Chrome, Edge u Opera en escritorio, o Chrome en Android.',
              'La página debe abrirse por HTTPS o en localhost.',
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <Bluetooth className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-md bg-brand-50 p-3 text-ink-soft">
            Mientras no haya una conexión activa, las tarjetas de esta pantalla siguen mostrando
            datos simulados con la etiqueta «Modo demostración».
          </p>
        </div>
      </Modal>
    </div>
  )
}
