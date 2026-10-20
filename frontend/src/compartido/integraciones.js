/* Estado único de las integraciones (spec UX/UI: FAC-01, LNK-01, INI-03).
   Integraciones, Caja › Links de pago, Caja › Comprobantes SUNAT y el inicio de TI
   leen de aquí: nadie escribe por su cuenta «conectado» o «sin conectar». */

// Pasarela de pago. Esta clínica cobra con Izipay (POS + links). Culqi y Niubiz quedan
// como alternativas disponibles.
export const PASARELAS = [
  { id: "izipay", n: "Izipay", d: "POS físico + links de pago web, abono inmediato. Es la pasarela con la que cobra esta clínica.", rec: true },
  { id: "culqi", n: "Culqi", d: "Tarjeta + Yape + Plin. 3.44% + IGV, sin mensualidad, liquidez el mismo día con BCP." },
  { id: "niubiz", n: "Niubiz", d: "Acepta Amex/Diners y cuotas. Conviene a alto volumen con tarifa negociada." },
];
export const PASARELA_KEY = "dc_data_v1_pasarela";

// Con sesión (dc_token) nada se lee del navegador: la pasarela aún no tiene endpoint en el
// servidor, así que no hay ninguna «conectada»; el proveedor SUNAT es el que fija
// FacturacionSunat al leer GET /facturacion-electronica/config.
const conSesion = () => { try { return !!localStorage.getItem("dc_token"); } catch (e) { return false; } };
let proveedorServidor = "";
export function fijarProveedorSunat(p) { proveedorServidor = String(p || ""); }

/** Pasarela activa: { id, n } o null si no hay ninguna conectada. */
export function pasarelaActiva() {
  if (conSesion()) return null;
  let id = "izipay";
  try { const v = localStorage.getItem(PASARELA_KEY); if (v !== null) id = JSON.parse(v); } catch (e) { /* sin almacenamiento */ }
  return PASARELAS.find((p) => p.id === id) || null;
}
export function setPasarelaActiva(id) {
  if (conSesion()) return;
  try { localStorage.setItem(PASARELA_KEY, JSON.stringify(id || "")); } catch (e) { /* sin almacenamiento */ }
}

// Facturación electrónica: el proveedor (OSE/PSE) se configura en Caja › Comprobantes.
export const SUNAT_CFG_KEY = "dc_data_v1_sunat_cfg";
export function proveedorSunat() {
  if (conSesion()) return proveedorServidor;
  try { return (JSON.parse(localStorage.getItem(SUNAT_CFG_KEY) || "{}") || {}).proveedor || ""; } catch (e) { return ""; }
}

/* Estado de WhatsApp a partir de GET /whatsapp/salud. Integraciones, el inicio de TI y
   WhatsApp + IA lo leen de aquí (H-T4): antes Integraciones decía «Conectado» sin fallos,
   el inicio «incidencia» y WhatsApp «Con fallos – 2 en 24 h» con el mismo dato.
   estado: "operativo" | "incidencia" | "pendiente". */
const msDe = (x) => { const t = x ? new Date(x).getTime() : NaN; return Number.isFinite(t) ? t : null; };
const fechaHoraLima = (x) => new Date(x).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", hour12: false, minute: "2-digit", timeZone: "America/Lima" }).replace(/\.$/, "");
/** « Último envío correcto: 02/10, 10:39 a. m.» si el servidor lo informa (si no, ""). */
export const notaUltimoEnvioOk = (s) => (s && msDe(s.ultimoEnvioOk) != null ? ` Último envío correcto: ${fechaHoraLima(s.ultimoEnvioOk)}.` : "");

export function estadoWhatsApp(s) {
  if (!s) return { estado: "pendiente", etiqueta: "Comprobando…", detalle: "Consultando el estado de WhatsApp en el servidor…", fallos: 0 };
  if (s.error) return { estado: "pendiente", etiqueta: "Sin datos", detalle: "No se pudo consultar el estado de WhatsApp en el servidor.", fallos: 0 };
  const fallos = Number(s.fallos24h) || 0;
  const msg = s.mensaje && !/quarkus|endpoint|WHATSAPP_|OPENAI_/i.test(String(s.mensaje)) ? String(s.mensaje) : "";
  if (s.demo) return { estado: "pendiente", etiqueta: "Modo demo", detalle: "WhatsApp está en modo demo: no envía mensajes reales. Lo activa soporte.", fallos };
  const sem = s.semaforo || (s.ok ? (fallos ? "ambar" : "verde") : "rojo");
  // R5-11: si el último envío falló (el último correcto es anterior al último fallo) no está
  // «correcta», aunque el fallo ya tenga más de 24 h y fallos24h vuelva a 0.
  const tFallo = msDe(s.ultimoFallo), tOk = msDe(s.ultimoEnvioOk);
  const ultimoFallo = tFallo != null && (tOk == null || tFallo > tOk);
  if (s.ok && sem === "verde" && !fallos && !ultimoFallo) return { estado: "operativo", etiqueta: "Conectado", detalle: "Conexión correcta, sin fallos de envío en 24 h.", fallos };
  if (s.ok && !fallos && ultimoFallo) return { estado: "incidencia", etiqueta: "Con fallos", detalle: `Conectado, pero el último envío falló (${fechaHoraLima(s.ultimoFallo)}).`, fallos };
  if (s.ok) return { estado: "incidencia", etiqueta: "Con fallos", detalle: `Conectado, pero con ${fallos || "algunos"} ${fallos === 1 ? "envío fallido" : "envíos fallidos"} en las últimas 24 h.`, fallos };
  if (sem === "gris") return { estado: "pendiente", etiqueta: "Por activar", detalle: msg || "WhatsApp aún no está configurado. Lo activa soporte.", fallos };
  return { estado: "incidencia", etiqueta: "Desconectado", detalle: msg || "Sin conexión con WhatsApp.", fallos };
}

/* ¿El servidor dice que el motor de IA (OpenAI) tiene clave? true | false | undefined. */
export function iaConectada(s) {
  return s ? [s.iaReal, s.ia, s.openai, s.iaConectada].find((x) => typeof x === "boolean") : undefined;
}

/* R8-09: el catálogo de integraciones y su cuenta, los mismos en Integraciones y en el inicio de
   TI. Antes el inicio contaba su propia lista (con «Números de WhatsApp por sede» como otra
   integración por activar) y decía «1/4 operativas · 1 con incidencia · 2 por activar», mientras
   Integraciones decía «2 activas · 1 con incidencia · 1 por activar».
   estado: "conectado" | "incidencia" | "pendiente" | "disponible".
   - conectado: con sesión, lo que se sabe del servidor (GET /whatsapp/salud y GET
     /facturacion-electronica/config); sin sesión, la demostración.
   - salud: respuesta de GET /whatsapp/salud (null mientras se consulta, { error } si falló).
   - provSunat: proveedor OSE/PSE ("" si no hay). pasarela: { id } activa o null.
   - incidenciaSede: el número propio de alguna sede tiene fallos (whatsappSede.incidenciaEnSedes). */
export function estadosIntegraciones({ conectado = false, salud = null, provSunat = "", pasarela = null, incidenciaSede = false } = {}) {
  const wa0 = estadoWhatsApp(conectado ? salud : { ok: true, semaforo: "verde" });
  const wa = conectado && incidenciaSede && wa0.estado !== "incidencia"
    ? { ...wa0, estado: "incidencia", etiqueta: "Con fallos", detalle: "El número de WhatsApp de una sede tiene fallos: revisa WhatsApp por sede." }
    : wa0;
  const ia = iaConectada(salud);
  return [
    ...PASARELAS.map((pa) => ({ id: `pasarela:${pa.id}`, n: pa.n, estado: pasarela && pasarela.id === pa.id ? "conectado" : "disponible" })),
    { id: "sunat", n: "Proveedor OSE / PSE (SUNAT)", estado: provSunat ? "conectado" : "pendiente" },
    { id: "whatsapp", n: "WhatsApp Cloud API (Meta)", estado: !conectado || wa.estado === "operativo" ? "conectado" : wa.estado, wa },
    { id: "ia", n: "API de OpenAI", estado: !conectado || ia === true ? "conectado" : "pendiente", ia },
    { id: "doctoralia", n: "Doctoralia", estado: "disponible" },
  ];
}

/** Cuenta de una lista de integraciones ({ estado }). Activas = conectadas con o sin fallos;
    las que fallan se cuentan además aparte. */
export function contarIntegraciones(items) {
  const l = (Array.isArray(items) ? items : []).filter(Boolean);
  const de = (e) => l.filter((i) => i.estado === e).length;
  const conectadas = de("conectado"), incidencia = de("incidencia"), porActivar = de("pendiente");
  return { total: l.length, activas: conectadas + incidencia, sinFallos: conectadas, incidencia, porActivar, disponibles: l.length - conectadas - incidencia - porActivar };
}
