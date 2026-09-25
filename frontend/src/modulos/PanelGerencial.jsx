/**
 * Panel Gerencial — sustituye el DashLienzo de #/gerencial.
 * Layout SPEC §3.2 – animaciones HTML §6 – fichas de dato §7.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api, { auth } from "../api/client";
import {
  curvaCajaAcumulada,
  diaDelMesRitmo,
  distinctPatients,
  filtraMicro,
  inicialesDe,
  layoutProgreso,
  metaEstado,
  moneyFmt,
} from "./panelGerencialUtil";
import { pluralEs, EnCabecera } from "../comun";
import "./panelGerencial.css";

const COLORES_ESP = [
  "var(--dc-accent-cyan)",
  "var(--dc-amber-ink)",
  "var(--dc-purple)",
  "var(--dc-ok-700)",
  "var(--dc-brand-600)",
];

function hoyYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hexToRgba(hex, a) {
  let h = (hex || "").replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return `rgba(14,116,144,${a})`;
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

function deltaPct(actual, anterior) {
  const a = Number(actual);
  const b = Number(anterior);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

/* ── Ficha de dato ── */
function FichaDato({ dato, onClose }) {
  const closeRef = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    prevFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key !== "Tab") return;
      const root = e.currentTarget === document ? null : null;
      const dlg = document.getElementById("dc-pg-ficha");
      if (!dlg) return;
      const focusables = dlg.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      const list = [...focusables];
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus.current && typeof prevFocus.current.focus === "function") {
        prevFocus.current.focus();
      }
    };
  }, [onClose]);

  if (!dato) return null;
  const cifra = typeof dato.cifra === "function" ? dato.cifra() : dato.cifra;
  const micro = filtraMicro(
    typeof dato.micro === "function" ? dato.micro() : dato.micro,
    cifra,
    dato.parte,
  );
  const filas = typeof dato.filas === "function" ? dato.filas() : (dato.filas || []);
  const total = typeof dato.total === "function" ? dato.total() : dato.total;
  const ancho = (dato.cols || []).length >= 5 ? "xl" : undefined;

  return (
    <div className="dc-pg-ficha-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        id="dc-pg-ficha"
        className="dc-pg-ficha"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-pg-ficha-title"
        tabIndex={-1}
        data-tono={dato.tono || "brand"}
        data-ancho={ancho}
      >
        <div className="dc-pg-ficha__head">
          <span className="ico" aria-hidden="true">i</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="dc-pg-ficha-title">{dato.t}</h2>
            <p>{dato.s}</p>
          </div>
          {dato.estado && <span className="dc-chip dc-chip--gris">{dato.estado}</span>}
          <button ref={closeRef} type="button" className="dc-pg-ficha__cerrar" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="dc-pg-ficha__body">
          <div className="mdl-hero">
            <div className="mdl-hero__n">
              <b>{cifra}</b>
              {dato.parte && <span className="parte">{dato.parte}</span>}
            </div>
            {dato.sub && <p>{dato.sub}</p>}
            {micro?.length > 0 && (
              <dl className="mdl-micro">
                {micro.map(([lab, val], i) => (
                  <div key={i}><dd>{val}</dd><dt>{lab}</dt></div>
                ))}
              </dl>
            )}
          </div>
          {dato.como && (
            <div className="mdl-bloq">
              <p className="mdl-seccion">Cómo se calcula</p>
              <p className="mdl-como">{dato.como}</p>
            </div>
          )}
          <div className="mdl-bloq">
            <p className="mdl-seccion">El detalle</p>
            {filas.length === 0 ? (
              <div className="mdl-vacio">{dato.vacio || "Sin filas para mostrar."}</div>
            ) : (
              <div style={{ overflow: "auto", maxHeight: 420 }}>
                <table className="mdl-tabla">
                  <thead>
                    <tr>
                      {(dato.cols || []).map(([h, align], i) => (
                        <th key={i} className={align === "n" ? "n" : undefined}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => {
                          const isNum = (dato.cols || [])[j]?.[1] === "n";
                          const txt = cell && typeof cell === "object" ? (cell.v ?? cell.n ?? cell.chip ?? "") : cell;
                          return <td key={j} className={isNum ? "n" : undefined}>{txt}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                  {total != null && (
                    <tfoot>
                      <tr>
                        <td>Total</td>
                        {(dato.cols || []).slice(1).map((_, j) => (
                          <td key={j} className="n">{j === (dato.cols.length - 2) ? total : ""}</td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
          {dato.falta ? (
            <div className="mdl-falta"><b>Qué falta:</b> {dato.falta}</div>
          ) : dato.fuente ? (
            <p className="mdl-fuente">{dato.fuente}</p>
          ) : null}
        </div>
        <div className="dc-pg-ficha__footer">
          <span>{dato.nota || (dato.ejemplo ? "Detalle de ejemplo – los totales son reales" : "Dato de la clínica")}</span>
          <button type="button" className="dc-btn dc-btn--secundario dc-btn--sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Canvas: caja ── */
function CanvasCaja({ puntos, onOpen }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const badgeRef = useRef(null);
  const state = useRef({ hVis: 8, max: 40, listo: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const quieto = prefersReducedMotion();
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let stopped = false;

    const medir = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { W: r.width, H: r.height };
    };

    const pinta = () => {
      if (stopped) return;
      const { W, H } = medir();
      const pad = { l: 8, r: 12, t: 18, b: 28 };
      const pts = puntos?.length ? puntos : [[8, 0], [8.01, 0]];
      const pico = Math.max(...pts.map((p) => p[1]), 0);
      const objetivo = Math.max(40, Math.ceil((pico * 1.08) / 20) * 20);
      const st = state.current;
      if (quieto) {
        st.max = objetivo;
        st.hVis = pts[pts.length - 1][0];
        st.listo = true;
      } else {
        st.max += (objetivo - st.max) * 0.1;
        st.max = Math.max(st.max, pico * 1.08, 40);
        const ult = pts[pts.length - 1][0];
        st.hVis += (ult - st.hVis) * 0.045;
        if (ult - st.hVis < 0.015) st.hVis = ult;
      }
      const xOf = (h) => pad.l + ((h - 8) / 12) * (W - pad.l - pad.r);
      const yOf = (v) => pad.t + (1 - v / st.max) * (H - pad.t - pad.b);
      const poly = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p[0] <= st.hVis) { poly.push(p); continue; }
        if (i > 0) {
          const a = pts[i - 1];
          const f = (st.hVis - a[0]) / Math.max(1e-6, p[0] - a[0]);
          if (f > 0) poly.push([st.hVis, a[1] + (p[1] - a[1]) * Math.min(1, f)]);
        }
        break;
      }
      if (!poly.length) poly.push(pts[0]);

      ctx.clearRect(0, 0, W, H);
      const g1 = cssVar("--dc-accent-cyan", "#0E7490");
      const line = cssVar("--dc-line", "#E7EAF0");
      const ink = cssVar("--dc-ink-400", "#667085");
      // zona futura
      const ahora = new Date().getHours() + new Date().getMinutes() / 60;
      const xAhora = xOf(Math.min(20, Math.max(8, ahora)));
      ctx.fillStyle = hexToRgba(line.replace(/\s/g, "") || "#E7EAF0", 0.55);
      // use soft fill
      ctx.fillStyle = "color-mix(in srgb, var(--dc-line) 55%, transparent)";
      try {
        ctx.fillStyle = hexToRgba("#E7EAF0", 0.45);
        ctx.fillRect(xAhora, pad.t, W - pad.r - xAhora, H - pad.t - pad.b);
      } catch (_) { /* */ }

      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      for (let h = 8; h <= 20; h += 2) {
        const x = xOf(h);
        ctx.beginPath();
        ctx.moveTo(x, pad.t);
        ctx.lineTo(x, H - pad.b);
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.font = "10px 'Inter Variable', 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${String(h).padStart(2, "0")}:00`, x, H - 8);
      }

      if (poly.length > 1) {
        const grd = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
        grd.addColorStop(0, hexToRgba(g1, 0.28));
        grd.addColorStop(1, hexToRgba(g1, 0.02));
        ctx.beginPath();
        ctx.moveTo(xOf(poly[0][0]), yOf(poly[0][1]));
        for (let i = 1; i < poly.length; i++) ctx.lineTo(xOf(poly[i][0]), yOf(poly[i][1]));
        ctx.lineTo(xOf(poly[poly.length - 1][0]), H - pad.b);
        ctx.lineTo(xOf(poly[0][0]), H - pad.b);
        ctx.closePath();
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(xOf(poly[0][0]), yOf(poly[0][1]));
        for (let i = 1; i < poly.length; i++) ctx.lineTo(xOf(poly[i][0]), yOf(poly[i][1]));
        ctx.strokeStyle = g1;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        const last = poly[poly.length - 1];
        const bx = xOf(last[0]);
        const by = yOf(last[1]);
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fillStyle = g1;
        ctx.fill();
        if (badgeRef.current) {
          badgeRef.current.textContent = moneyFmt(last[1]);
          badgeRef.current.style.left = `${bx}px`;
          badgeRef.current.style.top = `${by}px`;
          badgeRef.current.classList.add("ver");
        }
      }
      if (!quieto && !st.listo) raf = requestAnimationFrame(pinta);
      else if (!quieto) raf = requestAnimationFrame(pinta);
    };

    pinta();
    const onResize = () => pinta();
    window.addEventListener("resize", onResize);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [puntos]);

  return (
    <div className="serie serie--alto" ref={wrapRef}>
      <canvas ref={canvasRef} className="clic" onClick={onOpen} aria-label="Curva de cobros del día" />
      <div className="badge" ref={badgeRef} />
    </div>
  );
}

/* ── Canvas: flujo ── */
function CanvasFlujo() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const quieto = prefersReducedMotion();
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let stopped = false;
    const parts = Array.from({ length: 26 }, (_, i) => ({
      t: i / 26,
      vel: 0.00055 + (i % 5) * 0.00008,
    }));

    const pinta = (t0) => {
      if (stopped) return;
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width;
      const H = r.height;
      ctx.clearRect(0, 0, W, H);
      const g1 = cssVar("--dc-accent-cyan", "#0E7490");
      const brand = cssVar("--dc-brand-600", "#0B5366");
      const ok = cssVar("--dc-ok-700", "#15803D");
      const nodos = [0.08, 0.5, 0.92].map((x, k) => ({
        x: x * W,
        y: H * 0.48,
        c: [g1, brand, ok][k],
      }));
      ctx.strokeStyle = hexToRgba("#C4CBD6", 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nodos[0].x, nodos[0].y);
      for (let x = nodos[0].x; x <= nodos[2].x; x += 4) {
        const u = (x - nodos[0].x) / (nodos[2].x - nodos[0].x);
        const y = H * 0.48 + Math.sin(u * Math.PI * 2) * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      const pulse = quieto ? 1 : 0.7 + 0.3 * Math.sin((t0 || 0) / 400);
      nodos.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 10 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(n.c, 0.18);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = n.c;
        ctx.fill();
      });
      parts.forEach((p) => {
        if (!quieto) p.t = (p.t + p.vel) % 1;
        const u = p.t;
        const x = nodos[0].x + u * (nodos[2].x - nodos[0].x);
        const y = H * 0.48 + Math.sin(u * Math.PI * 2) * 18;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(g1, 0.75);
        ctx.fill();
      });
      if (!quieto) raf = requestAnimationFrame(pinta);
    };
    if (quieto) pinta(0);
    else raf = requestAnimationFrame(pinta);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="flujo" ref={wrapRef}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="etq" style={{ left: 14 }}>Agenda</span>
      <span className="etq" style={{ left: "50%", transform: "translateX(-50%)" }}>Sillón</span>
      <span className="etq" style={{ right: 14 }}>Cobro</span>
    </div>
  );
}

/* ── Canvas: esfera ── */
function CanvasEsfera({ pacientes, onPick }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fichaRef = useRef(null);
  const rotRef = useRef(null);
  const hover = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const quieto = prefersReducedMotion();
    const ctx = canvas.getContext("2d");
    const list = (pacientes || []).slice(0, 80);
    const N = Math.max(list.length, 1);
    const GOLD = Math.PI * (3 - Math.sqrt(5));
    const bolas = list.map((p, i) => {
      const y = 1 - (i / Math.max(N - 1, 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GOLD * i;
      const saldo = Math.max(0, Number(p.saldo) || 0);
      let estado = "al_dia";
      if (saldo > 0) estado = "saldo";
      else if (!p.ultimaCita) estado = "nuevo";
      return {
        p,
        x: Math.cos(th) * rad,
        y,
        z: Math.sin(th) * rad,
        r: 2.5 + Math.min(6, Math.sqrt(saldo) / 8),
        estado,
      };
    });
    let gy = 0;
    let raf = 0;
    let stopped = false;

    const colorEstado = (e) => {
      if (e === "saldo") return cssVar("--dc-danger-700", "#B42318");
      if (e === "nuevo") return cssVar("--dc-accent-cyan", "#0E7490");
      return cssVar("--dc-ok-700", "#15803D");
    };

    const pinta = () => {
      if (stopped) return;
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width;
      const H = r.height;
      const cx = W / 2;
      const cy = H / 2;
      const S = Math.min(W, H) * 0.38;
      if (!quieto && !hover.current) gy += 0.0042;
      ctx.clearRect(0, 0, W, H);
      const proyectados = bolas.map((b) => {
        const cos = Math.cos(gy);
        const sin = Math.sin(gy);
        const x = b.x * cos - b.z * sin;
        const z = b.x * sin + b.z * cos;
        return { ...b, px: cx + x * S, py: cy + b.y * S, pz: z };
      }).sort((a, b) => a.pz - b.pz);
      proyectados.forEach((b) => {
        const depth = (b.pz + 1) / 2;
        const alpha = 0.35 + depth * 0.65;
        const rr = b.r * (0.7 + depth * 0.5);
        ctx.beginPath();
        ctx.arc(b.px, b.py, rr, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(colorEstado(b.estado).replace(/\s/g, "") || "#15803D", alpha);
        // fallback if color is css var unresolved
        ctx.fillStyle = colorEstado(b.estado);
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      if (rotRef.current) rotRef.current.textContent = `${list.length} NODOS`;
      if (!quieto) raf = requestAnimationFrame(pinta);
    };

    const onMove = (ev) => {
      hover.current = true;
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      // nearest
      let best = null;
      let bestD = 18;
      const r = wrap.getBoundingClientRect();
      const cx = r.width / 2;
      const cy = r.height / 2;
      const S = Math.min(r.width, r.height) * 0.38;
      const cos = Math.cos(gy);
      const sin = Math.sin(gy);
      bolas.forEach((b) => {
        const x = b.x * cos - b.z * sin;
        const z = b.x * sin + b.z * cos;
        const px = cx + x * S;
        const py = cy + b.y * S;
        const d = Math.hypot(px - mx, py - my);
        if (d < bestD) { bestD = d; best = b; }
      });
      if (fichaRef.current) {
        if (best) {
          fichaRef.current.innerHTML = `<b>${best.p.nombre || "Paciente"}</b><br/><em>Saldo ${moneyFmt(best.p.saldo)}</em>`;
          fichaRef.current.classList.add("ver");
          canvas.style.cursor = "pointer";
        } else {
          fichaRef.current.classList.remove("ver");
          canvas.style.cursor = "crosshair";
        }
      }
      canvas._pick = best;
    };
    const onLeave = () => {
      hover.current = false;
      fichaRef.current?.classList.remove("ver");
    };
    const onClick = () => {
      if (canvas._pick) onPick?.(canvas._pick.p);
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("click", onClick);
    if (quieto) pinta();
    else raf = requestAnimationFrame(pinta);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, [pacientes, onPick]);

  return (
    <div className="lienzo" ref={wrapRef}>
      <canvas ref={canvasRef} className="clic" />
      <span className="rot" ref={rotRef} />
      <div className="ficha" ref={fichaRef} />
    </div>
  );
}

/* ── Canvas: cubo ── */
function CanvasCubo({ pacientes, onPick }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rotRef = useRef(null);
  const fichaRef = useRef(null);
  const hover = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const quieto = prefersReducedMotion();
    const ctx = canvas.getContext("2d");
    const hoy = new Date();
    const pts = (pacientes || []).slice(0, 60).map((p) => {
      let dias = 90;
      if (p.ultimaCita) {
        const u = new Date(p.ultimaCita);
        dias = Math.max(0, Math.min(180, (hoy - u) / 86400000));
      }
      const importe = Math.max(0, Number(p.importeAcumulado) || 0);
      const visitas = Math.max(1, Math.min(6, Number(p.numeroDeCitas) || 1));
      return {
        p,
        x: (dias / 180) * 2 - 1,
        y: -(importe / 1650) * 2 + 1,
        z: (visitas / 6) * 2 - 1,
        saldo: Number(p.saldo) || 0,
      };
    });
    let ang = 0.4;
    const tilt = 0.35;
    let raf = 0;
    let stopped = false;

    const pK = (x, y, z, cx, cy, S) => {
      const X = x * Math.cos(ang) - z * Math.sin(ang);
      let Z = x * Math.sin(ang) + z * Math.cos(ang);
      const Y = y * Math.cos(tilt) - Z * Math.sin(tilt);
      const Z2 = y * Math.sin(tilt) + Z * Math.cos(tilt);
      const k = 560 / (560 + Z2 * S);
      return { x: cx + X * S * k, y: cy + Y * S * k, z: Z2 };
    };

    const pinta = () => {
      if (stopped) return;
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width;
      const H = r.height;
      const cx = W / 2;
      const cy = H / 2;
      const S = Math.min(W, H) * 0.32;
      if (!quieto && !hover.current) ang += 0.0037;
      ctx.clearRect(0, 0, W, H);
      const cyan = cssVar("--dc-accent-cyan", "#0E7490");
      const amber = cssVar("--dc-amber-ink", "#D97706");
      const purple = cssVar("--dc-purple", "#7C3AED");
      const verts = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        verts.push(pK(sx, sy, sz, cx, cy, S));
      }
      const edges = [
        [0, 1, amber], [2, 3, amber], [4, 5, amber], [6, 7, amber],
        [0, 2, cyan], [1, 3, cyan], [4, 6, cyan], [5, 7, cyan],
        [0, 4, purple], [1, 5, purple], [2, 6, purple], [3, 7, purple],
      ];
      // map indices properly for cube corners
      const corners = [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]]
        .map(([x, y, z]) => pK(x, y, z, cx, cy, S));
      const edgeDefs = [
        [0, 1, amber], [2, 3, amber], [4, 5, amber], [6, 7, amber],
        [0, 2, cyan], [1, 3, cyan], [4, 6, cyan], [5, 7, cyan],
        [0, 4, purple], [1, 5, purple], [2, 6, purple], [3, 7, purple],
      ];
      edgeDefs
        .map(([a, b, c]) => ({ a: corners[a], b: corners[b], c, z: (corners[a].z + corners[b].z) / 2 }))
        .sort((u, v) => u.z - v.z)
        .forEach((e) => {
          ctx.beginPath();
          ctx.moveTo(e.a.x, e.a.y);
          ctx.lineTo(e.b.x, e.b.y);
          ctx.strokeStyle = e.c;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        });
      pts.map((p) => ({ ...p, ...pK(p.x, p.y, p.z, cx, cy, S) }))
        .sort((a, b) => a.z - b.z)
        .forEach((p) => {
          const hot = p.saldo > 0 && p.x > 0.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, hot ? 4.5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = hot ? cssVar("--dc-danger-700", "#B42318") : cssVar("--dc-ink-500", "#5A6474");
          ctx.fill();
          if (hot) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba("#B42318", 0.35);
            ctx.stroke();
          }
        });
      if (rotRef.current) rotRef.current.textContent = `ROT ${Math.round((ang % (Math.PI * 2)) * 180 / Math.PI)}°`;
      if (!quieto) raf = requestAnimationFrame(pinta);
    };

    const onEnter = () => { hover.current = true; };
    const onLeave = () => { hover.current = false; fichaRef.current?.classList.remove("ver"); };
    const onClick = () => {
      const hot = pts.filter((p) => p.saldo > 0).sort((a, b) => b.saldo - a.saldo)[0];
      if (hot) onPick?.(hot.p);
    };
    canvas.addEventListener("mouseenter", onEnter);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("click", onClick);
    if (quieto) pinta();
    else raf = requestAnimationFrame(pinta);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mouseenter", onEnter);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, [pacientes, onPick]);

  return (
    <div className="lienzo" ref={wrapRef}>
      <canvas ref={canvasRef} className="clic" />
      <span className="rot" ref={rotRef} />
      <div className="ficha" ref={fichaRef} />
    </div>
  );
}

function BarraFila({ nombre, valor, total, color, onOpen, etiquetaCero = "sin ventas" }) {
  const lay = layoutProgreso(valor, total);
  if (!lay.dibujar) {
    return (
      <div className="hb hb--nula clic" role="button" tabIndex={0}
        onClick={onOpen} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen?.(e)}>
        <span className="n">{nombre}</span>
        <span className="v">{moneyFmt(valor)}</span>
        <span className="pc">{etiquetaCero}</span>
      </div>
    );
  }
  return (
    <div className="hb clic" role="button" tabIndex={0}
      onClick={onOpen} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen?.(e)}>
      <span className="n">{nombre}</span>
      <span className="v">{moneyFmt(valor)}</span>
      <span className="pc">{lay.etiquetaPct}</span>
      <div className="pista">
        <div className="seg" data-w={lay.pct} style={{ width: `${lay.pct}%`, ["--w"]: `${lay.pct}%`, background: color }} />
      </div>
    </div>
  );
}

function StackSegs({ items, total }) {
  return (
    <div className="stack" role="img">
      {items.map((it, i) => {
        const lay = layoutProgreso(it.valor, total);
        if (!lay.dibujar) return null;
        return (
          <i key={i} data-w={lay.pct}
            style={{ width: `${lay.pct}%`, ["--w"]: `${lay.pct}%`, background: it.color }} />
        );
      })}
    </div>
  );
}

/* ── Panel principal ── */
export default function PanelGerencial({ citas: citasProp = [], sede }) {
  const conectado = !!auth.token;
  const [kd, setKd] = useState(null);
  const [ind, setInd] = useState(null);
  const [rep, setRep] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [citasHoy, setCitasHoy] = useState(citasProp || []);
  const [actividad, setActividad] = useState(null);
  const [tratResumen, setTratResumen] = useState(null);
  const [pacResumen, setPacResumen] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [metaEdit, setMetaEdit] = useState(null);
  const [metaVal, setMetaVal] = useState("");
  const [reloj, setReloj] = useState("");
  const [inventarioValorizado, setInventarioValorizado] = useState(null);
  const [nSillones, setNSillones] = useState(null);
  const [nSedes, setNSedes] = useState(null);
  const fecha = hoyYmd();

  const abrir = useCallback((d) => setFicha(d), []);
  const cerrar = useCallback(() => setFicha(null), []);

  const recargar = useCallback(() => {
    if (!conectado) return;
    api.gerencial().then(setKd).catch(() => setKd({ error: true }));
    api.gerencialIndicadores().then(setInd).catch(() => setInd({ errorDeCarga: true }));
    api.gerencialReportes().then(setRep).catch(() => setRep({ errorDeCarga: true }));
    api.pagos.listar().then((r) => setPagos(r || [])).catch(() => setPagos([]));
    api.citas.listar(fecha).then((r) => setCitasHoy(r || [])).catch(() => setCitasHoy([]));
    api.actividad(fecha).then((r) => setActividad(r || [])).catch(() => setActividad([]));
    const d = new Date();
    const desde = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    api.tratamientos.resumen(desde, fecha, { areaClinica: "Odontología general" })
      .then((r) => setTratResumen(r || []))
      .catch(() => setTratResumen([]));
    api.pacientes.resumen().then((r) => setPacResumen(r || [])).catch(() => setPacResumen([]));
    api.inventario.listar().then((rows) => {
      const list = Array.isArray(rows) ? rows : [];
      let total = 0;
      let ok = false;
      for (const it of list) {
        if (it && it.activo === false) continue;
        const stock = Number(it.stock);
        const costo = Number(it.costoUnitario ?? it.costo_unitario);
        if (Number.isFinite(stock) && Number.isFinite(costo)) {
          total += stock * costo;
          ok = true;
        }
      }
      setInventarioValorizado(ok ? total : null);
    }).catch(() => setInventarioValorizado(null));
    api.sillones.listar().then((rows) => {
      setNSillones(Array.isArray(rows) ? rows.length : null);
    }).catch(() => setNSillones(null));
    api.sedes.listar().then((rows) => {
      setNSedes(Array.isArray(rows) ? rows.length : null);
    }).catch(() => setNSedes(null));
  }, [conectado, fecha, citasProp]);

  useEffect(() => { recargar(); }, [recargar]);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
      setReloj(`${dias[n.getDay()]} ${String(n.getDate()).padStart(2, "0")} ${meses[n.getMonth()]} – ${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}:${String(n.getSeconds()).padStart(2, "0")}`);
    };
    tick();
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const meta = metaEstado(kd?.hayMeta, kd?.metaMensualClinica);
  const prodMes = Number(kd?.ingresosMes) || 0;
  const prodDia = Number(kd?.produccionDia) || 0;
  const atendidosApi = kd?.pacientesAtendidosHoy;
  const atendidos = atendidosApi != null
    ? Number(atendidosApi) || 0
    : distinctPatients(citasHoy, "atendida");
  const dMes = deltaPct(kd?.ingresosMes, kd?.ingresosMesAnterior);
  const ritmo = diaDelMesRitmo();
  const avanceMeta = !meta.vacia && meta.meta > 0 ? (prodMes / meta.meta) * 100 : 0;

  const pagosHoy = useMemo(
    () => (pagos || []).filter((p) => String(p.creadoEn || p.fecha || "").slice(0, 10) === fecha),
    [pagos, fecha],
  );
  const cobradoHoy = pagosHoy.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const ticketMedio = pagosHoy.length ? cobradoHoy / pagosHoy.length : 0;
  const curva = useMemo(() => curvaCajaAcumulada(pagosHoy, fecha), [pagosHoy, fecha]);
  const funnel = rep?.funnel || {};
  const waConversaciones = Number(funnel.conversaciones) || 0;
  const waAgendadas = Number(funnel.agendadas) || 0;

  const deuda = ind?.deudaPorAntiguedad || {};
  const agingItems = [
    { nom: "Corriente – 0–30 d", valor: Number(deuda.hasta30) || 0, color: "var(--dc-ok-700)" },
    { nom: "31–60 días", valor: Number(deuda.de31a60) || 0, color: "var(--dc-amber-ink)" },
    { nom: "61–90 días", valor: Number(deuda.de61a90) || 0, color: "var(--dc-warn-700)" },
    { nom: "+90 días – riesgo", valor: Number(deuda.masDe90) || 0, color: "var(--dc-danger-700)" },
  ];
  const agingTotal = agingItems.reduce((s, x) => s + x.valor, 0);

  const alertas = ind?.alertas || [];
  const conv = ind?.conversionPlanes || {};
  const aceptado = Number(conv.aceptado) || 0;
  const rechazado = Number(conv.rechazado) || 0;
  const pendiente = Number(conv.pendiente) || 0;
  const propuesto = aceptado + rechazado + pendiente;
  const espRaw = (ind?.porEspecialidad || []).map((e) => ({
    nombre: e.nombre || e.especialidad || "—",
    valor: Number(e.produccion ?? e.ingresos ?? e.monto ?? 0) || 0,
  }));
  const espTotal = espRaw.reduce((s, e) => s + e.valor, 0);

  const tratList = Array.isArray(tratResumen) ? tratResumen : [];
  const tratTotal = tratList.reduce((s, t) => s + (Number(t.importeTotal) || 0), 0);
  const tratSorted = [...tratList].sort((a, b) => (Number(b.importeTotal) || 0) - (Number(a.importeTotal) || 0));

  const cartera = ind?.cartera || {};
  const pacs = pacResumen || [];
  const conSaldo = pacs.filter((p) => Number(p.saldo) > 0);
  const saldoMayor = conSaldo.reduce((m, p) => Math.max(m, Number(p.saldo) || 0), 0);

  const ranking = kd?.ranking || [];

  const enSillon = citasHoy.filter((c) => c.estado === "en_atencion").length;
  const cobradas = citasHoy.filter((c) => c.estado === "atendida").length;
  const franjas = 12;
  const ocupadas = Math.min(franjas, citasHoy.length);
  const sillonesLibres = nSillones != null
    ? Math.max(0, nSillones - enSillon)
    : null;
  const alDia = Math.max(0, (pacs.length || 0) - conSaldo.length);
  const nuevos30 = Number(cartera.nuevos ?? cartera.sinAtender) || pacs.filter((p) => {
    const u = p.ultimaCita || p.creadoEn || p.fechaAlta;
    if (!u) return false;
    const t = new Date(String(u).slice(0, 10)).getTime();
    if (!Number.isFinite(t)) return false;
    return (Date.now() - t) <= 30 * 86400000;
  }).length;
  const subHead = [
    nSedes != null ? `${nSedes} sede${nSedes === 1 ? "" : "s"}` : null,
    "datos al día de hoy",
  ].filter(Boolean).join(" – ");

  const guardarMeta = async () => {
    if (!metaEdit?.id) return;
    const n = Number(metaVal);
    try {
      await api.catalogo.fijarMeta(metaEdit.id, Number.isFinite(n) && n > 0 ? n : null);
      setMetaEdit(null);
      setMetaVal("");
      recargar();
    } catch (_) {
      /* notify via silent fail — panel stays */
    }
  };

  const fichaMeta = () => abrir({
    t: "Meta del mes",
    s: "Suma de las metas de los odontólogos activos",
    cifra: meta.vacia ? meta.label : meta.label,
    parte: meta.vacia ? undefined : `${avanceMeta.toFixed(1)}%`,
    sub: meta.vacia
      ? "Todavía no hay metas configuradas en el equipo."
      : `Faltan ${moneyFmt(Math.max(0, meta.meta - prodMes))} para llegar.`,
    como: "La meta de la clínica es la suma de las metas mensuales de cada odontólogo activo. El avance es la producción del mes dividido entre esa meta.",
    cols: [["Odontólogo"], ["Meta", "n"]],
    filas: ranking.map((r) => [r.nombre || r.medico || "—", r.meta != null ? moneyFmt(r.meta) : "Sin meta"]),
    vacio: "Ningún odontólogo tiene meta.",
    falta: meta.vacia ? "Define la meta mensual en la ficha de cada odontólogo (Configuración → Doctores) o con Definir en Equipo." : undefined,
    fuente: meta.vacia ? undefined : "Producción del mes cruzada con las metas del equipo.",
    tono: meta.vacia ? "aviso" : "brand",
  });

  return (
    <div className="dc-pg">

      {/* Estado y ayuda del panel viven en la cabecera de la app: sin fila extra. */}
      <EnCabecera>
        {/* .dc-pg envuelve el portal para que los estilos del panel (chip, botones) sigan aplicando. */}
        <div className="dc-pg dc-pg--top"><div className="dc-head-acc" title={subHead}>
          <span className="dc-chip dc-chip--vivo"><span className="punto" aria-hidden="true" />En vivo</span>
          <span className="dc-reloj">{reloj}</span>
          <button type="button" className="dc-btn dc-btn--secundario dc-btn--sm" onClick={recargar}>Hoy</button>
          <button type="button" className="dc-btn dc-btn--secundario dc-btn--sm" onClick={() => abrir({
            t: "Qué mide cada gráfico",
            s: "Índice del panel",
            cifra: "11",
            parte: "módulos",
            sub: "De la meta del mes al equipo, en el orden en que mira un gerente.",
            como: "El orden responde a cómo se mira la clínica: primero el día, luego lo que cuesta dinero, luego el mes, luego los pacientes, luego el equipo.",
            cols: [["Módulo"], ["Pregunta"]],
            filas: [
              ["Meta del mes", "¿A dónde tengo que llegar?"],
              ["Producción", "¿Dónde voy / qué hice hoy?"],
              ["Caja del día", "¿Cuánto entró a caja?"],
              ["Requiere acción", "¿Qué no puedo dejar para mañana?"],
              ["Equipo", "¿Quién aporta y a qué ritmo?"],
            ],
            tono: "cian",
          })}>
            <span aria-hidden="true">ℹ</span> Qué mide cada gráfico
          </button>
        </div></div>
      </EnCabecera>

      <section className="dc-kpis" aria-label="Indicadores">
        <div className="dc-kpi clic" role="button" tabIndex={0} onClick={fichaMeta}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fichaMeta()}>
          <span className="dc-kpi__icon" style={{ background: "var(--dc-brand-100)", color: "var(--dc-brand-600)" }} aria-hidden="true">◎</span>
          <div className="dc-kpi__body">
            <div className="dc-kpi__label">Meta del mes</div>
            {meta.vacia ? (
              <>
                <div className="dc-kpi__value" style={{ color: "var(--dc-ink-400)", fontSize: 18 }}>{meta.label}</div>
                <div className="dc-kpi__sub">Define metas en Equipo o Configuración</div>
              </>
            ) : (
              <>
                <div className="dc-kpi__value">
                  {meta.label}
                  <span className={`delta ${avanceMeta < ritmo.ritmoPct ? "down" : "up"}`}>{avanceMeta.toFixed(1)}%</span>
                </div>
                <div className="dc-meta-barra" role="img" aria-label={`Avance ${avanceMeta.toFixed(1)}%`}>
                  <i data-w={Math.min(100, avanceMeta)} style={{ width: `${Math.min(100, avanceMeta)}%`, ["--w"]: `${Math.min(100, avanceMeta)}%` }} />
                  <span className="ritmo" style={{ left: `${ritmo.ritmoPct}%` }} />
                </div>
                <div className="dc-kpi__sub">
                  faltan {moneyFmt(Math.max(0, meta.meta - prodMes))} – <b style={{ color: "var(--dc-danger-700)" }}>ritmo {ritmo.ritmoPct.toFixed(0)}%</b>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="dc-kpi clic" role="button" tabIndex={0}
          onClick={() => abrir({
            t: "Producción del mes",
            s: "Trabajo facturado del 1 al día de hoy",
            cifra: moneyFmt(prodMes),
            parte: dMes != null ? `${dMes >= 0 ? "▲" : "▼"} ${Math.abs(dMes).toFixed(1)}%` : undefined,
            sub: "No es cobro de caja: es el valor del trabajo emitido.",
            como: "Suma de citas atendidas × precio base de especialidad (misma regla que Producción y comisiones). Comparada con el mismo tramo del mes anterior.",
            micro: [["Mes anterior", moneyFmt(kd?.ingresosMesAnterior)], ["Citas del mes", String(kd?.citasMes ?? "—")]],
            cols: [["Concepto"], ["Importe", "n"]],
            filas: [["Producción del mes", moneyFmt(prodMes)]],
            total: moneyFmt(prodMes),
            fuente: "Citas atendidas del mes × precio base de especialidad (misma definición que comisiones).",
            tono: "brand",
          })}>
          <span className="dc-kpi__icon" style={{ background: "var(--dc-brand-100)", color: "var(--dc-brand-600)" }} aria-hidden="true">↗</span>
          <div className="dc-kpi__body">
            <div className="dc-kpi__label">Producción del mes</div>
            <div className="dc-kpi__value">
              {moneyFmt(prodMes)}
              {dMes != null && <span className={`delta ${dMes >= 0 ? "up" : "down"}`}>{dMes >= 0 ? "▲" : "▼"} {Math.abs(dMes).toFixed(1)}%</span>}
            </div>
            <div className="dc-kpi__sub">{kd?.citasMes ?? "—"} citas – vs {moneyFmt(kd?.ingresosMesAnterior)} mes ant.</div>
          </div>
        </div>

        <div className="dc-kpi clic" role="button" tabIndex={0}
          onClick={() => abrir({
            t: "Producción del día",
            s: "Trabajo facturado hoy",
            cifra: moneyFmt(prodDia),
            sub: "Producción no es cobro.",
            como: "Misma lógica que la producción del mes, acotada a hoy.",
            cols: [["Paciente"], ["Estado"]],
            filas: citasHoy.filter((c) => c.estado === "atendida").map((c) => [c.paciente || c.pacienteNombre || "—", "Atendida"]),
            vacio: "Aún no hay citas atendidas hoy.",
            fuente: "Citas de hoy en estado atendida.",
            tono: "ok",
          })}>
          <span className="dc-kpi__icon" style={{ background: "var(--dc-ok-100)", color: "var(--dc-ok-700)" }} aria-hidden="true">$</span>
          <div className="dc-kpi__body">
            <div className="dc-kpi__label">Producción del día</div>
            <div className="dc-kpi__value">{moneyFmt(prodDia)}</div>
            <div className="dc-kpi__sub">{citasHoy.filter((c) => c.estado === "atendida").length} facturadas – {pluralEs(citasHoy.length, "cita", "citas")} en agenda</div>
          </div>
        </div>

        <div className="dc-kpi clic" role="button" tabIndex={0}
          onClick={() => abrir({
            t: "Pacientes atendidos hoy",
            s: "Personas distintas, no citas",
            cifra: String(atendidos),
            sub: "Un paciente con dos citas el mismo día cuenta una sola vez.",
            como: "Citas de hoy en estado atendida, contando pacientes distintos.",
            cols: [["Paciente"], ["Citas"]],
            filas: (() => {
              const map = new Map();
              citasHoy.filter((c) => c.estado === "atendida").forEach((c) => {
                const k = String(c.pacienteId ?? c.paciente ?? "");
                map.set(k, (map.get(k) || 0) + 1);
              });
              return [...map.entries()].map(([k, n]) => {
                const c = citasHoy.find((x) => String(x.pacienteId ?? x.paciente) === k);
                return [c?.paciente || c?.pacienteNombre || k, String(n)];
              });
            })(),
            vacio: "Nadie atendido aún hoy.",
            tono: "cian",
          })}>
          <span className="dc-kpi__icon" style={{ background: "var(--dc-info-100)", color: "var(--dc-info-700)" }} aria-hidden="true">✓</span>
          <div className="dc-kpi__body">
            <div className="dc-kpi__label">Pacientes atendidos hoy</div>
            <div className="dc-kpi__value">{atendidos}</div>
            <div className="dc-kpi__sub">{pluralEs(citasHoy.length, "cita", "citas")} en agenda – {enSillon} en sillón</div>
          </div>
        </div>
      </section>

      {/* Caja | Actividad */}
      <div className="dc-grid g-2a">
        <section className="dc-card">
          <div className="dc-card__head">
            <span className="vin" style={{ background: "var(--g1)" }} />
            <h2>Caja del día</h2>
            <span className="dc-card__meta">08:00 – 20:00 – en vivo</span>
            <button type="button" className="dc-info" aria-label="Detalle de caja"
              onClick={() => abrir({
                t: "Caja del día",
                s: "Cobros acumulados de la jornada",
                cifra: moneyFmt(cobradoHoy),
                parte: `${pagosHoy.length} cobros`,
                sub: "La curva nunca decrece: cada cobro suma.",
                como: "Suma acumulada de los pagos del día ordenados por hora.",
                micro: [["Ticket medio", moneyFmt(ticketMedio)], ["Cobros del día", String(pagosHoy.length)]],
                cols: [["Hora"], ["Concepto"], ["Monto", "n"]],
                filas: pagosHoy.map((p) => [
                  String(p.creadoEn || "").slice(11, 16) || "—",
                  p.concepto || p.metodo || "Cobro",
                  moneyFmt(p.monto),
                ]),
                total: moneyFmt(cobradoHoy),
                fuente: "Pagos registrados hoy. Cobrado del periodo y tasa de cobro viven en Producción y comisiones.",
                tono: "cian",
              })}>i</button>
          </div>
          <div className="dc-card__body dc-card__body--alto">
            <dl className="dc-datos">
              <div><dt>Cobrado hoy</dt><dd style={{ color: "var(--g1)" }}>{moneyFmt(cobradoHoy)}</dd></div>
              <div><dt>Cobros</dt><dd>{pagosHoy.length}</dd></div>
              <div><dt>Ticket medio</dt><dd>{moneyFmt(ticketMedio)}</dd></div>
            </dl>
            <CanvasCaja puntos={curva} onOpen={() => abrir({
              t: "Caja del día", s: "Curva acumulada", cifra: moneyFmt(cobradoHoy),
              como: "Cada cobro añade un punto a la línea.", cols: [["Monto", "n"]], filas: [[moneyFmt(cobradoHoy)]], tono: "cian",
            })} />
          </div>
          <p className="dc-card__foot">Cada cobro del registro añade un punto y estira la línea.
            Pasa el ratón para leer cualquier momento del día.</p>
        </section>

        <section className="dc-card">
          <div className="dc-card__head">
            <span className="vin" style={{ background: "var(--dc-ok-700)" }} />
            <h2>Actividad de hoy</h2>
            <span className="dc-card__meta">{Array.isArray(actividad) ? `${actividad.length} eventos` : "—"}</span>
            <button type="button" className="dc-info" aria-label="Detalle de actividad"
              onClick={() => abrir({
                t: "Actividad de hoy",
                s: "Registro corrido del día",
                cifra: String(actividad?.length ?? 0),
                parte: "eventos",
                sub: "Accesos, citas, cobros, stock, caja.",
                como: "Se reúne lo que ya registra cada módulo en un solo listado del día.",
                cols: [["Hora"], ["Tipo"], ["Detalle"]],
                filas: (actividad || []).map((e) => [e.hora || "—", e.tipo || "—", e.detalle || e.actor || "—"]),
                vacio: "Todavía no hay eventos registrados para hoy.",
                falta: !actividad?.length ? "Si el listado sale vacío, el registro unificado aún no tiene movimientos para esta fecha." : undefined,
                tono: "ok",
              })}>i</button>
          </div>
          <div className="dc-card__body">
            <div className="log">
              {!actividad?.length && (
                <div className="dc-vacio-mod">Sin eventos aún hoy. Los cobros, citas y movimientos de caja aparecerán aquí.</div>
              )}
              {(actividad || []).map((e, i) => (
                <div className="lg" key={i}>
                  <span className="t">{e.hora || "—"}</span>
                  <span className="k" style={{ color: "var(--dc-accent-cyan)" }}>{e.tipo || "Evento"}</span>
                  <span className="d">{e.detalle || e.actor || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Requiere acción */}
      <section className="dc-card" style={{ marginBottom: "var(--dc-sp-5)" }}>
        <div className="dc-card__head">
          <span className="vin" style={{ background: "var(--dc-danger-700)" }} />
          <h2>Requiere acción</h2>
          <span className="dc-card__meta">{alertas.length} asuntos abiertos</span>
          <button type="button" className="dc-info" aria-label="Asuntos"
            onClick={() => abrir({
              t: "Requiere acción",
              s: "Lo que no puede esperar",
              cifra: String(alertas.length),
              parte: "asuntos",
              como: "Saldos vencidos, cajas abiertas, stock bajo y evoluciones pendientes.",
              cols: [["Asunto"], ["Detalle"]],
              filas: alertas.map((a) => [a.titulo || a.tipo || "—", a.detalle || a.mensaje || "—"]),
              vacio: "Sin asuntos abiertos.",
              tono: "riesgo",
            })}>i</button>
        </div>
        <div className="dc-card__body">
          <div className="dc-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              {!alertas.length && <div className="dc-vacio-mod">Nada pendiente por ahora.</div>}
              {alertas.map((a, i) => {
                const riesgo = /vencid|caja|cerrar|saldo/i.test(String(a.titulo || a.tipo || ""));
                return (
                  <div className="dc-accion" key={i} role="button" tabIndex={0}
                    onClick={() => abrir({
                      t: a.titulo || a.tipo || "Asunto",
                      s: a.detalle || a.mensaje || "",
                      cifra: a.monto != null ? moneyFmt(a.monto) : (a.cantidad != null ? String(a.cantidad) : "—"),
                      como: "Alerta generada a partir del estado actual de la clínica.",
                      cols: [["Campo"], ["Valor"]],
                      filas: Object.entries(a).filter(([k]) => !["titulo", "tipo"].includes(k)).slice(0, 6)
                        .map(([k, v]) => [k, String(v)]),
                      tono: riesgo ? "riesgo" : "aviso",
                    })}>
                    <span className="rail" style={{ background: riesgo ? "var(--dc-danger-700)" : "var(--dc-warn-600)" }} />
                    <div className="dc-accion__txt">
                      <h3>{a.titulo || a.tipo || "Asunto"}</h3>
                      <p>{a.detalle || a.mensaje || ""}</p>
                    </div>
                    <span className={`dc-chip ${riesgo ? "dc-chip--riesgo" : "dc-chip--aviso"}`}>
                      {a.monto != null ? moneyFmt(a.monto) : (a.cantidad ?? a.chip ?? "Ver")}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="dc-split__rule">
              <p className="dc-rotulo">Antigüedad de la deuda – 100% = {moneyFmt(agingTotal)}</p>
              <StackSegs items={agingItems} total={agingTotal} />
              <div className="dc-leyenda">
                {agingItems.map((it, i) => {
                  const lay = layoutProgreso(it.valor, agingTotal);
                  return (
                    <div key={i} className={`fila${lay.dibujar ? "" : " cero"} clic`} role="button" tabIndex={0}
                      onClick={() => abrir({
                        t: it.nom,
                        s: "Tramo de antigüedad del saldo",
                        cifra: moneyFmt(it.valor),
                        parte: lay.dibujar ? lay.etiquetaPct : "sin saldo",
                        como: "Saldo por cobrar agrupado según la fecha del cargo.",
                        cols: [["Tramo"], ["Saldo", "n"]],
                        filas: [[it.nom, moneyFmt(it.valor)]],
                        total: moneyFmt(it.valor),
                        tono: i >= 3 ? "riesgo" : i >= 1 ? "aviso" : "ok",
                      })}>
                      <i className="sw" style={{ background: lay.dibujar ? it.color : "var(--dc-line-alt, var(--dc-line))" }} />
                      <span className="nm">{it.nom}</span>
                      <span className="im">{moneyFmt(it.valor)}</span>
                      <span className="pc">{lay.dibujar ? lay.etiquetaPct : "sin saldo"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Especialidad | Planes */}
      <div className="dc-grid g-2b g-alto-libre">
        <section className="dc-card">
          <div className="dc-card__head">
            <span className="vin" style={{ background: "var(--g2)" }} />
            <h2>Producción por especialidad</h2>
            <span className="dc-card__meta">100% = {moneyFmt(espTotal)}</span>
            <button type="button" className="dc-info" aria-label="Especialidades"
              onClick={() => abrir({
                t: "Producción por especialidad",
                s: "Cada barra es su parte del total",
                cifra: moneyFmt(espTotal),
                como: "Se cruza la cita (con su especialidad) con lo facturado.",
                cols: [["Especialidad"], ["Importe", "n"], ["%", "n"]],
                filas: espRaw.map((e) => {
                  const lay = layoutProgreso(e.valor, espTotal);
                  return [e.nombre, moneyFmt(e.valor), lay.dibujar ? lay.etiquetaPct : "sin ventas"];
                }),
                total: moneyFmt(espTotal),
                tono: "aviso",
              })}>i</button>
          </div>
          <div className="dc-card__body">
            <div className="dc-barras">
              {!espRaw.length && <div className="dc-vacio-mod">Sin producción por especialidad en el tramo.</div>}
              {espRaw.map((e, i) => (
                <BarraFila key={e.nombre + i} nombre={e.nombre} valor={e.valor} total={espTotal}
                  color={COLORES_ESP[i % COLORES_ESP.length]}
                  onOpen={() => abrir({
                    t: e.nombre, s: "Parte del total", cifra: moneyFmt(e.valor),
                    parte: layoutProgreso(e.valor, espTotal).etiquetaPct,
                    cols: [["Concepto"], ["Importe", "n"]], filas: [[e.nombre, moneyFmt(e.valor)]],
                    tono: "cian",
                  })} />
              ))}
            </div>
          </div>
        </section>

        <section className="dc-card">
          <div className="dc-card__head">
            <span className="vin" style={{ background: "var(--g3)" }} />
            <h2>Aceptación de planes</h2>
            <span className="dc-card__meta">{moneyFmt(propuesto)} propuesto</span>
            <button type="button" className="dc-info" aria-label="Planes"
              onClick={() => abrir({
                t: "Aceptación de planes",
                s: "Reparto de lo propuesto",
                cifra: moneyFmt(propuesto),
                como: "Planes de tratamiento según estado: aceptado, sin respuesta o rechazado.",
                cols: [["Estado"], ["Importe", "n"]],
                filas: [
                  ["Aceptado", moneyFmt(aceptado)],
                  ["Sin respuesta", moneyFmt(pendiente)],
                  ["Rechazado", moneyFmt(rechazado)],
                ],
                total: moneyFmt(propuesto),
                tono: "morado",
              })}>i</button>
          </div>
          <div className="dc-card__body">
            <p className="dc-rotulo">Reparto de lo propuesto – 100% = {moneyFmt(propuesto)}</p>
            <StackSegs
              items={[
                { valor: aceptado, color: "var(--g4)" },
                { valor: pendiente, color: "var(--dc-line-alt, var(--dc-ink-200))" },
              ]}
              total={propuesto}
            />
            <div className="dc-leyenda">
              {[
                { nom: "Aceptado", valor: aceptado, color: "var(--g4)" },
                { nom: "Sin respuesta", valor: pendiente, color: "var(--dc-line-alt, var(--dc-ink-200))" },
                { nom: "Rechazado", valor: rechazado, color: "var(--dc-line-alt, var(--dc-ink-200))", ceroTxt: "ninguno" },
              ].map((it) => {
                const lay = layoutProgreso(it.valor, propuesto);
                return (
                  <div key={it.nom} className={`fila${lay.dibujar ? "" : " cero"}`}>
                    <i className="sw" style={{ background: it.color }} />
                    <span className="nm">{it.nom}</span>
                    <span className="im">{moneyFmt(it.valor)}</span>
                    <span className="pc">{lay.dibujar ? lay.etiquetaPct : (it.ceroTxt || "sin saldo")}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="dc-card__foot">
            Lo <b>sin contestar</b> no está perdido: nadie lo ha rechazado todavía.
          </p>
        </section>
      </div>

      {/* Odontología general por tratamiento */}
      <section className="dc-card" style={{ marginBottom: "var(--dc-sp-5)" }}>
        <div className="dc-card__head">
          <span className="vin" style={{ background: "var(--g1)" }} />
          <h2>Odontología general – por tratamiento</h2>
          <span className="dc-card__meta">{tratTotal > 0 ? `100% = ${moneyFmt(tratTotal)}` : "Sin datos aún"}</span>
          {tratTotal <= 0 && (
            <span className="marca-demo" title="Sin ventas enlazadas a servicio del catálogo">sin desglose aún</span>
          )}
          <button type="button" className="dc-info" aria-label="Tratamientos"
            onClick={() => abrir({
              t: "Por tratamiento",
              s: "Desglose de odontología general",
              cifra: tratTotal > 0 ? moneyFmt(tratTotal) : "—",
              como: "Agrupa las ventas por el servicio del catálogo vinculado a cada fase.",
              cols: [["Tratamiento"], ["Ventas", "n"], ["Importe", "n"]],
              filas: tratSorted.map((t) => [t.nombre || "—", String(t.numeroDeVentas ?? 0), moneyFmt(t.importeTotal)]),
              vacio: "Aún no hay ventas enlazadas a un servicio del catálogo.",
              falta: tratTotal <= 0
                ? "Al crear una fase desde el catálogo hay que guardar también el servicio elegido. Las ventas nuevas empezarán a acumularse solas."
                : undefined,
              tono: "cian",
            })}>i</button>
        </div>
        <div className="dc-card__body">
          {tratTotal <= 0 ? (
            <div className="dc-vacio-mod">
              <b>Qué falta:</b> todavía no hay ventas enlazadas a un servicio del catálogo.
              Al agregar una fase eligiendo del catálogo, el panel podrá armar la campaña
              (más vendido / menos vendido) solo.
            </div>
          ) : (
            <div className="dc-split" style={{ gridTemplateColumns: "1fr 380px" }}>
              <div className="dc-barras">
                {tratSorted.map((t, i) => (
                  <BarraFila key={t.servicioId || t.nombre || i}
                    nombre={t.nombre || "—"}
                    valor={Number(t.importeTotal) || 0}
                    total={tratTotal}
                    color={COLORES_ESP[i % COLORES_ESP.length]}
                    onOpen={() => abrir({
                      t: t.nombre || "Tratamiento",
                      s: `${t.numeroDeVentas ?? 0} ventas`,
                      cifra: moneyFmt(t.importeTotal),
                      cols: [["Campo"], ["Valor"]],
                      filas: [["Ventas", String(t.numeroDeVentas ?? 0)], ["Importe", moneyFmt(t.importeTotal)]],
                      tono: "ok",
                    })} />
                ))}
              </div>
              <div className="dc-split__rule">
                <p className="dc-rotulo">Para la campaña</p>
                {tratSorted[0] && (
                  <div className="camp__f camp__f--top">
                    <span className="camp__pos">1.º</span>
                    <div className="camp__txt">
                      <div className="camp__lab">El que más vendes</div>
                      <div className="camp__nom">{tratSorted[0].nombre}</div>
                    </div>
                    <div className="camp__cif">{moneyFmt(tratSorted[0].importeTotal)}<span>{tratSorted[0].numeroDeVentas} ventas</span></div>
                  </div>
                )}
                {tratSorted.length > 1 && (() => {
                  const top = tratSorted[0];
                  const bot = tratSorted[tratSorted.length - 1];
                  const topV = Math.max(1, Number(top.numeroDeVentas) || 1);
                  const botV = Math.max(0, Number(bot.numeroDeVentas) || 0);
                  const botImp = Number(bot.importeTotal) || 0;
                  const unit = botV > 0 ? botImp / botV : 0;
                  const metaVentas = 5;
                  const gapX = botV > 0 ? (topV / botV) : null;
                  const uplift = unit > 0 && botV < metaVentas
                    ? (metaVentas - botV) * unit
                    : null;
                  return (
                    <>
                      <div className="camp__vs">
                        <i aria-hidden="true" />
                        <span>
                          {gapX != null && Number.isFinite(gapX)
                            ? `${gapX >= 10 ? Math.round(gapX) : gapX.toFixed(1).replace(/\.0$/, "")}× de diferencia entre los dos`
                            : "Entre el primero y el último"}
                        </span>
                      </div>
                      <div className="camp__f camp__f--bot">
                        <span className="camp__pos">{tratSorted.length}.º</span>
                        <div className="camp__txt">
                          <div className="camp__lab">El que menos vendes</div>
                          <div className="camp__nom">{bot.nombre}</div>
                        </div>
                        <div className="camp__cif">
                          {moneyFmt(bot.importeTotal)}
                          <span>{bot.numeroDeVentas} ventas</span>
                        </div>
                      </div>
                      {uplift != null && uplift > 0 && (
                        <p className="camp__acc">
                          <b>Qué hacer:</b> si {bot.nombre} pasara de{" "}
                          <b>{botV} a {metaVentas} ventas</b> serían{" "}
                          <b>+{moneyFmt(uplift)}</b>
                          {top?.nombre ? (
                            <> — y más pacientes entrando por la puerta barata, de donde sale {top.nombre}.</>
                          ) : null}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Flujo del día */}
      <section className="dc-card" style={{ marginBottom: "var(--dc-sp-5)" }}>
        <div className="dc-card__head">
          <span className="vin" style={{ background: "var(--dc-brand-600)" }} />
          <h2>Flujo del día</h2>
          <span className="dc-card__meta">Agenda → sillón → cobro</span>
          <button type="button" className="dc-info" aria-label="Flujo"
            onClick={() => abrir({
              t: "Flujo del día",
              s: "Pulso de la jornada, no un gráfico con ejes",
              cifra: String(citasHoy.length),
              parte: "citas",
              sub: "Las partículas son ambiente: no codifican ninguna cifra.",
              como: "A la izquierda van las cifras exactas; el lienzo solo muestra el pulso agenda → sillón → cobro.",
              cols: [["Métrica"], ["Valor", "n"]],
              filas: [
                ["Citas hoy", String(citasHoy.length)],
                ["En sillón", String(enSillon)],
                ["Atendidas", String(cobradas)],
                ["Sillones libres", sillonesLibres != null && nSillones != null
                  ? `${sillonesLibres} de ${nSillones}`
                  : "—"],
              ],
              tono: "brand",
            })}>i</button>
        </div>
        <div className="dc-card__body">
          <div className="dc-split" style={{ gridTemplateColumns: "250px 1fr" }}>
            <div>
              <p className="dc-rotulo">Ocupación – {franjas} franjas</p>
              <div className="gate" aria-label={`Ocupación: ${ocupadas} de ${franjas}`}>
                {Array.from({ length: franjas }, (_, g) => (
                  <i key={g} className={g < ocupadas ? (g === ocupadas - 1 ? "hoy" : "on") : undefined} />
                ))}
              </div>
              <dl className="dc-cifras">
                <div className="dc-cifra"><dt>Citas hoy</dt><dd>{citasHoy.length}</dd></div>
                <div className="dc-cifra"><dt>En sillón</dt><dd>{enSillon}</dd></div>
                <div className="dc-cifra"><dt>Cobradas</dt><dd>{cobradas}</dd></div>
                <div className="dc-cifra">
                  <dt>Sillones libres</dt>
                  <dd>
                    {sillonesLibres != null && nSillones != null
                      ? `${sillonesLibres} de ${nSillones}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
            <CanvasFlujo />
          </div>
        </div>
      </section>

      {/* Cartera | Cubo */}
      <div className="dc-grid g-2b">
        <section className="dc-card">
          <div className="dc-card__head">
            <span className="vin" style={{ background: "var(--g3)" }} />
            <h2>Cartera de pacientes</h2>
            <span className="dc-card__meta">{pacs.length || cartera.activos || 0} pacientes</span>
            <button type="button" className="dc-info" aria-label="Cartera"
              onClick={() => abrir({
                t: "Cartera de pacientes",
                s: "Color = estado – tamaño = saldo",
                cifra: String(pacs.length || 0),
                micro: [
                  ["Al día", String(alDia)],
                  ["Nuevos 30 d", String(nuevos30)],
                  ["Con saldo", String(conSaldo.length)],
                ],
                como: "Cada punto es un paciente. Rojo = con saldo; cian = nuevo; verde = al día.",
                cols: [["Paciente"], ["Saldo", "n"]],
                filas: conSaldo.slice(0, 20).map((p) => [p.nombre, moneyFmt(p.saldo)]),
                vacio: "Sin pacientes en cartera.",
                tono: "morado",
              })}>i</button>
          </div>
          <div className="dc-card__body">
            <div className="dc-split" style={{ gridTemplateColumns: "236px 1fr" }}>
              <dl className="dc-cifras">
                <div className="dc-cifra"><dt>Total</dt><dd>{pacs.length || "—"}</dd></div>
                <div className="dc-cifra"><dt>Al día</dt><dd style={{ color: "var(--dc-ok-700)" }}>{alDia}</dd></div>
                <div className="dc-cifra"><dt>Nuevos 30 d</dt><dd style={{ color: "var(--g1)" }}>{nuevos30}</dd></div>
                <div className="dc-cifra"><dt>Con saldo</dt><dd style={{ color: "var(--dc-danger-700)" }}>{conSaldo.length}</dd></div>
                <div className="dc-cifra"><dt>Saldo mayor</dt><dd>{moneyFmt(saldoMayor)}</dd></div>
              </dl>
              <CanvasEsfera
                pacientes={pacs}
                onPick={(p) => abrir({
                  t: p.nombre || "Paciente",
                  s: "Ficha rápida de cartera",
                  cifra: moneyFmt(p.saldo),
                  parte: p.ultimaCita ? `Última ${p.ultimaCita}` : "Sin cita",
                  micro: [["Visitas", String(p.numeroDeCitas ?? 0)], ["Acumulado", moneyFmt(p.importeAcumulado)]],
                  cols: [["Campo"], ["Valor"]],
                  filas: [["Saldo", moneyFmt(p.saldo)], ["Visitas", String(p.numeroDeCitas ?? 0)]],
                  tono: Number(p.saldo) > 0 ? "riesgo" : "ok",
                })}
              />
            </div>
          </div>
          <p className="dc-card__foot">Color = estado, tamaño = saldo. Al pasar el ratón se detiene.</p>
        </section>

        <section className="dc-card">
          <div className="dc-card__head">
            <span className="vin" style={{ background: "var(--g2)" }} />
            <h2>Cubo de pacientes</h2>
            <span className="dc-card__meta">A quién llamar primero</span>
            <button type="button" className="dc-info" aria-label="Cubo"
              onClick={() => abrir({
                t: "Cubo de pacientes",
                s: "Tres ejes en castellano de clínica",
                cifra: String(pacs.length),
                como: "Azul: hace cuánto no viene. Ámbar: cuánto ha dejado. Morado: cuántas veces ha venido.",
                cols: [["Eje"], ["Rango"]],
                filas: [
                  ["Hace cuánto no viene", "0 a 180 días"],
                  ["Cuánto ha dejado", "S/ 0 a S/ 1 650"],
                  ["Cuántas veces ha venido", "1 a 6 visitas"],
                ],
                tono: "aviso",
              })}>i</button>
          </div>
          <div className="dc-card__body">
            <div className="dc-split" style={{ gridTemplateColumns: "236px 1fr" }}>
              <div>
                <p className="dc-rotulo">Cómo leerlo</p>
                <dl className="ejes">
                  <div className="eje"><i className="trazo" style={{ background: "var(--dc-accent-cyan)" }} /><div><dt>Hace cuánto no viene</dt><dd>de 0 a 180 días</dd></div></div>
                  <div className="eje"><i className="trazo" style={{ background: "var(--dc-amber-ink)" }} /><div><dt>Cuánto ha dejado</dt><dd>de S/ 0 a S/ 1 650</dd></div></div>
                  <div className="eje"><i className="trazo" style={{ background: "var(--dc-purple)" }} /><div><dt>Cuántas veces ha venido</dt><dd>de 1 a 6 visitas</dd></div></div>
                </dl>
                <dl className="dc-cifras" style={{ marginTop: "var(--dc-sp-4)", paddingTop: "var(--dc-sp-3)", borderTop: "1px solid var(--dc-line)" }}>
                  <div className="dc-cifra"><dt>Pacientes en el cubo</dt><dd>{pacs.length}</dd></div>
                  <div className="dc-cifra"><dt>Para llamar</dt><dd style={{ color: "var(--dc-danger-700)" }}>{conSaldo.length}</dd></div>
                </dl>
              </div>
              <CanvasCubo
                pacientes={pacs}
                onPick={(p) => abrir({
                  t: p.nombre || "Paciente",
                  s: "Prioridad de llamada",
                  cifra: moneyFmt(p.saldo),
                  sub: "Dejó dinero y hace tiempo que no viene.",
                  cols: [["Campo"], ["Valor"]],
                  filas: [
                    ["Última cita", p.ultimaCita || "—"],
                    ["Acumulado", moneyFmt(p.importeAcumulado)],
                    ["Visitas", String(p.numeroDeCitas ?? 0)],
                  ],
                  tono: "riesgo",
                })}
              />
            </div>
          </div>
          <p className="dc-card__foot">
            Ancla las explicaciones al <b>color de la arista</b>: al girar, “izquierda” cambia.
          </p>
        </section>
      </div>

      {/* Equipo */}
      <section aria-label="Producción por odontólogo este mes" style={{ marginBottom: "var(--dc-sp-5)" }}>
        <h2 style={{ fontSize: "var(--dc-fs-lg)", lineHeight: "var(--dc-lh-lg)", margin: "0 0 var(--dc-sp-3)" }}>Equipo</h2>
        <div className="dc-table-wrap">
          <div className="dc-table-head" role="row">
            <span>Odontólogo</span><span>Estado</span><span className="num">Citas</span>
            <span className="num">Producción</span><span className="der">Meta del mes</span>
          </div>
          {!ranking.length && (
            <div className="dc-table-row"><div className="persona"><span className="persona__t"><span className="nom">Sin odontólogos en el ranking</span></span></div></div>
          )}
          {ranking.map((r) => {
            const prod = Number(r.produccion) || 0;
            const citasN = Number(r.citas ?? r.atendidas ?? 0) || 0;
            const nombre = r.nombre || r.medico || "—";
            const medId = r.id || r.medicoId;
            const tieneMeta = r.meta != null && Number(r.meta) > 0;
            return (
              <div className="dc-table-row clic" key={medId || nombre} role="button" tabIndex={0}
                onClick={() => abrir({
                  t: nombre,
                  s: r.especialidad || "Equipo",
                  cifra: moneyFmt(prod),
                  parte: tieneMeta ? `Meta ${moneyFmt(r.meta)}` : "Sin meta",
                  cols: [["Campo"], ["Valor"]],
                  filas: [
                    ["Citas", String(citasN)],
                    ["Producción", moneyFmt(prod)],
                    ["Meta", tieneMeta ? moneyFmt(r.meta) : "Sin meta"],
                  ],
                  tono: "brand",
                })}>
                <div className="persona">
                  <span className="ini" style={{ background: prod > 0 ? "var(--dc-brand-100)" : "var(--dc-bg-alt)", color: prod > 0 ? "var(--dc-brand-600)" : "var(--dc-ink-500)" }}>
                    {inicialesDe(nombre)}
                  </span>
                  <span className="persona__t">
                    <span className="nom">{nombre}</span>
                    <span className="esp">{r.especialidad || "—"}</span>
                  </span>
                </div>
                <div data-label="Estado">
                  {prod > 0
                    ? <span className="dc-chip dc-chip--vivo">Facturó</span>
                    : <span style={{ color: "var(--dc-ink-400)" }}>Sin actividad</span>}
                </div>
                <div className="num" data-label="Citas">{citasN}</div>
                <div className="num" data-label="Producción" style={{ color: prod > 0 ? undefined : "var(--dc-ink-400)" }}>{moneyFmt(prod)}</div>
                <div className="der" data-label="Meta del mes">
                  {tieneMeta ? (
                    <span className="dc-money">{moneyFmt(r.meta)}</span>
                  ) : (
                    <span className="sin-meta">
                      Sin meta
                      <b role="button" tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMetaEdit({ id: medId, nombre });
                          setMetaVal("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            setMetaEdit({ id: medId, nombre });
                          }
                        }}>Definir</b>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="dc-pie">
        <span>
          Inventario valorizado{" "}
          <b>{inventarioValorizado != null ? moneyFmt(inventarioValorizado) : "—"}</b>
        </span>
        <span>
          WhatsApp{" "}
          {waConversaciones || waAgendadas ? (
            <>
              <b>{waConversaciones}</b> conversaciones – <b>{waAgendadas}</b> citas agendadas por ese canal
            </>
          ) : (
            <b>—</b>
          )}
        </span>
        <span>
          <b>{nSedes != null ? nSedes : "—"}</b> sede{nSedes === 1 ? "" : "s"}
          {" – "}
          <b>{nSillones != null ? nSillones : "—"}</b> sillones
          {" – "}
          <b>{ranking.length || "—"}</b> odontólogos
        </span>
      </div>

      {ficha && <FichaDato dato={ficha} onClose={cerrar} />}

      {metaEdit && (
        <div className="dc-pg-ficha-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setMetaEdit(null); }}>
          <div className="dc-pg-ficha" role="dialog" aria-modal="true" aria-labelledby="meta-title" tabIndex={-1}>
            <div className="dc-pg-ficha__head">
              <span className="ico" aria-hidden="true">◎</span>
              <div style={{ flex: 1 }}>
                <h2 id="meta-title">Meta mensual</h2>
                <p>{metaEdit.nombre || "Odontólogo"}</p>
              </div>
              <button type="button" className="dc-pg-ficha__cerrar" aria-label="Cerrar" onClick={() => setMetaEdit(null)}>×</button>
            </div>
            <div className="dc-pg-ficha__body">
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block" }}>
                Meta del mes (S/)
                <input
                  className="dc-premium-inp"
                  type="number"
                  min="0"
                  value={metaVal}
                  onChange={(e) => setMetaVal(e.target.value)}
                  placeholder="Ej. 5000"
                  style={{ display: "block", width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)" }}
                />
              </label>
              <p style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 12 }}>
                Déjalo vacío o en 0 para quitar la meta.
              </p>
            </div>
            <div className="dc-pg-ficha__footer">
              <span>Se guarda en la ficha del odontólogo</span>
              <button type="button" className="dc-btn dc-btn--secundario dc-btn--sm" onClick={guardarMeta}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
