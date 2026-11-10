/**
 * Biblioteca de frases rápidas de KLAPS.
 * Cada categoría usa el icono 3D oficial correspondiente.
 */

export const CATEGORIES = [
  {
    id: 'salud',
    label: 'Salud',
    description: 'Síntomas, citas y consultas médicas.',
    icon: '/illustrations/iconos/salud.webp',
  },
  {
    id: 'emergencias',
    label: 'Emergencias',
    description: 'Pedir ayuda de forma inmediata.',
    icon: '/illustrations/iconos/emergencia.webp',
  },
  {
    id: 'transporte',
    label: 'Transporte',
    description: 'Buses, taxis y direcciones.',
    icon: '/illustrations/iconos/transporte.webp',
  },
  {
    id: 'compras',
    label: 'Compras',
    description: 'Precios, tallas y pagos.',
    icon: '/illustrations/iconos/compras.webp',
  },
  {
    id: 'alimentacion',
    label: 'Alimentación',
    description: 'Pedir comida y bebida.',
    icon: '/illustrations/iconos/alimentacion.webp',
  },
  {
    id: 'necesidades',
    label: 'Necesidades personales',
    description: 'Baño, descanso e higiene.',
    icon: '/illustrations/iconos/necesidades.webp',
  },
  {
    id: 'conversacion',
    label: 'Conversaciones',
    description: 'Saludos, presentaciones y charla.',
    icon: '/illustrations/iconos/conversacion.webp',
  },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

export const PHRASES = [
  // Salud
  { id: 'salud-1', category: 'salud', text: 'Necesito ver a un médico.' },
  { id: 'salud-2', category: 'salud', text: 'Me duele aquí.' },
  { id: 'salud-3', category: 'salud', text: 'Tengo una cita a las diez.' },
  { id: 'salud-4', category: 'salud', text: '¿Dónde queda la farmacia más cercana?' },
  { id: 'salud-5', category: 'salud', text: 'Soy alérgico a la penicilina.' },

  // Emergencias
  { id: 'emergencias-1', category: 'emergencias', text: 'Necesito ayuda, por favor.' },
  { id: 'emergencias-2', category: 'emergencias', text: 'Llama a una ambulancia.' },
  { id: 'emergencias-3', category: 'emergencias', text: 'Me he caído y no puedo levantarme.' },
  { id: 'emergencias-4', category: 'emergencias', text: 'Estoy solo y necesito asistencia.' },
  { id: 'emergencias-5', category: 'emergencias', text: 'Mi acompañante se ha desmayado.' },

  // Transporte
  { id: 'transporte-1', category: 'transporte', text: '¿Este bus va al centro?' },
  { id: 'transporte-2', category: 'transporte', text: 'Quiero ir a esta dirección.' },
  { id: 'transporte-3', category: 'transporte', text: '¿Cuánto cuesta el pasaje?' },
  { id: 'transporte-4', category: 'transporte', text: 'Por favor, avíseme en la próxima parada.' },
  { id: 'transporte-5', category: 'transporte', text: 'Necesito un taxi accesible.' },

  // Compras
  { id: 'compras-1', category: 'compras', text: '¿Cuánto cuesta esto?' },
  { id: 'compras-2', category: 'compras', text: '¿Tienen una talla más grande?' },
  { id: 'compras-3', category: 'compras', text: '¿Puedo pagar con tarjeta?' },
  { id: 'compras-4', category: 'compras', text: 'Solo estoy mirando, gracias.' },
  { id: 'compras-5', category: 'compras', text: 'Quisiera una bolsa, por favor.' },

  // Alimentación
  { id: 'alimentacion-1', category: 'alimentacion', text: 'Quisiera un vaso de agua, por favor.' },
  { id: 'alimentacion-2', category: 'alimentacion', text: '¿Tienen opciones sin gluten?' },
  { id: 'alimentacion-3', category: 'alimentacion', text: 'La cuenta, por favor.' },
  { id: 'alimentacion-4', category: 'alimentacion', text: 'Soy alérgico a los frutos secos.' },
  { id: 'alimentacion-5', category: 'alimentacion', text: 'Está delicioso, gracias.' },

  // Necesidades personales
  { id: 'necesidades-1', category: 'necesidades', text: '¿Dónde está el baño?' },
  { id: 'necesidades-2', category: 'necesidades', text: 'Necesito descansar un momento.' },
  { id: 'necesidades-3', category: 'necesidades', text: 'Necesito ayuda para lavarme las manos.' },
  { id: 'necesidades-4', category: 'necesidades', text: 'Tengo frío, ¿puede cerrar la ventana?' },
  { id: 'necesidades-5', category: 'necesidades', text: 'Necesito cambiar de posición.' },

  // Conversaciones cotidianas
  { id: 'conversacion-1', category: 'conversacion', text: 'Hola, mucho gusto.' },
  { id: 'conversacion-2', category: 'conversacion', text: 'Me llamo… y soy sordo, uso KLAPS para comunicarme.' },
  { id: 'conversacion-3', category: 'conversacion', text: '¿Puede escribirme lo que dice, por favor?' },
  { id: 'conversacion-4', category: 'conversacion', text: 'Un momento, por favor. Estoy escribiendo.' },
  { id: 'conversacion-5', category: 'conversacion', text: 'Gracias por su paciencia.' },
]

export function phrasesByCategory(categoryId) {
  return PHRASES.filter((phrase) => phrase.category === categoryId)
}
