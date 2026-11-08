import { useId } from 'react'
import { cn } from '../../utils/cn'

/**
 * Selector de opciones exclusivas.
 * Implementado con botones aria-pressed dentro de un grupo etiquetado:
 * funciona con teclado, lector de pantalla y área táctil amplia.
 */
export default function SegmentedControl({
  label,
  description,
  options = [],
  value,
  onChange,
  className,
  size = 'md',
}) {
  const groupId = useId()

  return (
    <div className={className}>
      {label && (
        <p id={`${groupId}-label`} className="font-display font-bold text-brand-800">
          {label}
        </p>
      )}
      {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      <div
        role="group"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        className={cn(
          'mt-2 grid gap-1.5 rounded-full bg-brand-50 p-1.5',
          options.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
        )}
      >
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange?.(option.value)}
              className={cn(
                'rounded-full font-display font-bold transition-colors duration-200',
                size === 'sm' ? 'min-h-9 px-2 text-sm' : 'min-h-11 px-3 text-[0.95rem]',
                active
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-brand-700 hover:bg-white/70',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
