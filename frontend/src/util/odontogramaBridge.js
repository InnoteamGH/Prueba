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
    const caras = {};
    for (const [cara, m] of Object.entries(row.caras || {})) {
      if (m?.h) caras[cara] = m.h;
    }
    const raices = {};
    for (const [idx, m] of Object.entries(row.raices || {})) {
      if (m?.h) raices[String(idx)] = m.h;
    }
    let estadoPieza = null;
    const piezaMarks = row.pieza || [];
    if (piezaMarks.length) {
      const last = piezaMarks[piezaMarks.length - 1];
      if (last?.h === "ausente" || last?.h === "extraccion" || last?.h === "extraer") {
        estadoPieza = last.h === "extraccion" ? "extraer" : last.h;
      } else if (last?.h) {
        caras._pieza = last.h;
      }
    }
    const estadosCara = { ...caras };
    if (Object.keys(raices).length) estadosCara.raices = raices;
    out.push({
      numeroPieza: n,
      estadoPieza,
      estadosCara: JSON.stringify(estadosCara),
      nota: row.nota || null,
    });
  }
  return out;
}
