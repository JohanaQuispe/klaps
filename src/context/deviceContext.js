import { createContext, useContext } from 'react'

/** Contexto del estado de los guantes. */
export const DeviceContext = createContext(null)

export function useDevices() {
  const context = useContext(DeviceContext)
  if (!context) {
    throw new Error('useDevices debe usarse dentro de <DeviceProvider>')
  }
  return context
}
