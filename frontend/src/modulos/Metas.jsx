/* Pantalla #/metas — configuración de la meta mensual y el % de comisión de cada odontólogo. */
import React, { useEffect, useState } from "react";
import { Check, Target, TrendingUp, Trophy } from "lucide-react";
import api, { auth } from "../api/client";
import {Card, ESPECIALIDADES, MEDICOS, Vacio, colorDe, iniciales, tint} from "../comun";

export default function Metas({ notify = () => {}, can }) {
  const conectado = !!auth.token;
  const puedeEditar = can ? can("metas", "editar") : true;
  const [meds, setMeds] = useState([]);
  const [draft, setDraft] = useState({});
  const [draftCom, setDraftCom] = useState({});   // % de comisión por doctor
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  const cargar = () => {
    if (!conectado) {
      // Demo: odontólogos de ejemplo con su producción del mes.
      const list = MEDICOS.map((m) => ({ id: m.id, nombre: m.nombre, especialidad: ESPECIALIDADES.find((e) => e.id === m.esp)?.nombre, metaMensual: m.meta, prodMes: m.prodDemo, citasMes: m.citasDemo, porcentajeComision: m.comision ?? null }));
      setMeds(list);
      const d = {};
      list.forEach((m) => { d[m.id] = String(m.metaMensual); });
      setDraft(d);
      setDraftCom(Object.fromEntries(list.map((m) => [m.id, m.porcentajeComision != null ? String(m.porcentajeComision) : ""])));
      return;
    }
    setError(null);
    api.catalogo.medicos()
      .then((rows) => {
        const list = (rows || []).filter((m) => m.activo !== false);
        setMeds(list);
        const d = {};
        list.forEach((m) => { d[m.id] = m.metaMensual != null ? String(m.metaMensual) : ""; });
        setDraft(d);
        setDraftCom(Object.fromEntries(list.map((m) => [m.id, m.porcentajeComision != null ? String(m.porcentajeComision) : ""])));
      })
      .catch((e) => {
        setMeds([]);
        setError(e?.status === 404
          ? "No se pudo cargar el catálogo de médicos."
          : "No se pudieron cargar las metas.");
      });
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line

  // Guarda meta y % de comisión del doctor (los dos se editan aquí y en Configuración › Doctores).
  const guardar = (m) => {
    if (!puedeEditar) { notify("Sin permiso para editar metas."); return; }
    const raw = draft[m.id];
    const n = raw === "" || raw == null ? null : Number(raw);
    if (n != null && (!Number.isFinite(n) || n < 0)) { notify("Meta inválida."); return; }
    const rawC = draftCom[m.id];
    const c = rawC === "" || rawC == null ? null : Number(rawC);
    if (c != null && (!Number.isFinite(c) || c < 0 || c > 100)) { notify("La comisión va de 0 a 100 %."); return; }
    if (!conectado) {
      const med = MEDICOS.find((x) => String(x.id) === String(m.id));
      if (med) {
        Object.assign(med, { meta: n, comision: c });
        try { const o = JSON.parse(localStorage.getItem("dc_data_v1_medicos_cfg") || "{}"); o[m.id] = { ...(o[m.id] || {}), meta: n, comision: c }; localStorage.setItem("dc_data_v1_medicos_cfg", JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ }
      }
      setMeds((ms) => ms.map((x) => (x.id === m.id ? { ...x, metaMensual: n, porcentajeComision: c } : x)));
      notify(`Meta y comisión de ${m.nombre} guardadas.`);
      return;
    }
    setSaving(m.id);
    const cambioCom = String(m.porcentajeComision ?? "") !== String(rawC ?? "");
    Promise.all([
      api.catalogo.fijarMeta(m.id, n),
      cambioCom ? api.catalogo.actualizarMedico(m.id, { nombre: m.nombre, especialidadId: m.especialidadId || null, cop: m.cop || null, activo: m.activo !== false, porcentajeComision: c }) : null,
    ])
      .then(() => { notify(`Meta y comisión de ${m.nombre} guardadas.`); cargar(); })
      .catch((e) => notify(e?.message || "No se pudo guardar."))
      .finally(() => setSaving(null));
  };

  // Lo que se está editando (borrador) manda en las cifras de arriba.
  const metaDe = (m) => { const v = draft[m.id]; return v === "" || v == null ? 0 : Number(v) || 0; };
  const pctDe = (m) => { const v = draftCom[m.id]; return v === "" || v == null ? null : Number(v); };
  const conMeta = meds.filter((m) => metaDe(m) > 0).length;
  const metaTotal = meds.reduce((a, m) => a + metaDe(m), 0);
  const conPct = meds.filter((m) => pctDe(m) != null);
  const pctProm = conPct.length ? conPct.reduce((a, m) => a + pctDe(m), 0) / conPct.length : 0;
  const comMeta = meds.reduce((a, m) => a + metaDe(m) * (pctDe(m) || 0) / 100, 0);
  const soles = (n) => "S/ " + Math.round(Number(n) || 0).toLocaleString("es-PE");
  const cambiados = meds.filter((m) => String(draft[m.id] ?? "") !== String(m.metaMensual ?? "") || String(draftCom[m.id] ?? "") !== String(m.porcentajeComision ?? ""));
  const guardarTodo = () => cambiados.forEach((m) => guardar(m));
  const deshacer = () => {
    setDraft(Object.fromEntries(meds.map((m) => [m.id, m.metaMensual != null ? String(m.metaMensual) : ""])));
    setDraftCom(Object.fromEntries(meds.map((m) => [m.id, m.porcentajeComision != null ? String(m.porcentajeComision) : ""])));
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Pantalla de configuración: aquí se fijan la meta y el % de cada odontólogo.
          El avance y la comisión ganada se ven en Reportes › Producción y comisiones. */}
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{error ? "—" : soles(metaTotal)}</b><span>meta mensual de la clínica</span></div>
          <p>Fija la meta y el % de comisión de cada odontólogo</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{error ? "—" : `${conMeta} de ${meds.length}`}</b><span>Con meta</span></div>
          <div><b>{conPct.length ? `${Math.round(pctProm)}%` : "—"}</b><span>Comisión promedio</span></div>
          <div><b>{soles(comMeta)}</b><span>Comisiones si todos cumplen</span></div>
        </div>
        <span />
        <button type="button" className="dc-esp-hero__btn" onClick={() => { window.location.hash = "#/reportes"; }}><TrendingUp size={14} strokeWidth={2} /> Ver avance del mes</button>
      </section>
      {error && <div className="fm-aviso-edad is-mal"><Target size={15} strokeWidth={2} /><span>{error}</span><button type="button" onClick={cargar}>Reintentar</button></div>}
      {!conectado && <div className="fm-aviso-edad is-info"><Target size={15} strokeWidth={2} /><span><b>Datos de ejemplo.</b> En la demostración los cambios se guardan en este navegador.</span></div>}
      {conectado && !error && meds.length === 0 && (
        <Card><Vacio icon={<Target size={22} strokeWidth={1.75} />} titulo="Sin odontólogos" sub="Regístralos en Configuración, Doctores." /></Card>
      )}
      {meds.length > 0 && (
        <section className="dc-mtx" aria-label="Metas y comisiones por odontólogo">
          <header className="dc-mtx__cab">
            <h3>Metas y comisiones por odontólogo</h3>
            <span>{cambiados.length ? `${cambiados.length} con cambios sin guardar` : "Todo guardado"}</span>
            {puedeEditar && cambiados.length > 0 && <>
              <button type="button" className="dc-mtx__sec" onClick={deshacer}>Deshacer</button>
              <button type="button" className="dc-mtx__pri" onClick={guardarTodo}><Check size={14} strokeWidth={2.2} /> Guardar cambios</button>
            </>}
          </header>
          <div className="dc-mtx__fila is-cab">
            <span>Odontólogo</span><span>Meta mensual</span><span>Comisión</span><span>Comisión al cumplir la meta</span><span />
          </div>
          {meds.map((m) => {
            const col = colorDe(m.nombre);
            const cambio = cambiados.includes(m);
            const met = metaDe(m), pc = pctDe(m);
            return (
              <div key={m.id} className={`dc-mtx__fila${cambio ? " is-cambio" : ""}`}>
                <span className="dc-mtx__doc">
                  <span className="dc-rec__av" style={{ width: 36, height: 36, fontSize: 12, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(m.nombre.replace(/^Dra?\.\s*/, ""))}</span>
                  <span><b>{m.nombre}</b><small>{m.especialidad || "Sin especialidad"}</small></span>
                </span>
                <label className="dc-mtx__inp"><span>S/</span><input type="number" min="0" step="100" disabled={!puedeEditar} value={draft[m.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [m.id]: e.target.value }))} placeholder="Sin meta" aria-label={`Meta mensual de ${m.nombre}`} /></label>
                <label className="dc-mtx__inp is-pct"><input type="number" min="0" max="100" step="1" disabled={!puedeEditar} value={draftCom[m.id] ?? ""} onChange={(e) => setDraftCom((d) => ({ ...d, [m.id]: e.target.value }))} placeholder="—" aria-label={`Comisión de ${m.nombre} en %`} /><span>%</span></label>
                <span className="dc-mtx__calc">{met && pc != null ? <><b>{soles(met * pc / 100)}</b><small>{pc}% de {soles(met)}</small></> : <small>Define meta y %</small>}</span>
                <span className="dc-mtx__acc">{puedeEditar && <button type="button" className={`dc-meta__btn${cambio ? " is-on" : ""}`} disabled={saving === m.id || !cambio} onClick={() => guardar(m)}><Check size={14} strokeWidth={2.2} /> {saving === m.id ? "…" : "Guardar"}</button>}</span>
              </div>
            );
          })}
        </section>
      )}
      <div className="fm-aviso-edad is-info"><Trophy size={15} strokeWidth={2} /><span>La comisión se calcula sobre la producción del odontólogo (citas atendidas). El avance del mes, quién va al ritmo y la comisión ganada están en <b>Reportes › Producción y comisiones</b>.</span></div>
    </div>
  );
}
