import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { itemsDeReceta, nombreItemReceta, indicacionItemReceta, posologiaItemReceta, nombreVisibleReceta, itemRecetaDesdeFormulario, listaItemsReceta, partirIndicaciones, textoIndicaciones } from "./recetaItems.js";

describe("recetaItems H-08: un solo esquema, se leen los dos formatos", () => {
  it("lee el formato de la ficha", () => {
    const r = { items: JSON.stringify([{ medicamento: "Ibuprofeno", presentacion: "400 mg", dosis: "1 tableta", frecuencia: "c/8 h", duracion: "3 días" }]) };
    const [it0] = itemsDeReceta(r);
    assert.equal(nombreItemReceta(it0), "Ibuprofeno 400 mg");
    assert.equal(indicacionItemReceta(it0), "1 tableta – c/8 h – 3 días");
  });

  it("lee el formato antiguo del módulo Recetas", () => {
    const r = { items: [{ med: "Paracetamol 500 mg", detalle: "c/8h – 3 días" }] };
    const [it0] = itemsDeReceta(r);
    assert.equal(nombreItemReceta(it0), "Paracetamol 500 mg");
    assert.equal(indicacionItemReceta(it0), "c/8h – 3 días");
  });

  it("sin ítems usa el texto libre y con JSON roto no falla", () => {
    assert.deepEqual(itemsDeReceta({ items: "{roto", texto: "Amoxicilina" }).map(nombreItemReceta), ["Amoxicilina"]);
    assert.deepEqual(itemsDeReceta({ items: "[]" }), []);
    assert.deepEqual(listaItemsReceta(null), []);
  });

  it("el formulario del módulo se guarda con el esquema de la ficha", () => {
    assert.deepEqual(itemRecetaDesdeFormulario({ med: " Amoxicilina ", dosis: "500 mg", frec: "c/8 h", dur: "7 días" }),
      { medicamento: "Amoxicilina", presentacion: "500 mg", dosis: "", frecuencia: "c/8 h", duracion: "7 días" });
  });

  it("M5-10: el formulario del módulo guarda presentación y dosis por separado", () => {
    assert.deepEqual(itemRecetaDesdeFormulario({ med: "Paracetamol", pres: "500 mg", dosis: " 1 tableta ", frec: "c/8 h", dur: "3 días" }),
      { medicamento: "Paracetamol", presentacion: "500 mg", dosis: "1 tableta", frecuencia: "c/8 h", duracion: "3 días" });
  });
});

describe("indicaciones con alerta de alergia", () => {
  const crudo = 'QA prueba [ALERTA ALERGIA — emitida con override] ["Ibuprofeno ↔ alergia a Aspirina (familia AINE)"]';
  it("separa el texto del médico de la alerta del servidor", () => {
    assert.deepEqual(partirIndicaciones(crudo), { texto: "QA prueba", alertas: ["Ibuprofeno ↔ alergia a Aspirina (familia AINE)"] });
  });
  it("sin alerta devuelve el texto tal cual", () => {
    assert.deepEqual(partirIndicaciones("Reposo 24 h"), { texto: "Reposo 24 h", alertas: [] });
  });
  it("el texto para mostrar o imprimir no lleva corchetes ni comillas", () => {
    assert.equal(textoIndicaciones(crudo), "QA prueba · Emitida pese a alerta de alergia: Ibuprofeno ↔ alergia a Aspirina (familia AINE).");
  });
  it("posología legible en pantalla", () => {
    assert.equal(posologiaItemReceta({ dosis: "1", frecuencia: "c/8h", duracion: "3 días" }), "Dosis 1 · cada 8 h · por 3 días");
    assert.equal(posologiaItemReceta({ dosis: "1 tableta", frecuencia: "c/ 12 horas", duracion: "" }), "1 tableta · cada 12 h");
    assert.equal(posologiaItemReceta({ detalle: "c/8h – 3 días" }), "cada 8 h · 3 días");
    assert.equal(nombreVisibleReceta({ medicamento: "paracetamol", presentacion: "pastilla" }), "Paracetamol pastilla");
  });
});
