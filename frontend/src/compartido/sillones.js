/* Sillones y horario de los doctores: las reglas que comparten la agenda, el modal de
   agendado y Configuración.

   Cada sillón tiene un uso:
   - "flexible": lo usa el doctor que esté libre; cambia de doctor según el día.
   - "doctor": es el sillón habitual de un doctor (se le propone siempre a él).
   - "especialidad": está equipado para una especialidad (p. ej. odontopediatría).
   Con `exclusivo` el sillón SOLO acepta a ese doctor o a esa especialidad; sin él es
   preferente: otros pueden usarlo si está libre, con aviso.

   Una cita es válida si:
   1. el doctor atiende ese día y a esa hora (su horario, si lo tiene configurado),
   2. el doctor no tiene otra cita que se cruce,
   3. el sillón está activo, acepta a ese doctor / especialidad y está libre,
   4. no cae en un bloqueo de agenda. */

export const USOS_SILLON = [
  { v: "flexible", l: "Flexible", d: "Lo usa el doctor que esté libre." },
  { v: "doctor", l: "Fijo de un doctor", d: "Es el sillón habitual de un doctor." },
  { v: "especialidad", l: "De una especialidad", d: "Equipado para una especialidad, p. ej. odontopediatría." },
];

// Sillones de la demostración: San Isidro con uno de ortodoncia preferente; Surco con
// el sillón de niños exclusivo de odontopediatría y el de la Dra. Quispe.
export const SILLONES_DEMO = [
  { id: "s1-1", sede: 1, numero: 1, nombre: "Sillón 1", uso: "flexible", activo: true },
  { id: "s1-2", sede: 1, numero: 2, nombre: "Sillón 2", uso: "flexible", activo: true },
  { id: "s1-3", sede: 1, numero: 3, nombre: "Sillón 3", uso: "especialidad", especialidadId: 2, exclusivo: false, activo: true },
  { id: "s2-1", sede: 2, numero: 1, nombre: "Sillón Kids", uso: "especialidad", especialidadId: 5, exclusivo: true, activo: true },
  { id: "s2-2", sede: 2, numero: 2, nombre: "Sillón 2", uso: "doctor", medicoId: 3, exclusivo: false, activo: true },
  { id: "s2-3", sede: 2, numero: 3, nombre: "Sillón 3", uso: "flexible", activo: true },
];

// Horario semanal de cada doctor en la demostración (diaSemana: 0 = domingo).
const bloque = (medicoId, sede, dias, horaInicio, horaFin) => dias.map((d) => ({ id: `d${medicoId}-${sede}-${d}-${horaInicio}`, medicoId, sede, diaSemana: d, horaInicio, horaFin }));
const LV = [1, 2, 3, 4, 5], LS = [1, 2, 3, 4, 5, 6];
export const DISP_DEMO = [
  ...bloque(1, 1, LS, "08:00", "13:30"), ...bloque(1, 2, LV, "14:00", "19:00"),
  ...bloque(2, 1, LV, "14:00", "19:30"), ...bloque(2, 1, [6], "09:00", "13:00"),
  ...bloque(3, 2, LV, "08:00", "13:00"), ...bloque(3, 2, LV, "15:00", "18:30"),
  ...bloque(4, 2, LS, "10:00", "13:00"), ...bloque(4, 2, LV, "15:00", "19:00"),
  ...bloque(5, 1, LS, "11:00", "18:00"),
  ...bloque(6, 2, LS, "09:00", "17:00"),
];

const INACTIVAS = ["cancelada", "no_show", "reprogramada", "cerrada_sistema"];
const aMin = (h) => { const [a, b] = String(h || "0:0").slice(0, 5).split(":").map(Number); return (a || 0) * 60 + (b || 0); };
const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const dur = (c) => Number(c.duracionMin) || 30;
const mismo = (a, b) => a != null && b != null && String(a) === String(b);
const sedeDe = (c) => c.sede ?? c.sedeId;
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const diaDe = (fecha) => new Date(`${fecha}T00:00:00`).getDay();

/** Normaliza un sillón venga de la demostración o del servidor. */
export const normSillon = (r) => ({
  id: r.id ?? `s${r.sedeId ?? r.sede}-${r.numero}`,
  sede: r.sede ?? r.sedeId ?? null,
  numero: Number(r.numero) || 0,
  nombre: r.nombre || `Sillón ${r.numero}`,
  uso: r.uso || (r.medicoId ? "doctor" : r.especialidadId ? "especialidad" : "flexible"),
  medicoId: r.medicoId ?? null,
  especialidadId: r.especialidadId ?? null,
  exclusivo: !!r.exclusivo,
  activo: r.activo !== false,
  nota: r.nota || "",
});

export const sillonesDeSede = (sillones, sede) => (sillones || []).filter((s) => sede == null || mismo(s.sede, sede)).sort((a, b) => a.numero - b.numero);

/** Etiqueta corta del uso del sillón: «Flexible», «Solo Odontopediatría», «Fijo · Dra. Quispe». */
export function etiquetaUso(s, { medicos = [], especialidades = [] } = {}) {
  if (!s.activo) return { txt: "Fuera de servicio", tono: "off" };
  if (s.uso === "doctor") {
    const m = medicos.find((x) => mismo(x.id, s.medicoId));
    return { txt: `${s.exclusivo ? "Solo" : "Fijo ·"} ${m ? m.nombre : "doctor"}`, tono: "doc" };
  }
  if (s.uso === "especialidad") {
    const e = especialidades.find((x) => mismo(x.id, s.especialidadId));
    return { txt: `${s.exclusivo ? "Solo" : "Pref."} ${e ? e.nombre : "especialidad"}`, tono: "esp" };
  }
  return { txt: "Flexible", tono: "flex" };
}

/** ¿El sillón acepta a este doctor / especialidad? nivel: propio | libre | ajeno | no */
export function reglaSillon(s, { medicoId, esp }, { medicos = [], especialidades = [] } = {}) {
  if (!s.activo) return { nivel: "no", motivo: `${s.nombre} está fuera de servicio${s.nota ? ` (${s.nota})` : ""}.` };
  if (s.uso === "doctor" && s.medicoId != null) {
    if (mismo(s.medicoId, medicoId)) return { nivel: "propio", motivo: "" };
    const m = medicos.find((x) => mismo(x.id, s.medicoId));
    const quien = m ? m.nombre : "otro doctor";
    return s.exclusivo ? { nivel: "no", motivo: `${s.nombre} es exclusivo de ${quien}.` } : { nivel: "ajeno", motivo: `${s.nombre} es el sillón habitual de ${quien}.` };
  }
  if (s.uso === "especialidad" && s.especialidadId != null) {
    if (mismo(s.especialidadId, esp)) return { nivel: "propio", motivo: "" };
    // Un doctor de esa especialidad también puede usarlo aunque la cita sea de otra cosa.
    const m = medicos.find((x) => mismo(x.id, medicoId));
    const espsMed = m ? (m.esps || [m.esp ?? m.especialidadId]) : [];
    if (espsMed.some((e) => mismo(e, s.especialidadId)) && !s.exclusivo) return { nivel: "propio", motivo: "" };
    const e = especialidades.find((x) => mismo(x.id, s.especialidadId));
    const nom = e ? e.nombre.toLowerCase() : "su especialidad";
    return s.exclusivo ? { nivel: "no", motivo: `${s.nombre} es solo para ${nom}.` } : { nivel: "ajeno", motivo: `${s.nombre} está reservado de preferencia para ${nom}.` };
  }
  return { nivel: "libre", motivo: "" };
}

/** Citas activas que se cruzan con [hora, hora + duración) ese día. */
export function cruces(citas, { fecha, hora, duracionMin, excluirId }) {
  const ini = aMin(hora), fin = ini + (Number(duracionMin) || 30);
  return (citas || []).filter((c) => c.fecha === fecha && !INACTIVAS.includes(c.estado) && !mismo(c.id, excluirId)
    && aMin(c.hora) < fin && ini < aMin(c.hora) + dur(c));
}

/** Bloques del horario del doctor para ese día (y sede, si el bloque la indica). */
export const turnosDelDia = (disp, medicoId, fecha, sede) => (disp || [])
  .filter((d) => mismo(d.medicoId, medicoId) && Number(d.diaSemana) === diaDe(fecha) && d.activo !== false && (sede == null || (d.sede ?? d.sedeId) == null || mismo(d.sede ?? d.sedeId, sede)))
  .sort((a, b) => aMin(a.horaInicio) - aMin(b.horaInicio));

const txtTurnos = (ts) => ts.map((t) => `${String(t.horaInicio).slice(0, 5)}–${String(t.horaFin).slice(0, 5)}`).join(" y ");

/** ¿El doctor atiende a esa hora? Sin horario configurado no se restringe. */
export function medicoAtiende(disp, { medicoId, fecha, hora, duracionMin, sede }, nombre = "El doctor") {
  const todos = (disp || []).filter((d) => mismo(d.medicoId, medicoId));
  if (!todos.length) return { ok: true, sinHorario: true, motivo: "" };
  const ini = aMin(hora), fin = ini + (Number(duracionMin) || 30);
  const delDia = (disp || []).filter((d) => mismo(d.medicoId, medicoId) && Number(d.diaSemana) === diaDe(fecha) && d.activo !== false);
  if (!delDia.length) return { ok: false, motivo: `${nombre} no atiende los ${DIAS[diaDe(fecha)]}.` };
  const enSede = delDia.filter((d) => sede == null || (d.sede ?? d.sedeId) == null || mismo(d.sede ?? d.sedeId, sede));
  if (!enSede.length) return { ok: false, motivo: `${nombre} no atiende en esta sede los ${DIAS[diaDe(fecha)]} (está en otra sede: ${txtTurnos(delDia)}).` };
  if (enSede.some((d) => aMin(d.horaInicio) <= ini && fin <= aMin(d.horaFin))) return { ok: true, motivo: "" };
  return { ok: false, motivo: `${nombre} atiende ese día de ${txtTurnos(enSede)}; ${aHora(ini)}–${aHora(fin)} queda fuera.` };
}

/** Bloqueo de agenda que pisa la cita (almuerzo, ausencia, mantenimiento). */
export function bloqueoQuePisa(bloqueos, { fecha, hora, duracionMin, medicoId, sillon, sede }) {
  const ini = aMin(hora), fin = ini + (Number(duracionMin) || 30), dow = diaDe(fecha);
  return (bloqueos || []).find((b) => {
    const aplica = (b.fecha && String(b.fecha).slice(0, 10) === fecha) || (!b.fecha && Number(b.diaSemana) === dow);
    if (!aplica) return false;
    if (b.medicoId != null && !mismo(b.medicoId, medicoId)) return false;
    if (b.sillon != null && (!mismo(b.sillon, sillon) || (b.sede != null && !mismo(b.sede, sede)))) return false;
    return aMin(b.horaInicio) < fin && ini < aMin(b.horaFin);
  }) || null;
}

/** Estado de cada sillón de la sede para esa cita: libre, ocupado o no permitido. */
/** Asignación del día (turno) que cubre la hora de la cita en ese sillón, si la hay. */
export function asignacionDe(asignaciones, s, { fecha, hora, duracionMin }) {
  if (!fecha || !hora) return null;
  const ini = aMin(hora), fin = ini + (Number(duracionMin) || 30);
  return (asignaciones || []).find((a) => a.fecha === fecha && mismo(a.sede, s.sede) && mismo(a.sillon, s.numero) && aMin(a.desde) < fin && ini < aMin(a.hasta)) || null;
}

export function estadoSillones(ctx, cita) {
  const { sillones, citas, medicos = [], especialidades = [], asignaciones = [], bloqueos = [] } = ctx;
  return sillonesDeSede(sillones, sedeDe(cita)).map((s) => {
    let regla = reglaSillon(s, { medicoId: cita.medicoId, esp: cita.esp ?? cita.especialidadId }, { medicos, especialidades });
    // Turno del día: manda sobre el uso habitual del sillón.
    const asig = s.activo ? asignacionDe(asignaciones, s, cita) : null;
    if (asig) {
      const m = medicos.find((x) => mismo(x.id, asig.medicoId));
      regla = mismo(asig.medicoId, cita.medicoId) ? { nivel: "propio", motivo: "", turno: asig }
        : { nivel: "no", motivo: `${s.nombre} está asignado a ${m ? m.nombre : "otro doctor"} de ${asig.desde} a ${asig.hasta}.`, turno: asig };
    }
    // Bloqueo solo de este sillón (mantenimiento, por ejemplo).
    const blq = bloqueoQuePisa((bloqueos || []).filter((b) => b.sillon != null), { ...cita, sillon: s.numero, sede: s.sede });
    if (blq && regla.nivel !== "no") regla = { nivel: "no", motivo: `${s.nombre} bloqueado: ${blq.motivo || "no disponible"} (${String(blq.horaInicio).slice(0, 5)}–${String(blq.horaFin).slice(0, 5)}).` };
    const ocup = cruces(citas, { ...cita, excluirId: cita.id }).filter((c) => mismo(sedeDe(c), s.sede) && mismo(c.sillon, s.numero));
    const estado = regla.nivel === "no" ? "no" : ocup.length ? "ocupado" : regla.nivel;
    return { s, estado, regla, ocupante: ocup[0] || null };
  });
}

/** Mejor sillón libre: el propio (doctor o especialidad) > flexible > preferente de otro. */
export function sugerirSillon(ctx, cita) {
  const orden = { propio: 0, libre: 1, ajeno: 2 };
  const libres = estadoSillones(ctx, cita).filter((x) => x.estado in orden);
  libres.sort((a, b) => orden[a.estado] - orden[b.estado] || a.s.numero - b.s.numero);
  return libres[0] ? libres[0].s.numero : null;
}

/** Valida una cita completa. errores impiden guardar; avisos se muestran pero dejan seguir. */
export function evaluarCita(ctx, cita) {
  const { citas = [], disp = [], bloqueos = [], medicos = [], sillones = [] } = ctx;
  const errores = [], avisos = [];
  const med = medicos.find((m) => mismo(m.id, cita.medicoId));
  const nombre = med ? med.nombre : "El doctor";
  if (!cita.fecha || !cita.hora) return { errores, avisos };
  const at = medicoAtiende(disp, { ...cita, sede: sedeDe(cita) }, nombre);
  if (!at.ok) errores.push(at.motivo);
  const xs = cruces(citas, { ...cita, excluirId: cita.id });
  const delMedico = xs.find((c) => mismo(c.medicoId, cita.medicoId));
  if (delMedico) errores.push(`${nombre} ya tiene a ${delMedico.paciente || "otro paciente"} a las ${String(delMedico.hora).slice(0, 5)}.`);
  const delPaciente = cita.pacienteId != null && xs.find((c) => mismo(c.pacienteId, cita.pacienteId) && !mismo(c.medicoId, cita.medicoId));
  if (delPaciente) avisos.push(`El paciente ya tiene otra cita a las ${String(delPaciente.hora).slice(0, 5)}.`);
  const sil = sillonesDeSede(sillones, sedeDe(cita)).find((s) => mismo(s.numero, cita.sillon));
  if (cita.sillon && sil) {
    const est = estadoSillones(ctx, cita).find((x) => x.s.numero === sil.numero);
    if (est.estado === "no") errores.push(est.regla.motivo);
    else if (est.estado === "ocupado") errores.push(`${sil.nombre} está ocupado por ${est.ocupante.paciente || "otra cita"} (${String(est.ocupante.hora).slice(0, 5)}).`);
    else if (est.estado === "ajeno") avisos.push(`${est.regla.motivo} Se puede usar porque está libre.`);
  }
  // Los bloqueos de un sillón ya se reflejan en el estado del sillón.
  const blq = bloqueoQuePisa((bloqueos || []).filter((b) => b.sillon == null), { ...cita, sede: sedeDe(cita) });
  if (blq) errores.push(`Ese horario está bloqueado: ${blq.motivo || "no disponible"} (${String(blq.horaInicio).slice(0, 5)}–${String(blq.horaFin).slice(0, 5)}).`);
  return { errores, avisos };
}

/** Pone sillón a las citas que no lo tienen (datos anteriores a esta regla). */
export function completarSillones(citas, ctx) {
  let cambio = false;
  const hechas = [];
  const orden = [...citas].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const nuevas = new Map();
  for (const c of orden) {
    if (c.sillon || INACTIVAS.includes(c.estado)) { hechas.push(c); continue; }
    const n = sugerirSillon({ ...ctx, citas: hechas }, c) || sillonesDeSede(ctx.sillones, sedeDe(c))[0]?.numero || null;
    const c2 = { ...c, sillon: n };
    nuevas.set(c.id, c2); hechas.push(c2); cambio = true;
  }
  return cambio ? citas.map((c) => nuevas.get(c.id) || c) : citas;
}
