# KLAPS · Etapas 2 y 3 — Sistema visual y maquetación

## 1. Qué se construyó

| Etapa | Entregable | Estado |
| --- | --- | --- |
| 2 · Sistema visual | Tokens, tipografía, botones, tarjetas, badges, navegación, logotipo provisional | Completado |
| 3 · Maquetación | Bienvenida, Panel, Guantes, Ajustes + shell responsive | Completado |
| 4 · Funcionalidad | Traducción, Voz, Frases, Historial, SOS, Onboarding | Pendiente (pantallas honestas de «en construcción») |

## 2. Decisiones tomadas (y por qué)

1. **Botón principal morado `#6B4FD0`.** `#7961D9` como texto sobre `#FAF8FF` da 4,41:1 (no llega
   a AA); `#6B4FD0` da 5,46:1 y blanco sobre él 5,75:1. Se conserva el morado de marca en
   superficies e ilustración.
2. **Sin degradado arcoíris en «Empieza Aquí».** Se sustituye por título en violeta con una
   palabra acentuada en morado: menos ruido, más jerarquía.
3. **Escala de texto con `rem` + `data-font-size`.** Un solo atributo en `<html>` escala tipografía,
   espaciados y áreas táctiles; no hay que duplicar reglas por pantalla.
4. **Alto contraste por tokens, no por inversión.** Se redefinen colores y se refuerzan bordes;
   los adornos (`.k-decorative`) se ocultan.
5. **Contextos separados para Fast Refresh.** `accessibilityContext.js` + `AccessibilityProvider.jsx`
   y `deviceContext.js` + `DeviceProvider.jsx`; `npm run lint` queda sin advertencias.
6. **Datos simulados fuera de la UI.** `services/bluetooth/mockGuards.js` es el único origen de
   batería y RSSI; la interfaz solo los presenta junto a la etiqueta «Modo demostración».
7. **Recortes de tu imagen, no ilustraciones nuevas.** La ilustración de Bienvenida es la zona
   ilustrada de tu pieza, sin el texto ni el botón impresos (evita un botón falso en pantalla).
   Se generaron versiones WebP: de 13,5 MB a 43–89 KB.

## 3. Componentes reutilizables

| Componente | Variantes / notas |
| --- | --- |
| `Button` | `primary`, `secondary`, `soft`, `ghost`, `danger`, `dangerSoft` · tamaños `sm/md/lg/icon` · `as={Link}` |
| `Card` | tonos `white`, `lilac`, `lavender`, `mint`, `sky`, `butter`, `blush`, `peach`, `glass` |
| `StatusBadge` | `conectado`, `conectando`, `desconectado`, `error`, `demo`, `exito`, `pendiente` (icono + texto) |
| `SectionTitle` | eyebrow, título con nivel configurable, descripción, acción |
| `EmptyState` / `LoadingState` / `ErrorMessage` | estados siempre explicativos |
| `Modal` | portal, `aria-modal`, foco atrapado, `Escape`, retorno de foco |
| `ProgressBar` | `role="progressbar"` con `aria-valuetext` |
| `Toggle` / `SegmentedControl` | `role="switch"` / `aria-pressed` con etiqueta visible |

## 4. Cómo comprobarlo

```bash
npm install
npm run dev
```

1. **Bienvenida** (`/`): botón «Comenzar» → Panel. «Accesibilidad» abre el panel.
2. **Accesibilidad**: «Muy grande» debe escalar toda la app; «Alto contraste» debe reforzar bordes
   y ocultar anillos; «Reducir movimiento» debe detener animaciones.
3. **Panel** (`/inicio`): los dos guantes aparecen con estado distinto; el guante derecho empieza
   «Conectando…» y pasa a «Conectado».
4. **Guantes** (`/dispositivos`): «Desconectar» y «Reconectar» cambian el estado simulado;
   «Bluetooth» abre la explicación honesta.
5. **Ajustes** (`/ajustes`): la prueba de voz usa la síntesis del navegador; si no existe, aparece
   un mensaje de error claro.
6. **Responsive**: 320, 390, 768, 1024 y 1440 px sin scroll horizontal; en móvil la barra inferior
   tiene 5 destinos; en escritorio aparece la barra lateral.
7. **Teclado**: `Tab` desde el inicio muestra «Saltar al contenido»; dentro del modal el foco no
   escapa; `Escape` cierra.

## 5. Pendiente por tu decisión

- Logotipo oficial → `public/brand/logo-klaps.svg` (hoy hay monograma provisional).
- Mascota separada → `public/illustrations/mascota.png` (hoy el hueco no dibuja nada, sin emojis).
- Guantes y avatares separados para las tarjetas de dispositivo y el historial.
