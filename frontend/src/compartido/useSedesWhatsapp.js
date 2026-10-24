/* Sedes con su número de WhatsApp (WhatsApp por sede), para Integraciones, el inicio de TI,
   WhatsApp y Recordatorios. Con sesión, GET /sedes (trae `whatsappNumero` cuando el servidor
   lo guarde); sin sesión, las sedes de la demostración con lo editado en Configuración ›
   Sedes, guardado en este navegador (util/membrete.js). */
import { useEffect, useState } from "react";
import api, { auth } from "../api/client";
import { SEDES } from "../comun";
import { sedeDemo } from "../util/membrete";

export const sedesDemoWhatsapp = () => SEDES.map((s) => {
  const d = sedeDemo(s.id);
  return { id: s.id, nombre: d.nombre || s.nombre, activa: true, whatsappNumero: d.whatsappNumero || "", whatsappPhoneNumberId: d.whatsappPhoneNumberId || "" };
});

/** null mientras carga (con sesión); [] si GET /sedes falla. `omitir`: no pedir nada. */
export function useSedesWhatsapp({ omitir = false } = {}) {
  const conectado = !!auth.token;
  const [sedes, setSedes] = useState(() => (conectado ? null : sedesDemoWhatsapp()));
  useEffect(() => {
    if (!conectado || omitir) return undefined;
    let vivo = true;
    api.sedes.listar().then((r) => { if (vivo) setSedes(Array.isArray(r) ? r : []); }).catch(() => { if (vivo) setSedes([]); });
    return () => { vivo = false; };
  }, [conectado, omitir]);
  return sedes;
}
