# Cómo ejecutar KLAPS

KLAPS es una aplicación web (React + Vite). No necesita servidor propio ni base de datos:
todo el estado se guarda en el navegador (`localStorage`).

## 1. Requisitos

| Requisito | Versión |
| --- | --- |
| Node.js | 20 o superior (`node -v`) |
| npm | viene con Node (`npm -v`) |
| Navegador | **Chrome, Edge u Opera** — necesarios para Web Bluetooth (los guantes) |

## 2. Primera vez

```bash
cd klaps          # carpeta del proyecto
npm install       # instala las dependencias (una sola vez)
npm run dev       # arranca el servidor de desarrollo
```

Abre la dirección que imprime la terminal, normalmente **http://localhost:5173**.

> Si el puerto 5173 está ocupado, Vite usa el siguiente libre (5174, 5175…) e indica la
> dirección exacta en la terminal.

## 3. Uso diario

```bash
npm run dev
```

Los cambios en el código se recargan solos en el navegador (HMR). `Ctrl + C` detiene el servidor.

## 4. Comprobar que todo está correcto

```bash
npm run lint      # 0 warnings, 0 errores
npm run build     # compila a dist/ (versión de producción)
npm run preview   # sirve dist/ en http://localhost:4173
```

`npm run build` + `npm run preview` es la forma de probar exactamente lo que se publicará.

## 5. Rutas principales

| Ruta | Pantalla |
| --- | --- |
| `/` | Bienvenida |
| `/inicio` | Panel |
| `/dispositivos` | Conexión de guantes |
| `/dispositivos/diagnostico` | Diagnóstico BLE en vivo (necesita HTTPS o localhost) |
| `/traduccion` | Traducción por guantes |
| `/voz` | Voz → texto |
| `/frases` | Frases rápidas |
| `/sos` | Emergencia con confirmación |
| `/historial` | Historial |
| `/perfil` | Perfil de accesibilidad |
| `/ajustes` | Configuración |

## 6. Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| `vite: command not found` | Falta `npm install`. |
| `EADDRINUSE` (puerto ocupado) | Vite cambia de puerto solo; o cierra el proceso anterior con `Ctrl + C`. |
| La página sale en blanco | Mira la consola del navegador; suele ser una dependencia sin instalar. Repite `npm install`. |
| «Este navegador no soporta Bluetooth» | Usa Chrome/Edge/Opera. Safari y Firefox no implementan Web Bluetooth. |
| El botón de Bluetooth no aparece en el móvil | Hace falta **HTTPS** o `localhost`, y Chrome en Android. |
| Los datos desaparecen | Cada navegador guarda su propio `localStorage`; no se sincroniza entre dispositivos. |

## 7. Vista previa en Arena

Si trabajas dentro de este espacio, la app ya se sirve en la **vista previa** (puerto 5173,
acceso HTTPS). No necesitas instalar nada: abre la vista previa y navega. El Bluetooth solo
funciona en tu equipo local con las placas al alcance, no desde un entorno remoto.
