/* Reglas de agenda (sillones, horario de doctores y bloqueos) listas para usar.
   Sin sesión salen de los datos de la demostración; con sesión, del servidor. */
import { useContext, useEffect, useState } from "react";
import api, { auth } from "../api/client";
import { DatosDemoCtx, ESPECIALIDADES, MEDICOS, mismaSede, useSede } from "../comun";
import { sedeApiUuid } from "../routing";
import { sedesRegistradas } from "./sedesRegistro";
import { DISP_DEMO, SILLONES_DEMO, normBloqueo, normSillon } from "./sillones";

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

/* R-12: GET /medicos trae `sedes: []` para todos los doctores, así que los chips de la agenda,
   el modal de agendar y la lista de espera de cada sede ofrecían también a los doctores de la
   otra. Mientras el servidor no mande las sedes, la de cada doctor se deduce de su horario
   (el sedeId de sus bloques en GET /disponibilidad). */
const idSede = (v) => (v && typeof v === "object" ? v.id : v);
/** Sedes que trae la ficha del doctor (lista de ids u objetos, o una sola sedeId). */
export const sedesFijasMedico = (m) => [].concat(m?.sedes ?? m?.sedeIds ?? m?.sedeId ?? []).map(idSede).filter((x) => x != null && x !== "");
/** Sedes de los bloques de horario del doctor. */
export const sedesDeHorario = (m, disp) => [...new Set((disp || [])
  .filter((d) => m && String(d.medicoId) === String(m.id))
  .map((d) => d.sedeId ?? d.sede).filter((x) => x != null && x !== "").map(String))];

/** ¿Un doctor sin bloques a la vista NO atiende en las sedes del usuario? El servidor solo manda
    a cada usuario el horario de sus sedes: si es de algunas sedes (no de toda la clínica) y sí
    llegó horario, el doctor sin bloques trabaja en otra sede (p. ej. la Dra. Mendoza en Surco).
    Un doctor nuevo sin horario no se ofrece a esas sedes hasta que administración le cargue
    el horario, que es lo que dice dónde atiende. */
export const horarioDefineSede = ({ global, disp }) => !global && (disp || []).length > 0;

/** Doctores con `sedes` completadas desde su horario. Con `estricto`, el que no tiene ningún
    bloque a la vista queda marcado `fueraDeSede` (sigue en la lista para nombrarlo). */
export function conSedesDeHorario(medicos, disp, estricto = false) {
  return (medicos || []).map((m) => {
    if (!m || sedesFijasMedico(m).length) return m;
    const ded = sedesDeHorario(m, disp);
    if (ded.length) return { ...m, sedes: ded, sedesDeHorario: true };
    return estricto ? { ...m, fueraDeSede: true } : m;
  });
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
      .then(([s, d, m, e, b, a]) => {
        const disp = (d || []).map((x) => ({ ...x, sede: x.sedeId ?? x.sede ?? null }));
        setRemoto({
          asignaciones: (a || []).map((x) => ({ ...x, sede: x.sedeId ?? x.sede })),
          sillones: (s || []).map(normSillon).filter((x) => x.numero > 0),
          disp,
          medicos: conSedesDeHorario(m || [], disp, horarioDefineSede({ global: sedeCx.global, disp })),
          especialidades: e || [], bloqueos: (b || []).map(normBloqueo), listo: true,
        });
      });
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
