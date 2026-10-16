/**
 * Links de pago (Caja › Links de pago): estado legible, hora de Lima del vencimiento,
 * conteos de la cabecera e id corto del pedido. `caducaEn` llega en UTC con el formato de
 * Postgres («2026-10-15 19:38:22.123+00») o en ISO; Lima es UTC−5 todo el año.
 * Ejecutar: node --test src/util/linksPago.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estadoLink, horaLimaDe, idCorto, mapConLimite, porConciliar, resumenLinks, vencioYa } from "./linksPago.js";

describe("estadoLink", () => {
  it("los cuatro estados del servidor", () => {
    assert.deepEqual(estadoLink({ estado: "pendiente" }), { clave: "pendiente", etiqueta: "Esperando pago", tono: "aviso" });
    assert.deepEqual(estadoLink({ estado: "pagado" }), { clave: "pagado", etiqueta: "Pagado", tono: "ok" });
    assert.deepEqual(estadoLink({ estado: "caducado" }), { clave: "caducado", etiqueta: "Venció sin pago", tono: "mute" });
    assert.deepEqual(estadoLink({ estado: "anulado" }), { clave: "anulado", etiqueta: "Anulado", tono: "mute" });
  });
  it("sin distinguir mayúsculas ni espacios", () => {
    assert.equal(estadoLink({ estado: " PAGADO " }).etiqueta, "Pagado");
  });
  it("un estado desconocido sale neutro y tal cual; sin estado, «Sin estado»", () => {
    assert.deepEqual(estadoLink({ estado: "reembolsado" }), { clave: "reembolsado", etiqueta: "Reembolsado", tono: "neutro" });
    assert.deepEqual(estadoLink({}), { clave: "desconocido", etiqueta: "Sin estado", tono: "neutro" });
    assert.equal(estadoLink(null).tono, "neutro");
  });
});

describe("horaLimaDe", () => {
  it("el formato de Postgres en UTC pasa a hora de Lima", () => {
    assert.equal(horaLimaDe("2026-10-15 19:38:22.123+00"), "14:38");
    assert.equal(horaLimaDe("2026-10-15 19:38:22.123456+00"), "14:38");
    assert.equal(horaLimaDe("2026-10-15 19:38:22+0000"), "14:38");
  });
  it("ISO con Z, con desfase o sin zona (se toma como UTC)", () => {
    assert.equal(horaLimaDe("2026-10-15T19:38:22.123Z"), "14:38");
    assert.equal(horaLimaDe("2026-10-15T14:38:22-05:00"), "14:38");
    assert.equal(horaLimaDe("2026-10-15T19:38:22"), "14:38");
    assert.equal(horaLimaDe("2026-10-15 19:38"), "14:38");
  });
  it("cruza la medianoche: 03:10 UTC es 22:10 del día anterior en Lima", () => {
    assert.equal(horaLimaDe("2026-10-16 03:10:00+00"), "22:10");
  });
  it("acepta un Date", () => {
    assert.equal(horaLimaDe(new Date(Date.UTC(2026, 9, 15, 19, 38))), "14:38");
  });
  it("vacío, una fecha sola o lo ilegible dan \"\"", () => {
    assert.equal(horaLimaDe(""), "");
    assert.equal(horaLimaDe(null), "");
    assert.equal(horaLimaDe("2026-10-15"), "");
    assert.equal(horaLimaDe("mañana 10:30"), "");
    assert.equal(horaLimaDe(new Date("x")), "");
  });
});

describe("vencioYa", () => {
  const ahora = Date.UTC(2026, 9, 15, 19, 40);   // 14:40 en Lima
  it("compara el vencimiento en UTC con el momento dado", () => {
    assert.equal(vencioYa("2026-10-15 19:38:22.123+00", ahora), true);
    assert.equal(vencioYa("2026-10-15 19:58:22.123+00", ahora), false);
    assert.equal(vencioYa("2026-10-15T14:38:00-05:00", new Date(ahora)), true);
  });
  it("sin vencimiento legible no está vencido", () => {
    assert.equal(vencioYa(null, ahora), false);
    assert.equal(vencioYa("", ahora), false);
    assert.equal(vencioYa("pronto", ahora), false);
  });
});

describe("resumenLinks", () => {
  it("cuenta por estado y suma lo pagado", () => {
    const lista = [
      { estado: "pendiente", importe: 50 },
      { estado: "pendiente", importe: "80.00" },
      { estado: "pagado", importe: "50.10" },
      { estado: "pagado", importe: 120.2 },
      { estado: "caducado", importe: 50 },
      { estado: "anulado", importe: 70 },
      { estado: "otro", importe: 10 },
    ];
    assert.deepEqual(resumenLinks(lista), { pendientes: 2, pagados: 2, caducados: 1, montoPagado: 170.3 });
  });
  it("un importe ilegible no rompe la suma", () => {
    assert.equal(resumenLinks([{ estado: "pagado", importe: null }, { estado: "pagado", importe: "abc" }, { estado: "pagado", importe: 40 }]).montoPagado, 40);
  });
  it("lista vacía o inválida", () => {
    assert.deepEqual(resumenLinks([]), { pendientes: 0, pagados: 0, caducados: 0, montoPagado: 0 });
    assert.deepEqual(resumenLinks(null), { pendientes: 0, pagados: 0, caducados: 0, montoPagado: 0 });
  });
});

describe("idCorto", () => {
  it("los 8 primeros caracteres del pedido", () => {
    assert.equal(idCorto("3f2a9c1e-7b44-4d2e-9a10-5c6d7e8f9a0b"), "3f2a9c1e");
    assert.equal(idCorto("abc"), "abc");
    assert.equal(idCorto(null), "");
    assert.equal(idCorto(12345678901), "12345678");
  });
});

describe("mapConLimite", () => {
  it("respeta el límite de pedidos simultáneos y conserva el orden", async () => {
    let enCurso = 0, maximo = 0;
    const r = await mapConLimite([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, async (n) => {
      enCurso++; maximo = Math.max(maximo, enCurso);
      await new Promise((ok) => setTimeout(ok, 5));
      enCurso--; return n * 2;
    });
    assert.deepEqual(r, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    assert.ok(maximo <= 4, `hubo ${maximo} a la vez`);
  });
  it("lista vacía", async () => {
    assert.deepEqual(await mapConLimite([], 4, async (n) => n), []);
  });
});

describe("formato de la revisión 19", () => {
  it("caducaEn como hora sola de Lima («13:39») se muestra tal cual", () => {
    assert.equal(horaLimaDe("13:39"), "13:39");
    assert.equal(horaLimaDe("9:05"), "09:05");
  });
  it("con la hora sola no se puede saber si venció (no hay fecha)", () => {
    assert.equal(vencioYa("13:39", Date.now()), false);
  });
  it("conciliacionPendiente", () => {
    assert.equal(porConciliar({ conciliacionPendiente: true }), true);
    assert.equal(porConciliar({ conciliacionPendiente: false }), false);
    assert.equal(porConciliar(null), false);
  });
});
