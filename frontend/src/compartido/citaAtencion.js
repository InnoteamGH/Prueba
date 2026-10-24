/* M8-02 / M8-03: la cita de la que viene una evolución y si una atención ya tiene la suya.
   «Completar» del Inicio, «Iniciar», «Finalizar» y «Evolución» de la agenda y «Ver atención ›
   Registrar evolución» de la historia dejan la cita en sessionStorage (dc_cita_atencion). La
   ficha la lee para ofrecerla en «Cita» (aunque no sea de hoy) y mandar su citaId al registrar
   la evolución. Sin imports: lo usan App.jsx, FichaMedica.jsx y node --test. */

export const CLAVE_CITA_ATENCION = "dc_cita_atencion";
/** La ficha ya abierta del mismo paciente se entera al instante (no solo al montarse). */
export const EVENTO_CITA_ATENCION = "dc-cita-atencion";

const txt = (v) => (v == null ? "" : String(v).trim());
const ymd = (v) => txt(v).slice(0, 10);
const hm = (v) => txt(v).slice(0, 5);
const conId = (v) => v != null && v !== "";

const almacenDe = (almacen) => {
  if (almacen !== undefined) return almacen;
  try { return typeof sessionStorage !== "undefined" ? sessionStorage : null; } catch { return null; }
};

/** Lo que la ficha necesita de la cita: su id, su día, su hora, el motivo y el doctor (para
    mostrarla aunque GET /citas no responda). null si falta la cita o el paciente. */
export function citaAtencionDe(cita, { pacienteId, origen } = {}) {
  if (!cita || typeof cita !== "object") return null;
  const id = conId(cita.citaId) ? cita.citaId : cita.id;
  const pid = conId(pacienteId) ? pacienteId : cita.pacienteId;
  if (!conId(id) || !conId(pid)) return null;
  const medico = typeof cita.medico === "string" ? cita.medico : "";
  return {
    pacienteId: String(pid),
    citaId: String(id),
    fecha: ymd(cita.fecha) || null,
    hora: hm(cita.hora) || null,
    motivo: txt(cita.motivo) || txt(cita.especialidad) || null,
    doctor: txt(cita.doctor) || txt(medico) || txt(cita.medicoNombre) || null,
    origen: origen || txt(cita.origen) || null,
  };
}

/** Deja la cita para la ficha y avisa a la ficha abierta. Devuelve lo guardado (o null). */
export function guardarCitaAtencion(cita, opciones = {}, almacen) {
  const datos = citaAtencionDe(cita, opciones);
  if (!datos) return null;
  const s = almacenDe(almacen);
  try { if (s) s.setItem(CLAVE_CITA_ATENCION, JSON.stringify(datos)); } catch { /* sin almacenamiento */ }
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent(EVENTO_CITA_ATENCION, { detail: datos }));
    }
  } catch { /* sin eventos */ }
  return datos;
}

/** La cita pedida para este paciente; null si no hay, es de otro paciente o está dañada. */
export function leerCitaAtencion(pacienteId, almacen) {
  const s = almacenDe(almacen);
  let x = null;
  try { x = JSON.parse((s && s.getItem(CLAVE_CITA_ATENCION)) || "null"); } catch { return null; }
  if (!x || typeof x !== "object" || !conId(x.citaId)) return null;
  if (conId(pacienteId) && String(x.pacienteId) !== String(pacienteId)) return null;
  return x;
}

export function limpiarCitaAtencion(almacen) {
  const s = almacenDe(almacen);
  try { if (s) s.removeItem(CLAVE_CITA_ATENCION); } catch { /* sin almacenamiento */ }
}

/** Evolución firmada: con diagnóstico o detalle (un borrador vacío no cuenta). */
export const evolucionConContenido = (h) => !!(h && (txt(h.diagnostico) || txt(h.detalle)));

/** ficha360 trae las citas sin id (M6-06): se les pone el de GET /citas del mismo día y hora
    (o el único de ese día si la ficha también tiene una sola). Una cita de GET /citas no se
    asigna a dos de la ficha; sin coincidencia clara, la cita queda sin id. */
export function ponerIdsCitas(citasFicha, citasApi) {
  const ficha = Array.isArray(citasFicha) ? citasFicha : [];
  const api = (Array.isArray(citasApi) ? citasApi : []).filter((c) => c && conId(c.id));
  const usados = new Set(ficha.filter((c) => c && conId(c.id)).map((c) => String(c.id)));
  return ficha.map((c) => {
    if (!c || conId(c.id)) return c;
    const dia = ymd(c.fecha);
    const libres = api.filter((x) => ymd(x.fecha) === dia && !usados.has(String(x.id)));
    const h = hm(c.hora);
    const mismaHora = h ? libres.filter((x) => hm(x.hora) === h) : [];
    const sinIdDelDia = ficha.filter((y) => y && !conId(y.id) && ymd(y.fecha) === dia).length;
    const elegida = mismaHora.length === 1 ? mismaHora[0]
      : (!mismaHora.length && libres.length === 1 && sinIdDelDia === 1 ? libres[0] : null);
    if (!elegida) return c;
    usados.add(String(elegida.id));
    return { ...c, id: elegida.id };
  });
}

const fechaEn = (fechaDeCita, id) => {
  if (!conId(id) || !fechaDeCita) return "";
  const v = fechaDeCita instanceof Map ? fechaDeCita.get(String(id)) : fechaDeCita[String(id)];
  return ymd(v);
};

/**
 * La atención de un día: sus evoluciones y las citas atendidas que aún no tienen la suya.
 * Se decide por citaId cuando la evolución y la cita lo tienen: la evolución de una atención
 * puede escribirse otro día (p. ej. al «Completar» una alerta antigua). La fecha es solo el
 * respaldo: evoluciones antiguas sin citaId o citas cuyo id no se conoce.
 * @param {{ fecha: string, citas?: object[], historia?: object[], fechaDeCita?: Map|object }} p
 *   citas: las de ese día (con id cuando se sabe); historia: todas las evoluciones del
 *   paciente; fechaDeCita: id de cita → su día, de todas las citas conocidas.
 * @returns {{ evos: object[], sinEvolucion: object[] }}
 */
export function atencionPorCita({ fecha, citas = [], historia = [], fechaDeCita = null } = {}) {
  const dia = ymd(fecha);
  const lista = (Array.isArray(citas) ? citas : []).filter(Boolean);
  const idsDia = new Set(lista.filter((c) => conId(c.id)).map((c) => String(c.id)));
  const hist = (Array.isArray(historia) ? historia : []).filter(Boolean);
  const ligadaAlDia = (h) => conId(h.citaId) && (idsDia.has(String(h.citaId)) || fechaEn(fechaDeCita, h.citaId) === dia);
  // Escrita ese día pero ligada a una cita de otro día: es de aquella atención.
  const deOtraAtencion = (h) => conId(h.citaId) && !ligadaAlDia(h) && !!fechaEn(fechaDeCita, h.citaId);
  const evos = hist.filter((h) => ymd(h.fecha) === dia || ligadaAlDia(h));
  const llenas = hist.filter(evolucionConContenido);
  const tieneEvolucion = (c) => {
    if (conId(c.id)) {
      if (llenas.some((h) => conId(h.citaId) && String(h.citaId) === String(c.id))) return true;
      // Respaldo: una evolución de ese día sin cita (las de antes de ligar por citaId).
      return llenas.some((h) => !conId(h.citaId) && ymd(h.fecha) === dia);
    }
    // Sin el id de la cita: una ligada a una cita de ese día o una escrita ese día que no
    // sea de otra atención.
    return llenas.some((h) => ligadaAlDia(h) || (ymd(h.fecha) === dia && !deOtraAtencion(h)));
  };
  const atendida = (c) => /atend|complet/i.test(String(c.estado || ""));
  return { evos, sinEvolucion: lista.filter((c) => atendida(c) && !tieneEvolucion(c)) };
}
