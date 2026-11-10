# KLAPS · Etapa 4 — Funcionalidad

## 1. Módulos implementados

| Ruta | Pantalla | Estado |
| --- | --- | --- |
| `/traducir` | Traducción de gestos (secuencia simulada) | Completa |
| `/voz` | Comunicación por voz (Web Speech Recognition) | Completa con detección de soporte |
| `/frases` | Frases rápidas: 7 categorías, buscador, favoritas, vista grande | Completa |
| `/historial` | Historial con filtros, copiar, escuchar, favorita, eliminar | Completa |
| `/emergencia` | SOS en dos pasos, contacto, gesto, ubicación, estado honesto | Completa |
| `/dispositivos/diagnostico` | Diagnóstico de sensores | Pendiente de firmware |

## 2. Decisiones de implementación

1. **Los datos simulados no se mezclan con la UI.**
   `services/gesture/demoGestures.js` produce la secuencia; la pantalla solo la presenta y
   muestra el aviso «Modo demostración».

2. **SOS honesto por diseño.** `services/emergency/sos.js` devuelve siempre
   `delivered: false` con el motivo. La pantalla muestra «Alerta preparada, **no enviada**»,
   el mensaje completo, el destino y la ubicación. Nunca hay un check verde falso.
   La confirmación es en dos pasos con cuenta atrás de 5 s cancelable.

3. **Ubicación solo con acción explícita.** `preferences.shareLocation` empieza en `false`.
   La geolocalización se pide al probar o al activar el SOS con esa opción encendida,
   y se explican los tres errores posibles (permiso, no disponible, tiempo agotado).

4. **Voz con degradación elegante.** Si `SpeechRecognition` no existe, la pantalla explica
   qué navegadores lo admiten y remite a Frases y Traducción: no queda un botón muerto.
   Los errores de la API (`not-allowed`, `no-speech`, `network`…) se traducen a lenguaje claro.

5. **Historial local y acotado.** Se guarda en `localStorage` (máximo 60 entradas), con el
   origen de cada mensaje (gesto, voz, frase) para poder etiquetarlo con icono y texto.

6. **Frases con los iconos oficiales 3D.** Cada categoría usa su pieza recortada de las
   hojas enviadas; nunca se sustituye por emojis ni se repite un icono en dos categorías.

7. **Una sola acción de voz.** `useAppSpeech` aplica velocidad, tono y voz elegidos en Ajustes
   en todas las pantallas (Traducción, Voz, Frases, Historial).

## 3. Cómo probarlo

```bash
npm install
npm run dev
```

| Qué probar | Resultado esperado |
| --- | --- |
| **Traducción**: «Iniciar detección» | Las palabras aparecen una a una (~1 s), el indicador dice «Detectando gestos…» y al terminar se guarda en el historial |
| **Traducción**: «Repetir» / «Limpiar» / «Copiar» | Repite la última secuencia, vacía el área o copia con confirmación «Copiado» |
| **Voz**: pulsar el micrófono | El navegador pide permiso; el texto aparece con la parte provisional en gris |
| **Voz**: «Guardar en el historial» | Aparece «Guardado en el historial» y la entrada en `/historial` |
| **Frases**: buscar «baño» | Filtra en las 7 categorías al instante |
| **Frases**: «Mostrar» | Modal con la frase en tamaño grande y botón Escuchar |
| **Frases**: estrella | Cuenta de favoritas en la cabecera; filtro «Favoritas» |
| **Historial**: filtros y acciones | Escuchar, copiar, marcar favorita y eliminar funcionan por entrada |
| **Historial**: «Vaciar» | Pide confirmación en un modal antes de borrar |
| **SOS**: «Activar SOS» | Confirmación → cuenta atrás de 5 s cancelable → «Preparada, no enviada» con el mensaje completo |
| **SOS**: «Probar mi ubicación» | Pide permiso y muestra coordenadas, precisión y enlace al mapa |
| **Ajustes**: velocidad de voz | Afecta a la voz de todas las pantallas |

## 4. Accesibilidad aplicada en esta etapa

- Área de texto de la traducción con `aria-live="polite"` y tamaño mínimo de 32 px.
- Botón de micrófono con `aria-pressed` y anillo pulsante; el estado también se escribe.
- Filtros y categorías con `aria-pressed`; nunca solo color.
- Acciones de cada mensaje con `aria-label` que incluye el texto completo.
- Modales con foco atrapado, `Escape` y retorno de foco (componente `Modal`).
- Errores con `role="alert"`; estados de guardado con `aria-live`.
- Todo el flujo se puede recorrer con teclado y respeta el tamaño de texto elegido.

## 5. Pendiente

- Diagnóstico de sensores (necesita firmware BLE).
- Conexión real de los guantes y del gesto de emergencia.
- Logotipo oficial a color (el SVG recibido es monocromo).
- Avatares para el historial.
- Onboarding de perfil de accesibilidad en el primer uso.
