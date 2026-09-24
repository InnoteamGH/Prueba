/* Módulo Disponibilidad. Extraído de App.jsx para servirse en un chunk aparte (code splitting). */
import React, { useState, useEffect, useMemo } from "react";
import { AlertCircle, AlertTriangle, BellRing, CalendarCheck, Check, ChevronRight, Clock, Lock, MapPin, Repeat, Send, Trash2, X } from "lucide-react";
import api, { auth } from "../api/client";
import {Btn, Card, DISPLAY_FONT, DS, ESPECIALIDADES, MEDICOS, Modal, NAVY, SEDES, Select, TEAL, TimeSelect, addDays, cortaSede, diasAbiertosDe, espsDe, etiquetaSedes, fechaLegible, fmt, horarioDeSede, horasEntre, hoy, jornadaClinica, minutosViaje, nombreSede, puede, toMin, tint} from "../comun";

function Disponibilidad({ notify, usuario, citas = [], setCitas, horarioClinica = { horario: {}, feriados: [] } }) {
  // Los días y las horas los pone el horario de la clínica, no este módulo: es lo que
  // cambia de una clínica a otra (unas abren sábado, otras domingo, otras solo hasta la
  // una). El doctor ajusta lo suyo dentro de ese marco.
  const HOR = horarioClinica.horario || {};
  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  // Las sedes donde atiende este doctor: el horario es de cada sede, y él puede ofrecer
  // los días que abra cualquiera de las suyas. "all" o sin sedes → el horario general.
  const MIS_SEDES = Array.isArray(usuario?.sedes) && usuario.sedes.length ? usuario.sedes : [null];
  const DOW_SEMANA = [1, 2, 3, 4, 5, 6, 0].filter((d) => diasAbiertosDe(HOR, MIS_SEDES).has(d));
  /** Jornada de un día juntando las sedes del doctor: abre con la primera y cierra con la última. */
  const jornadaDelDia = (fecha) => {
    let abre = null, cierra = null, nota = "";
    for (const sid of MIS_SEDES) {
      const j = jornadaClinica(horarioDeSede(HOR, sid), horarioClinica.feriados, fecha);
      if (!j.abierta) { if (!nota && j.nota) nota = j.nota; continue; }
      if (!abre || j.abre < abre) abre = j.abre;
      if (!cierra || j.cierra > cierra) cierra = j.cierra;
    }
    return abre ? { abierta: true, abre, cierra } : { abierta: false, nota };
  };
  // Las filas de la rejilla cubren de la apertura más temprana al cierre más tardío de
  // la semana; cada celda ya sabe si su día concreto está abierto a esa hora.
  const RANGO = (() => {
    let ini = 24, fin = 0;
    for (const d of DOW_SEMANA) {
      for (const sid of MIS_SEDES) {
        const h = horarioDeSede(HOR, sid);
        const c = h[String(d)] || null;
        if (!c || c.cerrado) continue;
        ini = Math.min(ini, parseInt(c.abre || "09:00", 10));
        fin = Math.max(fin, parseInt(c.cierra || "19:00", 10));
      }
    }
    if (ini >= fin) { ini = 9; fin = 19; }
    return [ini, fin];
  })();
  const HORAS = horasEntre(String(RANGO[0]).padStart(2, "0") + ":00", String(RANGO[1]).padStart(2, "0") + ":00")
    .map((h) => String(h).padStart(2, "0") + ":00");
  const TEAL = DS.c.primary;
  const [jornada, setJornada] = useState({ ini: "08:00", fin: "18:00" });
  const [diasAtiende, setDiasAtiende] = useState(() => DOW_SEMANA.map(() => true));
  const conectado = !!auth.token;
  const [guardandoDisp, setGuardandoDisp] = useState(false);
  // Carga la disponibilidad guardada del médico (días + jornada) al abrir.
  useEffect(() => {
    if (!conectado) return;
    api.disponibilidad.listar().then((rows) => {
      if (!Array.isArray(rows) || !rows.length) return;
      const dias = [false, false, false, false, false, false];
      rows.forEach((d) => { const idx = (Number(d.diaSemana) || 0) - 1; if (idx >= 0 && idx < 6) dias[idx] = true; });
      setDiasAtiende(dias);
      const r0 = rows[0];
      if (r0?.horaInicio && r0?.horaFin) setJornada({ ini: String(r0.horaInicio).slice(0, 5), fin: String(r0.horaFin).slice(0, 5) });
    }).catch(() => {});
  }, []); // eslint-disable-line
  const guardarDisp = async () => {
    if (!conectado) { notify("Disponibilidad guardada. Tu agenda ya la usa."); return; }
    const dias = diasAtiende.map((on, idx) => on ? { diaSemana: idx + 1, horaInicio: jornada.ini, horaFin: jornada.fin } : null).filter(Boolean);
    setGuardandoDisp(true);
    try {
      await api.disponibilidad.guardarMi({ dias });
      notify("Disponibilidad guardada. Tu agenda y el asistente ya la usan.");
    } catch (e) {
      notify(String(e?.message || "").toLowerCase().includes("médico") ? "Tu usuario no está vinculado a una ficha de médico." : "No se pudo guardar la disponibilidad.");
    }
    setGuardandoDisp(false);
  };
  const [bloqueos, setBloqueos] = useState([]);
  // Cargar bloqueos desde la API
  useEffect(() => {
    if (!conectado) return;
    api.bloqueos.listar().then((rows) => {
      if (!Array.isArray(rows)) return;
      setBloqueos(rows.map((b) => ({
        id: b.id,
        fecha: b.fecha,
        ini: String(b.horaInicio || "").slice(0, 5),
        fin: String(b.horaFin || "").slice(0, 5),
        motivo: b.motivo || "Bloqueo"
      })));
    }).catch(() => {});
  }, [conectado]);
  // Bloqueos recurrentes: una entrada por día de la semana (se repiten cada semana).
  const [recurrentes, setRecurrentes] = useState(() => [0, 1, 2, 3, 4, 5].map((d) => ({ id: 100 + d, dia: d, ini: "13:00", fin: "14:00", motivo: "Almuerzo" })));
  const [motivo, setMotivo] = useState("Bloqueo");
  const [modo, setModo] = useState("semana"); // "semana" | "recurrente"
  const ANTICIP = 7;                                  // días de anticipación exigidos
  // La rejilla abría SIEMPRE en la semana en curso, que por la regla de anticipación no
  // se puede tocar entera: el módulo cuya función es editar la disponibilidad se abría
  // en la única semana donde no se puede editar nada. Arranca en la primera semana que
  // sí admite cambios; para mirar la actual está el botón «Hoy».
  const lunesDe = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
  const [semOff, setSemOff] = useState(() => Math.round((lunesDe(new Date(addDays(ANTICIP) + "T00:00:00")) - lunesDe(new Date(hoy))) / 604800000));

  const rid = () => Date.now() + Math.random();
  const mot = () => motivo.trim() || "Bloqueo";
  const nextH = (h) => { const i = HORAS.indexOf(h); return i >= 0 && i < HORAS.length - 1 ? HORAS[i + 1] : "18:00"; };
  const lunes = useMemo(() => { const d = new Date(hoy); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd + semOff * 7); d.setHours(0, 0, 0, 0); return d; }, [semOff]);
  // Un día por cada jornada abierta de la clínica. `idx` sigue siendo la posición en la
  // rejilla; `dow` es el día de la semana real, que es lo que mira el horario.
  const semana = DOW_SEMANA.map((dow, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + ((dow + 6) % 7));
    const fecha = fmt(d);
    const j = jornadaDelDia(fecha);
    return { idx: i, dow, date: fecha, num: d.getDate(), mes: d.toLocaleDateString("es-PE", { month: "short" }),
             esHoy: fecha === fmt(hoy), jornada: j };
  });

  /* ---- Reglas de negocio: multi-sede, anticipación y sustituciones ---- */
  const miMedico = MEDICOS.find((m) => m.nombre === usuario?.nombre) || MEDICOS[0];
  const miId = miMedico.id;
  const espNombre = ESPECIALIDADES.find((e) => e.id === miMedico.esp)?.nombre || "tu especialidad";
  // Colegas que pueden cubrir una cita = otros médicos que tengan LA ESPECIALIDAD DE ESA CITA.
  const colegasDeCita = (cita) => cita ? MEDICOS.filter((m) => m.id !== miId && espsDe(m).includes(cita.esp)) : [];
  const espDeCita = (cita) => ESPECIALIDADES.find((e) => e.id === cita?.esp)?.nombre || "esa especialidad";
  const limiteEdicion = addDays(ANTICIP);            // solo se puede editar desde esta fecha (ISO comparable)
  const editableFecha = (f) => f >= limiteEdicion;
  // Cita del médico en una franja (en CUALQUIER sede → da visibilidad cruzada).
  const citaEn = (fecha, hora) => citas.find((c) => c.medicoId === miId && c.fecha === fecha && c.hora >= hora && c.hora < nextH(hora) && c.estado !== "cancelada");
  // Citas comprometidas dentro de la ventana de 1 semana (no se pueden cancelar; solo sustituir).
  const comprometidas = citas.filter((c) => c.medicoId === miId && c.fecha >= fmt(hoy) && !editableFecha(c.fecha) && c.estado !== "cancelada" && c.estado !== "atendida").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const diasComprometidos = [...new Set(comprometidas.map((c) => c.fecha))];
  const citasDia = (fecha) => comprometidas.filter((c) => c.fecha === fecha);

  // Conflicto de viaje: ¿el médico `medId` alcanza a llegar a la cita `c` dadas sus otras citas ese día en OTRA sede?
  const conflictoViaje = (medId, c) => {
    const otras = citas.filter((x) => x.medicoId === medId && x.fecha === c.fecha && x.id !== c.id && x.estado !== "cancelada" && x.sede !== c.sede);
    let peor = null;
    for (const x of otras) {
      const gap = Math.abs(toMin(c.hora) - toMin(x.hora));
      const viaje = minutosViaje(x.sede, c.sede, c.hora);
      if (gap < viaje + 15 && (!peor || (gap - viaje) < (peor.gap - peor.viaje))) peor = { otra: x, viaje, gap };
    }
    return peor;
  };

  // Solicitudes de sustitución ENTRANTES: una por cada especialidad que este médico puede cubrir
  // (demuestra multi-especialidad y, en la de horario cruzado, la alerta de viaje al aceptar).
  const [solicitudes, setSolicitudes] = useState(() => {
    const vistos = new Set(), out = [];
    for (const c of citas) {
      if (c.medicoId === miId || c.fecha < fmt(hoy) || c.estado === "cancelada" || c.estado === "atendida") continue;
      if (!espsDe(miMedico).includes(c.esp) || vistos.has(c.esp)) continue;
      const otro = MEDICOS.find((m) => m.id === c.medicoId);
      if (!otro || !espsDe(otro).includes(c.esp)) continue;
      vistos.add(c.esp);
      out.push({ id: 100 + out.length, tipo: "recibida", citaId: c.id, otroId: c.medicoId, fecha: c.fecha, hora: c.hora, sede: c.sede, paciente: c.paciente, esp: c.esp, motivo: out.length ? "Cruce de horario" : "Emergencia familiar", estado: "pendiente" });
      if (out.length >= 2) break;
    }
    return out;
  });
  const [sust, setSust] = useState(null);                       // cita para la que se pide sustitución
  const [sustDest, setSustDest] = useState("");
  const [sustMotivo, setSustMotivo] = useState("");
  const [sustDia, setSustDia] = useState(null);                 // fecha para "sustituir día completo"
  const [diaDest, setDiaDest] = useState({});                   // { citaId: medicoId } por cita del día
  const [alertaViaje, setAlertaViaje] = useState(null);         // conflicto de viaje al aceptar
  const recibidas = solicitudes.filter((s) => s.tipo === "recibida");
  const enviadas = solicitudes.filter((s) => s.tipo === "enviada");
  const pendientesRecibidas = recibidas.filter((s) => s.estado === "pendiente").length;
  const yaPedida = (citaId) => enviadas.find((e) => e.citaId === citaId);

  const abrirSust = (cita) => { setSustDest(colegasDeCita(cita)[0]?.id || ""); setSustMotivo(""); setSust(cita); };
  const enviarSust = () => {
    const cols = colegasDeCita(sust);
    if (!cols.length || !sustDest) { notify(`No hay otro odontólogo de ${espDeCita(sust)} para sustituirte.`); return; }
    const dest = MEDICOS.find((m) => m.id === Number(sustDest));
    setSolicitudes((s) => [...s, { id: rid(), tipo: "enviada", citaId: sust.id, otroId: dest.id, fecha: sust.fecha, hora: sust.hora, sede: sust.sede, paciente: sust.paciente, esp: sust.esp, motivo: sustMotivo.trim() || "No podré atender", estado: "pendiente" }]);
    notify(`Solicitud enviada a ${dest.nombre} (${espDeCita(sust)}). Le llegó una notificación.`);
    setSust(null); setSustMotivo("");
  };
  // Sustituir un día completo: cada cita se asigna a un colega de SU especialidad.
  const abrirDia = (fecha) => { const def = {}; citasDia(fecha).forEach((c) => { if (!yaPedida(c.id)) def[c.id] = colegasDeCita(c)[0]?.id || ""; }); setDiaDest(def); setSustDia(fecha); };
  const enviarDia = () => {
    const nuevas = citasDia(sustDia).filter((c) => !yaPedida(c.id) && diaDest[c.id]).map((c) => ({ id: rid(), tipo: "enviada", citaId: c.id, otroId: Number(diaDest[c.id]), fecha: c.fecha, hora: c.hora, sede: c.sede, paciente: c.paciente, esp: c.esp, motivo: "Ausencia (día completo)", estado: "pendiente" }));
    if (!nuevas.length) { notify("Elige un colega para cada cita del día."); return; }
    setSolicitudes((s) => [...s, ...nuevas]);
    notify(`Enviaste ${nuevas.length} solicitud(es) de sustitución para el ${fechaLegible(sustDia)}.`);
    setSustDia(null);
  };
  const doAceptar = (s) => { setCitas && setCitas((cs) => cs.map((c) => c.id === s.citaId ? { ...c, medicoId: miId } : c)); setSolicitudes((x) => x.map((y) => y.id === s.id ? { ...y, estado: "aceptada" } : y)); setAlertaViaje(null); notify("Aceptaste la sustitución. La cita ahora es tuya y aparece en tu agenda."); };
  const aceptarSust = (s) => { const cita = citas.find((c) => c.id === s.citaId) || s; const conf = conflictoViaje(miId, cita); if (conf) { setAlertaViaje({ s, ...conf }); return; } doAceptar(s); };
  const rechazarSust = (s) => { setSolicitudes((x) => x.map((y) => y.id === s.id ? { ...y, estado: "rechazada" } : y)); notify("Rechazaste la solicitud. El colega deberá mantener su cita (no puede cancelarla)."); };

  const estadoCelda = (dia, hora) => {
    const cit = citaEn(dia.date, hora);
    if (cit) return { tipo: "cita", cita: cit };
    if (!diasAtiende[dia.idx]) return { tipo: "diacerrado" };
    // Fuera de la jornada de ESE día (el sábado suele cerrar antes) no hay nada que
    // ofrecer: no es una hora libre del doctor, es que la clínica no atiende.
    if (!dia.jornada || !dia.jornada.abierta || hora < dia.jornada.abre || hora >= dia.jornada.cierra) return { tipo: "fuera", porClinica: true };
    if (hora < jornada.ini || hora >= jornada.fin) return { tipo: "fuera" };
    const rec = recurrentes.find((r) => r.dia === dia.idx && hora >= r.ini && hora < r.fin);
    if (rec) return { tipo: "bloqueado", recurrente: true, rec, motivo: rec.motivo };
    const blk = bloqueos.find((b) => b.fecha === dia.date && hora >= b.ini && hora < b.fin);
    if (blk) return { tipo: "bloqueado", recurrente: false, blk, motivo: blk.motivo };
    return { tipo: "libre" };
  };
  const liberar = async (e) => {
    if (e.recurrente) {
      setRecurrentes((r) => r.filter((x) => x.id !== e.rec.id));
    } else {
      if (conectado && e.blk.id) {
        try {
          await api.bloqueos.eliminar(e.blk.id);
          setBloqueos((b) => b.filter((x) => x.id !== e.blk.id));
          notify("Bloqueo eliminado correctamente.");
        } catch {
          notify("No se pudo eliminar el bloqueo.");
        }
      } else {
        setBloqueos((b) => b.filter((x) => x.id !== e.blk.id));
      }
    }
  };
  const bloquear = async (dia, hora) => {
    if (modo === "recurrente") {
      setRecurrentes((r) => [...r, { id: rid(), dia: dia.idx, ini: hora, fin: nextH(hora), motivo: mot() }]);
    } else {
      const nuevoBloqueo = { fecha: dia.date, horaInicio: hora, horaFin: nextH(hora), motivo: mot() };
      if (conectado) {
        try {
          const creado = await api.bloqueos.crear(nuevoBloqueo);
          setBloqueos((b) => [...b, {
            id: creado.id,
            fecha: creado.fecha,
            ini: String(creado.horaInicio || "").slice(0, 5),
            fin: String(creado.horaFin || "").slice(0, 5),
            motivo: creado.motivo || "Bloqueo"
          }]);
        } catch {
          notify("No se pudo crear el bloqueo.");
        }
      } else {
        setBloqueos((b) => [...b, { id: rid(), fecha: dia.date, ini: hora, fin: nextH(hora), motivo: mot() }]);
      }
    }
  };
  const avisoAnticip = () => notify(`Solo puedes cambiar tu disponibilidad con 1 semana de anticipación (desde el ${fechaLegible(limiteEdicion)}). Si no podrás atender antes de esa fecha, solicita una sustitución.`);
  const clickCelda = (dia, hora) => {
    const e = estadoCelda(dia, hora);
    if (e.tipo === "cita") { abrirSust(e.cita); return; }
    if (e.tipo === "diacerrado") { if (!editableFecha(dia.date)) { avisoAnticip(); return; } notify(`${DIAS[dia.dow]} está cerrado. Ábrelo desde su cabecera.`); return; }
    // Distinguir de quién es el cierre: decirle que ajuste su rango cuando la que no
    // atiende es la clínica sería mandarle a un sitio donde no puede hacer nada.
    if (e.tipo === "fuera") { notify(e.porClinica ? "La clínica no atiende a esa hora. El horario lo fija administración." : "Esa hora está fuera de tu jornada. Ajusta el rango arriba."); return; }
    if (!editableFecha(dia.date)) { avisoAnticip(); return; }
    if (e.tipo === "bloqueado") { liberar(e); notify(e.recurrente ? "Liberaste el bloqueo recurrente de ese día." : "Hora liberada."); return; }
    bloquear(dia, hora);
    notify(modo === "recurrente" ? `${hora} bloqueada cada ${DIAS[dia.dow].toLowerCase()} (todas las semanas).` : `Bloqueaste ${hora} del ${dia.num}.`);
  };
  const clickFila = (hora) => {
    if (hora < jornada.ini || hora >= jornada.fin) { notify("Esa hora está fuera de tu jornada."); return; }
    const abiertos = semana.filter((d) => diasAtiende[d.idx] && editableFecha(d.date));
    if (!abiertos.length) { avisoAnticip(); return; }
    const editables = abiertos.filter((d) => { const t = estadoCelda(d, hora).tipo; return t === "libre" || t === "bloqueado"; });
    const todos = editables.length && editables.every((d) => estadoCelda(d, hora).tipo === "bloqueado");
    if (todos) { editables.forEach((d) => liberar(estadoCelda(d, hora))); notify(`Liberaste las ${hora} (días editables).`); }
    else { editables.forEach((d) => { if (estadoCelda(d, hora).tipo === "libre") bloquear(d, hora); }); notify(modo === "recurrente" ? `${hora} bloqueada todas las semanas (${mot()}).` : `${hora} bloqueada en los días editables.`); }
  };
  const toggleDiaAtiende = (idx) => { const d = semana[idx]; if (!editableFecha(d.date)) { avisoAnticip(); return; } setDiasAtiende((s) => s.map((x, j) => j === idx ? !x : x)); notify(`${DIAS[d.dow]} ${diasAtiende[idx] ? "cerrado" : "abierto"} para atención.`); };
  const inputT = { padding: "7px 9px", borderRadius: "var(--dc-r-sm)", border: "1.5px solid var(--dc-line)", fontSize: 13, color: NAVY, outline: "none" };

  const libresSemana = semana.reduce((s, d) => s + HORAS.filter((h) => estadoCelda(d, h).tipo === "libre").length, 0);
  // La semana tiene tantos días como abra la clínica: puede ser uno o siete, así que
  // el rango se lee del primero y el último que haya, no de una posición fija.
  const ultimo = semana[semana.length - 1];
  const rango = semana.length ? `${semana[0].num} ${semana[0].mes} – ${ultimo.num} ${ultimo.mes}` : "Sin días de atención";
  // Agrupar recurrentes por hora+motivo para el resumen.
  const recGrupos = Object.values(recurrentes.reduce((a, r) => { const k = `${r.ini}|${r.fin}|${r.motivo}`; (a[k] = a[k] || { ini: r.ini, fin: r.fin, motivo: r.motivo, dias: [], ids: [] }); a[k].dias.push(r.dia); a[k].ids.push(r.id); return a; }, {})).sort((a, b) => a.ini.localeCompare(b.ini));
  const quitarGrupo = (ids) => { setRecurrentes((r) => r.filter((x) => !ids.includes(x.id))); notify("Bloqueo recurrente eliminado."); };
  const segBtn = (k, l) => <button onClick={() => setModo(k)} style={{ padding: "7px 13px", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: modo === k ? "var(--dc-white)" : "transparent", color: modo === k ? NAVY : "var(--dc-ink-400)", boxShadow: modo === k ? "0 1px 3px rgba(16,24,40,.12)" : "none", display: "inline-flex", alignItems: "center", gap: 5 }}>{l}</button>;
  const pill = (estado) => ({ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: "var(--dc-r-full)", whiteSpace: "nowrap", background: estado === "aceptada" ? "var(--dc-ok-soft)" : estado === "rechazada" ? "var(--dc-bg)" : "var(--dc-warn-soft)", color: estado === "aceptada" ? "var(--dc-ok-700)" : estado === "rechazada" ? "var(--dc-danger-700)" : "var(--dc-warn-600)" });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        {[["Horas libres esta semana", libresSemana, "var(--dc-ok-700)", <CalendarCheck size={18} strokeWidth={1.75} />], ["Bloqueos activos", bloqueos.length + recGrupos.length, "var(--dc-red)", <Lock size={18} strokeWidth={1.75} />], ["Días que atiendes", diasAtiende.filter(Boolean).length, TEAL, <Clock size={18} strokeWidth={1.75} />], ["Sustituciones por revisar", pendientesRecibidas, DS.c.primary, <BellRing size={18} strokeWidth={1.75} />]].map(([l, v, c, ic], i) => (
          <Card key={i} style={{ padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>{l}</div><div style={{ background: tint(c, 0.082), color: c, width: 34, height: 34, borderRadius: "var(--dc-r-sm)", display: "grid", placeItems: "center" }}>{ic}</div></div><div style={{ fontSize: 21, fontWeight: 600, color: NAVY, marginTop: 4, fontFamily: DISPLAY_FONT }}>{v}</div></Card>
        ))}
      </div>

      <Card style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: "var(--dc-info-soft)", border: "1px solid var(--dc-sky)" }}>
        <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-sm)", background: "var(--dc-info-soft)", color: "var(--dc-info-ink)", display: "grid", placeItems: "center", flexShrink: 0 }}><AlertCircle size={18} strokeWidth={1.75} /></div>
        <div style={{ fontSize: 13, color: "var(--dc-info-ink)" }}>La clínica atiende {semana.length} día(s) a la semana; aquí solo salen esos. Tu disponibilidad solo se puede modificar con <strong>1 semana de anticipación</strong> (desde el <strong>{fechaLegible(limiteEdicion)}</strong>). Las franjas con <MapPin size={11} strokeWidth={1.75} style={{ verticalAlign: -1 }} /> son citas ya agendadas — incluidas las de <strong>otra sede</strong>. Si no podrás atender, pide una <strong>sustitución</strong> (por cita o el día completo) a un colega de la especialidad de cada cita.</div>
      </Card>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Mi disponibilidad</h3>
            <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Toca la <strong>cabecera</strong> para abrir/cerrar el día, una <strong>celda</strong> para una hora, o la <strong>etiqueta de la hora</strong> para toda la fila.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" className="dc-icon-btn" aria-label="Semana anterior" onClick={() => setSemOff((s) => s - 1)} style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", width: 32, height: 32, cursor: "pointer", color: NAVY, display: "grid", placeItems: "center" }}><ChevronRight size={16} strokeWidth={1.75} style={{ transform: "rotate(180deg)" }} /></button>
            <span style={{ fontWeight: 500, color: NAVY, fontSize: 13, minWidth: 130, textAlign: "center" }}>{rango}</span>
            <button type="button" className="dc-icon-btn" aria-label="Semana siguiente" onClick={() => setSemOff((s) => s + 1)} style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", width: 32, height: 32, cursor: "pointer", color: NAVY, display: "grid", placeItems: "center" }}><ChevronRight size={16} strokeWidth={1.75} /></button>
            {semOff !== 0 && <button onClick={() => setSemOff(0)} style={{ background: "none", border: "none", color: TEAL, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Hoy</button>}
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--dc-line)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", background: "var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: 3 }}>{segBtn("semana", "Solo esta semana")}{segBtn("recurrente", <><Repeat size={13} strokeWidth={1.75} /> Cada semana</>)}</div>
          <label style={{ fontSize: 13, color: "var(--dc-ink-700)", fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>Atiendo de
            <TimeSelect value={jornada.ini} onChange={(v) => setJornada((j) => ({ ...j, ini: v }))} /> a
            <TimeSelect value={jornada.fin} onChange={(v) => setJornada((j) => ({ ...j, fin: v }))} /></label>
          <label style={{ fontSize: 13, color: "var(--dc-ink-700)", fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>Motivo:
            <input className="dc-premium-inp" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Cirugía, permiso..." style={{ ...inputT, width: 140 }} /></label>
        </div>

        <div style={{ overflowX: "auto", padding: 16 }}>
          <div style={{ minWidth: 660, display: "grid", gridTemplateColumns: `56px repeat(${semana.length},1fr)`, gap: 4 }}>
            <div />
            {semana.map((d) => { const open = diasAtiende[d.idx]; return (
              <button key={d.idx} onClick={() => toggleDiaAtiende(d.idx)} title={open ? "Clic para cerrar el día" : "Clic para abrir el día"}
                style={{ padding: "7px 4px", textAlign: "center", borderRadius: "var(--dc-r-sm)", cursor: "pointer", border: open ? (d.esHoy ? `1.5px solid ${TEAL}` : "1px solid var(--dc-line)") : "1px solid var(--dc-danger-mid)", background: open ? (d.esHoy ? tint(TEAL, 0.063) : "var(--dc-white)") : "var(--dc-bg)" }}>
                <div style={{ textTransform: "uppercase", color: open ? (d.esHoy ? TEAL : "var(--dc-ink-500)") : "var(--dc-ink-400)", fontSize: 12, fontWeight: 500 }}>{DIAS[d.dow].slice(0, 3)}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: open ? (d.esHoy ? TEAL : NAVY) : "var(--dc-danger-700)", fontFamily: DISPLAY_FONT }}>{d.num}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: open ? "var(--dc-ok-700)" : "var(--dc-danger-700)", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 1 }}>{open ? "Abierto" : <><Lock size={9} strokeWidth={1.75} /> Cerrado</>}</div>
              </button>
            ); })}
            {HORAS.map((hora) => (
              <React.Fragment key={hora}>
                <button onClick={() => clickFila(hora)} title="Bloquear o liberar esta hora en toda la semana"
                  onMouseEnter={(ev) => (ev.currentTarget.style.color = TEAL)} onMouseLeave={(ev) => (ev.currentTarget.style.color = "var(--dc-ink-500)")}
                  style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500, textAlign: "right", paddingRight: 6, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>{hora}</button>
                {semana.map((d) => { const e = estadoCelda(d, hora); const bloqEdit = (e.tipo === "libre" || e.tipo === "bloqueado" || e.tipo === "diacerrado") && !editableFecha(d.date);
                  const base = { height: 36, borderRadius: "var(--dc-r-sm)", border: "none", padding: 0, overflow: "hidden", fontSize: 12, fontWeight: 500, display: "grid", placeItems: "center", transition: "background .12s", position: "relative" };
                  const st = e.tipo === "cita"
                    ? { background: "var(--dc-bg)", cursor: "pointer", color: NAVY, border: "1px solid var(--dc-brand-soft)" }
                    : e.tipo === "diacerrado"
                    ? { background: "var(--dc-bg)", cursor: "pointer", color: "transparent", border: "1px solid var(--dc-danger-mid)" }
                    : e.tipo === "fuera"
                      ? { background: "repeating-linear-gradient(45deg,var(--dc-line),var(--dc-line) 5px,var(--dc-line) 5px,var(--dc-line) 10px)", cursor: "not-allowed", color: "transparent" }
                      : e.tipo === "bloqueado"
                        ? { background: "var(--dc-bg)", cursor: "pointer", color: "var(--dc-danger-700)", border: "1px solid var(--dc-danger-mid)" }
                        : { background: "var(--dc-white)", cursor: "pointer", color: DS.c.primary, border: "1px solid var(--dc-line)" };
                  return (
                    <button key={d.idx} onClick={() => clickCelda(d, hora)}
                      onMouseEnter={(ev) => { if (e.tipo === "libre" && editableFecha(d.date)) ev.currentTarget.style.background = "var(--dc-accent-soft)"; }}
                      onMouseLeave={(ev) => { if (e.tipo === "libre" && editableFecha(d.date)) ev.currentTarget.style.background = "var(--dc-white)"; }}
                      title={e.tipo === "cita" ? `Cita: ${e.cita.paciente} · ${nombreSede(e.cita.sede)} · clic para solicitar sustitución` : bloqEdit ? "Dentro de la ventana de 1 semana — no editable" : e.tipo === "bloqueado" ? `${e.motivo}${e.recurrente ? " (cada semana)" : ""} — clic para liberar` : e.tipo === "libre" ? "Clic para bloquear" : e.tipo === "diacerrado" ? "Día cerrado" : "Fuera de jornada"}
                      style={{ ...base, ...st, opacity: bloqEdit ? 0.55 : 1 }}>
                      {e.tipo === "cita"
                        ? <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><MapPin size={9} strokeWidth={1.75} /> {cortaSede(e.cita.sede)}</span>
                        : e.tipo === "bloqueado" ? <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.recurrente ? <Repeat size={10} strokeWidth={1.75} /> : <Lock size={10} strokeWidth={1.75} />} {e.motivo}</span> : ""}
                      {bloqEdit && e.tipo !== "cita" && <Lock size={9} strokeWidth={1.75} style={{ position: "absolute", top: 2, right: 2, opacity: .5 }} />}
                    </button>
                  ); })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {recGrupos.length > 0 && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--dc-line)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Repeat size={14} strokeWidth={1.75} color={TEAL} /> Bloqueos recurrentes (cada semana)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {recGrupos.map((g, i) => { const dl = g.dias.length === 6 ? "Todos los días" : [...g.dias].sort().map((d) => DIAS[d].slice(0, 3)).join(" · "); return (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--dc-bg)", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-full)", padding: "6px 8px 6px 12px", fontSize: 13, color: "var(--dc-danger-700)", fontWeight: 500 }}>
                  <span><strong>{g.motivo}</strong> · {g.ini}–{g.fin} · {dl}</span>
                  <button onClick={() => quitarGrupo(g.ids)} title="Eliminar" aria-label="Eliminar" style={{ background: "rgba(140,58,51,.12)", border: "none", borderRadius: "var(--dc-r-full)", width: 20, height: 20, cursor: "pointer", color: "var(--dc-danger-700)", display: "grid", placeItems: "center" }}><Trash2 size={12} strokeWidth={1.75} /></button>
                </span>
              ); })}
            </div>
          </div>
        )}

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Los cambios se reflejan al instante en tu agenda.</span>
          <Btn small onClick={guardarDisp} disabled={guardandoDisp}><Check size={15} strokeWidth={1.75} /> {guardandoDisp ? "Guardando…" : "Guardar"}</Btn>
        </div>
      </Card>

      {/* Solicitudes de sustitución (recibidas / enviadas) */}
      {(recibidas.length > 0 || enviadas.length > 0) && (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)" }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT, display: "flex", alignItems: "center", gap: 8 }}><BellRing size={17} strokeWidth={1.75} color={DS.c.primary} /> Solicitudes de sustitución</h3>
            <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Cubrir la cita de un colega de tu especialidad, o el estado de las que enviaste.</div>
          </div>
          {recibidas.map((s) => { const otro = MEDICOS.find((m) => m.id === s.otroId); return (
            <div key={s.id} style={{ padding: "14px 20px", borderTop: "1px solid var(--dc-line)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 38, height: 38, borderRadius: "var(--dc-r-md)", background: otro?.color || NAVY, color: "var(--dc-white)", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{otro?.foto}</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{otro?.nombre} te pide cubrir una cita</div>
                <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{s.paciente} · {espDeCita(s)} · {fechaLegible(s.fecha)} {s.hora} · {nombreSede(s.sede)} · <em>{s.motivo}</em></div>
                {s.estado === "pendiente" && (() => { const cv = conflictoViaje(miId, citas.find((c) => c.id === s.citaId) || s); return cv ? <div style={{ fontSize: 12, color: "var(--dc-danger-700)", background: "var(--dc-bg)", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-sm)", padding: "4px 8px", marginTop: 5, display: "inline-flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} strokeWidth={1.75} /> No alcanzas: ~{cv.viaje} min desde {cortaSede(cv.otra.sede)} y solo {cv.gap} min de margen</div> : null; })()}
              </div>
              {s.estado === "pendiente"
                ? <div style={{ display: "flex", gap: 8 }}><Btn small onClick={() => aceptarSust(s)}><Check size={14} strokeWidth={1.75} /> Aceptar</Btn><Btn small kind="ghost" onClick={() => rechazarSust(s)}><X size={14} strokeWidth={1.75} /> Rechazar</Btn></div>
                : <span style={pill(s.estado)}>{s.estado === "aceptada" ? "Aceptada" : "Rechazada"}</span>}
            </div>
          ); })}
          {enviadas.map((s) => { const otro = MEDICOS.find((m) => m.id === s.otroId); return (
            <div key={s.id} style={{ padding: "14px 20px", borderTop: "1px solid var(--dc-line)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 38, height: 38, borderRadius: "var(--dc-r-md)", background: "var(--dc-line)", color: "var(--dc-ink-400)", display: "grid", placeItems: "center", flexShrink: 0 }}><Send size={16} strokeWidth={1.75} /></div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>Pediste a {otro?.nombre} que cubra</div>
                <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{s.paciente} · {fechaLegible(s.fecha)} {s.hora} · {nombreSede(s.sede)}</div>
              </div>
              <span style={pill(s.estado)}>{s.estado === "pendiente" ? "Esperando respuesta" : s.estado === "aceptada" ? "Aceptada" : "Rechazada"}</span>
            </div>
          ); })}
        </Card>
      )}

      {/* Citas comprometidas dentro de la ventana de 1 semana (no cancelables) */}
      {comprometidas.length > 0 && (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)" }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Tus citas de los próximos 7 días</h3>
            <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>No se pueden cancelar. Puedes sustituir el <strong>día completo</strong> o <strong>cada cita</strong>; cada una la cubre un colega de <strong>su</strong> especialidad.</div>
          </div>
          {diasComprometidos.map((fecha) => { const cs = citasDia(fecha); const pend = cs.filter((c) => !yaPedida(c.id)); return (
            <div key={fecha}>
              <div style={{ padding: "10px 20px", background: "var(--dc-bg)", borderTop: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, textTransform: "capitalize" }}>{fechaLegible(fecha)} · {cs.length} cita{cs.length > 1 ? "s" : ""}</div>
                {pend.length > 1 && <Btn small kind="ghost" onClick={() => abrirDia(fecha)}><Repeat size={13} strokeWidth={1.75} /> Sustituir todo el día</Btn>}
              </div>
              {cs.map((c) => { const env = yaPedida(c.id); const cv = conflictoViaje(miId, c); return (
                <div key={c.id} style={{ padding: "12px 20px", borderTop: "1px solid var(--dc-line)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center", minWidth: 46 }}><div style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{c.hora}</div></div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 500, color: NAVY }}>{c.paciente} <span style={{ fontSize: 12, fontWeight: 500, color: DS.c.primary, background: "var(--dc-accent-soft)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-full)", padding: "1px 8px", marginLeft: 4 }}>{espDeCita(c)}</span></div>
                    <div style={{ fontSize: 13, color: "var(--dc-ink-400)", display: "flex", alignItems: "center", gap: 5 }}><MapPin size={12} strokeWidth={1.75} /> {nombreSede(c.sede)} · {c.motivo}</div>
                    {cv && <div style={{ fontSize: 12, color: "var(--dc-danger-700)", background: "var(--dc-bg)", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-sm)", padding: "4px 8px", marginTop: 5, display: "inline-flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} strokeWidth={1.75} /> Ajustado: ~{cv.viaje} min de viaje desde {cortaSede(cv.otra.sede)} ({cv.gap} min de margen)</div>}
                  </div>
                  {env
                    ? <span style={pill(env.estado)}>{env.estado === "pendiente" ? "Sustitución pedida" : env.estado === "aceptada" ? "Cubierta" : "Rechazada — la mantienes"}</span>
                    : <Btn small kind="ghost" onClick={() => abrirSust(c)}><Repeat size={14} strokeWidth={1.75} /> Sustituir</Btn>}
                </div>
              ); })}
            </div>
          ); })}
        </Card>
      )}

      {/* Modal: solicitar sustitución */}
      {sust && (
        <div onClick={() => setSust(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,27,56,.5)", display: "grid", placeItems: "center", zIndex: 200, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--dc-white)", borderRadius: "var(--dc-r-lg)", width: "100%", maxWidth: 460, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)", animation: "dcModal .24s cubic-bezier(.2,.7,.2,1)" }}>
            <div style={{ padding: "18px 22px", background: `linear-gradient(120deg,${NAVY},var(--dc-ink-alt))`, color: "var(--dc-white)" }}>
              <div style={{ fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Solicitar sustitución</div>
              <div style={{ fontSize: 13, color: "var(--dc-brand-soft)", marginTop: 2 }}>{sust.paciente} · {fechaLegible(sust.fecha)} {sust.hora} · {nombreSede(sust.sede)}</div>
            </div>
            <div style={{ padding: 22, display: "grid", gap: 14 }}>
              {colegasDeCita(sust).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--dc-danger-700)", background: "var(--dc-bg)", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-md)", padding: 12 }}>No hay otro odontólogo de {espDeCita(sust).toLowerCase()} para sustituirte. No puedes cancelar la cita; deberás atenderla.</div>
              ) : (<>
                <div style={{ fontSize: 12, color: DS.c.primary, background: "var(--dc-accent-soft)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-sm)", padding: "6px 10px" }}>Solo se listan colegas de <strong>{espDeCita(sust).toLowerCase()}</strong> (la especialidad de esta cita).</div>
                <label><span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Colega que la cubrirá</span>
                  <Select value={sustDest} onChange={setSustDest} placeholder="Elige un colega"
                          options={colegasDeCita(sust).map((m) => { const cv = conflictoViaje(m.id, sust);
                            return { value: m.id, label: `${m.nombre} · ${etiquetaSedes(m.sedes)}${cv ? " ⚠ viaje justo" : ""}` }; })} />
                </label>
                <label><span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Motivo</span>
                  <input className="dc-premium-inp" value={sustMotivo} onChange={(e) => setSustMotivo(e.target.value)} placeholder="Ej. Capacitación, salud, viaje..." style={{ width: "100%", padding: "11px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box" }} />
                </label>
                <div style={{ fontSize: 12, color: "var(--dc-ink-500)", display: "flex", gap: 7 }}><AlertCircle size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> Le llegará una notificación. Si la rechaza, la cita seguirá siendo tuya y deberás atenderla.</div>
              </>)}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Btn small kind="ghost" onClick={() => setSust(null)}>Cerrar</Btn>
                {colegasDeCita(sust).length > 0 && <Btn small onClick={enviarSust}><Send size={14} strokeWidth={1.75} /> Enviar solicitud</Btn>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: sustituir el día completo (cada cita → colega de su especialidad) */}
      {sustDia && (
        <div onClick={() => setSustDia(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,27,56,.5)", display: "grid", placeItems: "center", zIndex: 200, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--dc-white)", borderRadius: "var(--dc-r-lg)", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.3)", animation: "dcModal .24s cubic-bezier(.2,.7,.2,1)" }}>
            <div style={{ padding: "18px 22px", background: `linear-gradient(120deg,${NAVY},var(--dc-ink-alt))`, color: "var(--dc-white)" }}>
              <div style={{ fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Sustituir el día completo</div>
              <div style={{ fontSize: 13, color: "var(--dc-brand-soft)", marginTop: 2, textTransform: "capitalize" }}>{fechaLegible(sustDia)}</div>
            </div>
            <div style={{ padding: 20, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Cada cita la cubre un colega de <strong>su</strong> especialidad. Puedes asignar distintos doctores.</div>
              {citasDia(sustDia).map((c) => { const cols = colegasDeCita(c); const env = yaPedida(c.id); return (
                <div key={c.id} style={{ border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{c.hora} · {c.paciente} <span style={{ fontSize: 12, color: DS.c.primary }}>({espDeCita(c)})</span></div>
                    <div style={{ fontSize: 12, color: "var(--dc-ink-500)", display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} strokeWidth={1.75} /> {nombreSede(c.sede)}</div>
                  </div>
                  {env ? <div style={{ marginTop: 8, display: "inline-block", ...pill(env.estado) }}>Ya solicitada</div>
                    : cols.length === 0 ? <div style={{ marginTop: 8, fontSize: 12, color: "var(--dc-danger-700)" }}>Sin colega de {espDeCita(c).toLowerCase()} — deberás atenderla.</div>
                    : <Select value={diaDest[c.id] || ""} onChange={(v) => setDiaDest((d) => ({ ...d, [c.id]: v }))} placeholder="Elige un colega"
                              options={cols.map((m) => ({ value: m.id, label: `${m.nombre} · ${etiquetaSedes(m.sedes)}` }))} />}
                </div>
              ); })}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Btn small kind="ghost" onClick={() => setSustDia(null)}>Cerrar</Btn>
                <Btn small onClick={enviarDia}><Send size={14} strokeWidth={1.75} /> Enviar solicitudes</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: alerta de tiempo de viaje al aceptar una sustitución en otra sede */}
      {alertaViaje && (() => { const cDest = citas.find((c) => c.id === alertaViaje.s.citaId); return (
        <div onClick={() => setAlertaViaje(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,27,56,.5)", display: "grid", placeItems: "center", zIndex: 210, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--dc-white)", borderRadius: "var(--dc-r-lg)", width: "100%", maxWidth: 440, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)", animation: "dcModal .24s cubic-bezier(.2,.7,.2,1)" }}>
            <div style={{ padding: "18px 22px", background: "linear-gradient(120deg,var(--dc-red-deep),var(--dc-danger-700))", color: "var(--dc-white)", display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={22} strokeWidth={1.75} /><div style={{ fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>No alcanzarías a llegar</div>
            </div>
            <div style={{ padding: 20, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Tienes otra cita a las <strong>{alertaViaje.otra.hora}</strong> en <strong>{nombreSede(alertaViaje.otra.sede)}</strong>. Llegar a <strong>{nombreSede(cDest?.sede)}</strong> toma <strong>~{alertaViaje.viaje} min</strong> con tráfico y solo tienes <strong>{alertaViaje.gap} min</strong> de margen.</div>
              <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Aceptar igual puede hacerte llegar tarde a una de las dos citas. ¿Continuar?</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Btn small kind="ghost" onClick={() => setAlertaViaje(null)}>No aceptar</Btn>
                <Btn small kind="red" onClick={() => doAceptar(alertaViaje.s)}>Aceptar de todas formas</Btn>
              </div>
            </div>
          </div>
        </div>
      ); })()}
    </div>
  );
}

export default Disponibilidad;
