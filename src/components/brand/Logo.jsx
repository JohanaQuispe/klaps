import { useState } from 'react'
import { cn } from '../../utils/cn'

/**
 * Logotipo oficial de KLAPS: la «K» con la mano y el corazón, en su versión a color.
 *
 * Archivos (derivados del PNG oficial, recortado y optimizado):
 *   · logo-klaps-mark.webp → 31 KB, versión principal
 *   · logo-klaps-mark.png  → 50 KB, alternativa para navegadores sin WebP
 *
 * El símbolo respeta su proporción (0,945 de ancho por alto): se escala por alto,
 * nunca se deforma. Si los archivos no estuvieran disponibles, se muestra el
 * monograma provisional sin romper el layout.
 */
const MARK_WEBP = '/brand/logo-klaps-mark.webp'
const MARK_PNG = '/brand/logo-klaps-mark.png'

export function LogoMark({ className, size = 40, withLabel = false }) {
  const [missing, setMissing] = useState(false)

  if (!missing) {
    return (
      <picture className={cn('shrink-0', className)}>
        <source srcSet={MARK_WEBP} type="image/webp" />
        <img
          src={MARK_PNG}
          alt={withLabel ? 'KLAPS' : ''}
          onError={() => setMissing(true)}
          className="block h-auto w-auto object-contain"
          style={{ height: size }}
        />
      </picture>
    )
  }

  // Monograma provisional: solo si faltan los archivos del logotipo
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 font-display font-extrabold text-white shadow-soft',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      K
    </span>
  )
}

export default function Logo({ size = 44, showTagline = true, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <div className="min-w-0">
        <span className="block font-display text-xl leading-none font-extrabold tracking-[0.14em] text-brand-800">
          KLAPS
        </span>
        {showTagline && (
          <span className="mt-1 block text-[0.7rem] leading-tight font-medium text-ink-soft">
            Comunicación sin barreras
          </span>
        )}
      </div>
    </div>
  )
}
