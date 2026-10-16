/**
 * M7-01 / M7-03: cierre común de los menús desplegables (clic fuera y flechas).
 * Ejecutar: node --test src/compartido/menuDesplegable.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esDentro, indiceSiguiente } from "./menuDesplegable.js";

// Nodo de mentira: contiene a sus hijos (como Node.contains del navegador).
const nodo = (...hijos) => ({ hijos, contains(x) { return x === this || this.hijos.some((h) => h === x || (h.contains && h.contains(x))); } });

describe("esDentro", () => {
  const opcion = nodo(), lista = nodo(opcion), boton = nodo(), fila = nodo();
  it("un clic en el botón o en una opción es dentro: no cierra", () => {
    assert.equal(esDentro(boton, [boton, lista]), true);
    assert.equal(esDentro(opcion, [boton, lista]), true);
  });
  it("un clic en otra fila es fuera: cierra y el clic sigue su camino", () => {
    assert.equal(esDentro(fila, [boton, lista]), false);
  });
  it("sin objetivo o con contenedores vacíos (lista aún sin montar): fuera", () => {
    assert.equal(esDentro(null, [boton]), false);
    assert.equal(esDentro(fila, [null, undefined]), false);
  });
});

describe("indiceSiguiente", () => {
  it("con el foco en el botón (fuera de la lista), ↓ va a la primera y ↑ a la última", () => {
    assert.equal(indiceSiguiente(-1, 3, 1), 0);
    assert.equal(indiceSiguiente(-1, 3, -1), 2);
  });
  it("recorre la lista en círculo", () => {
    assert.equal(indiceSiguiente(0, 3, 1), 1);
    assert.equal(indiceSiguiente(2, 3, 1), 0);
    assert.equal(indiceSiguiente(0, 3, -1), 2);
  });
  it("sin opciones: -1", () => {
    assert.equal(indiceSiguiente(0, 0, 1), -1);
  });
});
