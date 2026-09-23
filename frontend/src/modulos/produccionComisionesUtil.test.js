import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acumularCobros,
  ausentismoPorOdontologo,
  layoutRinde,
  marcaMediaPct,
  resumenAusentismoClinica,
  techoRinde,
  UMBRAL_AUSENTISMO,
} from "./produccionComisionesUtil.js";
import { layoutProgreso } from "./panelGerencialUtil.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("frontera P16 — Caja del día sin métricas de periodo", () => {
  it("PanelGerencial no pinta Cobrado 6 m ni Tasa de cobro", () => {
    const src = fs.readFileSync(path.join(__dirname, "PanelGerencial.jsx"), "utf8");
    assert.ok(!src.includes("Cobrado 6 m"), "no debe mostrar Cobrado 6 m");
    assert.ok(!src.includes("Tasa de cobro"), "no debe mostrar Tasa de cobro");
    assert.ok(src.includes("Cobrado hoy"), "sigue mostrando cobrado hoy");
  });

  it("ProduccionComisiones no incluye WhatsApp ni especialidad 6m de clínica", () => {
    const src = fs.readFileSync(path.join(__dirname, "ProduccionComisiones.jsx"), "utf8");
    assert.ok(!/Captación por WhatsApp/i.test(src));
    assert.ok(!/Producción por especialidad/i.test(src));
    assert.ok(!/Ausentismo histórico/i.test(src));
    assert.ok(src.includes("Pendiente de liquidar"));
    assert.ok(src.includes("sin dato"));
  });
});

describe("barras honestas — producción y rinde", () => {
  it("parte del total 560/1500 ≈ 37%", () => {
    const lay = layoutProgreso(560, 1500);
    assert.equal(lay.dibujar, true);
    assert.ok(Math.abs(lay.pct - 37.333) < 0.2 || Math.abs(lay.pct - (560 / 1500) * 100) < 0.01);
  });

  it("cero no dibuja barra", () => {
    assert.equal(layoutProgreso(0, 1500).dibujar, false);
  });

  it("rinde usa techo fijo 250, no el máximo de la serie", () => {
    assert.equal(techoRinde([200, 100, 84], 250), 250);
    const lay = layoutRinde(200, 250);
    assert.ok(lay.pct < 100);
    assert.equal(Math.round(lay.pct), 80);
    const marca = marcaMediaPct(115, 250);
    assert.ok(marca != null && Math.abs(marca - 46) < 1);
  });

  it("acumularCobros preserva ceros mensuales", () => {
    const { mensuales, acum } = acumularCobros([
      { cobrado: 0 }, { cobrado: 0 }, { cobrado: 2500 }, { cobrado: 5 },
    ]);
    assert.deepEqual(mensuales, [0, 0, 2500, 5]);
    assert.deepEqual(acum, [0, 0, 2500, 2505]);
  });
});

describe("client API comisiones pagos", () => {
  it("exporta comisionesPagos.listar y registrar", () => {
    const src = fs.readFileSync(path.join(__dirname, "../api/client.js"), "utf8");
    assert.ok(src.includes("comisionesPagos"));
    assert.ok(src.includes("/comisiones/pagos"));
  });
});

describe("entrega_2 ausentismo DEV-10/11/12", () => {
  const citas = [
    { medicoId: "a", medico: "Ana", estado: "atendida" },
    { medicoId: "a", medico: "Ana", estado: "cancelada" },
    { medicoId: "b", medico: "Bob", estado: "no_show" },
    { medicoId: "b", medico: "Bob", estado: "confirmada" },
    { medicoId: "b", medico: "Bob", estado: "reprogramada" },
  ];

  it("reprogramada queda fuera; canceladas y no_show separados", () => {
    const r = resumenAusentismoClinica(citas);
    assert.equal(r.total, 4);
    assert.equal(r.canceladas, 1);
    assert.equal(r.noShows, 1);
    assert.equal(r.perdidas, 2);
    assert.equal(r.tasa, 50);
    assert.equal(r.sinDato, false);
  });

  it("cero citas → sinDato y tasa null", () => {
    const r = resumenAusentismoClinica([]);
    assert.equal(r.sinDato, true);
    assert.equal(r.tasa, null);
  });

  it("agrupa por odontólogo real sin sello ejemplo", () => {
    const { rows, clinica } = ausentismoPorOdontologo(citas, [
      { id: "a", nombre: "Ana", especialidad: "General" },
      { id: "b", nombre: "Bob", especialidad: "Endo" },
    ], 100);
    assert.equal(clinica.tasa, 50);
    const ana = rows.find((x) => x.id === "a");
    const bob = rows.find((x) => x.id === "b");
    assert.equal(ana.cancelada, 1);
    assert.equal(ana.noShow, 0);
    assert.equal(ana.agenda, 2);
    assert.equal(bob.noShow, 1);
    assert.equal(bob.agenda, 2);
    assert.equal(bob.coste, 100);
    assert.ok(!("ejemplo" in ana));
  });

  it("resuelve nombre por medicoId y no inventa Sin médico ni filas vacías", () => {
    const { rows } = ausentismoPorOdontologo(
      [
        { medicoId: "m1", estado: "cancelada" },
        { medicoId: "m1", estado: "atendida" },
        { medico: "Dra. Ana", estado: "no_show" },
      ],
      [
        { medicoId: "m1", nombre: "Luis", especialidad: "OG" },
        { id: "m2", nombre: "Dra. Ana", especialidad: "Endo" },
        { id: "m3", nombre: "Sin citas", especialidad: "Ortho" },
      ],
    );
    assert.equal(rows.length, 2);
    assert.ok(!rows.some((r) => r.nombre === "Sin médico"));
    assert.ok(!rows.some((r) => r.id === "m3"));
    const luis = rows.find((r) => r.id === "m1");
    const ana = rows.find((r) => r.id === "m2");
    assert.equal(luis.nombre, "Luis");
    assert.equal(luis.cancelada, 1);
    assert.equal(ana.nombre, "Dra. Ana");
    assert.equal(ana.noShow, 1);
  });

  it("umbral de la app es 15%", () => {
    assert.equal(UMBRAL_AUSENTISMO, 15);
  });

  it("App y ProduccionComisiones no rellenan con 6.2 ni 8.4", () => {
    const app = fs.readFileSync(path.join(__dirname, "../App.jsx"), "utf8");
    const pc = fs.readFileSync(path.join(__dirname, "ProduccionComisiones.jsx"), "utf8");
    assert.ok(!/conectado \? null : 8\.4/.test(app), "no fallback 8.4 sede");
    assert.ok(!/: 6\.2\b/.test(app), "no fallback 6.2 mi-producción");
    assert.ok(!pc.includes("6.2%") && !pc.includes("8.4%"));
    assert.ok(pc.includes("Cancelada") && pc.includes("No asistió"));
    assert.ok(pc.includes("Ausentismo por odontólogo"));
    assert.ok(pc.includes("Dato real de la agenda") || pc.includes("sin reparto de ejemplo"));
  });
});
