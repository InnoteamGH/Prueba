import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { puedeEscribirClinico } from "./clinicoWrite.js";

describe("puedeEscribirClinico", () => {
  it("recepción online no escribe", () => {
    const can = (mod, acc) => mod === "odontograma" && acc === "ver";
    assert.equal(puedeEscribirClinico({ conectado: true, can, rol: "recepcion" }), false);
  });

  it("medico con can editar escribe", () => {
    const can = (mod, acc) => mod === "odontograma" && acc === "editar";
    assert.equal(puedeEscribirClinico({ conectado: true, can, rol: "medico" }), true);
  });

  it("offline admin escribe por rol", () => {
    assert.equal(puedeEscribirClinico({ conectado: false, can: null, rol: "admin" }), true);
  });

  it("gerencia ver-only no escribe", () => {
    const can = (mod, acc) => mod === "odontograma" && acc === "ver";
    assert.equal(puedeEscribirClinico({ conectado: true, can, rol: "gerencia" }), false);
  });
});
