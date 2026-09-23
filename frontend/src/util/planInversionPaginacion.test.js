import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  partirLineasEnHojas,
  totalPaginasDocumento,
  paginasDesdeAlturaMm,
  etiquetaPie,
  LINEAS_POR_HOJA_PLAN,
} from "./planInversionPaginacion.js";

describe("partirLineasEnHojas", () => {
  it("hoja vacía si no hay líneas", () => {
    assert.deepEqual(partirLineasEnHojas([]), [[]]);
  });

  it("parte en grupos de LINEAS_POR_HOJA_PLAN", () => {
    const lineas = Array.from({ length: LINEAS_POR_HOJA_PLAN + 3 }, (_, i) => ({ i }));
    const hojas = partirLineasEnHojas(lineas);
    assert.equal(hojas.length, 2);
    assert.equal(hojas[0].length, LINEAS_POR_HOJA_PLAN);
    assert.equal(hojas[1].length, 3);
  });
});

describe("totalPaginasDocumento A-25", () => {
  it("plan + anexo", () => {
    assert.equal(totalPaginasDocumento({ numHojasPlan: 2, conAnexo: true }), 3);
  });

  it("sin anexo solo hojas de plan", () => {
    assert.equal(totalPaginasDocumento({ numHojasPlan: 1, conAnexo: false }), 1);
  });
});

describe("etiquetaPie", () => {
  it("formato Página N de T", () => {
    assert.equal(etiquetaPie(1, 3), "Página 1 de 3");
    assert.equal(etiquetaPie(3, 3), "Página 3 de 3");
  });
});

describe("paginasDesdeAlturaMm", () => {
  it("respeta tolerancia 0.5 mm", () => {
    assert.equal(paginasDesdeAlturaMm(0), 1);
    assert.equal(paginasDesdeAlturaMm(294), 1);
    assert.equal(paginasDesdeAlturaMm(294.6), 2);
  });
});
