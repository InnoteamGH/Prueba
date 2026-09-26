#!/usr/bin/env node
/**
 * UX-20: map numeric borderRadius inline styles → var(--dc-r-*).
 * Safe mapping only; skips already-tokenized values and non-style contexts.
 *
 * Usage: node scripts/map-border-radius.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "src");

// UX-20 Cojg00H: residuales 2–7→sm, 11–13→md, 20–32→lg (+ ya mapeados).
const MAP = new Map([
  [2, "var(--dc-r-sm)"],
  [3, "var(--dc-r-sm)"],
  [4, "var(--dc-r-sm)"],
  [5, "var(--dc-r-sm)"],
  [6, "var(--dc-r-sm)"],
  [7, "var(--dc-r-sm)"],
  [8, "var(--dc-r-sm)"],
  [9, "var(--dc-r-sm)"],
  [10, "var(--dc-r-md)"],
  [11, "var(--dc-r-md)"],
  [12, "var(--dc-r-md)"],
  [13, "var(--dc-r-md)"],
  [14, "var(--dc-r-lg)"],
  [15, "var(--dc-r-lg)"],
  [16, "var(--dc-r-lg)"],
  [18, "var(--dc-r-lg)"],
  [20, "var(--dc-r-lg)"],
  [22, "var(--dc-r-lg)"],
  [24, "var(--dc-r-lg)"],
  [26, "var(--dc-r-lg)"],
  [28, "var(--dc-r-lg)"],
  [30, "var(--dc-r-lg)"],
  [32, "var(--dc-r-lg)"],
  [999, "var(--dc-r-full)"],
  [99, "var(--dc-r-full)"],
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?|css)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const rx = /borderRadius:\s*(\d+)\b/g;
let filesTouched = 0;
let replacements = 0;

for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, "utf8");
  let n = 0;
  const next = text.replace(rx, (m, num) => {
    const token = MAP.get(Number(num));
    if (!token) return m;
    n += 1;
    return `borderRadius: "${token}"`;
  });
  if (n) {
    filesTouched += 1;
    replacements += n;
    if (WRITE) fs.writeFileSync(file, next);
    console.log(`${WRITE ? "wrote" : "would"} ${path.relative(ROOT, file)} (+${n})`);
  }
}
console.log(`\n${replacements} replacements in ${filesTouched} files${WRITE ? "" : " (dry-run; pass --write)"}`);
