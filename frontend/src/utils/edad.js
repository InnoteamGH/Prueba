/**
 * Calcula la edad en años a partir de una fecha de nacimiento en formato ISO.
 * 
 * @param {string} fechaNacimiento - Fecha en formato ISO (YYYY-MM-DD)
 * @returns {number|null} Edad en años, o null si la fecha es inválida
 */
export function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(nacimiento)) return null;
  
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesActual = hoy.getMonth();
  const mesNacimiento = nacimiento.getMonth();
  
  // Ajustar si aún no ha cumplido años este año
  if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  // Validar rango razonable (0-120 años)
  return edad >= 0 && edad < 120 ? edad : null;
}

/**
 * Clasifica la edad en rangos pediátricos según los umbrales médicos.
 * 
 * @param {number|null} edad - Edad en años
 * @returns {string} "adulto" (≥18), "nino" (6-17), "bebe" (<6), o "desconocido" si edad es null
 */
export function clasificarPorEdad(edad) {
  if (edad === null || edad === undefined) return "desconocido";
  if (edad >= 18) return "adulto";
  if (edad >= 6) return "nino";
  return "bebe";
}
