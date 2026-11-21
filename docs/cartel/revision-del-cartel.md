# Revisión del cartel «Arquitectura del Computador · Proyecto Final»

Auditoría del cartel que hizo tu compañera, comparado con lo que el proyecto **realmente** hace hoy
(código en `main`, firmware en `docs/firmware/`, app en `src/`).

Cartel corregido y listo para imprimir: **`docs/cartel/cartel-klaps.html`**
(Chrome → `Ctrl+P` → *Guardar como PDF* → Tamaño **A3**, **Horizontal**, márgenes **Ninguno**).

---

## 1. Incongruencias graves (cambian el mensaje del cartel)

| # | Lo que dice el cartel | Qué pasa en realidad | Corrección aplicada |
| --- | --- | --- | --- |
| 1 | La app se llama **TramitA**, con un logo de hoja verde | La app se llama **KLAPS** y su eslogan es **«Comunicación sin barreras»**. Nombre y eslogan son inmutables en el proyecto | «KLAPS · web mobile-first» y el eslogan en la cabecera |
| 2 | **«Aplicación móvil»** con un teléfono | Es una **aplicación web** (React + Vite + Tailwind) que corre en el navegador del móvil o del PC; no hay APK ni tienda de aplicaciones | Bloque 4: «Aplicación · KLAPS web mobile-first» |
| 3 | Un **solo guante** en la figura y en el texto | El sistema es **bimanual**: dos guantes, `KLAPS-D` y `KLAPS-U`, cada uno con sus 5 flex y su MPU-6050 | «Dos guantes (KLAPS-D y KLAPS-U)» |
| 4 | Materiales: **ESP32 ×1** pero **IMU ×2** (contradicción interna) | Si hay 2 IMU y 10 sensores flex (5 por guante), tiene que haber **2 ESP32** | «ESP32 DevKit V1 ×2» |
| 5 | **Procesamiento**: «Interpreta el gesto y genera la traducción» | El ESP32 **no clasifica nada**: muestrea, filtra y empaqueta una trama de 34 bytes. El reconocimiento lo hace el **clasificador KNN en JavaScript dentro del navegador** | Bloque 2: «No interpreta el gesto: adquiere, normaliza y publica» + tarjeta «Clasificar en el cliente» |
| 6 | «Traducción de **lenguaje de señas**» | No es un traductor de lengua de señas: reconoce **posturas y movimientos entrenados** por el usuario (más una seña física de emergencia) | Título: «Sistema de comunicación asistida con guantes instrumentados» + bloque de alcance |
| 7 | Falta la **alerta SOS** por completo | Es una función central: 3 señas de SOS (o la seña física) → cuenta atrás cancelable de 10 s → mensaje por **Telegram** a través de una función serverless | Paso 5 del flujo + bloque 4 |

> **Por qué importa el punto 5:** en un curso de *Arquitectura del Computador* lo que se evalúa es
> **dónde ocurre cada cosa**. Si el cartel dice que el ESP32 «interpreta el gesto» y el código lo hace
> en el navegador, la arquitectura descrita no es la del sistema entregado. Corregido, además, queda
> mejor: es una decisión de diseño defendible (microcontrolador sin modelo, modelo recargable sin
> recompilar firmware).

---

## 2. Incongruencias medianas

| # | Cartel original | Corrección |
| --- | --- | --- |
| 8 | «Ajustes de voz (**volumen e idioma**)» | La app ajusta **velocidad, tono y voz**; el volumen lo controla el sistema y el idioma es fijo (español). Se cambia por «texto, voz e interfaz accesible» |
| 9 | Materiales: «Resistencias (**kit**)» sin especificar | Hacen falta **10 resistencias de 10 kΩ**, una por sensor: los pines GPIO 34/35/39 **no tienen pull-up interno**, así que sin divisor no hay lectura |
| 10 | «Batería LiPo 3,7 V ×2, TP4056 ×2, elevador ×2» presentados como materiales del proyecto | La **etapa de alimentación no está implementada**: hoy el ESP32 va por USB. Se mueve a un recuadro **«fase 2»** con la cadena LiPo → TP4056 → elevador → ESP32 |
| 11 | Flujo de 4 pasos que se salta la clasificación | 5 pasos: captura → adquisición → transporte BLE → clasificación KNN → actuación (texto, voz, SOS) |
| 12 | «Descripción de los bloques» repite lo que ya dicen las tarjetas | Se sustituye por **«Decisiones de arquitectura»**, que aporta contenido evaluable |

---

## 3. Datos técnicos que faltaban y ahora aparecen

Estos son los que hacen que el cartel parezca de un proyecto real:

- **ADC de 12 bits** y divisor 3V3 → 10 kΩ → GND en entradas **ADC1**.
- **MPU-6050** por I²C (SDA 21 / SCL 22), ±2 g y ±250 °/s.
- **Trama binaria de 34 bytes** = 5 × `int16` (flex) + 6 × `float32` (IMU), a **20 Hz** (≈ 680 B/s).
- **GATT propio** con UUID `6e400001…` y notificaciones; el dispositivo se anuncia como `ESP32-D` / `ESP32-U`.
- **KNN en JavaScript**: vector de **22 dimensiones** (11 por guante), **K = 3**, umbral de confianza **75 %**, ventana de 4 s (80 fotogramas) para señas dinámicas.
- **Calibración guiada** y entrenamiento (40 capturas estáticas / 80 dinámicas) desde la app.
- **Token del bot fuera del navegador**: la alerta pasa por una función serverless.

---

## 4. Lo que quité y por qué

- **«Personalizar lenguaje» / «Configurar señas» / «Ajustes de voz»** como tres globos sueltos:
  se reemplazan por las capacidades reales de la app (calibración, entrenamiento, voz, historial,
  accesibilidad, SOS). Un globo por capacidad, sin prometer idiomas que no existen.
- **La ilustración del guante con cables azules**: es genérica y no coincide con el montaje
  (divisores y pines). Mejor una descripción técnica; si quieres una foto del guante real, ese es
  el recurso que conviene añadir.

---

## 5. Cómo imprimir o entregar

1. Abre `docs/cartel/cartel-klaps.html` en Chrome (doble clic o `file:///…`).
2. `Ctrl+P` → **Guardar como PDF** → Tamaño **A3** → **Horizontal** → Márgenes **Ninguno** →
   activar **Gráficos de fondo**.
3. Para Word/PowerPoint: abre el PDF y usa «Insertar → Objeto» o exporta el PDF a imagen.
4. Reemplaza el recuadro `UPN` de la cabecera por el **logotipo oficial** si el docente lo exige.
5. Completa **integrantes y docente** en el pie (están como líneas para escribir).

---

## 6. Si el docente pregunta

- **«¿Dónde está la inteligencia del sistema?»** → En el navegador, no en el ESP32: el
  microcontrolador solo adquiere y transporta; el clasificador KNN vive en la app y se recalibra
  sin tocar el firmware.
- **«¿Por qué BLE y no Wi-Fi?»** → No requiere red, menor consumo y alcance suficiente (~10 m)
  para un dispositivo personal.
- **«¿Por qué una trama binaria?»** → 34 bytes fijos a 20 Hz frente a un JSON de cientos de bytes:
  menos latencia y menos CPU en un microcontrolador con radio activa.
- **«¿Qué no hace?»** → No traduce lengua de señas completa, necesita calibración por usuario y la
  alimentación portátil es fase 2. Declararlo es parte del rigor, no una debilidad.
