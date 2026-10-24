/* Colegiatura (COP) del odontólogo. El servidor la puede guardar como «12345», «COP12345»
   o «COP 12345»: se quita el prefijo antes de anteponerlo, así ningún documento imprime
   «COP COP12345». */
export const copNumero = (c) => String(c ?? "").replace(/^\s*(COP|CMP)\s*[.:º°#-]?\s*/i, "").trim();
export const conCop = (c) => { const n = copNumero(c); return n ? `COP ${n}` : ""; };
