import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatearFDI } from "./formatearFDI.js";
import { resolverLineas, calcularTotales } from "./planInversion.js";
import conf from "./planInversionConf.js";
import { etiquetaPie, partirLineasEnHojas, totalPaginasDocumento } from "./planInversionPaginacion.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const planDoc = fs.readFileSync(
  path.resolve(__dirname, "../modulos/PlanInversionDocumento.jsx"),
  "utf8",
);

describe("CONFORMANCE checklist ronda 2 (automático)", () => {
  it("1. FDI con punto", () => {
    assert.equal(formatearFDI(11), "1.1");
    assert.equal(formatearFDI(85), "8.5");
  });

  it("2. extraer/corona generan líneas de plan (no solo aviso)", () => {
    const { lineas, descartes } = resolverLineas([
      [46, "extraer", "pieza"],
      [11, "corona", "pieza"],
    ], []);
    assert.ok(lineas.some((l) => l.pz === 46));
    assert.ok(lineas.some((l) => l.pz === 11));
    assert.equal(descartes.length, 0);
  });

  it("3. obturado → aviso interno sin línea paciente", () => {
    const { lineas, descartes } = resolverLineas([[26, "obturado", "O"]], []);
    assert.equal(lineas.length, 0);
    assert.ok(descartes.some((d) => d.h === "obturado"));
  });

  it("4. suelto 202 ambos = S/ 100 (A-14)", () => {
    const { lineas } = resolverLineas([], [[null, 202, "ambos"]]);
    const L = lineas.find((l) => l.cod === 202);
    assert.ok(L);
    assert.equal(L.cant, 2);
    assert.equal(L.v, 50);
    const tot = calcularTotales(lineas, { activo: false });
    assert.equal(tot.total, 100);
  });

  it("6. pie Página N de T + RNE off + sin MEDICAL en documento", () => {
    assert.equal(etiquetaPie(2, 3), "Página 2 de 3");
    assert.equal(conf.documento?.mostrarRNE, false);
    assert.equal(conf.empresa?.nombreParaDocumento, "Odonto Sonrisa");
    assert.doesNotMatch(conf.empresa?.nombreParaDocumento || "", /MEDICAL/i);
    assert.match(planDoc, /nombreParaDocumento/);
    assert.match(planDoc, /mostrarRNE &&/);
    assert.match(planDoc, /odontograma\.png/);
    assert.match(planDoc, /data-pie-pagina/);
    assert.match(planDoc, /beforeprint/);
    const hojas = partirLineasEnHojas(Array.from({ length: 13 }, (_, i) => ({ i })));
    assert.equal(totalPaginasDocumento({ numHojasPlan: hojas.length, conAnexo: true }), 3);
  });
});
