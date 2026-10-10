/* Un solo esquema para los medicamentos de una receta (H-08).
   La ficha del paciente guardaba { medicamento, presentacion, dosis, frecuencia, duracion }
   y el módulo Recetas { med, detalle }: cada pantalla leía solo el suyo, así que una receta
   emitida en la ficha salía en Recetas (tarjetas, tabla, Excel y PDF) con «℞» y sin el
   fármaco. Ahora las dos pantallas escriben el esquema de la ficha y estas funciones leen
   los dos, para las recetas que ya están guardadas con el formato antiguo.
   Módulo puro (sin React) para poder probarlo aparte. */

const txt = (v) => (v == null ? "" : String(v).trim());

/** items (texto JSON o arreglo) → arreglo; un JSON roto o vacío da []. */
export function listaItemsReceta(items) {
  if (Array.isArray(items)) return items;
  if (typeof items !== "string" || !items.trim()) return [];
  try { const v = JSON.parse(items); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** Un ítem en cualquiera de los dos formatos → { medicamento, presentacion, dosis, frecuencia, duracion, detalle }. */
export function normalizarItemReceta(x) {
  if (x == null) return null;
  if (typeof x === "string") return txt(x) ? { medicamento: txt(x), presentacion: "", dosis: "", frecuencia: "", duracion: "", detalle: "" } : null;
  const medicamento = txt(x.medicamento) || txt(x.med) || txt(x.nombre);
  if (!medicamento) return null;
  return {
    medicamento,
    presentacion: txt(x.presentacion),
    dosis: txt(x.dosis),
    frecuencia: txt(x.frecuencia) || txt(x.frec),
    duracion: txt(x.duracion) || txt(x.dur),
    detalle: txt(x.detalle),
  };
}

/** Medicamentos de una receta, ya normalizados. Sin ítems legibles, el texto libre de la receta. */
export function itemsDeReceta(receta) {
  const r = receta || {};
  const its = listaItemsReceta(r.items).map(normalizarItemReceta).filter(Boolean);
  if (its.length) return its;
  return txt(r.texto) ? [normalizarItemReceta(r.texto)] : [];
}

/** «Paracetamol 500 mg»: el fármaco con su presentación. */
export const nombreItemReceta = (it) => [it?.medicamento, it?.presentacion].map(txt).filter(Boolean).join(" ");

/** «1 tableta – c/8 h – 3 días»: cómo tomarlo. */
export const indicacionItemReceta = (it) => [it?.dosis, it?.frecuencia, it?.duracion, it?.detalle].map(txt).filter(Boolean).join(" – ");

/** Indicaciones para mostrar. Algunas guardadas por el servidor traen la alerta de alergia
    como JSON escapado («Ibuprofeno ↔ alergia…» con la barra literal): se decodifica. */
export const textoIndicaciones = (t) => txt(t).replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/** Formulario del módulo Recetas ({ med, dosis, frec, dur }) → esquema único para guardar. */
export const itemRecetaDesdeFormulario = (x) => ({
  medicamento: txt(x?.med),
  presentacion: txt(x?.dosis),
  dosis: "",
  frecuencia: txt(x?.frec),
  duracion: txt(x?.dur),
});
