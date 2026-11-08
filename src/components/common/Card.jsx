import { cn } from '../../utils/cn'

/**
 * Tarjeta base de KLAPS: esquinas redondeadas, fondo pastel opcional,
 * sombra discreta y borde tenue (que se refuerza en alto contraste).
 */
const toneStyles = {
  white: 'bg-white',
  lavender: 'bg-brand-100',
  lilac: 'bg-brand-50',
  mint: 'bg-mint',
  sky: 'bg-sky',
  butter: 'bg-butter',
  blush: 'bg-blush',
  peach: 'bg-peach',
  glass: 'bg-white/85 backdrop-blur-md',
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-5 sm:p-6',
}

export default function Card({
  as: Component = 'div',
  tone = 'white',
  padding = 'md',
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={cn(
        'k-card rounded-lg shadow-soft',
        toneStyles[tone],
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
