/* Reglas de agenda (sillones, horario de doctores y bloqueos) listas para usar.
   Sin sesión salen de los datos de la demostración; con sesión, del servidor. */
import { useContext, useEffect, useState } from "react";
import api, { auth } from "../api/client";
import { DatosDemoCtx, ESPECIALIDADES, MEDICOS } from "../comun";
import { DISP_DEMO, SILLONES_DEMO, normSillon } from "./sillones";

export function useReglasAgenda() {
  const demoDb = useContext(DatosDemoCtx);
  const conectado = !!auth.token;
  const [remoto, setRemoto] = useState({ sillones: [], disp: [], medicos: [], especialidades: [], bloqueos: [], asignaciones: [], listo: false });
  useEffect(() => {
    if (!conectado) return;
    const q = (p) => p.catch(() => []);
    Promise.all([q(api.sillones.listar()), q(api.disponibilidad.listar()), q(api.catalogo.medicos()), q(api.catalogo.especialidades()), q(api.bloqueos.listar()), q(api.sillones.asignaciones())])
      .then(([s, d, m, e, b, a]) => setRemoto({
        asignaciones: (a || []).map((x) => ({ ...x, sede: x.sedeId ?? x.sede })),
        sillones: (s || []).map(normSillon).filter((x) => x.numero > 0),
        disp: (d || []).map((x) => ({ ...x, sede: x.sedeId ?? x.sede ?? null })),
        medicos: m || [], especialidades: e || [], bloqueos: b || [], listo: true,
      }));
  }, [conectado]);
  if (conectado) return remoto;
  return {
    sillones: (demoDb?.sillones || SILLONES_DEMO).map(normSillon),
    disp: demoDb?.dispMedicos || DISP_DEMO,
    medicos: MEDICOS, especialidades: ESPECIALIDADES,
    bloqueos: demoDb?.bloqueos || [],
    asignaciones: demoDb?.asignaciones || [],
    setAsignaciones: demoDb?.setAsignaciones,
    citas: demoDb?.citas || [],
    listo: true,
  };
}
