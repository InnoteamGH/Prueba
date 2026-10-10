/**
 * Resolución segura de estados del odontograma (E5-C / A-54).
 * Nunca devolver undefined: estado desconocido → visible + registrado.
 */

import { ESTADOS_ODO } from "./odontogramaCatalogo.js";

/** IDs que llegan del HTML anatómico / API y no coinciden 1:1 con ESTADOS_ODO. */
export const ALIAS_ESTADO_UI = {
  extraccion: "extraer",
  extraccion_indicada: "extraer",
  coronaT: "corona",
  corona_temp: "corona",
  fractR: "fractura",
  fractura_radicular: "fractura_radicular",
  absceso: "absceso_periapical",
  lesion: "lesion_periapical",
  reabsorcion: "reabsorcion_radicular",
  restauracion: "obturado",
  obturacion: "obturado",
  endo: "endodoncia",
  pulpotomia: "endodoncia",
  movilidad: "movilidad1",
  mov1: "movilidad1",
  mov2: "movilidad2",
  mov3: "movilidad3",
};

/** Hallazgos de raíz y otros del CAT maqueta no listados aún en ESTADOS_ODO. */
export const ESTADOS_EXTRA = {
  absceso_periapical: {
    l: "Absceso periapical",
    color: "var(--dc-red-alt)",
    borde: "var(--dc-danger-700)",
    porCara: false,
    ambito: "raiz",
    c: "var(--dc-danger)",
    pat: "solid",
  },
  fractura_radicular: {
    l: "Fractura radicular",
    color: "var(--dc-red-alt)",
    borde: "var(--dc-danger-700)",
    porCara: false,
    ambito: "raiz",
    c: "var(--dc-danger)",
    pat: "slash",
  },
  reabsorcion_radicular: {
    l: "Reabsorción radicular",
    color: "var(--dc-red-alt)",
    borde: "var(--dc-danger-700)",
    porCara: false,
    ambito: "raiz",
    c: "var(--dc-danger)",
    pat: "solid",
  },
  lesion_periapical: {
    l: "Lesión periapical",
    color: "var(--dc-red-alt)",
    borde: "var(--dc-danger-700)",
    porCara: false,
    ambito: "raiz",
    c: "var(--dc-danger)",
    pat: "solid",
  },
  sano: { l: "Sano", color: "#fff", borde: "var(--dc-ink-400)", porCara: false, c: "#fff", pat: "solid" },
};

const DESCONOCIDO = {
  l: "Estado no reconocido",
  color: "var(--dc-ink-200)",
  borde: "var(--dc-ink-400)",
  porCara: false,
  c: "var(--dc-ink-400)",
  pat: "solid",
  desconocido: true,
};

const vistosDesconocidos = new Set();

export function catalogoEstadosCompleto() {
  return { ...ESTADOS_EXTRA, ...ESTADOS_ODO };
}

/**
 * @param {string|null|undefined} raw
 * @returns {{ id: string, meta: object, desconocido: boolean }}
 */
export function resolverEstadoUi(raw) {
  const id0 = raw == null ? "" : String(raw).trim();
  if (!id0 || id0 === "sano") {
    return { id: "sano", meta: ESTADOS_EXTRA.sano, desconocido: false };
  }
  const cat = catalogoEstadosCompleto();
  const aliased = ALIAS_ESTADO_UI[id0] || id0;
  if (cat[aliased]) {
    return { id: aliased, meta: cat[aliased], desconocido: false };
  }
  if (cat[id0]) {
    return { id: id0, meta: cat[id0], desconocido: false };
  }
  if (!vistosDesconocidos.has(id0)) {
    vistosDesconocidos.add(id0);
    try {
      console.warn("[odontograma] estado no reconocido:", id0);
    } catch { /* */ }
  }
  return {
    id: id0,
    meta: { ...DESCONOCIDO, l: `Estado no reconocido (${id0})` },
    desconocido: true,
  };
}

/** Acceso seguro a color/borde/label — nunca undefined. */
export function metaEstado(raw) {
  return resolverEstadoUi(raw).meta;
}

export function colorEstado(raw) {
  return metaEstado(raw).color;
}

export function labelEstado(raw) {
  return metaEstado(raw).l;
}

/** Inicial de cara para lista del paciente (E5-A.6). */
export function inicialCara(pieza, caraOAmbito) {
  const c = String(caraOAmbito || "").trim();
  if (!c || c === "pieza" || /^toda/i.test(c)) return "";
  if (/^ra[ií]z/i.test(c) || c === "raiz" || c === "R") return "R";
  const map = {
    Vestibular: "V", vestibular: "V", V: "V", top: "V",
    Palatino: "P", palatino: "P", Palatina: "P", P: "P",
    Lingual: "L", lingual: "L", L: "L", bottom: "L",
    Mesial: "M", mesial: "M", M: "M", left: "M",
    Distal: "D", distal: "D", D: "D", right: "D",
    Oclusal: "O", oclusal: "O", O: "O", center: "O",
    Incisal: "I", incisal: "I", I: "I",
  };
  if (map[c]) return map[c];
  const first = c.charAt(0).toUpperCase();
  return /[VPLMDOI]/.test(first) ? first : "";
}
