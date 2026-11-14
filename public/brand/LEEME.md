# Carpeta `public/brand` — logotipo oficial

## Estado: integrado ✅

El logotipo a color (**K + mano + corazón**) ya está en uso en toda la aplicación:
barra lateral, cabecera móvil, bienvenida, ajustes y favicon.

| Archivo | Origen | Uso | Peso |
| --- | --- | --- | --- |
| `logo-klaps-mark.webp` | `logo_klaps.png` (2828 × 4000, transparente) | Logotipo principal | 31 KB |
| `logo-klaps-mark.png` | Ídem, 160 px de alto | Alternativa para navegadores sin WebP | 50 KB |
| `/favicon.png` | Ídem, lienzo cuadrado 64 px | Pestaña del navegador | 8 KB |
| `/apple-touch-icon.png` | Ídem sobre lavanda 180 px | Icono en iOS / Android | 46 KB |
| `logo-klaps.svg` | Archivo que enviaste antes | **Sin uso**: es un trazado monocromo e invertido (un cuadrado negro con la mano recortada). Se conserva como referencia. | 137 KB |

### Cómo se procesó

1. Se eliminó el lienzo transparente sobrante: el símbolo ocupaba 2638 × 2793 de 2828 × 4000.
2. Se añadió un 2 % de aire alrededor (zona de respeto).
3. Se exportó a WebP con alfa al 92 % de calidad y a PNG como respaldo.
4. Proporción conservada: **0,945** (ancho/alto). En la interfaz siempre se escala por alto,
   por lo que el símbolo nunca se deforma.

### Reglas de uso

- Altura mínima: **24 px** (por debajo, el corazón pierde detalle).
- No colocar sobre degradados muy saturados: se usa sobre blanco, lavanda o lila claro.
- No recortar la mano ni el corazón: forman parte del símbolo.
- El nombre «KLAPS» se escribe con tipografía Nunito ExtraBold y el eslogan
  «Comunicación sin barreras» no se modifica.
