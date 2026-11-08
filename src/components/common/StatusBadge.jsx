import {
  Bluetooth,
  BluetoothOff,
  CircleCheck,
  CircleHelp,
  FlaskConical,
  Loader2,
  TriangleAlert,
} from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Estado de dispositivos y acciones.
 * Regla de accesibilidad: SIEMPRE icono + texto, nunca solo color.
 */
const statusStyles = {
  conectado: {
    label: 'Conectado',
    icon: Bluetooth,
    classes: 'bg-success-soft text-success',
  },
  conectando: {
    label: 'Conectando…',
    icon: Loader2,
    classes: 'bg-warning-soft text-warning',
    spin: true,
  },
  desconectado: {
    label: 'Desconectado',
    icon: BluetoothOff,
    classes: 'bg-brand-50 text-ink-soft',
  },
  error: {
    label: 'Error de conexión',
    icon: TriangleAlert,
    classes: 'bg-danger-soft text-danger',
  },
  demo: {
    label: 'Modo demostración',
    icon: FlaskConical,
    classes: 'bg-warning-soft text-warning',
  },
  exito: {
    label: 'Listo',
    icon: CircleCheck,
    classes: 'bg-success-soft text-success',
  },
  pendiente: {
    label: 'Pendiente',
    icon: CircleHelp,
    classes: 'bg-brand-50 text-ink-soft',
  },
}

export default function StatusBadge({ status = 'pendiente', label, className, size = 'md' }) {
  const config = statusStyles[status] ?? statusStyles.pendiente
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        config.classes,
        className,
      )}
    >
      <Icon
        className={cn('shrink-0', size === 'sm' ? 'size-3.5' : 'size-4', config.spin && 'animate-spin')}
        aria-hidden="true"
      />
      <span>{label ?? config.label}</span>
    </span>
  )
}
