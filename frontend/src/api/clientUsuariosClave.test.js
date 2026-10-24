/**
 * Decisión del cliente: la clave temporal la genera el servidor (alta y restablecer).
 * Ejecutar: node --test src/api/clientUsuariosClave.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const client = fs.readFileSync(path.join(dir, "client.js"), "utf8");
const app = fs.readFileSync(path.join(dir, "../App.jsx"), "utf8");

describe("usuarios: clave temporal del servidor", () => {
  it("api.usuarios.resetClave hace POST /usuarios/{id}/reset-clave", () => {
    assert.match(client, /resetClave:\s*\(id\)\s*=>\s*request\("POST",\s*`\/usuarios\/\$\{id\}\/reset-clave`\)/);
  });
  it("el alta no manda una clave generada en el navegador", () => {
    assert.doesNotMatch(app, /function claveTemporal\(/);
    assert.doesNotMatch(app, /api\.usuarios\.crear\(\{\s*\.\.\.payload,\s*password/);
    assert.match(app, /api\.usuarios\.crear\(payload\)/);
  });
  it("muestra la clave devuelta una sola vez y el aviso", () => {
    assert.match(app, /Entrégala al usuario; no se volverá a mostrar\./);
    assert.match(app, /api\.usuarios\.resetClave\(u\.id\)/);
    assert.match(app, /tienePermiso\("usuarios", "editar"\)/);
  });
  it("ya no dice que restablecer la clave no está disponible", () => {
    assert.doesNotMatch(app, /restablecimiento de clave de \$\{u\.nombre\} todavía no está disponible/);
  });
});
