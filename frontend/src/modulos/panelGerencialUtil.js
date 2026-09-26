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

/** Acumula pagos del día en puntos [horaDecimal, acumulado] de 08→20. */
export function curvaCajaAcumulada(pagos, fechaYmd) {
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
        : 8;
      return { h: Math.min(20, Math.max(8, h)), monto: Number(p.monto) || 0 };
    })
    .sort((a, b) => a.h - b.h);
  const pts = [[8, 0]];
  let acc = 0;
  for (const p of delDia) {
    acc += p.monto;
    pts.push([p.h, acc]);
  }
  if (pts.length === 1) pts.push([8.01, 0]);
  return pts;
}

export function inicialesDe(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function diaDelMesRitmo(date = new Date()) {
  const d = date.getDate();
  const dias = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return { dia: d, diasMes: dias, ritmoPct: (d / dias) * 100 };
}
