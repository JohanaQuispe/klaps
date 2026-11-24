/*
 * ==============================================================================
 * KLAPS · Sketch de Diagnóstico y Calibración Rápida de Sensores
 * ==============================================================================
 * Este programa NO usa Bluetooth para que cargue instantáneamente y sea 100%
 * transparente. Muestra en el Monitor Serie (a 115200 baudios):
 *  1. La lectura cruda del ADC (0 - 4095) de cada uno de los 5 dedos.
 *  2. El voltaje real medido en cada pin (0.00 V - 3.30 V).
 *  3. Estado de conexión física (si el cable está suelto, a tierra o a 3.3V).
 *  4. El estado del sensor inercial MPU-6050 (I2C en pines 21 y 22).
 * ==============================================================================
 */

#include <Arduino.h>
#include <Wire.h>

// Pines ADC1 asignados a los sensores de flexión
const int PIN_FLEX[5] = {
  36,  // Pulgar  (GPIO36 / SENSOR_VP)
  39,  // Índice  (GPIO39 / SENSOR_VN)
  34,  // Medio   (GPIO34)
  35,  // Anular  (GPIO35)
  32   // Meñique (GPIO32)
};

const char* DEDO_NAMES[5] = {
  "PULGAR ",
  "INDICE ",
  "MEDIO  ",
  "ANULAR ",
  "MENIQUE"
};

#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define MPU6050_ADDR 0x68

bool mpuOk = false;

// Lectura con filtro de 16 muestras para eliminar ruido
int leerAdcPromedio(int pin) {
  long suma = 0;
  for (int i = 0; i < 16; i++) {
    suma += analogRead(pin);
    delayMicroseconds(50);
  }
  return (int)(suma / 16);
}

bool iniciarMPU() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // Registro PWR_MGMT_1
  Wire.write(0x00); // Despertar sensor
  return (Wire.endTransmission() == 0);
}

void leerAcelerometro(float &ax, float &ay, float &az) {
  if (!mpuOk) { ax = ay = az = 0.0f; return; }
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) { mpuOk = false; return; }

  if (Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)6, (uint8_t)true) == 6) {
    int16_t rawAx = (int16_t)((Wire.read() << 8) | Wire.read());
    int16_t rawAy = (int16_t)((Wire.read() << 8) | Wire.read());
    int16_t rawAz = (int16_t)((Wire.read() << 8) | Wire.read());
    ax = (float)rawAx * (9.80665f / 16384.0f);
    ay = (float)rawAy * (9.80665f / 16384.0f);
    az = (float)rawAz * (9.80665f / 16384.0f);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=================================================================");
  Serial.println("      KLAPS · DIAGNÓSTICO EN VIVO DE SENSORES Y VOLTAJES        ");
  Serial.println("=================================================================");
  Serial.println("Velocidad de consola: 115200 baudios");
  Serial.println("Resolución ADC      : 12 bits (0 a 4095 cuentas)");
  Serial.println("Atenuación ADC      : ADC_11db (Escala completa 0 V a ~3.3 V)");
  Serial.println("-----------------------------------------------------------------");

  // Configuración de pines analógicos
  analogReadResolution(12);
  for (int i = 0; i < 5; i++) {
    pinMode(PIN_FLEX[i], INPUT);
    analogSetPinAttenuation(PIN_FLEX[i], ADC_11db);
  }

  // Configuración I2C MPU-6050
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  mpuOk = iniciarMPU();

  if (mpuOk) {
    Serial.println("✅ MPU-6050 detectado correctamente en I2C (0x68).");
  } else {
    Serial.println("⚠️  MPU-6050 NO detectado (revisar pines 21 SDA y 22 SCL).");
  }
  Serial.println("=================================================================");
  Serial.println("INICIANDO LECTURA EN TIEMPO REAL (Actualización cada 400 ms)...");
  Serial.println();
}

void loop() {
  float ax = 0, ay = 0, az = 0;
  leerAcelerometro(ax, ay, az);

  Serial.println("-----------------------------------------------------------------");
  for (int i = 0; i < 5; i++) {
    int raw = leerAdcPromedio(PIN_FLEX[i]);
    float voltios = (raw / 4095.0f) * 3.3f;

    const char* estado;
    if (raw <= 30) {
      estado = "[ ⚠️  0 V - CABLE SUELTO O PIN A GND ]";
    } else if (raw >= 4060) {
      estado = "[ ⚠️  3.3V - CORTO DIRECTO A VCC ]";
    } else {
      estado = "[ ✅ ACTIVO - SENSOR DETECTADO ]";
    }

    Serial.printf("%s (GPIO %2d): Raw = %4d | Voltaje = %4.2f V  %s\n",
      DEDO_NAMES[i], PIN_FLEX[i], raw, voltios, estado
    );
  }

  // MPU-6050
  if (mpuOk) {
    Serial.printf("MPU-6050 (IMU)     : ax=%+5.1f m/s² | ay=%+5.1f m/s² | az=%+5.1f m/s²\n", ax, ay, az);
  } else {
    // Reintentar si se conectó en caliente
    mpuOk = iniciarMPU();
    Serial.println("MPU-6050 (IMU)     : [ No disponible en 0x68 ]");
  }

  delay(400);
}
