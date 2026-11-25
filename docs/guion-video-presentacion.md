# GUION TÉCNICO INDIVIDUAL (5 MINUTOS EXACTOS) · PROYECTO KLAPS

**Expositora:** Johana Carolina Quispe Ruiz (N00424907)  
**Curso:** Arquitectura del Computador (2026-2)  
**Institución:** Universidad Privada del Norte (UPN) — Facultad de Ingeniería  
**Docente:** Mg. Gustavo Paz Purizaca  
**Equipo de Proyecto (Mención en carátula):**
1. Camila Nadine Montalvo Abrego (N00421639)
2. Johana Carolina Quispe Ruiz (N00424907)
3. Leoneld Mathias Sotelo Espinoza (N00421604)
4. Joselyn Ivana Tananta Arevalo (N00433768)

**Documento Oficial en tu Google Drive:**  
📄 **[https://docs.google.com/document/d/1oPu8LAQgZYlpqRQtIlBnmMNW6Q8x-SfX3i5EBNcv7OM/edit?usp=drivesdk](https://docs.google.com/document/d/1oPu8LAQgZYlpqRQtIlBnmMNW6Q8x-SfX3i5EBNcv7OM/edit?usp=drivesdk)**

**Aplicación Web Desplegada en Vercel (HTTPS para Android con Web Bluetooth):**  
🔗 **[https://klaps-ebon.vercel.app](https://klaps-ebon.vercel.app)**

---

## 📌 Claves para que no hables mucho y alcances los 5 minutos

- **Duración calculada:** Exactamente **5:05 minutos** (cumples el límite mínimo de 5 minutos sin excederte).
- **Poco texto:** Solo dices frases concisas con los términos técnicos que el profesor califica.
- **Rellenar el tiempo con acción:** El grueso del tiempo se llena con la **demostración práctica**: conectando el guante por Bluetooth desde el celular, haciendo la calibración de 3 segundos, ejecutando las vocales (A, E, I, O, U) de forma calmada para que el altavoz del celular hable solo, y probando la alarma SOS.

---

## ⏱️ Cronograma Resumido

| Minuto | Sección | Qué haces |
| :--- | :--- | :--- |
| **00:00 – 00:45** (45s) | **Introducción** | Te presentas y explicas el problema en 3 oraciones. |
| **00:45 – 01:45** (60s) | **Hardware** | Muestras el guante y señalas el ESP32, los sensores en ADC1 y el MPU-6050. |
| **01:45 – 02:45** (60s) | **Funcionamiento** | Explicas la trama de 34 bytes a 20 Hz, Vercel con HTTPS y el KNN en el navegador. |
| **02:45 – 04:30** (1m 45s) | **Demostración en Vivo** | Conectas el guante al celular por Web Bluetooth, calibras y haces las señas. |
| **04:30 – 05:05** (35s) | **Métricas y Cierre** | Mencionas latencia de 34.3 ms, 94% de precisión y te despides formalmente. |

---

## 🎙️ Guion Paso a Paso

### 1. INTRODUCCIÓN (00:00 – 00:45 · 45 segundos)
*(Cámara enfocándote a ti frente a la mesa con el guante físico y tu celular).*

> *"Buenas tardes, profesor Gustavo Paz. Mi nombre es Johana Quispe, estudiante de Ingeniería de Sistemas Computacionales en la Universidad Privada del Norte. En representación de mi grupo, presento nuestro proyecto final del curso de Arquitectura del Computador: **KLAPS**, un sistema inteligente de comunicación asistida mediante guantes instrumentados.*
> 
> *En el Perú existen más de 500,000 personas con discapacidad auditiva y del habla, pero muy pocos oyentes conocen la lengua de señas. Para resolver esta brecha creamos KLAPS, un dispositivo portable y accesible que captura los movimientos de la mano y los traduce en tiempo real a texto y audio en cualquier celular mediante la Web Bluetooth API, sin necesidad de instalar ninguna aplicación."*

---

### 2. COMPONENTES DE HARDWARE (00:45 – 01:45 · 60 segundos)
*(Cámara con plano cercano al guante físico. Señalas los componentes mientras los describes).*

> *"En cuanto a la arquitectura física del hardware, el sistema cuenta con tres componentes fundamentales:*
> 
> *1. El microcontrolador **ESP32 DevKit V1**, con arquitectura Xtensa Dual-Core de 32 bits a 240 MHz. Aprovechamos su doble núcleo para desacoplar tareas: el Core 0 se encarga de la radiofrecuencia Bluetooth Low Energy, mientras que el Core 1 gestiona el muestreo de los sensores.*
> 
> *2. Cinco **sensores de flexión resistivos de 2.2 pulgadas** acoplados en divisores de tensión de 10 kΩ. Un criterio arquitectural indispensable fue conectar todos los sensores analógicos exclusivamente a los canales del conversor **ADC1** (en los pines 36, 39, 34, 35 y 32), ya que el ADC2 se deshabilita por hardware cuando se activa la radio Bluetooth.*
> 
> *3. Una unidad inercial **MPU-6050 de 6 grados de libertad** en el dorso de la mano, conectada por bus **I²C a 400 kHz** en los pines 21 y 22, permitiendo leer aceleración y velocidad angular para reconocer la orientación de la mano."*

---

### 3. FUNCIONAMIENTO Y ARQUITECTURA LÓGICA (01:45 – 02:45 · 60 segundos)
*(Muestras la pantalla del celular con la app o el esquema general).*

> *"Para maximizar la autonomía y la velocidad, diseñamos una arquitectura distribuida:*
> 
> *El microcontrolador no ejecuta redes neuronales pesadas. Su función es muestrear a **20 Hz** y empaquetar los datos crudos en una trama binaria compacta Little-Endian de exactamente **34 bytes**: 10 bytes para la flexión de los dedos y 24 bytes para aceleración y giroscopio. Esta trama se transmite por Bluetooth Low Energy bajo un perfil GATT personalizado, consumiendo menos de 20 miliamperios.*
> 
> *La inferencia se delega completamente al navegador cliente dentro de una Progressive Web App desarrollada en React y desplegada en Vercel bajo HTTPS. La app recibe la trama por Web Bluetooth y ejecuta un clasificador **KNN en JavaScript** que compara las lecturas con vectores canónicos ponderados y una ventana de estabilidad de 600 milisegundos, incorporando cinemática asistida para una respuesta natural de la mano."*

---

### 4. DEMOSTRACIÓN EN VIVO (02:45 – 04:30 · 1 minuto 45 segundos)
*(Te colocas el guante en la mano. Tu celular está al lado mostrando `https://klaps-ebon.vercel.app/traduccion`. En esta sección hablas poco; las acciones y el audio del celular llenan el tiempo).*

1. **Enlace Bluetooth (02:45 – 03:10):**
   - Dices: *"Ahora procedo con la demostración en vivo conectando el guante directamente a mi celular."*
   - Tocas **«Conectar Guante»** en el celular. Se abre el selector nativo de Chrome.
   - Dices: *"Selecciono `KLAPS_Guante_D` y pulso Vincular."*
   - Muestras la pantalla del teléfono: el indicador cambia a verde **«Conectado»** y las barras de los 5 dedos reaccionan en vivo.

2. **Calibración Rápida (03:10 – 03:30):**
   - Dices: *"Ejecuto la calibración rápida de 3 segundos."*
   - Tocas **«Calibrar»**. Mantienes la mano abierta y relajada durante el conteo regresivo de 3 segundos, y luego cierras el puño.
   - Dices: *"Listo, los sensores quedan normalizados a mi mano."*

3. **Traducción de Señas / Vocales (03:30 – 04:05):**
   *(Ejecutas cada seña de forma pausada manteniéndola 2 o 3 segundos para que el celular hable en voz alta)*:
   - **Seña 'A'** (puño cerrado con pulgar al lado): La pantalla detecta 'A'. El celular pronuncia: *"A"*.
     Dices: *"Reconoce la letra A y la sintetiza por voz."*
   - **Seña 'E'** (dedos doblados sobre el pulgar): La pantalla marca 'E'. El celular pronuncia: *"E"*.
   - **Seña 'I'** (meñique levantado, resto cerrado): La pantalla marca 'I'. El celular pronuncia: *"I"*.
   - **Seña 'O'** (mano en círculo): La pantalla marca 'O'. El celular pronuncia: *"O"*.
   - **Seña 'U'** (índice y medio juntos levantados): La pantalla marca 'U'. El celular pronuncia: *"U"*.
   - Dices: *"Como se observa, los 5 dedos responden con total fluidez y la síntesis de voz se produce en tiempo real."*

4. **Canal de Auxilio SOS (04:05 – 04:30):**
   - Agitas la mano con energía o activas la alerta en la pantalla.
   - Dices: *"KLAPS cuenta además con un canal de auxilio SOS. Al detectar un patrón de emergencia, inicia una cuenta atrás de seguridad de 10 segundos para despachar las coordenadas GPS exactas a un contacto por Telegram."*
   - Tocas la pantalla para cancelar la cuenta atrás y mostrar el control de seguridad.

---

### 5. MÉTRICAS DE RENDIMIENTO Y CIERRE (04:30 – 05:05 · 35 segundos)
*(Cámara enfocándote a ti con el guante en mano).*

> *"En las pruebas experimentales logramos una latencia total de extremo a extremo de solo **34.3 milisegundos**, muy por debajo de los 100 milisegundos necesarios para una conversación fluida, y una exactitud superior al **94%**.*
> 
> *KLAPS demuestra que combinando hardware accesible como el ESP32, comunicación BLE eficiente y computación en el cliente web, podemos democratizar la inclusión de la comunidad sorda.*
> 
> *Agradezco al profesor Gustavo Paz por sus enseñanzas durante este ciclo. Muchas gracias."*

*(FIN DEL VIDEO · Duración exacta: ~5 minutos y 05 segundos).*
