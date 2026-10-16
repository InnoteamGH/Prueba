/**
 * M8-08: «Mi horario» avisa de los cambios sin guardar antes de salir por el menú.
 * Ejecutar: node --test src/compartido/guardaSalida.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fijarGuardaSalida, puedeSalir } from "./guardaSalida.js";

describe("guardaSalida", () => {
  it("sin guarda o sin cambios se sale sin preguntar", () => {
    let preguntas = 0;
    assert.equal(puedeSalir(() => { preguntas += 1; return false; }), true);
    const quitar = fijarGuardaSalida(() => null);
    assert.equal(puedeSalir(() => { preguntas += 1; return false; }), true);
    assert.equal(preguntas, 0);
    quitar();
  });
  it("con cambios pregunta: «Cancelar» se queda, «Aceptar» sale y suelta la guarda", () => {
    let salio = 0;
    const quitar = fijarGuardaSalida(() => "Tienes cambios sin guardar.", () => { salio += 1; });
    let msg = "";
    assert.equal(puedeSalir((m) => { msg = m; return false; }), false);
    assert.equal(msg, "Tienes cambios sin guardar.");
    assert.equal(salio, 0);
    assert.equal(puedeSalir(() => true), true);
    assert.equal(salio, 1);
    // Ya soltada: la siguiente navegación no vuelve a preguntar.
    assert.equal(puedeSalir(() => false), true);
    quitar();
  });
  it("quitar la guarda de una pantalla no borra la de otra más nueva", () => {
    const quitarVieja = fijarGuardaSalida(() => "vieja");
    const quitarNueva = fijarGuardaSalida(() => "nueva");
    quitarVieja();
    let msg = "";
    puedeSalir((m) => { msg = m; return false; });
    assert.equal(msg, "nueva");
    quitarNueva();
    assert.equal(puedeSalir(() => false), true);
  });
  it("una guarda que falla no bloquea la navegación", () => {
    const quitar = fijarGuardaSalida(() => { throw new Error("x"); });
    assert.equal(puedeSalir(() => false), true);
    quitar();
  });
});
