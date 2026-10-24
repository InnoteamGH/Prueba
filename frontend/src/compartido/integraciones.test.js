/**
 * R8-09: Integraciones y el inicio de TI cuentan con la misma función y el mismo catálogo.
 * Ejecutar: node --test src/compartido/integraciones.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PASARELAS, contarIntegraciones, estadosIntegraciones } from "./integraciones.js";
import { incidenciaEnSedes } from "./whatsappSede.js";

// Como en producción: WhatsApp con 2 envíos fallidos, IA con clave, SUNAT sin proveedor, sin pasarela.
const salud = { ok: true, semaforo: "ambar", fallos24h: 2, iaReal: true, numero: "+51948277030" };

describe("estadosIntegraciones + contarIntegraciones", () => {
  it("2 activas · 1 con incidencia · 1 por activar (lo que dice Integraciones)", () => {
    const est = estadosIntegraciones({ conectado: true, salud, provSunat: "", pasarela: null });
    const c = contarIntegraciones(est);
    assert.equal(c.activas, 2);
    assert.equal(c.incidencia, 1);
    assert.equal(c.porActivar, 1);
    assert.equal(c.disponibles, PASARELAS.length + 1);   // pasarelas y Doctoralia
    assert.equal(c.total, est.length);
    assert.deepEqual(est.filter((i) => i.estado === "pendiente").map((i) => i.id), ["sunat"]);
    assert.equal(est.find((i) => i.id === "whatsapp").estado, "incidencia");
  });
  it("las sedes sin número propio no suman otra integración por activar", () => {
    const conPorSede = { ...salud, porSede: [{ sedeId: "a1", estado: "compartido" }, { sedeId: "a2", estado: "compartido" }] };
    assert.equal(contarIntegraciones(estadosIntegraciones({ conectado: true, salud: conPorSede, incidenciaSede: incidenciaEnSedes(conPorSede) })).porActivar, 1);
  });
  it("el número propio de una sede con fallos marca WhatsApp con incidencia en las dos pantallas", () => {
    const sana = { ok: true, semaforo: "verde", fallos24h: 0, porSede: [{ sedeId: "a1", ok: true, semaforo: "verde" }, { sedeId: "a2", ok: true, fallos24h: 3 }] };
    assert.equal(incidenciaEnSedes(sana), true);
    const est = estadosIntegraciones({ conectado: true, salud: sana, incidenciaSede: incidenciaEnSedes(sana) });
    assert.equal(est.find((i) => i.id === "whatsapp").estado, "incidencia");
    assert.equal(incidenciaEnSedes({ ok: true }), false);
    assert.equal(incidenciaEnSedes(null), false);
  });
  it("proveedor SUNAT y pasarela conectados; sin sesión, la demostración", () => {
    const c = contarIntegraciones(estadosIntegraciones({ conectado: true, salud: { ok: true, semaforo: "verde", iaReal: false }, provSunat: "nubefact", pasarela: { id: "izipay" } }));
    assert.deepEqual([c.activas, c.incidencia, c.porActivar], [3, 0, 1]);   // WhatsApp, SUNAT e Izipay; falta la IA
    const demo = contarIntegraciones(estadosIntegraciones({ conectado: false, provSunat: "", pasarela: { id: "izipay" } }));
    assert.deepEqual([demo.activas, demo.incidencia, demo.porActivar], [3, 0, 1]);
  });
  it("mientras se consulta la salud, WhatsApp e IA quedan por activar (no «conectado»)", () => {
    const est = estadosIntegraciones({ conectado: true, salud: null });
    assert.equal(est.find((i) => i.id === "whatsapp").estado, "pendiente");
    assert.equal(est.find((i) => i.id === "ia").estado, "pendiente");
  });
  it("contarIntegraciones ignora huecos", () => {
    assert.deepEqual(contarIntegraciones([null, { estado: "conectado" }, { estado: "incidencia" }]), { total: 2, activas: 2, sinFallos: 1, incidencia: 1, porActivar: 0, disponibles: 0 });
    assert.equal(contarIntegraciones(undefined).total, 0);
  });
});
