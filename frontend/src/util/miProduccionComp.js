/* M6-04: «Mi producción» decía «+150 % vs mes anterior al mismo día», pero era un prorrateo
   (el mes anterior entero × día de hoy / días del mes) rotulado como si fuera la cifra real.
   La Dra. Mendoza tenía S/ 80 en octubre y S/ 80 en septiembre, atendidos el 01/09: al 12 de
   octubre la comparación real era 0 %, no +150 %.

   Ahora se compara con lo que el médico llevaba en el mes anterior hasta el mismo día:
     1. Si el servidor manda ese tramo (produccionMesAnteriorAlDia), ese.
     2. Si no, se suman sus atenciones del mes anterior (GET /citas, estado «atendida», con su
        valor) hasta el mismo día; vale solo si el mes entero cuadra con produccionMesAnterior
        (si no cuadra, p. ej. porque una atención fue en una sede que /citas no le devuelve,
        no es comparable).
     3. Sin dato comparable no hay porcentaje.
   Sin imports: lo usan App.jsx y node --test. */

const MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Mes anterior al de `hoyISO` (AAAA-MM-DD): { desde, hasta, alDia, rango }.
    `alDia` es el mismo día del mes (o el último, si el mes anterior es más corto). */
export function tramoMesAnterior(hoyISO) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(hoyISO || ""));
  if (!m) return null;
  let a = Number(m[1]), mes = Number(m[2]) - 1;   // mes anterior, 1–12
  const dia = Number(m[3]);
  if (mes === 0) { mes = 12; a -= 1; }
  const ultimo = new Date(Date.UTC(a, mes, 0)).getUTCDate();
  const d = Math.min(dia, ultimo);
  const mm = String(mes).padStart(2, "0");
  return {
    desde: `${a}-${mm}-01`,
    hasta: `${a}-${mm}-${String(ultimo).padStart(2, "0")}`,
    alDia: `${a}-${mm}-${String(d).padStart(2, "0")}`,
    rango: d === 1 ? `1 ${MESES_C[mes - 1]}` : `1–${d} ${MESES_C[mes - 1]}`,
  };
}

const valorCita = (c) => Number(c?.valor ?? c?.precio) || 0;

/** Comparación del mes en curso con el mismo tramo del anterior.
    Devuelve null si no hay dato comparable; si no, { base, delta, rango, txt, fuente }.
    `delta` es null cuando el tramo anterior es 0 (no hay contra qué calcular un %). */
export function compararMesAnterior({ mesProd, mesAnterior, antAlDiaServidor = null, citasMesAnterior = null, hoyISO, medicoId = null, tolerancia = 0.5 } = {}) {
  const t = tramoMesAnterior(hoyISO);
  if (!t) return null;
  let base = null, fuente = null;
  const srv = antAlDiaServidor == null || antAlDiaServidor === "" ? NaN : Number(antAlDiaServidor);
  if (Number.isFinite(srv) && srv >= 0) { base = r2(srv); fuente = "servidor"; }
  else if (Array.isArray(citasMesAnterior)) {
    const mias = citasMesAnterior.filter((c) => c && c.estado === "atendida" && (medicoId == null || c.medicoId == null || String(c.medicoId) === String(medicoId)));
    const delMes = mias.filter((c) => { const f = String(c.fecha || "").slice(0, 10); return f >= t.desde && f <= t.hasta; });
    const totalMes = r2(delMes.reduce((a, c) => a + valorCita(c), 0));
    // Solo si las citas explican todo lo que el servidor cuenta en el mes anterior.
    if (Math.abs(totalMes - r2(mesAnterior)) > tolerancia) return null;
    base = r2(delMes.filter((c) => String(c.fecha || "").slice(0, 10) <= t.alDia).reduce((a, c) => a + valorCita(c), 0));
    fuente = "citas";
  } else return null;
  const delta = base > 0 ? Math.round(((Number(mesProd) - base) / base) * 100) : null;
  return { base, delta, rango: t.rango, txt: `vs ${t.rango}`, fuente };
}
