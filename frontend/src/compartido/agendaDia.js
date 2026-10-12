/* M6-03: la vista Día (tabla) de la Agenda iba aparte del calendario.
     - No compartía la fecha: Día 09/10 → Semana mostraba la semana de hoy, y Semana 26/10 →
       Día volvía a hoy. Ahora las dos leen y escriben la misma «fecha que se mira» (FOCO_CAL
       en App.jsx), que vale 15 minutos.
     - No mostraba los bloqueos: el bloqueo propio del médico del vie 23/10 salía en Semana y en
       Por doctor, pero Día decía «Sin citas programadas».
   Sin imports: lo usan App.jsx y node --test. */

/** Minutos que se recuerda la fecha mirada (después la agenda vuelve a abrir en hoy). */
export const FOCO_VIGENCIA_MS = 15 * 60 * 1000;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha (AAAA-MM-DD) que dejó otra vista de la agenda, si fue hace poco; si no, null. */
export function fechaFocoVigente(foco, ahoraMs = Date.now(), vigenciaMs = FOCO_VIGENCIA_MS) {
  const f = foco && String(foco.fecha || "");
  if (!f || !ISO.test(f)) return null;
  const ts = Number(foco.ts);
  if (!Number.isFinite(ts) || ahoraMs - ts > vigenciaMs) return null;
  return f;
}

const hhmm = (h) => String(h || "").slice(0, 5);
const mismo = (a, b) => a != null && b != null && String(a) === String(b);

/** Bloqueos que tocan ese día, ordenados por hora de inicio.
    - Valen los de esa fecha y los semanales de ese día de la semana.
    - Solo los de las sedes a la vista (`enSede`); uno sin sede vale para todas.
    - `soloPropios` (la agenda del médico): los de toda la agenda y los suyos (`medicoPropio`),
      no los de otro doctor ni los de un sillón. Si no se sabe quién es, solo los de toda la agenda.
    - Si no, todos (de toda la agenda, de un doctor o de un sillón). */
export function bloqueosDelDia(bloqueos, fechaISO, { medicoPropio = null, soloPropios = false, enSede = () => true } = {}) {
  if (!ISO.test(String(fechaISO || ""))) return [];
  const dow = new Date(`${fechaISO}T00:00:00`).getDay();
  return (bloqueos || [])
    .filter((b) => {
      if (!b) return false;
      const aplica = b.fecha ? String(b.fecha).slice(0, 10) === fechaISO : (b.diaSemana != null && b.diaSemana !== "" && Number(b.diaSemana) === dow);
      if (!aplica) return false;
      const sedeB = b.sede ?? b.sedeId ?? null;
      if (sedeB != null && !enSede(sedeB)) return false;
      if (soloPropios) {
        if (b.sillon != null && b.sillon !== "") return false;
        if (b.medicoId != null && b.medicoId !== "" && !mismo(b.medicoId, medicoPropio)) return false;
      }
      return true;
    })
    .sort((a, b) => hhmm(a.horaInicio).localeCompare(hhmm(b.horaInicio)) || hhmm(a.horaFin).localeCompare(hhmm(b.horaFin)));
}

const aMin = (h) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(h || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

/** R-30: ¿el bloqueo toca la franja de la hora `h` (de h:00 a h+1:00)? Antes se comparaba la
    hora como texto («17» < «17»): un bloqueo de 17:00 a 17:30 no tocaba ninguna franja y no se
    pintaba en la grilla. */
export function bloqueoTocaHora(b, h) {
  const ini = aMin(b?.horaInicio), fin = aMin(b?.horaFin);
  if (ini == null || fin == null || fin <= ini || !Number.isFinite(Number(h))) return false;
  return ini < (Number(h) + 1) * 60 && fin > Number(h) * 60;
}

/** ¿Es de un doctor o de un sillón (no de toda la agenda)? */
export const esBloqueoParcial = (b) => !!b && ((b.sillon != null && b.sillon !== "") || (b.medicoId != null && b.medicoId !== ""));

/** R-30: bloqueos de un doctor o de un sillón que la Semana y el Mes deben mostrar. Esas
    vistas no tienen columna por doctor ni por sillón: antes no los pintaban y quien agendaba
    desde la Semana no veía el hueco bloqueado (Día y Por sillón sí). No bloquean la celda
    entera (los demás doctores y sillones siguen libres), así que se muestran como aviso.
    - `oculto(medicoId)`: el doctor cuyo chip se ocultó tampoco muestra su bloqueo. */
export function bloqueosParcialesDelDia(bloqueos, fechaISO, { medicoPropio = null, soloPropios = false, enSede = () => true, oculto = () => false } = {}) {
  return bloqueosDelDia(bloqueos, fechaISO, { medicoPropio, soloPropios, enSede })
    .filter((b) => esBloqueoParcial(b) && !(b.medicoId != null && b.medicoId !== "" && oculto(b.medicoId)));
}

/** «10:00–11:00 · Almuerzo» y a quién aplica (`medNom(id)` da el nombre del doctor). */
export function textoBloqueo(b, medNom = () => "Doctor") {
  const quien = b.sillon != null && b.sillon !== "" ? `Sillón ${b.sillon}` : b.medicoId != null && b.medicoId !== "" ? medNom(b.medicoId) : "Toda la agenda";
  return { horas: `${hhmm(b.horaInicio)}–${hhmm(b.horaFin)}`, motivo: String(b.motivo || "").trim() || "Bloqueado", quien };
}
