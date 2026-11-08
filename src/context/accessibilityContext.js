import { createContext, useContext } from 'react'

/** Contexto de preferencias de accesibilidad. */
export const AccessibilityContext = createContext(null)

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility debe usarse dentro de <AccessibilityProvider>')
  }
  return context
}
