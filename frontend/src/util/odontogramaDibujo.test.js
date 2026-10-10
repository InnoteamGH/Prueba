import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import vm from "node:vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dibujoPath = path.resolve(__dirname, "../../public/odontograma-anatomico/odontograma-dibujo.js");

function loadOdontograma(documentMock) {
  const code = fs.readFileSync(dibujoPath, "utf8");
  const sandbox = {
    window: {},
    globalThis: {},
    module: { exports: {} },
    document: documentMock || {
      createElementNS: () => {
        const node = {
          children: [],
          setAttribute() {},
          appendChild(c) { this.children.push(c); return c; },
          textContent: "",
        };
        return node;
      },
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox, { filename: "odontograma-dibujo.js" });
  return sandbox.module.exports?.crear ? sandbox.module.exports : sandbox.Odontograma || sandbox.globalThis.Odontograma;
}

describe("E5-A.1 odontograma-dibujo.js", () => {
  it("existe y exporta Odontograma.crear", () => {
    assert.ok(fs.existsSync(dibujoPath));
    const Odontograma = loadOdontograma();
    assert.equal(Odontograma.VIEWBOX.w, 1440);
    assert.equal(Odontograma.VIEWBOX.h, 880);
    assert.equal(Odontograma.fdi(18), "1.8");
    assert.equal(Odontograma.numRaices(16), 3);
    assert.equal(typeof Odontograma.crear, "function");
  });

  it("A-36 dibuja 52/32/20 según dentición", () => {
    const fakeEl = () => {
      const node = {
        children: [],
        style: { setProperty() {} },
        setAttribute() {},
        appendChild(c) { this.children.push(c); return c; },
        textContent: "",
      };
      return node;
    };
    const O = loadOdontograma({
      createElementNS: () => fakeEl(),
    });
    const mkSvg = () => {
      const kids = [];
      return {
        getAttribute: () => null,
        setAttribute() {},
        style: { setProperty() {} },
        get firstChild() { return kids[0] || null; },
        removeChild(c) { const i = kids.indexOf(c); if (i >= 0) kids.splice(i, 1); },
        appendChild(c) { kids.push(c); return c; },
        querySelector() { return {}; },
      };
    };
    for (const [dent, n] of [["mixta", 52], ["adulto", 32], ["leche", 20]]) {
      const odo = O.crear(mkSvg(), { denticion: dent });
      assert.equal(odo.piezas.length, n, dent);
    }
  });
});
