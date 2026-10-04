/* Resumen del mes para gerencia: facturado, salidas, meta, equipo vs meta y top de tratamientos.
 *
 * Conectado (sin endpoints nuevos):
 *   - Facturado del mes y meta: GET /gerencial/kpis → ingresosMes, metaMensualClinica, ranking[{ nombre, produccion, meta }]
 *   - Salidas del mes: GET /egresos (se filtran las del mes; las de dólares se muestran aparte)
 *   - Top de tratamientos: GET /tratamientos/resumen?desde&hasta → [{ nombre, numeroDeVentas, importeTotal }]
 * Demo: cifras de ejemplo coherentes con el equipo de demostración.
 */
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Target, Trophy, Users, Wallet } from "lucide-react";
import api, { auth } from "../api/client";
import { DatosDemoCtx, MEDICOS, mismaSede } from "../comun";
import { salidasMes } from "../compartido/metricas";
import { medicoEnSedes } from "../compartido/medicosSede";

const soles = (n) => "S/ " + Math.round(Number(n) || 0).toLocaleString("es-PE");
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

// GER-03: nombres del catálogo único de servicios (compartido/catalogo.js).
const DEMO_TOP = [
  { nombre: "Control de ortodoncia", ventas: 38, importe: 5700 },
  { nombre: "Endodoncia", ventas: 21, importe: 7350 },
  { nombre: "Corona", ventas: 9, importe: 4050 },
  { nombre: "Limpieza y profilaxis", ventas: 42, importe: 3360 },
  { nombre: "Curación con resina", ventas: 44, importe: 5280 },
  { nombre: "Extracción simple", ventas: 18, importe: 2160 },
].sort((a, b) => b.importe - a.importe);

/** Avance del mes para las cifras de demostración (las de ejemplo son de un mes casi completo). */
export const avanceDemo = (d = new Date()) => {
  const dias = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.min(1, Math.max(0.12, (d.getDate() / dias) * 1.08));
};

export default function ResumenMes({ kd, acciones = null, sedes = null, sedesApi = null }) {
  const conectado = !!auth.token;
  const hoy = new Date();
  const desde = ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const hasta = ymd(hoy);
  const [egresos, setEgresos] = useState(null);
  const [top, setTop] = useState(null);
  // Un 403 (o un fallo) no es «cero»: se muestra «sin permiso / no disponible», no S/ 0.
  const [egErr, setEgErr] = useState(null);
  const [topErr, setTopErr] = useState(null);
  const motivo = (e) => (e?.status === 403 ? "sin permiso" : "no disponible");
  // GER-02: en la demostración las salidas son los egresos que Caja registró (misma lista).
  const db = useContext(DatosDemoCtx);

  useEffect(() => {
    if (!conectado) return;
    // Solo las sedes que se ven (sedesApi = UUID; null = todas las del usuario).
    api.egresos.listar({ sedeIds: sedesApi }).then((r) => { setEgErr(null); setEgresos(Array.isArray(r) ? r : []); }).catch((e) => { setEgErr(motivo(e)); setEgresos([]); });
    api.tratamientos.resumen(desde, hasta, { sedeIds: sedesApi }).then((r) => { setTopErr(null); setTop(Array.isArray(r) ? r : []); }).catch((e) => { setTopErr(motivo(e)); setTop([]); });
  }, [conectado, desde, hasta, sedesApi && sedesApi.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = useMemo(() => {
    if (!conectado) {
      // Las cifras de ejemplo avanzan con el mes: el día 1 no puede llevar ya el 75 %.
      const f = avanceDemo(hoy);
      // Doctores de las sedes que se ven, con lo que producen y su meta en esas sedes.
      const equipo = MEDICOS.map((m) => ({ m, e: medicoEnSedes(m, sedes) })).filter((x) => x.e.sedes.length)
        .map(({ m, e }) => ({ nombre: m.nombre, prod: Math.round(e.prod * f), meta: e.meta || 0 }));
      const facturado = equipo.reduce((a, x) => a + x.prod, 0);
      const totalClinica = MEDICOS.reduce((a, m) => a + Math.round((m.prodDemo || 0) * f), 0);
      const parte = totalClinica ? facturado / totalClinica : 1;
      // Con una sede elegida solo cuentan sus egresos (un egreso sin sede no es de ninguna).
      const sal = salidasMes((db?.egresos || []).filter((e) => !sedes || sedes.some((v) => mismaSede(v, e.sede))), { mes: desde.slice(0, 7) });
      return {
        facturado, anterior: Math.round(facturado * 0.91), meta: equipo.reduce((a, x) => a + x.meta, 0), equipo,
        salidas: sal.pen, salidasUsd: sal.usd, salidasCat: sal.porCat,
        // El top de ejemplo se escala a la parte de la clínica que se ve (sede elegida).
        top: DEMO_TOP.map((t) => ({ ...t, importe: Math.round(t.importe * f * parte), ventas: Math.max(1, Math.round(t.ventas * f * parte)) })),
      };
    }
    // Con una sede elegida un egreso sin sede no es de ninguna (igual que en la demostración).
    const delMes = (egresos || []).filter((e) => String(e.fecha || "").slice(0, 10) >= desde && (!sedesApi || (e.sedeId != null && sedes.some((v) => mismaSede(v, e.sedeId)))));
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
  }, [conectado, kd, egresos, top, desde, db?.egresos, sedes && sedes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const ritmo = (hoy.getDate() / diasMes) * 100;
  const avance = d.meta > 0 ? (d.facturado / d.meta) * 100 : 0;
  const proyeccion = hoy.getDate() ? Math.round((d.facturado / hoy.getDate()) * diasMes) : 0;
  const sinSalidas = conectado && !!egErr;
  const neto = d.facturado - d.salidas;
  const delta = d.anterior ? ((d.facturado - d.anterior) / d.anterior) * 100 : null;
  const maxTop = Math.max(1, ...d.top.map((t) => t.importe));
  const equipo = [...d.equipo].sort((a, b) => (b.meta ? b.prod / b.meta : 0) - (a.meta ? a.prod / a.meta : 0));

  return (
    <section className="dc-rm" aria-label="Resumen del mes">
      <div className="dc-rm__hero">
      <header className="dc-rm__tit">
        <h2>Resumen de {MESES[hoy.getMonth()]}</h2>
        <span>Del 1 al {hoy.getDate()} · día {hoy.getDate()} de {diasMes}</span>
        {acciones && <div className="dc-rm__acc">{acciones}</div>}
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
          <b>{sinSalidas ? "—" : soles(d.salidas)}</b>
          <em>{sinSalidas ? (egErr === "sin permiso" ? "Sin permiso para ver los egresos" : "Egresos no disponibles") : <>{d.salidasUsd ? `+ US$ ${d.salidasUsd.toFixed(2)} en dólares · ` : ""}{d.salidasCat[0] ? `Mayor gasto: ${d.salidasCat[0][0]}` : "Sin egresos registrados"}</>}</em>
        </article>
        <article className="dc-rm__kpi" style={{ "--c": neto >= 0 ? "#0B6C78" : "#D0563F" }}>
          <span className="dc-rm__ico"><Wallet size={18} strokeWidth={2.2} /></span>
          <small>Resultado del mes</small>
          <b>{sinSalidas ? "—" : <>{neto < 0 ? "− " : ""}{soles(Math.abs(neto))}</>}</b>
          <em>{sinSalidas ? "No se calcula sin los egresos" : <>Facturado menos salidas{d.facturado ? ` · margen ${Math.round((neto / d.facturado) * 100)}%` : ""}</>}</em>
        </article>
        <article className="dc-rm__kpi dc-rm__kpi--meta" style={{ "--c": "#C98A12" }}>
          <span className="dc-rm__ico"><Target size={18} strokeWidth={2.2} /></span>
          <small>Meta mensual</small>
          <b>{d.meta ? soles(d.meta) : "Sin meta"}</b>
          {d.meta > 0 ? (
            <>
              <div className="dc-rm__meta" role="img" aria-label={`Avance ${avance.toFixed(0)}% de la meta`}><i style={{ width: `${Math.min(100, avance)}%` }} /><span style={{ left: `${Math.min(100, ritmo)}%` }} title="Ritmo esperado a hoy" /></div>
              <em><i className={avance >= ritmo ? "is-up" : "is-down"}>{avance.toFixed(0)}%</i> logrado · {hoy.getDate() >= 5 ? `cierre estimado ${soles(proyeccion)}` : "estimado de cierre desde el día 5"}</em>
            </>
          ) : <em>Define las metas del equipo en Metas</em>}
        </article>
      </div>
      </div>

      {/* Dos rankings con el mismo diseño: posición, nombre, barra y cifra. */}
      <div className="dc-rm__dos">
        <article className="dc-rm__card">
          <div className="dc-rm__cab"><Users size={16} strokeWidth={2} /><h3>Top del equipo</h3><span>avance a su meta · la raya es el ritmo a hoy</span></div>
          {equipo.length === 0 ? <p className="dc-rm__vacio">Sin producción del equipo este mes.</p> : (
            <ol className="dc-rm__rank">
              {equipo.map((x, i) => { const pct = x.meta ? (x.prod / x.meta) * 100 : 0; const tono = !x.meta ? "sin" : pct >= ritmo ? "ok" : pct >= ritmo * 0.8 ? "cerca" : "bajo"; return (
                <li key={x.nombre} className={`is-${tono}`}>
                  <span className={`dc-rm__pos p${i + 1}`}>{i + 1}</span>
                  <div className="dc-rm__rn"><b>{x.nombre}</b><small>{soles(x.prod)}{x.meta ? ` de ${soles(x.meta)}` : " · sin meta"}</small></div>
                  <em className="dc-rm__rv">{x.meta ? `${Math.round(pct)}%` : "—"}<small>{tono === "ok" ? "al día" : tono === "cerca" ? "cerca del ritmo" : tono === "bajo" ? "bajo el ritmo" : "sin meta"}</small></em>
                  <div className="dc-rm__rbar"><i style={{ width: `${Math.min(100, pct)}%` }} />{x.meta > 0 && <span style={{ left: `${Math.min(100, ritmo)}%` }} title={`Ritmo esperado a hoy: ${Math.round(ritmo)}%`} />}</div>
                </li>
              ); })}
            </ol>
          )}
        </article>
        <article className="dc-rm__card">
          <div className="dc-rm__cab"><Trophy size={16} strokeWidth={2} /><h3>Top de tratamientos</h3><span>por importe facturado del mes</span></div>
          {conectado && topErr ? <p className="dc-rm__vacio">{topErr === "sin permiso" ? "Sin permiso para ver las ventas por tratamiento." : "Ventas por tratamiento no disponibles."}</p> : d.top.length === 0 ? <p className="dc-rm__vacio">Aún no hay ventas vinculadas a servicios del catálogo este mes.</p> : (
            <ol className="dc-rm__rank is-trat">
              {d.top.map((t, i) => (
                <li key={t.nombre}>
                  <span className={`dc-rm__pos p${i + 1}`}>{i + 1}</span>
                  <div className="dc-rm__rn"><b>{t.nombre}</b><small>{t.ventas} {t.ventas === 1 ? "venta" : "ventas"} · ticket {soles(t.ventas ? t.importe / t.ventas : 0)}</small></div>
                  <em className="dc-rm__rv">{soles(t.importe)}<small>{d.top.reduce((a, x) => a + x.importe, 0) ? `${Math.round((t.importe / d.top.reduce((a, x) => a + x.importe, 0)) * 100)}% del top` : ""}</small></em>
                  <div className="dc-rm__rbar"><i style={{ width: `${(t.importe / maxTop) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </section>
  );
}
