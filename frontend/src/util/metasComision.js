/* Metas y comisiones (decisión del cliente): la META mensual es por sede; el % de COMISIÓN es
   del médico, el mismo en todas sus sedes. Con una sede elegida solo se edita la meta
   (PUT /medicos/{id}/metas/{sedeId} con { metaMensual }, sin porcentajeComision) y el % se ve
   en solo lectura. El % lo cambia solo el administrador general (rol «admin») en la vista
   «Todas las sedes», por la ruta global del médico (PUT /medicos/{id}). Sin imports: lo usan
   Metas, Configuración › Doctores y node --test. */

/** Términos unificados: Producción = valor de los procedimientos terminados; Cobrado = pagos
    registrados en Caja. Donde la cifra todavía sale de las citas atendidas se dice así. */
export const CRITERIO_PRODUCCION = "Criterio acordado: Producción = valor de los procedimientos terminados; el servidor todavía la calcula con las citas atendidas.";

export const NOTA_COMISION_GLOBAL = "El % de comisión es del médico en todas las sedes; lo cambia el administrador general en Todas las sedes.";

/** ¿Puede cambiar el % de comisión? Solo el administrador general, en «Todas las sedes», con
    permiso de editar metas y de guardar la ficha del médico (config). */
export function puedeEditarComision({ rol, vistaTodas, puedeEditarMetas = true, puedeConfig = true } = {}) {
  return rol === "admin" && !!vistaTodas && !!puedeEditarMetas && !!puedeConfig;
}

/** Cuerpo de PUT /medicos/{id}/metas/{sedeId}: solo la meta, nunca el % (no es por sede). */
export function cuerpoMetaSede(meta) {
  const n = meta === "" || meta == null ? null : Number(meta);
  return { metaMensual: n == null || Number.isNaN(n) ? null : n };
}

/** % de comisión del médico (global): el de su ficha (API: porcentajeComision; demo: comision). */
export function comisionMedico(m) {
  const v = m?.porcentajeComision !== undefined && m?.porcentajeComision !== null ? m.porcentajeComision : m?.comision;
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
