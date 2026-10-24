/**
 * R7-09: los «(s)» de los textos de /go-live se escriben con el plural que toca.
 * Ejecutar: node --test src/util/plurales.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { etiquetaCantidad, pluralizarParentesis, singular } from "./plurales.js";

describe("pluralizarParentesis", () => {
  it("los textos de Puesta en marcha", () => {
    assert.equal(pluralizarParentesis("2 sede(s)"), "2 sedes");
    assert.equal(pluralizarParentesis("6 doctor(es)"), "6 doctores");
    assert.equal(pluralizarParentesis("22 servicio(s)"), "22 servicios");
    assert.equal(pluralizarParentesis("28 bloque(s)"), "28 bloques");
  });
  it("1 en singular; 0 en plural", () => {
    assert.equal(pluralizarParentesis("1 sede(s)"), "1 sede");
    assert.equal(pluralizarParentesis("1 doctor(es)"), "1 doctor");
    assert.equal(pluralizarParentesis("0 plantilla(s)"), "0 plantillas");
    assert.equal(pluralizarParentesis("0 promo(s)"), "0 promos");
  });
  it("concuerda con el número que va antes, aunque haya otras palabras", () => {
    assert.equal(pluralizarParentesis("1 punto(s) obligatorio(s) pendiente(s)"), "1 punto obligatorio pendiente");
    assert.equal(pluralizarParentesis("Faltan 3 servicio(s) con precio(s)"), "Faltan 3 servicios con precios");
  });
  it("sin número, plural; textos sin «(s)» quedan igual", () => {
    assert.equal(pluralizarParentesis("Revisa la(s) sede(s)"), "Revisa las sedes");
    assert.equal(pluralizarParentesis("Activo (gpt-4o)"), "Activo (gpt-4o)");
    assert.equal(pluralizarParentesis("Conexión con WhatsApp correcta."), "Conexión con WhatsApp correcta.");
    assert.equal(pluralizarParentesis(null), null);
  });
});

describe("R8-05: singular del rótulo de las tablas", () => {
  it("«-es» tras consonante: 1 proveedor, no «1 proveedore»", () => {
    assert.equal(singular("proveedores"), "proveedor");
    assert.equal(singular("doctores"), "doctor");
    assert.equal(singular("planes"), "plan");
    assert.equal(singular("unidades"), "unidad");
    assert.equal(singular("materiales"), "material");
    assert.equal(singular("leyes"), "ley");
  });
  it("«-s» tras vocal y «-es» de palabras en «-e»", () => {
    for (const [p, s] of [["citas", "cita"], ["pacientes", "paciente"], ["comprobantes", "comprobante"], ["mensajes", "mensaje"], ["detalles", "detalle"], ["fases", "fase"], ["envíos", "envío"], ["reseñas", "reseña"], ["links", "link"], ["tickets", "ticket"]]) assert.equal(singular(p), s);
  });
  it("«-ones», «-iones», «-ines» y «-ces» recuperan el acento o la z", () => {
    assert.equal(singular("sillones"), "sillón");
    assert.equal(singular("liquidaciones"), "liquidación");
    assert.equal(singular("boletines"), "boletín");
    assert.equal(singular("veces"), "vez");
    assert.equal(singular("lápices"), "lápiz");
  });
  it("irregulares e invariables", () => {
    assert.equal(singular("órdenes"), "orden");
    assert.equal(singular("imágenes"), "imagen");
    assert.equal(singular("sedes"), "sede");
    assert.equal(singular("meses"), "mes");
    for (const w of ["caries", "análisis", "prótesis", "periodontitis", "virus", "lunes"]) assert.equal(singular(w), w);
    assert.equal(singular("menús"), "menú");
  });
  it("respeta la mayúscula inicial y deja igual lo que no está en plural", () => {
    assert.equal(singular("Proveedores"), "Proveedor");
    assert.equal(singular("Órdenes"), "Orden");
    assert.equal(singular("espera"), "espera");
    assert.equal(singular(""), "");
  });
  it("etiquetaCantidad: singular solo con 1, y la frase hasta la primera palabra que no concuerda", () => {
    assert.equal(etiquetaCantidad(1, "proveedores"), "proveedor");
    assert.equal(etiquetaCantidad(2, "proveedores"), "proveedores");
    assert.equal(etiquetaCantidad(0, "proveedores"), "proveedores");
    assert.equal(etiquetaCantidad(1, "odontólogos"), "odontólogo");
    assert.equal(etiquetaCantidad(1, "órdenes de compra"), "orden de compra");
    assert.equal(etiquetaCantidad(1, "citas de tus pacientes"), "cita de tus pacientes");
    assert.equal(etiquetaCantidad(1, "visitas completadas"), "visita completada");
    assert.equal(etiquetaCantidad(1, "pacientes nuevos este mes"), "paciente nuevo este mes");
    assert.equal(etiquetaCantidad(1, "en espera"), "en espera");
    assert.equal(etiquetaCantidad(1, "las citas de hoy"), "la cita de hoy");
  });
  it("sin rótulo: registro o registros", () => {
    assert.equal(etiquetaCantidad(1, ""), "registro");
    assert.equal(etiquetaCantidad(3, null), "registros");
  });
});
