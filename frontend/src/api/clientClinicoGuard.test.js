/**
 * NEW-59: no emitir GET clínicos sin UUID de paciente.
 * Ejecutar: node --test src/api/clientClinicoGuard.test.js
 * (no importa client.js: Vite `import.meta.env` no existe en node --test).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const UUID_PACIENTE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function esPacienteIdApi(pacienteId) {
  return typeof pacienteId === "string" && UUID_PACIENTE.test(pacienteId);
}
function porPacienteGuard(pacienteId, fetchFn) {
  if (!esPacienteIdApi(pacienteId)) return Promise.resolve([]);
  return fetchFn(pacienteId);
}

describe("NEW-59 clinical GET guards", () => {
  it("rechaza null/vacío/demo 1", async () => {
    let called = 0;
    const fetchFn = async () => { called += 1; return [{ id: 1 }]; };
    assert.deepEqual(await porPacienteGuard(null, fetchFn), []);
    assert.deepEqual(await porPacienteGuard("", fetchFn), []);
    assert.deepEqual(await porPacienteGuard("1", fetchFn), []);
    assert.deepEqual(await porPacienteGuard(1, fetchFn), []);
    assert.equal(called, 0);
  });

  it("acepta UUID v4-ish y llama fetch", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    let seen = null;
    const fetchFn = async (id) => { seen = id; return [{ id: 1 }]; };
    const rows = await porPacienteGuard(uuid, fetchFn);
    assert.equal(seen, uuid);
    assert.equal(rows.length, 1);
  });

  it("acepta UUID nil de seed (ODO-01)", async () => {
    const uuid = "00000000-0000-0000-0000-000000000004";
    let seen = null;
    const fetchFn = async (id) => { seen = id; return [{ id: 1 }]; };
    assert.equal(esPacienteIdApi(uuid), true);
    const rows = await porPacienteGuard(uuid, fetchFn);
    assert.equal(seen, uuid);
    assert.equal(rows.length, 1);
  });

  it("client.js cablea esPacienteIdApi en porPaciente clínicos", () => {
    const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "client.js"), "utf8");
    assert.match(src, /export function esPacienteIdApi/);
    assert.match(src, /UUID_PACIENTE/);
    const hits = [...src.matchAll(/porPaciente:\s*\(pacienteId[^)]*\)\s*=>\s*\{[\s\S]*?\}/g)];
    assert.ok(hits.length >= 7, `esperaba ≥7 porPaciente bloque; got ${hits.length}`);
    for (const h of hits) {
      assert.match(h[0], /esPacienteIdApi\(pacienteId\)/, `falta guarda UUID: ${h[0].slice(0, 80)}`);
    }
    assert.doesNotMatch(src, /porPaciente:\s*\(pacienteId\)\s*=>\s*request\(/, "porPaciente sin bloque/guarda");
  });
});
