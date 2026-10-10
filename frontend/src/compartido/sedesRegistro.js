/* Registro de sedes de la clínica con sesión.
 *
 * El frontend trabaja con un id corto por sede (1, 2, 3…) y el servidor con UUID. Antes la
 * traducción era una regla fija (UUID que termina en «a2» → 2, cualquier otro → 1): solo
 * servía para las dos sedes de la semilla, con una tercera sede real todas pasaban a ser la
 * «1» y se mezclaban sus datos. Ahora los ids salen de GET /sedes: cada UUID real recibe su
 * número en el orden en que lo devuelve el servidor, y se guarda para la sesión (recargar la
 * página no cambia los números). Sin sesión (demo) el registro queda vacío.
 * Sin imports: lo usan routing.js y comun.jsx sin crear dependencias circulares.
 */
const CLAVE = "dc_sedes_registro";
const reg = [];   // [{ n, uuid, nombre, direccion }]

try {
  // Solo con sesión: en la demostración los ids son los de la semilla.
  const g = localStorage.getItem("dc_token") && JSON.parse(localStorage.getItem(CLAVE) || "null");
  if (Array.isArray(g)) g.forEach((x) => { if (x && x.uuid && x.n) reg.push(x); });
} catch { /* sin almacenamiento */ }

const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(reg)); } catch { /* sin espacio */ } };

/** Registra (o actualiza) las sedes del servidor. Conserva el número de las ya conocidas. */
export function registrarSedes(lista) {
  (Array.isArray(lista) ? lista : []).forEach((s) => {
    const uuid = String(s?.id ?? "").trim();
    if (!uuid) return;
    const prev = reg.find((r) => r.uuid.toLowerCase() === uuid.toLowerCase());
    const datos = { nombre: s.nombre || prev?.nombre || "Sede", direccion: s.direccion || prev?.direccion || "" };
    if (prev) Object.assign(prev, datos);
    else reg.push({ n: reg.reduce((m, r) => Math.max(m, r.n), 0) + 1, uuid, ...datos });
  });
  guardar();
  return reg;
}
/** Al cerrar sesión o entrar con otra cuenta. */
export function limpiarRegistroSedes() { reg.splice(0, reg.length); try { localStorage.removeItem(CLAVE); } catch { /* */ } }

export const hayRegistroSedes = () => reg.length > 0;
export const sedesRegistradas = () => reg.slice();
export const idxDeUuid = (u) => { if (u == null) return null; const s = String(u).toLowerCase(); return reg.find((r) => r.uuid.toLowerCase() === s)?.n ?? null; };
export const uuidDeIdx = (n) => reg.find((r) => String(r.n) === String(n))?.uuid ?? null;
