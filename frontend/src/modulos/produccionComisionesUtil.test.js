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
  rangoPeriodo,
  mesesDelPeriodo,
  ritmoDelPeriodo,
  rotuloPeriodo,
  comisionesPorSede,
} from "./produccionComisionesUtil.js";
import { deudaDeCaja } from "../compartido/metricas.js";
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
  it("rótulo legible", () => {
    assert.equal(rotuloPeriodo("2026-05-01", "2026-10-05"), "del 01/05/2026 al 05/10/2026");
  });
});

describe("H-06: Producción y comisiones con una sede elegida", () => {
  const srv = {
    desde: "2026-09-01", hasta: "2026-10-09", totalProduccion: 310, totalCobrado: 999,
    porMedico: [{ medicoId: "d1", nombre: "Dra. Carla", porcentaje: 40, meta: 500, atendidas: 2, produccion: 160 }, { medicoId: "d2", nombre: "Dr. Luis", porcentaje: 30, meta: null, atendidas: 1, produccion: 150 }],
    cobrosPorMes: [{ mes: "Set", anioMes: "2026-09", cobrado: 0 }, { mes: "Oct", anioMes: "2026-10", cobrado: 999 }],
  };
  const citas = [
    { medicoId: "d1", medico: "Dra. Carla", estado: "atendida", fecha: "2026-09-10", sedeId: "a2", valor: 80 },
    { medicoId: "d1", medico: "Dra. Carla", estado: "atendida", fecha: "2026-10-02", sedeId: "a1", valor: 80 },
    { medicoId: "d2", medico: "Dr. Luis", estado: "atendida", fecha: "2026-09-12", sedeId: "a1", valor: 150 },
    { medicoId: "d1", medico: "Dra. Carla", estado: "cancelada", fecha: "2026-10-03", sedeId: "a2", valor: 80 },
  ];
  const pagos = [{ fecha: "2026-09-10T10:00:00-05:00", sedeId: "a2", monto: 50 }, { fecha: "2026-10-01T10:00:00-05:00", sedeId: "a1", monto: 30 }, { fecha: "2026-09-11", sedeId: "a2", monto: 20, anulado: true }];
  const enSurco = (sid) => sid === "a2";
  it("la producción sale de las citas atendidas de la sede, con el % de cada odontólogo", () => {
    const d = comisionesPorSede(srv, citas, pagos, { desde: "2026-09-01", hasta: "2026-10-09", enSede: enSurco });
    assert.equal(d.totalProduccion, 80);
    assert.equal(d.totalCitas, 1);
    assert.equal(d.totalComision, 32);
    const carla = d.porMedico.find((m) => m.medicoId === "d1");
    assert.equal(carla.produccion, 80); assert.equal(carla.atendidas, 1); assert.equal(carla.meta, 500);
    assert.equal(d.porMedico.find((m) => m.medicoId === "d2").produccion, 0);
    assert.equal(d.odontologosConProduccion, 1);
  });
  it("lo cobrado son los pagos no anulados de la sede, mes a mes", () => {
    const d = comisionesPorSede(srv, citas, pagos, { desde: "2026-09-01", hasta: "2026-10-09", enSede: enSurco });
    assert.equal(d.cobrosSede, true);
    assert.equal(d.totalCobrado, 50);
    assert.deepEqual(d.cobrosPorMes.map((m) => [m.anioMes, m.cobrado]), [["2026-09", 50], ["2026-10", 0]]);
    assert.equal(d.descuadre, -30);
  });
  it("sin pagos deja lo cobrado como vino y lo marca", () => {
    const d = comisionesPorSede(srv, citas, null, { desde: "2026-09-01", hasta: "2026-10-09", enSede: enSurco });
    assert.equal(d.cobrosSede, false);
    assert.equal(d.totalCobrado, 999);
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
});
