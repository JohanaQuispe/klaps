# Carpeta `public/brand` — logotipo oficial

## Estado actual (revisado)

| Archivo | Estado |
| --- | --- |
| `logo-klaps.svg` | **No utilizable como marca.** Es un trazado (potrace) **monocromo y en negativo**: un cuadrado negro con la mano recortada, sin el morado, el rosa ni el azul del logotipo. Además su lienzo mide 3889 × 5500 y el símbolo ocupa solo el centro. |

Por eso la aplicación sigue mostrando el **monograma provisional** (una «K» en un cuadrado morado).
El componente `src/components/brand/Logo.jsx` tiene la ruta del logotipo desactivada
(`const MARK_SRC = null`) para no generar peticiones 404 en consola.

## Qué necesito para activarlo

Cualquiera de estas dos opciones, con el nombre exacto **`logo-klaps-mark.svg`**:

1. **SVG vectorial a color** (preferido) con `viewBox` ajustado al símbolo, no al lienzo completo.
2. **PNG 1024 × 1024 con transparencia** (se guardaría como `logo-klaps-mark.png` y se ajusta la constante).

Pasos al recibirlo:

1. Guarda el archivo en esta carpeta.
2. En `src/components/brand/Logo.jsx`, cambia `const MARK_SRC = null` por
   `const MARK_SRC = '/brand/logo-klaps-mark.svg'`.
3. Recarga: el header, la bienvenida y los ajustes usan el logotipo nuevo.

## Recomendaciones del archivo

| Requisito | Valor |
| --- | --- |
| Zona de respeto | 12 % del ancho libre alrededor del símbolo |
| Fondo | Transparente (se coloca sobre blanco, lavanda y morado) |
| Contraste | Debe seguir leyéndose a 24 px de alto |
| Versión clara | Opcional: `logo-klaps-mark-claro.svg` para fondos morados |

## Favicon

`public/favicon.svg` contiene hoy el monograma provisional («K» sobre degradado morado).
Cuando llegue el símbolo correcto, se regenera a partir de él.
