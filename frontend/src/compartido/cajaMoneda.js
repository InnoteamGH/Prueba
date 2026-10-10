/* Dinero de la caja en dos monedas y la boleta de un cobro.
   Convención: un COBRO guarda `monto` en soles (lo que suma la caja) y, si se pagó en
   dólares, `moneda: "USD"`, `montoOriginal` (US$) y `tipoCambio`. Un EGRESO guarda `monto`
   en su propia moneda (`moneda`) y, si es en dólares, su `tipoCambio`.
   Sin React ni imports: lo usan Caja, el cobro (ModalCobro), la boleta y node:test. */

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* Categorías de egreso: una sola lista para el formulario, la reclasificación y el reporte
   por categoría (con su color). «Otros» va al final: es lo que queda por clasificar. */
export const EGRESO_CATS = ["Insumos", "Laboratorio", "Alquiler", "Servicios (luz/agua)", "Planilla", "Marketing", "Equipos", "Movilidad", "Caja chica", "Otros"];
export const EGRESO_CAT_COL = { Insumos: "#0E9199", Laboratorio: "#6D4FD1", Alquiler: "#1E3A5F", "Servicios (luz/agua)": "#D97706", Planilla: "#2563EB", Marketing: "#DB2777", Equipos: "#16A36A", Movilidad: "#0E7490", "Caja chica": "#A16207", Otros: "#64748B" };
/** Medios con que se paga un egreso. */
export const EGRESO_METODOS = [["efectivo", "Efectivo"], ["tarjeta", "Tarjeta"], ["transferencia", "Transferencia"], ["yape", "Yape"], ["plin", "Plin"]];
/** TC de respaldo para datos viejos sin TC (el mismo que usa Comprobantes SUNAT). */
export const TC_DEFECTO = 3.75;
const tcValido = (x) => { const n = Number(x); return Number.isFinite(n) && n > 0 ? n : null; };

/** Monto que escribió el usuario: número ≥ 0 con hasta 2 decimales («50.5.5» no vale).
    Vacío = 0, salvo que sea obligatorio. → { ok, valor, vacio?, motivo? } */
export function leerMonto(txt, { obligatorio = false } = {}) {
  const s = String(txt ?? "").trim().replace(",", ".");
  if (s === "") return obligatorio ? { ok: false, motivo: "vacio" } : { ok: true, valor: 0, vacio: true };
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(s)) return { ok: false, motivo: "formato" };
  return { ok: true, valor: r2(Number(s)) };
}

/** TC de un cobro en dólares: el guardado; si falta, el que resulta de soles ÷ US$; si no, `defecto`. */
export function tcDeCobro(p, defecto = TC_DEFECTO) {
  const tc = tcValido(p?.tipoCambio);
  if (tc) return tc;
  const usd = Number(p?.montoOriginal), pen = Number(p?.monto);
  if (usd > 0 && pen > 0) return Math.round((pen / usd) * 10000) / 10000;
  return defecto;
}

/** Un egreso en soles: los de dólares con su TC (un dato viejo sin TC, con el de referencia). */
export const egresoEnSoles = (e, tcRef = TC_DEFECTO) =>
  (e?.moneda === "USD" ? r2((Number(e.monto) || 0) * (tcValido(e.tipoCambio) || tcValido(tcRef) || TC_DEFECTO)) : r2(e?.monto));

/** Totales de egresos: `soles` (todo, con los dólares convertidos), `pen` (los pagados en
    soles) y `usd` (los pagados en dólares, en US$). */
export function sumarEgresos(lista, tcRef = TC_DEFECTO) {
  const t = (lista || []).reduce((a, e) => {
    a.soles += egresoEnSoles(e, tcRef);
    if (e?.moneda === "USD") a.usd += Number(e.monto) || 0; else a.pen += Number(e?.monto) || 0;
    return a;
  }, { soles: 0, pen: 0, usd: 0 });
  return { soles: r2(t.soles), pen: r2(t.pen), usd: r2(t.usd) };
}

/** Cobros del día: `soles` (todo, ya en soles), `usd` (lo recibido en dólares, en US$) y
    `usdEnSoles` (cuánto de `soles` vino en dólares). Así «S/ 270 (incluye US$ 40)» no se suma dos veces. */
export function sumarCobros(lista) {
  const t = (lista || []).reduce((a, b) => {
    const pen = Number(b?.monto) || 0;
    a.soles += pen;
    if (b?.moneda === "USD") { a.usd += Number(b.montoOriginal) || 0; a.usdEnSoles += pen; }
    return a;
  }, { soles: 0, usd: 0, usdEnSoles: 0 });
  return { soles: r2(t.soles), usd: r2(t.usd), usdEnSoles: r2(t.usdEnSoles) };
}

/** Diferencias de los cierres por separado: un faltante y un sobrante no se anulan. */
export function resumenDiferencias(jornadas, campo = "diferencia") {
  return (jornadas || []).reduce((a, r) => {
    const d = r?.[campo] == null || r[campo] === "" ? null : Number(r[campo]);
    if (d == null || Number.isNaN(d)) return a;
    if (d < -0.009) { a.faltantes = r2(a.faltantes - d); a.nFaltantes += 1; }
    else if (d > 0.009) { a.sobrantes = r2(a.sobrantes + d); a.nSobrantes += 1; }
    return a;
  }, { faltantes: 0, sobrantes: 0, nFaltantes: 0, nSobrantes: 0 });
}

/** Líneas de la boleta con columnas que cuadran: `valor` (venta sin IGV) + `igv` = `importe`
    (con IGV), y la suma de importes es el total. `items` = [{ cant, desc, precio }] con
    precio unitario con IGV en soles. Si los ítems no suman lo cobrado (un abono, un descuento,
    pagos previos), la boleta lleva una sola línea con el concepto: nunca ítems que no suman. */
export function lineasBoleta({ items = null, totalPen = 0, total = 0, moneda = "PEN", tc = null, concepto = "" }) {
  const tot = r2(total);
  const base = (items || []).filter((it) => it && Number(it.precio) > 0)
    .map((it) => ({ cant: Math.max(1, Number(it.cant) || 1), desc: String(it.desc || concepto || "Servicio odontológico"), pen: r2((Number(it.precio) || 0) * Math.max(1, Number(it.cant) || 1)) }));
  const sumaPen = r2(base.reduce((a, it) => a + it.pen, 0));
  const usaItems = base.length > 0 && Math.abs(sumaPen - r2(totalPen)) <= 0.05;
  let filas = usaItems
    ? base.map((it) => ({ cant: it.cant, desc: it.desc, importe: moneda === "USD" ? r2(it.pen / (tcValido(tc) || TC_DEFECTO)) : it.pen }))
    : [{ cant: 1, desc: concepto || "Servicio odontológico", importe: tot }];
  // El redondeo de la conversión (o de céntimos) se ajusta en la última línea: el total manda.
  const resto = r2(tot - filas.reduce((a, f) => a + f.importe, 0));
  if (resto) filas = filas.map((f, i) => (i === filas.length - 1 ? { ...f, importe: r2(f.importe + resto) } : f));
  const lineas = filas.map((f) => { const valor = r2(f.importe / 1.18); return { ...f, precio: r2(f.importe / f.cant), valor, igv: r2(f.importe - valor) }; });
  return {
    lineas,
    opGravada: r2(lineas.reduce((a, l) => a + l.valor, 0)),
    igv: r2(lineas.reduce((a, l) => a + l.igv, 0)),
    total: r2(lineas.reduce((a, l) => a + l.importe, 0)),
  };
}

/** La boleta de un cobro, igual desde «Ver boleta» del cobro que desde Comprobantes de hoy
    o SUNAT. `b` es el cobro (monto en soles; si fue en dólares, montoOriginal y TC);
    `serie`/`numero` ya resueltos. En dólares el total es lo que pagó el paciente en US$,
    con el TC del cobro y su equivalente en soles. */
export function armarBoleta(b = {}, { serie = "", numero = "", usuario = "" } = {}) {
  const usd = b.moneda === "USD";
  const tc = usd ? tcDeCobro(b) : null;
  const totalPenIn = Number(b.monto);
  const usdIn = Number(b.montoOriginal);
  const totalUsd = usd ? (usdIn > 0 ? r2(usdIn) : r2((totalPenIn || 0) / tc)) : null;
  const totalPen = usd ? (totalPenIn > 0 ? r2(totalPenIn) : r2(totalUsd * tc)) : r2(totalPenIn);
  const total = usd ? totalUsd : totalPen;
  const concepto = b.concepto || "Servicio odontológico";
  const L = lineasBoleta({ items: b.items, totalPen, total, moneda: usd ? "USD" : "PEN", tc, concepto });
  const dni = b.dni || "";
  return {
    serie, numero, sede: b.sede ?? b.sedeId ?? null,
    cliente: b.cliente || b.paciente || "Cliente",
    dni, docTipo: b.docTipo || "DNI", docNum: b.docNum || dni,
    direccion: b.direccion || "", fecha: b.fecha || "",
    tipo: b.tipo || "Boleta", concepto, metodo: String(b.metodo || "").toLowerCase(),
    ref: b.ref || b.refComprobante || b.referencia || undefined,
    usuario: b.usuario || usuario || "",
    moneda: usd ? "USD" : "PEN", tipoCambio: tc, totalPen,
    ...L,
  };
}
