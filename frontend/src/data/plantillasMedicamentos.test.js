/**
 * Tests unitarios para plantillas de medicamentos
 * 
 * Para ejecutar: node frontend/src/data/plantillasMedicamentos.test.js
 */

import { PLANTILLAS_MEDICAMENTOS, obtenerDosisPorEdad } from './plantillasMedicamentos.js';

// Función helper simple para tests
function assertEquals(actual, esperado, mensaje) {
  if (actual !== esperado) {
    console.error(`❌ FALLÓ: ${mensaje}`);
    console.error(`   Esperado: ${esperado}`);
    console.error(`   Actual: ${actual}`);
    process.exit(1);
  }
  console.log(`✅ PASÓ: ${mensaje}`);
}

function assertIncludes(texto, substring, mensaje) {
  if (!String(texto).includes(substring)) {
    console.error(`❌ FALLÓ: ${mensaje}`);
    console.error(`   "${texto}" no contiene "${substring}"`);
    process.exit(1);
  }
  console.log(`✅ PASÓ: ${mensaje}`);
}

console.log('\n=== Tests: PLANTILLAS_MEDICAMENTOS ===\n');

// Test 1: Verifica que hay 5 medicamentos
assertEquals(PLANTILLAS_MEDICAMENTOS.length, 5, 'PLANTILLAS_MEDICAMENTOS contiene 5 medicamentos');

// Test 2: Verifica que están los 5 medicamentos esperados
const nombres = PLANTILLAS_MEDICAMENTOS.map(m => m.nombre);
assertEquals(nombres.includes('Amoxicilina'), true, 'Contiene Amoxicilina');
assertEquals(nombres.includes('Ibuprofeno'), true, 'Contiene Ibuprofeno');
assertEquals(nombres.includes('Paracetamol'), true, 'Contiene Paracetamol');
assertEquals(nombres.includes('Azitromicina'), true, 'Contiene Azitromicina');
assertEquals(nombres.includes('Cefalexina'), true, 'Contiene Cefalexina');

console.log('\n=== Tests: obtenerDosisPorEdad() - Adulto ===\n');

// Test 3: Amoxicilina adulto
const amoxiAdulto = obtenerDosisPorEdad(PLANTILLAS_MEDICAMENTOS[0], 'adulto');
assertEquals(amoxiAdulto.medicamento, 'Amoxicilina', 'Amoxicilina adulto - nombre correcto');
assertEquals(amoxiAdulto.presentacion, '500 mg', 'Amoxicilina adulto - presentación 500mg');
assertIncludes(amoxiAdulto.dosis, '500', 'Amoxicilina adulto - dosis contiene 500');

// Test 4: Ibuprofeno adulto
const ibuAdulto = obtenerDosisPorEdad(PLANTILLAS_MEDICAMENTOS[1], 'adulto');
assertEquals(ibuAdulto.presentacion, '400 mg', 'Ibuprofeno adulto - presentación 400mg');

console.log('\n=== Tests: obtenerDosisPorEdad() - Niño ===\n');

// Test 5: Amoxicilina niño
const amoxiNino = obtenerDosisPorEdad(PLANTILLAS_MEDICAMENTOS[0], 'nino');
assertEquals(amoxiNino.medicamento, 'Amoxicilina', 'Amoxicilina niño - nombre correcto');
assertEquals(amoxiNino.presentacion, '250 mg', 'Amoxicilina niño - presentación 250mg');
assertIncludes(amoxiNino.dosis, '250', 'Amoxicilina niño - dosis contiene 250');

// Test 6: Ibuprofeno niño
const ibuNino = obtenerDosisPorEdad(PLANTILLAS_MEDICAMENTOS[1], 'nino');
assertEquals(ibuNino.presentacion, '200 mg', 'Ibuprofeno niño - presentación 200mg');

console.log('\n=== Tests: obtenerDosisPorEdad() - Bebé ===\n');

// Test 7: Amoxicilina bebé
const amoxiBebe = obtenerDosisPorEdad(PLANTILLAS_MEDICAMENTOS[0], 'bebe');
assertEquals(amoxiBebe.medicamento, 'Amoxicilina', 'Amoxicilina bebé - nombre correcto');
assertEquals(amoxiBebe.presentacion, 'suspensión', 'Amoxicilina bebé - presentación suspensión');
assertIncludes(amoxiBebe.dosis, 'mg/kg', 'Amoxicilina bebé - dosis contiene mg/kg');

// Test 8: Ibuprofeno bebé
const ibuBebe = obtenerDosisPorEdad(PLANTILLAS_MEDICAMENTOS[1], 'bebe');
assertEquals(ibuBebe.presentacion, 'suspensión', 'Ibuprofeno bebé - presentación suspensión');
assertIncludes(ibuBebe.dosis, 'mg/kg', 'Ibuprofeno bebé - dosis contiene mg/kg');

console.log('\n=== Tests: obtenerDosisPorEdad() - Paracetamol ===\n');

// Test 9: Paracetamol en todos los rangos
const paracetamol = PLANTILLAS_MEDICAMENTOS.find(m => m.nombre === 'Paracetamol');
const paraAdulto = obtenerDosisPorEdad(paracetamol, 'adulto');
const paraNino = obtenerDosisPorEdad(paracetamol, 'nino');
const paraBebe = obtenerDosisPorEdad(paracetamol, 'bebe');

assertEquals(paraAdulto.presentacion, '500 mg', 'Paracetamol adulto - presentación 500mg');
assertEquals(paraNino.presentacion, '250 mg', 'Paracetamol niño - presentación 250mg');
assertEquals(paraBebe.presentacion, 'suspensión', 'Paracetamol bebé - presentación suspensión');

console.log('\n=== Tests: obtenerDosisPorEdad() - Azitromicina ===\n');

// Test 10: Azitromicina
const azitromicina = PLANTILLAS_MEDICAMENTOS.find(m => m.nombre === 'Azitromicina');
const aziAdulto = obtenerDosisPorEdad(azitromicina, 'adulto');
const aziNino = obtenerDosisPorEdad(azitromicina, 'nino');

assertEquals(aziAdulto.frecuencia, 'c/24 h', 'Azitromicina adulto - frecuencia c/24h');
assertEquals(aziNino.frecuencia, 'c/24 h', 'Azitromicina niño - frecuencia c/24h');
assertEquals(aziAdulto.duracion, '3 días', 'Azitromicina adulto - duración 3 días');

console.log('\n=== Tests: obtenerDosisPorEdad() - Cefalexina ===\n');

// Test 11: Cefalexina
const cefalexina = PLANTILLAS_MEDICAMENTOS.find(m => m.nombre === 'Cefalexina');
const cefaAdulto = obtenerDosisPorEdad(cefalexina, 'adulto');
const cefaBebe = obtenerDosisPorEdad(cefalexina, 'bebe');

assertEquals(cefaAdulto.presentacion, '500 mg', 'Cefalexina adulto - presentación 500mg');
assertEquals(cefaBebe.presentacion, 'suspensión', 'Cefalexina bebé - presentación suspensión');
assertIncludes(cefaBebe.dosis, 'mg/kg', 'Cefalexina bebé - dosis contiene mg/kg');

console.log('\n✅ Todos los tests pasaron correctamente\n');
