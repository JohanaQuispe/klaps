import { cn } from '../../utils/cn'

/**
 * Título de sección con jerarquía clara:
 * eyebrow (contexto) → título → descripción → acción opcional.
 */
export default function SectionTitle({
  eyebrow,
  title,
  description,
  action,
  level = 2,
  id,
  className,
}) {
  const Heading = `h${level}`

  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">
            {eyebrow}
          </p>
        )}
        <Heading
          id={id}
          className={cn(
            'font-display font-extrabold text-brand-800',
            level === 1 ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl',
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className="mt-1.5 max-w-prose text-sm text-ink-soft sm:text-base">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
