import { useState } from 'react'
import { cn } from '../../utils/cn'

/**
 * Mascota de KLAPS (recursos oficiales, recortados y optimizados).
 *
 *   saludo → postura de saludo con los guantes puestos
 *   feliz  → brazos arriba, ojos cerrados (aciertos y estados de éxito)
 *
 * Las imágenes se recortaron del lienzo original y se convirtieron a WebP
 * (10,5 MB → 71 KB) conservando proporciones: se escala por alto, nunca se deforma.
 */
const SOURCES = {
  saludo: '/illustrations/mascota.webp',
  feliz: '/illustrations/mascota-feliz.webp',
}

const ALT = {
  saludo: 'Mascota de KLAPS saludando con los guantes puestos',
  feliz: 'Mascota de KLAPS celebrando con los brazos en alto',
}

export default function Mascot({ variant = 'saludo', size, className, float = true, alt }) {
  const [missing, setMissing] = useState(false)
  if (missing) return null

  return (
    <img
      src={SOURCES[variant] ?? SOURCES.saludo}
      alt={alt ?? ALT[variant] ?? ALT.saludo}
      loading="lazy"
      onError={() => setMissing(true)}
      className={cn(
        'pointer-events-none w-auto max-w-full object-contain select-none',
        float && 'animate-float',
        className,
      )}
      style={size ? { height: size } : undefined}
    />
  )
}
