/**
 * M7-02: el Plan de inversión aparta lo ya realizado y descuenta lo pagado, como el
 * Presupuesto PDF. También comprueba que el dibujo del odontograma (que no puede importar este
 * módulo) aplica la misma regla.
 * Ejecutar: node --test src/util/planInversionCuenta.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { etiquetaRealizada, faseRealizada, filasTotalesPlan, pagadoConocido, pagadoEnResumen } from "./planInversionCuenta.js";

const fila = (r, rot) => r.find((x) => x.rotulo === rot);

describe("faseRealizada", () => {
  it("terminada y atendida son trabajo hecho; pendiente o en proceso, no", () => {
    assert.equal(faseRealizada("terminada"), true);
    assert.equal(faseRealizada("TERMINADO"), true);
    assert.equal(faseRealizada("atendida"), true);
    assert.equal(faseRealizada("pendiente"), false);
    assert.equal(faseRealizada("en_proceso"), false);
    assert.equal(faseRealizada("cancelada"), false);
  });
  it("rótulo como en el Presupuesto PDF", () => {
    assert.equal(etiquetaRealizada("terminada"), "Realizado · por cobrar");
    assert.equal(etiquetaRealizada("atendida"), "Realizado · pagado");
  });
});

describe("filasTotalesPlan", () => {
  it("QA Prueba Doctor: 120 propuesto + 220 realizado = 340, pagado 30.75, saldo 309.25", () => {
    const r = filasTotalesPlan({ subtotal: 120, totalRealizado: 220, hayRealizadas: true, pagado: 30.75 });
    assert.deepEqual(r.propuesto.map((x) => x.rotulo), ["Total propuesto"]);
    assert.deepEqual(r.cuenta.map((x) => x.rotulo), ["Ya realizado", "Total del plan", "Pagado", "Saldo a pagar"]);
    assert.equal(fila(r.cuenta, "Total del plan").monto, 340);
    assert.equal(fila(r.cuenta, "Pagado").monto, 30.75);
    assert.equal(fila(r.cuenta, "Saldo a pagar").monto, 309.25);
    assert.equal(fila(r.cuenta, "Saldo a pagar").total, true);
    assert.equal(r.saldo, 309.25);
    // Ya no dice «Total a pagar» por el plan entero.
    assert.equal([...r.propuesto, ...r.cuenta].some((x) => x.rotulo === "Total a pagar"), false);
  });
  it("sin nada realizado ni pagado: el cierre de siempre (Subtotal y Total a pagar)", () => {
    const r = filasTotalesPlan({ subtotal: 340, pagado: 0 });
    assert.deepEqual(r.propuesto.map((x) => [x.rotulo, x.monto]), [["Subtotal", 340], ["Total a pagar", 340]]);
    assert.deepEqual(r.cuenta, []);
  });
  it("sin dato de lo pagado: no inventa «Pagado S/ 0»; cierra con Total del plan", () => {
    const r = filasTotalesPlan({ subtotal: 120, totalRealizado: 220, hayRealizadas: true, pagado: null });
    assert.deepEqual(r.cuenta.map((x) => x.rotulo), ["Ya realizado", "Total del plan"]);
    assert.equal(fila(r.cuenta, "Total del plan").total, true);
    assert.equal(r.saldo, null);
  });
  it("con pago adelantado y nada realizado: también muestra pagado y saldo", () => {
    const r = filasTotalesPlan({ subtotal: 300, pagado: 50 });
    assert.deepEqual(r.cuenta.map((x) => [x.rotulo, x.monto]), [["Total del plan", 300], ["Pagado", 50], ["Saldo a pagar", 250]]);
  });
  it("el descuento solo baja lo propuesto; el saldo no queda negativo", () => {
    const r = filasTotalesPlan({ subtotal: 200, descuento: 20, etiquetaDescuento: "Descuento 10 %", totalRealizado: 100, hayRealizadas: true, pagado: 500 });
    assert.deepEqual(r.propuesto.map((x) => [x.rotulo, x.monto]), [["Subtotal propuesto", 200], ["Descuento 10 %", -20], ["Total propuesto", 180]]);
    assert.equal(fila(r.cuenta, "Total del plan").monto, 280);
    assert.equal(fila(r.cuenta, "Saldo a pagar").monto, 0);
  });
});

describe("lo pagado", () => {
  it("del resumen financiero, por paciente", () => {
    const filas = [{ pacienteId: "p1", pagado: 30.75 }, { pacienteId: "p2", pagado: "200" }];
    assert.equal(pagadoEnResumen(filas, "p1"), 30.75);
    assert.equal(pagadoEnResumen(filas, "p2"), 200);
    assert.equal(pagadoEnResumen(filas, "p3"), null);
    assert.equal(pagadoEnResumen(null, "p1"), null);
  });
  it("pagadoConocido: número o null", () => {
    assert.equal(pagadoConocido(0), 0);
    assert.equal(pagadoConocido("12.345"), 12.35);
    assert.equal(pagadoConocido(null), null);
    assert.equal(pagadoConocido("x"), null);
  });
});

describe("el dibujo del odontograma aplica la misma regla", () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const src = fs.readFileSync(path.resolve(__dirname, "../../public/odontograma-anatomico/index.html"), "utf8");
  const m = src.match(/function cuentaPlan\(T,hechas\)\{[\s\S]*?\n\}/);
  it("define cuentaPlan y aparta las partidas hechas", () => {
    assert.ok(m, "falta cuentaPlan en el dibujo");
    assert.match(src, /if\(f\.hecho\)\{[^}]*hechas\.push\(L\)/);
    assert.match(src, /Ya realizado \(en su plan de tratamiento\)/);
  });
  it("da las mismas cifras que filasTotalesPlan (340 / 30.75 / 309.25)", () => {
    const crear = new Function("DESCUENTO", "PLAN_PAGADO", `${m[0]}; return cuentaPlan;`);
    const cuentaPlan = crear({ activo: false }, 30.75);
    const r = cuentaPlan({ sub: 120, desc: 0, tot: 120 }, [{ v: 220, cant: 1 }]);
    assert.deepEqual(r.propuesto, [["Total propuesto", 120]]);
    assert.deepEqual(r.cuenta, [["Ya realizado", 220], ["Total del plan", 340, 0], ["Pagado", 30.75], ["Saldo a pagar", 309.25, 1]]);
    const sinNada = crear({ activo: false }, null)({ sub: 340, desc: 0, tot: 340 }, []);
    assert.deepEqual(sinNada.propuesto, [["Subtotal", 340], ["Total a pagar", 340, 1]]);
  });
});
