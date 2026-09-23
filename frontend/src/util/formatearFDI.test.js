import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatearFDI, recuentoDenticion } from "./formatearFDI.js";

describe("formatearFDI A-4", () => {
  it("convierte enteros FDI a punto", () => {
    assert.equal(formatearFDI(11), "1.1");
    assert.equal(formatearFDI(85), "8.5");
    assert.equal(formatearFDI("26"), "2.6");
  });

  it("no rompe con entradas raras", () => {
    assert.equal(formatearFDI(null), "");
    assert.equal(formatearFDI(""), "");
    assert.equal(formatearFDI("x"), "x");
    assert.equal(formatearFDI("—"), "—");
    assert.equal(formatearFDI("Maxilar superior"), "Maxilar superior");
  });
});

describe("recuentoDenticion E1 §4", () => {
  it("permanente / temporal / mixta", () => {
    assert.equal(recuentoDenticion([16, 26]), "32 piezas");
    assert.equal(recuentoDenticion([55, 65]), "20 piezas");
    assert.equal(recuentoDenticion([16, 55]), "32 piezas · 20 temporales");
  });
});
