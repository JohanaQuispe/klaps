import { useState } from 'react'
import { cn } from '../../utils/cn'

/**
 * Mascota de KLAPS.
 *
 * El recurso separado con transparencia todavía no existe: la pieza recibida
 * es una composición aplanada. Este componente intenta cargar
 * `/illustrations/mascota.png` y, si no está disponible, NO dibuja nada
 * (nada de emojis ni ilustraciones inventadas): el layout se adapta.
 *
 * Cuando envíes el archivo:
 *   1. Guárdalo como  public/illustrations/mascota.png  (o .webp)
 *   2. Ajusta MASCOT_SRC si usas otra extensión.
 */
const MASCOT_SRC = '/illustrations/mascota.png'

export default function Mascot({ size = 160, className, float = true, alt = 'Mascota de KLAPS saludando' }) {
  const [missing, setMissing] = useState(false)

  if (missing) return null

  return (
    <img
      src={MASCOT_SRC}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setMissing(true)}
      className={cn('pointer-events-none select-none object-contain', float && 'animate-float', className)}
      style={{ width: size, height: size }}
    />
  )
}
