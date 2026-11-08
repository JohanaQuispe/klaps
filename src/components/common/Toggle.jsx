import { useId } from 'react'
import { cn } from '../../utils/cn'

/**
 * Interruptor accesible (role="switch").
 * El texto del estado ("Activado" / "Desactivado") es visible,
 * de modo que el estado no depende únicamente del color.
 */
export default function Toggle({ checked, onChange, label, description, disabled, className }) {
  const id = useId()
  const descriptionId = `${id}-description`

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="font-display font-bold text-brand-800">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-sm text-ink-soft">
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-describedby={description ? descriptionId : undefined}
          disabled={disabled}
          onClick={() => onChange?.(!checked)}
          className={cn(
            'relative inline-flex h-8 w-14 items-center rounded-full border transition-colors duration-200',
            checked ? 'border-brand-600 bg-brand-600' : 'border-brand-200 bg-brand-100',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <span
            className={cn(
              'inline-block size-6 rounded-full bg-white shadow-soft transition-transform duration-200',
              checked ? 'translate-x-7' : 'translate-x-1',
            )}
            aria-hidden="true"
          />
        </button>
        <span className="text-xs font-semibold text-ink-soft" aria-hidden="true">
          {checked ? 'Activado' : 'Desactivado'}
        </span>
      </div>
    </div>
  )
}
