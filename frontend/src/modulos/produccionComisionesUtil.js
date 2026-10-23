/**
 * Helpers de Producción y comisiones (SPEC §15 + barras honestas).
 */
import { layoutProgreso, moneyFmt, pctOfTotal } from "./panelGerencialUtil.js";

/** Techo fijo S/ 250, o max(250, ceil(maxTicket×1.1)) si algún ticket lo supera. */
export function techoRinde(tickets, base = 250) {
  const maxT = Math.max(0, ...(tickets || []).map((t) => Number(t) || 0));
  if (maxT <= base) return base;
  return Math.max(base, Math.ceil(maxT * 1.1));
}

/** Layout barra rendimiento: escala a techo fijo, no al máximo de la serie. */
export function layoutRinde(ticket, techo) {
  const v = Number(ticket) || 0;
  const t = Number(techo) || 250;
  if (v <= 0 || t <= 0) return { dibujar: false, pct: 0 };
  return { dibujar: true, pct: Math.min(100, (v / t) * 100) };
}

export function marcaMediaPct(media, techo) {
  const m = Number(media) || 0;
  const t = Number(techo) || 250;
  if (m <= 0 || t <= 0) return null;
  return Math.min(100, (m / t) * 100);
}

/** Acumulado mensuales a partir de cobrosPorMes[].cobrado */
export function acumularCobros(cobrosPorMes) {
  const mensuales = (cobrosPorMes || []).map((m) => Number(m.cobrado) || 0);
  const acum = [];
  let s = 0;
  for (const v of mensuales) {
    s += v;
    acum.push(s);
  }
  return { mensuales, acum };
}

/** Escala curva §15.5: max = Math.max(suave, pico×1.06, 400) */
export function escalaCurva(pico, suaveActual, quieto) {
  const picoN = Math.max(0, Number(pico) || 0);
  let obj = Math.max(picoN * 1.22, 400);
  const paso = 10 ** Math.floor(Math.log10(obj)) / 4;
  obj = Math.ceil(obj / paso) * paso;
  let max = Number(suaveActual) || 400;
  max += (obj - max) * (quieto ? 1 : 0.1);
  return Math.max(max, picoN * 1.06, 400);
}

/** Umbral de alerta de la app (SPEC §15.11 / P26). */
export const UMBRAL_AUSENTISMO = 15;

/** Escala visual 0–20% para barras de ausentismo. */
export const ESCALA_AUSENTISMO_MAX = 20;

/** Tope de la escala: 20% mientras todo quepa. Si alguna tasa lo pasa, sube a la decena
 *  siguiente (máx. 100%): con un tope fijo la barra se llenaba y la etiqueta «89.3% la clínica»
 *  quedaba encima de la del 20%. */
export function escalaAusentismoMax(...tasas) {
  const vals = tasas.flat().map(Number).filter((t) => Number.isFinite(t));
  const pico = vals.length ? Math.max(...vals) : 0;
  if (pico <= ESCALA_AUSENTISMO_MAX) return ESCALA_AUSENTISMO_MAX;
  return Math.min(100, Math.ceil(pico / 10) * 10);
}

const ESTADOS_NUM = new Set(["cancelada", "no_show"]);
/** AUS-02: la reprogramada sale del cálculo: la cita se cuenta en su nueva fecha. */
const ESTADO_FUERA = "reprogramada";

/** Citas que entran en el cálculo de ausentismo (excluye reprogramada). */
export function citasEnCalculoAusentismo(citas) {
  return (citas || []).filter((c) => c && c.estado !== ESTADO_FUERA);
}

export function esCitaPerdida(c) {
  return c && ESTADOS_NUM.has(c.estado);
}

/**
 * Tasa clínica y desglose cancelada / no_show.
 * @returns {{ total, perdidas, canceladas, noShows, tasa, sinDato }}
 */
export function resumenAusentismoClinica(citas) {
  const base = citasEnCalculoAusentismo(citas);
  const canceladas = base.filter((c) => c.estado === "cancelada");
  const noShows = base.filter((c) => c.estado === "no_show");
  const perdidas = canceladas.length + noShows.length;
  const total = base.length;
  if (total === 0) {
    return { total: 0, perdidas: 0, canceladas: 0, noShows: 0, tasa: null, sinDato: true };
  }
  const tasa = Math.round((perdidas / total) * 1000) / 10;
  return {
    total,
    perdidas,
    canceladas: canceladas.length,
    noShows: noShows.length,
    tasa,
    sinDato: false,
  };
}

/** Posición % en pista 0–maxEscala (para data-w / left). */
export function pctEnEscalaAusentismo(tasa, maxEscala = ESCALA_AUSENTISMO_MAX) {
  const t = Number(tasa);
  const max = Number(maxEscala) || ESCALA_AUSENTISMO_MAX;
  if (t == null || Number.isNaN(t) || max <= 0) return 0;
  return Math.min(100, Math.max(0, (t / max) * 100));
}

/**
 * Agrupa por médico: agenda, perdidas, cancelada/no_show, tasa, coste.
 * Sin sello ejemplo — dato real desde citas.
 * Clave = medicoId del catálogo cuando se puede resolver; "Sin médico" solo si no hay id ni nombre.
 */
export function ausentismoPorOdontologo(citas, medicos = [], ticketMedio = null) {
  const base = citasEnCalculoAusentismo(citas);
  const ticket = ticketMedio != null && Number(ticketMedio) > 0 ? Number(ticketMedio) : null;
  const docs = new Map();
  const byName = new Map();
  for (const m of medicos || []) {
    const id = String(m.medicoId ?? m.id ?? "");
    if (!id) continue;
    const nombre = m.nombre || "Odontólogo";
    docs.set(id, {
      id,
      nombre,
      especialidad: m.especialidad || m.espNombre || "",
      agenda: 0,
      perdidas: 0,
      cancelada: 0,
      noShow: 0,
    });
    if (m.nombre) byName.set(String(m.nombre).trim().toLowerCase(), id);
  }
  const keyOf = (c) => {
    if (c.medicoId != null && String(c.medicoId) !== "") return String(c.medicoId);
    if (c.medico) {
      const resolved = byName.get(String(c.medico).trim().toLowerCase());
      if (resolved) return resolved;
      return String(c.medico);
    }
    return "?";
  };
  const nombreOf = (c, id) => {
    const known = docs.get(id);
    if (known?.nombre) return known.nombre;
    if (c.medico) return c.medico;
    return "Sin médico";
  };
  for (const c of base) {
    const id = keyOf(c);
    if (!docs.has(id)) {
      docs.set(id, {
        id,
        nombre: nombreOf(c, id),
        especialidad: c.especialidad || "",
        agenda: 0,
        perdidas: 0,
        cancelada: 0,
        noShow: 0,
      });
    } else if (!docs.get(id).nombre || docs.get(id).nombre === "Odontólogo") {
      const n = nombreOf(c, id);
      if (n && n !== "Sin médico") docs.get(id).nombre = n;
    }
    const row = docs.get(id);
    row.agenda++;
    if (c.estado === "no_show") {
      row.noShow++;
      row.perdidas++;
    } else if (c.estado === "cancelada") {
      row.cancelada++;
      row.perdidas++;
    }
  }
  const clinica = resumenAusentismoClinica(citas);
  const conTasa = [...docs.values()]
    .filter((r) => r.agenda > 0)
    .map((r) => ({ ...r, tasa: r.agenda > 0 ? Math.round((r.perdidas / r.agenda) * 1000) / 10 : null }));
  const escala = escalaAusentismoMax(clinica.tasa, conTasa.map((r) => r.tasa));
  const rows = conTasa
    .map((r) => {
      const coste = ticket != null && r.perdidas > 0 ? Math.round(r.perdidas * ticket * 100) / 100 : (ticket != null ? 0 : null);
      return {
        ...r,
        coste,
        pctEscala: r.tasa != null ? pctEnEscalaAusentismo(r.tasa, escala) : 0,
        dibujarBarra: (r.tasa || 0) > 0,
      };
    }).sort((a, b) => (b.tasa ?? -1) - (a.tasa ?? -1));

  const costeTotal = ticket != null ? Math.round(clinica.perdidas * ticket * 100) / 100 : null;
  return { rows, clinica, ticketMedio: ticket, costeTotal, escala };
}

export { layoutProgreso, moneyFmt, pctOfTotal };

/* H-G5: periodo de Producción y comisiones. Antes la pantalla pedía /comisiones sin fechas
   (el servidor usaba mayo–octubre sin decirlo) y comparaba esos 5 meses con UNA meta
   mensual («360 % de la meta»). Ahora el periodo se elige, se rotula y la meta se escala
   a los meses del periodo. */
const ymdP = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const PERIODOS_COMISIONES = [["mes", "Este mes"], ["anterior", "Mes anterior"], ["6m", "Últimos 6 meses"]];

/** { desde, hasta } (YYYY-MM-DD) del periodo elegido. «6m» = del día 1 de hace 5 meses a hoy
 *  (lo mismo que usaba el servidor por defecto). */
export function rangoPeriodo(clave, hoy = new Date()) {
  const y = hoy.getFullYear(), m = hoy.getMonth();
  if (clave === "anterior") return { desde: ymdP(new Date(y, m - 1, 1)), hasta: ymdP(new Date(y, m, 0)) };
  if (clave === "6m") return { desde: ymdP(new Date(y, m - 5, 1)), hasta: ymdP(hoy) };
  return { desde: ymdP(new Date(y, m, 1)), hasta: ymdP(hoy) };
}

/** Meses calendario que toca el periodo (inclusive): mayo–octubre = 6. */
export function mesesDelPeriodo(desde, hasta) {
  if (!desde || !hasta) return 1;
  const [ya, ma] = String(desde).slice(0, 7).split("-").map(Number);
  const [yb, mb] = String(hasta).slice(0, 7).split("-").map(Number);
  const n = (yb - ya) * 12 + (mb - ma) + 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Ritmo esperado (%) a la fecha: días transcurridos del periodo ÷ días de sus meses
 *  completos. Un mes ya cerrado vale 100. */
export function ritmoDelPeriodo(desde, hasta, hoy = new Date()) {
  if (!desde || !hasta) return 100;
  const ini = new Date(`${String(desde).slice(0, 10)}T00:00:00`);
  const finP = new Date(`${String(hasta).slice(0, 10)}T00:00:00`);
  const finMes = new Date(finP.getFullYear(), finP.getMonth() + 1, 0);
  const corte = hoy < finMes ? hoy : finMes;
  const total = Math.round((finMes - ini) / 86400000) + 1;
  const pasados = Math.round((new Date(corte.getFullYear(), corte.getMonth(), corte.getDate()) - ini) / 86400000) + 1;
  if (!(total > 0)) return 100;
  return Math.max(0, Math.min(100, (pasados / total) * 100));
}

/* Meses cortos como fechaLegible de comun.jsx («vie 23 oct»). */
const MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const partesFecha = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return { y, d, mes: MESES_C[m - 1] }; };

/** Rango corto: «1 may – 5 oct 2026»; en un mismo mes «1 – 23 oct 2026»; entre años
 *  «1 dic 2025 – 31 ene 2026». */
export function rotuloPeriodo(desde, hasta) {
  if (!desde || !hasta) return "";
  const a = partesFecha(desde), b = partesFecha(hasta);
  const fin = `${b.d} ${b.mes} ${b.y}`;
  if (a.y !== b.y) return `${a.d} ${a.mes} ${a.y} – ${fin}`;
  if (a.mes !== b.mes) return `${a.d} ${a.mes} – ${fin}`;
  return a.d === b.d ? fin : `${a.d} – ${fin}`;
}

/** Solo los meses del periodo: «may – oct 2026» («oct 2026» si es uno; «dic 2025 – ene 2026»). */
export function rotuloMeses(desde, hasta) {
  if (!desde || !hasta) return "";
  const a = partesFecha(desde), b = partesFecha(hasta);
  const fin = `${b.mes} ${b.y}`;
  if (a.y !== b.y) return `${a.mes} ${a.y} – ${fin}`;
  return a.mes === b.mes ? fin : `${a.mes} – ${fin}`;
}

/** Porcentaje sin decimales, igual en toda la pantalla. Lo que no es cero no se lee «0%»: «<1%». */
export function pctTxt(v) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return "—";
  return n > 0 && n < 0.5 ? "<1%" : `${Math.round(n)}%`;
}

/* R6-02: /comisiones ya filtra por sedeIds (producción, comisión y cobrado de la sede
   elegida, médico por médico). Se quitó el recálculo local con GET /citas y
   GET /pagos/historial (H-06) y el aviso de que el reporte era de toda la clínica. */
