import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientSrc = fs.readFileSync(path.resolve(__dirname, "./client.js"), "utf8");

describe("api.clinica no se pisa", () => {
  it("un solo bloque clinica con get + impresion + planSueltos", () => {
    const blocks = [...clientSrc.matchAll(/^\s*clinica:\s*\{/gm)];
    assert.equal(blocks.length, 1, "duplicate clinica keys overwrite get()");
    assert.match(clientSrc, /get:\s*\(\)\s*=>\s*request\("GET", "\/clinica"\)/);
    assert.match(clientSrc, /impresion:\s*\(sedeId\)/);
    assert.match(clientSrc, /planSueltos:\s*\(\)/);
    assert.match(clientSrc, /planes:\s*\{/);
    assert.match(clientSrc, /tomaHash:/);
  });
});
