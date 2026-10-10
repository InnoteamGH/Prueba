/**
 * UX-22: tint helper — never concatenate hex alpha onto CSS vars.
 * Ejecutar: node --test src/comun.color.test.js
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, "comun.jsx"), "utf8");

// Extrae la función tint del fuente sin cargar React/JSX.
function loadTint() {
  const m = src.match(/export const tint = \(c, a = 0\.12\) =>\s*`color-mix\(in srgb, \$\{c\} \$\{Math\.round\(Number\(a\) \* 100\)\}%, transparent\)`;/);
  assert.ok(m, "tint export presente en comun.jsx");
  // eslint-disable-next-line no-new-func
  return new Function("c", "a = 0.12", "return `color-mix(in srgb, ${c} ${Math.round(Number(a) * 100)}%, transparent)`");
}

describe("UX-22 tint", () => {
  const tint = loadTint();

  it("usa color-mix con porcentaje (mapa 05/1a/20/30/66/CC)", () => {
    assert.equal(tint("var(--dc-brand-mid)", 0.03), "color-mix(in srgb, var(--dc-brand-mid) 3%, transparent)");
    assert.equal(tint("var(--dc-brand-mid)", 0.1), "color-mix(in srgb, var(--dc-brand-mid) 10%, transparent)");
    assert.equal(tint("var(--dc-brand-mid)", 0.12), "color-mix(in srgb, var(--dc-brand-mid) 12%, transparent)");
    assert.equal(tint("var(--dc-brand-mid)", 0.19), "color-mix(in srgb, var(--dc-brand-mid) 19%, transparent)");
    assert.equal(tint("var(--dc-brand-mid)", 0.4), "color-mix(in srgb, var(--dc-brand-mid) 40%, transparent)");
    assert.equal(tint("var(--dc-brand-mid)", 0.8), "color-mix(in srgb, var(--dc-brand-mid) 80%, transparent)");
  });

  it("KpiCard no concatena hex alfa a color", () => {
    assert.match(src, /tint\(color/);
    assert.doesNotMatch(src, /\$\{color\}[0-9A-Fa-f]{2}/);
    assert.doesNotMatch(src, /color \+ ["'][0-9A-Fa-f]{2}/);
  });

  it("tonoAviso marca justificación/obligatoria como error", () => {
    assert.match(src, /obligatori\|justificaci\[oó\]n/);
  });
});

describe("UX-22 anti-regresión fuente", () => {
  it("frontend/src sin concatenación var(--dc-…)HH ni ${…}HH de color", () => {
    const root = path.join(dir);
    const bad = [];
    const walk = (d) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (/\.(jsx?)$/.test(ent.name) && !ent.name.endsWith(".test.js") && !ent.name.includes("fix-ux22")) {
          const t = fs.readFileSync(p, "utf8");
          const re = /\$\{[^}]+\}[0-9A-Fa-f]{2}(?![0-9A-Fa-f])|var\(--dc-[^)]+\)[0-9A-Fa-f]{2}/g;
          let m;
          while ((m = re.exec(t))) {
            // falsos positivos CSS keyframes: {opacity:.25} no aplica; ${…} en keyframes raro
            const line = t.slice(0, m.index).split("\n").length;
            const snippet = m[0];
            if (/opacity|keyframes|@media/.test(t.split("\n")[line - 1] || "")) continue;
            bad.push(`${path.relative(root, p)}:${line}:${snippet}`);
          }
        }
      }
    };
    walk(root);
    assert.deepEqual(bad, [], `residuales alfa: ${bad.join("; ")}`);
  });
});
