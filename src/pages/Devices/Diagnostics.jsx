import { useState } from 'react'
import { Bluetooth, Copy, FlaskConical, Plug, Radio, Trash2, Unplug } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import SectionTitle from '../../components/common/SectionTitle'
import { useBleDevice } from '../../hooks/useBleDevice.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import { BLE_CONFIG, BLE_GLOVES } from '../../services/bluetooth/bleConfig.js'
import {
  describeBluetoothBlockReason,
  shortUuid,
} from '../../services/bluetooth/bleClient.js'
import { cn } from '../../utils/cn'

const STATUS_LABEL = {
  idle: { status: 'desconectado', label: 'Sin conexión' },
  requesting: { status: 'pendiente', label: 'Esperando tu selección' },
  connecting: { status: 'conectando' },
  connected: { status: 'conectado' },
  error: { status: 'error' },
}

const GLOVE_OPTIONS = [
  { value: 'cualquiera', label: 'Cualquier dispositivo BLE (ESP32)' },
  { value: 'derecho', label: `${BLE_GLOVES.derecho.label} · ${BLE_GLOVES.derecho.board}` },
  { value: 'izquierdo', label: `${BLE_GLOVES.izquierdo.label} · ${BLE_GLOVES.izquierdo.board}` },
]

export default function Diagnostics() {
  const ble = useBleDevice()
  const { copy, copied, error: copyError } = useClipboard()
  const [target, setTarget] = useState('cualquiera')

  const bluetoothNotice = describeBluetoothBlockReason(
    ble.blockReason,
    typeof window !== 'undefined' ? window.location.host : '',
  )

  const busy = ble.status === 'requesting' || ble.status === 'connecting'
  const statusInfo = STATUS_LABEL[ble.status] ?? STATUS_LABEL.idle

  const handleConnect = () => {
    if (target === 'cualquiera') {
      ble.connect({ namePrefix: BLE_CONFIG.namePrefixes[1], acceptAll: false })
      return
    }
    const glove = BLE_GLOVES[target]
    ble.connect({ namePrefix: glove.namePrefix })
  }

  const uuidSummary = ble.services
    .map(
      (service) =>
        `Servicio ${service.uuid}\n` +
        service.characteristics
          .map(
            (characteristic) =>
              `  · ${characteristic.uuid} [${Object.entries(characteristic.properties)
                .filter(([, value]) => value)
                .map(([key]) => key)
                .join(', ')}]`,
          )
          .join('\n'),
    )
    .join('\n\n')

  return (
    <div>
      <PageHeader
        backTo="/dispositivos"
        backLabel="Volver a guantes"
        eyebrow="Dispositivos"
        title="Diagnóstico de sensores"
        description="Conexión real por Bluetooth LE para descubrir qué publica tu ESP32: servicios, características y notificaciones."
        actions={<StatusBadge status={statusInfo.status} label={statusInfo.label} />}
      />

      {bluetoothNotice && (
        <ErrorMessage
          className="mb-5"
          title={bluetoothNotice.title}
          description={bluetoothNotice.description}
        />
      )}

      <Card padding="lg">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
          <Plug className="size-5 text-brand-600" aria-hidden="true" />
          Conectar un guante
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Al pulsar se abrirá el selector de Bluetooth del navegador. Elige tu ESP32 en esa lista.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="objetivo" className="text-sm font-semibold text-ink">
              Qué quieres conectar
            </label>
            <select
              id="objetivo"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              disabled={ble.status === 'connected' || busy}
              className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 text-ink"
            >
              {GLOVE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-soft">
              Se buscan dispositivos cuyo nombre empiece por{' '}
              <strong>{BLE_CONFIG.namePrefixes.join(', ')}</strong>. Puedes cambiarlo en{' '}
              <code>services/bluetooth/bleConfig.js</code>.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              icon={Bluetooth}
              onClick={handleConnect}
              disabled={!ble.supported || busy || ble.status === 'connected'}
            >
              {busy ? 'Buscando…' : 'Buscar por Bluetooth'}
            </Button>
            {ble.status === 'connected' && (
              <Button variant="secondary" icon={Unplug} onClick={ble.disconnect}>
                Desconectar
              </Button>
            )}
          </div>
        </div>

        {ble.error && (
          <ErrorMessage className="mt-4" title="No se pudo conectar" description={ble.error} />
        )}

        {ble.deviceInfo && (
          <dl className="mt-5 grid gap-2 rounded-md bg-brand-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-soft">Nombre</dt>
              <dd className="font-semibold text-ink">{ble.deviceInfo.name}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Identificador</dt>
              <dd className="font-mono text-xs font-semibold break-all text-ink">
                {ble.deviceInfo.id}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Batería</dt>
              <dd className="font-semibold text-ink">
                {ble.standardInfo?.battery !== null && ble.standardInfo?.battery !== undefined
                  ? `${ble.standardInfo.battery} %`
                  : 'no publicada por el dispositivo'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Modelo / firmware</dt>
              <dd className="font-semibold text-ink">
                {[ble.standardInfo?.model, ble.standardInfo?.firmware].filter(Boolean).join(' · ') ||
                  'no informado'}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      {ble.services.length > 0 && (
        <section aria-labelledby="servicios-titulo" className="mt-6">
          <SectionTitle
            id="servicios-titulo"
            title="Servicios y características"
            description="Esto es exactamente lo que tu ESP32 publica por Bluetooth LE."
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={Copy}
                onClick={() => copy(uuidSummary)}
              >
                {copied ? 'Copiado' : 'Copiar UUID'}
              </Button>
            }
          />

          <ul className="mt-3 space-y-3">
            {ble.services.map((service) => (
              <li key={service.uuid}>
                <Card padding="md">
                  <p className="font-mono text-sm font-bold break-all text-brand-800">
                    {service.uuid}
                  </p>
                  <p className="text-xs text-ink-soft">Servicio · {shortUuid(service.uuid)}</p>

                  <ul className="mt-3 space-y-2">
                    {service.characteristics.map((characteristic) => {
                      const key = `${service.uuid}:${characteristic.uuid}`
                      const subscribed = ble.subscriptions.includes(key)
                      return (
                        <li
                          key={characteristic.uuid}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-brand-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold break-all text-ink">
                              {characteristic.uuid}
                            </p>
                            <p className="mt-0.5 flex flex-wrap gap-1 text-[0.7rem] text-ink-soft">
                              {Object.entries(characteristic.properties)
                                .filter(([, value]) => value)
                                .map(([property]) => (
                                  <span
                                    key={property}
                                    className="rounded-full bg-white px-1.5 py-0.5 font-semibold"
                                  >
                                    {property}
                                  </span>
                                ))}
                            </p>
                          </div>

                          {characteristic.canSubscribe && (
                            <Button
                              size="sm"
                              variant={subscribed ? 'soft' : 'secondary'}
                              icon={Radio}
                              aria-pressed={subscribed}
                              onClick={() =>
                                ble.subscribe({
                                  serviceUuid: service.uuid,
                                  characteristicUuid: characteristic.uuid,
                                })
                              }
                            >
                              {subscribed ? 'Escuchando' : 'Escuchar'}
                            </Button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ble.services.length > 0 && (
        <section aria-labelledby="registro-titulo" className="mt-6">
          <SectionTitle
            id="registro-titulo"
            title="Registro en vivo"
            description="Cada notificación que envíe el guante aparecerá aquí, en hexadecimal y en texto."
            action={
              <Button variant="ghost" size="sm" icon={Trash2} onClick={ble.clearLogs}>
                Limpiar
              </Button>
            }
          />

          <Card padding="none" className="mt-3 overflow-hidden">
            {ble.logs.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-soft">
                Sin datos todavía. Pulsa «Escuchar» en una característica con la propiedad{' '}
                <strong>notify</strong> y mueve los dedos del guante.
              </p>
            ) : (
              <ul className="divide-y divide-brand-100">
                {ble.logs.map((log) => (
                  <li key={log.id} className="px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-xs font-bold text-brand-700">
                        {log.label}
                      </span>
                      <time className="text-[0.7rem] text-ink-soft">
                        {new Date(log.at).toLocaleTimeString('es')}
                      </time>
                    </div>
                    {log.hex && (
                      <p className="mt-1 font-mono text-xs break-all text-ink">{log.hex}</p>
                    )}
                    {log.ascii && (
                      <p className="font-mono text-xs text-ink-soft">«{log.ascii}»</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      <Card padding="lg" className="mt-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
          <FlaskConical className="size-5 text-warning" aria-hidden="true" />
          Qué falta para leer los sensores
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-ink">
          <li>
            <strong>1.</strong> Que el firmware del ESP32 use <strong>BLE (GATT)</strong>. Si está
            programado con Bluetooth clásico (<code>BluetoothSerial</code>), el navegador no podrá
            conectarse.
          </li>
          <li>
            <strong>2.</strong> Anunciar un servicio propio con las lecturas (sensores flex y
            MPU6050) y, si es posible, la batería con el servicio estándar <code>0x180F</code>.
          </li>
          <li>
            <strong>3.</strong> Envíame los UUID de ese servicio y de sus características, y el
            formato de los datos (por ejemplo: <code>int16 x5</code> para los flex +{' '}
            <code>float x6</code> del MPU6050). Con eso conecto la lectura real a las tarjetas y al
            diagnóstico.
          </li>
        </ol>

        <p className="mt-4 rounded-md bg-brand-50 p-3 text-xs text-ink-soft">
          El <strong>RSSI</strong> que ves en modo demostración no existe en Web Bluetooth: el
          navegador no expone la intensidad de señal de un dispositivo conectado. En modo real se
          mostrará la calidad del enlace solo si el firmware la publica como dato propio.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            as="a"
            href="https://googlechrome.github.io/samples/web-bluetooth/"
            target="_blank"
            rel="noreferrer"
            variant="secondary"
            size="sm"
          >
            Ejemplos oficiales de Web Bluetooth
          </Button>
        </div>
      </Card>

      {copyError && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {copyError}
        </p>
      )}

      <p className={cn('mt-5 text-xs text-ink-soft', ble.status !== 'connected' && 'opacity-70')}>
        Esta pantalla solo abre conexiones que tú autorizas en el selector del navegador. KLAPS no
        escanea dispositivos en segundo plano.
      </p>
    </div>
  )
}
