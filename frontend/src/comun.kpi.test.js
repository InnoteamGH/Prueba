import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "comun.jsx"), "utf8");

describe("UX-19 KpiCard — contrato fuente", () => {
  it("estado error no reutiliza value numérico (muestra — + No se pudo cargar)", () => {
    assert.match(src, /st === "error"/);
    assert.match(src, /No se pudo cargar/);
    assert.match(src, /shown = "—"/);
  });

  it("cargando usa dc-kpi__skel", () => {
    assert.match(src, /dc-kpi__skel/);
    assert.match(src, /st === "cargando"/);
  });

  it("onClick solo en dato/vacio", () => {
    assert.match(src, /st === "dato" \|\| st === "vacio"/);
  });

  it("kind peligro mapea a dc-btn--peligro", () => {
    assert.match(src, /peligro:\s*"dc-btn--peligro"/);
  });
});
