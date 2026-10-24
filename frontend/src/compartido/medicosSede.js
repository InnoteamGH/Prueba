/* Metas, comisiones y producción de cada odontólogo POR SEDE.
   Un doctor que atiende en dos sedes tiene una meta (y un %) en cada una: la meta de la
   sede es la suma de las de sus doctores y el avance se mide con lo que produjo ahí.
   m.metasSede = { [sedeId]: { meta, comision } }. Sin dato propio, la meta del doctor
   se reparte entre sus sedes (la principal lleva el 60 %) y el % es el de su ficha. */

export const sedesMed = (m) => (Array.isArray(m?.sedes) && m.sedes.length ? m.sedes : m?.sede != null ? [m.sede] : []).map(Number);

/** Parte de la actividad del doctor que ocurre en esa sede (0 a 1). */
export function parteSede(m, sedeId) {
  const ss = sedesMed(m), id = Number(sedeId);
  if (!ss.includes(id)) return 0;
  if (ss.length === 1) return 1;
  const principal = Number(m.sede ?? ss[0]);
  return id === principal ? 0.6 : 0.4 / (ss.length - 1);
}

/** Meta mensual del doctor en una sede (null = sin meta). */
export function metaSede(m, sedeId) {
  const v = m?.metasSede?.[sedeId];
  if (v && v.meta !== undefined) return v.meta == null ? null : Number(v.meta);
  return m?.meta != null ? Math.round((Number(m.meta) * parteSede(m, sedeId)) / 100) * 100 : null;
}

/** % de comisión del doctor en una sede. */
export function comisionSede(m, sedeId) {
  const v = m?.metasSede?.[sedeId];
  if (v && v.comision !== undefined) return v.comision == null ? null : Number(v.comision);
  return m?.comision ?? null;
}

/** Todo el doctor sumado en las sedes que se ven (ids; null = todas las suyas). */
export function medicoEnSedes(m, ids = null) {
  const ver = ids ? ids.map(Number) : null;
  const ss = sedesMed(m).filter((s) => !ver || ver.includes(s));
  let meta = 0, prod = 0, citas = 0, comision = 0, conMeta = false;
  ss.forEach((s) => {
    const p = parteSede(m, s);
    const mt = metaSede(m, s);
    if (mt != null) { conMeta = true; meta += mt; }
    const pr = Math.round((Number(m.prodDemo) || 0) * p);
    prod += pr;
    citas += Math.round((Number(m.citasDemo) || 0) * p);
    comision += Math.round((pr * (Number(comisionSede(m, s)) || 0)) / 100);
  });
  const pct = prod ? Math.round((comision / prod) * 1000) / 10 : (ss.length ? comisionSede(m, ss[0]) : null);
  return { sedes: ss, meta: conMeta ? meta : null, prod, citas, comision, pct };
}

/** Guarda la meta y el % de un doctor en una sede (demo: en el navegador). */
export function guardarMetaSedeDemo(m, sedeId, meta, comision) {
  m.metasSede = { ...(m.metasSede || {}), [sedeId]: { meta, comision } };
  // La meta total del doctor sigue siendo la suma de sus sedes (la leen pantallas antiguas).
  const tot = sedesMed(m).reduce((a, s) => a + (Number(metaSede(m, s)) || 0), 0);
  m.meta = tot || null;
  try {
    const o = JSON.parse(localStorage.getItem("dc_data_v1_medicos_cfg") || "{}");
    o[m.id] = { ...(o[m.id] || {}), metasSede: m.metasSede, meta: m.meta };
    localStorage.setItem("dc_data_v1_medicos_cfg", JSON.stringify(o));
  } catch (e) { /* sin almacenamiento */ }
}
