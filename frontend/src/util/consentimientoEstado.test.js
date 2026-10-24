/**
 * Un consentimiento firmado no se borra: se anula con motivo. En GET /consentimientos el
 * servidor no envía `anulado` ni `motivoAnulacion`: se reconoce por el título «[ANULADO] …»
 * y por las líneas «[Anulado: …]» del contenido. Un anulado no está por firmar.
 * Ejecutar: node --test src/util/consentimientoEstado.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contenidoSinMarcas, esAnulado, estadoConsentimiento, motivoAnulacion, tituloLimpio, validarMotivoAnulacion } from "./consentimientoEstado.js";

// Como llega en la lista después de anular uno firmado.
const anuladoLista = { id: "c1", tipo: null, titulo: "[ANULADO] Endodoncia", firmado: false, anulado: null, motivoAnulacion: null, contenido: "Texto del consentimiento.\nDeclaro que…\n\n[Anulado: Se firmó con el paciente equivocado]" };

describe("esAnulado", () => {
  it("por la bandera del servidor o por el prefijo del título", () => {
    assert.equal(esAnulado({ anulado: true, titulo: "Endodoncia" }), true);
    assert.equal(esAnulado(anuladoLista), true);
    assert.equal(esAnulado({ titulo: "[anulado] Ortodoncia" }), true);
  });
  it("sin bandera ni prefijo no lo está", () => {
    assert.equal(esAnulado({ titulo: "Endodoncia", firmado: true }), false);
    assert.equal(esAnulado({ titulo: "Endodoncia [ANULADO]" }), false);
    assert.equal(esAnulado({ anulado: false }), false);
    assert.equal(esAnulado(null), false);
  });
});

describe("estadoConsentimiento", () => {
  it("anulado gana a firmado y a pendiente", () => {
    assert.equal(estadoConsentimiento(anuladoLista), "anulado");
    assert.equal(estadoConsentimiento({ anulado: true, firmado: true }), "anulado");
  });
  it("firmado o pendiente", () => {
    assert.equal(estadoConsentimiento({ titulo: "Exodoncia", firmado: true }), "firmado");
    assert.equal(estadoConsentimiento({ titulo: "Exodoncia", firmado: false }), "pendiente");
    assert.equal(estadoConsentimiento({}), "pendiente");
  });
});

describe("motivoAnulacion", () => {
  it("el del servidor si viene", () => {
    assert.equal(motivoAnulacion({ motivoAnulacion: " Paciente equivocado ", contenido: "x\n[Anulado: otro]" }), "Paciente equivocado");
  });
  it("si no, el último «[Anulado: X]» del contenido", () => {
    assert.equal(motivoAnulacion(anuladoLista), "Se firmó con el paciente equivocado");
    assert.equal(motivoAnulacion({ contenido: "x\n[Anulado: primero]\n[Anulado: segundo [ver acta]]" }), "segundo [ver acta]");
  });
  it("sin motivo: cadena vacía", () => {
    assert.equal(motivoAnulacion({ contenido: "x\n[Anulado]" }), "");
    assert.equal(motivoAnulacion({ contenido: "Texto" }), "");
    assert.equal(motivoAnulacion(null), "");
  });
});

describe("tituloLimpio", () => {
  it("quita el prefijo «[ANULADO] »", () => {
    assert.equal(tituloLimpio(anuladoLista), "Endodoncia");
    assert.equal(tituloLimpio({ titulo: "[anulado]  Cirugía / implante" }), "Cirugía / implante");
    assert.equal(tituloLimpio("[ANULADO] Ortodoncia"), "Ortodoncia");
  });
  it("como antes, el tipo va primero; sin prefijo no cambia", () => {
    assert.equal(tituloLimpio({ tipo: "Exodoncia (extracción)", titulo: "[ANULADO] Exodoncia (extracción)" }), "Exodoncia (extracción)");
    assert.equal(tituloLimpio({ titulo: "Endodoncia" }), "Endodoncia");
    assert.equal(tituloLimpio({}), "");
  });
});

describe("contenidoSinMarcas", () => {
  it("quita las líneas finales «[Anulado]» / «[Anulado: …]»", () => {
    assert.equal(contenidoSinMarcas(anuladoLista.contenido), "Texto del consentimiento.\nDeclaro que…");
    assert.equal(contenidoSinMarcas("Texto\n[Anulado]\n[Anulado: dos veces]\n"), "Texto");
    assert.equal(contenidoSinMarcas("Texto\r\n\r\n[Anulado]"), "Texto");
  });
  it("lo demás queda igual", () => {
    assert.equal(contenidoSinMarcas("Texto\n\n"), "Texto\n\n");
    assert.equal(contenidoSinMarcas("[Anulado] en medio\nTexto"), "[Anulado] en medio\nTexto");
    assert.equal(contenidoSinMarcas(null), "");
    assert.equal(contenidoSinMarcas("[Anulado: solo la marca]"), "");
  });
});

describe("validarMotivoAnulacion", () => {
  it("obligatorio, con al menos 5 caracteres que no sean espacios", () => {
    assert.match(validarMotivoAnulacion(""), /motivo/);
    assert.match(validarMotivoAnulacion("   "), /motivo/);
    assert.match(validarMotivoAnulacion(" a b c d "), /5 caracteres/);
    assert.equal(validarMotivoAnulacion("a b c d e"), "");
    assert.equal(validarMotivoAnulacion("Paciente equivocado"), "");
  });
});
