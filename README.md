# KLAPS · Comunicación sin barreras

Aplicación de comunicación inclusiva para personas con dificultades de audición, habla o
movilidad. Combina guantes inteligentes con microcontroladores ESP32, comunicación inalámbrica
Bluetooth Low Energy (BLE), reconocimiento de gestos mediante inteligencia artificial en el
navegador (KNN), síntesis de voz, transcripción accesible y canal de emergencia SOS por Telegram.

> **Estado del proyecto · Etapa 11 completada (Sistema integral en modo real).**  
> El sistema se encuentra plenamente operativo con hardware embebido real, firmware oficial BLE GATT,
> trama binaria de 34 bytes a 20 Hz, calibración guiada, entrenamiento de señas y canal SOS serverless.
> **No hay datos inventados ni simulaciones**: lo que el hardware no publica se muestra honestamente
> como «sin lectura».

---

## Cómo ejecutarlo

Requisitos: **Node.js 20+** y **Chrome, Edge u Opera** (Web Bluetooth no existe en Safari ni Firefox).

```bash
npm install
npm run dev      # Servidor de desarrollo en http://localhost:5173
```

En **Windows** puedes hacer doble clic en **`iniciar-klaps.bat`**: comprueba Node, instala lo que
falte y abre el navegador automáticamente.

Guía completa de ejecución, comprobaciones y solución de fallos en
[`docs/como-ejecutar.md`](docs/como-ejecutar.md).

Otros comandos útiles:

```bash
npm run build    # Compila para producción en dist/
npm run preview  # Previsualiza la compilación de producción
npm run lint     # Análisis estático de código con oxlint
```

---

## Arquitectura del Hardware y Firmware

El sistema se compone de dos guantes instrumentados independientes (**`KLAPS_Guante_D`** y **`KLAPS_Guante_I`**),
cada uno controlado por un ESP32 DevKit V1:

- **Firmware oficial:** [`docs/firmware/klaps-guante/klaps-guante.ino`](docs/firmware/klaps-guante/klaps-guante.ino).
- **Servicio GATT propio:** `6e400001-b5a3-f393-e0a9-e50e24dcca9e`.
- **Característica de sensores:** `6e400002-b5a3-f393-e0a9-e50e24dcca9e` con `NOTIFY` a **20 Hz** (50 ms).
- **Trama binaria contigua de 34 bytes (Little-Endian):**
  - Bytes 0 a 9: 5 sensores flex en porcentaje (0-100 %, little-endian).
  - Bytes 10 a 21: Aceleración triaxial ($a_x, a_y, a_z$) en $\text{m/s}^2$ del MPU-6050.
  - Bytes 22 a 33: Velocidad angular triaxial ($g_x, g_y, g_z$) en $\text{rad/s}$ del MPU-6050.
- **Pines analógicos:** Confinados exclusivamente al bloque **ADC1** (GPIO 36, 39, 34, 35 y 32) para
  evitar el bloqueo que sufre ADC2 al encender la radio BLE.
- **Divisor de flexión:** `3.3V -> Flex -> Pin -> 47 kΩ -> GND`. El voltaje decae al flexionar; el firmware
  invierte la lectura analógica para entregar 0 % en reposo y 100 % en flexión máxima.

---

## Stack Tecnológico

| Pieza | Versión | Función en el Proyecto |
| --- | --- | --- |
| React | 19 | Interfaz modular basada en componentes reactivos |
| Vite | 8 | Entorno ultrarrápido de desarrollo y empaquetado |
| Tailwind CSS | 4 | Sistema de diseño basado en variables CSS (`@theme`), sin archivo de config |
| React Router DOM | 7 | Enrutamiento SPA con historial y navegación accesible |
| Web Bluetooth API | W3C Standard | Enlace directo cliente-hardware BLE sin controladores externos (Zero-Install) |
| Web Speech API | W3C Standard | Síntesis de voz auditiva y reconocimiento por voz en español |
| Supabase Edge Functions | Deno / TypeScript | Microservicio serverless seguro intermediario con la API de Telegram |
| Lucide React | 1.70 | Iconografía limpia y accesible (sin emojis como pictogramas) |
| Oxlint | 1.90 | Linter de alto rendimiento para validación estricta de React y JavaScript |

---

## Estructura del Repositorio

```
klaps/
├── docs/                               # Documentación técnica y académica
│   ├── firmware/klaps-guante/          # Firmware oficial Arduino ESP32 (klaps-guante.ino)
│   ├── cartel/                         # Cartel A3 oficial del proyecto (cartel-klaps.html)
│   ├── informe/                        # Informe IEEE oficial UPN (Word .docx + Markdown)
│   ├── ble-conexion.md                 # Especificación del protocolo BLE GATT y trama de 34 B
│   ├── pruebas-guante.md               # Protocolo paso a paso para validación del guante real
│   ├── como-ejecutar.md                # Guía de instalación y ejecución en local/móvil
│   └── etapa-1-analisis.md ...         # Bitácora detallada de las Etapas 1 a 11
├── src/
│   ├── components/                     # Componentes visuales y de accesibilidad
│   ├── context/                        # Proveedores globales (DeviceProvider, AccessibilityProvider)
│   ├── hooks/                          # Hooks de integración (useBleDevice, useSpeechSynthesis)
│   ├── pages/                          # Vistas (Traducción, Diagnóstico, Entrenamiento, SOS, etc.)
│   ├── services/
│   │   ├── bluetooth/                  # Cliente BLE (bleClient, bleConfig, sensorFrame, uuidSettings)
│   │   ├── gesture/                    # Motor de inferencia KNN, dataset y almacén de entrenamiento
│   │   ├── emergency/                  # Protocolo de socorro SOS, geolocalización y cliente Telegram
│   │   └── speech/                     # Reconocimiento y síntesis de voz Web Speech
│   └── styles/index.css                # Tokens de marca (#7961D9, #51409B), contraste y tipografía
```

---

## Pantallas Implementadas

| Ruta | Descripción y Funcionalidad |
| --- | --- |
| `/` | Bienvenida con logotipo oficial, eslogan institucional y acceso a accesibilidad |
| `/inicio` | Panel principal: estado de conexión de ambos guantes y accesos rápidos |
| `/dispositivos` | Monitor bimanual: conexión BLE en tiempo real (`KLAPS_Guante_D` y `KLAPS_Guante_I`) |
| `/dispositivos/diagnostico` | Diagnóstico BLE profundo: inspección de GATT, UUIDs y volcado de tramas en hexadecimal |
| `/traducir` | Traductor inteligente en vivo: motor KNN (confianza $\ge 75\%$, debounce 600 ms), texto y voz |
| `/entrenamiento` | Calibración guiada (reposo vs. puño), captura de señas (40/80 fotogramas) e importación/exportación |
| `/emergencia` | Centro de seguridad SOS: código de vinculación `KLAPS-XXXXX`, cuenta atrás cancelable de 10 s y Telegram con GPS |
| `/voz` | Comunicación bidireccional por voz para oyentes mediante síntesis y reconocimiento |
| `/frases` | 35 frases rápidas organizadas en 7 categorías cotidianas |
| `/historial` | Registro de mensajes traducidos con reproducción auditiva y marcado de favoritos |
| `/ajustes` | Ajustes de accesibilidad (tamaño de texto, contraste, reducción de movimiento y mano dominante) |

---

## Accesibilidad Central

- **Multi-escala tipográfica:** 100 %, 112.5 % y 125 % con tipografías oficiales **Nunito** e **Inter**.
- **Modo Alto Contraste:** Refuerzo de contornos y ratios WCAG AAA sobre texto y componentes interactivos.
- **Reducción de movimiento:** Respeto estricto a `prefers-reduced-motion` para personas con sensibilidad vestibular.
- **Identificación multimodal:** Los estados del sistema jamás se expresan únicamente por color; siempre combinan icono distintivo, texto explícito y atributos ARIA.
- **Teclado completo:** Navegación por foco visible (3 px), trampas de foco en diálogos modales y escape por tecla `Esc`.

---

## Documentación del Proyecto

- `docs/firmware/klaps-guante/klaps-guante.ino` — **Firmware oficial** para el ESP32 (BLE GATT a 20 Hz, trama de 34 bytes).
- `docs/pruebas-guante.md` — **Guía práctica de pruebas**: diagnóstico, calibración guiada, entrenamiento de 3 señas y matriz de acierto en 10 intentos.
- `docs/ble-conexion.md` — Especificación de conexión inalámbrica BLE, trama de 34 bytes y solución de problemas.
- `docs/cartel/cartel-klaps.html` — Cartel A3 imprimible de *Arquitectura del Computador* (UPN) y su auditoría técnica.
- `docs/informe/2026-2_ISC-Informe_Proyecto_Final_KLAPS.docx` — **Informe Final oficial UPN IEEE** en formato Word y Markdown.
- `docs/etapa-1-analisis.md` — Auditoría del repositorio original, recursos y decisiones de diseño.
- `docs/etapa-2-3-entrega.md` — Sistema visual unificado y maquetación mobile-first.
- `docs/etapa-4-entrega.md` — Funcionalidad interactiva y estados honestos del sistema.
- `docs/etapa-5-modo-real.md` — Conexión Web Bluetooth real sin datos simulados.
- `docs/etapa-6-reconocimiento.md` — Trama de 34 bytes, vector bimanual de 22 dimensiones y clasificador KNN.
- `docs/etapa-7-senas-dinamicas.md` — Ventana temporal deslizante y discriminación de señas dinámicas.
- `docs/etapa-8-prioridad-movimiento-y-reposo.md` — Ponderación de pesos euclidianos y regla física de reposo.
- `docs/etapa-9-calibracion-guiada.md` — Asistente de calibración anatómica de dedos e IMU (`klaps.calibration.v1`).
- `docs/etapa-10-sos-telegram.md` — Seña física de auxilio, detección triple y cuenta atrás de 10 s.
- `docs/etapa-11-telegram-multiusuario.md` — Bot oficial `@ai_klaps_bot`, códigos de vinculación, Edge Functions y geolocalización segura.
