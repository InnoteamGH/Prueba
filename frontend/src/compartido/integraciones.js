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
export function estadoWhatsApp(s) {
  if (!s) return { estado: "pendiente", etiqueta: "Comprobando…", detalle: "Consultando el estado de WhatsApp en el servidor…", fallos: 0 };
  if (s.error) return { estado: "pendiente", etiqueta: "Sin datos", detalle: "No se pudo consultar el estado de WhatsApp en el servidor.", fallos: 0 };
  const fallos = Number(s.fallos24h) || 0;
  const msg = s.mensaje && !/quarkus|endpoint|WHATSAPP_|OPENAI_/i.test(String(s.mensaje)) ? String(s.mensaje) : "";
  if (s.demo) return { estado: "pendiente", etiqueta: "Modo demo", detalle: "WhatsApp está en modo demo: no envía mensajes reales. Lo activa soporte.", fallos };
  const sem = s.semaforo || (s.ok ? (fallos ? "ambar" : "verde") : "rojo");
  if (s.ok && sem === "verde" && !fallos) return { estado: "operativo", etiqueta: "Conectado", detalle: "Conexión correcta, sin fallos de envío en 24 h.", fallos };
  if (s.ok) return { estado: "incidencia", etiqueta: "Con fallos", detalle: `Conectado, pero con ${fallos || "algunos"} ${fallos === 1 ? "envío fallido" : "envíos fallidos"} en las últimas 24 h.`, fallos };
  if (sem === "gris") return { estado: "pendiente", etiqueta: "Por activar", detalle: msg || "WhatsApp aún no está configurado. Lo activa soporte.", fallos };
  return { estado: "incidencia", etiqueta: "Desconectado", detalle: msg || "Sin conexión con WhatsApp.", fallos };
}

/* ¿El servidor dice que el motor de IA (OpenAI) tiene clave? true | false | undefined. */
export function iaConectada(s) {
  return s ? [s.iaReal, s.ia, s.openai, s.iaConectada].find((x) => typeof x === "boolean") : undefined;
}
