/* M7-03: el médico de la sesión cuando GET /medicos falla. El login no trae su id de médico y
   «Atendido por» de la nota de evolución quedaba en «— Selecciona el doctor —». GET /citas solo
   le devuelve al médico sus propias citas (con medicoId y el nombre del doctor): de ahí sale.
   Sin imports: lo usan FichaMedica.jsx y node --test. */

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^dra?\.\s*/, "").replace(/\s+/g, " ").trim();

/** Id del médico de la sesión a partir de sus citas: la que lleva su nombre o, si todas son del
    mismo doctor y ninguna dice otro nombre, ese. null si no se puede saber con certeza. */
export function medicoDeSesionEnCitas(citas, nombreSesion) {
  const lista = (Array.isArray(citas) ? citas : []).filter((c) => c && c.medicoId != null && c.medicoId !== "");
  if (!lista.length) return null;
  const yo = norm(nombreSesion);
  if (yo) {
    const mia = lista.find((c) => norm(c.medico) === yo);
    if (mia) return String(mia.medicoId);
  }
  const ids = [...new Set(lista.map((c) => String(c.medicoId)))];
  if (ids.length !== 1) return null;
  // Un solo doctor, pero con otro nombre: no es el de la sesión (no se le atribuye la atención).
  const otroNombre = yo && lista.some((c) => c.medico && norm(c.medico) !== yo);
  return otroNombre ? null : ids[0];
}

/** M8-08: el médico de la sesión en la lista de doctores (para preseleccionarlo en «Agendar
    cita»): el del mismo nombre (sin «Dr./Dra.», tildes ni mayúsculas) o, si no hay, el único
    cuyo nombre contiene al de la sesión o está contenido en él. null si no está o es ambiguo. */
export function medicoDeSesionEnLista(medicos, nombreSesion) {
  const sinTitulo = (s) => norm(s).replace(/^dr\(a\)\.?\s*/, "");
  const yo = sinTitulo(nombreSesion);
  const lista = (Array.isArray(medicos) ? medicos : []).filter((m) => m && m.id != null && m.id !== "" && sinTitulo(m.nombre));
  if (!yo || !lista.length) return null;
  const exacto = lista.filter((m) => sinTitulo(m.nombre) === yo);
  if (exacto.length) return exacto.length === 1 ? String(exacto[0].id) : null;
  const parecido = lista.filter((m) => { const n = sinTitulo(m.nombre); return n.includes(yo) || yo.includes(n); });
  return parecido.length === 1 ? String(parecido[0].id) : null;
}
