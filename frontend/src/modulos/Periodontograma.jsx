/* Periodontograma clínico. Gráfica por arcada y cara (margen gingival, fondo de bolsa y
   encía), registro rápido por teclado o teclado en pantalla con recorrido clínico,
   orientación AAP/EFP 2017 y sitios críticos. Lo usan Clínico › Periodontograma y la
   ficha del paciente. Contrato con el backend: util/periodontal.js
   (GET /periodontograma?pacienteId=… y PUT /periodontograma, una fila por pieza). */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Keyboard, Redo2, Undo2 } from "lucide-react";
import api, { auth } from "../api/client";
import { SUP, INF, piezaVacia, desdeApi, aApi, metricas, clasificacion, ordenVisual, esMolar, esSuperior, tipoDiente, nic, demoPerio } from "../util/periodontal";
import "./periodontograma.css";

const COL = 54, H = 150, CEJ = 86, SC = 5;
const GEO = { 1: [32, 23, 42, 66], 2: [28, 22, 38, 62], 3: [32, 27, 44, 80], 4: [34, 31, 36, 68], 5: [33, 32, 34, 68], 6: [46, 48, 34, 62], 7: [44, 46, 33, 58], 8: [40, 42, 31, 52] };
const NOMB = { 1: "Incisivo central", 2: "Incisivo lateral", 3: "Canino", 4: "Primer premolar", 5: "Segundo premolar", 6: "Primer molar", 7: "Segundo molar", 8: "Tercer molar" };
const LADO = { 1: "superior derecho", 2: "superior izquierdo", 3: "inferior izquierdo", 4: "inferior derecho" };
const ROM = ["0", "I", "II", "III"];

const nombre = (n) => `${NOMB[n % 10]} ${LADO[Math.floor(n / 10)]}`;
const caraNom = (n, i) => (i < 3 ? "Vestibular" : esSuperior(n) ? "Palatino" : "Lingual");
const letra = (i) => ["M", "C", "D"][i % 3];
const sitioCorto = (n, i) => `${caraNom(n, i)[0]}${letra(i)}`;
const sev = (v) => (v == null ? "vacio" : v >= 6 ? "alto" : v >= 4 ? "mod" : "ok");
const copia = (p) => ({ ...p, pd: [...p.pd], mg: [...p.mg], bop: [...p.bop], placa: [...p.placa], sup: [...p.sup] });
const completar = (m) => { const out = {}; [...SUP, ...INF].forEach((n) => { out[n] = m[n] || piezaVacia(); }); return out; };

/* Recorrido clínico: superior V 18→28, palatino 28→18, inferior L 48→38, V 38→48. */
function recorrido(d) {
  const out = [];
  const add = (arco, cara, rev) => (rev ? [...arco].reverse() : arco).forEach((n) => {
    if (d[n]?.ausente) return;
    const o = ordenVisual(n, cara);
    (rev ? [...o].reverse() : o).forEach((i) => out.push({ n, i }));
  });
  add(SUP, "v", false); add(SUP, "l", true); add(INF, "l", false); add(INF, "v", true);
  return out;
}

/* Examen anterior de la demostración (en la API todavía no hay historial de sondajes). */
function demoPrevio(actual) {
  let s = 97; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const m = {};
  Object.keys(actual).forEach((k) => {
    const p = copia(actual[k]);
    if (!p.ausente) for (let i = 0; i < 6; i++) if (p.pd[i] != null) {
      p.pd[i] = Math.min(10, p.pd[i] + (p.pd[i] >= 4 ? (r() > 0.35 ? 1 : 0) : (r() > 0.8 ? 1 : 0)));
      p.bop[i] = p.bop[i] || r() > 0.72;
    }
    m[k] = p;
  });
  return m;
}

/* ---------- Dibujo (SVG en texto: solo números y rutas propias) ---------- */
function geo(n) { const g = GEO[n % 10], s = esSuperior(n); return { w: s ? g[0] : g[1], ch: g[2], rl: g[3], raices: esMolar(n) ? (s ? 3 : 2) : (n % 10 === 4 && s ? 2 : 1), tipo: tipoDiente(n) }; }
const sitioX = (n, k, cx) => cx + (k - 1) * geo(n).w * 0.32;
function corona(cx, g) {
  const w = g.w, wn = w * 0.72, t = CEJ, b = CEJ + g.ch;
  let p = `M${cx - wn / 2},${t} C${cx - w / 2 - 1},${t + g.ch * 0.22} ${cx - w / 2},${t + g.ch * 0.72} ${cx - w * 0.38},${b}`;
  if (g.tipo === "canino") p += ` L${cx},${b + 7} L${cx + w * 0.38},${b}`;
  else if (g.tipo === "incisivo") p += ` Q${cx},${b + 3} ${cx + w * 0.38},${b}`;
  else { const k = g.tipo === "molar" ? 3 : 2, x0 = cx - w * 0.38, st = (w * 0.76) / k; for (let j = 0; j < k; j++) { const a = x0 + st * j; p += ` Q${a + st / 2},${b + 6} ${a + st},${b}`; } }
  return p + ` C${cx + w / 2},${t + g.ch * 0.72} ${cx + w / 2 + 1},${t + g.ch * 0.22} ${cx + wn / 2},${t} Z`;
}
function raiz(cx, g) {
  const wn = g.w * 0.72, rl = g.rl, t = CEJ;
  if (g.raices === 1) return `M${cx - wn / 2},${t} C${cx - wn / 2},${t - rl * 0.55} ${cx - wn * 0.28},${t - rl} ${cx},${t - rl} C${cx + wn * 0.28},${t - rl} ${cx + wn / 2},${t - rl * 0.55} ${cx + wn / 2},${t} Z`;
  const f = t - (g.tipo === "molar" ? 18 : rl * 0.5), o = wn / 2;
  return `M${cx - o},${t} C${cx - o - 3},${t - rl * 0.5} ${cx - o + 1},${t - rl * 0.92} ${cx - o * 0.55},${t - rl} C${cx - o * 0.2},${t - rl * 0.95} ${cx - 4},${t - rl * 0.45} ${cx},${f} C${cx + 4},${t - rl * 0.45} ${cx + o * 0.2},${t - rl * 0.95} ${cx + o * 0.55},${t - rl} C${cx + o - 1},${t - rl * 0.92} ${cx + o + 3},${t - rl * 0.5} ${cx + o},${t} Z`;
}
function dienteSvg(p, n, cx, cara) {
  const g = geo(n);
  if (p.ausente) return `<g opacity=".45"><path d="${raiz(cx, g)}" fill="none" stroke="var(--pg-t300)" stroke-dasharray="3 3"/><path d="${corona(cx, g)}" fill="none" stroke="var(--pg-t300)" stroke-dasharray="3 3"/><path d="M${cx - 10},${CEJ + 8} l20,20 M${cx + 10},${CEJ + 8} l-20,20" stroke="var(--pg-t400)" stroke-width="1.6" stroke-linecap="round"/></g>`;
  let s = "";
  if (p.implante) {
    const w = g.w * 0.42;
    s += `<rect x="${cx - w / 2}" y="${CEJ - g.rl * 0.85}" width="${w}" height="${g.rl * 0.85}" rx="${w / 2}" fill="url(#pgImp)" stroke="var(--pg-borde)"/>`;
    for (let y = CEJ - g.rl * 0.8; y < CEJ - 4; y += 7) s += `<path d="M${cx - w / 2},${y} L${cx + w / 2},${y + 3}" stroke="var(--pg-borde)" stroke-width="1" opacity=".8"/>`;
  } else {
    if (g.raices === 3 && cara === "v") s += `<path d="${raiz(cx, { ...g, raices: 1, w: g.w * 0.7, rl: g.rl + 6 })}" fill="url(#pgRaiz)" opacity=".55" stroke="var(--pg-borde)" stroke-width=".8"/>`;
    s += `<path d="${raiz(cx, g)}" fill="url(#pgRaiz)" stroke="var(--pg-borde)" stroke-width="1"/>`;
  }
  return s + `<path d="${corona(cx, g)}" fill="url(#pgCor)" stroke="var(--pg-borde)" stroke-width="1.1"/>`;
}
function puntos(arco, cara, fuente) {
  const segs = []; let cur = null;
  arco.forEach((n, idx) => {
    const p = fuente[n];
    if (!p || p.ausente) { cur = null; return; }
    if (!cur) { cur = []; segs.push(cur); }
    const cx = idx * COL + COL / 2;
    ordenVisual(n, cara).forEach((i, k) => { const ym = CEJ - (p.mg[i] ?? 0) * SC; cur.push({ n, i, x: sitioX(n, k, cx), ym, yp: ym - (p.pd[i] ?? 0) * SC, pd: p.pd[i] }); });
  });
  return segs;
}
function svgCara(arco, cara, abajo, dientes, previo, sel) {
  const W = arco.length * COL; let g = "";
  for (let mm = 1; mm <= 16; mm++) { const y = CEJ - mm * SC; g += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${mm % 3 === 0 ? "var(--pg-grid-2)" : "var(--pg-grid)"}"/>`; }
  const si = arco.indexOf(sel.n);
  if (si >= 0) g += `<rect x="${si * COL}" y="0" width="${COL}" height="${H}" fill="var(--pg-col-sel)"/>`;
  arco.forEach((n, idx) => { g += dienteSvg(dientes[n], n, idx * COL + COL / 2, cara); });
  const segs = puntos(arco, cara, dientes);
  segs.forEach((sg) => {
    const a = sg[0], z = sg[sg.length - 1];
    g += `<path d="M${a.x - 12},${a.ym} ${sg.map((p) => `L${p.x},${p.ym}`).join(" ")} L${z.x + 12},${z.ym} L${z.x + 12},${z.ym - 26} ${[...sg].reverse().map((p) => `L${p.x},${p.ym - 26}`).join(" ")} L${a.x - 12},${a.ym - 26} Z" fill="var(--pg-encia)"/>`;
    g += `<polygon points="${sg.map((p) => `${p.x},${p.ym}`).join(" ")} ${[...sg].reverse().map((p) => `${p.x},${p.yp}`).join(" ")}" fill="var(--pg-bolsa)"/>`;
  });
  if (previo) puntos(arco, cara, previo).forEach((sg) => { g += `<polyline points="${sg.map((p) => `${p.x},${p.yp}`).join(" ")}" fill="none" stroke="var(--pg-t400)" stroke-width="1.6" stroke-dasharray="4 3"/>`; });
  segs.forEach((sg) => {
    const a = sg[0], z = sg[sg.length - 1];
    g += `<polyline points="${a.x - 12},${a.ym} ${sg.map((p) => `${p.x},${p.ym}`).join(" ")} ${z.x + 12},${z.ym}" fill="none" stroke="var(--pg-azul)" stroke-width="2" stroke-linejoin="round"/>`;
    g += `<polyline points="${sg.map((p) => `${p.x},${p.yp}`).join(" ")}" fill="none" stroke="var(--pg-rojo)" stroke-width="2.2" stroke-linejoin="round"/>`;
    sg.forEach((p) => {
      const pz = dientes[p.n];
      if (p.pd >= 4) g += `<circle cx="${p.x}" cy="${p.yp}" r="2.6" fill="var(--pg-rojo)"/>`;
      if (pz.bop[p.i]) g += `<path d="M${p.x},${p.yp - 11} c-2.6,3.6 -3.6,5.2 -3.6,6.6 a3.6,3.6 0 0 0 7.2,0 c0,-1.4 -1,-3 -3.6,-6.6 Z" transform="rotate(180 ${p.x} ${p.yp - 7})" fill="var(--pg-rojo)"/>`;
      if (pz.sup[p.i]) g += `<circle cx="${p.x}" cy="${p.yp - 16}" r="3" fill="none" stroke="var(--pg-ambar)" stroke-width="1.8"/>`;
    });
  });
  if (cara === "v") arco.forEach((n, idx) => {
    const p = dientes[n];
    if (!esMolar(n) || !(p.furca > 0) || p.ausente) return;
    const cx = idx * COL + COL / 2, y = CEJ - 16;
    g += `<path d="M${cx},${y - 7} L${cx + 6},${y + 4} L${cx - 6},${y + 4} Z" fill="${p.furca >= 2 ? "var(--pg-ambar)" : "none"}" stroke="var(--pg-ambar)" stroke-width="1.6"/>`;
  });
  const sp = segs.flat().find((p) => p.n === sel.n && p.i === sel.i);
  if (sp) g += `<line x1="${sp.x}" x2="${sp.x}" y1="${Math.min(sp.yp, sp.ym) - 8}" y2="${CEJ + 4}" stroke="var(--pg-marca)" stroke-width="1.4" stroke-dasharray="2 2"/><circle cx="${sp.x}" cy="${sp.yp}" r="5" fill="none" stroke="var(--pg-marca)" stroke-width="2"/>`;
  let t = "";
  [3, 6, 9, 12, 15].forEach((mm) => { const y = CEJ - mm * SC; t += `<text x="3" y="${(abajo ? H - y : y) + 3}" class="pgc-eje">${mm}</text>`; });
  t += `<line x1="${W / 2}" x2="${W / 2}" y1="0" y2="${H}" stroke="var(--pg-linea-2)"/>`;
  const defs = `<defs><linearGradient id="pgCor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--pg-esm-2)"/><stop offset="1" style="stop-color:var(--pg-esm-1)"/></linearGradient><linearGradient id="pgRaiz" x1="0" y1="1" x2="0" y2="0"><stop offset="0" style="stop-color:var(--pg-den-1)"/><stop offset="1" style="stop-color:var(--pg-den-2)"/></linearGradient><linearGradient id="pgImp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8FA3BC"/><stop offset=".5" stop-color="#DCE5F1"/><stop offset="1" stop-color="#7C8FA8"/></linearGradient></defs>`;
  return `${defs}<g${abajo ? ` transform="translate(0 ${H}) scale(1 -1)"` : ""}>${g}</g>${t}`;
}

export default function PeriodontogramaClinico({ pacienteId, pacienteNombre = "", notify = () => {}, soloLectura = false }) {
  const conectado = !!auth.token;
  const [dientes, setDientes] = useState(null);
  const [previo, setPrevio] = useState(null);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState({ n: 16, i: 2 });
  const [arcada, setArcada] = useState("sup");
  const [campo, setCampo] = useState("pd");
  const [neg, setNeg] = useState(false);
  const [comparar, setComparar] = useState(false);
  const [guardado, setGuardado] = useState(null); // { tipo: "ok" | "guardando" | "error", hora }
  const [hist, setHist] = useState({ u: [], r: [] });
  const ultimo = useRef(null);
  const timers = useRef({});
  const activo = useRef(false);
  const raizRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    setDientes(null); setError(false); setHist({ u: [], r: [] });
    if (!conectado) { const d = completar(demoPerio(pacienteId)); setDientes(d); setPrevio(demoPrevio(d)); return; }
    setPrevio(null);
    if (!pacienteId) { setDientes(completar({})); return; }
    api.perio.porPaciente(pacienteId)
      .then((rows) => setDientes(completar(desdeApi(rows))))
      .catch(() => { setDientes(completar({})); setError(true); });
  }, [pacienteId, conectado]);

  // Guardado pieza por pieza con una pausa corta, para no enviar cada tecla.
  const persistir = (n, p) => {
    if (!conectado || !pacienteId) return;
    clearTimeout(timers.current[n]);
    setGuardado({ tipo: "guardando" });
    timers.current[n] = setTimeout(() => {
      api.perio.guardar(aApi(pacienteId, n, p))
        .then(() => setGuardado({ tipo: "ok", hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) }))
        .catch(() => { setGuardado({ tipo: "error" }); notify(`No se pudo guardar la pieza ${n}.`); });
    }, 600);
  };
  const modificar = (n, fn, conHist = true) => {
    if (soloLectura || !dientes) return;
    const p = copia(dientes[n]); fn(p);
    if (conHist) setHist((h) => ({ u: [...h.u.slice(-59), dientes], r: [] }));
    setDientes({ ...dientes, [n]: p });
    persistir(n, p);
  };
  const restaurar = (destino) => {
    Object.keys(destino).forEach((k) => { if (JSON.stringify(destino[k]) !== JSON.stringify(dientes[k])) persistir(+k, destino[k]); });
    setDientes(destino);
  };
  const deshacer = () => { if (!hist.u.length) return; const d = hist.u[hist.u.length - 1]; setHist({ u: hist.u.slice(0, -1), r: [...hist.r, dientes] }); restaurar(d); };
  const rehacer = () => { if (!hist.r.length) return; const d = hist.r[hist.r.length - 1]; setHist({ u: [...hist.u, dientes], r: hist.r.slice(0, -1) }); restaurar(d); };

  const ir = (s) => { setSel(s); setArcada(esSuperior(s.n) ? "sup" : "inf"); };
  const siguiente = (desde, paso) => {
    const r = recorrido(dientes), k = r.findIndex((x) => x.n === desde.n && x.i === desde.i);
    return r[Math.max(0, Math.min(r.length - 1, (k < 0 ? 0 : k) + paso))] || desde;
  };
  const escribirEn = (s, v) => {
    if (dientes[s.n].ausente) return;
    modificar(s.n, (p) => { if (campo === "pd") p.pd[s.i] = Math.max(0, Math.min(15, v)); else p.mg[s.i] = neg ? -Math.abs(v) : Math.min(12, v); });
    setNeg(false);
    ultimo.current = { ...s, t: Date.now(), d: v, campo };
    ir(siguiente(s, 1));
  };
  // "1" y luego 0–5 en menos de 0,8 s se toma como 10–15 en el mismo sitio.
  const digito = (d) => {
    const u = ultimo.current;
    if (u && u.d === 1 && campo === "pd" && u.campo === "pd" && Date.now() - u.t < 800 && d <= 5) { ultimo.current = null; escribirEn({ n: u.n, i: u.i }, 10 + d); return; }
    escribirEn(sel, d);
  };
  const bandera = (k, s = ultimo.current || sel) => { if (!dientes[s.n].ausente) modificar(s.n, (p) => { p[k][s.i] = !p[k][s.i]; }); };
  const borrar = () => modificar(sel.n, (p) => { p[campo][sel.i] = null; });
  const elegir = (s, c) => { ultimo.current = null; ir(s); if (c) setCampo(c); };
  const elegirDiente = (n) => elegir({ n, i: sel.n === n ? sel.i : ordenVisual(n, "v")[0] });
  const moverVisual = (paso) => {
    const arco = arcada === "sup" ? SUP : INF, cara = sel.i < 3 ? "v" : "l", l = [];
    arco.forEach((n) => ordenVisual(n, cara).forEach((i) => l.push({ n, i })));
    const k = l.findIndex((x) => x.n === sel.n && x.i === sel.i);
    const nx = l[Math.max(0, Math.min(l.length - 1, k + paso))]; if (nx) elegir(nx);
  };

  // El teclado solo actúa si el último clic fue dentro del periodontograma.
  useEffect(() => {
    const down = (e) => { activo.current = !!raizRef.current?.contains(e.target); };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, []);
  useEffect(() => {
    if (soloLectura || !dientes) return undefined;
    const h = (e) => {
      const tg = e.target;
      if (!activo.current || (tg && (tg.tagName === "TEXTAREA" || tg.tagName === "INPUT" || tg.tagName === "SELECT" || tg.isContentEditable))) return;
      const k = e.key, low = k.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && low === "z") { e.preventDefault(); if (e.shiftKey) rehacer(); else deshacer(); return; }
      if ((e.ctrlKey || e.metaKey) && low === "y") { e.preventDefault(); rehacer(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(k)) { e.preventDefault(); digito(+k); return; }
      if (low === "b") return bandera("bop");
      if (low === "p") return bandera("placa");
      if (low === "s") return bandera("sup");
      if (k === "Tab") { e.preventDefault(); setCampo(campo === "pd" ? "mg" : "pd"); setNeg(false); return; }
      if (k === "-" && campo === "mg") { setNeg(!neg); return; }
      if (k === "Backspace" || k === "Delete") { e.preventDefault(); borrar(); return; }
      if (k === "ArrowRight") { e.preventDefault(); moverVisual(1); return; }
      if (k === "ArrowLeft") { e.preventDefault(); moverVisual(-1); return; }
      if (k === "ArrowUp" || k === "ArrowDown") { e.preventDefault(); const o = ordenVisual(sel.n, sel.i < 3 ? "v" : "l"), otra = ordenVisual(sel.n, sel.i < 3 ? "l" : "v"); elegir({ n: sel.n, i: otra[o.indexOf(sel.i)] }); return; }
      if ((k === "Enter" || k === " ") && !(tg && tg.tagName === "BUTTON")) { e.preventDefault(); ultimo.current = null; ir(siguiente(sel, 1)); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // Mantener visible el sitio activo cuando la gráfica tiene scroll horizontal.
  useEffect(() => {
    const sc = scrollRef.current, a = sc?.querySelector(".pgc-s.is-act");
    if (!sc || !a) return;
    const r = a.getBoundingClientRect(), rs = sc.getBoundingClientRect();
    if (r.left < rs.left + 100 || r.right > rs.right - 10) sc.scrollLeft += r.left - rs.left - rs.width / 2;
  }, [sel, campo]);

  const m = useMemo(() => (dientes ? metricas(dientes) : null), [dientes]);
  const mp = useMemo(() => (previo ? metricas(previo) : null), [previo]);
  const dx = useMemo(() => (m ? clasificacion(m) : null), [m]);
  const criticos = useMemo(() => {
    if (!dientes) return [];
    const l = [];
    [...SUP, ...INF].forEach((n) => { const p = dientes[n]; if (p.ausente) return; for (let i = 0; i < 6; i++) { const v = p.pd[i]; if (v != null && v >= 5) l.push({ n, i, v, b: p.bop[i], s: p.sup[i] }); } });
    return l.sort((a, b) => b.v - a.v || b.b - a.b);
  }, [dientes]);

  if (!dientes) return <div className="pgc-cargando">Cargando periodontograma…</div>;

  const cmp = comparar && previo;
  const arco = arcada === "sup" ? SUP : INF;
  const interna = arcada === "sup" ? "Palatino" : "Lingual";
  const p = dientes[sel.n];
  const tot = m.presentes * 6;
  let hechos = 0; [...SUP, ...INF].forEach((n) => { if (!dientes[n].ausente) hechos += dientes[n].pd.filter((v) => v != null).length; });
  const dxTono = dx.estado === "periodontitis" ? "r" : dx.estado === "gingivitis" ? "a" : dx.estado === "salud" ? "o" : "n";
  const delta = (a, b, dec = 0) => {
    if (!cmp) return null;
    const d = +(a - b).toFixed(dec);
    return <span className={`pgc-delta is-${!d ? "igual" : d < 0 ? "mejor" : "peor"}`}>{!d ? "=" : `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(dec)}`}</span>;
  };
  const KPI = [
    ["Sangrado", m.bopPct, "%", delta(m.bopPct, mp?.bopPct), m.bopPct >= 10 ? "r" : ""],
    ["Placa", m.placaPct, "%", delta(m.placaPct, mp?.placaPct), m.placaPct >= 20 ? "a" : ""],
    ["PS media", m.pdMedia.toFixed(1), "mm", delta(m.pdMedia, mp?.pdMedia, 1), ""],
    ["NIC medio", m.calMedia.toFixed(1), "mm", delta(m.calMedia, mp?.calMedia, 1), ""],
    ["Sitios ≥4", m.s4, "", delta(m.s4, mp?.s4), m.s4 ? "a" : ""],
    ["Sitios ≥6", m.s6, "", delta(m.s6, mp?.s6), m.s6 ? "r" : ""],
  ];

  const colCls = (n) => `pgc-col${sel.n === n ? " is-sel" : ""}${dientes[n].ausente ? " is-aus" : ""}`;
  const filaNum = (cara, c, rot) => (
    <div className={`pgc-fila is-${c}`}>
      <div className="pgc-rot">{rot}</div>
      {arco.map((n) => { const pz = dientes[n]; return (
        <div key={n} className={colCls(n)}>
          {ordenVisual(n, cara).map((i) => {
            if (pz.ausente) return <span key={i} className="pgc-s is-ro is-vacio">·</span>;
            if (c === "nic") { const v = nic(pz.pd[i], pz.mg[i]); return <span key={i} className="pgc-s is-ro">{v ?? "·"}</span>; }
            const v = pz[c][i], act = sel.n === n && sel.i === i && campo === c;
            const pv = cmp && c === "pd" && v != null ? previo[n]?.pd[i] : null;
            return (
              <button key={i} type="button"
                className={`pgc-s${c === "pd" ? ` is-${sev(v)}` : v == null ? " is-vacio" : ""}${act ? " is-act" : ""}`}
                onClick={() => elegir({ n, i }, c)} aria-label={`${n} ${sitioCorto(n, i)} ${c === "pd" ? "profundidad" : "margen"} ${v ?? "sin dato"}`}>
                {v ?? "·"}
                {pv != null && pv !== v && <sup className={v > pv ? "is-up" : "is-dn"}>{v > pv ? "+" : "−"}{Math.abs(v - pv)}</sup>}
              </button>
            );
          })}
        </div>
      ); })}
    </div>
  );
  const filaDots = (cara, k, rot) => (
    <div className={`pgc-fila is-${k}`}>
      <div className="pgc-rot">{rot}</div>
      {arco.map((n) => { const pz = dientes[n]; return (
        <div key={n} className={colCls(n)}>
          {ordenVisual(n, cara).map((i) => pz.ausente ? <span key={i} className="pgc-dot" /> : (
            <button key={i} type="button" className={`pgc-dot is-${k}${pz[k][i] ? " is-on" : ""}${k === "bop" && pz.sup[i] ? " is-sup" : ""}`} disabled={soloLectura}
              onClick={() => { elegir({ n, i }); bandera(k, { n, i }); }} aria-pressed={pz[k][i]} aria-label={`${rot} ${n} ${sitioCorto(n, i)}`}><i /></button>
          ))}
        </div>
      ); })}
    </div>
  );
  const filaCiclo = (k, rot) => (
    <div className="pgc-fila is-ciclo">
      <div className="pgc-rot">{rot}</div>
      {arco.map((n) => { const pz = dientes[n];
        if (pz.ausente || (k === "furca" && !esMolar(n))) return <div key={n} className={colCls(n)} />;
        const v = pz[k] || 0;
        return <div key={n} className={colCls(n)}><button type="button" className={`pgc-cyc is-v${v}`} disabled={soloLectura} onClick={() => modificar(n, (q) => { q[k] = ((q[k] || 0) + 1) % 4; })} aria-label={`${rot} ${n}: ${v}`}>{k === "furca" ? (v ? ROM[v] : "–") : v}</button></div>;
      })}
    </div>
  );
  const svg = (cara, abajo) => (
    <div className="pgc-svgw" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const n = arco[Math.floor((e.clientX - r.left) / COL)]; if (n) elegirDiente(n); }}>
      <svg viewBox={`0 0 ${arco.length * COL} ${H}`} width={arco.length * COL} height={H} role="img" aria-label={`Sondaje ${cara === "v" ? "vestibular" : interna.toLowerCase()}`}
        dangerouslySetInnerHTML={{ __html: svgCara(arco, cara, abajo, dientes, cmp ? previo : null, sel) }} />
    </div>
  );
  const bloque = (cara) => (
    <div className="pgc-cara">
      <h4>{cara === "v" ? "Vestibular" : esSuperior(sel.n) ? "Palatino" : "Lingual"}</h4>
      <div className="pgc-sitios">
        {ordenVisual(sel.n, cara).map((i) => { const v = p.pd[i]; return (
          <div key={i} className={`pgc-st${sel.i === i ? " is-act" : ""}`}>
            <button type="button" className="pgc-st__main" onClick={() => elegir({ n: sel.n, i })}>
              <small>{letra(i)}</small>
              <span className={`pgc-st__v is-${sev(v)}`}>{p.ausente ? "—" : v ?? "·"}</span>
              <span className="pgc-st__sub">MG {p.mg[i] ?? "·"} · NIC {nic(v, p.mg[i]) ?? "·"}</span>
            </button>
            <div className="pgc-fl">
              {[["bop", "B", "Sangrado"], ["placa", "P", "Placa"], ["sup", "S", "Supuración"]].map(([k, l, t]) => (
                <button key={k} type="button" className={`is-${k}${p[k][i] ? " is-on" : ""}`} title={t} aria-pressed={p[k][i]} disabled={soloLectura || p.ausente} onClick={() => bandera(k, { n: sel.n, i })}>{l}</button>
              ))}
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
  const seg = (k, dis) => (
    <div className="pgc-mini">
      {[0, 1, 2, 3].map((v) => <button key={v} type="button" className={(p[k] || 0) === v ? "is-on" : ""} disabled={dis || soloLectura} onClick={() => modificar(sel.n, (q) => { q[k] = v; })}>{k === "furca" ? ROM[v] : v}</button>)}
    </div>
  );

  return (
    <div className="pgc" ref={raizRef}>
      {error && <div className="pgc-aviso"><AlertTriangle size={15} strokeWidth={2} /> No se pudo cargar el sondaje guardado. Lo que registres se guardará igual.</div>}

      <section className="pgc-panel pgc-resumen" aria-label="Resumen del examen">
        <div className={`pgc-dx is-${dxTono}`} title={`${dx.detalle} Orientativo: no reemplaza el juicio clínico ni la radiografía.`}>
          <span className="pgc-dx__led" /><b>{dx.titulo}</b>
        </div>
        <div className="pgc-kpis">
          {KPI.map(([l, v, u, d, c]) => <div key={l} className="pgc-kpi"><small>{l}</small><b className={c ? `is-${c}` : ""}>{v}{u && <u>{u}</u>}{d}</b></div>)}
        </div>
        <div className="pgc-prog" title="Sitios sondados"><span>{hechos}/{tot}</span><i style={{ "--p": `${tot ? (hechos / tot) * 100 : 0}%` }} /></div>
        <span className={`pgc-estado is-${soloLectura ? "ro" : guardado?.tipo || "ok"}`}>
          {soloLectura ? "Solo lectura" : !conectado ? "Demostración" : guardado?.tipo === "guardando" ? "Guardando…" : guardado?.tipo === "error" ? "Sin guardar" : guardado?.hora ? `Guardado ${guardado.hora}` : "Al día"}
        </span>
        {!soloLectura && <>
          <button type="button" className="pgc-ib" onClick={deshacer} disabled={!hist.u.length} aria-label="Deshacer" title="Deshacer (Ctrl+Z)"><Undo2 size={15} strokeWidth={2} /></button>
          <button type="button" className="pgc-ib" onClick={rehacer} disabled={!hist.r.length} aria-label="Rehacer" title="Rehacer (Ctrl+Y)"><Redo2 size={15} strokeWidth={2} /></button>
        </>}
      </section>

      <div className="pgc-trabajo">
        <section className="pgc-panel pgc-carta-card">
          <div className="pgc-carta-cab">
            <div className="pgc-seg" role="radiogroup" aria-label="Arcada">
              {[["sup", "Superior"], ["inf", "Inferior"]].map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={arcada === k} className={arcada === k ? "is-on" : ""}
                  onClick={() => { setArcada(k); const a = k === "sup" ? SUP : INF; if (!a.includes(sel.n)) { const f = a.find((x) => !dientes[x].ausente) || a[0]; setSel({ n: f, i: ordenVisual(f, "v")[0] }); } }}>{l}</button>
              ))}
            </div>
            {previo && <button type="button" className={`pgc-tg${comparar ? " is-on" : ""}`} aria-pressed={comparar} onClick={() => setComparar(!comparar)}>Comparar con anterior</button>}
            <div className="pgc-leyenda">
              <span><i className="is-mg" />Margen</span><span><i className="is-bolsa" />Bolsa</span><span><i className="is-enc" />Encía</span>{cmp && <span><i className="is-prev" />Anterior</span>}
            </div>
          </div>
          <div className="pgc-scroll" ref={scrollRef}>
            <div className="pgc-carta">
              {filaCiclo("movilidad", "Movilidad")}
              {filaCiclo("furca", "Furca")}
              {filaDots("v", "placa", "Placa")}
              {filaDots("v", "bop", "Sangrado")}
              {filaNum("v", "nic", "NIC")}
              {filaNum("v", "mg", "Margen")}
              {filaNum("v", "pd", "Prof.")}
              <div className="pgc-fila is-svg"><div className="pgc-rot is-cara">Vestibular</div>{svg("v", false)}</div>
              <div className="pgc-fila is-num">
                <div className="pgc-rot">Pieza</div>
                {arco.map((n) => <div key={n} className="pgc-col"><button type="button" className={`pgc-num${sel.n === n ? " is-sel" : ""}${dientes[n].ausente ? " is-aus" : ""}`} onClick={() => elegirDiente(n)}>{n}{dientes[n].implante && <span>IMP</span>}</button></div>)}
              </div>
              <div className="pgc-fila is-svg"><div className="pgc-rot is-cara">{interna}</div>{svg("l", true)}</div>
              {filaNum("l", "pd", "Prof.")}
              {filaNum("l", "mg", "Margen")}
              {filaNum("l", "nic", "NIC")}
              {filaDots("l", "bop", "Sangrado")}
              {filaDots("l", "placa", "Placa")}
            </div>
          </div>
          {criticos.length > 0 && (
            <div className="pgc-crit">
              <b>Sitios ≥ 5 mm</b>
              {criticos.slice(0, 12).map((x) => (
                <button key={`${x.n}-${x.i}`} type="button" className={x.v >= 6 ? "is-alto" : ""} onClick={() => elegir({ n: x.n, i: x.i }, "pd")}>
                  {x.n} {sitioCorto(x.n, x.i)} <strong>{x.v}</strong>{x.b && <i className="is-b" />}{x.s && <i className="is-s" />}
                </button>
              ))}
              {criticos.length > 12 && <span>+{criticos.length - 12}</span>}
            </div>
          )}
        </section>

        <aside className="pgc-panel pgc-insp" aria-label={`Pieza ${sel.n}${pacienteNombre ? ` de ${pacienteNombre}` : ""}`}>
          <div className="pgc-insp__cab">
            <div className="pgc-insp__n">{sel.n}</div>
            <div><b>{nombre(sel.n)}</b><small>{caraNom(sel.n, sel.i)} {letra(sel.i)}</small></div>
            <div className="pgc-insp__nav">
              <button type="button" className="pgc-ib" aria-label="Sitio anterior" onClick={() => elegir(siguiente(sel, -1))}><ChevronLeft size={16} strokeWidth={2.2} /></button>
              <button type="button" className="pgc-ib" aria-label="Sitio siguiente" onClick={() => elegir(siguiente(sel, 1))}><ChevronRight size={16} strokeWidth={2.2} /></button>
            </div>
          </div>
          <div className="pgc-insp__tgl">
            <button type="button" className={`pgc-tg${p.ausente ? " is-on" : ""}`} aria-pressed={p.ausente} disabled={soloLectura} onClick={() => modificar(sel.n, (q) => { q.ausente = !q.ausente; })}>Ausente</button>
            <button type="button" className={`pgc-tg${p.implante ? " is-on" : ""}`} aria-pressed={p.implante} disabled={soloLectura} onClick={() => modificar(sel.n, (q) => { q.implante = !q.implante; })}>Implante</button>
          </div>
          <div className="pgc-insp__caras">{bloque("v")}{bloque("l")}</div>
          <div className="pgc-par">
            <div><span className="pgc-lbl">Movilidad</span>{seg("movilidad", p.ausente)}</div>
            <div><span className="pgc-lbl">Furca</span>{seg("furca", !esMolar(sel.n) || p.ausente)}</div>
          </div>
          {!soloLectura && (
            <div className="pgc-teclado">
              <div className="pgc-seg is-sm" role="radiogroup" aria-label="Dato a registrar">
                {[["pd", "Profundidad"], ["mg", "Margen"]].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={campo === k} className={campo === k ? "is-on" : ""} onClick={() => { setCampo(k); setNeg(false); }}>{l}</button>)}
              </div>
              <div className="pgc-teclas">
                {Array.from({ length: 13 }, (_, v) => <button key={v} type="button" className={`pgc-tk${campo === "pd" && v >= 6 ? " is-k6" : campo === "pd" && v >= 4 ? " is-k4" : ""}`} onClick={() => { ultimo.current = null; escribirEn(sel, v); }}>{v}</button>)}
                <button type="button" className={`pgc-tk is-fn${neg ? " is-on" : ""}`} disabled={campo === "pd"} onClick={() => setNeg(!neg)} title="Margen coronal al límite amelocementario">−</button>
                <button type="button" className="pgc-tk is-fn" onClick={borrar}>Borrar</button>
                <button type="button" className="pgc-tk is-fn is-b" onClick={() => bandera("bop")}>Sangra</button>
                <button type="button" className="pgc-tk is-fn is-p" onClick={() => bandera("placa")}>Placa</button>
                <button type="button" className="pgc-tk is-fn is-s" onClick={() => bandera("sup")}>Supura</button>
                <button type="button" className="pgc-tk is-sig" onClick={() => { ultimo.current = null; ir(siguiente(sel, 1)); }}>Siguiente</button>
              </div>
              <details className="pgc-atajos">
                <summary><Keyboard size={13} strokeWidth={2} /> Atajos</summary>
                <kbd>0</kbd>–<kbd>9</kbd> registra y avanza · <kbd>1</kbd><kbd>0</kbd> = 10 · <kbd>B</kbd> sangra · <kbd>P</kbd> placa · <kbd>S</kbd> supura · <kbd>Tab</kbd> profundidad/margen · <kbd>−</kbd> margen negativo · <kbd>←</kbd><kbd>→</kbd> sitio · <kbd>↑</kbd><kbd>↓</kbd> cara · <kbd>Ctrl</kbd><kbd>Z</kbd> deshacer
              </details>
            </div>
          )}
          <textarea className="pgc-nota" aria-label={`Nota de la pieza ${sel.n}`} placeholder="Nota de la pieza" value={p.nota || ""} disabled={soloLectura}
            onChange={(e) => { const v = e.target.value; modificar(sel.n, (q) => { q.nota = v; }, false); }} />
        </aside>
      </div>
    </div>
  );
}
