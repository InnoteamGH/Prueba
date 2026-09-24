/**
 * SPEC UX v7 §15 — contratos fuente A26–A40.
 * Ejecutar: node --test src/spec-v7.matriz.test.js
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { layoutBarras, maxSerie, barraPct } from "./util/barras.js";
import { normalizarProduccionEsp, produccionPorEspecialidadEnRango } from "./util/produccionEsp.js";
import { sugeridoPedir, pctCoberturaBarra, estadoStock } from "./util/inventarioCalc.js";
import { precioMedioCatalogo } from "./util/serviciosCatalogo.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = fs.readFileSync(path.join(dir, "App.jsx"), "utf8");
const comun = fs.readFileSync(path.join(dir, "comun.jsx"), "utf8");
const reportes = fs.readFileSync(path.join(dir, "modulos/Reportes.jsx"), "utf8");

describe("A26 — menú sin duplicados", () => {
  it("NAV_GRUPOS incluye espera y comisiones top-level (NAV-01 revision2)", () => {
    const start = app.indexOf("const NAV_GRUPOS = [");
    assert.ok(start >= 0, "NAV_GRUPOS start");
    const end = app.indexOf("const NAV = NAV_GRUPOS", start);
    assert.ok(end > start, "NAV flatten");
    const block = app.slice(start, end);
    assert.match(block, /\{ id: "espera", label: "Lista de espera", icon:/);
    // NAV-11 (revision5): "Producción y comisiones" cubre comisiones sin menú duplicado
    // Producción y comisiones puede ser entrada directa o grupo con submódulos (Resumen/Ausentismo).
    assert.match(block, /(?:\{ id: "comisiones", label: "Comisiones", icon:|\{ id: "reportes", label: "Producción y comisiones", icon:|\{ label: "Producción y comisiones", icon: \w+, children: \[\s*\{ id: "reportes")/);
    assert.equal((block.match(/label: "Producción y comisiones"/g) || []).length, 1, "una sola entrada de Producción y comisiones");
    assert.match(block, /id: "dashboard"/);
    assert.match(block, /id: "odontograma"/);
    assert.match(block, /id: "perio"/);
    assert.match(block, /id: "tratamientos"/);
    assert.match(block, /id: "recetas"/);
    assert.match(block, /id: "consentimientos"/);
    assert.match(block, /id: "radiografias"/);
  });
});

describe("A29–A32 — barras honestas", () => {
  it("layoutBarras: ceros sin dibujar; max de serie; [7,14,3] escala a 14", () => {
    const a = layoutBarras([0, 0, 5, 2500]);
    assert.equal(a[0].dibujar, false);
    assert.equal(a[1].dibujar, false);
    assert.equal(maxSerie([7, 14, 3]), 14);
    const w = layoutBarras([7, 14, 3]);
    assert.equal(w[1].pct, 100);
    assert.ok(w[1].pct <= 100);
    assert.ok(w[0].pct <= 100);
  });
  it("MiniBar / Reportes sin gradient en fill de barra de datos", () => {
    assert.match(app, /layoutBarras/);
    assert.match(reportes, /layoutBarras/);
    assert.doesNotMatch(reportes, /Math\.max\(4,\s*h\)/);
    assert.doesNotMatch(reportes, /linear-gradient\(180deg,var\(--dc-ok\)/);
    assert.doesNotMatch(reportes, /v \/ base \* 100/);
  });
});

describe("A27 — producción especialidad", () => {
  it("misma fixture → mismo mapa", () => {
    const rows = [
      { especialidad: "Endodoncia", produccion: 660, atendidas: 3 },
      { especialidad: "Endodoncia", produccion: 0, atendidas: 0 },
    ];
    const a = normalizarProduccionEsp(rows);
    const b = normalizarProduccionEsp(rows);
    assert.deepEqual(a, b);
    assert.equal(a[0].produccion, 660);
  });
  it("rango filtra citas", () => {
    const citas = [
      { fecha: "2026-09-01", estado: "atendida", especialidad: "OG", precio: 100 },
      { fecha: "2026-08-01", estado: "atendida", especialidad: "OG", precio: 50 },
    ];
    const r = produccionPorEspecialidadEnRango(citas, { desde: "2026-09-01", hasta: "2026-09-30" });
    assert.equal(r[0].produccion, 100);
    assert.equal(r[0].atendidas, 1);
  });
  it("gerencial no ordena rentab por defecto", () => {
    assert.match(app, /PanelGerencial/);
    assert.doesNotMatch(app, /ORDEN_GERENCIA = \[[^\]]*rentab/);
  });
});

describe("A33 — dc-kpi__icon en Hoy", () => {
  // El resumen de Hoy es ahora una franja única de cifras (sin iconos gigantes).
  it("Agenda resumen usa la cabecera del día", () => {
    assert.match(app, /className="dc-ag-hero"/);
    assert.doesNotMatch(app, /width: 76, height: 76/);
  });
});

describe("A35–A36 — inventario", () => {
  it("Barbijos 30/min20 con cobertura alta → pedir 0; barra no satura al mínimo", () => {
    const barbijos = { stock: 30, min: 20, dia: 1 };
    assert.equal(estadoStock(barbijos), "ok");
    assert.equal(sugeridoPedir(barbijos), 0);
    const guantes = { stock: 24, min: 10, dia: 1 };
    assert.equal(sugeridoPedir(guantes), 0);
    const fresas = { stock: 0, min: 10, dia: 1 };
    assert.ok(sugeridoPedir(fresas) > 0);
    assert.ok(pctCoberturaBarra({ stock: 15, min: 10 }) < 100);
    assert.equal(pctCoberturaBarra({ stock: 20, min: 10 }), 100);
  });
  it("App no muestra Urgentes y Por reponer como KPIs hermanos", () => {
    assert.doesNotMatch(app, /label="Urgentes/);
    assert.doesNotMatch(app, /label="Por reponer"/);
    // Un solo indicador de reposición (ahora en la franja de Inventario).
    assert.match(app, /insumos requieren compra/);
  });
});

describe("A37 — precio medio limpio", () => {
  it("excluye S/ 0 e inactivos", () => {
    const { media, n } = precioMedioCatalogo([
      { monto: 0, nombre: "Test" },
      { monto: 100, activo: false },
      { monto: 140 },
      { monto: 160 },
    ]);
    assert.equal(n, 2);
    assert.equal(media, 150);
  });
});

describe("A38–A39 — modal anatomía", () => {
  it("Modal: maxHeight 680/88vh + size prop", () => {
    assert.match(comun, /min\(680px,\s*88vh\)/);
    assert.match(comun, /MODAL_SIZE/);
    assert.match(comun, /size/);
    assert.match(comun, /role="dialog"/);
    assert.match(comun, /aria-modal="true"/);
  });
});

describe("barraPct helper", () => {
  it("valor 0 no dibuja", () => {
    assert.deepEqual(barraPct(0, 100), { dibujar: false, pct: 0 });
  });
});
