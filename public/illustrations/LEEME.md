# Carpeta `public/illustrations` — recursos visuales de KLAPS

Todos los archivos se recortaron (se eliminó el lienzo transparente de 3889 × 5500) y se
convirtieron a **WebP**. Ninguna imagen se ha deformado: se escalan por alto con `width: auto`.

## Recursos oficiales integrados

| Archivo | Origen | Uso en la app | Peso |
| --- | --- | --- | --- |
| `mascota.webp` | `mascota.png` | Saludo del Panel | 71 KB |
| `mascota-feliz.webp` | `klaps_feliz.png` | Estados vacíos y de éxito | 40 KB |
| `guante-izquierdo.webp` | `guante-izquierdo.png` | Tarjeta del guante izquierdo | 50 KB |
| `guante-derecho.webp` | `guante-derecho.png` | Tarjeta del guante derecho | 42 KB |
| `sos.webp` | `botones.png` (pieza inferior) | Tarjeta de emergencia del Panel | 45 KB |
| `iconos/salud.webp` | `botones.png` | Categoría «Salud» de Frases rápidas | 11 KB |
| `iconos/transporte.webp` | `botones.png` | Categoría «Transporte» | 12 KB |
| `iconos/compras.webp` | `botones.png` | Categoría «Compras» | 9 KB |
| `iconos/emergencia.webp` | `botones.png` | Categoría «Emergencias» | 9 KB |
| `iconos/aviso.webp` | `botones.png` | Categoría «Avisos» (nevera, no semáforo) | 10 KB |
| `klaps-hero-720/1200.webp` | recorte de la composición | Ilustración de Bienvenida | 43 / 89 KB |
| `klaps-bienvenida-720/1080/1440.webp` | composición completa | Reserva (cartel, PWA, redes) | 57–134 KB |

Carpeta `iconos/`: piezas sueltas para las categorías de **Frases rápidas** (Etapa 4).

## Notas de uso

- **No repetir** la misma ilustración en varias tarjetas sin motivo: la mascota aparece una vez
  por pantalla; los guantes solo en sus tarjetas.
- Las imágenes de los guantes son oscuras a propósito (producto real). Siempre sobre fondo claro.
- `sos.webp` lleva el texto «¡Necesitas ayuda?» **impreso**: no debe usarse como icono pequeño
  ni como única etiqueta. Va acompañado de un título real y de su botón.

## Archivos originales

Los PNG originales de `mascota.png`, `guante-izquierdo.png` y `guante-derecho.png` siguen en esta
carpeta (≈27 MB) como fuente para futuros recortes. La aplicación **no** los carga. Si quieres
aligerar el repositorio, se pueden mover fuera de Git sin afectar a la app.

## Lo que falta

| Recurso | Para qué |
| --- | --- |
| `iconos/alimentacion.webp` | Categoría «Alimentación» |
| `iconos/necesidades.webp` | Categoría «Necesidades personales» |
| `iconos/conversacion.webp` | Categoría «Conversaciones cotidianas» |
| `avatar-1.png` … `avatar-3.png` | Interlocutores del historial |
| `logo-klaps-mark.svg` | Logotipo (ver `public/brand/LEEME.md`) |

Mientras falten los iconos de categoría se usan iconos de Lucide, nunca emojis.
