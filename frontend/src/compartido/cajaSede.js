/* Sede de los registros de dinero y del plan: pagos, ítems del tratamiento, egresos,
   links de pago y jornadas de caja. Cada registro nuevo guarda `sede`; los datos viejos
   sin sede se atribuyen a la sede principal del paciente (la primera de sus sedes), así
   un paciente de dos sedes no arrastra a una sede lo cobrado en la otra.
   Lo usan Caja, Plan y cuenta, Tickets, Reportes y el Plan de inversión. */
import { auth } from "../api/client";
import { sedeApiUuid } from "../routing";
import { EGRESOS_DEMO, SEDES, mismaSede, nombreSede, sedeNum, sedesDe } from "../comun";
import { precioServicio } from "./catalogo";

/** Sede principal del paciente (la primera de su lista); null si no tiene. */
export const sedePrincipal = (pac) => sedesDe(pac || {})[0] ?? null;

/** Sede de un pago o ítem: la suya o, si es un dato viejo sin sede, la principal del paciente. */
export const sedeDeRegistro = (x, pac) => x?.sede ?? x?.sedeId ?? sedePrincipal(pac);

/** Sede de un egreso. Los de ejemplo guardados antes de que llevaran sede la toman de la
    semilla; otro egreso viejo de la demostración queda en la primera sede de la clínica. Con
    sesión, sin sedeId no se adivina (lo filtra el servidor). */
export const sedeDeEgreso = (e) => {
  if (!e) return null;
  const s = e.sede ?? e.sedeId;
  if (s != null && s !== "") return s;
  if (auth.token) return null;
  return EGRESOS_DEMO.find((x) => x.id === e.id)?.sede ?? SEDES[0]?.id ?? null;
};

/** La ficha recortada a lo que pertenece a las sedes que se ven (`ver(sede)` → sí/no). */
export function fichaDeSede(ficha, pac, ver) {
  if (!ficha || !ver) return ficha;
  const de = (x) => ver(sedeDeRegistro(x, pac));
  return { ...ficha, tratamiento: (ficha.tratamiento || []).filter(de), pagos: (ficha.pagos || []).filter(de) };
}

/** ¿La sede `x` está entre `lista`? Lista null = sin límite; sede vacía = se ve. */
export const sedeEnLista = (x, lista) => !lista || x == null || x === "" || lista.some((v) => mismaSede(x, v));

/** UUID real de la sede en el servidor (lista de /sedes), sin caer nunca en «la primera». */
export function uuidSede(sedes, n) {
  if (n == null || n === "" || n === "all") return null;
  const s = String(n);
  const hit = (sedes || []).find((x) => String(x.id) === s)
    || (sedes || []).find((x) => String(x.id) === String(sedeApiUuid(n)))
    || (sedes || []).find((x) => mismaSede(x.id, n));
  return hit?.id || sedeApiUuid(n);
}

/** Nombre de la sede con la lista del servidor si la hay; si no, el catálogo local. */
export function nombreSedeEn(sedes, n) {
  if (n == null || n === "" || n === "all") return "";
  const hit = (sedes || []).find((x) => String(x.id) === String(n)) || (sedes || []).find((x) => mismaSede(x.id, n));
  const nom = hit?.nombre || nombreSede(n);
  return nom && nom !== "—" ? nom : nombreSede(sedeNum(n));
}

/** Precio del servicio en la sede: preciosSede puede venir con la clave de la demo (1/2) o
    con el UUID del servidor. Sin precio propio, el precio base. */
export function precioEnSede(serv, sede) {
  if (!serv) return 0;
  const ps = serv.preciosSede || {};
  const clave = sede == null || sede === "all" ? null
    : [sede, sedeApiUuid(sede), sedeNum(sede)].find((k) => k != null && ps[k] != null && ps[k] !== "");
  return precioServicio(serv, clave ?? sede);
}
