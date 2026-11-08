import { createContext, useContext } from 'react'

/** Historial de comunicaciones y frases favoritas. */
export const HistoryContext = createContext(null)

export function useHistory() {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error('useHistory debe usarse dentro de <HistoryProvider>')
  }
  return context
}
