import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

/** Cabecera de página: título h1, descripción y acciones. */
export default function PageHeader({ eyebrow, title, description, actions, backTo, backLabel = 'Volver' }) {
  return (
    <header className="mb-6 lg:mb-8">
      {backTo && (
        <Link
          to={backTo}
          className="mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-full pr-3 font-display text-sm font-bold text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backLabel}
        </Link>
      )}

      {eyebrow && (
        <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">
          {eyebrow}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] leading-tight font-extrabold text-brand-800 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-prose text-sm text-ink-soft sm:text-base">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  )
}
