/**
 * Geometría honesta de barras de datos (SPEC §15.3 / A29–A32).
 * Cero no dibuja; sin mínimo cosmético; escala = max de la serie; clamp ≤ 100.
 */

/** @param {number[]} serie */
export function maxSerie(serie) {
  const nums = (serie || []).map((v) => Number(v) || 0);
  return Math.max(0, ...nums);
}

/**
 * @param {number} valor
 * @param {number} max
 * @returns {{ dibujar: boolean, pct: number }}
 */
export function barraPct(valor, max) {
  const v = Number(valor) || 0;
  const m = Math.max(0, Number(max) || 0);
  if (v <= 0 || m <= 0) return { dibujar: false, pct: 0 };
  const pct = Math.min(100, (v / m) * 100);
  if (pct < 5) return { dibujar: false, pct }; // <5%: cifra sola, sin segmento (alineado A17)
  return { dibujar: true, pct };
}

/**
 * @param {number[]} serie
 * @returns {{ valor: number, dibujar: boolean, pct: number }[]}
 */
export function layoutBarras(serie) {
  const max = maxSerie(serie);
  return (serie || []).map((valor) => {
    const { dibujar, pct } = barraPct(valor, max);
    return { valor: Number(valor) || 0, dibujar, pct };
  });
}
