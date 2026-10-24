/**
 * Catálogo de servicios: medias limpias (SPEC §15.6 / A37).
 */
import { desgloseIgv } from "../compartido/catalogo.js";

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
 * R6-09: el precio del catálogo lleva el IGV, que no es ingreso de la clínica: el margen es el
 * precio SIN IGV menos el costo directo (Blanqueamiento S/ 400 con costo 120: 338.98 − 120 =
 * S/ 218.98, no S/ 280). Redondeado a céntimos.
 * @returns {number|null} null ⇒ mostrar "—" / "sin coste"
 */
export function margenCatalogo(s) {
  const coste = Number(s?.coste ?? s?.costeDirecto);
  if (!(coste > 0)) return null;
  return Math.round((desgloseIgv(Number(s?.monto ?? s?.precio) || 0).base - coste) * 100) / 100;
}
