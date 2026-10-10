/**
 * Catálogo único odontograma (NAV-06 / ODO-02).
 * Caras canónicas anatómicas; geometría solo para pintar.
 */

/** Estados compartidos módulo + ficha (subset clínico + extras DC-11c). */
export const ESTADOS_ODO = {
  caries: { l: "Caries", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: true, c: "var(--dc-danger)", pat: "solid" },
  obturado: { l: "Obturado / Restauración", color: "var(--dc-blue)", borde: "var(--dc-info-700b)", porCara: true, c: "var(--dc-info-700)", pat: "hatch" },
  sellante: { l: "Sellante", color: "var(--dc-brand-soft)", borde: "var(--dc-info-700)", porCara: true, c: "var(--dc-brand-soft)", pat: "solid" },
  fractura: { l: "Fractura", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-warn-700)", pat: "slash" },
  corona: { l: "Corona", color: "var(--dc-blue)", borde: "var(--dc-info-700b)", porCara: false, c: "var(--dc-warn-700)", pat: "double" },
  endodoncia: { l: "Endodoncia", color: "var(--dc-blue)", borde: "var(--dc-info-700b)", porCara: false, c: "var(--dc-purple)", pat: "dots" },
  implante: { l: "Implante", color: "var(--dc-blue)", borde: "var(--dc-info-700b)", porCara: false, c: "var(--dc-info-700)", pat: "solid" },
  ausente: { l: "Ausente", color: "var(--dc-blue)", borde: "var(--dc-info-700b)", porCara: false, c: "var(--dc-ink-200)", pat: "cross", x: true },
  extraer: { l: "Extracción indicada", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-danger)", pat: "cross", x: true },
  remanente: { l: "Remanente radicular", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-danger)", pat: "solid" },
  movilidad1: { l: "Movilidad grado I", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-warn-700)", pat: "solid" },
  movilidad2: { l: "Movilidad grado II", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-warn-700)", pat: "solid" },
  movilidad3: { l: "Movilidad grado III", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-danger)", pat: "solid" },
  giroversion: { l: "Giroversión", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-warn-700)", pat: "solid" },
  protesis_fija: { l: "Prótesis fija", color: "var(--dc-blue)", borde: "var(--dc-info-700b)", porCara: false, c: "var(--dc-info-700)", pat: "solid" },
  protesis_removible: { l: "Prótesis removible", color: "var(--dc-blue)", borde: "var(--dc-info-700b)", porCara: false, c: "var(--dc-info-700)", pat: "solid" },
  espigo: { l: "Espigo / muñón", color: "var(--dc-blue)", borde: "var(--dc-info-700b)", porCara: false, c: "var(--dc-info-700)", pat: "solid" },
  erupcion: { l: "Diente en erupción", color: "var(--dc-brand-soft)", borde: "var(--dc-info-700)", porCara: false, c: "var(--dc-brand-soft)", pat: "solid" },
  supernumerario: { l: "Supernumerario", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-danger)", pat: "solid" },
  diastema: { l: "Diastema", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-warn-700)", pat: "solid" },
  transposicion: { l: "Transposición", color: "var(--dc-red-alt)", borde: "var(--dc-danger-700)", porCara: false, c: "var(--dc-warn-700)", pat: "solid" },
};

export const FASES_ODO = [
  ["inicial", "Odo. Inicial"],
  ["evolucion", "Odo. Evolución"],
  ["alta", "Odo. Alta"],
];

/** Labels UI + valor API (infantil = leche). */
export const DENTICIONES_ODO = [
  ["infantil", "Leche (20)"],
  ["mixta", "Mixta (52)"],
  ["adulto", "Adulto (32)"],
];

export function denticionApi(k) {
  if (k === "nino" || k === "leche") return "infantil";
  if (k === "mixta") return "mixta";
  return "adulto";
}

export function denticionUiDesdeApi(k) {
  return denticionApi(k);
}

const ES_SUP = (n) => [1, 2, 5, 6].includes(Number(String(n)[0]));
const ES_ANT = (n) => {
  const d = Number(String(n).slice(-1));
  return d >= 1 && d <= 3;
};
/** Cuadrantes donde la izquierda del SVG es mesial (FDI chart 18→28). ODO-03. */
const MESIAL_LEFT = (n) => [2, 3, 6, 7].includes(Number(String(n)[0]));

/**
 * Geometría de pantalla → clave anatómica canónica.
 * V vestibular, P palatino, L lingual, M mesial, D distal, O oclusal, I incisal.
 */
export function geoAAnatomica(pieza, geo) {
  const g = String(geo || "");
  if (["V", "P", "L", "M", "D", "O", "I"].includes(g)) return g;
  if (g === "top") return "V";
  if (g === "bottom") return ES_SUP(pieza) ? "P" : "L";
  if (g === "center") return ES_ANT(pieza) ? "I" : "O";
  if (g === "left") return MESIAL_LEFT(pieza) ? "M" : "D";
  if (g === "right") return MESIAL_LEFT(pieza) ? "D" : "M";
  return g;
}

/** Anatómica → geometría para pintar (legacy keys). */
export function anatomicaAGeo(pieza, ana) {
  const a = String(ana || "");
  if (["top", "bottom", "left", "right", "center"].includes(a)) return a;
  if (a === "V") return "top";
  if (a === "P" || a === "L") return "bottom";
  if (a === "O" || a === "I") return "center";
  if (a === "M") return MESIAL_LEFT(pieza) ? "left" : "right";
  if (a === "D") return MESIAL_LEFT(pieza) ? "right" : "left";
  return a;
}

/** Normaliza mapa de caras a claves anatómicas (lectura API + legacy). */
export function normalizarCarasAnatomicas(pieza, caras) {
  const out = {};
  if (!caras || typeof caras !== "object") return out;
  for (const [k, v] of Object.entries(caras)) {
    if (!v) continue;
    out[geoAAnatomica(pieza, k)] = v;
  }
  return out;
}

/** Para el SVG: mapa con claves geométricas. */
export function carasParaPintar(pieza, caras) {
  const ana = normalizarCarasAnatomicas(pieza, caras);
  const out = {};
  for (const [k, v] of Object.entries(ana)) {
    out[anatomicaAGeo(pieza, k)] = v;
  }
  return out;
}

export function labelCaraAnatomica(pieza, clave) {
  const a = geoAAnatomica(pieza, clave);
  return (
    {
      V: "Vestibular",
      P: "Palatino",
      L: "Lingual",
      M: "Mesial",
      D: "Distal",
      O: "Oclusal",
      I: "Incisal",
    }[a] || a
  );
}
