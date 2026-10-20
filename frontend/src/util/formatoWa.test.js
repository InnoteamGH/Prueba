import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { partesWa, sinFormatoWa } from "./formatoWa.js";

describe("formato de WhatsApp en la bandeja", () => {
  it("negrita, cursiva y tachado", () => {
    assert.deepEqual(partesWa("🕐 *Jueves 24* — 9:00"), [{ t: "🕐 " }, { t: "Jueves 24", b: true }, { t: " — 9:00" }]);
    assert.deepEqual(partesWa("_hoy_ y ~ayer~"), [{ t: "hoy", i: true }, { t: " y " }, { t: "ayer", s: true }]);
  });
  it("la marca debe ir pegada al texto y no dentro de una palabra", () => {
    assert.deepEqual(partesWa("2 * 3 * 4"), [{ t: "2 * 3 * 4" }]);
    assert.deepEqual(partesWa("pagar.html?pago_id=ab_cd"), [{ t: "pagar.html?pago_id=ab_cd" }]);
  });
  it("no cruza saltos de línea", () => {
    assert.deepEqual(partesWa("*uno\ndos*"), [{ t: "*uno\ndos*" }]);
  });
  it("vista previa sin marcas", () => {
    assert.equal(sinFormatoWa("Cupos: *Sábado 19* — 8:00"), "Cupos: Sábado 19 — 8:00");
    assert.equal(sinFormatoWa(null), "");
  });
});
