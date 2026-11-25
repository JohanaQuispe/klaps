# GUION TÉCNICO INDIVIDUAL (5 MINUTOS EXACTOS) · PROYECTO KLAPS

**Expositora:** Johana Carolina Quispe Ruiz (N00424907)  
**Curso:** Arquitectura del Computador (2026-2)  
**Institución:** Universidad Privada del Norte (UPN) — Facultad de Ingeniería  
**Docente:** Mg. Gustavo Paz Purizaca  
**Equipo de Proyecto (Mención formal en carátula):**
1. Camila Nadine Montalvo Abrego (N00421639)
2. Johana Carolina Quispe Ruiz (N00424907)
3. Leoneld Mathias Sotelo Espinoza (N00421604)
4. Joselyn Ivana Tananta Arevalo (N00433768)

**Documento Oficial en tu Google Drive:**  
📄 **[https://docs.google.com/document/d/1oPu8LAQgZYlpqRQtIlBnmMNW6Q8x-SfX3i5EBNcv7OM/edit?usp=drivesdk](https://docs.google.com/document/d/1oPu8LAQgZYlpqRQtIlBnmMNW6Q8x-SfX3i5EBNcv7OM/edit?usp=drivesdk)**

**Aplicación Web Desplegada en Vercel (HTTPS para Android con Web Bluetooth):**  
🔗 **[https://klaps-ebon.vercel.app](https://klaps-ebon.vercel.app)**

---

## 📌 Estrategia de Grabación

1. **En los COMPONENTES mencionamos la TOTALIDAD de elementos físicos y electrónicos utilizados** (ESP32, 5 sensores flex, resistencias de 10k/47k, pines de ADC1, MPU-6050 por I2C, cables de silicona 26 AWG, guante textil, batería LiPo con TP4056 y MT3608, placa de montaje y protecciones).
2. **En la DEMOSTRACIÓN PRÁCTICA llenamos el tiempo con la acción** (enlazar BLE, calibrar 3s, hacer las 5 vocales pausadamente para que el celular hable solo por altavoz, y probar el modo SOS).
3. **Duración total:** Exactamente **5:10 minutos** (cumples el límite mínimo de 5 minutos sin tener que hablar de más).

---

## ⏱️ Cronograma de Tiempos

| Minuto | Sección | Contenido |
| :--- | :--- | :--- |
| **00:00 – 00:40** (40 s) | **Introducción** | Saludo formal al profesor Gustavo Paz, equipo y problemática. |
| **00:40 – 02:00** (1m 20s) | **Componentes de Hardware** | **TODOS los componentes físicos y electrónicos explicados uno a uno.** |
| **02:00 – 02:50** (50 s) | **Funcionamiento** | Trama de 34 bytes a 20 Hz por BLE, PWA en Vercel con HTTPS y KNN. |
| **02:50 – 04:35** (1m 45s) | **Demostración en Vivo** | Conexión celular, calibración de 3s, vocales A-E-I-O-U y prueba SOS. |
| **04:35 – 05:10** (35 s) | **Métricas y Cierre** | Latencia de 34.3 ms, 94% de exactitud y despedida formal. |

---

## 🎙️ Guion Paso a Paso

### 1. INTRODUCCIÓN (00:00 – 00:40 · 40 segundos)
*(Cámara enfocándote a ti frente a la mesa con el guante físico, el circuito y tu celular).*

> *"Buenas tardes, profesor Gustavo Paz. Mi nombre es Johana Quispe, estudiante de Ingeniería de Sistemas Computacionales en la Universidad Privada del Norte. En representación de mi grupo, presento nuestro proyecto final de Arquitectura del Computador: **KLAPS**, un sistema inteligente de comunicación asistida mediante guantes instrumentados.
> 
> En el Perú existen más de medio millón de personas con discapacidad auditiva y del habla, pero menos del uno por ciento de oyentes conoce la lengua de señas. Para superar esta barrera creamos KLAPS, un dispositivo portable que traduce los gestos de la mano en tiempo real a texto y voz audible en cualquier celular usando la Web Bluetooth API, sin necesidad de instalar ninguna aplicación."*

---

### 2. TODOS LOS COMPONENTES UTILIZADOS (00:40 – 02:00 · 1 minuto 20 segundos)
*(Cámara con plano cercano a la mesa. Vas señalando físicamente cada componente mientras lo mencionas).*

> *"Para la construcción física y electrónica de este prototipo, hemos utilizado la totalidad de los siguientes componentes:
> 
> 1. **Microcontrolador ESP32 DevKit V1 de 30 pines:** Cuenta con un procesador Xtensa Dual-Core LX6 de 32 bits a 240 MHz con conectividad Wi-Fi y Bluetooth BLE integrada. Usamos el Core 0 para la radio BLE y el Core 1 para la adquisición de sensores.
> 
> 2. **Cinco Sensores de Flexión Resistivos de 2.2 pulgadas:** Un sensor montado a lo largo de cada dedo de la mano (pulgar, índice, medio, anular y meñique), variando su resistencia de 10 kΩ en reposo hasta más de 60 kΩ al flexionarse.
> 
> 3. **Cinco Resistencias fijas de 10 kΩ (y 47 kΩ):** Para conformar los divisores de tensión analógicos que acondicionan la señal de cada sensor flex.
> 
> 4. **Asignación obligatoria a pines del conversor ADC1:** Conectamos los sensores exclusivamente a los canales GPIO 36, 39, 34, 35 y 32, ya que en la arquitectura del ESP32 el conversor ADC2 se deshabilita por hardware cuando se activa la radio Bluetooth.
> 
> 5. **Módulo IMU MPU-6050:** Unidad inercial de 6 grados de libertad ubicada en el dorso de la mano, que integra un acelerómetro de 3 ejes y un giroscopio de 3 ejes, comunicándose por bus I²C a 400 kHz en los pines GPIO 21 y 22.
> 
> 6. **Cableado flexible de silicona de calibre 26 AWG:** Diseñado especialmente para soportar la flexión y estiramiento continuo de los dedos sin quebrarse.
> 
> 7. **Guante textil transpirable:** Un guante elástico de compresión que sirve como chasis ergonómico y fija los sensores a las falanges.
> 
> 8. **Sistema de alimentación eléctrica:** Utilizamos alimentación dual, tanto por cable micro-USB a 5 voltios, como portátil mediante una batería de litio LiPo de 3.7V acoplada a un módulo de carga y protección TP4056 y un elevador de voltaje Step-Up MT3608.
> 
> 9. **Elementos de montaje y protección:** Placa perforada PCB para interconexión, tubo termocontraíble para aislar cada soldadura, y velcro ajustable en la muñeca para sujetar firmemente la placa."*

---

### 3. FUNCIONAMIENTO Y ARQUITECTURA LÓGICA (02:00 – 02:50 · 50 segundos)
*(Muestras la pantalla del celular con la app o el esquema general).*

> *"La arquitectura de cómputo es desacoplada:
> 
> El ESP32 no procesa algoritmos pesados de inteligencia artificial para no agotar la batería. Su trabajo es muestrear a **20 Hz** (cada 50 milisegundos) y empaquetar las lecturas en una trama binaria compacta Little-Endian de exactamente **34 bytes**: 10 bytes de flexión y 24 bytes inerciales. Esta trama se notifica vía Bluetooth Low Energy bajo un perfil GATT personalizado, consumiendo menos de 20 miliamperios.
> 
> La inferencia la realiza el cliente en una Progressive Web App en React desplegada en Vercel con HTTPS. La app recibe la trama mediante Web Bluetooth y ejecuta un clasificador **KNN en JavaScript** que compara las lecturas con vectores canónicos y estabilidad temporal de 600 milisegundos, incluyendo cinemática asistida para reproducir el movimiento fluido de los 5 dedos."*

---

### 4. DEMOSTRACIÓN EN VIVO (02:50 – 04:35 · 1 minuto 45 segundos)
*(Te colocas el guante en la mano derecha. Tu celular está al lado mostrando `https://klaps-ebon.vercel.app/traduccion`. Aquí hablas poco; las acciones y el altavoz del celular llenan el tiempo).*

1. **Conexión Bluetooth en vivo (02:50 – 03:15):**
   - Dices: *"Procedo con la demostración en vivo desde el celular."*
   - Tocas **«Conectar Guante»** en el teléfono. Se abre la ventana emergente de Chrome.
   - Dices: *"Selecciono `KLAPS_Guante_D` y pulso Vincular."*
   - Muestras la pantalla: el indicador cambia a verde **«Conectado»** y las barras de los 5 dedos se mueven en tiempo real.

2. **Calibración Rápida de la Mano (03:15 – 03:35):**
   - Dices: *"Realizo la calibración guiada de 3 segundos."*
   - Tocas **«Calibrar»**. Extiendes la mano plana en reposo durante el conteo de 3 segundos, y luego cierras el puño.
   - Dices: *"Los rangos quedan ajustados a la anatomía de mi mano."*

3. **Demostración de Vocales (03:35 – 04:10):**
   *(Realizas cada seña con calma, sosteniéndola 2 o 3 segundos para que el celular hable con volumen alto)*:
   - **Seña 'A'** (puño cerrado con pulgar al lado): La pantalla detecta 'A'. El celular pronuncia en voz alta: *"A"*.
     Dices: *"Detecta la vocal A y la reproduce por voz."*
   - **Seña 'E'** (dedos flexionados sobre el pulgar): La pantalla marca 'E'. El celular pronuncia: *"E"*.
   - **Seña 'I'** (meñique extendido, resto cerrado): La pantalla marca 'I'. El celular pronuncia: *"I"*.
   - **Seña 'O'** (mano formando un círculo): La pantalla marca 'O'. El celular pronuncia: *"O"*.
   - **Seña 'U'** (dedos índice y medio levantados juntos): La pantalla marca 'U'. El celular pronuncia: *"U"*.
   - Dices: *"Como se observa, todos los dedos responden con total naturalidad y la traducción por voz es instantánea."*

4. **Canal de Emergencia SOS (04:10 – 04:35):**
   - Agitas la mano con rapidez o tocas la alerta de emergencia.
   - Dices: *"KLAPS incluye además un canal de auxilio SOS. Al detectar una señal de peligro, inicia una cuenta atrás de 10 segundos para enviar la ubicación GPS del usuario a un contacto de emergencia por Telegram."*
   - Cancelas la cuenta atrás en la pantalla para demostrar el mecanismo de seguridad.

---

### 5. MÉTRICAS DE RENDIMIENTO Y CIERRE (04:35 – 05:10 · 35 segundos)
*(Cámara enfocándote a ti con el guante en mano).*

> *"En las mediciones experimentales obtuvimos una latencia de extremo a extremo de apenas **34.3 milisegundos**, muy inferior al umbral de percepción humana de 100 milisegundos, y una exactitud de clasificación superior al **94%**.*
> 
> *KLAPS comprueba que una arquitectura embebida eficiente, respetando las restricciones del hardware y aprovechando la computación web cliente, permite crear soluciones inclusivas de alto impacto.*
> 
> *Agradezco al profesor Gustavo Paz por su guía en este curso. Muchas gracias."*

*(FIN DEL VIDEO · Duración total: 5 minutos y 10 segundos).*
