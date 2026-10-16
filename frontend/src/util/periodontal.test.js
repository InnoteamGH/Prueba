import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SUP, INF, piezaVacia, desdeApi, aApi, metricas, clasificacion, ordenVisual, demoPerio, nic } from "./periodontal.js";

describe("periodontal: contrato con el backend", () => {
  it("ida y vuelta pieza → PUT → GET conserva los 6 sitios y los campos nuevos", () => {
    const p = piezaVacia();
    p.pd = [3, 2, 5, 4, 2, 3]; p.mg = [1, 0, 2, 0, 0, -1]; p.bop[2] = true; p.placa[0] = true; p.sup[2] = true;
    p.movilidad = 1; p.furca = 2; p.implante = true; p.nota = "control";
    const body = aApi("pac-1", 16, p);
    assert.equal(body.numeroPieza, 16);
    assert.equal(typeof body.profundidad, "string");
    const vuelta = desdeApi([{ numeroPieza: 16, ...body }])[16];
    assert.deepEqual(vuelta.pd, p.pd);
    assert.deepEqual(vuelta.mg, p.mg);
    assert.deepEqual(vuelta.bop, p.bop);
    assert.deepEqual(vuelta.placa, p.placa);
    assert.equal(vuelta.furca, 2);
    assert.equal(vuelta.implante, true);
  });
  it("filas antiguas sin placa ni supuración no rompen la lectura", () => {
    const x = desdeApi([{ numeroPieza: "21", profundidad: "[2,3,2]", sangrado: "[true]" }])[21];
    assert.deepEqual(x.pd, [2, 3, 2, null, null, null]);
    assert.equal(x.bop[0], true);
    assert.deepEqual(x.placa, [false, false, false, false, false, false]);
  });
});

describe("periodontal: cálculos", () => {
  it("NIC = profundidad + recesión", () => { assert.equal(nic(4, 2), 6); assert.equal(nic(3, -1), 2); assert.equal(nic(null, 2), null); });
  it("orden visual: el distal a la izquierda en los cuadrantes 1 y 4", () => {
    assert.deepEqual(ordenVisual(16, "v"), [2, 1, 0]);
    assert.deepEqual(ordenVisual(26, "v"), [0, 1, 2]);
    assert.deepEqual(ordenVisual(46, "l"), [5, 4, 3]);
  });
  it("sin sondaje no se diagnostica nada", () => {
    assert.equal(clasificacion(metricas({})).estado, "sin_datos");
  });
  it("sangrado alto sin pérdida de inserción es gingivitis", () => {
    const d = {}; [...SUP, ...INF].forEach((n) => { const p = piezaVacia(); p.pd = [2, 2, 2, 2, 2, 2]; p.mg = [0, 0, 0, 0, 0, 0]; p.bop = [true, false, false, false, false, false]; d[n] = p; });
    const m = metricas(d);
    assert.equal(m.bopPct, 17);
    assert.equal(clasificacion(m).estado, "gingivitis");
  });
  it("NIC interproximal de 5 mm es estadio III", () => {
    const d = { 16: piezaVacia(), 26: piezaVacia() }; d[16].pd = [6, 3, 3, 3, 3, 3]; d[16].mg = [0, 0, 0, 0, 0, 0]; d[26].pd = [4, 2, 2, 2, 2, 2]; d[26].mg = [0, 0, 0, 0, 0, 0];
    const c = clasificacion(metricas(d));
    assert.equal(c.estado, "periodontitis");
    assert.equal(c.estadio, "III");
  });
  it("las piezas ausentes no cuentan", () => {
    const d = { 18: { ...piezaVacia(), ausente: true, pd: [9, 9, 9, 9, 9, 9] } };
    assert.equal(metricas(d).sitios, 0);
  });
  it("la demo es estable por paciente y deja ausentes los terceros molares", () => {
    const a = demoPerio(3), b = demoPerio(3);
    assert.deepEqual(a[16].pd, b[16].pd);
    assert.equal(a[18].ausente, true);
    assert.ok(metricas(a).sitios > 100);
  });
});
