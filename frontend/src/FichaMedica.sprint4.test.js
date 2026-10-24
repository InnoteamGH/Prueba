import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(root, "FichaMedica.jsx"), "utf8");

describe("Sprint 4 clínico — contrato fuente FichaMedica", () => {
  it("pieza odontograma ≥ 40×56", () => {
    assert.match(src, /width:\s*40,\s*height:\s*56/);
  });

  it("Extraer/Ausente piden confirmación destructiva", () => {
    assert.match(src, /WHOLE\.has\(estado\)/);
    assert.match(src, /window\.confirm\(`¿Marcar pieza como \$\{lbl\}\?/);
  });

  it("diálogo alergia: Revisar primario + Emitir outline + CTA alternativa", () => {
    assert.match(src, /Revisar la receta/);
    assert.match(src, /Emitir de todas formas/);
    assert.match(src, /Usar alternativa \(Clindamicina\)/);
    assert.match(src, /aplicarPlantilla\(alt\)/);
  });

  it("chips de alergia usan ChipAlergia", () => {
    assert.match(src, /import \{ ChipAlergia \} from "\.\/ui"/);
    assert.match(src, /<ChipAlergia key=\{a\}>/);
  });
});
