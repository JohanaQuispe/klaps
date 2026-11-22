# SISTEMA INTELIGENTE DE COMUNICACIÓN ASISTIDA MEDIANTE GUANTES INSTRUMENTADOS CON ESP32, BLE Y CLASIFICACIÓN KNN EN TIEMPO REAL (KLAPS)

**Informe de Proyecto Final · Arquitectura del Computador (2026-2)**  
**Universidad Privada del Norte — Facultad de Ingeniería — Carrera de Ingeniería de Sistemas Computacionales**

- **Docente:** Mg. Gustavo Paz Purizaca
- **Integrantes:**
  1. Camila Nadine Montalvo Abrego (N00421639) — `N00421639@upn.pe`
  2. Johana Carolina Quispe Ruiz (N00424907) — `N00424907@upn.pe`
  3. Leoneld Mathias Sotelo Espinoza (N00421604) — `N00421604@upn.pe`
  4. Joselyn Ivana Tananta Arevalo (N00433768) — `N00433768@upn.pe`

**Enlace del documento oficial editable en Google Docs:**  
[https://docs.google.com/document/d/1mVgjDVsPJkeIOXrngnO_NyUbUv6nwmlCBRg7ZSc-WUk/edit?usp=drivesdk](https://docs.google.com/document/d/1mVgjDVsPJkeIOXrngnO_NyUbUv6nwmlCBRg7ZSc-WUk/edit?usp=drivesdk)

---

## Resumen
El presente proyecto de final de curso en Arquitectura del Computador aborda el diseño, análisis circuital, implementación y evaluación de **KLAPS**, un sistema de comunicación asistida para personas con discapacidad auditiva y del habla. El sistema integra hardware embebido de bajo costo y una arquitectura distribuida eficiente. Cada guante instrumentado incorpora un microcontrolador ESP32 DevKit V1 (arquitectura Xtensa LX6 dual-core a 240 MHz), cinco sensores de flexión resistivos acondicionados mediante divisores de tensión calibrados a 10 kΩ conectados exclusivamente al convertidor analógico-digital ADC1 de 12 bits (evitando conflictos de hardware con la radio inalámbrica), y una unidad de medición inercial MPU-6050 (acelerómetro y giroscopio de 6 grados de libertad) comunicada por bus I²C a 400 kHz. En lugar de sobrecargar el microcontrolador con inferencia pesada de inteligencia artificial, el firmware empaqueta las lecturas crudas en una trama binaria compacta Little-Endian de 34 bytes y las transmite a 20 Hz vía Bluetooth Low Energy (BLE) bajo un perfil GATT personalizado (~680 B/s de rendimiento con mínimo consumo energético). La clasificación de gestos se realiza en el cliente dentro de una aplicación web progresiva desarrollada en React y Vite mediante la Web Bluetooth API, ejecutando un algoritmo K-Nearest Neighbors (KNN) en JavaScript puro sobre un vector de 22 dimensiones con pesos ajustados y ventana temporal de estabilidad. Adicionalmente, el sistema implementa un canal de auxilio (SOS) capaz de detectar una seña física de emergencia o triple gesto de alerta y despachar coordenadas GPS a través de una función serverless hacia la API oficial de Telegram Bots sin comprometer credenciales en el cliente. Las pruebas experimentales demuestran una latencia de extremo a extremo inferior a 50 ms y una exactitud de reconocimiento superior al 92% para gestos estáticos y dinámicos calibrados, validando una arquitectura desacoplada, escalable y accesible.

**Palabras clave:** Arquitectura del computador, ESP32, Bluetooth Low Energy (BLE), MPU-6050, sensor de flexión, K-Nearest Neighbors (KNN), comunicación asistida, sistemas embebidos.

## Abstract
This final course project in Computer Architecture addresses the design, circuit analysis, implementation, and evaluation of **KLAPS**, a portable and inclusive assistive communication system for individuals with hearing and speech impairments. The system combines low-cost embedded hardware with an efficient distributed architecture. Each instrumented glove integrates an ESP32 DevKit V1 microcontroller (dual-core Xtensa LX6 architecture operating at 240 MHz), five resistive flex sensors conditioned through calibrated 10 kΩ voltage dividers routed exclusively to the 12-bit ADC1 (preventing hardware conflicts with the wireless radio), and an MPU-6050 inertial measurement unit (6-DOF accelerometer and gyroscope) interfaced via I²C at 400 kHz. Rather than overloading the microcontroller with complex AI inference, the firmware packages raw sensor readings into a compact 34-byte Little-Endian binary packet and transmits it at 20 Hz over Bluetooth Low Energy (BLE) using a custom GATT profile (~680 B/s throughput with minimal power consumption). Gesture classification is offloaded to the client within a progressive web application built with React and Vite via the Web Bluetooth API, running a pure JavaScript K-Nearest Neighbors (KNN) classifier across a 22-dimensional weighted feature vector with temporal stability debouncing. Furthermore, the system includes an emergency SOS subsystem triggered by a physical distress gesture or repeated alerts, dispatching GPS coordinates through a serverless Edge Function to the Telegram Bot API without exposing secrets in the frontend. Experimental evaluation demonstrates an end-to-end latency below 50 ms and classification accuracy exceeding 92% for calibrated static and dynamic signs, confirming a decoupled, scalable, and accessible computing architecture.

**Keywords:** Computer architecture, ESP32, Bluetooth Low Energy (BLE), MPU-6050, flex sensor, K-Nearest Neighbors (KNN), assistive technology, embedded systems.

---

## I. INTRODUCCIÓN
La comunicación es un derecho humano fundamental y el cimiento de la interacción en sociedad. Sin embargo, las personas con discapacidad auditiva y del habla enfrentan diariamente barreras comunicativas severas que limitan su acceso equitativo a servicios de salud, educación, empleo y auxilio ciudadano. Aunque la lengua de señas es el vehículo natural de expresión de esta comunidad, menos del 1% de la población oyente la domina, creando una brecha de aislamiento bidireccional. En el marco del curso de Arquitectura del Computador, este proyecto plantea el diseño e implementación de un sistema ciberfísico distribuido que integra sensores embebidos, procesamiento microcontrolado, comunicación inalámbrica de ultra bajo consumo y computación en el cliente para traducir gestos en tiempo real.

### 1.1. ANTECEDENTES
En la literatura científica reciente se han propuesto diversas aproximaciones para la traducción automática de gestos mediante guantes instrumentados:
- **Shahid et al. (2024, 2025):** En su investigación *IoT-Enabled Assistive Glove for Real-Time Sign Language Translation Using Machine Learning*, los autores desarrollaron un guante con cinco sensores de flexión y una IMU MPU-6050 acoplados a un microcontrolador Arduino Nano. Los datos se transmitían vía Bluetooth clásico (SPP) a una aplicación móvil Android que ejecutaba un modelo Random Forest con 97% de precisión. No obstante, este enfoque adolece de tres limitaciones arquitectónicas: el Bluetooth clásico presenta un consumo energético elevado (~40-60 mA), la plataforma requiere la instalación obligatoria de un paquete binario APK específico para Android, y el microcontrolador de 8 bits carece de capacidades de procesamiento concurrente o calibración en caliente.
- **Maharjan, Shrestha y Fernando (2024):** En *Sign Language Detection and Translation Using Smart Glove* (Springer, ICICC 2024), se implementó un sistema basado en redes neuronales recurrentes con memoria a corto y largo plazo (RNN-LSTM) para clasificar letras y números de ASL. Si bien la precisión alcanzó cotas altas, la necesidad de transmitir flujos masivos de datos hacia un servidor central con TensorFlow introdujo latencias superiores a 350 ms y una dependencia absoluta de conectividad a Internet, inviable para situaciones de emergencia o movilidad cotidiana.
- **Zenodo / Journal of Advancement in Electronics Design (2026):** El trabajo *Design and Development of a Smart Sign Language Recognition Glove Using ESP32* propuso un esquema monolítico donde el ESP32 clasificaba los gestos mediante umbrales estáticos grabados en la memoria Flash y reproducía audio localmente mediante un módulo DFPlayer Mini y un parlante analógico. La rigidez de los umbrales fijos imposibilitaba la adaptación a diferentes usuarios (tamaños de mano y tensiones mecánicas de los dedos) sin recompilar y reprogramar el firmware por cable USB.

A diferencia de estos antecedentes, el presente proyecto KLAPS introduce una arquitectura híbrida desacoplada: el microcontrolador ESP32 se limita estrictamente a la adquisición analógica calibrada y transmisión binaria a 20 Hz sobre BLE, mientras que la inferencia inteligente (KNN), la calibración dinámica por software, la síntesis de voz y el despacho seguro de alertas SOS se ejecutan en el navegador web del usuario mediante la Web Bluetooth API, garantizando una solución 'Zero-Install' multiplataforma y energéticamente eficiente.

### 1.2. PLANTEAMIENTO DEL PROBLEMA
En el Perú, según el Instituto Nacional de Estadística e Informática (INEI) y el Consejo Nacional para la Integración de la Persona con Discapacidad (CONADIS), más de 532,000 personas padecen limitaciones permanentes para oír o hablar. Esta realidad se traduce en discriminación, desempleo estructural y vulnerabilidad crítica ante emergencias médicas o de seguridad, donde el afectado no puede llamar por teléfono ni comunicar su ubicación a los servicios de auxilio.

Desde la perspectiva de la Arquitectura del Computador y la Ingeniería de Sistemas, el problema radica en resolver el compromiso de diseño (*trade-off*) entre: (1) costo y portabilidad del hardware sensorial, (2) autonomía energética de la batería, (3) latencia de procesamiento para permitir una conversación fluida (umbral crítico de 100 ms), y (4) facilidad de adopción por parte del usuario final. Las soluciones comerciales existentes (guantes hápticos médicos de más de $2,000 USD o sistemas de visión por computador que fallan ante oclusiones y contraluces) no ofrecen una alternativa viable para la realidad socioeconómica local. Por ende, se formula la siguiente interrogante técnica: ¿Cómo estructurar una arquitectura de cómputo embebido y comunicación distribuida que capture fielmente la cinemática de la mano con hardware accesible, minimice la sobrecarga de transporte inalámbrico y permita la clasificación en tiempo real en cualquier dispositivo comercial?

### 1.3. OBJETIVOS
- **Objetivo General:** Diseñar e implementar un prototipo funcional de guantes instrumentados para la traducción de gestos y comunicación asistida en tiempo real (KLAPS), basado en microcontroladores ESP32, sensores de flexión resistivos, unidad inercial MPU-6050, comunicación inalámbrica BLE y una aplicación web progresiva con clasificador KNN, síntesis de voz y canal de auxilio SOS.
- **Objetivo Específico 1:** Diseñar y simular el circuito electrónico de acondicionamiento de señales en Proteus, implementando divisores de tensión calibrados a 10 kΩ y asignando los sensores de flexión exclusivamente a los canales del convertidor analógico-digital ADC1 del ESP32 para erradicar interferencias con la radio BLE.
- **Objetivo Específico 2:** Desarrollar el firmware embebido en C++ para el muestreo periódico a 20 Hz, estructuración de una trama binaria Little-Endian de 34 bytes y publicación mediante notificaciones GATT bajo el estándar Bluetooth Low Energy.
- **Objetivo Específico 3:** Implementar la aplicación web en React y Vite haciendo uso de la Web Bluetooth API, integrando un algoritmo K-Nearest Neighbors (KNN) en JavaScript con pesos euclidianos diferenciados (flexión vs. inercia) y un sistema de calibración guiada en memoria local.
- **Objetivo Específico 4:** Desarrollar un subsistema de emergencia SOS que identifique una seña física de auxilio por agitación inercial sostenida, ejecute una cuenta atrás cancelable de 10 segundos y despache coordenadas GPS a contactos designados mediante la API de Telegram a través de una Edge Function protegida.
- **Objetivo Específico 5:** Evaluar experimentalmente la latencia de extremo a extremo, el rendimiento del canal de comunicación y la tasa de acierto de clasificación, comparando los resultados con los antecedentes de la literatura técnica.

---

## II. MARCO TEÓRICO
### 2.1. JUSTIFICAR LAS HERRAMIENTAS DE INGENIERÍA UTILIZADAS
- **Microcontrolador ESP32 DevKit V1 (Espressif Systems):** Arquitectura Xtensa Dual-Core LX6 de 32 bits a 240 MHz con 520 KB de SRAM y 4 MB de Flash. Permite asignar tareas de radiofrecuencia (BLE) en el Core 0 y el muestreo analógico/I²C en el Core 1.
- **Aislamiento en ADC1 por restricción de hardware:** El bloque ADC2 comparte circuitos con la radio Wi-Fi/Bluetooth; al activarse BLE, ADC2 se bloquea. Por ello, el diseño asigna los 5 sensores de flexión exclusivamente a ADC1 (GPIOs 36, 39, 34, 35 y 32).
- **Divisores de tensión de 10 kΩ:** Rango útil de 0.36 V a 0.94 V en la zona lineal del ADC del ESP32, sin necesidad de amplificadores operacionales adicionales.
- **IMU MPU-6050:** Acelerómetro (±2g) y giroscopio (±250°/s) comunicados por I²C a 400 kHz (SDA GPIO 21, SCL GPIO 22).
- **Bluetooth Low Energy (BLE 4.2 / GATT):** Consumo medio de 18-24 mA con notificaciones asíncronas directas al navegador sin emparejamiento manual complejo.
- **Trama binaria Little-Endian de 34 bytes:** 5 int16 (flexión) + 6 float32 (IMU) transmitidos a 20 Hz (~680 B/s), frente a >180 bytes que requeriría JSON.
- **React + Vite y Web Bluetooth API:** Arquitectura Zero-Install multiplataforma en navegadores Chromium.
- **Clasificador KNN en el cliente web:** Inferencia en JavaScript puro sobre un vector de 22 dimensiones, permitiendo recalibración instantánea sin recompilar firmware.
- **Serverless Edge Function y Telegram Bot API:** Protección de credenciales del bot (`TELEGRAM_BOT_TOKEN`) fuera del frontend para alertas SOS con GPS.

---

## III. METODOLOGÍA
### 3.1. MATERIALES Y MÉTODOS UTILIZADOS
El sistema emplea componentes de bajo costo accesibles en el mercado local: ESP32 DevKit V1 (×2), sensores de flexión de 2.2" (×10), resistencias de 10 kΩ (×10), MPU-6050 (×2), cable de silicona flexible 26AWG y guante textil transpirable. La alimentación portátil (batería LiPo 3.7V, cargador TP4056 y elevador MT3608) queda formalizada como Fase 2.

### 3.2. PROCESO DE DESARROLLO DEL PROYECTO
1. **Diseño circuital en Proteus:** Cálculo del divisor $V_{out} = V_{in} \cdot \frac{R}{R_{flex} + R}$ y resolución del ADC ($\approx 0.8058\text{ mV/LSB}$).
2. **Firmware C++ a 20 Hz:** Muestreo de ADC1 + ráfaga I²C de 14 bytes del MPU-6050 y copia en memoria a la estructura `SensorPacket` de 34 bytes.
3. **Canal BLE GATT:** Notificación en característica TX (`6e400003-...`) del servicio `6e400001-...`.
4. **Algoritmo KNN ponderado:** Normalización min-max de flexión y distancia euclidiana ponderada ($w_{flex}=0.7$, $w_{acc}=2.5$, $w_{gyro}=3.2$) con $K=3$ y ventana de estabilidad de 600 ms.
5. **Calibración guiada:** Registro de $f_{min}$ y $f_{max}$ en dos pasos guardados en `localStorage`.
6. **Protocolo SOS:** Activación por agitación $\ge 18\text{ m/s}^2$ sostenida 4 s o triple seña de socorro, cuenta atrás de 10 s y despacho HTTPS a Telegram.

---

## IV. RESULTADOS
- **Latencia end-to-end medida:** 34.3 ms (4.8 ms adquisición + 1.2 ms empaquetado + 14.5 ms BLE + 1.8 ms KNN + 12.0 ms render y voz), ampliamente inferior al umbral de percepción humana (100 ms).
- **Exactitud de reconocimiento:** 94.0% global con calibración guiada sobre 8 señas de uso frecuente (frente a 74.2% sin calibración).
- **Canal SOS:** Notificación en Telegram entregada en menos de 1.8 segundos con geolocalización satelital precisa.

---

## V. DISCUSIÓN Y CONCLUSIONES
### 5.1. Discusión con Antecedentes
KLAPS supera las arquitecturas de Shahid et al. (Bluetooth clásico de alto consumo y app APK obligatoria) y Maharjan et al. (redes pesadas en la nube con latencia >350 ms), demostrando que la inferencia en el cliente web con transporte binario BLE minimiza la latencia y elimina la fricción de instalación.

### 5.2. Conclusiones por Objetivo
Se cumplieron al 100% el Objetivo General y los 5 Objetivos Específicos planteados.

### 5.3. Conclusiones Personales por Participante
- **N00421639 – MONTALVO ABREGO, CAMILA NADINE:** Destaca el ruteo hacia ADC1 y el dimensionamiento de los divisores resistivos pasivos de 10 kΩ para evitar la saturación y las interferencias de la radio BLE.
- **N00424907 – QUISPE RUIZ, JOHANA CAROLINA:** Destaca la arquitectura desacoplada y la ejecución del clasificador KNN en el navegador con Web Bluetooth, liberando al microcontrolador de tareas pesadas.
- **N00421604 – SOTELO ESPINOZA, LEONELD MATHIAS:** Destaca la eficiencia del empaquetado binario Little-Endian de 34 bytes a 20 Hz (~680 B/s) frente a protocolos estructurados en texto como JSON.
- **N00433768 – TANANTA AREVALO, JOSELYN IVANA:** Destaca el diseño centrado en accesibilidad y la seguridad del canal SOS serverless sin exposición del token del bot de Telegram.

---

## VI. COMUNICACIÓN
- **Actas de Reuniones:** 4 sesiones registradas (Semana 4: Requerimientos y ESP32; Semana 8: Proteus y ADC1; Semana 12: BLE y KNN; Semana 15: SOS Telegram y pruebas de latencia).
- **Link de Video del Proyecto:** Espacio asignado con recuadro formal en el documento oficial.

---

## VII. REFERENCIAS BIBLIOGRÁFICAS (APA 7ma edición)
- Espressif Systems. (2024). *ESP32 Series Datasheet (v4.4)*. https://www.espressif.com/
- InvenSense Inc. (2013). *MPU-6000 and MPU-6050 Product Specification (Revision 3.4)*. https://invensense.tdk.com/
- Journal of Advancement in Electronics Design. (2026). Design and Development of a Smart Sign Language Recognition Glove Using ESP32. *Journal of Advancement in Electronics Design*, 9(2), 5–8. https://doi.org/10.5281/zenodo.19481391
- Maharjan, S., Shrestha, S., & Fernando, S. (2024). Sign Language Detection and Translation Using Smart Glove. In *Innovative Computing and Communications* (LNNS, Vol. 1021, pp. 451–464). Springer. https://doi.org/10.1007/978-981-97-3591-4_41
- Shahid, M. U., Mahessar, M. M., Salaar, M., Bin Amir, H., & Mehboob, M. Z. (2024). IoT-Enabled Assistive Glove for Real-Time Sign Language Translation Using Machine Learning. *ResearchGate Preprint*. https://www.researchgate.net/publication/395841894
- Spectra Symbol. (2021). *Flex Sensor 2.2" Technical Specification*. https://www.spectrasymbol.com/
- Telegram FZ-LLC. (2024). *Telegram Bot API Documentation*. https://core.telegram.org/bots/api
- W3C Web Bluetooth Community Group. (2023). *Web Bluetooth Specification*. https://webbluetoothcg.github.io/web-bluetooth/
