/* R7-06: en Auditoría, buscar «QA Usuario R7» no encontraba nada: el evento solo trae el correo
   del usuario afectado («Alta de usuario qa.r7+20261012@sonrie.pe») y el id del registro. Si el
   rol puede ver GET /usuarios, el correo y el id se cruzan con el directorio y el detalle dice
   también el nombre («Alta de usuario QA Usuario R7 (qa.r7+20261012@sonrie.pe)»), así que se
   puede buscar por nombre o por correo.
   Sin imports: lo usan App.jsx y node --test. */

const CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Directorio para cruzar: correo (en minúsculas) → nombre e id → nombre. */
export function directorioUsuarios(usuarios) {
  const porCorreo = new Map(), porId = new Map();
  (Array.isArray(usuarios) ? usuarios : []).forEach((u) => {
    if (!u) return;
    const nombre = String(u.nombre || "").trim();
    if (!nombre) return;
    const correo = String(u.email || u.correo || "").trim().toLowerCase();
    if (correo) porCorreo.set(correo, nombre);
    if (u.id != null && u.id !== "") porId.set(String(u.id), nombre);
  });
  return { porCorreo, porId };
}

/** Nombre de quien tiene ese correo, o null. */
export function nombrePorCorreo(correo, dir) {
  if (!dir || !correo) return null;
  return dir.porCorreo.get(String(correo).trim().toLowerCase()) || null;
}

/** Detalle con el nombre junto a cada correo conocido. No se repite si el texto ya lo dice. */
export function detalleConNombres(detalle, dir) {
  const s = String(detalle ?? "");
  if (!dir || !dir.porCorreo || !dir.porCorreo.size) return s;
  return s.replace(CORREO, (correo, pos) => {
    const nombre = nombrePorCorreo(correo, dir);
    if (!nombre || s.toLowerCase().includes(nombre.toLowerCase())) return correo;
    // Si el correo ya va entre paréntesis («Juan (juan@x.pe)») no se anida otro paréntesis.
    const yaEntreParentesis = s[pos - 1] === "(";
    return yaEntreParentesis ? correo : `${nombre} (${correo})`;
  });
}

/** Nombre del usuario afectado por un evento: por el id del registro o por el correo del detalle. */
export function usuarioAfectado(evento, dir) {
  if (!evento || !dir) return null;
  const id = evento.registroId ?? evento.entidadId;
  if (id != null && dir.porId.has(String(id))) return dir.porId.get(String(id));
  const correos = String(evento.detalle || "").match(CORREO) || [];
  for (const c of correos) { const n = nombrePorCorreo(c, dir); if (n) return n; }
  return null;
}
