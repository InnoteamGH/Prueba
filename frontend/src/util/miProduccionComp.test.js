/**
 * M6-04: «Mi producción» compara con el mes anterior hasta el mismo día real (no un prorrateo).
 * Ejecutar: node --test src/util/miProduccionComp.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compararMesAnterior, tramoMesAnterior } from "./miProduccionComp.js";

describe("tramoMesAnterior", () => {
  it("12/10 → del 1 al 12 de septiembre", () => {
    assert.deepEqual(tramoMesAnterior("2026-10-12"), { desde: "2026-09-01", hasta: "2026-09-30", alDia: "2026-09-12", rango: "1–12 sep" });
  });
  it("31/10 → septiembre tiene 30 días: hasta el 30", () => {
    assert.equal(tramoMesAnterior("2026-10-31").alDia, "2026-09-30");
  });
  it("enero mira diciembre del año anterior; marzo 30 mira hasta el 28 de febrero", () => {
    assert.deepEqual(tramoMesAnterior("2027-01-05"), { desde: "2026-12-01", hasta: "2026-12-31", alDia: "2026-12-05", rango: "1–5 dic" });
    assert.equal(tramoMesAnterior("2027-03-30").alDia, "2027-02-28");
    assert.equal(tramoMesAnterior("2026-11-01").rango, "1 oct");
  });
  it("fecha inválida: null", () => { assert.equal(tramoMesAnterior("12/10/2026"), null); });
});

describe("compararMesAnterior", () => {
  const hoyISO = "2026-10-12";
  it("Luis: S/ 150 atendidos el 01/09 y S/ 0 este mes → −100 % (dato real, no prorrateo)", () => {
    const citas = [
      { fecha: "2026-09-01", estado: "atendida", valor: 150, medicoId: "d2" },
      { fecha: "2026-09-01", estado: "cerrada_sistema", valor: 150, medicoId: "d2" },
    ];
    const r = compararMesAnterior({ mesProd: 0, mesAnterior: 150, citasMesAnterior: citas, hoyISO, medicoId: "d2" });
    assert.deepEqual(r, { base: 150, delta: -100, rango: "1–12 sep", txt: "vs 1–12 sep", fuente: "citas" });
  });
  it("Carla: el mes anterior (S/ 80) no cuadra con sus citas visibles → sin porcentaje", () => {
    // La atención de septiembre fue en otra sede: /citas no la devuelve.
    const citas = [{ fecha: "2026-09-01", estado: "cerrada_sistema", valor: 80 }];
    assert.equal(compararMesAnterior({ mesProd: 80, mesAnterior: 80, citasMesAnterior: citas, hoyISO }), null);
  });
  it("si las citas cuadran, cuenta solo hasta el mismo día", () => {
    const citas = [
      { fecha: "2026-09-03", estado: "atendida", valor: 100 },
      { fecha: "2026-09-20", estado: "atendida", valor: 300 },
    ];
    const r = compararMesAnterior({ mesProd: 150, mesAnterior: 400, citasMesAnterior: citas, hoyISO });
    assert.equal(r.base, 100); assert.equal(r.delta, 50);
  });
  it("el tramo anterior en 0: hay comparación pero sin porcentaje", () => {
    const r = compararMesAnterior({ mesProd: 80, mesAnterior: 300, citasMesAnterior: [{ fecha: "2026-09-25", estado: "atendida", valor: 300 }], hoyISO });
    assert.equal(r.base, 0); assert.equal(r.delta, null);
  });
  it("manda el tramo del servidor cuando lo envía (también 0)", () => {
    assert.equal(compararMesAnterior({ mesProd: 80, mesAnterior: 80, antAlDiaServidor: 80, hoyISO }).delta, 0);
    assert.equal(compararMesAnterior({ mesProd: 80, mesAnterior: 80, antAlDiaServidor: 0, hoyISO }).delta, null);
    assert.equal(compararMesAnterior({ mesProd: 80, mesAnterior: 80, antAlDiaServidor: 40, citasMesAnterior: [], hoyISO }).fuente, "servidor");
  });
  it("sin tramo del servidor ni citas (o si fallaron): null", () => {
    assert.equal(compararMesAnterior({ mesProd: 80, mesAnterior: 80, hoyISO }), null);
    assert.equal(compararMesAnterior({ mesProd: 80, mesAnterior: 80, antAlDiaServidor: "", hoyISO }), null);
  });
  it("las citas de otro doctor no cuentan", () => {
    const citas = [{ fecha: "2026-09-02", estado: "atendida", valor: 90, medicoId: "otro" }, { fecha: "2026-09-02", estado: "atendida", valor: 60, medicoId: "yo" }];
    const r = compararMesAnterior({ mesProd: 60, mesAnterior: 60, citasMesAnterior: citas, hoyISO, medicoId: "yo" });
    assert.equal(r.base, 60); assert.equal(r.delta, 0);
  });
});
