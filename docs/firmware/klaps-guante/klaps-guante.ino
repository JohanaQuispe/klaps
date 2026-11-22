/*
 * ==============================================================================
 * KLAPS · Firmware Oficial para Guante Instrumentado (ESP32 BLE GATT)
 * ==============================================================================
 * Proyecto: KLAPS · Comunicación sin barreras (Arquitectura del Computador)
 * Plataforma: ESP32 DevKit V1 (ESP-WROOM-32)
 * Entorno: Arduino IDE 2.x con core "esp32 by Espressif Systems"
 *
 * Características:
 *  - Anuncio BLE como "KLAPS_Guante_D" (derecho) o "KLAPS_Guante_I" (izquierdo).
 *  - Servicio GATT: 6e400001-b5a3-f393-e0a9-e50e24dcca9e
 *  - Característica de sensores: 6e400002-b5a3-f393-e0a9-e50e24dcca9e (NOTIFY a 20 Hz)
 *  - Trama binaria exacta de 34 bytes Little-Endian (compatible con sensorFrame.js):
 *      Bytes  0 -  9: 5 × int16_t  -> Flex en % (0-100 %, 0 = recto, 100 = doblado)
 *      Bytes 10 - 21: 3 × float32  -> MPU-6050 ax, ay, az en m/s² (±2 g)
 *      Bytes 22 - 33: 3 × float32  -> MPU-6050 gx, gy, gz en rad/s (±250 °/s)
 *  - Divisor de flex: 3.3V -> Flex -> Pin ADC -> 47 kΩ -> GND.
 *      Al doblar el dedo, la resistencia sube y el voltaje en el pin BAJA.
 *      El firmware invierte la lectura analógica para que el % SUBA al doblar.
 *  - IMU MPU-6050 por I2C directo (SDA 21, SCL 22, 0x68).
 *      Con la palma hacia abajo, az debe ser ≈ -9.8 m/s² (regla isRestHand de KLAPS).
 *  - Monitor Serie a 115200 baudios con reporte de flex y aviso de sensores en 0.
 *  - NO publica servicio de batería (no hay medición real).
 * ==============================================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ==============================================================================
// 1. CONFIGURACIÓN DE LA MANO (SELECCIONA D O I ANTES DE SUBIR A CADA PLACA)
// ==============================================================================
// Descomenta SOLO UNA de las siguientes dos líneas según el guante físico:
#define HAND_RIGHT  // Guante DERECHO -> Anuncia como "KLAPS_Guante_D"
// #define HAND_LEFT // Guante IZQUIERDO -> Anuncia como "KLAPS_Guante_I"

#if defined(HAND_RIGHT)
  #define DEVICE_NAME "KLAPS_Guante_D"
  #define HAND_LABEL  "DERECHO"
#elif defined(HAND_LEFT)
  #define DEVICE_NAME "KLAPS_Guante_I"
  #define HAND_LABEL  "IZQUIERDO"
#else
  #error "Debes definir HAND_RIGHT o HAND_LEFT antes de compilar."
#endif

// ==============================================================================
// 2. UUIDS DEL SERVICIO Y CARACTERÍSTICA GATT (OFICIALES DE KLAPS)
// ==============================================================================
#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define SENSORS_CHAR_UUID   "6e400002-b5a3-f393-e0a9-e50e24dcca9e"

// ==============================================================================
// 3. ASIGNACIÓN DE PINES (EXCLUSIVAMENTE ADC1 PARA EVITAR CONFLICTO CON BLE)
// ==============================================================================
// ADC1 en ESP32: GPIO 32-39. Inmune a interferencias con el módem Bluetooth.
const int PIN_FLEX[5] = {
  36,  // Pulgar  (SENSOR_VP / GPIO36)
  39,  // Índice  (SENSOR_VN / GPIO39)
  34,  // Medio   (GPIO34)
  35,  // Anular  (GPIO35)
  32   // Meñique (GPIO32)
};

const char* FLEX_NAMES[5] = { "Pulgar", "Índice", "Medio", "Anular", "Meñique" };

// Pines I2C para MPU-6050
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define MPU6050_ADDR 0x68

// ==============================================================================
// 4. CALIBRACIÓN DE LOS SENSORES DE FLEXIÓN
// ==============================================================================
// El circuito es un divisor: 3.3V -> Flex -> Pin -> 47 kΩ -> GND
// - Dedo recto (R_flex baja ~25 kΩ)  -> Tensión alta en el pin (ADC mayor ~2200-2800)
// - Dedo doblado (R_flex alta ~80 kΩ) -> Tensión baja en el pin (ADC menor ~900-1500)
//
// Al doblar, la lectura ADC disminuye. El firmware mapea inversamente:
// ADC_STRAIGHT -> 0 %
// ADC_BENT     -> 100 %
// Puedes afinar estos extremos según las tolerancias físicas de tus sensores:
const int ADC_STRAIGHT[5] = { 2600, 2600, 2600, 2600, 2600 }; // Dedo recto (0 %)
const int ADC_BENT[5]     = { 1200, 1200, 1200, 1200, 1200 }; // Dedo doblado (100 %)

// Umbral mínimo de tensión para detectar si el sensor está físicamente conectado
const int ADC_DISCONNECTED_THRESHOLD = 25; // Si marca <= 25 cuentas, pin a GND o roto

// Invertir signo de az para cumplir con la regla física isRestHand de KLAPS:
// Cuando la mano está con la palma hacia abajo sobre una mesa (dorso hacia arriba),
// el sensor en el dorso apunta su eje +Z hacia arriba, midiendo +9.8 m/s² contra la gravedad.
// La app KLAPS espera az ≈ -9.8 m/s² con la palma hacia abajo; por tanto invertimos el signo.
#define INVERT_AZ true

// ==============================================================================
// 5. ESTRUCTURA DE LA TRAMA BINARIA (34 BYTES LITTLE-ENDIAN)
// ==============================================================================
struct __attribute__((packed)) SensorFrame {
  int16_t flex[5]; // Bytes  0 -  9: 5 sensores flex (0-100 %, little-endian)
  float ax;        // Bytes 10 - 13: Aceleración X en m/s²
  float ay;        // Bytes 14 - 17: Aceleración Y en m/s²
  float az;        // Bytes 18 - 21: Aceleración Z en m/s²
  float gx;        // Bytes 22 - 25: Giroscopio X en rad/s
  float gy;        // Bytes 26 - 29: Giroscopio Y en rad/s
  float gz;        // Bytes 30 - 33: Giroscopio Z en rad/s
};

// ==============================================================================
// 6. VARIABLES GLOBALES
// ==============================================================================
BLEServer *pServer = nullptr;
BLECharacteristic *pSensorsChar = nullptr;
bool deviceConnected = false;
bool mpuAvailable = false;

SensorFrame currentFrame;
int rawFlexADC[5] = {0, 0, 0, 0, 0}; // Lecturas crudas del ADC (0-4095) para diagnóstico
unsigned long lastSampleTime = 0;
unsigned long lastSerialPrintTime = 0;
const unsigned long SAMPLE_INTERVAL_MS = 50; // 20 Hz = 1 muestra cada 50 ms

// ==============================================================================
// 7. CALLBACKS DE CONEXIÓN BLE
// ==============================================================================
class BleServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println();
    Serial.println("==================================================");
    Serial.printf(">>> CENTRAL BLE CONECTADO A %s <<<\n", DEVICE_NAME);
    Serial.println("Transmitiendo flujo de sensores a 20 Hz...");
    Serial.println("==================================================");
  }

  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    Serial.println();
    Serial.println("==================================================");
    Serial.printf(">>> CENTRAL BLE DESCONECTADO DE %s <<<\n", DEVICE_NAME);
    Serial.println("Reiniciando anuncio BLE para permitir reconexión...");
    Serial.println("==================================================");
    // Reiniciar anuncio inmediatamente para que el usuario pueda reconectar
    BLEDevice::startAdvertising();
  }
};

// ==============================================================================
// 8. FUNCIONES AUXILIARES PARA EL MPU-6050
// ==============================================================================
bool initMPU6050() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // Registro PWR_MGMT_1
  Wire.write(0x00); // Despertar el MPU-6050 (quitar bit de sleep)
  if (Wire.endTransmission() != 0) {
    return false;
  }

  delay(20);

  // Configurar acelerómetro a ±2 g (registro 0x1C = 0x00) -> 16384 LSB/g
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x1C);
  Wire.write(0x00);
  Wire.endTransmission();

  // Configurar giroscopio a ±250 °/s (registro 0x1B = 0x00) -> 131.0 LSB/(°/s)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x1B);
  Wire.write(0x00);
  Wire.endTransmission();

  return true;
}

void readMPU6050(float &ax, float &ay, float &az, float &gx, float &gy, float &gz) {
  if (!mpuAvailable) {
    ax = ay = az = gx = gy = gz = 0.0f;
    return;
  }

  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B); // Registro inicial ACCEL_XOUT_H
  if (Wire.endTransmission(false) != 0) {
    mpuAvailable = false;
    ax = ay = az = gx = gy = gz = 0.0f;
    return;
  }

  // Solicitar 14 registros: 6 bytes accel, 2 bytes temp, 6 bytes gyro
  const uint8_t bytesReceived = Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true);
  if (bytesReceived < 14) {
    ax = ay = az = gx = gy = gz = 0.0f;
    return;
  }

  int16_t rawAx = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawAy = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawAz = (int16_t)((Wire.read() << 8) | Wire.read());
  (void)((Wire.read() << 8) | Wire.read()); // Temperatura (omitida)
  int16_t rawGx = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawGy = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawGz = (int16_t)((Wire.read() << 8) | Wire.read());

  // Conversión a unidades estándar:
  // Acelerómetro ±2 g: 1 g = 9.80665 m/s² -> raw / 16384.0 * 9.80665
  const float ACCEL_SCALE = 9.80665f / 16384.0f;
  ax = (float)rawAx * ACCEL_SCALE;
  ay = (float)rawAy * ACCEL_SCALE;

  #if INVERT_AZ
    az = -((float)rawAz * ACCEL_SCALE);
  #else
    az = (float)rawAz * ACCEL_SCALE;
  #endif

  // Giroscopio ±250 °/s: 1 °/s = (pi / 180) rad/s -> raw / 131.0 * (pi / 180)
  const float GYRO_SCALE = (3.1415926535f / 180.0f) / 131.0f;
  gx = (float)rawGx * GYRO_SCALE;
  gy = (float)rawGy * GYRO_SCALE;
  gz = (float)rawGz * GYRO_SCALE;
}

// ==============================================================================
// 9. LECTURA Y CONVERSIÓN DE SENSORES DE FLEXIÓN (DIVISOR 47 kΩ)
// ==============================================================================
int16_t readFlex(int index) {
  const int pin = PIN_FLEX[index];

  // Filtro de promedio móvil de 4 muestras rápidas para suprimir ruido de alta frecuencia
  long sum = 0;
  for (int i = 0; i < 4; i++) {
    sum += analogRead(pin);
    delayMicroseconds(60);
  }
  const int raw = (int)(sum / 4);
  rawFlexADC[index] = raw;

  // Si el pin marca cerca de 0, el sensor está desconectado o el circuito abierto
  if (raw <= ADC_DISCONNECTED_THRESHOLD) {
    return 0;
  }

  // Como el voltaje BAJA al doblar:
  // - raw cercano a ADC_STRAIGHT -> 0 % (dedo recto)
  // - raw cercano a ADC_BENT     -> 100 % (dedo doblado)
  const int straight = ADC_STRAIGHT[index];
  const int bent = ADC_BENT[index];

  int percent = map(raw, straight, bent, 0, 100);
  return (int16_t)constrain(percent, 0, 100);
}

// ==============================================================================
// 10. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("==================================================");
  Serial.println("  KLAPS · Firmware Oficial del Guante Inteligente ");
  Serial.println("  Comunicación sin barreras · Arquitectura UPN    ");
  Serial.println("==================================================");
  Serial.printf("Configuración de mano : %s\n", HAND_LABEL);
  Serial.printf("Nombre anunciado BLE  : %s\n", DEVICE_NAME);
  Serial.printf("Frecuencia de muestreo: 20 Hz (T = %lu ms)\n", SAMPLE_INTERVAL_MS);
  Serial.printf("Tamaño de trama       : %d bytes (Little-Endian)\n", sizeof(SensorFrame));
  Serial.println("==================================================");

  // 10.1 Configuración de los pines analógicos ADC1 (12 bits: 0-4095)
  analogReadResolution(12);
  for (int i = 0; i < 5; i++) {
    pinMode(PIN_FLEX[i], INPUT);
    analogSetPinAttenuation(PIN_FLEX[i], ADC_11db); // Rango de entrada ~0 V a ~3.3 V
    Serial.printf("Pin Flex [%d - %s]: GPIO %d (ADC1)\n", i, FLEX_NAMES[i], PIN_FLEX[i]);
  }

  // 10.2 Inicialización del bus I2C para el sensor MPU-6050
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(400000); // 400 kHz (Fast Mode)

  mpuAvailable = initMPU6050();
  if (mpuAvailable) {
    Serial.println("✅ Sensor MPU-6050 inicializado correctamente (0x68).");
    #if INVERT_AZ
      Serial.println("   Regla física: az invertido (palma hacia abajo ≈ -9.8 m/s²).");
    #endif
  } else {
    Serial.println("⚠️  ATENCIÓN: No se detectó el MPU-6050 en 0x68 (SDA 21, SCL 22).");
    Serial.println("   Los valores inerciales se enviarán en 0 hasta que se conecte.");
  }

  // 10.3 Inicialización del stack Bluetooth Low Energy (GATT)
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BleServerCallbacks());

  // Crear servicio propio de sensores KLAPS
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Crear característica de sensores con lectura y notificaciones
  pSensorsChar = pService->createCharacteristic(
      SENSORS_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );

  // Descriptor 2902 obligatorio para habilitar notificaciones hacia el cliente
  pSensorsChar->addDescriptor(new BLE2902());

  // Cargar una primera trama vacía
  memset(&currentFrame, 0, sizeof(currentFrame));
  pSensorsChar->setValue((uint8_t*)&currentFrame, sizeof(currentFrame));

  // Iniciar servicio
  pService->start();

  // Configurar y arrancar anuncios BLE
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Parámetro para buena detección en iOS/Android
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("✅ Pila BLE GATT inicializada.");
  Serial.printf("   Anunciando como \"%s\"...\n", DEVICE_NAME);
  Serial.println("   Listo para conectar desde https:// o http://localhost:5173");
  Serial.println("==================================================");
}

// ==============================================================================
// 11. BUCLE PRINCIPAL (LOOP A 20 HZ DETERMINÍSTICO)
// ==============================================================================
void loop() {
  const unsigned long currentMillis = millis();

  // Bucle periódico estricto a 20 Hz (cada 50 ms)
  if (currentMillis - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = currentMillis;

    // 11.1 Lectura de los 5 sensores de flexión (0-100 %)
    for (int i = 0; i < 5; i++) {
      currentFrame.flex[i] = readFlex(i);
    }

    // 11.2 Lectura de la IMU MPU-6050 (m/s² y rad/s)
    // Se usan variables locales para evitar el error de referencia en estructuras empaquetadas (packed)
    float ax = 0.0f, ay = 0.0f, az = 0.0f;
    float gx = 0.0f, gy = 0.0f, gz = 0.0f;
    readMPU6050(ax, ay, az, gx, gy, gz);
    currentFrame.ax = ax;
    currentFrame.ay = ay;
    currentFrame.az = az;
    currentFrame.gx = gx;
    currentFrame.gy = gy;
    currentFrame.gz = gz;

    // 11.3 Publicar la trama si hay un cliente conectado
    if (deviceConnected && pSensorsChar != nullptr) {
      pSensorsChar->setValue((uint8_t*)&currentFrame, sizeof(currentFrame));
      pSensorsChar->notify();
    }

    // 11.4 Diagnóstico por Serial a 115200 baudios (cada 1000 ms para no saturar consola)
    if (currentMillis - lastSerialPrintTime >= 1000) {
      lastSerialPrintTime = currentMillis;

      Serial.printf("[%s] Flex %% [P:%3d, I:%3d, M:%3d, A:%3d, m:%3d] | Raw ADC [P:%4d, I:%4d, M:%4d, A:%4d, m:%4d] | IMU: az=%5.1f m/s² | BLE: %s\n",
        DEVICE_NAME,
        currentFrame.flex[0], currentFrame.flex[1], currentFrame.flex[2], currentFrame.flex[3], currentFrame.flex[4],
        rawFlexADC[0], rawFlexADC[1], rawFlexADC[2], rawFlexADC[3], rawFlexADC[4],
        currentFrame.az,
        deviceConnected ? "CONECTADO" : "ANUNCIANDO"
      );

      // Verificación de cables / sensores desconectados (solo si Raw ADC <= umbral)
      if (rawFlexADC[3] <= ADC_DISCONNECTED_THRESHOLD) {
        // En prototipo con flex casero en anular, se informa sin emitir alarma de fallo general
        Serial.println("ℹ️  INFO: Anular (GPIO 35) en Raw 0 (flex casero inactivo). App web KLAPS operando con tolerancia.");
      }
      for (int i = 0; i < 5; i++) {
        if (i != 3 && rawFlexADC[i] <= ADC_DISCONNECTED_THRESHOLD) {
          Serial.printf("⚠️  AVISO DE HARDWARE: Sensor flex %d (GPIO %d) desconectado o en corto (Raw=%d).\n",
            i, PIN_FLEX[i], rawFlexADC[i]);
        }
      }

      if (!mpuAvailable) {
        // Intento de reconexión en caliente del MPU-6050 si se conecta después de arrancar
        mpuAvailable = initMPU6050();
        if (mpuAvailable) {
          Serial.println("✅ Sensor MPU-6050 reconectado con éxito.");
        }
      }
    }
  }
}
