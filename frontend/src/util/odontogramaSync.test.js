import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clasificarEstado, hayAccionDelUsuario, ESPERA_SIN_SEQ_MS } from "./odontogramaSync.js";

const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const estado = (o) => ({ type: "dento-odontograma-state", ts: 1000, ...o });
const INI = { 16: { caras: {}, raices: {}, pieza: [{ h: "corona", c: "a" }], nota: "" } };

describe("clasificarEstado (M8-01)", () => {
  it("mientras se espera la carga, ignora los avisos anteriores (fase inicial vacía)", () => {
    const pendiente = { seq: 3, fase: "inicial", datos: INI, enviadoEn: 900 };
    // El aviso a los 400 ms de abrir: fase inicial sin marcas y sin la carga procesada.
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: {}, seq: null }), { capa: "inicial", pendiente, seqActual: 3, mismasMarcas: iguales }), "ignorar");
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: {}, seq: 2 }), { capa: "inicial", pendiente, seqActual: 3, mismasMarcas: iguales }), "ignorar");
  });

  it("confirma la carga cuando el dibujo devuelve su número", () => {
    const pendiente = { seq: 3, fase: "inicial", datos: INI, enviadoEn: 900 };
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: INI, seq: 3 }), { capa: "inicial", pendiente, seqActual: 3, mismasMarcas: iguales }), "confirmar");
  });

  it("una fase distinta mientras se espera no cambia la fase del módulo (sin bucle)", () => {
    const pendiente = { seq: 4, fase: "evolucion", datos: {}, enviadoEn: 900 };
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: INI, seq: 3 }), { capa: "evolucion", pendiente, seqActual: 4, mismasMarcas: iguales }), "ignorar");
  });

  it("tras confirmar, ignora avisos de una carga anterior", () => {
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: {}, seq: 2 }), { capa: "inicial", pendiente: null, seqActual: 3, mismasMarcas: iguales }), "ignorar");
  });

  it("sin ninguna carga confirmada no guarda nada", () => {
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: {} }), { capa: "inicial", pendiente: null, seqActual: null, mismasMarcas: iguales }), "ignorar");
  });

  it("con la carga vigente: cambio de fase pedido en el dibujo o cambio de marcas", () => {
    const ctx = { capa: "inicial", pendiente: null, seqActual: 3, mismasMarcas: iguales };
    assert.equal(clasificarEstado(estado({ fase: "evolucion", datos: {}, seq: 3 }), ctx), "cambio-fase");
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: INI, seq: 3 }), ctx), "persistir");
  });

  it("dibujo sin seq (caché): confirma por marcas iguales o por tiempo", () => {
    const pendiente = { seq: 1, fase: "inicial", datos: INI, enviadoEn: 1000 };
    const ctx = { capa: "inicial", pendiente, seqActual: 1, mismasMarcas: iguales };
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: INI, ts: 1001 }), ctx), "confirmar");
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: {}, ts: 1001 }), ctx), "ignorar");
    assert.equal(clasificarEstado(estado({ fase: "inicial", datos: {}, ts: 1000 + ESPERA_SIN_SEQ_MS }), ctx), "confirmar");
  });

  it("ignora mensajes que no son de estado", () => {
    assert.equal(clasificarEstado({ type: "dento-odontograma-resize" }, { capa: "inicial", pendiente: null, seqActual: 1, mismasMarcas: iguales }), "ignorar");
    assert.equal(clasificarEstado(null, { capa: "inicial", pendiente: null, seqActual: 1, mismasMarcas: iguales }), "ignorar");
  });
});

describe("hayAccionDelUsuario", () => {
  it("exige un toque del usuario después de confirmar la carga", () => {
    assert.equal(hayAccionDelUsuario(null, 100), false);
    assert.equal(hayAccionDelUsuario(90, 100), false);
    assert.equal(hayAccionDelUsuario(150, 100), true);
    assert.equal(hayAccionDelUsuario(150, null), false);
  });
});
