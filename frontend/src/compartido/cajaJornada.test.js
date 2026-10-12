/**
 * R-07 (cierres anteriores de una jornada reabierta) y R-27 (un solo motivo de caja cerrada).
 * Ejecutar: node --test src/compartido/cajaJornada.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cierresAnteriores, fechaDMA, motivoCajaCerrada, resultadoCierre, tituloCajaCerrada } from "./cajaJornada.js";

// Forma real de GET /caja/apertura/historial (jornada QA del 03/10 de Surco, 12/10/2026).
const JORNADA_0310 = {
  id: "2561e3c9", fecha: "2026-10-03", fondo: 10, fondoUsd: 5, abiertaEn: "2026-10-12T09:33:40.43357-05:00", cerradaEn: "2026-10-12T09:34:16.682509-05:00",
  efectivoContado: 9, efectivoEsperado: 9, efectivoContadoUsd: 5, efectivoEsperadoUsd: 5, diferencia: 0,
  sesionesPrevias: [
    { id: "fa5a0637", abiertaEn: "2026-10-12T09:06:13.369703-05:00", cerradaEn: "2026-10-12T09:06:13.791549-05:00", fondo: 2.0, fondoUsd: 0.0, efectivoContado: 2.0, efectivoEsperado: 2.0, efectivoContadoUsd: 0.0, efectivoEsperadoUsd: -3.75, diferencia: 0.0, justificacion: "Cerrada fuera de fecha: QA" },
    { id: "3b5053bd", abiertaEn: "2026-10-11T18:52:37.145003-05:00", cerradaEn: "2026-10-11T18:52:37.571301-05:00", fondo: 1.0, fondoUsd: 0.0, efectivoContado: 1.0, efectivoEsperado: 1.0, efectivoContadoUsd: 0.0, efectivoEsperadoUsd: -3.75, diferencia: 0.0, justificacion: "Cerrada fuera de fecha: QA" },
    { id: "6809453b", abiertaEn: "2026-10-08T12:54:35.700528-05:00", cerradaEn: "2026-10-08T12:54:46.404391-05:00", fondo: 5.0, fondoUsd: 2.0, efectivoContado: 5.0, efectivoEsperado: 5.0, efectivoContadoUsd: 1.0, efectivoEsperadoUsd: -1.75, diferencia: 0.0, justificacion: "Cerrada fuera de fecha: QA" },
  ],
};

describe("cierresAnteriores (R-07)", () => {
  it("devuelve los 3 cierres anteriores, del más antiguo al más reciente", () => {
    const c = cierresAnteriores(JORNADA_0310);
    assert.deepEqual(c.map((x) => x.id), ["6809453b", "3b5053bd", "fa5a0637"]);
    assert.equal(c[0].fondo, 5); assert.equal(c[0].fondoUsd, 2);
    assert.equal(c[0].efectivoEsperado, 5); assert.equal(c[0].efectivoContado, 5); assert.equal(c[0].diferencia, 0);
    assert.equal(c[2].justificacion, "Cerrada fuera de fecha: QA");
  });
  it("deduce la diferencia en dólares (contado − esperado) si no viene", () => {
    const c = cierresAnteriores(JORNADA_0310);
    assert.equal(c[2].diferenciaUsd, 3.75);   // 0 − (−3.75)
    assert.equal(c[0].diferenciaUsd, 2.75);   // 1 − (−1.75)
  });
  it("sin sesionesPrevias (o vacías) no hay nada que mostrar", () => {
    assert.deepEqual(cierresAnteriores({ id: "x" }), []);
    assert.deepEqual(cierresAnteriores({ sesionesPrevias: null }), []);
    assert.deepEqual(cierresAnteriores(null), []);
    assert.deepEqual(cierresAnteriores({ sesionesPrevias: [null, {}] }), []);
  });
});

describe("resultadoCierre", () => {
  it("cuadra, falta o sobra; sin arqueo, null", () => {
    assert.equal(resultadoCierre(0), "cuadra"); assert.equal(resultadoCierre(0.004), "cuadra");
    assert.equal(resultadoCierre(-5), "falta"); assert.equal(resultadoCierre(3), "sobra");
    assert.equal(resultadoCierre(null), null);
  });
});

describe("motivoCajaCerrada (R-27)", () => {
  const previa = { id: "j1", fecha: "2026-10-10" };
  it("con una jornada anterior abierta dice lo mismo para todos los pacientes", () => {
    const m = motivoCajaCerrada({ sede: "Sede San Isidro", jornadaPrevia: previa });
    assert.equal(m, "La caja de Sede San Isidro tiene abierta la jornada del 10/10/2026. Ciérrala en Caja › Historial y abre la de hoy antes de cobrar.");
    assert.doesNotMatch(m, /2026-10-10/);
  });
  it("sin jornada anterior, hay que abrir la caja", () => {
    assert.equal(motivoCajaCerrada({ sede: "Sede Surco" }), "Abre la caja de Sede Surco antes de cobrar.");
    assert.equal(motivoCajaCerrada({}), "Abre la caja de esta sede antes de cobrar.");
  });
  it("otra acción y quien no puede cerrar", () => {
    assert.match(motivoCajaCerrada({ sede: "Sede Surco", jornadaPrevia: previa, accion: "registrar un egreso" }), /antes de registrar un egreso\.$/);
    assert.match(motivoCajaCerrada({ sede: "Sede Surco", jornadaPrevia: previa, puedeCerrar: false }), /la cierra la sede/);
  });
  it("el title del botón Cobrar sigue el mismo estado", () => {
    assert.equal(tituloCajaCerrada(null), "Abre la caja para cobrar");
    assert.equal(tituloCajaCerrada(previa), "Primero cierra la jornada del 10/10/2026 (Historial) y abre la caja");
  });
});

describe("fechaDMA", () => {
  it("ISO → dd/mm/aaaa", () => {
    assert.equal(fechaDMA("2026-10-10"), "10/10/2026");
    assert.equal(fechaDMA("2026-10-10T22:01:00-05:00"), "10/10/2026");
    assert.equal(fechaDMA(""), "");
    assert.equal(fechaDMA("ayer"), "ayer");
  });
});
