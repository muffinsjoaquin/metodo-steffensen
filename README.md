# Método de Steffensen — Aplicación web

Programa para encontrar raíces de f(x) = 0 con el método de Steffensen.
Proyecto de Métodos Numéricos (MAT-205), UAGRM.

## Archivos

| Archivo      | Contenido                                                          |
|--------------|--------------------------------------------------------------------|
| `index.html` | Estructura de la página: formulario, resultados, tabla y gráficas  |
| `styles.css` | Diseño y colores (incluye modo oscuro y versión para celular)      |
| `parser.js`  | Lee la función escrita por el usuario y la convierte en algo calculable (sin `eval`) |
| `script.js`  | Algoritmo de Steffensen, validación de datos, tabla y gráficas     |
| `pruebas/pruebas.js` | Casi 2400 pruebas automáticas (opcional, requiere Node.js) |

## Cómo abrirlo en Visual Studio Code

1. Pon todos los archivos en una misma carpeta, por ejemplo `metodo-steffensen`.
2. En VS Code: **Archivo → Abrir carpeta…** y elige esa carpeta.
3. Instala la extensión **Live Server** (de Ritwick Dey) desde la pestaña de extensiones.
4. Clic derecho sobre `index.html` → **Open with Live Server**. Se abre en el navegador
   y se actualiza solo cada vez que guardas un cambio.

También funciona con doble clic sobre `index.html`, sin Live Server.

> Las gráficas usan la librería Plotly desde internet, así que la primera vez se necesita
> conexión. Todo lo demás (cálculo y tabla) funciona sin internet.

## Cómo usarlo

- Escribe la función, por ejemplo `exp(-x) - x`, `x^3 - x - 2` o `cos(x) - x`.
  Debajo del campo aparece cómo la interpretó el programa (por ejemplo `2x^2` → `2*x^2`).
- Se acepta: multiplicación implícita (`2x`, `3(x+1)`), `sen`, `ln`, `π`, `√x`, `x²`,
  `f(x) = ...`, ecuaciones `x^2 = 2`, y también la sintaxis de JavaScript (`Math.exp(-x)`, `x**2`).
- En x₀ y la tolerancia se acepta coma decimal, fracciones y constantes: `0,5`, `1/2`, `pi/6`, `10^-6`.
- Indica la aproximación inicial x₀, la tolerancia y el límite de iteraciones.
- Pulsa **Calcular raíz**. Haz clic en una fila de la tabla para ver el cálculo paso a paso.
- **Descargar CSV** guarda la tabla para pegarla en Excel o en el informe.

## Criterios del algoritmo (script.js, función `steffensen`)

- Fórmula: `x_{n+1} = x_n − f(x_n)² / ( f(x_n + f(x_n)) − f(x_n) )`
- Termina cuando `|x_{n+1} − x_n| < tolerancia`, o cuando `f(x_n) = 0` exactamente.
- Nunca se cuelga ni muestra errores técnicos: se detiene con un mensaje claro si
  - f no está definida en x₀ o en algún paso (`sqrt` de un negativo, `ln(0)`, división entre cero),
  - el denominador es cero (función constante, paso h = f(x) enorme o diminuto),
  - la sucesión diverge o se alcanza el límite de iteraciones,
  - el paso se hizo pequeño pero f(x) no está cerca de cero (posible asíntota).
- Si se llega al límite de precisión de la computadora cerca de la raíz, lo informa como convergencia.

## Validación de datos

| Dato | Regla |
|------|-------|
| Función | Máx. 300 caracteres, solo funciones conocidas, paréntesis balanceados |
| x₀ | Número entre −10 000 000 y 10 000 000 |
| Tolerancia | Entre 1e-15 y 1 (sin incluir 1) |
| Iteraciones | Entero entre 1 y 1000 |

## Pruebas automáticas (opcional)

Con Node.js instalado, en la terminal de VS Code: `node pruebas/pruebas.js`.
Prueba expresiones válidas e inválidas, datos numéricos erróneos, casos difíciles del
método y 20 000 funciones generadas al azar.

## Prueba de referencia

Con `exp(-x) - x`, x₀ = 0.5 y tolerancia `1e-6`, el programa da la raíz
**0.567143290** en **3 iteraciones**, igual que la Tabla 2 del informe.
