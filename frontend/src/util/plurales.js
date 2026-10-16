/* R7-09: textos del servidor con plurales a medias («2 sede(s)», «6 doctor(es)», «22 servicio(s)»,
   «28 bloque(s)», «0 plantilla(s)») en Configuración › Puesta en marcha. Se escriben en pantalla
   con el número que los acompaña: «1 sede», «2 sedes», «0 plantillas», «6 doctores».
   R8-05: el singular del rótulo de las tablas y listas («1 proveedor», no «1 proveedore»).
   Sin imports: lo usan Configuracion.jsx, comun.jsx y node --test. */

const LETRA = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const PALABRA_PAR = new RegExp(`([${LETRA}]+)\\((es|s)\\)`, "g");
const NUMERO = /\d+(?:[.,]\d+)?/g;

const numDe = (txt) => Number(String(txt).replace(",", "."));

/**
 * Cambia cada «palabra(s)» o «palabra(es)» por su singular o su plural según el número más
 * cercano que la precede en el texto (en español, 1 es singular; 0 y los demás, plural). Sin
 * número antes, queda en plural.
 */
export function pluralizarParentesis(texto) {
  if (texto == null) return texto;
  const s = String(texto);
  if (!/\((?:es|s)\)/.test(s)) return s;
  return s.replace(PALABRA_PAR, (todo, palabra, sufijo, pos) => {
    const antes = s.slice(0, pos).match(NUMERO);
    const n = antes ? numDe(antes[antes.length - 1]) : null;
    return n === 1 ? palabra : palabra + sufijo;
  });
}

/* ── Singular de un rótulo en plural (R8-05) ─────────────────────────────────────────────── */
/* La tabla de Proveedores decía «1 proveedore»: el rótulo se pasaba a singular quitando la «s»
   final. Ahora se siguen las reglas del español: «-es» tras consonante (proveedor, doctor,
   unidad, plan), «-ones» → «-ón», «-ces» → «-z», más las palabras que no cambian o cambian
   de acento. */

// Plurales que las reglas no resuelven (acento que se va o que cambia, o «-es» de una palabra en «-e»).
const IRREGULARES = {
  sedes: "sede", órdenes: "orden", imágenes: "imagen", exámenes: "examen", márgenes: "margen",
  orígenes: "origen", volúmenes: "volumen", jóvenes: "joven", resúmenes: "resumen", meses: "mes",
  países: "país", intereses: "interés", ingleses: "inglés", franceses: "francés", reveses: "revés",
  // Determinantes de la frase («las citas de hoy» → «la cita de hoy»).
  los: "el", las: "la", unos: "un", unas: "una", estos: "este", estas: "esta", esos: "ese", esas: "esa",
  mis: "mi", tus: "tu", sus: "su", nuestros: "nuestro", nuestras: "nuestra",
};
// Iguales en singular y en plural.
const INVARIABLES = new Set(["caries", "lunes", "martes", "miércoles", "jueves", "viernes", "tórax", "fórceps", "bíceps", "tríceps"]);
// Palabras que cortan la frase: lo que sigue no concuerda con el número («citas de tus pacientes»).
const CORTE = new Set(["de", "del", "con", "en", "a", "al", "por", "para", "sin", "que", "y", "e", "o", "u", "entre", "sobre", "hasta", "desde", "según", "tras", "–", "-", "·"]);

const VOCAL = "aeiouáéíóú";
const VOCAL_CES = new RegExp(`[${VOCAL}]ces$`);
const VOCAL_CONS_ES = new RegExp(`[${VOCAL}][rlndy]es$`);

/** Singular de una palabra en plural. Lo que no termina en «s» (o no cambia) queda igual. */
export function singular(palabra) {
  const p = String(palabra ?? "");
  const w = p.toLowerCase();
  if (!w || !w.endsWith("s")) return p;
  const conCaso = (s) => (p[0] !== p[0].toLowerCase() ? s[0].toUpperCase() + s.slice(1) : s);
  if (IRREGULARES[w]) return conCaso(IRREGULARES[w]);
  if (INVARIABLES.has(w) || /(?:sis|tis|xis)$/.test(w) || /[^ú]us$/.test(w)) return p;
  let r;
  if (/iones$/.test(w)) r = w.replace(/iones$/, "ión");           // atenciones → atención
  else if (VOCAL_CES.test(w)) r = w.replace(/ces$/, "z");          // veces → vez, lápices → lápiz
  else if (/ones$/.test(w)) r = w.replace(/ones$/, "ón");          // sillones → sillón
  else if (/ines$/.test(w)) r = w.replace(/ines$/, "ín");          // boletines → boletín
  else if (VOCAL_CONS_ES.test(w)) r = w.replace(/es$/, "");        // proveedores → proveedor, planes → plan
  else r = w.slice(0, -1);                                         // citas → cita, pacientes → paciente
  return conCaso(r);
}

/**
 * Rótulo de una cantidad: «1 proveedor», «2 proveedores», «1 cita pendiente». En plural (0, 2…)
 * queda tal cual; en singular (1) se cambian las palabras de la frase hasta la primera que no
 * concuerda con el número («de», «con», «en»… o una que no está en plural). Sin rótulo,
 * «registro» o «registros».
 */
export function etiquetaCantidad(n, sub) {
  if (!sub) return n === 1 ? "registro" : "registros";
  if (n !== 1) return sub;
  const partes = String(sub).split(" ");
  for (let i = 0; i < partes.length; i++) {
    const w = partes[i];
    if (CORTE.has(w.toLowerCase()) || (i > 0 && !/s$/i.test(w))) break;
    partes[i] = singular(w);
  }
  return partes.join(" ");
}
