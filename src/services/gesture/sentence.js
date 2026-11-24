/**
 * Corrección y Redacción con IA para frases del reconocimiento de gestos.
 *
 * Transforma secuencias de palabras gestuales (gramática de lengua de señas)
 * en oraciones fluidas, naturales y con cortesía en español oral/escrito.
 *
 * Ejemplo:
 *   ["HOLA", "QUIERO", "AGUA"] → "Hola, ¿me puedes invitar un vaso con agua?"
 *   ["NECESITO", "AYUDA"]      → "Por favor, necesito ayuda."
 *   ["HOLA", "COMO", "ESTAS"]  → "Hola, ¿cómo estás?"
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

/** Mapeo semántico de combinaciones gestuales a lenguaje natural fluido */
const SEMANTIC_PATTERNS = [
  // Peticiones de agua y comida
  {
    tokens: ['hola', 'quiero', 'agua'],
    phrase: 'Hola, ¿me puedes invitar un vaso con agua?',
  },
  {
    tokens: ['quiero', 'agua'],
    phrase: 'Por favor, quiero un vaso con agua.',
  },
  {
    tokens: ['hola', 'agua'],
    phrase: 'Hola, necesito agua, por favor.',
  },
  {
    tokens: ['quiero', 'comer'],
    phrase: 'Tengo hambre, quiero comer algo.',
  },
  {
    tokens: ['hola', 'quiero', 'comer'],
    phrase: 'Hola, tengo hambre, ¿podríamos comer algo?',
  },

  // Saludos y cortesía
  {
    tokens: ['hola', 'como', 'estas'],
    phrase: 'Hola, ¿cómo estás?',
  },
  {
    tokens: ['hola', 'bien', 'gracias'],
    phrase: 'Hola, todo muy bien, muchas gracias.',
  },
  {
    tokens: ['bien', 'gracias'],
    phrase: 'Todo bien, muchas gracias.',
  },
  {
    tokens: ['gracias', 'adios'],
    phrase: 'Muchas gracias por todo, hasta luego.',
  },
  {
    tokens: ['gracias', 'chau'],
    phrase: 'Muchas gracias por todo, chau.',
  },
  {
    tokens: ['muchas', 'gracias'],
    phrase: '¡Muchas gracias por su atención!',
  },
  {
    tokens: ['buenos', 'dias'],
    phrase: 'Buenos días, que tenga un excelente día.',
  },
  {
    tokens: ['buenos', 'dias', 'como', 'estas'],
    phrase: '¡Buenos días! ¿Cómo estás?',
  },
  {
    tokens: ['buenas', 'tardes'],
    phrase: 'Buenas tardes.',
  },
  {
    tokens: ['buenas', 'noches'],
    phrase: 'Buenas noches, que descanse.',
  },

  // Necesidades y auxilio
  {
    tokens: ['necesito', 'ayuda'],
    phrase: 'Por favor, necesito ayuda urgente.',
  },
  {
    tokens: ['por', 'favor', 'ayuda'],
    phrase: 'Por favor, ¿me podrías ayudar?',
  },
  {
    tokens: ['donde', 'bano'],
    phrase: 'Disculpa, ¿dónde queda el baño?',
  },
  {
    tokens: ['donde', 'esta', 'bano'],
    phrase: 'Disculpa, ¿dónde está el baño?',
  },
  {
    tokens: ['me', 'siento', 'mal'],
    phrase: 'No me siento bien, necesito asistencia médica.',
  },

  // Respuestas individuales cotidianas
  { tokens: ['hola'], phrase: '¡Hola! Mucho gusto.' },
  { tokens: ['gracias'], phrase: '¡Muchas gracias!' },
  { tokens: ['si'], phrase: 'Sí, de acuerdo.' },
  { tokens: ['no'], phrase: 'No, muchas gracias.' },
  { tokens: ['agua'], phrase: 'Agua, por favor.' },
  { tokens: ['ayuda'], phrase: '¡Ayuda, por favor!' },
  { tokens: ['bien'], phrase: 'Todo bien.' },
  { tokens: ['adios'], phrase: 'Hasta luego, que le vaya bien.' },
]

/**
 * Sintetiza un arreglo de palabras reconocidas en una oración natural y bien redactada.
 * Si coincide con patrones semánticos comunes de LSP/LSE, los expande a su formulación natural.
 * En caso contrario, aplica conexión gramatical inteligente.
 *
 * @param {string[]|string} words lista de palabras reconocidas
 * @returns {{text: string, raw: string, isSynthesized: boolean}}
 */
export function synthesizeNaturalSentence(words = []) {
  const tokenList = Array.isArray(words)
    ? words.map((w) => String(w).trim()).filter(Boolean)
    : String(words).trim().split(/\s+/).filter(Boolean)

  if (tokenList.length === 0) {
    return { text: '', raw: '', isSynthesized: false }
  }

  const raw = tokenList.join(' ')
  const normalized = tokenList.map((t) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  )

  // 1. Búsqueda de coincidencia con patrones semánticos exactos
  for (const pattern of SEMANTIC_PATTERNS) {
    if (pattern.tokens.length === normalized.length) {
      const match = pattern.tokens.every((tok, idx) => tok === normalized[idx])
      if (match) {
        return { text: pattern.phrase, raw, isSynthesized: true }
      }
    }
  }

  // 2. Búsqueda de coincidencia por subconjunto clave
  // Ej: contiene "quiero" y "agua" en cualquier posición
  if (normalized.includes('quiero') && normalized.includes('agua')) {
    const hasGreeting = normalized.includes('hola')
    return {
      text: hasGreeting
        ? 'Hola, ¿me puedes invitar un vaso con agua?'
        : 'Por favor, quiero un vaso con agua.',
      raw,
      isSynthesized: true,
    }
  }

  if (normalized.includes('necesito') && normalized.includes('ayuda')) {
    return { text: 'Por favor, necesito ayuda.', raw, isSynthesized: true }
  }

  if (normalized.includes('donde') && normalized.includes('bano')) {
    return { text: 'Disculpe, ¿dónde se encuentra el baño?', raw, isSynthesized: true }
  }

  // 3. Reglas gramaticales generativas
  const isAllCaps = tokenList.every((t) => t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t))
  let result = isAllCaps
    ? tokenList
        .map((t, idx) =>
          idx === 0
            ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
            : t.toLowerCase(),
        )
        .join(' ')
    : tokenList.join(' ')

  // Prefijo cortés si empieza con quiero o necesito
  if (/^quiero\b/i.test(result)) {
    result = result.replace(/^quiero\s+/i, 'Quiero ')
    if (!/por favor/i.test(result)) result = `${result}, por favor`
  } else if (/^necesito\b/i.test(result)) {
    result = `Por favor, ${result.charAt(0).toLowerCase() + result.slice(1)}`
  }

  // Si contiene palabras interrogativas, encuadrar entre ¿ ?
  if (/\b(donde|como|que|cuando|quien|por que|cuanto)\b/i.test(result)) {
    if (!result.startsWith('¿')) result = `¿${result}`
    if (!result.endsWith('?')) result = `${result.replace(/[.!]$/, '')}?`
  }

  const enhanced = improveSentence(result)
  return {
    text: enhanced.text,
    raw,
    isSynthesized: enhanced.text !== raw,
  }
}

/**
 * Corrección de formato y ortotipografía tradicional.
 */
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

  // 3. Mayúscula inicial (respetando signos de apertura).
  if (text.startsWith('¿') || text.startsWith('¡')) {
    if (text.length > 1) {
      text = text.charAt(0) + text.charAt(1).toUpperCase() + text.slice(2)
    }
  } else {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }

  // 4. Puntuación final si no la tiene.
  if (!TERMINAL_PUNCTUATION.test(text)) {
    text = `${text}.`
    applied.push('punto final')
  }

  return { text, applied }
}
