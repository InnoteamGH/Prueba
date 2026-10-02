/* Pantalla #/reportes_mas — reportes de la clínica con selector de periodo.
   Cada reporte responde una pregunta concreta y se exporta a Excel/PDF con membrete:
   qué procedimientos se hicieron, quién debe, a quién llamar, cómo crece la cartera
   de pacientes y cómo va la caja. Toman los mismos datos que el resto del sistema
   (fichas, citas, pacientes y egresos) y las mismas definiciones de compartido/metricas. */
import React, { useContext, useMemo, useState } from "react";
import { BellRing, ClipboardList, Stethoscope, UserPlus, Wallet, Wallet2 } from "lucide-react";
import { auth } from "../api/client";
import { DataTable, DatosDemoCtx, Pestanas, Vacio } from "../comun";
import * as M from "../compartido/metricas";

const PERIODOS = [["hoy", "Hoy"], ["semana", "Esta semana"], ["mes", "Este mes"], ["mes_ant", "Mes anterior"], ["3m", "Últimos 3 meses"], ["anio", "Este año"]];
const iso = M.isoDe;
function rango(id, hoy = M.hoyISO()) {
  const d = new Date(hoy + "T00:00:00");
  const lunes = new Date(d); lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const ini = (y, m) => iso(new Date(y, m, 1));
  switch (id) {
    case "hoy": return { desde: hoy, hasta: hoy };
    case "semana": return { desde: iso(lunes), hasta: hoy };
    case "mes_ant": return { desde: ini(d.getFullYear(), d.getMonth() - 1), hasta: iso(new Date(d.getFullYear(), d.getMonth(), 0)) };
    case "3m": return { desde: ini(d.getFullYear(), d.getMonth() - 2), hasta: hoy };
    case "anio": return { desde: `${d.getFullYear()}-01-01`, hasta: hoy };
    default: return { desde: ini(d.getFullYear(), d.getMonth()), hasta: hoy };
  }
}
const enRango = (f, r) => { const x = String(f || "").slice(0, 10); return x && x >= r.desde && x <= r.hasta; };
const soles = (n) => `S/ ${M.sol0(n)}`;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesTxt = (ym) => { const [y, m] = ym.split("-"); return `${MESES[Number(m) - 1]} ${y.slice(2)}`; };
const servicioBase = (nombre) => String(nombre || "Procedimiento").split(" · ")[0];

const REPORTES = [
  { id: "procedimientos", label: "Procedimientos", icon: Stethoscope, sub: "Qué se hizo, cuántas veces y cuánto sumó" },
  { id: "saldo", label: "Pacientes con saldo", icon: Wallet, sub: "Trabajo hecho sin pagar y saldo del plan, al día de hoy" },
  { id: "recuperar", label: "Pacientes por recuperar", icon: BellRing, sub: "No vienen hace 6 meses o más y no tienen cita" },
  { id: "pacientes", label: "Nuevos y atendidos", icon: UserPlus, sub: "Pacientes nuevos, atendidos y recurrentes por mes" },
  { id: "caja", label: "Ingresos y egresos", icon: Wallet2, sub: "Lo cobrado por medio de pago, los egresos y el neto" },
];

export default function ReportesClinica() {
  const db = useContext(DatosDemoCtx) || {};
  const [rep, setRep] = useState("procedimientos");
  const [per, setPer] = useState("mes");
  const r = rango(per);
  const hoy = M.hoyISO();
  const fichas = db.fichas || {}, pacientes = db.pacientes || [], citas = db.citas || [], egresos = db.egresos || [];
  const nomP = (id) => (pacientes.find((p) => String(p.id) === String(id)) || {}).nombre || `Paciente ${id}`;
  const usaPeriodo = rep !== "saldo" && rep !== "recuperar";

  const datos = useMemo(() => {
    if (rep === "procedimientos") {
      const g = new Map();
      for (const [, f] of Object.entries(fichas)) for (const t of f?.tratamiento || []) {
        if (!["atendida", "terminada"].includes(t.estado)) continue;
        if (!enRango(t.terminadaEn || t.atendidaEn || t.fecha, r)) continue;
        const k = servicioBase(t.nombre); const a = g.get(k) || { id: k, nombre: k, cantidad: 0, importe: 0 };
        a.cantidad++; a.importe += Number(t.costo) || 0; g.set(k, a);
      }
      const filas = [...g.values()].map((x) => ({ ...x, promedio: x.cantidad ? x.importe / x.cantidad : 0 })).sort((a, b) => b.importe - a.importe);
      const tot = filas.reduce((a, x) => a + x.importe, 0), n = filas.reduce((a, x) => a + x.cantidad, 0);
      return { filas: filas.map((x) => ({ ...x, parte: tot ? (x.importe / tot) * 100 : 0 })), kpis: [["Procedimientos", String(n)], ["Importe", soles(tot)], ["Precio promedio", soles(n ? tot / n : 0)], ["Tipos distintos", String(filas.length)]], cifra: soles(tot), etiqueta: "en procedimientos realizados" };
    }
    if (rep === "saldo") {
      const c = M.cartera(fichas, pacientes, { hoy });
      const filas = c.filas.filter((f) => f.porCobrar > 0 || f.saldoPlan > 0).map((f) => ({ id: f.p.id, paciente: f.p.nombre, porCobrar: f.porCobrar, vencido: f.vencido, saldoPlan: f.saldoPlan, dias: f.porCobrarItems.reduce((a, it) => Math.max(a, it.dias || 0), 0) })).sort((a, b) => b.porCobrar - a.porCobrar);
      return { filas, kpis: [["Pacientes", String(filas.length)], ["Hecho sin pagar", soles(c.porCobrar)], ["Vencido (+30 días)", soles(c.vencido)], ["Saldo de planes", soles(c.saldoPlan)]], cifra: soles(c.porCobrar), etiqueta: "por cobrar de trabajo ya hecho" };
    }
    if (rep === "recuperar") {
      const filas = M.porReactivar(pacientes, citas, { hoy }).map((p) => ({ id: p.id, paciente: p.nombre, ultima: p.ultima, meses: p.meses, telefono: p.telefono || p.celular || "—" })).sort((a, b) => b.meses - a.meses);
      const sinTel = filas.filter((f) => f.telefono === "—").length;
      return { filas, kpis: [["Para llamar", String(filas.length)], ["Más de 12 meses", String(filas.filter((f) => f.meses >= 12).length)], ["Sin teléfono", String(sinTel)]], cifra: String(filas.length), etiqueta: "pacientes por recuperar" };
    }
    if (rep === "pacientes") {
      const at = citas.filter((c) => c.estado === "atendida");
      const primera = new Map();
      for (const c of at) { const k = String(c.pacienteId ?? c.paciente); if (!primera.has(k) || c.fecha < primera.get(k)) primera.set(k, c.fecha); }
      const meses = new Map();
      for (const c of at) {
        if (!enRango(c.fecha, r)) continue;
        const ym = String(c.fecha).slice(0, 7); const k = String(c.pacienteId ?? c.paciente);
        const a = meses.get(ym) || { id: ym, mes: mesTxt(ym), atendidos: new Set(), nuevos: new Set() };
        a.atendidos.add(k); if (primera.get(k) === c.fecha) a.nuevos.add(k); meses.set(ym, a);
      }
      const filas = [...meses.values()].sort((a, b) => a.id.localeCompare(b.id)).map((a) => ({ id: a.id, mes: a.mes, atendidos: a.atendidos.size, nuevos: a.nuevos.size, recurrentes: a.atendidos.size - a.nuevos.size }));
      const atT = new Set(at.filter((c) => enRango(c.fecha, r)).map((c) => String(c.pacienteId ?? c.paciente))).size;
      const nuT = filas.reduce((a, f) => a + f.nuevos, 0);
      return { filas, kpis: [["Pacientes atendidos", String(atT)], ["Nuevos", String(nuT)], ["Recurrentes", String(Math.max(0, atT - nuT))], ["Nuevos del total", atT ? `${Math.round((nuT / atT) * 100)}%` : "—"]], cifra: String(atT), etiqueta: "pacientes atendidos" };
    }
    // caja
    const ing = new Map(); let ingTot = 0;
    for (const [, f] of Object.entries(fichas)) for (const p of f?.pagos || []) {
      if (!enRango(p.fecha, r)) continue;
      const k = p.metodo || "Otro"; ing.set(k, (ing.get(k) || 0) + (Number(p.monto) || 0)); ingTot += Number(p.monto) || 0;
    }
    const egr = new Map(); let egrTot = 0;
    for (const e of egresos) {
      if ((e.moneda || "PEN") === "USD" || !enRango(e.fecha, r)) continue;
      const k = e.categoria || "Otros"; egr.set(k, (egr.get(k) || 0) + (Number(e.monto) || 0)); egrTot += Number(e.monto) || 0;
    }
    const filas = [
      ...[...ing.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ id: `i-${k}`, tipo: "Ingreso", concepto: `Cobros · ${k}`, monto: v })),
      ...[...egr.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ id: `e-${k}`, tipo: "Egreso", concepto: k, monto: -v })),
    ];
    return { filas, kpis: [["Ingresos", soles(ingTot)], ["Egresos", soles(egrTot)], ["Neto", `${ingTot - egrTot < 0 ? "− " : ""}${soles(Math.abs(ingTot - egrTot))}`]], cifra: `${ingTot - egrTot < 0 ? "− " : ""}${soles(Math.abs(ingTot - egrTot))}`, etiqueta: "neto de caja (soles)" };
  }, [rep, per, fichas, pacientes, citas, egresos]); // eslint-disable-line

  const cols = {
    procedimientos: [
      { key: "nombre", label: "Procedimiento", w: "minmax(220px,1.6fr)", a: "left", get: (x) => x.nombre, cell: (x) => <b style={{ color: "var(--dc-navy)" }}>{x.nombre}</b> },
      { key: "cantidad", label: "Cantidad", w: "110px", a: "right", get: (x) => x.cantidad },
      { key: "promedio", label: "Precio promedio", w: "150px", a: "right", get: (x) => Math.round(x.promedio), cell: (x) => soles(x.promedio) },
      { key: "importe", label: "Importe", w: "140px", a: "right", get: (x) => x.importe, cell: (x) => <b>{soles(x.importe)}</b> },
      { key: "parte", label: "Parte del total", w: "minmax(160px,1fr)", get: (x) => Math.round(x.parte), cell: (x) => <span className="dc-rcx__bar"><i style={{ width: `${x.parte}%` }} /><em>{x.parte.toFixed(1)}%</em></span> },
    ],
    saldo: [
      { key: "paciente", label: "Paciente", w: "minmax(200px,1.5fr)", a: "left", get: (x) => x.paciente, cell: (x) => <b style={{ color: "var(--dc-navy)" }}>{x.paciente}</b> },
      { key: "porCobrar", label: "Hecho sin pagar", w: "150px", a: "right", get: (x) => x.porCobrar, cell: (x) => <b style={{ color: x.porCobrar ? "var(--dc-danger-700)" : undefined }}>{soles(x.porCobrar)}</b> },
      { key: "vencido", label: "Vencido", w: "120px", a: "right", get: (x) => x.vencido, cell: (x) => soles(x.vencido) },
      { key: "dias", label: "Días sin pagar", w: "130px", a: "right", get: (x) => x.dias, cell: (x) => (x.porCobrar ? `${x.dias} d` : "—") },
      { key: "saldoPlan", label: "Saldo del plan", w: "140px", a: "right", get: (x) => x.saldoPlan, cell: (x) => soles(x.saldoPlan) },
    ],
    recuperar: [
      { key: "paciente", label: "Paciente", w: "minmax(200px,1.5fr)", a: "left", get: (x) => x.paciente, cell: (x) => <b style={{ color: "var(--dc-navy)" }}>{x.paciente}</b> },
      { key: "ultima", label: "Última visita", w: "150px", a: "left", get: (x) => x.ultima, cell: (x) => M.fechaDoc(x.ultima) },
      { key: "meses", label: "Meses sin venir", w: "140px", a: "right", get: (x) => x.meses },
      { key: "telefono", label: "Teléfono", w: "160px", a: "left", get: (x) => x.telefono },
    ],
    pacientes: [
      { key: "mes", label: "Mes", w: "minmax(120px,1fr)", a: "left", get: (x) => x.id, cell: (x) => <b style={{ color: "var(--dc-navy)" }}>{x.mes}</b> },
      { key: "atendidos", label: "Atendidos", w: "130px", a: "right", get: (x) => x.atendidos },
      { key: "nuevos", label: "Nuevos", w: "130px", a: "right", get: (x) => x.nuevos, cell: (x) => <b style={{ color: "var(--dc-ok-700)" }}>{x.nuevos}</b> },
      { key: "recurrentes", label: "Recurrentes", w: "130px", a: "right", get: (x) => x.recurrentes },
    ],
    caja: [
      { key: "tipo", label: "Tipo", w: "120px", a: "left", get: (x) => x.tipo, cell: (x) => <span className={`dc-pill ${x.tipo === "Ingreso" ? "is-ok" : ""}`} style={x.tipo === "Ingreso" ? undefined : { "--c": "#E0694F" }}><i /> {x.tipo}</span> },
      { key: "concepto", label: "Concepto", w: "minmax(200px,1.5fr)", a: "left", get: (x) => x.concepto },
      { key: "monto", label: "Monto", w: "150px", a: "right", get: (x) => x.monto, cell: (x) => <b style={{ color: x.monto < 0 ? "var(--dc-danger-700)" : "var(--dc-ok-700)" }}>{x.monto < 0 ? "− " : ""}{soles(Math.abs(x.monto))}</b> },
    ],
  }[rep];
  const R = REPORTES.find((x) => x.id === rep);
  const periodoTxt = r.desde === r.hasta ? M.fechaDoc(r.desde) : `${M.fechaDoc(r.desde)} al ${M.fechaDoc(r.hasta)}`;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{datos.cifra}</b><span>{datos.etiqueta}</span></div>
          <p>{R.sub}{usaPeriodo ? ` · ${periodoTxt}` : ""}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          {datos.kpis.map(([l, v]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
        </div>
        <span />
      </section>
      <Pestanas etiqueta="Reportes" valor={rep} onChange={setRep} opciones={REPORTES.map(({ id, label, icon }) => ({ id, label, icon }))} />
      {usaPeriodo && (
        <div className="dc-rcx__per" role="group" aria-label="Periodo">
          {PERIODOS.map(([k, l]) => <button key={k} type="button" className={per === k ? "is-on" : ""} onClick={() => setPer(k)}>{l}</button>)}
        </div>
      )}
      {auth.token && <div className="fm-aviso-edad is-info"><ClipboardList size={15} strokeWidth={2} /><span>Con sesión, estos reportes usan los datos ya cargados en esta pantalla; el cálculo del servidor está pendiente (requisitos mínimos, punto 38).</span></div>}
      <DataTable titulo={R.label} sub="filas" rows={datos.filas} cols={cols} minWidth={720} exportTitulo={`${R.label}${usaPeriodo ? ` · ${periodoTxt}` : ""}`}
        accion={rep === "recuperar" && datos.filas.length ? <button type="button" className="dc-rcx__ir" onClick={() => { window.location.hash = "#/recall"; }}><BellRing size={13} strokeWidth={2} /> Ir a Recordatorios</button> : null}
        empty={<Vacio icon={<ClipboardList size={22} strokeWidth={1.75} />} titulo={rep === "recuperar" ? "Nadie por recuperar" : rep === "saldo" ? "Nadie debe" : "Sin datos en este periodo"} sub={rep === "recuperar" ? "Todos los pacientes vinieron en los últimos 6 meses o ya tienen cita." : rep === "saldo" ? "No hay trabajo hecho sin pagar ni saldos de planes." : "Prueba con un periodo más amplio."} />} />
    </div>
  );
}
