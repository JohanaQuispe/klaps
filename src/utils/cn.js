/**
 * Une clases condicionales sin dependencias externas.
 * Uso: cn('base', isActive && 'activo', className)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default cn
