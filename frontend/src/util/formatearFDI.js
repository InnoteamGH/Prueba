/**
 * Notación FDI con punto (E1 §3 / A-4).
 * Presentación only — storage stays two-digit integers.
 */
export function formatearFDI(n) {
  const v = n == null ? "" : String(n);
  if (/^[1-8][1-8]$/.test(v)) return `${v[0]}.${v[1]}`;
  return v;
}

/** Recuento de dentición según hallazgos (E1 §4). No usar "52 piezas". */
export function recuentoDenticion(piezasConHallazgo) {
  const nums = (piezasConHallazgo || []).map((p) => Number(p)).filter((n) => Number.isFinite(n));
  const perm = nums.some((n) => n >= 11 && n <= 48);
  const temp = nums.some((n) => n >= 51 && n <= 85);
  if (perm && temp) return "32 piezas · 20 temporales";
  if (temp && !perm) return "20 piezas";
  return "32 piezas";
}
