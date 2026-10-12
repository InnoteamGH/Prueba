/** Fecha calendario en America/Lima como YYYY-MM-DD (NEW-57). */
export function ymdLima(d) {
  if (d == null || d === "") return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** «11/10/2026 19:27» (dd/mm/aaaa hh:mm) en hora de Lima, para documentos firmados (M5-14).
    Una fecha sola («2026-10-11») sale sin hora; lo que no se puede leer, tal cual. */
export function fechaHoraLima(v) {
  if (v == null || v === "") return "";
  const s = String(v);
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  const date = v instanceof Date ? v : new Date(s);
  if (Number.isNaN(date.getTime())) return s;
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/** Resume user-agent a etiqueta corta para Auditoría (NEW-58b). */
export function resumenDispositivo(ua) {
  const s = String(ua || "").trim();
  if (!s || s === "—") return "—";
  const lower = s.toLowerCase();
  let os = "Otro";
  if (/iphone|ipad|ipod/.test(lower)) os = "iOS";
  else if (/android/.test(lower)) os = "Android";
  else if (/mac os|macintosh/.test(lower)) os = "macOS";
  else if (/windows/.test(lower)) os = "Windows";
  else if (/linux/.test(lower)) os = "Linux";
  let browser = "Navegador";
  if (/edg\//.test(lower)) browser = "Edge";
  else if (/chrome\//.test(lower) && !/edg\//.test(lower)) browser = "Chrome";
  else if (/safari\//.test(lower) && !/chrome\//.test(lower)) browser = "Safari";
  else if (/firefox\//.test(lower)) browser = "Firefox";
  const mobile = /mobile|android|iphone|ipad/.test(lower) ? "móvil" : "escritorio";
  return `${browser} – ${os} – ${mobile}`;
}

/** Cuenta filas cuyo ymd coincide con hoy Lima. */
export function contarEventosHoy(rows, hoy = ymdLima(new Date())) {
  if (!hoy || !Array.isArray(rows)) return 0;
  return rows.filter((a) => a && a.ymd && a.ymd === hoy).length;
}

/** Mapea payload GET /auditoria → filas de UI (ymd para KPI Hoy). */
export function mapAuditoriaApiRows(list) {
  return (list || []).map((a, i) => {
    const creado = a.creadoEn ? new Date(a.creadoEn) : null;
    const ok = creado && !Number.isNaN(creado.getTime());
    const ua = a.userAgent && a.userAgent !== "—" ? a.userAgent : "—";
    return {
      id: a.id || i,
      ymd: ok ? ymdLima(creado) : null,
      orden: ok ? creado.getTime() : 0,
      detalle: a.detalle || "—",
      ip: a.ip && a.ip !== "—" ? a.ip : "—",
      userAgent: ua,
      dispositivo: resumenDispositivo(ua),
      raw: a,
    };
  });
}
