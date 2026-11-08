import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccessibilityContext } from './accessibilityContext.js'
import { DEFAULT_PREFERENCES, STORAGE_KEY } from './accessibilityOptions.js'

/**
 * Aplica y persiste las preferencias de accesibilidad.
 * Los valores se escriben como atributos en <html>, de modo que el CSS
 * (y todo el layout medido en rem) reacciona de inmediato.
 */
function readStoredPreferences() {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    // localStorage bloqueado (modo privado estricto): se usan los valores por defecto
    return DEFAULT_PREFERENCES
  }
}

export default function AccessibilityProvider({ children }) {
  const [preferences, setPreferences] = useState(readStoredPreferences)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.fontSize = preferences.fontSize
    root.dataset.contrast = preferences.contrast
    root.dataset.motion = preferences.motion

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Sin persistencia disponible: la app sigue funcionando en memoria
    }
  }, [preferences])

  const updatePreference = useCallback((key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
  }, [])

  const value = useMemo(
    () => ({ preferences, updatePreference, resetPreferences }),
    [preferences, updatePreference, resetPreferences],
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}
