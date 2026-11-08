import { cn } from '../../utils/cn'

/**
 * Estado vacío: explica qué falta y ofrece una acción concreta.
 * Nunca deja al usuario en una pantalla en blanco.
 */
export default function EmptyState({ icon: Icon, image, imageAlt = '', title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed border-brand-200 bg-white/70 px-6 py-10 text-center',
        className,
      )}
    >
      {image ? (
        <img src={image} alt={imageAlt} className="mb-4 h-28 w-auto object-contain" loading="lazy" />
      ) : (
        Icon && (
          <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Icon className="size-7" aria-hidden="true" />
          </span>
        )
      )}
      <p className="font-display text-lg font-bold text-brand-800">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
