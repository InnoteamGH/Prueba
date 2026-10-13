/* Portal del paciente: lo que se lee del resumen del servidor (GET /portal/{id}/resumen).
   Sin React ni comun.jsx: lo usan App.jsx y node --test. */
import { formatearWhatsappPe, normalizarWhatsappPe } from "../compartido/whatsappSede.js";

/* R8-02: el resumen trae hoy solo `citas, paciente, totalInvertido, totalAhorrado, pagos`, y el
   portal afirmaba «Sin plan aún», «Tu boca está sana», «Piezas por atender 0» y «Saldo pendiente
   S/ 0 · Estás al día» a una paciente con un plan de S/ 1 000, 2 fases pendientes y S/ 800 de
   saldo. Un campo que no llega no es «sin plan» ni «S/ 0»: es «no disponible». Si algún día el
   servidor los manda (plan y fases, saldo, odontograma), se usan.
   Devuelve { fases, saldo, odontograma, nombrePlan }; cada uno null si no viene. */
const HECHA = /^(atendid[ao]|terminad[ao]|completad[ao]|realizad[ao]|hech[ao])$/i;
const ANULADA = /^(cancelad[ao]|anulad[ao])$/i;
const esObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);

export function planDelResumen(r) {
  const plan = esObj(r?.plan) ? r.plan : null;
  const planes = Array.isArray(r?.planes) ? r.planes.filter(esObj) : null;
  const lista = [r?.fases, plan?.fases, plan?.items, Array.isArray(r?.plan) ? r.plan : undefined, r?.tratamiento,
    planes ? planes.flatMap((p) => (Array.isArray(p.fases) ? p.fases : [])) : undefined].find(Array.isArray);
  const fases = lista
    ? lista.filter(esObj).filter((f) => !ANULADA.test(String(f.estado || ""))).map((f, i) => ({
        id: f.id ?? `fase-${i}`,
        nombre: f.nombre || f.servicio || f.descripcion || "Procedimiento",
        costo: Number(f.costo ?? f.precio ?? f.importe ?? f.monto) || 0,
        estado: HECHA.test(String(f.estado || "")) ? "atendida" : (f.estado || "pendiente"),
      }))
    : null;
  const num = (x) => (x != null && x !== "" && Number.isFinite(Number(x)) ? Number(x) : null);
  const saldo = [r?.saldoPendiente, r?.saldo, plan?.saldoPendiente, plan?.saldo].map(num).find((x) => x != null) ?? null;
  const odontograma = esObj(r?.odontograma) ? r.odontograma : null;
  const nombrePlan = plan?.nombre || (planes && planes[0]?.nombre) || null;
  return { fases, saldo, odontograma, nombrePlan };
}

/* R8-03: «Reservar cita» proponía doctor, sede, horario y precio desde los datos de la
   demostración, sin consultar la disponibilidad, y al confirmar decía que no estaba conectado.
   Con sesión se pide reservar por WhatsApp o en recepción, con el número de la sede del
   paciente (o el de la clínica); si no se sabe su sede, los de cada sede. [] si no hay ninguno.
   Cada contacto: { nombre, telefono, whatsapp (E.164 o ""), whatsappTexto, whatsappUrl }. */
const mismoIdTxt = (a, b) => a != null && b != null && String(a).toLowerCase() === String(b).toLowerCase();
const txt = (x) => String(x ?? "").trim();

function contacto(nombre, telefono, wa) {
  const e164 = normalizarWhatsappPe(wa) || "";
  return { nombre, telefono: txt(telefono), whatsapp: e164, whatsappTexto: e164 ? formatearWhatsappPe(e164) : "", whatsappUrl: e164 ? `https://wa.me/${e164.slice(1)}` : "" };
}
const conDato = (c) => !!(c.telefono || c.whatsapp);

export function contactosReserva({ clinica = null, sedes = [], sedeId = null, igual = mismoIdTxt } = {}) {
  const activas = (Array.isArray(sedes) ? sedes : []).filter((s) => s && s.activa !== false);
  const deSede = (s) => contacto(s.nombre || "Sede", s.telefono ?? s.telefonos, s.whatsappNumero ?? s.whatsapp);
  const suya = sedeId != null && sedeId !== "" ? activas.find((s) => igual(s.id, sedeId)) : null;
  if (suya && conDato(deSede(suya))) return [deSede(suya)];
  if (esObj(clinica)) {
    const c = contacto(txt(clinica.nombre) || "La clínica", clinica.telefono, clinica.whatsapp ?? clinica.whatsappNumero);
    if (conDato(c)) return [c];
  }
  // Varias sedes con los mismos números (p. ej. el WhatsApp compartido): una sola fila con sus nombres.
  const porNumero = new Map();
  activas.map(deSede).filter(conDato).forEach((c) => {
    const k = `${c.whatsapp}|${c.telefono}`;
    const ya = porNumero.get(k);
    if (ya) ya.nombres.push(c.nombre); else porNumero.set(k, { ...c, nombres: [c.nombre] });
  });
  return [...porNumero.values()].map(({ nombres, ...c }) => ({ ...c, nombre: nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres[0] }));
}
