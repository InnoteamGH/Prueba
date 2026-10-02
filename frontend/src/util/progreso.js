/**
 * Barras de progreso honestas (SPEC §16 / A17): valor 0 no dibuja pista.
 */

/** @param {number|null|undefined} valor */
export function progresoPct(valor) {
  const v = Number(valor);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(100, v);
}

/**
 * @param {number|null|undefined} valor  porcentaje 0–100 (o ya acotado)
 * @returns {{ dibujar: boolean, soloTexto: boolean, pct: number }}
 */
export function layoutProgreso(valor) {
  const pct = progresoPct(valor);
  if (pct <= 0) return { dibujar: false, soloTexto: false, pct: 0 };
  if (pct < 5) return { dibujar: false, soloTexto: true, pct };
  return { dibujar: true, soloTexto: false, pct };
}
