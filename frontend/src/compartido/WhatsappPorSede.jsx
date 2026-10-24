/* WhatsApp por sede en Integraciones: una fila por sede con su número y su estado.
   El estado sale de GET /whatsapp/salud: si trae `porSede` se usa; si no, se prueba una vez
   GET /whatsapp/salud?sedeId= y, si la respuesta dice de qué sede es, se pide para el resto.
   Si el servidor solo informa un número, se muestra como «compartido por todas las sedes» y
   las sedes sin `whatsappNumero` se marcan «Sin número propio» (compartido/whatsappSede.js). */
import React, { useEffect, useState } from "react";
import { Building2, MessageCircle } from "lucide-react";
import api, { auth } from "../api/client";
import { Card, mismaSede, useSede } from "../comun";
import { useSedesWhatsapp } from "./useSedesWhatsapp";
import { filasWhatsappSedes, formatearWhatsappPe, porSedeDeSalud } from "./whatsappSede";

const CLS = { operativo: "is-ok", incidencia: "is-warn" };
const mismoUuid = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

export default function WhatsappPorSede({ salud }) {
  const conectado = !!auth.token;
  const sedes = useSedesWhatsapp();
  const { enSede } = useSede();
  const [porSedeQ, setPorSedeQ] = useState(null);   // respuestas de ?sedeId= (si el servidor lo acepta)
  const clave = (sedes || []).map((s) => s.id).join(",");
  useEffect(() => {
    if (!conectado || !salud || salud.error || porSedeDeSalud(salud) || !sedes || !sedes.length) return undefined;
    let vivo = true;
    const [primera, ...resto] = sedes;
    // Un servidor que ignora ?sedeId= devuelve la salud general (sin sedeId): no se insiste.
    api.agente.salud(primera.id).then((r) => {
      if (!vivo || !r || !mismoUuid(r.sedeId, primera.id)) return null;
      return Promise.all(resto.map((s) => api.agente.salud(s.id).then((x) => (x && mismoUuid(x.sedeId, s.id) ? x : null)).catch(() => null)))
        .then((xs) => { if (vivo) setPorSedeQ([r, ...xs.filter(Boolean)]); });
    }).catch(() => {});
    return () => { vivo = false; };
  }, [conectado, salud, clave]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = (sedes || []).filter((s) => enSede(s.id));
  const { modo, compartido, filas } = filasWhatsappSedes({ sedes: visibles, salud, porSede: porSedeQ, igual: mismaSede });
  // Si todas las sedes ya tienen su número, el de la salud general no es «compartido»: es el
  // único del que el servidor informa el estado.
  const todasPropias = filas.length > 0 && filas.every((f) => f.propio);
  return (
    <Card className="dc-wasd">
      {/* En la demostración no hay número general: solo las filas de cada sede. */}
      {modo === "compartido" && compartido && (conectado || compartido.numero) && (
        <div className="dc-wasd__comp">
          <MessageCircle size={17} strokeWidth={2} />
          <div><b>{compartido.numero ? formatearWhatsappPe(compartido.numero) : "Número de WhatsApp de la clínica"}</b><small>{todasPropias ? "El servidor aún informa el estado de un solo número." : "Número actual, compartido por todas las sedes."} {compartido.detalle}</small></div>
          <span className={`dc-int__est ${CLS[compartido.estado] || ""}`}><i />{compartido.etiqueta}</span>
        </div>
      )}
      {sedes === null && <p className="dc-cfg__nada">Cargando sedes…</p>}
      {sedes !== null && filas.length === 0 && <p className="dc-cfg__nada">Sin sedes registradas.</p>}
      {filas.map((f) => (
        <div key={String(f.sedeId)} className="dc-wasd__fila">
          <span className="dc-wasd__ico"><Building2 size={15} strokeWidth={2} /></span>
          <div className="dc-wasd__txt"><b>{f.nombre}</b><small>{f.estado.detalle}</small></div>
          <span className={`dc-wasd__num${f.propio ? "" : " is-comp"}`}>{f.propio ? formatearWhatsappPe(f.numero) : f.numero && modo === "compartido" ? `${formatearWhatsappPe(f.numero)} · compartido` : "—"}</span>
          <span className={`dc-int__est ${f.sinNumero ? "is-warn" : CLS[f.estado.estado] || ""}`}><i />{f.estado.etiqueta}</span>
        </div>
      ))}
    </Card>
  );
}
