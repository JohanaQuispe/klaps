# Etapa 5 · Modo real: fuera la demostración

## Qué cambió

El modo demostración de los guantes se ha retirado. La aplicación ya no fabrica batería, RSSI ni
sincronizaciones: todo lo que muestran las tarjetas procede de la conexión Bluetooth LE real.

| Antes | Ahora |
| --- | --- |
| `services/bluetooth/mockGuards.js` inventaba batería y RSSI cada 3 s | **Eliminado**. `services/bluetooth/gloveState.js` solo define estados y formatea valores reales |
| `DeviceProvider` con `mode: 'demo'` y temporizadores | Una sesión BLE por guante (`useBleDevice`), con `connect` / `disconnect` |
| Etiquetas «Modo demostración» en panel, barra lateral y guantes | Estado real: «0 de 2 conectados», «Conectado», «Sin lectura» |
| Botón «Bluetooth» solo informativo | Botón **Conectar** que abre el selector del navegador |
| Batería y RSSI siempre presentes | Batería solo si el guante publica `0x180F`; RSSI marcado «No disponible» (Web Bluetooth no lo expone) |

## Regla de honestidad que se mantiene

> Si el dispositivo no publica el dato, la interfaz escribe **«sin lectura»** y nunca un número
> inventado.

Se aplica a la batería, al modelo, al firmware y a la última sincronización. El SOS sigue sin
simular envíos.

## Archivos tocados

| Archivo | Papel |
| --- | --- |
| `src/services/bluetooth/gloveState.js` | Estados, metadatos y formato de batería/señal sin simulación |
| `src/context/DeviceProvider.jsx` | Dos sesiones BLE reales y la API que consumen las pantallas |
| `src/components/devices/DeviceCard.jsx` | Tarjetas con datos reales y textos «sin lectura» |
| `src/pages/Devices/Devices.jsx` | Aviso de conexión real, sin banner de demostración |
| `src/pages/Dashboard/Dashboard.jsx` | Contador de guantes conectados real |
| `src/components/layout/Sidebar.jsx` | Estado real en la barra lateral |
| `src/pages/Settings/Settings.jsx` | «Conexión real (BLE)» en lugar del modo actual |
| `src/pages/Welcome/Welcome.jsx` | Texto de bienvenida actualizado |
| `src/pages/Translation/Translation.jsx` | La secuencia pasa a llamarse «secuencia de prueba» |
| `src/components/common/StatusBadge.jsx` | Se retira el estado `demo` |

## Cómo probarlo

1. `http://localhost:5173/dispositivos` en Chrome o Edge (contexto seguro).
2. Enciende el ESP32. Debe anunciarse como `KLAPS_Guante_D` (derecho) o `KLAPS_Guante_I`
   (izquierdo).
3. Pulsa **Conectar** en la tarjeta → elige tu placa en el selector del navegador.
4. Resultado esperado:
   - Estado **Conectado**, con el nombre BLE real bajo el título.
   - **Batería**: porcentaje si el firmware publica `0x180F`; si no, «Sin lectura de batería».
   - **RSSI**: «No disponible» (limitación de Web Bluetooth).
   - **Última sincronización**: el instante de la conexión y de cada notificación recibida.
5. Pulsa **Desconectar** y comprueba que el estado vuelve a «Desconectado» sin conservar lecturas.

## Qué queda pendiente para leer los sensores

1. Conecta la placa en `/dispositivos/diagnostico` y pulsa **Copiar UUID**.
2. Rellena en `src/services/bluetooth/bleConfig.js`:

```js
UUID: {
  service: '0000abcd-0000-1000-8000-00805f9b34fb',
  sensors: '0000abce-0000-1000-8000-00805f9b34fb',
  gesture: null,
}
```

3. Con eso `isGloveProtocolConfigured()` devuelve `true` y el siguiente paso es suscribirse a la
   característica de sensores y decodificar la trama (formato a definir con el firmware).

## Verificación de esta entrega

- `npm run lint` → 0 warnings, 0 errores (58 archivos)
- `npm run build` → OK
- Render SSR: `/dispositivos` muestra «Conexión real, sin datos simulados», «Sin lectura de
  batería» y «No disponible»; `/inicio` muestra «0 de 2 guantes conectados por Bluetooth LE»;
  `/ajustes` muestra «Conexión real (BLE)». La cadena «Modo demostración» ya no aparece en esas
  pantallas.
