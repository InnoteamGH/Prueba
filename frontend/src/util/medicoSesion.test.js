/**
 * M7-03: con GET /medicos caído, el médico de la sesión sale de sus propias citas para
 * «Atendido por».
 * Ejecutar: node --test src/util/medicoSesion.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { medicoDeSesionEnCitas } from "./medicoSesion.js";

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
