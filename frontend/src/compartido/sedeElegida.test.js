/**
 * R5-12: la sede elegida se guarda por usuario y solo se restaura si sigue siendo suya.
 * Ejecutar: node --test src/compartido/sedeElegida.test.js
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { claveSedeElegida, guardarSedeElegida, leerSedeElegida, resolverSedeGuardada } from "./sedeElegida.js";

const U1 = "00000000-0000-0000-0000-0000000000a1";
const U2 = "00000000-0000-0000-0000-0000000000a2";
const aUuid = (n) => ({ 1: U1, 2: U2 })[n] ?? null;

function almacenEnMemoria() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

describe("resolverSedeGuardada", () => {
  it("«all» se respeta", () => { assert.equal(resolverSedeGuardada("all", [1, 2], aUuid), "all"); });
  it("el UUID guardado vuelve como el id corto del usuario", () => {
    assert.equal(resolverSedeGuardada(U2, [1, 2], aUuid), 2);
    assert.equal(resolverSedeGuardada(U2.toUpperCase(), [1, 2], aUuid), 2);
  });
  it("también acepta el mismo id corto o una lista de UUID", () => {
    assert.equal(resolverSedeGuardada("1", [1, 2], aUuid), 1);
    assert.equal(resolverSedeGuardada(U1, [U1, U2]), U1);
  });
  it("una sede que ya no es del usuario no se usa", () => {
    assert.equal(resolverSedeGuardada(U2, [1], aUuid), null);
    assert.equal(resolverSedeGuardada("99999999-0000-0000-0000-000000000000", [1, 2], aUuid), null);
  });
  it("nada guardado → null", () => {
    assert.equal(resolverSedeGuardada(null, [1, 2], aUuid), null);
    assert.equal(resolverSedeGuardada("", [1, 2], aUuid), null);
  });
});

describe("guardar y leer por usuario", () => {
  beforeEach(() => { globalThis.localStorage = almacenEnMemoria(); });
  it("cada usuario tiene su clave", () => {
    guardarSedeElegida("u-admin", U2);
    guardarSedeElegida("u-ger", "all");
    assert.equal(leerSedeElegida("u-admin"), U2);
    assert.equal(leerSedeElegida("u-ger"), "all");
    assert.equal(claveSedeElegida("u-admin"), "dc_sede_elegida_u-admin");
  });
  it("sin usuario no guarda ni lee", () => {
    guardarSedeElegida(null, U1);
    assert.equal(leerSedeElegida(null), null);
    assert.equal(globalThis.localStorage._m.size, 0);
  });
  it("con el almacenamiento bloqueado no falla", () => {
    globalThis.localStorage = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); }, removeItem() { throw new Error("bloqueado"); } };
    assert.doesNotThrow(() => guardarSedeElegida("u", U1));
    assert.equal(leerSedeElegida("u"), null);
  });
});
