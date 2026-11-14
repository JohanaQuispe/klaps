/*
 * KLAPS · prueba de radio BLE para ESP32
 * --------------------------------------
 * Objetivo: comprobar que la placa anuncia por Bluetooth LE (GATT) y que el
 * navegador puede conectarse a ella. NO lee sensores: envía un contador para
 * verificar que las notificaciones llegan.
 *
 * Cómo usarlo
 * 1. Arduino IDE → Herramientas → Placa → "ESP32 Dev Module" (o tu variante).
 * 2. Instala el core "esp32 by Espressif Systems" (Gestor de placas).
 * 3. Sube este sketch y abre el Monitor Serie a 115200 baudios.
 *    Debe imprimir: "Anunciando como KLAPS-TEST".
 * 4. En Chrome: chrome://bluetooth-internals → Start Scan → debe aparecer
 *    "KLAPS-TEST". Si aparece aquí, la radio está bien.
 * 5. En KLAPS (http://localhost:5173/dispositivos/diagnostico):
 *    elige "Cualquier dispositivo BLE (sin filtro de nombre)" → conectarás y
 *    verás el servicio 6e400001-… y la batería al 87 %.
 *
 * Si con este sketch la placa NO aparece en bluetooth-internals, el problema
 * es del hardware o de la placa elegida en el IDE, no del firmware de KLAPS.
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define DEVICE_NAME "KLAPS-TEST"

// Servicio propio de prueba (mismo formato que el propuesto en docs/ble-conexion.md)
#define SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define SENSORS_UUID "6e400002-b5a3-f393-e0a9-e50e24dcca9e"

// Servicio estándar de batería (lo que KLAPS intenta leer primero)
#define BATTERY_SERVICE_UUID "180F"
#define BATTERY_LEVEL_UUID "2A19"

BLECharacteristic *sensorsCharacteristic = nullptr;
BLECharacteristic *batteryCharacteristic = nullptr;

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println();
  Serial.println("KLAPS · prueba de BLE");

  BLEDevice::init(DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();

  BLEService *service = server->createService(SERVICE_UUID);
  sensorsCharacteristic = service->createCharacteristic(
      SENSORS_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  sensorsCharacteristic->addDescriptor(new BLE2902());
  service->start();

  BLEService *batteryService = server->createService(BATTERY_SERVICE_UUID);
  batteryCharacteristic = batteryService->createCharacteristic(
      BATTERY_LEVEL_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  batteryCharacteristic->addDescriptor(new BLE2902());
  batteryCharacteristic->setValue((uint8_t)87);
  batteryService->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->addServiceUUID(BATTERY_SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.print("Anunciando como ");
  Serial.println(DEVICE_NAME);
  Serial.println("Abre chrome://bluetooth-internals para comprobarlo.");
}

void loop() {
  // Contador de prueba: sirve para ver que las notificaciones llegan al navegador.
  static uint8_t counter = 0;
  sensorsCharacteristic->setValue(&counter, 1);
  sensorsCharacteristic->notify();
  Serial.printf("Notificación enviada: %u\n", counter);

  counter = (uint8_t)(counter + 1);
  delay(1000);
}
