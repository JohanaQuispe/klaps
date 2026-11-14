# Cómo ejecutar KLAPS

KLAPS es una aplicación web (React + Vite). No necesita servidor propio ni base de datos:
todo el estado se guarda en el navegador (`localStorage`).

## 1. Requisitos

| Requisito | Versión |
| --- | --- |
| Node.js | 20 o superior (`node -v`) |
| npm | viene con Node (`npm -v`) |
| Navegador | **Chrome, Edge u Opera** — necesarios para Web Bluetooth (los guantes) |

## 2. Primera vez (macOS y Linux)

```bash
cd klaps
npm install
npm run dev
```

> **No copies los comentarios.** En `cmd` de Windows el `#` no es un comentario: npm lo lee
> como un nombre de paquete y falla con `EINVALIDTAGNAME`. Escribe cada comando limpio.
> Si usas Windows, ve directamente a la sección 3.

`cd klaps` solo funciona si esa carpeta existe en tu ubicación actual. Ajusta la ruta según
donde hayas clonado o descomprimido el proyecto.

Abre la dirección que imprime la terminal, normalmente **http://localhost:5173**.

> Si el puerto 5173 está ocupado, Vite usa el siguiente libre (5174, 5175…) e indica la
> dirección exacta en la terminal.

## 3. Windows paso a paso

Los tres errores más habituales en `cmd` son: copiar los comentarios `#` (en **cmd no son
comentarios**, npm los interpreta como paquetes), ejecutar dentro de `C:\Users\carol` sin haber
entrado a la carpeta, y hacer `cd klaps` cuando aún no existe esa carpeta.

### a) Instalar Node.js (una vez)

Descarga el **LTS** desde <https://nodejs.org> o abre PowerShell y ejecuta:

```powershell
winget install OpenJS.NodeJS.LTS
```

Cierra y vuelve a abrir la terminal, y comprueba:

```powershell
node -v
```

Debe responder algo como `v22.x.x`. Si dice «no se reconoce», Node no quedó en el PATH:
reinstala y reinicia la sesión.

### b) Conseguir la carpeta del proyecto

El repositorio es **privado**, así que necesitas haber iniciado sesión en GitHub.

**Opción 1 — Git** (recomendada para trabajar):

```powershell
cd $HOME
git clone https://github.com/JohanaQuispe/klaps.git
cd klaps
```

Al clonar, Windows te pedirá iniciar sesión en GitHub una vez (Git Credential Manager abre el
navegador).

**Opción 2 — Descargar ZIP** (sin Git):

1. Entra a <https://github.com/JohanaQuispe/klaps> con tu cuenta.
2. Botón verde **Code** → **Download ZIP**.
3. Clic derecho sobre el ZIP → **Extraer todo** → ruta `C:\Users\carol\klaps`.
4. Comprueba que dentro de esa carpeta existan `package.json` y `vite.config.js`
   (si ves una carpeta `klaps-main` dentro, entra en ella y mueve su contenido).

### c) Arrancar

```powershell
cd C:\Users\carol\klaps
npm install
npm run dev
```

Cuando aparezca `Local: http://localhost:5173/`, abre esa dirección en **Chrome, Edge u Opera**.

### d) Atajo: doble clic

El archivo **`iniciar-klaps.bat`** de la raíz hace todo lo anterior: comprueba Node, instala las
dependencias si faltan, abre el navegador y arranca el servidor. Sirve para el día a día.

### e) Detener

`Ctrl + C` en la terminal (o cierra la ventana). Para volver a entrar más tarde basta con
`iniciar-klaps.bat` o `npm run dev`: no hace falta repetir `npm install`.

## 4. Uso diario

```bash
npm run dev
```

Los cambios en el código se recargan solos en el navegador (HMR). `Ctrl + C` detiene el servidor.

## 5. Comprobar que todo está correcto

```bash
npm run lint      # 0 warnings, 0 errores
npm run build     # compila a dist/ (versión de producción)
npm run preview   # sirve dist/ en http://localhost:4173
```

`npm run build` + `npm run preview` es la forma de probar exactamente lo que se publicará.

## 6. Rutas principales

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

## 7. Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| `vite: command not found` | Falta `npm install`. |
| `EINVALIDTAGNAME Invalid tag name "#"` | Copiaste los comentarios `#`. En **cmd** no son comentarios: ejecuta cada comando sin el texto que sigue al `#`. |
| `El sistema no puede encontrar la ruta especificada` | La carpeta `klaps` no existe todavía: clónala o descomprime el ZIP primero. |
| `Missing script: "dev"` | Estás fuera de la carpeta del proyecto (debe contener `package.json`). `cd` a ella. |
| «node no se reconoce como comando» | Node.js no está instalado o no quedó en el PATH; reinstala y reabre la terminal. |
| `EADDRINUSE` (puerto ocupado) | Vite cambia de puerto solo; o cierra el proceso anterior con `Ctrl + C`. |
| La página sale en blanco | Mira la consola del navegador; suele ser una dependencia sin instalar. Repite `npm install`. |
| «Este navegador no soporta Bluetooth» | Usa Chrome/Edge/Opera. Safari y Firefox no implementan Web Bluetooth. |
| El botón de Bluetooth no aparece en el móvil | Hace falta **HTTPS** o `localhost`, y Chrome en Android. |
| Los datos desaparecen | Cada navegador guarda su propio `localStorage`; no se sincroniza entre dispositivos. |

## 8. Vista previa en Arena

Si trabajas dentro de este espacio, la app ya se sirve en la **vista previa** (puerto 5173,
acceso HTTPS). No necesitas instalar nada: abre la vista previa y navega. El Bluetooth solo
funciona en tu equipo local con las placas al alcance, no desde un entorno remoto.
