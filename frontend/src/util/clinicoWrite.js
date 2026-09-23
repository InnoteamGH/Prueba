export function puedeEscribirClinico({ conectado, can, rol }) {
  if (!conectado) return ["admin", "medico"].includes(rol || "");
  if (can) return !!can("odontograma", "editar");
  return ["admin", "medico"].includes(rol || "");
}
