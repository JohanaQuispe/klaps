import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bluetooth, MonitorSmartphone, ScanLine, ShieldCheck } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import DeviceCard from '../../components/devices/DeviceCard'
import { useDevices } from '../../context/deviceContext.js'
import { GLOVE_STATUS } from '../../services/bluetooth/gloveState.js'
import {
  describeBluetoothBlockReason,
  getBluetoothBlockReason,
} from '../../services/bluetooth/bleClient.js'

export default function Devices() {
  const { gloves, disconnect, connect, subscribeSensors, protocolConfigured } = useDevices()
  const [infoGlove, setInfoGlove] = useState(null)

  const connectedCount = gloves.filter((glove) => glove.status === GLOVE_STATUS.CONECTADO).length
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
        description="Cada guante lleva un ESP32, sensores flex y un MPU6050. La conexión es real por Bluetooth LE: aquí solo aparece lo que el guante publica."
        actions={
          <StatusBadge
            status={connectedCount > 0 ? 'conectado' : 'desconectado'}
            label={`${connectedCount} de ${gloves.length} conectados`}
          />
        }
      />

      <Card tone="mint" padding="md" className="mb-5 flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-display font-bold text-brand-800">Conexión real, sin datos simulados</p>
          <p className="mt-1 text-sm text-ink">
            Batería, modelo y firmware se leen directamente del dispositivo. Si un dato no está
            publicado, la tarjeta lo indica como <strong>sin lectura</strong> — no se inventa nada.
            La lectura de los sensores flex y del MPU6050 se activa al configurar sus UUID en{' '}
            <code>services/bluetooth/bleConfig.js</code>.
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
            onReconnect={connect}
            onSubscribe={subscribeSensors}
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
    </div>
  )
}
