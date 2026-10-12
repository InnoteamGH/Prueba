/* Último paciente cuya ficha se miró (sessionStorage «dc_ultimo_paciente»): Radiografías y
   Fotografía clínica abren con él.

   M6-01: se guardaba el id de la ficha PEDIDA aunque la API la rechazara (403, paciente de
   otra sede). Radiografías y Fotos arrancaban con ese id, pedían sus imágenes, recibían 403 y
   se quedaban en «Sin permiso para ver las radiografías» sin paciente elegido, también al
   recargar. Ahora:
     - solo se guarda cuando la ficha se abrió de verdad;
     - si la API rechaza a ese paciente (403), se olvida.
   Sin imports: lo usan App.jsx y node --test (con un almacenamiento falso). */

export const CLAVE_ULTIMO_PACIENTE = "dc_ultimo_paciente";

const almacen = (s) => {
  if (s) return s;
  try { return typeof sessionStorage !== "undefined" ? sessionStorage : null; } catch { return null; }
};

/** Id guardado o null (sin almacenamiento, vacío o ilegible). */
export function leerUltimoPaciente(storage = null) {
  const s = almacen(storage);
  if (!s) return null;
  try { const v = s.getItem(CLAVE_ULTIMO_PACIENTE); return v == null || v === "" || v === "null" ? null : String(v); } catch { return null; }
}

/** Guarda el paciente cuya ficha se abrió (con permiso). Un id vacío no se guarda. */
export function guardarUltimoPaciente(id, storage = null) {
  if (id == null || id === "") return;
  const s = almacen(storage);
  if (!s) return;
  try { s.setItem(CLAVE_ULTIMO_PACIENTE, String(id)); } catch { /* sin almacenamiento */ }
}

/** Olvida el último paciente. Con `id`, solo si el guardado es ese (no borra otro que se abrió
    después). Devuelve true si se borró. */
export function olvidarUltimoPaciente(id = null, storage = null) {
  const s = almacen(storage);
  if (!s) return false;
  const actual = leerUltimoPaciente(s);
  if (actual == null) return false;
  if (id != null && String(id) !== actual) return false;
  try { s.removeItem(CLAVE_ULTIMO_PACIENTE); return true; } catch { return false; }
}
