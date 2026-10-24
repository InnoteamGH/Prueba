/* R5-12: la sede elegida en el selector del menú lateral se guarda por usuario, para que al
   recargar la página no vuelva a «Todas las sedes». Se guarda el UUID de la sede (o "all") y,
   al leerla, se comprueba que siga siendo una de las sedes del usuario: si ya no lo es, no se
   usa. Con el almacenamiento bloqueado (modo privado, sin espacio) simplemente no se guarda.
   Sin React: lo usan App.jsx y node --test. */

const PREFIJO = "dc_sede_elegida_";

/** Clave del navegador para este usuario (null si no se sabe quién es). */
export const claveSedeElegida = (idUsuario) => (idUsuario ? `${PREFIJO}${idUsuario}` : null);

export function leerSedeElegida(idUsuario) {
  const k = claveSedeElegida(idUsuario);
  if (!k) return null;
  try { return localStorage.getItem(k); } catch { return null; }
}

export function guardarSedeElegida(idUsuario, valor) {
  const k = claveSedeElegida(idUsuario);
  if (!k) return;
  try {
    if (valor == null || valor === "") localStorage.removeItem(k);
    else localStorage.setItem(k, String(valor));
  } catch { /* sin almacenamiento: la sede vuelve a la de siempre al recargar */ }
}

/** La sede guardada, si sigue siendo válida: "all" o el elemento de `mias` que corresponde
    (con su tipo: número corto del registro o UUID). `aUuid` traduce un id corto a su UUID.
    Devuelve null si no hay nada guardado o si esa sede ya no es del usuario. */
export function resolverSedeGuardada(guardada, mias, aUuid = (x) => x) {
  if (guardada == null || guardada === "") return null;
  if (guardada === "all") return "all";
  const g = String(guardada).toLowerCase();
  const hit = (mias || []).find((m) => {
    if (m == null) return false;
    if (String(m).toLowerCase() === g) return true;
    const u = aUuid(m);
    return u != null && String(u).toLowerCase() === g;
  });
  return hit ?? null;
}
