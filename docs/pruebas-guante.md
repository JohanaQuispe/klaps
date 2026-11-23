# Protocolo de Pruebas del Guante Real KLAPS

Guía paso a paso para validar el funcionamiento del guante instrumentado físico (ESP32 DevKit V1)
con la aplicación web KLAPS mediante Bluetooth Low Energy (BLE), calibración anatómica guiada,
entrenamiento de gestos con el clasificador KNN y medición de exactitud en 10 intentos por seña.

---

## 1. Requisitos Previos

- **Hardware:**
  - Guante instrumentado KLAPS con ESP32, 5 sensores de flexión (GPIO 36, 39, 34, 35, 32) e IMU MPU-6050 (SDA 21, SCL 22).
  - Cable micro-USB para alimentación y programación del ESP32.
  - PC o laptop con Bluetooth integrado y navegador **Google Chrome**, **Microsoft Edge** u **Opera**.
- **Software:**
  - Arduino IDE 2.x con el paquete de placas **esp32 by Espressif Systems** instalado.
  - Repositorio KLAPS ejecutándose en local (`npm run dev` en `http://localhost:5173`).

---

## 2. Fase 1 · Carga del Firmware y Verificación Serial

1. Abre el archivo oficial del firmware en Arduino IDE:
   ```
   docs/firmware/klaps-guante/klaps-guante.ino
   ```
2. En las primeras líneas del archivo, selecciona la mano del guante físico que vas a programar:
   ```cpp
   #define HAND_RIGHT  // Guante DERECHO -> Anuncia como "KLAPS_Guante_D"
   // #define HAND_LEFT // Guante IZQUIERDO -> Anuncia como "KLAPS_Guante_I"
   ```
3. Conecta el ESP32 por USB al computador.
4. En Arduino IDE, selecciona:
   - **Placa:** *ESP32 Dev Module* (o *DOIT ESP32 DEVKIT V1*).
   - **Puerto:** Tu puerto serie detectado (ej. `COM3` en Windows o `/dev/ttyUSB0` en Linux).
5. Pulsa **Subir** (Upload) y espera a que termine el flasheo.
6. Abre el **Monitor Serie** de Arduino IDE y configúralo a **115200 baudios**.
7. Presiona el botón físico **EN / RST** de la placa ESP32. Debes observar un arranque limpio:
   ```text
   ==================================================
     KLAPS · Firmware Oficial del Guante Inteligente 
     Comunicación sin barreras · Arquitectura UPN    
   ==================================================
   Configuración de mano : DERECHO
   Nombre anunciado BLE  : KLAPS_Guante_D
   Frecuencia de muestreo: 20 Hz (T = 50 ms)
   Tamaño de trama       : 34 bytes (Little-Endian)
   ==================================================
   ✅ Sensor MPU-6050 inicializado correctamente (0x68).
   ✅ Pila BLE GATT inicializada.
      Anunciando como "KLAPS_Guante_D"...
   ```
8. **Prueba de flexión en el Monitor Serie:**
   Cada segundo, el firmware imprimirá una línea de diagnóstico:
   ```text
   [KLAPS_Guante_D] Flex % [P:  5, I:  8, M:  4, A:  6, m:  5] | IMU: ax= 0.2 ay= 0.4 az=-9.7 m/s² | BLE: ANUNCIANDO
   ```
   - Dobla los dedos de la mano uno a uno: el porcentaje de cada dedo debe subir hacia 80–100 %.
   - Si algún sensor marca permanentemente `0 %`, el monitor serie imprimirá un aviso de advertencia. Revisa que el cable no esté flojo o el pin analógico desconectado.
   - Con la mano apoyada en la mesa con la palma hacia abajo, comprueba que $a_z \approx -9.8\text{ m/s}^2$.

---

## 3. Fase 2 · Diagnóstico y Enlace BLE en la Web (`/dispositivos/diagnostico`)

1. Con el ESP32 encendido, abre en Chrome:
   ```
   http://localhost:5173/dispositivos/diagnostico
   ```
2. En la sección de búsqueda Bluetooth, pulsa el botón **«Buscar por Bluetooth»**.
3. Se abrirá la ventana emergente nativa de Chrome:
   - Verás en la lista el dispositivo: **`KLAPS_Guante_D`** (o `KLAPS_Guante_I`).
   - Selecciónalo y pulsa **Vincular**.
4. **Verificación visual del protocolo:**
   - La tarjeta pasará a estado **Conectado (verde)**.
   - El monitor serial del ESP32 mostrará: `>>> CENTRAL BLE CONECTADO A KLAPS_Guante_D <<<`.
   - En la sección **«UUID del firmware del guante»**, verifica que los UUIDs coincidan con los oficiales:
     - Servicio: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
     - Sensores: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
5. **Comprobación de la trama en vivo:**
   - En **«Probar lectura de sensores»**, pulsa **«Escuchar sensores»**.
   - Verifica que el contador de paquetes aumente a una cadencia de **20 paquetes por segundo (20 Hz)**.
   - Comprueba que el tamaño de trama indique exactamente **34 bytes**.
   - Mueve la mano y dobla los dedos: los indicadores numéricos y barras de los 5 flex y los 6 ejes inerciales deben reaccionar con total fluidez.

---

## 4. Fase 3 · Calibración Guiada de la Mano (`/entrenamiento`)

La anatomía de cada usuario es diferente; la calibración guiada normaliza los sensores mecánicos
directamente en la memoria del navegador sin alterar el firmware.

1. Navega a **`/entrenamiento`** y selecciona la pestaña **«Calibración guiada»**.
2. **Paso 1: Postura Neutra / Mano en Reposo (captura de $f_{min}$ y orientación base):**
   - Apoya la mano relajada y completamente abierta sobre una superficie plana, con la **palma hacia abajo**.
   - Pulsa **«Iniciar calibración de reposo»**.
   - El sistema captura y promedia 40 fotogramas consecutivos (2 segundos).
   - Se guardan los valores mínimos de flexión de los 5 dedos y la línea base inercial ($a_z \approx -9.8\text{ m/s}^2$).
3. **Paso 2: Flexión Máxima / Puño Cerrado (captura de $f_{max}$):**
   - Cierra firmemente el puño con todos los dedos flexionados.
   - Pulsa **«Iniciar calibración de flexión»** y mantén el puño cerrado durante los 2 segundos de lectura.
   - Se guardan los topes máximos de curvatura de cada falange.
4. Pulsa **«Guardar y aplicar calibración»**.
   - La calibración queda guardada en `localStorage` bajo la clave `klaps.calibration.v1`.
   - A partir de este momento, con la mano abierta todos los dedos marcarán entre 0 y 5 %, y al cerrar el puño marcarán entre 90 y 100 %.

---

## 5. Fase 4 · Grabación y Entrenamiento de 3 Señas

Vamos a registrar en el clasificador KNN tres señas cotidianas representativas:

| Seña | Mensaje | Tipo de Seña | Descripción Gestual | Fotogramas |
| :--- | :--- | :--- | :--- | :--- |
| **Seña 1** | **«Sí»** | Estática | Puño cerrado con pulgar hacia arriba, mano quieta | 40 fotogramas (2 s) |
| **Seña 2** | **«Hola»** | Dinámica | Palma abierta mirando al frente con oscilación lateral | 80 fotogramas (4 s) |
| **Seña 3** | **«SOS / Auxilio»** | Emergencia | Puño cerrado con agitación enérgica vertical u horizontal | 80 fotogramas (4 s) |

### Procedimiento de Grabación para cada Seña:
1. En la pantalla **`/entrenamiento`**, ve a la sección **«Entrenar nueva seña»**.
2. Escribe el nombre de la seña (ej. `Sí`).
3. Elige la duración: **40 fotogramas** para señas estáticas o **80 fotogramas** para señas dinámicas con movimiento.
4. Presiona **«Iniciar grabación»**:
   - Una cuenta atrás de 3 segundos (3... 2... 1...) te da tiempo para adoptar la postura inicial.
   - Ejecuta la seña de forma natural mientras la barra de progreso se llena.
5. Al terminar, revisa el gráfico de la captura y pulsa **«Guardar muestra»**.
6. **Recomendación para alta precisión:** Graba 3 repeticiones de cada seña para que el clasificador KNN cuente con un clúster de referencia robusto ante ligeras variaciones de ángulo.

---

## 6. Fase 5 · Prueba de Precisión: 10 Intentos por Seña

Una vez entrenadas las 3 señas, se ejecuta la prueba formal de validación del sistema en tiempo real.

1. Dirígete a la pantalla principal de traducción: **`/traducir`**.
2. Pulsa el botón principal **«Iniciar detección»**.
3. Realiza **10 repeticiones independientes** de cada una de las 3 señas, volviendo a la postura de reposo entre cada intento.
4. **Criterios de acierto:**
   - **Reconocimiento:** El clasificador debe mostrar la seña correcta con una confianza calculada $\ge 85\%$ y sin ambigüedad con segundas candidatas.
   - **Estabilidad (Hold Time):** La predicción debe sostenerse de manera continua durante la ventana temporal de estabilización (1.3 s en modo Normal o 1.8 s en modo Preciso).
   - **Pausa entre señas (Cooldown):** Periodo de 1.8 s tras emitir para relajar la mano y evitar repeticiones accidentales o encadenamientos no deseados.
   - **Salida multimodal:** La palabra debe aparecer en la pantalla y reproducirse por los altavoces mediante la síntesis de voz (Web Speech API).

### Hoja de Registro de Pruebas (Plantilla para el Informe):

| Intento N° | Seña 1: «Sí» (Estática) | Seña 2: «Hola» (Dinámica) | Seña 3: «SOS / Auxilio» (Emergencia) |
| :---: | :---: | :---: | :---: |
| **1** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **2** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **3** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **4** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **5** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **6** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **7** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **8** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **9** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **10** | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo | [ ] Correcto / [ ] Fallo |
| **Total Aciertos** | **__ / 10** | **__ / 10** | **__ / 10** |
| **Exactitud (%)** | **__ %** | **__ %** | **__ %** |

**Resultado esperado:** Una exactitud promedio de **$\ge 90\%$** tras haber realizado la calibración guiada.

---

## 7. Fase 6 · Prueba del Canal de Emergencia SOS con Telegram

1. Navega a **`/emergencia`**.
2. Comprueba que se muestra tu código de vinculación (ej. `KLAPS-A1B2C`).
3. En el móvil del contacto de emergencia, abre Telegram y pulsa el enlace al bot oficial:
   `https://t.me/ai_klaps_bot?start=KLAPS-A1B2C`
4. Pulsa **Iniciar** (`/start`).
5. En la web de KLAPS, pulsa **«Verificar vinculación»**: debe confirmar que el contacto está vinculado con éxito.
6. Pulsa **«Enviar prueba»**:
   - El contacto de Telegram debe recibir un mensaje con tu nombre y un enlace directo a Google Maps con tus coordenadas GPS.
7. **Prueba de activación por seña física:**
   - En `/traducir`, agita la mano con puño cerrado enérgicamente durante 4 segundos (o repite la seña SOS 3 veces).
   - Observa cómo se activa la **pantalla roja de SOS con cuenta atrás de 10 segundos** y señal sonora.
   - Pulsa «Cancelar alerta» antes de que termine el temporizador: comprueba que el envío se cancela de inmediato sin despachar falsas alarmas.
   - Vuelve a activarla y déjala expirar: comprueba la entrega real de la alerta en Telegram.

---

## 8. Resumen de Solución de Fallos Frecuentes

| Síntoma | Causa Probable | Solución Inmediata |
| :--- | :--- | :--- |
| El selector de Chrome no se abre | Dirección insegura (`http://192.168.x.x`) | Abre la app en `http://localhost:5173` o usa un túnel HTTPS. |
| El ESP32 no aparece en la lista | Bluetooth apagado en Windows o nombre distinto | Activa el Bluetooth del PC. Verifica que el firmware anuncie como `KLAPS_Guante_D`. |
| La web conecta pero los datos no varían | Falta suscripción o característica errónea | Verifica en `/dispositivos/diagnostico` que la característica `6e400002-...` tenga `notify`. |
| Los 5 flex siempre marcan 0 % | Resistencia pull-down desconectada o pin de ADC2 | Conecta la resistencia de 47 kΩ a GND y verifica que los pines pertenezcan a ADC1 (GPIO 36, 39, 34, 35, 32). |
| $a_z$ marca +9.8 en vez de -9.8 con la palma abajo | Sensor orientado hacia arriba en el dorso | Mantén `#define INVERT_AZ true` en el archivo `klaps-guante.ino`. |
