/**
 * Catálogo de servicios: medias limpias (SPEC §15.6 / A37).
 */

/** @param {Array<{ monto?: number, precio?: number, activo?: boolean }>} items */
export function serviciosConPrecio(items) {
  return (items || []).filter((s) => {
    if (s.activo === false) return false;
    const m = Number(s.monto ?? s.precio) || 0;
    return m > 0;
  });
}

/** @returns {{ media: number, n: number }} */
export function precioMedioCatalogo(items) {
  const limpios = serviciosConPrecio(items);
  if (!limpios.length) return { media: 0, n: 0 };
  const sum = limpios.reduce((s, x) => s + (Number(x.monto ?? x.precio) || 0), 0);
  return { media: Math.round(sum / limpios.length), n: limpios.length };
}

/**
 * Margen honesto (SRV-02): sin coste medido (> 0) no se inventa margen = precio.
 * @returns {number|null} null ⇒ mostrar "—" / "sin coste"
 */
export function margenCatalogo(s) {
  const coste = Number(s?.coste ?? s?.costeDirecto);
  if (!(coste > 0)) return null;
  return (Number(s?.monto ?? s?.precio) || 0) - coste;
}
