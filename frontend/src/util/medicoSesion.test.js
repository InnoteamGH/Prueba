/**
 * M7-03: con GET /medicos caído, el médico de la sesión sale de sus propias citas para
 * «Atendido por».
 * Ejecutar: node --test src/util/medicoSesion.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { medicoDeSesionEnCitas, medicoDeSesionEnLista } from "./medicoSesion.js";

const d1 = "00000000-0000-0000-0000-0000000000d1";

describe("medicoDeSesionEnCitas", () => {
  it("la cita con su nombre (con o sin «Dra.» y tildes)", () => {
    const citas = [{ medicoId: d1, medico: "Dra. Carla Mendoza" }, { medicoId: d1, medico: "Dra. Carla Mendoza" }];
    assert.equal(medicoDeSesionEnCitas(citas, "Dra. Carla Mendoza"), d1);
    assert.equal(medicoDeSesionEnCitas(citas, "carla mendoza"), d1);
  });
  it("todas de un solo doctor sin nombre: ese", () => {
    assert.equal(medicoDeSesionEnCitas([{ medicoId: d1 }, { medicoId: d1, medico: "" }], "Dra. Carla Mendoza"), d1);
  });
  it("si no se sabe con certeza, null (no se atribuye la atención a otro)", () => {
    assert.equal(medicoDeSesionEnCitas([{ medicoId: d1, medico: "Dr. Luis Paredes" }], "Dra. Carla Mendoza"), null);
    assert.equal(medicoDeSesionEnCitas([{ medicoId: d1 }, { medicoId: "d2" }], "Dra. Carla Mendoza"), null);
    assert.equal(medicoDeSesionEnCitas([], "Dra. Carla Mendoza"), null);
    assert.equal(medicoDeSesionEnCitas(null, "Dra. Carla Mendoza"), null);
  });
});

describe("medicoDeSesionEnLista (M8-08)", () => {
  const meds = [{ id: d1, nombre: "Dra. Carla Mendoza" }, { id: "d2", nombre: "Dr. Luis Paredes" }, { id: "d3", nombre: "Dra. Ana Quispe" }];
  it("el doctor con el nombre de la sesión (con o sin título, tildes ni mayúsculas)", () => {
    assert.equal(medicoDeSesionEnLista(meds, "Dra. Carla Mendoza"), d1);
    assert.equal(medicoDeSesionEnLista(meds, "CARLA MENDOZA"), d1);
    assert.equal(medicoDeSesionEnLista([{ id: 7, nombre: "Dr. José Núñez" }], "Dr(a). Jose Nunez"), "7");
  });
  it("nombre más corto o más largo: solo si hay uno que calce", () => {
    assert.equal(medicoDeSesionEnLista(meds, "Carla"), d1);
    assert.equal(medicoDeSesionEnLista(meds, "Dra. Carla Mendoza Ríos"), d1);
    assert.equal(medicoDeSesionEnLista(meds, "a"), null);
  });
  it("si no está en la lista, no se elige a otro", () => {
    assert.equal(medicoDeSesionEnLista(meds, "Dra. Sofía Torres"), null);
    assert.equal(medicoDeSesionEnLista(meds, ""), null);
    assert.equal(medicoDeSesionEnLista([], "Dra. Carla Mendoza"), null);
    assert.equal(medicoDeSesionEnLista(null, "Dra. Carla Mendoza"), null);
    assert.equal(medicoDeSesionEnLista([{ id: 1, nombre: "Carla Mendoza" }, { id: 2, nombre: "Dra. Carla Mendoza" }], "Carla Mendoza"), null);
  });
});
