/**
 * Paginación A4 del Plan de inversión (E3 §7 / A-25).
 * Construye hojas explícitas y pie «Página N de T».
 */

export const ALTO_A4_MM = 297;
export const ALTO_UTIL_MM = 294; // E3: min-height 294mm
export const LINEAS_POR_HOJA_PLAN = 12; // filas de tabla por hoja de plan (valores verificados E3)

/**
 * Parte líneas de plan en grupos para no partir mal la tabla (E3 mejora).
 * @param {object[]} lineas
 * @param {number} [porHoja]
 */
export function partirLineasEnHojas(lineas = [], porHoja = LINEAS_POR_HOJA_PLAN) {
  const L = lineas || [];
  if (!L.length) return [[]];
  const hojas = [];
  for (let i = 0; i < L.length; i += porHoja) {
    hojas.push(L.slice(i, i + porHoja));
  }
  return hojas;
}

/**
 * Número total de páginas del documento:
 * - 1..N hojas de plan (tabla)
 * - +1 anexo odontograma si aplica
 * Condiciones van en la última hoja de plan (o su propia hoja si plan vacío).
 */
export function totalPaginasDocumento({ numHojasPlan = 1, conAnexo = true } = {}) {
  const plan = Math.max(1, Number(numHojasPlan) || 1);
  return plan + (conAnexo ? 1 : 0);
}

/**
 * Estima páginas por altura real (mm) con tolerancia 0.5 mm (E3).
 */
export function paginasDesdeAlturaMm(alturaMm, altoA4 = ALTO_UTIL_MM) {
  const mm = Number(alturaMm) || 0;
  if (mm <= 0.5) return 1;
  return Math.max(1, Math.floor((mm - 0.5) / altoA4) + 1);
}

export function etiquetaPie(n, total) {
  return `Página ${n} de ${total}`;
}
