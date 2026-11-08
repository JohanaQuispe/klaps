import { TriangleAlert } from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Mensaje de error comprensible: qué pasó + cómo resolverlo.
 * `role="alert"` para que se anuncie a lectores de pantalla.
 */
export default function ErrorMessage({ title = 'Algo no salió bien', description, action, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-md border border-danger/25 bg-danger-soft p-4 text-left',
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-display font-bold text-danger">{title}</p>
        {description && <p className="mt-1 text-sm text-ink">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  )
}
