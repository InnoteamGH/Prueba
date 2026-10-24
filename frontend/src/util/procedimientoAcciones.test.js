/**
 * Decisión del cliente: el médico no borra procedimientos, los anula (con motivo); un
 * terminado solo lo anula el administrador general; «Eliminar» solo con tratamientos:eliminar.
 * Ejecutar: node --test src/util/procedimientoAcciones.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accionesProcedimiento, cuerpoAnulacion, motivoAnulacionValido } from "./procedimientoAcciones.js";

const medico = { rol: "medico", puedeEditar: true, puedeEliminar: false };
const admin = { rol: "admin", puedeEditar: true, puedeEliminar: true };

describe("accionesProcedimiento", () => {
  it("el médico anula uno no terminado y nunca elimina", () => {
    assert.deepEqual(accionesProcedimiento({ estado: "pendiente" }, medico), { anular: true, eliminar: false });
    assert.deepEqual(accionesProcedimiento({ estado: "en_curso" }, medico), { anular: true, eliminar: false });
  });
  it("un terminado solo lo anula el administrador general", () => {
    assert.equal(accionesProcedimiento({ estado: "terminada" }, medico).anular, false);
    assert.equal(accionesProcedimiento({ estado: "terminada" }, { ...medico, rol: "admin_sede" }).anular, false);
    assert.equal(accionesProcedimiento({ estado: "terminada" }, admin).anular, true);
  });
  it("«Eliminar» solo con el permiso de eliminar", () => {
    assert.equal(accionesProcedimiento({ estado: "pendiente" }, admin).eliminar, true);
    assert.equal(accionesProcedimiento({ estado: "pendiente" }, { rol: "admin", puedeEditar: true }).eliminar, false);
  });
  it("pagado o ya anulado: nada", () => {
    assert.deepEqual(accionesProcedimiento({ estado: "atendida" }, admin), { anular: false, eliminar: false });
    assert.deepEqual(accionesProcedimiento({ estado: "anulado" }, admin), { anular: false, eliminar: false });
    assert.deepEqual(accionesProcedimiento(null, admin), { anular: false, eliminar: false });
  });
  it("sin permiso de editar no anula", () => {
    assert.equal(accionesProcedimiento({ estado: "pendiente" }, { rol: "recepcion" }).anular, false);
  });
});

describe("motivo de la anulación", () => {
  it("obligatorio, con texto suficiente", () => {
    assert.equal(motivoAnulacionValido(""), null);
    assert.equal(motivoAnulacionValido("  no "), null);
    assert.equal(motivoAnulacionValido("  El paciente   no aceptó "), "El paciente no aceptó");
  });
  it("cuerpo del PATCH", () => {
    assert.deepEqual(cuerpoAnulacion(" Cambio de plan "), { estado: "anulado", motivo: "Cambio de plan" });
  });
});
