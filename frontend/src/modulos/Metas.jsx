/* Pantalla #/metas — meta mensual y % de comisión de cada odontólogo, POR SEDE.
   Un doctor que atiende en dos sedes tiene una meta en cada una: la de la sede es la suma
   de sus doctores. Con el filtro global de sede (o un usuario de una sola sede) solo se ve
   y se edita esa sede. El avance del mes está en Reportes › Producción y comisiones. */
import React, { useEffect, useMemo, useState } from "react";
import { Check, Info, MapPin, Minus, Plus, RotateCcw, Target, TrendingUp } from "lucide-react";
import api, { auth } from "../api/client";
import { Card, ESPECIALIDADES, MEDICOS, SEDE_IDS, Vacio, colorDe, iniciales, mismaSede, nombreSede, tint, useSede } from "../comun";
import { comisionSede, guardarMetaSedeDemo, metaSede, sedesMed } from "../compartido/medicosSede";

const soles = (n) => "S/ " + Math.round(Number(n) || 0).toLocaleString("es-PE");
const miles = (v) => (v === "" || v == null ? "" : Number(v).toLocaleString("es-PE"));
const k = (mid, sid) => `${mid}:${sid}`;

/* Monto con separador de miles; al editar se ve el número limpio. */
function Monto({ value, onChange, disabled, label }) {
  const [foco, setFoco] = useState(false);
  return (
    <label className={`dc-mtz__monto${disabled ? " is-off" : ""}`}>
      <span>S/</span>
      <input type="text" inputMode="numeric" disabled={disabled} aria-label={label} placeholder="Sin meta"
        value={foco ? (value ?? "") : miles(value)}
        onFocus={(e) => { setFoco(true); requestAnimationFrame(() => e.target.select()); }}
        onBlur={() => setFoco(false)}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} />
    </label>
  );
}

/* % de comisión con − y + (de 1 en 1) y escribible. */
function Porcentaje({ value, onChange, disabled, label }) {
  const n = value === "" || value == null ? null : Number(value);
  const paso = (d) => onChange(String(Math.max(0, Math.min(100, (n ?? 0) + d))));
  return (
    <span className={`dc-mtz__pct${disabled ? " is-off" : ""}`}>
      <button type="button" disabled={disabled || n === 0} onClick={() => paso(-1)} aria-label={`Bajar ${label}`}><Minus size={13} strokeWidth={2.4} /></button>
      <label><input type="text" inputMode="numeric" disabled={disabled} aria-label={label} placeholder="—" value={value ?? ""}
        onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, "").slice(0, 3); onChange(v === "" ? "" : String(Math.min(100, Number(v)))); }} /><em>%</em></label>
      <button type="button" disabled={disabled || n === 100} onClick={() => paso(1)} aria-label={`Subir ${label}`}><Plus size={13} strokeWidth={2.4} /></button>
    </span>
  );
}

export default function Metas({ notify = () => {}, can, sedes = null }) {
  const conectado = !!auth.token;
  const { esMia, mias, sede: sedeSel, global: usuarioGlobal } = useSede();
  // Meta global (doctor sin sede, con API): solo quien ve toda la clínica y sin filtro de sede.
  // Con sesión SEDE_IDS son las sedes reales (registro), así que también vale el recuento.
  const esGlobal = sedeSel === "all" && (usuarioGlobal || !mias || mias.length >= SEDE_IDS.length);
  const puedeEditar = can ? can("metas", "editar") : true;
  const verSedes = useMemo(() => (sedes && sedes.length ? sedes.map(String) : null), [sedes && sedes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const [meds, setMeds] = useState([]);
  const [nombres, setNombres] = useState({});   // sedeId → nombre (conectado)
  const [base, setBase] = useState({});         // k → { meta, com } guardado
  const [draft, setDraft] = useState({});       // k → { meta, com } en edición
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cargar = () => {
    setError(null);
    const armar = (list) => {
      setMeds(list);
      const b = {};
      list.forEach((m) => m.sedesIds.forEach((s) => { b[k(m.id, s)] = { meta: m.metaDe(s) != null ? String(m.metaDe(s)) : "", com: m.comDe(s) != null ? String(m.comDe(s)) : "" }; }));
      setBase(b); setDraft(b);
    };
    if (!conectado) {
      armar(MEDICOS.map((m) => ({ id: m.id, nombre: m.nombre, especialidad: ESPECIALIDADES.find((e) => e.id === m.esp)?.nombre, sedesIds: sedesMed(m).map(String), metaDe: (s) => metaSede(m, s), comDe: (s) => comisionSede(m, s), ref: m })));
      return;
    }
    api.sedes.listar().then((ss) => setNombres(Object.fromEntries((ss || []).map((s) => [String(s.id), s.nombre])))).catch(() => {});
    api.catalogo.medicos()
      .then((rows) => {
        armar((rows || []).filter((m) => m.activo !== false).map((m) => {
          // metasSede puede llegar como mapa { sedeId: {...} } o como lista [{ sedeId, ... }].
          const ms = Array.isArray(m.metasSede) ? Object.fromEntries(m.metasSede.map((x) => [String(x.sedeId), x])) : (m.metasSede || {});
          const ids = (m.sedes || m.sedeIds || (m.sedeId != null ? [m.sedeId] : [])).map((x) => String(x?.id ?? x));
          return { id: m.id, nombre: m.nombre, especialidad: m.especialidad, especialidadId: m.especialidadId, cop: m.cop, activo: m.activo,
            sedesIds: ids.length ? ids : ["todas"],
            metaDe: (s) => (ms[s]?.metaMensual !== undefined ? ms[s].metaMensual : m.metaMensual ?? null),
            comDe: (s) => (ms[s]?.porcentajeComision !== undefined ? ms[s].porcentajeComision : m.porcentajeComision ?? null) };
        }));
      })
      .catch((e) => { setMeds([]); setError(e?.status === 404 ? "No se pudo cargar el catálogo de médicos." : "No se pudieron cargar las metas."); });
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sedes que se muestran: las del filtro global (o del usuario) que tengan doctores.
  const grupos = useMemo(() => {
    const todas = [...new Set(meds.flatMap((m) => m.sedesIds))];
    const orden = [...SEDE_IDS.map(String), ...todas].filter((s, i, a) => a.indexOf(s) === i && todas.includes(s));
    // "todas" = doctores sin sede (con API): su meta es global, solo para quien ve toda la clínica.
    return orden.filter((s) => (s === "todas" ? esGlobal : !verSedes || verSedes.some((v) => mismaSede(v, s))))
      .map((s) => ({ sede: s, meds: meds.filter((m) => m.sedesIds.includes(s)) }))
      .filter((g) => g.meds.length);
  }, [meds, verSedes, esGlobal]);
  const nomSede = (s) => (s === "todas" ? "Todas las sedes" : nombres[s] || nombreSede(Number(s)) || "Sede");

  const val = (key, campo) => { const v = draft[key]?.[campo]; return v === "" || v == null ? null : Number(v); };
  const filas = grupos.flatMap((g) => g.meds.map((m) => ({ m, s: g.sede, key: k(m.id, g.sede) })));
  const cambiados = filas.filter(({ key }) => (draft[key]?.meta ?? "") !== (base[key]?.meta ?? "") || (draft[key]?.com ?? "") !== (base[key]?.com ?? ""));
  const metaTotal = filas.reduce((a, f) => a + (val(f.key, "meta") || 0), 0);
  const comTotal = filas.reduce((a, f) => a + ((val(f.key, "meta") || 0) * (val(f.key, "com") || 0)) / 100, 0);
  const conMeta = new Set(filas.filter((f) => val(f.key, "meta") > 0).map((f) => f.m.id)).size;
  const docs = new Set(filas.map((f) => f.m.id)).size;
  const pcts = filas.map((f) => val(f.key, "com")).filter((v) => v != null);
  const pctProm = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
  const unaSede = grupos.length === 1 && grupos[0].sede !== "todas";

  const set = (key, campo, v) => setDraft((d) => ({ ...d, [key]: { ...(d[key] || {}), [campo]: v } }));
  const deshacer = () => setDraft(base);
  const guardarTodo = () => {
    if (!puedeEditar) { notify("Sin permiso para editar metas."); return; }
    const malo = cambiados.find(({ key }) => { const c = val(key, "com"); return c != null && (c < 0 || c > 100); });
    if (malo) { notify("La comisión va de 0 a 100 %."); return; }
    if (!conectado) {
      cambiados.forEach(({ m, s, key }) => guardarMetaSedeDemo(m.ref, Number(s), val(key, "meta"), val(key, "com")));
      setBase(draft);
      notify(cambiados.length === 1 ? `Meta y comisión de ${cambiados[0].m.nombre} guardadas.` : `${cambiados.length} metas guardadas.`);
      return;
    }
    setSaving(true);
    Promise.all(cambiados.map(({ m, s, key }) => {
      const body = { metaMensual: val(key, "meta"), porcentajeComision: val(key, "com") };
      if (s !== "todas") return api.catalogo.fijarMetaSede(m.id, s, body);
      return Promise.all([
        api.catalogo.fijarMeta(m.id, body.metaMensual),
        api.catalogo.actualizarMedico(m.id, { nombre: m.nombre, especialidadId: m.especialidadId || null, cop: m.cop || null, activo: m.activo !== false, porcentajeComision: body.porcentajeComision }),
      ]);
    }))
      .then(() => { notify("Metas guardadas."); cargar(); })
      .catch((e) => notify(e?.message || "No se pudo guardar."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="dc-mtz" style={{ display: "grid", gap: 14 }}>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{error ? "—" : soles(metaTotal)}</b><span>meta mensual {unaSede ? `de ${nomSede(grupos[0].sede)}` : "de la clínica"}</span></div>
          <p>La meta y el % de comisión de cada odontólogo, sede por sede</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{error ? "—" : `${conMeta} de ${docs}`}</b><span>Con meta</span></div>
          <div><b>{pctProm != null ? `${Math.round(pctProm)}%` : "—"}</b><span>Comisión promedio</span></div>
          <div><b>{soles(comTotal)}</b><span>Comisión si cumplen</span></div>
        </div>
        <span />
        <button type="button" className="dc-esp-hero__btn" onClick={() => { window.location.hash = "#/reportes"; }}><TrendingUp size={14} strokeWidth={2} /> Ver avance del mes</button>
      </section>
      {error && <div className="fm-aviso-edad is-mal"><Target size={15} strokeWidth={2} /><span>{error}</span><button type="button" onClick={cargar}>Reintentar</button></div>}
      {conectado && !error && meds.length === 0 && <Card><Vacio icon={<Target size={22} strokeWidth={1.75} />} titulo="Sin odontólogos" sub="Regístralos en Configuración, Doctores." /></Card>}

      {grupos.map((g) => {
        const metaS = g.meds.reduce((a, m) => a + (val(k(m.id, g.sede), "meta") || 0), 0);
        return (
          <section key={g.sede} className="dc-mtz__card" aria-label={`Metas de ${nomSede(g.sede)}`}>
            <header className="dc-mtz__cab">
              <span className="dc-mtz__sedeico"><MapPin size={16} strokeWidth={2} /></span>
              <div className="dc-mtz__tit">
                <h3>{nomSede(g.sede)}</h3>
                <span>{g.meds.length} {g.meds.length === 1 ? "odontólogo" : "odontólogos"}{!conectado ? " · demostración: se guarda en este navegador" : ""}</span>
              </div>
              <div className="dc-mtz__tot"><small>Meta de la sede</small><b>{soles(metaS)}</b></div>
            </header>
            <div className="dc-mtz__tabla" role="table">
              <div className="dc-mtz__fila is-cab" role="row">
                <span role="columnheader">Odontólogo</span><span role="columnheader">Meta mensual</span><span role="columnheader">Comisión</span><span role="columnheader">Gana al cumplir</span><span role="columnheader">Parte de la meta</span>
              </div>
              {g.meds.map((m) => {
                const key = k(m.id, g.sede);
                const met = val(key, "meta"), pc = val(key, "com");
                const cambio = cambiados.some((c) => c.key === key);
                const col = colorDe(m.nombre);
                // Solo se nombran las otras sedes del doctor que el usuario también tiene.
                const otras = m.sedesIds.filter((s) => s !== g.sede && s !== "todas" && esMia(s));
                const parte = metaS && met ? Math.round((met / metaS) * 100) : 0;
                return (
                  <div key={key} role="row" className={`dc-mtz__fila${cambio ? " is-cambio" : ""}`}>
                    <span role="cell" className="dc-mtz__doc">
                      <span className="dc-mtz__av" style={{ background: `linear-gradient(135deg, ${tint(col, 0.22)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(m.nombre.replace(/^Dra?\.\s*/, ""))}</span>
                      <span className="dc-mtz__dn"><b>{m.nombre}{cambio && <em className="dc-mtz__tag">Editado</em>}</b><small>{m.especialidad || "Sin especialidad"}{otras.length ? <> · <i>también en {otras.map((s) => nomSede(s).replace(/^Sede\s+/i, "")).join(", ")}</i></> : null}</small></span>
                    </span>
                    <span role="cell"><Monto value={draft[key]?.meta} disabled={!puedeEditar} label={`Meta mensual de ${m.nombre} en ${nomSede(g.sede)}`} onChange={(v) => set(key, "meta", v)} /></span>
                    <span role="cell"><Porcentaje value={draft[key]?.com} disabled={!puedeEditar} label={`comisión de ${m.nombre}`} onChange={(v) => set(key, "com", v)} /></span>
                    <span role="cell" className="dc-mtz__gana">{met && pc != null ? <><b>{soles((met * pc) / 100)}</b><small>{pc}% de {soles(met)}</small></> : <small>Define meta y %</small>}</span>
                    <span role="cell" className="dc-mtz__parte"><i><u style={{ width: `${parte}%`, background: col }} /></i><b>{parte ? `${parte}%` : "—"}</b></span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="dc-mtz__nota"><Info size={13} strokeWidth={2} /> La comisión se calcula sobre lo que el odontólogo produce en cada sede (citas atendidas al precio de esa sede). Quién va al ritmo y cuánto lleva ganado está en <b>Reportes › Producción y comisiones</b>.</p>

      {puedeEditar && cambiados.length > 0 && (
        <div className="dc-mtz__barra" role="region" aria-label="Cambios sin guardar">
          <span><b>{cambiados.length}</b> {cambiados.length === 1 ? "cambio sin guardar" : "cambios sin guardar"}</span>
          <button type="button" className="dc-mtz__sec" onClick={deshacer}><RotateCcw size={13} strokeWidth={2.2} /> Deshacer</button>
          <button type="button" className="dc-mtz__pri" disabled={saving} onClick={guardarTodo}><Check size={14} strokeWidth={2.4} /> {saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      )}
    </div>
  );
}
