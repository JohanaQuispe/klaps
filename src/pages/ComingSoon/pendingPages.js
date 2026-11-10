import { ScanLine } from 'lucide-react'

/**
 * Módulos que siguen pendientes de hardware o de una etapa posterior.
 * El resto de la aplicación ya está implementado.
 */
export const PENDING_PAGES = [
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
