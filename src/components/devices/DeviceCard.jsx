import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Clock, Hand, Power, RefreshCw, SlidersHorizontal } from 'lucide-react'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ProgressBar from '../common/ProgressBar'
import { batteryState, GLOVE_STATUS } from '../../services/bluetooth/gloveState.js'
import { formatBattery, formatRelativeTime } from '../../utils/format.js'
import { cn } from '../../utils/cn'

/** Miniatura del guante oficial; si falta el archivo cae al icono, sin imagen rota. */
function GloveThumb({ glove }) {
  const [failed, setFailed] = useState(false)

  return (
    <span
      className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-50"
      aria-hidden="true"
    >
      {failed ? (
        <Hand className="size-6 text-brand-700" />
      ) : (
        <img
          src={`/illustrations/guante-${glove.id}.webp`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-12 w-auto object-contain"
        />
      )}
    </span>
  )
}

/** Tarjeta completa de un guante (pantalla Dispositivos). Solo datos reales. */
export default function DeviceCard({
  glove,
  onReconnect,
  onDisconnect,
  onRequestConnect,
  onSubscribe,
  onCalibrate,
  sensorsConfigured = false,
}) {
  const battery = batteryState(glove.battery)
  const isConnected = glove.status === GLOVE_STATUS.CONECTADO
  const isConnecting = glove.status === GLOVE_STATUS.CONECTANDO
  const hasBattery = typeof glove.battery === 'number'

  const batteryTone =
    battery.tone === 'danger' ? 'danger' : battery.tone === 'warning' ? 'warning' : 'brand'

  return (
    <article className="k-card flex flex-col rounded-lg bg-white p-5 shadow-soft">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <GloveThumb glove={glove} />
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold text-brand-800">{glove.label}</h3>
            <p className="text-sm text-ink-soft">{glove.role}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {glove.deviceName ? `BLE: ${glove.deviceName}` : `${glove.board} · sin vincular`}
            </p>
          </div>
        </div>
        <StatusBadge status={glove.status} />
      </header>

      <div className="mt-5 flex-1 space-y-4">
        {hasBattery ? (
          <div>
            <ProgressBar
              value={glove.battery}
              label="Batería"
              valueLabel={formatBattery(glove.battery)}
              tone={batteryTone}
            />
            <p className="mt-1 text-xs font-medium text-ink-soft">
              {battery.label} · publicada por el dispositivo
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-md bg-brand-50 px-3.5 py-3">
            <span className="text-sm font-medium text-ink-soft">Batería</span>
            <span className="text-sm font-semibold text-ink">{battery.label}</span>
          </div>
        )}

        {isConnected && (
          <div className="rounded-md border border-brand-100 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <Activity className="size-4" aria-hidden="true" />
                Sensores
              </span>
              <span className="text-sm font-semibold text-ink">
                {glove.sensorsListening ? `Escuchando · ${glove.frames} tramas` : 'Sin suscribir'}
              </span>
            </div>

            {!glove.sensorsListening && (
              <p className="mt-1 text-[0.7rem] leading-snug text-ink-soft">
                {sensorsConfigured
                  ? 'Pulsa «Activar sensores». Si vuelve a fallar, desconecta y conecta de nuevo.'
                  : 'Guarda los UUID del servicio y de sensores en el diagnóstico o en Entrenamiento.'}
              </p>
            )}

            {glove.sensorsListening && glove.frames > 0 && !glove.frameIssue && (
              <div className="mt-2 space-y-1.5 border-t border-brand-100 pt-2">
                <div className="flex items-center justify-between text-[0.7rem] font-semibold text-brand-800">
                  <span>Flexión calibrada en vivo</span>
                  <span className="font-normal text-success">34 bytes · 20 Hz</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[0.68rem]">
                  {[
                    { label: 'Pul', title: 'Pulgar (GPIO 36)' },
                    { label: 'Índ', title: 'Índice (GPIO 39)' },
                    { label: 'Med', title: 'Medio (GPIO 34)' },
                    { label: 'Anu', title: 'Anular (GPIO 35)' },
                    { label: 'Meñ', title: 'Meñique (GPIO 32)' },
                  ].map((finger, i) => {
                    const val = Math.round(glove.reading?.flex?.[i] ?? 0)
                    const rawVal = glove.reading?.rawFlex?.[i]
                    const isAnular = i === 3
                    const isInactive = isAnular || rawVal === 0

                    return (
                      <div
                        key={i}
                        title={`${finger.title} · raw ADC: ${rawVal ?? '—'} · peso: ${isInactive ? 0 : 1.4}`}
                        className={cn(
                          'rounded p-1 transition-colors border',
                          isInactive
                            ? 'bg-neutral-50 border-neutral-200 text-ink-soft opacity-70'
                            : 'bg-brand-50 border-brand-200 text-brand-900',
                        )}
                      >
                        <span className="block text-[0.62rem] text-ink-soft">{finger.label}</span>
                        <span className="font-bold text-xs">{isInactive ? '0%' : `${val}%`}</span>
                        <span className="block text-[0.58rem] font-mono text-ink-soft truncate">
                          {isInactive ? 'peso 0' : `raw ${rawVal ?? '—'}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[0.65rem] text-brand-700 font-medium">
                  ✓ 4 dedos activos (peso 1.4) · Anular ignorado (raw 0 · peso 0)
                </p>
                {glove.reading?.imu && (
                  <p className="font-mono text-[0.65rem] text-ink-soft">
                    az: {glove.reading.imu.az.toFixed(1)} m/s² · gx: {glove.reading.imu.gx.toFixed(1)} rad/s
                  </p>
                )}
              </div>
            )}

            {glove.frameIssue && (
              <p className="mt-1 text-[0.7rem] font-semibold leading-snug text-danger">
                {glove.frameIssue}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Última sincronización:{' '}
            <span className="font-semibold text-ink">
              {glove.lastSyncAt ? formatRelativeTime(glove.lastSyncAt) : 'sin sincronizar'}
            </span>
          </span>
        </div>

        {glove.error && (
          <p className="rounded-md bg-danger-soft px-3.5 py-2 text-xs font-semibold text-danger">
            {glove.error}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 pt-1">
        {isConnected ? (
          <Button size="sm" variant="secondary" icon={Power} onClick={() => onDisconnect?.(glove.id)}>
            Desconectar
          </Button>
        ) : (
          <Button
            size="sm"
            icon={RefreshCw}
            onClick={() => onReconnect?.(glove.id)}
            disabled={isConnecting}
          >
            {isConnecting ? 'Conectando…' : 'Conectar'}
          </Button>
        )}
        {isConnected && !glove.sensorsListening && sensorsConfigured && (
          <Button size="sm" variant="secondary" icon={Activity} onClick={() => onSubscribe?.(glove.id)}>
            Activar sensores
          </Button>
        )}
        {isConnected && (
          <Button
            size="sm"
            variant="secondary"
            icon={SlidersHorizontal}
            onClick={() => onCalibrate?.(glove)}
          >
            Calibrar mano abierta / puño cerrado
          </Button>
        )}
        <Button
          as={Link}
          to="/dispositivos/diagnostico"
          size="sm"
          variant="ghost"
          icon={SlidersHorizontal}
        >
          Diagnóstico
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Cómo conectar ${glove.label} por Bluetooth`}
          onClick={() => onRequestConnect?.(glove)}
        >
          Cómo conectar
        </Button>
      </div>
    </article>
  )
}

/** Fila compacta de un guante (resumen del Panel). */
export function DeviceRow({ glove }) {
  const hasBattery = typeof glove.battery === 'number'

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            glove.status === GLOVE_STATUS.CONECTADO
              ? 'bg-success-soft text-success'
              : 'bg-brand-50 text-ink-soft',
          )}
          aria-hidden="true"
        >
          <Hand className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-brand-800">{glove.label}</p>
          <p className="text-xs text-ink-soft">
            {hasBattery ? formatBattery(glove.battery) : 'Sin lectura'}
          </p>
        </div>
      </div>
      <StatusBadge status={glove.status} size="sm" />
    </div>
  )
}
