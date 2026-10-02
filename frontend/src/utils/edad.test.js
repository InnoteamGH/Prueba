/**
 * Tests unitarios para funciones de edad
 * 
 * Para ejecutar: node frontend/src/utils/edad.test.js
 */

import { calcEdad, clasificarPorEdad } from './edad.js';

// Función helper simple para tests
function assert(condicion, mensaje) {
  if (!condicion) {
    console.error('❌ FALLÓ:', mensaje);
    process.exit(1);
  }
  console.log('✅ PASÓ:', mensaje);
}

function assertEquals(actual, esperado, mensaje) {
  if (actual !== esperado) {
    console.error(`❌ FALLÓ: ${mensaje}`);
    console.error(`   Esperado: ${esperado}`);
    console.error(`   Actual: ${actual}`);
    process.exit(1);
  }
  console.log(`✅ PASÓ: ${mensaje}`);
}

// Tests para calcEdad
console.log('\n=== Tests: calcEdad() ===\n');

// Test 1: Adulto (32 años)
const fechaAdulto = '1994-01-15';
const edadAdulto = calcEdad(fechaAdulto);
assertEquals(edadAdulto, 32, 'Calcula correctamente edad adulto (32 años)');

// Test 2: Niño (10 años)
const fechaNino = '2016-06-20';
const edadNino = calcEdad(fechaNino);
assertEquals(edadNino, 10, 'Calcula correctamente edad niño (10 años)');

// Test 3: Bebé (3 años)
const fechaBebe = '2023-03-10';
const edadBebe = calcEdad(fechaBebe);
assertEquals(edadBebe, 3, 'Calcula correctamente edad bebé (3 años)');

// Test 4: null cuando fechaNacimiento es null
const edadNull = calcEdad(null);
assertEquals(edadNull, null, 'Retorna null cuando fechaNacimiento es null');

// Test 5: null cuando fechaNacimiento es undefined
const edadUndef = calcEdad(undefined);
assertEquals(edadUndef, null, 'Retorna null cuando fechaNacimiento es undefined');

// Test 6: null cuando fecha es inválida
const edadInvalida = calcEdad('fecha-invalida');
assertEquals(edadInvalida, null, 'Retorna null cuando fecha es inválida');

// Tests para clasificarPorEdad
console.log('\n=== Tests: clasificarPorEdad() ===\n');

// Test 7: Adulto (≥18)
assertEquals(clasificarPorEdad(32), 'adulto', 'Clasifica adulto correctamente (32 años)');
assertEquals(clasificarPorEdad(18), 'adulto', 'Clasifica adulto correctamente (18 años - umbral)');

// Test 8: Niño (6-17)
assertEquals(clasificarPorEdad(10), 'nino', 'Clasifica niño correctamente (10 años)');
assertEquals(clasificarPorEdad(6), 'nino', 'Clasifica niño correctamente (6 años - umbral inferior)');
assertEquals(clasificarPorEdad(17), 'nino', 'Clasifica niño correctamente (17 años - umbral superior)');

// Test 9: Bebé (<6)
assertEquals(clasificarPorEdad(3), 'bebe', 'Clasifica bebé correctamente (3 años)');
assertEquals(clasificarPorEdad(5), 'bebe', 'Clasifica bebé correctamente (5 años)');
assertEquals(clasificarPorEdad(0), 'bebe', 'Clasifica bebé correctamente (0 años)');

// Test 10: Desconocido cuando edad es null
assertEquals(clasificarPorEdad(null), 'desconocido', 'Retorna "desconocido" cuando edad es null');
assertEquals(clasificarPorEdad(undefined), 'desconocido', 'Retorna "desconocido" cuando edad es undefined');

console.log('\n✅ Todos los tests pasaron correctamente\n');
