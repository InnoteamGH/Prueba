/**
 * Inventario: sugerencia de pedido y barra de cobertura (SPEC §15.5 / A35–A36).
 * Factor de cobertura por defecto = 2 (≈ 2 semanas si dia≈1 unidad/día de consumo mínimo).
 */

export const FACTOR_COBERTURA_DEFAULT = 2;
export const UMBRAL_COBERTURA_DIAS = 14;

export function estadoStock(it) {
  const stock = Number(it.stock) || 0;
  const min = Number(it.min) || 0;
  if (stock === 0) return "agotado";
  if (stock <= min) return "bajo";
  return "ok";
}

export function coberturaDias(it) {
  const dia = Number(it.dia) || 0;
  if (dia <= 0) return 999;
  return Math.round((Number(it.stock) || 0) / dia);
}

export function stockObjetivo(it, factor = FACTOR_COBERTURA_DEFAULT) {
  return Math.max(0, Math.ceil((Number(it.min) || 0) * factor));
}

/** Unidades a pedir; 0 si stock ok y cobertura ≥ umbral. */
export function sugeridoPedir(it, factor = FACTOR_COBERTURA_DEFAULT, umbralDias = UMBRAL_COBERTURA_DIAS) {
  const est = estadoStock(it);
  const cov = coberturaDias(it);
  if (est === "ok" && cov >= umbralDias) return 0;
  const objetivo = stockObjetivo(it, factor);
  return Math.max(0, Math.ceil(objetivo - (Number(it.stock) || 0)));
}

/** Porcentaje de barra 0–100 usando stock objetivo como 100%. */
export function pctCoberturaBarra(it, factor = FACTOR_COBERTURA_DEFAULT) {
  const objetivo = Math.max(1, stockObjetivo(it, factor));
  return Math.min(100, Math.round(((Number(it.stock) || 0) / objetivo) * 100));
}

export function requierenCompra(items) {
  return (items || []).filter((i) => sugeridoPedir(i) > 0 || estadoStock(i) !== "ok");
}
