import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navigation'
import { cn } from '../../utils/cn'

/**
 * Navegación inferior (móvil y tablet).
 * Objetivos táctiles de 64 px, etiqueta visible y estado activo
 * indicado con color + fondo + aria-current.
 */
export default function MobileTabBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="k-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1.5">
        {NAV_ITEMS.map(({ to, shortLabel, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[0.7rem] font-semibold text-ink-soft transition-colors"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full transition-colors',
                      isActive ? 'bg-brand-100 text-brand-700' : 'text-ink-soft',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className={cn(isActive && 'text-brand-700')}>{shortLabel}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
