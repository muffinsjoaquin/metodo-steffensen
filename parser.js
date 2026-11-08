/* =========================================================
   Analizador de funciones matemáticas f(x)
   ---------------------------------------------------------
   Convierte el texto que escribe el usuario en una función de
   JavaScript sin usar eval: lee el texto símbolo por símbolo,
   construye un árbol con la expresión y lo evalúa.

   Reglas:
   - Operadores + - * / ^ con la prioridad usual. ^ asocia por la
     derecha (2^3^2 = 2^9) y -x^2 = -(x^2).
   - Multiplicación implícita: 2x, 3(x+1), (x+1)(x-1), 2sin(x), x(x+1).
   - Funciones de una lista cerrada; constantes pi y e.
   - Acepta sintaxis JavaScript: Math.exp(-x), x**2.
   ========================================================= */

"use strict";

const LARGO_MAXIMO = 300;

const FUNCIONES = {
  sin: [Math.sin, 1], cos: [Math.cos, 1], tan: [Math.tan, 1],
  asin: [Math.asin, 1], acos: [Math.acos, 1], atan: [Math.atan, 1],
  sinh: [Math.sinh, 1], cosh: [Math.cosh, 1], tanh: [Math.tanh, 1],
  asinh: [Math.asinh, 1], acosh: [Math.acosh, 1], atanh: [Math.atanh, 1],
  sec: [(t) => 1 / Math.cos(t), 1], csc: [(t) => 1 / Math.sin(t), 1], cot: [(t) => 1 / Math.tan(t), 1],
  exp: [Math.exp, 1], ln: [Math.log, 1], log: [Math.log, 1], log10: [Math.log10, 1], log2: [Math.log2, 1],
  sqrt: [Math.sqrt, 1], cbrt: [Math.cbrt, 1], abs: [Math.abs, 1], sign: [Math.sign, 1],
  floor: [Math.floor, 1], ceil: [Math.ceil, 1], round: [Math.round, 1],
  pow: [Math.pow, 2], atan2: [Math.atan2, 2],
  min: [Math.min, -1], max: [Math.max, -1], hypot: [Math.hypot, -1],   // -1 = varios argumentos
};
const SINONIMOS = {
  sen: "sin", tg: "tan", arcsen: "asin", arcsin: "asin", arccos: "acos", arctan: "atan",
  arctg: "atan", senh: "sinh", raiz: "sqrt", ctg: "cot", cotg: "cot", cosec: "csc",
};
const CONSTANTES = { pi: Math.PI, e: Math.E };

// Palabras conocidas, de la más larga a la más corta (para separar "xsin" -> x · sin)
const PALABRAS = [...Object.keys(FUNCIONES), ...Object.keys(SINONIMOS), ...Object.keys(CONSTANTES), "x"]
  .sort((a, b) => b.length - a.length);

class ErrorFuncion extends Error {}
const falla = (msg) => { throw new ErrorFuncion(msg); };

/* ---------- 1. Limpieza del texto ---------- */
function normalizar(texto) {
  if (typeof texto !== "string") falla("Escribe una función f(x).");
  let t = texto.trim();
  if (t === "") falla("Escribe una función f(x).");
  if (t.length > LARGO_MAXIMO) falla(`La función es demasiado larga (máximo ${LARGO_MAXIMO} caracteres).`);

  t = t
    .replace(/[−–—]/g, "-").replace(/[×·∙]/g, "*").replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/√\s*(\d+\.?\d*|\.\d+|[a-zA-Z]+)/g, "sqrt($1)").replace(/√/g, "sqrt")
    .replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/[   \t\r\n]/g, " ")
    .replace(/[{[]/g, "(").replace(/[}\]]/g, ")")
    .replace(/math\./gi, "")
    .replace(/\*\*/g, "^")
    .toLowerCase();

  // "f(x) = ..." o "y = ..." al inicio; "... = 0" al final; "a = b" -> (a) - (b)
  t = t.replace(/^\s*(f\s*\(\s*x\s*\)|y)\s*=/, "");
  const partes = t.split("=");
  if (partes.length > 2) falla("La función tiene más de un signo \"=\".");
  if (partes.length === 2) {
    const izq = partes[0].trim(), der = partes[1].trim();
    if (izq === "") falla("Falta la expresión antes del signo \"=\".");
    t = der === "" || /^0*\.?0*$/.test(der) ? izq : `(${izq})-(${der})`;
  }
  if (t.trim() === "") falla("Escribe una función f(x).");
  return t;
}

/* ---------- 2. Separación en símbolos ---------- */
function separar(t) {
  const simbolos = [];
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    if (c === " ") { i++; continue; }

    // Número: 12  3.5  .5  1e-6
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(t.slice(i));
    if (num) {
      if (/^\d*\.\d*\./.test(t.slice(i))) falla(`El número "${t.slice(i).match(/^[\d.]+/)[0]}" tiene más de un punto decimal.`);
      simbolos.push({ tipo: "num", valor: Number(num[0]), texto: num[0] });
      i += num[0].length;
      continue;
    }
    // Palabras: se separan en piezas conocidas (log10, sin, x, pi, e, ...)
    const pal = /^[a-z_]+/.exec(t.slice(i));
    if (pal) {
      let palabra = pal[0];
      // log10, log2 y atan2 llevan dígitos en el nombre; en otros casos (x2) el número va aparte
      const conDigitos = /^[a-z_]+\d+/.exec(t.slice(i));
      if (conDigitos && conDigitos[0] in FUNCIONES) palabra = conDigitos[0];
      for (const pieza of partirPalabra(palabra)) {
        const nombre = SINONIMOS[pieza] || pieza;
        if (nombre === "x") simbolos.push({ tipo: "x", texto: "x" });
        else if (nombre in CONSTANTES) simbolos.push({ tipo: "const", nombre, texto: nombre });
        else simbolos.push({ tipo: "func", nombre, texto: nombre });
      }
      i += palabra.length;
      continue;
    }
    if ("+-*/^(),".includes(c)) { simbolos.push({ tipo: c, texto: c }); i++; continue; }
    if (c === "|") falla("Para el valor absoluto usa abs(x) en lugar de |x|.");
    if (c === ";") falla("Usa coma (,) para separar los argumentos de una función, por ejemplo pow(x, 2).");
    falla(`El símbolo "${c}" no está permitido en la función.`);
  }
  return simbolos;
}

function partirPalabra(palabra) {
  if (PALABRAS.includes(palabra)) return [palabra];
  const piezas = [];
  let resto = palabra;
  while (resto.length) {
    const p = PALABRAS.find((w) => resto.startsWith(w));
    if (!p) {
      falla(`No se reconoce "${palabra}". Funciones válidas: sin, cos, tan, exp, ln, log10, sqrt, abs, … (usa x como variable).`);
    }
    piezas.push(p);
    resto = resto.slice(p.length);
  }
  return piezas;
}

/* ---------- 3. Análisis (descenso recursivo) ---------- */
function analizar(simbolos) {
  let pos = 0;
  const actual = () => simbolos[pos];
  const descripcion = (s) => (s ? `"${s.texto}"` : "el final");
  const iniciaFactor = (s) => s && (s.tipo === "num" || s.tipo === "x" || s.tipo === "const" || s.tipo === "func" || s.tipo === "(");

  function expresion() {
    let nodo = termino();
    while (actual() && (actual().tipo === "+" || actual().tipo === "-")) {
      const op = simbolos[pos++].tipo;
      if (!actual()) falla(`Falta un término después de "${op}".`);
      nodo = { op, a: nodo, b: termino() };
    }
    return nodo;
  }
  function termino() {
    let nodo = unario();
    for (;;) {
      const s = actual();
      if (s && (s.tipo === "*" || s.tipo === "/")) {
        pos++;
        if (!actual()) falla(`Falta un factor después de "${s.tipo}".`);
        nodo = { op: s.tipo, a: nodo, b: unario() };
      } else if (iniciaFactor(s)) {
        const previo = simbolos[pos - 1];
        if (s.tipo === "num" && previo && previo.tipo === "num") {
          falla(`Falta un operador entre ${previo.texto} y ${s.texto}.`);
        }
        nodo = { op: "*", a: nodo, b: unario() };          // multiplicación implícita
      } else return nodo;
    }
  }
  function unario() {
    const s = actual();
    if (s && (s.tipo === "-" || s.tipo === "+")) {
      pos++;
      if (!actual()) falla(`Falta un número o x después de "${s.tipo}".`);
      const arg = unario();
      return s.tipo === "-" ? { op: "neg", a: arg } : arg;
    }
    return potencia();
  }
  function potencia() {
    const base = primario();
    if (actual() && actual().tipo === "^") {
      pos++;
      if (!actual()) falla("Falta el exponente después de \"^\".");
      return { op: "^", a: base, b: unario() };              // asocia por la derecha
    }
    return base;
  }
  function primario() {
    const s = actual();
    if (!s) falla("La función termina de forma incompleta.");
    if (s.tipo === "num") { pos++; return { op: "num", valor: s.valor }; }
    if (s.tipo === "x") { pos++; return { op: "x" }; }
    if (s.tipo === "const") { pos++; return { op: "num", valor: CONSTANTES[s.nombre], nombre: s.nombre }; }
    if (s.tipo === "func") {
      pos++;
      if (!actual() || actual().tipo !== "(") falla(`"${s.nombre}" necesita paréntesis: escribe ${s.nombre}(x).`);
      pos++;
      const args = [];
      if (actual() && actual().tipo === ")") falla(`"${s.nombre}()" está vacío: falta lo que va dentro del paréntesis.`);
      args.push(expresion());
      while (actual() && actual().tipo === ",") { pos++; args.push(expresion()); }
      if (!actual() || actual().tipo !== ")") falla(`Falta cerrar el paréntesis de ${s.nombre}(…).`);
      pos++;
      const aridad = FUNCIONES[s.nombre][1];
      if (aridad !== -1 && args.length !== aridad) {
        falla(aridad === 1
          ? `${s.nombre} recibe un solo valor; si quisiste escribir un decimal usa punto (0.5), no coma.`
          : `${s.nombre} necesita ${aridad} valores separados por coma, por ejemplo ${s.nombre}(x, 2).`);
      }
      return { op: "func", nombre: s.nombre, args };
    }
    if (s.tipo === "(") {
      pos++;
      if (actual() && actual().tipo === ")") falla("Hay paréntesis vacíos \"()\".");
      const nodo = expresion();
      if (!actual() || actual().tipo !== ")") falla("Falta cerrar un paréntesis \")\".");
      pos++;
      return nodo;
    }
    if (s.tipo === ")") falla("Hay un paréntesis \")\" de más o falta algo antes de él.");
    if (s.tipo === ",") falla("Usa punto para los decimales (0.5, no 0,5). La coma solo separa argumentos, como en pow(x, 2).");
    falla(`Falta un número o x antes de ${descripcion(s)}.`);
  }

  const arbol = expresion();
  if (pos < simbolos.length) {
    const s = actual();
    if (s.tipo === ")") falla("Hay un paréntesis \")\" de más.");
    if (s.tipo === ",") falla("Usa punto para los decimales (0.5, no 0,5). La coma solo separa argumentos, como en pow(x, 2).");
    falla(`No se esperaba ${descripcion(s)} en esa posición.`);
  }
  return arbol;
}

/* ---------- 4. Evaluación ---------- */
function compilar(n) {
  switch (n.op) {
    case "num": { const v = n.valor; return () => v; }
    case "x": return (x) => x;
    case "neg": { const a = compilar(n.a); return (x) => -a(x); }
    case "+": { const a = compilar(n.a), b = compilar(n.b); return (x) => a(x) + b(x); }
    case "-": { const a = compilar(n.a), b = compilar(n.b); return (x) => a(x) - b(x); }
    case "*": { const a = compilar(n.a), b = compilar(n.b); return (x) => a(x) * b(x); }
    case "/": { const a = compilar(n.a), b = compilar(n.b); return (x) => a(x) / b(x); }
    case "^": { const a = compilar(n.a), b = compilar(n.b); return (x) => potenciaReal(a(x), b(x)); }
    case "func": {
      const fn = FUNCIONES[n.nombre][0];
      const args = n.args.map(compilar);
      if (args.length === 1) { const a = args[0]; return (x) => fn(a(x)); }
      return (x) => fn(...args.map((g) => g(x)));
    }
  }
  falla("Error interno al leer la función.");
}

// Potencia con base negativa y exponente fraccionario de denominador impar: (-8)^(1/3) = -2
function potenciaReal(b, p) {
  const r = Math.pow(b, p);
  if (Number.isNaN(r) && b < 0 && Number.isFinite(p)) {
    for (const q of [3, 5, 7, 9]) {
      const k = p * q;
      if (Math.abs(k - Math.round(k)) < 1e-12) {
        const signo = Math.round(k) % 2 === 0 ? 1 : -1;
        return signo * Math.pow(-b, p);
      }
    }
  }
  return r;
}

/* ---------- 5. Texto legible de la expresión interpretada ---------- */
const PRIORIDAD = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4 };
function aTexto(n, padre = 0, lado = "") {
  let s, p;
  switch (n.op) {
    case "num": return n.nombre || formatoNumero(n.valor);
    case "x": return "x";
    case "func": return `${n.nombre}(${n.args.map((a) => aTexto(a)).join(", ")})`;
    case "neg": p = PRIORIDAD.neg; s = "-" + aTexto(n.a, p, "der"); break;
    case "^": p = PRIORIDAD["^"]; s = `${aTexto(n.a, p + 1)}^${aTexto(n.b, p, "der")}`; break;
    default: {
      p = PRIORIDAD[n.op];
      const sep = n.op === "*" ? "*" : ` ${n.op} `;
      s = aTexto(n.a, p) + sep + aTexto(n.b, p + (n.op === "-" || n.op === "/" ? 1 : 0), "der");
    }
  }
  return p < padre || (p === padre && lado === "der" && n.op !== "neg" && n.op !== "^") ? `(${s})` : s;
}
function formatoNumero(v) {
  return Number.isInteger(v) || Math.abs(v) >= 1e-4 ? String(v) : v.toExponential();
}

/* ---------- 6. Función principal ---------- */
function crearFuncion(texto) {
  const arbol = analizar(separar(normalizar(texto)));
  const g = compilar(arbol);
  const f = (x) => {
    const y = g(x);
    return typeof y === "number" ? y : NaN;
  };
  f.texto = aTexto(arbol);
  f.usaX = JSON.stringify(arbol).includes('"op":"x"');
  return f;
}

if (typeof module !== "undefined") module.exports = { crearFuncion, ErrorFuncion };
