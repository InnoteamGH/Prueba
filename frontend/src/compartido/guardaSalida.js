/* M8-08: aviso de cambios sin guardar al salir de una pantalla por el menú. La pantalla con
   un formulario a medias (p. ej. «Mi horario») registra una guarda que devuelve el mensaje
   mientras haya cambios sin guardar; el menú pregunta antes de cambiar de módulo. Una sola
   guarda a la vez (la de la pantalla que se ve). Sin imports: lo usa node --test. */

let guarda = null;

/** Registra la guarda de la pantalla. `mensaje()` devuelve el texto de la pregunta o null si
    no hay nada sin guardar; `alSalir()` se llama si la persona decide salir igual. Devuelve
    la función que la quita (para el desmontaje). */
export function fijarGuardaSalida(mensaje, alSalir = null) {
  const g = { mensaje, alSalir };
  guarda = g;
  return () => { if (guarda === g) guarda = null; };
}

/** ¿Se puede salir? Sin guarda o sin cambios, sí. Con cambios, pregunta (window.confirm por
    defecto): si acepta se sale y la guarda se suelta. */
export function puedeSalir(confirmar) {
  const g = guarda;
  if (!g) return true;
  let msg = null;
  try { msg = g.mensaje ? g.mensaje() : null; } catch { msg = null; }
  if (!msg) return true;
  const pregunta = confirmar || ((m) => (typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(m) : true));
  if (!pregunta(msg)) return false;
  if (guarda === g) guarda = null;
  try { if (g.alSalir) g.alSalir(); } catch { /* nada */ }
  return true;
}
