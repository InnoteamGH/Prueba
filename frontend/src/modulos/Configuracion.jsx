/* Módulo Configuracion. Extraído de App.jsx para servirse en un chunk aparte (code splitting). */
import React, { useState, useEffect } from "react";
import { AlertCircle, Info, ArrowRight, Briefcase, Building2, Check, CheckCircle2, ClipboardList, Clock, Megaphone, Navigation, Pencil, Plus, Repeat, Search, Settings, Sparkles, Stethoscope, Trash2, MapPin, Phone, Percent, Target, Tag } from "lucide-react";
import api, { auth } from "../api/client";
import {Btn, Card, DIAS_SEM, DISPLAY_FONT, DS, ESPECIALIDADES, MEDICOS, Modal, NAVY, RED, SEDES, Select, fmt, hoy, puede, tint, colorDe, iniciales} from "../comun";

const BANCOS_PE = [
  { id: "bcp", nombre: "BCP — Banco de Crédito", cuenta: [14] },
  { id: "bbva", nombre: "BBVA Perú", cuenta: [18] },
  { id: "interbank", nombre: "Interbank", cuenta: [13, 20] },
  { id: "scotiabank", nombre: "Scotiabank Perú", cuenta: [10, 12] },
  { id: "nacion", nombre: "Banco de la Nación", cuenta: [11, 17] },
  { id: "banbif", nombre: "BanBif", cuenta: [12] },
  { id: "pichincha", nombre: "Banco Pichincha", cuenta: [] },
  { id: "mibanco", nombre: "Mibanco", cuenta: [] },
  { id: "gnb", nombre: "Banco GNB Perú", cuenta: [] },
  { id: "falabella", nombre: "Banco Falabella", cuenta: [] },
  { id: "ripley", nombre: "Banco Ripley", cuenta: [] },
  { id: "santander", nombre: "Banco Santander Perú", cuenta: [] },
  { id: "comercio", nombre: "Banco de Comercio", cuenta: [] },
  { id: "citibank", nombre: "Citibank Perú", cuenta: [] },
  { id: "icbc", nombre: "ICBC Perú", cuenta: [] },
  { id: "alfin", nombre: "Alfin Banco", cuenta: [] },
  { id: "compartamos", nombre: "Compartamos Financiera", cuenta: [] },
  { id: "caja_arequipa", nombre: "Caja Arequipa", cuenta: [] },
  { id: "caja_huancayo", nombre: "Caja Huancayo", cuenta: [] },
  { id: "caja_piura", nombre: "Caja Piura", cuenta: [] },
  { id: "caja_cusco", nombre: "Caja Cusco", cuenta: [] },
  { id: "caja_trujillo", nombre: "Caja Trujillo", cuenta: [] },
  { id: "otro", nombre: "Otro", cuenta: [] },
];

/* ---- Asistente de onboarding: configura la clínica en 4 pasos guiados ---- */
function OnboardingWizard({ onClose, onDone = () => {}, notify = () => {} }) {
  const [paso, setPaso] = useState(0);
  const [sedes, setSedes] = useState([]);
  const [esps, setEsps] = useState([]);
  const [meds, setMeds] = useState([]);
  const [disp, setDisp] = useState([]);
  const [medHor, setMedHor] = useState("");
  const [busy, setBusy] = useState(false);
  const inp = { width: "100%", padding: "10px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", color: NAVY, boxSizing: "border-box", background: "var(--dc-white)" };
  const cargar = () => {
    api.sedes.listar().then((r) => setSedes(r || [])).catch(() => {});
    api.catalogo.especialidades().then((r) => setEsps(r || [])).catch(() => {});
    api.catalogo.medicos().then((r) => setMeds(r || [])).catch(() => {});
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line
  useEffect(() => { if (medHor) api.disponibilidad.listar(medHor).then((r) => setDisp(r || [])).catch(() => setDisp([])); else setDisp([]); }, [medHor]);

  // Formularios de cada paso
  const [fSede, setFSede] = useState({ nombre: "", direccion: "", telefono: "" });
  const [fEsp, setFEsp] = useState({ nombre: "", precioBase: "" });
  const [fMed, setFMed] = useState({ nombre: "", especialidadId: "" });
  const [fHor, setFHor] = useState({ diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", sedeId: "" });

  const addSede = () => {
    if (!fSede.nombre.trim()) { notify("Ponle un nombre a la sede."); return; }
    setBusy(true);
    api.sedes.crear({ nombre: fSede.nombre, direccion: fSede.direccion || null, telefono: fSede.telefono || null, activa: true })
      .then(() => { setFSede({ nombre: "", direccion: "", telefono: "" }); cargar(); onDone(); notify("Sede agregada."); })
      .catch(() => notify("No se pudo guardar la sede.")).finally(() => setBusy(false));
  };
  const addEsp = () => {
    if (!fEsp.nombre.trim()) { notify("Ponle un nombre al servicio."); return; }
    const precio = Number(fEsp.precioBase);
    if (!Number.isFinite(precio) || precio <= 0) { notify("El precio debe ser mayor a S/ 0."); return; }
    setBusy(true);
    api.catalogo.crearEspecialidad({ nombre: fEsp.nombre, precioBase: precio })
      .then(() => { setFEsp({ nombre: "", precioBase: "" }); cargar(); onDone(); notify("Servicio agregado."); })
      .catch(() => notify("No se pudo guardar el servicio.")).finally(() => setBusy(false));
  };
  const addMed = () => {
    if (!fMed.nombre.trim()) { notify("Ponle un nombre al doctor."); return; }
    setBusy(true);
    api.catalogo.crearMedico({ nombre: fMed.nombre, especialidadId: fMed.especialidadId || null, activo: true })
      .then(() => { setFMed({ nombre: "", especialidadId: "" }); cargar(); onDone(); notify("Doctor agregado."); })
      .catch(() => notify("No se pudo guardar el doctor.")).finally(() => setBusy(false));
  };
  const addHor = () => {
    if (!medHor) { notify("Elige un doctor."); return; }
    setBusy(true);
    api.disponibilidad.crear({ medicoId: medHor, sedeId: fHor.sedeId || null, diaSemana: Number(fHor.diaSemana), horaInicio: fHor.horaInicio, horaFin: fHor.horaFin, activo: true })
      .then(() => { api.disponibilidad.listar(medHor).then((r) => setDisp(r || [])); onDone(); notify("Horario agregado."); })
      .catch(() => notify("No se pudo agregar (revisa las horas).")).finally(() => setBusy(false));
  };

  const PASOS = ["Sedes", "Servicios", "Doctores", "Horarios"];
  const Lbl = ({ children }) => <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 5 }}>{children}</label>;
  const okPaso = [sedes.length > 0, esps.length > 0, meds.length > 0, disp.length > 0 || meds.length > 0];

  return (
    <Modal icon={<Sparkles size={22} strokeWidth={1.75} />} titulo="Configura tu clínica en 4 pasos" sub="Sedes → Servicios → Doctores → Horarios" maxW={720} onClose={onClose}
      footer={<>
        {paso > 0 && <Btn small kind="ghost" onClick={() => setPaso(paso - 1)}>Atrás</Btn>}
        {paso < 3
          ? <Btn small onClick={() => setPaso(paso + 1)}>Siguiente <ArrowRight size={14} strokeWidth={1.75} /></Btn>
          : <Btn small onClick={() => { notify("¡Configuración base lista!"); onClose(); }}><CheckCircle2 size={15} strokeWidth={1.75} /> Finalizar</Btn>}
      </>}>
      {/* Progreso de pasos */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {PASOS.map((p, i) => (
          <div key={p} onClick={() => setPaso(i)} style={{ cursor: "pointer", flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: "var(--dc-r-md)", border: `1.5px solid ${i === paso ? NAVY : "var(--dc-line)"}`, background: i === paso ? "var(--dc-bg)" : "var(--dc-white)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "var(--dc-r-full)", background: okPaso[i] ? "var(--dc-ok)" : (i === paso ? NAVY : "var(--dc-ink-200)"), color: "var(--dc-white)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{okPaso[i] ? "✓" : i + 1}</div>
            <span style={{ fontSize: 13, fontWeight: 500, color: i === paso ? NAVY : "var(--dc-ink-400)" }}>{p}</span>
          </div>
        ))}
      </div>

      {paso === 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Registra las sedes donde atiende la clínica.</div>
          <div><Lbl>Nombre de la sede *</Lbl><input className="dc-premium-inp" style={inp} value={fSede.nombre} onChange={(e) => setFSede({ ...fSede, nombre: e.target.value })} placeholder="Ej. Sede San Isidro" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Lbl>Dirección</Lbl><input className="dc-premium-inp" style={inp} value={fSede.direccion} onChange={(e) => setFSede({ ...fSede, direccion: e.target.value })} placeholder="Av. Conquistadores 145" /></div>
            <div><Lbl>Teléfono</Lbl><input className="dc-premium-inp" style={inp} value={fSede.telefono} onChange={(e) => setFSede({ ...fSede, telefono: e.target.value })} placeholder="01 234 5678" /></div>
          </div>
          <div><Btn small onClick={addSede} disabled={busy}><Plus size={15} strokeWidth={1.75} /> Agregar sede</Btn></div>
          <WizList items={sedes.map((s) => ({ id: s.id, main: s.nombre, sub: s.direccion }))} icon={<Building2 size={15} strokeWidth={1.75} color={DS.c.primary} />} vacio="Aún no hay sedes." />
        </div>
      )}
      {paso === 1 && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Los servicios con su precio; el agente los usa para responder y agendar.</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div><Lbl>Servicio / especialidad *</Lbl><input className="dc-premium-inp" style={inp} value={fEsp.nombre} onChange={(e) => setFEsp({ ...fEsp, nombre: e.target.value })} placeholder="Ej. Limpieza dental" /></div>
            <div><Lbl>Precio (S/)</Lbl><input className="dc-premium-inp" style={inp} type="number" value={fEsp.precioBase} onChange={(e) => setFEsp({ ...fEsp, precioBase: e.target.value })} placeholder="80" /></div>
          </div>
          <div><Btn small onClick={addEsp} disabled={busy}><Plus size={15} strokeWidth={1.75} /> Agregar servicio</Btn></div>
          <WizList items={esps.map((s) => ({ id: s.id, main: s.nombre, sub: `S/ ${Number(s.precioBase) || 0}` }))} icon={<ClipboardList size={15} strokeWidth={1.75} color={DS.c.primary} />} vacio="Aún no hay servicios." />
        </div>
      )}
      {paso === 2 && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Registra los doctores y su especialidad.</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr", gap: 12 }}>
            <div><Lbl>Nombre del doctor *</Lbl><input className="dc-premium-inp" style={inp} value={fMed.nombre} onChange={(e) => setFMed({ ...fMed, nombre: e.target.value })} placeholder="Ej. Dra. Vanessa Pezzutti" /></div>
            <div><Lbl>Especialidad</Lbl><Select value={fMed.especialidadId} onChange={(v) => setFMed({ ...fMed, especialidadId: v })} placeholder="— Selecciona —" options={esps.map((e) => ({ value: e.id, label: e.nombre }))} /></div>
          </div>
          {esps.length === 0 && <div style={{ fontSize: 12, color: "var(--dc-warn-600)" }}>Sugerencia: agrega primero un servicio en el paso anterior.</div>}
          <div><Btn small onClick={addMed} disabled={busy}><Plus size={15} strokeWidth={1.75} /> Agregar doctor</Btn></div>
          <WizList items={meds.map((m) => ({ id: m.id, main: m.nombre, sub: (esps.find((e) => e.id === m.especialidadId) || {}).nombre }))} icon={<Stethoscope size={15} strokeWidth={1.75} color={DS.c.primary} />} vacio="Aún no hay doctores." />
        </div>
      )}
      {paso === 3 && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Define el horario de cada doctor para que el agente ofrezca cupos reales.</div>
          <div><Lbl>Doctor</Lbl><Select value={medHor} onChange={setMedHor} placeholder="— Selecciona un doctor —" options={meds.map((m) => ({ value: m.id, label: m.nombre }))} /></div>
          {medHor && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <div><Lbl>Día</Lbl><Select value={fHor.diaSemana} onChange={(v) => setFHor({ ...fHor, diaSemana: v })} options={DIAS_SEM.map((d) => ({ value: d.v, label: d.l }))} /></div>
                <div><Lbl>Desde</Lbl><input className="dc-premium-inp" style={inp} type="time" value={fHor.horaInicio} onChange={(e) => setFHor({ ...fHor, horaInicio: e.target.value })} /></div>
                <div><Lbl>Hasta</Lbl><input className="dc-premium-inp" style={inp} type="time" value={fHor.horaFin} onChange={(e) => setFHor({ ...fHor, horaFin: e.target.value })} /></div>
                <div><Lbl>Sede</Lbl><Select value={fHor.sedeId} onChange={(v) => setFHor({ ...fHor, sedeId: v })} placeholder="Todas" options={[{ value: "", label: "Todas" }, ...sedes.map((s) => ({ value: s.id, label: s.nombre }))]} /></div>
              </div>
              <div><Btn small onClick={addHor} disabled={busy}><Plus size={15} strokeWidth={1.75} /> Agregar horario</Btn></div>
              <WizList items={disp.map((d) => ({ id: d.id, main: (DIAS_SEM.find((x) => x.v === d.diaSemana) || {}).l + " " + (d.horaInicio || "").slice(0, 5) + "–" + (d.horaFin || "").slice(0, 5), sub: (sedes.find((s) => s.id === d.sedeId) || {}).nombre }))} icon={<Clock size={15} strokeWidth={1.75} color={DS.c.primary} />} vacio="Este doctor aún no tiene horarios." />
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
function WizList({ items, icon, vacio }) {
  if (!items || items.length === 0) return <div style={{ fontSize: 13, color: "var(--dc-ink-400)", padding: "8px 2px" }}>{vacio}</div>;
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", background: "var(--dc-white)" }}>
          <span style={{ flexShrink: 0 }}>{icon}</span>
          <span style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{it.main}</span>
          {it.sub && <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>– {it.sub}</span>}
        </div>
      ))}
    </div>
  );
}

function Configuracion({ notify = () => {}, rol = "", can }) {
  const conectado = !!auth.token;
  const fiscalReadOnly = rol === "admin_sede" || (can ? !can("config", "editar") : false);
  const [tab, setTab] = useState("servicios");
  const [sedes, setSedes] = useState([]);
  const [esps, setEsps] = useState([]);
  const [meds, setMeds] = useState([]);
  const [edit, setEdit] = useState(null);   // { tipo, item }
  const [medHor, setMedHor] = useState("");  // médico seleccionado en Horarios
  const [disp, setDisp] = useState([]);
  const [promos, setPromos] = useState([]);
  const [goLive, setGoLive] = useState(null);
  const [wizard, setWizard] = useState(false);
  const [clinica, setClinica] = useState(() => {
    let local = {};
    try { local = JSON.parse(localStorage.getItem("dc_data_v1_clinica_horario") || "null") || {}; } catch { /* nada guardado */ }
    return { nombre: "", razonSocial: "", ruc: "", direccion: "", telefono: "", email: "", web: "", cuentas: [], billeteras: [],
             horario: local.horario || {}, feriados: local.feriados || [], tipoCambio: 3.75 };
  });
  const inp = { width: "100%", padding: "10px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", color: NAVY, boxSizing: "border-box", background: "var(--dc-white)" };
  const cargarGoLive = () => {
    // NEW-48: solo si el rol puede ver config (go-live ahora exige config:ver).
    if (conectado && (!can || can("config", "ver"))) api.goLive().then(setGoLive).catch(() => setGoLive(null));
  };
  // El horario y los feriados se guardan también en el navegador con la clave que lee
  // el resto de la app (dashboard y disponibilidad), para que la demostración sea
  // configurable de verdad y no todas las clínicas se vean igual.
  const leerHorarioLocal = () => { try { return JSON.parse(localStorage.getItem("dc_data_v1_clinica_horario") || "null") || {}; } catch { return {}; } };
  const guardarHorarioLocal = (c) => { try { localStorage.setItem("dc_data_v1_clinica_horario", JSON.stringify({ horario: c.horario || {}, feriados: c.feriados || [] })); } catch { /* almacenamiento lleno o bloqueado */ } };
  const cargarClinica = () => { if (conectado) api.clinica.get().then((r) => setClinica({ nombre: r?.nombre || "", razonSocial: r?.razonSocial || "", ruc: r?.ruc || "", direccion: r?.direccion || "", telefono: r?.telefono || "", email: r?.email || "", web: r?.web || "", cuentas: Array.isArray(r?.cuentas) ? r.cuentas : [], billeteras: Array.isArray(r?.billeteras) ? r.billeteras : [], horario: (r?.horario && typeof r.horario === "object") ? r.horario : {}, feriados: Array.isArray(r?.feriados) ? r.feriados : [], tipoCambio: Number(r?.tipoCambio) > 0 ? Number(r.tipoCambio) : 3.75 })).catch(() => {}); };
  const guardarClinica = () => {
    guardarHorarioLocal(clinica);          // el dashboard y la disponibilidad leen de aquí
    if (!conectado) { notify("Horario guardado en este navegador. Con sesión se guarda en la clínica."); return Promise.resolve(); }
    return api.clinica.actualizar(clinica).then(() => { notify("Datos de la clínica guardados."); cargarGoLive(); }).catch(() => notify("No se pudieron guardar."));
  };
  const [rucBusy, setRucBusy] = useState(false);
  const consultarRucClinica = () => {
    const r = (clinica.ruc || "").replace(/\D/g, "");
    if (r.length !== 11) { notify("El RUC debe tener 11 dígitos."); return; }
    if (!conectado) { notify("Conéctate para consultar el RUC en SUNAT."); return; }
    setRucBusy(true);
    api.rucLookup(r).then((d) => {
      if (d?.razonSocial) { setClinica((c) => ({ ...c, razonSocial: d.razonSocial, direccion: d.direccion || c.direccion })); notify("Datos traídos de SUNAT."); }
      else notify(d?.error || "No se encontró el RUC.");
    }).catch(() => notify("No se pudo consultar el RUC.")).finally(() => setRucBusy(false));
  };
  // Horario de atención (por día de semana) + feriados
  const DIAS_ATN = [["1", "Lunes"], ["2", "Martes"], ["3", "Miércoles"], ["4", "Jueves"], ["5", "Viernes"], ["6", "Sábado"], ["0", "Domingo"]];
  // Qué horario se está editando: "" es el general de la clínica; un id de sede, el de
  // esa sede. El horario de sede se guarda anidado en horario.sedes[id] y solo declara
  // los días que cambian: el resto los hereda del general.
  const [sedeHorario, setSedeHorario] = useState("");
  const sedesHorario = sedes.length ? sedes : SEDES;
  const horarioSede = (k) => ((clinica.horario || {}).sedes || {})[String(k)] || null;
  const DIA_DEF = (k) => ({ abre: "09:00", cierra: "19:00", cerrado: k === "0" });
  const diaCfg = (k) => {
    const general = (clinica.horario && clinica.horario[k]) || null;
    if (!sedeHorario) return general || DIA_DEF(k);
    const propio = (horarioSede(sedeHorario) || {})[k];
    return propio || general || DIA_DEF(k);
  };
  // ¿Este día lo declara la sede, o lo está heredando del horario general?
  const diaHeredado = (k) => !!sedeHorario && !((horarioSede(sedeHorario) || {})[k]);
  const setDia = (k, patch) => setClinica((c) => {
    const h = { ...(c.horario || {}) };
    if (!sedeHorario) { h[k] = { ...diaCfg(k), ...patch }; return { ...c, horario: h }; }
    const todas = { ...(h.sedes || {}) };
    todas[String(sedeHorario)] = { ...(todas[String(sedeHorario)] || {}), [k]: { ...diaCfg(k), ...patch } };
    h.sedes = todas;
    return { ...c, horario: h };
  });
  // Volver a seguir el horario general: se borra el propio de esa sede.
  const quitarHorarioSede = () => setClinica((c) => {
    const h = { ...(c.horario || {}) };
    const todas = { ...(h.sedes || {}) };
    delete todas[String(sedeHorario)];
    h.sedes = todas;
    return { ...c, horario: h };
  });
  const addFeriado = () => setClinica((c) => ({ ...c, feriados: [...(c.feriados || []), { fecha: "", cerrado: true, abre: "09:00", cierra: "13:00", nota: "" }] }));
  const setFeriado = (i, k, v) => setClinica((c) => ({ ...c, feriados: c.feriados.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const delFeriado = (i) => setClinica((c) => ({ ...c, feriados: c.feriados.filter((_, j) => j !== i) }));
  const addCuenta = () => setClinica((c) => ({ ...c, cuentas: [...(c.cuentas || []), { banco: "", moneda: "PEN", numero: "", cci: "", titular: "" }] }));
  const setCuenta = (i, k, v) => setClinica((c) => ({ ...c, cuentas: c.cuentas.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const delCuenta = (i) => setClinica((c) => ({ ...c, cuentas: c.cuentas.filter((_, j) => j !== i) }));
  const addBilletera = (tipo) => setClinica((c) => ({ ...c, billeteras: [...(c.billeteras || []), { tipo, numero: "", titular: "" }] }));
  const setBilletera = (i, k, v) => setClinica((c) => ({ ...c, billeteras: c.billeteras.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const delBilletera = (i) => setClinica((c) => ({ ...c, billeteras: c.billeteras.filter((_, j) => j !== i) }));
  const cargar = () => {
    if (!conectado) {
      setSedes(SEDES.map((s) => ({ id: s.id, nombre: s.nombre, direccion: s.dir, telefono: "" })));
      setEsps(ESPECIALIDADES.map((e) => ({ id: e.id, nombre: e.nombre, precioBase: e.precio })));
      setMeds(MEDICOS.map((m) => ({ id: m.id, nombre: m.nombre, especialidadId: m.esp, cop: null, activo: true, porcentajeComision: 30, metaMensual: m.meta })));
      setGoLive({
        listoParaOperar: true, total: 4, completados: 4, obligatoriosPendientes: 0,
        items: [
          { clave: "sedes", titulo: "Sedes", ok: true, obligatorio: true, detalle: `${SEDES.length} sede(s) de demostración` },
          { clave: "servicios", titulo: "Servicios", ok: true, obligatorio: true, detalle: `${ESPECIALIDADES.length} servicio(s) de demostración` },
          { clave: "doctores", titulo: "Doctores", ok: true, obligatorio: true, detalle: `${MEDICOS.length} odontólogo(s) de demostración` },
          { clave: "horario", titulo: "Horarios", ok: true, obligatorio: false, detalle: "Horario de demostración" },
        ],
      });
      return;
    }
    api.sedes.listar().then((r) => setSedes(r || [])).catch(() => {});
    api.catalogo.especialidades().then((r) => setEsps(r || [])).catch(() => {});
    api.catalogo.medicos().then((r) => setMeds(r || [])).catch(() => {});
    api.promociones.listar().then((r) => setPromos(r || [])).catch(() => {});
    cargarGoLive();
    cargarClinica();
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line
  const cargarDisp = (mid) => { if (conectado && mid) api.disponibilidad.listar(mid).then((r) => setDisp(r || [])).catch(() => setDisp([])); else setDisp([]); };
  useEffect(() => { cargarDisp(medHor); }, [medHor]); // eslint-disable-line
  const espNombre = (id) => (esps.find((e) => e.id === id) || {}).nombre || "—";

  const guardar = () => {
    if (!edit) return; const it = edit.item;
    const done = (msg) => { notify(msg); setEdit(null); cargar(); };
    const err = () => notify("No se pudo guardar.");
    // Solo la promoción comprobaba su título: sede, servicio y doctor se guardaban con el
    // nombre vacío y quedaba una fila en blanco en el catálogo de la clínica.
    if (["sede", "servicio", "doctor"].includes(edit.tipo) && !String(it.nombre || "").trim()) {
      notify(edit.tipo === "sede" ? "Ponle un nombre a la sede." : edit.tipo === "servicio" ? "Ponle un nombre al servicio." : "Escribe el nombre del doctor.");
      return;
    }
    if (edit.tipo === "sede") {
      const payload = { nombre: it.nombre, direccion: it.direccion, telefono: it.telefono, activa: it.activa !== false };
      (it.id ? api.sedes.actualizar(it.id, payload) : api.sedes.crear(payload)).then(() => done("Sede guardada.")).catch(err);
    } else if (edit.tipo === "servicio") {
      const precio = Number(it.precioBase);
      if (!Number.isFinite(precio) || precio <= 0) { notify("El precio debe ser mayor a S/ 0."); return; }
      const payload = { nombre: it.nombre, precioBase: precio };
      (it.id ? api.catalogo.actualizarEspecialidad(it.id, payload) : api.catalogo.crearEspecialidad(payload)).then(() => done("Servicio guardado.")).catch(err);
    } else if (edit.tipo === "doctor") {
      const payload = { nombre: it.nombre, especialidadId: it.especialidadId || null, cop: it.cop || null, activo: it.activo !== false };
      const after = () => {
        const meta = Number(it.metaMensual);
        if (it.id && Number.isFinite(meta)) {
          return api.catalogo.fijarMeta(it.id, meta > 0 ? meta : null).then(() => done("Doctor y meta guardados.")).catch(() => done("Doctor guardado (meta no se pudo fijar)."));
        }
        return done("Doctor guardado.");
      };
      (it.id ? api.catalogo.actualizarMedico(it.id, payload) : api.catalogo.crearMedico(payload))
        .then((created) => {
          if (!it.id && created?.id && Number(it.metaMensual) > 0) {
            return api.catalogo.fijarMeta(created.id, Number(it.metaMensual)).then(() => done("Doctor y meta guardados."));
          }
          return after();
        })
        .catch(err);
    } else if (edit.tipo === "promo") {
      if (!it.titulo || !it.titulo.trim()) { notify("Ponle un título a la promoción."); return; }
      const payload = { titulo: it.titulo, descripcion: it.descripcion || null, descuento: it.descuento || null, especialidadId: it.especialidadId || null, desde: it.desde || null, hasta: it.hasta || null, activa: it.activa !== false };
      (it.id ? api.promociones.actualizar(it.id, payload) : api.promociones.crear(payload)).then(() => done("Promoción guardada.")).catch(err);
    }
  };
  const delPromo = (id) => api.promociones.borrar(id).then(() => { notify("Promoción eliminada."); cargar(); }).catch(() => notify("No se pudo eliminar."));
  const addHorario = (h) => {
    if (!medHor) { notify("Elige un doctor primero."); return; }
    api.disponibilidad.crear({ medicoId: medHor, sedeId: h.sedeId || null, diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin, activo: true })
      .then(() => { notify("Horario agregado."); cargarDisp(medHor); }).catch(() => notify("No se pudo agregar (revisa las horas)."));
  };
  const delHorario = (id) => api.disponibilidad.borrar(id).then(() => { notify("Horario eliminado."); cargarDisp(medHor); }).catch(() => {});

  const TABS = [["puesta", "Puesta en marcha", Navigation, "Pasos para operar", "#0E9199"], ["empresa", "Datos de la clínica", Briefcase, "RUC, logo y facturación", "#28527A"], ["atencion", "Horario de atención", Clock, "Días y horas de la clínica", "#2F6FDE"], ["servicios", "Servicios y precios", ClipboardList, "Catálogo y tarifas", "#16A36A"], ["doctores", "Doctores", Stethoscope, "Equipo clínico", "#6D4FD1"], ["sedes", "Sedes", Building2, "Locales de atención", "#D97706"], ["horarios", "Horarios por doctor", Clock, "Disponibilidad de agenda", "#0E9EB0"], ["promos", "Promociones", Megaphone, "Ofertas del agente IA", "#E0694F"]];
  const cab = (titulo, sub, accion) => (
    <div className="dc-cfg__cab"><div><h3>{titulo}</h3><span>{sub}</span></div>{accion}</div>
  );
  const card = { background: "var(--dc-white)", borderRadius: "var(--dc-r-lg)", border: "1px solid var(--dc-line)", boxShadow: "0 1px 2px rgba(16,24,40,.04)" };
  const th = { textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: .4, borderBottom: "1px solid var(--dc-line)" };
  const td = { padding: "12px 16px", fontSize: 14, color: NAVY, borderTop: "1px solid var(--dc-bg)" };
  const rowBtns = (tipo, item) => (
    <button onClick={() => setEdit({ tipo, item: { ...item } })} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid var(--dc-line)", background: "var(--dc-white)", borderRadius: "var(--dc-r-sm)", padding: "6px 11px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: DS.c.primary }}><Pencil size={13} strokeWidth={1.75} /> Editar</button>
  );
  return (
    <div className="dc-cfg">
      <nav className="dc-cfg__nav" aria-label="Secciones de configuración">
        <div className="dc-cfg__navtit"><Settings size={15} strokeWidth={2} /> Configuración</div>
        {TABS.map(([k, lbl, Ic, sub, col]) => { const on = tab === k; return (
          <button key={k} type="button" aria-current={on ? "page" : undefined} className={on ? "is-on" : ""} style={{ "--c": col }} onClick={() => setTab(k)}>
            <span className="dc-cfg__ico"><Ic size={16} strokeWidth={2} /></span>
            <div><b>{lbl}</b><small>{sub}</small></div>
          </button>
        ); })}
      </nav>
      <div className="dc-cfg__main">
      {!conectado && <div className="fm-aviso-edad is-info"><Info size={15} strokeWidth={2} /><span>Datos de ejemplo. Inicia sesión con una cuenta de la clínica para editar la configuración.</span></div>}

      {tab === "puesta" && (
        <div style={{ display: "grid", gap: 16 }}>
          {(() => {
            const listo = goLive?.listoParaOperar;
            const total = goLive?.total || 0; const hechos = goLive?.completados || 0;
            const pct = total ? Math.round(hechos * 100 / total) : 0;
            return (
              <div style={{ ...card, overflow: "hidden", background: listo ? "linear-gradient(90deg,var(--dc-ok-soft),var(--dc-white))" : "linear-gradient(90deg,var(--dc-bg),var(--dc-white))", border: `1px solid ${listo ? "var(--dc-green-soft)" : "var(--dc-sky)"}` }}>
                <div style={{ padding: "18px 20px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ background: listo ? "var(--dc-ok)" : NAVY, borderRadius: "var(--dc-r-md)", width: 48, height: 48, display: "grid", placeItems: "center", flexShrink: 0 }}>{listo ? <CheckCircle2 size={26} strokeWidth={1.75} color="var(--dc-white)" /> : <Navigation size={24} strokeWidth={1.75} color="var(--dc-white)" />}</div>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <h3 style={{ margin: 0, color: NAVY, fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>{listo ? "¡Todo listo para operar! 🎉" : "Puesta en marcha de la clínica"}</h3>
                    <div style={{ fontSize: 13, color: "var(--dc-ink-700)", marginTop: 3 }}>{listo ? "Checklist de la clínica (sedes, servicios, doctores, horarios). No es el contador de «Primeros pasos» de la barra." : `${goLive?.obligatoriosPendientes || 0} punto(s) obligatorio(s) pendiente(s) para que el asistente pueda agendar y atender.`}</div>
                    <div style={{ marginTop: 10, height: 8, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: listo ? "var(--dc-ok)" : NAVY, transition: "width .4s" }} /></div>
                    <div style={{ fontSize: 12, color: "var(--dc-ink-400)", marginTop: 5 }}>{total ? `${hechos} de ${total} del checklist de clínica (${pct}%)` : "Cargando checklist de la clínica…"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Btn small onClick={() => setWizard(true)}><Sparkles size={15} strokeWidth={1.75} /> Configurar en 4 pasos</Btn>
                    <Btn small kind="ghost" onClick={cargarGoLive}><Repeat size={14} strokeWidth={1.75} /> Actualizar</Btn>
                  </div>
                </div>
              </div>
            );
          })()}
          {!conectado && <Card style={{ padding: 16 }}><div style={{ color: "var(--dc-warn-600)", fontSize: 13 }}>Inicia sesión para ver el estado real.</div></Card>}
          <div style={{ display: "grid", gap: 10 }}>
            {(goLive?.items || []).map((it) => (
              <div key={it.clave} style={{ ...card, padding: "14px 16px", display: "flex", gap: 13, alignItems: "flex-start", borderLeft: `4px solid ${it.ok ? "var(--dc-ok)" : (it.obligatorio ? "var(--dc-danger)" : "var(--dc-warn)")}` }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}>{it.ok ? <CheckCircle2 size={22} strokeWidth={1.75} color="var(--dc-ok-700)" /> : (it.obligatorio ? <AlertCircle size={22} strokeWidth={1.75} color="var(--dc-danger)" /> : <Clock size={22} strokeWidth={1.75} color="var(--dc-warn-700)" />)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>{it.titulo}</span>
                    {it.obligatorio && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-red-deep)", background: "var(--dc-fee)", padding: "2px 8px", borderRadius: "var(--dc-r-full)" }}>OBLIGATORIO</span>}
                    {!it.obligatorio && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", background: "var(--dc-bg)", padding: "2px 8px", borderRadius: "var(--dc-r-full)" }}>OPCIONAL</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>{it.descripcion}</div>
                  <div style={{ fontSize: 13, color: it.ok ? "var(--dc-ok-700)" : "var(--dc-ink-400)", marginTop: 3, fontWeight: 500 }}>{it.detalle}</div>
                </div>
                {!it.ok && it.modulo && ["config", "whatsapp", "recall", "facturacion"].includes(it.modulo) && (
                  <div style={{ flexShrink: 0 }}>
                    {["sedes", "doctores", "especialidades", "horarios", "promos"].includes(it.clave)
                      ? <Btn small kind="ghost" onClick={() => setTab(it.clave === "especialidades" ? "servicios" : it.clave === "promos" ? "promos" : it.clave)}>Configurar</Btn>
                      : null}
                  </div>
                )}
              </div>
            ))}
            {conectado && !goLive && <Card style={{ padding: 20, textAlign: "center", color: "var(--dc-ink-400)" }}>Cargando estado…</Card>}
          </div>
        </div>
      )}
      {wizard && <OnboardingWizard sedes={sedes} esps={esps} meds={meds} onClose={() => { setWizard(false); cargar(); }} onDone={cargar} notify={notify} />}

      {tab === "empresa" && (() => {
        const lbl = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 5 };
        const set = (k, v) => setClinica((c) => ({ ...c, [k]: v }));
        return (
        <div style={{ display: "grid", gap: 16 }}>
          {!conectado && <div className="dc-banda dc-banda--info"><Info size={18} strokeWidth={1.75} /><p>Inicia sesión con una cuenta de la clínica para editar estos datos.</p></div>}
          {fiscalReadOnly && conectado && <Card style={{ padding: 14, background: "var(--dc-bg)", border: "1px solid var(--dc-sky)" }}><div style={{ fontSize: 13, color: "var(--dc-info-ink)" }}>RUC, razón social y datos fiscales son de solo lectura para tu rol. Contacta a administración para cambios.</div></Card>}
          {/* Ficha fiscal */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--dc-line)" }}>
              <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Datos de la empresa</h3>
              <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Se usan en boletas/facturas y para que el asistente sepa quién es la clínica.</div>
            </div>
            <div style={{ padding: 18, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={lbl}>Nombre comercial</label><input className="dc-premium-inp" style={inp} value={clinica.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Odonto Sonrisa" /></div>
                <div><label style={lbl}>Razón social</label><input className="dc-premium-inp" style={{ ...inp, ...(fiscalReadOnly ? { background: "var(--dc-bg)", color: "var(--dc-ink-400)" } : {}) }} readOnly={fiscalReadOnly} value={clinica.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} placeholder="Odonto Sonrisa S.A.C." /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
                <div><label style={lbl}>RUC</label><div style={{ display: "flex", gap: 8 }}><input className="dc-premium-inp" style={{ ...inp, flex: 1, minWidth: 0, ...(fiscalReadOnly ? { background: "var(--dc-bg)", color: "var(--dc-ink-400)" } : {}) }} readOnly={fiscalReadOnly} value={clinica.ruc} onChange={(e) => set("ruc", e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="20512345678" />{!fiscalReadOnly && <Btn small kind="ghost" onClick={consultarRucClinica} disabled={rucBusy}><Search size={14} strokeWidth={1.75} /> {rucBusy ? "…" : "Consultar"}</Btn>}</div></div>
                <div><label style={lbl}>Dirección fiscal</label><input className="dc-premium-inp" style={{ ...inp, ...(fiscalReadOnly ? { background: "var(--dc-bg)", color: "var(--dc-ink-400)" } : {}) }} readOnly={fiscalReadOnly} value={clinica.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Av. Javier Prado 1540, San Isidro" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div><label style={lbl}>Teléfono</label><input className="dc-premium-inp" style={inp} value={clinica.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="01 234 5678" /></div>
                <div><label style={lbl}>Correo</label><input className="dc-premium-inp" style={inp} value={clinica.email} onChange={(e) => set("email", e.target.value)} placeholder="contacto@clinica.pe" /></div>
                <div><label style={lbl}>Web</label><input className="dc-premium-inp" style={inp} value={clinica.web} onChange={(e) => set("web", e.target.value)} placeholder="www.clinica.pe" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, alignItems: "end" }}>
                <div><label style={lbl}>Tipo de cambio (PEN por 1 USD)</label><input className="dc-premium-inp" style={inp} type="number" step="0.01" min="0.01" value={clinica.tipoCambio ?? 3.75} onChange={(e) => set("tipoCambio", Number(e.target.value) || 3.75)} /></div>
                <div style={{ fontSize: 13, color: "var(--dc-ink-500)", paddingBottom: 10 }}>Compartido en Caja para cobros en dólares. Cada cajero lo ve al abrir el cobro.</div>
              </div>
            </div>
          </div>
          {/* Cuentas bancarias */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Cuentas bancarias</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Para cobros por transferencia. El asistente de WhatsApp puede compartirlas.</div></div>
              <Btn small kind="ghost" onClick={addCuenta}><Plus size={15} strokeWidth={1.75} /> Agregar cuenta</Btn>
            </div>
            <div style={{ padding: 18, display: "grid", gap: 12 }}>
              {(clinica.cuentas || []).length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Aún no hay cuentas registradas.</div>}
              {(clinica.cuentas || []).map((c, i) => {
                const banco = BANCOS_PE.find((b) => b.id === c.banco);
                const numLen = (c.numero || "").replace(/\D/g, "").length;
                const cciLen = (c.cci || "").replace(/\D/g, "").length;
                const numMal = banco && banco.cuenta.length > 0 && numLen > 0 && !banco.cuenta.includes(numLen);
                const cciMal = cciLen > 0 && cciLen !== 20;
                const hint = { fontSize: 12, marginTop: 3 };
                return (
                <div key={i} style={{ border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: 12, background: "var(--dc-white)", display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10 }}>
                    <div><label style={lbl}>Banco</label>
                      <Select value={c.banco || ""} onChange={(v) => setCuenta(i, "banco", v)} placeholder="— Selecciona el banco —"
                              options={BANCOS_PE.map((b) => ({ value: b.id, label: b.nombre }))} />
                    </div>
                    <div><label style={lbl}>Moneda</label><Select value={c.moneda || "PEN"} onChange={(v) => setCuenta(i, "moneda", v)} options={[{ value: "PEN", label: "Soles (S/)" }, { value: "USD", label: "Dólares ($)" }]} /></div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}><button type="button" className="dc-icon-btn" aria-label="Eliminar" onClick={() => delCuenta(i)} title="Eliminar" style={{ border: "1px solid var(--dc-danger-mid)", background: "var(--dc-danger-soft)", color: "var(--dc-danger)", borderRadius: "var(--dc-r-sm)", padding: "9px 11px", cursor: "pointer" }}><Trash2 size={15} strokeWidth={1.75} /></button></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 10 }}>
                    <div>
                      <label style={lbl}>N° de cuenta</label>
                      <input className="dc-premium-inp" style={{ ...inp, borderColor: numMal ? "var(--dc-warn)" : "var(--dc-line)" }} value={c.numero || ""} onChange={(e) => setCuenta(i, "numero", e.target.value)} placeholder={banco && banco.cuenta.length ? `${banco.cuenta.join(" o ")} dígitos` : "N° de cuenta"} />
                      {banco && banco.cuenta.length > 0 && <div style={{ ...hint, color: numMal ? "var(--dc-warn-600)" : "var(--dc-ink-400)" }}>{numMal ? `⚠ ${banco.nombre.split(" —")[0]} suele usar ${banco.cuenta.join(" o ")} dígitos (tienes ${numLen}).` : `${banco.cuenta.join(" o ")} dígitos`}</div>}
                    </div>
                    <div>
                      <label style={lbl}>CCI <span style={{ fontWeight: 500, color: "var(--dc-ink-400)" }}>(20 díg.)</span></label>
                      <input className="dc-premium-inp" style={{ ...inp, borderColor: cciMal ? "var(--dc-warn)" : "var(--dc-line)" }} value={c.cci || ""} onChange={(e) => setCuenta(i, "cci", e.target.value.replace(/\D/g, "").slice(0, 20))} placeholder="00219100123456701234" />
                      {cciMal && <div style={{ ...hint, color: "var(--dc-warn-600)" }}>⚠ El CCI tiene 20 dígitos (tienes {cciLen}).</div>}
                    </div>
                    <div><label style={lbl}>Titular</label><input className="dc-premium-inp" style={inp} value={c.titular || ""} onChange={(e) => setCuenta(i, "titular", e.target.value)} placeholder="Razón social o nombre del titular" /></div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Yape / Plin */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Yape / Plin</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Billeteras digitales para pagos rápidos. Número de celular (9 dígitos) y titular.</div></div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small kind="ghost" onClick={() => addBilletera("yape")}><Plus size={15} strokeWidth={1.75} /> Yape</Btn>
                <Btn small kind="ghost" onClick={() => addBilletera("plin")}><Plus size={15} strokeWidth={1.75} /> Plin</Btn>
              </div>
            </div>
            <div style={{ padding: 18, display: "grid", gap: 12 }}>
              {(clinica.billeteras || []).length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Aún no hay Yape ni Plin registrados.</div>}
              {(clinica.billeteras || []).map((b, i) => {
                const numLen = (b.numero || "").replace(/\D/g, "").length;
                const numMal = numLen > 0 && numLen !== 9;
                const es = (b.tipo || "yape").toLowerCase();
                const col = es === "yape" ? "var(--dc-ink-500)" : "var(--dc-primary-alt)";
                return (
                <div key={i} style={{ border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: 12, background: "var(--dc-white)", display: "grid", gridTemplateColumns: "auto 1fr 1.2fr auto", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ minWidth: 70 }}><label style={lbl}>Tipo</label>
                    <div style={{ padding: "8px 12px", borderRadius: "var(--dc-r-full)", background: tint(col, 0.094), color: col, fontWeight: 500, fontSize: 13, textAlign: "center" }}>{es === "yape" ? "Yape" : "Plin"}</div>
                  </div>
                  <div>
                    <label style={lbl}>Número (celular)</label>
                    <input className="dc-premium-inp" style={{ ...inp, borderColor: numMal ? "var(--dc-warn)" : "var(--dc-line)" }} value={b.numero || ""} onChange={(e) => setBilletera(i, "numero", e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="987654321" />
                    {numMal && <div style={{ fontSize: 12, marginTop: 3, color: "var(--dc-warn-600)" }}>⚠ Debe tener 9 dígitos.</div>}
                  </div>
                  <div><label style={lbl}>A nombre de</label><input className="dc-premium-inp" style={inp} value={b.titular || ""} onChange={(e) => setBilletera(i, "titular", e.target.value)} placeholder="Nombre del titular de la cuenta" /></div>
                  <button type="button" className="dc-icon-btn" aria-label="Eliminar" onClick={() => delBilletera(i)} title="Eliminar" style={{ border: "1px solid var(--dc-danger-mid)", background: "var(--dc-danger-soft)", color: "var(--dc-danger)", borderRadius: "var(--dc-r-sm)", padding: "9px 11px", cursor: "pointer" }}><Trash2 size={15} strokeWidth={1.75} /></button>
                </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>💡 Las <b>sedes y sus direcciones</b> se gestionan en la pestaña <b>Sedes</b>.</div>
            <Btn onClick={guardarClinica}><Check size={15} strokeWidth={1.75} /> Guardar datos</Btn>
          </div>
        </div>
        );
      })()}

      {tab === "atencion" && (() => {
        const lbl = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 5 };
        return (
        <div style={{ display: "grid", gap: 16 }}>
          {!conectado && <Card style={{ padding: 16 }}><div style={{ color: "var(--dc-warn-600)", fontSize: 13 }}>Sin sesión, el horario se guarda solo en este navegador — suficiente para probarlo: al guardar cambian la agenda, la capacidad del día y la disponibilidad de los doctores.</div></Card>}
          {/* Horario general por día */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--dc-line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Horario de atención</h3>
                  <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>
                    {sedeHorario
                      ? "Horario propio de esta sede. Los días que no cambies siguen el horario general."
                      : "Horario general de la clínica. Cada sede puede tener el suyo. El asistente no ofrecerá citas fuera de este horario."}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Select small width={210} ariaLabel="Sede del horario" value={sedeHorario} onChange={setSedeHorario}
                          options={[{ value: "", label: "Horario general" }, ...sedesHorario.map((x) => ({ value: String(x.id), label: x.nombre }))]} />
                  {sedeHorario && horarioSede(sedeHorario) &&
                    <Btn small kind="ghost" onClick={quitarHorarioSede}><Trash2 size={14} strokeWidth={1.75} /> Seguir el general</Btn>}
                </div>
              </div>
            </div>
            <div style={{ padding: 18, display: "grid", gap: 8 }}>
              {DIAS_ATN.map(([k, l]) => { const d = diaCfg(k); return (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "120px auto 1fr", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--dc-bg)" }}>
                  <span style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>{l}
                    {diaHeredado(k) && <span title="Sigue el horario general de la clínica" style={{ marginLeft: 7, fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", background: "var(--dc-bg)", borderRadius: "var(--dc-r-full)", padding: "2px 7px" }}>general</span>}
                  </span>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: d.cerrado ? "var(--dc-ink-400)" : "var(--dc-ok-700)", fontWeight: 500 }}>
                    <input type="checkbox" checked={!d.cerrado} onChange={(e) => setDia(k, { cerrado: !e.target.checked })} /> {d.cerrado ? "Cerrado" : "Abierto"}
                  </label>
                  {!d.cerrado ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input className="dc-premium-inp" type="time" value={d.abre || "09:00"} onChange={(e) => setDia(k, { abre: e.target.value })} style={{ ...inp, width: 130 }} />
                      <span style={{ color: "var(--dc-ink-400)" }}>a</span>
                      <input className="dc-premium-inp" type="time" value={d.cierra || "19:00"} onChange={(e) => setDia(k, { cierra: e.target.value })} style={{ ...inp, width: 130 }} />
                    </div>
                  ) : <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>No se atiende este día</span>}
                </div>
              ); })}
            </div>
          </div>
          {/* Feriados / excepciones */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Feriados y excepciones</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Marca los feriados como cerrados, o ábrelos con un horario especial si tu clínica atiende ese día.</div></div>
              <Btn small kind="ghost" onClick={addFeriado}><Plus size={15} strokeWidth={1.75} /> Agregar feriado</Btn>
            </div>
            <div style={{ padding: 18, display: "grid", gap: 12 }}>
              {(clinica.feriados || []).length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Sin feriados configurados. Los días normales siguen el horario de arriba.</div>}
              {(clinica.feriados || []).map((fr, i) => (
                <div key={i} style={{ border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: 12, background: "var(--dc-white)", display: "grid", gridTemplateColumns: "150px auto 1fr auto", gap: 10, alignItems: "center" }}>
                  <div><label style={lbl}>Fecha</label><input className="dc-premium-inp" type="date" value={fr.fecha || ""} onChange={(e) => setFeriado(i, "fecha", e.target.value)} style={inp} /></div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, fontWeight: 500, color: fr.cerrado ? "var(--dc-red-deep)" : "var(--dc-ok-700)", marginTop: 18 }}>
                    <input type="checkbox" checked={!!fr.cerrado} onChange={(e) => setFeriado(i, "cerrado", e.target.checked)} /> {fr.cerrado ? "Cerrado" : "Abierto"}
                  </label>
                  {fr.cerrado ? (
                    <div><label style={lbl}>Motivo</label><input className="dc-premium-inp" value={fr.nota || ""} onChange={(e) => setFeriado(i, "nota", e.target.value)} placeholder="Ej. Fiestas Patrias" style={inp} /></div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <div><label style={lbl}>Desde</label><input className="dc-premium-inp" type="time" value={fr.abre || "09:00"} onChange={(e) => setFeriado(i, "abre", e.target.value)} style={{ ...inp, width: 120 }} /></div>
                      <div><label style={lbl}>Hasta</label><input className="dc-premium-inp" type="time" value={fr.cierra || "13:00"} onChange={(e) => setFeriado(i, "cierra", e.target.value)} style={{ ...inp, width: 120 }} /></div>
                    </div>
                  )}
                  <button type="button" className="dc-icon-btn" aria-label="Eliminar" onClick={() => delFeriado(i)} title="Eliminar" style={{ border: "1px solid var(--dc-danger-mid)", background: "var(--dc-danger-soft)", color: "var(--dc-danger)", borderRadius: "var(--dc-r-sm)", padding: "9px 11px", cursor: "pointer", marginTop: 18 }}><Trash2 size={15} strokeWidth={1.75} /></button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={guardarClinica}><Check size={15} strokeWidth={1.75} /> Guardar horario</Btn>
          </div>
        </div>
        );
      })()}

      {tab === "servicios" && (
        <section className="dc-cfg__panel">
          {cab("Servicios y precios", "El agente de WhatsApp y los presupuestos usan estos precios.", <button type="button" className="dc-cfg__nuevo" onClick={() => setEdit({ tipo: "servicio", item: {} })}><Plus size={14} strokeWidth={2.2} /> Nuevo servicio</button>)}
          {esps.length === 0 ? <p className="dc-cfg__nada">Sin servicios aún.</p> : (
            <div className="dc-cfg__servs">
              {esps.map((e) => { const col = colorDe(e.nombre); const dur = e.duracionMin || ESPECIALIDADES.find((x) => x.nombre === e.nombre)?.duracionMin; return (
                <button key={e.id} type="button" className="dc-cfg__serv" style={{ "--c": col }} onClick={() => setEdit({ tipo: "servicio", item: { ...e } })}>
                  <span className="dc-cfg__sico"><Tag size={15} strokeWidth={2} /></span>
                  <div><b>{e.nombre}</b>{dur ? <small><Clock size={11} strokeWidth={2.2} /> {dur} min</small> : <small>Sin duración</small>}</div>
                  <em>S/ {Number(e.precioBase) || 0}</em>
                  <i className="dc-cfg__edit"><Pencil size={13} strokeWidth={2} /></i>
                </button>
              ); })}
            </div>
          )}
        </section>
      )}

      {tab === "doctores" && (
        <section className="dc-cfg__panel">
          {cab("Doctores", "Los doctores activos aparecen en la agenda y en el agendamiento por WhatsApp.", <button type="button" className="dc-cfg__nuevo" onClick={() => setEdit({ tipo: "doctor", item: {} })}><Plus size={14} strokeWidth={2.2} /> Nuevo doctor</button>)}
          {meds.length === 0 ? <p className="dc-cfg__nada">Sin doctores aún.</p> : (
            <div className="dc-cfg__docs">
              {meds.map((m) => { const col = colorDe(m.nombre); return (
                <article key={m.id} className={`dc-cfg__doc${m.activo ? "" : " is-off"}`}>
                  <div className="dc-cfg__dtop">
                    <span className="dc-rec__av" style={{ width: 40, height: 40, fontSize: 13, background: `linear-gradient(135deg, ${tint(col, 0.22)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(String(m.nombre).replace(/^Dra?\.\s*/, ""))}</span>
                    <div><b>{m.nombre}</b><small>{espNombre(m.especialidadId)}{m.cop ? ` – ${m.cop}` : ""}</small></div>
                    <span className={`dc-int__est ${m.activo ? "is-ok" : ""}`}><i />{m.activo ? "Activo" : "Inactivo"}</span>
                  </div>
                  <div className="dc-cfg__dnums">
                    <div><Percent size={12} strokeWidth={2.2} /><span>Comisión</span><b>{m.porcentajeComision != null ? `${m.porcentajeComision}%` : "—"}</b></div>
                    <div><Target size={12} strokeWidth={2.2} /><span>Meta</span><b>{m.metaMensual != null ? `S/ ${Number(m.metaMensual).toLocaleString("es-PE")}` : "—"}</b></div>
                    <button type="button" onClick={() => setEdit({ tipo: "doctor", item: { ...m } })}><Pencil size={13} strokeWidth={2} /> Editar</button>
                  </div>
                </article>
              ); })}
            </div>
          )}
        </section>
      )}

      {tab === "sedes" && (
        <section className="dc-cfg__panel">
          {cab("Sedes", "Locales de atención de la clínica.", <button type="button" className="dc-cfg__nuevo" onClick={() => setEdit({ tipo: "sede", item: {} })}><Plus size={14} strokeWidth={2.2} /> Nueva sede</button>)}
          {sedes.length === 0 ? <p className="dc-cfg__nada">Sin sedes aún.</p> : (
            <div className="dc-cfg__docs">
              {sedes.map((sd, k) => { const col = ["#0E9199", "#D97706", "#6D4FD1", "#2F6FDE"][k % 4]; return (
                <article key={sd.id} className="dc-cfg__sede" style={{ "--c": col }}>
                  <span className="dc-cfg__sico is-grande"><Building2 size={18} strokeWidth={2} /></span>
                  <div><b>{sd.nombre}</b><small><MapPin size={11} strokeWidth={2.2} /> {sd.direccion || "Sin dirección"}</small><small><Phone size={11} strokeWidth={2.2} /> {sd.telefono || "Sin teléfono"}</small></div>
                  <button type="button" className="dc-row-action" aria-label={`Editar ${sd.nombre}`} title="Editar" onClick={() => setEdit({ tipo: "sede", item: { ...sd } })}><Pencil size={14} strokeWidth={2} /></button>
                </article>
              ); })}
            </div>
          )}
        </section>
      )}

      {tab === "horarios" && (() => {
        const nuevo = { diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", sedeId: "" };
        return (
          <div style={{ ...card, padding: "18px 20px" }}>
            <h3 style={{ margin: "0 0 4px", color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Horarios de atención</h3>
            <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginBottom: 14 }}>Define la disponibilidad de cada doctor. El agente de WhatsApp solo ofrece estos horarios.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Doctor:</span>
              <Select width={240} value={medHor} onChange={setMedHor} placeholder="— Selecciona —"
                      options={meds.filter((m) => m.activo).map((m) => ({ value: m.id, label: m.nombre }))} />
            </div>
            {medHor ? (<>
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                {disp.length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Este doctor no tiene horarios configurados.</div>}
                {[...disp].sort((a, b) => (a.diaSemana === 0 ? 7 : a.diaSemana) - (b.diaSemana === 0 ? 7 : b.diaSemana) || String(a.horaInicio).localeCompare(String(b.horaInicio))).map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)" }}>
                    <span style={{ fontWeight: 500, color: NAVY, width: 44 }}>{(DIAS_SEM.find((x) => x.v === d.diaSemana) || {}).l || d.diaSemana}</span>
                    <span style={{ color: "var(--dc-ink-700)", fontVariantNumeric: "tabular-nums" }}>{String(d.horaInicio).slice(0, 5)} – {String(d.horaFin).slice(0, 5)}</span>
                    <span style={{ flex: 1 }} />
                    <button onClick={() => delHorario(d.id)} style={{ border: "1px solid var(--dc-danger-mid)", background: "var(--dc-white)", color: RED, borderRadius: "var(--dc-r-sm)", padding: "5px 9px", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}><Trash2 size={13} strokeWidth={1.75} /> Quitar</button>
                  </div>
                ))}
              </div>
              <HorarioNuevo inp={inp} sedes={sedes} onAdd={addHorario} />
            </>) : <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Selecciona un doctor para ver y editar sus horarios.</div>}
          </div>
        );
      })()}

      {tab === "promos" && (() => {
        const hoy = fmt(new Date());
        const vigente = (p) => p.activa && (!p.desde || p.desde <= hoy) && (!p.hasta || p.hasta >= hoy);
        return (
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Promociones</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>El agente de WhatsApp ofrece SOLO las promociones vigentes automáticamente.</div></div>
              <Btn small onClick={() => setEdit({ tipo: "promo", item: { activa: true } })}><Plus size={15} strokeWidth={1.75} /> Nueva promoción</Btn>
            </div>
            <div style={{ display: "grid", gap: 0 }}>
              {promos.length === 0 && <div style={{ padding: "22px 18px", color: "var(--dc-ink-500)", fontSize: 13 }}>Sin promociones. Crea una y el agente la ofrecerá cuando pregunten por precios u ofertas.</div>}
              {promos.map((p, i) => { const viv = vigente(p); return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: i ? "1px solid var(--dc-bg)" : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "var(--dc-r-md)", background: viv ? "var(--dc-ok-soft)" : "var(--dc-bg)", color: viv ? "var(--dc-ok-700)" : "var(--dc-ink-400)", display: "grid", placeItems: "center", flexShrink: 0 }}><Megaphone size={18} strokeWidth={1.75} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: NAVY, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{p.titulo}{p.descuento && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", padding: "2px 8px", borderRadius: "var(--dc-r-full)" }}>{p.descuento}</span>}<span style={{ fontSize: 12, fontWeight: 500, color: viv ? "var(--dc-ok-700)" : "var(--dc-ink-400)", background: viv ? "var(--dc-ok-soft)" : "var(--dc-line)", padding: "2px 8px", borderRadius: "var(--dc-r-full)" }}>{viv ? "Vigente" : (p.activa ? "Programada/vencida" : "Inactiva")}</span></div>
                    <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{p.descripcion || ""}{p.especialidadId ? ` – ${espNombre(p.especialidadId)}` : ""}{p.hasta ? ` – hasta ${p.hasta}` : ""}</div>
                  </div>
                  <button onClick={() => setEdit({ tipo: "promo", item: { ...p } })} style={{ border: "1px solid var(--dc-line)", background: "var(--dc-white)", borderRadius: "var(--dc-r-sm)", padding: "6px 11px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: DS.c.primary, display: "inline-flex", alignItems: "center", gap: 5 }}><Pencil size={13} strokeWidth={1.75} /> Editar</button>
                  <button aria-label="Eliminar" onClick={() => delPromo(p.id)} style={{ border: "1px solid var(--dc-danger-mid)", background: "var(--dc-white)", color: RED, borderRadius: "var(--dc-r-sm)", padding: "6px 9px", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}><Trash2 size={13} strokeWidth={1.75} /></button>
                </div>
              ); })}
            </div>
          </div>
        );
      })()}

      </div>
      {edit && (() => { const it = edit.item; const set = (k, v) => setEdit((e) => ({ ...e, item: { ...e.item, [k]: v } })); const T = { sede: "Sede", servicio: "Servicio", doctor: "Doctor", promo: "Promoción" }[edit.tipo];
        return (
          <Modal icon={<Settings size={20} strokeWidth={1.75} />} titulo={`${it.id ? "Editar" : "Nuevo"} ${T.toLowerCase()}`} onClose={() => setEdit(null)} maxW={460}
            footer={<><Btn small kind="ghost" onClick={() => setEdit(null)}>Cancelar</Btn><Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> Guardar</Btn></>}>
            <div style={{ display: "grid", gap: 12 }}>
              {edit.tipo !== "promo" && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Nombre<input className="dc-premium-inp" value={it.nombre || ""} onChange={(e) => set("nombre", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder={edit.tipo === "servicio" ? "Ej. Blanqueamiento dental" : edit.tipo === "doctor" ? "Ej. Dra. Carla Mendoza" : "Ej. Sede San Isidro"} /></label>}
              {edit.tipo === "servicio" && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Precio (S/)<input className="dc-premium-inp" type="number" value={it.precioBase ?? ""} onChange={(e) => set("precioBase", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="80" /></label>}
              {edit.tipo === "promo" && <>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Título<input className="dc-premium-inp" value={it.titulo || ""} onChange={(e) => set("titulo", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Ej. Blanqueamiento con 20% dto" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Descripción<input className="dc-premium-inp" value={it.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Detalle breve de la promo" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Descuento<input className="dc-premium-inp" value={it.descuento || ""} onChange={(e) => set("descuento", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="20% – S/ 50 – 2x1" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Aplica a (servicio, opcional)<Select value={it.especialidadId || ""} onChange={(v) => set("especialidadId", v)} placeholder="Todos" options={[{ value: "", label: "Todos" }, ...esps.map((e) => ({ value: e.id, label: e.nombre }))]} /></label>
                <div style={{ display: "flex", gap: 10 }}>
                  <label style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Desde<input className="dc-premium-inp" type="date" value={it.desde || ""} onChange={(e) => set("desde", e.target.value)} style={{ ...inp, marginTop: 5 }} /></label>
                  <label style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Hasta<input className="dc-premium-inp" type="date" value={it.hasta || ""} onChange={(e) => set("hasta", e.target.value)} style={{ ...inp, marginTop: 5 }} /></label>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--dc-ink-700)", cursor: "pointer" }}><input type="checkbox" checked={it.activa !== false} onChange={(e) => set("activa", e.target.checked)} /> Activa (el agente la ofrece si está vigente)</label>
              </>}
              {edit.tipo === "doctor" && <>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Especialidad<Select value={it.especialidadId || ""} onChange={(v) => set("especialidadId", v)} placeholder="— Selecciona —" options={esps.map((e) => ({ value: e.id, label: e.nombre }))} /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>CMP/COP (opcional)<input className="dc-premium-inp" value={it.cop || ""} onChange={(e) => set("cop", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="COP 12345" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Usuario vinculado<input className="dc-premium-inp" value={it.usuarioId || it.usuario || ""} readOnly style={{ ...inp, marginTop: 5, background: "var(--dc-bg)" }} placeholder="Sin usuario vinculado" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Comisión %<input className="dc-premium-inp" type="number" value={it.porcentajeComision ?? ""} onChange={(e) => set("porcentajeComision", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Ej. 40" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Meta mensual (S/)<input className="dc-premium-inp" type="number" value={it.metaMensual ?? ""} onChange={(e) => set("metaMensual", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Ej. 8000 – vacío = sin meta" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Sillón preferido<input className="dc-premium-inp" type="number" min="1" max="8" value={it.sillonPreferido ?? ""} onChange={(e) => set("sillonPreferido", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Sin preferencia" /></label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--dc-ink-700)", cursor: "pointer" }}><input type="checkbox" checked={it.activo !== false} onChange={(e) => set("activo", e.target.checked)} /> Activo (visible en agenda y WhatsApp)</label>
              </>}
              {edit.tipo === "sede" && <>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Dirección<input className="dc-premium-inp" value={it.direccion || ""} onChange={(e) => set("direccion", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Av. ..." /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Teléfono<input className="dc-premium-inp" value={it.telefono || ""} onChange={(e) => set("telefono", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="01 234 5678" /></label>
              </>}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
function HorarioNuevo({ inp, sedes, onAdd }) {
  const [d, setD] = useState({ diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", sedeId: "" });
  return (
    <div style={{ borderTop: "1px dashed var(--dc-line)", paddingTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Día<br /><Select width={150} value={d.diaSemana} onChange={(v) => setD({ ...d, diaSemana: Number(v) })} options={DIAS_SEM.map((x) => ({ value: x.v, label: x.l }))} /></label>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Desde<br /><input className="dc-premium-inp" type="time" value={d.horaInicio} onChange={(e) => setD({ ...d, horaInicio: e.target.value })} style={{ ...inp, width: "auto", marginTop: 4 }} /></label>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Hasta<br /><input className="dc-premium-inp" type="time" value={d.horaFin} onChange={(e) => setD({ ...d, horaFin: e.target.value })} style={{ ...inp, width: "auto", marginTop: 4 }} /></label>
      {sedes.length > 0 && <label style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Sede<br /><Select width={190} value={d.sedeId} onChange={(v) => setD({ ...d, sedeId: v })} placeholder="Cualquiera" options={[{ value: "", label: "Cualquiera" }, ...sedes.map((s) => ({ value: s.id, label: s.nombre }))]} /></label>}
      <Btn small onClick={() => onAdd(d)}><Plus size={14} strokeWidth={1.75} /> Agregar horario</Btn>
    </div>
  );
}

export default Configuracion;
