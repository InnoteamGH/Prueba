/**
 * R7-06: Auditoría busca por el nombre del usuario afectado (el evento solo trae su correo).
 * Ejecutar: node --test src/util/auditoriaUsuarios.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detalleConNombres, directorioUsuarios, nombrePorCorreo, usuarioAfectado } from "./auditoriaUsuarios.js";

const dir = directorioUsuarios([
  { id: "009b137e", nombre: "QA Usuario R7", email: "qa.r7+20261012@sonrie.pe" },
  { id: "u2", nombre: "Teresa Aroni", email: "Admin.Surco@sonrie.pe" },
  { id: "u3", nombre: "", email: "sin.nombre@sonrie.pe" },
]);

describe("detalleConNombres", () => {
  it("pone el nombre junto al correo: así se encuentra buscando «QA Usuario R7»", () => {
    assert.equal(detalleConNombres("Alta de usuario qa.r7+20261012@sonrie.pe", dir), "Alta de usuario QA Usuario R7 (qa.r7+20261012@sonrie.pe)");
  });
  it("el correo se compara sin mayúsculas; los desconocidos quedan igual", () => {
    assert.equal(detalleConNombres("Cambio de usuario admin.surco@sonrie.pe", dir), "Cambio de usuario Teresa Aroni (admin.surco@sonrie.pe)");
    assert.equal(detalleConNombres("Baja de usuario otro@sonrie.pe", dir), "Baja de usuario otro@sonrie.pe");
    assert.equal(detalleConNombres("Alta de usuario sin.nombre@sonrie.pe", dir), "Alta de usuario sin.nombre@sonrie.pe");
  });
  it("no repite el nombre ni anida paréntesis", () => {
    assert.equal(detalleConNombres("QA Usuario R7 (qa.r7+20261012@sonrie.pe) desactivado", dir), "QA Usuario R7 (qa.r7+20261012@sonrie.pe) desactivado");
    assert.equal(detalleConNombres("Alta (qa.r7+20261012@sonrie.pe)", dir), "Alta (qa.r7+20261012@sonrie.pe)");
  });
  it("sin directorio (rol sin permiso de usuarios): el texto tal cual", () => {
    assert.equal(detalleConNombres("Alta de usuario qa.r7+20261012@sonrie.pe", null), "Alta de usuario qa.r7+20261012@sonrie.pe");
  });
});

describe("usuarioAfectado y nombrePorCorreo", () => {
  it("por el id del registro o por el correo del detalle", () => {
    assert.equal(usuarioAfectado({ registroId: "009b137e", detalle: "—" }, dir), "QA Usuario R7");
    assert.equal(usuarioAfectado({ detalle: "Baja de usuario ADMIN.SURCO@sonrie.pe" }, dir), "Teresa Aroni");
    assert.equal(usuarioAfectado({ detalle: "Inicio de sesión" }, dir), null);
  });
  it("el actor que llega como correo se muestra con su nombre", () => {
    assert.equal(nombrePorCorreo("qa.r7+20261012@sonrie.pe", dir), "QA Usuario R7");
    assert.equal(nombrePorCorreo("Roberto Díaz", dir), null);
  });
});
