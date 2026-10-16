/* Estado con el que nace (o queda) una cita. Decisión del cliente: una cita agendada por
   llamada o WhatsApp nace «pendiente» (por confirmar); solo la presencial, con el paciente en
   la clínica, nace «confirmada». Al reprogramar a otra fecha u hora vuelve a «pendiente»: el
   paciente tiene que confirmar el nuevo horario. Sin imports: lo usan App.jsx, el modal de
   agendar y node --test. */

/** «presencial» → confirmada; cualquier otro canal (llamada, WhatsApp, sin canal) → pendiente. */
export function estadoInicialCita(canal) {
  return String(canal || "").trim().toLowerCase() === "presencial" ? "confirmada" : "pendiente";
}

/** Texto del aviso al agendar: «Cita agendada · por confirmar» si nace pendiente. */
export function textoCitaAgendada(estado, n = 1) {
  const base = n === 1 ? "Cita agendada" : `${n} citas agendadas`;
  return estado === "pendiente" ? `${base} · por confirmar` : base;
}

/** Al reprogramar: si cambia la fecha o la hora, la cita pasa a «pendiente»; si solo cambia
    el sillón, el doctor o la sede, conserva su estado. null = no tocar el estado. */
export function estadoAlReprogramar(cita, patch) {
  if (!cita || !patch) return null;
  const hm = (v) => String(v || "").slice(0, 5);
  const cambiaFecha = patch.fecha != null && String(patch.fecha).slice(0, 10) !== String(cita.fecha || "").slice(0, 10);
  const cambiaHora = patch.hora != null && hm(patch.hora) !== hm(cita.hora);
  if (!cambiaFecha && !cambiaHora) return null;
  return cita.estado === "pendiente" ? null : "pendiente";
}
