# Guía para explicar el código en la sustentación

La aplicación está organizada en cinco bloques: **entrada y validación, cálculo matemático, límites y dominio, gráfica 3D, cámara e interacción**.

## 1. Entrada y validación

### `normalizeExpression(raw)`
Normaliza nombres comunes en español como `sen(x)` para convertirlos en expresiones compatibles con Math.js.

### `findUnknownFunctions(raw)`
Busca nombres seguidos de `(`. Por eso detecta una entrada como `tan8(0)`: `tan8` no es una función incluida en el conjunto soportado y la aplicación muestra un error en vez de intentar graficarla.

### `findUnknownNames(raw)`
Detecta variables o nombres desconocidos que no sean `x`, constantes válidas o funciones permitidas.

### `prepareFunction()`
Es la función principal. Valida la entrada, la compila, intenta obtener la primera y segunda derivada, actualiza la interfaz y reconstruye la gráfica. Si algo falla, llama a la capa de errores.

## 2. Cálculo matemático

### `evaluateExpression(expr, x)`
Evalúa una expresión en un punto. Devuelve `NaN` cuando el punto está fuera del dominio o el resultado no es finito.

### `f(x)`, `df(x)`, `d2f(x)`
Accesos directos a la función, primera derivada y segunda derivada.

### `numericDerivative(x)`
Hace una aproximación de la primera derivada con diferencia central cuando Math.js no puede obtenerla simbólicamente.

### `numericSecondDerivative(x)`
Hace una aproximación de la segunda derivada con diferencias finitas.

### `findCriticalPoints()`
Busca raíces aproximadas de `f'(x)` dentro del rango y trata de refinarlas con Newton. Son candidatos a puntos críticos.

## 3. Límites y dominio

### `classifySide(values)`
Analiza las aproximaciones de un solo lado y las clasifica como finitas, infinitas, no definidas o no estables.

### `evaluateLimitAtPoint(target)`
Se acerca al punto desde izquierda y derecha, sin necesitar que `f(a)` esté definida. Compara ambos lados y decide si el límite bilateral existe, es infinito o no existe según el comportamiento numérico observado.

### `analyzeLimitAtPoint()`
Lee el valor escrito en `x → a` y muestra el análisis en la interfaz.

### `findKnownDiscontinuities()`
Añade candidatos conocidos para discontinuidades de funciones como `tan`, `sec`, `cot`, `csc` y algunas fronteras de dominio como `ln(x)` y `sqrt(x)`.

### `scanDiscontinuities()`
Recorre el rango y detecta saltos, valores no definidos y candidatos de asíntota. Luego analiza el límite en cada candidato y lista los puntos donde el límite bilateral no aparece como existente.

## 4. Gráfica 3D

### `lineFrom(fn, color)`
Muestrea una función para crear segmentos 3D. No conecta visualmente ramas separadas por una asíntota o un valor no definido.

### `rebuildCurves()`
Regenera las curvas de `f`, `f'` y `f''` después de cambiar de función o de rango.

### `updateTangent()`
Construye la recta tangente mediante `y = f'(a)(x-a) + f(a)`.

### `updateVisualization()`
Actualiza simultáneamente el punto `a`, las curvas, la tangente, los puntos críticos, los resultados y el reto.

### `animate()`
Mantiene el renderizado continuo de Three.js y mueve las partículas decorativas.

## 5. Cámara e interacción

### `countFingers(lm)`
Estima el número de dedos extendidos usando los puntos de la mano detectados por MediaPipe.

### `processCameraFrame()`
Envía los cuadros del video a MediaPipe Hands y mantiene el análisis en tiempo real.

### `setMode(n)`
Asigna las cinco acciones del proyecto según el número de dedos: evaluación, tangente, derivadas, puntos críticos y razón de cambio.

### `reset()`
Devuelve la aplicación a su función inicial y reinicia el punto y el rango.

## Ejemplo de `tan8(0)`

`tan8(0)` no es una llamada válida a la función tangente. El programa ve el nombre `tan8` antes del paréntesis, comprueba que no está permitido y muestra:

**NO SE PUEDE GRAFICAR**

Explica que `tan8` no existe dentro de las funciones admitidas. En cambio, `tan(0)` sí se puede interpretar.

## Importante para la sustentación

El análisis de límites es **numérico**. El programa compara valores muy cercanos al punto por ambos lados. En una sustentación, el equipo debe poder explicar además la razón matemática del resultado.
