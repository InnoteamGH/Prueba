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
  escalaAusentismoMax,
  rangoPeriodo,
  mesesDelPeriodo,
  ritmoDelPeriodo,
  rotuloPeriodo,
  rotuloMeses,
  pctTxt,
} from "./produccionComisionesUtil.js";
import { deudaDeCaja, tramosDeuda } from "../compartido/metricas.js";
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

describe("H-G5: periodo de Producción y comisiones", () => {
  const hoy = new Date(2026, 9, 5); // 05/10/2026
  it("rangos de cada periodo", () => {
    assert.deepEqual(rangoPeriodo("mes", hoy), { desde: "2026-10-01", hasta: "2026-10-05" });
    assert.deepEqual(rangoPeriodo("anterior", hoy), { desde: "2026-09-01", hasta: "2026-09-30" });
    assert.deepEqual(rangoPeriodo("6m", hoy), { desde: "2026-05-01", hasta: "2026-10-05" });
  });
  it("la meta se cuenta una vez por mes del periodo", () => {
    assert.equal(mesesDelPeriodo("2026-05-01", "2026-10-05"), 6);
    assert.equal(mesesDelPeriodo("2026-10-01", "2026-10-05"), 1);
    assert.equal(mesesDelPeriodo("2025-12-01", "2026-01-31"), 2);
  });
  it("ritmo: un mes cerrado vale 100; el mes en curso, la parte que pasó", () => {
    assert.equal(ritmoDelPeriodo("2026-09-01", "2026-09-30", hoy), 100);
    assert.equal(Math.round(ritmoDelPeriodo("2026-10-01", "2026-10-05", hoy)), Math.round((5 / 31) * 100));
  });
  it("rótulo corto del rango", () => {
    assert.equal(rotuloPeriodo("2026-05-01", "2026-10-05"), "1 may – 5 oct 2026");
    assert.equal(rotuloPeriodo("2026-10-01", "2026-10-23"), "1 – 23 oct 2026");
    assert.equal(rotuloPeriodo("2026-10-23", "2026-10-23"), "23 oct 2026");
    assert.equal(rotuloPeriodo("2025-12-01", "2026-01-31"), "1 dic 2025 – 31 ene 2026");
    assert.equal(rotuloPeriodo(null, "2026-10-05"), "");
  });
  it("rótulo de los meses del periodo", () => {
    assert.equal(rotuloMeses("2026-05-01", "2026-10-05"), "may – oct 2026");
    assert.equal(rotuloMeses("2026-09-01", "2026-09-30"), "set 2026");
    assert.equal(rotuloMeses("2025-12-01", "2026-01-31"), "dic 2025 – ene 2026");
  });
});

describe("porcentajes de una pantalla", () => {
  it("sin decimales; lo que no es cero no sale «0%»", () => {
    assert.equal(pctTxt(37.33), "37%");
    assert.equal(pctTxt(100), "100%");
    assert.equal(pctTxt(0), "0%");
    assert.equal(pctTxt(0.2), "<1%");
    assert.equal(pctTxt(0.5), "1%");
    assert.equal(pctTxt(null), "—");
  });
});

describe("R6-02: Producción y comisiones con una sede elegida usa /comisiones?sedeIds", () => {
  // El servidor ya filtra /comisiones por sede (producción, comisión y cobrado): la pantalla
  // muestra su respuesta, sin rehacerla con las citas y los pagos ni avisar «toda la clínica».
  const src = fs.readFileSync(path.join(__dirname, "ProduccionComisiones.jsx"), "utf8");
  it("pide /comisiones con las sedes y no la recalcula", () => {
    assert.match(src, /api\.comisiones\(rango\.desde, rango\.hasta, sedesApi\)/);
    assert.doesNotMatch(src, /comisionesPorSede/);
    assert.doesNotMatch(src, /api\.pagos\.historial/);
  });
  it("ya no existe el recálculo local", async () => {
    const util = await import("./produccionComisionesUtil.js");
    assert.equal(util.comisionesPorSede, undefined);
  });
});

describe("R4-12 / R4-14: deuda desde GET /caja", () => {
  const caja = {
    porCobrar: [{ pacienteId: "p1", paciente: "Rosa", sedeId: "a1", saldo: 800 }, { pacienteId: "p2", paciente: "QA", sedeId: "a1", saldo: 309.25 }, { pacienteId: "p3", paciente: "Lucía", sedeId: "a2", saldo: 600 }],
    terminados: [
      { pacienteId: "p2", paciente: "QA", sedeId: "a1", costo: 220, terminadaEn: "2026-10-05T09:00:00-05:00" },
      { pacienteId: "p1", paciente: "Rosa", sedeId: "a1", costo: 500, terminadaEn: "2026-08-01T09:00:00-05:00" },
      { pacienteId: "p1", paciente: "Rosa", sedeId: "a1", costo: 400, terminadaEn: "2026-10-01T09:00:00-05:00" },
    ],
  };
  it("hecho sin pagar = lo terminado sin pasar del saldo; vencido = lo terminado hace más de 30 días", () => {
    const d = deudaDeCaja(caja, { hoy: "2026-10-09" });
    const qa = d.porPaciente.get("p2"), rosa = d.porPaciente.get("p1");
    assert.equal(qa.hecho, 220); assert.equal(qa.vencido, 0); assert.equal(qa.dias, 4);
    // Rosa: 900 terminado, saldo 800 → 100 ya pagado, imputado a lo más antiguo (500 de agosto).
    assert.equal(rosa.hecho, 800); assert.equal(rosa.vencido, 400); assert.equal(rosa.dias, 69);
    assert.equal(d.porPaciente.has("p3"), false);   // saldo del plan sin nada terminado: no es deuda vencida
    assert.equal(d.vencido, 400);
  });
  it("filtra por sede y no inventa el dato si el servidor no manda «terminados»", () => {
    assert.equal(deudaDeCaja(caja, { hoy: "2026-10-09", incluir: (s) => s === "a2" }).filas.length, 0);
    assert.equal(deudaDeCaja({ porCobrar: caja.porCobrar }), null);
  });
  it("R6-03: antigüedad por tramos y saldo de planes, por sede", () => {
    const d = deudaDeCaja(caja, { hoy: "2026-10-09" });
    // QA 220 (4 días) + Rosa 400 (8 días) corrientes; Rosa 400 de agosto (69 días) en 61–90.
    assert.deepEqual(d.tramos.map((t) => t.v), [620, 0, 400, 0]);
    assert.equal(d.tramos.reduce((a, t) => a + t.v, 0), d.hecho);
    assert.equal(d.tramos[2].items[0].paciente, "Rosa");
    assert.equal(d.saldoPlanes, 1709.25); assert.equal(d.pacientesConSaldo, 3);
    const surco = deudaDeCaja(caja, { hoy: "2026-10-09", incluir: (s) => s === "a2" });
    assert.deepEqual(surco.tramos.map((t) => t.v), [0, 0, 0, 0]);
    assert.equal(surco.saldoPlanes, 600);
  });
  it("tramosDeuda: sin fecha o con fecha futura va al tramo corriente", () => {
    assert.deepEqual(tramosDeuda([{ pendiente: 10, dias: null }, { pendiente: 5, dias: -2 }, { pendiente: 7, dias: 31 }, { pendiente: 1, dias: 400 }]).map((t) => t.v), [15, 7, 0, 1]);
  });
});

describe("escala de ausentismo", () => {
  it("se queda en 20 % mientras todo quepa", () => {
    assert.equal(escalaAusentismoMax(12.5, [3, 19.9]), 20);
  });
  it("sube a la decena siguiente si alguna tasa pasa del 20 % (máx. 100)", () => {
    assert.equal(escalaAusentismoMax(89.3, [50, 100]), 100);
    assert.equal(escalaAusentismoMax(34, []), 40);
  });
  it("la barra por odontólogo usa la misma escala que la clínica", () => {
    const citas = [{ medicoId: "a", estado: "cancelada" }, { medicoId: "a", estado: "cancelada" }, { medicoId: "a", estado: "atendida" }];
    const { rows, escala } = ausentismoPorOdontologo(citas, [{ id: "a", nombre: "Ana" }]);
    assert.equal(escala, 70);
    assert.ok(rows[0].pctEscala < 100);
  });
});
