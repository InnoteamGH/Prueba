import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nombrePropio } from "./nombres.js";

describe("nombre propio", () => {
  it("pasa a nombre propio lo escrito todo en mayúsculas", () => {
    assert.equal(nombrePropio("ANDERSSON ASTETE FLORES"), "Andersson Astete Flores");
    assert.equal(nombrePropio("MARÍA DE LA CRUZ PÉREZ-SOTO"), "María de la Cruz Pérez-Soto");
  });
  it("deja igual los nombres ya escritos con mayúscula inicial y las siglas cortas", () => {
    assert.equal(nombrePropio("Andrés Palma"), "Andrés Palma");
    assert.equal(nombrePropio("QA Prueba Doctor"), "QA Prueba Doctor");
    assert.equal(nombrePropio(null), "");
  });
});
