# KLAPS · Comunicación sin barreras

Aplicación de comunicación inclusiva para personas con dificultades de audición, habla o
movilidad. Combina guantes inteligentes, reconocimiento de gestos, voz, texto e inteligencia
artificial para que la conversación fluya con cualquier interlocutor.

> **Estado del proyecto · Etapa 4 completada.**
> Los guantes están en desarrollo: la aplicación funciona con **datos simulados** y así lo indica
> en todo momento. No hay conexión Bluetooth real todavía.

---

## Cómo ejecutarlo

```bash
npm install
npm run dev      # http://localhost:5173
```

Otros comandos:

```bash
npm run build    # compila a dist/
npm run preview  # sirve la compilación
npm run lint     # oxlint
```

Requisitos: Node 20.19+ o 22.12+ (Vite 8).

---

## Stack

| Pieza | Versión | Por qué |
| --- | --- | --- |
| React | 19 | Interfaz por componentes |
| Vite | 8 | Servidor de desarrollo y compilación |
| Tailwind CSS | 4 | Sistema de diseño en CSS (`@theme`), sin `tailwind.config.js` |
| React Router DOM | 7 | Navegación por rutas |
| Lucide React | 1.70 | Iconografía consistente (nunca emojis como ilustración) |
| Oxlint | 1.90 | Reglas de React y buenas prácticas |

No se añadieron dependencias nuevas: todo el stack ya estaba declarado en el proyecto.

---

## Estructura

```
src/
├── components/
│   ├── accessibility/  AccessibilityPanel (tamaño, contraste, movimiento, mano)
│   ├── brand/          Logo, Mascot, DecorativeRings
│   ├── common/         Button, Card, StatusBadge, SectionTitle, Modal, EmptyState,
│   │                   LoadingState, ErrorMessage, ProgressBar, Toggle, SegmentedControl
│   ├── devices/        DeviceCard + DeviceRow
│   └── layout/         AppShell, Sidebar, MobileTabBar, PageHeader, SkipLink, navigation
├── context/            accessibilityContext, AccessibilityProvider, deviceContext,
│                       DeviceProvider, accessibilityOptions
├── hooks/              useSpeechSynthesis
├── data/               phrases.js (7 categorías y 35 frases)
├── pages/              Welcome, Dashboard, Translation, Voice, Phrases, History,
│                       Emergency, Devices, Settings, ComingSoon, NotFound
├── services/           bluetooth/mockGuards.js · gesture/demoGestures.js ·
│                       speech/recognition.js · emergency/sos.js
├── styles/index.css    tokens de marca + accesibilidad
├── utils/              cn, format
├── App.jsx             solo rutas
└── main.jsx            providers + montaje
```

### Pantallas implementadas

| Ruta | Estado |
| --- | --- |
| `/` | Bienvenida completa (ilustración oficial, eslogan, CTA, accesibilidad) |
| `/inicio` | Panel: saludo, estado de los guantes, accesos, actividad reciente |
| `/dispositivos` | Guantes izquierdo y derecho: estado, batería, RSSI, sincronización, modo demostración |
| `/ajustes` | Tamaño de texto, contraste, movimiento, mano dominante, voz, información |
| `/traducir` | Traducción de gestos con secuencia simulada, voz, copiar y limpiar |
| `/voz` | Comunicación por voz con Web Speech Recognition y errores comprensibles |
| `/frases` | 7 categorías con iconos 3D, buscador, favoritas y vista en grande |
| `/historial` | Filtros, escuchar, copiar, favorita y eliminar |
| `/emergencia` | SOS en dos pasos, contacto, gesto y ubicación con estado honesto del envío |
| `/dispositivos/diagnostico` | Pendiente: necesita el firmware BLE |

---

## Sistema de diseño

Todos los valores viven como tokens en `src/styles/index.css` (`@theme`).

| Token | Valor | Uso |
| --- | --- | --- |
| `brand-500` | `#7961D9` | Morado de marca: superficies e ilustración |
| `brand-600` | `#6B4FD0` | Texto, botón principal y foco (contraste 5,46:1 sobre el fondo) |
| `brand-700` | `#51409B` | Títulos (7,8:1) |
| `brand-100` | `#E8DFFF` | Lavanda para tarjetas |
| `canvas` | `#FAF8FF` | Fondo general |
| `ink` / `ink-soft` | `#2A2140` / `#5B5378` | Texto principal / secundario |
| Pasteles | `mint`, `sky`, `butter`, `peach`, `blush` | Fondos de tarjetas (siempre con texto `brand-700` o más oscuro) |
| Estados | `success #1F7A4D`, `warning #8A5A00`, `danger #C81E3C` | Siempre acompañados de icono y etiqueta |

Tipografía: **Nunito** (títulos, botones) e **Inter** (textos funcionales), con escala base en rem
para que el ajuste de tamaño del usuario escale toda la interfaz (100 %, 112,5 %, 125 %).

---

## Accesibilidad

- Tamaño de texto, alto contraste, movimiento reducido y mano dominante, guardados en
  `localStorage` y aplicados como atributos en `<html>`.
- Alto contraste refuerza textos, bordes y foco; **no** invierte la aplicación.
- Foco visible global (`outline` de 3 px), skip-link, foco atrapado en modales, `Escape` cierra.
- Estados nunca dependen solo del color: punto + icono + etiqueta textual.
- Áreas táctiles de 44–64 px y navegación inferior de 5 destinos en móvil.
- `prefers-reduced-motion` se respeta además del interruptor propio.

---

## Modo demostración y separación simulación / realidad

- `src/services/bluetooth/mockGuards.js` genera batería, RSSI y sincronización simulados.
- `DeviceContext` expone `mode` (`demo`). La interfaz muestra «Modo demostración» en el panel,
  en la barra lateral y en la pantalla de guantes.
- El botón «Bluetooth» **no** abre una conexión: explica qué falta (UUID del servicio BLE,
  firmware y autorización HTTPS).
- SOS y demás módulos pendientes no simulan haber enviado nada: muestran su estado real
  («en construcción»).

---

## Recursos visuales

| Qué | Dónde |
| --- | --- |
| Ilustración oficial (recorte sin texto) | `public/illustrations/klaps-hero-1200.webp` (89 KB) y variante 720 |
| Composición completa optimizada | `public/illustrations/klaps-bienvenida-*.webp` (57–134 KB) |
| Logotipo oficial | **pendiente** → se guarda como `public/brand/logo-klaps.svg` |
| Mascota separada | **pendiente** → `public/illustrations/mascota.png` |

Instrucciones completas en `public/brand/LEEME.md` y `public/illustrations/LEEME.md`.

---

## Documentación del proceso

- `docs/etapa-1-analisis.md` — auditoría del repositorio, de los recursos y decisiones de diseño.
- `docs/etapa-2-3-entrega.md` — sistema visual y maquetación.
- `docs/etapa-4-entrega.md` — funcionalidad, pruebas y límites honestos.
