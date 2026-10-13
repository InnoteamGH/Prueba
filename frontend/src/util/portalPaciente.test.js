/**
 * R8-02 / R8-03: el portal del paciente no afirma lo que el resumen no trae y dice dónde reservar.
 * Ejecutar: node --test src/util/portalPaciente.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contactosReserva, planDelResumen } from "./portalPaciente.js";

describe("planDelResumen (R8-02)", () => {
  it("el resumen de hoy (citas, paciente, totales y pagos): plan, saldo y odontograma no disponibles", () => {
    const r = { citas: [], paciente: { id: "p1", nombre: "Rosa Linares" }, totalInvertido: 200, totalAhorrado: 95, pagos: [] };
    assert.deepEqual(planDelResumen(r), { fases: null, saldo: null, odontograma: null, nombrePlan: null });
    assert.deepEqual(planDelResumen(null), { fases: null, saldo: null, odontograma: null, nombrePlan: null });
  });
  it("si el servidor manda el plan, se usa: fases (sin las anuladas), estados hechos y saldo", () => {
    const r = { plan: { nombre: "Rehabilitación oral", saldo: 800, fases: [
      { id: "f1", nombre: "Evaluación", costo: 200, estado: "terminado" },
      { id: "f2", nombre: "Corona · pieza 36", costo: "500", estado: "pendiente" },
      { id: "f3", servicio: "Provisional", precio: 300, estado: "en_proceso" },
      { id: "f4", nombre: "Anulada", costo: 99, estado: "cancelada" },
    ] } };
    const p = planDelResumen(r);
    assert.equal(p.nombrePlan, "Rehabilitación oral");
    assert.equal(p.saldo, 800);
    assert.deepEqual(p.fases.map((f) => [f.id, f.nombre, f.costo, f.estado]), [
      ["f1", "Evaluación", 200, "atendida"], ["f2", "Corona · pieza 36", 500, "pendiente"], ["f3", "Provisional", 300, "en_proceso"],
    ]);
  });
  it("un plan vacío del servidor sí es «sin plan» (fases: []), y saldo 0 es un dato", () => {
    const p = planDelResumen({ fases: [], saldoPendiente: 0, odontograma: {} });
    assert.deepEqual(p.fases, []);
    assert.equal(p.saldo, 0);
    assert.deepEqual(p.odontograma, {});
  });
  it("planes como lista: se juntan sus fases", () => {
    const p = planDelResumen({ planes: [{ nombre: "A", fases: [{ id: 1, nombre: "x", costo: 1, estado: "atendida" }] }, { nombre: "B", fases: [{ id: 2, nombre: "y", costo: 2 }] }] });
    assert.deepEqual(p.fases.map((f) => f.id), [1, 2]);
    assert.equal(p.fases[1].estado, "pendiente");
    assert.equal(p.nombrePlan, "A");
  });
  it("un saldo que no es número no cuenta", () => {
    assert.equal(planDelResumen({ saldo: "—" }).saldo, null);
    assert.equal(planDelResumen({ saldo: "" }).saldo, null);
  });
});

describe("contactosReserva (R8-03)", () => {
  const sedes = [
    { id: "a1", nombre: "Sede San Isidro", telefono: "01 234 5678", whatsappNumero: null },
    { id: "a2", nombre: "Sede Surco", telefono: "", whatsappNumero: "+51987654321" },
    { id: "a3", nombre: "Sede cerrada", telefono: "01 999 9999", activa: false },
  ];
  it("los de la sede del paciente", () => {
    const c = contactosReserva({ sedes, sedeId: "a2" });
    assert.equal(c.length, 1);
    assert.equal(c[0].nombre, "Sede Surco");
    assert.equal(c[0].whatsappTexto, "+51 987 654 321");
    assert.equal(c[0].whatsappUrl, "https://wa.me/51987654321");
    assert.equal(c[0].telefono, "");
  });
  it("sin sede del paciente (o sin números en ella): los de la clínica y, si no, los de cada sede activa", () => {
    assert.deepEqual(contactosReserva({ clinica: { nombre: "Sonríe", telefono: "01 700 0000" }, sedes, sedeId: null }).map((c) => [c.nombre, c.telefono]), [["Sonríe", "01 700 0000"]]);
    assert.deepEqual(contactosReserva({ sedes }).map((c) => c.nombre), ["Sede San Isidro", "Sede Surco"]);
    assert.deepEqual(contactosReserva({ sedes: [{ id: "a9", nombre: "X" }, ...sedes], sedeId: "a9" }).map((c) => c.nombre), ["Sede San Isidro", "Sede Surco"]);
  });
  it("varias sedes con el mismo número salen en una sola fila", () => {
    const c = contactosReserva({ sedes: [{ id: 1, nombre: "Sede A", whatsapp: "987654321" }, { id: 2, nombre: "Sede B", whatsappNumero: "+51 987 654 321" }] });
    assert.equal(c.length, 1);
    assert.equal(c[0].nombre, "Sede A y Sede B");
  });
  it("sin números: lista vacía (el aviso sale sin número)", () => {
    assert.deepEqual(contactosReserva({ sedes: [{ id: 1, nombre: "Sede A" }] }), []);
    assert.deepEqual(contactosReserva(), []);
  });
});
