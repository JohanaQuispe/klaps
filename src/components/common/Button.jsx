import { cn } from '../../utils/cn'

/**
 * Botón de KLAPS.
 * - Altura mínima táctil de 48 px (40 px solo en variantes compactas).
 * - Área de toque amplia, foco visible heredado del estilo global.
 * - Puede renderizar cualquier elemento (`as={Link}`) sin perder los estilos.
 */
const baseStyles =
  'inline-flex items-center justify-center gap-2.5 rounded-full font-display font-bold tracking-tight transition-[background-color,border-color,color,box-shadow] duration-200 select-none disabled:pointer-events-none disabled:opacity-55'

const variantStyles = {
  primary: 'bg-brand-600 text-white shadow-soft hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'bg-white text-brand-700 border border-brand-200 shadow-soft hover:border-brand-300 hover:bg-brand-50',
  soft: 'bg-brand-100 text-brand-800 hover:bg-brand-200',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50',
  danger: 'bg-danger text-white shadow-soft hover:bg-[#a8162f]',
  dangerSoft: 'bg-danger-soft text-danger hover:bg-[#ffd5dd]',
}

const sizeStyles = {
  sm: 'min-h-10 px-4 text-[0.95rem]',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-7 text-lg',
  icon: 'size-12 p-0',
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  type,
  ...props
}) {
  const isNativeButton = Component === 'button'

  return (
    <Component
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...(isNativeButton ? { type: type ?? 'button' } : {})}
      {...props}
    >
      {Icon && <Icon className="size-5 shrink-0" aria-hidden="true" />}
      {children && <span className="text-balance">{children}</span>}
      {IconRight && <IconRight className="size-5 shrink-0" aria-hidden="true" />}
    </Component>
  )
}
