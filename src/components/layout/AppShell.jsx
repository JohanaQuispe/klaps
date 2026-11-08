import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Accessibility } from 'lucide-react'
import Logo from '../brand/Logo'
import Sidebar from './Sidebar'
import MobileTabBar from './MobileTabBar'
import SkipLink from './SkipLink'
import AccessibilityPanel from '../accessibility/AccessibilityPanel'

/**
 * Estructura de la aplicación autenticada:
 * barra lateral en escritorio, barra inferior en móvil,
 * y un único punto de acceso al panel de accesibilidad.
 */
export default function AppShell() {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-canvas">
      <SkipLink />
      <Sidebar onOpenAccessibility={() => setPanelOpen(true)} />

      <div className="lg:pl-72">
        {/* Barra superior (solo móvil/tablet) */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-brand-100 bg-canvas/90 px-5 py-2.5 backdrop-blur-md lg:hidden">
          <Link to="/inicio" aria-label="KLAPS, ir al inicio" className="rounded-md">
            <Logo size={38} showTagline={false} />
          </Link>
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="flex size-11 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700"
          >
            <Accessibility className="size-5" aria-hidden="true" />
            <span className="sr-only">Ajustes de accesibilidad</span>
          </button>
        </header>

        <main
          id="contenido"
          className="mx-auto w-full max-w-5xl px-5 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-10 lg:pb-16"
        >
          <Outlet />
        </main>
      </div>

      <MobileTabBar />
      <AccessibilityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  )
}
