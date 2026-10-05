/* Permisos de la sesión en curso: un solo lugar para decidir si se muestra una acción.
   Con sesión mandan los del SERVIDOR (respuesta del login o GET /auth/me; si no llegan,
   los módulos de GET /roles con las acciones del espejo accionesRol). La matriz local
   (dc_data_v1_permisos_v2) es de la demostración y del editor de Permisos por rol: no
   coincidía con la del servidor (gerencia veía Nuevo/Editar/Activar en Usuarios y TI
   «Tomar control» en WhatsApp, y la API los rechazaba con 403).
   App fija aquí los permisos efectivos cada vez que cambian; los módulos que no reciben
   `can` por props preguntan con tienePermiso(modulo, accion). */
import { auth } from "../api/client";

let permisosSesion = null;

/* App llama a esto con los permisos efectivos ({ modulo: [acciones] }). */
export function fijarPermisosSesion(p) {
  permisosSesion = p && typeof p === "object" ? p : null;
}

/* Permisos que el servidor dio a la sesión guardada (login o /auth/me), si los hay. */
export function permisosServidorGuardados() {
  const p = auth.sesion?.permisos;
  return p && typeof p === "object" && Object.keys(p).length ? p : null;
}

/* Guarda en la sesión los permisos que mandó el servidor: al recargar la página se usan
   desde el primer render, sin pasar por la matriz local mientras llega /auth/me. */
export function guardarPermisosServidor(p) {
  if (!p || typeof p !== "object" || !Object.keys(p).length) return;
  const s = auth.sesion;
  if (s) auth.sesion = { ...s, permisos: p };
}

/* ¿La sesión puede <accion> en <modulo>? Sin permisos fijados: con sesión, solo lectura
   (falla cerrado); sin sesión (demostración), todo. */
export function tienePermiso(modulo, accion = "ver") {
  const p = permisosSesion || permisosServidorGuardados();
  if (!p) return !auth.token || accion === "ver";
  return (p[modulo] || []).includes(accion);
}

/* Lo mismo que `can` de App, para pasarlo donde aún no llega por props. */
export const can = (modulo, accion = "ver") => tienePermiso(modulo, accion);
