/* Catálogo único de estados (spec UX/UI §5.2, R4).
   Cada entidad tiene una lista cerrada de estados, con una etiqueta y un tono fijos.
   Las pantallas no escriben etiquetas ni colores de estado por su cuenta: piden
   `estadoInfo(entidad, clave)` o pintan <EstadoPill entidad clave />. */

// Tonos semánticos del tema → color base del chip (.dc-pill usa --c).
export const TONOS = {
  neutro: "#667085",
  info: "#2563EB",
  aviso: "#B45309",
  acento: "#6D4FD1",
  ok: "#15803D",
  peligro: "#B42318",
};

export const ESTADOS = {
  // Pendiente → Confirmada → En sala → En atención → Atendida · (No asistió · Cancelada · Reprogramada)
  cita: {
    pendiente: ["Pendiente", "neutro"],
    confirmada: ["Confirmada", "info"],
    en_sala: ["En sala", "aviso"],
    en_atencion: ["En atención", "acento"],
    atendida: ["Atendida", "ok"],
    no_show: ["No asistió", "peligro"],
    cancelada: ["Cancelada", "peligro"],
    reprogramada: ["Reprogramada", "neutro"],
    cerrada_sistema: ["Cerrada por sistema", "neutro"],
  },
  // Propuesto → Por realizar → En curso → Terminado (por cobrar) → Pagado · (Anulado)
  // En los datos: pendiente = en el plan, por hacer; terminada = hecho sin pagar,
  // atendida = pagado. «Por realizar» y no «Aprobado»: pasar un hallazgo al presupuesto
  // no significa que el paciente lo haya aceptado.
  procedimiento: {
    propuesto: ["Propuesto", "neutro"],
    pendiente: ["Por realizar", "info"],
    en_curso: ["En curso", "acento"],
    terminada: ["Terminado · por cobrar", "aviso"],
    atendida: ["Pagado", "ok"],
    anulado: ["Anulado", "neutro"],
  },
  // Sin enviar → Enviado → Aceptado / Observado / Rechazado · (Anulado)
  comprobante: {
    sin_enviar: ["Sin enviar", "neutro"],
    pendiente: ["Enviado", "info"],
    aceptado: ["Aceptado", "ok"],
    observado: ["Observado", "aviso"],
    rechazado: ["Rechazado", "peligro"],
    anulado: ["Anulado", "neutro"],
  },
  // Borrador → Enviada → Observada → Aprobada → Pagada
  liquidacion: {
    borrador: ["Borrador", "neutro"],
    enviado: ["Enviada", "info"],
    observado: ["Observada", "aviso"],
    aprobado: ["Aprobada", "acento"],
    pagado: ["Pagada", "ok"],
  },
  // Por enviar → Enviado → En proceso → Recibido → Entregado · bandera «Atrasado»
  laboratorio: {
    por_enviar: ["Por enviar", "neutro"],
    enviado: ["Enviado", "info"],
    en_proceso: ["En proceso", "acento"],
    recibido: ["Recibido", "ok"],
    entregado: ["Entregado", "ok"],
  },
  // Enviado → Visto → Firmado o Completado · (Vencido)
  documento: {
    enviado: ["Enviado", "info"],
    pendiente: ["Enviado", "info"],
    visto: ["Visto", "acento"],
    firmado: ["Firmado", "ok"],
    completado: ["Completado", "ok"],
    vencido: ["Vencido", "peligro"],
  },
  // Programado → Entregado → Leído → Respondió · (No enviado)
  mensaje: {
    programado: ["Programado", "neutro"],
    entregado: ["Entregado", "info"],
    leido: ["Leído", "acento"],
    respondio: ["Respondió", "ok"],
    no_enviado: ["No enviado", "peligro"],
  },
};

export function estadoInfo(entidad, clave) {
  const fila = ESTADOS[entidad]?.[clave];
  if (!fila) return { label: String(clave || "—"), tono: "neutro", color: TONOS.neutro };
  return { label: fila[0], tono: fila[1], color: TONOS[fila[1]] };
}

export const estadoLabel = (entidad, clave) => estadoInfo(entidad, clave).label;

// Estado efectivo de una cita: la llegada del paciente se guarda como bandera,
// pero para todas las vistas es un estado más («En sala»).
export function estadoCita(c) {
  if (!c) return "pendiente";
  if (c.llegada && (c.estado === "pendiente" || c.estado === "confirmada")) return "en_sala";
  return c.estado || "pendiente";
}

// Citas que ya no ocupan agenda. Lo demás (pendiente → atendida) cuenta como cita activa.
export const CITA_INACTIVA = ["cancelada", "no_show", "reprogramada", "cerrada_sistema"];

/** Una sola regla para contar citas en cabeceras y descargas: las activas y, aparte,
    las canceladas, las que no asistieron y las reprogramadas. Así la cabecera, el menú
    Descargar y el resumen del día dan el mismo número. */
export function conteoCitas(citas) {
  const n = { activas: 0, cancelada: 0, no_show: 0, reprogramada: 0, cerrada_sistema: 0 };
  (citas || []).forEach((c) => { if (CITA_INACTIVA.includes(c?.estado)) n[c.estado]++; else n.activas++; });
  return n;
}

/** «10 citas · 1 cancelada · 2 no asistieron». `sufijo` va pegado a las activas (« hoy»). */
export function textoConteo(citas, sufijo = "") {
  const n = conteoCitas(citas);
  const pl = (k, uno, muchos) => `${k} ${k === 1 ? uno : muchos}`;
  return [
    `${pl(n.activas, "cita", "citas")}${sufijo}`,
    n.cancelada && pl(n.cancelada, "cancelada", "canceladas"),
    n.no_show && `${n.no_show} ${n.no_show === 1 ? "no asistió" : "no asistieron"}`,
    n.reprogramada && pl(n.reprogramada, "reprogramada", "reprogramadas"),
    n.cerrada_sistema && pl(n.cerrada_sistema, "cerrada por sistema", "cerradas por sistema"),
  ].filter(Boolean).join(" · ");
}

// Un caso de laboratorio solo está atrasado si sigue fuera (Enviado / En proceso)
// y ya pasó la fecha de entrega comprometida.
export function labAtrasado(caso, hoyISO) {
  if (!caso || !caso.entrega) return false;
  if (!(caso.estado === "enviado" || caso.estado === "en_proceso")) return false;
  return String(caso.entrega) < String(hoyISO);
}

/** Estado de un procedimiento del servidor → el del frontend. El backend guarda la anulación
    como «cancelada» (también puede llegar «cancelado» o «anulada»); la pantalla solo conocía
    «anulado», así que un procedimiento anulado seguía sumando al total, al saldo y al PDF y
    seguía ofreciendo «Terminar» (M4-01). «terminado» se lee como «terminada». */
export function estadoFaseUi(e) {
  const s = String(e || "").toLowerCase();
  if (s === "cancelada" || s === "cancelado" || s === "anulada" || s === "anulado") return "anulado";
  if (s === "terminado") return "terminada";
  if (s === "atendido") return "atendida";
  return e;
}
