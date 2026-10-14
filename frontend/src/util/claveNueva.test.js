import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validarClaveNueva, sinRutaCambioClave } from "./claveNueva.js";

describe("validarClaveNueva (revisión 12)", () => {
  it("exige 8 caracteres, letras y números, distinta de la temporal y repetida", () => {
    assert.match(validarClaveNueva("abc123", "abc123"), /8 caracteres/);
    assert.match(validarClaveNueva("abcdefgh", "abcdefgh"), /letras y números/);
    assert.match(validarClaveNueva("Temporal123", "Temporal123", "Temporal123"), /igual a la temporal/);
    assert.match(validarClaveNueva("Nueva2026x", "Nueva2026y"), /no coinciden/);
    assert.equal(validarClaveNueva("Nueva2026x", "Nueva2026x", "nZeQf65T2H7v"), "");
  });
  it("404 y 405 significan que el servidor aún no tiene la ruta", () => {
    assert.equal(sinRutaCambioClave(404), true);
    assert.equal(sinRutaCambioClave(405), true);
    assert.equal(sinRutaCambioClave(400), false);
  });
});
