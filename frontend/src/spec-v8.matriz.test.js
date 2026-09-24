/**
 * Anti-regresión SPEC UX v8 §16 (verificación 09:14) — A15–A17, A23–A24, A30, A33, A36, SRV-01/02, INV-01.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { layoutProgreso } from "./util/progreso.js";
import { margenCatalogo } from "./util/serviciosCatalogo.js";

const root = dirname(fileURLToPath(import.meta.url));
const app = readFileSync(join(root, "App.jsx"), "utf8");
const comun = readFileSync(join(root, "comun.jsx"), "utf8");
const uiCss = readFileSync(join(root, "ui/ui.css"), "utf8");
const kpi = readFileSync(join(root, "ui/TarjetaKPI.jsx"), "utf8");
const reportes = readFileSync(join(root, "modulos/Reportes.jsx"), "utf8");

describe("SPEC v8 A23 jerarquía", () => {
  // Un solo h1 por pantalla: el nombre del módulo en la cabecera de la app.
  // ModHead y el lienzo del dashboard no repiten otro h1 debajo.
  it("la cabecera de la app pinta el h1 con el nombre del módulo", () => {
    assert.match(app, /<h1 style=\{\{[^}]*\}\}>\{NAV\.find\(\(n\) => n\.id === vista\)\?\.label\}<\/h1>/);
  });
  it("ModHead y DashLienzo no repiten un h1", () => {
    assert.doesNotMatch(comun, /export const ModHead[\s\S]*?<h1/);
    assert.match(comun, /<h2 className="dc-title"[\s\S]*?>\{titulo\}<\/h2>/);
  });
  it("Facturación y Reportes tienen ModHead / h1 de pantalla", () => {
    assert.match(app, /titulo="Facturación y caja"/);
    assert.match(reportes, /titulo="Producción y comisiones"/);
  });
});

describe("SPEC v8 A24 wrap 2 líneas", () => {
  it("cabeceras de tabla permiten 2 líneas", () => {
    assert.match(comun, /WebkitLineClamp:\s*2/);
  });
});

describe("SPEC v8 A17 progreso honesto", () => {
  it("layoutProgreso: 0 no dibuja; <5 solo texto", () => {
    assert.deepEqual(layoutProgreso(0), { dibujar: false, soloTexto: false, pct: 0 });
    assert.equal(layoutProgreso(3).soloTexto, true);
    assert.equal(layoutProgreso(40).dibujar, true);
  });
  it("App usa layoutProgreso", () => {
    assert.match(app, /layoutProgreso/);
  });
});

describe("SPEC v8 A30 acciones compactas", () => {
  it("dc-row-action 32 + hit expandido", () => {
    assert.match(uiCss, /\.dc-row-action\s*\{/);
    assert.match(uiCss, /width:\s*32px/);
    assert.match(uiCss, /\.dc-row-action::after/);
  });
  it("Pacientes usa dc-row-action", () => {
    assert.match(app, /className="dc-row-action"/);
    assert.match(app, /w: "148px"/);
  });
});

describe("SPEC v8 A15/A36 gerencial densididad", () => {
  it("Dashboard gerencial usa PanelGerencial (sustituye lienzo de widgets)", () => {
    assert.match(comun, /dash7_/);
    assert.match(app, /PanelGerencial/);
    assert.match(app, /function Gerencial\([\s\S]{0,400}PanelGerencial/);
  });
});

describe("SPEC v8 A16 altura máxima", () => {
  it("DataTable acepta maxHeight y Pacientes/Usuarios lo usan", () => {
    assert.match(comun, /maxHeight/);
    assert.match(app, /Directorio de pacientes[\s\S]{0,120}maxHeight=\{560\}/);
    assert.match(app, /Directorio de usuarios[\s\S]{0,80}maxHeight=\{560\}/);
  });
});

describe("SPEC v8 A33 KPI plano", () => {
  it("KpiCard y TarjetaKPI sin linear-gradient en icono", () => {
    assert.match(comun, /dc-kpi__icon" style=\{\{ background: tint\(/);
    assert.doesNotMatch(comun, /dc-kpi__icon" style=\{\{ background: `linear-gradient/);
    assert.doesNotMatch(kpi, /linear-gradient\(135deg, \$\{tint/);
  });
});

describe("SPEC v8 INV-01 cobertura nombra insumo", () => {
  it("KPI cobertura incluye nombre", () => {
    assert.match(app, /covMinInsumo/);
    assert.match(app, /~\$\{covMinHoy\} d · \$\{covMinInsumo\.nombre\}/);
  });
});

describe("SPEC v8 SRV-01/02 servicios API", () => {
  it("payload incluye campos operativos y sin aviso localStorage", () => {
    assert.match(app, /costeDirecto:/);
    assert.match(app, /areaClinica:/);
    assert.match(app, /duracionMin:/);
    assert.doesNotMatch(app, /se conservan en este navegador/);
  });
  it("margenCatalogo no inventa margen sin coste", () => {
    assert.equal(margenCatalogo({ monto: 220, coste: 0 }), null);
    assert.equal(margenCatalogo({ monto: 220, coste: 40 }), 180);
  });
  it("migración especialidad existe", () => {
    const mig = readFileSync(join(root, "../../supabase/migrations/0062_especialidad_catalogo_completo.sql"), "utf8");
    assert.match(mig, /duracion_min/);
    assert.match(mig, /coste_directo/);
    assert.match(mig, /area_clinica/);
  });
});
