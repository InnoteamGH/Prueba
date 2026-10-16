/* Resumen del mes para gerencia: producción, salidas, meta, equipo vs meta y top de tratamientos.
 * Términos (decisión del cliente): Producción = valor de los procedimientos terminados;
 * Cobrado = pagos registrados en Caja. (Las variables internas siguen llamándose «facturado».)
 *
 * Conectado (sin endpoints nuevos):
 *   - Meta y equipo: GET /gerencial/kpis → metaMensualClinica, ranking[{ nombre, produccion, meta }]
 *   - Producción del mes (H-G3): la suma de GET /tratamientos/resumen del mes, la MISMA lista
 *     del Top de tratamientos (y de Producción por especialidad del panel). Antes era
 *     kpis.ingresosMes (citas atendidas), que daba S/ 0 con S/ 340 en el Top de al lado.
 *     El mes anterior se compara con el mismo tramo de días.
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
import { equipoDeSede, metaDeSede, totalResumen } from "./panelGerencialUtil";
import NoDisponible from "../ui/NoDisponible";

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

// recarga: contador que sube con cada «Reintentar» del panel (vuelve a pedir lo de aquí).
// medicosSede: con una sede elegida, ids de los doctores con horario en ella (Set); null si no
// se sabe (sin horario a la vista) y undefined mientras carga.
export default function ResumenMes({ kd, acciones = null, sedes = null, sedesApi = null, recarga = 0, onReintentar = null, medicosSede = null }) {
  const conectado = !!auth.token;
  const hoy = new Date();
  const desde = ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const hasta = ymd(hoy);
  const [egresos, setEgresos] = useState(null);
  const [top, setTop] = useState(null);
  const [topAnt, setTopAnt] = useState(null);
  // Un 403 (o un fallo) no es «cero»: se muestra «sin permiso / no disponible», no S/ 0.
  const [egErr, setEgErr] = useState(null);
  const [topErr, setTopErr] = useState(null);
  const motivo = (e) => (e?.status === 403 ? "sin permiso" : "no disponible");
  // R6-02: con una sede elegida, /gerencial/kpis y /tratamientos/resumen ya devuelven lo de esa
  // sede: Producción, Top de tratamientos, Top del equipo y Resultado son de la sede, sin rótulo
  // «toda la clínica» ni recálculo con las citas. Solo la meta no viene por sede (los médicos no
  // traen sede, H-14): la de la sede es la suma de las metas de sus doctores (los que tienen
  // horario en ella), como en Metas.
  const sedeElegida = conectado && !!(sedesApi && sedesApi.length);
  // GER-02: en la demostración las salidas son los egresos que Caja registró (misma lista).
  const db = useContext(DatosDemoCtx);

  useEffect(() => {
    if (!conectado) return;
    // Solo las sedes que se ven (sedesApi = UUID; null = todas las del usuario).
    api.egresos.listar({ sedeIds: sedesApi }).then((r) => { setEgErr(null); setEgresos(Array.isArray(r) ? r : []); }).catch((e) => { setEgErr(motivo(e)); setEgresos([]); });
    api.tratamientos.resumen(desde, hasta, { sedeIds: sedesApi }).then((r) => { setTopErr(null); setTop(Array.isArray(r) ? r : []); }).catch((e) => { setTopErr(motivo(e)); setTop([]); });
    // Mismo tramo del mes anterior (del 1 al mismo día, o a fin de mes si es más corto).
    const finAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const hastaAnt = ymd(new Date(finAnt.getFullYear(), finAnt.getMonth(), Math.min(hoy.getDate(), finAnt.getDate())));
    api.tratamientos.resumen(ymd(new Date(finAnt.getFullYear(), finAnt.getMonth(), 1)), hastaAnt, { sedeIds: sedesApi }).then((r) => setTopAnt(Array.isArray(r) ? r : [])).catch(() => setTopAnt(null));
  }, [conectado, desde, hasta, sedesApi && sedesApi.join(","), recarga]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Con una sede elegida, el ranking ya viene filtrado por el servidor; se quedan los doctores
    // de la sede y quien atendió en ella (el servidor manda a todos, con S/ 0, en cada sede).
    const ranking = sedeElegida ? equipoDeSede(kd?.ranking, medicosSede || null) : (kd?.ranking || []);
    // undefined = aún no se sabe quién atiende en la sede; null = no se sabe (vale la de la clínica).
    const metaSede = !sedeElegida ? null : medicosSede === undefined ? undefined : metaDeSede(kd?.ranking, medicosSede);
    return {
      facturado: totalResumen(top),
      anterior: topAnt ? totalResumen(topAnt) : null,
      meta: metaSede != null ? metaSede : metaSede === undefined ? 0 : Number(kd?.metaMensualClinica) || 0,
      metaCargando: metaSede === undefined,
      metaClinica: sedeElegida && metaSede === null,
      equipo: ranking.map((r) => ({ nombre: r.nombre || r.medico || "—", prod: Number(r.produccion) || 0, meta: Number(r.meta) || 0 })),
      salidas: pen.reduce((a, e) => a + (Number(e.monto) || 0), 0),
      salidasUsd: delMes.filter((e) => e.moneda === "USD").reduce((a, e) => a + (Number(e.monto) || 0), 0),
      salidasCat: Object.entries(cat).sort((a, b) => b[1] - a[1]),
      top: (top || []).map((t) => ({ nombre: t.nombre || "—", ventas: Number(t.numeroDeVentas) || 0, importe: Number(t.importeTotal) || 0 })).sort((a, b) => b.importe - a.importe).slice(0, 6),
    };
  }, [conectado, kd, egresos, top, topAnt, desde, db?.egresos, sedes && sedes.join(","), medicosSede, sedeElegida]); // eslint-disable-line react-hooks/exhaustive-deps

  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const ritmo = (hoy.getDate() / diasMes) * 100;
  const avance = d.meta > 0 ? (d.facturado / d.meta) * 100 : 0;
  const proyeccion = hoy.getDate() ? Math.round((d.facturado / hoy.getDate()) * diasMes) : 0;
  const sinSalidas = conectado && !!egErr;
  const sinFacturado = conectado && !!topErr;
  // R5-02: sin /gerencial/kpis no hay meta ni ranking: «No disponible», no «Sin meta» ni 0 %.
  const sinKpis = conectado && !!kd?.error;
  const nd = (props) => <NoDisponible onReintentar={onReintentar} {...props} />;
  const neto = d.facturado - d.salidas;
  const delta = d.anterior ? ((d.facturado - d.anterior) / d.anterior) * 100 : null;
  const maxTop = Math.max(1, ...d.top.map((t) => t.importe));
  const equipo = [...d.equipo].sort((a, b) => (b.meta ? b.prod / b.meta : 0) - (a.meta ? a.prod / a.meta : 0));
  // Rótulo solo para la meta cuando no se sabe qué doctores atienden en la sede elegida (sin
  // horario a la vista): entonces vale la de toda la clínica.
  const todaMeta = d.metaClinica ? <i className="dc-rm__toda" title="Sin el horario de los doctores no se sabe quién atiende en la sede: es la meta de toda la clínica.">toda la clínica</i> : null;

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
          <small>Producción del mes</small>
          <b>{sinFacturado ? "—" : soles(d.facturado)}</b>
          <em>{sinFacturado ? nd({ texto: "Ventas por tratamiento no disponibles" }) : delta == null ? (conectado ? "Suma del Top de tratamientos; sin mes anterior para comparar" : "Sin mes anterior para comparar") : <><i className={delta >= 0 ? "is-up" : "is-down"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%</i> vs. mes anterior</>}</em>
        </article>
        <article className="dc-rm__kpi" style={{ "--c": "#E0694F" }}>
          <span className="dc-rm__ico"><ArrowUpRight size={18} strokeWidth={2.2} /></span>
          <small>Salidas del mes</small>
          <b>{sinSalidas ? "—" : soles(d.salidas)}</b>
          <em>{sinSalidas ? (egErr === "sin permiso" ? "Sin permiso para ver los egresos" : nd({ texto: "Egresos no disponibles" })) : <>{d.salidasUsd ? `+ US$ ${d.salidasUsd.toFixed(2)} en dólares · ` : ""}{d.salidasCat[0] ? `Mayor gasto: ${d.salidasCat[0][0]}` : "Sin egresos registrados"}</>}</em>
        </article>
        <article className="dc-rm__kpi" style={{ "--c": neto >= 0 ? "#0B6C78" : "#D0563F" }}>
          <span className="dc-rm__ico"><Wallet size={18} strokeWidth={2.2} /></span>
          <small>Resultado del mes</small>
          {/* R6-02: también por sede: producción y salidas ya son de la sede elegida. */}
          <b>{sinSalidas || sinFacturado ? "—" : <>{neto < 0 ? "− " : ""}{soles(Math.abs(neto))}</>}</b>
          <em>{sinSalidas ? "No se calcula sin los egresos" : sinFacturado ? "No se calcula sin la producción" : <>Producción menos salidas{d.facturado ? ` · margen ${Math.round((neto / d.facturado) * 100)}%` : ""}</>}</em>
        </article>
        <article className="dc-rm__kpi dc-rm__kpi--meta" style={{ "--c": "#C98A12" }}>
          <span className="dc-rm__ico"><Target size={18} strokeWidth={2.2} /></span>
          <small>{sedeElegida && !d.metaClinica ? "Meta de la sede" : "Meta mensual"}{todaMeta}</small>
          <b>{sinKpis || d.metaCargando ? "—" : d.meta ? soles(d.meta) : "Sin meta"}</b>
          {sinKpis ? <em>{nd({ texto: "Meta no disponible" })}</em> : d.metaCargando ? <em>Calculando la meta de la sede…</em> : d.metaClinica ? <em>Sin el horario de los doctores no se sabe la meta de la sede</em> : d.meta > 0 ? (
            sinFacturado ? <em>Avance no disponible: falta la producción del mes</em> : <>
              <div className="dc-rm__meta" role="img" aria-label={`Avance ${avance.toFixed(0)}% de la meta`}><i style={{ width: `${Math.min(100, avance)}%` }} /><span style={{ left: `${Math.min(100, ritmo)}%` }} title="Ritmo esperado a hoy" /></div>
              <em><i className={avance >= ritmo ? "is-up" : "is-down"}>{avance.toFixed(0)}%</i> logrado · {hoy.getDate() >= 5 ? `cierre estimado ${soles(proyeccion)}` : "estimado de cierre desde el día 5"}</em>
            </>
          ) : <em>{sedeElegida ? "Ningún doctor de la sede tiene meta: defínela en Metas" : "Define las metas del equipo en Metas"}</em>}
        </article>
      </div>
      </div>

      {/* Dos rankings con el mismo diseño: posición, nombre, barra y cifra. */}
      <div className="dc-rm__dos">
        <article className="dc-rm__card">
          <div className="dc-rm__cab"><Users size={16} strokeWidth={2} /><h3>Top del equipo</h3><span>{sedeElegida ? "en esta sede · avance a su meta" : "avance a su meta · la raya es el ritmo a hoy"}</span></div>
          {sinKpis ? <p className="dc-rm__vacio">{nd({ texto: "Producción del equipo no disponible" })}</p> : equipo.length === 0 ? <p className="dc-rm__vacio">{sedeElegida ? "Nadie atendió en esta sede este mes." : "Sin producción del equipo este mes."}</p> : (
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
          <div className="dc-rm__cab"><Trophy size={16} strokeWidth={2} /><h3>Top de tratamientos</h3><span>{sedeElegida ? "en esta sede · " : ""}por importe producido del mes</span></div>
          {conectado && topErr ? <p className="dc-rm__vacio">{topErr === "sin permiso" ? "Sin permiso para ver las ventas por tratamiento." : nd({ texto: "Ventas por tratamiento no disponibles" })}</p> : d.top.length === 0 ? <p className="dc-rm__vacio">Aún no hay ventas vinculadas a servicios del catálogo este mes.</p> : (
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
