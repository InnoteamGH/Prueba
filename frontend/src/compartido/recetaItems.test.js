import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { itemsDeReceta, nombreItemReceta, indicacionItemReceta, itemRecetaDesdeFormulario, listaItemsReceta } from "./recetaItems.js";

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
});
