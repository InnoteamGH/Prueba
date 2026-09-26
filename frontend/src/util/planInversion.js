/**
 * Plan de inversión — líneas, rótulos y totales (E1 §5–§7, A-5…A-14).
 * Port de referencia/generador/lineas.py
 */
import tarifa from "./planInversionTarifa.js";

export const MAXILARES = {
  sup: "Maxilar superior",
  inf: "Maxilar inferior",
  ambos: "Ambos maxilares",
};

export { tarifa };

/** Alias ESTADOS_ODO (UI) → claves de tarifa.reglas (E1 / referencia). */
export const ALIAS_HALLAZGO = {
  extraer: "extraccion",
  corona: "coronaT",
  movilidad1: "movilidad",
  movilidad2: "movilidad",
  movilidad3: "movilidad",
  remanente: "rr",
};

/** Hallazgos de UI que no generan línea (ya ejecutado / observación). */
export const SIN_TRATAMIENTO_UI = {
  obturado: "Ya restaurado: no genera línea en el plan del paciente",
  sellante: "Preventivo ejecutado: no genera línea en el plan",
  implante: "Prótesis o implante: lo define la doctora en consulta",
  protesis_fija: "Prótesis: lo define la doctora en consulta",
  protesis_removible: "Prótesis: lo define la doctora en consulta",
  espigo: "Complemento de restauración: criterio clínico",
  erupcion: "Observación: no genera línea por sí sola",
  supernumerario: "Observación: no genera línea por sí sola",
  diastema: "Observación: no genera línea por sí sola",
  giroversion: "Observación: no genera línea por sí sola",
  transposicion: "Observación: no genera línea por sí sola",
};

export function resolverIdHallazgo(h) {
  if (h == null || h === "") return "";
  const raw = String(h);
  if (ALIAS_HALLAZGO[raw]) return ALIAS_HALLAZGO[raw];
  return raw;
}

export function formatearFDI(n) {
  const v = n == null ? "" : String(n);
  if (/^[1-8][1-8]$/.test(v)) return `${v[0]}.${v[1]}`;
  return v;
}

/** Columna Pieza: FDI con punto, maxilar, o — */
export function rotuloPieza(linea) {
  if (linea?.max) return MAXILARES[linea.max] || "—";
  if (linea?.pz != null && linea.pz !== "") return formatearFDI(linea.pz) || "—";
  return "—";
}

export function esRotuloPiezaValido(txt) {
  const t = txt == null ? "" : String(txt);
  if (t === "—") return true;
  if (/^[1-8]\.[1-8]$/.test(t)) return true;
  return Object.values(MAXILARES).includes(t);
}

function grupoPieza(pz) {
  const p = Number(pz) % 10;
  if (p >= 6) return "molar";
  if (p >= 4) return "premolar";
  return "anterior";
}

/**
 * @param {Array<[number|null, string, string|null]>} hallazgos  [pieza, hallazgoId, ubic]
 * @param {Array<[number|null, number, string|null]>} sueltos    [pieza, cod, maxilar]
 * @param {object} [tar] tarifa override
 * @returns {{ lineas: object[], descartes: object[] }}
 */
export function resolverLineas(hallazgos = [], sueltos = [], tar = tarifa) {
  const bruto = [];
  const desc = [];
  for (const [pz, h, ubic] of hallazgos) {
    const id = resolverIdHallazgo(h);
    if (SIN_TRATAMIENTO_UI[h] || SIN_TRATAMIENTO_UI[id]) {
      desc.push({
        pz,
        h,
        ubic,
        motivo: SIN_TRATAMIENTO_UI[h] || SIN_TRATAMIENTO_UI[id],
      });
      continue;
    }
    const r = tar.reglas?.[id];
    if (!r || r.sinTratamiento) {
      desc.push({ pz, h, ubic, motivo: (r && r.sinTratamiento) || "sin regla en la tabla" });
      continue;
    }
    const s = r.porPieza ? tar.endodonciaPorPieza[grupoPieza(pz)] : r;
    if (!s || s.cod == null) {
      desc.push({ pz, h, ubic, motivo: "regla sin precio resoluble" });
      continue;
    }
    bruto.push({ pz, cod: s.cod, nom: s.nom, v: s.v, ubic, max: null });
  }
  for (const [pz, cod, mxIn] of sueltos) {
    const s = (tar.sueltos || []).find((x) => x.cod === cod);
    if (!s) continue;
    let mx = mxIn;
    let ubic = "añadido en recepción";
    if (s.amb === "maxilar") {
      mx = s.fijo || mx || "ambos";
      ubic = (MAXILARES[mx] || "—").toLowerCase();
    } else {
      mx = null;
    }
    const veces = s.porMax && mx === "ambos" ? 2 : 1;
    for (let i = 0; i < veces; i++) {
      bruto.push({ pz: s.amb === "pieza" ? pz : null, cod: s.cod, nom: s.nom, v: s.v, ubic, max: mx });
    }
  }
  const orden = [];
  const agr = new Map();
  for (const row of bruto) {
    const k = `${row.pz ?? "n"}|${row.cod}|${row.max ?? ""}`;
    if (!agr.has(k)) {
      agr.set(k, { pz: row.pz, cod: row.cod, nom: row.nom, v: row.v, cant: 0, ubic: [], max: row.max });
      orden.push(k);
    }
    const g = agr.get(k);
    g.cant += 1;
    g.ubic.push(row.ubic);
  }
  orden.sort((a, b) => {
    const A = agr.get(a);
    const B = agr.get(b);
    const pa = A.pz == null ? 99 : Number(A.pz);
    const pb = B.pz == null ? 99 : Number(B.pz);
    return pa - pb || A.cod - B.cod;
  });
  return { lineas: orden.map((k) => agr.get(k)), descartes: desc };
}

/** Round money to 2 decimals (half-up via cents). */
export function redondear2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * @param {object[]} lineas
 * @param {{ activo?: boolean, tipo?: 'porcentaje'|'monto', valor?: number }} descuento
 */
export function calcularTotales(lineas, descuento = { activo: false }) {
  const subtotal = redondear2((lineas || []).reduce((s, x) => s + Number(x.v) * Number(x.cant), 0));
  let desc = 0;
  if (descuento?.activo) {
    if (descuento.tipo === "porcentaje") {
      desc = redondear2((subtotal * Number(descuento.valor || 0)) / 100);
    } else {
      desc = redondear2(Number(descuento.valor || 0));
    }
  }
  if (desc > subtotal) desc = subtotal;
  return { subtotal, descuento: desc, total: redondear2(subtotal - desc) };
}

/** ¿Mostrar selector de maxilar? (A-16) */
export function necesitaSelectorMaxilar(servicio) {
  if (!servicio || servicio.amb !== "maxilar") return false;
  return !servicio.fijo;
}

export function opcionesMaxilar() {
  return [
    { value: "sup", label: MAXILARES.sup },
    { value: "inf", label: MAXILARES.inf },
    { value: "ambos", label: MAXILARES.ambos },
  ];
}

/** Estima páginas A4 del bloque imprimible (A-25 total del pie). */
export function estimarPaginasA4(alturaPx, pagePx = 1123) {
  const h = Number(alturaPx) || 0;
  const p = Number(pagePx) || 1123;
  if (h <= 0) return 1;
  return Math.max(1, Math.ceil(h / p));
}

export const SUELTOS_PARTIDA = tarifa.sueltos || [];
