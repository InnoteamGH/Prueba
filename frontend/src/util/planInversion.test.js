import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolverLineas,
  calcularTotales,
  rotuloPieza,
  esRotuloPiezaValido,
  necesitaSelectorMaxilar,
  opcionesMaxilar,
  SUELTOS_PARTIDA,
  redondear2,
} from "./planInversion.js";

describe("planInversion totales A-5…A-8", () => {
  it("subtotal = suma y sin descuento total = subtotal", () => {
    const { lineas } = resolverLineas([], [[null, 26, null]]);
    const t = calcularTotales(lineas, { activo: false });
    assert.equal(t.subtotal, 50);
    assert.equal(t.total, t.subtotal);
    assert.equal(t.descuento, 0);
  });

  it("descuento % ≤ 2 decimales y total cuadra", () => {
    const lineas = [{ v: 100, cant: 1 }];
    for (const pct of [10, 33, 7.5]) {
      const t = calcularTotales(lineas, { activo: true, tipo: "porcentaje", valor: pct });
      const cents = Math.round(t.descuento * 100);
      assert.equal(t.descuento, cents / 100);
      assert.ok(Math.abs(t.total - (t.subtotal - t.descuento)) < 0.005);
    }
    const fijo = calcularTotales(lineas, { activo: true, tipo: "monto", valor: 12.345 });
    assert.equal(fijo.descuento, redondear2(12.345));
  });
});

describe("planInversion rótulos A-3 A-12 A-13 A-14", () => {
  it("consulta 26 → —", () => {
    const { lineas } = resolverLineas([], [[null, 26, null]]);
    assert.equal(rotuloPieza(lineas[0]), "—");
    assert.ok(esRotuloPiezaValido(rotuloPieza(lineas[0])));
  });

  it("profilaxis 242 → Maxilar…", () => {
    const { lineas } = resolverLineas([], [[null, 242, "sup"]]);
    assert.ok(rotuloPieza(lineas[0]).startsWith("Maxilar"));
  });

  it("A-14: 2×202 ambos = precio 58", () => {
    const { lineas } = resolverLineas([], [[null, 202, "ambos"]]);
    const dest = lineas.find((l) => l.cod === 202);
    assert.equal(dest.cant, 2);
    assert.equal(dest.v * dest.cant, 100);
    const c58 = SUELTOS_PARTIDA.find((s) => s.cod === 58);
    assert.equal(dest.v * dest.cant, c58.v);
  });

  it("radiografía 21 lleva pieza con punto", () => {
    const { lineas } = resolverLineas([], [[16, 21, null]]);
    assert.equal(rotuloPieza(lineas[0]), "1.6");
  });

  it("alias UI: extraer→extraccion, corona→coronaT", () => {
    const { lineas, descartes } = resolverLineas([
      [46, "extraer", "pieza"],
      [11, "corona", "pieza"],
      [26, "obturado", "O"],
    ], []);
    assert.ok(lineas.some((l) => l.cod === 18 && l.pz === 46));
    assert.ok(lineas.some((l) => l.cod === 12 && l.pz === 11));
    assert.ok(descartes.some((d) => d.h === "obturado"));
  });
});

describe("selector maxilar A-16 A-17", () => {
  it("solo maxilar sin fijo", () => {
    const consulta = SUELTOS_PARTIDA.find((s) => s.cod === 26);
    const rx = SUELTOS_PARTIDA.find((s) => s.cod === 21);
    const profi = SUELTOS_PARTIDA.find((s) => s.cod === 242);
    const destSI = SUELTOS_PARTIDA.find((s) => s.cod === 58);
    assert.equal(necesitaSelectorMaxilar(consulta), false);
    assert.equal(necesitaSelectorMaxilar(rx), false);
    assert.equal(necesitaSelectorMaxilar(profi), true);
    assert.equal(necesitaSelectorMaxilar(destSI), false);
    assert.deepEqual(
      opcionesMaxilar().map((o) => o.value),
      ["sup", "inf", "ambos"]
    );
  });
});
