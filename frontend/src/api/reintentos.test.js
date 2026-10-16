/**
 * R5-01 / R-19 / M5-04: reintentos de lectura y cola de GET del cliente API.
 * Ejecutar: node --test src/api/reintentos.test.js
 * (se prueba la lógica pura de api/reintentos.js; client.js no se importa porque usa
 * import.meta.env de Vite).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { conReintentos, crearCola, esFalloDeServidor, esReintentable, esperaReintento, ESPERAS_MS, MAX_REINTENTOS, mensajeErrorLogin, MSG_SERVIDOR_NO_RESPONDE } from "./reintentos.js";

const fallo = (status) => Object.assign(new Error(`Error ${status}`), { status });
const sinDormir = { dormir: async () => {}, azar: () => 0.5 };

describe("esReintentable", () => {
  it("GET ante 500, 502, 503, 504 y fallo de red (0)", () => {
    for (const st of [0, 500, 502, 503, 504]) assert.equal(esReintentable("GET", st), true, String(st));
  });
  it("GET no se repite ante 4xx ni 501", () => {
    for (const st of [400, 401, 403, 404, 409, 501]) assert.equal(esReintentable("GET", st), false, String(st));
  });
  it("las escrituras nunca se repiten", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) for (const st of [0, 500, 503]) assert.equal(esReintentable(m, st), false, `${m} ${st}`);
  });
  it("R6-10: un POST marcado idempotente (el login) sí se repite ante 5xx o red, no ante 4xx", () => {
    for (const st of [0, 500, 502, 503, 504]) assert.equal(esReintentable("POST", st, true), true, String(st));
    for (const st of [400, 401, 403, 409, 429]) assert.equal(esReintentable("POST", st, true), false, String(st));
  });
});

describe("esFalloDeServidor", () => {
  it("5xx reintentables y sin respuesta, sí; el resto, no", () => {
    for (const st of [0, 500, 502, 503, 504]) assert.equal(esFalloDeServidor(st), true, String(st));
    for (const st of [400, 401, 403, 404, 429, 501]) assert.equal(esFalloDeServidor(st), false, String(st));
  });
});

describe("mensajeErrorLogin (R6-10)", () => {
  it("500, 503 o la red caída: el servidor no responde (sin «backend» ni «acceso demo»)", () => {
    for (const st of [0, 500, 502, 503, 504]) {
      const m = mensajeErrorLogin(st);
      assert.equal(m, MSG_SERVIDOR_NO_RESPONDE);
      assert.doesNotMatch(m, /backend|demo/i);
      assert.equal(mensajeErrorLogin(st, { portal: true }), MSG_SERVIDOR_NO_RESPONDE);
    }
    assert.equal(MSG_SERVIDOR_NO_RESPONDE, "El servidor no responde en este momento. Intenta de nuevo en unos segundos.");
  });
  it("credenciales: staff 401, portal 401 y 403", () => {
    assert.equal(mensajeErrorLogin(401), "Credenciales inválidas.");
    assert.equal(mensajeErrorLogin(401, { portal: true }), "DNI o contraseña del portal incorrectos.");
    assert.equal(mensajeErrorLogin(403, { portal: true }), "DNI o contraseña del portal incorrectos.");
  });
  it("otro rechazo: el motivo del servidor (con punto final) o un texto genérico", () => {
    assert.equal(mensajeErrorLogin(403, { servidor: "Usuario desactivado" }), "Usuario desactivado.");
    assert.equal(mensajeErrorLogin(400, { servidor: "El correo no es válido." }), "El correo no es válido.");
    assert.match(mensajeErrorLogin(400), /^No se pudo iniciar sesión/);
    assert.match(mensajeErrorLogin(400, { servidor: "Error 400" }), /^No se pudo iniciar sesión/);
    assert.match(mensajeErrorLogin(429), /Demasiados intentos/);
  });
});

describe("esperaReintento", () => {
  it("1.º reintento entre 400 y 800 ms; 2.º entre 1 y 2 s", () => {
    assert.deepEqual(ESPERAS_MS, [[400, 800], [1000, 2000]]);
    assert.equal(esperaReintento(1, () => 0), 400);
    assert.equal(esperaReintento(1, () => 0.999999), 800);
    assert.equal(esperaReintento(2, () => 0), 1000);
    assert.equal(esperaReintento(2, () => 0.5), 1500);
  });
  it("con azar real queda siempre dentro del tramo", () => {
    for (let i = 0; i < 200; i++) {
      const a = esperaReintento(1); const b = esperaReintento(2);
      assert.ok(a >= 400 && a <= 800, `1.º ${a}`);
      assert.ok(b >= 1000 && b <= 2000, `2.º ${b}`);
    }
  });
});

describe("conReintentos", () => {
  it("una GET con 500 y luego 503 se repite y devuelve el dato", async () => {
    const estados = [500, 503];
    let n = 0; const esperas = [];
    const r = await conReintentos(async () => { n++; const st = estados.shift(); if (st) throw fallo(st); return "ok"; },
      { method: "GET", dormir: async (ms) => { esperas.push(ms); }, azar: () => 0.5 });
    assert.equal(r, "ok");
    assert.equal(n, 3);
    assert.deepEqual(esperas, [600, 1500]);
  });
  it("como mucho 2 reintentos: al tercer fallo sale el error", async () => {
    let n = 0;
    await assert.rejects(conReintentos(async () => { n++; throw fallo(503); }, { method: "GET", ...sinDormir }), (e) => e.status === 503);
    assert.equal(n, 1 + MAX_REINTENTOS);
  });
  it("un fallo de red (status 0) en GET se repite", async () => {
    let n = 0;
    const r = await conReintentos(async () => { n++; if (n === 1) throw fallo(0); return 7; }, { method: "GET", ...sinDormir });
    assert.equal(r, 7); assert.equal(n, 2);
  });
  it("POST, PUT, PATCH y DELETE fallan al primer intento", async () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
      let n = 0;
      await assert.rejects(conReintentos(async () => { n++; throw fallo(500); }, { method: m, ...sinDormir }));
      assert.equal(n, 1, m);
    }
  });
  it("un 404 o 403 en GET no se repite", async () => {
    for (const st of [403, 404]) {
      let n = 0;
      await assert.rejects(conReintentos(async () => { n++; throw fallo(st); }, { method: "GET", ...sinDormir }));
      assert.equal(n, 1, String(st));
    }
  });
  it("R6-10: un POST idempotente con 500, 503 se repite hasta 2 veces y entra", async () => {
    const estados = [500, 503];
    let n = 0;
    const r = await conReintentos(async () => { n++; const st = estados.shift(); if (st) throw fallo(st); return { token: "t" }; }, { method: "POST", idempotente: true, ...sinDormir });
    assert.deepEqual(r, { token: "t" }); assert.equal(n, 3);
  });
  it("R6-10: un POST idempotente con 401 no se repite", async () => {
    let n = 0;
    await assert.rejects(conReintentos(async () => { n++; throw fallo(401); }, { method: "POST", idempotente: true, ...sinDormir }), (e) => e.status === 401);
    assert.equal(n, 1);
  });
  it("lee también el estado guardado en _httpStatus", async () => {
    let n = 0;
    await conReintentos(async () => { n++; if (n === 1) throw Object.assign(new Error("x"), { _httpStatus: 502 }); return 1; }, { method: "GET", ...sinDormir });
    assert.equal(n, 2);
  });
});

describe("crearCola", () => {
  const diferido = () => { let ok, mal; const p = new Promise((a, b) => { ok = a; mal = b; }); return { p, ok, mal }; };
  const tic = () => new Promise((r) => setImmediate(r));

  it("con 25 lecturas a la vez nunca corren más de 6", async () => {
    const cola = crearCola(6);
    let enCurso = 0, maximo = 0;
    const tareas = Array.from({ length: 25 }, (_, i) => cola.ejecutar(async () => {
      enCurso++; maximo = Math.max(maximo, enCurso);
      await new Promise((r) => setTimeout(r, 2 + (i % 3)));
      enCurso--; return i;
    }));
    const res = await Promise.all(tareas);
    assert.equal(maximo, 6);
    assert.deepEqual(res, Array.from({ length: 25 }, (_, i) => i));
    await tic(); assert.equal(cola.activas, 0); assert.equal(cola.enEspera, 0);
  });
  it("las que esperan entran en orden de llegada", async () => {
    const cola = crearCola(2);
    const d = [diferido(), diferido(), diferido(), diferido()];
    const empezo = [];
    d.forEach((x, i) => cola.ejecutar(() => { empezo.push(i); return x.p; }));
    await tic();
    assert.deepEqual(empezo, [0, 1]);
    assert.equal(cola.enEspera, 2);
    d[1].ok(); await tic(); await tic();
    assert.deepEqual(empezo, [0, 1, 2]);
    d[0].ok(); await tic(); await tic();
    assert.deepEqual(empezo, [0, 1, 2, 3]);
    d[2].ok(); d[3].ok();
  });
  it("una tarea que falla devuelve su error y suelta su lugar", async () => {
    const cola = crearCola(1);
    await assert.rejects(cola.ejecutar(async () => { throw fallo(500); }), (e) => e.status === 500);
    assert.equal(await cola.ejecutar(async () => "sigue"), "sigue");
    await tic();   // el lugar se suelta justo después de entregar el resultado
    assert.equal(cola.activas, 0);
  });
  it("reintento + cola: cada intento hace fila y el resultado llega", async () => {
    const cola = crearCola(2);
    let n = 0;
    const r = await conReintentos(() => cola.ejecutar(async () => { n++; if (n < 3) throw fallo(503); return "dato"; }), { method: "GET", ...sinDormir });
    assert.equal(r, "dato"); assert.equal(n, 3);
    await tic(); assert.equal(cola.activas, 0);
  });
});

describe("client.js usa la cola y los reintentos", () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "client.js"), "utf8");
  it("importa reintentos.js y crea la cola de GET", () => {
    assert.match(src, /from "\.\/reintentos"/);
    assert.match(src, /crearCola\(MAX_GET_SIMULTANEAS\)/);
  });
  it("las GET pasan por la cola y conReintentos recibe el método", () => {
    assert.match(src, /conReintentos\(\(\) => \(method === "GET" \? colaGet\.ejecutar\(runOnce\) : runOnce\(\)\), \{ method, idempotente, alReintentar \}\)/);
  });
  it("R6-10: el login y el del portal se marcan idempotentes y sin aviso global", () => {
    assert.match(src, /request\("POST", "\/auth\/login", \{ email, password \}, null, \{ idempotente: true, sinAviso: true, alReintentar \}\)/);
    assert.match(src, /request\("POST", "\/auth\/portal\/login", \{ dni, password \}, null, \{ idempotente: true, sinAviso: true, alReintentar \}\)/);
    // Ninguna otra escritura se marca idempotente.
    assert.equal((src.match(/idempotente: true/g) || []).length, 2);
  });
});
