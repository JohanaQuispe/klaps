# Etapa 6 · Reconocimiento de señas en tiempo real (KNN)

Clasificador KNN en JavaScript puro que corre en el navegador, sin servidor y sin dependencias.
Convierte las tramas de los dos guantes en palabras y las suma a la frase.

## 1. Trama del firmware · 34 bytes

| Bytes | Tipo | Contenido |
| --- | --- | --- |
| 0-9 | `int16` little-endian ×5 | Sensores flex en porcentaje 0-100 |
| 10-33 | `float32` little-endian ×6 | MPU-6050: `ax, ay, az, gx, gy, gz` |

`src/services/bluetooth/sensorFrame.js` valida la longitud, recorta los flex a 0-100 y descarta
valores no finitos. Una trama de menos de 34 bytes se ignora (no se inventan ceros).

## 2. Vector de 22 dimensiones (bimanual)

```
KLAPS-D → [flex0..flex4, ax, ay, az, gx, gy, gz]
KLAPS-U → [flex0..flex4, ax, ay, az, gx, gy, gz]
vector  = 11 valores de D + 11 valores de U
```

- Flex: ya están en 0-100.
- Aceleración: `[-20, 20]` m/s² → `[0, 100]`.
- Giroscopio: `[-10, 10]` rad/s → `[0, 100]`.

Así ningún eje domina la distancia. Si un guante no está conectado, sus 11 posiciones son ceros:
el mismo clasificador sirve en modo unimanual.

## 3. Clasificación (KNN, K = 3)

`src/services/gesture/knnClassifier.js`

1. Distancia euclidiana contra **todas** las muestras guardadas.
2. Se toman los 3 vecinos más cercanos.
3. Voto ponderado por cercanía (`1 / (distancia + ε)`): un vecino próximo pesa más.
4. Confianza = **margen entre etiquetas** × **similitud absoluta** (ver etapa 7).

La similitud absoluta (`similarityFromDistance`) evita el falso positivo clásico del KNN: con una
sola muestra por seña, el reparto de votos daría 100 % aunque la postura no se pareciera en nada.
Se calcula como `1 − distancia / escala` con escala 50 (estáticas) y 70 (dinámicas).

| Situación | Confianza | ¿Se acepta? |
| --- | --- | --- |
| 3 vecinos de la misma seña, muy cerca | ≈ 1,00 | Sí |
| 2 de 3 vecinos | ≈ 0,67 | No (umbral 0,75) |
| Vecino único pero a distancia grande | baja | No |
| Sin muestras o vector vacío | — | No |

Desde la etapa 7 cada seña lleva **modo de mano** (`right`, `left`, `both`) y **tipo**
(`static`, `dynamic`): ver `docs/etapa-7-senas-dinamicas.md`.

## 4. Estabilización (anti-rebote)

`src/hooks/useGestureRecognition.js`, bucle a **20 Hz** (50 ms):

1. Clasifica cada lectura.
2. Si la confianza < **75 %**, se descarta y se reinicia el candidato.
3. Si la etiqueta cambia, se reinicia el cronómetro.
4. Solo se emite cuando la **misma seña se mantiene ≥ 600 ms** (señas estáticas).
5. Las **señas dinámicas** no esperan quietud: se emiten al completar el recorrido con ≥ 75 % de
   similitud (confirmación de 100 ms). Ver `docs/etapa-7-senas-dinamicas.md`.
6. Tras emitir, hay un **enfriamiento de 1,5 s** para no repetir la palabra mientras la mano sigue
   en la misma postura.

La pantalla de traducción muestra en vivo la candidata, su confianza y una barra con el progreso
de los 600 ms, para que el usuario entienda por qué una seña «todavía no sale».

## 5. Grabación de señas

En `/entrenamiento`:

1. Escribes el nombre («Hola», «Gracias», «SOS»…).
2. Eliges **mano** (derecha, izquierda o ambas) y **tipo** (estática o dinámica).
3. Pulsas **Capturar seña**: 20 lecturas a 20 Hz para estáticas (1 s) o 40 para dinámicas (2 s).
4. Se guardan en `localStorage` (`klaps.training.v1`) junto a la etiqueta, la mano, el tipo y la
   fecha.

Si repites nombre + mano + tipo, las muestras se **suman** a la seña existente (así se mejora con
el uso). La misma etiqueta con otro modo o tipo crea una seña distinta.

## 6. Exportar e importar

- **Exportar** descarga `klaps-entrenamiento-ayyyy-mm-dd.json`.
- **Importar** combina el archivo con lo que ya hay, sin borrar nada.
- El importador valida el JSON: ignora vectores que no tengan 22 números finitos y avisa si no
  encuentra ninguna seña válida.

## 7. Emergencia bimanual (SOS)

Una seña entrenada con la etiqueta `SOS`, `Emergencia` o `Auxilio` dispara el aviso de emergencia:

- Se pronuncia «Emergencia».
- Aparece una tarjeta con **«Abrir emergencia»**, que lleva a la pantalla de SOS.
- **No se envía ninguna alerta automáticamente**: la confirmación en dos pasos sigue en `/emergencia`.

## 8. Corrección de sintaxis

`src/services/gesture/sentence.js` aplica reglas deterministas y explicables sobre la frase
acumulada: abreviaturas frecuentes (`porfavor → por favor`), espacios antes de puntuación,
palabras repetidas seguidas, mayúscula inicial y punto final. La interfaz lista qué reglas se
aplicaron. No es un modelo de lenguaje y no reescribe el significado.

## 9. Configuración de UUID

Los UUID no se escriben en el código: se guardan en el navegador (`klaps.ble.serviceUuid`,
`klaps.ble.sensorsUuid`). Se aceptan con guiones, sin guiones (32 caracteres), con prefijo `0x` y
en mayúsculas; se normalizan al guardar. Desde:

- `/entrenamiento` → tarjeta «Conexión y UUID del firmware».
- `/dispositivos/diagnostico` → tarjeta «Servicio propio del guante».

Con ambos guardados, `DeviceProvider` se suscribe automáticamente a la característica de sensores
al conectar cada guante.

> **Importante:** el servicio debe declararse **antes** de abrir la conexión (`optionalServices`).
> Por eso `connect()` añade el UUID del servicio a la petición del navegador. Si aun así falla,
> en la tarjeta del guante aparece **«Activar sensores»** y el motivo del error.

### Estado de sensores en la tarjeta del guante

| Indicador | Significado |
| --- | --- |
| «Escuchando · N tramas» | Suscripción activa y paquetes entrantes |
| «Recibiendo la trama de 34 bytes» | El tamaño coincide con el protocolo |
| «Trama de N bytes; se esperaban 34» | El firmware envía otra estructura: revisa el orden y los tipos |
| «Los cinco sensores flex llegan a 0» | La trama está alineada, pero el firmware envía ceros en los bytes 0-9 |
| «Sin suscribir» | Falta configurar UUID o la suscripción falló (se indica el motivo) |

## 10. Cómo probarlo

1. `http://localhost:5173/dispositivos/diagnostico` → conecta `KLAPS_Guante_D` → «Copiar UUID».
2. `/entrenamiento` → pega servicio y característica de sensores → **Guardar UUID**.
3. Desconecta y vuelve a conectar el guante. En «Lectura en vivo» deben moverse los flex al mover
   la mano.
4. Graba 3-4 señas (20 muestras cada una).
5. «Probar el reconocimiento»: al mantener la postura 0,6 s aparece «Reconocido: …».
6. `/traducir` → **Iniciar detección** → las palabras se acumulan, se pronuncian y puedes
   **Corregir sintaxis** o **Guardar** en el historial.

## 11. Límites conocidos

- El entrenamiento vive en **este navegador**; para pasarlo a otro equipo usa exportar/importar.
- La calidad depende de las muestras: conviene grabar la misma seña varias veces, con variaciones
  naturales de postura.
- Sin guantes conectados no hay reconocimiento (no hay datos simulados).
- El RSSI no está disponible en Web Bluetooth; la señal no forma parte del vector.
