import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { leerMonto, tcDeCobro, egresoEnSoles, sumarEgresos, sumarCobros, resumenDiferencias, lineasBoleta, armarBoleta } from "./cajaMoneda.js";

describe("cajaMoneda: montos escritos", () => {
  it("acepta números con hasta 2 decimales", () => {
    assert.deepEqual(leerMonto("200"), { ok: true, valor: 200 });
    assert.deepEqual(leerMonto("50.5"), { ok: true, valor: 50.5 });
    assert.deepEqual(leerMonto("12,75"), { ok: true, valor: 12.75 });
  });
  it("rechaza «50.5.5», 3 decimales y negativos", () => {
    assert.equal(leerMonto("50.5.5").ok, false);
    assert.equal(leerMonto("1.234").ok, false);
    assert.equal(leerMonto("-5").ok, false);
  });
  it("vacío es 0 salvo que sea obligatorio", () => {
    assert.deepEqual(leerMonto(""), { ok: true, valor: 0, vacio: true });
    assert.deepEqual(leerMonto(" ", { obligatorio: true }), { ok: false, motivo: "vacio" });
  });
});

describe("cajaMoneda: dólares", () => {
  it("TC del cobro: el guardado o soles ÷ US$", () => {
    assert.equal(tcDeCobro({ tipoCambio: 3.8 }), 3.8);
    assert.equal(tcDeCobro({ monto: 150, montoOriginal: 40 }), 3.75);
  });
  it("egresos en dólares entran al total en soles con su TC", () => {
    const es = [{ monto: 215, moneda: "PEN" }, { monto: 10, moneda: "USD", tipoCambio: 3.75 }];
    assert.equal(egresoEnSoles(es[1]), 37.5);
    assert.deepEqual(sumarEgresos(es), { soles: 252.5, pen: 215, usd: 10 });
  });
  it("cobros: los dólares ya están dentro de los soles (sin doble conteo)", () => {
    const t = sumarCobros([{ monto: 120 }, { monto: 150, moneda: "USD", montoOriginal: 40 }]);
    assert.deepEqual(t, { soles: 270, usd: 40, usdEnSoles: 150 });
  });
  it("un faltante y un sobrante no se anulan", () => {
    const r = resumenDiferencias([{ diferencia: -5 }, { diferencia: 5 }, { diferencia: 0 }, { diferencia: null }]);
    assert.deepEqual(r, { faltantes: 5, sobrantes: 5, nFaltantes: 1, nSobrantes: 1 });
  });
});

describe("cajaMoneda: boleta", () => {
  it("columnas que cuadran: valor + IGV = importe y suman el total", () => {
    const L = lineasBoleta({ items: [{ cant: 1, desc: "Resina", precio: 120 }], totalPen: 120, total: 120, concepto: "Cobro" });
    assert.equal(L.lineas[0].valor, 101.69);
    assert.equal(L.lineas[0].igv, 18.31);
    assert.equal(L.lineas[0].importe, 120);
    assert.equal(L.opGravada + L.igv, L.total);
  });
  it("ítems que no suman lo cobrado → una línea con el concepto", () => {
    const L = lineasBoleta({ items: [{ cant: 1, desc: "Corona", precio: 300 }], totalPen: 120, total: 120, concepto: "Cobro de saldo en caja" });
    assert.equal(L.lineas.length, 1);
    assert.equal(L.lineas[0].desc, "Cobro de saldo en caja");
    assert.equal(L.total, 120);
  });
  it("cobro en dólares: total en US$ con su TC y equivalente en soles", () => {
    const b = armarBoleta({ paciente: "Pedro Gómez", dni: "40112233", monto: 150, moneda: "USD", montoOriginal: 40, tipoCambio: 3.75, concepto: "Abono", metodo: "Efectivo" }, { serie: "B001", numero: "00000002", usuario: "Lucía" });
    assert.equal(b.moneda, "USD");
    assert.equal(b.total, 40);
    assert.equal(b.totalPen, 150);
    assert.equal(b.tipoCambio, 3.75);
    assert.equal(b.docNum, "40112233");
    assert.equal(b.usuario, "Lucía");
    assert.equal(b.metodo, "efectivo");
  });
  it("ítems en soles se convierten a US$ y el redondeo cae en la última línea", () => {
    const b = armarBoleta({ monto: 350, moneda: "USD", montoOriginal: 93.33, tipoCambio: 3.75, items: [{ cant: 1, desc: "A", precio: 100 }, { cant: 1, desc: "B", precio: 250 }] });
    assert.equal(b.lineas.length, 2);
    assert.equal(b.lineas[0].importe, 26.67);
    assert.equal(b.total, 93.33);
    assert.equal(Math.round((b.lineas[0].importe + b.lineas[1].importe) * 100) / 100, 93.33);
  });
});
