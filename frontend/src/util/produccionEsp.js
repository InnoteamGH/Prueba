/**
 * Producción por especialidad — una definición, rango como parámetro (SPEC §15.2 / A27–A28).
 * Normaliza filas del API o de citas locales al mismo mapa { especialidad, produccion, atendidas }.
 */

/**
 * @param {Array<{ especialidad?: string, nombre?: string, produccion?: number, atendidas?: number, citas?: number }>} rows
 * @returns {Array<{ especialidad: string, produccion: number, atendidas: number }>}
 */
export function normalizarProduccionEsp(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const esp = String(r.especialidad || r.nombre || "").trim() || "Sin especialidad";
    const prod = Number(r.produccion) || 0;
    const att = Number(r.atendidas ?? r.citas) || 0;
    const cur = map.get(esp) || { especialidad: esp, produccion: 0, atendidas: 0 };
    cur.produccion += prod;
    cur.atendidas += att;
    map.set(esp, cur);
  }
  return [...map.values()].sort((a, b) => b.produccion - a.produccion);
}

/**
 * Agrega citas atendidas por especialidad en un rango [desde, hasta] (ISO yyyy-mm-dd inclusive).
 * @param {Array<{ fecha?: string, estado?: string, esp?: string, especialidad?: string, precio?: number }>} citas
 * @param {{ desde: string, hasta: string, precioDeEsp?: (id: string) => number }} opts
 */
export function produccionPorEspecialidadEnRango(citas, opts) {
  const { desde, hasta, precioDeEsp } = opts || {};
  const rows = [];
  for (const c of citas || []) {
    if (c.estado !== "atendida" && c.estado !== "en_atencion") continue;
    const f = String(c.fecha || "").slice(0, 10);
    if (desde && f < desde) continue;
    if (hasta && f > hasta) continue;
    const espId = c.esp || c.especialidadId || "";
    const espNom = c.especialidad || c.espNombre || espId || "Sin especialidad";
    const precio = c.precio != null ? Number(c.precio) : (precioDeEsp ? Number(precioDeEsp(espId)) || 0 : 0);
    rows.push({ especialidad: espNom, produccion: precio, atendidas: 1 });
  }
  return normalizarProduccionEsp(rows);
}
