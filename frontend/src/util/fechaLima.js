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
  return `${browser} · ${os} · ${mobile}`;
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
