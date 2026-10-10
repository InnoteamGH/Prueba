/**
 * Helpers del Panel Gerencial (SPEC §8): escala al TOTAL, cero sin barra,
 * pacientes distintos, meta vacía sin S/ 0 ni 0%.
 */

const META_VACIA = "Sin meta configurada";

/** Formato soles con espacio de miles (estilo clínica). */
export function moneyFmt(n, { dec = 0, prefijo = "S/ " } = {}) {
  const num = Number(n);
  if (!Number.isFinite(num)) return `${prefijo}—`;
  const fixed = dec > 0 ? num.toFixed(dec) : String(Math.round(num));
  const [ent, frac] = fixed.split(".");
  const conEspacios = ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return frac != null ? `${prefijo}${conEspacios}.${frac}` : `${prefijo}${conEspacios}`;
}

/** Porcentaje de un valor sobre el total del grupo (no sobre el máximo). */
export function pctOfTotal(valor, total) {
  const v = Number(valor) || 0;
  const t = Number(total) || 0;
  if (v <= 0 || t <= 0) return 0;
  return (v / t) * 100;
}

/**
 * Layout de barra de progreso / segmento.
 * Valor 0 → no dibujar. Escala relativa al total del grupo.
 * @returns {{ dibujar: boolean, pct: number, etiquetaPct: string }}
 */
export function layoutProgreso(valor, total) {
  const v = Number(valor) || 0;
  const t = Number(total) || 0;
  if (v <= 0 || t <= 0) {
    return { dibujar: false, pct: 0, etiquetaPct: "sin saldo" };
  }
  const pct = pctOfTotal(v, t);
  const etiquetaPct = `${pct.toFixed(pct >= 10 || pct === Math.round(pct) ? 1 : 1)}%`.replace(/\.0%$/, "%");
  return { dibujar: true, pct, etiquetaPct: `${Math.round(pct * 10) / 10}%` };
}

/** Layout de una serie: cada ítem escala al total; la suma de pct dibujados ≈ 100. */
export function layoutBarrasTotal(serie) {
  const vals = (serie || []).map((v) => Number(v) || 0);
  const total = vals.reduce((a, b) => a + b, 0);
  return vals.map((valor) => {
    const lay = layoutProgreso(valor, total);
    return { valor, total, ...lay };
  });
}

/** Pacientes distintos con estado dada (por defecto atendida). */
export function distinctPatients(citas, estado = "atendida") {
  const set = new Set();
  for (const c of citas || []) {
    if (estado && c.estado !== estado) continue;
    const id = c.pacienteId ?? c.paciente_id ?? c.paciente;
    if (id == null || id === "") continue;
    set.add(String(id));
  }
  return set.size;
}

/**
 * Texto del KPI Meta. Nunca "S/ 0" ni "0%" cuando no hay meta (P12).
 * @returns {{ vacia: boolean, label: string, meta: number|null }}
 */
export function metaEstado(hayMeta, metaMensualClinica) {
  const meta = Number(metaMensualClinica);
  const ok = hayMeta === true && Number.isFinite(meta) && meta > 0;
  if (!ok) {
    return { vacia: true, label: META_VACIA, meta: null };
  }
  return { vacia: false, label: moneyFmt(meta), meta };
}

export function metaEmptyLabel() {
  return META_VACIA;
}

/** Filtra micro-cifras que repiten la cifra grande o la pastilla (P07). */
export function filtraMicro(micro, cifra, parte) {
  const digitos = (s) => String(s ?? "").replace(/[^\d.,]/g, "").replace(/\s/g, "");
  const cifraD = digitos(typeof cifra === "function" ? cifra() : cifra);
  const parteD = digitos(parte);
  return (micro || []).filter((row) => {
    const val = Array.isArray(row) ? row[1] : row?.valor;
    const d = digitos(val);
    if (!d) return true;
    if (cifraD && d === cifraD) return false;
    if (parteD && d === parteD) return false;
    return true;
  });
}

/** Acumula pagos del día en puntos [horaDecimal, acumulado] dentro de la jornada
 *  (por defecto 08→20; el panel pasa el horario real de la clínica). */
export function curvaCajaAcumulada(pagos, fechaYmd, { abre = 8, cierra = 20 } = {}) {
  const delDia = (pagos || [])
    .filter((p) => {
      const raw = p.creadoEn || p.fecha || p.createdAt || "";
      const ymd = String(raw).slice(0, 10);
      return !fechaYmd || ymd === fechaYmd;
    })
    .map((p) => {
      const raw = p.creadoEn || p.fecha || p.createdAt || "";
      const t = raw.includes("T") ? new Date(raw) : null;
      const h = t && !Number.isNaN(t.getTime())
        ? t.getHours() + t.getMinutes() / 60
        : abre;
      return { h: Math.min(cierra, Math.max(abre, h)), monto: Number(p.monto) || 0 };
    })
    .sort((a, b) => a.h - b.h);
  const pts = [[abre, 0]];
  let acc = 0;
  for (const p of delDia) {
    acc += p.monto;
    pts.push([p.h, acc]);
  }
  if (pts.length === 1) pts.push([abre + 0.01, 0]);
  return pts;
}

export function inicialesDe(nombre) {
  // Sin el tratamiento: «Dra. Carla Mendoza» → CM, no DM.
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean)
    .filter((w, i, a) => !(a.length > 1 && i === 0 && /^(dra?|lic|sr|sra|mg|mgtr)\.?$/i.test(w)));
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function diaDelMesRitmo(date = new Date()) {
  const d = date.getDate();
  const dias = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return { dia: d, diasMes: dias, ritmoPct: (d / dias) * 100 };
}

/* H-G3 / H-G4: «Facturado del mes», «Producción por especialidad» y «Top de tratamientos»
   salen de la MISMA lista (GET /tratamientos/resumen del mes). Antes Facturado usaba
   kpis.ingresosMes (citas atendidas × precio) y Especialidad indicadores.porEspecialidad
   (citas, aunque estuvieran canceladas o fueran futuras): tres cifras distintas de
   «facturado» en la misma pantalla. */

/** Total de una lista de /tratamientos/resumen ([{ importeTotal }]). */
export function totalResumen(lista) {
  return (Array.isArray(lista) ? lista : []).reduce((s, t) => s + (Number(t?.importeTotal) || 0), 0);
}

const normNom = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Especialidad del ítem del resumen: por servicioId; si no viene (hoy llega null), por el
 *  nombre del servicio del catálogo (exacto, el ítem empieza por él o lo contiene; gana el
 *  nombre más largo). Sin coincidencia: null. */
export function especialidadDeItem(item, servicios) {
  const cat = Array.isArray(servicios) ? servicios : [];
  const esp = (s) => (s && (s.especialidad || s.areaClinica || s.categoria)) || null;
  if (item?.servicioId != null) {
    const s = cat.find((x) => String(x.id) === String(item.servicioId));
    if (esp(s)) return esp(s);
  }
  const n = normNom(item?.nombre);
  if (!n) return null;
  let mejor = null;
  for (const s of cat) {
    const sn = normNom(s?.nombre);
    if (!sn || !esp(s)) continue;
    const pega = n === sn ? 3 : n.startsWith(sn) ? 2 : n.includes(sn) ? 1 : 0;
    if (!pega) continue;
    if (!mejor || pega > mejor.pega || (pega === mejor.pega && sn.length > mejor.len)) mejor = { pega, len: sn.length, esp: esp(s) };
  }
  return mejor ? mejor.esp : null;
}

/* H-G14: la cartera del panel cuenta con la MISMA regla que el directorio de Pacientes:
   total = pacientes de GET /pacientes (los que se ven); nuevos 30 d = última visita
   (GET /pacientes/resumen-citas) o alta (creadoEn) de hace 30 días o menos. Antes eran
   /pacientes/resumen (46) frente al directorio (47) e indicadores.cartera.nuevos (20 frente a 17). */
export function carteraComoDirectorio(pacientes, ultimaPorId = {}, hoyIso) {
  const lista = Array.isArray(pacientes) ? pacientes : [];
  const t0 = new Date(`${hoyIso}T00:00:00`).getTime();
  const diasDesde = (f) => {
    if (!f) return 999;
    const t = new Date(`${String(f).slice(0, 10)}T00:00:00`).getTime();
    return Number.isFinite(t) ? Math.max(0, Math.round((t0 - t) / 86400000)) : 999;
  };
  const nuevos = lista.filter((p) => diasDesde(ultimaPorId[p.id]) <= 30 || diasDesde(p.creadoEn) <= 30).length;
  return { total: lista.length, nuevos30: nuevos };
}

/** Producción por especialidad a partir del resumen de tratamientos y el catálogo:
 *  [{ nombre, valor }] de mayor a menor. Lo que no se reconoce va a «Sin especialidad». */
export function produccionPorEspecialidad(lista, servicios, sinEsp = "Sin especialidad en el catálogo") {
  const acc = new Map();
  for (const t of Array.isArray(lista) ? lista : []) {
    const v = Number(t?.importeTotal) || 0;
    if (v <= 0) continue;
    const k = especialidadDeItem(t, servicios) || sinEsp;
    acc.set(k, (acc.get(k) || 0) + v);
  }
  return [...acc.entries()].map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
}
