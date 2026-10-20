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

const decodificar = (t) => txt(t).replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const RE_ALERTA = /\[ALERTA ALERGIA[^\]]*\]\s*(\[[^\]]*\])?/i;

/** Separa la marca que agrega el servidor al emitir pese a una alergia
    («[ALERTA ALERGIA — emitida con override] ["Ibuprofeno ↔ alergia a Aspirina"]») del texto
    del médico. Se veía tal cual en la tarjeta, con corchetes y comillas. */
export function partirIndicaciones(t) {
  const s = decodificar(t);
  const m = s.match(RE_ALERTA);
  if (!m) return { texto: s, alertas: [] };
  let alertas = [];
  if (m[1]) {
    try { const v = JSON.parse(m[1]); if (Array.isArray(v)) alertas = v.map(txt).filter(Boolean); }
    catch { alertas = [m[1].slice(1, -1).replace(/"/g, "").trim()].filter(Boolean); }
  }
  const texto = `${s.slice(0, m.index)} ${s.slice(m.index + m[0].length)}`.replace(/\s+/g, " ").trim();
  return { texto, alertas: alertas.length ? alertas : ["sin detalle"] };
}

/** Indicaciones para mostrar o imprimir: el texto del médico y, si la hay, la alerta de
    alergia en una frase legible. */
export const textoIndicaciones = (t) => {
  const { texto, alertas } = partirIndicaciones(t);
  return alertas.length ? [texto, `Emitida pese a alerta de alergia: ${alertas.join("; ")}.`].filter(Boolean).join(" · ") : texto;
};

/** Formulario del módulo Recetas ({ med, pres, dosis, frec, dur }) → esquema único para guardar.
    M5-10: el formulario no tenía dosis (su campo «dosis» era la presentación, «500 mg») y la
    receta salía sin «1 tableta». Ahora trae los dos; uno sin «pres» es el formulario anterior. */
export const itemRecetaDesdeFormulario = (x) => (x && x.pres !== undefined
  ? { medicamento: txt(x.med), presentacion: txt(x.pres), dosis: txt(x.dosis), frecuencia: txt(x.frec), duracion: txt(x.dur) }
  : { medicamento: txt(x?.med), presentacion: txt(x?.dosis), dosis: "", frecuencia: txt(x?.frec), duracion: txt(x?.dur) });
