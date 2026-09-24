/* Módulo Reportes / Productividad. Vivía dentro de App.jsx; se movió a su propio
   archivo para que Vite lo sirva en un chunk aparte y no pese en el arranque. */
import React, { useState, useEffect } from "react";
import { AlertTriangle, ArrowUpRight, BarChart3, CheckCircle2, DollarSign, FileSpreadsheet, LayoutDashboard, MessageSquare, Percent, Star, Stethoscope, TrendingUp, UserCheck, Users, Wallet } from "lucide-react";
import api, { auth } from "../api/client";
import { Btn, Card, CITAS_INIT, DISPLAY_FONT, DS, DataTable, ESPECIALIDADES, KpiCard, MEDICOS, ModHead, NAVY, PACIENTES_INIT, RED, Select, Vacio, addDays, exportarExcel, fmt, hoy } from "../comun";
import { layoutBarras, maxSerie } from "../util/barras";
import { normalizarProduccionEsp } from "../util/produccionEsp";
import Comisiones from "./Comisiones";

const REP_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const REP_LEADS = [39, 56, 40, 71, 70, 61, 68, 49, 70, 66, 52, 48];
const REP_NUEVOS = [28, 50, 32, 44, 39, 49, 41, 35, 44, 33, 24, 22];
const REP_CONV = [12, 24, 15, 24, 25, 24, 17, 22, 13, 10, 14, 13];
const REP_ING = [8200, 9100, 11500, 13800, 12400, 16200, 18900, 17300, 14100, 19600, 15200, 12800];
const REP_EGR = [3100, 3600, 4200, 4800, 4100, 5200, 6100, 5400, 4700, 6300, 5100, 4300];
const REP_FUNNEL = [
  { q: "T1", leads: 20, nuevos: 10, conv: 8, ing: 3534 },
  { q: "T2", leads: 25, nuevos: 8, conv: 3, ing: 4502 },
  { q: "T3", leads: 22, nuevos: 18, conv: 2, ing: 6304 },
  { q: "T4", leads: 22, nuevos: 10, conv: 2, ing: 4502 },
];
const REP_TOP = (() => {
  const acc = {};
  for (const c of CITAS_INIT.filter((x) => x.estado === "atendida")) {
    const precio = ESPECIALIDADES.find((e) => e.id === c.esp)?.precio || 80;
    acc[c.paciente] = (acc[c.paciente] || 0) + precio;
  }
  return Object.entries(acc).map(([paciente, monto]) => ({ paciente, monto })).sort((a, b) => b.monto - a.monto).slice(0, 5);
})();

// Mini gráfico de líneas (SVG) para varias series {label,color,data}
function RepLineChart({ series, labels, height = 220 }) {
  const W = 720, H = height, pad = { l: 34, r: 12, t: 14, b: 26 };
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const n = labels.length;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (n - 1);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 480, display: "block" }}>
        {grid.map((g, i) => { const yy = pad.t + (H - pad.t - pad.b) * (1 - g); return <g key={i}><line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="var(--dc-line)" strokeWidth="1" /><text x={pad.l - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="var(--dc-ink-400)">{Math.round(max * g)}</text></g>; })}
        {labels.map((l, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--dc-ink-400)">{l}</text>)}
        {series.map((s) => (
          <g key={s.label}>
            <polyline fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={s.data.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {s.data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--dc-white)" stroke={s.color} strokeWidth="2" />)}
          </g>
        ))}
      </svg>
    </div>
  );
}
// Mini gráfico de barras agrupadas (ingresos vs egresos)
function RepBarChart({ labels, a, b, colorA = DS.c.primary, colorB = "var(--dc-danger)", height = 240 }) {
  const W = 720, H = height, pad = { l: 40, r: 12, t: 14, b: 26 };
  const max = Math.max(1, ...a, ...b);
  const n = labels.length, band = (W - pad.l - pad.r) / n, bw = Math.min(14, band / 3);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const base = H - pad.b;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 520, display: "block" }}>
        {[0, 0.5, 1].map((g, i) => { const yy = pad.t + (H - pad.t - pad.b) * (1 - g); return <g key={i}><line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="var(--dc-line)" /><text x={pad.l - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="var(--dc-ink-400)">{Math.round(max * g / 1000)}k</text></g>; })}
        {labels.map((l, i) => { const cx = pad.l + band * i + band / 2; return (
          <g key={i}>
            <rect x={cx - bw - 1} y={y(a[i])} width={bw} height={base - y(a[i])} rx="2" fill={colorA} />
            <rect x={cx + 1} y={y(b[i])} width={bw} height={base - y(b[i])} rx="2" fill={colorB} />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--dc-ink-400)">{l}</text>
          </g>
        ); })}
      </svg>
    </div>
  );
}

// Tabla de pago fijo por tratamiento terminado (como el reporte del cliente).
const PROD_TRAT = [
  { n: "Curación con resina esencial", pago: 150 }, { n: "Curación resina plus", pago: 220 },
  { n: "Consulta / evaluación", pago: 80 }, { n: "Consulta web", pago: 50 },
  { n: "Curación con resina full", pago: 350 }, { n: "Pack sonrisa segura", pago: 280 },
  { n: "Profilaxis (limpieza dental)", pago: 120 }, { n: "Endodoncia unirradicular", pago: 350 },
  { n: "Extracción simple", pago: 120 }, { n: "Corona de porcelana", pago: 800 },
];
// Producción por doctor (demo determinista): un tratamiento SOLO cuenta para el pago
// cuando el doctor llenó la evolución en la historia clínica.
const PRODUCCION_DEMO = (() => {
  const rows = []; let id = 1;
  PACIENTES_INIT.slice(0, 16).forEach((p) => {
    const nTrat = 1 + (p.id % 2);
    for (let k = 0; k < nTrat; k++) {
      const t = PROD_TRAT[(p.id * 3 + k) % PROD_TRAT.length];
      const med = MEDICOS[(p.id + k) % MEDICOS.length];
      const evol = ((p.id * 5 + k * 7) % 10) < 7; // ~70% con evolución llena
      rows.push({ id: id++, medicoId: med.id, medico: med.nombre, paciente: p.nombre, tratamiento: t.n, cantidad: 1, pago: t.pago, evolucion: evol, fecha: addDays(-((p.id + k) % 20)) });
    }
  });
  return rows;
})();

function Reportes({ citas = [], pacientes = [], can, tabInicial }) {
  const puedeExportar = can ? can("reportes", "exportar") : true;
  const conectado = !!auth.token;
  const [rep, setRep] = useState(null);
  const [prodReal, setProdReal] = useState(null); // produccion por doctor (backend, ligada a evolucion)
  const [citasRem, setCitasRem] = useState(null);
  const [docsRem, setDocsRem] = useState(null);
  useEffect(() => {
    if (!conectado) return;
    api.gerencialReportes().then(setRep).catch(() => {});
    api.gerencialProduccion().then(setProdReal).catch(() => {});
    api.citas.listar("all").then((r) => setCitasRem(r || [])).catch(() => setCitasRem([]));
    api.catalogo.medicos().then((r) => setDocsRem(r || [])).catch(() => setDocsRem([]));
  }, []); // eslint-disable-line
  const [tab, setTab] = useState(tabInicial || (conectado ? "resumen" : "produccion"));
  const [prodMed, setProdMed] = useState("all");
  const nfmt = (n) => "S/ " + (Number(n) || 0).toLocaleString("es-PE");
  // Reporte gerencial → libro Excel real con 2 hojas (Por mes / Por especialidad).
  const exportarResumen = async () => {
    if (!rep) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const wsMes = XLSX.utils.aoa_to_sheet([["Mes", "Ingresos", "Atendidas", "Ausencias"], ...(rep.porMes || []).map((m) => [m.mes, Number(m.ingresos) || 0, m.atendidas, m.ausencias])]);
    wsMes["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsMes, "Por mes");
    const wsEsp = XLSX.utils.aoa_to_sheet([["Especialidad", "Atendidas", "Producción"], ...(rep.porEspecialidad || []).map((e) => [e.especialidad, e.atendidas, Number(e.produccion) || 0])]);
    wsEsp["!cols"] = [{ wch: 26 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsEsp, "Por especialidad");
    XLSX.writeFile(wb, `reporte_gerencial_${fmt(hoy)}.xlsx`);
  };
  const descargarProduccion = (rows) => exportarExcel({
    nombreArchivo: `produccion_por_doctor_${fmt(hoy)}.xlsx`, hoja: "Producción",
    titulo: "Producción por doctor (tratamientos terminados)",
    columnas: [
      { key: "medico", label: "Doctor", w: 24 }, { key: "paciente", label: "Paciente", w: 24 },
      { key: "tratamiento", label: "Tratamiento terminado", w: 34 }, { key: "cantidad", label: "Cantidad", w: 10 },
      { key: "pago", label: "Valor del tratamiento", w: 20 }, { key: "evolucion", label: "Evolución", w: 12 },
    ],
    filas: rows.map((r) => ({ medico: r.medico, paciente: r.paciente, tratamiento: r.tratamiento, cantidad: r.cantidad, pago: Number(r.pago.toFixed(2)), evolucion: r.evolucion ? "Llena" : "Falta" })) });
  const totLeads = REP_FUNNEL.reduce((s, r) => s + r.leads, 0);
  const totNuevos = REP_FUNNEL.reduce((s, r) => s + r.nuevos, 0);
  const totConv = REP_FUNNEL.reduce((s, r) => s + r.conv, 0);
  const totIng = REP_ING.reduce((s, v) => s + v, 0);
  const totEgr = REP_EGR.reduce((s, v) => s + v, 0);
  const util = totIng - totEgr;
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
  // El embudo se quita: ya vive en el Dashboard gerencial y era el mismo dato dos veces.
  // Comisiones entra aqui como pestaña: calcula lo mismo que "Produccion x doctor".
  // La pestaña Comisiones solo para quien tenga permiso: un odontologo NO debe ver
  // lo que cobran sus colegas (antes Comisiones era un modulo aparte con su permiso).
  const veComisiones = can ? can("comisiones", "ver") : true;
  const TABS = [...(conectado ? [["resumen", "Resumen (real)", LayoutDashboard]] : []), ["produccion", "Producción x doctor", Stethoscope], ["ausentismo", "Ausentismo x doctor", UserCheck], ...(veComisiones ? [["comisiones", "Comisiones", Percent]] : []), // Las dos se apoyan en doce meses escritos a mano (REP_ING, REP_EGR): son un ejemplo
  // comercial, no la contabilidad de la clínica. Con sesión abierta no se ofrecen.
  ...(conectado ? [] : [["flujo", "Ingresos y egresos", BarChart3], ["anual", "Reporte anual", TrendingUp]])];
  const soft = DS.card;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ModHead icon={<TrendingUp size={20} strokeWidth={1.75} />} titulo="Producción y comisiones" sub="Resumen, producción por doctor, ausentismo y liquidaciones" />
      <div style={{ display: "flex", gap: 6, background: "var(--dc-white)", border: "1px solid var(--dc-line)", borderRadius: 22, padding: 4, boxShadow: "0 1px 2px rgba(16,24,40,.04)", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
        {TABS.map(([k, lbl, Ic]) => { const on = tab === k; return (
          <button key={k} onClick={() => setTab(k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 15px", borderRadius: "var(--dc-r-full)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", background: on ? NAVY : "transparent", color: on ? "var(--dc-white)" : "var(--dc-ink-400)" }}><Ic size={15} strokeWidth={1.75} /> {lbl}</button>
        ); })}
      </div>

      {tab === "resumen" && (() => {
        const r = rep || { porMes: [], porEspecialidad: [], funnel: {}, ausentismo: 0 };
        const meses = r.porMes || [];
        const ingTotal = meses.reduce((s, m) => s + (Number(m.ingresos) || 0), 0);
        const atendTotal = meses.reduce((s, m) => s + (Number(m.atendidas) || 0), 0);
        const f = r.funnel || {};
        return (
          <div style={{ display: "grid", gap: 16 }}>
            {!rep && <Card style={{ padding: 18 }}><div style={{ color: "var(--dc-ink-500)", fontSize: 13 }}>Cargando reportes…</div></Card>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {puedeExportar && <Btn small kind="ghost" onClick={exportarResumen}><FileSpreadsheet size={14} strokeWidth={1.75} /> Exportar Excel</Btn>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <KpiCard label="Ingresos · últimos 6 meses" value={nfmt(ingTotal)} color={NAVY} icon={<DollarSign size={18} strokeWidth={1.75} />} sub="cobrado real" />
              <KpiCard label="Atenciones · últimos 6 meses" value={atendTotal} color={NAVY} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} sub="citas atendidas" />
              {/* El backend lo calcula sobre TODA la historia de la clínica. En el tablero
                  gerencial, "citas que se pierden" mide solo el mes en curso: son dos cifras
                  distintas y ninguna decía su periodo. */}
              <KpiCard label="Ausentismo histórico" value={`${r.ausentismo || 0}%`} color={r.ausentismo >= 15 ? "var(--dc-red)" : NAVY} icon={<AlertTriangle size={18} strokeWidth={1.75} />} sub="canceladas + no-show, desde el inicio" />
              <KpiCard label="Captación WhatsApp · periodo" value={`${f.agendadas || 0}`} color={NAVY} icon={<MessageSquare size={18} strokeWidth={1.75} />} sub={`${f.conversaciones || 0} conversaciones · ${f.agendadas || 0} citas agendadas`} />
            </div>
            <Card style={{ padding: "18px 20px" }}>
              <h3 style={{ margin: "0 0 14px", color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Ingresos por mes · últimos 6 meses</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 160 }}>
                {(() => {
                  const vals = meses.map((m) => Number(m.ingresos) || 0);
                  const layout = layoutBarras(vals);
                  const ceros = layout.filter((b) => b.valor === 0).length;
                  if (meses.length >= 6 && ceros > 4) {
                    return <div style={{ width: "100%" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr><th style={{ textAlign: "left", padding: 6 }}>Mes</th><th style={{ textAlign: "right", padding: 6 }}>Ingresos</th></tr></thead><tbody>{meses.map((m, i) => <tr key={i} style={{ borderTop: "1px solid var(--dc-line)" }}><td style={{ padding: 6 }}>{m.mes}</td><td style={{ padding: 6, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{nfmt(m.ingresos)}</td></tr>)}</tbody></table></div>;
                  }
                  return layout.map((b, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{(() => { const n = b.valor; if (n >= 1000) { const k = n / 1000; return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + "k"; } return n || ""; })()}</div>
                      {b.dibujar
                        ? <div title={nfmt(b.valor)} style={{ width: "100%", maxWidth: 46, height: `${b.pct}%`, maxHeight: 130, borderRadius: "var(--dc-r-sm) var(--dc-r-sm) 0 0", background: "var(--dc-ok-700)" }} />
                        : <div style={{ height: 0 }} />}
                      <div style={{ fontSize: 12, color: "var(--dc-ink-700)", fontWeight: 600 }}>{meses[i].mes}</div>
                    </div>
                  ));
                })()}
                {meses.length === 0 && <div style={{ color: "var(--dc-ink-500)", fontSize: 13 }}>Sin datos de ingresos aún.</div>}
              </div>
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
              <Card style={{ padding: "18px 20px" }}>
                <h3 style={{ margin: "0 0 14px", color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Producción por especialidad · mismos 6 meses</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {normalizarProduccionEsp(r.porEspecialidad || []).slice(0, 8).map((e, i) => {
                    const maxP = maxSerie((r.porEspecialidad || []).map((x) => Number(x.produccion) || 0));
                    const { dibujar, pct } = (() => { const v = Number(e.produccion) || 0; if (v <= 0 || maxP <= 0) return { dibujar: false, pct: 0 }; const p = Math.min(100, (v / maxP) * 100); return p < 5 ? { dibujar: false, pct: p } : { dibujar: true, pct: p }; })();
                    return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}><span style={{ color: NAVY, fontWeight: 600 }}>{e.especialidad}</span><span style={{ color: "var(--dc-ink-700)", fontVariantNumeric: "tabular-nums" }}>{nfmt(e.produccion)} · {e.atendidas}</span></div>
                      {dibujar ? <div style={{ height: 8, borderRadius: "var(--dc-r-full)", background: "var(--dc-line)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", borderRadius: "var(--dc-r-full)", background: DS.c.primary }} /></div> : <div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>—</div>}
                    </div>
                    );
                  })}
                  {(r.porEspecialidad || []).length === 0 && <div style={{ color: "var(--dc-ink-500)", fontSize: 13 }}>Sin atenciones registradas.</div>}
                </div>
              </Card>
              <Card style={{ padding: "18px 20px" }}>
                <h3 style={{ margin: "0 0 14px", color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT, display: "flex", alignItems: "center", gap: 7 }}><MessageSquare size={16} strokeWidth={1.75} color="var(--dc-ok-700)" /> Captación por WhatsApp · periodo</h3>
                {(() => {
                  const serie = [f.conversaciones || 0, f.agendadas || 0, f.atendidas || 0];
                  const layout = layoutBarras(serie);
                  const labels = ["Conversaciones WhatsApp", "Agendadas (sin cancelar/no-show)", "Atendidas"];
                  const colors = [DS.c.primary, DS.c.accent, "var(--dc-ok-700)"];
                  return labels.map((l, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}><span style={{ color: NAVY, fontWeight: 600 }}>{l}</span><span style={{ color: "var(--dc-ink-700)", fontVariantNumeric: "tabular-nums" }}>{layout[i].valor}</span></div>
                      {layout[i].dibujar
                        ? <div style={{ height: 10, borderRadius: "var(--dc-r-full)", background: "var(--dc-line)", overflow: "hidden" }}><div style={{ width: `${layout[i].pct}%`, height: "100%", borderRadius: "var(--dc-r-full)", background: colors[i] }} /></div>
                        : <div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>—</div>}
                    </div>
                  ));
                })()}
              </Card>
            </div>
          </div>
        );
      })()}
      {tab === "produccion" && (() => {
        // Datos reales (backend, ligados a la evolución) o demo si no hay conexión.
        const allRows = conectado
          ? (prodReal?.detalle || []).map((r, i) => ({ id: "p" + i, medicoId: null, medico: r.doctor, paciente: r.paciente, tratamiento: r.especialidad, cantidad: 1, pago: Number(r.valor) || 0, evolucion: !!r.evolucion }))
          : PRODUCCION_DEMO;
        const rows = allRows.filter((r) => prodMed === "all" || (conectado ? r.medico === prodMed : r.medicoId === Number(prodMed)));
        const conEvol = rows.filter((r) => r.evolucion);
        const totalPagar = conEvol.reduce((s, r) => s + r.pago, 0);
        const pendientes = rows.filter((r) => !r.evolucion);
        const retenido = pendientes.reduce((s, r) => s + r.pago, 0);
        // resumen por doctor
        const porDoc = conectado
          ? (prodReal?.porDoctor || []).map((d) => ({ m: { id: d.doctor, nombre: d.doctor, color: NAVY }, n: d.atendidas, pagar: Number(d.produccion) || 0, falta: d.sinEvolucion }))
          : MEDICOS.map((m) => { const rs = PRODUCCION_DEMO.filter((r) => r.medicoId === m.id); return { m, n: rs.length, pagar: rs.filter((r) => r.evolucion).reduce((s, r) => s + r.pago, 0), falta: rs.filter((r) => !r.evolucion).length }; }).filter((d) => d.n > 0);
        return (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Sin encabezado propio: el módulo ya se llama "Producción y comisiones" y la
              pestaña activa, "Producción x doctor". Un tercer título no añadía nada. */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <Select small width={220} ariaLabel="Filtrar por doctor" value={prodMed} onChange={setProdMed}
                    options={[{ value: "all", label: "Todos los doctores" },
                              ...(conectado ? porDoc.map((d) => d.m) : MEDICOS).map((m) => ({ value: m.id, label: m.nombre }))]} />
            {puedeExportar && <Btn small onClick={() => descargarProduccion(rows)}><FileSpreadsheet size={15} strokeWidth={1.75} /> Descargar Excel</Btn>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {/* Es la producción que ya cuenta, no lo que se le paga al doctor: al doctor
                se le paga su comisión, un porcentaje de esta cifra (pestaña Comisiones). */}
            <KpiCard label="Valor de tratamientos (con evolución)" value={`S/ ${totalPagar.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--dc-ok-700)" icon={<Wallet size={18} strokeWidth={1.75} />} sub={`${conEvol.length} tratamiento(s) · precio de catálogo, no comisión`} />
            <KpiCard label="Tratamientos terminados" value={rows.length} color={NAVY} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} sub="en el periodo" />
            <KpiCard label="Falta evolución" value={pendientes.length} color={pendientes.length ? "var(--dc-warn-600)" : "var(--dc-ok-700)"} icon={<AlertTriangle size={18} strokeWidth={1.75} />} sub={`S/ ${retenido.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sin contar`} />
          </div>
          <Card style={{ padding: 14, background: "var(--dc-bg)", border: "1px solid var(--dc-sky)" }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--dc-info-ink)", lineHeight: 1.55 }}><Stethoscope size={17} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} /> <span>El trabajo del doctor termina con el <strong>tratamiento + la evolución</strong>: aquí solo cuenta la producción de los tratamientos con la evolución llena, y los que dicen «Falta evolución» quedan fuera hasta completarla.<br />Las cifras de esta pestaña son el <strong>valor de los tratamientos</strong> —lo que factura la clínica—, no lo que se le paga al doctor: eso es su comisión, un porcentaje de su producción, y se liquida en la pestaña <strong>Comisiones</strong>.</span></div></Card>
          {porDoc.length > 1 && prodMed === "all" && (() => {
            // Ordenado por lo que se paga y con barra proporcional al primero: quién
            // produce más y cuánta diferencia hay se ve sin comparar cifras a mano.
            const soles = (v) => v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const rank = porDoc
              .map((d) => ({ ...d, retenido: allRows.filter((r) => !r.evolucion && r.medico === d.m.nombre).reduce((a, r) => a + r.pago, 0) }))
              .sort((a, b) => b.pagar - a.pagar);
            const tope = Math.max(1, ...rank.map((d) => d.pagar));
            return (
            <Card style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 13 }}>
                <h4 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Ranking del equipo</h4>
                <span style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>por producción con evolución · clic para ver su detalle</span>
              </div>
              <div style={{ display: "grid", gap: 11 }}>
                {rank.map((d, i) => (
                  <button key={d.m.id} onClick={() => setProdMed(String(d.m.id))} title={`Ver el detalle de ${d.m.nombre}`}
                          style={{ textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "grid", gridTemplateColumns: "18px 1fr", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? NAVY : "var(--dc-ink-400)", fontFamily: DISPLAY_FONT, textAlign: "right" }}>{i + 1}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontWeight: 600, color: NAVY, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.m.nombre}</span>
                        <span style={{ fontWeight: 700, color: "var(--dc-ok-700)", fontFamily: DISPLAY_FONT, fontSize: 15, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>S/ {soles(d.pagar)}</span>
                      </span>
                      <span style={{ display: "block", height: 7, borderRadius: "var(--dc-r-full)", background: "var(--dc-line)", margin: "5px 0 3px" }}>
                        <span style={{ display: "block", width: `${Math.round((d.pagar / tope) * 100)}%`, height: "100%", borderRadius: "var(--dc-r-full)", background: d.m.color || NAVY }} />
                      </span>
                      <span style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--dc-ink-400)" }}>
                        <span>{d.n} tratamiento(s)</span>
                        {d.retenido > 0 && <span style={{ color: "var(--dc-warn-600)", fontWeight: 600 }}>· S/ {soles(d.retenido)} sin contar por falta de evolución</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>
            );
          })()}
          <DataTable titulo="Tratamientos terminados por doctor" sub="tratamientos" minWidth={900} rows={rows} defaultSort={{ key: "medico", dir: "asc" }} empty={<Vacio icon={<Stethoscope size={22} strokeWidth={1.75} />} titulo="Sin producción" sub="No hay tratamientos en el periodo." />} cols={[
            { key: "medico", label: "Doctor", w: "minmax(150px,1.2fr)", a: "left", get: (r) => r.medico, cell: (r) => { const m = MEDICOS.find((x) => x.id === r.medicoId); return <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: NAVY, fontSize: 13 }}><span style={{ width: 8, height: 8, borderRadius: "var(--dc-r-full)", background: m?.color || NAVY, flexShrink: 0 }} />{r.medico}</span>; } },
            { key: "paciente", label: "Paciente", w: "minmax(150px,1.3fr)", a: "left", get: (r) => r.paciente, cell: (r) => <span style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>{r.paciente}</span> },
            { key: "tratamiento", label: "Tratamiento terminado", w: "minmax(180px,1.6fr)", a: "left", get: (r) => r.tratamiento, cell: (r) => <span style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>{r.tratamiento}</span> },
            { key: "cantidad", label: "Cant.", w: "70px", a: "right", get: (r) => r.cantidad, cell: (r) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums" }}>{r.cantidad}</span> },
            { key: "pago", label: "Valor", w: "120px", a: "right", get: (r) => r.pago, cell: (r) => <span style={{ fontWeight: 700, color: r.evolucion ? "var(--dc-ok-700)" : "var(--dc-ink-400)", fontFamily: DISPLAY_FONT, fontSize: 15, fontVariantNumeric: "tabular-nums", textDecoration: r.evolucion ? "none" : "line-through" }}>S/ {r.pago.toFixed(2)}</span> },
            { key: "evolucion", label: "Evolución", w: "minmax(120px,0.9fr)", a: "center", get: (r) => r.evolucion ? "Llena" : "Falta", cell: (r) => r.evolucion
              ? <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dc-ok-700)", background: "var(--dc-ok-soft)", padding: "4px 11px", borderRadius: "var(--dc-r-full)", display: "inline-flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={12} strokeWidth={1.75} /> Llena</span>
              : <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", padding: "4px 11px", borderRadius: "var(--dc-r-full)", display: "inline-flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} strokeWidth={1.75} /> Falta evolución</span> },
          ]} />
        </div>
        );
      })()}

      {tab === "ausentismo" && (() => {
        // DC-08b / DC-29 — no_show + cancelada por doctor (clave = medicoId del catálogo)
        const docs = (conectado && docsRem && docsRem.length)
          ? docsRem.map((m) => ({ id: m.id, nombre: m.nombre }))
          : MEDICOS;
        const fuente = (conectado && citasRem) ? citasRem : (citas || []);
        const byName = new Map(docs.map((m) => [String(m.nombre || "").trim().toLowerCase(), m.id]));
        const nomDoc = (c) => {
          if (c.medicoId != null && String(c.medicoId) !== "") {
            const fromCat = docs.find((m) => String(m.id) === String(c.medicoId));
            if (fromCat?.nombre) return fromCat.nombre;
          }
          if (c.medico) return c.medico;
          if (c.medicoId) return `Doctor ${c.medicoId}`;
          return null;
        };
        const keyDoc = (c) => {
          if (c.medicoId != null && String(c.medicoId) !== "") return c.medicoId;
          if (c.medico) {
            const resolved = byName.get(String(c.medico).trim().toLowerCase());
            if (resolved != null) return resolved;
            return c.medico;
          }
          return "?";
        };
        const aus = fuente.filter((c) => c.estado === "no_show" || c.estado === "cancelada");
        const noShows = aus.filter((c) => c.estado === "no_show");
        const canceladas = aus.filter((c) => c.estado === "cancelada");
        const totalCitas = fuente.length;
        const totPorDoc = new Map();
        for (const c of fuente) {
          const key = keyDoc(c);
          totPorDoc.set(String(key), (totPorDoc.get(String(key)) || 0) + 1);
        }
        const map = new Map();
        for (const m of docs) {
          const key = m.id;
          map.set(String(key), { id: key, medico: m.nombre, noShow: 0, cancelada: 0, total: 0 });
        }
        for (const c of aus) {
          const key = keyDoc(c);
          const sk = String(key);
          const nombre = nomDoc(c) || "Sin médico";
          if (!map.has(sk)) map.set(sk, { id: key, medico: nombre, noShow: 0, cancelada: 0, total: 0 });
          const row = map.get(sk);
          if (c.estado === "no_show") row.noShow++;
          else row.cancelada++;
          row.total++;
        }
        const rows = [...map.values()].map((r) => {
          const den = totPorDoc.get(String(r.id)) || totPorDoc.get(String(r.medico)) || 0;
          return { ...r, tasa: den ? Math.round((r.total / den) * 1000) / 10 : 0, programadas: den };
        }).filter((r) => r.programadas > 0 || r.total > 0).sort((a, b) => b.tasa - a.tasa);
        const tasaPerdidas = totalCitas ? Math.round((aus.length / totalCitas) * 1000) / 10 : 0;
        const tasaNoShow = totalCitas ? Math.round((noShows.length / totalCitas) * 1000) / 10 : 0;
        return (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <KpiCard label="Citas perdidas" value={`${tasaPerdidas}%`} color="var(--dc-red)" icon={<AlertTriangle size={18} strokeWidth={1.75} />} sub={`${aus.length} de ${totalCitas} · inasistencias + canceladas`} />
              <KpiCard label="Inasistencias (no-show)" value={`${tasaNoShow}%`} color="var(--dc-warn-600)" icon={<UserCheck size={18} strokeWidth={1.75} />} sub={`${noShows.length} cita(s) sin aviso`} />
              <KpiCard label="Canceladas" value={canceladas.length} color={NAVY} icon={<AlertTriangle size={18} strokeWidth={1.75} />} sub="con aviso · no son inasistencia" />
            </div>
            <DataTable titulo="Ausentismo por doctor" sub="doctores" minWidth={720} rows={rows} empty={<Vacio icon={<CheckCircle2 size={22} strokeWidth={1.75} />} titulo="Sin ausencias" sub="No hay citas canceladas ni no-show en el listado." />} cols={[
              { key: "medico", label: "Doctor", w: "minmax(180px,1.4fr)", a: "left", get: (r) => r.medico, cell: (r) => <span style={{ fontWeight: 600, color: NAVY }}>{r.medico}</span> },
              { key: "noShow", label: "No asistió", w: "110px", a: "right", get: (r) => r.noShow, cell: (r) => <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--dc-warn-600)" }}>{r.noShow}</span> },
              { key: "cancelada", label: "Canceladas", w: "110px", a: "right", get: (r) => r.cancelada, cell: (r) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.cancelada}</span> },
              { key: "total", label: "Ausencias", w: "100px", a: "right", get: (r) => r.total, cell: (r) => <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.total}</span> },
              { key: "tasa", label: "Tasa", w: "100px", a: "right", get: (r) => r.tasa, cell: (r) => <span style={{ fontWeight: 600, color: r.tasa >= 15 ? "var(--dc-red)" : NAVY, fontVariantNumeric: "tabular-nums" }}>{r.tasa}%</span> },
              { key: "programadas", label: "Citas", w: "90px", a: "right", get: (r) => r.programadas, cell: (r) => <span style={{ color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums" }}>{r.programadas}</span> },
            ]} />
          </div>
        );
      })()}

      {tab === "comisiones" && veComisiones && <Comisiones citas={citas} can={can} />}

      {tab === "embudo" && (<>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <KpiCard label="Leads (agendaron)" value={totLeads} color={DS.c.primary} icon={<Users size={18} strokeWidth={1.75} />} sub="100% del embudo" />
          <KpiCard label="Nuevos (asistieron)" value={totNuevos} color={DS.c.primary} icon={<UserCheck size={18} strokeWidth={1.75} />} sub={`${pct(totNuevos, totLeads)}% de leads`} />
          <KpiCard label="Convertidos (pagaron)" value={totConv} color="var(--dc-ok-700)" icon={<DollarSign size={18} strokeWidth={1.75} />} sub={`${pct(totConv, totLeads)}% de leads`} />
          <KpiCard label="Ingreso del embudo" value={`S/ ${REP_FUNNEL.reduce((s, r) => s + r.ing, 0).toLocaleString()}`} color={NAVY} icon={<Wallet size={18} strokeWidth={1.75} />} sub="anual" />
        </div>
        <div style={{ ...soft, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-bg)" }}><h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Embudo de ventas por trimestre</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>De cuántos pacientes agendaron, cuántos vinieron y cuántos pagaron</div></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "var(--dc-bg-soft2)" }}>
                <th style={{ textAlign: "left", padding: "11px 20px", fontSize: 12, fontWeight: 600, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".04em" }}>Etapa</th>
                {REP_FUNNEL.map((r) => <th key={r.q} style={{ textAlign: "center", padding: "11px 12px", fontSize: 12, fontWeight: 600, color: "var(--dc-ink-400)" }}>{r.q}</th>)}
              </tr></thead>
              <tbody>
                {[["Leads (agendaron cita)", "leads", DS.c.primary], ["Nuevos (asistieron)", "nuevos", DS.c.accent], ["Convertidos (pagaron)", "conv", "var(--dc-ok-700)"]].map(([lbl, key, col]) => (
                  <tr key={key} style={{ borderTop: "1px solid var(--dc-bg)" }}>
                    <td style={{ padding: "11px 20px", fontWeight: 600, color: NAVY, display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "var(--dc-r-full)", background: col }} /> {lbl}</td>
                    {REP_FUNNEL.map((r) => <td key={r.q} style={{ textAlign: "center", padding: "11px 12px", fontVariantNumeric: "tabular-nums" }}><span style={{ fontWeight: 600, color: NAVY }}>{r[key]}</span> <span style={{ color: "var(--dc-ink-400)", fontSize: 12 }}>{pct(r[key], r.leads)}%</span></td>)}
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--dc-line)", background: "var(--dc-white)" }}>
                  <td style={{ padding: "11px 20px", fontWeight: 600, color: "var(--dc-warn-600)" }}>Ingreso obtenido (S/)</td>
                  {REP_FUNNEL.map((r) => <td key={r.q} style={{ textAlign: "center", padding: "11px 12px", fontWeight: 700, color: "var(--dc-warn-600)", fontFamily: DISPLAY_FONT, fontVariantNumeric: "tabular-nums" }}>{r.ing.toLocaleString()}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ ...soft, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>N° de pacientes según etapa del embudo</h3>
            <div style={{ display: "flex", gap: 14, fontSize: 12, fontWeight: 600 }}>
              {[["Leads", DS.c.primary], ["Nuevos", DS.c.accent], ["Convertidos", "var(--dc-ok-700)"]].map(([l, c]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--dc-ink-700)" }}><span style={{ width: 10, height: 10, borderRadius: "var(--dc-r-sm)", background: c }} /> {l}</span>)}
            </div>
          </div>
          <RepLineChart labels={REP_MESES} series={[{ label: "Leads", color: DS.c.primary, data: REP_LEADS }, { label: "Nuevos", color: DS.c.accent, data: REP_NUEVOS }, { label: "Convertidos", color: "var(--dc-ok-700)", data: REP_CONV }]} />
        </div>
      </>)}

      {tab === "flujo" && (<>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <KpiCard label="Ingresos del año" value={`S/ ${totIng.toLocaleString()}`} color="var(--dc-ok-700)" icon={<ArrowUpRight size={18} strokeWidth={1.75} />} sub="12 meses" />
          <KpiCard label="Egresos del año" value={`S/ ${totEgr.toLocaleString()}`} color={RED} icon={<ArrowUpRight size={18} strokeWidth={1.75} style={{ transform: "rotate(90deg)" }} />} sub="12 meses" />
          <KpiCard label="Utilidad" value={`S/ ${util.toLocaleString()}`} color={util >= 0 ? "var(--dc-ok-700)" : RED} icon={<Wallet size={18} strokeWidth={1.75} />} sub={`margen ${pct(util, totIng)}%`} />
        </div>
        <div style={{ ...soft, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Ingresos y egresos por mes</h3>
            <div style={{ display: "flex", gap: 14, fontSize: 12, fontWeight: 600 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--dc-ink-700)" }}><span style={{ width: 10, height: 10, borderRadius: "var(--dc-r-sm)", background: DS.c.primary }} /> Ingresos</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--dc-ink-700)" }}><span style={{ width: 10, height: 10, borderRadius: "var(--dc-r-sm)", background: "var(--dc-danger)" }} /> Egresos</span>
            </div>
          </div>
          <RepBarChart labels={REP_MESES} a={REP_ING} b={REP_EGR} />
        </div>
      </>)}

      {tab === "anual" && (<>
        <div style={{ ...soft, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-bg)" }}><h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Resumen {hoy.getFullYear()}</h3></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 0 }}>
            {[["Ingreso", totIng, "var(--dc-ok-700)"], ["Egresos", totEgr, "var(--dc-danger)"], ["Utilidad", util, NAVY], ["Margen", pct(util, totIng), DS.c.primary]].map(([l, v, c], i) => (
              <div key={l} style={{ padding: "18px 20px", borderLeft: i ? "1px solid var(--dc-bg)" : "none" }}>
                <div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: c, fontFamily: DISPLAY_FONT, marginTop: 3 }}>{l === "Margen" ? `${v}%` : `S/ ${v.toLocaleString()}`}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="dc-split">
          <div style={{ ...soft, padding: "18px 20px" }}>
            <h3 style={{ margin: "0 0 12px", color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Ingresos por mes</h3>
            <RepLineChart labels={REP_MESES} series={[{ label: "Ingresos", color: "var(--dc-ok-700)", data: REP_ING }]} height={200} />
          </div>
          <div style={{ ...soft, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><Star size={17} strokeWidth={1.75} color="var(--dc-warn)" /><h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Top pacientes del año</h3></div>
            {REP_TOP.map((t, i) => (
              <div key={t.paciente} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--dc-bg)" : "none" }}>
                <div style={{ width: 26, height: 26, borderRadius: "var(--dc-r-full)", background: i === 0 ? "var(--dc-warn-soft)" : "var(--dc-bg-alt)", color: i === 0 ? "var(--dc-warn-600)" : "var(--dc-ink-400)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ flex: 1, fontWeight: 600, color: NAVY, fontSize: 13 }}>{t.paciente}</span>
                <span style={{ fontWeight: 700, color: "var(--dc-ok-700)", fontFamily: DISPLAY_FONT, fontVariantNumeric: "tabular-nums" }}>S/ {t.monto.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </>)}
    </div>
  );
}


export default Reportes;
