/* R8-07: un solo criterio para saber qué doctores atienden en una sede. Lo usan Metas y
   comisiones, Producción y comisiones, el Panel (y su Resumen del mes) y Configuración ›
   Doctores. Antes Metas usaba el horario (4 doctores en Surco), Producción listaba los 6 y
   contaba la meta de un doctor sin horario en Surco («Al ritmo de su meta 0 de 1»), y
   Configuración decía «Los que atienden en Sede Surco» con los 6.
   Regla: las sedes de la ficha del doctor si el servidor las manda (GET /medicos → `sedes`,
   `sedeIds` o `sedeId`); si no (H-14: hoy llegan vacías), las sedes de su horario activo
   (GET /disponibilidad), como en la agenda. Sin ninguna de las dos no se sabe (null) y cada
   pantalla lo dice.
   Sin imports: lo usan los módulos y node --test. */

const mismoIdTxt = (a, b) => a != null && b != null && String(a) === String(b);
const idSede = (v) => (v && typeof v === "object" ? v.id : v);
const bloquesActivos = (disp) => (Array.isArray(disp) ? disp : []).filter((d) => d && d.activo !== false && d.medicoId != null);

/** Sedes que trae la ficha del doctor (lista de ids u objetos, o una sola sedeId). */
export const sedesFijasMedico = (m) => [].concat(m?.sedes ?? m?.sedeIds ?? m?.sedeId ?? []).map(idSede).filter((x) => x != null && x !== "");

/** Sedes de los bloques de horario del doctor. */
export const sedesDeHorario = (m, disp) => [...new Set((disp || [])
  .filter((d) => d && m && String(d.medicoId) === String(m.id))
  .map((d) => d.sedeId ?? d.sede).filter((x) => x != null && x !== "").map(String))];

/** Sedes donde atiende el doctor: las de su ficha o, si no trae, las de su horario activo. */
export function sedesDondeAtiende(m, disp) {
  const fijas = sedesFijasMedico(m);
  return fijas.length ? fijas.map(String) : sedesDeHorario(m, bloquesActivos(disp));
}

/** ¿Atiende el doctor en alguna de estas sedes? true o false; null si no se sabe (su ficha no
    trae sedes y no hay horario a la vista). `igual` compara ids de sede (en pantalla,
    mismaSede: acepta el id corto y el UUID). */
export function atiendeEnSedes(m, sedes, disp, igual = mismoIdTxt) {
  if (!m || !Array.isArray(sedes) || !sedes.length) return null;
  if (!sedesFijasMedico(m).length && !bloquesActivos(disp).length) return null;
  return sedesDondeAtiende(m, disp).some((s) => sedes.some((v) => igual(v, s)));
}

/** Ids (texto) de los doctores que atienden en esas sedes, con la regla de arriba. `medicos`
    (GET /medicos) es opcional: sin él solo vale el horario. null si no se sabe: no hay horario
    a la vista y no todos los doctores traen sus sedes. */
export function medicosDeSedes(sedes, disp, medicos = null, igual = mismoIdTxt) {
  if (!Array.isArray(sedes) || !sedes.length) return null;
  const bloques = bloquesActivos(disp);
  const lista = (Array.isArray(medicos) ? medicos : []).filter((m) => m && m.id != null);
  const conFicha = lista.filter((m) => sedesFijasMedico(m).length);
  if (!bloques.length && (!lista.length || conFicha.length < lista.length)) return null;
  const fichaIds = new Set(conFicha.map((m) => String(m.id)));
  const ids = new Set(conFicha.filter((m) => atiendeEnSedes(m, sedes, bloques, igual)).map((m) => String(m.id)));
  bloques.forEach((d) => { if (!fichaIds.has(String(d.medicoId)) && sedes.some((v) => igual(v, d.sedeId ?? d.sede))) ids.add(String(d.medicoId)); });
  return ids;
}
