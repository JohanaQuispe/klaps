# Carpeta `public/brand` — logotipo oficial

Aquí va el **símbolo oficial de KLAPS**.

## Cómo instalarlo

1. Guarda el archivo como **`logo-klaps.svg`** dentro de esta carpeta.
2. Recarga la aplicación. No hay que cambiar código.

El componente `src/components/brand/Logo.jsx` intenta cargar `/brand/logo-klaps.svg`
y, mientras el archivo no exista, muestra un **monograma provisional** (una «K»
en un cuadrado morado). Ese monograma **no es** el logotipo de la marca.

## Recomendaciones del archivo

| Requisito | Valor |
| --- | --- |
| Formato | SVG (preferido) o PNG con transparencia de 1024 × 1024 px |
| Zona de respeto | 12 % del ancho libre alrededor del símbolo |
| Fondo | Transparente (el símbolo se coloca sobre blanco, lavanda y morado) |
| Versión oscura | Opcional: `logo-klaps-claro.svg` para fondos morados |

## También pendiente

- `public/favicon.svg` hoy contiene el monograma provisional.
  Cuando llegue el logotipo, se reemplaza por una versión del símbolo sin texto.
