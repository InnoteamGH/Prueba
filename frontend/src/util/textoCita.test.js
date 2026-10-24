import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { motivoVisible } from "./textoCita.js";

describe("motivo de la cita en pantalla", () => {
  it("quita las marcas internas del agendamiento por WhatsApp", () => {
    assert.equal(motivoVisible("Agendado por WhatsApp · paciente 36 años · parentesco=titular · grupo=0f5bcc32-3ac0-43b6-81aa-53c474dd6b36"), "WhatsApp");
  });
  it("pone primero lo que se atiende y acorta el origen", () => {
    assert.equal(motivoVisible("Agendado por WhatsApp IA tras pago Izipay · Consulta general · Odontología general · 30 años"), "Consulta general · Odontología general · WhatsApp IA, pagada con Izipay");
  });
  it("deja igual un motivo escrito por recepción", () => {
    assert.equal(motivoVisible("Control de ortodoncia (desde lista de espera)"), "Control de ortodoncia (desde lista de espera)");
    assert.equal(motivoVisible(null), "");
  });
});
