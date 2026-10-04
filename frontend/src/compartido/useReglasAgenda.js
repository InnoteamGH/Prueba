/* Reglas de agenda (sillones, horario de doctores y bloqueos) listas para usar.
   Sin sesión salen de los datos de la demostración; con sesión, del servidor. */
import { useContext, useEffect, useState } from "react";
import api, { auth } from "../api/client";
import { DatosDemoCtx, ESPECIALIDADES, MEDICOS, mismaSede, useSede } from "../comun";
import { sedeApiUuid } from "../routing";
import { sedesRegistradas } from "./sedesRegistro";
import { DISP_DEMO, SILLONES_DEMO, normSillon } from "./sillones";

/* GET /sillones sin sedeId devuelve los de una sola sede (la del token), no los de todas:
   se piden por cada sede del usuario y se unen. Cada lista se recorta a su sede por si el
   servidor ignorara el filtro; un sillón sin sede queda en la sede por la que se pidió. */
export function sillonesPorSede(uuids0) {
  const uuids = uuids0 && uuids0.length ? uuids0 : sedesRegistradas().map((r) => r.uuid);
  if (!uuids.length) return api.sillones.listar().catch(() => []);
  return Promise.all(uuids.map((u) => api.sillones.listar(u)
    .then((l) => (l || []).map((x) => ({ ...x, sedeId: x.sedeId ?? x.sede ?? u })).filter((x) => mismaSede(x.sedeId, u)))
    .catch(() => [])))
    .then((ls) => { const vistos = new Set(); return ls.flat().filter((x) => { const k = String(x.id ?? `${x.sedeId}-${x.numero}`); if (vistos.has(k)) return false; vistos.add(k); return true; }); });
}

export function useReglasAgenda() {
  const demoDb = useContext(DatosDemoCtx);
  const conectado = !!auth.token;
  const sedeCx = useSede();
  // Sedes del usuario (UUID); sin contexto, todas las del registro.
  const uuids = [...new Set((sedeCx.mias && sedeCx.mias.length ? sedeCx.mias : sedesRegistradas().map((r) => r.uuid)).map(sedeApiUuid).filter(Boolean))];
  const clave = uuids.join(",");
  const [remoto, setRemoto] = useState({ sillones: [], disp: [], medicos: [], especialidades: [], bloqueos: [], asignaciones: [], listo: false });
  useEffect(() => {
    if (!conectado) return;
    const q = (p) => p.catch(() => []);
    Promise.all([sillonesPorSede(uuids), q(api.disponibilidad.listar()), q(api.catalogo.medicos()), q(api.catalogo.especialidades()), q(api.bloqueos.listar()), q(api.sillones.asignaciones())])
      .then(([s, d, m, e, b, a]) => setRemoto({
        asignaciones: (a || []).map((x) => ({ ...x, sede: x.sedeId ?? x.sede })),
        sillones: (s || []).map(normSillon).filter((x) => x.numero > 0),
        disp: (d || []).map((x) => ({ ...x, sede: x.sedeId ?? x.sede ?? null })),
        medicos: m || [], especialidades: e || [], bloqueos: b || [], listo: true,
      }));
  }, [conectado, clave]); // eslint-disable-line react-hooks/exhaustive-deps
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
