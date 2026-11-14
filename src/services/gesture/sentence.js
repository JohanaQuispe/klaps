/**
 * Corrección ligera de la frase acumulada por el reconocimiento de gestos.
 *
 * No es un modelo de lenguaje: aplica reglas deterministas y explicables
 * (espacios, mayúscula inicial, puntuación final y abreviaturas frecuentes).
 * Cada regla aplicada se devuelve para poder mostrarla al usuario.
 */

const ABBREVIATIONS = {
  porfavor: 'por favor',
  xq: 'porque',
  tmb: 'también',
  grax: 'gracias',
  bno: 'bueno',
  ntp: 'no te preocupes',
}

const TERMINAL_PUNCTUATION = /[.!?…]$/

export function improveSentence(input = '') {
  const applied = []
  let text = String(input).replace(/\s+/g, ' ').trim()

  if (!text) return { text: '', applied }

  const collapsedOriginal = text

  // 1. Abreviaturas frecuentes (solo palabras completas).
  for (const [short, long] of Object.entries(ABBREVIATIONS)) {
    const pattern = new RegExp(`\\b${short}\\b`, 'gi')
    if (pattern.test(text)) {
      text = text.replace(pattern, long)
      applied.push(`«${short}» → «${long}»`)
    }
  }

  // 2. Espacio antes de puntuación y palabras repetidas seguidas.
  text = text.replace(/\s+([,.;:!?])/g, '$1')
  text = text.replace(/\b(\w+)( \1\b)+/gi, '$1')
  if (text !== collapsedOriginal) applied.push('espacios y repeticiones')

  // 3. Mayúscula inicial.
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1)
  if (capitalized !== text) applied.push('mayúscula inicial')
  text = capitalized

  // 4. Puntuación final.
  if (!TERMINAL_PUNCTUATION.test(text)) {
    text = `${text}.`
    applied.push('punto final')
  }

  return { text, applied }
}
