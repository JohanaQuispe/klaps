import { useState } from 'react'
import { cn } from '../../utils/cn'

/**
 * Logotipo de KLAPS.
 *
 * IMPORTANTE · El símbolo oficial todavía no está disponible como archivo vectorial.
 * La aplicación carga `/brand/logo-klaps.svg` y, mientras ese archivo no exista,
 * muestra un monograma provisional claramente identificable.
 *
 * Para usar tu logotipo definitivo:
 *   1. Guarda el archivo como  public/brand/logo-klaps.svg
 *   2. Recarga la app. No hay que tocar código.
 */
const MARK_SRC = '/brand/logo-klaps.svg'

export function LogoMark({ className, size = 40, withLabel = false }) {
  const [missing, setMissing] = useState(false)

  if (!missing) {
    return (
      <img
        src={MARK_SRC}
        alt={withLabel ? 'Logotipo de KLAPS' : ''}
        width={size}
        height={size}
        onError={() => setMissing(true)}
        className={cn('shrink-0 object-contain', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  // Monograma provisional (no es el logotipo oficial)
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
    <div className={cn('flex items-center gap-3', className)}>
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
