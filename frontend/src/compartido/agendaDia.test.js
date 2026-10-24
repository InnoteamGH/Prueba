/**
 * M6-03: la vista Día comparte la fecha con el calendario y muestra los bloqueos del día.
 * Ejecutar: node --test src/compartido/agendaDia.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bloqueosDelDia, fechaFocoVigente, FOCO_VIGENCIA_MS, textoBloqueo } from "./agendaDia.js";

describe("fechaFocoVigente", () => {
  const ahora = Date.parse("2026-10-12T15:00:00Z");
  it("devuelve la fecha mirada hace poco", () => {
    assert.equal(fechaFocoVigente({ fecha: "2026-10-09", ts: ahora - 60_000 }, ahora), "2026-10-09");
    assert.equal(fechaFocoVigente({ fecha: "2026-10-26", ts: ahora - FOCO_VIGENCIA_MS }, ahora), "2026-10-26");
  });
  it("pasados 15 minutos, sin fecha o con una fecha rara: null (la agenda abre en hoy)", () => {
    assert.equal(fechaFocoVigente({ fecha: "2026-10-09", ts: ahora - FOCO_VIGENCIA_MS - 1 }, ahora), null);
    assert.equal(fechaFocoVigente({ fecha: null, ts: ahora }, ahora), null);
    assert.equal(fechaFocoVigente({ fecha: "09/10/2026", ts: ahora }, ahora), null);
    assert.equal(fechaFocoVigente(null, ahora), null);
    assert.equal(fechaFocoVigente({ fecha: "2026-10-09" }, ahora), null);
  });
});

describe("bloqueosDelDia", () => {
  const A1 = "a1", A2 = "a2";
  const CARLA = "d1", LUIS = "d2";
  const bs = [
    { id: 1, fecha: "2026-10-23", horaInicio: "10:00:00", horaFin: "11:00:00", motivo: "QA bloqueo médico", medicoId: CARLA, sede: A1 },
    { id: 2, fecha: "2026-10-23", horaInicio: "13:00", horaFin: "14:00", motivo: "Almuerzo", sede: A1 },
    { id: 3, fecha: "2026-10-23", horaInicio: "09:00", horaFin: "10:00", motivo: "Ausencia", medicoId: LUIS, sede: A1 },
    { id: 4, fecha: "2026-10-23", horaInicio: "15:00", horaFin: "16:00", motivo: "Mantenimiento", sillon: 3, sede: A1 },
    { id: 5, fecha: "2026-10-23", horaInicio: "08:00", horaFin: "09:00", motivo: "Fumigación", sede: A2 },
    { id: 6, diaSemana: 5, horaInicio: "12:00", horaFin: "12:30", motivo: "Reunión semanal", sede: A1 },   // viernes
    { id: 7, fecha: "2026-10-24", horaInicio: "10:00", horaFin: "11:00", motivo: "Otro día", sede: A1 },
  ];
  const enA1 = (s) => s === A1;
  it("la médica ve su bloqueo y los de toda la agenda de su sede, ordenados", () => {
    const r = bloqueosDelDia(bs, "2026-10-23", { medicoPropio: CARLA, soloPropios: true, enSede: enA1 });
    assert.deepEqual(r.map((b) => b.id), [1, 6, 2]);
  });
  it("sin saber quién es la médica, solo los de toda la agenda", () => {
    const r = bloqueosDelDia(bs, "2026-10-23", { soloPropios: true, enSede: enA1 });
    assert.deepEqual(r.map((b) => b.id), [6, 2]);
  });
  it("recepción ve todos los de su sede: doctores y sillones también, no los de otra sede", () => {
    const r = bloqueosDelDia(bs, "2026-10-23", { enSede: enA1 });
    assert.deepEqual(r.map((b) => b.id), [3, 1, 6, 2, 4]);
  });
  it("un bloqueo sin sede vale para todas; una fecha inválida no da nada", () => {
    assert.deepEqual(bloqueosDelDia([{ id: 9, fecha: "2026-10-23", horaInicio: "07:00", horaFin: "08:00" }], "2026-10-23", { enSede: () => false }).map((b) => b.id), [9]);
    assert.deepEqual(bloqueosDelDia(bs, ""), []);
  });
});

describe("textoBloqueo", () => {
  it("horas, motivo y a quién aplica", () => {
    assert.deepEqual(textoBloqueo({ horaInicio: "10:00:00", horaFin: "11:00:00", motivo: "QA" }), { horas: "10:00–11:00", motivo: "QA", quien: "Toda la agenda" });
    assert.equal(textoBloqueo({ horaInicio: "10:00", horaFin: "11:00", sillon: 3 }).quien, "Sillón 3");
    assert.equal(textoBloqueo({ horaInicio: "10:00", horaFin: "11:00", medicoId: "d1" }, (id) => (id === "d1" ? "Dra. Carla Mendoza" : "?")).quien, "Dra. Carla Mendoza");
    assert.equal(textoBloqueo({ horaInicio: "10:00", horaFin: "11:00", motivo: "  " }).motivo, "Bloqueado");
  });
});
