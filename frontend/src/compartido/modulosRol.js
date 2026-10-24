/* Módulos que un rol no ve aunque el servidor le dé permiso (decisión del cliente).
   TI no ve Caja ni la cobranza: el servidor le da facturacion:["ver"], pero el menú, las
   rutas (#/caja, #/facturacion…) y las tarjetas de saldos lo ocultan. Si entra por URL ve
   «Este módulo no está disponible para tu rol». Sin imports: lo usan App.jsx y node --test. */

export const MODULOS_OCULTOS_ROL = Object.freeze({
  ti: Object.freeze(["facturacion"]),
});

export const MSG_MODULO_NO_DISPONIBLE = "Este módulo no está disponible para tu rol";

/** ¿<modulo> queda oculto para <rol> aunque tenga permiso? */
export function moduloOcultoParaRol(rol, modulo) {
  const l = MODULOS_OCULTOS_ROL[String(rol || "")];
  return !!(l && modulo && l.includes(String(modulo)));
}

/** Copia de los permisos ({ modulo: [acciones] }) sin los módulos que el rol no ve. */
export function sinModulosOcultos(perms, rol) {
  const l = MODULOS_OCULTOS_ROL[String(rol || "")];
  if (!perms || typeof perms !== "object" || !l || !l.some((m) => m in perms)) return perms;
  const out = { ...perms };
  l.forEach((m) => { delete out[m]; });
  return out;
}
