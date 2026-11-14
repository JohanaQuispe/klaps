# KLAPS · Comunicación sin barreras

Aplicación de comunicación inclusiva para personas con dificultades de audición, habla o
movilidad. Combina guantes inteligentes, reconocimiento de gestos, voz, texto e inteligencia
artificial para que la conversación fluya con cualquier interlocutor.

> **Estado del proyecto · Etapa 5 en curso (modo real activado).**
> Los guantes ya se conectan por **Bluetooth LE real** desde el navegador. No hay datos
> simulados: lo que el guante no publica aparece como «sin lectura».

---

## Cómo ejecutarlo

Requisitos: **Node.js 20+** y **Chrome, Edge u Opera** (Web Bluetooth no existe en Safari ni Firefox).

```bash
npm install
npm run dev      # http://localhost:5173
```

En **Windows** puedes hacer doble clic en **`iniciar-klaps.bat`**: comprueba Node, instala lo que
falte y abre el navegador.

Guía completa —requisitos, Windows paso a paso, comprobaciones y problemas frecuentes— en
[`docs/como-ejecutar.md`](docs/como-ejecutar.md).

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
├── hooks/              useSpeechSynthesis, useBleDevice, useGestureRecognition
├── data/               phrases.js (7 categorías y 35 frases)
├── pages/              Welcome, Dashboard, Translation, Training, Voice, Phrases, History,
│                       Emergency, Devices, Settings, NotFound
├── services/           bluetooth/bleClient.js · bleConfig.js · gloveState.js ·
│                       sensorFrame.js · uuidSettings.js ·
│                       gesture/knnClassifier.js · trainingStore.js · sentence.js ·
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
| `/dispositivos` | Guantes izquierdo y derecho: conexión BLE real, batería y firmware publicados por el ESP32 |
| `/ajustes` | Tamaño de texto, contraste, movimiento, mano dominante, voz, información |
| `/traducir` | Traducción en vivo con KNN: confianza ≥ 75 %, estabilización de 600 ms, voz, corrección de sintaxis y SOS |
| `/voz` | Comunicación por voz con Web Speech Recognition y errores comprensibles |
| `/frases` | 7 categorías con iconos 3D, buscador, favoritas y vista en grande |
| `/historial` | Filtros, escuchar, copiar, favorita y eliminar |
| `/emergencia` | SOS en dos pasos, contacto, gesto y ubicación con estado honesto del envío |
| `/dispositivos/diagnostico` | Conexión BLE real: descubre servicios, características y notificaciones del ESP32 |
| `/entrenamiento` | Grabar señas (20 muestras a 20 Hz), UUID del firmware, exportar/importar y probar el KNN |

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

## Datos reales y datos pendientes

- `src/services/bluetooth/gloveState.js` define el estado de los guantes **sin simulación**:
  batería, modelo, firmware y sincronización llegan de la conexión BLE; si el dispositivo no los
  publica, el valor es `null` y la interfaz escribe «sin lectura».
- `DeviceProvider` mantiene una sesión Bluetooth LE por guante (`useBleDevice`) y expone
  `connect`, `disconnect` y `reconnect`. `mode` es siempre `'real'`.
- La batería se muestra si el firmware publica el servicio estándar `0x180F`; el RSSI no se puede
  leer desde Web Bluetooth y aparece como «No disponible».
- La trama de 34 bytes (5 flex + 6 del MPU-6050) se decodifica en `sensorFrame.js` y alimenta el
  clasificador KNN de 22 dimensiones (`docs/etapa-6-reconocimiento.md`) con señas estáticas y
  dinámicas y modo por mano (`docs/etapa-7-senas-dinamicas.md`). Los UUID se configuran
  desde la app y se guardan en el navegador.
- SOS y demás módulos pendientes no simulan haber enviado nada: muestran su estado real.

---

## Recursos visuales

| Qué | Dónde |
| --- | --- |
| Ilustración oficial (recorte sin texto) | `public/illustrations/klaps-hero-1200.webp` (89 KB) y variante 720 |
| Composición completa optimizada | `public/illustrations/klaps-bienvenida-*.webp` (57–134 KB) |
| Logotipo oficial (K + mano + corazón) | `public/brand/logo-klaps-mark.webp` (31 KB), PNG de respaldo y favicon generado |
| Mascota separada | **pendiente** → `public/illustrations/mascota.png` |

Instrucciones completas en `public/brand/LEEME.md` y `public/illustrations/LEEME.md`.

---

## Documentación del proceso

- `docs/etapa-1-analisis.md` — auditoría del repositorio, de los recursos y decisiones de diseño.
- `docs/etapa-2-3-entrega.md` — sistema visual y maquetación.
- `docs/etapa-4-entrega.md` — funcionalidad, pruebas y límites honestos.
- `docs/etapa-5-modo-real.md` — retirada del modo demostración y conexión BLE real.
- `docs/etapa-6-reconocimiento.md` — trama de 34 bytes, vector de 22 dimensiones, KNN, entrenamiento y SOS.
- `docs/etapa-7-senas-dinamicas.md` — señas estáticas/dinámicas, modo de mano y ventana deslizante.
- `docs/etapa-8-prioridad-movimiento-y-reposo.md` — 40/80 fotogramas, ponderación IMU y estado «0».
- `docs/etapa-9-calibracion-guiada.md` — asistente de calibración de dedos e IMU (`klaps.calibration.v1`).
- `docs/ble-conexion.md` — guía para conectar los guantes ESP32-D/ESP32-U por BLE.
- `docs/como-ejecutar.md` — arrancar la app, comprobar el build y resolver fallos comunes.
- `docs/firmware/prueba-ble/prueba-ble.ino` — sketch de prueba que anuncia `KLAPS-TEST` para validar la radio BLE.
