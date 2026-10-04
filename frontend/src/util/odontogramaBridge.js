/**
 * Convierte snapshot del HTML anatómico → payloads PUT /odontograma.
 * datos[pz] = { caras:{O:{h,c}}, raices:{0:{h,c}}, pieza:[{h,c}], nota }
 */
export function snapshotAGuardados(datos = {}) {
  const out = [];
  for (const [pz, row] of Object.entries(datos)) {
    if (!row) continue;
    const n = Number(pz);
    if (!Number.isFinite(n)) continue;
    // Además de cada hallazgo se guarda su color (r = por hacer, a = realizado) y TODAS
    // las marcas de pieza completa: antes solo la última, y al recargar una corona se
    // perdía o una restauración ya hecha volvía como pendiente. Todo va dentro de
    // estadosCara (JSON libre), sin cambiar el contrato del servidor.
    const caras = {}, colores = {};
    for (const [cara, m] of Object.entries(row.caras || {})) {
      if (m?.h) { caras[cara] = m.h; if (m.c) colores[cara] = m.c; }
    }
    const raices = {}, coloresRaiz = {};
    for (const [idx, m] of Object.entries(row.raices || {})) {
      if (m?.h) { raices[String(idx)] = m.h; if (m.c) coloresRaiz[String(idx)] = m.c; }
    }
    let estadoPieza = null;
    const piezaMarks = (row.pieza || []).filter((m) => m?.h);
    const extr = piezaMarks.find((m) => m.h === "ausente" || m.h === "extraccion" || m.h === "extraer");
    if (extr) estadoPieza = extr.h === "extraccion" ? "extraer" : extr.h;
    const otras = piezaMarks.filter((m) => m !== extr);
    if (otras.length) caras._pieza = otras[otras.length - 1].h;   // compatibilidad con lecturas antiguas
    const estadosCara = { ...caras };
    if (Object.keys(raices).length) estadosCara.raices = raices;
    if (Object.keys(colores).length) estadosCara._colores = colores;
    if (Object.keys(coloresRaiz).length) estadosCara._coloresRaiz = coloresRaiz;
    if (piezaMarks.length) estadosCara._piezas = piezaMarks.map((m) => ({ h: m.h, c: m.c || "r" }));
    out.push({
      numeroPieza: n,
      estadoPieza,
      estadosCara: JSON.stringify(estadosCara),
      nota: row.nota || null,
    });
  }
  return out;
}
