/**
 * API rows ↔ estado del HTML anatómico de referencia.
 */
/* M4-04: el servidor guarda los mapas anidados de estadosCara (_colores, _coloresRaiz, _piezas,
   raices) con el texto de Java (Map.toString), p. ej. "{O=a, V=r}" o "[{h=extraccion, c=a}]",
   en vez de JSON. Sin leerlo, «Buen estado» volvía como «por hacer» al recargar. Se lee ese
   formato (y JSON) para no perder el color mientras el backend no lo corrija. */
export function leerAnidado(v) {
  if (v == null || typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { /* no es JSON: texto de Java */ }
  let i = 0;
  const esp = () => { while (i < s.length && s[i] === " ") i++; };
  const valor = () => {
    esp();
    if (s[i] === "{") return mapa();
    if (s[i] === "[") return lista();
    let j = i;
    while (j < s.length && s[j] !== "," && s[j] !== "}" && s[j] !== "]") j++;
    const tok = s.slice(i, j).trim(); i = j;
    return tok === "null" ? null : tok;
  };
  const mapa = () => {
    const o = {}; i++; esp();
    while (i < s.length && s[i] !== "}") {
      const eq = s.indexOf("=", i); if (eq < 0) break;
      const k = s.slice(i, eq).trim(); i = eq + 1;
      o[k] = valor(); esp();
      if (s[i] === ",") { i++; esp(); }
    }
    i++; return o;
  };
  const lista = () => {
    const a = []; i++; esp();
    while (i < s.length && s[i] !== "]") { a.push(valor()); esp(); if (s[i] === ",") { i++; esp(); } }
    i++; return a;
  };
  try { return s[0] === "{" || s[0] === "[" ? valor() : v; } catch { return undefined; }
}

export function apiRowsAHtmlDatos(rows = []) {
  const datos = {};
  for (const r of rows || []) {
    const n = r.numeroPieza != null ? r.numeroPieza : r.pieza;
    if (n == null) continue;
    const pz = String(n);
    let carasRaw = r.estadosCara != null ? r.estadosCara : r.caras;
    if (typeof carasRaw === "string") {
      try { carasRaw = JSON.parse(carasRaw || "{}") || {}; } catch { carasRaw = {}; }
    }
    carasRaw = { ...(carasRaw || {}) };
    ["_colores", "_coloresRaiz", "_piezas", "raices"].forEach((k) => { if (typeof carasRaw[k] === "string") carasRaw[k] = leerAnidado(carasRaw[k]); });
    const colores = (carasRaw._colores && typeof carasRaw._colores === "object") ? carasRaw._colores : {};
    const coloresRaiz = (carasRaw._coloresRaiz && typeof carasRaw._coloresRaiz === "object") ? carasRaw._coloresRaiz : {};
    const caras = {};
    const raices = {};
    let pieza = [];
    for (const [k, v] of Object.entries(carasRaw)) {
      if (k === "raices" && v && typeof v === "object") {
        for (const [idx, h] of Object.entries(v)) {
          if (h) raices[String(idx)] = { h: String(h), c: coloresRaiz[idx] || "r" };
        }
        continue;
      }
      if (k === "hallazgos" || k.startsWith("_")) continue;
      if (v) caras[k] = { h: String(v), c: colores[k] || "r" };
    }
    // Marcas de pieza completa: la lista con su color; en registros antiguos, _pieza y estadoPieza.
    if (Array.isArray(carasRaw._piezas) && carasRaw._piezas.length) {
      pieza = carasRaw._piezas.filter((m) => m && m.h).map((m) => ({ h: String(m.h), c: m.c || "r" }));
    } else {
      if (carasRaw._pieza) pieza.push({ h: String(carasRaw._pieza), c: "r" });
      if (r.estadoPieza) {
        const h = String(r.estadoPieza);
        const hh = h === "extraer" ? "extraccion" : h;
        // El registro antiguo guardaba la misma marca en _pieza y en estadoPieza: una sola vez.
        if (!pieza.some((m) => m.h === hh || (m.h === "extraer" && hh === "extraccion"))) pieza.push({ h: hh, c: "r" });
      }
    }
    datos[pz] = { caras, raices, pieza, nota: r.nota || "" };
  }
  return datos;
}

export function tomaHashDeRows(rows = []) {
  const norm = (rows || [])
    .map((r) => ({
      n: r.numeroPieza ?? r.pieza,
      e: r.estadoPieza || "",
      c: typeof r.estadosCara === "string" ? r.estadosCara : JSON.stringify(r.estadosCara || {}),
      nota: r.nota || "",
    }))
    .sort((a, b) => Number(a.n) - Number(b.n));
  return simpleHash(JSON.stringify(norm));
}

function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `t${(h >>> 0).toString(16)}`;
}
