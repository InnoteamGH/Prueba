/* Catálogo de servicios y médicos del servidor (con sesión).
 *
 * Con sesión nada sale de las semillas de demostración: el catálogo (nombre, código,
 * precio base, precio por sede y hallazgos del odontograma que proponen el servicio) es
 * el de GET /especialidades, y el profesional que firma con su COP es el de GET /medicos.
 * Una sola petición por pantalla: la respuesta se comparte unos segundos entre módulos
 * (Odontograma, Periodontograma, Plan de inversión) y se descarta al cambiar de token.
 * Sin sesión los hooks devuelven null y cada módulo sigue con sus datos de ejemplo. */
import { useEffect, useState } from "react";
import api, { auth } from "../api/client";

const VIDA_MS = 30000;
const cache = { esp: null, med: null };

function pedir(clave, fn) {
  const tok = auth.token;
  const c = cache[clave];
  if (c && c.tok === tok && Date.now() - c.t < VIDA_MS) return c.p;
  const p = fn().then((r) => (Array.isArray(r) ? r : []));
  cache[clave] = { tok, t: Date.now(), p };
  // Un fallo no se queda guardado: el siguiente módulo vuelve a intentarlo.
  p.catch(() => { if (cache[clave]?.p === p) cache[clave] = null; });
  return p;
}

/** Especialidad del servidor → servicio con la forma del catálogo del frontend. */
export function servicioDeApi(e) {
  return {
    id: e.id,
    codigo: e.codigo || "",
    nombre: e.nombre || "",
    precio: Number(e.precioBase ?? e.precio) || 0,
    preciosSede: e.preciosSede || {},
    hallazgos: Array.isArray(e.hallazgos) ? e.hallazgos : [],
    duracionMin: e.duracionMin ?? null,
    activo: e.activo !== false,
  };
}

/** Lista del catálogo del servidor (promesa). */
export const catalogoApi = () => pedir("esp", () => api.catalogo.especialidades()).then((r) => r.map(servicioDeApi));
/** Médicos del servidor (promesa). */
export const medicosApi = () => pedir("med", () => api.catalogo.medicos());

/** Con sesión: null mientras carga, luego el catálogo (vacío si falla). Sin sesión: null. */
export function useCatalogoApi() {
  const [cat, setCat] = useState(null);
  useEffect(() => {
    if (!auth.token) return undefined;
    let vivo = true;
    catalogoApi().then((r) => { if (vivo) setCat(r); }).catch(() => { if (vivo) setCat([]); });
    return () => { vivo = false; };
  }, []);
  return cat;
}

/** Con sesión: null mientras carga, luego los médicos (vacío si falla). Sin sesión: null. */
export function useMedicosApi() {
  const [meds, setMeds] = useState(null);
  useEffect(() => {
    if (!auth.token) return undefined;
    let vivo = true;
    medicosApi().then((r) => { if (vivo) setMeds(r); }).catch(() => { if (vivo) setMeds([]); });
    return () => { vivo = false; };
  }, []);
  return meds;
}

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Servicio del catálogo por código (exacto) o, si no, por nombre (sin tildes ni mayúsculas). */
export function servicioPorCodigoONombre(cat, codigo, nombre) {
  const activos = (cat || []).filter((s) => s && s.activo !== false);
  if (codigo) {
    const c = activos.find((s) => s.codigo && norm(s.codigo) === norm(codigo));
    if (c) return c;
  }
  if (nombre) return activos.find((s) => norm(s.nombre) === norm(nombre)) || null;
  return null;
}

/* Hallazgos del dibujo anatómico → hallazgo con el que el catálogo propone el servicio
   (el mismo cruce que usa el Odontograma al pasar los hallazgos al presupuesto). */
export const HALLAZGO_IFRAME = { coronaT: "corona", extraccion: "extraer", rr: "extraer", fractR: "extraer", absceso: "endodoncia", periapic: "endodoncia" };
const IDS_DIBUJO = ["caries", "dde", "fractura", "fractR", "rr", "extraccion", "coronaT", "absceso", "periapic", "endodoncia", "reabs", "ausente", "movilidad"];

/** Tarifa para el dibujo anatómico armada con el catálogo de la clínica: por cada hallazgo,
    el primer servicio que lo propone y los demás como alternativas, al precio de la sede.
    Un hallazgo sin servicio no lleva entrada: el dibujo lo avisa como «sin tratamiento». */
export function tarifaDibujoDesdeCatalogo(cat, precioDe) {
  const activos = (cat || []).filter((s) => s && s.activo !== false && (s.hallazgos || []).length);
  const ids = new Set([...IDS_DIBUJO, ...activos.flatMap((s) => s.hallazgos)]);
  const out = {};
  ids.forEach((id) => {
    const claves = [id, HALLAZGO_IFRAME[id]].filter(Boolean);
    const servs = activos.filter((s) => s.hallazgos.some((h) => claves.includes(h)));
    if (!servs.length) return;
    const linea = (s) => ({ cod: s.codigo || String(s.id), t: s.nombre, v: precioDe(s) });
    out[id] = { ...linea(servs[0]), alt: servs.slice(1).map(linea) };
  });
  return out;
}

/** Médico del servidor por id o por nombre exacto (sin tildes ni mayúsculas). */
export function medicoEn(meds, { id = null, nombre = "" } = {}) {
  const l = meds || [];
  return (id != null && l.find((m) => String(m.id) === String(id))) || (nombre && l.find((m) => norm(m.nombre) === norm(nombre))) || null;
}
