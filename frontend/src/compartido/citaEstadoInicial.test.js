/**
 * Decisión del cliente: la cita nace «pendiente» (por confirmar), salvo la presencial; al
 * reprogramar a otra fecha u hora vuelve a «pendiente».
 * Ejecutar: node --test src/compartido/citaEstadoInicial.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { estadoAlReprogramar, estadoInicialCita, textoCitaAgendada } from "./citaEstadoInicial.js";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("estadoInicialCita", () => {
  it("llamada, WhatsApp o sin canal: por confirmar", () => {
    assert.equal(estadoInicialCita("llamada"), "pendiente");
    assert.equal(estadoInicialCita("whatsapp"), "pendiente");
    assert.equal(estadoInicialCita(""), "pendiente");
    assert.equal(estadoInicialCita(undefined), "pendiente");
  });
  it("presencial (el paciente está en la clínica): confirmada", () => {
    assert.equal(estadoInicialCita("presencial"), "confirmada");
    assert.equal(estadoInicialCita(" Presencial "), "confirmada");
  });
});

describe("textoCitaAgendada", () => {
  it("dice «por confirmar» solo si nace pendiente", () => {
    assert.equal(textoCitaAgendada("pendiente"), "Cita agendada · por confirmar");
    assert.equal(textoCitaAgendada("confirmada"), "Cita agendada");
    assert.equal(textoCitaAgendada("pendiente", 3), "3 citas agendadas · por confirmar");
    assert.equal(textoCitaAgendada("confirmada", 2), "2 citas agendadas");
  });
});

describe("estadoAlReprogramar", () => {
  const c = { fecha: "2026-10-20", hora: "10:00:00", estado: "confirmada" };
  it("otra fecha u otra hora: pasa a pendiente", () => {
    assert.equal(estadoAlReprogramar(c, { fecha: "2026-10-21", hora: "10:00" }), "pendiente");
    assert.equal(estadoAlReprogramar(c, { fecha: "2026-10-20", hora: "11:30" }), "pendiente");
    assert.equal(estadoAlReprogramar(c, { hora: "09:00" }), "pendiente");
  });
  it("mismo horario (solo cambia el sillón o el doctor): conserva el estado", () => {
    assert.equal(estadoAlReprogramar(c, { fecha: "2026-10-20", hora: "10:00" }), null);
    assert.equal(estadoAlReprogramar(c, { sillon: 2 }), null);
    assert.equal(estadoAlReprogramar(c, { medicoId: "m2" }), null);
  });
  it("ya pendiente: no hay nada que cambiar", () => {
    assert.equal(estadoAlReprogramar({ ...c, estado: "pendiente" }, { fecha: "2026-10-22" }), null);
  });
  it("sin cita o sin cambio: null", () => {
    assert.equal(estadoAlReprogramar(null, { fecha: "2026-10-22" }), null);
    assert.equal(estadoAlReprogramar(c, null), null);
  });
});

describe("el modal de agendar ya no confirma por defecto", () => {
  const src = fs.readFileSync(path.join(dir, "AgendarRecepcionModal.jsx"), "utf8");
  it("el cuerpo de POST /citas usa el estado según el canal", () => {
    assert.doesNotMatch(src, /estado:\s*"confirmada"/);
    assert.match(src, /estadoInicialCita\(f\.canal\)/);
    assert.match(src, /textoCitaAgendada\(/);
  });
});
