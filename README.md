# Cálculo en Movimiento 3D — guía de uso y del código

## ¿Qué hace el proyecto?

Es una aplicación web para escribir una función matemática y visualizarla junto con sus derivadas. Se puede interactuar con la gráfica usando la cámara y los dedos, el teclado o el mouse.

## Cómo usarlo

1. Escribe una función en el cuadro **Función matemática**.
2. Pulsa **Aplicar función** o presiona Enter.
3. El programa muestra la función y calcula automáticamente la primera y segunda derivada.
4. Activa la cámara y permite el acceso, o utiliza las teclas `1` a `5`.
5. Usa las flechas o arrastra el mouse sobre la gráfica para cambiar el valor de `a`.

### Ejemplos de notación válida

```text
x^2
x^3 - 2*x
sin(x)
cos(x)
tan(x)
exp(x)
sqrt(x)
1/x
x^4 - 4*x^2
(tan(x))^8
tan(8*x)
```

**Importante sobre `tan8(0)`:** la aplicación muestra **“No se puede graficar”** porque esa escritura es ambigua y no se admite. Escribe la expresión que realmente quieres representar con paréntesis y operadores. Por ejemplo, `tan(8*x)` significa tangente de `8x`, `(tan(x))^8` significa la tangente de x elevada a la octava potencia, y `tan(0)` es una constante igual a cero. Son expresiones distintas.

Si una función tiene valores no definidos o no finitos en una parte del dominio, esa parte no puede representarse como una curva ordinaria. Además, que el programa pueda dibujar una función no sustituye la comprobación matemática de su dominio.

## Analizador de límites

En el panel **Analizador de límites**, escribe el punto al que se acerca x (por ejemplo, `0`) y pulsa **Calcular límite**. El programa estima por separado el límite por la izquierda y por la derecha evaluando la función en puntos cada vez más cercanos. Después compara ambos comportamientos:

- Si ambos lados se acercan al mismo número, informa que el límite existe y muestra una aproximación.
- Si los lados se acercan a valores distintos, informa que el límite bilateral no existe y explica que los límites laterales son diferentes.
- Si los lados crecen hacia infinitos de signos opuestos, informa que el límite no existe por divergencia lateral.
- Si ambos lados parecen crecer hacia el mismo infinito, lo identifica como divergencia infinita y aclara que no hay límite finito.
- Si los valores no son evaluables o no se estabilizan, explica que no pudo confirmar un límite y que puede haber una discontinuidad o una oscilación.

**Importante:** el análisis es numérico y aproximado, no una demostración matemática. Puede no clasificar correctamente todos los casos (por ejemplo, oscilaciones muy rápidas o singularidades difíciles). Para la entrega, confirma el resultado con límites laterales algebraicos. El valor de `f(a)` no determina por sí solo si existe el límite: el límite depende de lo que ocurre cuando `x` se acerca a `a`.

Ejemplos para probar (aplica cada función antes de calcular):

- `x^2` en `0`: límite 0.
- `1/x` en `0`: límite bilateral no existe; izquierda −∞ y derecha +∞.
- `abs(x)/x` en `0`: los límites laterales son diferentes (−1 y 1).
- `(x^2-1)/(x-1)` en `1`: límite 2 aunque la función original no está definida exactamente en 1.
- `sin(1/x)` en `0`: oscila y no tiene límite; el detector numérico puede señalar que no converge de forma estable.

## Las cinco interacciones

1. **1 dedo:** cambia el valor `a` y muestra `f(a)` y `f'(a)`.
2. **2 dedos:** muestra la recta tangente en `x=a`, con pendiente `f'(a)`.
3. **3 dedos:** muestra a la vez `f(x)`, `f'(x)` y `f''(x)`.
4. **4 dedos:** busca numéricamente puntos críticos dentro del rango seleccionado.
5. **5 dedos:** muestra un ejercicio de razón de cambio aproximada alrededor de `x=2`.

También se puede arrastrar horizontalmente sobre la gráfica para mover `a`.

## Explicación de las funciones de `app.js`

### Preparación y evaluación matemática

- **`prepareFunction()`**: lee lo que se escribió, valida la entrada, la convierte en una expresión que Math.js entiende y calcula la primera y segunda derivada. Si la expresión no es válida —incluido `tan8(0)`— muestra un mensaje de error y no aplica esa entrada.
- **`val(expr, x)`**: evalúa una expresión matemática en el valor `x`. Si la evaluación falla o produce infinito/NaN, devuelve un valor no válido para que no se intente dibujar ese punto.
- **`f(x)`**: calcula el valor de la función original.
- **`df(x)`**: calcula la primera derivada. Su valor representa la pendiente de la curva en el punto, cuando está definida.
- **`d2f(x)`**: calcula la segunda derivada, que ayuda a estudiar la concavidad y a refinar la búsqueda de puntos críticos.
- **`fmt(n)`**: formatea números con tres decimales. Si el resultado no es finito, muestra “no definida”.
- **`estimateSideLimit(at, side)`**: aproxima un límite lateral usando muestras cada vez más cercanas al punto.
- **`describeSide(result)`**: convierte la clasificación numérica de un límite lateral en un texto comprensible.
- **`analyzeLimit()`**: valida el punto indicado, compara los límites laterales y muestra si el límite parece existir, diverge o no puede confirmarse.

### Dibujo de la gráfica con Three.js

- **`lineFrom(fn, color)`**: evalúa una función en muchos valores de `x` dentro del rango visible y crea una línea para representarla.
- **`replaceLine(old, newLine)`**: elimina una línea anterior, libera sus recursos gráficos y agrega la nueva.
- **`rebuildCurves()`**: crea o actualiza las curvas de `f(x)`, `f'(x)` y `f''(x)`. Por defecto, las derivadas quedan ocultas hasta seleccionar el modo de tres dedos.
- **`updateTangent()`**: calcula y dibuja la recta tangente en `x=a` usando `y = f'(a)(x-a) + f(a)`. Si la función o la derivada no están definidas en ese punto, oculta la tangente.
- **`resize()`**: ajusta el renderizador y la proporción de la cámara cuando cambia el tamaño de la ventana.
- **`updateVisualization()`**: actualiza la posición del punto, decide qué curvas se ven, refresca la tangente y los puntos críticos y actualiza los resultados de texto.
- **`drawCriticals()`**: limpia los marcadores anteriores y dibuja los puntos críticos si está activo el modo correspondiente.
- **`animate()`**: ejecuta continuamente la animación, rota lentamente las partículas y renderiza la escena.

### Modos, resultados y puntos críticos

- **`setMode(n)`**: selecciona uno de los cinco modos y actualiza el título, la explicación y el panel de reto.
- **`updateMath()`**: cambia el resultado escrito en pantalla según el modo: evaluación, ecuación de la tangente, derivadas, puntos críticos o razón de cambio.
- **`findCriticalPoints()`**: busca posibles puntos donde `f'(x)=0` mediante muestras numéricas y un refinamiento iterativo. Es una aproximación, no una demostración matemática, y puede pasar por alto soluciones.
- **`reset()`**: vuelve a `a=1.5` y al modo inicial.

### Mouse y teclado

- **Control con mouse (`pointerdown`, `pointermove`, `pointerup`)**: permite arrastrar horizontalmente sobre la gráfica para mover `a`.
- **Control con teclado (`keydown`)**: las teclas `1` a `5` cambian el modo, las flechas izquierda/derecha mueven `a` y `R` reinicia el proyecto.

### Cámara y reconocimiento de la mano

- **`countFingers(lm)`**: estima cuántos dedos están extendidos a partir de los puntos de referencia que entrega MediaPipe.
- **`processCameraFrame()`**: envía el fotograma actual de la cámara a MediaPipe y solicita procesar el siguiente fotograma.
- **`hands.onResults(...)`**: recibe el resultado de MediaPipe, dibuja las conexiones y puntos de la mano, cuenta los dedos y cambia al modo correspondiente. Con un dedo, además, el movimiento horizontal cambia `a`.
- **`stopCamera()`**: detiene la captura, libera las pistas de video, limpia el dibujo y actualiza el estado de la interfaz.
- **Botón de cámara (`cameraBtn.onclick`)**: solicita permiso para usar la cámara, inicia el video y comienza el procesamiento. Si falla, muestra un mensaje.
- **`resize` y `rangeInput` (eventos)**: actualizan el tamaño de la vista o el rango de la gráfica cuando el usuario cambia esos controles.
- **`applyBtn`, Enter y botones de ejemplos (eventos)**: ejecutan `prepareFunction()` para aplicar la función escrita o seleccionada.

## Archivos del proyecto

- **`index.html`**: estructura de la página, controles, textos, canvas y enlaces a las bibliotecas.
- **`style.css`**: estilos, colores, distribución y adaptación visual.
- **`app.js`**: lógica matemática, gráfica, interacción, cámara y reconocimiento de gestos.
- **`README.md`**: instrucciones de instalación y explicación del funcionamiento.

## Tecnologías

- **HTML5**: estructura de la página.
- **CSS3**: apariencia y distribución.
- **JavaScript**: lógica e interacciones.
- **Three.js**: escena gráfica, líneas, puntos y partículas.
- **Math.js**: interpretación de expresiones y cálculo simbólico de derivadas.
- **MediaPipe Hands**: detección de puntos de la mano y conteo aproximado de dedos.
- **GitHub Pages**: publicación de la web.

## Publicar en GitHub Pages

1. Sube `index.html`, `style.css`, `app.js` y `README.md` al repositorio.
2. Ve a **Settings → Pages**.
3. Selecciona **Deploy from a branch**, la rama `main` y la carpeta `/root` (o `/` según cómo esté organizado el repositorio).
4. Guarda y abre la URL publicada.
5. Pulsa **Activar cámara** y acepta el permiso. La cámara requiere un contexto seguro como HTTPS; GitHub Pages usa HTTPS.

## Nota matemática

La búsqueda de puntos críticos es numérica y depende del rango seleccionado. En funciones con discontinuidades, asíntotas o dominios restringidos, revisa los resultados matemáticamente antes de presentarlos. La escena usa una perspectiva 3D, pero las curvas matemáticas se colocan en el plano `z=0`.
