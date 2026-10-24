import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ymdLima, contarEventosHoy, mapAuditoriaApiRows, resumenDispositivo, fechaHoraLima, fechaCortaLima, mesCorto, fechaRelativa } from "./fechaLima.js";

describe("fechaHoraLima M5-14", () => {
  it("formatea la hora de firma en dd/mm/aaaa hh:mm de Lima", () => {
    assert.equal(fechaHoraLima("2026-10-11T19:27:45.440786-05:00"), "11/10/2026 19:27");
    assert.equal(fechaHoraLima("2026-10-12T00:27:45Z"), "11/10/2026 19:27");
  });
  it("una fecha sola sale sin hora y lo ilegible tal cual", () => {
    assert.equal(fechaHoraLima("2026-10-11"), "11/10/2026");
    assert.equal(fechaHoraLima(""), "");
    assert.equal(fechaHoraLima("ayer"), "ayer");
  });
});

describe("fechaCortaLima M6-05", () => {
  it("una fecha ISO sale dd/mm/aaaa", () => {
    assert.equal(fechaCortaLima("2026-10-12"), "12/10/2026");
    assert.equal(fechaCortaLima("2026-01-05"), "05/01/2026");
  });
  it("un instante se lee en hora de Lima y sale sin hora", () => {
    assert.equal(fechaCortaLima("2026-10-12T09:34:48-05:00"), "12/10/2026");
    // 00:27 UTC del 12 = 19:27 del 11 en Lima
    assert.equal(fechaCortaLima("2026-10-12T00:27:45Z"), "11/10/2026");
  });
  it("vacío da \"\" y lo ilegible sale tal cual", () => {
    assert.equal(fechaCortaLima(""), "");
    assert.equal(fechaCortaLima(null), "");
    assert.equal(fechaCortaLima("sin fecha"), "sin fecha");
  });
});

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

describe("mesCorto y fechaRelativa (M8-08)", () => {
  it("el mes en minúscula y sin punto", () => {
    assert.equal(mesCorto(new Date(2026, 9, 19)), "oct");
    assert.equal(mesCorto("2026-09-05"), "set");
    assert.equal(mesCorto("2026-01-31"), "ene");
    assert.equal(mesCorto(""), "");
    assert.equal(mesCorto(new Date("x")), "");
  });
  it("una fecha futura nunca dice «Hace»", () => {
    assert.equal(fechaRelativa("2026-10-22", "2026-10-13"), "Próxima");
    assert.equal(fechaRelativa("2026-10-22", "2026-10-13", { futuro: true }), "En 9 días");
    assert.equal(fechaRelativa("2026-10-04", "2026-10-13"), "Hace 9 días");
    assert.equal(fechaRelativa("2026-10-12", "2026-10-13"), "Hace 1 día");
    assert.equal(fechaRelativa("2026-10-13", "2026-10-13"), "Hoy");
  });
  it("meses y años como antes; lo ilegible, vacío", () => {
    assert.equal(fechaRelativa("2026-07-13", "2026-10-13"), "Hace 3 meses");
    assert.equal(fechaRelativa("2024-10-13", "2026-10-13"), "Hace 2 años");
    assert.equal(fechaRelativa("", "2026-10-13"), "");
  });
});
