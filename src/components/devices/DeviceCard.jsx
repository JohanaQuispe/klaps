import { Link } from 'react-router-dom'
import { Clock, Hand, Power, RefreshCw, SlidersHorizontal } from 'lucide-react'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ProgressBar from '../common/ProgressBar'
import { batteryState, signalState, GLOVE_STATUS } from '../../services/bluetooth/mockGuards.js'
import { formatBattery, formatRelativeTime, formatRssi } from '../../utils/format.js'
import { cn } from '../../utils/cn'

function SignalBars({ bars }) {
  return (
    <span className="flex items-end gap-[3px]" aria-hidden="true">
      {[1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={cn(
            'w-1.5 rounded-sm transition-colors',
            level <= bars ? 'bg-success' : 'bg-brand-100',
          )}
          style={{ height: `${4 + level * 3}px` }}
        />
      ))}
    </span>
  )
}

/** Tarjeta completa de un guante (pantalla Dispositivos). */
export default function DeviceCard({ glove, onReconnect, onDisconnect, onRequestConnect }) {
  const battery = batteryState(glove.battery)
  const signal = signalState(glove.rssi)
  const isConnected = glove.status === GLOVE_STATUS.CONECTADO
  const isConnecting = glove.status === GLOVE_STATUS.CONECTANDO

  const batteryTone =
    battery.tone === 'danger' ? 'danger' : battery.tone === 'warning' ? 'warning' : 'brand'

  return (
    <article className="k-card flex flex-col rounded-lg bg-white p-5 shadow-soft">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-700"
            aria-hidden="true"
          >
            <Hand className="size-6" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold text-brand-800">{glove.label}</h3>
            <p className="text-sm text-ink-soft">{glove.role}</p>
          </div>
        </div>
        <StatusBadge status={glove.status} />
      </header>

      <div className="mt-5 space-y-4">
        <div>
          <ProgressBar
            value={glove.battery}
            label="Batería"
            valueLabel={formatBattery(glove.battery)}
            tone={batteryTone}
          />
          <p className="mt-1 text-xs font-medium text-ink-soft">{battery.label}</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md bg-brand-50 px-3.5 py-3">
          <span className="text-sm font-medium text-ink-soft">Señal (RSSI)</span>
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <SignalBars bars={signal.bars} />
            <span>{formatRssi(glove.rssi)}</span>
            <span className="text-xs font-medium text-ink-soft">· {signal.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Última sincronización:{' '}
            <span className="font-semibold text-ink">{formatRelativeTime(glove.lastSyncAt)}</span>
          </span>
        </div>
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
            {isConnecting ? 'Conectando…' : 'Reconectar'}
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
          aria-label={`Conectar ${glove.label} por Bluetooth`}
          onClick={() => onRequestConnect?.(glove)}
        >
          Bluetooth
        </Button>
      </div>
    </article>
  )
}

/** Fila compacta de un guante (resumen del Panel). */
export function DeviceRow({ glove }) {
  const signal = signalState(glove.rssi)

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
            {formatBattery(glove.battery)} · {signal.label}
          </p>
        </div>
      </div>
      <StatusBadge status={glove.status} size="sm" />
    </div>
  )
}
