/* Links de pago de Izipay que crea la IA de WhatsApp al reservar un cupo (Caja › Links de pago).
   GET /pagos/links devuelve, el más reciente primero: { pagoId, reservaId, url, importe, estado,
   caducaEn, citaId, izipayRef, fecha, hora, sedeId, sedeNombre }. Estados del servidor:
   pendiente (esperando pago: el cupo queda retenido hasta `caducaEn`), pagado (Izipay confirmó
   el pago y `citaId` es la cita creada), caducado (venció sin pago y el cupo se liberó) y anulado.
   `caducaEn` llega en UTC como «2026-10-15 19:38:22.123+00» (Postgres) o en ISO: se muestra en
   hora de Lima sin depender del huso del navegador.
   Sin dependencias de React: lo usan App.jsx y node --test. */
import { fechaHoraLima } from "./fechaLima.js";

const ESTADOS = {
  pendiente: { etiqueta: "Esperando pago", tono: "aviso" },
  pagado: { etiqueta: "Pagado", tono: "ok" },
  caducado: { etiqueta: "Venció sin pago", tono: "mute" },
  anulado: { etiqueta: "Anulado", tono: "mute" },
};

/** { clave, etiqueta, tono } del link. Un estado que no se conoce sale tal cual (con
    mayúscula) y en tono neutro; sin estado, «Sin estado». tono: aviso | ok | mute | neutro. */
export function estadoLink(l) {
  const clave = String((l && l.estado) || "").trim().toLowerCase();
  const e = ESTADOS[clave];
  if (e) return { clave, ...e };
  return { clave: clave || "desconocido", etiqueta: clave ? clave.charAt(0).toUpperCase() + clave.slice(1) : "Sin estado", tono: "neutro" };
}

// «2026-10-15 19:38:22.123+00», «2026-10-15T19:38:22Z», «…-05:00»… La zona «+00» o «+0000»
// pasa a «+00:00» y, sin zona, se toma como UTC: así lo lee igual cualquier navegador
// (Safari no acepta el espacio ni «+00»).
const RE_INSTANTE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?(\.\d+)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
function instanteUtc(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  const m = RE_INSTANTE.exec(s);
  let iso = s;
  if (m) {
    const zona = !m[5] || m[5].toUpperCase() === "Z" ? "Z" : (() => { const z = m[5].replace(":", ""); return `${z.slice(0, 3)}:${z.slice(3, 5) || "00"}`; })();
    iso = `${m[1]}T${m[2]}${m[3] || ":00"}${m[4] ? m[4].slice(0, 4) : ""}${zona}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return null;   // una fecha sola no tiene hora
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «14:38»: la hora de Lima (America/Lima) de `caducaEn`. Lo que no se puede leer, "". */
export function horaLimaDe(caducaEn) {
  const d = instanteUtc(caducaEn);
  if (!d) return "";
  const m = /(\d{2}:\d{2})$/.exec(fechaHoraLima(d));
  return m ? m[1] : "";
}

/** ¿Ya pasó `caducaEn`? Un link «pendiente» con el plazo vencido ya no se cobra: el servidor
    puede tardar en pasarlo a «caducado» (QA 17: links «pendiente» después de vencer). */
export function vencioYa(caducaEn, ahora = Date.now()) {
  const d = instanteUtc(caducaEn);
  const t = ahora instanceof Date ? ahora.getTime() : Number(ahora);
  return !!d && Number.isFinite(t) && d.getTime() <= t;
}

/** Conteos para la cabecera: { pendientes, pagados, caducados, montoPagado } (S/, 2 decimales). */
export function resumenLinks(lista) {
  const r = { pendientes: 0, pagados: 0, caducados: 0, montoPagado: 0 };
  (Array.isArray(lista) ? lista : []).forEach((l) => {
    const { clave } = estadoLink(l);
    if (clave === "pendiente") r.pendientes++;
    else if (clave === "caducado") r.caducados++;
    else if (clave === "pagado") {
      r.pagados++;
      const n = Number(l.importe ?? l.monto);
      if (Number.isFinite(n)) r.montoPagado += n;
    }
  });
  r.montoPagado = Math.round(r.montoPagado * 100) / 100;
  return r;
}

/** Los 8 primeros caracteres del pedido (pagoId), para nombrarlo ante el paciente o Izipay. */
export function idCorto(pagoId) {
  return String(pagoId ?? "").trim().slice(0, 8);
}
