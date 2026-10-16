/**
 * Decisión del cliente: TI no ve Caja ni la cobranza aunque el servidor le dé lectura.
 * Ejecutar: node --test src/compartido/modulosRol.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MSG_MODULO_NO_DISPONIBLE, moduloOcultoParaRol, sinModulosOcultos } from "./modulosRol.js";

describe("moduloOcultoParaRol", () => {
  it("TI no ve facturación (Caja)", () => {
    assert.equal(moduloOcultoParaRol("ti", "facturacion"), true);
    assert.equal(moduloOcultoParaRol("ti", "usuarios"), false);
    assert.equal(moduloOcultoParaRol("ti", "agenda"), false);
  });
  it("los demás roles no cambian", () => {
    for (const rol of ["admin", "gerencia", "admin_sede", "recepcion", "medico", "", undefined]) {
      assert.equal(moduloOcultoParaRol(rol, "facturacion"), false, String(rol));
    }
  });
});

describe("sinModulosOcultos", () => {
  it("quita facturacion de los permisos del servidor para TI", () => {
    const p = { usuarios: ["ver", "editar"], facturacion: ["ver"], agenda: ["ver"] };
    const r = sinModulosOcultos(p, "ti");
    assert.deepEqual(r, { usuarios: ["ver", "editar"], agenda: ["ver"] });
    assert.deepEqual(p.facturacion, ["ver"], "no muta el original");
  });
  it("otros roles o permisos sin el módulo: el mismo objeto", () => {
    const p = { facturacion: ["ver", "crear"] };
    assert.equal(sinModulosOcultos(p, "recepcion"), p);
    const q = { usuarios: ["ver"] };
    assert.equal(sinModulosOcultos(q, "ti"), q);
    assert.equal(sinModulosOcultos(null, "ti"), null);
  });
  it("el aviso por URL", () => {
    assert.equal(MSG_MODULO_NO_DISPONIBLE, "Este módulo no está disponible para tu rol");
  });
});
