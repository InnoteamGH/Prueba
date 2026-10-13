/**
 * R8-07: un solo criterio para saber qué doctores atienden en una sede (Metas, Producción y
 * comisiones, Panel y Configuración › Doctores).
 * Ejecutar: node --test src/compartido/medicoEnSede.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { atiendeEnSedes, medicosDeSedes, sedesDeHorario, sedesDondeAtiende, sedesFijasMedico } from "./medicoEnSede.js";

// Como en producción: /medicos trae `sedes: []` (H-14) y el horario dice dónde atiende cada uno.
// d1 Carla y d5 Jorge solo en San Isidro (a1); d2 Luis en las dos; d3, d4 y d6 en Surco (a2).
const disp = [
  { medicoId: "d1", sedeId: "a1", activo: true },
  { medicoId: "d5", sedeId: "a1", activo: true },
  { medicoId: "d2", sedeId: "a1" }, { medicoId: "d2", sedeId: "a2" },
  { medicoId: "d3", sedeId: "a2" }, { medicoId: "d4", sedeId: "a2" }, { medicoId: "d6", sedeId: "a2" },
  { medicoId: "d1", sedeId: "a2", activo: false },   // bloque inactivo: no cuenta
];
const medicos = ["d1", "d2", "d3", "d4", "d5", "d6"].map((id) => ({ id, sedes: [] }));

describe("medicoEnSede", () => {
  it("sedes de la ficha (ids, objetos o una sola sedeId) y del horario", () => {
    assert.deepEqual(sedesFijasMedico({ sedes: [{ id: "a1" }, "a2"] }), ["a1", "a2"]);
    assert.deepEqual(sedesFijasMedico({ sedeId: "a2" }), ["a2"]);
    assert.deepEqual(sedesFijasMedico({ sedes: [] }), []);
    assert.deepEqual(sedesDeHorario({ id: "d2" }, disp), ["a1", "a2"]);
  });
  it("sin sedes en la ficha valen las del horario activo; con ficha, las de la ficha", () => {
    assert.deepEqual(sedesDondeAtiende({ id: "d1", sedes: [] }, disp), ["a1"]);
    assert.deepEqual(sedesDondeAtiende({ id: "d1", sedes: ["a2"] }, disp), ["a2"]);
  });
  it("atiendeEnSedes: true, false o null si no se sabe", () => {
    assert.equal(atiendeEnSedes({ id: "d5", sedes: [] }, ["a2"], disp), false);   // Jorge no está en Surco
    assert.equal(atiendeEnSedes({ id: "d2", sedes: [] }, ["a2"], disp), true);
    assert.equal(atiendeEnSedes({ id: "d5", sedes: [] }, ["a2"], null), null);   // sin horario a la vista
    assert.equal(atiendeEnSedes({ id: "d5", sedes: ["a2"] }, ["a2"], null), true); // la ficha basta
    assert.equal(atiendeEnSedes({ id: "d5" }, [], disp), null);
  });
  it("medicosDeSedes: los 4 de Surco, como lista Metas (no los 6)", () => {
    assert.deepEqual([...medicosDeSedes(["a2"], disp, medicos)].sort(), ["d2", "d3", "d4", "d6"]);
    assert.deepEqual([...medicosDeSedes(["a1"], disp)].sort(), ["d1", "d2", "d5"]);
  });
  it("si el servidor manda las sedes del doctor, mandan sobre el horario", () => {
    const conFicha = medicos.map((m) => (m.id === "d5" ? { ...m, sedes: [{ id: "a2" }] } : m.id === "d3" ? { ...m, sedes: ["a1"] } : m));
    assert.deepEqual([...medicosDeSedes(["a2"], disp, conFicha)].sort(), ["d2", "d4", "d5", "d6"]);
  });
  it("con ids distintos (número corto y UUID) compara con la función que se le pasa", () => {
    const igual = (a, b) => String(a).replace("sede-", "") === String(b).replace("sede-", "");
    assert.deepEqual([...medicosDeSedes(["sede-a2"], disp, null, igual)].sort(), ["d2", "d3", "d4", "d6"]);
  });
  it("sin horario y sin sedes en las fichas no se sabe: null", () => {
    assert.equal(medicosDeSedes(["a2"], [], medicos), null);
    assert.equal(medicosDeSedes(["a2"], null), null);
    assert.equal(medicosDeSedes(null, disp, medicos), null);
    // Todas las fichas con sede: se sabe aunque no haya horario.
    assert.deepEqual([...medicosDeSedes(["a2"], [], [{ id: "d1", sedes: ["a2"] }, { id: "d2", sedes: ["a1"] }])], ["d1"]);
  });
});
