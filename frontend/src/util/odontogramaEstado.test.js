import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolverEstadoUi,
  metaEstado,
  colorEstado,
  inicialCara,
  ALIAS_ESTADO_UI,
} from "./odontogramaEstado.js";

describe("E5-C resolverEstadoUi", () => {
  it("alias anatómicos no rompen", () => {
    assert.equal(resolverEstadoUi("extraccion").id, "extraer");
    assert.equal(resolverEstadoUi("coronaT").id, "corona");
    assert.equal(resolverEstadoUi("fractR").id, "fractura");
    assert.ok(colorEstado("extraccion"));
    assert.ok(metaEstado("absceso_periapical").ambito === "raiz" || metaEstado("absceso").l);
  });

  it("A-54 estado desconocido visible sin undefined", () => {
    const r = resolverEstadoUi("xyz_inventado_99");
    assert.equal(r.desconocido, true);
    assert.ok(r.meta.color);
    assert.ok(r.meta.borde);
    assert.match(r.meta.l, /no reconocido/i);
    assert.ok(colorEstado("xyz_inventado_99"));
  });

  it("caries conocido", () => {
    assert.equal(resolverEstadoUi("caries").desconocido, false);
    assert.match(labelSafe(), /Caries/);
  });
});

function labelSafe() {
  return metaEstado("caries").l;
}

describe("E5-A.6 inicialCara", () => {
  it("iniciales de cara y raíz", () => {
    assert.equal(inicialCara(16, "Oclusal"), "O");
    assert.equal(inicialCara(16, "V"), "V");
    assert.equal(inicialCara(16, "pieza"), "");
    assert.equal(inicialCara(16, "raíz distal"), "R");
  });
});

describe("ALIAS_ESTADO_UI cubre extraccion", () => {
  it("tiene extraccion", () => {
    assert.equal(ALIAS_ESTADO_UI.extraccion, "extraer");
  });
});
