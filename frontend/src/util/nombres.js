/* Nombres cargados todo en mayúsculas («ANDERSSON ASTETE FLORES») se muestran como nombre
   propio, igual que el resto. Solo cambia lo que se ve; el dato guardado no se toca. */
const MENORES = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "do", "van", "von"]);

export function nombrePropio(nombre) {
  const s = String(nombre ?? "");
  if (!/[A-ZÁÉÍÓÚÑ]{2}/.test(s) || s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(/(\s+|-)/).map((p, i) => (i > 0 && MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join("");
}
