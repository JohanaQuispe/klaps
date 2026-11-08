import { Bluetooth, Home, MessageSquareQuote, Settings, Sparkles } from 'lucide-react'

/**
 * Destinos principales de KLAPS.
 * Una sola fuente de verdad para la barra inferior (móvil) y la lateral (escritorio).
 */
export const NAV_ITEMS = [
  { to: '/inicio', label: 'Inicio', shortLabel: 'Inicio', icon: Home },
  { to: '/traducir', label: 'Traducir gestos', shortLabel: 'Traducir', icon: Sparkles },
  { to: '/dispositivos', label: 'Guantes', shortLabel: 'Guantes', icon: Bluetooth },
  { to: '/frases', label: 'Frases rápidas', shortLabel: 'Frases', icon: MessageSquareQuote },
  { to: '/ajustes', label: 'Ajustes', shortLabel: 'Ajustes', icon: Settings },
]
