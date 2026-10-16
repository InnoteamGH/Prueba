/* Hallazgos del odontograma en lenguaje clínico.
   Una pieza guarda sus marcas en tres sitios: caras (estadosCara), raíces (estadosCara.raices)
   y pieza completa (estadosCara._piezas; en registros antiguos _pieza y estadoPieza), cada
   una con su color: rojo = patológico o por hacer, azul = en buen estado o ya realizado.
   Antes los resúmenes (Evolución visual, PDF de la historia clínica) solo contaban
   estadoPieza e imprimían las claves internas («_pieza: corona», «Oclusal: restaur»). */
import { apiRowsAHtmlDatos } from "./odontogramaHydrate.js";
import { resolverEstadoUi } from "./odontogramaEstado.js";

/* Mismos nombres que el catálogo del odontograma anatómico (CAT del iframe). */
export const NOMBRE_HALLAZGO = {
  caries: "Caries", restaur: "Restauración", sellante: "Sellante", dde: "Defecto del esmalte",
  corona: "Corona", coronaT: "Corona temporal", protFija: "Prótesis fija", protRem: "Prótesis removible",
  implante: "Implante", espigo: "Espigo o muñón", ausente: "Diente ausente", extraccion: "Extracción indicada",
  extraer: "Extracción indicada", rr: "Remanente radicular", fractura: "Fractura", endodoncia: "Endodoncia",
  pulpotomia: "Pulpotomía", movilidad: "Movilidad", giro: "Giroversión", migracion: "Migración",
  erupcion: "Pieza en erupción", impact: "Impactación", supernum: "Supernumerario", macro: "Macrodoncia",
  micro: "Microdoncia", gemin: "Geminación o fusión", diastema: "Diastema", transpos: "Transposición",
  intrusion: "Intrusión", extrusion: "Extrusión", absceso: "Absceso periapical", fractR: "Fractura radicular",
  reabs: "Reabsorción radicular", periapic: "Lesión periapical",
};

export function nombreHallazgo(id) {
  const k = String(id || "").trim();
  if (!k) return "";
  if (NOMBRE_HALLAZGO[k]) return NOMBRE_HALLAZGO[k];
  const r = resolverEstadoUi(k);
  if (!r.desconocido && r.meta?.l) return r.meta.l;
  const t = k.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const sup = (n) => [1, 2, 5, 6].includes(Math.floor(Number(n) / 10));
const ant = (n) => { const d = Number(n) % 10; return d >= 1 && d <= 3; };
export function nombreCara(pieza, k) {
  const c = String(k || "");
  const m = { O: "Oclusal", I: "Incisal", V: "Vestibular", L: "Lingual", P: "Palatina", M: "Mesial", D: "Distal",
    top: "Vestibular", left: "Mesial", right: "Distal" };
  if (c === "center") return ant(pieza) ? "Incisal" : "Oclusal";
  if (c === "bottom") return sup(pieza) ? "Palatina" : "Lingual";
  return m[c] || c;
}

/* Filas del servidor o de ficha360 (pieza/estado/caras) → datos del odontograma. */
export function filasADatos(rows = []) {
  return apiRowsAHtmlDatos((rows || []).map((r) => ({
    ...r,
    numeroPieza: r.numeroPieza != null ? r.numeroPieza : r.pieza,
    estadoPieza: r.estadoPieza !== undefined ? r.estadoPieza : r.estado,
    estadosCara: r.estadosCara != null ? r.estadosCara : r.caras,
  })));
}

const ordenFdi = (n) => { const x = Number(n), q = Math.floor(x / 10); return q * 100 + ([1, 4, 5, 8].includes(q) ? 10 - (x % 10) : x % 10); };

/* Lista ordenada por cuadrante y pieza: { pieza, zona, codigo, nombre, hecho }. */
export function listaHallazgos(datos = {}) {
  let rojo = 0, azul = 0; const lista = [];
  Object.entries(datos || {}).forEach(([pieza, e]) => {
    if (!e) return;
    const add = (zona, d) => {
      if (!d || !d.h) return;
      const hecho = d.c === "a";
      if (hecho) azul++; else rojo++;
      lista.push({ pieza, zona, codigo: d.h, nombre: nombreHallazgo(d.h), hecho });
    };
    Object.entries(e.caras || {}).forEach(([c, d]) => { if (!String(c).startsWith("_")) add(`Cara ${nombreCara(pieza, c).toLowerCase()}`, d); });
    Object.entries(e.raices || {}).forEach(([c, d]) => add(`Raíz ${Number(c) + 1}`, d));
    (e.pieza || []).forEach((d) => add("Toda la pieza", d));
  });
  lista.sort((a, b) => ordenFdi(a.pieza) - ordenFdi(b.pieza));
  return { rojo, azul, total: rojo + azul, piezas: new Set(lista.map((x) => x.pieza)).size, lista };
}
