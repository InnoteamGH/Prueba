/**
 * M8-02 / M8-03: la evolución se liga a la cita de la que viene y «Ver atención» decide por
 * citaId si la atención tiene evolución.
 * Ejecutar: node --test src/compartido/citaAtencion.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { atencionPorCita, citaAtencionDe, guardarCitaAtencion, leerCitaAtencion, limpiarCitaAtencion, ponerIdsCitas, CLAVE_CITA_ATENCION } from "./citaAtencion.js";

const almacen = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

describe("citaAtencionDe", () => {
  it("toma id, día, hora, motivo y doctor de una cita de la agenda", () => {
    const c = { id: "c22", pacienteId: "p1", fecha: "2026-10-22", hora: "10:00:00", motivo: "Control", medico: "Dra. Carla Mendoza" };
    assert.deepEqual(citaAtencionDe(c, { origen: "agenda" }), { pacienteId: "p1", citaId: "c22", fecha: "2026-10-22", hora: "10:00", motivo: "Control", doctor: "Dra. Carla Mendoza", origen: "agenda" });
  });
  it("una alerta trae citaId (no su propio id) y el doctor en «doctor»", () => {
    const x = citaAtencionDe({ id: "alerta-9", citaId: "c5", pacienteId: "p2", fecha: "2026-10-09", doctor: "Dr. Luis" }, { origen: "alerta" });
    assert.equal(x.citaId, "c5");
    assert.equal(x.doctor, "Dr. Luis");
  });
  it("sin cita o sin paciente no hay nada que ligar", () => {
    assert.equal(citaAtencionDe(null), null);
    assert.equal(citaAtencionDe({ pacienteId: "p1" }), null);
    assert.equal(citaAtencionDe({ id: "c1" }), null);
    assert.equal(citaAtencionDe({ id: "c1" }, { pacienteId: "p1" }).pacienteId, "p1");
  });
});

describe("guardar / leer / limpiar", () => {
  it("la ficha del mismo paciente la lee; la de otro no", () => {
    const s = almacen();
    guardarCitaAtencion({ id: "c22", fecha: "2026-10-22" }, { pacienteId: "p1", origen: "agenda" }, s);
    assert.equal(leerCitaAtencion("p1", s).citaId, "c22");
    assert.equal(leerCitaAtencion("p2", s), null);
    limpiarCitaAtencion(s);
    assert.equal(leerCitaAtencion("p1", s), null);
  });
  it("lo dañado o sin almacenamiento no rompe", () => {
    const s = almacen();
    s.setItem(CLAVE_CITA_ATENCION, "{no es json");
    assert.equal(leerCitaAtencion("p1", s), null);
    assert.equal(leerCitaAtencion("p1", null), null);
    assert.doesNotThrow(() => guardarCitaAtencion({ id: "c1" }, { pacienteId: "p1" }, null));
    const roto = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() { throw new Error("x"); } };
    assert.doesNotThrow(() => guardarCitaAtencion({ id: "c1" }, { pacienteId: "p1" }, roto));
    assert.equal(leerCitaAtencion("p1", roto), null);
    assert.doesNotThrow(() => limpiarCitaAtencion(roto));
  });
});

describe("ponerIdsCitas", () => {
  it("la cita de ficha360 (sin id) toma el de GET /citas del mismo día y hora", () => {
    const r = ponerIdsCitas([{ fecha: "2026-10-22", hora: "10:00", estado: "atendida" }], [{ id: "c22", fecha: "2026-10-22", hora: "10:00:00" }]);
    assert.equal(r[0].id, "c22");
  });
  it("una sola en el día de cada lado: se ligan aunque la hora no coincida", () => {
    assert.equal(ponerIdsCitas([{ fecha: "2026-10-22", hora: "10:00" }], [{ id: "c22", fecha: "2026-10-22", hora: "10:30" }])[0].id, "c22");
  });
  it("si es ambiguo no inventa el id, y no da el mismo id a dos citas", () => {
    const api = [{ id: "a", fecha: "2026-10-22", hora: "10:00" }, { id: "b", fecha: "2026-10-22", hora: "11:00" }];
    const r = ponerIdsCitas([{ fecha: "2026-10-22", hora: "09:00" }, { fecha: "2026-10-22", hora: "10:00" }], api);
    assert.equal(r[0].id, undefined);
    assert.equal(r[1].id, "a");
    const dos = ponerIdsCitas([{ fecha: "2026-10-22", hora: "10:00" }, { fecha: "2026-10-22", hora: "10:00" }], [{ id: "a", fecha: "2026-10-22", hora: "10:00" }]);
    assert.equal(dos.filter((c) => c.id === "a").length, 1);
  });
  it("la que ya trae id se respeta", () => {
    assert.equal(ponerIdsCitas([{ id: "x", fecha: "2026-10-22", hora: "10:00" }], [{ id: "c22", fecha: "2026-10-22", hora: "10:00" }])[0].id, "x");
  });
});

describe("atencionPorCita (M8-03)", () => {
  const cita22 = { id: "c22", fecha: "2026-10-22", hora: "10:00", estado: "atendida" };
  const evoLigada = { id: "e1", fecha: "2026-10-13", citaId: "c22", diagnostico: "Control" };
  it("la evolución escrita otro día con citaId de la cita cuenta para esa atención", () => {
    const a = atencionPorCita({ fecha: "2026-10-22", citas: [cita22], historia: [evoLigada] });
    assert.deepEqual(a.sinEvolucion, []);
    assert.deepEqual(a.evos.map((h) => h.id), ["e1"]);
  });
  it("sin evolución ligada: la cita atendida queda «sin evolución»", () => {
    const a = atencionPorCita({ fecha: "2026-10-22", citas: [cita22], historia: [{ id: "e0", fecha: "2026-10-13", diagnostico: "Otra cosa" }] });
    assert.deepEqual(a.sinEvolucion.map((c) => c.id), ["c22"]);
    assert.deepEqual(a.evos, []);
  });
  it("un borrador vacío ligado no es una evolución", () => {
    const a = atencionPorCita({ fecha: "2026-10-22", citas: [cita22], historia: [{ id: "b1", fecha: "2026-10-22", citaId: "c22", diagnostico: "", detalle: " " }] });
    assert.deepEqual(a.sinEvolucion.map((c) => c.id), ["c22"]);
    assert.equal(a.evos.length, 1);
  });
  it("la evolución del día ligada a otra cita no tapa a esta", () => {
    const c13 = { id: "c13", fecha: "2026-10-13", hora: "09:00", estado: "atendida" };
    const a = atencionPorCita({ fecha: "2026-10-13", citas: [c13], historia: [evoLigada] });
    assert.deepEqual(a.sinEvolucion.map((c) => c.id), ["c13"]);
  });
  it("respaldo por fecha: una evolución antigua sin citaId cubre la cita de su día", () => {
    const c9 = { id: "c9", fecha: "2026-10-09", estado: "atendida" };
    const a = atencionPorCita({ fecha: "2026-10-09", citas: [c9], historia: [{ fecha: "2026-10-09", detalle: "Profilaxis" }] });
    assert.deepEqual(a.sinEvolucion, []);
  });
  it("cita sin id (ficha360): decide por fecha y por las citas conocidas", () => {
    const sinId = { fecha: "2026-10-22", hora: "10:00", estado: "atendida" };
    const conocidas = new Map([["c22", "2026-10-22"], ["c13", "2026-10-13"]]);
    assert.deepEqual(atencionPorCita({ fecha: "2026-10-22", citas: [sinId], historia: [evoLigada], fechaDeCita: conocidas }).sinEvolucion, []);
    // Escrita ese día pero de la atención de otro día: no cubre la del día.
    const c13sinId = { fecha: "2026-10-13", estado: "atendida" };
    assert.equal(atencionPorCita({ fecha: "2026-10-13", citas: [c13sinId], historia: [evoLigada], fechaDeCita: conocidas }).sinEvolucion.length, 1);
    // Sin saber de qué cita es: respaldo por fecha.
    assert.equal(atencionPorCita({ fecha: "2026-10-13", citas: [c13sinId], historia: [evoLigada] }).sinEvolucion.length, 0);
  });
  it("las citas no atendidas no piden evolución", () => {
    assert.deepEqual(atencionPorCita({ fecha: "2026-10-22", citas: [{ id: "c1", estado: "confirmada" }], historia: [] }).sinEvolucion, []);
    assert.deepEqual(atencionPorCita({}).sinEvolucion, []);
  });
});
