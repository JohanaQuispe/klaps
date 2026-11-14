import { NavLink } from 'react-router-dom'
import { Accessibility, History, Mic, Siren } from 'lucide-react'
import Logo from '../brand/Logo'
import StatusBadge from '../common/StatusBadge'
import { NAV_ITEMS } from './navigation'
import { cn } from '../../utils/cn'
import { APP_BUILD_LABEL } from '../../data/appInfo'

/** Navegación lateral (escritorio ≥ 1024 px). */
const SECONDARY_ITEMS = [
  { to: '/voz', label: 'Comunicación por voz', icon: Mic },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/emergencia', label: 'Emergencia SOS', icon: Siren },
]

export default function Sidebar({ onOpenAccessibility }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-brand-100 bg-white/90 px-5 py-6 backdrop-blur-md lg:flex">
      <NavLink to="/" aria-label="Ir a la bienvenida de KLAPS" className="rounded-md">
        <Logo size={44} />
      </NavLink>

      <nav aria-label="Navegación principal" className="mt-8 flex-1">
        <ul className="space-y-1.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 items-center gap-3 rounded-md px-3.5 font-display font-bold transition-colors',
                    isActive
                      ? 'bg-brand-100 text-brand-800'
                      : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('size-5 shrink-0', isActive && 'text-brand-600')} aria-hidden="true" />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mb-4">
        <p className="px-3.5 text-[0.68rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
          Más
        </p>
        <ul className="mt-1.5 space-y-1">
          {SECONDARY_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-10 items-center gap-3 rounded-md px-3.5 text-sm font-semibold transition-colors',
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:text-brand-700',
                  )
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onOpenAccessibility}
          className="flex min-h-12 w-full items-center gap-3 rounded-md border border-brand-200 px-3.5 font-display font-bold text-brand-700 transition-colors hover:bg-brand-50"
        >
          <Accessibility className="size-5" aria-hidden="true" />
          Accesibilidad
        </button>

        <div className="rounded-md bg-brand-50 p-3.5">
          <StatusBadge status="demo" size="sm" />
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Los guantes aún no están conectados por Bluetooth. La app funciona con datos simulados.
          </p>
          <p className="mt-2 text-[0.7rem] font-semibold tracking-wide text-ink-soft">
            {APP_BUILD_LABEL}
          </p>
        </div>
      </div>
    </aside>
  )
}
