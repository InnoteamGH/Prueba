/**
 * Matriz I/O BvFnLL-P — contratos fuente (Cobrar, barras 0%, DataTable 25).
 * Ejecutar: node --test src/sprint0.matriz.test.js
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = fs.readFileSync(path.join(dir, "App.jsx"), "utf8");
const comun = fs.readFileSync(path.join(dir, "comun.jsx"), "utf8");
const tokens = fs.readFileSync(path.join(dir, "estilos/tokens.css"), "utf8");
const ui = fs.readFileSync(path.join(dir, "ui/ui.css"), "utf8");

describe("Matriz — Cobrar sin caja", () => {
  it("botones Cobrar usan disabled={!cajaAbierta}", () => {
    assert.match(app, /disabled=\{!cajaAbierta\}[^>]*>[\s\S]{0,80}Cobrar/);
    assert.match(app, /jornadaAbiertaPrevia\?\.id \? "historial"/);
  });
});

describe("Matriz — barra 0%", () => {
  it("panel gerencial y util no pintan pista vacía; sin Math.max cosmético 6|12", () => {
    const pgUtil = fs.readFileSync(path.join(dir, "modulos/panelGerencialUtil.js"), "utf8");
    const pg = fs.readFileSync(path.join(dir, "modulos/PanelGerencial.jsx"), "utf8");
    assert.match(pgUtil, /dibujar:\s*false/);
    assert.match(pgUtil, /layoutProgreso/);
    assert.match(pg, /data-w|!\s*lay\.dibujar|className=\{`fila\$\{lay\.dibujar/);
    assert.match(pg, /layoutProgreso|layoutBarrasTotal/);
    assert.doesNotMatch(app, /Math\.max\(\s*6\s*,/);
    assert.doesNotMatch(app, /Math\.max\(\s*12\s*,\s*pct/);
  });
});

describe("Matriz — DataTable paginación 25", () => {
  it("pageSize=25 + Cargar más", () => {
    assert.match(comun, /pageSize = 25/);
    assert.match(comun, /Cargar más/);
    assert.match(comun, /setVisible\(\(n\) => n \+ pageSize\)/);
  });
});

describe("Sprint 0 — densidad táctil por rol", () => {
  it("no hay button{min-height} global; sí .dc-col-sort::after", () => {
    assert.doesNotMatch(tokens, /button\s*,\s*\.dc-btn/);
    assert.match(ui, /\.dc-col-sort::after/);
    assert.match(comun, /className="dc-col-sort"/);
  });
});
