import {
  History,
  MessageSquareQuote,
  Mic,
  ScanLine,
  Siren,
  Sparkles,
} from 'lucide-react'

/** Módulos pendientes (Etapa 4) y su contenido previsto. */
export const PENDING_PAGES = [
  {
    path: '/traducir',
    icon: Sparkles,
    eyebrow: 'Traducción',
    title: 'Traducción de gestos',
    description:
      'Área grande para el texto reconocido, indicador de detección y animación de procesamiento.',
    planned: [
      'Texto reconocido en grande, legible a distancia',
      'Indicador de detección de gestos y animación de procesamiento',
      'Reproducir con voz, repetir, copiar y limpiar',
      'Historial de la sesión de traducción',
    ],
  },
  {
    path: '/voz',
    icon: Mic,
    eyebrow: 'Comunicación',
    title: 'Comunicación por voz',
    description:
      'Convierte tu voz en texto con la Web Speech API, con avisos claros si el navegador no lo permite.',
    planned: [
      'Botón grande de micrófono con estado de escucha',
      'Texto reconocido en tiempo real',
      'Mensajes claros si falta permiso o soporte',
      'Repetir el resultado con síntesis de voz',
    ],
  },
  {
    path: '/frases',
    icon: MessageSquareQuote,
    eyebrow: 'Frases rápidas',
    title: 'Frases rápidas',
    description:
      'Biblioteca de frases organizadas por categorías, listas para mostrar y reproducir.',
    planned: [
      'Categorías: salud, emergencias, transporte, compras, alimentación y más',
      'Mostrar la frase a pantalla completa',
      'Reproducir con voz y guardar como favorita',
    ],
  },
  {
    path: '/historial',
    icon: History,
    eyebrow: 'Historial',
    title: 'Historial',
    description: 'Traducciones y comunicaciones de la sesión, listas para reutilizar.',
    planned: [
      'Consultar, copiar y reproducir cada mensaje',
      'Eliminar entradas y vaciar la sesión',
      'Guardar frases favoritas',
    ],
  },
  {
    path: '/emergencia',
    icon: Siren,
    eyebrow: 'Emergencia',
    title: 'Emergencia SOS',
    description:
      'Activación con confirmación previa y estado honesto del envío de la alerta.',
    planned: [
      'Confirmación en dos pasos antes de activar',
      'Contactos de emergencia y ubicación autorizada',
      'Estado real del envío (no se simulará una alerta enviada)',
    ],
  },
  {
    path: '/dispositivos/diagnostico',
    icon: ScanLine,
    eyebrow: 'Dispositivos',
    title: 'Diagnóstico de sensores',
    description:
      'Visualización de las lecturas de los sensores flex y del MPU6050 cuando el firmware las publique.',
    planned: [
      'Lecturas en vivo de los cinco sensores flex por guante',
      'Acelerómetro y giroscopio del MPU6050',
      'Comprobación de batería y calidad de enlace BLE',
    ],
  },
]
