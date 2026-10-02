import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  distinctPatients,
  layoutBarrasTotal,
  layoutProgreso,
  metaEmptyLabel,
  metaEstado,
  moneyFmt,
  filtraMicro,
} from "./panelGerencialUtil.js";

describe("panelGerencialUtil — barras (total-scale, zero no bar)", () => {
  it("valor 0 no dibuja barra", () => {
    const lay = layoutProgreso(0, 1000);
    assert.equal(lay.dibujar, false);
    assert.equal(lay.pct, 0);
  });

  it("total 0 no dibuja", () => {
    assert.equal(layoutProgreso(50, 0).dibujar, false);
  });

  it("las barras de un grupo suman 100 ±0.2", () => {
    const serie = [560, 440, 300, 200, 0];
    const lays = layoutBarrasTotal(serie);
    const suma = lays.filter((l) => l.dibujar).reduce((a, l) => a + l.pct, 0);
    assert.ok(Math.abs(suma - 100) <= 0.2, `suma=${suma}`);
    assert.equal(lays[4].dibujar, false);
  });
});

describe("panelGerencialUtil — pacientes distintos (P11)", () => {
  it("dos citas atendidas del mismo paciente cuentan 1", () => {
    const citas = [
      { pacienteId: "a", estado: "atendida" },
      { pacienteId: "a", estado: "atendida" },
      { pacienteId: "b", estado: "atendida" },
      { pacienteId: "c", estado: "confirmada" },
    ];
    assert.equal(distinctPatients(citas), 2);
  });
});

describe("panelGerencialUtil — meta vacía (P12)", () => {
  it('sin meta muestra "Sin meta configurada" y nunca S/ 0 ni 0%', () => {
    const e = metaEstado(false, null);
    assert.equal(e.vacia, true);
    assert.equal(e.label, metaEmptyLabel());
    assert.ok(!/S\/\s*0/.test(e.label));
    assert.ok(!/^0%$/.test(e.label));
    assert.ok(!e.label.includes("0%"));
  });

  it("hayMeta false con meta 0 sigue vacío", () => {
    const e = metaEstado(true, 0);
    assert.equal(e.vacia, true);
    assert.equal(e.label, "Sin meta configurada");
  });

  it("con meta real formatea dinero", () => {
    const e = metaEstado(true, 3000);
    assert.equal(e.vacia, false);
    assert.match(e.label, /S\/\s*3\s*000/);
  });
});

describe("panelGerencialUtil — moneyFmt y micro", () => {
  it("moneyFmt usa espacios de miles", () => {
    assert.equal(moneyFmt(1396), "S/ 1 396");
  });

  it("filtraMicro quita repetición de cifra grande", () => {
    const out = filtraMicro(
      [["Total", "S/ 1 500"], ["Ticket", "S/ 80"]],
      "S/ 1 500",
      "100%",
    );
    assert.equal(out.length, 1);
    assert.equal(out[0][0], "Ticket");
  });
});
