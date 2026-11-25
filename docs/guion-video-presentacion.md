# GUION TÉCNICO Y ESTRUCTURA DE GRABACIÓN DE VIDEO · PROYECTO KLAPS

**Curso:** Arquitectura del Computador (2026-2)  
**Institución:** Universidad Privada del Norte (UPN) — Facultad de Ingeniería — Carrera de Ingeniería de Sistemas Computacionales  
**Docente:** Mg. Gustavo Paz Purizaca  
**Equipo de Proyecto:**
1. **Camila Nadine Montalvo Abrego** (N00421639)
2. **Johana Carolina Quispe Ruiz** (N00424907)
3. **Leoneld Mathias Sotelo Espinoza** (N00421604)
4. **Joselyn Ivana Tananta Arevalo** (N00433768)

**Despliegue Oficial en Producción (HTTPS para Web Bluetooth en Celulares):**  
🔗 **[https://klaps-ebon.vercel.app](https://klaps-ebon.vercel.app)**  
*(URL espejo: `https://klaps-jqs-projects-5beea8bb.vercel.app`)*

---

## 1. Ficha Técnica del Video

- **Duración objetivo:** Entre 5 y 10 minutos (Tiempo ideal recomendado: **7 minutos y 30 segundos**).
- **Formato audiovisual recomendado:** Resolución Full HD (1080p a 30 o 60 fps).
- **Esquema de encuadre sugerido:**
  - **Fase de explicación:** Cámara enfocando a los expositores con el prototipo físico en mesa.
  - **Fase de demostración práctica:** Pantalla dividida (*Picture-in-Picture* o *Split Screen*):
    - *Lado izquierdo / Ventana principal:* Grabación de la mano con el guante instrumentado ejecutando las señas.
    - *Lado derecho / Ventana secundaria:* Grabación de pantalla del celular (Android con Google Chrome) mostrando la aplicación web en vivo conectada por Web Bluetooth, con el audio del altavoz activo.

---

## 2. Estructura y Cronograma del Video (00:00 a 08:30)

| Bloque | Contenido Principal | Tiempo estimado | Responsable sugerido |
| :--- | :--- | :--- | :--- |
| **Bloque 1** | Introducción, presentación del equipo y problemática | 00:00 – 01:15 (1m 15s) | Camila Montalvo / Todo el equipo |
| **Bloque 2** | Arquitectura física y componentes de hardware embebido | 01:15 – 03:00 (1m 45s) | Camila Montalvo & Leoneld Sotelo |
| **Bloque 3** | Arquitectura lógica, protocolo BLE a 20 Hz e inferencia KNN | 03:00 – 04:45 (1m 45s) | Johana Quispe & Leoneld Sotelo |
| **Bloque 4** | Demostración en vivo: Conexión móvil, traducción y canal SOS | 04:45 – 07:15 (2m 30s) | Todo el equipo (Demo guiada por Johana y Joselyn) |
| **Bloque 5** | Métricas de rendimiento, conclusiones de arquitectura y cierre | 07:15 – 08:15 (1m 00s) | Joselyn Tananta / Cierre conjunto |

---

## 3. Guion Detallado Paso a Paso

### BLOQUE 1 · INTRODUCCIÓN Y PRESENTACIÓN DEL EQUIPO (00:00 – 01:15)

**[ESCENA: Cámara general al equipo. En la mesa se aprecia el guante instrumentado KLAPS, el microcontrolador ESP32 y un teléfono inteligente con la app abierta. Gráfica en pantalla con el logo de KLAPS, UPN y los nombres/códigos de los integrantes].**

- **CAMILA MONTALVO:**
  > *"Estimado profesor Gustavo Paz y compañeros, somos el grupo de estudiantes de Ingeniería de Sistemas Computacionales de la Universidad Privada del Norte. Hoy presentamos nuestro proyecto final del curso de Arquitectura del Computador: **KLAPS**, un sistema ciberfísico de comunicación asistida mediante guantes inteligentes instrumentados con microcontroladores ESP32, comunicación Bluetooth Low Energy y clasificación inteligente en tiempo real."*

- **JOHANA QUISPE:**
  > *"En el Perú, más de quinientas mil personas presentan discapacidad auditiva y del habla. La lengua de señas es su medio natural de expresión, pero menos del uno por ciento de la población oyente la comprende. Ante esta barrera, desarrollamos un dispositivo portable, accesible y de bajo costo que traduce la cinemática de la mano a texto y voz audible en cualquier dispositivo móvil sin requerir instalar aplicaciones pesadas ni depender de servidores externos para la traducción."*

---

### BLOQUE 2 · ARQUITECTURA DE HARDWARE Y COMPONENTES (01:15 – 03:00)

**[ESCENA: Plano detalle o acercamiento (*Close-Up*) a los componentes del guante físico sobre la mesa. Se señalan las partes con la mano o un puntero].**

- **LEONELD SOTELO:**
  > *"Desde la perspectiva de la arquitectura del hardware, el sistema se fundamenta en un microcontrolador **ESP32 DevKit V1**, basado en la arquitectura **Xtensa Dual-Core LX6 de 32 bits a 240 MHz**. Una decisión arquitectural clave fue desacoplar las tareas del procesador:*
  > 1. *El **Core 0** se dedica exclusivamente a gestionar la pila de radiofrecuencia Bluetooth Low Energy (BLE).*
  > 2. *El **Core 1** ejecuta el muestreo analógico de alta velocidad y el bus de comunicaciones de los sensores."*

- **CAMILA MONTALVO:**
  > *"Para la captura sensorial utilizamos dos subsistemas complementarios:*
  > - *Primero, **sensores de flexión resistivos de 2.2 pulgadas** ubicados en los dedos del guante. Cada sensor está integrado en un circuito acondicionador mediante divisores de tensión pasivos de 10 kΩ y 47 kΩ. Por diseño de ingeniería y restricción de arquitectura del silicio, conectamos todos los sensores analógicos **exclusivamente a los canales del ADC1** (en los GPIOs 36, 39, 34, 35 y 32). Esto es fundamental: el bloque ADC2 del ESP32 comparte circuitos con la radio Wi-Fi y Bluetooth; al transmitir por BLE, ADC2 queda inhabilitado por hardware. Conectar a ADC1 garantiza que no exista conflicto ni pérdida de lectura."*
  > - *Segundo, una **Unidad de Medición Inercial (IMU) MPU-6050** de 6 grados de libertad montada en el dorso de la mano. Se comunica por el bus **I²C a 400 kHz** usando los pines GPIO 21 (SDA) y GPIO 22 (SCL), capturando la aceleración tridimensional y la velocidad angular para distinguir la orientación espacial de la mano y diferenciar señas estáticas de gestos dinámicos."*

- **LEONELD SOTELO:**
  > *"Todo el conjunto se alimenta a 3.3 y 5 voltios de forma segura y portable mediante una batería recargable con módulo TP4056 o directamente a través de una conexión micro-USB, garantizando un peso inferior a 120 gramos y máxima ergonomía para el usuario."*

---

### BLOQUE 3 · ARQUITECTURA LÓGICA, PROTOCOLO BLE Y CLASIFICADOR KNN (03:00 – 04:45)

**[ESCENA: Split-Screen o inserción de diagrama de bloques en pantalla mostrando el flujo desde el ESP32 hasta el navegador web en Vercel].**

- **JOHANA QUISPE:**
  > *"A diferencia de investigaciones previas que intentan ejecutar redes neuronales pesadas dentro del microcontrolador provocando sobrecalentamiento y alto consumo de batería, en KLAPS implementamos una **arquitectura híbrida desacoplada**:*
  > 
  > 1. *El firmware del ESP32 muestrea a **20 Hz** (cada 50 milisegundos) y empaqueta las lecturas crudas en una estructura binaria contigua **Little-Endian de exactamente 34 bytes** (10 bytes para flexión de dedos y 24 bytes para acelerómetro y giroscopio).*
  > 2. *Esta trama se notifica a través de un perfil **BLE GATT personalizado** (servicio `6e400001` y característica `6e400002`), logrando un caudal ultraligero de apenas 680 bytes por segundo y consumiendo menos de 20 miliamperios."*

- **JOSELYN TANANTA:**
  > *"La inteligencia de reconocimiento reside directamente en el cliente dentro de nuestra Progressive Web App desarrollada en React y Vite, desplegada globalmente en Vercel bajo HTTPS para habilitar la **Web Bluetooth API**.*
  > 
  > *El clasificador utiliza el algoritmo **K-Nearest Neighbors (KNN)** en JavaScript puro sobre un vector normalizado de 22 dimensiones:*
  > - *Aplica pesos diferenciados dando prioridad a la flexión anatómica y a la orientación inercial.*
  > - *Cuenta con una ventana temporal de estabilidad de 600 milisegundos para evitar falsos positivos durante la transición natural de la mano.*
  > - *Integra un motor de **cinemática asistida** que modela armónicamente la sinergia muscular de los dedos y una rutina de **calibración guiada rápida** que normaliza las lecturas analógicas a la anatomía de cada usuario en solo 3 segundos sin necesidad de reprogramar el microcontrolador."*

---

### BLOQUE 4 · DEMOSTRACIÓN PRÁCTICA EN VIVO (04:45 – 07:15)

**[ESCENA: Pantalla dividida (Split-Screen). A la izquierda, Johana se coloca el guante físico. A la derecha, captura en tiempo real de la pantalla del celular Android navegando en `https://klaps-ebon.vercel.app/traduccion`].**

- **JOHANA QUISPE:**
  > *"Vamos a realizar la demostración práctica en vivo conectando el guante directamente a un teléfono móvil Android mediante Google Chrome utilizando la URL de producción desplegada en Vercel."*

1. **Paso 1: Enlace Web Bluetooth en vivo:**
   - *Acción en celular:* Tocar el botón **«Conectar Guante»** o icono de Bluetooth en la pantalla.
   - *Narración:* *"El navegador solicita acceso a dispositivos BLE cercanos mediante la ventana emergente nativa. Seleccionamos `KLAPS_Guante_D` y pulsamos Vincular."*
   - *Resultado visible:* El badge cambia inmediatamente a verde **«Conectado»** y el monitor de telemetría empieza a recibir la trama a 20 Hz.

2. **Paso 2: Calibración Rápida de la Mano:**
   - *Acción:* Pulsar el botón **«Calibrar»** en la interfaz.
   - *Narración:* *"El sistema realiza la calibración guiada en dos pasos: primero extendemos la mano plana en reposo durante 3 segundos para capturar el valor mínimo, y luego cerramos el puño para registrar la máxima flexión. De inmediato, los rangos quedan normalizados al cien por ciento."*

3. **Paso 3: Traducción de Señas Estáticas (Vocales):**
   - *Acción:* Ejecutar con la mano las señas frente a la cámara:
     - **Seña "A"** (puño cerrado con pulgar al lado): La app detecta "A", muestra la tarjeta con confianza > 90% y el celular pronuncia la letra en voz alta: *"A"*.
     - **Seña "E"** (dedos recogidos apoyados sobre el pulgar): La app detecta "E" y la sintetiza por audio: *"E"*.
     - **Seña "I"** (meñique extendido, resto cerrado): La app detecta "I" instantáneamente: *"I"*.
     - **Seña "O"** (forma circular de la mano): La app traduce "O".
     - **Seña "U"** (índice y medio juntos levantados): La app traduce "U".
   - *Narración:* *"Como se observa, los indicadores de flexión responden con suavidad en tiempo real. La síntesis de voz Web Speech API verbaliza la seña sin ningún retardo perceptible, con una latencia de clasificación inferior a 50 milisegundos."*

4. **Paso 4: Demostración del Canal de Auxilio (SOS):**
   - *Acción:* Agitar la mano con un patrón de emergencia o seleccionar la seña de auxilio.
   - *Narración:* *"KLAPS incorpora un canal de auxilio SOS para situaciones de riesgo. Al detectar la seña de socorro o agitación inercial sostenida, se inicia una cuenta regresiva de seguridad de 10 segundos para evitar falsas alarmas. Si el usuario no la cancela, una Edge Function serverless despacha de forma segura una alerta a Telegram con las coordenadas satelitales GPS exactas del usuario hacia sus contactos de emergencia."*

---

### BLOQUE 5 · MÉTRICAS, CONCLUSIONES Y CIERRE (07:15 – 08:30)

**[ESCENA: Cámara al equipo completo con el guante y la pantalla de métricas o cartel de KLAPS de fondo].**

- **JOSELYN TANANTA:**
  > *"En la fase experimental medimos una **latencia global de extremo a extremo de 34.3 milisegundos** (compuesta por 4.8 ms de adquisición analógica e I2C, 1.2 ms de estructuración de trama, 14.5 ms de transmisión BLE, 1.8 ms de clasificación KNN en el navegador y 12 ms de renderizado visual y síntesis de voz). Esto se encuentra muy por debajo del umbral de percepción humana de 100 milisegundos, permitiendo una conversación continua y natural."*

- **LEONELD SOTELO:**
  > *"La exactitud global del clasificador superó el **94%** tras la calibración guiada, validando que el empaquetado binario de 34 bytes a 20 Hz es notablemente superior a arquitecturas convencionales basadas en JSON o Bluetooth clásico SPP."*

- **CAMILA MONTALVO:**
  > *"Como conclusión fundamental de Arquitectura del Computador, este proyecto demuestra que diseñar sistemas embebidos eficientes requiere respetar las restricciones del silicio —como aislar el ADC1 frente a la radiofrecuencia— y aprovechar las capacidades computacionales del dispositivo cliente para democratizar la tecnología asistiva."*

- **JOHANA QUISPE:**
  > *"Agradecemos al docente Mg. Gustavo Paz Purizaca por la guía durante este ciclo académico 2026-2. Esto es KLAPS: tecnología, arquitectura e inclusión al alcance de todos. ¡Muchas gracias!"*

**[FIN DEL VIDEO · Créditos finales con código de estudiantes, universidad y repositorio GitHub].**

---

## 4. Guía de Conexión desde el Teléfono Celular (Android)

Para que la demostración con el celular funcione perfectamente durante la grabación, sigue estos pasos:

1. **Abrir Chrome en Android y entrar a la URL HTTPS:**
   - Dirección: **`https://klaps-ebon.vercel.app`**
   - *Nota:* Web Bluetooth exige conexión segura obligatoria (`HTTPS`). Vercel ya provee el certificado SSL activo.

2. **Permisos requeridos en Android:**
   - Asegúrate de tener el **Bluetooth encendido** en el teléfono.
   - En Android 12 o superior, Chrome solicitará permiso de **"Dispositivos cercanos"**. Pulsa **«Permitir»**.
   - Asegúrate de tener la **Ubicación (GPS) activada** (en Android el escaneo de balizas BLE requiere permiso de ubicación del sistema operativo).

3. **Vincular el Guante:**
   - Entra a la sección **Traducción** (`/traduccion`) o **Dispositivos** (`/dispositivos`).
   - Toca el botón de **Bluetooth / Conectar**.
   - En la lista emergente aparecerá **`KLAPS_Guante_D`** (o `KLAPS_Guante_I`).
   - Selecciónalo y toca **«Vincular»**.
   - El indicador pasará a estado verde y comenzará la lectura en vivo.
