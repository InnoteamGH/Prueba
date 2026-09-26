/* Pantalla #/metas — meta mensual por médico (DC-41 / DC-09). */
import React, { useEffect, useState } from "react";
import { Check, LayoutGrid, Target, TrendingUp, Trophy, Users } from "lucide-react";
import api, { auth } from "../api/client";
import {Card, ListaFiltrable, ESPECIALIDADES, MEDICOS, Vacio, colorDe, iniciales, tint, PersonaCelda} from "../comun";

export default function Metas({ notify = () => {}, can }) {
  const conectado = !!auth.token;
  const puedeEditar = can ? can("metas", "editar") : true;
  const [meds, setMeds] = useState([]);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  const cargar = () => {
    if (!conectado) {
      // Demo: odontólogos de ejemplo con su producción del mes.
      const list = MEDICOS.map((m) => ({ id: m.id, nombre: m.nombre, especialidad: ESPECIALIDADES.find((e) => e.id === m.esp)?.nombre, metaMensual: m.meta, prodMes: m.prodDemo, citasMes: m.citasDemo, porcentajeComision: 30 }));
      setMeds(list);
      const d = {};
      list.forEach((m) => { d[m.id] = String(m.metaMensual); });
      setDraft(d);
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
      })
      .catch((e) => {
        setMeds([]);
        setError(e?.status === 404
          ? "No se pudo cargar el catálogo de médicos."
          : "No se pudieron cargar las metas.");
      });
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const guardar = (m) => {
    if (!puedeEditar) { notify("Sin permiso para editar metas."); return; }
    const raw = draft[m.id];
    const n = raw === "" || raw == null ? null : Number(raw);
    if (n != null && (!Number.isFinite(n) || n < 0)) { notify("Meta inválida."); return; }
    if (!conectado) {
      setMeds((ms) => ms.map((x) => (x.id === m.id ? { ...x, metaMensual: n } : x)));
      notify(`Meta de ${m.nombre} guardada (demo).`);
      return;
    }
    setSaving(m.id);
    api.catalogo.fijarMeta(m.id, n)
      .then(() => { notify(`Meta de ${m.nombre} guardada.`); cargar(); })
      .catch((e) => notify(e?.message || "No se pudo guardar la meta."))
      .finally(() => setSaving(null));
  };

  const conMeta = meds.filter((m) => Number(m.metaMensual) > 0).length;
  const metaTotal = meds.reduce((a, m) => a + (Number(m.metaMensual) || 0), 0);
  const conProd = meds.some((m) => m.prodMes != null);
  const prodTotal = meds.reduce((a, m) => a + (Number(m.prodMes) || 0), 0);
  const pctTotal = metaTotal ? Math.round((prodTotal / metaTotal) * 100) : 0;
  const soles = (n) => "S/ " + Math.round(Number(n) || 0).toLocaleString("es-PE");
  const dia = new Date().getDate();
  const diasMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const ritmo = Math.round((dia / diasMes) * 100);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{error ? "—" : soles(metaTotal)}</b><span>meta del mes</span></div>
          <p>Meta mensual por odontólogo, se usa en reportes y comisiones</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{error ? "—" : meds.length}</b><span>Odontólogos</span></div>
          <div><b>{error ? "—" : conMeta}</b><span>Con meta</span></div>
          {conProd && <div><b>{pctTotal}%</b><span>Avance, día {dia} de {diasMes}</span></div>}
        </div>
        <span />
      </section>
      {error && <div className="fm-aviso-edad is-mal"><Target size={15} strokeWidth={2} /><span>{error}</span><button type="button" onClick={cargar}>Reintentar</button></div>}
      {!conectado && <div className="fm-aviso-edad is-info"><Target size={15} strokeWidth={2} /><span><b>Datos de ejemplo.</b> Inicia sesión para ver y editar las metas reales de la clínica.</span></div>}
      {conectado && !error && meds.length === 0 && (
        <Card><Vacio icon={<Target size={22} strokeWidth={1.75} />} titulo="Sin odontólogos" sub="Regístralos en Configuración, Doctores." /></Card>
      )}
      {meds.length > 0 && (
        <ListaFiltrable rows={meds} sub="odontólogos" vistaClave="metas" vistas={[{ id: "tarjetas", label: "Tarjetas", icon: LayoutGrid }]} tabla={{ minWidth: 760, cols: [
          { key: "n", label: "Odontólogo", w: "minmax(190px,1.3fr)", cell: (m) => <PersonaCelda nombre={m.nombre} sub={m.especialidad || "Sin especialidad"} /> },
          { key: "prod", label: "Producción", w: "120px", a: "right", cell: (m) => <span className="dc-tp__num">{m.prodMes != null ? soles(Number(m.prodMes)) : "—"}</span> },
          { key: "meta", label: "Meta", w: "120px", a: "right", cell: (m) => <span className="dc-tp__num">{m.metaMensual ? soles(Number(m.metaMensual)) : "—"}</span> },
          { key: "av", label: "Avance", w: "minmax(160px,1fr)", cell: (m) => { const mt = Number(m.metaMensual) || 0; const pct = m.prodMes != null && mt ? Math.round((Number(m.prodMes) / mt) * 100) : null; return pct == null ? <span className="dc-tp__sub">Sin dato</span> : <span className="dc-tp__prog"><i><em style={{ width: `${Math.min(pct, 100)}%` }} /></i><small>{pct}%</small></span>; } },
          { key: "com", label: "Comisión", w: "100px", a: "right", cell: (m) => <span className="dc-tp__sub">{m.porcentajeComision != null ? `${m.porcentajeComision}%` : "—"}</span> },
        ] }} cols={[
          { key: "nombre", label: "Odontólogo", get: (m) => m.nombre || "" },
          { key: "esp", label: "Especialidad", get: (m) => m.especialidad || "" },
          { key: "prod", label: "Producción", get: (m) => (m.prodMes != null ? String(m.prodMes) : ""), sortVal: (m) => Number(m.prodMes) || 0 },
          { key: "meta", label: "Meta", get: (m) => String(m.metaMensual ?? ""), sortVal: (m) => Number(m.metaMensual) || 0 },
          { key: "pct", label: "Avance", get: (m) => { const mt = Number(m.metaMensual) || 0; return m.prodMes != null && mt ? `${Math.round((Number(m.prodMes) / mt) * 100)}%` : ""; }, sortVal: (m) => { const mt = Number(m.metaMensual) || 0; return m.prodMes != null && mt ? Number(m.prodMes) / mt : -1; } },
        ]}>{(lstM) => (
        <div className="dc-metas">
          {lstM.map((m) => {
            const col = colorDe(m.nombre);
            const meta = Number(m.metaMensual) || 0;
            const prod = m.prodMes != null ? Number(m.prodMes) : null;
            const pct = prod != null && meta ? Math.round((prod / meta) * 100) : null;
            const est = pct == null ? "" : pct >= ritmo ? "is-ok" : pct >= ritmo - 15 ? "is-warn" : "is-mal";
            const cambio = String(draft[m.id] ?? "") !== String(m.metaMensual ?? "");
            return (
              <article key={m.id} className={`dc-meta ${est}`}>
                <header>
                  <span className="dc-rec__av" style={{ width: 38, height: 38, fontSize: 12.5, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(m.nombre.replace(/^Dra?\.\s*/, ""))}</span>
                  <div><b>{m.nombre}</b><span>{m.especialidad || "Sin especialidad"}{m.porcentajeComision != null ? ` – comisión ${m.porcentajeComision}%` : ""}</span></div>
                  {pct != null && <em className="dc-meta__pct">{pct}%</em>}
                </header>
                {pct != null ? (
                  <div className="dc-meta__avance">
                    <div className="dc-meta__barra"><i style={{ width: `${Math.min(pct, 100)}%` }} /><s style={{ left: `${ritmo}%` }} title={`Ritmo esperado al día ${dia}: ${ritmo}%`} /></div>
                    <div className="dc-meta__cifras"><span><TrendingUp size={12} strokeWidth={2.2} /> {soles(prod)} producidos</span><span>{m.citasMes != null ? <><Users size={12} strokeWidth={2.2} /> {m.citasMes} citas</> : null}</span></div>
                  </div>
                ) : <p className="dc-meta__nota">El avance se ve en Producción y comisiones.</p>}
                <div className="dc-meta__pie">
                  <label className="dc-meta__inp"><span>Meta S/</span><input type="number" min="0" step="100" disabled={!puedeEditar} value={draft[m.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [m.id]: e.target.value }))} placeholder="Sin meta" aria-label={`Meta mensual de ${m.nombre}`} /></label>
                  {puedeEditar && <button type="button" className={`dc-meta__btn${cambio ? " is-on" : ""}`} disabled={saving === m.id || !cambio} onClick={() => guardar(m)}><Check size={14} strokeWidth={2.2} /> {saving === m.id ? "Guardando…" : "Guardar"}</button>}
                </div>
              </article>
            );
          })}
        </div>
        )}</ListaFiltrable>
      )}
      {conProd && meds.length > 0 && (
        <div className="fm-aviso-edad is-info"><Trophy size={15} strokeWidth={2} /><span>La línea sobre cada barra marca el ritmo esperado a hoy ({ritmo}% del mes). Verde va al día, ámbar un poco atrás y coral necesita empuje.</span></div>
      )}
    </div>
  );
}
