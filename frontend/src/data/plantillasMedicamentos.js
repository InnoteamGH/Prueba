/**
 * Plantillas de medicamentos comunes con dosis diferenciadas por rango de edad.
 * 
 * Rangos de edad:
 * - Adulto: ≥18 años
 * - Niño: 6-17 años
 * - Bebé: <6 años
 */
export const PLANTILLAS_MEDICAMENTOS = [
  {
    nombre: "Amoxicilina",
    dosisAdulto: "500 mg c/8h por 7 días",
    dosisNino: "250 mg c/8h por 7 días",
    dosisBebe: "suspensión 50 mg/kg/día dividido c/8h por 7 días",
    presentacionAdulto: "500 mg",
    presentacionNino: "250 mg",
    presentacionBebe: "suspensión",
    frecuencia: "c/8 h",
    duracion: "7 días"
  },
  {
    nombre: "Ibuprofeno",
    dosisAdulto: "400 mg c/8h por 3 días",
    dosisNino: "200 mg c/8h por 3 días",
    dosisBebe: "suspensión 10 mg/kg c/8h por 3 días",
    presentacionAdulto: "400 mg",
    presentacionNino: "200 mg",
    presentacionBebe: "suspensión",
    frecuencia: "c/8 h",
    duracion: "3 días"
  },
  {
    nombre: "Paracetamol",
    dosisAdulto: "500 mg c/8h por 3 días",
    dosisNino: "250 mg c/8h por 3 días",
    dosisBebe: "suspensión 15 mg/kg c/8h por 3 días",
    presentacionAdulto: "500 mg",
    presentacionNino: "250 mg",
    presentacionBebe: "suspensión",
    frecuencia: "c/8 h",
    duracion: "3 días"
  },
  {
    nombre: "Azitromicina",
    dosisAdulto: "500 mg c/24h por 3 días",
    dosisNino: "250 mg c/24h por 3 días",
    dosisBebe: "suspensión 10 mg/kg c/24h por 3 días",
    presentacionAdulto: "500 mg",
    presentacionNino: "250 mg",
    presentacionBebe: "suspensión",
    frecuencia: "c/24 h",
    duracion: "3 días"
  },
  {
    nombre: "Cefalexina",
    dosisAdulto: "500 mg c/8h por 7 días",
    dosisNino: "250 mg c/8h por 7 días",
    dosisBebe: "suspensión 25-50 mg/kg/día dividido c/8h por 7 días",
    presentacionAdulto: "500 mg",
    presentacionNino: "250 mg",
    presentacionBebe: "suspensión",
    frecuencia: "c/8 h",
    duracion: "7 días"
  }
];

/**
 * Obtiene la dosis correcta de un medicamento según el rango de edad.
 * 
 * @param {Object} medicamento - Objeto de plantilla de medicamento
 * @param {string} rangoEdad - "adulto", "nino", "bebe", o "desconocido"
 * @returns {Object} Objeto con medicamento, presentacion, dosis, frecuencia, duracion
 */
export function obtenerDosisPorEdad(medicamento, rangoEdad) {
  if (rangoEdad === "adulto") {
    return {
      medicamento: medicamento.nombre,
      presentacion: medicamento.presentacionAdulto,
      dosis: medicamento.dosisAdulto.split(' ')[0] + " " + medicamento.dosisAdulto.split(' ')[1],
      frecuencia: medicamento.frecuencia,
      duracion: medicamento.duracion
    };
  } else if (rangoEdad === "nino") {
    return {
      medicamento: medicamento.nombre,
      presentacion: medicamento.presentacionNino,
      dosis: medicamento.dosisNino.split(' ')[0] + " " + medicamento.dosisNino.split(' ')[1],
      frecuencia: medicamento.frecuencia,
      duracion: medicamento.duracion
    };
  } else if (rangoEdad === "bebe") {
    return {
      medicamento: medicamento.nombre,
      presentacion: medicamento.presentacionBebe,
      dosis: medicamento.dosisBebe.replace(medicamento.presentacionBebe + " ", ""),
      frecuencia: medicamento.frecuencia,
      duracion: medicamento.duracion
    };
  } else {
    // Desconocido: retornar dosis adulto como default (aunque no debería ocurrir)
    return {
      medicamento: medicamento.nombre,
      presentacion: medicamento.presentacionAdulto,
      dosis: medicamento.dosisAdulto.split(' ')[0] + " " + medicamento.dosisAdulto.split(' ')[1],
      frecuencia: medicamento.frecuencia,
      duracion: medicamento.duracion
    };
  }
}
