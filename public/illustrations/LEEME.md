# Carpeta `public/illustrations` — recursos visuales de KLAPS

## Lo que ya existe (derivado de la imagen que enviaste)

| Archivo | Origen | Uso |
| --- | --- | --- |
| `klaps-hero-720.webp` | Recorte de la zona ilustrada de tu pieza (sin el texto ni el botón impresos) | Ilustración principal de la pantalla de Bienvenida (móvil) |
| `klaps-hero-1200.webp` | Igual, en mayor resolución | Bienvenida en tablet y escritorio |
| `klaps-bienvenida-720/1080/1440.webp` | Composición completa original, optimizada (de 13,5 MB a 57–134 KB) | Reserva: cartel completo, PWA, redes |

> No se alteró la imagen original: solo se recortaron los márgenes transparentes y se
> convirtió a WebP. El estilo, las proporciones y los colores se respetan.

## Lo que falta y por qué importa

La imagen recibida es una **composición aplanada**: la mascota, los guantes y los
avatares no existen como archivos separados con transparencia. Por eso hoy no se
pueden reutilizar en otras pantallas sin arrastrar fragmentos del fondo.

Cuando puedas, envía estos archivos con estos nombres exactos:

| Nombre | Contenido | Dónde se usa |
| --- | --- | --- |
| `mascota.png` | Robot de KLAPS, fondo transparente, 1024 × 1024 | Saludo del Panel y estados vacíos |
| `guante-izquierdo.png` | Guante negro con muñequera KLAPS, transparente | Tarjeta del guante izquierdo |
| `guante-derecho.png` | Guante derecho, transparente | Tarjeta del guante derecho |
| `avatar-1.png` `avatar-2.png` `avatar-3.png` | Avatares en cuadrado | Historial y conversaciones |

`src/components/brand/Mascot.jsx` ya busca `mascota.png`: en cuanto el archivo
exista, la mascota aparece sin tocar código. Mientras no exista, el componente no
dibuja nada (nunca se sustituye por un emoji ni por una ilustración inventada).
