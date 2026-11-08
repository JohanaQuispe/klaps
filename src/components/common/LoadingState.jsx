import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

/** Indicador de carga accesible (role=status + texto visible). */
export default function LoadingState({ label = 'Cargando…', description, className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg bg-white/70 px-6 py-10 text-center',
        className,
      )}
    >
      <Loader2 className="size-7 animate-spin text-brand-600" aria-hidden="true" />
      <p className="font-display font-bold text-brand-800">{label}</p>
      {description && <p className="max-w-sm text-sm text-ink-soft">{description}</p>}
    </div>
  )
}
