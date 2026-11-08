/** Primer elemento del DOM: permite saltar la navegación con teclado. */
export default function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-brand-600 focus:px-5 focus:py-3 focus:font-display focus:font-bold focus:text-white focus:shadow-lift"
    >
      Saltar al contenido principal
    </a>
  )
}
