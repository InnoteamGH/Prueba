/* Resumen del mes para gerencia: facturado, salidas, meta, equipo vs meta y top de tratamientos.
 *
 * Conectado (sin endpoints nuevos):
 *   - Facturado del mes y meta: GET /gerencial/kpis → ingresosMes, metaMensualClinica, ranking[{ nombre, produccion, meta }]
 *   - Salidas del mes: GET /egresos (se filtran las del mes; las de dólares se muestran aparte)
 *   - Top de tratamientos: GET /tratamientos/resumen?desde&hasta → [{ nombre, numeroDeVentas, importeTotal }]
 * Demo: cifras de ejemplo coherentes con el equipo de demostración.
 */
import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Target, Trophy, Users, Wallet } from "lucide-react";
import api, { auth } from "../api/client";
import { MEDICOS } from "../comun";

const soles = (n) => "S/ " + Math.round(Number(n) || 0).toLocaleString("es-PE");
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

const DEMO_TOP = [
  { nombre: "Ortodoncia (controles)", ventas: 38, importe: 9800 },
  { nombre: "Endodoncia", ventas: 21, importe: 7350 },
  { nombre: "Corona de zirconio", ventas: 9, importe: 6300 },
  { nombre: "Profilaxis y limpieza", ventas: 42, importe: 4200 },
  { nombre: "Resina compuesta", ventas: 44, importe: 3960 },
  { nombre: "Extracción simple", ventas: 18, importe: 2700 },
];
const DEMO_SALIDAS = [["Alquiler", 2800], ["Laboratorio", 2140], ["Insumos", 1930], ["Planilla", 4200], ["Servicios (luz/agua)", 385], ["Marketing", 450], ["Otros", 575]];

export default function ResumenMes({ kd }) {
  const conectado = !!auth.token;
  const hoy = new Date();
  const desde = ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const hasta = ymd(hoy);
  const [egresos, setEgresos] = useState(null);
  const [top, setTop] = useState(null);

  useEffect(() => {
    if (!conectado) return;
    api.egresos.listar().then((r) => setEgresos(Array.isArray(r) ? r : [])).catch(() => setEgresos([]));
    api.tratamientos.resumen(desde, hasta).then((r) => setTop(Array.isArray(r) ? r : [])).catch(() => setTop([]));
  }, [conectado, desde, hasta]);

  const d = useMemo(() => {
    if (!conectado) {
      const equipo = MEDICOS.map((m) => ({ nombre: m.nombre, prod: m.prodDemo || 0, meta: m.meta || 0 }));
      const facturado = equipo.reduce((a, x) => a + x.prod, 0);
      return {
        facturado, anterior: Math.round(facturado * 0.91), meta: equipo.reduce((a, x) => a + x.meta, 0), equipo,
        salidas: DEMO_SALIDAS.reduce((a, [, v]) => a + v, 0), salidasUsd: 40, salidasCat: [...DEMO_SALIDAS].sort((a, b) => b[1] - a[1]),
        top: DEMO_TOP,
      };
    }
    const delMes = (egresos || []).filter((e) => String(e.fecha || "").slice(0, 10) >= desde);
    const pen = delMes.filter((e) => (e.moneda || "PEN") !== "USD");
    const cat = {};
    pen.forEach((e) => { const k = e.categoria || "Otros"; cat[k] = (cat[k] || 0) + (Number(e.monto) || 0); });
    return {
      facturado: Number(kd?.ingresosMes) || 0,
      anterior: kd?.ingresosMesAnterior != null ? Number(kd.ingresosMesAnterior) : null,
      meta: Number(kd?.metaMensualClinica) || 0,
      equipo: (kd?.ranking || []).map((r) => ({ nombre: r.nombre || r.medico || "—", prod: Number(r.produccion) || 0, meta: Number(r.meta) || 0 })),
      salidas: pen.reduce((a, e) => a + (Number(e.monto) || 0), 0),
      salidasUsd: delMes.filter((e) => e.moneda === "USD").reduce((a, e) => a + (Number(e.monto) || 0), 0),
      salidasCat: Object.entries(cat).sort((a, b) => b[1] - a[1]),
      top: (top || []).map((t) => ({ nombre: t.nombre || "—", ventas: Number(t.numeroDeVentas) || 0, importe: Number(t.importeTotal) || 0 })).sort((a, b) => b.importe - a.importe).slice(0, 6),
    };
  }, [conectado, kd, egresos, top, desde]);

  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const ritmo = (hoy.getDate() / diasMes) * 100;
  const avance = d.meta > 0 ? (d.facturado / d.meta) * 100 : 0;
  const proyeccion = hoy.getDate() ? Math.round((d.facturado / hoy.getDate()) * diasMes) : 0;
  const neto = d.facturado - d.salidas;
  const delta = d.anterior ? ((d.facturado - d.anterior) / d.anterior) * 100 : null;
  const maxTop = Math.max(1, ...d.top.map((t) => t.importe));
  const equipo = [...d.equipo].sort((a, b) => (b.meta ? b.prod / b.meta : 0) - (a.meta ? a.prod / a.meta : 0));

  return (
    <section className="dc-rm" aria-label="Resumen del mes">
      <header className="dc-rm__tit">
        <h2>Resumen de {MESES[hoy.getMonth()]}</h2>
        <span>Del 1 al {hoy.getDate()} · día {hoy.getDate()} de {diasMes}</span>
      </header>

      <div className="dc-rm__kpis">
        <article className="dc-rm__kpi" style={{ "--c": "#0E9199" }}>
          <span className="dc-rm__ico"><ArrowDownRight size={18} strokeWidth={2.2} /></span>
          <small>Facturado del mes</small>
          <b>{soles(d.facturado)}</b>
          <em>{delta == null ? "Sin mes anterior para comparar" : <><i className={delta >= 0 ? "is-up" : "is-down"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%</i> vs. mes anterior</>}</em>
        </article>
        <article className="dc-rm__kpi" style={{ "--c": "#E0694F" }}>
          <span className="dc-rm__ico"><ArrowUpRight size={18} strokeWidth={2.2} /></span>
          <small>Salidas del mes</small>
          <b>{soles(d.salidas)}</b>
          <em>{d.salidasUsd ? `+ US$ ${d.salidasUsd.toFixed(2)} en dólares · ` : ""}{d.salidasCat[0] ? `Mayor gasto: ${d.salidasCat[0][0]}` : "Sin egresos registrados"}</em>
        </article>
        <article className="dc-rm__kpi" style={{ "--c": neto >= 0 ? "#16A36A" : "#DC2626" }}>
          <span className="dc-rm__ico"><Wallet size={18} strokeWidth={2.2} /></span>
          <small>Resultado del mes</small>
          <b>{neto < 0 ? "− " : ""}{soles(Math.abs(neto))}</b>
          <em>Facturado menos salidas{d.facturado ? ` · margen ${Math.round((neto / d.facturado) * 100)}%` : ""}</em>
        </article>
        <article className="dc-rm__kpi dc-rm__kpi--meta" style={{ "--c": "#6D4FD1" }}>
          <span className="dc-rm__ico"><Target size={18} strokeWidth={2.2} /></span>
          <small>Meta mensual</small>
          <b>{d.meta ? soles(d.meta) : "Sin meta"}</b>
          {d.meta > 0 ? (
            <>
              <div className="dc-rm__meta" role="img" aria-label={`Avance ${avance.toFixed(0)}% de la meta`}><i style={{ width: `${Math.min(100, avance)}%` }} /><span style={{ left: `${Math.min(100, ritmo)}%` }} title="Ritmo esperado a hoy" /></div>
              <em><i className={avance >= ritmo ? "is-up" : "is-down"}>{avance.toFixed(0)}%</i> logrado · proyección {soles(proyeccion)}</em>
            </>
          ) : <em>Define las metas del equipo en Metas</em>}
        </article>
      </div>

      <div className="dc-rm__dos">
        <article className="dc-rm__card">
          <div className="dc-rm__cab"><Users size={16} strokeWidth={2} /><h3>Producción del equipo vs. meta</h3><span>la línea marca el ritmo a hoy</span></div>
          {equipo.length === 0 ? <p className="dc-rm__vacio">Sin producción del equipo este mes.</p> : (
            <ul className="dc-rm__eq">
              {equipo.map((x) => { const pct = x.meta ? (x.prod / x.meta) * 100 : 0; const tono = !x.meta ? "sin" : pct >= ritmo ? "ok" : pct >= ritmo * 0.8 ? "cerca" : "bajo"; return (
                <li key={x.nombre} className={`is-${tono}`}>
                  <div className="dc-rm__eqn"><b>{x.nombre}</b><small>{soles(x.prod)}{x.meta ? ` de ${soles(x.meta)}` : " · sin meta"}</small></div>
                  <div className="dc-rm__eqbar"><i style={{ width: `${Math.min(100, pct)}%` }} /><span style={{ left: `${Math.min(100, ritmo)}%` }} /></div>
                  <em>{x.meta ? `${Math.round(pct)}%` : "—"}</em>
                </li>
              ); })}
            </ul>
          )}
        </article>
        <article className="dc-rm__card">
          <div className="dc-rm__cab"><Trophy size={16} strokeWidth={2} /><h3>Top de tratamientos</h3><span>por importe facturado</span></div>
          {d.top.length === 0 ? <p className="dc-rm__vacio">Aún no hay ventas vinculadas a servicios del catálogo este mes.</p> : (
            <ol className="dc-rm__top">
              {d.top.map((t, i) => (
                <li key={t.nombre}>
                  <span className={`dc-rm__pos p${i + 1}`}>{i + 1}</span>
                  <div><b>{t.nombre}</b><div className="dc-rm__tbar"><i style={{ width: `${(t.importe / maxTop) * 100}%` }} /></div></div>
                  <em>{soles(t.importe)}<small>{t.ventas} {t.ventas === 1 ? "venta" : "ventas"}</small></em>
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </section>
  );
}
