/* Modal de agendado desde recepción + botón de consulta RENIEC.
   Lo usan App.jsx (Agenda, Espera) y el inbox de WhatsApp, así que vive aparte
   para que el módulo de WhatsApp pueda cargarse en su propio chunk. */
import React, { useState, useEffect, useContext, useRef } from "react";
import { Calendar, Check, ChevronRight, Clock, MessageSquare, Phone, Plus, Search, User, AlertTriangle, Armchair, Info, Lock, Star } from "lucide-react";
import { estadoSillones, evaluarCita, sugerirSillon, turnosDelDia, sillonesDeSede, etiquetaUso, yaPaso, motivoPasado } from "./sillones";
import { useReglasAgenda } from "./useReglasAgenda";
import { CATALOGO_SEED, precioCita, precioServicio } from "./catalogo";
import api, { auth } from "../api/client";
import { sedeApiUuid } from "../routing";
import {Btn, DS, DatosDemoCtx, ESPECIALIDADES, HORAS_SEL, MEDICOS, Modal, NAVY, SEDES, Select, addDays, calcEdad, espsDe, fechaLegible, fmt, hoy, horarioDeSede, jornadaClinica, mismaSede, sedeNum, sedesDe, toMin, tint, useSede, validarFormPaciente} from "../comun";

/* ---- RENIEC: autocompletar nombres desde el DNI (solo datos reales del backend) ---- */
export async function reniecLookup(dni) {
  const clean = String(dni || "").trim();
  if (!/^\d{8}$/.test(clean)) return { ok: false, msg: "DNI inválido: ingresa 8 dígitos numéricos." };
  if (!auth.token) return { ok: false, msg: "Inicia sesión para consultar RENIEC o ingresa el nombre manualmente." };
  try {
    const r = await api.reniec(clean);
    if (r && r.nombreCompleto && !r.error) return { ok: true, nombre: r.nombreCompleto, dni: clean, msg: "Nombres traídos de RENIEC." };
    if (r && r.configurado === false) return { ok: false, msg: "RENIEC no está configurado para esta clínica. Ingresa el nombre manualmente." };
    if (r && r.error) return { ok: false, msg: r.error };
    return { ok: false, msg: "No se encontraron datos para este DNI." };
  } catch (e) {
    return { ok: false, msg: "Sin conexión con RENIEC. Ingresa el nombre manualmente." };
  }
}

export function BtnReniec({ dni, onNombre, notify }) {
  const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); const r = await reniecLookup(dni); setLoading(false); if (r.ok) onNombre(r.nombre); notify(r.msg); };
  return <button type="button" onClick={run} disabled={loading} title="Traer nombres desde RENIEC" style={{ whiteSpace: "nowrap", background: (tint(DS.c.primary, 0.078)), color: DS.c.primary, border: "1.5px solid " + tint("var(--dc-accent-cyan)", 0.2), borderRadius: "var(--dc-r-md)", padding: "0 12px", fontSize: 13, fontWeight: 500, cursor: loading ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: loading ? 0.6 : 1 }}><Search size={14} strokeWidth={1.75} /> {loading ? "Consultando…" : "Autocompletar"}</button>;
}

/* ---- Alta rápida de paciente (desde Agendar cita y desde WhatsApp) ----
   Pide lo mínimo para que la ficha sirva: nombre, DNI, celular (los recordatorios salen
   por WhatsApp) y fecha de nacimiento; si es menor de edad, su apoderado. Valida con la
   misma regla que el formulario de Pacientes (validarFormPaciente). */
export const PAC_RAPIDO_VACIO = { nombre: "", dni: "", telefono: "", nacimiento: "", apoderadoNombre: "", apoderadoParentesco: "", apoderadoDni: "", apoderadoTelefono: "" };
// Mismo listado cerrado que el formulario de Pacientes.
const PARENTESCOS_RAP = ["Madre", "Padre", "Abuelo/a", "Tutor legal", "Hermano/a mayor", "Tío/a", "Otro"];
/** Celular de 9 dígitos sin el +51 (como lo guarda Pacientes). */
export const celular9 = (t) => String(t || "").replace(/\D/g, "").replace(/^51(?=\d{9}$)/, "").slice(-9);

export function validarPacienteRapido(d) {
  const v = validarFormPaciente({ ...d, telefono: celular9(d.telefono) }, fmt(hoy));
  const e = { ...v.errors };
  // Aquí el celular es obligatorio: sin él no le llegan los recordatorios.
  const tel = String(d.telefono || "").replace(/\D/g, "");
  if (!tel) e.telefono = "El celular es obligatorio: por ahí salen los recordatorios.";
  else if (celular9(tel).length !== 9 || !/^\d{9}$|^51\d{9}$/.test(tel)) e.telefono = "Celular: 9 dígitos (ej. 999888777).";
  // Mismo orden que los campos en pantalla: el primer error es el primero que se ve.
  const errors = {};
  ["dni", "nombre", "telefono", "nacimiento", "apoderadoNombre", "apoderadoParentesco", "apoderadoDni", "apoderadoTelefono"].forEach((k) => { if (e[k]) errors[k] = e[k]; });
  const keys = Object.keys(errors);
  return { ok: keys.length === 0, errors, first: keys[0] || null };
}

/** Registra al paciente (demo o servidor) en la sede indicada y lo devuelve con su id. */
export async function registrarPacienteRapido(d, { demoDb, sede }) {
  const nombre = d.nombre.trim(), dni = d.dni.trim(), telefono = celular9(d.telefono);
  const apod = { apoderadoNombre: (d.apoderadoNombre || "").trim(), apoderadoParentesco: d.apoderadoParentesco || "", apoderadoDni: (d.apoderadoDni || "").trim(), apoderadoTelefono: d.apoderadoTelefono ? celular9(d.apoderadoTelefono) : "" };
  if (!auth.token && demoDb) {
    const id = Math.max(0, ...(demoDb.pacientes || []).map((p) => Number(p.id) || 0)) + 1;
    const sid = sedeNum(sede);
    const p = { id, nombre, dni, telefono, email: "", nacimiento: d.nacimiento, sede: sid, sedes: sid != null ? [sid] : [], ultima: null, creadoEn: new Date().toISOString(), ...apod };
    demoDb.setPacientes((ps) => [...ps, p]);
    return p;
  }
  const r = await api.pacientes.crear({ nombre, dni, telefono, fechaNacimiento: d.nacimiento, sedeRegistroId: sedeApiUuid(sede), ...apod });
  return { ...(r || {}), id: r?.id, nombre: r?.nombre || nombre, dni: r?.dni || dni };
}

/** Campos del alta rápida. `set(parcial)` actualiza y limpia el error de ese campo. */
export function CamposPacienteRapido({ v, set, err = {}, notify, existente = null, onUsarExistente }) {
  const inpR = (bad) => ({ width: "100%", padding: "8px 11px", borderRadius: "var(--dc-r-md)", border: `1.5px solid ${bad ? "var(--dc-red)" : "var(--dc-line)"}`, fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box", minWidth: 0 });
  const lblR = { fontSize: 12, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 4 };
  const msg = (k) => err[k] ? <small role="alert" style={{ display: "block", color: "var(--dc-red)", fontSize: 12, marginTop: 3 }}>{err[k]}</small> : null;
  const edad = v.nacimiento ? calcEdad(v.nacimiento) : null;
  const menor = edad != null && edad < 18;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="dc-premium-inp" value={v.dni} inputMode="numeric" aria-label="DNI" aria-invalid={!!err.dni} onChange={(e) => set({ dni: e.target.value.replace(/[^\d]/g, "").slice(0, 8) })} placeholder="DNI (8 dígitos)" style={{ ...inpR(err.dni), flex: 1 }} />
          <BtnReniec dni={v.dni} onNombre={(n) => set({ nombre: n })} notify={notify} />
        </div>
        {msg("dni")}
        {existente && <div style={{ marginTop: 6, fontSize: 12, color: "var(--dc-warn-ink)", background: "var(--dc-warn-soft)", border: "1px solid var(--dc-amber-soft)", borderRadius: "var(--dc-r-md)", padding: "6px 9px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>Ese DNI ya es de <b>{existente.nombre}</b>.</span>
          {onUsarExistente && <button type="button" onClick={onUsarExistente} style={{ background: "none", border: "none", padding: 0, color: DS.c.primary, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Usar su ficha</button>}
        </div>}
      </div>
      <div><input className="dc-premium-inp" value={v.nombre} aria-label="Nombre completo" aria-invalid={!!err.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Nombre completo" style={inpR(err.nombre)} />{msg("nombre")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
        <label><span style={lblR}>Celular</span><input className="dc-premium-inp" value={v.telefono} inputMode="tel" aria-invalid={!!err.telefono} onChange={(e) => set({ telefono: e.target.value.replace(/[^\d+\s]/g, "").slice(0, 16) })} placeholder="9 dígitos" style={inpR(err.telefono)} />{msg("telefono")}</label>
        <label><span style={lblR}>Fecha de nacimiento</span><input className="dc-premium-inp" type="date" max={fmt(hoy)} value={v.nacimiento} aria-invalid={!!err.nacimiento} onChange={(e) => set({ nacimiento: e.target.value })} style={inpR(err.nacimiento)} />{msg("nacimiento")}</label>
      </div>
      {menor && <div style={{ display: "grid", gap: 8, padding: 10, borderRadius: "var(--dc-r-md)", background: "var(--dc-bg-soft, #F7FAFB)", border: "1px solid var(--dc-line)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dc-ink-700)" }}>Menor de edad ({edad} años): datos del apoderado</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
          <div><input className="dc-premium-inp" value={v.apoderadoNombre} aria-label="Nombre del apoderado" onChange={(e) => set({ apoderadoNombre: e.target.value })} placeholder="Nombre del apoderado" style={inpR(err.apoderadoNombre)} />{msg("apoderadoNombre")}</div>
          <div><Select value={v.apoderadoParentesco} onChange={(x) => set({ apoderadoParentesco: x })} placeholder="Parentesco" options={PARENTESCOS_RAP.map((p) => ({ value: p, label: p }))} />{msg("apoderadoParentesco")}</div>
          <div><input className="dc-premium-inp" value={v.apoderadoDni} inputMode="numeric" aria-label="DNI del apoderado" onChange={(e) => set({ apoderadoDni: e.target.value.replace(/[^\d]/g, "").slice(0, 8) })} placeholder="DNI del apoderado" style={inpR(err.apoderadoDni)} />{msg("apoderadoDni")}</div>
          <div><input className="dc-premium-inp" value={v.apoderadoTelefono} inputMode="tel" aria-label="Celular del apoderado" onChange={(e) => set({ apoderadoTelefono: e.target.value.replace(/[^\d+\s]/g, "").slice(0, 16) })} placeholder="Celular del apoderado" style={inpR(err.apoderadoTelefono)} />{msg("apoderadoTelefono")}</div>
        </div>
      </div>}
    </div>
  );
}

function citaFueraDeHorario(fecha, hora, duracionMin, horario, feriados, sedeIdNum) {
  const j = jornadaClinica(horarioDeSede(horario, sedeIdNum), feriados || [], fecha);
  if (!j.abierta) return { fuera: true, msg: j.feriado ? "Ese día está marcado como feriado/cerrado." : "La clínica no abre ese día." };
  const inicio = toMin(hora);
  const fin = inicio + (Number(duracionMin) || 30);
  const abre = toMin(j.abre || "09:00");
  const cierra = toMin(j.cierra || "19:00");
  if (inicio < abre || fin > cierra) {
    return { fuera: true, msg: `La cita (${hora} + ${duracionMin || 30} min) queda fuera del horario ${j.abre}–${j.cierra}.` };
  }
  return { fuera: false, msg: "" };
}

function sedeNumDeUuid(seds, uuid) {
  // Número de la sede en el registro (GET /sedes); las claves del horario por sede usan ese número.
  return uuid ? sedeNum(uuid) : null;
}

/* ---- Agendar cita (Recepción): registra el canal de origen (llamada / WhatsApp / presencial) ---- */
export function AgendarRecepcionModal({ onClose, onCreada, notify, base, rol: rolProp }) {
  const rol = rolProp || auth.sesion?.rol || "";
  const puedeForzar = rol === "admin" || rol === "gerencia";
  const bloqueadoForzar = rol === "recepcion" || rol === "admin_sede";
  // Sede: la cita se registra en una de las sedes que el usuario ve ahora (filtro del menú).
  // Por defecto la de la cita de origen o la sede activa, nunca la primera de la lista:
  // así el admin de Surco no deja citas en San Isidro sin darse cuenta.
  const { ids: sedesVer, activa: sedeActivaCtx, pacientes: pacSede } = useSede();
  const sedePermitida = (id) => !sedesVer || sedesVer.some((w) => mismaSede(id, w));
  const [pac, setPac] = useState([]); const [meds, setMeds] = useState([]); const [esps, setEsps] = useState([]); const [seds, setSeds] = useState([]);
  const [pacTodos, setPacTodos] = useState([]);   // todas las sedes: solo para hallar un DNI exacto y no duplicar fichas
  const [nuevo, setNuevo] = useState(null);         // alta rápida de paciente (formulario abierto)
  const [nuevoErr, setNuevoErr] = useState({});
  // Paciente nuevo ya validado: se registra recién al agendar. Si se cierra el modal sin
  // agendar no queda una ficha a medias (antes se creaba al pulsar «Crear y usar»).
  const [pacNuevo, setPacNuevo] = useState(null);
  const ligadoRef = useRef(false);                  // el nombre que trae la lista de espera se liga una sola vez
  const [horarioClinica, setHorarioClinica] = useState({ horario: {}, feriados: [] });
  const [avisoHorario, setAvisoHorario] = useState(null);
  const [f, setF] = useState({ pacienteId: base?.pacienteId || "", especialidadId: base?.especialidadId || "", medicoId: base?.medicoId || "", sedeId: base?.sedeId || sedeActivaCtx || "", fecha: base?.fecha || addDays(1), hora: base?.hora || "10:00", duracionMin: 30, sillon: base?.sillon != null ? String(base.sillon) : "", repetir: "no", veces: 4, avisar: false, motivo: base?.motivo || "", nota: "", canal: base?.canal || "llamada" });
  // La sede elegida se ajusta a la lista permitida (id de la demo o UUID del servidor):
  // si la de origen no es del usuario, pasa a su sede activa o a la primera que ve.
  const fijarSede = (list) => setF((x) => {
    const de = (v) => (v == null || v === "" ? null : (list.find((s) => mismaSede(s.id, v)) || {}).id ?? null);
    const sid = de(x.sedeId) ?? de(sedeActivaCtx) ?? list[0]?.id ?? "";
    return String(sid) === String(x.sedeId) ? x : { ...x, sedeId: sid, sillon: "" };
  });
  // Demostración: sin servidor se usan los pacientes, doctores, sedes y la agenda del
  // propio sistema, y la cita se guarda en la agenda compartida (antes el modal quedaba
  // vacío y no se podía agendar a nadie).
  const demoDb = useContext(DatosDemoCtx);
  const demo = !auth.token && !!demoDb;
  const mapPac = (p) => ({ id: p.id, nombre: p.nombre, dni: p.dni });
  // Sedes de un paciente: las de la demo o, con API, la sede donde se registró.
  const sedesPac = (p) => (demo ? sedesDe(p) : [].concat(p.sedeIds ?? p.sedeRegistroId ?? []));
  const cargarPac = () => {
    // El buscador lista solo pacientes de las sedes que se ven; el total sirve para no duplicar un DNI.
    const poner = (todos, visibles) => {
      // El paciente que trae la cita de origen (ficha, WhatsApp) siempre está en la lista.
      const pid = base?.pacienteId;
      const extra = pid != null && pid !== "" && !visibles.some((p) => String(p.id) === String(pid)) ? todos.filter((p) => String(p.id) === String(pid)) : [];
      setPacTodos(todos.map(mapPac)); setPac([...visibles, ...extra].map(mapPac));
      // Con sesión, GET /pacientes a veces aún no trae a un paciente recién creado (p. ej. el
      // de la lista de espera): se pide suelto y, si tampoco llega, se usa el nombre que trae.
      if (!demo && pid != null && pid !== "" && !todos.some((p) => String(p.id) === String(pid))) {
        const sumar = (p) => { setPacTodos((xs) => xs.some((x) => String(x.id) === String(p.id)) ? xs : [...xs, mapPac(p)]); setPac((xs) => xs.some((x) => String(x.id) === String(p.id)) ? xs : [...xs, mapPac(p)]); };
        api.pacientes.ver(pid).then((p) => sumar(p && p.id != null ? p : { id: pid, nombre: base?.pacienteNombre || "Paciente", dni: "" }))
          .catch(() => { if (base?.pacienteNombre) sumar({ id: pid, nombre: base.pacienteNombre, dni: "" }); });
      }
      // Desde la lista de espera llega solo el nombre y desde WhatsApp el celular: se liga a
      // su ficha si existe; si no, se abre el alta rápida con lo que ya se sabe.
      if (ligadoRef.current || base?.pacienteId || (!base?.pacienteNombre && !base?.telefono)) return;
      ligadoRef.current = true;
      const nom = String(base.pacienteNombre || "").trim().toLowerCase();
      const tel = celular9(base.telefono);
      const hit = (tel && visibles.find((p) => celular9(p.telefono) === tel)) || (nom && visibles.find((p) => String(p.nombre || "").trim().toLowerCase() === nom));
      if (hit) setF((x) => (x.pacienteId ? x : { ...x, pacienteId: hit.id }));
      else setNuevo((n) => n || { ...PAC_RAPIDO_VACIO, nombre: base.pacienteNombre || "", telefono: tel });
    };
    if (demo) { const todos = demoDb.pacientes || []; poner(todos, pacSede || todos); return Promise.resolve(); }
    return api.pacientes.listar().then((r) => { const todos = r || []; poner(todos, todos.filter((p) => { const ss = sedesPac(p); return !ss.length || ss.some(sedePermitida); })); }).catch(() => {});
  };
  useEffect(() => {
    if (demo) {
      cargarPac();
      setEsps(ESPECIALIDADES.map((e) => ({ id: e.id, nombre: e.nombre, duracionMin: e.duracionMin })));
      setMeds(MEDICOS.map((m) => ({ id: m.id, nombre: m.nombre, especialidadId: m.esp, esps: espsDe(m), sedes: sedesDe(m) })));
      const list = SEDES.filter((x) => sedePermitida(x.id)).map((x) => ({ id: x.id, nombre: x.nombre }));
      setSeds(list); fijarSede(list);
      if (demoDb.horarioClinica) setHorarioClinica({ horario: demoDb.horarioClinica.horario || {}, feriados: demoDb.horarioClinica.feriados || [] });
      return;
    }
    cargarPac();
    api.catalogo.especialidades().then((r) => setEsps(r || [])).catch(() => {});
    // Sedes del doctor tal como las da el API (lista de ids u objetos, o una sola sedeId).
    api.catalogo.medicos().then((r) => setMeds((r || []).map((m) => ({ ...m, sedes: (m.sedes || m.sedeIds || (m.sedeId != null ? [m.sedeId] : [])).map((x) => x?.id ?? x) })))).catch(() => {});
    api.sedes.listar().then((r) => {
      const list = (r || []).filter((x) => sedePermitida(x.id));
      setSeds(list); fijarSede(list);
    }).catch(() => {});
    api.clinica.get().then((r) => setHorarioClinica({ horario: (r?.horario && typeof r.horario === "object") ? r.horario : {}, feriados: Array.isArray(r?.feriados) ? r.feriados : [] })).catch(() => {});
  }, []); // eslint-disable-line
  // Desde la lista de espera llega el servicio por nombre (o su id): se preselecciona en
  // cuanto el catálogo está cargado.
  useEffect(() => {
    if (f.especialidadId || !esps.length || !(base?.especialidadNombre || base?.especialidadId)) return;
    const nom = String(base.especialidadNombre || "").trim().toLowerCase();
    const e = esps.find((x) => base.especialidadId != null && String(x.id) === String(base.especialidadId)) || (nom && esps.find((x) => String(x.nombre || "").trim().toLowerCase() === nom));
    if (e) setF((x) => (x.especialidadId ? x : { ...x, especialidadId: e.id }));
  }, [esps]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reglas de la agenda: sillones (con su uso), horario de cada doctor y bloqueos.
  const reglas = useReglasAgenda();
  const [citasDia, setCitasDia] = useState([]);   // con sesión: las citas del día elegido
  const [sillonAuto, setSillonAuto] = useState(!base?.sillon);
  useEffect(() => {
    if (demo || !f.fecha) return;
    api.citas.listar(f.fecha).then((r) => setCitasDia((r || []).map((c) => ({ ...c, sede: c.sedeId ?? c.sede, hora: String(c.hora || "").slice(0, 5) })))).catch(() => setCitasDia([]));
  }, [f.fecha]); // eslint-disable-line
  const ctxReglas = { ...reglas, citas: demo ? (demoDb.citas || []) : citasDia, medicos: (reglas.medicos && reglas.medicos.length) ? reglas.medicos : meds, especialidades: (reglas.especialidades && reglas.especialidades.length) ? reglas.especialidades : esps };
  const sillonesSede = (() => {
    const l = sillonesDeSede(reglas.sillones, f.sedeId || null);
    // Con sesión no se inventan sillones: si la sede no tiene, se avisa que hay que configurarlos.
    if (l.length || !demo) return l;
    return [1, 2, 3, 4].map((n) => ({ id: `x${n}`, sede: f.sedeId, numero: n, nombre: `Sillón ${n}`, uso: "flexible", activo: true }));
  })();
  const ctxSede = { ...ctxReglas, sillones: sillonesSede };
  const medSel = (ctxReglas.medicos || []).find((m) => String(m.id) === String(f.medicoId));
  // Sedes donde atiende un doctor: las de su ficha o, si no las trae, las de su horario.
  const sedesMed = (m) => {
    const fijas = (m?.sedes || []).filter((x) => x != null && x !== "");
    if (fijas.length) return fijas;
    return [...new Set((ctxReglas.disp || []).filter((d) => String(d.medicoId) === String(m?.id)).map((d) => d.sede ?? d.sedeId).filter((x) => x != null))];
  };
  /** ¿El doctor atiende en esa sede? Sin dato de sede no se restringe. */
  const atiendeEn = (m, sid) => { if (!m || sid == null || sid === "") return true; const ss = sedesMed(m); return !ss.length || ss.some((x) => mismaSede(x, sid)); };
  // Especialidades del doctor: la principal y las demás que tenga (p. ej. general y periodoncia).
  const espsMed = (m) => [m.especialidadId, m.esp, ...(m.esps || [])].filter((x) => x != null).map(String);
  const citaBorrador = (extra = {}) => ({ medicoId: f.medicoId, esp: f.especialidadId || (medSel ? (medSel.esp ?? medSel.especialidadId) : null), sede: f.sedeId, fecha: f.fecha, hora: f.hora, duracionMin: Number(f.duracionMin) || 30, sillon: f.sillon ? Number(f.sillon) : null, pacienteId: f.pacienteId || null, ...extra });
  const [masDatos, setMasDatos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [abrePac, setAbrePac] = useState(false);
  const [busca, setBusca] = useState("");
  const [horaAuto, setHoraAuto] = useState(!base?.hora);
  // DC-51: primera hora libre al abrir / cambiar fecha.
  useEffect(() => {
    if (!horaAuto || !f.fecha) return;
    const ocupadas = new Set();
    // Con doctor elegido cuenta cualquier cita suya (no puede estar en dos sedes a la vez);
    // sin doctor, solo las de la sede elegida: una cita en otra sede no ocupa estos sillones.
    const deLaSede = (c) => !!f.medicoId || !f.sedeId || (c.sedeId ?? c.sede) == null || mismaSede(c.sedeId ?? c.sede, f.sedeId);
    const apply = () => {
      // Primera hora libre DENTRO del horario de la clínica y, si es hoy, no pasada
      // (antes proponía las 06:00 y luego el propio modal rechazaba guardar).
      const sedeN = sedeNumDeUuid(seds, f.sedeId);
      const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
      const esHoy = f.fecha === fmt(hoy);
      // Además: el doctor atiende a esa hora, no tiene otra cita encima y queda algún sillón libre.
      const reglasOk = (h) => !f.medicoId || (evaluarCita(ctxSede, citaBorrador({ hora: h, sillon: null })).errores.length === 0 && sugerirSillon(ctxSede, citaBorrador({ hora: h })) != null);
      const valida = (h) => !ocupadas.has(h) && !citaFueraDeHorario(f.fecha, h, f.duracionMin, horarioClinica.horario, horarioClinica.feriados, sedeN).fuera && (!esHoy || toMin(h) > ahoraMin) && reglasOk(h);
      const libre = HORAS_SEL.find(valida) || HORAS_SEL.find((h) => !ocupadas.has(h) && !citaFueraDeHorario(f.fecha, h, f.duracionMin, horarioClinica.horario, horarioClinica.feriados, sedeN).fuera) || HORAS_SEL[8] || "10:00";
      setF((x) => (x.hora === libre ? x : { ...x, hora: libre }));
    };
    if (!auth.token) {
      (demoDb?.citas || []).forEach((c) => {
        if (c.fecha !== f.fecha) return;
        if (f.medicoId && c.medicoId && String(c.medicoId) !== String(f.medicoId)) return;
        if (!deLaSede(c)) return;
        if (["cancelada", "no_show", "reprogramada", "cerrada_sistema"].includes(c.estado)) return;
        ocupadas.add(String(c.hora || "").slice(0, 5));
      });
      apply(); return;
    }
    api.citas.listar(f.fecha).then((rows) => {
      (rows || []).forEach((c) => {
        if (f.medicoId && c.medicoId && String(c.medicoId) !== String(f.medicoId)) return;
        if (!deLaSede(c)) return;
        if (["cancelada", "no_show", "reprogramada", "cerrada_sistema"].includes(c.estado)) return;
        const h = String(c.hora || "").slice(0, 5);
        if (h) ocupadas.add(h);
      });
      apply();
    }).catch(() => apply());
  }, [f.fecha, f.medicoId, horaAuto, horarioClinica, f.sedeId, seds.length, f.duracionMin, citasDia, reglas.listo]); // eslint-disable-line
  // Si el doctor ese día solo atiende en otra sede, la sede se cambia a esa.
  useEffect(() => {
    if (!f.medicoId || !f.fecha) return;
    // También si a la hora elegida está en otra sede (mañana en una, tarde en otra).
    const ts = turnosDelDia(ctxReglas.disp, f.medicoId, f.fecha);
    const sedeT = (t) => t.sede ?? t.sedeId;
    const sedesT = [...new Set(ts.map(sedeT).filter((x) => x != null).map(String))];
    if (!sedesT.length) return;
    const ini = toMin(f.hora || "00:00"), fin = ini + (Number(f.duracionMin) || 30);
    const cubre = ts.find((t) => toMin(String(t.horaInicio).slice(0, 5)) <= ini && fin <= toMin(String(t.horaFin).slice(0, 5)) && sedeT(t) != null);
    const objetivo = cubre ? String(sedeT(cubre)) : (sedesT.some((x) => mismaSede(x, f.sedeId)) ? null : sedesT[0]);
    if (!objetivo || mismaSede(objetivo, f.sedeId)) return;
    // Solo se cambia a una sede que el usuario ve (seds ya viene filtrada). Si el doctor
    // está en otra, la validación avisa que no atiende aquí a esa hora.
    const destino = seds.find((x) => mismaSede(x.id, objetivo));
    if (destino) { setSillonAuto(true); setF((x) => ({ ...x, sedeId: destino.id, sillon: "" })); }
  }, [f.medicoId, f.fecha, f.hora, f.duracionMin, seds.length, reglas.listo]); // eslint-disable-line
  // Sillón: se propone el del doctor o de su especialidad; si no, uno flexible libre.
  useEffect(() => {
    if (!sillonAuto || !f.medicoId || !f.sedeId) return;
    const n = sugerirSillon(ctxSede, citaBorrador());
    const v = n != null ? String(n) : "";
    setF((x) => (x.sillon === v ? x : { ...x, sillon: v }));
  }, [sillonAuto, f.medicoId, f.sedeId, f.fecha, f.hora, f.duracionMin, f.especialidadId, citasDia, reglas.listo]); // eslint-disable-line
  // Duración según el servicio (endodoncia 60 min, limpieza 30…) mientras no se cambie a mano.
  const [durAuto, setDurAuto] = useState(true);
  const espEf = f.especialidadId || (medSel ? (medSel.esp ?? medSel.especialidadId) : "");
  const espObj = esps.find((e) => String(e.id) === String(espEf));
  const durServicio = Number(espObj?.duracionMin ?? espObj?.duracion) || null;
  useEffect(() => {
    if (!durAuto || !durServicio) return;
    setF((x) => (x.duracionMin === durServicio ? x : { ...x, duracionMin: durServicio }));
  }, [durAuto, durServicio]); // eslint-disable-line
  // Primer hueco libre: recorre los próximos 14 días con el doctor elegido (o los de la
  // especialidad) dentro de su horario, con un sillón que lo acepte y sin cruces.
  const [huecos, setHuecos] = useState(null);       // null | "buscando" | [{...}]
  const buscarHuecos = async () => {
    setHuecos("buscando");
    // Sin doctor: los de la especialidad que atienden en alguna de las sedes que ve el usuario.
    const candidatos = f.medicoId ? meds.filter((m) => String(m.id) === String(f.medicoId)) : medsEsp.filter((m) => { const ss = sedesMed(m); return !ss.length || ss.some(sedePermitida); });
    const desdeD = new Date(fmt(hoy) + "T00:00:00");
    const dias = [...Array(14)].map((_, i) => { const d = new Date(desdeD); d.setDate(d.getDate() + i); return fmt(d); });
    let citasRango = demo ? (demoDb.citas || []) : [];
    if (!demo) { try { citasRango = ((await api.citas.listar(null, dias[0], dias[dias.length - 1])) || []).map((c) => ({ ...c, sede: c.sedeId ?? c.sede, hora: String(c.hora || "").slice(0, 5) })); } catch { citasRango = []; } }
    const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    const dur = Number(f.duracionMin) || 30;
    const res = [], vistos = new Set();
    for (const fecha of dias) {
      for (const m of candidatos) {
        if (res.length >= 4) break;
        const ts = turnosDelDia(ctxReglas.disp, m.id, fecha);
        const conH = (ctxReglas.disp || []).some((d) => String(d.medicoId) === String(m.id));
        const bloques = conH ? ts : [{ horaInicio: "08:00", horaFin: "20:00", sede: f.sedeId || seds[0]?.id }];
        for (const t of bloques) {
          const sedeT = t.sede ?? t.sedeId ?? f.sedeId ?? seds[0]?.id;
          // Solo huecos en sedes del usuario y donde el doctor trabaja.
          if (!seds.some((x) => mismaSede(x.id, sedeT)) || !atiendeEn(m, sedeT)) continue;
          const sils = sillonesDeSede(reglas.sillones, sedeT);
          const ctxT = { ...ctxReglas, citas: citasRango, sillones: sils.length ? sils : sillonesSede };
          let hallado = null;
          for (let mm = toMin(String(t.horaInicio).slice(0, 5)); mm + dur <= toMin(String(t.horaFin).slice(0, 5)); mm += 30) {
            if (fecha === fmt(hoy) && mm <= ahoraMin) continue;
            const hora = `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
            if (citaFueraDeHorario(fecha, hora, dur, horarioClinica.horario, horarioClinica.feriados, sedeNumDeUuid(seds, sedeT)).fuera) continue;
            const b = { medicoId: m.id, esp: f.especialidadId || m.especialidadId || m.esp, sede: sedeT, fecha, hora, duracionMin: dur, pacienteId: f.pacienteId || null };
            const sil = sugerirSillon(ctxT, b);
            if (sil == null) continue;
            if (evaluarCita(ctxT, { ...b, sillon: sil }).errores.length) continue;
            hallado = { ...b, sillon: sil, medico: m.nombre, silNombre: (ctxT.sillones.find((x) => x.numero === sil) || {}).nombre || `Sillón ${sil}` }; break;
          }
          if (hallado && !vistos.has(`${m.id}|${fecha}`)) { vistos.add(`${m.id}|${fecha}`); res.push(hallado); break; }
        }
      }
      if (res.length >= 4) break;
    }
    setHuecos(res);
  };
  const usarHueco = (h) => {
    setHoraAuto(false); setSillonAuto(false);
    const sedeL = (seds.find((x) => mismaSede(x.id, h.sede)) || {}).id ?? h.sede;
    setF((x) => ({ ...x, medicoId: h.medicoId, sedeId: sedeL, fecha: h.fecha, hora: h.hora, sillon: String(h.sillon) }));
    setHuecos(null);
  };
  const evaluacion = f.medicoId && f.sedeId ? evaluarCita(ctxSede, citaBorrador()) : { errores: [], avisos: [] };
  const estSil = f.medicoId && f.sedeId ? estadoSillones(ctxSede, citaBorrador()) : sillonesSede.map((x) => ({ s: x, estado: x.activo ? "libre" : "no", regla: {} }));
  const turnosHoy = f.medicoId ? turnosDelDia(ctxReglas.disp, f.medicoId, f.fecha) : [];
  const tieneHorario = f.medicoId && (ctxReglas.disp || []).some((d) => String(d.medicoId) === String(f.medicoId));
  // Nombre de una sede que el usuario ve; las demás salen como «otra sede».
  const nomSede = (id) => (seds.find((x) => mismaSede(x.id, id)) || {}).nombre || "otra sede";
  const T = DS.c.primary;
  const pacSel = pac.find((p) => p.id === f.pacienteId);
  const pacF = (busca.trim() ? pac.filter((p) => (p.nombre || "").toLowerCase().includes(busca.toLowerCase()) || String(p.dni || "").includes(busca.trim())) : pac).slice(0, 6);
  // DNI exacto de un paciente de otra sede: se ofrece su ficha para no registrarlo dos veces.
  const pacOtraSede = /^\d{8}$/.test(busca.trim()) && !pacF.length ? pacTodos.find((p) => String(p.dni || "") === busca.trim()) || null : null;
  // Doctores que hacen el servicio y, de ellos, los que atienden en la sede elegida.
  const medsEsp = f.especialidadId ? meds.filter((m) => espsMed(m).includes(String(f.especialidadId))) : meds;
  const medsF = medsEsp.filter((m) => atiendeEn(m, f.sedeId));
  // Fecha y hora pasadas bloquean el agendado (antes solo se pintaba «Fecha pasada»).
  const msgPasada = f.fecha && f.hora && yaPaso(f.fecha, f.hora) ? motivoPasado(f.fecha, f.hora) : "";
  const pasada = !!msgPasada;
  const inp = { width: "100%", padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
  const req = <span style={{ color: "var(--dc-red)" }}> *</span>;
  const elegirPac = (p) => {
    if (!pac.some((x) => String(x.id) === String(p.id))) setPac((ps) => [...ps, p]);
    setF((x) => ({ ...x, pacienteId: p.id })); setAbrePac(false); setBusca(""); setPacNuevo(null);
  };
  // DNI del alta rápida que ya tiene ficha (aunque sea de otra sede): se ofrece usarla.
  const dniRepetido = nuevo && /^\d{8}$/.test(nuevo.dni || "") ? pacTodos.find((p) => String(p.dni || "") === nuevo.dni) || null : null;
  const usarExistente = (ya) => { elegirPac(ya); setNuevo(null); setNuevoErr({}); notify(`Ese DNI ya es de ${ya.nombre}: se usa su ficha.`); };
  /** Valida el alta rápida. Devuelve { datos } (se registra al agendar), { id } si el DNI
      ya tenía ficha, o null si falta algo (los errores quedan junto a cada campo). */
  const confirmarNuevo = () => {
    const v = validarPacienteRapido(nuevo);
    if (!v.ok) { setNuevoErr(v.errors); notify(v.errors[v.first]); return null; }
    if (dniRepetido) { usarExistente(dniRepetido); return { id: dniRepetido.id, existente: true }; }
    const datos = { ...nuevo, nombre: nuevo.nombre.trim() };
    setPacNuevo(datos); setNuevo(null); setNuevoErr({}); setF((x) => ({ ...x, pacienteId: "" }));
    return { datos };
  };
  const setCampoNuevo = (parcial) => { setNuevo((n) => ({ ...n, ...parcial })); setNuevoErr((e) => { const x = { ...e }; Object.keys(parcial).forEach((k) => delete x[k]); return x; }); };

  // pacRes: { id } de un paciente existente o { datos } del alta rápida (se registra aquí).
  const ejecutarGuardado = async (forzarFueraDeHorario = false, pacRes = pacNuevo ? { datos: pacNuevo } : { id: f.pacienteId }) => {
    const sedeId = f.sedeId || seds[0]?.id;
    if (!sedeId) { notify("La sede es obligatoria."); return; }
    if (!sedePermitida(sedeId)) { notify("Esa sede no está entre las que atiendes. Elige una de tus sedes."); return; }
    if (!f.sillon) { notify("El sillón es obligatorio."); return; }
    // Sin motivo escrito, la cita lleva el nombre del servicio elegido (no «Consulta»).
    const servicio = (esps.find((e) => String(e.id) === String(f.especialidadId)) || {}).nombre;
    const mot = [f.motivo.trim() || servicio || "Consulta", (f.nota || "").trim()].filter(Boolean).join(" — ");
    setGuardando(true);
    // Con sesión, el paciente nuevo se registra justo antes de crear la cita.
    let pacId = pacRes.id;
    if (!demo && pacRes.datos) {
      try { pacId = (await registrarPacienteRapido(pacRes.datos, { demoDb, sede: sedeId })).id; }
      catch (e) { setGuardando(false); notify(`No se pudo registrar al paciente: ${e?.message || "error del servidor"}.`); return; }
      if (pacId == null) { setGuardando(false); notify("No se pudo registrar al paciente."); return; }
      setPacNuevo(null); cargarPac(); setF((x) => ({ ...x, pacienteId: pacId }));
    }
    const cuerpo = { pacienteId: pacId, especialidadId: f.especialidadId || null, medicoId: f.medicoId, sedeId: sedeApiUuid(sedeId), hora: f.hora, duracionMin: Number(f.duracionMin) || 30, sillon: Number(f.sillon), motivo: mot, canalOrigen: f.canal, estado: "confirmada", ...(forzarFueraDeHorario ? { forzarFueraDeHorario: true } : {}) };
    const paso = f.repetir === "semanal" ? 7 : f.repetir === "quincenal" ? 14 : f.repetir === "mensual" ? 30 : 0;
    const n = f.repetir === "no" ? 1 : Math.max(1, Math.min(12, Number(f.veces) || 1));
    const fechas = []; for (let i = 0; i < n; i++) { const d = new Date(f.fecha + "T00:00:00"); d.setDate(d.getDate() + paso * i); fechas.push(fmt(d)); }
    let ok = 0, fail = 0, avisados = 0, avisarFail = 0, ultimoError = "";
    if (demo) {
      const med = MEDICOS.find((m) => String(m.id) === String(f.medicoId)) || {};
      // Cada fecha (también las repetidas) pasa por las mismas reglas: doctor, sillón y bloqueos.
      const ocupado = (fch) => evaluarCita(ctxSede, citaBorrador({ fecha: fch })).errores.length > 0;
      const libres = fechas.filter((fch) => !ocupado(fch));
      // El paciente nuevo se registra solo si de verdad queda alguna cita agendada.
      if (!libres.length) { setGuardando(false); setAvisoHorario(null); notify(evaluarCita(ctxSede, citaBorrador()).errores[0] || "Ese horario no está disponible."); return; }
      let p = pac.find((x) => String(x.id) === String(pacRes.id)) || {};
      if (pacRes.datos) {
        p = await registrarPacienteRapido(pacRes.datos, { demoDb, sede: sedeId });
        setPac((ps) => [...ps, mapPac(p)]); setPacNuevo(null); setF((x) => ({ ...x, pacienteId: p.id }));
      }
      const base0 = Date.now();
      const sedeN = sedeNum(sedeId);   // la cita guarda su sede y el precio de esa sede
      demoDb.setCitas((cs) => [...cs, ...libres.map((fch, i) => ({ id: base0 + i, paciente: p.nombre, pacienteId: p.id, dni: p.dni || "", medicoId: Number(f.medicoId), esp: Number(f.especialidadId) || med.esp || 1, sede: sedeN, precio: precioCita(demoDb.catalogo || CATALOGO_SEED, Number(f.especialidadId) || med.esp || 1, sedeN) ?? undefined, sillon: Number(f.sillon), duracionMin: Number(f.duracionMin) || 30, fecha: fch, hora: f.hora, motivo: mot, estado: "pendiente", llegada: false }))]);
      setGuardando(false); setAvisoHorario(null);
      // Un paciente que se atiende por primera vez en esta sede pasa a ser también de ella
      // (N:M): así aparece en Pacientes y en la agenda de esa sede.
      if (p.id != null && demoDb.setPacientes) demoDb.setPacientes((ps) => ps.map((x) => (String(x.id) !== String(p.id) || sedesDe(x).some((v) => mismaSede(v, sedeN)) ? x : { ...x, sedes: [...sedesDe(x), sedeN] })));
      notify(fechas.length > 1 ? `${libres.length} cita(s) agendada(s)${fechas.length - libres.length ? `, ${fechas.length - libres.length} ocupadas` : ""}.` : `Cita agendada para ${p.nombre} el ${fechaLegible(f.fecha)} a las ${f.hora}.`);
      onCreada();
      return;
    }
    for (const fch of fechas) {
      try {
        const r = await api.citas.crear({ ...cuerpo, fecha: fch });
        ok++;
        if (f.avisar && r?.id) {
          try {
            const cr = await api.citas.comprobante(r.id);
            if (cr && cr.ok === true) avisados++;
            else avisarFail++;
          } catch (e2) { avisarFail++; }
        }
      }
      catch (e) { fail++; ultimoError = e?.message || ultimoError; }
    }
    setGuardando(false);
    setAvisoHorario(null);
    if (ok === 0) { notify(ultimoError || "No se pudo agendar (¿horario ocupado o bloqueado?)."); return; }
    const avisoTxt = f.avisar
      ? (avisados > 0 && avisarFail === 0 ? ` – comprobante enviado a ${avisados} paciente(s)` : avisados > 0 ? ` – comprobante enviado a ${avisados}, ${avisarFail} no se pudo enviar` : " – no se pudo enviar el comprobante por WhatsApp")
      : "";
    notify(fechas.length > 1 ? `${ok} cita(s) agendada(s)${fail ? `, ${fail} no (ocupadas/bloqueadas)` : ""}${avisoTxt}.` : `Cita agendada${avisoTxt}.`);
    onCreada();
  };

  // Cada sede cobra su propio precio por el mismo servicio (catálogo › precio por sede).
  const sedeSel = f.sedeId || seds[0]?.id;
  const nombreSedeSel = (seds.find((x) => mismaSede(x.id, sedeSel)) || {}).nombre || "esta sede";
  const precioSede = !f.especialidadId ? null : demo
    ? precioCita(demoDb.catalogo || CATALOGO_SEED, f.especialidadId, sedeSel)
    : (() => { const e = esps.find((x) => String(x.id) === String(f.especialidadId)); return e && e.precioBase != null ? precioServicio({ precio: e.precioBase, preciosSede: e.preciosSede }, sedeSel) : null; })();
  const guardar = async () => {
    // Paciente: uno existente, el nuevo ya validado o el formulario de alta todavía abierto.
    let pacRes = pacNuevo ? { datos: pacNuevo } : f.pacienteId ? { id: f.pacienteId } : null;
    if (nuevo) { const r = confirmarNuevo(); if (!r || r.existente) return; pacRes = r; }
    if (msgPasada) { notify(msgPasada); return; }
    // AGE-09: el servicio es obligatorio (define duración, especialidad y doctores).
    if (!f.especialidadId) { notify("Elige el servicio: define la duración y qué doctores lo atienden."); return; }
    if (!pacRes || !f.medicoId) { notify("Selecciona paciente y doctor."); return; }
    if (!f.sedeId && !seds[0]?.id) { notify("Selecciona la sede."); return; }
    if (!f.sillon) { notify("Selecciona el sillón."); return; }
    if (evaluacion.errores.length) { notify(evaluacion.errores[0]); return; }
    const sedeId = f.sedeId || seds[0]?.id;
    const sedeNum = sedeNumDeUuid(seds, sedeId);
    const check = citaFueraDeHorario(f.fecha, f.hora, f.duracionMin, horarioClinica.horario, horarioClinica.feriados, sedeNum);
    if (check.fuera) {
      if (bloqueadoForzar) {
        notify(`No se puede agendar fuera de horario: ${check.msg}`);
        return;
      }
      if (puedeForzar) {
        setAvisoHorario(check.msg);
        return;
      }
      notify(`Fuera del horario de la clínica: ${check.msg}`);
      return;
    }
    await ejecutarGuardado(false, pacRes);
  };
  // Por qué no se puede agendar todavía: se muestra junto al botón (antes el botón quedaba
  // gris y el motivo estaba más abajo, en la sección del sillón).
  const motivoBloqueo = avisoHorario ? "Fuera del horario: confirma arriba o cambia la hora."
    : msgPasada || evaluacion.errores[0] || "";

  const canalBtns = (
    <div style={{ display: "flex", gap: 8 }}>
      {[["llamada", "Llamada", <Phone size={14} strokeWidth={1.75} />], ["whatsapp", "WhatsApp", <MessageSquare size={14} strokeWidth={1.75} />], ["presencial", "Presencial", <User size={14} strokeWidth={1.75} />]].map(([k, l, ic]) => { const on = f.canal === k; return (
        <button key={k} onClick={() => setF({ ...f, canal: k })} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: "var(--dc-r-md)", border: on ? `1.5px solid ${T}` : "1.5px solid var(--dc-line)", background: on ? "var(--dc-accent-soft)" : "var(--dc-white)", color: on ? "var(--dc-brand-600)" : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{ic} {l}</button>
      ); })}
    </div>
  );
  return (
    <Modal icon={<Calendar size={20} strokeWidth={1.75} />} titulo="Agendar cita" sub="Registra la cita del paciente" onClose={onClose} maxW={masDatos ? 820 : 540}
      footer={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <button onClick={() => setMasDatos((v) => !v)} style={{ background: "none", border: "none", color: T, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>{masDatos ? "‹ Menos datos" : "Más datos ›"}</button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flex: 1, minWidth: 0 }}>
          {motivoBloqueo && <span role="status" data-motivo-bloqueo style={{ display: "inline-flex", alignItems: "flex-start", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--dc-danger-700)", lineHeight: 1.35, textAlign: "right", maxWidth: 380 }}><Lock size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />{motivoBloqueo}</span>}
          <Btn small onClick={guardar} disabled={guardando || !!avisoHorario || evaluacion.errores.length > 0 || pasada}><Check size={15} strokeWidth={1.75} /> Agendar</Btn>
        </div>
      </div>}>
      {avisoHorario && (
        <div style={{ marginBottom: 14, padding: 14, borderRadius: "var(--dc-r-md)", background: "var(--dc-warn-soft)", border: "1px solid var(--dc-amber-soft)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={18} strokeWidth={1.75} color="var(--dc-warn-600)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: "var(--dc-warn-ink)", fontSize: 13, marginBottom: 4 }}>Fuera del horario de la clínica</div>
              <div style={{ fontSize: 13, color: "var(--dc-warn-ink)", lineHeight: 1.45 }}>{avisoHorario}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <Btn small onClick={() => ejecutarGuardado(true)} disabled={guardando}>Confirmar y agendar igual</Btn>
                <Btn small kind="ghost" onClick={() => setAvisoHorario(null)}>Cambiar hora</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: masDatos ? "1fr 1fr" : "1fr", gap: 20 }}>
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div>
            <div className="dc-agm__paso"><i>1</i>Paciente{req}</div>
            {!nuevo && pacNuevo && <div className="dc-agm__nuevo" data-pac-nuevo>
              <div className="dc-agm__nuevo-cab"><span><Plus size={14} strokeWidth={2.2} /></span><b>{pacNuevo.nombre} – {pacNuevo.dni}</b><button type="button" onClick={() => { setNuevo(pacNuevo); setPacNuevo(null); }}>Editar</button></div>
              <small style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>Paciente nuevo · cel. {celular9(pacNuevo.telefono)} · se registra al agendar la cita. <button type="button" onClick={() => setPacNuevo(null)} style={{ background: "none", border: "none", padding: 0, color: T, fontWeight: 500, fontSize: 12, cursor: "pointer" }}>Elegir otro paciente</button></small>
            </div>}
            {!nuevo && !pacNuevo && <div style={{ position: "relative" }}>
              <div onClick={() => setAbrePac((v) => !v)} style={{ ...inp, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: pacSel ? NAVY : "var(--dc-ink-400)", borderColor: abrePac ? T : "var(--dc-line)" }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pacSel ? `${pacSel.nombre}${pacSel.dni ? ` – ${pacSel.dni}` : ""}` : "Buscar paciente…"}</span>
                <ChevronRight size={16} strokeWidth={1.75} style={{ transform: `rotate(${tint(abrePac ? -90 : 90, 0.871)}g)`, color: "var(--dc-ink-400)", flexShrink: 0 }} />
              </div>
              {abrePac && <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--dc-white)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", boxShadow: "0 18px 40px -18px rgba(16,24,40,.4)", zIndex: 30, overflow: "hidden" }}>
                <div style={{ padding: 8 }}><input className="dc-premium-inp" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente" style={{ ...inp, padding: "8px 11px" }} /></div>
                <div style={{ maxHeight: 190, overflowY: "auto" }}>
                  {pacF.length === 0 && !pacOtraSede && <div style={{ padding: "8px 14px", fontSize: 13, color: "var(--dc-ink-400)" }}>Sin coincidencias.</div>}
                  {pacOtraSede && <button type="button" onClick={() => elegirPac(pacOtraSede)} style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "var(--dc-white)", cursor: "pointer", fontSize: 13, color: NAVY, fontWeight: 500 }}>{pacOtraSede.nombre}<span style={{ color: "var(--dc-ink-400)", fontWeight: 500 }}> – {pacOtraSede.dni} · registrado en otra sede</span></button>}
                  {pacF.map((p) => <button key={p.id} onClick={() => { setF({ ...f, pacienteId: p.id }); setAbrePac(false); setBusca(""); }} style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: p.id === f.pacienteId ? "var(--dc-bg)" : "var(--dc-white)", cursor: "pointer", fontSize: 13, color: NAVY, fontWeight: 500 }}>{p.nombre}{p.dni ? <span style={{ color: "var(--dc-ink-400)", fontWeight: 500 }}> – {p.dni}</span> : null}</button>)}
                </div>
                <button onClick={() => { const b = busca.trim(); setNuevo({ ...PAC_RAPIDO_VACIO, ...(/^\d{8}$/.test(b) ? { dni: b } : { nombre: b }) }); setNuevoErr({}); setAbrePac(false); }} style={{ width: "100%", padding: "10px 14px", border: "none", borderTop: "1px solid var(--dc-line)", background: "var(--dc-white)", cursor: "pointer", color: T, fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}><Plus size={15} strokeWidth={1.75} /> Agregar nuevo paciente</button>
              </div>}
            </div>}
            {nuevo && <div className="dc-agm__nuevo">
              <div className="dc-agm__nuevo-cab"><span><Plus size={14} strokeWidth={2.2} /></span><b>Nuevo paciente</b><button type="button" onClick={() => { setNuevo(null); setNuevoErr({}); }}>Elegir uno existente</button></div>
              <CamposPacienteRapido v={nuevo} set={setCampoNuevo} err={nuevoErr} notify={notify} existente={dniRepetido} onUsarExistente={() => usarExistente(dniRepetido)} />
              <small style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>La ficha se crea al agendar la cita; si cierras sin agendar, no se registra.</small>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn small kind="ghost" onClick={() => { setNuevo(null); setNuevoErr({}); }}>Cancelar</Btn><Btn small onClick={confirmarNuevo}><Check size={14} strokeWidth={2} /> Usar estos datos</Btn></div>
            </div>}
          </div>
          {/* La sede va primero: define qué doctores atienden, sus sillones y el precio. */}
          <div className="dc-agm__paso"><i>2</i>Sede, servicio y doctor</div>
          <label><span style={lbl}>Sede{req}</span>
            <Select value={f.sedeId} disabled={seds.length < 2} onChange={(v) => { setSillonAuto(true); setHoraAuto(true); const m = meds.find((x) => String(x.id) === String(f.medicoId)); setF({ ...f, sedeId: v, sillon: "", medicoId: f.medicoId && !atiendeEn(m, v) ? "" : f.medicoId }); }} placeholder="Seleccionar sede"
                    options={seds.map((s) => ({ value: s.id, label: s.nombre }))} />
          </label>
          <label><span style={lbl}>Servicio{req}</span>
            <Select value={f.especialidadId} onChange={(v) => { setDurAuto(true); setSillonAuto(true); setF({ ...f, especialidadId: v, medicoId: f.medicoId && v && meds.find((m) => String(m.id) === String(f.medicoId) && !espsMed(m).includes(String(v))) ? "" : f.medicoId }); }}
                    placeholder="Elegir servicio" options={[...esps.map((e) => ({ value: e.id, label: e.nombre, sub: e.duracionMin ? `${e.duracionMin} min` : undefined }))]} />
            {precioSede != null && <small className="dc-agm__precio">Precio en {nombreSedeSel}: <b>S/ {Number(precioSede).toFixed(2)}</b></small>}
          </label>
          <label><span style={lbl}>Doctor{req}</span>
            <Select value={f.medicoId} onChange={(v) => { setSillonAuto(true); setHoraAuto(true); setF({ ...f, medicoId: v }); }} placeholder="Seleccionar"
                    options={medsF.map((m) => { const ts = turnosDelDia(ctxReglas.disp, m.id, f.fecha, f.sedeId || null); const conH = (ctxReglas.disp || []).some((d) => String(d.medicoId) === String(m.id)); return { value: m.id, label: m.nombre, sub: !conH ? "Sin horario configurado" : ts.length ? `Atiende ${ts.map((t) => `${String(t.horaInicio).slice(0, 5)}–${String(t.horaFin).slice(0, 5)}`).join(" · ")}` : "No atiende ese día en esta sede" }; })} />
          </label>
          {f.especialidadId && f.sedeId && !medsF.length && <div className="dc-agm__turno is-no">
            <Info size={13} strokeWidth={2} />
            <span>Ningún doctor de {(espObj?.nombre || "este servicio").toLowerCase()} atiende en {nombreSedeSel}.{seds.length > 1 ? " Prueba con otra sede." : ""}</span>
          </div>}
          {f.medicoId && <div className={`dc-agm__turno${tieneHorario && !turnosHoy.length ? " is-no" : ""}`}>
            <Clock size={13} strokeWidth={2} />
            {!tieneHorario ? <span>Este doctor no tiene horario configurado: se puede agendar a cualquier hora de la clínica.</span>
              : turnosHoy.length ? <span>{fechaLegible(f.fecha)} atiende {turnosHoy.map((t, i) => <b key={i}>{String(t.horaInicio).slice(0, 5)}–{String(t.horaFin).slice(0, 5)}{t.sede != null || t.sedeId != null ? ` (${nomSede(t.sede ?? t.sedeId).replace(/^Sede\s+/, "") || "sede"})` : ""}</b>).reduce((a, b) => [a, " y ", b])}</span>
              : <span>No atiende el {fechaLegible(f.fecha)}. Elige otra fecha u otro doctor.</span>}
          </div>}
          <div className="dc-agm__paso"><i>3</i>Cuándo</div>
          <div>
            <div className="dc-agm__fh"><span style={{ ...lbl, marginBottom: 0 }}>Fecha y hora</span>
              <button type="button" onClick={buscarHuecos} disabled={huecos === "buscando"}><Search size={13} strokeWidth={2.2} /> {huecos === "buscando" ? "Buscando…" : `Primer hueco libre${f.medicoId ? "" : espObj ? ` de ${espObj.nombre.toLowerCase()}` : ""}`}</button>
            </div>
            {Array.isArray(huecos) && <div className="dc-agm__huecos">
              {huecos.length === 0 ? <p>Sin huecos en los próximos 14 días con estas condiciones.</p> : huecos.map((h, i) => (
                <button key={i} type="button" onClick={() => usarHueco(h)}><b>{h.fecha === fmt(hoy) ? "Hoy" : fechaLegible(h.fecha)} · {h.hora}</b><small>{h.medico} · {nomSede(h.sede).replace(/^Sede\s+/, "")} · {h.silNombre}</small></button>
              ))}
              <button type="button" className="is-cerrar" onClick={() => setHuecos(null)} aria-label="Cerrar sugerencias">×</button>
            </div>}
            <div style={{ fontSize: 13, fontWeight: 500, color: DS.c.primary, marginBottom: 6 }}>
              {fechaLegible(f.fecha)} – {f.hora}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${pasada ? "var(--dc-red)" : "var(--dc-line)"}`, borderRadius: "var(--dc-r-md)", padding: "8px 11px" }}>
              <Clock size={16} strokeWidth={1.75} color={pasada ? "var(--dc-red)" : "var(--dc-ink-400)"} style={{ flexShrink: 0 }} />
              <input className="dc-premium-inp" type="date" min={fmt(hoy)} aria-label="Fecha de la cita" value={f.fecha} onChange={(e) => { setHoraAuto(true); setF({ ...f, fecha: e.target.value }); }} style={{ border: "none", outline: "none", fontSize: 13, color: NAVY, flex: 1, minWidth: 0, background: "transparent" }} />
              <input className="dc-premium-inp" type="time" aria-label="Hora de la cita" value={f.hora} onChange={(e) => { setHoraAuto(false); setF({ ...f, hora: e.target.value }); }} style={{ border: "none", outline: "none", fontSize: 13, color: NAVY, width: 92, background: "transparent" }} />
            </div>
            {pasada && <div role="alert" style={{ fontSize: 12, color: "var(--dc-red)", fontWeight: 500, marginTop: 5 }}>{msgPasada}</div>}
          </div>
          <div className="dc-agm__paso"><i>4</i>Detalles</div>
          <label><span style={lbl}>Motivo</span><input className="dc-premium-inp" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ej. Evaluación, dolor de muela…" style={inp} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <label><span style={lbl}>Duración{durAuto && durServicio && Number(f.duracionMin) === durServicio && <em className="dc-agm__auto">según {espObj.nombre.toLowerCase()}</em>}</span>
              <Select value={f.duracionMin} onChange={(v) => { setDurAuto(false); setF({ ...f, duracionMin: Number(v) }); }}
                      options={[15, 30, 45, 60, 90, 120].map((m) => ({ value: m, label: m >= 60 ? `${m / 60} h${m % 60 ? " 30 min" : ""}` : `${m} min` }))} />
            </label>
          </div>
          <div>
            <span style={lbl}>Sillón{req}{f.sillon && sillonAuto && <em className="dc-agm__auto">propuesto</em>}</span>
            {!demo && reglas.listo && !sillonesSede.length && <p className="dc-agm__val is-avi" style={{ margin: "4px 0 8px", fontSize: 12.5, color: "var(--dc-warn-700)" }}><Info size={13} strokeWidth={2.2} /> Esta sede no tiene sillones configurados. Configúralos en Configuración › Sillones para poder agendar.</p>}
            <div className="dc-agm__sils" role="radiogroup" aria-label="Sillón">
              {estSil.map(({ s: x, estado, regla, ocupante }) => { const on = String(f.sillon) === String(x.numero); const bloq = estado === "no" || estado === "ocupado"; const et = etiquetaUso(x, ctxReglas); return (
                <button key={x.id} type="button" role="radio" aria-checked={on} disabled={bloq} className={`is-${estado}${on ? " is-on" : ""}`}
                  title={estado === "ocupado" ? `Ocupado por ${ocupante?.paciente || "otra cita"} (${String(ocupante?.hora || "").slice(0, 5)})` : regla?.motivo || et.txt}
                  onClick={() => { setSillonAuto(false); setF({ ...f, sillon: String(x.numero) }); }}>
                  <span className="dc-agm__silh"><Armchair size={14} strokeWidth={2} /><b>{x.nombre}</b>{estado === "propio" && <Star size={12} strokeWidth={2.4} />}</span>
                  <small>{estado === "ocupado" ? `Ocupado · ${String(ocupante?.hora || "").slice(0, 5)}` : estado === "no" ? (x.activo ? "No disponible" : "Fuera de servicio") : estado === "propio" ? (x.uso === "doctor" ? "Su sillón" : "De su especialidad") : et.txt}</small>
                </button>
              ); })}
            </div>
          </div>
          {(evaluacion.errores.some((m) => m !== msgPasada) || evaluacion.avisos.length > 0) && (
            <div className="dc-agm__val">
              {/* La fecha pasada ya se avisa junto a la fecha y al botón. */}
              {evaluacion.errores.filter((m) => m !== msgPasada).map((m, i) => <p key={"e" + i} className="is-err"><Lock size={13} strokeWidth={2.2} /> {m}</p>)}
              {evaluacion.avisos.map((m, i) => <p key={"a" + i} className="is-avi"><Info size={13} strokeWidth={2.2} /> {m}</p>)}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: f.repetir !== "no" ? "1.4fr 1fr" : "1fr", gap: 12 }}>
            <label><span style={lbl}>Repetir (control/serie)</span>
              <Select value={f.repetir} onChange={(v) => setF({ ...f, repetir: v })}
                      options={[{ value: "no", label: "Cita única" }, { value: "semanal", label: "Cada semana" },
                                { value: "quincenal", label: "Cada 2 semanas" }, { value: "mensual", label: "Cada mes" }]} />
            </label>
            {f.repetir !== "no" && <label><span style={lbl}>N.º de citas</span>
              <Select value={f.veces} onChange={(v) => setF({ ...f, veces: Number(v) })}
                      options={[2, 3, 4, 5, 6, 8, 10, 12].map((v) => ({ value: v, label: String(v) }))} />
            </label>}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--dc-ink-700)", cursor: "pointer" }}>
            <input type="checkbox" checked={f.avisar} onChange={(e) => setF({ ...f, avisar: e.target.checked })} /> Enviar comprobante al paciente por WhatsApp
          </label>
          {!masDatos && <label><span style={lbl}>Nota de la cita</span><textarea className="dc-premium-inp" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} rows={2} placeholder="Ej. viene por promoción…" style={{ ...inp, resize: "vertical" }} /></label>}
        </div>
        {masDatos && <div style={{ display: "grid", gap: 14, alignContent: "start", borderLeft: "1px solid var(--dc-line)", paddingLeft: 20 }}>
          <div><span style={lbl}>¿Cómo llegó?</span>{canalBtns}</div>
          <label><span style={lbl}>Nota de la cita</span><textarea className="dc-premium-inp" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} rows={3} placeholder="Ej. viene por promoción…" style={{ ...inp, resize: "vertical" }} /></label>
        </div>}
      </div>
    </Modal>
  );
}
