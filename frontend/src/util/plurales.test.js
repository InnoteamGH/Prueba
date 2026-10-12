/**
 * R7-09: los «(s)» de los textos de /go-live se escriben con el plural que toca.
 * Ejecutar: node --test src/util/plurales.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pluralizarParentesis } from "./plurales.js";

describe("pluralizarParentesis", () => {
  it("los textos de Puesta en marcha", () => {
    assert.equal(pluralizarParentesis("2 sede(s)"), "2 sedes");
    assert.equal(pluralizarParentesis("6 doctor(es)"), "6 doctores");
    assert.equal(pluralizarParentesis("22 servicio(s)"), "22 servicios");
    assert.equal(pluralizarParentesis("28 bloque(s)"), "28 bloques");
  });
  it("1 en singular; 0 en plural", () => {
    assert.equal(pluralizarParentesis("1 sede(s)"), "1 sede");
    assert.equal(pluralizarParentesis("1 doctor(es)"), "1 doctor");
    assert.equal(pluralizarParentesis("0 plantilla(s)"), "0 plantillas");
    assert.equal(pluralizarParentesis("0 promo(s)"), "0 promos");
  });
  it("concuerda con el número que va antes, aunque haya otras palabras", () => {
    assert.equal(pluralizarParentesis("1 punto(s) obligatorio(s) pendiente(s)"), "1 punto obligatorio pendiente");
    assert.equal(pluralizarParentesis("Faltan 3 servicio(s) con precio(s)"), "Faltan 3 servicios con precios");
  });
  it("sin número, plural; textos sin «(s)» quedan igual", () => {
    assert.equal(pluralizarParentesis("Revisa la(s) sede(s)"), "Revisa las sedes");
    assert.equal(pluralizarParentesis("Activo (gpt-4o)"), "Activo (gpt-4o)");
    assert.equal(pluralizarParentesis("Conexión con WhatsApp correcta."), "Conexión con WhatsApp correcta.");
    assert.equal(pluralizarParentesis(null), null);
  });
});
