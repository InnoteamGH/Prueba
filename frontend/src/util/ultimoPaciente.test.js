/**
 * M6-01: el «último paciente» de Radiografías y Fotos solo se guarda con la ficha abierta y se
 * olvida si la API rechaza a ese paciente.
 * Ejecutar: node --test src/util/ultimoPaciente.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLAVE_ULTIMO_PACIENTE, guardarUltimoPaciente, leerUltimoPaciente, olvidarUltimoPaciente } from "./ultimoPaciente.js";

const memoria = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
};

describe("último paciente (M6-01)", () => {
  it("guarda y lee el id como texto", () => {
    const s = memoria();
    assert.equal(leerUltimoPaciente(s), null);
    guardarUltimoPaciente("6bcfd9f5-0000", s);
    assert.equal(leerUltimoPaciente(s), "6bcfd9f5-0000");
    guardarUltimoPaciente(7, s);
    assert.equal(s._m.get(CLAVE_ULTIMO_PACIENTE), "7");
  });
  it("un id vacío no pisa el guardado", () => {
    const s = memoria();
    guardarUltimoPaciente("a", s);
    guardarUltimoPaciente(null, s); guardarUltimoPaciente("", s);
    assert.equal(leerUltimoPaciente(s), "a");
  });
  it("al recibir 403 se olvida el paciente rechazado", () => {
    const s = memoria();
    guardarUltimoPaciente("ajeno", s);
    assert.equal(olvidarUltimoPaciente("ajeno", s), true);
    assert.equal(leerUltimoPaciente(s), null);
  });
  it("no borra otro paciente que se abrió después", () => {
    const s = memoria();
    guardarUltimoPaciente("propio", s);
    assert.equal(olvidarUltimoPaciente("ajeno", s), false);
    assert.equal(leerUltimoPaciente(s), "propio");
  });
  it("sin id borra lo que haya; «null» guardado como texto cuenta como vacío", () => {
    const s = memoria();
    guardarUltimoPaciente("x", s);
    assert.equal(olvidarUltimoPaciente(null, s), true);
    s.setItem(CLAVE_ULTIMO_PACIENTE, "null");
    assert.equal(leerUltimoPaciente(s), null);
  });
  it("un almacenamiento que falla no rompe nada", () => {
    const roto = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() { throw new Error("x"); } };
    assert.equal(leerUltimoPaciente(roto), null);
    assert.doesNotThrow(() => guardarUltimoPaciente("a", roto));
    assert.equal(olvidarUltimoPaciente("a", roto), false);
  });
});
