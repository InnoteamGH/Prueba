/* WhatsApp por sede (pedido del cliente): cada sede tiene su propio número de WhatsApp. Los
   pacientes escriben al número de su sede, cada chat es de la sede del número que lo recibió,
   y los recordatorios, las confirmaciones y las reseñas salen desde el número de la sede de la
   cita o del paciente.
   Aquí vive lo que no es pantalla: validar y normalizar el número peruano, saber de qué sede
   es un chat, desde qué número sale un mensaje y el estado del número de cada sede.
   Mientras el servidor no tenga los campos todo es tolerante: una sede sin `whatsappNumero`
   usa el número único de GET /whatsapp/salud («compartido por todas las sedes») y se marca
   «Sin número propio». Contrato pendiente en docs/requisitos-minimos.md.
   Sin React ni comun.jsx: lo usan Configuración, Integraciones, el inicio de TI, WhatsApp,
   Recordatorios, el membrete y node --test. */
import { estadoWhatsApp } from "./integraciones.js";

/* ── Número ─────────────────────────────────────────────────────────────────────────── */

/** Dígitos comparables de un número: sin espacios ni signos, sin el 00 internacional y,
    si es un celular peruano escrito sin código de país (9 dígitos que empiezan con 9), con el
    51 delante. Meta manda los números sin «+» (51948000000): así se comparan igual. */
export function digitosWhatsapp(v) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("9")) d = `51${d}`;
  return d;
}

/** Celular peruano en E.164 (+519XXXXXXXX), o null si no lo es. */
export function normalizarWhatsappPe(v) {
  const d = digitosWhatsapp(v);
  return /^519\d{8}$/.test(d) ? `+${d}` : null;
}

/** "" si está vacío (el campo es opcional) o es válido; si no, el motivo para mostrarlo. */
export function validarWhatsappPe(v) {
  const t = String(v ?? "").trim();
  if (!t) return "";
  if (normalizarWhatsappPe(t)) return "";
  if (/[A-Za-z]/.test(t)) return "Escribe solo el número: +51 9XX XXX XXX.";
  const d = digitosWhatsapp(t);
  let cel;
  if (d.startsWith("51") && d.length > 9) cel = d.slice(2);   // con el código de país
  else if (d.startsWith("9")) cel = d;                         // sin el código de país
  else return d.length > 9 ? "Debe ser un número de Perú (+51)." : "Debe ser un celular: +51 9XX XXX XXX.";
  if (!cel.startsWith("9")) return "Debe ser un celular (empieza con 9): un fijo no recibe WhatsApp Business.";
  if (cel.length < 9) return `Faltan dígitos: el celular tiene 9 (llevas ${cel.length}).`;
  return `Sobran dígitos: el celular tiene 9 (llevas ${cel.length}).`;
}

/** Para mostrar: «+51 987 654 321». Un número que no es peruano se deja como vino. */
export function formatearWhatsappPe(v) {
  const e = normalizarWhatsappPe(v);
  if (!e) return String(v ?? "").trim();
  return `+51 ${e.slice(3, 6)} ${e.slice(6, 9)} ${e.slice(9)}`;
}

/** ¿Es el mismo número, aunque venga escrito distinto (+51 987…, 51987…, 987 654 321)? */
export const mismoNumero = (a, b) => { const x = digitosWhatsapp(a), y = digitosWhatsapp(b); return !!x && x === y; };

/** ID del número en Meta (phone_number_id): solo dígitos. "" si está vacío o es válido. */
export function validarPhoneNumberId(v) {
  const t = String(v ?? "").replace(/\s/g, "");
  if (!t) return "";
  return /^\d{6,20}$/.test(t) ? "" : "El ID del número en Meta son solo dígitos (lo da WhatsApp Manager).";
}
export const normalizarPhoneNumberId = (v) => String(v ?? "").replace(/\s/g, "") || null;

/** Número de WhatsApp de una sede (E.164) o "" si no tiene. Acepta el nombre del contrato
    (`whatsappNumero`) y el corto del membrete (`whatsapp`). */
export const whatsappDeSede = (s) => normalizarWhatsappPe(s?.whatsappNumero ?? s?.whatsapp ?? "") || "";

/* ── Chat → sede ────────────────────────────────────────────────────────────────────── */

const mismoId = (a, b) => a != null && b != null && String(a).toLowerCase() === String(b).toLowerCase();

/** Número de la clínica que recibió el chat, con los nombres que puede usar el servidor. */
export const numeroRecibido = (c) => c?.numeroSede || c?.numeroClinica || c?.telefonoClinica || "";

/**
 * Sede a la que pertenece una conversación, en este orden:
 *   1. `sedeId` de la conversación (cuando el servidor lo guarde);
 *   2. el número de la clínica que recibió el chat (`numeroSede`, `numeroClinica` o
 *      `telefonoClinica`) cruzado con el `whatsappNumero` de las sedes;
 *   3. la sede del paciente del chat (`sedeDePaciente(conv)`);
 *   4. ninguna: sedeId null («Sin sede»).
 * `igual` compara ids de sede (en pantalla, mismaSede: acepta el id corto y el UUID).
 * Devuelve { sedeId, sede, origen: "conversacion" | "numero" | "paciente" | null, numero }:
 * `numero` es el que recibió el chat o, si no se sabe, el de su sede.
 */
export function sedeDeConversacion(conv, { sedes = [], sedeDePaciente = null, igual = mismoId } = {}) {
  const lista = Array.isArray(sedes) ? sedes : [];
  const recibido = numeroRecibido(conv);
  const numRec = normalizarWhatsappPe(recibido) || (digitosWhatsapp(recibido) ? `+${digitosWhatsapp(recibido)}` : "");
  const conSede = (id, origen) => {
    const sede = lista.find((s) => igual(s.id, id)) || null;
    return { sedeId: sede ? sede.id : id, sede, origen, numero: numRec || whatsappDeSede(sede) };
  };
  if (!conv) return { sedeId: null, sede: null, origen: null, numero: "" };
  if (conv.sedeId != null && conv.sedeId !== "") return conSede(conv.sedeId, "conversacion");
  if (numRec) {
    const sede = lista.find((s) => mismoNumero(whatsappDeSede(s), numRec));
    if (sede) return { sedeId: sede.id, sede, origen: "numero", numero: numRec };
  }
  const sp = typeof sedeDePaciente === "function" ? sedeDePaciente(conv) : null;
  if (sp != null && sp !== "") return conSede(sp, "paciente");
  return { sedeId: null, sede: null, origen: null, numero: numRec };
}

/**
 * R6-08: conversaciones con actividad desde `desde` (YYYY-MM-DD; por `actualizadoEn`, o
 * `ultimoEntranteEn` / `creadoEn` si no viene), repartidas con UNA sede cada una (la de
 * `sedeDe(conv)`, normalmente sedeDeConversacion). Antes el Panel mostraba la cuenta del
 * servidor (/gerencial/reportes → funnel), que reparte los chats por paciente y cuenta algunos
 * en dos sedes: San Isidro 5 + Surco 6 con 8 en total. Aquí cada chat cuenta una sola vez:
 *   - deSedes: los de las sedes que se ven (`enSede(sedeId)`; sin filtro, todos los que tienen sede);
 *   - sinSede: los que aún no tienen sede (no son de ninguna, se informan aparte);
 *   - total = deSedes + sinSede con «Todas»; la suma de las sedes más los sin sede da el total.
 */
export function contarChatsPorSede(convs, { desde = null, sedeDe = () => null, enSede = null } = {}) {
  const fechaDe = (c) => String(c?.actualizadoEn || c?.ultimoEntranteEn || c?.creadoEn || "").slice(0, 10);
  const lista = (Array.isArray(convs) ? convs : []).filter((c) => c && (!desde || fechaDe(c) >= desde));
  let deSedes = 0, sinSede = 0;
  const porSede = new Map();
  for (const c of lista) {
    const s = sedeDe(c);
    if (s == null || s === "") { sinSede++; continue; }
    porSede.set(String(s), (porSede.get(String(s)) || 0) + 1);
    if (!enSede || enSede(s)) deSedes++;
  }
  return { deSedes, sinSede, total: lista.length, porSede };
}

/** Sede de un paciente (API: sedeRegistroId o sedeIds; demo: sede o sedes). */
export function sedeDePacienteObj(p) {
  if (!p) return null;
  const lista = [p.sedeRegistroId, p.sedeId, ...(Array.isArray(p.sedeIds) ? p.sedeIds : []), ...(Array.isArray(p.sedes) ? p.sedes : []), p.sede];
  const x = lista.map((v) => (v && typeof v === "object" ? v.id : v)).find((v) => v != null && v !== "");
  return x ?? null;
}

/* ── Número de salida ───────────────────────────────────────────────────────────────── */

/**
 * Desde qué número sale un mensaje de la sede `sedeId`: el que recibió el chat, el de la
 * sede o, si la sede no tiene, el compartido. { numero, propio, compartido }.
 */
export function numeroDeSalida({ sedeId = null, recibido = "", sedes = [], compartido = "", igual = mismoId } = {}) {
  const rec = normalizarWhatsappPe(recibido);
  if (rec) return { numero: rec, propio: true, compartido: false };
  const sede = (Array.isArray(sedes) ? sedes : []).find((s) => igual(s.id, sedeId));
  const propio = whatsappDeSede(sede);
  if (propio) return { numero: propio, propio: true, compartido: false };
  const comp = normalizarWhatsappPe(compartido) || String(compartido || "").trim();
  return { numero: comp, propio: false, compartido: !!comp };
}

/** Sedes sin número propio (de una lista ya filtrada por las que se ven). */
export const sedesSinNumero = (sedes) => (Array.isArray(sedes) ? sedes : []).filter((s) => s && s.activa !== false && !whatsappDeSede(s));

/* ── Estado por sede (GET /whatsapp/salud) ──────────────────────────────────────────── */

/* Una fila de `porSede` (o la respuesta de ?sedeId=) puede traer solo { estado: "conectado" }
   sin `ok`: se completa para que estadoWhatsApp la lea igual que la salud general. */
function saludDeFila(f) {
  if (!f || typeof f !== "object") return null;
  const est = String(f.estado || "").toLowerCase();
  const ok = typeof f.ok === "boolean" ? f.ok : /^(conectado|operativo|activo|ok|connected)$/.test(est);
  const semaforo = f.semaforo || (/(por_activar|pendiente|sin_configurar)/.test(est) ? "gris" : undefined);
  return { ...f, ok, ...(semaforo ? { semaforo } : {}) };
}

/** Filas de `porSede` de GET /whatsapp/salud (si las trae), o null. */
export const porSedeDeSalud = (s) => (s && Array.isArray(s.porSede) ? s.porSede.filter((x) => x && x.sedeId != null) : null);

/**
 * Una fila por sede con su número y su estado, para Integraciones y el inicio de TI.
 *   - Con estado por sede (`salud.porSede` o `porSede`, las respuestas de ?sedeId=): el de cada número.
 *   - Si no: el número único de la salud general se muestra como «compartido por todas las
 *     sedes»; las sedes sin `whatsappNumero` se marcan «Sin número propio» y las que lo tienen
 *     quedan «Sin estado» hasta que el servidor informe el estado de cada número.
 * `salud` = GET /whatsapp/salud (null mientras carga; en la demo, { ok: true, semaforo: "verde" }).
 * Devuelve { modo: "porSede" | "compartido", compartido: { numero, ...estado } | null, filas }.
 */
export function filasWhatsappSedes({ sedes = [], salud = null, porSede = null, igual = mismoId } = {}) {
  const lista = (Array.isArray(sedes) ? sedes : []).filter((s) => s && s.activa !== false);
  const filasSrv0 = porSede && porSede.length ? porSede : porSedeDeSalud(salud);
  const general = estadoWhatsApp(salud);
  const numGeneral = normalizarWhatsappPe(salud?.numero) || String(salud?.numero || "").trim();
  // R7-01/R7-02: el servidor marca con `compartido: true` / `estado: "compartido"` / `propio: false`
  // la sede que aún usa el número único (y trae el número en `whatsappNumero`). Esa fila no tiene
  // estado propio: vale el general. Si todas son así, se trata igual que sin `porSede`.
  const esCompartida = (x) => !!x && (x.compartido === true || x.propio === false || /^compartido$/i.test(String(x.estado || "")));
  const filasSrv = filasSrv0 && filasSrv0.length && !filasSrv0.every(esCompartida) ? filasSrv0 : null;
  if (filasSrv && filasSrv.length) {
    const filas = lista.map((s) => {
      const f = filasSrv.find((x) => igual(x.sedeId, s.id));
      if (f && esCompartida(f)) return { sedeId: s.id, nombre: s.nombre || "Sede", numero: normalizarWhatsappPe(f.whatsappNumero ?? f.numero) || numGeneral, propio: false, sinNumero: true, estado: { ...general, detalle: `Usa el número compartido. ${general.detalle}` } };
      const numero = normalizarWhatsappPe(f?.numero ?? f?.whatsappNumero) || whatsappDeSede(s);
      if (!f) return { sedeId: s.id, nombre: s.nombre || "Sede", numero, propio: !!numero, sinNumero: !numero, estado: numero ? { estado: "pendiente", etiqueta: "Sin estado", detalle: "El servidor no informa el estado de este número." } : { estado: "pendiente", etiqueta: "Sin número propio", detalle: "Esta sede aún no tiene número de WhatsApp." } };
      const est = estadoWhatsApp(saludDeFila(f));
      // Sin número, el detalle lo dice (no «lo activa soporte»): se agrega en Configuración › Sedes.
      return { sedeId: s.id, nombre: s.nombre || "Sede", numero, propio: !!numero, sinNumero: !numero, estado: numero ? est : { ...est, detalle: "Esta sede aún no tiene número de WhatsApp propio." } };
    });
    return { modo: "porSede", compartido: null, filas };
  }
  const filas = lista.map((s) => {
    const propio = whatsappDeSede(s);
    if (!propio) return { sedeId: s.id, nombre: s.nombre || "Sede", numero: numGeneral, propio: false, sinNumero: true, estado: { estado: "pendiente", etiqueta: "Sin número propio", detalle: numGeneral ? "Usa el número compartido por todas las sedes." : "Esta sede aún no tiene número de WhatsApp." } };
    // Mientras carga (o sin respuesta) vale el estado general; también si la salud general
    // es de este mismo número o no dice de qué número es (demostración).
    const deEste = !salud || salud.error || !numGeneral || mismoNumero(propio, numGeneral);
    return { sedeId: s.id, nombre: s.nombre || "Sede", numero: propio, propio: true, sinNumero: false, estado: deEste ? general : { estado: "pendiente", etiqueta: "Sin estado", detalle: "El servidor aún informa solo el número compartido: el estado de este número no se conoce." } };
  });
  return { modo: "compartido", compartido: salud ? { numero: numGeneral, ...general } : null, filas };
}
