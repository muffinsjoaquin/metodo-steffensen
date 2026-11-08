/* =========================================================
   Método de Steffensen — lógica del programa
   Métodos Numéricos (MAT-205) — UAGRM
   ========================================================= */

"use strict";

/* La lectura de f(x) está en parser.js (función crearFuncion). */
if (typeof module !== "undefined" && typeof crearFuncion === "undefined") {
  var { crearFuncion } = require("./parser.js");   // solo para pruebas con Node.js
}

/* Lee un valor numérico escrito por el usuario: acepta 0,5  1/2  pi/6  1e-6  10^-6 */
function leerValor(texto, nombre) {
  let t = String(texto ?? "").trim();
  if (t === "") throw new Error(`Falta el valor de "${nombre}".`);
  t = t.replace(/(\d),(\d)/g, "$1.$2");          // coma decimal
  if (/x/i.test(t)) throw new Error(`"${nombre}" debe ser un número, no puede contener x.`);
  let v = Number(t);
  if (!Number.isFinite(v)) {
    try {
      const g = crearFuncion(t);
      v = g.usaX ? NaN : g(0);
    } catch (e) { v = NaN; }
  }
  if (!Number.isFinite(v)) throw new Error(`"${nombre}" debe ser un número válido (por ejemplo 0.5, 1e-6 o pi/6).`);
  return v;
}

/* ---------------------------------------------------------
   2. Algoritmo de Steffensen
      x_{n+1} = x_n - f(x_n)^2 / ( f(x_n + f(x_n)) - f(x_n) )
   ---------------------------------------------------------
   Nunca lanza excepciones: siempre devuelve
   { filas, raiz, estado: "ok" | "aviso" | "error", mensaje }.
   --------------------------------------------------------- */
function steffensen(f, x0, tol, maxIter) {
  const filas = [];
  let x = x0;
  const limiteDivergencia = 1e8 * Math.max(1, Math.abs(x0));

  const fin = (estado, mensaje, raiz = x) => ({ filas, raiz, estado, mensaje });

  for (let n = 0; n < maxIter; n++) {
    const fx = f(x);
    if (!Number.isFinite(fx)) {
      return n === 0
        ? fin("error", `f(x) no está definida en x₀ = ${fmtX(x)} (da ${textoNoFinito(fx)}). Elige otro x₀ dentro del dominio de la función.`)
        : fin("error", `En la iteración ${n + 1}, f(x) no está definida en x = ${fmtX(x)} (da ${textoNoFinito(fx)}). La sucesión salió del dominio de la función; prueba con un x₀ más cercano a la raíz.`);
    }
    if (fx === 0) return fin("ok", `f(x) = 0 exactamente: x = ${fmtX(x)} es una raíz.`);
    if (Math.abs(x) > limiteDivergencia) {
      return fin("error", "La sucesión diverge (los valores crecen sin control). Prueba con un x₀ más cercano a la raíz.");
    }

    const z = x + fx;              // punto auxiliar
    const fz = f(z);
    const den = fz - fx;           // denominador

    if (!Number.isFinite(z) || !Number.isFinite(fz)) {
      return fin("error", `f no está definida en el punto auxiliar z = ${fmtX(z)} (da ${textoNoFinito(fz)}). ` +
        `Como el paso es h = f(xₙ) = ${fmtE(fx)}, z queda lejos de xₙ. Prueba con un x₀ más cercano a la raíz o divide la función entre una constante.`);
    }
    if (den === 0 || !Number.isFinite(den)) {
      if (filas.length > 0 && Math.abs(fx) < 1e-10) {
        return fin("ok", `Se alcanzó el límite de precisión de la computadora (f(x) ≈ ${fmtE(fx)}). x = ${fmtX(x)} es la mejor aproximación posible.`);
      }
      if (Math.abs(fx) > 1e3 * Math.max(1, Math.abs(x))) {
        return fin("error", `f(xₙ) = ${fmtE(fx)} es muy grande: el paso h = f(xₙ) lleva el punto auxiliar demasiado lejos (z = ${fmtX(z)}) y la pendiente no se puede estimar. Prueba con un x₀ más cercano a la raíz o divide la función entre una constante.`);
      }
      if (z === x) {
        return fin("error", `f(x₀) = ${fmtE(fx)} es tan pequeño frente a x que el paso h = f(x) no cambia el valor de x. Multiplica la función por una constante grande (por ejemplo 1000·f(x)).`);
      }
      return fin("error", "El denominador f(z) − f(xₙ) es cero, no se puede dividir. Esto pasa cuando la función es constante cerca de xₙ. Prueba con otro x₀.");
    }

    const xNuevo = x - (fx * fx) / den;
    const error = Math.abs(xNuevo - x);
    const fxNuevo = f(xNuevo);
    filas.push({ n, x, fx, z, fz, den, xNuevo, error, fxNuevo });

    if (!Number.isFinite(xNuevo) || Math.abs(xNuevo) > limiteDivergencia) {
      return fin("error", "La sucesión diverge (los valores crecen sin control). Prueba con un x₀ más cercano a la raíz.", xNuevo);
    }
    if (error < tol) {
      // Comprobación: un paso pequeño no siempre significa raíz (p. ej. cerca de una asíntota)
      if (!Number.isFinite(fxNuevo) || (Math.abs(fxNuevo) > 1e-3 && Math.abs(fxNuevo) > 1e3 * tol)) {
        return fin("aviso", `El método se detuvo (|xₙ₊₁ − xₙ| < tolerancia), pero f(x) = ${fmtE(fxNuevo)} no es cercano a cero. ` +
          "Puede haber una discontinuidad o asíntota cerca; revisa la gráfica y prueba con otro x₀.", xNuevo);
      }
      return fin("ok", `Convergió: |xₙ₊₁ − xₙ| = ${fmtE(error)} < ${fmtE(tol)}.`, xNuevo);
    }
    x = xNuevo;
  }
  return fin("aviso", `No convergió en ${maxIter} iteraciones. Aumenta el límite de iteraciones o prueba con otro x₀. ` +
    "Si la gráfica no corta el eje x, puede que la función no tenga raíz real.");
}

function textoNoFinito(v) {
  if (Number.isNaN(v)) return "un valor indefinido";
  if (v === Infinity || v === -Infinity) return "infinito";
  return fmtE(v);
}

/* ---------------------------------------------------------
   3. Formato de números
   --------------------------------------------------------- */
function fmtX(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return v === undefined ? "—" : String(v).replace("Infinity", "∞").replace("NaN", "indefinido");
  if (v !== 0 && (Math.abs(v) >= 1e7 || Math.abs(v) < 1e-6)) return v.toExponential(6);
  return (Object.is(v, -0) ? 0 : v).toFixed(9);
}
function fmtE(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return v === undefined ? "—" : String(v).replace("Infinity", "∞").replace("NaN", "indefinido");
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e-3 && a < 1e4) return String(Number(v.toPrecision(7)));
  return v.toExponential(6).replace(/\.?0+e/, "e");
}

/* ---------------------------------------------------------
   4. Interfaz
   --------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

function leerDatos() {
  const f = crearFuncion($("funcion").value);
  const x0 = leerValor($("x0").value, "Aproximación inicial x₀");
  const tol = leerValor($("tol").value, "Tolerancia");
  const maxTexto = String($("maxIter").value).trim().replace(/(\d),(\d)/g, "$1.$2");
  const maxIter = Number(maxTexto);

  if (tol <= 0) throw new Error("La tolerancia debe ser mayor que cero (por ejemplo 1e-6).");
  if (tol < 1e-15) throw new Error("La tolerancia mínima es 1e-15: la computadora no tiene más precisión que esa.");
  if (tol >= 1) throw new Error("La tolerancia debe ser menor que 1 (por ejemplo 1e-6 o 0.0001).");
  if (maxTexto === "" || !Number.isFinite(maxIter)) throw new Error("El límite de iteraciones debe ser un número entero.");
  if (!Number.isInteger(maxIter)) throw new Error("El límite de iteraciones debe ser un número entero (sin decimales).");
  if (maxIter < 1 || maxIter > 1000) throw new Error("El límite de iteraciones debe estar entre 1 y 1000.");
  if (Math.abs(x0) > 1e7) throw new Error("x₀ es demasiado grande. Usa un valor entre −10 000 000 y 10 000 000.");
  return { f, x0, tol, maxIter };
}

function calcular(evento) {
  if (evento) evento.preventDefault();
  try {
    let datos;
    try {
      datos = leerDatos();
    } catch (e) {
      mostrarMensaje("error", e.message);
      $("resultados").hidden = true;
      return;
    }
    const r = steffensen(datos.f, datos.x0, datos.tol, datos.maxIter);
    mostrarMensaje(r.estado, r.mensaje);
    mostrarResultados(datos.f, datos.x0, r);
  } catch (e) {
    console.error(e);
    mostrarMensaje("error", "Ocurrió un error inesperado al calcular. Revisa los datos e inténtalo de nuevo.");
  }
}

function mostrarMensaje(tipo, texto) {
  const aviso = $("mensaje");
  aviso.className = "mensaje " + (tipo || "");
  aviso.textContent = texto || "";
}

function mostrarInterpretacion() {
  const salida = $("interpretacion");
  const texto = $("funcion").value;
  if (texto.trim() === "") { salida.textContent = ""; salida.className = "interpretacion"; return; }
  try {
    salida.textContent = "Se interpreta como: f(x) = " + crearFuncion(texto).texto;
    salida.className = "interpretacion";
  } catch (e) {
    salida.textContent = e.message;
    salida.className = "interpretacion con-error";
  }
}

function mostrarResultados(f, x0, r) {
  $("resultados").hidden = false;
  const convergio = r.estado === "ok";
  $("resTituloRaiz").textContent = convergio ? "Raíz aproximada" : "Última aproximación";
  $("resRaiz").textContent = fmtX(r.raiz);
  $("resF").textContent = fmtE(f(r.raiz));
  $("resIter").textContent = r.filas.length;
  $("resEval").textContent = r.filas.length * 2;
  $("resEstado").textContent = convergio ? "Convergió" : r.estado === "aviso" ? "Revisar" : "Detenido";
  $("resEstado").className = "dato-valor estado-" + r.estado;

  // Tabla de iteraciones
  const cuerpo = $("tablaCuerpo");
  cuerpo.replaceChildren();
  r.filas.forEach((fila) => {
    const tr = document.createElement("tr");
    [fmtX(fila.n === undefined ? "" : fila.n).replace(/\.0+$/, ""), fmtX(fila.x), fmtE(fila.fx), fmtX(fila.z),
      fmtE(fila.fz), fmtX(fila.xNuevo), fmtE(fila.error)].forEach((txt, i) => {
      const td = document.createElement("td");
      td.textContent = i === 0 ? String(fila.n) : txt;
      if (i === 5) td.className = "destacado";
      tr.appendChild(td);
    });
    tr.tabIndex = 0;
    tr.title = "Haz clic para ver el cálculo paso a paso";
    tr.addEventListener("click", () => mostrarDetalle(fila, tr));
    tr.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); mostrarDetalle(fila, tr); } });
    cuerpo.appendChild(tr);
  });
  $("tablaVacia").hidden = r.filas.length > 0;
  $("btnCSV").disabled = r.filas.length === 0;
  if (r.filas.length) mostrarDetalle(r.filas[r.filas.length - 1], cuerpo.lastElementChild);
  else $("detalle").innerHTML = "<p class='suave'>No se realizó ninguna iteración completa.</p>";

  try { dibujarFuncion(f, x0, r); } catch (e) { console.error(e); avisoGrafica("graficaFuncion"); }
  try { dibujarConvergencia(r); } catch (e) { console.error(e); avisoGrafica("graficaError"); }
}

function mostrarDetalle(fila, tr) {
  document.querySelectorAll("#tablaCuerpo tr").forEach((t) => t.classList.remove("seleccionada"));
  if (tr) tr.classList.add("seleccionada");
  const n = fila.n;
  $("detalle").innerHTML = `
    <h4>Iteración ${n + 1}</h4>
    <div class="paso"><span>x<sub>${n}</sub></span> = ${fmtX(fila.x)}</div>
    <div class="paso"><span>f(x<sub>${n}</sub>)</span> = ${fmtE(fila.fx)}</div>
    <div class="paso"><span>Punto auxiliar</span> z = x<sub>${n}</sub> + f(x<sub>${n}</sub>) = ${fmtX(fila.z)}</div>
    <div class="paso"><span>f(z)</span> = ${fmtE(fila.fz)}</div>
    <div class="paso"><span>Denominador</span> f(z) − f(x<sub>${n}</sub>) = ${fmtE(fila.den)}</div>
    <div class="formula-paso">
      <span>x<sub>${n + 1}</sub> = ${fmtX(fila.x)} −</span>
      <span class="frac"><span>(${fmtE(fila.fx)})²</span><span>${fmtE(fila.den)}</span></span>
      <span>= <strong>${fmtX(fila.xNuevo)}</strong></span>
    </div>
    <div class="paso"><span>Error</span> |x<sub>${n + 1}</sub> − x<sub>${n}</sub>| = ${fmtE(fila.error)}</div>`;
}

/* ---------------------------------------------------------
   5. Gráficas (Plotly)
   --------------------------------------------------------- */
function colores() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  return { texto: v("--texto"), suave: v("--texto-suave"), linea: v("--borde"),
    acento: v("--acento"), acento2: v("--acento-2"), raiz: v("--raiz"), fondo: v("--panel") };
}

function layoutBase(c, ejeX, ejeY) {
  return {
    margin: { l: 60, r: 20, t: 10, b: 50 },
    paper_bgcolor: c.fondo, plot_bgcolor: c.fondo,
    font: { family: "Inter, system-ui, sans-serif", color: c.texto, size: 12 },
    xaxis: { title: ejeX, gridcolor: c.linea, zerolinecolor: c.suave },
    yaxis: { title: ejeY, gridcolor: c.linea, zerolinecolor: c.suave },
    legend: { orientation: "h", y: -0.22 },
    hovermode: "closest",
  };
}

function avisoGrafica(id, texto) {
  if (window.Plotly) { try { Plotly.purge(id); } catch (e) { /* nada */ } }
  $(id).innerHTML = `<p class='suave grafica-aviso'>${texto || "No se pudo dibujar esta gráfica."}</p>`;
}

function plotlyListo(id) {
  if (window.Plotly) return true;
  avisoGrafica(id, "No se pudo cargar la librería de gráficas: se necesita conexión a internet. El cálculo y la tabla funcionan igual.");
  return false;
}

const finito = (v) => (Number.isFinite(v) ? v : null);

function dibujarFuncion(f, x0, r) {
  if (!plotlyListo("graficaFuncion")) return;
  const c = colores();
  const iterX = [x0, ...r.filas.map((fl) => fl.xNuevo)].filter(Number.isFinite);
  // Rango: alrededor de x0 y la raíz; si la sucesión se fue muy lejos, se usan solo los primeros puntos
  let puntos = iterX.filter((p) => Math.abs(p - x0) < 1e4 * Math.max(1, Math.abs(x0)));
  if (!puntos.length) puntos = [x0];
  let a = Math.min(...puntos), b = Math.max(...puntos);
  const ancho = Math.max(b - a, 1e-6 * Math.max(1, Math.abs(a)), 1);
  a -= ancho * 0.6; b += ancho * 0.6;

  const xs = [], ys = [];
  for (let i = 0; i <= 600; i++) {
    const x = a + ((b - a) * i) / 600;
    const y = f(x);
    xs.push(x); ys.push(Number.isFinite(y) ? y : null);
  }
  // Recorta el eje y para que una asíntota no aplaste la gráfica
  const validos = ys.filter((y) => y !== null).map(Math.abs).sort((p, q) => p - q);
  const lay = layoutBase(c, "x", "f(x)");
  if (validos.length > 10) {
    const tope = validos[Math.floor(validos.length * 0.95)] * 1.5 || 1;
    lay.yaxis.range = [-tope, tope];
    lay.yaxis.autorange = false;
    // si casi todo es positivo o negativo, se ajusta mejor el rango
    const yMin = Math.min(...ys.filter((y) => y !== null)), yMax = Math.max(...ys.filter((y) => y !== null));
    lay.yaxis.range = [Math.max(yMin, -tope) - 0.1 * tope, Math.min(yMax, tope) + 0.1 * tope];
    if (lay.yaxis.range[0] > 0) lay.yaxis.range[0] = -0.1 * tope;
    if (lay.yaxis.range[1] < 0) lay.yaxis.range[1] = 0.1 * tope;
  }

  const enRango = iterX.filter((p) => p >= a && p <= b);
  const trazas = [
    { x: xs, y: ys, mode: "lines", name: "f(x)", line: { color: c.acento, width: 2.5 }, connectgaps: false,
      hovertemplate: "x = %{x:.6f}<br>f(x) = %{y:.6g}<extra></extra>" },
    { x: enRango, y: enRango.map((p) => finito(f(p))), mode: "markers+text", name: "Aproximaciones xₙ",
      text: enRango.map((p) => (p === x0 ? "x₀" : "")), textposition: "top center",
      marker: { color: c.acento2, size: 9 },
      hovertemplate: "x = %{x:.9f}<extra></extra>" },
  ];
  if (r.estado === "ok" && Number.isFinite(r.raiz)) {
    trazas.push({ x: [r.raiz], y: [0], mode: "markers", name: "Raíz",
      marker: { color: c.raiz, size: 13, symbol: "diamond", line: { color: c.fondo, width: 2 } },
      hovertemplate: "Raíz ≈ %{x:.9f}<extra></extra>" });
  }
  Plotly.react("graficaFuncion", trazas, lay, { responsive: true, displaylogo: false });
}

function dibujarConvergencia(r) {
  if (!plotlyListo("graficaError")) return;
  if (!r.filas.length) { avisoGrafica("graficaError", "No hay iteraciones para graficar."); return; }
  const c = colores();
  const it = r.filas.map((fl) => fl.n + 1);
  const log = (v) => (Number.isFinite(v) && v > 0 ? Math.log10(v) : null);
  const trazas = [
    { x: it, y: r.filas.map((fl) => log(fl.error)), mode: "lines+markers",
      name: "log₁₀ |xₙ₊₁ − xₙ|", line: { color: c.acento, width: 2.5 }, marker: { size: 8 } },
    { x: it, y: r.filas.map((fl) => log(Math.abs(fl.fxNuevo))), mode: "lines+markers",
      name: "log₁₀ |f(xₙ₊₁)|", line: { color: c.acento2, width: 2.5, dash: "dash" }, marker: { size: 8 } },
  ];
  const lay = layoutBase(c, "Iteración", "log₁₀(error)");
  if (it.length <= 20) lay.xaxis.dtick = 1;
  Plotly.react("graficaError", trazas, lay, { responsive: true, displaylogo: false });
}

/* ---------------------------------------------------------
   6. Ejemplos y eventos
   --------------------------------------------------------- */
const EJEMPLOS = [
  { f: "exp(-x) - x", x0: "0.5", nota: "Ejercicio del informe" },
  { f: "x^3 - x - 2", x0: "1.5", nota: "Polinomio" },
  { f: "cos(x) - x", x0: "0.7", nota: "Trigonométrica" },
  { f: "sin(x) - 0.5", x0: "0.5", nota: "Raíz en π/6" },
  { f: "x^2 - 2", x0: "1.5", nota: "Raíz de 2" },
  { f: "ln(x) + x - 2", x0: "1.5", nota: "Logaritmo" },
  { f: "(x - 1)^2", x0: "3", nota: "Raíz doble (lenta)" },
  { f: "x^2 + 1", x0: "1", nota: "Sin raíz real" },
];

function cargarEjemplos() {
  const cont = $("ejemplos");
  EJEMPLOS.forEach((ej) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    const code = document.createElement("code"); code.textContent = ej.f;
    const small = document.createElement("small"); small.textContent = ej.nota;
    b.append(code, small);
    b.addEventListener("click", () => {
      $("funcion").value = ej.f;
      $("x0").value = ej.x0;
      mostrarInterpretacion();
      calcular();
    });
    cont.appendChild(b);
  });
}

function exportarCSV() {
  const filas = [["n", "x_n", "f(x_n)", "z", "f(z)", "x_n+1", "error"]];
  document.querySelectorAll("#tablaCuerpo tr").forEach((tr) =>
    filas.push([...tr.children].map((td) => td.textContent)));
  if (filas.length === 1) return;
  const csv = "﻿" + filas.map((f) => f.join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "iteraciones_steffensen.csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  cargarEjemplos();
  $("formulario").addEventListener("submit", calcular);
  $("btnCSV").addEventListener("click", exportarCSV);
  $("funcion").addEventListener("input", mostrarInterpretacion);
  $("btnLimpiar").addEventListener("click", () => {
    $("formulario").reset();
    $("resultados").hidden = true;
    mostrarMensaje("", "");
    mostrarInterpretacion();
  });
  // Redibujar las gráficas si cambia el tema claro/oscuro
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!$("resultados").hidden) calcular();
    });
  } catch (e) { /* navegador antiguo: no pasa nada */ }
  mostrarInterpretacion();
  calcular(); // muestra el ejemplo del informe al abrir
});

// Para pruebas con Node.js
if (typeof module !== "undefined") module.exports = { crearFuncion, steffensen, leerValor, fmtX, fmtE };
