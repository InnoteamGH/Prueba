/* Cruce de seguridad receta ↔ alergias del paciente (directo y por familia de fármacos).
   Lo usan la receta de la ficha y el módulo Recetas: una sola regla en los dos lados. */
export const ALERGIA_FAMILIA = [
  // Penicilinas ↔ cefalosporinas en el mismo grupo de cruce.
  ["penicilina", "amoxicilina", "ampicilina", "amoxi", "ampi", "penicil", "cefalosporina", "cefalexina", "cefadroxilo", "cefuroxima", "cefazolina"],
  // AINE, con metamizol/dipirona (uso frecuente en Perú).
  ["aine", "aines", "ibuprofeno", "naproxeno", "aspirina", "aspir", "ketorolaco", "diclofenaco", "ketoprofeno", "metamizol", "dipirona"],
  ["sulfa", "sulfas", "sulfametoxazol", "cotrimoxazol"],
];
export const MIN_ALERGIA_MATCH = 4;

/** alergias: lista de textos; meds: lista de nombres de medicamento. Devuelve los avisos. */
export function cruceAlergias(alergias, meds) {
  const als = (alergias || []).map((a) => String(a).toLowerCase().trim()).filter(Boolean);
  if (!als.length) return [];
  const msgs = new Set();
  (meds || []).forEach((m0) => {
    const med = String(m0 || "").toLowerCase();
    if (!med) return;
    als.forEach((al) => {
      // Subcadena solo con longitud mínima en los dos lados (evita alertas por todo).
      if (al.length >= MIN_ALERGIA_MATCH && med.length >= MIN_ALERGIA_MATCH && (med.includes(al) || al.includes(med))) msgs.add(`${m0} ↔ alergia a "${al}"`);
      ALERGIA_FAMILIA.forEach((fam) => { if (fam.some((f) => al.includes(f)) && fam.some((f) => med.includes(f))) msgs.add(`${m0} ↔ alergia a "${al}"`); });
    });
  });
  return [...msgs];
}
