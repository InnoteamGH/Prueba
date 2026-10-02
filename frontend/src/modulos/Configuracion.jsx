/* Módulo Configuracion. Extraído de App.jsx para servirse en un chunk aparte (code splitting). */
import React, { useState, useEffect, useContext, useRef } from "react";
import {Info, ArrowRight, Briefcase, Building2, Check, CheckCircle2, ClipboardList, Clock, Megaphone, Navigation, Pencil, Plus, Repeat, Search, Settings, Sparkles, Stethoscope, Trash2, MapPin, Phone, Percent, Target, Tag, Smartphone, LayoutGrid, Armchair, Lock, Users, Wrench} from "lucide-react";
import api, { auth } from "../api/client";
import { empresaDemo, guardarDemo, logoDesdeArchivo, refrescarDatosDemo, sedeDemo } from "../util/membrete";
import { comisionSede, guardarMetaSedeDemo, medicoEnSedes, metaSede, sedesMed } from "../compartido/medicosSede";
import { sedeApiUuid } from "../routing";
import { USOS_SILLON, etiquetaUso, normSillon, sillonesDeSede, SILLONES_DEMO, DISP_DEMO } from "../compartido/sillones";
import {DatosDemoCtx, Btn, Card, ListaFiltrable, DIAS_SEM, DISPLAY_FONT, DS, ESPECIALIDADES, MEDICOS, Modal, NAVY, RED, SEDES, Select, fmt, hoy, puede, tint, colorDe, iniciales, PersonaCelda, useSede, mismaSede, sedeNum, nombreSede} from "../comun";

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

/* ---- Asistente de onboarding: configura la clínica en 4 pasos guiados ----
   Recibe los filtros de sede de Configuración: un usuario de sede no crea sedes ni
   servicios (son de toda la clínica) y sus doctores y horarios quedan en su sede. */
function OnboardingWizard({ onClose, onDone = () => {}, notify = () => {}, sedeVisible = () => true, medVisible = () => true, sedeEditable = () => true, limitarSede = false, sedePreferida = null }) {
  const [paso, setPaso] = useState(0);
  const [sedes, setSedes] = useState([]);
  const [esps, setEsps] = useState([]);
  const [meds, setMeds] = useState([]);
  const [disp, setDisp] = useState([]);
  const [medHor, setMedHor] = useState("");
  const [busy, setBusy] = useState(false);
  const inp = { width: "100%", padding: "10px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", color: NAVY, boxSizing: "border-box", background: "var(--dc-white)" };
  const cargar = () => {
    api.sedes.listar().then((r) => setSedes((r || []).filter((x) => sedeVisible(x.id)))).catch(() => {});
    api.catalogo.especialidades().then((r) => setEsps(r || [])).catch(() => {});
    api.catalogo.medicos().then((r) => setMeds((r || []).filter(medVisible))).catch(() => {});
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line
  useEffect(() => { if (medHor) api.disponibilidad.listar(medHor).then((r) => setDisp(r || [])).catch(() => setDisp([])); else setDisp([]); }, [medHor]);

  // Formularios de cada paso
  const [fSede, setFSede] = useState({ nombre: "", direccion: "", telefono: "" });
  const [fEsp, setFEsp] = useState({ nombre: "", precioBase: "" });
  const [fMed, setFMed] = useState({ nombre: "", especialidadId: "", sedeId: "" });
  const [fHor, setFHor] = useState({ diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", sedeId: "" });
  // Sedes donde puede dar de alta doctores y horarios; sin elegir, la sede activa.
  const sedesAlta = sedes.filter((x) => sedeEditable(x.id));
  const sedeAltaDef = (sedesAlta.find((x) => mismaSede(x.id, sedePreferida)) || sedesAlta[0] || {}).id ?? "";
  const sedeMed = fMed.sedeId || sedeAltaDef;
  // Horario: el usuario de sede no puede dejarlo para "todas" las sedes.
  const sedeHor = fHor.sedeId || (limitarSede ? sedeAltaDef : "");

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
    if (!sedeMed) { notify("Elige la sede donde atiende."); return; }
    setBusy(true);
    // El doctor nace en una sede: sin ella aparecería en la agenda de todas.
    api.catalogo.crearMedico({ nombre: fMed.nombre, especialidadId: fMed.especialidadId || null, activo: true, sedeIds: [sedeApiUuid(sedeMed)] })
      .then(() => { setFMed({ nombre: "", especialidadId: "", sedeId: "" }); cargar(); onDone(); notify("Doctor agregado."); })
      .catch(() => notify("No se pudo guardar el doctor.")).finally(() => setBusy(false));
  };
  const addHor = () => {
    if (!medHor) { notify("Elige un doctor."); return; }
    if (limitarSede && !sedeHor) { notify("Elige la sede del horario."); return; }
    setBusy(true);
    api.disponibilidad.crear({ medicoId: medHor, sedeId: sedeHor ? sedeApiUuid(sedeHor) : null, diaSemana: Number(fHor.diaSemana), horaInicio: fHor.horaInicio, horaFin: fHor.horaFin, activo: true })
      .then(() => { api.disponibilidad.listar(medHor).then((r) => setDisp(r || [])); onDone(); notify("Horario agregado."); })
      .catch(() => notify("No se pudo agregar (revisa las horas).")).finally(() => setBusy(false));
  };

  // Sedes y servicios son de toda la clínica: el usuario de sede solo configura sus doctores y horarios.
  const PASOS = limitarSede ? ["doctores", "horarios"] : ["sedes", "servicios", "doctores", "horarios"];
  const NOM_PASO = { sedes: "Sedes", servicios: "Servicios", doctores: "Doctores", horarios: "Horarios" };
  const pasoK = PASOS[paso] || PASOS[0];
  const Lbl = ({ children }) => <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 5 }}>{children}</label>;
  const OK_PASO = { sedes: sedes.length > 0, servicios: esps.length > 0, doctores: meds.length > 0, horarios: disp.length > 0 || meds.length > 0 };
  const okPaso = PASOS.map((k) => OK_PASO[k]);

  return (
    <Modal icon={<Sparkles size={22} strokeWidth={1.75} />} titulo={`Configura tu ${limitarSede ? "sede" : "clínica"} en ${PASOS.length} pasos`} sub={PASOS.map((k) => NOM_PASO[k]).join(" → ")} maxW={720} onClose={onClose}
      footer={<>
        {paso > 0 && <Btn small kind="ghost" onClick={() => setPaso(paso - 1)}>Atrás</Btn>}
        {paso < PASOS.length - 1
          ? <Btn small onClick={() => setPaso(paso + 1)}>Siguiente <ArrowRight size={14} strokeWidth={1.75} /></Btn>
          : <Btn small onClick={() => { notify("¡Configuración base lista!"); onClose(); }}><CheckCircle2 size={15} strokeWidth={1.75} /> Finalizar</Btn>}
      </>}>
      {/* Progreso de pasos */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {PASOS.map((k, i) => (
          <div key={k} onClick={() => setPaso(i)} style={{ cursor: "pointer", flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: "var(--dc-r-md)", border: `1.5px solid ${i === paso ? NAVY : "var(--dc-line)"}`, background: i === paso ? "var(--dc-bg)" : "var(--dc-white)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "var(--dc-r-full)", background: okPaso[i] ? "var(--dc-ok)" : (i === paso ? NAVY : "var(--dc-ink-200)"), color: "var(--dc-white)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{okPaso[i] ? "✓" : i + 1}</div>
            <span style={{ fontSize: 13, fontWeight: 500, color: i === paso ? NAVY : "var(--dc-ink-400)" }}>{NOM_PASO[k]}</span>
          </div>
        ))}
      </div>

      {pasoK === "sedes" && (
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
      {pasoK === "servicios" && (
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
      {pasoK === "doctores" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Registra los doctores, su especialidad y la sede donde atienden.</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1.2fr", gap: 12 }}>
            <div><Lbl>Nombre del doctor *</Lbl><input className="dc-premium-inp" style={inp} value={fMed.nombre} onChange={(e) => setFMed({ ...fMed, nombre: e.target.value })} placeholder="Ej. Dra. Vanessa Pezzutti" /></div>
            <div><Lbl>Especialidad</Lbl><Select value={fMed.especialidadId} onChange={(v) => setFMed({ ...fMed, especialidadId: v })} placeholder="— Selecciona —" options={esps.map((e) => ({ value: e.id, label: e.nombre }))} /></div>
            <div><Lbl>Sede *</Lbl><Select value={sedeMed} onChange={(v) => setFMed({ ...fMed, sedeId: v })} placeholder="— Selecciona —" disabled={sedesAlta.length < 2} options={sedesAlta.map((x) => ({ value: x.id, label: x.nombre }))} /></div>
          </div>
          {esps.length === 0 && <div style={{ fontSize: 12, color: "var(--dc-warn-600)" }}>Sugerencia: agrega primero un servicio en el paso anterior.</div>}
          <div><Btn small onClick={addMed} disabled={busy}><Plus size={15} strokeWidth={1.75} /> Agregar doctor</Btn></div>
          <WizList items={meds.map((m) => ({ id: m.id, main: m.nombre, sub: (esps.find((e) => e.id === m.especialidadId) || {}).nombre }))} icon={<Stethoscope size={15} strokeWidth={1.75} color={DS.c.primary} />} vacio="Aún no hay doctores." />
        </div>
      )}
      {pasoK === "horarios" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Define el horario de cada doctor para que el agente ofrezca cupos reales.</div>
          <div><Lbl>Doctor</Lbl><Select value={medHor} onChange={setMedHor} placeholder="— Selecciona un doctor —" options={meds.map((m) => ({ value: m.id, label: m.nombre }))} /></div>
          {medHor && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                <div><Lbl>Día</Lbl><Select value={fHor.diaSemana} onChange={(v) => setFHor({ ...fHor, diaSemana: v })} options={DIAS_SEM.map((d) => ({ value: d.v, label: d.l }))} /></div>
                <div><Lbl>Desde</Lbl><input className="dc-premium-inp" style={inp} type="time" value={fHor.horaInicio} onChange={(e) => setFHor({ ...fHor, horaInicio: e.target.value })} /></div>
                <div><Lbl>Hasta</Lbl><input className="dc-premium-inp" style={inp} type="time" value={fHor.horaFin} onChange={(e) => setFHor({ ...fHor, horaFin: e.target.value })} /></div>
                <div><Lbl>Sede</Lbl><Select value={sedeHor} onChange={(v) => setFHor({ ...fHor, sedeId: v })} placeholder={limitarSede ? "— Selecciona —" : "Todas"} options={[...(limitarSede ? [] : [{ value: "", label: "Todas" }]), ...sedesAlta.map((x) => ({ value: x.id, label: x.nombre }))]} /></div>
              </div>
              <div><Btn small onClick={addHor} disabled={busy}><Plus size={15} strokeWidth={1.75} /> Agregar horario</Btn></div>
              <WizList items={disp.map((d) => ({ id: d.id, main: (DIAS_SEM.find((x) => x.v === d.diaSemana) || {}).l + " " + (d.horaInicio || "").slice(0, 5) + "–" + (d.horaFin || "").slice(0, 5), sub: d.sedeId ? (sedes.find((s) => mismaSede(s.id, d.sedeId)) || {}).nombre : "Todas las sedes" })).filter((x, i) => !disp[i].sedeId || sedeVisible(disp[i].sedeId))} icon={<Clock size={15} strokeWidth={1.75} color={DS.c.primary} />} vacio="Este doctor aún no tiene horarios." />
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

function Configuracion({ notify = () => {}, rol = "", can, seccionInicial = "puesta", misSedes = null }) {
  // Sedes: el filtro del menú (ids) decide qué se ve; las del usuario (mias), qué puede tocar.
  // Sin proveedor de sede (pruebas) se usan las props.
  const ctxSede = useSede();
  const mias = ctxSede.mias || (Array.isArray(misSedes) && misSedes.length ? misSedes : null);
  // Usuario de sede (admin de sede, gerencia o recepción de una sede): configura solo lo de sus
  // sedes y nunca los datos de toda la clínica (nombre, logo, cuentas, tipo de cambio, feriados,
  // horario general, sedes nuevas).
  const limitarSede = (rol === "admin_sede" && !!mias) || (ctxSede.mias ? !ctxSede.global : false);
  const ver = ctxSede.ids || (limitarSede ? mias : null);
  const sedeVisible = (id) => !ver || (id != null && id !== "" && ver.some((w) => mismaSede(id, w)));
  const sedeEditable = (id) => !limitarSede || (id != null && id !== "" && (mias || []).some((w) => mismaSede(id, w)));
  // Sedes de un doctor: demo (sede/sedes) o API (sedes o sedeIds, como id o como objeto).
  const sedesMedico = (m) => {
    const l = Array.isArray(m?.sedes) && m.sedes.length ? m.sedes : Array.isArray(m?.sedeIds) && m.sedeIds.length ? m.sedeIds : m?.sede != null ? [m.sede] : m?.sedeId != null ? [m.sedeId] : [];
    return l.map((x) => x?.id ?? x);
  };
  // Un doctor sin sede (datos viejos) se ve en todas; al editarlo se le asigna.
  const medVisible = (m) => { const l = sedesMedico(m); return !l.length || l.some(sedeVisible); };
  // Un usuario de sede no cambia los datos generales de un doctor que también atiende en otra
  // sede (ni de uno sin sede): solo su comisión en su sede.
  const medAjeno = (m) => { if (!limitarSede) return false; const l = sedesMedico(m); return !l.length || l.some((x) => !sedeEditable(x)); };
  // Sede para lo nuevo: la activa del menú (nunca "todas"), o la primera de la lista.
  const sedePreferida = ctxSede.activa ?? (mias || [])[0] ?? null;
  const sedeDefecto = (lista) => (lista.find((x) => mismaSede(x.id, sedePreferida)) || lista[0] || {}).id ?? null;
  const sedeUnicaVer = ver && ver.length === 1 ? ver[0] : null;
  // Con sesión, la API recibe las sedes que se ven (null = toda la clínica).
  const sedesApiCfg = ctxSede.sede === "all" && ctxSede.global ? null : (ver || []).map((x) => sedeApiUuid(x));
  const conectado = !!auth.token;
  const fiscalReadOnly = rol === "admin_sede" || limitarSede || (can ? !can("config", "editar") : false);
  const [tab, setTab] = useState(seccionInicial);
  // Listas completas; en pantalla se muestran solo las de las sedes que se ven.
  const [sedesTodas, setSedes] = useState([]);
  const [esps, setEsps] = useState([]);
  const [medsTodos, setMeds] = useState([]);
  const sedes = sedesTodas.filter((x) => sedeVisible(x.id));
  const meds = medsTodos.filter(medVisible);
  const sedesEdit = sedes.filter((x) => sedeEditable(x.id));
  const [edit, setEdit] = useState(null);   // { tipo, item }
  const [medHor, setMedHor] = useState("");  // médico seleccionado en Horarios
  const [disp, setDisp] = useState([]);
  // Sillones y horario de doctores de la demostración: viven en los datos compartidos
  // para que la agenda y el modal de agendado usen exactamente lo que se configura aquí.
  const demoDb = useContext(DatosDemoCtx);
  const [silRemoto, setSilRemoto] = useState([]);
  const sillones = (conectado ? silRemoto : (demoDb?.sillones || SILLONES_DEMO).map(normSillon)).filter((x) => sedeVisible(x.sede ?? x.sedeId));
  const [citasHoySil, setCitasHoySil] = useState([]);
  useEffect(() => { if (conectado && tab === "sillones") api.citas.listar(fmt(new Date())).then((r) => setCitasHoySil(r || [])).catch(() => setCitasHoySil([])); }, [tab]); // eslint-disable-line
  const cargarSillones = () => { if (conectado) api.sillones.listar().then((r) => setSilRemoto((r || []).map(normSillon))).catch(() => setSilRemoto([])); };
  // Cada promoción es de una sede (el precio cambia por sede); sin sede = toda la clínica.
  const [promos, setPromos] = useState(() => (auth.token ? [] : [
    { id: "p1", titulo: "Blanqueamiento con 20% de descuento", descripcion: "Solo pacientes con limpieza reciente", descuento: "20%", activa: true, desde: "", hasta: "", sedeId: 2 },
    { id: "p2", titulo: "Evaluación de ortodoncia gratis", descripcion: "Incluye fotografías y plan de tratamiento", descuento: "Gratis", activa: true, desde: "", hasta: "", sedeId: 1 },
  ]));
  const promoVisible = (pr) => pr.sedeId == null || pr.sedeId === "" || sedeVisible(pr.sedeId);
  const promoEditable = (pr) => (pr.sedeId == null || pr.sedeId === "" ? !limitarSede : sedeEditable(pr.sedeId));
  const [goLive, setGoLive] = useState(null);
  const [wizard, setWizard] = useState(false);
  const [clinica, setClinica] = useState(() => {
    let local = {};
    try { local = JSON.parse(localStorage.getItem("dc_data_v1_clinica_horario") || "null") || {}; } catch { /* nada guardado */ }
    // Sin sesión se parte de la clínica de demostración (y de lo editado en este navegador),
    // que es la misma que sale en el membrete de los documentos.
    const e = auth.token ? {} : empresaDemo();
    return { nombre: e.nombre || "", razonSocial: e.razonSocial || "", ruc: e.ruc || "", direccion: "", telefono: "", email: "", web: e.web || "", logo: e.logo || "", cuentas: [], billeteras: [],
             horario: local.horario || {}, feriados: local.feriados || [], tipoCambio: 3.75 };
  });
  // Última versión guardada de la clínica: el usuario de sede envía esta copia con solo el
  // horario de sus sedes cambiado (no puede tocar nada más de la clínica).
  const clinicaGuardada = useRef(null);
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
  const cargarClinica = () => { if (conectado) api.clinica.get().then((r) => { const c = { nombre: r?.nombre || "", razonSocial: r?.razonSocial || "", ruc: r?.ruc || "", direccion: r?.direccion || "", telefono: r?.telefono || "", email: r?.email || "", web: r?.web || "", logo: r?.logo || r?.logoUrl || "", cuentas: Array.isArray(r?.cuentas) ? r.cuentas : [], billeteras: Array.isArray(r?.billeteras) ? r.billeteras : [], horario: (r?.horario && typeof r.horario === "object") ? r.horario : {}, feriados: Array.isArray(r?.feriados) ? r.feriados : [], tipoCambio: Number(r?.tipoCambio) > 0 ? Number(r.tipoCambio) : 3.75 }; clinicaGuardada.current = c; setClinica(c); }).catch(() => {}); };
  // Lo que se guarda: todo (administración general) o, para un usuario de sede, la clínica
  // tal como estaba con solo el horario propio de sus sedes cambiado.
  const clinicaAGuardar = () => {
    if (!limitarSede) return clinica;
    const local = leerHorarioLocal();
    const base = conectado ? (clinicaGuardada.current || clinica) : { ...clinica, horario: local.horario || {}, feriados: local.feriados || [] };
    const hs = { ...((base.horario || {}).sedes || {}) };
    Object.keys(hs).filter((k) => sedeEditable(k)).forEach((k) => { delete hs[k]; });
    Object.entries((clinica.horario || {}).sedes || {}).forEach(([k, v]) => { if (sedeEditable(k)) hs[k] = v; });
    return { ...base, horario: { ...(base.horario || {}), sedes: hs } };
  };
  const guardarClinica = () => {
    const datos = clinicaAGuardar();
    guardarHorarioLocal(datos);          // el dashboard y la disponibilidad leen de aquí
    if (!conectado && limitarSede) { notify("Horario de tu sede guardado en este navegador."); return Promise.resolve(); }
    if (!conectado) {
      guardarDemo({ empresa: { nombre: clinica.nombre, razonSocial: clinica.razonSocial, ruc: clinica.ruc, web: clinica.web, logo: clinica.logo || "" } });
      refrescarDatosDemo();
      notify("Guardado en este navegador. Con sesión se guarda en la clínica.");
      return Promise.resolve();
    }
    return api.clinica.actualizar(datos).then(() => { notify(limitarSede ? "Horario de tu sede guardado." : "Datos de la clínica guardados."); clinicaGuardada.current = datos; cargarGoLive(); }).catch(() => notify("No se pudieron guardar."));
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
  // Opciones del horario: la administración general ve el general y las sedes a la vista; el
  // usuario de sede, solo las suyas. Con una sede elegida en el menú se abre en esa sede.
  const sedesHorario = (sedes.length ? sedes : SEDES.filter((x) => sedeVisible(x.id))).filter((x) => sedeEditable(x.id));
  const sedeHorarioPref = () => {
    const elegida = ctxSede.sede !== "all" ? sedesHorario.find((x) => mismaSede(x.id, ctxSede.sede)) : null;
    if (elegida) return String(elegida.id);
    return limitarSede ? String((sedesHorario.find((x) => mismaSede(x.id, sedePreferida)) || sedesHorario[0] || {}).id ?? "") : "";
  };
  const [sedeHorario, setSedeHorario] = useState(sedeHorarioPref);
  const clavesHorario = sedesHorario.map((x) => String(x.id)).join(",");
  // Cambió el filtro del menú o llegaron las sedes reales (UUID): se vuelve a la sede que corresponde.
  useEffect(() => {
    const valida = sedeHorario === "" ? !limitarSede : sedesHorario.some((x) => String(x.id) === String(sedeHorario));
    if (!valida || ctxSede.sede !== "all") setSedeHorario(sedeHorarioPref());
  }, [ctxSede.sede, clavesHorario]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const addFeriado = () => !limitarSede && setClinica((c) => ({ ...c, feriados: [...(c.feriados || []), { fecha: "", cerrado: true, abre: "09:00", cierra: "13:00", nota: "" }] }));
  const setFeriado = (i, k, v) => setClinica((c) => ({ ...c, feriados: c.feriados.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const delFeriado = (i) => !limitarSede && setClinica((c) => ({ ...c, feriados: c.feriados.filter((_, j) => j !== i) }));
  const addCuenta = () => setClinica((c) => ({ ...c, cuentas: [...(c.cuentas || []), { banco: "", moneda: "PEN", numero: "", cci: "", titular: "" }] }));
  const setCuenta = (i, k, v) => setClinica((c) => ({ ...c, cuentas: c.cuentas.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const delCuenta = (i) => setClinica((c) => ({ ...c, cuentas: c.cuentas.filter((_, j) => j !== i) }));
  const addBilletera = (tipo) => setClinica((c) => ({ ...c, billeteras: [...(c.billeteras || []), { tipo, numero: "", titular: "" }] }));
  const setBilletera = (i, k, v) => setClinica((c) => ({ ...c, billeteras: c.billeteras.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const delBilletera = (i) => setClinica((c) => ({ ...c, billeteras: c.billeteras.filter((_, j) => j !== i) }));
  const cargar = () => {
    if (!conectado) {
      setSedes(SEDES.map((s) => { const d = sedeDemo(s.id); return { id: s.id, nombre: d.nombre || s.nombre, direccion: d.direccion || s.dir, telefono: d.telefonos || "", horarioDocumento: d.horario || "", correo: d.correo || "", serieDocumento: d.serieDocumento || "" }; }));
      setEsps(ESPECIALIDADES.map((e) => ({ id: e.id, nombre: e.nombre, precioBase: e.precio })));
      // ref: el doctor de la demo, para calcular su meta y su % en las sedes que se ven.
      setMeds(MEDICOS.map((m) => ({ id: m.id, nombre: m.nombre, especialidadId: m.esp, cop: m.cop ? `COP ${m.cop}` : null, activo: m.activo !== false, porcentajeComision: m.comision ?? null, sedes: sedesMed(m), ref: m })));
      setGoLive({
        listoParaOperar: true, total: 4, completados: 4, obligatoriosPendientes: 0,
        items: [
          { clave: "sedes", titulo: "Sedes", ok: true, obligatorio: true, detalle: `${SEDES.filter((x) => sedeVisible(x.id)).length} sede(s) de demostración` },
          { clave: "servicios", titulo: "Servicios", ok: true, obligatorio: true, detalle: `${ESPECIALIDADES.length} servicio(s) de demostración` },
          { clave: "doctores", titulo: "Doctores", ok: true, obligatorio: true, detalle: `${MEDICOS.filter(medVisible).length} odontólogo(s) de demostración` },
          { clave: "horario", titulo: "Horarios", ok: true, obligatorio: false, detalle: "Horario de demostración" },
        ],
      });
      return;
    }
    // Con sesión también se filtra por sede (antes solo en la demo): un admin de sede no ve ni edita otra sede.
    api.sedes.listar().then((r) => setSedes(r || [])).catch(() => {});
    api.catalogo.especialidades().then((r) => setEsps(r || [])).catch(() => {});
    api.catalogo.medicos().then((r) => setMeds(r || [])).catch(() => {});
    api.promociones.listar(sedesApiCfg).then((r) => setPromos((r || []).map((x) => ({ ...x, sedeId: x.sedeId ?? null })))).catch(() => {});
    cargarGoLive();
    cargarClinica();
    cargarSillones();
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line
  // Las promociones se piden por sede al servidor: al cambiar el filtro se vuelven a pedir.
  useEffect(() => { if (conectado) api.promociones.listar(sedesApiCfg).then((r) => setPromos((r || []).map((x) => ({ ...x, sedeId: x.sedeId ?? null })))).catch(() => {}); }, [sedesApiCfg ? sedesApiCfg.join(",") : "todas"]); // eslint-disable-line
  // Doctor elegido en Horarios que ya no se ve con el filtro: se suelta.
  useEffect(() => { if (medHor && !meds.some((m) => String(m.id) === String(medHor))) setMedHor(""); }, [ver ? ver.join(",") : "todas"]); // eslint-disable-line
  const cargarDisp = (mid) => { if (conectado && mid) api.disponibilidad.listar(mid).then((r) => setDisp(r || [])).catch(() => setDisp([])); else setDisp([]); };
  useEffect(() => { cargarDisp(medHor); }, [medHor]); // eslint-disable-line
  const dispDemo = demoDb?.dispMedicos || DISP_DEMO;
  // Bloques del doctor en las sedes que se ven; los de "cualquier sede" (sin sede) también.
  const dispVista = (conectado ? disp : dispDemo.filter((d) => String(d.medicoId) === String(medHor)).map((d) => ({ ...d, sedeId: d.sede })))
    .filter((d) => d.sedeId == null || d.sedeId === "" || sedeVisible(d.sedeId));
  // Un bloque sin sede vale en todas: solo lo quita la administración general.
  const bloqueEditable = (d) => (d.sedeId == null || d.sedeId === "" ? !limitarSede : sedeEditable(d.sedeId));
  const espNombre = (id) => (esps.find((e) => e.id === id) || {}).nombre || "—";
  // Meta y % de un doctor en las sedes que se ven (demo: calculado; API: metasSede si llega).
  const metasApi = (m) => (Array.isArray(m.metasSede) ? m.metasSede : Object.entries(m.metasSede || {}).map(([sedeId, x]) => ({ sedeId, ...x })));
  const porSedeDe = (m) => {
    if (m.ref) return sedesMed(m.ref).filter(sedeVisible).map((sd) => ({ sede: sd, meta: metaSede(m.ref, sd), com: comisionSede(m.ref, sd) }));
    return sedesMedico(m).filter(sedeVisible).map((sd) => { const x = metasApi(m).find((y) => mismaSede(y.sedeId, sd)) || {}; return { sede: sd, meta: x.metaMensual ?? null, com: x.porcentajeComision !== undefined ? x.porcentajeComision : (m.porcentajeComision ?? null) }; });
  };
  const metaVista = (m) => {
    if (m.ref) return medicoEnSedes(m.ref, ver ? ver.map(sedeNum) : null).meta;
    const ps = porSedeDe(m).filter((x) => x.meta != null);
    return ps.length ? ps.reduce((a, x) => a + (Number(x.meta) || 0), 0) : (m.metaMensual ?? null);
  };
  // Con una sola sede a la vista, el % es el de esa sede; si no, el base del doctor.
  const comisionVista = (m) => { if (sedeUnicaVer == null) return m.porcentajeComision ?? null; const x = porSedeDe(m).find((y) => mismaSede(y.sede, sedeUnicaVer)); return x ? x.com : (m.porcentajeComision ?? null); };
  const nomSedeCfg = (id) => (sedesTodas.find((x) => mismaSede(x.id, id)) || {}).nombre || nombreSede(id);
  const abrirDoctor = (m) => {
    if (!m) { const def = sedeDefecto(sedesEdit); setEdit({ tipo: "doctor", item: { activo: true, sedesForm: def != null ? [def] : [], comSede: {} } }); return; }
    const comSede = Object.fromEntries(porSedeDe(m).filter((x) => sedeEditable(x.sede)).map((x) => [x.sede, x.com ?? ""]));
    setEdit({ tipo: "doctor", item: { ...m, sedesForm: sedesMedico(m), comSede } });
  };

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
    if (edit.tipo === "sillon") {
      const numero = Number(it.numero);
      if (!String(it.nombre || "").trim()) { notify("Ponle un nombre al sillón."); return; }
      if (!Number.isInteger(numero) || numero <= 0) { notify("El número del sillón debe ser 1 o mayor."); return; }
      if (it.uso === "doctor" && !it.medicoId) { notify("Elige el doctor de este sillón."); return; }
      if (it.uso === "especialidad" && !it.especialidadId) { notify("Elige la especialidad de este sillón."); return; }
      if (it.sede == null || it.sede === "") { notify("Elige la sede del sillón."); return; }
      if (!sedeEditable(it.sede)) { notify("Solo puedes configurar los sillones de tus sedes."); return; }
      if (sillones.some((x) => x.id !== it.id && String(x.sede) === String(it.sede) && x.numero === numero)) { notify(`Ya existe el sillón N.º ${numero} en esa sede.`); return; }
      const num = (v) => (v === "" || v == null ? null : (conectado ? v : Number(v)));
      const reg = { nombre: it.nombre.trim(), numero, sede: num(it.sede), uso: it.uso || "flexible", medicoId: it.uso === "doctor" ? num(it.medicoId) : null, especialidadId: it.uso === "especialidad" ? num(it.especialidadId) : null, exclusivo: it.uso !== "flexible" && !!it.exclusivo, activo: it.activo !== false, nota: it.activo === false ? (it.nota || "") : "" };
      if (!conectado) {
        demoDb?.setSillones((ss) => it.id ? ss.map((x) => (x.id === it.id ? { ...x, ...reg } : x)) : [...ss, { ...reg, id: `s${Date.now()}` }]);
        notify("Sillón guardado."); setEdit(null); return;
      }
      const payload = { ...reg, sedeId: sedeApiUuid(reg.sede) }; delete payload.sede;
      (it.id ? api.sillones.actualizar(it.id, payload) : api.sillones.crear(payload)).then(() => { notify("Sillón guardado."); setEdit(null); cargarSillones(); }).catch(err);
      return;
    }
    // Doctor: la administración general edita sus datos, sus sedes y el % base; un usuario
    // de sede solo el % de comisión en su sede (y los datos de un doctor solo de su sede).
    const aPct = (v) => (v === "" || v == null ? null : Math.max(0, Math.min(100, Number(v))));
    const ajeno = edit.tipo === "doctor" && !!it.id && medAjeno(it);
    const editaSedesDoc = edit.tipo === "doctor" && (!it.id || !limitarSede);
    const sedesDoc = edit.tipo === "doctor" ? (it.sedesForm || []).filter((x) => sedeEditable(x)) : [];
    if (editaSedesDoc && !sedesDoc.length) { notify("Elige al menos una sede donde atiende el doctor."); return; }
    // % propio en las sedes del usuario (no toca el % base ni las otras sedes).
    const comPropias = Object.entries(it.comSede || {}).filter(([sd]) => limitarSede && sedeEditable(sd) && (it.id ? true : sedesDoc.some((x) => mismaSede(x, sd))));
    // NAV-07 / MET-01: meta y % de comisión se editan aquí y solo aquí. En la
    // demostración se aplican a la ficha del doctor que leen Reportes y Mi producción.
    if (edit.tipo === "doctor" && !auth.token) {
      const pct = aPct(it.porcentajeComision);
      let m = MEDICOS.find((x) => x.id === it.id);
      if (!m) {
        // Alta en la demo: vive en esta sesión, ya con sus sedes (la agenda y las metas la ven).
        const esp = Number(it.especialidadId) || ESPECIALIDADES[0]?.id || 1;
        const ss = sedesDoc.map(Number);
        m = { id: Math.max(0, ...MEDICOS.map((x) => Number(x.id) || 0)) + 1, nombre: it.nombre.trim(), cop: String(it.cop || "").replace(/^COP\s*/i, ""), esp, esps: [esp], sede: ss[0], sedes: ss, foto: iniciales(String(it.nombre).replace(/^Dra?\.\s*/, "")), color: colorDe(it.nombre), meta: null, prodDemo: 0, citasDemo: 0, comision: limitarSede ? null : pct };
        MEDICOS.push(m);
      } else if (!ajeno) {
        Object.assign(m, { nombre: it.nombre.trim() || m.nombre });
        if (!limitarSede) {
          const ss = sedesDoc.map(Number);
          Object.assign(m, { comision: pct, sedes: ss, sede: ss.includes(Number(m.sede)) ? m.sede : ss[0] });
          try { const o = JSON.parse(localStorage.getItem("dc_data_v1_medicos_cfg") || "{}"); o[m.id] = { ...(o[m.id] || {}), comision: pct, sedes: m.sedes, sede: m.sede }; localStorage.setItem("dc_data_v1_medicos_cfg", JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ }
        }
      }
      // % de la sede: misma ficha por sede que usan Metas, Reportes y Mi producción.
      comPropias.forEach(([sd, v]) => guardarMetaSedeDemo(m, Number(sd), metaSede(m, Number(sd)), aPct(v)));
      const fila = { id: m.id, nombre: m.nombre, especialidadId: it.id ? it.especialidadId : m.esp, cop: m.cop ? `COP ${m.cop}` : null, activo: it.activo !== false, porcentajeComision: m.comision ?? null, sedes: sedesMed(m), ref: m };
      setMeds((ms) => (ms.some((x) => x.id === m.id) ? ms.map((x) => (x.id === m.id ? { ...x, ...fila, especialidadId: ajeno ? x.especialidadId : (it.especialidadId ?? x.especialidadId), cop: ajeno ? x.cop : (it.cop || x.cop), activo: ajeno ? x.activo : it.activo !== false } : x)) : [...ms, fila]));
      notify(ajeno ? "Comisión de tu sede guardada." : "Doctor guardado."); setEdit(null); return;
    }
    if (edit.tipo === "sede" && (it.id ? !sedeEditable(it.id) : limitarSede)) { notify("Solo puedes editar los datos de tu sede."); return; }
    if (edit.tipo === "promo" && !String(it.titulo || "").trim()) { notify("Ponle un título a la promoción."); return; }
    if (edit.tipo === "promo" && (it.sedeId == null || it.sedeId === "" ? limitarSede : !sedeEditable(it.sedeId))) { notify("Elige una de tus sedes para la promoción."); return; }
    if (edit.tipo === "promo" && !auth.token) {
      // Demo: la promoción queda en esta pantalla con su sede (sin sede = toda la clínica).
      const reg = { ...it, titulo: it.titulo.trim(), sedeId: it.sedeId === "" || it.sedeId == null ? null : Number(it.sedeId) };
      setPromos((ps) => (it.id ? ps.map((x) => (x.id === it.id ? { ...x, ...reg } : x)) : [...ps, { ...reg, id: `p${Date.now()}` }]));
      notify("Promoción guardada."); setEdit(null); return;
    }
    if (edit.tipo === "sede" && !auth.token) {
      const id = it.id || Date.now();
      setSedes((ss) => (it.id ? ss.map((x) => (x.id === it.id ? { ...x, ...it } : x)) : [...ss, { ...it, id }]));
      guardarDemo({ sedes: { [id]: { nombre: it.nombre, direccion: it.direccion || "", telefonos: it.telefono || "", horario: it.horarioDocumento || "", correo: it.correo || "", serieDocumento: it.serieDocumento || "" } } });
      refrescarDatosDemo();
      notify("Sede guardada."); setEdit(null); return;
    }
    if (edit.tipo === "sede") {
      // Dirección, teléfonos, horario, correo y serie salen en el membrete de los
      // documentos emitidos desde esta sede.
      const payload = { nombre: it.nombre, direccion: it.direccion, telefono: it.telefono, horarioDocumento: it.horarioDocumento || null, correo: it.correo || null, serieDocumento: it.serieDocumento || null, activa: it.activa !== false };
      (it.id ? api.sedes.actualizar(it.id, payload) : api.sedes.crear(payload)).then(() => done("Sede guardada.")).catch(err);
    } else if (edit.tipo === "servicio") {
      const precio = Number(it.precioBase);
      if (!Number.isFinite(precio) || precio <= 0) { notify("El precio debe ser mayor a S/ 0."); return; }
      const payload = { nombre: it.nombre, precioBase: precio };
      (it.id ? api.catalogo.actualizarEspecialidad(it.id, payload) : api.catalogo.crearEspecialidad(payload)).then(() => done("Servicio guardado.")).catch(err);
    } else if (edit.tipo === "doctor") {
      const pctC = aPct(it.porcentajeComision);
      // % de sus sedes: PUT /medicos/{id}/metas/{sedeId}, conservando la meta de esa sede.
      const fijarPropias = (id) => Promise.all(comPropias.map(([sd, v]) => { const ps = porSedeDe(it).find((x) => mismaSede(x.sede, sd)); return api.catalogo.fijarMetaSede(id, sedeApiUuid(sd), { metaMensual: ps?.meta ?? null, porcentajeComision: aPct(v) }); }));
      if (ajeno) { fijarPropias(it.id).then(() => done("Comisión de tu sede guardada.")).catch(err); return; }
      // Sin sedes el doctor aparecería en la agenda de todas: se crea (o reasigna) con las suyas.
      const payload = { nombre: it.nombre, especialidadId: it.especialidadId || null, cop: it.cop || null, activo: it.activo !== false, porcentajeComision: limitarSede && !it.id ? null : pctC, ...(editaSedesDoc ? { sedeIds: sedesDoc.map((x) => sedeApiUuid(x)) } : {}) };
      (it.id ? api.catalogo.actualizarMedico(it.id, payload).then(() => it.id) : api.catalogo.crearMedico(payload).then((r) => r?.id))
        .then((id) => (id && comPropias.length ? fijarPropias(id) : null))
        .then(() => done("Doctor guardado."))
        .catch(err);
    } else if (edit.tipo === "promo") {
      const payload = { titulo: it.titulo, descripcion: it.descripcion || null, descuento: it.descuento || null, especialidadId: it.especialidadId || null, desde: it.desde || null, hasta: it.hasta || null, activa: it.activa !== false, sedeId: it.sedeId === "" || it.sedeId == null ? null : sedeApiUuid(it.sedeId) };
      (it.id ? api.promociones.actualizar(it.id, payload) : api.promociones.crear(payload)).then(() => done("Promoción guardada.")).catch(err);
    }
  };
  const delPromo = (pr) => {
    if (!promoEditable(pr)) { notify("Esta promoción es de toda la clínica: la quita la administración general."); return; }
    if (!conectado) { setPromos((ps) => ps.filter((x) => x.id !== pr.id)); notify("Promoción eliminada."); return; }
    api.promociones.borrar(pr.id).then(() => { notify("Promoción eliminada."); cargar(); }).catch(() => notify("No se pudo eliminar."));
  };
  const addHorario = (h) => {
    if (!medHor) { notify("Elige un doctor primero."); return; }
    if (h.horaFin <= h.horaInicio) { notify("La hora de fin debe ser mayor que la de inicio."); return; }
    // Un bloque sin sede vale en todas: el usuario de sede siempre lo pone en una de las suyas.
    if (!h.sedeId && limitarSede) { notify("Elige la sede del horario."); return; }
    if (h.sedeId && !sedeEditable(h.sedeId)) { notify("Solo puedes agregar horarios en tus sedes."); return; }
    if (!conectado) {
      const choca = dispDemo.some((d) => String(d.medicoId) === String(medHor) && Number(d.diaSemana) === Number(h.diaSemana) && d.horaInicio < h.horaFin && h.horaInicio < d.horaFin);
      if (choca) { notify("Ese bloque se cruza con otro horario del mismo día."); return; }
      demoDb?.setDispMedicos((ds) => [...ds, { id: `d${Date.now()}`, medicoId: Number(medHor), sede: h.sedeId ? Number(h.sedeId) : null, diaSemana: Number(h.diaSemana), horaInicio: h.horaInicio, horaFin: h.horaFin }]);
      notify("Horario agregado."); return;
    }
    api.disponibilidad.crear({ medicoId: medHor, sedeId: h.sedeId ? sedeApiUuid(h.sedeId) : null, diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin, activo: true })
      .then(() => { notify("Horario agregado."); cargarDisp(medHor); }).catch(() => notify("No se pudo agregar (revisa las horas)."));
  };
  const delHorario = (d) => {
    if (!bloqueEditable(d)) { notify(d.sedeId ? "Ese bloque es de otra sede." : "Ese bloque vale para todas las sedes: lo quita la administración general."); return; }
    if (!conectado) { demoDb?.setDispMedicos((ds) => ds.filter((x) => x.id !== d.id)); notify("Horario eliminado."); return; }
    api.disponibilidad.borrar(d.id).then(() => { notify("Horario eliminado."); cargarDisp(medHor); }).catch(() => {});
  };

  const TABS = [["puesta", "Puesta en marcha", Navigation, "Pasos para operar", "#0E9199"], ["empresa", "Datos de la clínica", Briefcase, "RUC, logo y facturación", "#28527A"], ["atencion", "Horario de atención", Clock, "Días y horas de la clínica", "#2F6FDE"], ["doctores", "Doctores", Stethoscope, "Equipo clínico", "#6D4FD1"], ["sedes", "Sedes", Building2, "Locales de atención", "#D97706"], ["sillones", "Sillones", Armchair, "Uso y doctores", "#0B6C78"], ["horarios", "Horarios por doctor", Clock, "Disponibilidad de agenda", "#0E9EB0"], ["promos", "Promociones", Megaphone, "Ofertas del agente IA", "#E0694F"]];
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

      {tab === "puesta" && (() => {
        const listo = goLive?.listoParaOperar;
        const total = goLive?.total || 0; const hechos = goLive?.completados || 0;
        const pct = total ? Math.round(hechos * 100 / total) : 0;
        const ICO = { sedes: Building2, especialidades: ClipboardList, servicios: ClipboardList, doctores: Stethoscope, horarios: Clock, promos: Megaphone };
        return (
          <section className="dc-cfg__panel">
            <div className={`dc-go${listo ? " is-listo" : ""}`}>
              <span className="dc-go__anillo" style={{ "--p": pct }}><b>{pct}%</b></span>
              <div className="dc-go__txt">
                <h3>{listo ? "Todo listo para operar" : "Puesta en marcha de la clínica"}</h3>
                <p>{listo ? "Sedes, servicios, doctores y horarios están configurados." : `${goLive?.obligatoriosPendientes || 0} punto(s) obligatorio(s) pendiente(s) para que el asistente pueda agendar y atender.`}</p>
                <small>{total ? `${hechos} de ${total} pasos completos` : "Cargando checklist…"}</small>
              </div>
              <div className="dc-go__acc">
                <button type="button" className="dc-cfg__nuevo" onClick={() => setWizard(true)}><Sparkles size={14} strokeWidth={2.2} /> {limitarSede ? "Configurar mi sede" : "Configurar en 4 pasos"}</button>
                <button type="button" className="dc-row-action" aria-label="Actualizar" title="Actualizar" onClick={cargarGoLive}><Repeat size={14} strokeWidth={2} /></button>
              </div>
            </div>
            <div className="dc-go__pasos">
              {(goLive?.items || []).map((it, i) => { const I = ICO[it.clave] || CheckCircle2; const ir = ["servicios", "especialidades"].includes(it.clave) ? () => { window.location.hash = "#/servicios"; } : ["sedes", "doctores", "horarios", "promos"].includes(it.clave) ? () => setTab(it.clave) : null; return (
                <div key={it.clave} className={`dc-go__paso ${it.ok ? "is-ok" : it.obligatorio ? "is-falta" : "is-opc"}`}>
                  <span className="dc-go__n">{it.ok ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                  <span className="dc-go__ico"><I size={16} strokeWidth={2} /></span>
                  <div><b>{it.titulo}</b><small>{it.detalle || it.descripcion}</small></div>
                  <span className="dc-go__tag">{it.obligatorio ? "Obligatorio" : "Opcional"}</span>
                  {!it.ok && ir && <button type="button" onClick={ir}>Configurar</button>}
                </div>
              ); })}
              {conectado && !goLive && <p className="dc-cfg__nada">Cargando estado…</p>}
            </div>
          </section>
        );
      })()}
      {wizard && <OnboardingWizard sedeVisible={sedeVisible} medVisible={medVisible} sedeEditable={sedeEditable} limitarSede={limitarSede} sedePreferida={sedePreferida} onClose={() => { setWizard(false); cargar(); }} onDone={cargar} notify={notify} />}

      {tab === "empresa" && (() => {
        const set = (k, v) => setClinica((c) => ({ ...c, [k]: v }));
        const ro = fiscalReadOnly ? { readOnly: true, className: "is-ro" } : {};
        // Nombre, contacto, logo, cuentas, Yape/Plin y tipo de cambio son de toda la clínica:
        // el usuario de sede los ve, pero solo edita los datos de su sede.
        const roEmp = limitarSede ? { readOnly: true, className: "is-ro" } : {};
        const campo = (label, input, span) => <label className={`dc-emp__campo${span ? ` is-${span}` : ""}`}><span>{label}</span>{input}</label>;
        const SEDE_COL = ["#0E9199", "#D97706", "#6D4FD1", "#2F6FDE", "#E0694F"];
        return (
        <div className="dc-emp">
          {limitarSede
            ? <div className="fm-aviso-edad is-info"><Info size={15} strokeWidth={2} /><span>Los datos de la empresa (nombre, RUC, logo, cuentas, Yape/Plin y tipo de cambio) son de toda la clínica y los edita la administración general. Tú actualizas los datos de tu sede: dirección, teléfono, correo y serie de documentos.</span></div>
            : fiscalReadOnly && conectado && <div className="fm-aviso-edad is-info"><Info size={15} strokeWidth={2} /><span>RUC, razón social y datos fiscales son de solo lectura para tu rol.</span></div>}
          <section className="dc-emp__id">
            {clinica.logo
              ? <span className="dc-emp__logo is-img"><img src={clinica.logo} alt={clinica.nombre || "Logo"} /></span>
              : <span className="dc-emp__logo">{(clinica.nombre || "Clínica").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
            <div>
              <small>Tu clínica</small>
              <b>{clinica.nombre || "Nombre comercial"}</b>
              <span>{clinica.razonSocial || "Razón social"}{clinica.ruc ? ` – RUC ${clinica.ruc}` : ""}</span>
            </div>
            <div className="dc-emp__chips">
              <span><Building2 size={13} strokeWidth={2} /> {sedes.length} {sedes.length === 1 ? "sede" : "sedes"}</span>
              <span><Briefcase size={13} strokeWidth={2} /> {(clinica.cuentas || []).length} cuentas</span>
              <span><Phone size={13} strokeWidth={2} /> {(clinica.billeteras || []).length} Yape/Plin</span>
            </div>
          </section>

          <section className="dc-cfg__panel">
            {cab("Datos fiscales y de contacto", "Se usan en boletas y facturas, y para que el asistente sepa quién es la clínica.")}
            <div className="dc-emp__form">
              {campo("Nombre comercial", <input {...roEmp} value={clinica.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Odonto Sonrisa" />, 2)}
              {campo("Razón social", <input {...ro} value={clinica.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} placeholder="Odonto Sonrisa S.A.C." />, 2)}
              {campo("RUC", <div className="dc-emp__ruc"><input {...ro} value={clinica.ruc} onChange={(e) => set("ruc", e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="20512345678" />{!fiscalReadOnly && <button type="button" onClick={consultarRucClinica} disabled={rucBusy}><Search size={13} strokeWidth={2.2} /> {rucBusy ? "…" : "SUNAT"}</button>}</div>, 1)}
              {campo("Dirección fiscal", <input {...ro} value={clinica.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Av. Javier Prado 1540, San Isidro" />, 3)}
              {campo("Teléfono", <input {...roEmp} value={clinica.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="01 234 5678" />, 1)}
              {campo("Correo", <input {...roEmp} value={clinica.email} onChange={(e) => set("email", e.target.value)} placeholder="contacto@clinica.pe" />, 2)}
              {campo("Web", <input {...roEmp} value={clinica.web} onChange={(e) => set("web", e.target.value)} placeholder="www.clinica.pe" />, 1)}
              {campo("Tipo de cambio (S/ por 1 US$)", <input {...roEmp} type="number" step="0.01" min="0.01" value={clinica.tipoCambio ?? 3.75} onChange={(e) => set("tipoCambio", Number(e.target.value) || 3.75)} />, 1)}
              <p className="dc-emp__nota is-3">Se usa en Caja para cobros en dólares.</p>
            </div>
          </section>

          <section className="dc-cfg__panel">
            {cab("Logo para documentos", "Sale en el membrete de proformas, recetas, historia clínica, consentimientos, boletas y reportes.")}
            <div className="dc-emp__logocfg">
              <div className="dc-emp__logoprev">{clinica.logo ? <img src={clinica.logo} alt="Logo actual" /> : <span>Sin logo: se imprime el nombre comercial</span>}</div>
              {limitarSede ? <div className="dc-emp__logoacc"><small>El logo es el mismo en todas las sedes; lo cambia la administración general.</small></div> : <div className="dc-emp__logoacc">
                <label className="dc-cfg__nuevo">
                  <Plus size={14} strokeWidth={2.2} /> {clinica.logo ? "Cambiar logo" : "Subir logo"}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={(e) => {
                    const f = e.target.files && e.target.files[0]; e.target.value = "";
                    logoDesdeArchivo(f).then((url) => { set("logo", url); notify("Logo listo. Pulsa «Guardar datos» para aplicarlo a los documentos."); })
                      .catch(() => notify("Sube una imagen PNG, JPG, SVG o WEBP."));
                  }} />
                </label>
                {clinica.logo && <button type="button" className="dc-cfg__nuevo is-sec" onClick={() => set("logo", "")}><Trash2 size={14} strokeWidth={2.2} /> Quitar</button>}
                <small>PNG con fondo transparente, horizontal. Se ajusta solo al alto del membrete.</small>
              </div>}
            </div>
          </section>

          <section className="dc-cfg__panel">
            {cab(limitarSede ? (sedes.length === 1 ? "Tu sede" : "Tus sedes") : "Sedes", limitarSede ? "Su dirección, teléfono, correo y serie salen en los documentos que emite tu sede." : "Cada sede tiene su propia dirección, teléfono, caja y agenda.", !limitarSede && <button type="button" className="dc-cfg__nuevo" onClick={() => setEdit({ tipo: "sede", item: {} })}><Plus size={14} strokeWidth={2.2} /> Nueva sede</button>)}
            <div className="dc-emp__sedes">
              {sedes.map((sd, k) => (
                <button key={sd.id} type="button" className="dc-emp__sede" style={{ "--c": SEDE_COL[k % SEDE_COL.length] }} onClick={() => (sedeEditable(sd.id) ? setEdit({ tipo: "sede", item: { ...sd } }) : notify("Solo puedes editar los datos de tu sede."))}>
                  <span className="dc-cfg__sico is-grande"><Building2 size={17} strokeWidth={2} /></span>
                  <div><b>{sd.nombre}</b><small><MapPin size={11} strokeWidth={2.2} /> {sd.direccion || "Agrega la dirección"}</small><small><Phone size={11} strokeWidth={2.2} /> {sd.telefono || "Agrega el teléfono"}</small></div>
                  <i className="dc-cfg__edit"><Pencil size={13} strokeWidth={2} /></i>
                </button>
              ))}
              {!limitarSede && <button type="button" className="dc-emp__sede is-nueva" onClick={() => setEdit({ tipo: "sede", item: {} })}><Plus size={18} strokeWidth={2.2} /><b>Agregar otra sede</b></button>}
            </div>
          </section>

          <section className="dc-cfg__panel">
            {cab("Cuentas bancarias", "Para cobros por transferencia; el asistente de WhatsApp puede compartirlas.", !limitarSede && <button type="button" className="dc-cfg__nuevo is-sec" onClick={addCuenta}><Plus size={14} strokeWidth={2.2} /> Agregar cuenta</button>)}
            {(clinica.cuentas || []).length === 0 ? <p className="dc-cfg__nada">Aún no hay cuentas registradas.</p> : (
              <div className="dc-emp__cuentas">
                {(clinica.cuentas || []).map((c, i) => {
                  const banco = BANCOS_PE.find((b) => b.id === c.banco);
                  const numLen = (c.numero || "").replace(/\D/g, "").length;
                  const cciLen = (c.cci || "").replace(/\D/g, "").length;
                  const numMal = banco && banco.cuenta.length > 0 && numLen > 0 && !banco.cuenta.includes(numLen);
                  const cciMal = cciLen > 0 && cciLen !== 20;
                  return (
                  <div key={i} className="dc-emp__cuenta">
                    <div className="dc-emp__ctop">
                      <span className="dc-emp__banco">{banco ? banco.nombre.split(" ")[0].replace(/—/, "").slice(0, 4).toUpperCase() : <Briefcase size={15} strokeWidth={2} />}</span>
                      <div className="dc-emp__cselect"><Select disabled={limitarSede} value={c.banco || ""} onChange={(v) => setCuenta(i, "banco", v)} placeholder="Elige el banco" options={BANCOS_PE.map((b) => ({ value: b.id, label: b.nombre }))} /></div>
                      <div className="dc-emp__cmon"><Select disabled={limitarSede} value={c.moneda || "PEN"} onChange={(v) => setCuenta(i, "moneda", v)} options={[{ value: "PEN", label: "Soles" }, { value: "USD", label: "Dólares" }]} /></div>
                      {!limitarSede && <button type="button" className="dc-row-action is-mal" aria-label="Eliminar cuenta" title="Eliminar" onClick={() => delCuenta(i)}><Trash2 size={14} strokeWidth={2} /></button>}
                    </div>
                    <div className="dc-emp__form is-cuenta">
                      {campo("N° de cuenta", <><input readOnly={limitarSede} className={limitarSede ? "is-ro" : numMal ? "is-warn" : ""} value={c.numero || ""} onChange={(e) => setCuenta(i, "numero", e.target.value)} placeholder={banco && banco.cuenta.length ? `${banco.cuenta.join(" o ")} dígitos` : "N° de cuenta"} />{numMal && <em>Este banco usa {banco.cuenta.join(" o ")} dígitos (tienes {numLen}).</em>}</>, 1)}
                      {campo("CCI (20 dígitos)", <><input readOnly={limitarSede} className={limitarSede ? "is-ro" : cciMal ? "is-warn" : ""} value={c.cci || ""} onChange={(e) => setCuenta(i, "cci", e.target.value.replace(/\D/g, "").slice(0, 20))} placeholder="00219100123456701234" />{cciMal && <em>Tienes {cciLen} de 20 dígitos.</em>}</>, 1)}
                      {campo("Titular", <input {...roEmp} value={c.titular || ""} onChange={(e) => setCuenta(i, "titular", e.target.value)} placeholder="Razón social o nombre" />, 1)}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="dc-cfg__panel">
            {cab("Yape y Plin", "Billeteras para pagos rápidos: celular de 9 dígitos y titular.", !limitarSede && <div className="dc-emp__bacc"><button type="button" className="dc-emp__yape" onClick={() => addBilletera("yape")}><Plus size={13} strokeWidth={2.4} /> Yape</button><button type="button" className="dc-emp__plin" onClick={() => addBilletera("plin")}><Plus size={13} strokeWidth={2.4} /> Plin</button></div>)}
            {(clinica.billeteras || []).length === 0 ? <p className="dc-cfg__nada">Aún no hay Yape ni Plin registrados.</p> : (
              <div className="dc-emp__bills">
                {(clinica.billeteras || []).map((bl, i) => {
                  const numLen = (bl.numero || "").replace(/\D/g, "").length;
                  const numMal = numLen > 0 && numLen !== 9;
                  const es = (bl.tipo || "yape").toLowerCase();
                  return (
                  <div key={i} className={`dc-emp__bill is-${es}`}>
                    <span className="dc-emp__bico"><Smartphone size={16} strokeWidth={2} /><b>{es === "yape" ? "Yape" : "Plin"}</b></span>
                    {campo("Celular", <><input readOnly={limitarSede} className={limitarSede ? "is-ro" : numMal ? "is-warn" : ""} value={bl.numero || ""} onChange={(e) => setBilletera(i, "numero", e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="987654321" />{numMal && <em>Debe tener 9 dígitos.</em>}</>)}
                    {campo("A nombre de", <input {...roEmp} value={bl.titular || ""} onChange={(e) => setBilletera(i, "titular", e.target.value)} placeholder="Titular" />)}
                    {!limitarSede && <button type="button" className="dc-row-action is-mal" aria-label="Eliminar" title="Eliminar" onClick={() => delBilletera(i)}><Trash2 size={14} strokeWidth={2} /></button>}
                  </div>
                  );
                })}
              </div>
            )}
          </section>
          {!limitarSede && <div className="dc-emp__guardar"><span>Los cambios se aplican en boletas, proformas, informes, Caja y el asistente de WhatsApp.</span><button type="button" className="dc-cfg__nuevo" onClick={guardarClinica}><Check size={15} strokeWidth={2.2} /> Guardar datos</button></div>}
        </div>
        );
      })()}

      {tab === "atencion" && (() => {
        const lbl = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 5 };
        return (
        <div style={{ display: "grid", gap: 16 }}>
          {!conectado && <div className="fm-aviso-edad"><Clock size={15} strokeWidth={2} /><span>Sin sesión, el horario se guarda en este navegador. Al guardar cambian la agenda, la capacidad del día y la disponibilidad de los doctores.</span></div>}
          {/* Horario general por día */}
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--dc-line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Horario de atención</h3>
                  <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>
                    {sedeHorario
                      ? `Horario propio de ${nomSedeCfg(sedeHorario)}. Los días que no cambies siguen el horario general${limitarSede ? ", que define la administración general" : ""}.`
                      : "Horario general de la clínica. Cada sede puede tener el suyo. El asistente no ofrecerá citas fuera de este horario."}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {/* El horario general es de toda la clínica: el usuario de sede solo ve sus sedes. */}
                  <Select small width={210} ariaLabel="Sede del horario" value={sedeHorario} onChange={setSedeHorario} disabled={limitarSede && sedesHorario.length < 2}
                          options={[...(limitarSede ? [] : [{ value: "", label: "Horario general" }]), ...sedesHorario.map((x) => ({ value: String(x.id), label: x.nombre }))]} />
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
              <div><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Feriados y excepciones</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>{limitarSede ? "Valen para toda la clínica y los define la administración general." : "Marca los feriados como cerrados, o ábrelos con un horario especial si tu clínica atiende ese día."}</div></div>
              {!limitarSede && <Btn small kind="ghost" onClick={addFeriado}><Plus size={15} strokeWidth={1.75} /> Agregar feriado</Btn>}
            </div>
            <div style={{ padding: 18, display: "grid", gap: 12 }}>
              {(clinica.feriados || []).length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Sin feriados configurados. Los días normales siguen el horario de arriba.</div>}
              {(clinica.feriados || []).map((fr, i) => (
                <fieldset key={i} disabled={limitarSede} style={{ margin: 0, minWidth: 0,  border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: 12, background: "var(--dc-white)", display: "grid", gridTemplateColumns: "150px auto 1fr auto", gap: 10, alignItems: "center" }}>
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
                  {limitarSede ? <span /> : <button type="button" className="dc-icon-btn" aria-label="Eliminar" onClick={() => delFeriado(i)} title="Eliminar" style={{ border: "1px solid var(--dc-danger-mid)", background: "var(--dc-danger-soft)", color: "var(--dc-danger)", borderRadius: "var(--dc-r-sm)", padding: "9px 11px", cursor: "pointer", marginTop: 18 }}><Trash2 size={15} strokeWidth={1.75} /></button>}
                </fieldset>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={guardarClinica} disabled={limitarSede && !sedeHorario}><Check size={15} strokeWidth={1.75} /> {limitarSede ? "Guardar horario de mi sede" : "Guardar horario"}</Btn>
          </div>
        </div>
        );
      })()}

      {/* SRV-01: el catálogo de servicios y sus precios por sede se editan en el menú
          Operación › Servicios y precios (un solo lugar). */}

      {tab === "doctores" && (
        <section className="dc-cfg__panel">
          {cab("Doctores", sedeUnicaVer != null ? `Los que atienden en ${nomSedeCfg(sedeUnicaVer)}; comisión y meta de esa sede.` : "Los doctores activos aparecen en la agenda y en el agendamiento por WhatsApp.", sedesEdit.length > 0 && <button type="button" className="dc-cfg__nuevo" onClick={() => abrirDoctor(null)}><Plus size={14} strokeWidth={2.2} /> Nuevo doctor</button>)}
          {meds.length === 0 ? <p className="dc-cfg__nada">Sin doctores aún.</p> : (
            <ListaFiltrable rows={meds} sub="doctores" defaultSort={{ key: "nombre", dir: "asc" }} vistaClave="cfg_doctores" vistas={[{ id: "tarjetas", label: "Tarjetas", icon: LayoutGrid }]} tabla={{ minWidth: 700, cols: [
              { key: "n", label: "Doctor", w: "minmax(180px,1.3fr)", cell: (m) => <PersonaCelda nombre={m.nombre} /> },
              { key: "cop", label: "COP", w: "100px", get: (m) => m.cop || "—" },
              { key: "e", label: "Especialidad", w: "minmax(150px,1fr)", get: (m) => espNombre(m.especialidadId) || "—" },
              // Sedes donde atiende (las que se ven); sin sede, se marca para asignarla.
              { key: "sd", label: "Sedes", w: "minmax(130px,.9fr)", cell: (m) => { const l = sedesMedico(m); return l.length ? <span className="dc-tp__sub">{l.filter(sedeVisible).map((x) => nomSedeCfg(x).replace(/^Sede\s+/i, "")).join(" – ")}</span> : <span className="dc-tp__sub" style={{ color: "var(--dc-warn-600)" }}>Sin sede</span>; } },
              { key: "c", label: "Comisión", w: "100px", a: "center", cell: (m) => { const c = comisionVista(m); return <span className="dc-tp__sub">{c != null ? `${c}%` : "—"}</span>; } },
              { key: "mt", label: "Meta", w: "120px", a: "right", cell: (m) => { const mt = metaVista(m); return <span className="dc-tp__num">{mt != null ? `S/ ${Number(mt).toLocaleString("es-PE")}` : "—"}</span>; } },
              { key: "s", label: "Estado", w: "110px", a: "right", cell: (m) => <span className={`dc-pill ${m.activo ? "is-ok" : ""}`}>{m.activo ? "Activo" : "Inactivo"}</span> },
            ] }} cols={[
              { key: "nombre", label: "Doctor", get: (m) => m.nombre || "" },
              { key: "esp", label: "Especialidad", get: (m) => espNombre(m.especialidadId) || "" },
              { key: "estado", label: "Estado", get: (m) => (m.activo ? "Activo" : "Inactivo") },
              { key: "com", label: "Comisión", get: (m) => (comisionVista(m) != null ? String(comisionVista(m)) : ""), sortVal: (m) => Number(comisionVista(m)) || 0 },
            ]}>{(lstD) => (
            <div className="dc-cfg__docs">
              {lstD.map((m) => { const col = colorDe(m.nombre); return (
                <article key={m.id} className={`dc-cfg__doc${m.activo ? "" : " is-off"}`}>
                  <div className="dc-cfg__dtop">
                    <span className="dc-rec__av" style={{ width: 40, height: 40, fontSize: 13, background: `linear-gradient(135deg, ${tint(col, 0.22)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(String(m.nombre).replace(/^Dra?\.\s*/, ""))}</span>
                    <div><b>{m.nombre}</b><small>{espNombre(m.especialidadId)}{m.cop ? ` – ${m.cop}` : ""}{sedeUnicaVer == null && sedesMedico(m).length ? ` – ${sedesMedico(m).filter(sedeVisible).map((x) => nomSedeCfg(x).replace(/^Sede\s+/i, "")).join(", ")}` : ""}</small></div>
                    <span className={`dc-int__est ${m.activo ? "is-ok" : ""}`}><i />{m.activo ? "Activo" : "Inactivo"}</span>
                  </div>
                  <div className="dc-cfg__dnums">
                    <div><Percent size={12} strokeWidth={2.2} /><span>Comisión</span><b>{comisionVista(m) != null ? `${comisionVista(m)}%` : "—"}</b></div>
                    <div><Target size={12} strokeWidth={2.2} /><span>Meta</span><b>{metaVista(m) != null ? `S/ ${Number(metaVista(m)).toLocaleString("es-PE")}` : "—"}</b></div>
                    <button type="button" onClick={() => abrirDoctor(m)}><Pencil size={13} strokeWidth={2} /> {medAjeno(m) ? "Comisión" : "Editar"}</button>
                  </div>
                </article>
              ); })}
            </div>
            )}</ListaFiltrable>
          )}
        </section>
      )}

      {tab === "sedes" && (
        <section className="dc-cfg__panel">
          {cab(limitarSede ? (sedes.length === 1 ? "Tu sede" : "Tus sedes") : "Sedes", ver && !limitarSede ? "Sedes que se ven con el filtro del menú." : "Locales de atención de la clínica.", !limitarSede && <button type="button" className="dc-cfg__nuevo" onClick={() => setEdit({ tipo: "sede", item: {} })}><Plus size={14} strokeWidth={2.2} /> Nueva sede</button>)}
          {sedes.length === 0 ? <p className="dc-cfg__nada">Sin sedes aún.</p> : (
            <div className="dc-cfg__docs">
              {sedes.map((sd, k) => { const col = ["#0E9199", "#D97706", "#6D4FD1", "#2F6FDE"][k % 4]; return (
                <article key={sd.id} className="dc-cfg__sede" style={{ "--c": col }}>
                  <span className="dc-cfg__sico is-grande"><Building2 size={18} strokeWidth={2} /></span>
                  <div><b>{sd.nombre}</b><small><MapPin size={11} strokeWidth={2.2} /> {sd.direccion || "Sin dirección"}</small><small><Phone size={11} strokeWidth={2.2} /> {sd.telefono || "Sin teléfono"}</small></div>
                  {sedeEditable(sd.id) && <button type="button" className="dc-row-action" aria-label={`Editar ${sd.nombre}`} title="Editar" onClick={() => setEdit({ tipo: "sede", item: { ...sd } })}><Pencil size={14} strokeWidth={2} /></button>}
                </article>
              ); })}
            </div>
          )}
        </section>
      )}

      {tab === "sillones" && (() => {
        const hoyISO = fmt(new Date());
        const citasHoy = (conectado ? citasHoySil : (demoDb?.citas || [])).filter((c) => c.fecha === hoyISO && !["cancelada", "no_show", "reprogramada"].includes(c.estado));
        const nomMed = (id) => (meds.find((m) => String(m.id) === String(id)) || {}).nombre || "";
        const ctxNom = { medicos: meds, especialidades: esps };
        const grupos = (sedes.length ? sedes : [{ id: null, nombre: "Clínica" }]).map((sd) => ({ sd, lista: sillonesDeSede(sillones, sd.id) }));
        // El sillón nuevo nace en la sede activa del menú (si se ve) o en la primera visible.
        const sedeSillonNuevo = sedeDefecto(sedesEdit);
        const ICU = { flexible: Repeat, doctor: Stethoscope, especialidad: Tag };
        return (
          <section className="dc-cfg__panel">
            {cab("Sillones", "Cada sillón puede ser flexible, el habitual de un doctor o de una especialidad. La agenda propone y valida el sillón con estas reglas.", sedesEdit.length > 0 && <button type="button" className="dc-cfg__nuevo" onClick={() => setEdit({ tipo: "sillon", item: { uso: "flexible", activo: true, exclusivo: false, sede: sedeSillonNuevo } })}><Plus size={14} strokeWidth={2.2} /> Nuevo sillón</button>)}
            <div className="dc-sil__reglas">
              {USOS_SILLON.map((u) => { const I = ICU[u.v]; return <div key={u.v} className={`is-${u.v}`}><I size={15} strokeWidth={2} /><div><b>{u.l}</b><small>{u.d}</small></div></div>; })}
              <div className="is-lock"><Lock size={15} strokeWidth={2} /><div><b>Exclusivo o preferente</b><small>Exclusivo: nadie más lo usa. Preferente: otros pueden usarlo si está libre, con aviso.</small></div></div>
            </div>
            {grupos.map(({ sd, lista }) => (
              <div key={String(sd.id)} className="dc-sil__sede">
                <h4><Building2 size={14} strokeWidth={2} /> {sd.nombre}<span>{lista.length} {lista.length === 1 ? "sillón" : "sillones"}</span></h4>
                {lista.length === 0 ? <p className="dc-cfg__nada">Sin sillones en esta sede.</p> : (
                  <div className="dc-sil__grid">
                    {lista.map((x) => { const et = etiquetaUso(x, ctxNom); const cs = citasHoy.filter((c) => String(c.sede ?? c.sedeId) === String(x.sede) && String(c.sillon) === String(x.numero)); const docsHoy = [...new Set(cs.map((c) => c.medico || nomMed(c.medicoId)).filter(Boolean))]; const I = ICU[x.uso] || Armchair; return (
                      <article key={x.id} className={`dc-sil__card is-${et.tono}`}>
                        <header>
                          <span className="dc-sil__ico"><Armchair size={18} strokeWidth={2} /></span>
                          <div><b>{x.nombre}</b><small>N.º {x.numero}</small></div>
                          <button type="button" className="dc-row-action" aria-label={`Editar ${x.nombre}`} title="Editar" onClick={() => setEdit({ tipo: "sillon", item: { ...x } })}><Pencil size={14} strokeWidth={2} /></button>
                        </header>
                        <div className="dc-sil__uso"><I size={13} strokeWidth={2.2} /> {et.txt}{x.activo && x.uso !== "flexible" && <em>{x.exclusivo ? "Exclusivo" : "Preferente"}</em>}</div>
                        {!x.activo && x.nota && <p className="dc-sil__nota"><Wrench size={12} strokeWidth={2.2} /> {x.nota}</p>}
                        <footer><Users size={12} strokeWidth={2.2} /> {cs.length ? <>Hoy: {cs.length} {cs.length === 1 ? "cita" : "citas"} · {docsHoy.join(", ")}</> : "Hoy sin citas"}</footer>
                      </article>
                    ); })}
                  </div>
                )}
              </div>
            ))}
          </section>
        );
      })()}

      {tab === "horarios" && (() => {
        const nuevo = { diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", sedeId: "" };
        return (
          <div style={{ ...card, padding: "18px 20px" }}>
            <h3 style={{ margin: "0 0 4px", color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Horarios de atención</h3>
            <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginBottom: 14 }}>Define en qué días, horas y sede atiende cada doctor. La agenda no deja citarlo fuera de estos bloques y el agente de WhatsApp solo ofrece estos horarios.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Doctor:</span>
              <Select width={240} value={medHor} onChange={setMedHor} placeholder="— Selecciona —"
                      options={meds.filter((m) => m.activo).map((m) => ({ value: m.id, label: m.nombre }))} />
            </div>
            {medHor ? (<>
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                {dispVista.length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Este doctor no tiene horarios configurados: la agenda no le pone límite de horas.</div>}
                {[...dispVista].sort((a, b) => (a.diaSemana === 0 ? 7 : a.diaSemana) - (b.diaSemana === 0 ? 7 : b.diaSemana) || String(a.horaInicio).localeCompare(String(b.horaInicio))).map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)" }}>
                    <span style={{ fontWeight: 500, color: NAVY, width: 44 }}>{(DIAS_SEM.find((x) => x.v === d.diaSemana) || {}).l || d.diaSemana}</span>
                    <span style={{ color: "var(--dc-ink-700)", fontVariantNumeric: "tabular-nums" }}>{String(d.horaInicio).slice(0, 5)} – {String(d.horaFin).slice(0, 5)}</span>
                    <span className="dc-pill">{d.sedeId != null && d.sedeId !== "" ? nomSedeCfg(d.sedeId) : "Todas las sedes"}</span>
                    <span style={{ flex: 1 }} />
                    {bloqueEditable(d) && <button onClick={() => delHorario(d)} style={{ border: "1px solid var(--dc-danger-mid)", background: "var(--dc-white)", color: RED, borderRadius: "var(--dc-r-sm)", padding: "5px 9px", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}><Trash2 size={13} strokeWidth={1.75} /> Quitar</button>}
                  </div>
                ))}
              </div>
              <HorarioNuevo inp={inp} sedes={sedesEdit} cualquiera={!limitarSede} sedeInicial={sedeDefecto(sedesEdit)} onAdd={addHorario} />
            </>) : <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Selecciona un doctor para ver y editar sus horarios.</div>}
          </div>
        );
      })()}

      {tab === "promos" && (() => {
        const hoy = fmt(new Date());
        const vigente = (p) => p.activa && (!p.desde || p.desde <= hoy) && (!p.hasta || p.hasta >= hoy);
        const promosVista = promos.filter(promoVisible);
        // La promoción nueva es de la sede elegida en el menú; con "todas", de toda la clínica
        // (el usuario de sede siempre la crea en una de sus sedes).
        const sedePromoNueva = limitarSede || ctxSede.sede !== "all" ? sedeDefecto(sedesEdit) : "";
        return (
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Promociones</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>El agente de WhatsApp ofrece SOLO las promociones vigentes, y cada una solo en su sede.</div></div>
              <Btn small onClick={() => setEdit({ tipo: "promo", item: { activa: true, sedeId: sedePromoNueva ?? "" } })}><Plus size={15} strokeWidth={1.75} /> Nueva promoción</Btn>
            </div>
            <div style={{ display: "grid", gap: 0 }}>
              {promosVista.length === 0 && <div style={{ padding: "22px 18px", color: "var(--dc-ink-500)", fontSize: 13 }}>Sin promociones. Crea una y el agente la ofrecerá cuando pregunten por precios u ofertas.</div>}
              {promosVista.map((p, i) => { const viv = vigente(p); const editable = promoEditable(p); return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: i ? "1px solid var(--dc-bg)" : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "var(--dc-r-md)", background: viv ? "var(--dc-ok-soft)" : "var(--dc-bg)", color: viv ? "var(--dc-ok-700)" : "var(--dc-ink-400)", display: "grid", placeItems: "center", flexShrink: 0 }}><Megaphone size={18} strokeWidth={1.75} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: NAVY, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{p.titulo}{p.descuento && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", padding: "2px 8px", borderRadius: "var(--dc-r-full)" }}>{p.descuento}</span>}<span style={{ fontSize: 12, fontWeight: 500, color: viv ? "var(--dc-ok-700)" : "var(--dc-ink-400)", background: viv ? "var(--dc-ok-soft)" : "var(--dc-line)", padding: "2px 8px", borderRadius: "var(--dc-r-full)" }}>{viv ? "Vigente" : (p.activa ? "Programada/vencida" : "Inactiva")}</span><span className="dc-pill"><MapPin size={11} strokeWidth={2.2} /> {p.sedeId != null && p.sedeId !== "" ? nomSedeCfg(p.sedeId) : "Toda la clínica"}</span></div>
                    <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{p.descripcion || ""}{p.especialidadId ? ` – ${espNombre(p.especialidadId)}` : ""}{p.hasta ? ` – hasta ${p.hasta}` : ""}</div>
                  </div>
                  {editable && <button onClick={() => setEdit({ tipo: "promo", item: { ...p, sedeId: p.sedeId ?? "" } })} style={{ border: "1px solid var(--dc-line)", background: "var(--dc-white)", borderRadius: "var(--dc-r-sm)", padding: "6px 11px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: DS.c.primary, display: "inline-flex", alignItems: "center", gap: 5 }}><Pencil size={13} strokeWidth={1.75} /> Editar</button>}
                  {editable && <button aria-label="Eliminar" onClick={() => delPromo(p)} style={{ border: "1px solid var(--dc-danger-mid)", background: "var(--dc-white)", color: RED, borderRadius: "var(--dc-r-sm)", padding: "6px 9px", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}><Trash2 size={13} strokeWidth={1.75} /></button>}
                </div>
              ); })}
            </div>
          </div>
        );
      })()}

      </div>
      {edit && (() => { const it = edit.item; const set = (k, v) => setEdit((e) => ({ ...e, item: { ...e.item, [k]: v } })); const T = { sede: "Sede", servicio: "Servicio", doctor: "Doctor", promo: "Promoción", sillon: "Sillón" }[edit.tipo];
        // Doctor de varias sedes (o sin sede) abierto por un usuario de sede: solo su comisión ahí.
        const docAjeno = edit.tipo === "doctor" && !!it.id && medAjeno(it);
        const roDoc = docAjeno ? { readOnly: true, style: { ...inp, marginTop: 5, background: "var(--dc-bg)", color: "var(--dc-ink-500)" } } : {};
        return (
          <Modal icon={<Settings size={20} strokeWidth={1.75} />} titulo={`${it.id ? "Editar" : "Nuevo"} ${T.toLowerCase()}`} onClose={() => setEdit(null)} maxW={460}
            footer={<><Btn small kind="ghost" onClick={() => setEdit(null)}>Cancelar</Btn><Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> Guardar</Btn></>}>
            <div style={{ display: "grid", gap: 12 }}>
              {docAjeno && <div className="fm-aviso-edad is-info"><Info size={15} strokeWidth={2} /><span>{it.nombre} también atiende en otra sede: su nombre, especialidad y estado los cambia la administración general. Aquí fijas su comisión en tu sede.</span></div>}
              {edit.tipo !== "promo" && edit.tipo !== "sillon" && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Nombre<input className="dc-premium-inp" value={it.nombre || ""} onChange={(e) => set("nombre", e.target.value)} style={{ ...inp, marginTop: 5 }} {...roDoc} placeholder={edit.tipo === "servicio" ? "Ej. Blanqueamiento dental" : edit.tipo === "doctor" ? "Ej. Dra. Carla Mendoza" : "Ej. Sede San Isidro"} /></label>}
              {edit.tipo === "servicio" && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Precio (S/)<input className="dc-premium-inp" type="number" value={it.precioBase ?? ""} onChange={(e) => set("precioBase", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="80" /></label>}
              {edit.tipo === "promo" && <>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Título<input className="dc-premium-inp" value={it.titulo || ""} onChange={(e) => set("titulo", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Ej. Blanqueamiento con 20% dto" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Descripción<input className="dc-premium-inp" value={it.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Detalle breve de la promo" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Descuento<input className="dc-premium-inp" value={it.descuento || ""} onChange={(e) => set("descuento", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="20% – S/ 50 – 2x1" /></label>
                {/* Sede de la promoción: el agente solo la ofrece ahí (los precios cambian por sede). */}
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Sede<Select value={it.sedeId ?? ""} onChange={(v) => set("sedeId", v)} placeholder="— Selecciona —" disabled={limitarSede && sedesEdit.length < 2} options={[...(limitarSede ? [] : [{ value: "", label: "Toda la clínica" }]), ...sedesEdit.map((x) => ({ value: x.id, label: x.nombre }))]} /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Aplica a (servicio, opcional)<Select value={it.especialidadId || ""} onChange={(v) => set("especialidadId", v)} placeholder="Todos" options={[{ value: "", label: "Todos" }, ...esps.map((e) => ({ value: e.id, label: e.nombre }))]} /></label>
                <div style={{ display: "flex", gap: 10 }}>
                  <label style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Desde<input className="dc-premium-inp" type="date" value={it.desde || ""} onChange={(e) => set("desde", e.target.value)} style={{ ...inp, marginTop: 5 }} /></label>
                  <label style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Hasta<input className="dc-premium-inp" type="date" value={it.hasta || ""} onChange={(e) => set("hasta", e.target.value)} style={{ ...inp, marginTop: 5 }} /></label>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--dc-ink-700)", cursor: "pointer" }}><input type="checkbox" checked={it.activa !== false} onChange={(e) => set("activa", e.target.checked)} /> Activa (el agente la ofrece si está vigente)</label>
              </>}
              {edit.tipo === "doctor" && (() => {
                // Sedes: la administración general las elige; el usuario de sede solo al dar de alta
                // (y entre las suyas). Sin sede el doctor saldría en la agenda de todas.
                const editaSedes = !it.id || !limitarSede;
                const marcadas = it.sedesForm || [];
                const toggleSede = (id) => set("sedesForm", marcadas.some((x) => mismaSede(x, id)) ? marcadas.filter((x) => !mismaSede(x, id)) : [...marcadas, id]);
                // % por sede del usuario de sede (no toca el % base del doctor).
                const sedesCom = limitarSede ? (it.id ? sedesMedico(it).filter((x) => sedeEditable(x) && sedeVisible(x)) : marcadas) : [];
                const porSede = it.id ? porSedeDe(it) : [];
                return <>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Especialidad<Select value={it.especialidadId || ""} onChange={(v) => set("especialidadId", v)} disabled={docAjeno} placeholder="— Selecciona —" options={esps.map((e) => ({ value: e.id, label: e.nombre }))} /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>CMP/COP (opcional)<input className="dc-premium-inp" value={it.cop || ""} onChange={(e) => set("cop", e.target.value)} style={{ ...inp, marginTop: 5 }} {...roDoc} placeholder="COP 12345" /></label>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Sedes donde atiende</span>
                  {editaSedes ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {/* La administración general asigna cualquier sede de la clínica (aunque el menú filtre una). */}
                      {(limitarSede ? sedesEdit : sedesTodas).map((sd) => { const on = marcadas.some((x) => mismaSede(x, sd.id)); return (
                        <button key={sd.id} type="button" aria-pressed={on} onClick={() => toggleSede(sd.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: "var(--dc-r-full)", border: on ? `1.5px solid ${NAVY}` : "1.5px solid var(--dc-line)", background: on ? "var(--dc-bg)" : "var(--dc-white)", color: on ? NAVY : "var(--dc-ink-500)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{on ? <Check size={13} strokeWidth={2.4} /> : <MapPin size={13} strokeWidth={2} />} {sd.nombre}</button>
                      ); })}
                    </div>
                  ) : <div style={{ marginTop: 6, fontSize: 13, color: "var(--dc-ink-700)" }}>{marcadas.length ? marcadas.map((x) => nomSedeCfg(x)).join(" – ") : "Sin sede"}<small style={{ display: "block", color: "var(--dc-ink-500)", marginTop: 2 }}>Las sedes de un doctor las asigna la administración general.</small></div>}
                </div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Usuario vinculado<input className="dc-premium-inp" value={it.usuarioId || it.usuario || ""} readOnly style={{ ...inp, marginTop: 5, background: "var(--dc-bg)" }} placeholder="Sin usuario vinculado" /></label>
                {!limitarSede && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Comisión base %<input className="dc-premium-inp" type="number" min="0" max="100" value={it.porcentajeComision ?? ""} onChange={(e) => set("porcentajeComision", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Ej. 40" /></label>}
                {sedesCom.map((sd) => (
                  <label key={String(sd)} style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>% de comisión en {nomSedeCfg(sd)}<input className="dc-premium-inp" type="number" min="0" max="100" value={(it.comSede || {})[sd] ?? ""} onChange={(e) => set("comSede", { ...(it.comSede || {}), [sd]: e.target.value })} style={{ ...inp, marginTop: 5 }} placeholder={it.porcentajeComision != null ? `${it.porcentajeComision} (el de su ficha)` : "Ej. 40"} /></label>
                ))}
                {/* Meta y % por sede: un solo lugar para editarlos (Metas y comisiones). */}
                <div className="dc-cfg__metas">
                  <div><b>Meta mensual por sede</b><span>Se fija sede por sede, con su propio % si hace falta.</span></div>
                  {porSede.length > 0 && <ul>{porSede.map((x) => <li key={String(x.sede)}><span>{nomSedeCfg(x.sede)}{x.com != null ? ` · ${x.com}%` : ""}</span><b>{x.meta != null ? `S/ ${Number(x.meta).toLocaleString("es-PE")}` : "Sin meta"}</b></li>)}</ul>}
                  <button type="button" onClick={() => { setEdit(null); window.location.hash = "#/metas"; }}><Target size={13} strokeWidth={2.2} /> Editar en Metas y comisiones</button>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--dc-ink-500)" }}>Su sillón fijo, si lo tiene, se define en Configuración › Sillones.</p>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--dc-ink-700)", cursor: docAjeno ? "default" : "pointer" }}><input type="checkbox" disabled={docAjeno} checked={it.activo !== false} onChange={(e) => set("activo", e.target.checked)} /> Activo (visible en agenda y WhatsApp)</label>
                </>;
              })()}
              {edit.tipo === "sillon" && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Nombre<input className="dc-premium-inp" value={it.nombre || ""} onChange={(e) => set("nombre", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Ej. Sillón Kids" /></label>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>N.º<input className="dc-premium-inp" type="number" min="1" value={it.numero ?? ""} onChange={(e) => set("numero", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="1" /></label>
                </div>
                {sedesEdit.length > 0 && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Sede<Select value={it.sede ?? ""} onChange={(v) => set("sede", v)} placeholder="— Selecciona —" disabled={sedesEdit.length < 2 && it.sede != null && it.sede !== ""} options={sedesEdit.map((x) => ({ value: x.id, label: x.nombre }))} /></label>}
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Uso del sillón</span>
                  <div className="dc-sil__usos" role="radiogroup" aria-label="Uso del sillón">
                    {USOS_SILLON.map((u) => <button key={u.v} type="button" role="radio" aria-checked={it.uso === u.v} className={it.uso === u.v ? "is-on" : ""} onClick={() => set("uso", u.v)}><b>{u.l}</b><small>{u.d}</small></button>)}
                  </div>
                </div>
                {it.uso === "doctor" && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Doctor<Select value={it.medicoId ?? ""} onChange={(v) => set("medicoId", v)} placeholder="— Selecciona —" options={meds.filter((m) => m.activo !== false).map((m) => ({ value: m.id, label: m.nombre }))} /></label>}
                {it.uso === "especialidad" && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Especialidad<Select value={it.especialidadId ?? ""} onChange={(v) => set("especialidadId", v)} placeholder="— Selecciona —" options={esps.map((e) => ({ value: e.id, label: e.nombre }))} /></label>}
                {it.uso !== "flexible" && <label className="dc-sil__chk"><input type="checkbox" checked={!!it.exclusivo} onChange={(e) => set("exclusivo", e.target.checked)} /><span><b>Exclusivo</b><small>{it.exclusivo ? (it.uso === "doctor" ? "Solo ese doctor puede usarlo." : "Solo citas de esa especialidad.") : "Preferente: otros pueden usarlo si está libre, con aviso."}</small></span></label>}
                <label className="dc-sil__chk"><input type="checkbox" checked={it.activo !== false} onChange={(e) => set("activo", e.target.checked)} /><span><b>En servicio</b><small>{it.activo !== false ? "Disponible para agendar." : "No se puede agendar en este sillón."}</small></span></label>
                {it.activo === false && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Motivo<input className="dc-premium-inp" value={it.nota || ""} onChange={(e) => set("nota", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Ej. mantenimiento de la lámpara" /></label>}
              </>}
              {edit.tipo === "sede" && <>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Dirección<input className="dc-premium-inp" value={it.direccion || ""} onChange={(e) => set("direccion", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Av. Conquistadores 145, San Isidro" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Teléfono<input className="dc-premium-inp" value={it.telefono || ""} onChange={(e) => set("telefono", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="01 234 5678" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Horario para documentos<input className="dc-premium-inp" value={it.horarioDocumento || ""} onChange={(e) => set("horarioDocumento", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Lun a vie 9:00–19:00 – sáb 9:00–14:00" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Correo de la sede<input className="dc-premium-inp" type="email" value={it.correo || ""} onChange={(e) => set("correo", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="sede@clinica.pe" /></label>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Serie de documentos<input className="dc-premium-inp" value={it.serieDocumento || ""} onChange={(e) => set("serieDocumento", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))} style={{ ...inp, marginTop: 5 }} placeholder="SI" /></label>
                <p style={{ margin: 0, fontSize: 12, color: "var(--dc-ink-500)" }}>Dirección, teléfono, horario y correo salen en el membrete de los documentos que se emiten desde esta sede. La serie encabeza su numeración.</p>
                {it.direccion && <a className="dc-emp__mapa" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.direccion)}`} target="_blank" rel="noreferrer"><MapPin size={14} strokeWidth={2} /> Ver en Google Maps</a>}
              </>}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
function HorarioNuevo({ inp, sedes, onAdd, cualquiera = true, sedeInicial = null }) {
  const [d, setD] = useState({ diaSemana: 1, horaInicio: "09:00", horaFin: "13:00", sedeId: sedeInicial ?? "" });
  // Si cambia la sede del menú, el bloque nuevo se propone en esa sede.
  useEffect(() => { setD((x) => ({ ...x, sedeId: sedeInicial ?? "" })); }, [sedeInicial]);
  return (
    <div style={{ borderTop: "1px dashed var(--dc-line)", paddingTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Día<br /><Select width={150} value={d.diaSemana} onChange={(v) => setD({ ...d, diaSemana: Number(v) })} options={DIAS_SEM.map((x) => ({ value: x.v, label: x.l }))} /></label>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Desde<br /><input className="dc-premium-inp" type="time" value={d.horaInicio} onChange={(e) => setD({ ...d, horaInicio: e.target.value })} style={{ ...inp, width: "auto", marginTop: 4 }} /></label>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Hasta<br /><input className="dc-premium-inp" type="time" value={d.horaFin} onChange={(e) => setD({ ...d, horaFin: e.target.value })} style={{ ...inp, width: "auto", marginTop: 4 }} /></label>
      {sedes.length > 0 && <label style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Sede<br /><Select width={190} value={d.sedeId} onChange={(v) => setD({ ...d, sedeId: v })} placeholder={cualquiera ? "Cualquiera" : "— Selecciona —"} options={[...(cualquiera ? [{ value: "", label: "Cualquiera" }] : []), ...sedes.map((s) => ({ value: s.id, label: s.nombre }))]} /></label>}
      <Btn small onClick={() => onAdd(d)}><Plus size={14} strokeWidth={1.75} /> Agregar horario</Btn>
    </div>
  );
}

export default Configuracion;
