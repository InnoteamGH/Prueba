/* Fuente única de métricas (spec UX/UI §5.1, R3).
   Una función por métrica, con los mismos filtros (fecha, sede, doctor). Las pantallas
   llaman a estas funciones; no recalculan la cifra por su cuenta.
   Módulo puro (sin React ni imports de UI) para poder probarlo aparte. */

import { estadoCita } from "./estados.js";

const pad = (n) => String(n).padStart(2, "0");
export const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoyISO = () => isoDe(new Date());
export const sumarDias = (iso, n) => { const d = new Date(String(iso).slice(0, 10) + "T00:00:00"); d.setDate(d.getDate() + n); return isoDe(d); };
const diasEntre = (aISO, bISO) => Math.round((new Date(String(bISO).slice(0, 10) + "T00:00:00") - new Date(String(aISO).slice(0, 10) + "T00:00:00")) / 86400000);
const mesesEntre = (aISO, bISO) => {
  const a = new Date(String(aISO).slice(0, 10) + "T00:00:00"), b = new Date(String(bISO).slice(0, 10) + "T00:00:00");
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
};
const num = (v) => Number(v) || 0;

// Decisiones del spec §8 (propuestas aceptadas por defecto).
export const UMBRAL_VENCIDO_DIAS = 30;   // M-07
export const MESES_REACTIVAR = 6;        // M-08
export const DIAS_NUEVOS = 30;           // M-09

export const CITA_INACTIVA = ["cancelada", "no_show", "reprogramada", "cerrada_sistema"];
export const citaActiva = (c) => !CITA_INACTIVA.includes(c?.estado);

const enSede = (c, sede) => sede == null || sede === "all" || String(c.sede ?? c.sedeId) === String(sede);
const delMedico = (c, medicoId) => medicoId == null || String(c.medicoId) === String(medicoId);

/** ¿Esta cita es de este paciente? Por id, por DNI o, a falta de ambos, por nombre. */
export function citaDePaciente(c, p) {
  if (!c || !p) return false;
  if (c.pacienteId != null && p.id != null) return String(c.pacienteId) === String(p.id);
  if (c.dni && p.dni) return String(c.dni) === String(p.dni);
  return String(c.paciente || "").trim().toLowerCase() === String(p.nombre || "").trim().toLowerCase();
}

/* ── M-01 · Citas del día por estado (excluyentes, suman el total) ── */
export function citasDelDia(citas, { fecha = hoyISO(), sede = null, medicoId = null } = {}) {
  return (citas || []).filter((c) => c.fecha === fecha && enSede(c, sede) && delMedico(c, medicoId));
}
export function citasPorEstado(citas, filtros = {}) {
  const lista = citasDelDia(citas, filtros);
  const porEstado = {};
  for (const c of lista) { const k = estadoCita(c); porEstado[k] = (porEstado[k] || 0) + 1; }
  const activas = lista.filter(citaActiva).length;
  return { total: lista.length, activas, canceladas: lista.length - activas, porEstado };
}

/* ── M-02 · En clínica = En sala + En atención ── */
export function enClinica(citas, filtros = {}) {
  return citasDelDia(citas, filtros).filter((c) => ["en_sala", "en_atencion"].includes(estadoCita(c))).length;
}

/* ── M-03 · Por confirmar (estado Pendiente). Hoy y mañana por separado. ── */
export function porConfirmar(citas, { fecha = hoyISO(), sede = null, medicoId = null } = {}) {
  const pend = (f) => citasDelDia(citas, { fecha: f, sede, medicoId }).filter((c) => c.estado === "pendiente" && !c.llegada);
  return { hoy: pend(fecha), manana: pend(sumarDias(fecha, 1)) };
}

/* ── M-04 · Cupos libres: horas de sillón abiertas − horas agendadas (no canceladas) ──
   jornadaDe(sedeId) → { abierta, abre, cierra } la entrega quien llama (horario de la sede). */
export function cuposLibres({ citas = [], sillones = [], fecha = hoyISO(), sede = null, jornadaDe }) {
  const sils = (sillones || []).filter((s) => s.activo !== false && (sede == null || sede === "all" || String(s.sede) === String(sede)));
  const toMin = (h) => { const [a, b] = String(h || "0:0").split(":").map(Number); return a * 60 + (b || 0); };
  let capMin = 0;
  for (const s of sils) {
    const j = jornadaDe ? jornadaDe(s.sede) : { abierta: true, abre: "09:00", cierra: "19:00" };
    if (j && j.abierta) capMin += Math.max(0, toMin(j.cierra) - toMin(j.abre));
  }
  const agendadoMin = citasDelDia(citas, { fecha, sede }).filter(citaActiva).reduce((a, c) => a + (num(c.duracionMin) || 30), 0);
  const libresMin = Math.max(0, capMin - agendadoMin);
  return { capMin, agendadoMin, libresMin, horasLibres: Math.round(libresMin / 60), cupos30: Math.floor(libresMin / 30), sillones: sils.length };
}

/* ── Cuenta del paciente (base de M-05, M-06, M-07) ──
   Presupuesto único = ficha.tratamiento. Estados: pendiente (aprobado), terminada
   (hecho sin pagar), atendida (pagado), anulado. Pagos = ficha.pagos. */
export function cuentaPaciente(ficha, { hoy = hoyISO(), umbral = UMBRAL_VENCIDO_DIAS } = {}) {
  const items = ((ficha && ficha.tratamiento) || []).filter((t) => t.estado !== "anulado");
  const total = items.reduce((a, t) => a + num(t.costo), 0);
  const pagado = ((ficha && ficha.pagos) || []).reduce((a, p) => a + num(p.monto), 0);
  const hechos = items.filter((t) => t.estado === "terminada" || t.estado === "atendida");
  const ejecutado = hechos.reduce((a, t) => a + num(t.costo), 0);
  const porCobrar = Math.max(0, ejecutado - pagado);
  // Lo vencido es la parte de lo por cobrar que corresponde a trabajo hecho hace más de N días.
  // Se imputan los pagos a lo más antiguo primero.
  const fechaHecho = (t) => String(t.terminadaEn || t.atendidaEn || t.fecha || "").slice(0, 10);
  const ordenados = [...hechos].sort((a, b) => (fechaHecho(a) || "0000").localeCompare(fechaHecho(b) || "0000"));
  let resto = pagado, vencido = 0, porCobrarItems = [];
  for (const t of ordenados) {
    const c = num(t.costo);
    const aplicado = Math.min(c, resto); resto -= aplicado;
    const pend = c - aplicado;
    if (pend <= 0) continue;
    const f = fechaHecho(t);
    const dias = f ? diasEntre(f, hoy) : umbral + 1;
    porCobrarItems.push({ ...t, pendiente: pend, dias });
    if (dias > umbral) vencido += pend;
  }
  const saldoPlan = Math.max(0, total - pagado);
  return { total, pagado, ejecutado, porCobrar, vencido, saldoPlan, porCobrarItems,
    terminados: items.filter((t) => t.estado === "terminada"), avance: { hechos: hechos.length, total: items.length } };
}

/* ── M-05 · Cobrado hoy: pagos registrados con fecha de hoy ── */
export function cobradoEnFecha(fichas, { fecha = hoyISO(), sede = null, pacientes = null } = {}) {
  let total = 0; const filas = [];
  for (const [pid, f] of Object.entries(fichas || {})) {
    const pac = pacientes ? pacientes.find((p) => String(p.id) === String(pid)) : null;
    for (const p of (f && f.pagos) || []) {
      if (String(p.fecha || "").slice(0, 10) !== fecha) continue;
      if (sede != null && sede !== "all" && p.sede != null && String(p.sede) !== String(sede)) continue;
      total += num(p.monto); filas.push({ ...p, pacienteId: pid, paciente: pac ? pac.nombre : p.paciente });
    }
  }
  return { total, filas };
}

/* ── M-06 / M-07 · Por cobrar y saldo vencido, por paciente ── */
export function cartera(fichas, pacientes, { hoy = hoyISO(), sede = null } = {}) {
  const filas = [];
  for (const p of pacientes || []) {
    if (sede != null && sede !== "all") {
      const ss = Array.isArray(p.sedes) && p.sedes.length ? p.sedes : [p.sede];
      if (!ss.map(String).includes(String(sede))) continue;
    }
    const cta = cuentaPaciente((fichas || {})[p.id], { hoy });
    if (cta.total <= 0 && cta.porCobrar <= 0) continue;
    filas.push({ p, ...cta });
  }
  const porCobrar = filas.reduce((a, f) => a + f.porCobrar, 0);
  const vencido = filas.reduce((a, f) => a + f.vencido, 0);
  const saldoPlan = filas.reduce((a, f) => a + f.saldoPlan, 0);
  return { filas, porCobrar, vencido, saldoPlan,
    conPorCobrar: filas.filter((f) => f.porCobrar > 0), conVencido: filas.filter((f) => f.vencido > 0), conSaldo: filas.filter((f) => f.saldoPlan > 0) };
}
// Antigüedad de lo por cobrar en tramos (0–30, 31–60, 61–90, 90+).
export function antiguedadDeuda(carteraRes) {
  const tramos = [["0–30 días", 0, 30], ["31–60 días", 31, 60], ["61–90 días", 61, 90], ["Más de 90 días", 91, Infinity]].map(([l, a, b]) => ({ l, a, b, v: 0 }));
  for (const f of carteraRes.filas) for (const it of f.porCobrarItems) {
    const t = tramos.find((x) => it.dias >= x.a && it.dias <= x.b) || tramos[3];
    t.v += it.pendiente;
  }
  return tramos;
}

/* ── M-10 · Última visita (última cita Atendida) y próxima cita ── */
export function ultimaVisita(p, citas) {
  let u = null;
  for (const c of citas || []) if (c.estado === "atendida" && citaDePaciente(c, p) && (!u || c.fecha > u)) u = c.fecha;
  const semilla = p && p.ultima ? String(p.ultima).slice(0, 10) : null;
  return u && (!semilla || u > semilla) ? u : semilla;
}
export function proximaCita(p, citas, { hoy = hoyISO() } = {}) {
  return (citas || []).filter((c) => citaDePaciente(c, p) && c.fecha >= hoy && citaActiva(c) && c.estado !== "atendida")
    .sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")))[0] || null;
}

/* ── M-08 · Por reactivar: última visita > 6 meses y sin cita futura ── */
export function porReactivar(pacientes, citas, { hoy = hoyISO(), meses = MESES_REACTIVAR } = {}) {
  return (pacientes || []).map((p) => ({ p, ultima: ultimaVisita(p, citas) }))
    .filter(({ p, ultima }) => ultima && mesesEntre(ultima, hoy) >= meses && !proximaCita(p, citas, { hoy }))
    .map(({ p, ultima }) => ({ ...p, ultima, meses: mesesEntre(ultima, hoy) }));
}

/* ── M-09 · Nuevos (30 días): primera cita atendida en los últimos 30 días ── */
export function nuevos30(pacientes, citas, { hoy = hoyISO(), dias = DIAS_NUEVOS } = {}) {
  const desde = sumarDias(hoy, -dias);
  return (pacientes || []).filter((p) => {
    if (p.primeraVisita) return p.primeraVisita >= desde && p.primeraVisita <= hoy;
    const at = (citas || []).filter((c) => c.estado === "atendida" && citaDePaciente(c, p)).map((c) => c.fecha).sort();
    if (!at.length) return false;
    // Si la semilla dice que ya venía antes, no es nuevo aunque su primera cita del rango sea reciente.
    if (p.ultima && String(p.ultima).slice(0, 10) < at[0]) return false;
    return at[0] >= desde && at[0] <= hoy;
  });
}

/* ── M-11 · Salidas del mes: egresos registrados en Caja ── */
export function salidasMes(egresos, { mes = hoyISO().slice(0, 7), sede = null } = {}) {
  const del = (egresos || []).filter((e) => String(e.fecha || "").slice(0, 7) === mes && (sede == null || sede === "all" || e.sede == null || String(e.sede) === String(sede)));
  const pen = del.filter((e) => (e.moneda || "PEN") !== "USD");
  const porCat = {};
  for (const e of pen) { const k = e.categoria || "Otros"; porCat[k] = (porCat[k] || 0) + num(e.monto); }
  return {
    pen: pen.reduce((a, e) => a + num(e.monto), 0),
    usd: del.filter((e) => e.moneda === "USD").reduce((a, e) => a + num(e.monto), 0),
    porCat: Object.entries(porCat).sort((a, b) => b[1] - a[1]),
    filas: del,
  };
}

/* ── M-12 · Producción: procedimientos terminados × precio ── */
export function produccion(fichas, { desde = null, hasta = null } = {}) {
  const filas = [];
  for (const [pid, f] of Object.entries(fichas || {})) for (const t of (f && f.tratamiento) || []) {
    if (!(t.estado === "terminada" || t.estado === "atendida")) continue;
    const fe = String(t.terminadaEn || t.atendidaEn || "").slice(0, 10);
    if ((desde && fe && fe < desde) || (hasta && fe && fe > hasta)) continue;
    filas.push({ ...t, pacienteId: pid });
  }
  return { total: filas.reduce((a, t) => a + num(t.costo), 0), filas };
}

/* ── M-13 · Inventario valorizado: Σ stock × costo unitario ── */
export function inventarioValorizado(items) {
  return Math.round((items || []).reduce((a, it) => a + num(it.stock) * num(it.precio ?? it.costo ?? it.precioUnitario), 0));
}

/* ── M-14 · Mensajes automáticos del mes, por estado excluyente ── */
export function mensajesMes(historial, { mes = hoyISO().slice(0, 7) } = {}) {
  const del = (historial || []).filter((h) => String(h.fecha || "").slice(0, 7) === mes);
  const porEstado = {};
  for (const h of del) porEstado[h.estado] = (porEstado[h.estado] || 0) + 1;
  return { total: del.length, porEstado, entregados: del.filter((h) => h.estado !== "no_enviado").length };
}

/* ── M-16 · Comisión del doctor = producción × % de su ficha ── */
export const comisionDe = (produccionDoctor, pct) => Math.round(num(produccionDoctor) * num(pct) / 100);

/* ── GLO-06 · Formatos únicos es-PE ── */
// Montos en tablas y documentos: «S/ 1,000.00». En KPIs: «S/ 1,000».
export const sol2 = (n) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const sol0 = (n) => Math.round(Number(n || 0)).toLocaleString("es-PE");
// Fecha corta para listas «mié 30 set.» y para tablas exportables «30/09/2026».
export const fechaCorta = (iso) => { const d = new Date(String(iso).slice(0, 10) + "T00:00:00"); return isNaN(d) ? String(iso || "—") : d.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" }).replace(",", ""); };
export const fechaDoc = (iso) => { const s = String(iso || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : (s || "—"); };
