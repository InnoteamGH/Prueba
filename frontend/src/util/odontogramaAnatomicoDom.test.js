import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, "../../public/odontograma-anatomico/index.html");

function parseConstArray(src, name) {
  const m = src.match(new RegExp(`const ${name}=\\[([^\\]]+)\\]`));
  assert.ok(m, `falta const ${name}`);
  return m[1].split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
}

describe("A-1 / A-2 odontograma anatómico HTML", () => {
  const src = fs.readFileSync(htmlPath, "utf8");

  it("define fdi() con punto (X.Y)", () => {
    assert.match(src, /function fdi\(n\)/);
    assert.match(src, /v\.charAt\(0\)\+'\.'\+v\.charAt\(1\)/);
  });

  it("asigna aria-label Pieza X.Y al dibujar", () => {
    assert.match(src, /'aria-label':'Pieza '\+fdi\(n\)/);
  });

  it("declara 52 piezas (32 permanentes + 20 temporales)", () => {
    const n =
      parseConstArray(src, "SUP_P").length +
      parseConstArray(src, "INF_P").length +
      parseConstArray(src, "SUP_T").length +
      parseConstArray(src, "INF_T").length;
    assert.equal(n, 52);
  });

  it("incluye puente hydrate bidireccional", () => {
    assert.match(src, /function hydrate\(/);
    assert.match(src, /dento-odontograma-hydrate/);
    assert.match(src, /parent\.postMessage/);
    assert.match(src, /seg-fase/);
    assert.match(src, /lastFase/);
  });

  it("conserva chrome .exp en bridge y rellena paciente real", () => {
    assert.match(src, /function applyPaciente\(/);
    assert.match(src, /\.exp-nom/);
    assert.doesNotMatch(src, /\.exp\{display:none/);
    assert.match(src, /dento-odontograma-nav/);
    assert.match(src, /data-bridge/);
    assert.match(src, /data-paciente-ready/);
    assert.match(src, /data-theme/);
    assert.match(src, /tema='dark'|theme = "dark"|theme !== "light"/);
    assert.doesNotMatch(src, /setAttribute\(['"]data-theme['"],\s*['"]light['"]\)/);
    assert.match(src, /body\{background:var\(--fondo\)!important\}/);
    assert.doesNotMatch(src, /<div class="exp-nom">Carlos Ruiz Mendoza<\/div>/);
  });
});
