import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bluetooth, Copy, FlaskConical, Plug, Radio, ScanLine, Trash2, Unplug } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import SectionTitle from '../../components/common/SectionTitle'
import { useBleDevice } from '../../hooks/useBleDevice.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import { BLE_CONFIG, BLE_GLOVES } from '../../services/bluetooth/bleConfig.js'
import { describeBluetoothBlockReason, shortUuid } from '../../services/bluetooth/bleClient.js'
import {
  describeFrameContent,
  frameToHex,
  parseFrame,
} from '../../services/bluetooth/sensorFrame.js'
import ProgressBar from '../../components/common/ProgressBar'
import {
  isValidUuid,
  loadUuidSettings,
  saveUuidSettings,
} from '../../services/bluetooth/uuidSettings.js'
import { cn } from '../../utils/cn'

const STATUS_LABEL = {
  idle: { status: 'desconectado', label: 'Sin conexión' },
  requesting: { status: 'pendiente', label: 'Esperando tu selección' },
  connecting: { status: 'conectando' },
  connected: { status: 'conectado' },
  error: { status: 'error' },
}

const GLOVE_OPTIONS = [
  { value: 'cualquiera', label: 'Cualquier dispositivo BLE (sin filtro de nombre)' },
  { value: 'klaps', label: 'Cualquier placa cuyo nombre empiece por «KLAPS»' },
  { value: 'esp32', label: 'Cualquier placa cuyo nombre empiece por «ESP32»' },
  { value: 'derecho', label: `${BLE_GLOVES.derecho.label} · ${BLE_GLOVES.derecho.board}` },
  { value: 'izquierdo', label: `${BLE_GLOVES.izquierdo.label} · ${BLE_GLOVES.izquierdo.board}` },
]

/** Comprobaciones cuando la placa no aparece en el selector del navegador. */
const NOT_LISTED_CHECKS = [
  'El firmware debe anunciarse por BLE (GATT). Si usa Bluetooth clásico —BluetoothSerial, SPP— el navegador no puede verlo: hay que recompilarlo con BLE.',
  'Comprueba que el sketch llame a BLEDevice::startAdvertising() y que la placa no esté conectada a otra app o a otro móvil: mientras tiene una conexión, deja de anunciarse.',
  'Reinicia la placa con el botón EN después de cada flasheo y mantenla a menos de un metro durante la búsqueda.',
  'Algunas variantes no tienen Bluetooth (ESP32-S2). ESP32, S3 y C3 sí incluyen BLE.',
  'Si tu placa anuncia otro nombre (por ejemplo KLAPS-D), elige «Cualquier dispositivo BLE» para quitar el filtro.',
]

export default function Diagnostics() {
  const ble = useBleDevice()
  const { copy, copied, error: copyError } = useClipboard()
  const [target, setTarget] = useState('cualquiera')
  const [savedUuids, setSavedUuids] = useState(loadUuidSettings)
  const [saveMessage, setSaveMessage] = useState('')
  const [serviceInput, setServiceInput] = useState(savedUuids.service)
  const [sensorsInput, setSensorsInput] = useState(savedUuids.sensors)

  const frame = useMemo(
    () => parseFrame(ble.lastPacket?.bytes ?? null, ble.lastPacket?.at),
    [ble.lastPacket],
  )

  const frameNotice = useMemo(
    () => describeFrameContent(frame, ble.lastPacket?.bytes?.length ?? 0),
    [frame, ble.lastPacket],
  )

  const bluetoothNotice = describeBluetoothBlockReason(
    ble.blockReason,
    typeof window !== 'undefined' ? window.location.host : '',
  )

  const busy = ble.status === 'requesting' || ble.status === 'connecting'
  const statusInfo = STATUS_LABEL[ble.status] ?? STATUS_LABEL.idle

  const extraServices = savedUuids.service ? [savedUuids.service] : []

  const handleConnect = () => {
    // Sin filtro: aparece cualquier dispositivo BLE, se llame como se llame.
    if (target === 'cualquiera') {
      ble.connect({ acceptAll: true, extraServices })
      return
    }
    if (target === 'klaps') {
      ble.connect({ namePrefix: BLE_CONFIG.namePrefixes[0], extraServices })
      return
    }
    if (target === 'esp32') {
      ble.connect({ namePrefix: BLE_CONFIG.namePrefixes[1], extraServices })
      return
    }
    ble.connect({ namePrefixes: BLE_GLOVES[target].namePrefixes ?? [BLE_GLOVES[target].namePrefix], extraServices })
  }

  const saveUuids = () => {
    const next = saveUuidSettings({ service: serviceInput, sensors: sensorsInput })
    setSavedUuids(next)
    setServiceInput(next.service)
    setSensorsInput(next.sensors)
    setSaveMessage(
      next.service && next.sensors
        ? 'Guardados en este navegador. Ya puedes probar la lectura aquí abajo.'
        : 'Guardado parcial: revisa los dos UUID.',
    )
  }

  const clearUuids = () => {
    const next = saveUuidSettings({ service: '', sensors: '' })
    setSavedUuids(next)
    setServiceInput('')
    setSensorsInput('')
    setSaveMessage('UUID borrados de este navegador.')
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
              «Sin filtro» abre el selector con <strong>todos</strong> los dispositivos BLE que
              estén anunciándose. Las demás opciones filtran por nombre (
              {BLE_CONFIG.namePrefixes.join(', ')}), así que una placa con otro nombre no
              aparecería. Puedes cambiarlo en <code>services/bluetooth/bleConfig.js</code>.
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

      {ble.status === 'connected' && ble.services.length === 0 && (
        <ErrorMessage
          className="mt-5"
          title="Conectado, pero el navegador no muestra ningún servicio"
          description="Chrome solo deja leer servicios que se declaran antes de conectar. Si tu guante publica un servicio propio, pega su UUID más abajo (lo tienes en el firmware) y vuelve a conectar para verlo y copiarlo."
        />
      )}

      <Card as="section" aria-labelledby="servicio-propio" padding="lg" className="mt-6">
        <h2
          id="servicio-propio"
          className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800"
        >
          <Plug className="size-5 text-brand-600" aria-hidden="true" />
          UUID del firmware del guante
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Web Bluetooth solo puede explorar los servicios que se declaran al conectar. Pega el UUID
          del servicio y el de la característica de sensores de tu firmware: se guardan en este
          navegador y los usa el resto de la app para decodificar la trama de 34 bytes.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="uuid-servicio" className="text-sm font-semibold text-ink">
              UUID del servicio
            </label>
            <input
              id="uuid-servicio"
              type="text"
              autoComplete="off"
              spellCheck="false"
              value={serviceInput}
              onChange={(event) => setServiceInput(event.target.value)}
              placeholder="0000abcd-0000-1000-8000-00805f9b34fb"
              className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 font-mono text-sm text-ink"
            />
            {serviceInput && !isValidUuid(serviceInput) && (
              <p className="mt-1 text-xs font-semibold text-danger">UUID no válido (4 caracteres u 8-4-4-4-12).</p>
            )}
          </div>

          <div>
            <label htmlFor="uuid-sensores" className="text-sm font-semibold text-ink">
              UUID de la característica de sensores
            </label>
            <input
              id="uuid-sensores"
              type="text"
              autoComplete="off"
              spellCheck="false"
              value={sensorsInput}
              onChange={(event) => setSensorsInput(event.target.value)}
              placeholder="0000abce-0000-1000-8000-00805f9b34fb"
              className="mt-1 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 font-mono text-sm text-ink"
            />
            {sensorsInput && !isValidUuid(sensorsInput) && (
              <p className="mt-1 text-xs font-semibold text-danger">UUID no válido (4 caracteres u 8-4-4-4-12).</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={saveUuids} disabled={!isValidUuid(serviceInput) || !isValidUuid(sensorsInput)}>
            Guardar UUID
          </Button>
          {(savedUuids.service || savedUuids.sensors) && (
            <Button variant="secondary" onClick={clearUuids}>
              Quitar
            </Button>
          )}
        </div>

        {(savedUuids.service || savedUuids.sensors) && (
          <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 font-mono text-xs font-semibold break-all text-brand-800">
            Guardado: servicio {savedUuids.service || '—'} · sensores {savedUuids.sensors || '—'}
          </p>
        )}

        {saveMessage && (
          <p className="mt-2 text-sm font-semibold text-success" role="status">
            {saveMessage}
          </p>
        )}

        <p className="mt-3 text-xs text-ink-soft">
          La conexión de esta pantalla es solo para diagnóstico: no cuenta como guante conectado en
          el panel. Para usarla en Inicio y en Traducción, conecta el guante desde{' '}
          <Link to="/dispositivos" className="font-semibold text-brand-700 underline underline-offset-2">
            Guantes
          </Link>{' '}
          o desde{' '}
          <Link to="/entrenamiento" className="font-semibold text-brand-700 underline underline-offset-2">
            Entrenamiento
          </Link>
          .
        </p>
      </Card>

      <Card as="section" aria-labelledby="probar-lectura" padding="lg" className="mt-6">
        <h2
          id="probar-lectura"
          className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800"
        >
          <Radio className="size-5 text-brand-600" aria-hidden="true" />
          Probar lectura de sensores
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Suscríbete a la característica con los UUID guardados. Si llega la trama de 34 bytes,
          verás los flex y el MPU-6050 aquí mismo.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            icon={Radio}
            onClick={() =>
              ble.subscribe({
                serviceUuid: savedUuids.service,
                characteristicUuid: savedUuids.sensors,
              })
            }
            disabled={ble.status !== 'connected' || !savedUuids.service || !savedUuids.sensors}
          >
            Escuchar sensores
          </Button>
          <span className="text-sm text-ink-soft">
            {ble.packetCount} paquetes recibidos
            {frame ? ` · último ${new Date(frame.at).toLocaleTimeString('es')}` : ''}
          </span>
        </div>

        {frame ? (
          <div className="mt-4 rounded-md bg-brand-50 p-4">
            {frameNotice && (
              <p className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
                {frameNotice}
              </p>
            )}

            <p className="text-sm font-semibold text-brand-800">Flex (0-100 %)</p>
            <ul className="mt-2 space-y-1.5">
              {frame.flex.map((value, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-ink-soft">flex {index}</span>
                  <ProgressBar value={value} size="sm" className="flex-1" />
                  <span className="w-10 text-right text-xs font-semibold text-ink">
                    {Math.round(value)} %
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-xs text-ink">
              ax {frame.imu.ax.toFixed(2)} · ay {frame.imu.ay.toFixed(2)} · az {frame.imu.az.toFixed(2)} ·
              gx {frame.imu.gx.toFixed(2)} · gy {frame.imu.gy.toFixed(2)} · gz {frame.imu.gz.toFixed(2)}
            </p>

            {ble.lastPacket?.bytes && (
              <div className="mt-3 space-y-1 border-t border-brand-200 pt-3">
                <p className="text-xs font-semibold text-ink-soft">
                  Última trama en hexadecimal · {ble.lastPacket.bytes.length} bytes
                </p>
                <p className="font-mono text-[0.68rem] leading-relaxed break-all text-ink">
                  <span className="text-brand-700">
                    flex (bytes 0-9): {frameToHex(ble.lastPacket.bytes.slice(0, 10))}
                  </span>
                  <br />
                  <span className="text-ink-soft">
                    imu (bytes 10-33): {frameToHex(ble.lastPacket.bytes.slice(10))}
                  </span>
                </p>
                <p className="text-[0.68rem] text-ink-soft">
                  Copia estas dos líneas si necesitas ayuda: dicen exactamente qué está enviando el
                  firmware.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-dashed border-brand-200 px-4 py-3 text-sm text-ink-soft">
            {ble.status !== 'connected'
              ? 'Conecta un guante primero.'
              : !savedUuids.service || !savedUuids.sensors
                ? 'Guarda los dos UUID para poder suscribirte.'
                : 'Sin tramas todavía. Pulsa «Escuchar sensores».'}
          </p>
        )}
      </Card>

      <Card as="section" aria-labelledby="no-aparece" padding="lg" className="mt-6">
        <h2
          id="no-aparece"
          className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800"
        >
          <ScanLine className="size-5 text-brand-600" aria-hidden="true" />
          ¿No aparece tu ESP32 en la lista?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          La app solo puede elegir dispositivos que el navegador vea anunciarse. Si tu placa no
          está en la lista, el motivo casi siempre está en el firmware o en el adaptador del
          equipo, no en KLAPS.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-ink">
          {NOT_LISTED_CHECKS.map((check) => (
            <li key={check} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
              <span>{check}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-md bg-brand-50 p-3 text-sm text-ink">
          <strong>Prueba decisiva:</strong> abre <code>chrome://bluetooth-internals</code> en otra
          pestaña, pulsa <em>Start Scan</em> y busca tu placa en esa lista. Si Chrome tampoco la
          ve allí, el problema es del anuncio BLE del ESP32; si aparece ahí y no en KLAPS, es el
          filtro de nombre.
        </p>
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
          El <strong>RSSI</strong> no lo expone Web Bluetooth en una conexión abierta: el
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
