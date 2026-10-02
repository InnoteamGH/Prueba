/**
 * API rows ↔ estado del HTML anatómico de referencia.
 */
export function apiRowsAHtmlDatos(rows = []) {
  const datos = {};
  for (const r of rows || []) {
    const n = r.numeroPieza != null ? r.numeroPieza : r.pieza;
    if (n == null) continue;
    const pz = String(n);
    let carasRaw = r.estadosCara != null ? r.estadosCara : r.caras;
    if (typeof carasRaw === "string") {
      try { carasRaw = JSON.parse(carasRaw || "{}") || {}; } catch { carasRaw = {}; }
    }
    carasRaw = carasRaw || {};
    const caras = {};
    const raices = {};
    const pieza = [];
    for (const [k, v] of Object.entries(carasRaw)) {
      if (k === "raices" && v && typeof v === "object") {
        for (const [idx, h] of Object.entries(v)) {
          if (h) raices[String(idx)] = { h: String(h), c: "r" };
        }
        continue;
      }
      if (k === "hallazgos" || k === "_pieza") continue;
      if (v) caras[k] = { h: String(v), c: "r" };
    }
    if (r.estadoPieza) {
      const h = String(r.estadoPieza);
      const id = h === "extraer" ? "extraccion" : h;
      pieza.push({ h: id, c: "r" });
    }
    datos[pz] = { caras, raices, pieza, nota: r.nota || "" };
  }
  return datos;
}

export function tomaHashDeRows(rows = []) {
  const norm = (rows || [])
    .map((r) => ({
      n: r.numeroPieza ?? r.pieza,
      e: r.estadoPieza || "",
      c: typeof r.estadosCara === "string" ? r.estadosCara : JSON.stringify(r.estadosCara || {}),
      nota: r.nota || "",
    }))
    .sort((a, b) => Number(a.n) - Number(b.n));
  return simpleHash(JSON.stringify(norm));
}

function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `t${(h >>> 0).toString(16)}`;
}
