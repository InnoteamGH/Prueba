/* Horario real de la clínica con sesión.
 *
 * jornadaClinica() cae en HORARIO_DEF (09:00–19:00) cuando la clínica no cargó su horario.
 * En la demostración vale; con sesión sería inventar la jornada de una clínica real. Las
 * pantallas de inicio y reportes preguntan aquí si hay horario y, si no, lo dicen en vez
 * de suponerlo.
 */
export const horarioConfigurado = (h) => !!h && typeof h === "object"
  && Object.keys(h).some((k) => /^[0-6]$/.test(k) && h[k] && (h[k].cerrado || h[k].abre));

/** "08:30" → 8.5 */
export const horaDecimal = (hhmm) => {
  const [a, b] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(a) ? a + (Number.isFinite(b) ? b / 60 : 0) : null;
};
