import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { snapshotAGuardados } from "./odontogramaBridge.js";
import { estimarPaginasA4, resolverLineas, rotuloPieza } from "./planInversion.js";

describe("snapshotAGuardados puente anatómico", () => {
  it("mapea caras y raíces a estadosCara JSON", () => {
    const rows = snapshotAGuardados({
      16: {
        caras: { O: { h: "caries", c: "r" } },
        raices: { 0: { h: "fractR", c: "r" } },
        pieza: [],
        nota: "demo",
      },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].numeroPieza, 16);
    const esc = JSON.parse(rows[0].estadosCara);
    assert.equal(esc.O, "caries");
    assert.equal(esc.raices["0"], "fractR");
    assert.equal(rows[0].nota, "demo");
  });
});

describe("estimarPaginasA4", () => {
  it("ceil por altura A4", () => {
    assert.equal(estimarPaginasA4(0), 1);
    assert.equal(estimarPaginasA4(1123), 1);
    assert.equal(estimarPaginasA4(1124), 2);
  });
});

describe("alias hallazgo UI", () => {
  it("extraer y corona generan línea", () => {
    const { lineas, descartes } = resolverLineas([
      [46, "extraer", "pieza"],
      [11, "corona", "pieza"],
      [26, "obturado", "O"],
    ], []);
    assert.ok(lineas.some((l) => l.cod === 18 && l.pz === 46));
    assert.ok(lineas.some((l) => l.cod === 12 && l.pz === 11));
    assert.ok(descartes.some((d) => d.h === "obturado"));
    assert.equal(rotuloPieza(lineas.find((l) => l.pz === 46)), "4.6");
  });
});
