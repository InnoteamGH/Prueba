/**
 * R-30: la Semana y el Mes muestran los bloqueos de un doctor o de un sillón (antes solo Día y
 * Por sillón), y un bloqueo de media hora toca su franja.
 * Ejecutar: node --test src/compartido/agendaBloqueos.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bloqueoTocaHora, bloqueosParcialesDelDia, esBloqueoParcial } from "./agendaDia.js";

describe("bloqueoTocaHora", () => {
  it("un bloqueo de 17:00 a 17:30 toca la franja de las 17 (antes no tocaba ninguna)", () => {
    const b = { horaInicio: "17:00:00", horaFin: "17:30:00" };
    assert.equal(bloqueoTocaHora(b, 17), true);
    assert.equal(bloqueoTocaHora(b, 16), false);
    assert.equal(bloqueoTocaHora(b, 18), false);
  });
  it("15:00–16:00 solo toca la de las 15; 12:30–14:00 toca las 12 y las 13", () => {
    assert.equal(bloqueoTocaHora({ horaInicio: "15:00", horaFin: "16:00" }, 15), true);
    assert.equal(bloqueoTocaHora({ horaInicio: "15:00", horaFin: "16:00" }, 16), false);
    assert.equal(bloqueoTocaHora({ horaInicio: "12:30", horaFin: "14:00" }, 12), true);
    assert.equal(bloqueoTocaHora({ horaInicio: "12:30", horaFin: "14:00" }, 13), true);
    assert.equal(bloqueoTocaHora({ horaInicio: "12:30", horaFin: "14:00" }, 14), false);
  });
  it("horas que no se entienden o al revés: no toca nada", () => {
    assert.equal(bloqueoTocaHora({ horaInicio: "", horaFin: "16:00" }, 15), false);
    assert.equal(bloqueoTocaHora({ horaInicio: "16:00", horaFin: "15:00" }, 15), false);
    assert.equal(bloqueoTocaHora(null, 15), false);
  });
});

describe("bloqueosParcialesDelDia", () => {
  const SI = "00000000-0000-0000-0000-0000000000a1", SU = "00000000-0000-0000-0000-0000000000a2";
  const bs = [
    { id: "sil", fecha: "2026-10-16", horaInicio: "15:00", horaFin: "16:00", sillon: 3, sede: SI, motivo: "QA bloqueo sillón 3 R8" },
    { id: "doc", fecha: "2026-10-10", horaInicio: "17:00:00", horaFin: "17:30:00", medicoId: "d5", sede: SI, motivo: "QA4-verify-0080" },
    { id: "todo", fecha: "2026-10-16", horaInicio: "13:00", horaFin: "14:00", sede: SI, motivo: "Almuerzo" },
    { id: "surco", fecha: "2026-10-16", horaInicio: "10:00", horaFin: "11:00", sillon: 1, sede: SU, motivo: "Mantenimiento" },
  ];
  const enSI = (s) => s === SI;
  it("de un sillón o de un doctor sí; de toda la agenda no (esa ya pinta la franja)", () => {
    assert.deepEqual(bloqueosParcialesDelDia(bs, "2026-10-16", { enSede: enSI }).map((b) => b.id), ["sil"]);
    assert.deepEqual(bloqueosParcialesDelDia(bs, "2026-10-10", { enSede: enSI }).map((b) => b.id), ["doc"]);
    assert.equal(esBloqueoParcial(bs[2]), false);
  });
  it("solo los de la sede a la vista", () => {
    assert.deepEqual(bloqueosParcialesDelDia(bs, "2026-10-16", { enSede: (s) => s === SU }).map((b) => b.id), ["surco"]);
  });
  it("el doctor con el chip oculto tampoco muestra su bloqueo", () => {
    assert.deepEqual(bloqueosParcialesDelDia(bs, "2026-10-10", { enSede: enSI, oculto: (id) => id === "d5" }), []);
  });
  it("la agenda del médico: no los de otro doctor ni los de un sillón", () => {
    assert.deepEqual(bloqueosParcialesDelDia(bs, "2026-10-16", { enSede: enSI, soloPropios: true, medicoPropio: "d1" }), []);
    assert.deepEqual(bloqueosParcialesDelDia(bs, "2026-10-10", { enSede: enSI, soloPropios: true, medicoPropio: "d5" }).map((b) => b.id), ["doc"]);
  });
});
