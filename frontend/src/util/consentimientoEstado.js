/* Estado de un consentimiento: anulado, firmado o pendiente (por firmar).
   Decisión del proyecto: un consentimiento firmado no se borra; se anula con motivo
   obligatorio (POST /consentimientos/{id}/anular). Al anular, el servidor antepone
   «[ANULADO] » al título, deja `firmado: false` y agrega al final del contenido una línea
   «[Anulado]» o «[Anulado: <motivo>]». En GET /consentimientos `anulado` y `motivoAnulacion`
   llegan vacíos: lo fiable en la lista es el prefijo del título y esas líneas del contenido.
   Sin estas reglas un anulado se veía «Por firmar», contaba como pendiente y ofrecía «Firmar».
   Sin imports: lo usan App.jsx, FichaMedica.jsx y node --test. */

const PREFIJO_ANULADO = /^\s*\[ANULADO\]\s*/i;
// Línea que agrega el servidor al anular: «[Anulado]» o «[Anulado: motivo]».
const LINEA_ANULADO = /^\s*\[Anulado(?::\s*(.*?))?\]\s*$/i;

export const MOTIVO_ANULAR_CONSENT_MIN = 5;

/** true si el consentimiento está anulado (bandera del servidor o prefijo del título). */
export function esAnulado(c) {
  if (!c) return false;
  return c.anulado === true || PREFIJO_ANULADO.test(String(c.titulo || ""));
}

/** Motivo de la anulación: el del servidor o, si no viene, el último «[Anulado: X]» del contenido. */
export function motivoAnulacion(c) {
  if (!c) return "";
  const propio = String(c.motivoAnulacion || "").trim();
  if (propio) return propio;
  let motivo = "";
  String(c.contenido || "").split(/\r?\n/).forEach((l) => {
    const m = LINEA_ANULADO.exec(l);
    if (m && m[1] && m[1].trim()) motivo = m[1].trim();
  });
  return motivo;
}

/** "anulado" | "firmado" | "pendiente". Un anulado nunca está por firmar. */
export function estadoConsentimiento(c) {
  if (esAnulado(c)) return "anulado";
  return c && c.firmado ? "firmado" : "pendiente";
}

/** Nombre para mostrar (tipo o, si no viene, título, como hasta ahora) sin el prefijo «[ANULADO] ». */
export function tituloLimpio(c) {
  const t = typeof c === "string" ? c : (c && (c.tipo || c.titulo)) || "";
  return String(t).replace(PREFIJO_ANULADO, "").trim();
}

/** El texto original, sin las líneas «[Anulado]» / «[Anulado: …]» que el servidor agrega al final. */
export function contenidoSinMarcas(contenido) {
  if (contenido == null) return "";
  const lineas = String(contenido).split(/\r?\n/);
  let fin = lineas.length, hubo = false;
  while (fin > 0 && (LINEA_ANULADO.test(lineas[fin - 1]) || !lineas[fin - 1].trim())) {
    if (lineas[fin - 1].trim()) hubo = true;
    fin--;
  }
  return hubo ? lineas.slice(0, fin).join("\n") : String(contenido);
}

/** Motivo obligatorio: "" si sirve; si no, el error para mostrar. */
export function validarMotivoAnulacion(m) {
  const n = String(m || "").replace(/\s+/g, "").length;
  if (n >= MOTIVO_ANULAR_CONSENT_MIN) return "";
  return n ? `El motivo es muy corto: escribe al menos ${MOTIVO_ANULAR_CONSENT_MIN} caracteres.` : "Escribe el motivo de la anulación.";
}
