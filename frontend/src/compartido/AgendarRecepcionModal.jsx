/* Modal de agendado desde recepción + botón de consulta RENIEC.
   Lo usan App.jsx (Agenda, Espera) y el inbox de WhatsApp, así que vive aparte
   para que el módulo de WhatsApp pueda cargarse en su propio chunk. */
import React, { useState, useEffect, useContext } from "react";
import { Calendar, Check, ChevronRight, Clock, MessageSquare, Phone, Plus, Search, User, AlertTriangle, Armchair, Info, Lock, Star } from "lucide-react";
import { estadoSillones, evaluarCita, sugerirSillon, turnosDelDia, sillonesDeSede, etiquetaUso } from "./sillones";
import { useReglasAgenda } from "./useReglasAgenda";
import api, { auth } from "../api/client";
import {Btn, DS, DatosDemoCtx, ESPECIALIDADES, HORAS_SEL, MEDICOS, Modal, NAVY, SEDES, Select, addDays, fechaLegible, fmt, hoy, horarioDeSede, jornadaClinica, toMin, tint} from "../comun";

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

function sedeNumDeUuid(seds, uuid, fallbackIdx = 0) {
  if (!uuid || !seds.length) return fallbackIdx === 1 ? 2 : 1;
  const hit = seds.find((s) => s.id === uuid);
  if (!hit) return fallbackIdx === 1 ? 2 : 1;
  if (typeof hit.id === "number") return hit.id;
  const n = Number(hit.numero ?? hit.codigo);
  if (n === 2) return 2;
  if (String(hit.id).endsWith("a2")) return 2;
  return 1;
}

/* ---- Agendar cita (Recepción): registra el canal de origen (llamada / WhatsApp / presencial) ---- */
export function AgendarRecepcionModal({ onClose, onCreada, notify, base, rol: rolProp }) {
  const rol = rolProp || auth.sesion?.rol || "";
  const puedeForzar = rol === "admin" || rol === "gerencia";
  const bloqueadoForzar = rol === "recepcion" || rol === "admin_sede";
  const [pac, setPac] = useState([]); const [meds, setMeds] = useState([]); const [esps, setEsps] = useState([]); const [seds, setSeds] = useState([]);
  const [horarioClinica, setHorarioClinica] = useState({ horario: {}, feriados: [] });
  const [avisoHorario, setAvisoHorario] = useState(null);
  const [f, setF] = useState({ pacienteId: base?.pacienteId || "", especialidadId: "", medicoId: base?.medicoId || "", sedeId: base?.sedeId || "", fecha: base?.fecha || addDays(1), hora: base?.hora || "10:00", duracionMin: 30, sillon: base?.sillon != null ? String(base.sillon) : "", repetir: "no", veces: 4, avisar: false, motivo: base?.motivo || "", nota: "", canal: base?.canal || "llamada" });
  // Demostración: sin servidor se usan los pacientes, doctores, sedes y la agenda del
  // propio sistema, y la cita se guarda en la agenda compartida (antes el modal quedaba
  // vacío y no se podía agendar a nadie).
  const demoDb = useContext(DatosDemoCtx);
  const demo = !auth.token && !!demoDb;
  const cargarPac = () => {
    if (demo) { setPac((demoDb.pacientes || []).map((p) => ({ id: p.id, nombre: p.nombre, dni: p.dni }))); return Promise.resolve(); }
    return api.pacientes.listar().then((r) => setPac((r || []).map((p) => ({ id: p.id, nombre: p.nombre, dni: p.dni })))).catch(() => {});
  };
  useEffect(() => {
    if (demo) {
      cargarPac();
      setEsps(ESPECIALIDADES.map((e) => ({ id: e.id, nombre: e.nombre })));
      setMeds(MEDICOS.map((m) => ({ id: m.id, nombre: m.nombre, especialidadId: m.esp })));
      setSeds(SEDES.map((x) => ({ id: x.id, nombre: x.nombre })));
      if (!base?.sedeId) setF((x) => (x.sedeId ? x : { ...x, sedeId: SEDES[0].id }));
      if (demoDb.horarioClinica) setHorarioClinica({ horario: demoDb.horarioClinica.horario || {}, feriados: demoDb.horarioClinica.feriados || [] });
      return;
    }
    cargarPac();
    api.catalogo.especialidades().then((r) => setEsps(r || [])).catch(() => {});
    api.catalogo.medicos().then((r) => setMeds(r || [])).catch(() => {});
    api.sedes.listar().then((r) => {
      const list = r || [];
      setSeds(list);
      if (!base?.sedeId && list[0]?.id) setF((x) => (x.sedeId ? x : { ...x, sedeId: list[0].id }));
    }).catch(() => {});
    api.clinica.get().then((r) => setHorarioClinica({ horario: (r?.horario && typeof r.horario === "object") ? r.horario : {}, feriados: Array.isArray(r?.feriados) ? r.feriados : [] })).catch(() => {});
  }, []); // eslint-disable-line
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
    return l.length ? l : [1, 2, 3, 4].map((n) => ({ id: `x${n}`, sede: f.sedeId, numero: n, nombre: `Sillón ${n}`, uso: "flexible", activo: true }));
  })();
  const ctxSede = { ...ctxReglas, sillones: sillonesSede };
  const medSel = (ctxReglas.medicos || []).find((m) => String(m.id) === String(f.medicoId));
  const citaBorrador = (extra = {}) => ({ medicoId: f.medicoId, esp: f.especialidadId || (medSel ? (medSel.esp ?? medSel.especialidadId) : null), sede: f.sedeId, fecha: f.fecha, hora: f.hora, duracionMin: Number(f.duracionMin) || 30, sillon: f.sillon ? Number(f.sillon) : null, pacienteId: f.pacienteId || null, ...extra });
  const [masDatos, setMasDatos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [abrePac, setAbrePac] = useState(false);
  const [busca, setBusca] = useState("");
  const [nuevo, setNuevo] = useState(null);
  const [horaAuto, setHoraAuto] = useState(!base?.hora);
  // DC-51: primera hora libre al abrir / cambiar fecha.
  useEffect(() => {
    if (!horaAuto || !f.fecha) return;
    const ocupadas = new Set();
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
        if (["cancelada", "no_show", "reprogramada"].includes(c.estado)) return;
        ocupadas.add(String(c.hora || "").slice(0, 5));
      });
      apply(); return;
    }
    api.citas.listar(f.fecha).then((rows) => {
      (rows || []).forEach((c) => {
        if (f.medicoId && c.medicoId && String(c.medicoId) !== String(f.medicoId)) return;
        if (["cancelada", "no_show", "reprogramada"].includes(c.estado)) return;
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
    const objetivo = cubre ? String(sedeT(cubre)) : (sedesT.includes(String(f.sedeId)) ? null : sedesT[0]);
    if (!objetivo || objetivo === String(f.sedeId)) return;
    const destino = seds.find((x) => String(x.id) === objetivo);
    if (destino) { setSillonAuto(true); setF((x) => ({ ...x, sedeId: destino.id, sillon: "" })); }
  }, [f.medicoId, f.fecha, f.hora, f.duracionMin, seds.length, reglas.listo]); // eslint-disable-line
  // Sillón: se propone el del doctor o de su especialidad; si no, uno flexible libre.
  useEffect(() => {
    if (!sillonAuto || !f.medicoId || !f.sedeId) return;
    const n = sugerirSillon(ctxSede, citaBorrador());
    const v = n != null ? String(n) : "";
    setF((x) => (x.sillon === v ? x : { ...x, sillon: v }));
  }, [sillonAuto, f.medicoId, f.sedeId, f.fecha, f.hora, f.duracionMin, f.especialidadId, citasDia, reglas.listo]); // eslint-disable-line
  const evaluacion = f.medicoId && f.sedeId ? evaluarCita(ctxSede, citaBorrador()) : { errores: [], avisos: [] };
  const estSil = f.medicoId && f.sedeId ? estadoSillones(ctxSede, citaBorrador()) : sillonesSede.map((x) => ({ s: x, estado: x.activo ? "libre" : "no", regla: {} }));
  const turnosHoy = f.medicoId ? turnosDelDia(ctxReglas.disp, f.medicoId, f.fecha) : [];
  const tieneHorario = f.medicoId && (ctxReglas.disp || []).some((d) => String(d.medicoId) === String(f.medicoId));
  const nomSede = (id) => (seds.find((x) => String(x.id) === String(id)) || {}).nombre || "";
  const T = DS.c.primary;
  const pacSel = pac.find((p) => p.id === f.pacienteId);
  const pacF = (busca.trim() ? pac.filter((p) => (p.nombre || "").toLowerCase().includes(busca.toLowerCase()) || String(p.dni || "").includes(busca.trim())) : pac).slice(0, 6);
  const medsF = f.especialidadId ? meds.filter((m) => m.especialidadId === f.especialidadId) : meds;
  const pasada = f.fecha < fmt(hoy);
  const inp = { width: "100%", padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
  const req = <span style={{ color: "var(--dc-red)" }}> *</span>;
  const crearNuevo = () => {
    if (!nuevo?.nombre?.trim()) { notify("Ingresa el nombre del paciente."); return; }
    if (demo) {
      const id = Math.max(0, ...(demoDb.pacientes || []).map((p) => Number(p.id) || 0)) + 1;
      demoDb.setPacientes((ps) => [...ps, { id, nombre: nuevo.nombre.trim(), dni: (nuevo.dni || "").trim(), telefono: "", email: "", sede: Number(f.sedeId) || 1, sedes: [Number(f.sedeId) || 1], ultima: null, creadoEn: new Date().toISOString() }]);
      setPac((ps) => [...ps, { id, nombre: nuevo.nombre.trim(), dni: (nuevo.dni || "").trim() }]);
      setF((x) => ({ ...x, pacienteId: id })); setNuevo(null); setAbrePac(false); setBusca(""); notify("Paciente creado.");
      return;
    }
    api.pacientes.crear({ nombre: nuevo.nombre.trim(), dni: (nuevo.dni || "").trim() }).then((p) => { cargarPac(); if (p?.id) setF((x) => ({ ...x, pacienteId: p.id })); setNuevo(null); setAbrePac(false); setBusca(""); notify("Paciente creado."); }).catch(() => notify("No se pudo crear el paciente."));
  };

  const ejecutarGuardado = async (forzarFueraDeHorario = false) => {
    const sedeId = f.sedeId || seds[0]?.id;
    if (!sedeId) { notify("La sede es obligatoria."); return; }
    if (!f.sillon) { notify("El sillón es obligatorio."); return; }
    const mot = [f.motivo.trim(), (f.nota || "").trim()].filter(Boolean).join(" — ") || "Consulta";
    setGuardando(true);
    const cuerpo = { pacienteId: f.pacienteId, especialidadId: f.especialidadId || null, medicoId: f.medicoId, sedeId, hora: f.hora, duracionMin: Number(f.duracionMin) || 30, sillon: Number(f.sillon), motivo: mot, canalOrigen: f.canal, estado: "confirmada", ...(forzarFueraDeHorario ? { forzarFueraDeHorario: true } : {}) };
    const paso = f.repetir === "semanal" ? 7 : f.repetir === "quincenal" ? 14 : f.repetir === "mensual" ? 30 : 0;
    const n = f.repetir === "no" ? 1 : Math.max(1, Math.min(12, Number(f.veces) || 1));
    const fechas = []; for (let i = 0; i < n; i++) { const d = new Date(f.fecha + "T00:00:00"); d.setDate(d.getDate() + paso * i); fechas.push(fmt(d)); }
    let ok = 0, fail = 0, avisados = 0, avisarFail = 0, ultimoError = "";
    if (demo) {
      const p = pac.find((x) => String(x.id) === String(f.pacienteId)) || {};
      const med = MEDICOS.find((m) => String(m.id) === String(f.medicoId)) || {};
      // Cada fecha (también las repetidas) pasa por las mismas reglas: doctor, sillón y bloqueos.
      const ocupado = (fch) => evaluarCita(ctxSede, citaBorrador({ fecha: fch })).errores.length > 0;
      const libres = fechas.filter((fch) => !ocupado(fch));
      const base0 = Date.now();
      demoDb.setCitas((cs) => [...cs, ...libres.map((fch, i) => ({ id: base0 + i, paciente: p.nombre, pacienteId: p.id, dni: p.dni || "", medicoId: Number(f.medicoId), esp: Number(f.especialidadId) || med.esp || 1, sede: Number(sedeId) || 1, sillon: Number(f.sillon), duracionMin: Number(f.duracionMin) || 30, fecha: fch, hora: f.hora, motivo: mot, estado: "pendiente", llegada: false }))]);
      setGuardando(false); setAvisoHorario(null);
      if (!libres.length) { notify(evaluarCita(ctxSede, citaBorrador()).errores[0] || "Ese horario no está disponible."); return; }
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

  const guardar = async () => {
    if (!f.pacienteId || !f.medicoId) { notify("Selecciona paciente y doctor."); return; }
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
    await ejecutarGuardado(false);
  };

  const canalBtns = (
    <div style={{ display: "flex", gap: 8 }}>
      {[["llamada", "Llamada", <Phone size={14} strokeWidth={1.75} />], ["whatsapp", "WhatsApp", <MessageSquare size={14} strokeWidth={1.75} />], ["presencial", "Presencial", <User size={14} strokeWidth={1.75} />]].map(([k, l, ic]) => { const on = f.canal === k; return (
        <button key={k} onClick={() => setF({ ...f, canal: k })} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: "var(--dc-r-md)", border: on ? `1.5px solid ${T}` : "1.5px solid var(--dc-line)", background: on ? "var(--dc-accent-soft)" : "var(--dc-white)", color: on ? "var(--dc-brand-600)" : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{ic} {l}</button>
      ); })}
    </div>
  );
  return (
    <Modal icon={<Calendar size={20} strokeWidth={1.75} />} titulo="Agendar cita" sub="Registra la cita del paciente" onClose={onClose} maxW={masDatos ? 760 : 460}
      footer={<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <button onClick={() => setMasDatos((v) => !v)} style={{ background: "none", border: "none", color: T, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>{masDatos ? "‹ Menos datos" : "Más datos ›"}</button>
        <Btn small onClick={guardar} disabled={guardando || !!avisoHorario || evaluacion.errores.length > 0}><Check size={15} strokeWidth={1.75} /> Agendar</Btn>
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
            <span style={lbl}>Paciente{req}</span>
            <div style={{ position: "relative" }}>
              <div onClick={() => setAbrePac((v) => !v)} style={{ ...inp, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: pacSel ? NAVY : "var(--dc-ink-400)", borderColor: abrePac ? T : "var(--dc-line)" }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pacSel ? `${pacSel.nombre}${pacSel.dni ? ` – ${pacSel.dni}` : ""}` : "Buscar paciente…"}</span>
                <ChevronRight size={16} strokeWidth={1.75} style={{ transform: `rotate(${tint(abrePac ? -90 : 90, 0.871)}g)`, color: "var(--dc-ink-400)", flexShrink: 0 }} />
              </div>
              {abrePac && <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "var(--dc-white)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", boxShadow: "0 18px 40px -18px rgba(16,24,40,.4)", zIndex: 30, overflow: "hidden" }}>
                <div style={{ padding: 8 }}><input className="dc-premium-inp" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente" style={{ ...inp, padding: "8px 11px" }} /></div>
                <div style={{ maxHeight: 190, overflowY: "auto" }}>
                  {pacF.length === 0 && <div style={{ padding: "8px 14px", fontSize: 13, color: "var(--dc-ink-400)" }}>Sin coincidencias.</div>}
                  {pacF.map((p) => <button key={p.id} onClick={() => { setF({ ...f, pacienteId: p.id }); setAbrePac(false); setBusca(""); }} style={{ width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: p.id === f.pacienteId ? "var(--dc-bg)" : "var(--dc-white)", cursor: "pointer", fontSize: 13, color: NAVY, fontWeight: 500 }}>{p.nombre}{p.dni ? <span style={{ color: "var(--dc-ink-400)", fontWeight: 500 }}> – {p.dni}</span> : null}</button>)}
                </div>
                <button onClick={() => setNuevo({ nombre: busca, dni: "" })} style={{ width: "100%", padding: "10px 14px", border: "none", borderTop: "1px solid var(--dc-line)", background: "var(--dc-white)", cursor: "pointer", color: T, fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}><Plus size={15} strokeWidth={1.75} /> Agregar nuevo paciente</button>
              </div>}
            </div>
            {nuevo && <div style={{ marginTop: 8, background: "var(--dc-bg-soft2)", border: "1px dashed var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: 12, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>Nuevo paciente</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="dc-premium-inp" value={nuevo.dni} onChange={(e) => setNuevo({ ...nuevo, dni: e.target.value.replace(/[^\d]/g, "").slice(0, 8) })} placeholder="DNI" style={{ ...inp, padding: "8px 11px", flex: 1, minWidth: 0 }} />
                <BtnReniec dni={nuevo.dni} onNombre={(n) => setNuevo((x) => ({ ...x, nombre: n }))} notify={notify} />
              </div>
              <input className="dc-premium-inp" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre completo" style={{ ...inp, padding: "8px 11px" }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn small kind="ghost" onClick={() => setNuevo(null)}>Cancelar</Btn><Btn small onClick={crearNuevo}>Crear y usar</Btn></div>
            </div>}
          </div>
          <label><span style={lbl}>Doctor{req}</span>
            <Select value={f.medicoId} onChange={(v) => { setSillonAuto(true); setHoraAuto(true); setF({ ...f, medicoId: v }); }} placeholder="Seleccionar"
                    options={medsF.map((m) => { const ts = turnosDelDia(ctxReglas.disp, m.id, f.fecha, f.sedeId || null); const conH = (ctxReglas.disp || []).some((d) => String(d.medicoId) === String(m.id)); return { value: m.id, label: m.nombre, sub: !conH ? "Sin horario configurado" : ts.length ? `Atiende ${ts.map((t) => `${String(t.horaInicio).slice(0, 5)}–${String(t.horaFin).slice(0, 5)}`).join(" · ")}` : "No atiende ese día en esta sede" }; })} />
          </label>
          {f.medicoId && <div className={`dc-agm__turno${tieneHorario && !turnosHoy.length ? " is-no" : ""}`}>
            <Clock size={13} strokeWidth={2} />
            {!tieneHorario ? <span>Este doctor no tiene horario configurado: se puede agendar a cualquier hora de la clínica.</span>
              : turnosHoy.length ? <span>{fechaLegible(f.fecha)} atiende {turnosHoy.map((t, i) => <b key={i}>{String(t.horaInicio).slice(0, 5)}–{String(t.horaFin).slice(0, 5)}{t.sede != null || t.sedeId != null ? ` (${nomSede(t.sede ?? t.sedeId).replace(/^Sede\s+/, "") || "sede"})` : ""}</b>).reduce((a, b) => [a, " y ", b])}</span>
              : <span>No atiende el {fechaLegible(f.fecha)}. Elige otra fecha u otro doctor.</span>}
          </div>}
          <label><span style={lbl}>Sede / consultorio{req}</span>
            <Select value={f.sedeId} onChange={(v) => { setSillonAuto(true); setF({ ...f, sedeId: v, sillon: "" }); }} placeholder="Seleccionar sede"
                    options={seds.map((s) => ({ value: s.id, label: s.nombre }))} />
          </label>
          <label><span style={lbl}>Motivo</span><input className="dc-premium-inp" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ej. Evaluación, dolor de muela…" style={inp} /></label>
          <div>
            <span style={lbl}>Fecha y hora</span>
            <div style={{ fontSize: 13, fontWeight: 500, color: DS.c.primary, marginBottom: 6 }}>
              {fechaLegible(f.fecha)} – {f.hora}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "8px 11px" }}>
              <Clock size={16} strokeWidth={1.75} color={pasada ? "var(--dc-red)" : "var(--dc-ink-400)"} style={{ flexShrink: 0 }} />
              <input className="dc-premium-inp" type="date" value={f.fecha} onChange={(e) => { setHoraAuto(true); setF({ ...f, fecha: e.target.value }); }} style={{ border: "none", outline: "none", fontSize: 13, color: NAVY, flex: 1, minWidth: 0, background: "transparent" }} />
              <input className="dc-premium-inp" type="time" value={f.hora} onChange={(e) => { setHoraAuto(false); setF({ ...f, hora: e.target.value }); }} style={{ border: "none", outline: "none", fontSize: 13, color: NAVY, width: 92, background: "transparent" }} />
            </div>
            {pasada && <div style={{ fontSize: 12, color: "var(--dc-red)", fontWeight: 500, marginTop: 5 }}>Fecha pasada</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <label><span style={lbl}>Duración</span>
              <Select value={f.duracionMin} onChange={(v) => setF({ ...f, duracionMin: Number(v) })}
                      options={[15, 30, 45, 60, 90, 120].map((m) => ({ value: m, label: m >= 60 ? `${m / 60} h${m % 60 ? " 30 min" : ""}` : `${m} min` }))} />
            </label>
          </div>
          <div>
            <span style={lbl}>Sillón{req}{f.sillon && sillonAuto && <em className="dc-agm__auto">propuesto</em>}</span>
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
          {(evaluacion.errores.length > 0 || evaluacion.avisos.length > 0) && (
            <div className="dc-agm__val">
              {evaluacion.errores.map((m, i) => <p key={"e" + i} className="is-err"><Lock size={13} strokeWidth={2.2} /> {m}</p>)}
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
          <label><span style={lbl}>Servicio / especialidad</span>
            <Select value={f.especialidadId} onChange={(v) => setF({ ...f, especialidadId: v, medicoId: "" })} placeholder="Cualquiera"
                    options={[{ value: "", label: "Cualquiera" }, ...esps.map((e) => ({ value: e.id, label: e.nombre }))]} />
          </label>
          <div><span style={lbl}>¿Cómo llegó?</span>{canalBtns}</div>
          <label><span style={lbl}>Nota de la cita</span><textarea className="dc-premium-inp" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} rows={3} placeholder="Ej. viene por promoción…" style={{ ...inp, resize: "vertical" }} /></label>
        </div>}
      </div>
    </Modal>
  );
}
