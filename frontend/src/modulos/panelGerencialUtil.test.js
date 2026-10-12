import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  distinctPatients,
  layoutBarrasTotal,
  layoutProgreso,
  metaEmptyLabel,
  metaEstado,
  moneyFmt,
  filtraMicro,
  totalResumen,
  especialidadDeItem,
  produccionPorEspecialidad,
  medicosEnSedes,
  equipoDeSede,
  metaDeSede,
} from "./panelGerencialUtil.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("panelGerencialUtil — barras (total-scale, zero no bar)", () => {
  it("valor 0 no dibuja barra", () => {
    const lay = layoutProgreso(0, 1000);
    assert.equal(lay.dibujar, false);
    assert.equal(lay.pct, 0);
  });

  it("total 0 no dibuja", () => {
    assert.equal(layoutProgreso(50, 0).dibujar, false);
  });

  it("las barras de un grupo suman 100 ±0.2", () => {
    const serie = [560, 440, 300, 200, 0];
    const lays = layoutBarrasTotal(serie);
    const suma = lays.filter((l) => l.dibujar).reduce((a, l) => a + l.pct, 0);
    assert.ok(Math.abs(suma - 100) <= 0.2, `suma=${suma}`);
    assert.equal(lays[4].dibujar, false);
  });
});

describe("panelGerencialUtil — pacientes distintos (P11)", () => {
  it("dos citas atendidas del mismo paciente cuentan 1", () => {
    const citas = [
      { pacienteId: "a", estado: "atendida" },
      { pacienteId: "a", estado: "atendida" },
      { pacienteId: "b", estado: "atendida" },
      { pacienteId: "c", estado: "confirmada" },
    ];
    assert.equal(distinctPatients(citas), 2);
  });
});

describe("panelGerencialUtil — meta vacía (P12)", () => {
  it('sin meta muestra "Sin meta configurada" y nunca S/ 0 ni 0%', () => {
    const e = metaEstado(false, null);
    assert.equal(e.vacia, true);
    assert.equal(e.label, metaEmptyLabel());
    assert.ok(!/S\/\s*0/.test(e.label));
    assert.ok(!/^0%$/.test(e.label));
    assert.ok(!e.label.includes("0%"));
  });

  it("hayMeta false con meta 0 sigue vacío", () => {
    const e = metaEstado(true, 0);
    assert.equal(e.vacia, true);
    assert.equal(e.label, "Sin meta configurada");
  });

  it("con meta real formatea dinero", () => {
    const e = metaEstado(true, 3000);
    assert.equal(e.vacia, false);
    assert.match(e.label, /S\/\s*3\s*000/);
  });
});

describe("panelGerencialUtil — moneyFmt y micro", () => {
  it("moneyFmt usa espacios de miles", () => {
    assert.equal(moneyFmt(1396), "S/ 1 396");
  });

  it("filtraMicro quita repetición de cifra grande", () => {
    const out = filtraMicro(
      [["Total", "S/ 1 500"], ["Ticket", "S/ 80"]],
      "S/ 1 500",
      "100%",
    );
    assert.equal(out.length, 1);
    assert.equal(out[0][0], "Ticket");
  });
});

describe("H-G3/H-G4: facturado y especialidad desde /tratamientos/resumen", () => {
  const cat = [
    { id: "s1", nombre: "Endodoncia", especialidad: "Endodoncia" },
    { id: "s2", nombre: "Endodoncia (unirradicular)", especialidad: "Endodoncia" },
    { id: "s3", nombre: "Instrucción de higiene oral y control de placa", especialidad: "Periodoncia" },
  ];
  const resumen = [
    { servicioId: null, nombre: "QA Endodoncia molar", numeroDeVentas: 1, importeTotal: 220 },
    { servicioId: null, nombre: "Instrucción de higiene oral y control de placa · Técnica de cepillado", numeroDeVentas: 1, importeTotal: 120 },
  ];
  it("el total es la suma del resumen (mismo número que el Top)", () => {
    assert.equal(totalResumen(resumen), 340);
    assert.equal(totalResumen(null), 0);
  });
  it("reconoce la especialidad por servicioId o por nombre del catálogo", () => {
    assert.equal(especialidadDeItem({ servicioId: "s3", nombre: "x" }, cat), "Periodoncia");
    assert.equal(especialidadDeItem(resumen[0], cat), "Endodoncia");
    assert.equal(especialidadDeItem(resumen[1], cat), "Periodoncia");
    assert.equal(especialidadDeItem({ nombre: "Otra cosa" }, cat), null);
  });
  it("producción por especialidad suma lo mismo que el facturado", () => {
    const esp = produccionPorEspecialidad(resumen, cat);
    assert.deepEqual(esp, [{ nombre: "Endodoncia", valor: 220 }, { nombre: "Periodoncia", valor: 120 }]);
    assert.equal(esp.reduce((a, e) => a + e.valor, 0), totalResumen(resumen));
    assert.equal(produccionPorEspecialidad([{ nombre: "Rara", importeTotal: 50 }], cat)[0].nombre, "Sin especialidad en el catálogo");
  });
});

describe("R6-02: equipo y meta de la sede elegida", () => {
  // Como en producción: Carla (d1) y Jorge (d5) solo tienen horario en San Isidro (a1); Luis
  // (d2) en las dos. /gerencial/kpis?sedeIds=a2 trae a todos con producción 0.
  const disp = [
    { medicoId: "d1", sedeId: "a1", activo: true }, { medicoId: "d5", sedeId: "a1" },
    { medicoId: "d2", sedeId: "a1" }, { medicoId: "d2", sedeId: "a2" },
    { medicoId: "d9", sedeId: "a2", activo: false },
  ];
  const rankingSurco = [
    { medicoId: "d1", medico: "Dra. Carla", atendidas: 0, produccion: 0, meta: null },
    { medicoId: "d5", medico: "Dr. Jorge", atendidas: 0, produccion: 0, meta: 500 },
    { medicoId: "d2", medico: "Dr. Luis", atendidas: 0, produccion: 0, meta: 300 },
  ];
  it("los doctores de la sede salen de su horario (los bloques inactivos no cuentan)", () => {
    assert.deepEqual([...medicosEnSedes(disp, ["a2"])], ["d2"]);
    assert.deepEqual([...medicosEnSedes(disp, ["a1"])].sort(), ["d1", "d2", "d5"]);
    // Sin horario a la vista no se sabe: null (no «ninguno»).
    assert.equal(medicosEnSedes([], ["a1"]), null);
    assert.equal(medicosEnSedes(disp, null), null);
  });
  it("el equipo de la sede: sus doctores y quien atendió en ella", () => {
    const enSurco = medicosEnSedes(disp, ["a2"]);
    assert.deepEqual(equipoDeSede(rankingSurco, enSurco).map((r) => r.medicoId), ["d2"]);
    const conCita = [...rankingSurco, { medicoId: "d7", atendidas: 1, produccion: 80, meta: null }];
    assert.deepEqual(equipoDeSede(conCita, enSurco).map((r) => r.medicoId), ["d2", "d7"]);
    // Sin horario: solo quien atendió.
    assert.deepEqual(equipoDeSede(conCita, null).map((r) => r.medicoId), ["d7"]);
  });
  it("la meta de la sede es la de sus doctores, no la de toda la clínica", () => {
    assert.equal(metaDeSede(rankingSurco, medicosEnSedes(disp, ["a2"])), 300);
    assert.equal(metaDeSede(rankingSurco, medicosEnSedes(disp, ["a1"])), 800);
    assert.equal(metaDeSede(rankingSurco, new Set()), 0);
    assert.equal(metaDeSede(rankingSurco, null), null);
  });
});

describe("R6-02: sin el aviso «el servidor aún no filtra» donde el servidor ya filtra", () => {
  const leer = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
  it("Panel, Resumen del mes, Producción y Más reportes", () => {
    for (const f of ["PanelGerencial.jsx", "ResumenMes.jsx", "ProduccionComisiones.jsx", "ReportesClinica.jsx"]) {
      const src = leer(f);
      assert.doesNotMatch(src, /Cifras de toda la clínica: el servidor aún no filtra/, f);
      assert.doesNotMatch(src, /aún no filtra este reporte por sede/, f);
      assert.doesNotMatch(src, /No se calcula por sede/, f);
    }
  });
});
