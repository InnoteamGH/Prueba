/* Módulo Producción y comisiones — pestaña "Comisiones".
   Vivía dentro de App.jsx; se extrajo para poder fusionarlo con Productividad
   (ambos calculan lo mismo: producción por médico) sin dependencia circular. */
import React, { useState, useEffect } from "react";
import { CalendarCheck, Check, Percent, Stethoscope, Target, TrendingUp, Wallet } from "lucide-react";
import api, { auth } from "../api/client";
import { Btn, Card, DISPLAY_FONT, DS, DataTable, ESPECIALIDADES, KpiCard, MEDICOS, Modal, NAVY, RED, TEAL, Vacio } from "../comun";

function Comisiones({ citas, can }) {
  const conectado = !!auth.token;
  // La meta ya NO es una constante. Antes valia 2500 aqui, 6000 en el ranking
  // gerencial y 12000 en "Mi meta del mes": el mismo doctor tenia tres metas
  // distintas segun la pantalla. Ahora la fija gerencia y vive en la base.
  const puedeFijarMetas = can ? can("metas", "editar") : false;
  const [editMetas, setEditMetas] = useState(null);   // { [medicoId]: "8500" }
  const [guardando, setGuardando] = useState(false);
  // Cuánto va del mes DE VERDAD. Era un 0.66 fijo: el 3 de agosto proyectaba el cierre
  // como si hubiera pasado ya dos tercios del mes.
  const AVANCE_MES = (() => { const d = new Date(); return d.getDate() / new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); })();
  const [detalle, setDetalle] = useState(null);

  // Conectado: comisiones REALES del backend (producción del periodo × % de cada médico).
  // Antes este módulo pintaba números inventados —tratamientos fijos [12,9,7,5,4,3] a S/160
  // y una "tendencia" que era el total multiplicado por constantes— aunque el endpoint
  // /api/comisiones ya existía y nadie lo llamaba.
  const [real, setReal] = useState(null);
  useEffect(() => {
    if (conectado) api.comisiones().then(setReal).catch(() => setReal(null));
  }, []); // eslint-disable-line

  // Iniciales y color a partir del nombre: la tabla los necesita para el avatar y con
  // datos reales no venían, así que el círculo salía transparente y vacío.
  const inicialesDe = (n) => (n || "?").split(" ").filter((w) => w.length > 2).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const PALETA_MED = [NAVY, DS.c.primary, TEAL, "var(--dc-purple)", "var(--dc-ok-700)", "var(--dc-warn-600)", RED];
  const colorDe = (n) => { let h = 0; for (const ch of String(n || "")) h = (h * 31 + ch.charCodeAt(0)) % 997; return PALETA_MED[h % PALETA_MED.length]; };
  const pctDe = (prod, meta) => (meta > 0 ? Math.round((prod / meta) * 100) : null);
  // La producción de ejemplo es la de MEDICOS (prodDemo), la misma que enseñan el ranking
  // gerencial y "Mi producción". Antes aquí se calculaba aparte -12 citas × 160- y salía
  // 1.920 contra una meta de 12.000: la misma doctora al 16% aquí y al 77% al lado.
  const demo = MEDICOS.map((m) => { const prod = Number(m.prodDemo) || 0; const meta = Number(m.meta) || null;
    return { ...m, n: Number(m.citasDemo) || 0, prod, com: prod * 0.4, meta, pct: pctDe(prod, meta), pctCom: 40 }; }).sort((a, b) => b.prod - a.prod);

  const data = (real?.porMedico?.length)
    ? real.porMedico.map((m) => {
        const prod = Number(m.produccion) || 0;
        // meta puede venir null: nadie se la ha fijado. No se sustituye por un numero.
        const meta = Number(m.meta) || null;
        return { id: m.medicoId, nombre: m.nombre, n: m.atendidas, prod,
                 com: Number(m.comision) || 0, meta, pct: pctDe(prod, meta),
                 // Porcentaje de comisión pactado con este médico (backend: porcentaje).
                 pctCom: m.porcentaje != null ? Number(m.porcentaje) : null,
                 foto: inicialesDe(m.nombre), color: colorDe(m.nombre), espNombre: m.especialidad || null };
      })
    : (conectado ? [] : demo);

  const totalProd = real ? (Number(real.totalProduccion) || 0) : data.reduce((s, m) => s + m.prod, 0);
  const totalCom  = real ? (Number(real.totalComision) || 0)  : data.reduce((s, m) => s + m.com, 0);
  const maxProd = data[0]?.prod || 1;
  // Con el mes recién empezado no se proyecta: multiplicar por 30 lo de tres días no es
  // una proyección, es un número inventado con cara de dato.
  const proy = AVANCE_MES >= 0.25 ? Math.round(totalProd / AVANCE_MES) : null;
  const conMeta = data.filter((m) => m.meta > 0);
  const metaGlobal = conMeta.reduce((s, m) => s + m.meta, 0);
  // Se compara contra la produccion de QUIENES tienen meta; mezclar la produccion
  // de los que no la tienen inflaria el porcentaje y lo volveria mentira.
  const prodConMeta = conMeta.reduce((s, m) => s + m.prod, 0);
  const pctMetaGlobal = metaGlobal > 0 ? Math.round((prodConMeta / metaGlobal) * 100) : null;
  const sinMeta = data.length - conMeta.length;

  const abrirMetas = () => setEditMetas(Object.fromEntries(data.map((m) => [m.id, m.meta ? String(m.meta) : ""])));
  const guardarMetas = () => {
    setGuardando(true);
    const cambios = data
      .filter((m) => String(m.meta || "") !== String(Number(editMetas[m.id]) || ""))
      .map((m) => api.catalogo.fijarMeta(m.id, Number(editMetas[m.id]) || null));
    Promise.all(cambios)
      .then(() => api.comisiones().then(setReal))
      .then(() => setEditMetas(null))
      .catch(() => {})
      .finally(() => setGuardando(false));
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        <KpiCard label="Producción del mes" value={`S/ ${totalProd.toLocaleString()}`} color={NAVY} icon={<Wallet size={18} strokeWidth={1.75} />} sub={pctMetaGlobal == null ? "sin metas fijadas" : `${pctMetaGlobal}% de la meta`} />
        <KpiCard label="Proyección de cierre" value={proy == null ? "—" : `S/ ${proy.toLocaleString()}`} color={DS.c.primary} icon={<TrendingUp size={18} strokeWidth={1.75} />} sub={proy == null ? "el mes va muy empezado" : `al ritmo actual · ${Math.round(AVANCE_MES * 100)}% del mes`} />
        <KpiCard label="Comisiones a pagar" value={`S/ ${totalCom.toLocaleString()}`} color={RED} icon={<Percent size={18} strokeWidth={1.75} />} sub={(() => { const ps = [...new Set(data.map((m) => m.pctCom).filter((x) => x != null))]; return ps.length === 1 ? `${ps[0]}% de producción` : ps.length > 1 ? "según el % de cada doctor" : "sobre la producción del mes"; })()} />
        <KpiCard label="Odontólogos" value={data.length} color={DS.c.primary} icon={<Stethoscope size={18} strokeWidth={1.75} />} sub="activos" />
      </div>
      <div style={{ fontSize: 13, color: "var(--dc-ink-400)", lineHeight: 1.55, marginTop: -6 }}>
        La producción de aquí suma el valor de <strong>todas las citas atendidas</strong> del mes, tengan
        la evolución llena o no. En «Producción x doctor» solo cuentan las que la tienen, por eso
        esa cifra es menor.
      </div>
      <div className="dc-split">
        <Card style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><TrendingUp size={17} strokeWidth={1.75} color={DS.c.primary} /><span style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>Tendencia de producción</span></div>
          <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginBottom: 18 }}>Últimos 6 meses · producción total de la clínica</div>
          {(() => {
            const LBL = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const trend = (real?.tendencia?.length)
              ? real.tendencia.map((t) => {
                  const ym = String(t.anioMes || "");
                  const mesIdx = ym.includes("-") ? Number(ym.split("-")[1]) - 1 : LBL.indexOf(t.mes);
                  const m = (mesIdx >= 0 && LBL[mesIdx]) ? LBL[mesIdx] : (t.mes || "");
                  return { m, v: Math.round(Number(t.produccion) || 0) };
                })
              : [];
            if (!trend.length) {
              return <Vacio icon={<TrendingUp size={22} strokeWidth={1.75} />} titulo="Sin historia aún" sub="La tendencia aparece cuando hay producción de meses anteriores." />;
            }
            const tMax = Math.max(1, ...trend.map((t) => t.v));
            return (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 132 }}>
                {trend.map((t, i) => { const last = i === trend.length - 1; return (
                  <div key={`${t.m}-${i}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, height: "100%", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: last ? DS.c.primary : "var(--dc-ink-500)", fontVariantNumeric: "tabular-nums" }}>{t.v >= 1000 ? `${(t.v / 1000).toFixed(1)}k` : t.v}</span>
                    <div style={{ width: "100%", maxWidth: 34, height: `${Math.max(4, Math.round((t.v / tMax) * 100))}%`, background: last ? `linear-gradient(180deg,${DS.c.primary},var(--dc-info-ink))` : "var(--dc-info-soft)", borderRadius: "8px 8px 0 0", transition: "height .9s cubic-bezier(.2,.7,.2,1)" }} />
                    <span style={{ fontSize: 12, color: last ? NAVY : "var(--dc-ink-500)", fontWeight: last ? 800 : 600 }}>{t.m}</span>
                  </div>
                ); })}
              </div>
            );
          })()}
        </Card>
        <Card style={{ padding: "18px 20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><CalendarCheck size={17} strokeWidth={1.75} color={TEAL} /><span style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>Meta global del mes</span></div>
          <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginBottom: 18 }}>
            {conMeta.length === 0 ? "Nadie tiene meta fijada todavía"
              : `Suma de metas de ${conMeta.length} odontólogo${conMeta.length === 1 ? "" : "s"}${sinMeta > 0 ? ` · ${sinMeta} sin meta` : ""}`}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 27, fontWeight: 600, color: pctMetaGlobal == null ? "var(--dc-ink-400)" : NAVY, fontFamily: DISPLAY_FONT, lineHeight: 1 }}>{pctMetaGlobal == null ? "—" : pctMetaGlobal + "%"}</span>
            <span style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>{pctMetaGlobal == null ? "sin meta que comparar" : "alcanzado"}</span>
          </div>
          <div style={{ height: 12, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden", marginBottom: 8 }}><div style={{ width: Math.min(100, pctMetaGlobal || 0) + "%", height: "100%", background: pctMetaGlobal >= 100 ? "var(--dc-ok)" : "linear-gradient(90deg,var(--dc-accent-cyan),var(--dc-blue))", borderRadius: "var(--dc-r-full)", transition: "width 1s cubic-bezier(.2,.7,.2,1)" }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500, marginTop: "auto", paddingTop: 12 }}>
            <span>S/ {(pctMetaGlobal == null ? totalProd : prodConMeta).toLocaleString()} <span style={{ color: "var(--dc-ink-500)", fontWeight: 500 }}>producido</span></span>
            {metaGlobal > 0 && <span style={{ color: "var(--dc-ink-500)" }}>meta S/ {metaGlobal.toLocaleString()}</span>}
          </div>
          {puedeFijarMetas && data.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <Btn small kind="ghost" onClick={abrirMetas}><Target size={14} strokeWidth={1.75} /> {conMeta.length ? "Ajustar metas" : "Fijar las metas del equipo"}</Btn>
            </div>
          )}
        </Card>
      </div>
      <DataTable titulo="Comisiones por odontólogo" sub="odontólogos" minWidth={640} rows={data} onRowClick={(m) => setDetalle(m)} empty={<Vacio icon={<Percent size={22} strokeWidth={1.75} />} titulo="Sin producción" sub="Aún no hay atenciones facturadas este mes." />} cols={[
        { key: "od", label: "Odontólogo", w: "minmax(200px,1.1fr)", a: "left", get: (m) => m.nombre, cell: (m) => <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: m.color, color: "var(--dc-white)", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{m.foto}</div><span style={{ fontWeight: 500, color: NAVY, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.nombre}</span>{m.prod === maxProd && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", padding: "2px 7px", borderRadius: "var(--dc-r-full)", flexShrink: 0 }}>TOP</span>}</div> },
        { key: "n", label: "Atenciones", w: "120px", a: "right", get: (m) => m.n, cell: (m) => <span style={{ fontSize: 14, fontWeight: 500, color: NAVY, fontVariantNumeric: "tabular-nums" }}>{m.n}</span> },
        { key: "prod", label: "Producción", w: "minmax(120px,1fr)", a: "right", get: (m) => m.prod, cell: (m) => <span style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, fontVariantNumeric: "tabular-nums" }}>S/ {m.prod.toLocaleString()}</span> },
        { key: "com", label: "Comisión", w: "minmax(120px,0.9fr)", a: "right", get: (m) => m.com, cell: (m) => <span style={{ fontWeight: 600, color: RED, fontFamily: DISPLAY_FONT, fontSize: 14 }}>S/ {m.com.toLocaleString()}</span> },
        // Ordena por porcentaje, pero quien no tiene meta va al final (-1) en vez de
        // colarse arriba como si estuviera al 0%: son cosas distintas.
        { key: "meta", label: "Meta mensual", w: "minmax(190px,2fr)", a: "left", get: (m) => (m.pct == null ? -1 : m.pct), cell: (m) => {
          if (m.meta == null) return (
            <span style={{ fontSize: 13, color: "var(--dc-ink-400)", fontStyle: "italic" }}>
              Sin meta{puedeFijarMetas ? " · usa “Ajustar metas”" : ""}
            </span>);
          const c = m.pct >= 100 ? "var(--dc-ok-700)" : m.pct >= 70 ? "var(--dc-warn-600)" : "var(--dc-red)";
          return <div style={{ minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--dc-ink-500)" }}>meta S/ {m.meta.toLocaleString()}</span><span style={{ fontWeight: 500, color: c }}>{m.pct}%</span></div><div style={{ height: 6, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}><div style={{ width: Math.min(100, m.pct) + "%", height: "100%", background: c, borderRadius: "var(--dc-r-full)", transition: "width .9s cubic-bezier(.2,.7,.2,1)" }} /></div></div>; } },
      ]} />
      {editMetas && (
        <Modal icon={<Target size={20} strokeWidth={1.75} />} titulo="Metas del equipo" sub="Producción mensual objetivo, en soles" maxW={480}
          onClose={() => setEditMetas(null)}
          footer={<><Btn small kind="ghost" onClick={() => setEditMetas(null)}>Cancelar</Btn>
                   <Btn small onClick={guardarMetas} disabled={guardando}><Check size={15} strokeWidth={1.75} /> {guardando ? "Guardando…" : "Guardar metas"}</Btn></>}>
          <div style={{ fontSize: 13, color: "var(--dc-ink-400)", background: "var(--dc-bg)", borderRadius: "var(--dc-r-md)", padding: "10px 12px", marginBottom: 14 }}>
            Déjala vacía para quitarle la meta a alguien. Sin meta, sus pantallas dicen “sin meta” en vez de mostrar un porcentaje inventado.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.map((m) => (
              <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nombre}</span>
                <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>S/</span>
                <input className="dc-premium-inp" type="number" min="0" step="100" placeholder="sin meta"
                  value={editMetas[m.id] ?? ""}
                  onChange={(e) => setEditMetas((s) => ({ ...s, [m.id]: e.target.value }))}
                  style={{ width: 120, padding: "9px 11px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, textAlign: "right", fontFamily: "inherit", outline: "none" }} />
              </label>
            ))}
          </div>
        </Modal>
      )}
      {detalle && (() => { const m = detalle; const esp = ESPECIALIDADES.find((e) => e.id === m.esp); const subEsp = m.espNombre || (esp ? esp.nombre : "Odontólogo"); return (
        <Modal icon={<span style={{ fontWeight: 500 }}>{m.foto}</span>} tone={m.color} titulo={m.nombre} sub={subEsp} onClose={() => setDetalle(null)} maxW={500} footer={<Btn small kind="ghost" onClick={() => setDetalle(null)}>Cerrar</Btn>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {[["Atenciones", m.n, NAVY], ["Producción", `S/ ${m.prod.toLocaleString()}`, DS.c.primary], [m.pctCom != null ? `Comisión (${m.pctCom}%)` : "Comisión", `S/ ${m.com.toLocaleString()}`, RED]].map(([l, v, col]) => <div key={l} style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-lg)", padding: "12px 14px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500 }}>{l}</div><div style={{ fontSize: 16, fontWeight: 600, color: col, fontFamily: DISPLAY_FONT, marginTop: 2 }}>{v}</div></div>)}
          </div>
          <div style={{ fontSize: 13, color: "var(--dc-ink-400)", background: "var(--dc-bg)", borderRadius: "var(--dc-r-md)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}><Percent size={15} strokeWidth={1.75} color={RED} /> {m.pctCom != null ? `La comisión es el ${m.pctCom}% de la producción del mes de ${m.nombre.split(" ").slice(0, 2).join(" ")}.` : `Calculada sobre la producción del mes de ${m.nombre.split(" ").slice(0, 2).join(" ")}. El porcentaje lo fija administración.`}</div>
        </Modal>
      ); })()}
    </div>
  );
}

export default Comisiones;
