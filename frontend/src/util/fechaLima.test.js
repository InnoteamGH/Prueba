import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ymdLima, contarEventosHoy, mapAuditoriaApiRows, resumenDispositivo } from "./fechaLima.js";

describe("fechaLima NEW-57", () => {
  it("ymdLima formatea en America/Lima", () => {
    const d = new Date("2026-09-06T20:00:00.000Z"); // 15:00 Lima
    assert.equal(ymdLima(d), "2026-09-06");
  });

  it("ymdLima acepta epoch 0", () => {
    assert.equal(typeof ymdLima(0), "string");
    assert.ok(ymdLima(0).length === 10);
  });

  it("contarEventosHoy iguala filas del día y no usa locale frágil", () => {
    const hoy = "2026-09-06";
    const rows = [
      { ymd: "2026-09-06", fecha: "6/09/2026, 10:00 a. m." },
      { ymd: "2026-09-06", fecha: "06/09/26, 11:00" },
      { ymd: "2026-09-05", fecha: "5/09/2026, 09:00" },
    ];
    assert.equal(contarEventosHoy(rows, hoy), 2);
  });

  it("mapAuditoriaApiRows alimenta KPI Hoy desde creadoEn", () => {
    const mapped = mapAuditoriaApiRows([
      { id: 1, creadoEn: "2026-09-06T15:00:00-05:00", detalle: "Inicio de sesión", ip: null },
      { id: 2, creadoEn: "2026-09-05T12:00:00-05:00", detalle: "x", ip: "1.1.1.1" },
    ]);
    assert.equal(mapped[0].ymd, "2026-09-06");
    assert.equal(mapped[0].ip, "—");
    assert.equal(mapped[1].ip, "1.1.1.1");
    assert.equal(contarEventosHoy(mapped, "2026-09-06"), 1);
  });

  it("resumenDispositivo resume userAgent (NEW-58b)", () => {
    assert.equal(
      resumenDispositivo("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"),
      "Chrome – macOS – escritorio"
    );
    assert.equal(resumenDispositivo(""), "—");
  });

  it("mapAuditoriaApiRows incluye dispositivo", () => {
    const rows = mapAuditoriaApiRows([
      {
        id: "1",
        creadoEn: "2026-09-06T15:00:00-05:00",
        detalle: "ok",
        ip: "1.2.3.4",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/120.0",
      },
    ]);
    assert.equal(rows[0].dispositivo, "Firefox – Windows – escritorio");
  });
});
