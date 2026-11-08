import { cn } from '../../utils/cn'

/**
 * Anillos concéntricos de la identidad KLAPS.
 * Puramente decorativo (aria-hidden) y oculto en alto contraste.
 * Se dibuja con SVG para no pesar y para escalar sin deformarse.
 */
export default function DecorativeRings({ className, opacity = 0.75 }) {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
      className={cn('k-decorative pointer-events-none absolute', className)}
      style={{ opacity }}
    >
      {[70, 110, 150, 190].map((r, index) => (
        <circle
          key={r}
          cx="200"
          cy="200"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={index === 0 ? 2 : 1.5}
          strokeDasharray={index === 3 ? '6 10' : undefined}
        />
      ))}
    </svg>
  )
}
