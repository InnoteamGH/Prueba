/* Periodontograma: modelo de datos, cálculos clínicos y contrato con el backend.
 *
 * Contrato (una fila por pieza, igual que la tabla actual desde la migración 0031):
 *   GET /periodontograma?pacienteId=…  →  [{ numeroPieza, profundidad, recesion, sangrado,
 *        placa, supuracion, movilidad, furca, ausente, implante, nota, actualizadoEn }]
 *   PUT /periodontograma  ←  { pacienteId, numeroPieza, ...los mismos campos }
 *
 * Los arreglos van como JSON de 6 posiciones, en este orden de sitios:
 *   0 vestibular mesial · 1 vestibular central · 2 vestibular distal
 *   3 palatino/lingual mesial · 4 palatino/lingual central · 5 palatino/lingual distal
 *
 * - profundidad: mm de sondaje (PS), del margen gingival al fondo de la bolsa.
 * - recesion: mm del límite amelocementario (LAC) al margen. Positivo = recesión;
 *   negativo = margen coronal al LAC (agrandamiento gingival).
 * - sangrado / placa / supuracion: booleanos por sitio.
 * - movilidad: 0–3 (Miller). furca: 0–3 (Hamp), solo tiene sentido en molares.
 * - placa, supuracion, ausente e implante son campos nuevos: si el backend aún no los
 *   guarda, los ignora y el resto funciona igual.
 *
 * Nivel de inserción clínica (NIC) = PS + recesión. Es lo que usa la clasificación
 * AAP/EFP 2017 para el estadio, por eso se calcula aquí y no se captura.
 */

export const SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const SITIOS = ["Vestibular mesial", "Vestibular central", "Vestibular distal", "Palatino/lingual mesial", "Palatino/lingual central", "Palatino/lingual distal"];

export const tipoDiente = (n) => { const d = n % 10; return d >= 6 ? "molar" : d >= 4 ? "premolar" : d === 3 ? "canino" : "incisivo"; };
export const esMolar = (n) => tipoDiente(n) === "molar";
export const esSuperior = (n) => { const q = Math.floor(n / 10); return q === 1 || q === 2; };
/* En la gráfica la pieza se mira de frente: en los cuadrantes 1 y 4 el distal queda a la
   izquierda; en el 2 y el 3, a la derecha. Devuelve los índices en orden de pantalla. */
export const ordenVisual = (n, cara) => {
  const q = Math.floor(n / 10); const base = cara === "v" ? 0 : 3;
  return q === 1 || q === 4 ? [base + 2, base + 1, base] : [base, base + 1, base + 2];
};

const seis = (v) => [v, v, v, v, v, v];
export const piezaVacia = () => ({ pd: seis(null), mg: seis(null), bop: seis(false), placa: seis(false), sup: seis(false), movilidad: null, furca: null, ausente: false, implante: false, nota: "" });

const json6 = (v, def) => {
  let x = v;
  if (typeof v === "string") { try { x = JSON.parse(v); } catch { x = null; } }
  if (!Array.isArray(x)) return seis(def);
  return Array.from({ length: 6 }, (_, i) => (x[i] === undefined ? def : x[i]));
};
const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** Filas del backend → { [pieza]: pieza } */
export function desdeApi(rows) {
  const m = {};
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const n = Number(r.numeroPieza); if (!n) return;
    m[n] = {
      pd: json6(r.profundidad, null).map(num),
      mg: json6(r.recesion, null).map(num),
      bop: json6(r.sangrado, false).map(Boolean),
      placa: json6(r.placa, false).map(Boolean),
      sup: json6(r.supuracion, false).map(Boolean),
      movilidad: num(r.movilidad), furca: num(r.furca),
      ausente: !!r.ausente, implante: !!r.implante, nota: r.nota || "",
    };
  });
  return m;
}

/** Pieza → cuerpo del PUT */
export function aApi(pacienteId, n, p) {
  const t = p || piezaVacia();
  return {
    pacienteId, numeroPieza: n,
    profundidad: JSON.stringify(t.pd.map((v) => (v == null ? null : v))),
    recesion: JSON.stringify(t.mg.map((v) => (v == null ? null : v))),
    sangrado: JSON.stringify(t.bop.map(Boolean)),
    placa: JSON.stringify(t.placa.map(Boolean)),
    supuracion: JSON.stringify(t.sup.map(Boolean)),
    movilidad: t.movilidad ?? null, furca: t.furca ?? null,
    ausente: !!t.ausente, implante: !!t.implante, nota: t.nota || null,
  };
}

export const nic = (pd, mg) => (pd == null ? null : pd + (mg || 0));

/** Indicadores del examen. Solo cuentan los sitios sondados de piezas presentes. */
export function metricas(dientes) {
  let sitios = 0, sumPd = 0, sumCal = 0, s4 = 0, s6 = 0, bop = 0, placa = 0, sup = 0, presentes = 0, calMaxInter = 0, pdMax = 0, movil = 0, furcas = 0;
  const piezasConBolsa = new Set(); const piezasCal = new Set(); const piezasCaso = new Set();
  [...SUP, ...INF].forEach((n) => {
    const p = dientes[n]; if (!p || p.ausente) return;
    presentes++;
    if ((p.movilidad || 0) > 0) movil++;
    if ((p.furca || 0) > 0 && esMolar(n)) furcas++;
    for (let i = 0; i < 6; i++) {
      const v = p.pd[i]; if (v == null) continue;
      sitios++; sumPd += v; pdMax = Math.max(pdMax, v);
      const c = nic(v, p.mg[i]); sumCal += c;
      if (v >= 4) { s4++; piezasConBolsa.add(n); }
      if (v >= 6) s6++;
      if (p.bop[i]) bop++; if (p.placa[i]) placa++; if (p.sup[i]) sup++;
      if (i !== 1 && i !== 4) { calMaxInter = Math.max(calMaxInter, c); if (c >= 3) piezasCal.add(n); }
      // Caso de periodontitis (AAP/EFP 2017): pérdida de inserción con bolsa real.
      if ((i !== 1 && i !== 4 && v >= 4 && c >= 3) || (c >= 3 && v > 3)) piezasCaso.add(n);
    }
  });
  const pct = (x) => (sitios ? Math.round((x / sitios) * 100) : 0);
  return {
    presentes, sitios, s4, s6, pdMax, calMaxInter, movil, furcas, supuracion: sup,
    pdMedia: sitios ? +(sumPd / sitios).toFixed(1) : 0,
    calMedia: sitios ? +(sumCal / sitios).toFixed(1) : 0,
    bopPct: pct(bop), placaPct: pct(placa),
    piezasConBolsa: piezasConBolsa.size, piezasConPerdida: piezasCal.size, piezasCaso: piezasCaso.size,
  };
}

/** Orientación diagnóstica AAP/EFP 2017. No reemplaza el juicio clínico ni la radiografía. */
export function clasificacion(m) {
  if (!m.sitios) return { estado: "sin_datos", titulo: "Sin sondaje", detalle: "Registra el sondaje para ver la orientación diagnóstica." };
  // Periodontitis cuando al menos dos piezas tienen pérdida de inserción con bolsa.
  if (m.piezasCaso < 2) {
    return m.bopPct >= 10
      ? { estado: "gingivitis", titulo: "Gingivitis", detalle: `Sangrado en el ${m.bopPct}% de los sitios, sin pérdida de inserción con bolsa en dos o más piezas.` }
      : { estado: "salud", titulo: "Salud periodontal", detalle: m.piezasCaso ? "Una sola pieza con bolsa y pérdida de inserción: vigílala." : "Sangrado menor al 10% y sin bolsas con pérdida de inserción." };
  }
  const estadio = m.calMaxInter >= 5 || m.pdMax >= 6 ? "III" : m.calMaxInter >= 3 || m.pdMax >= 5 ? "II" : "I";
  const extension = m.presentes && m.piezasCaso / m.presentes >= 0.3 ? "generalizada" : "localizada";
  return {
    estado: "periodontitis", estadio, extension,
    titulo: `Periodontitis estadio ${estadio}, ${extension}`,
    detalle: `NIC interproximal máximo ${m.calMaxInter} mm y bolsa máxima ${m.pdMax} mm. El estadio IV y el grado requieren radiografía, piezas perdidas por periodontitis y factores de riesgo.`,
  };
}

export const colorPs = (v) => (v == null ? null : v >= 6 ? "grave" : v >= 4 ? "moderado" : "sano");

/** Sondaje de ejemplo, estable por paciente, para la demostración. */
export function demoPerio(pid) {
  let s = [...String(pid ?? "1")].reduce((a, c) => a + c.charCodeAt(0), 7);
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const m = {};
  [...SUP, ...INF].forEach((n) => {
    const p = piezaVacia();
    if (n % 10 === 8) { p.ausente = true; m[n] = p; return; }
    const molar = esMolar(n); const infAnt = [31, 32, 41, 42].includes(n);
    for (let i = 0; i < 6; i++) {
      const inter = i !== 1 && i !== 4;
      let pd = 2 + Math.round(rnd() * (inter ? 1.6 : 0.9));
      if (molar && inter && rnd() > 0.55) pd += 2 + Math.round(rnd() * 2);
      p.pd[i] = Math.min(pd, 8);
      p.mg[i] = infAnt && i < 3 ? 1 + Math.round(rnd() * 2) : rnd() > 0.85 ? 1 : 0;
      p.bop[i] = p.pd[i] >= 4 ? rnd() > 0.3 : rnd() > 0.85;
      p.placa[i] = rnd() > 0.7;
      p.sup[i] = p.pd[i] >= 6 && rnd() > 0.6;
    }
    if (molar && (n === 16 || n === 26 || n === 36)) p.furca = 1;
    if (n === 31) p.movilidad = 1;
    m[n] = p;
  });
  return m;
}
