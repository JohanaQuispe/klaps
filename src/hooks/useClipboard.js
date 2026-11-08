import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copiar al portapapeles con confirmación visible.
 * Si la API no está disponible o el navegador la bloquea, se informa del error.
 */
export function useClipboard(resetAfter = 2200) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text) => {
      setError('')
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const area = document.createElement('textarea')
          area.value = text
          area.setAttribute('readonly', '')
          area.style.position = 'fixed'
          area.style.opacity = '0'
          document.body.appendChild(area)
          area.select()
          document.execCommand('copy')
          document.body.removeChild(area)
        }
        setCopied(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(false), resetAfter)
        return true
      } catch {
        setError('No se pudo copiar. Selecciona el texto y cópialo manualmente.')
        return false
      }
    },
    [resetAfter],
  )

  return { copied, error, copy }
}
