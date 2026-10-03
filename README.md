# Cálculo en Movimiento — Entrega 3

Aplicación web para Cálculo Diferencial con estética **negro, rojo y blanco**. Incluye gráfica 3D, funciones introducidas por el usuario, derivadas, análisis numérico de límites, búsqueda de discontinuidades, cinco interacciones por gestos y controles alternativos.

## Funciones y expresiones

La entrada se interpreta con Math.js. Se admiten, entre otras, expresiones con `x`, `pi`, `e`, `sin`, `cos`, `tan`, `sec`, `csc`, `cot`, `exp`, `ln`, `log`, `sqrt`, `abs` y operaciones aritméticas.

Ejemplos:
- `x^2`
- `x^3 - 3*x`
- `sin(x)`
- `tan(x)`
- `e^x`
- `ln(x)`
- `sqrt(x)`
- `1/x`

### Entradas inválidas

Una entrada como `tan8(0)` no se interpreta como `tan(x)`. El programa detecta `tan8` como un nombre de función desconocido y muestra **NO SE PUEDE GRAFICAR**, junto con el motivo y un ejemplo válido.

## Límites

El panel de límites compara aproximaciones por izquierda y derecha. También tiene un botón que recorre el rango y busca puntos sospechosos de discontinuidad o asíntota. Los resultados están marcados como:

- LÍMITE EXISTE
- LÍMITE INFINITO
- LÍMITE NO EXISTE
- RESTRICCIÓN DE DOMINIO

El análisis es numérico y sirve como apoyo visual; para una demostración formal se debe justificar matemáticamente el resultado.

## Cámara

La cámara usa `navigator.mediaDevices.getUserMedia()` y MediaPipe Hands. La cámara funciona en un contexto seguro (HTTPS), por ejemplo GitHub Pages. Si el navegador bloquea el permiso, el mensaje queda visible en la interfaz.

## Publicar en GitHub Pages

1. Sube `index.html`, `style.css`, `app.js` y `README.md` al repositorio.
2. Ve a **Settings → Pages**.
3. Selecciona **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Abre la URL de GitHub Pages.
5. Pulsa **ACTIVAR CÁMARA** y permite el acceso.

## Código explicable

La interfaz incluye un panel **¿CÓMO FUNCIONA EL CÓDIGO?** que resume las funciones principales y su propósito para la sustentación. También se incluye `GUIA_EXPLICACION_CODIGO.md` con el mismo contenido en formato de documento.
