# Cálculo en Movimiento 3D — control por gestos

Aplicación web con gráfica 3D, partículas, función configurable y control de mano en tiempo real.

## Gestos
- **Índice extendido:** mueve el punto a lo largo de la curva.
- **Pulgar e índice en pinza:** muestra la recta tangente.
- **Mano abierta:** muestra f(x), f'(x) y f''(x).
- **Dos dedos (índice y medio):** busca y muestra puntos críticos aproximados.
- **Puño cerrado durante un momento:** reinicia la interacción.

MediaPipe dibuja el esqueleto de la mano sobre el video. Se puede usar teclado como alternativa: 1–5 cambian modos, flechas mueven el punto y R reinicia.

## Función configurable
Escribe expresiones compatibles con Math.js, por ejemplo `x^2`, `x^3-2*x`, `sin(x)`, `tan(x)`, `exp(x)`, `sqrt(x)` o `1/x`, y pulsa **Aplicar función**. Las derivadas primera y segunda se calculan automáticamente.

## Publicar
Sube `index.html`, `style.css`, `app.js` y `README.md` a la raíz del repositorio GitHub. En Settings → Pages elige `Deploy from a branch`, rama `main`, carpeta `/ (root)`. Abre la URL HTTPS publicada y permite el acceso a la cámara.

Nota: la detección de puntos críticos es numérica y aproximada; comprueba los resultados de funciones con discontinuidades o dominios restringidos.
