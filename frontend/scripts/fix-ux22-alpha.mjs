#!/usr/bin/env node
/**
 * UX-22: replace `${color}XX` / `color + "XX"` with tint(color, a).
 * Skips false positives (sede endsWith "a2", times "00"/"30", SVG, etc.).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "src");
const HEX = "0-9A-Fa-f";

function alpha(hh) {
  return Math.round((parseInt(hh, 16) / 255) * 1000) / 1000;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(ent.name) && !ent.name.endsWith(".test.js")) out.push(p);
  }
  return out;
}

function ensureTintImport(src, file) {
  if (!src.includes("tint(")) return src;
  if (/\btint\b/.test(src) && /from\s+["'].*comun["']/.test(src)) {
    // already imported from comun?
    if (/import\s*\{[^}]*\btint\b[^}]*\}\s*from\s*["'][^"']*comun/.test(src)) return src;
    return src.replace(
      /(import\s*\{)([^}]*)(\}\s*from\s*["'][^"']*comun[^"']*["'])/,
      (m, a, mid, b) => {
        if (/\btint\b/.test(mid)) return m;
        const trimmed = mid.trim().replace(/,\s*$/, "");
        return `${a}${trimmed ? `${trimmed}, tint` : "tint"}${b}`;
      }
    );
  }
  // TarjetaKPI / modules without comun import of tint — add local relative
  if (file.endsWith("TarjetaKPI.jsx")) {
    if (!src.includes('from "../comun"') && !src.includes("from '../comun'")) {
      return `import { tint } from "../comun";\n${src}`;
    }
  }
  if (file.includes(`${path.sep}modulos${path.sep}`) || file.includes(`${path.sep}compartido${path.sep}`)) {
    if (/from\s+["']\.\.\/comun["']/.test(src) && !/import\s*\{[^}]*\btint\b/.test(src)) {
      return src.replace(
        /(import\s*\{)([^}]*)(\}\s*from\s*["']\.\.\/comun["'])/,
        (m, a, mid, b) => {
          if (/\btint\b/.test(mid)) return m;
          const trimmed = mid.trim().replace(/,\s*$/, "");
          return `${a}${trimmed ? `${trimmed}, tint` : "tint"}${b}`;
        }
      );
    }
  }
  if (file.endsWith("FichaMedica.jsx")) {
    if (/from\s+["']\.\/comun["']/.test(src) && !/import\s*\{[^}]*\btint\b/.test(src)) {
      return src.replace(
        /(import\s*\{)([^}]*)(\}\s*from\s*["']\.\/comun["'])/,
        (m, a, mid, b) => {
          if (/\btint\b/.test(mid)) return m;
          const trimmed = mid.trim().replace(/,\s*$/, "");
          return `${a}${trimmed ? `${trimmed}, tint` : "tint"}${b}`;
        }
      );
    }
  }
  return src;
}

function transform(src) {
  let s = src;

  // Template: ${expr}HH  (not already tint(...))
  s = s.replace(/\$\{([^}]+)\}([0-9A-Fa-f]{2})(?![0-9A-Fa-f])/g, (m, expr, hh, offset) => {
    const before = s.slice(Math.max(0, offset - 12), offset);
    if (/tint\s*\(\s*$/.test(before)) return m;
    // skip if expr looks like a number-only or rotate(
    if (/^\d+$/.test(expr.trim())) return m;
    const a = alpha(hh);
    return `\${tint(${expr.trim()}, ${a})}`;
  });

  // Concat: expr + "HH" or expr + 'HH'  (balanced-ish left side)
  s = s.replace(/([A-Za-z0-9_$.\]\)]+(?:\.[A-Za-z0-9_$]+)*)\s*\+\s*["']([0-9A-Fa-f]{2})["']/g, (m, expr, hh) => {
    // false positives
    if (expr === "padStart" || /endsWith|startsWith|includes|test|match/.test(expr)) return m;
    if (/^(h|m|i|n|k|len|size|w|cols)$/i.test(expr)) return m;
    // sede a1/a2 markers are full strings "a1"/"a2" not concatenations of this form usually
    const a = alpha(hh);
    return `tint(${expr}, ${a})`;
  });

  // Broken CSS: var(--dc-foo)HH  → tint("var(--dc-foo)", a)
  s = s.replace(/var\((--dc-[a-z0-9-]+)\)([0-9A-Fa-f]{2})(?![0-9A-Fa-f])/g, (m, tok, hh) => {
    return `tint("var(${tok})", ${alpha(hh)})`;
  });

  return s;
}

const files = walk(ROOT);
let changed = 0;
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  let next = transform(raw);
  if (next !== raw) {
    next = ensureTintImport(next, file);
    fs.writeFileSync(file, next);
    changed += 1;
    console.log("fixed", path.relative(ROOT, file));
  }
}
console.log(`done: ${changed} files`);
