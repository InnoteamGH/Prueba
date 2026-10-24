/* Lo pagado por un paciente para los documentos del plan (M7-02), sin pedir GET /pagos, que es
   de Caja y al médico le da 403 (M5-05). Primero el resumen financiero (el mismo dato de la
   cabecera de la ficha y de Plan y cuenta, R-10); si el paciente no sale ahí, el resumen de su
   ficha. null si no se puede saber: el documento no inventa «Pagado S/ 0». */
import api from "../api/client";
import { pagadoConocido, pagadoEnResumen } from "../util/planInversionCuenta";

export async function leerPagadoPaciente(pacienteId) {
  if (!pacienteId) return null;
  const delResumen = await api.pacientes.resumenFinanciero(null).then((filas) => pagadoEnResumen(filas, pacienteId)).catch(() => null);
  if (delResumen != null) return delResumen;
  return api.pacientes.ficha360(pacienteId).then((f) => pagadoConocido(f?.resumen?.invertido)).catch(() => null);
}
