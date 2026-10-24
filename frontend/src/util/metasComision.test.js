/**
 * Decisión del cliente: la meta es por sede; el % de comisión es del médico (global) y solo
 * lo cambia el administrador general en «Todas las sedes».
 * Ejecutar: node --test src/util/metasComision.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CRITERIO_PRODUCCION, NOTA_COMISION_GLOBAL, comisionMedico, cuerpoMetaSede, puedeEditarComision } from "./metasComision.js";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("puedeEditarComision", () => {
  it("solo el administrador general en «Todas las sedes»", () => {
    assert.equal(puedeEditarComision({ rol: "admin", vistaTodas: true }), true);
    assert.equal(puedeEditarComision({ rol: "admin", vistaTodas: false }), false);
  });
  it("gerencia y el administrador de sede: solo lectura", () => {
    assert.equal(puedeEditarComision({ rol: "gerencia", vistaTodas: true }), false);
    assert.equal(puedeEditarComision({ rol: "admin_sede", vistaTodas: true }), false);
    assert.equal(puedeEditarComision({ rol: "ti", vistaTodas: true }), false);
  });
  it("sin permiso de metas o de configuración, tampoco", () => {
    assert.equal(puedeEditarComision({ rol: "admin", vistaTodas: true, puedeEditarMetas: false }), false);
    assert.equal(puedeEditarComision({ rol: "admin", vistaTodas: true, puedeConfig: false }), false);
    assert.equal(puedeEditarComision(), false);
  });
});

describe("cuerpoMetaSede", () => {
  it("solo la meta, nunca el %", () => {
    assert.deepEqual(cuerpoMetaSede("12000"), { metaMensual: 12000 });
    assert.deepEqual(cuerpoMetaSede(""), { metaMensual: null });
    assert.deepEqual(cuerpoMetaSede(null), { metaMensual: null });
    assert.equal("porcentajeComision" in cuerpoMetaSede(5000), false);
  });
});

describe("comisionMedico", () => {
  it("el % de la ficha (API o demostración)", () => {
    assert.equal(comisionMedico({ porcentajeComision: 40 }), 40);
    assert.equal(comisionMedico({ porcentajeComision: "35" }), 35);
    assert.equal(comisionMedico({ comision: 30 }), 30);
    assert.equal(comisionMedico({ porcentajeComision: null, comision: 25 }), 25);
    assert.equal(comisionMedico({}), null);
    assert.equal(comisionMedico(null), null);
  });
});

describe("textos", () => {
  it("la nota del % y el criterio de producción", () => {
    assert.match(NOTA_COMISION_GLOBAL, /es del médico en todas las sedes; lo cambia el administrador general en Todas las sedes/);
    assert.match(CRITERIO_PRODUCCION, /procedimientos terminados/);
    assert.match(CRITERIO_PRODUCCION, /citas atendidas/);
  });
  it("Metas no envía el % por la ruta de la sede", () => {
    const src = fs.readFileSync(path.join(dir, "../modulos/Metas.jsx"), "utf8");
    assert.match(src, /fijarMetaSede\(m\.id, sedeApiUuid\(s\) \|\| s, cuerpoMetaSede\(/);
    assert.doesNotMatch(src, /fijarMetaSede\([^\n]*porcentajeComision/);
  });
  it("sin «Facturado» visible en Producción, el Resumen del mes y el Panel", () => {
    for (const f of ["../modulos/ProduccionComisiones.jsx", "../modulos/ResumenMes.jsx", "../modulos/PanelGerencial.jsx"]) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      assert.doesNotMatch(src, /"Facturado"|Facturado del mes<|Trabajo facturado|cobrado vs facturado|tratamientos facturados/, f);
    }
  });
});
