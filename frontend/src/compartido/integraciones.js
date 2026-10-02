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

/** Pasarela activa: { id, n } o null si no hay ninguna conectada. */
export function pasarelaActiva() {
  let id = "izipay";
  try { const v = localStorage.getItem(PASARELA_KEY); if (v !== null) id = JSON.parse(v); } catch (e) { /* sin almacenamiento */ }
  return PASARELAS.find((p) => p.id === id) || null;
}
export function setPasarelaActiva(id) {
  try { localStorage.setItem(PASARELA_KEY, JSON.stringify(id || "")); } catch (e) { /* sin almacenamiento */ }
}

// Facturación electrónica: el proveedor (OSE/PSE) se configura en Caja › Comprobantes.
export const SUNAT_CFG_KEY = "dc_data_v1_sunat_cfg";
export function proveedorSunat() {
  try { return (JSON.parse(localStorage.getItem(SUNAT_CFG_KEY) || "{}") || {}).proveedor || ""; } catch (e) { return ""; }
}
