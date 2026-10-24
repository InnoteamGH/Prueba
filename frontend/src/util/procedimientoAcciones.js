/* Anular o eliminar un procedimiento del plan (decisión del cliente): el médico no borra,
   anula. Sin imports: lo usan App.jsx (Tratamientos y Plan y cuenta de la ficha) y node --test.
   - Anular (PATCH de la fase a «anulado», con motivo): quien edita tratamientos; un
     procedimiento terminado (por cobrar) solo lo anula el administrador general (rol «admin»);
     uno pagado no se anula aquí (primero se revierte su cobro en Caja).
   - Eliminar (DELETE de la fase): solo con tratamientos:eliminar. El médico no lo tiene (el
     servidor responde 403), así que no ve «Eliminar». */

export const MOTIVO_ANULAR_MIN = 5;

/** { anular, eliminar }: qué acciones mostrar para el procedimiento f. */
export function accionesProcedimiento(f, { rol = "", puedeEditar = false, puedeEliminar = false } = {}) {
  const est = String(f?.estado || "");
  if (!f || est === "anulado" || est === "atendida") return { anular: false, eliminar: false };
  const terminado = est === "terminada";
  return {
    anular: !!puedeEditar && (!terminado || rol === "admin"),
    eliminar: !!puedeEliminar,
  };
}

/** Motivo de la anulación (obligatorio): el texto limpio o null si es demasiado corto. */
export function motivoAnulacionValido(motivo) {
  const t = String(motivo || "").replace(/\s+/g, " ").trim();
  return t.length >= MOTIVO_ANULAR_MIN ? t : null;
}

/** Cuerpo de PATCH /tratamientos/fases/{id} para anular. */
export function cuerpoAnulacion(motivo) {
  return { estado: "anulado", motivo: motivoAnulacionValido(motivo) };
}
