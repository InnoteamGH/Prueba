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

/** «12/10/2026» (dd/mm/aaaa) sin hora, para las columnas de fecha de los documentos (M6-05:
    la Historia clínica PDF y el PDF de la agenda salían con «2026-10-12»). Acepta una fecha
    sola («2026-10-12») o un instante («2026-10-12T09:34:48-05:00», que se lee en hora de
    Lima). Lo que no se puede leer sale tal cual; vacío, "". */
export function fechaCortaLima(v) {
  if (v == null || v === "") return "";
  const s = String(v);
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  const ymd = ymdLima(v instanceof Date ? v : s);
  if (!ymd) return s;
  const [a, m, d] = ymd.split("-");
  return `${d}/${m}/${a}`;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
/** «oct»: el mes abreviado en minúscula y sin punto, como en el resto de la app (M8-08: el
    navegador da «Oct.» para el mes solo y «Mi horario» decía «19 Oct. – 24 Oct.»). Acepta un
    Date o «aaaa-mm-dd»; lo que no se puede leer, "". */
export function mesCorto(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : MESES_CORTOS[v.getMonth()];
  const m = /^\d{4}-(\d{2})/.exec(String(v || ""));
  return m ? MESES_CORTOS[Number(m[1]) - 1] || "" : "";
}

/** «Hace 9 días», «Hoy» o «En 3 días» respecto de hoy (ambas «aaaa-mm-dd»). M8-08: una fecha
    futura nunca sale como «Hace …»: con `futuro` (p. ej. «Próxima cita») dice «En …»; sin él
    (p. ej. «Última cita» con una fecha que aún no llega), «Próxima». */
export function fechaRelativa(iso, hoyIso, { futuro = false } = {}) {
  const a = Date.parse(`${String(iso || "").slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(hoyIso || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return "";
  const d = Math.round((a - b) / 86400000);
  if (d === 0) return "Hoy";
  const n = Math.abs(d);
  const meses = Math.round(n / 30), anios = Math.round(n / 365);
  const txt = n < 30 ? `${n} día${n > 1 ? "s" : ""}` : n < 365 ? `${meses} mes${meses > 1 ? "es" : ""}` : `${anios} año${anios > 1 ? "s" : ""}`;
  if (d > 0) return futuro ? `En ${txt}` : "Próxima";
  return `Hace ${txt}`;
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
