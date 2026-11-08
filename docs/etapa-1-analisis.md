# KLAPS · Etapa 1 — Análisis del proyecto y propuesta de trabajo

> **Estado:** auditoría completada. **No he modificado ni borrado nada del proyecto original.**
> Lo único que agregué son recursos derivados de tu imagen (`public/illustrations/`, optimizada) y este documento.
> Espero tu aprobación antes de construir pantallas.

---

## 1. Resumen ejecutivo

| Punto | Hallazgo |
| --- | --- |
| Código existente | Solo el esqueleto oficial de **Vite + React**. **No existe `src/`**: no hay ninguna pantalla ni componente que conservar. |
| Stack instalado | React 19.3, Vite 8.3, Tailwind 4.3, React Router 7.18, Lucide 1.70, Oxlint. **Ya coincide con tu stack objetivo**: no hace falta agregar dependencias. |
| Recursos visuales | **1 sola imagen** (clave/bienvenida, 3889 × 5500 px, 13.5 MB). Es una composición **aplanada**: no contiene archivos separados con transparencia de mascota, guantes, avatares ni logotipo vectorial. |
| Riesgo principal | Sin recursos separados, cualquier recorte de la mascota o los guantes arrastra fragmentos del fondo (anillos, burbujas, ondas). Se puede maquillar con máscaras suaves, pero **no es lo ideal** para un producto real. |
| Buena noticia | La imagen sirve perfectamente como **ilustración principal de Bienvenida** tal cual. Ya la optimicé: **13.5 MB → 102 KB** (−99 %) sin pérdida visible. |
| Frontend | El proyecto **no está inicializado** en `src/`. Propongo construirlo por etapas según la estructura de tu prompt (sección 7), sin crear un `App.jsx` monolítico. |

---

## 2. Estado real del repositorio

```
klaps/
├── .gitignore
├── .oxlintrc.json        # react/rules-of-hooks + only-export-components
├── README.md             # README de plantilla (genérico)
├── index.html            # PLANTILLA, sin personalizar
├── package.json          # dependencias correctas
├── package-lock.json
├── vite.config.js        # react() + tailwindcss() v4 (correcto)
└── (no existe src/, ni public/)
```

### Observaciones concretas sobre `index.html`

| Problema | Corrección propuesta |
| --- | --- |
| `<html lang="en">` | `lang="es"` (lectores de pantalla y voz). |
| `<title>klaps</title>` | `KLAPS · Comunicación sin barreras`. |
| `<link rel="icon" href="/favicon.svg">` | **Ese archivo no existe** → hoy genera un 404. Lo crearé junto con el logotipo. |
| Falta `<meta name="theme-color">` | `#7961D9` para la barra del navegador en móvil. |
| Falta `description` | Texto del eslogan, útil para PWA y buscadores. |

### Dependencias: no requieren cambios

`react`, `react-dom`, `react-router-dom`, `lucide-react`, `tailwindcss` v4 + `@tailwindcss/vite`.
Tailwind v4 se configura **en CSS** (`@theme`), no con `tailwind.config.js`. Eso evita un archivo extra y mantiene los tokens en un solo lugar.

> Aclaración: `npm install` no estaba ejecutado (`node_modules/` ausente). Ya **instalé las dependencias declaradas**, sin agregar ni quitar ninguna.

---

## 3. Auditoría de los recursos visuales

### 3.1 Qué contiene tu imagen

Es una **pantalla de bienvenida / cartel de marca** en formato vertical. Elementos identificados:

| # | Elemento | Descripción | Clasificación |
| --- | --- | --- | --- |
| 1 | **Logotipo (marca gráfica)** | Letra **K** 3D con degradado magenta → violeta → azul, una **mano** apoyada sobre ella y un **corazón** integrado. Dentro de un halo blanco y un anillo. | `logos` |
| 2 | **Logotipo textual** | «Klaps» en violeta oscuro (tipografía redondeada y amable). Ojo: aparece en *title case*, no «KLAPS». | `logos` |
| 3 | **Mascota** | Robot blanco-lavanda, cabeza grande, auriculares laterales, antena con esfera, ojos grandes, mejillas rosadas, saluda, **guantes negros con detalles morados** (eco del producto). Ondas de sonido a su derecha. | `illustrations/mascot` |
| 4 | **Guante inteligente izquierdo** | Guante negro con nervaduras moradas, módulo circular en el dorso, sensores en las puntas y **muñequera con la palabra KLAPS**. Es el recurso de producto más claro. | `illustrations/gloves` |
| 5 | **Guante derecho (silueta)** | Mano abierta en negro con brillos morados, arriba al centro. Funciona como segundo guante / gesto de saludo. | `illustrations/gloves` |
| 6 | **Avatares de usuario** | Burbuja morada (niño castaño), burbuja celeste (niño castaño), burbuja amarilla (niña rizada sonriendo). **Diversidad de género/edad, 3 únicos.** | `illustrations/avatars` |
| 7 | **Burbuja corazón** | Globo de diálogo blanco con corazón rojo. | `icons/decorative` |
| 8 | **Burbuja mano abierta** | Globo morado con mano naranja saludando. | `icons/decorative` |
| 9 | **Burbuja libreta + lápiz** | Globo morado con notas y lápiz → concepto «texto / frases». | `icons/decorative` |
| 10 | **Icono Bluetooth** | Trazo morado luminoso → concepto «conexión». | `icons/functional` |
| 11 | **Ondas de sonido** | Tres arcos morados (junto a la mascota) → concepto «voz». | `icons/decorative` |
| 12 | **Anillos concéntricos** | Líneas blancas finas que estructuran la composición. | `backgrounds` |
| 13 | **Fondo** | Degradado muy suave celeste → lavanda → rosa → amarillo pálido. | `backgrounds` |
| 14 | **Bloque de texto** | «Empieza Aquí» (degradado multicolor) + botón negro «Comenzar». | `ui-reference` |

### 3.2 Dónde debe usarse cada recurso (recomendación)

| Recurso | Uso recomendado | Uso prohibido |
| --- | --- | --- |
| Imagen completa (optimizada) | **Bienvenida**: ilustración principal. **Una sola vez**, como héroe. | Repetirla como fondo de otras pantallas. |
| Marca **K + mano + corazón** | Logotipo de la app (header, splash, favicon, icono PWA, login). | Usarla como ilustración decorativa grande. |
| Mascota | **Un** lugar con personalidad: saludo del Panel principal o pantalla de éxito. Tamaño contenido. | Repetirla en cada tarjeta / en cada estado vacío. |
| Guante KLAPS | **Pantalla de Dispositivos** (guante izquierdo) y tutorial de calibración. Es el recurso de producto. | Usarlo como decoración de frases rápidas. |
| Guante derecho (silueta) | **Dispositivos**: tarjeta del guante derecho, versión reducida y sutil. | A gran tamaño junto al otro guante (competirían). |
| Avatares (3) | **Historial / demo de conversación**: interlocutores distintos por mensaje. | Reutilizar el mismo avatar 10 veces. |
| Burbujas (corazón, mano, libreta) | **Accesos rápidos del Panel**: cada una con una función real distinta (frases de afecto, saludos, notas). | Como adorno suelto sin función. |
| Icono Bluetooth / ondas | **Iconografía funcional** (estado de conexión, escucha activa). | Como imagen de relleno. |
| Anillos concéntricos | Fondo de **Bienvenida** y `EmptyState` (como SVG/CSS, no como imagen). | En todas las pantallas. |

### 3.3 El problema de fondo: un solo archivo aplanado

Tu prompt pide no usar emojis ni ilustraciones inventadas, y no repetir recursos. Con **un único PNG compuesto** no es posible cumplir eso en todo el producto: si necesito la mascota en el Panel y el guante en Dispositivos, tendría que **recortar** de la composición, arrastrando pedazos de anillos y burbujas ajenas.

**Lo que hice (sin inventar nada):** extraje del archivo las zonas necesarias y las revisé una por una. Resultado honesto:

- **Recorte de la mascota:** se ve bien, pero arrastra el globo de la libreta (abajo-izquierda) y las ondas (derecha). Se puede disimular con una máscara radial suave, aunque el borde no queda limpio al 100 %.
- **Recorte del logotipo:** arrastra el halo, el anillo y un fragmento del guante abajo. **No sirve como logotipo de interfaz.**
- **Recorte de avatares:** los tres funcionan bien en formato circular (el círculo recorta justo la burbuja).

**Recomendación profesional:** usar la composición completa en Bienvenida (para eso está diseñada) y pedirte, cuando puedas, los recursos **separados con transparencia**:

```
mascota-klaps.png        (1024×1024, fondo transparente)
guante-izquierdo.png     (transparente, vista frontal)
guante-derecho.png       (transparente, vista frontal)
logo-klaps.svg  (o PNG 1024 transparente)
avatar-1/2/3.png         (cuadrados, para recortar en círculo)
```

Mientras no existan, mi plan es: **no fabricar ilustraciones nuevas**; usar la composición en Bienvenida y, en el resto, recurso recortado con máscara + composición tipográfica de marca. Todo lo provisional queda marcado en el código con `// TODO(recursos):`.

---

## 4. Inconsistencias detectadas en la pieza de referencia

No son errores tuyos, son decisiones que conviene fijar antes de programar:

1. **«Empieza Aquí» con degradado azul → morado → rosa → naranja.** Contradice tu propia regla 8 («no usar degradados en absolutamente todos los elementos») y compite con el morado de marca. *Propuesta:* reemplazarlo por un título en violeta oscuro con una palabra acentuada en morado, sin arcoíris.
2. **Botón «Comenzar» negro.** Muy contrastado, pero la regla 7 pide que los botones principales se distingan *como marca KLAPS*. *Propuesta:* botón principal morado `#6B4FD0` con texto blanco (contraste 5.75). Dejar el negro solo si lo pides explícitamente.
3. **«Klaps» vs «KLAPS».** El logotipo textual de la imagen está en title case; tu prompt fija **KLAPS**. *Propuesta:* interfaz y textos siempre «KLAPS»; el wordmark dibujado respeta mayúsculas.
4. **Peso del archivo: 13.5 MB.** Inaceptable en móvil. Ya generé versiones WebP de 720 / 1080 / 1440 px de ancho (**57 / 102 / 134 KB**).
5. **Contraste de textos sobre el degradado.** El gris «Comunicación sin barreras» sobre rosa/lavanda está en el límite. En la app irá sobre blanco o lavanda planos.
6. **El morado de marca `#7961D9` no alcanza AA como texto sobre `#FAF8FF` (4.41:1).** Detalle importante: hay que definirlo como color de *superficie/marca*, y usar un morado de texto más profundo.

---

## 5. Sistema visual propuesto (Etapa 2, listo para aplicar)

### 5.1 Paleta con contraste medido

| Token | Valor | Uso | Contraste verificado |
| --- | --- | --- | --- |
| `--color-brand` | `#7961D9` | Morado de marca: superficies, iconos grandes, ilustración | blanco sobre él **4.64** ✔ AA |
| `--color-brand-strong` | `#6B4FD0` | **Texto, enlaces, botón principal, foco** | sobre `#FAF8FF` **5.46** ✔ / blanco sobre él **5.75** ✔ |
| `--color-brand-deep` | `#51409B` | Títulos, hover, texto sobre pasteles | sobre `#FAF8FF` **7.80** ✔ AAA |
| `--color-lavender` | `#E8DFFF` | Tarjetas destacadas, fondos secundarios | texto violeta **6.43** ✔ |
| `--color-lilac` | `#F4EFFF` | Fondos de sección | ✔ |
| `--color-canvas` | `#FAF8FF` | Fondo general | texto base **14.34** ✔ |
| `--color-ink` | `#2A2140` | Texto principal | ✔ |
| `--color-ink-soft` | `#5B5378` | Texto secundario | **6.75** ✔ |
| `--color-success` | `#1F7A4D` | Conectado / éxito (**siempre con icono + texto**) | sobre menta **4.05** (uso grande + etiqueta) |
| `--color-warning` | `#8A5A00` | Pendiente / advertencia | ✔ sobre ámbar |
| `--color-danger` | `#C81E3C` | SOS / errores | blanco sobre él 4.7 ✔ |
| `--color-mint` `--color-sky` `--color-butter` `--color-peach` `--color-blush` | `#BCEBD8` `#CBE8FA` `#FFE6A8` `#F5B77D` `#F5C7DC` | Fondos de tarjetas por categoría | **siempre con texto `#51409B` o más oscuro** |

> Regla que se desprende de las mediciones: **nunca texto blanco sobre coral, naranja o amarillo** (contraste 1.76–2.01). Esos pasteles son fondo, no color de texto.

### 5.2 Tipografía

- **Nunito** (400/600/700/800) → títulos, botones, nombres. Redondeada, amable, coherente con el wordmark.
- **Inter** (400/500/600) → párrafos, datos técnicos (batería, RSSI), tablas.
- Escala móvil-first con **tamaño base controlado por preferencia del usuario** (100 / 112.5 / 125 %): `14 / 16 / 18 px` base, títulos `1.25 → 2.25 rem`.
- Interlineado 1.5 en cuerpo, 1.15 en títulos. Longitud de línea máx. 68 caracteres en escritorio.

### 5.3 Formas, sombras y espaciado

- Radios: `sm 10px` · `md 16px` · `lg 22px` · `xl 28px` · `full` (pastillas). Tarjetas siempre `lg`+.
- Sombras suaves en lavanda, nunca negras: `0 6px 18px -8px rgb(81 64 155 / .28)`.
- Espaciado en múltiplos de 4, contenedor móvil `px-5`, escritorio `max-w-6xl`.
- Botones: altura mínima **48 px** (56 px en acciones principales y SOS), `gap` mínimo 12 px, área táctil ≥ 44 px.
- Foco visible obligatorio: `outline: 3px solid #6B4FD0; outline-offset: 3px` (visible también en alto contraste).

### 5.4 Logotipo (propuesta a aprobar)

Símbolo: **dos trazos que se aproximan y forman una K**, con una **mano estilizada** en el trazo diagonal y un **corazón** mínimo en el vértice — misma idea que tu pieza, pero **vectorial, plana y legible a 16 px**. Wordmark «KLAPS» en Nunito ExtraBold con la K en morado y el resto en violeta oscuro, y el eslogan en `ink-soft`.

> Es una **recreación** de tu marca, no un reemplazo. Si tienes el SVG original, se usa el tuyo y descarto el mío.

---

## 6. Arquitectura propuesta

```
src/
├── assets/            (recursos que importa el bundler)
├── components/
│   ├── common/        Button, Card, StatusBadge, SectionTitle, Modal, EmptyState,
│   │                  LoadingState, ErrorMessage, ProgressBar, Toggle, Slider, SegmentedControl
│   ├── layout/        AppShell, MobileTabBar, Sidebar, PageHeader, SkipLink
│   ├── accessibility/ AccessibilityPanel, FontSizeControl, ContrastToggle, MotionToggle
│   ├── devices/       DeviceCard, BatteryIndicator, SignalIndicator, SensorGrid
│   ├── translation/   TranslationStage, GestureIndicator, SessionTimeline
│   └── brand/         Logo, MascotIllustration, DecorativeRings
├── pages/             Welcome, Onboarding, Dashboard, Translation, Voice,
│                      Devices, DeviceDiagnostics, Phrases, History, Emergency, Settings
├── services/
│   ├── bluetooth/     bluetoothClient.js (Web Bluetooth) + glucoseGuardsMock.js
│   ├── speech/        recognition.js, synthesis.js (con detección de soporte y permisos)
│   ├── emergency/     sos.js (estado de envío honesto: "no configurado")
│   └── storage/       localStorage helpers
├── data/              frases, categorías, estados de dispositivos (100 % separados de la UI)
├── hooks/             useSpeech, useSpeechRecognition, useLocalStorage, useMediaQuery, useReducedMotion
├── context/           AccessibilityContext, DeviceContext, HistoryContext, ToastContext
├── utils/             cn, format, contrast, permissions
├── styles/            index.css (tokens @theme + base)
├── App.jsx            solo rutas + providers
└── main.jsx
```

**Separación estricta simulación / realidad** (tu regla: no afirmar que los guantes están conectados):

- `services/bluetooth/mockGuards.js` → produce latidos de batería y RSSI con ruido realista.
- `services/bluetooth/realClient.js` → esqueleto con `navigator.bluetooth.requestDevice()` y el UUID de servicio **como constante vacía + TODO**. No se invoca si no hay UUID configurado.
- Contexto de dispositivos con `mode: 'demo' | 'real'`, y **banner visible «Modo demostración»** en Dispositivos y Panel cada vez que `mode === 'demo'`.
- SOS: envía a `console` y muestra «Alerta **no** enviada: no hay servicio de emergencia configurado». Nunca un check verde falso.

---

## 7. Accesibilidad implementada desde el núcleo (no al final)

1. `AccessibilityProvider` con estado persistido: tamaño de fuente, alto contraste, reducir movimiento, velocidad/tono de voz, mano dominante.
2. Tokens aplicados en `:root` vía `data-font-scale` y `data-contrast="high"`; el alto contraste no "invierte" la app, **refuerza contraste de texto, bordes y foco**.
3. Todo control con `aria-label`/`aria-pressed`/`aria-live` (anuncios de texto reconocido).
4. Estados nunca solo por color: punto + icono + etiqueta («Conectado», «Batería baja»).
5. Teclado: skip-link, orden lógico, foco visible, `Escape` cierra modales, foco atrapado en modal.
6. `prefers-reduced-motion` + interruptor propio; animaciones de procesamiento con alternativa estática.
7. Contraste de todos los pares de color **medido, no supuesto** (tabla §5.1).

---

## 8. Roadmap y criterios de aceptación

| Etapa | Entregable | Criterio de aceptación |
| --- | --- | --- |
| **1. Análisis** | este documento | ✔ aprobado por ti |
| **2. Sistema visual** | `styles/index.css` con tokens, `components/common/*`, `components/brand/*`, logotipo SVG, favicon | Todos los componentes documentados; foco visible; contraste AA medido |
| **3. Maquetación** | Shell responsive (tab bar móvil / sidebar escritorio) + **Bienvenida** + **Panel** | 320 / 390 / 768 / 1024 / 1440 sin scroll horizontal, sin imágenes deformadas |
| **4. Funcionalidad** | Onboarding de accesibilidad, Traducción, Voz, Dispositivos, Frases, Historial, SOS, Ajustes | Cada botón hace algo real; estados vacío/carga/error en todas las listas |
| **5. Integraciones** | Web Bluetooth (esqueleto real + demo), SpeechRecognition/Synthesis con detección de soporte, Vibration, Geolocation, PWA | Fallback claro cuando el navegador no soporta la API o se deniega permiso |
| **6. Pruebas** | Revisión responsive, teclado, consola limpia, `npm run build`, checklist a11y | Sin errores de consola; build sin warnings; recorrido completo con teclado |

Ritmo sugerido: **2 → 3 → 4 → 5 → 6**, parando al final de cada etapa para tu revisión.

---

## 9. Cambios ya realizados (mínimos y reversibles)

| Archivo | Acción |
| --- | --- |
| `public/illustrations/klaps-bienvenida-{720,1080,1440}.webp` | Recorte del arte (quitando los márgenes transparentes) + WebP optimizado. **Derivados de tu imagen**, sin alterar el original. |
| `docs/etapa-1-analisis.md` | Este documento. |
| `node_modules/` | `npm install` de las dependencias **ya declaradas**. Sin cambios en `package.json`. |

Nada de `src/` ha sido tocado porque todavía no existe.

---

## 10. Decisiones que necesito de ti

1. **¿Arranco la Etapa 2 + 3?** (sistema visual + shell responsive + Bienvenida y Panel funcionando y navegables).
2. **Logotipo:** ¿recreación vectorial según §5.4, o me pasas el SVG/PNG con transparencia?
3. **Recursos separados** (mascota, guantes, avatares): ¿los enviarás, o avanzo con la composición + máscaras suaves y lo marco como provisional?
4. **Botón principal:** ¿morado de marca (recomendado) o negro como en la referencia?

Con tus respuestas sigo directo con el código, archivo por archivo y con instrucciones para probarlo.
