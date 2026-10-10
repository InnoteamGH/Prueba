import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { apiRowsAHtmlDatos, leerAnidado, tomaHashDeRows } from "./odontogramaHydrate.js";
import { snapshotAGuardados } from "./odontogramaBridge.js";

describe("apiRowsAHtmlDatos", () => {
  it("hidrata caras, raíces y estadoPieza", () => {
    const datos = apiRowsAHtmlDatos([
      {
        numeroPieza: 16,
        estadoPieza: "extraer",
        estadosCara: JSON.stringify({ O: "caries", raices: { 0: "fractR" } }),
        nota: "demo",
      },
    ]);
    assert.equal(datos["16"].caras.O.h, "caries");
    assert.equal(datos["16"].raices["0"].h, "fractR");
    assert.equal(datos["16"].pieza[0].h, "extraccion");
    assert.equal(datos["16"].nota, "demo");
  });

  it("round-trip bridge → hydrate conserva cara", () => {
    const rows = snapshotAGuardados({
      26: { caras: { M: { h: "caries", c: "r" } }, raices: {}, pieza: [], nota: "" },
    });
    const datos = apiRowsAHtmlDatos(rows);
    assert.equal(datos["26"].caras.M.h, "caries");
  });
});

describe("tomaHashDeRows", () => {
  it("estable ante mismo contenido distinto orden", () => {
    const a = tomaHashDeRows([
      { numeroPieza: 11, estadoPieza: "caries", estadosCara: "{}" },
      { numeroPieza: 21, estadoPieza: null, estadosCara: "{}" },
    ]);
    const b = tomaHashDeRows([
      { numeroPieza: 21, estadoPieza: null, estadosCara: "{}" },
      { numeroPieza: 11, estadoPieza: "caries", estadosCara: "{}" },
    ]);
    assert.equal(a, b);
  });

  it("cambia si cambia la toma", () => {
    const a = tomaHashDeRows([{ numeroPieza: 11, estadoPieza: "caries", estadosCara: "{}" }]);
    const b = tomaHashDeRows([{ numeroPieza: 11, estadoPieza: "extraer", estadosCara: "{}" }]);
    assert.notEqual(a, b);
  });
});

describe("estadosCara con mapas guardados como texto de Java (M4-04)", () => {
  it("lee _colores, _coloresRaiz y _piezas en formato {k=v} / [{h=x, c=y}]", () => {
    const d = apiRowsAHtmlDatos([{ numeroPieza: 26, estadosCara: { O: "restaur", _colores: "{O=a}", raices: "{0=endodoncia}", _coloresRaiz: "{0=a}", _piezas: "[{h=corona, c=a}]" } }]);
    assert.deepEqual(d["26"].caras.O, { h: "restaur", c: "a" });
    assert.equal(d["26"].raices["0"].c, "a");
    assert.deepEqual(d["26"].pieza, [{ h: "corona", c: "a" }]);
  });
  it("leerAnidado acepta JSON y texto de Java", () => {
    assert.deepEqual(leerAnidado('{"O":"a"}'), { O: "a" });
    assert.deepEqual(leerAnidado("{O=a, V=r}"), { O: "a", V: "r" });
    assert.deepEqual(leerAnidado("[{h=extraccion, c=r}]"), [{ h: "extraccion", c: "r" }]);
  });
});
