/* Pantalla #/metas — meta mensual de cada odontólogo POR SEDE y su % de comisión.
   Un doctor que atiende en dos sedes tiene una meta en cada una: la de la sede es la suma
   de sus doctores. El % de comisión es del médico (el mismo en todas sus sedes): solo lo
   cambia el administrador general en «Todas las sedes» (util/metasComision.js). Con el
   filtro global de sede (o un usuario de una sola sede) solo se ve y se edita la meta de esa
   sede. El avance del mes está en Reportes › Producción y comisiones. */
import React, { useEffect, useMemo, useState } from "react";
import { Check, Info, MapPin, Minus, Plus, RotateCcw, Target, TrendingUp } from "lucide-react";
import api, { auth, msgServidor } from "../api/client";
import { Card, ESPECIALIDADES, MEDICOS, SEDE_IDS, Vacio, colorDe, iniciales, mismaSede, nombreSede, tint, useSede } from "../comun";
import { guardarMetaSedeDemo, metaSede, sedesMed } from "../compartido/medicosSede";
import { comisionMedico, cuerpoMetaSede, puedeEditarComision } from "../util/metasComision";
import { atiendeEnSedes } from "../compartido/medicoEnSede";
import { sedeApiUuid } from "../routing";
import NoDisponible from "../ui/NoDisponible";
import "./reportes.css";

const soles = (n) => "S/ " + (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Al salir del campo, el monto se lee como el resto («1,500.00», no «1,500»).
const miles = (v) => (v === "" || v == null ? "" : Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// La comisión es del odontólogo, igual en todas sus sedes (la regla, en util/metasComision.js).
const NOTA_COMISION = "La comisión es igual en todas las sedes del odontólogo; la cambia el administrador general en «Todas las sedes».";
const k = (mid, sid) => `${mid}:${sid}`;

/* Monto con separador de miles; al editar se ve el número limpio. */
function Monto({ value, onChange, disabled, label }) {
  const [foco, setFoco] = useState(false);
  const vacio = value === "" || value == null;
  return (
    <label className={`dc-mtz__monto${disabled ? " is-off" : ""}`}>
      {/* Vacío, la ayuda va en el campo («Define la meta»), sin «S/» delante ni un «0» gris. */}
      {(!vacio || foco) && <span>S/</span>}
      <input type="text" inputMode="numeric" disabled={disabled} aria-label={label} placeholder={disabled ? "Sin meta" : "Define la meta"}
        value={foco ? (value ?? "") : miles(value)}
        onFocus={(e) => { setFoco(true); requestAnimationFrame(() => e.target.select()); }}
        onBlur={() => setFoco(false)}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} />
    </label>
  );
}

/* % de comisión con − y + (de 1 en 1) y escribible. */
function Porcentaje({ value, onChange, disabled, label, title }) {
  const n = value === "" || value == null ? null : Number(value);
  const paso = (d) => onChange(String(Math.max(0, Math.min(100, (n ?? 0) + d))));
  return (
    <span className={`dc-mtz__pct${disabled ? " is-off" : ""}`} title={title}>
      <button type="button" disabled={disabled || n === 0} onClick={() => paso(-1)} aria-label={`Bajar ${label}`}><Minus size={13} strokeWidth={2.4} /></button>
      <label><input type="text" inputMode="numeric" disabled={disabled} aria-label={label} placeholder="—" value={value ?? ""}
        onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, "").slice(0, 3); onChange(v === "" ? "" : String(Math.min(100, Number(v)))); }} /><em>%</em></label>
      <button type="button" disabled={disabled || n === 100} onClick={() => paso(1)} aria-label={`Subir ${label}`}><Plus size={13} strokeWidth={2.4} /></button>
    </span>
  );
}

export default function Metas({ notify = () => {}, can, sedes = null, rol = auth.sesion?.rol || "" }) {
  const conectado = !!auth.token;
  const { esMia, mias, sede: sedeSel, global: usuarioGlobal } = useSede();
  // Meta global (doctor sin sede, con API): solo quien ve toda la clínica y sin filtro de sede.
  // Con sesión SEDE_IDS son las sedes reales (registro), así que también vale el recuento.
  const esGlobal = sedeSel === "all" && (usuarioGlobal || !mias || mias.length >= SEDE_IDS.length);
  const puedeEditar = can ? can("metas", "editar") : true;
  // El % de comisión es del médico (global): solo el administrador general lo cambia, y solo
  // en «Todas las sedes», por PUT /medicos/{id} (que el servidor autoriza con Configuración).
  // Con una sede elegida se edita solo la meta; gerencia y el administrador de sede ven el %
  // en solo lectura (R4-02 / R7-03).
  const puedeComGlobal = puedeEditarComision({ rol, vistaTodas: esGlobal, puedeEditarMetas: puedeEditar, puedeConfig: can ? can("config", "editar") : true });
  const verSedes = useMemo(() => (sedes && sedes.length ? sedes.map(String) : null), [sedes && sedes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const [meds, setMeds] = useState([]);
  const [nombres, setNombres] = useState({});   // sedeId → nombre (conectado)
  const [espNom, setEspNom] = useState({});     // especialidadId → nombre (GET /especialidades)
  const [base, setBase] = useState({});         // k → { meta, com } guardado
  const [draft, setDraft] = useState({});       // k → { meta, com } en edición
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // R6-04: horario de los doctores (GET /disponibilidad). /medicos no trae la sede (H-14):
  // con una sede elegida (o un usuario de sede) solo se listan los doctores con horario en
  // ella, como en la agenda. null = sin horario a la vista (se listan todos, con el aviso).
  const [disp, setDisp] = useState(null);

  const cargar = () => {
    setError(null);
    const armar = (list) => {
      setMeds(list);
      const b = {};
      list.forEach((m) => m.sedesIds.forEach((s) => { b[k(m.id, s)] = { meta: m.metaDe(s) != null ? String(m.metaDe(s)) : "", com: m.comDe(s) != null ? String(m.comDe(s)) : "" }; }));
      setBase(b); setDraft(b);
    };
    if (!conectado) {
      armar(MEDICOS.map((m) => ({ id: m.id, nombre: m.nombre, especialidad: ESPECIALIDADES.find((e) => e.id === m.esp)?.nombre, sedesIds: sedesMed(m).map(String), metaDe: (s) => metaSede(m, s), comDe: () => comisionMedico(m), ref: m })));
      return;
    }
    api.sedes.listar().then((ss) => setNombres(Object.fromEntries((ss || []).map((s) => [String(s.id), s.nombre])))).catch(() => {});
    // El nombre de la especialidad sale del catálogo (/medicos solo trae especialidadId).
    api.catalogo.especialidades().then((es) => setEspNom(Object.fromEntries((es || []).map((e) => [String(e.id), e.nombre])))).catch(() => {});
    api.disponibilidad.listar().then((d) => setDisp(Array.isArray(d) && d.some((x) => x && x.activo !== false) ? d.filter((x) => x && x.activo !== false) : null)).catch(() => setDisp(null));
    api.catalogo.medicos()
      .then((rows) => {
        armar((rows || []).filter((m) => m.activo !== false).map((m) => {
          // metasSede puede llegar como mapa { sedeId: {...} } o como lista [{ sedeId, ... }].
          const ms = Array.isArray(m.metasSede) ? Object.fromEntries(m.metasSede.map((x) => [String(x.sedeId), x])) : (m.metasSede || {});
          const ids = (m.sedes || m.sedeIds || (m.sedeId != null ? [m.sedeId] : [])).map((x) => String(x?.id ?? x));
          return { id: m.id, nombre: m.nombre, especialidad: m.especialidad, especialidadId: m.especialidadId, cop: m.cop, activo: m.activo,
            sedes: ids, sedesIds: ids.length ? ids : ["todas"], sinSede: !ids.length,
            metaDe: (s) => (ms[s]?.metaMensual !== undefined ? ms[s].metaMensual : m.metaMensual ?? null),
            // El % es del médico: el de su ficha, no el de cada sede.
            comDe: () => comisionMedico(m) };
        }));
      })
      .catch((e) => { setMeds([]); setError(e?.status === 404 ? "No se pudo cargar el catálogo de médicos." : "No se pudieron cargar las metas."); });
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Doctores para los que el servidor no dice en qué sede atienden (/medicos sin sedes).
  const sinSede = meds.filter((m) => m.sinSede);
  // Sedes que se muestran: las del filtro global (o del usuario) que tengan doctores.
  const grupos = useMemo(() => {
    const todas = [...new Set(meds.flatMap((m) => m.sedesIds))];
    const orden = [...SEDE_IDS.map(String), ...todas].filter((s, i, a) => a.indexOf(s) === i && todas.includes(s));
    // "todas" = doctores sin sede (con API): su meta es global, solo para quien ve toda la clínica.
    const gs = orden.filter((s) => (s === "todas" ? esGlobal : !verSedes || verSedes.some((v) => mismaSede(v, s))))
      .map((s) => ({ sede: s, meds: meds.filter((m) => m.sedesIds.includes(s)) }));
    // Con una sede elegida, los doctores sin sede no pueden desaparecer («0 de 0»): se listan
    // en cada sede que se ve. R6-04: si hay horario a la vista, solo los que tienen horario en
    // esa sede (antes el admin de Surco veía y guardaba la meta de una doctora de San Isidro);
    // sin horario, todos, con el aviso de que el servidor no indica dónde atienden.
    if (!esGlobal && sinSede.length) {
      const vistas = (verSedes || (mias || []).map(String)).map(String);
      vistas.forEach((v) => {
        // R8-07: la misma regla de Producción, el Panel y Configuración › Doctores (medicoEnSede.js).
        const deAqui = sinSede.filter((m) => atiendeEnSedes(m, [v], disp, mismaSede) !== false);
        const g = gs.find((x) => mismaSede(x.sede, v));
        if (g) g.meds = [...g.meds, ...deAqui.filter((m) => !g.meds.includes(m))];
        else gs.push({ sede: v, meds: [...deAqui] });
      });
    }
    return gs.filter((g) => g.meds.length);
  }, [meds, verSedes, esGlobal, disp]); // eslint-disable-line react-hooks/exhaustive-deps
  // Doctores sin sede que no se listan por no tener horario en la sede que se ve (R6-04).
  const ocultosSinHorario = !esGlobal && disp ? sinSede.filter((m) => !grupos.some((g) => g.meds.includes(m))) : [];
  const nomSede = (s) => (s === "todas" ? "Todas las sedes" : nombres[s] || nombres[sedeApiUuid(s)] || nombreSede(Number(s)) || "Sede");
  const nomEsp = (m) => m.especialidad || (m.especialidadId != null ? espNom[String(m.especialidadId)] : null) || "Sin especialidad";

  const val = (key, campo) => { const v = draft[key]?.[campo]; return v === "" || v == null ? null : Number(v); };
  const filas = grupos.flatMap((g) => g.meds.map((m) => ({ m, s: g.sede, key: k(m.id, g.sede) })));
  // Filas agregadas (doctor sin sede en la sede elegida): su meta y % parten de lo guardado.
  const clavesFilas = filas.map((f) => f.key).join(",");
  useEffect(() => {
    const falt = {};
    filas.forEach(({ m, s, key }) => { if (!(key in base)) { const me = m.metaDe(s), co = m.comDe(s); falt[key] = { meta: me != null ? String(me) : "", com: co != null ? String(co) : "" }; } });
    if (Object.keys(falt).length) { setBase((b) => ({ ...falt, ...b })); setDraft((d) => ({ ...falt, ...d })); }
  }, [clavesFilas]); // eslint-disable-line react-hooks/exhaustive-deps
  const cambiados = filas.filter(({ key }) => (draft[key]?.meta ?? "") !== (base[key]?.meta ?? "") || (draft[key]?.com ?? "") !== (base[key]?.com ?? ""));
  const metaTotal = filas.reduce((a, f) => a + (val(f.key, "meta") || 0), 0);
  const comTotal = filas.reduce((a, f) => a + ((val(f.key, "meta") || 0) * (val(f.key, "com") || 0)) / 100, 0);
  const conMeta = new Set(filas.filter((f) => val(f.key, "meta") > 0).map((f) => f.m.id)).size;
  const docs = new Set(filas.map((f) => f.m.id)).size;
  const pcts = filas.map((f) => val(f.key, "com")).filter((v) => v != null);
  const pctProm = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
  const unaSede = grupos.length === 1 && grupos[0].sede !== "todas";
  // R6-04: con una sede a la vista y ningún doctor con horario en ella, la cifra es de esa sede
  // (no «de la clínica») y se dice por qué la lista está vacía.
  const vistaUnica = !esGlobal ? ((verSedes || (mias || []).map(String)).length === 1 ? (verSedes || (mias || []).map(String))[0] : null) : null;
  const sinDocsAqui = conectado && !error && meds.length > 0 && !grupos.length && !esGlobal;

  // R8-01: el servidor no deja que un administrador de sede guarde la meta de un médico sin sede
  // asignada (403 «No puedes modificar la meta de un médico sin sede asignada.»), y GET /medicos
  // trae `sedes: []` (H-14). Esas filas quedan en solo lectura, con el aviso, en vez de ofrecer
  // una edición que no se puede guardar. El administrador general no cambia.
  const esAdminSede = conectado && rol === "admin_sede";
  const bloqueada = (m) => esAdminSede && !!m.sinSede;
  const medsBloqueados = [...new Set(filas.filter((f) => bloqueada(f.m)).map((f) => f.m))];
  const todasBloqueadas = filas.length > 0 && medsBloqueados.length === new Set(filas.map((f) => f.m)).size;
  // El % es del médico: al cambiarlo en una fila cambia en todas sus filas (una por sede).
  const set = (key, campo, v) => setDraft((d) => {
    if (campo !== "com") return { ...d, [key]: { ...(d[key] || {}), [campo]: v } };
    const mid = (filas.find((f) => f.key === key) || {}).m?.id;
    const nd = { ...d };
    filas.filter((f) => f.key === key || (mid != null && f.m.id === mid)).forEach((f) => { nd[f.key] = { ...(nd[f.key] || {}), com: v }; });
    return nd;
  });
  const deshacer = () => setDraft(base);
  const guardarTodo = () => {
    if (!puedeEditar) { notify("Sin permiso para editar metas."); return; }
    const malo = cambiados.find(({ key }) => { const c = val(key, "com"); return c != null && (c < 0 || c > 100); });
    if (malo) { notify("La comisión va de 0 a 100 %."); return; }
    const cambioMeta = (key) => (draft[key]?.meta ?? "") !== (base[key]?.meta ?? "");
    const cambioCom = (key) => (draft[key]?.com ?? "") !== (base[key]?.com ?? "");
    // El % se guarda una vez por médico (es global), con todas sus filas.
    const comPorMedico = puedeComGlobal ? [...new Map(cambiados.filter(({ key }) => cambioCom(key)).map((f) => [String(f.m.id), f])).values()]
      .map((f) => ({ m: f.m, com: val(f.key, "com"), keys: filas.filter((x) => String(x.m.id) === String(f.m.id)).map((x) => x.key) })) : [];
    if (!conectado) {
      cambiados.filter(({ key }) => cambioMeta(key)).forEach(({ m, s, key }) => guardarMetaSedeDemo(m.ref, Number(s), val(key, "meta"), undefined));
      comPorMedico.forEach(({ m, com }) => {
        m.ref.comision = com;
        try { const o = JSON.parse(localStorage.getItem("dc_data_v1_medicos_cfg") || "{}"); o[m.id] = { ...(o[m.id] || {}), comision: com }; localStorage.setItem("dc_data_v1_medicos_cfg", JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ }
      });
      setBase(draft);
      notify(cambiados.length === 1 ? `Cambio de ${cambiados[0].m.nombre} guardado.` : `${cambiados.length} cambios guardados.`);
      return;
    }
    setSaving(true);
    // Una petición por cada cosa que cambió. Si el servidor rechaza una parte, lo demás queda
    // guardado y se dice qué faltó: nunca un guardado a medias en silencio (R4-02).
    // Meta por sede: PUT /medicos/{id}/metas/{sedeId} con { metaMensual } (sin el %). Meta de
    // un doctor sin sede (vista «Todas las sedes»): la ruta global de la meta.
    const tareas = [
      ...cambiados.filter(({ key }) => cambioMeta(key)).map(({ m, s, key }) => ({ keys: [key], campos: ["meta"], que: "meta", nombre: m.nombre,
        p: s !== "todas" ? api.catalogo.fijarMetaSede(m.id, sedeApiUuid(s) || s, cuerpoMetaSede(val(key, "meta"))) : api.catalogo.fijarMeta(m.id, val(key, "meta")) })),
      ...comPorMedico.map(({ m, com, keys }) => ({ keys, campos: ["com"], que: "comisión", nombre: m.nombre,
        p: api.catalogo.actualizarMedico(m.id, { nombre: m.nombre, especialidadId: m.especialidadId || null, cop: m.cop || null, activo: m.activo !== false, porcentajeComision: com }) })),
    ];
    if (!tareas.length) { setDraft(base); setSaving(false); notify("Sin cambios que guardar."); return; }
    Promise.allSettled(tareas.map((t) => t.p))
      .then((rs) => {
        const fallos = tareas.filter((_, i) => rs[i].status === "rejected");
        if (!fallos.length) { notify("Metas guardadas."); cargar(); return; }
        const ok = tareas.filter((_, i) => rs[i].status === "fulfilled");
        // Lo guardado deja de contar como cambio; lo rechazado sigue marcado «sin guardar».
        setBase((b) => {
          const nb = { ...b };
          ok.forEach((t) => t.keys.forEach((kk) => { nb[kk] = { ...(nb[kk] || {}), ...Object.fromEntries(t.campos.map((c) => [c, draft[kk]?.[c] ?? ""])) }; }));
          return nb;
        });
        const e = rs.find((r) => r.status === "rejected").reason;
        // R8-01: el motivo es el que da el servidor (p. ej. «No puedes modificar la meta de un
        // médico sin sede asignada.»); antes todo 403 se leía «tu rol no tiene permiso».
        const srv = msgServidor(e);
        const motivo = srv ? srv.replace(/\s*\.?$/, ".") : e?.status === 403 ? "Tu rol no tiene permiso para guardarlo." : "Error del servidor.";
        const lista = fallos.map((t) => `${t.que} de ${t.nombre}`).join(", ");
        notify(ok.length
          ? `Se guardó una parte. No se guardó: ${lista}. ${motivo} Sigue marcado como cambio sin guardar.`
          : `No se guardó: ${lista}. ${motivo}`);
      })
      .finally(() => setSaving(false));
  };
  // R4-15: Escape descarta la edición en curso, igual que «Deshacer».
  const hayCambios = cambiados.length > 0;
  useEffect(() => {
    if (!hayCambios || saving) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Un modal abierto encima (p. ej. el buscador) se cierra antes con su propio Escape.
      if (document.querySelector("[role='dialog'], .dc-modal")) return;
      setDraft(base);
      if (document.activeElement && document.activeElement.closest(".dc-mtz")) document.activeElement.blur();
      notify("Cambios descartados.");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hayCambios, saving, base]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dc-mtz" style={{ display: "grid", gap: 14 }}>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          {/* R6-11: si no se pudieron leer los médicos, ninguna cifra cae a S/ 0 (se leía como dato real). */}
          <div className="dc-esp-hero__num"><b>{error ? "—" : soles(metaTotal)}</b><span>{error ? <NoDisponible onReintentar={cargar} texto="Metas no disponibles" /> : <>meta mensual {unaSede ? `de ${nomSede(grupos[0].sede)}` : sinDocsAqui && vistaUnica ? `de ${nomSede(vistaUnica)}` : "de la clínica"}</>}</span></div>
          <p>La meta de cada odontólogo, sede por sede, y su % de comisión</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{error ? "—" : `${conMeta} de ${docs}`}</b><span>Con meta</span></div>
          <div><b>{!error && pctProm != null ? `${Math.round(pctProm)}%` : "—"}</b><span>Comisión promedio</span></div>
          <div><b>{error ? "—" : soles(comTotal)}</b><span>Comisión si cumplen</span></div>
        </div>
        <span />
        <button type="button" className="dc-esp-hero__btn" onClick={() => { window.location.hash = "#/reportes"; }}><TrendingUp size={14} strokeWidth={2} /> Ver avance del mes</button>
      </section>
      {error && <NoDisponible bloque onReintentar={cargar} texto="No disponible" detalle={`${error} Las cifras de arriba no son ceros: faltan los datos.`} />}
      {conectado && !error && sinSede.length > 0 && !esGlobal && <div className="fm-aviso-edad"><Info size={15} strokeWidth={2} /><span>{disp
        ? <>El servidor no indica en qué sede atiende cada doctor: se muestran los que tienen horario en la sede elegida (Configuración › Horarios por doctor).{ocultosSinHorario.length ? ` ${ocultosSinHorario.length === 1 ? "1 doctor sin horario aquí no se lista" : `${ocultosSinHorario.length} doctores sin horario aquí no se listan`}${usuarioGlobal ? ": están en «Todas las sedes»." : ": su meta la fija quien administra su sede."}` : ""}</>
        : <>El servidor no indica en qué sede atiende cada doctor: {sinSede.length === 1 ? "este doctor se muestra" : `estos ${sinSede.length} doctores se muestran`} en la sede elegida. Indícalo en Configuración › Doctores.</>}</span></div>}
      {puedeEditar && medsBloqueados.length > 0 && <div className="fm-aviso-edad" role="note"><Info size={15} strokeWidth={2} /><span>El servidor no deja guardar metas de médicos sin sede asignada, y no indica la sede de {medsBloqueados.length === 1 ? "este doctor" : `estos ${medsBloqueados.length} doctores`}: {medsBloqueados.length === 1 ? "su meta y su comisión se ven" : "sus metas y comisiones se ven"} en solo lectura. Las fija el administrador general.</span></div>}
      {!puedeComGlobal && grupos.length > 0 && !todasBloqueadas && <div className="fm-aviso-edad" role="note" data-nota-comision><Info size={15} strokeWidth={2} /><span>{puedeEditar ? "Puedes fijar la meta de cada odontólogo en esta sede. " : ""}{NOTA_COMISION}</span></div>}
      {puedeComGlobal && grupos.length > 0 && <div className="fm-aviso-edad is-info" role="note"><Info size={15} strokeWidth={2} /><span>La comisión es igual en todas las sedes del odontólogo: si la cambias en una fila, cambia en todas las suyas.</span></div>}
      {conectado && !error && meds.length === 0 && <Card><Vacio icon={<Target size={22} strokeWidth={1.75} />} titulo="Sin odontólogos" sub="Regístralos en Configuración, Doctores." /></Card>}
      {sinDocsAqui && <Card><Vacio icon={<Target size={22} strokeWidth={1.75} />} titulo={vistaUnica ? `Ningún doctor tiene horario en ${nomSede(vistaUnica)}` : "Ningún doctor tiene horario en estas sedes"} sub="La meta se fija para los doctores que atienden en la sede. Carga su horario en Configuración › Horarios por doctor." /></Card>}

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
                const bloq = bloqueada(m);
                const tituloBloq = bloq ? "Solo lectura: el servidor no deja guardar la meta de un médico sin sede asignada. La fija el administrador general." : undefined;
                return (
                  <div key={key} role="row" className={`dc-mtz__fila${cambio ? " is-cambio" : ""}`}>
                    <span role="cell" className="dc-mtz__doc">
                      <span className="dc-mtz__av" style={{ background: `linear-gradient(135deg, ${tint(col, 0.22)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(m.nombre.replace(/^Dra?\.\s*/, ""))}</span>
                      <span className="dc-mtz__dn"><b>{m.nombre}{cambio && <em className="dc-mtz__tag">Editado</em>}</b><small>{nomEsp(m)}{m.sinSede && !esGlobal ? <> · <i>sede no indicada por el servidor{bloq ? ": solo lectura" : ""}</i></> : null}{otras.length ? <> · <i>también en {otras.map((s) => nomSede(s).replace(/^Sede\s+/i, "")).join(", ")}</i></> : null}</small></span>
                    </span>
                    {/* data-rot: en celular no hay encabezados y cada cifra lleva su rótulo (reportes.css). */}
                    <span role="cell" data-rot="Meta mensual" title={tituloBloq}><Monto value={draft[key]?.meta} disabled={!puedeEditar || bloq} label={`Meta mensual de ${m.nombre} en ${nomSede(g.sede)}`} onChange={(v) => set(key, "meta", v)} /></span>
                    <span role="cell" data-rot="Comisión"><Porcentaje value={draft[key]?.com} disabled={!puedeComGlobal || bloq} title={tituloBloq || (!puedeComGlobal ? `Solo lectura. ${NOTA_COMISION}` : undefined)} label={`comisión de ${m.nombre}`} onChange={(v) => set(key, "com", v)} /></span>
                    {/* Sin meta o sin %, «—»: lo que falta se pide en el propio campo. */}
                    <span role="cell" data-rot="Gana al cumplir" className="dc-mtz__gana">{met && pc != null ? <><b>{soles((met * pc) / 100)}</b><small>{pc}% de {soles(met)}</small></> : <small>—</small>}</span>
                    <span role="cell" data-rot="Parte de la meta" className="dc-mtz__parte"><i><u style={{ width: `${parte}%`, background: col }} /></i><b>{parte ? `${parte}%` : "—"}</b></span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="dc-mtz__nota"><Info size={13} strokeWidth={2} /><span>La comisión es el % del odontólogo sobre su producción en cada sede: el valor de los procedimientos terminados, al precio de esa sede. Quién va al ritmo y cuánto lleva ganado está en <b>Reportes › Producción y comisiones</b>.</span></p>

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
