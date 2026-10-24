/* Revisión 12: el servidor marca `debeCambiarClave` al entrar con una clave temporal. Reglas
   de la clave nueva (las mismas que se piden al crear la cuenta): 8 caracteres o más, con
   letras y números, distinta de la temporal y repetida igual. Devuelve el error o "". */
export function validarClaveNueva(nueva, repetir, actual = "") {
  const n = String(nueva || "");
  if (n.length < 8) return "La clave nueva debe tener al menos 8 caracteres.";
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(n) || !/\d/.test(n)) return "La clave nueva debe tener letras y números.";
  if (actual && n === actual) return "La clave nueva no puede ser igual a la temporal.";
  if (n !== String(repetir || "")) return "Las dos claves no coinciden.";
  return "";
}

/** El servidor aún no tiene la ruta para cambiar la clave (404/405): se deja entrar igual. */
export const sinRutaCambioClave = (status) => status === 404 || status === 405;
