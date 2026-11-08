import { cn } from '../../utils/cn'

/** Barra de progreso accesible (valor + etiqueta textual, no solo color). */
const toneStyles = {
  brand: 'bg-brand-600',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export default function ProgressBar({
  value = 0,
  label,
  valueLabel,
  tone = 'brand',
  size = 'md',
  className,
}) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <div className={className}>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
          {label && <span className="font-medium text-ink-soft">{label}</span>}
          {valueLabel && <span className="font-semibold text-ink">{valueLabel}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue} %${label ? ` · ${label}` : ''}`}
        className={cn(
          'w-full overflow-hidden rounded-full bg-brand-100',
          size === 'sm' ? 'h-2' : 'h-2.5',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', toneStyles[tone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}
