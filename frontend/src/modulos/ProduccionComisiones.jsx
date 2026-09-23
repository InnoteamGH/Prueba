/**
 * Producción y comisiones — pantalla de personas (SPEC §15 / HTML maqueta).
 * Rutas: #/reportes · #/comisiones · #/metas
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import { filtraMicro, inicialesDe, layoutProgreso } from "./panelGerencialUtil";
import {
  UMBRAL_AUSENTISMO,
  ESCALA_AUSENTISMO_MAX,
  acumularCobros,
  ausentismoPorOdontologo,
  escalaCurva,
  layoutRinde,
  marcaMediaPct,
  moneyFmt,
  pctEnEscalaAusentismo,
  techoRinde,
} from "./produccionComisionesUtil";
import "./panelGerencial.css";
import "./produccionComisiones.css";

const COLORES = [
  "var(--dc-amber-ink)",
  "var(--dc-accent-cyan)",
  "var(--dc-purple)",
  "var(--dc-ok-700)",
  "var(--dc-brand-600)",
];

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

function FichaDato({ dato, onClose }) {
  const closeRef = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    prevFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key !== "Tab") return;
      const dlg = document.getElementById("dc-pc-ficha");
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

  return (
    <div className="dc-pg-ficha-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        id="dc-pc-ficha"
        className="dc-pg-ficha"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-pc-ficha-title"
        tabIndex={-1}
        data-tono={dato.tono || "brand"}
      >
        <div className="dc-pg-ficha__head">
          <span className="ico" aria-hidden="true">i</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="dc-pc-ficha-title">{dato.t}</h2>
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
                          return <td key={j} className={isNum ? "n" : undefined}>{cell}</td>;
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
          <span>{dato.nota || (dato.ejemplo ? "Detalle de ejemplo · los totales son reales" : "Dato de la clínica")}</span>
          <button type="button" className="dc-btn dc-btn--secundario dc-btn--sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function CanvasIngresos({ meses, cobrados, onOpen }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const badgeRef = useRef(null);
  const state = useRef({ vis: 0, max: 400 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const quieto = prefersReducedMotion();
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let stopped = false;
    let mouse = null;
    const { mensuales, acum } = acumularCobros(cobrados.map((c) => ({ cobrado: c })));
    const labels = meses?.length ? meses : mensuales.map((_, i) => String(i + 1));

    const onMove = (ev) => {
      const r = canvas.getBoundingClientRect();
      mouse = { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    const onLeave = () => { mouse = null; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const medir = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { W: r.width, H: r.height };
    };

    const pinta = (t) => {
      if (stopped) return;
      const { W, H } = medir();
      const n = Math.max(1, labels.length);
      const pad = { l: 30, r: 30, t: 34, b: 42 };
      const c1 = cssVar("--dc-accent-cyan", "#0E7490");
      const lin = cssVar("--dc-line", "#E7EAF0");
      const fa = cssVar("--dc-ink-400", "#667085");
      const ink = cssVar("--dc-ink-900", "#101828");
      const X = (i) => pad.l + (n === 1 ? 0 : i / (n - 1)) * (W - pad.l - pad.r);

      const st = state.current;
      if (quieto) st.vis = n - 1;
      else {
        st.vis += (n - 1 - st.vis) * 0.045;
        if (n - 1 - st.vis < 0.02) st.vis = n - 1;
      }

      const poly = [];
      for (let i = 0; i < n; i++) {
        if (i <= st.vis) poly.push([i, acum[i] || 0]);
        else {
          const a = acum[i - 1] || 0;
          const f = st.vis - (i - 1);
          if (f > 0) poly.push([st.vis, a + ((acum[i] || 0) - a) * f]);
          break;
        }
      }
      if (poly.length < 2) poly.push([0, acum[0] || 0], [0.001, acum[0] || 0]);

      let pico = 0;
      poly.forEach((p) => { if (p[1] > pico) pico = p[1]; });
      st.max = escalaCurva(pico, st.max, quieto);
      const mx = st.max;
      const Y = (v) => H - pad.b - (v / mx) * (H - pad.t - pad.b);

      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = lin;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.9;
      labels.forEach((_, i) => {
        ctx.beginPath();
        ctx.moveTo(X(i), pad.t - 8);
        ctx.lineTo(X(i), H - pad.b);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(pad.l, H - pad.b);
      ctx.lineTo(W - pad.r, H - pad.b);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.font = '400 11px "IBM Plex Mono", monospace';
      ctx.fillStyle = fa;
      ctx.textAlign = "center";
      labels.forEach((m, i) => ctx.fillText(m, X(i), H - 24));
      labels.forEach((_, i) => {
        if (i > st.vis + 0.001) return;
        const v = mensuales[i] || 0;
        if (v) {
          ctx.font = '600 11px "IBM Plex Mono", monospace';
          ctx.fillStyle = v >= 1000 ? c1 : cssVar("--dc-warn-700", "#92400E");
          ctx.fillText(`+${Math.round(v).toLocaleString("es-PE").replace(/,/g, " ")}`, X(i), H - 8);
        } else {
          ctx.font = '400 11px "IBM Plex Mono", monospace';
          ctx.fillStyle = cssVar("--dc-ink-200", "#C4CBD6");
          ctx.fillText("0", X(i), H - 8);
        }
      });
      ctx.font = '400 11px "IBM Plex Mono", monospace';
      ctx.fillStyle = fa;
      ctx.textAlign = "left";
      ctx.fillText(`S/ ${Math.round(mx).toLocaleString("es-PE").replace(/,/g, " ")}`, pad.l + 2, pad.t - 5);

      ctx.beginPath();
      ctx.moveTo(X(poly[0][0]), H - pad.b);
      poly.forEach((p) => ctx.lineTo(X(p[0]), Y(p[1])));
      ctx.lineTo(X(poly[poly.length - 1][0]), H - pad.b);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      g.addColorStop(0, hexToRgba(c1, 0.26));
      g.addColorStop(1, hexToRgba(c1, 0.02));
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      poly.forEach((p, j) => {
        const px = X(p[0]);
        const py = Y(p[1]);
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = c1;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      const fin = poly[poly.length - 1];
      const ux = X(fin[0]);
      const uy = Y(fin[1]);
      if (!quieto) {
        const pl = 1 + Math.sin((t || 0) * 0.0034) * 0.35;
        ctx.beginPath();
        ctx.arc(ux, uy, 8 * pl, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(c1, 0.2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(ux, uy, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = c1;
      ctx.fill();

      if (badgeRef.current) {
        badgeRef.current.textContent = moneyFmt(fin[1]);
        badgeRef.current.style.left = `${Math.min(W - 40, Math.max(34, ux))}px`;
        badgeRef.current.style.top = `${uy}px`;
        badgeRef.current.classList.add("ver");
      }

      if (mouse && mouse.x > pad.l && mouse.x < W - pad.r) {
        let iR = Math.round(((mouse.x - pad.l) / (W - pad.l - pad.r)) * (n - 1));
        iR = Math.max(0, Math.min(Math.floor(st.vis), iR));
        const kx = X(iR);
        const ky = Y(acum[iR] || 0);
        ctx.strokeStyle = fa;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(kx, pad.t);
        ctx.lineTo(kx, H - pad.b);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(kx, ky, 4.6, 0, Math.PI * 2);
        ctx.fillStyle = c1;
        ctx.fill();
        ctx.fillStyle = ink;
        ctx.font = '600 11px "IBM Plex Mono", monospace';
        ctx.textAlign = kx > W * 0.66 ? "right" : "left";
        const extra = mensuales[iR] ? `  (+${Math.round(mensuales[iR])})` : "";
        ctx.fillText(`${labels[iR]}  ${moneyFmt(acum[iR] || 0)}${extra}`, kx + (kx > W * 0.66 ? -10 : 10), pad.t + 2);
      }

      if (!quieto && !stopped) raf = requestAnimationFrame(pinta);
    };

    if (quieto) pinta(0);
    else raf = requestAnimationFrame(pinta);

    const onResize = () => { /* next frame remeasures */ };
    window.addEventListener("resize", onResize);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [meses, cobrados]);

  return (
    <div className="serie serie--alto" ref={wrapRef}>
      <canvas ref={canvasRef} className="clic" onClick={onOpen} aria-label="Curva de ingresos cobrados" />
      <div className="badge" ref={badgeRef}>S/ 0</div>
    </div>
  );
}

function fmtTasa(t) {
  if (t == null) return "—";
  return `${t}%`;
}

function AusentismoTab({ citas, medicos, ticketMedio, onOpen }) {
  const { rows, clinica, ticketMedio: ticket, costeTotal } = useMemo(
    () => ausentismoPorOdontologo(citas, medicos, ticketMedio),
    [citas, medicos, ticketMedio],
  );
  const umbralLeft = pctEnEscalaAusentismo(UMBRAL_AUSENTISMO);
  const clinicaLeft = clinica.tasa != null ? pctEnEscalaAusentismo(clinica.tasa) : 0;
  const sobreUmbral = clinica.tasa != null && clinica.tasa >= UMBRAL_AUSENTISMO;

  const fichaPerdidas = () => onOpen?.({
    t: "Citas que se pierden",
    s: "Canceladas y no asistidas sobre la agenda",
    cifra: clinica.sinDato ? "—" : fmtTasa(clinica.tasa),
    parte: clinica.sinDato ? "sin dato" : `${clinica.perdidas} de ${clinica.total}`,
    sub: "Se mide sobre la agenda del periodo, no sobre lo facturado.",
    micro: [
      ["Canceladas", String(clinica.canceladas)],
      ["No asistió", String(clinica.noShows)],
      ["Reprogramadas", "Fuera del cálculo"],
    ],
    como: "Se cuentan las citas canceladas y las no asistidas, y se dividen entre todas las citas de agenda del tramo excepto las reprogramadas.",
    cols: [["Estado"], ["En la cifra"], ["Qué implica"]],
    filas: [
      ["Cancelada", "Suma", "Lista de espera: el hueco avisado se puede revender"],
      ["No asistió", "Suma", "Recordatorios: el hueco se quema"],
      ["Reprogramada", "Fuera", "Decisión de producto: si se mueve tarde, el hueco también se pierde"],
      ["Pendiente · Confirmada · En atención · Atendida", "Denominador", "Siguen en pie o se atendieron"],
    ],
    fuente: "Agenda del periodo · estados de cada cita.",
    tono: "aviso",
  });

  const fichaUmbral = () => onOpen?.({
    t: "Umbral de alerta",
    s: "El criterio de la propia aplicación",
    cifra: `${UMBRAL_AUSENTISMO}%`,
    parte: "de la app",
    sub: "A partir de aquí la app pinta el ausentismo en rojo y sugiere reforzar recordatorios.",
    como: "No es un criterio inventado por QA: es el umbral que ya usa Dento Check en sus paneles.",
    cols: [["Concepto"], ["Valor", "n"]],
    filas: [
      ["Umbral", `${UMBRAL_AUSENTISMO}%`],
      ["Escala de esta pantalla", `0 – ${ESCALA_AUSENTISMO_MAX}%`],
      ["La clínica ahora", clinica.sinDato ? "—" : fmtTasa(clinica.tasa)],
    ],
    fuente: "Misma regla que el panel de sede y mi producción.",
    tono: "riesgo",
  });

  const fichaCoste = () => onOpen?.({
    t: "Cuesta una cita perdida",
    s: "Producción media de una cita del periodo",
    cifra: ticket != null ? moneyFmt(ticket) : "—",
    parte: ticket != null ? "media" : "sin dato",
    sub: "Producción del periodo ÷ citas atendidas. No todas cuestan igual; es la media de la clínica.",
    como: "Si hace falta reforzar recordatorios, conviene priorizar agendas de mayor ticket, no solo las de más volumen.",
    cols: [["Concepto"], ["Valor", "n"]],
    filas: [
      ["Ticket medio", ticket != null ? moneyFmt(ticket) : "—"],
      ["Citas perdidas", String(clinica.perdidas)],
      ["Coste estimado", costeTotal != null ? moneyFmt(costeTotal) : "—"],
    ],
    fuente: "Producción y citas del mismo periodo que la pestaña principal.",
    tono: "brand",
  });

  const fichaEscala = () => onOpen?.({
    t: "Dónde está la clínica",
    s: `Escala 0 – ${ESCALA_AUSENTISMO_MAX}% · umbral ${UMBRAL_AUSENTISMO}%`,
    cifra: clinica.sinDato ? "—" : fmtTasa(clinica.tasa),
    parte: sobreUmbral ? "sobre el umbral" : "bajo el umbral",
    sub: clinica.sinDato
      ? "Sin citas en agenda para medir."
      : `De cada cien citas, unas ${Math.round(clinica.tasa)} se pierden.`,
    como: "La raya roja es el 15% de la app. Canceladas y no asistidas se suman en el %; se enseñan aparte porque piden acciones distintas.",
    cols: [["Estado"], ["Rol"], ["Nota"]],
    filas: [
      ["Cancelada", "Cuenta (arriba)", "El paciente avisó"],
      ["No asistió", "Cuenta (arriba)", "El paciente no avisó"],
      ["Reprogramada", "Fuera", "A decidir (AUS-02)"],
      ["Pendiente / Confirmada / En atención / Atendida", "Denominador", "No son pérdida"],
    ],
    fuente: "Citas de agenda del periodo.",
    tono: "ok",
  });

  const fichaDoc = (r) => onOpen?.({
    t: r.nombre,
    s: `${r.especialidad || "Odontólogo"} · ausentismo del periodo`,
    cifra: r.tasa == null ? "—" : fmtTasa(r.tasa),
    parte: `${r.perdidas} perdidas`,
    sub: r.perdidas
      ? "Citas de su agenda que quedaron canceladas o sin asistir."
      : "Ninguna cita perdida en el periodo.",
    micro: [
      ["Agenda", String(r.agenda)],
      ["Canceladas", String(r.cancelada)],
      ["No asistió", String(r.noShow)],
      ["Coste", r.coste != null ? moneyFmt(r.coste) : "—"],
    ],
    como: "Sus citas del tramo, contando canceladas y no asistidas. El coste es esas citas por el ticket medio de la clínica.",
    cols: [["Concepto"], ["Valor", "n"]],
    filas: [
      ["Citas en agenda", String(r.agenda)],
      ["Canceladas", String(r.cancelada)],
      ["No asistió", String(r.noShow)],
      ["Tasa", r.tasa == null ? "—" : fmtTasa(r.tasa)],
      ["Coste", r.coste != null ? moneyFmt(r.coste) : "—"],
    ],
    fuente: "Agenda agrupada por odontólogo (dato real).",
    tono: "cian",
  });

  return (
    <>
      <section className="dc-kpis dc-kpis--3" aria-label="Indicadores de ausentismo">
        <button type="button" className="dc-kpi" onClick={fichaPerdidas}>
          <span className="dc-kpi__icon" style={{ background: "var(--dc-warn-100)", color: "var(--dc-warn-700)" }} aria-hidden="true">⊘</span>
          <div className="dc-kpi__body">
            <div className="dc-kpi__label">Citas que se pierden</div>
            <div className="dc-kpi__value">{clinica.sinDato ? "—" : fmtTasa(clinica.tasa)}</div>
            <div className="dc-kpi__sub">Canceladas y no asistidas</div>
          </div>
        </button>
        <button type="button" className="dc-kpi" onClick={fichaUmbral}>
          <span className="dc-kpi__icon" style={{ background: "var(--dc-danger-100)", color: "var(--dc-danger-700)" }} aria-hidden="true">!</span>
          <div className="dc-kpi__body">
            <div className="dc-kpi__label">Umbral de alerta</div>
            <div className="dc-kpi__value">{UMBRAL_AUSENTISMO}%</div>
            <div className="dc-kpi__sub">La app lo pinta en rojo a partir de ahí</div>
          </div>
        </button>
        <button type="button" className="dc-kpi" onClick={fichaCoste}>
          <span className="dc-kpi__icon" style={{ background: "var(--dc-brand-100)", color: "var(--dc-brand-600)" }} aria-hidden="true">S/</span>
          <div className="dc-kpi__body">
            <div className="dc-kpi__label">Cuesta una cita perdida</div>
            <div className="dc-kpi__value">{ticket != null ? moneyFmt(ticket) : "—"}</div>
            <div className="dc-kpi__sub">La producción media de una cita</div>
          </div>
        </button>
      </section>

      <section className="dc-card">
        <div className="dc-card__head">
          <span className="vin" style={{ background: "var(--dc-ok-700)" }} />
          <h2>Dónde está la clínica</h2>
          <span className="dc-card__meta">escala 0 – {ESCALA_AUSENTISMO_MAX}% · la raya roja es el umbral de la app</span>
          <button type="button" className="dc-info" aria-label="Qué mide esta escala" onClick={fichaEscala}>i</button>
        </div>
        <div className="dc-card__body">
          <div className="dc-split" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
            <div>
              <div className="dc-escala">
                <div className="pista pista--escala">
                  {!clinica.sinDato && (
                    <i
                      className="seg"
                      style={{
                        width: `${clinicaLeft}%`,
                        background: sobreUmbral ? "var(--dc-danger-700)" : "var(--dc-ok-700)",
                      }}
                      data-w={clinicaLeft}
                    />
                  )}
                  <i className="marca" style={{ left: `${umbralLeft}%` }} title={`Umbral ${UMBRAL_AUSENTISMO}%`} />
                </div>
                <div className="ejes">
                  <span className="eje-ini">0%</span>
                  {!clinica.sinDato && (
                    <span className="op" style={{ left: `${clinicaLeft}%` }}>{clinica.tasa}% · la clínica</span>
                  )}
                  <span style={{ left: `${umbralLeft}%` }}><b>{UMBRAL_AUSENTISMO}% · alerta</b></span>
                  <span className="eje-fin">{ESCALA_AUSENTISMO_MAX}%</span>
                </div>
              </div>
              <p className="dc-nota" style={{ marginTop: "var(--dc-sp-5)" }}>
                {clinica.sinDato
                  ? <>Sin citas de agenda en el periodo para medir ausentismo.</>
                  : <>De cada cien citas de la agenda, <b>{Math.round(clinica.tasa)}</b> se pierden
                    ({clinica.perdidas} de {clinica.total}). Canceladas: <b>{clinica.canceladas}</b> ·
                    no asistió: <b>{clinica.noShows}</b>.
                    {sobreUmbral
                      ? " Está en o por encima del umbral: conviene reforzar recordatorios."
                      : " Está por debajo del 15%: la asistencia no es el problema principal."}</>}
              </p>
              <p className="dc-nota dc-nota--aviso">
                <b>Sin rellenos.</b> Si no llega el dato, esta pantalla muestra un guion — nunca un
                porcentaje inventado.
              </p>
            </div>
            <div className="dc-split__rule">
              <p className="dc-rotulo">Qué se suma en esa cifra</p>
              <div className="dc-estados">
                <button type="button" className="fila" onClick={fichaEscala}>
                  <span className="nm">Cancelada<em>el paciente avisó: el hueco se puede volver a vender</em></span>
                  <span className="dc-chip dc-chip--aviso">cuenta</span>
                </button>
                <button type="button" className="fila" onClick={fichaEscala}>
                  <span className="nm">No asistió<em>el paciente no avisó: el hueco se quema</em></span>
                  <span className="dc-chip dc-chip--riesgo">cuenta</span>
                </button>
                <button type="button" className="fila" onClick={fichaEscala}>
                  <span className="nm">Reprogramada<em>ni suma ni resta: hoy sale del cálculo entero</em></span>
                  <span className="dc-chip dc-chip--info">a decidir</span>
                </button>
                <button type="button" className="fila" onClick={fichaEscala}>
                  <span className="nm">Pendiente · Confirmada · En atención · Atendida<em>son el denominador</em></span>
                  <span className="dc-chip dc-chip--ok">no cuenta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="dc-card__foot">
          Canceladas y no asistidas se enseñan <b>por separado</b>: una cancelación se arregla con
          lista de espera; una falta, con recordatorios. Reprogramada queda fuera del cálculo
          (decisión de producto pendiente).
        </p>
      </section>

      <section className="dc-card">
        <div className="dc-card__head">
          <span className="vin" style={{ background: "var(--dc-accent-cyan)" }} />
          <h2>Ausentismo por odontólogo</h2>
          <span className="dc-card__meta">
            {clinica.sinDato ? "Sin citas de agenda" : `100% = ${clinica.total} citas de agenda`}
          </span>
          <button type="button" className="dc-info" aria-label="Qué mide este módulo" onClick={() => onOpen?.({
            t: "Ausentismo por odontólogo",
            s: "Quién pierde citas y cuánto cuesta",
            cifra: clinica.sinDato ? "—" : fmtTasa(clinica.tasa),
            parte: `${clinica.perdidas} perdidas`,
            como: "Agenda agrupada por odontólogo a partir de las citas del periodo (médico y estado de cada una).",
            cols: [["Odontólogo"], ["Agenda", "n"], ["Perdidas", "n"], ["%", "n"], ["Coste", "n"]],
            filas: rows.map((r) => [
              r.nombre,
              String(r.agenda),
              String(r.perdidas),
              r.tasa == null ? "—" : fmtTasa(r.tasa),
              r.coste != null ? moneyFmt(r.coste) : "—",
            ]),
            total: clinica.sinDato ? "—" : fmtTasa(clinica.tasa),
            fuente: "Dato real de la agenda · sin reparto de ejemplo.",
            tono: "cian",
          })}>i</button>
        </div>
        <div className="dc-card__body">
          <div className="dc-tabla-doc dc-tabla-doc--aus" role="table" aria-label="Ausentismo por odontólogo">
            <div className="fila cab" role="row">
              <span>Odontólogo</span>
              <span className="der">Agenda</span>
              <span>Escala 0 – {ESCALA_AUSENTISMO_MAX}% · raya {UMBRAL_AUSENTISMO}%</span>
              <span className="der">Se pierden</span>
              <span className="der">%</span>
              <span className="der">Coste</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.id}
                className={`fila${r.perdidas === 0 ? " nula" : ""}`}
                role="row"
                tabIndex={0}
                onClick={() => fichaDoc(r)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fichaDoc(r); } }}
              >
                <span className="qui">
                  <i className="ini" style={{ background: "var(--dc-bg-alt)", color: "var(--dc-ink-500)" }}>{inicialesDe(r.nombre)}</i>
                  <span>
                    <b>{r.nombre}</b>
                    {r.especialidad ? <em>{r.especialidad}</em> : null}
                  </span>
                </span>
                <span className="der num">{r.agenda}</span>
                {r.dibujarBarra ? (
                  <span className="pista pista--escala">
                    <i
                      className="seg"
                      style={{
                        width: `${r.pctEscala}%`,
                        background: (r.tasa || 0) >= UMBRAL_AUSENTISMO ? "var(--dc-amber-ink)" : "var(--dc-ok-700)",
                      }}
                      data-w={r.pctEscala}
                    />
                    <i className="marca" style={{ left: `${umbralLeft}%` }} />
                  </span>
                ) : (
                  <span className="vacia" style={{ color: "var(--dc-ok-700)" }}>ninguna perdida</span>
                )}
                <span className="der num">{r.perdidas}</span>
                <span className="der pc">{r.tasa == null ? "—" : fmtTasa(r.tasa)}</span>
                <span className="der num">{r.coste != null ? moneyFmt(r.coste) : "—"}</span>
              </div>
            ))}
            {!rows.length && (
              <div className="dc-nota">Sin odontólogos ni citas para calcular.</div>
            )}
            {rows.length > 0 && (
              <div className="fila pie" role="row">
                <span><b>Total</b></span>
                <span className="der num">{clinica.total}</span>
                <span />
                <span className="der num">{clinica.perdidas}</span>
                <span className="der pc">{clinica.sinDato ? "—" : fmtTasa(clinica.tasa)}</span>
                <span className="der num">{costeTotal != null ? moneyFmt(costeTotal) : "—"}</span>
              </div>
            )}
          </div>
        </div>
        <p className="dc-card__foot">
          Agrupado real por odontólogo a partir de la agenda (<b>médico</b> y <b>estado</b> de cada cita).
          El coste es citas perdidas × ticket medio
          {ticket != null ? <> (<b>{moneyFmt(ticket)}</b>)</> : null}.
        </p>
      </section>

      <div className="dc-pie">
        <span>Se cuenta sobre las <b>citas de la agenda</b>, no sobre las facturadas</span>
        <span>Canceladas y no asistidas van <b>separadas</b> en la lectura; el % las suma</span>
      </div>
    </>
  );
}

export default function ProduccionComisiones({ citas = [], can }) {
  const [tab, setTab] = useState("resumen");
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [animReady, setAnimReady] = useState(false);

  const abrir = useCallback((d) => setFicha(d), []);
  const cerrar = useCallback(() => setFicha(null), []);

  const cargar = useCallback(() => {
    setErr(null);
    api.comisiones()
      .then((r) => setData(r))
      .catch((e) => setErr(e?.message || "No se pudo cargar comisiones"));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimReady(true));
    return () => cancelAnimationFrame(t);
  }, [data]);

  const porMedico = data?.porMedico || [];
  const totalProd = Number(data?.totalProduccion) || 0;
  const totalCom = Number(data?.totalComision) || 0;
  const totalCitas = Number(data?.totalCitas) || 0;
  const odontoCon = Number(data?.odontologosConProduccion) || 0;
  const odontoTot = Number(data?.odontologos) || porMedico.length;
  const sinDato = data?.sinDato !== false && (data?.pendienteLiquidar == null);
  const pendiente = data?.pendienteLiquidar;
  const totalCobrado = Number(data?.totalCobrado) || 0;
  const descuadre = Number(data?.descuadre) || (totalCobrado - totalProd);
  const mesesConCobro = Number(data?.mesesConCobro) || 0;
  const cobros = data?.cobrosPorMes || [];
  const mediaClinica = Number(data?.mediaTicketClinica) || (totalCitas > 0 ? totalProd / totalCitas : 0);
  const tickets = porMedico.map((m) => (m.atendidas > 0 ? Number(m.produccion) / m.atendidas : 0));
  const techo = techoRinde(tickets, 250);
  const mediaPct = marcaMediaPct(mediaClinica, techo);
  const filasEjemplo = porMedico.filter((m) => m.ejemplo).length;
  const quieto = prefersReducedMotion();

  const rangoLabel = useMemo(() => {
    if (!cobros.length) return "Últimos 6 meses";
    const a = cobros[0]?.mesLargo || cobros[0]?.mes;
    const b = cobros[cobros.length - 1]?.mesLargo || cobros[cobros.length - 1]?.mes;
    return a && b ? `${a} a ${b}` : "Periodo";
  }, [cobros]);

  const fichaDoc = (m) => ({
    t: m.nombre,
    s: m.especialidad || "Odontólogo",
    cifra: moneyFmt(m.produccion),
    parte: `${m.atendidas || 0} citas`,
    sub: `Comisión ${moneyFmt(m.comision)} (${m.porcentaje}%).`,
    como: "Producción = citas atendidas × precio base de la especialidad de cada cita. Comisión = producción × % del odontólogo (40% por defecto).",
    cols: [["Concepto"], ["Valor", "n"]],
    filas: [
      ["Citas atendidas", String(m.atendidas || 0)],
      ["Producción", moneyFmt(m.produccion)],
      ["% comisión", `${m.porcentaje}%`],
      ["Comisión", moneyFmt(m.comision)],
      ["Ticket / cita", m.ticketCita != null ? moneyFmt(m.ticketCita) : "—"],
    ],
    fuente: "Citas atendidas del periodo · catálogo de especialidades · ficha del odontólogo.",
    ejemplo: !!m.ejemplo,
    estado: m.ejemplo ? "Detalle de ejemplo" : undefined,
    tono: "brand",
  });

  return (
    <div className="dc-pc">
      <header className="dc-pc-head">
        <div>
          <h1>Producción y comisiones</h1>
          <p>Cómo va cada persona: producción, comisión, cobros del periodo y rendimiento por cita.</p>
        </div>
      </header>

      <nav className="dc-tabs" role="tablist" aria-label="Vistas">
        <button type="button" className="dc-tab" role="tab" aria-selected={tab === "resumen"} onClick={() => setTab("resumen")}>
          Producción y comisiones
        </button>
        <button type="button" className="dc-tab" role="tab" aria-selected={tab === "ausencias"} onClick={() => setTab("ausencias")}>
          Ausentismo por doctor
        </button>
      </nav>

      {err && <p className="dc-nota" style={{ color: "var(--dc-danger-700)" }}>{err}</p>}

      {tab === "ausencias" ? (
        <AusentismoTab
          citas={citas}
          medicos={porMedico}
          ticketMedio={mediaClinica > 0 ? mediaClinica : null}
          onOpen={abrir}
        />
      ) : (
        <>
          <section className="dc-kpis" aria-label="Indicadores del periodo">
            <button type="button" className="dc-kpi" onClick={() => abrir({
              t: "Producción del periodo",
              s: "Lo facturado por citas atendidas",
              cifra: moneyFmt(totalProd),
              parte: `${totalCitas} citas`,
              como: "Suma de producción atribuida a cada odontólogo por sus citas atendidas (precio base de la especialidad de la cita).",
              cols: [["Odontólogo"], ["Citas", "n"], ["Producción", "n"]],
              filas: porMedico.map((m) => [m.nombre, String(m.atendidas || 0), moneyFmt(m.produccion)]),
              total: moneyFmt(totalProd),
              fuente: "Misma regla que el gerencial: citas atendidas × precio base (el S/ coincide si el periodo es el mismo).",
              tono: "brand",
            })}>
              <span className="dc-kpi__icon" style={{ background: "var(--dc-brand-100)", color: "var(--dc-brand-600)" }} aria-hidden="true">◎</span>
              <div className="dc-kpi__body">
                <div className="dc-kpi__label">Producción del periodo</div>
                <div className="dc-kpi__value">{moneyFmt(totalProd)}</div>
                <div className="dc-kpi__sub">{totalCitas} citas facturadas</div>
              </div>
            </button>
            <button type="button" className="dc-kpi" onClick={() => abrir({
              t: "Comisión devengada",
              s: "Producción × porcentaje",
              cifra: moneyFmt(totalCom),
              como: "Cada odontólogo: producción × su % (40% por defecto si no está editado). No es lo cobrado ni lo pagado.",
              cols: [["Odontólogo"], ["%", "n"], ["Comisión", "n"]],
              filas: porMedico.map((m) => [m.nombre, `${m.porcentaje}%`, moneyFmt(m.comision)]),
              total: moneyFmt(totalCom),
              tono: "ok",
            })}>
              <span className="dc-kpi__icon" style={{ background: "var(--dc-ok-100)", color: "var(--dc-ok-700)" }} aria-hidden="true">%</span>
              <div className="dc-kpi__body">
                <div className="dc-kpi__label">Comisión devengada</div>
                <div className="dc-kpi__value">{moneyFmt(totalCom)}</div>
                <div className="dc-kpi__sub">Sobre producción facturada</div>
              </div>
            </button>
            <button type="button" className="dc-kpi" onClick={() => abrir({
              t: "Odontólogos con producción",
              s: "Quién facturó en el periodo",
              cifra: `${odontoCon} de ${odontoTot}`,
              cols: [["Odontólogo"], ["Producción", "n"]],
              filas: porMedico.map((m) => [m.nombre, moneyFmt(m.produccion)]),
              tono: "cian",
            })}>
              <span className="dc-kpi__icon" style={{ background: "var(--dc-info-100)", color: "var(--dc-info-700)" }} aria-hidden="true">+</span>
              <div className="dc-kpi__body">
                <div className="dc-kpi__label">Odontólogos con producción</div>
                <div className="dc-kpi__value">{odontoCon} de {odontoTot}</div>
                <div className="dc-kpi__sub">{odontoTot - odontoCon > 0 ? `${odontoTot - odontoCon} sin actividad` : "Todos con actividad"}</div>
              </div>
            </button>
            <button type="button" className="dc-kpi" onClick={() => abrir({
              t: "Pendiente de liquidar",
              s: "Comisión ganada − pagos al odontólogo",
              cifra: sinDato ? "—" : moneyFmt(pendiente),
              como: "Requiere registrar pagos de comisión (fecha, importe, periodo). Distinto de liquidación de seguros.",
              falta: sinDato ? "Aún no hay pagos de comisión registrados en el sistema." : undefined,
              vacio: sinDato ? "Sin pagos registrados." : undefined,
              cols: [["Concepto"], ["Valor", "n"]],
              filas: sinDato ? [] : [
                ["Comisión ganada", moneyFmt(totalCom)],
                ["Pagado", moneyFmt(data?.totalPagado)],
                ["Pendiente", moneyFmt(pendiente)],
              ],
              tono: "aviso",
            })}>
              <span className="dc-kpi__icon" style={{ background: "var(--dc-warn-100)", color: "var(--dc-warn-700)" }} aria-hidden="true">☐</span>
              <div className="dc-kpi__body">
                <div className="dc-kpi__label">
                  Pendiente de liquidar
                  {sinDato && <span className="marca-demo">sin dato</span>}
                </div>
                <div className="dc-kpi__value" style={sinDato ? { color: "var(--dc-ink-400)" } : undefined}>
                  {sinDato ? "—" : moneyFmt(pendiente)}
                </div>
                <div className="dc-kpi__sub">{sinDato ? "Sin pagos registrados" : "Comisión − pagos"}</div>
              </div>
            </button>
          </section>

          <section className="dc-card">
            <div className="dc-card__head">
              <span className="vin" style={{ background: "var(--dc-brand-600)" }} />
              <h2>Producción y comisión por odontólogo</h2>
              <span className="dc-card__meta">
                100% = {moneyFmt(totalProd)}
                {filasEjemplo > 0 && (
                  <span className="marca-demo">{filasEjemplo} filas de ejemplo</span>
                )}
              </span>
              <button type="button" className="dc-info" aria-label="Detalle del módulo" onClick={() => abrir({
                t: "Producción y comisión por odontólogo",
                s: "Parte del total del periodo",
                cifra: moneyFmt(totalProd),
                parte: "100%",
                como: "Cada barra es la parte del total de producción del periodo, no un avance contra meta. La atribución es por el odontólogo de cada cita.",
                cols: [["Odontólogo"], ["Especialidad"], ["Citas", "n"], ["Producción", "n"], ["Comisión", "n"]],
                filas: porMedico.map((m) => [m.nombre, m.especialidad || "—", String(m.atendidas || 0), moneyFmt(m.produccion), moneyFmt(m.comision)]),
                total: moneyFmt(totalProd),
                fuente: "Misma regla de producción que el gerencial (atendidas × precio base); el S/ cuadra si el periodo coincide.",
                tono: "brand",
              })}>i</button>
            </div>
            <div className="dc-card__body">
              <div className="dc-tabla-doc" role="table" aria-label="Producción y comisión por odontólogo">
                <div className="fila cab" role="row">
                  <span>Odontólogo</span><span className="der">Citas</span><span>Parte del total</span>
                  <span className="der">Producción</span><span className="der">%</span><span className="der">Comisión</span>
                </div>
                {porMedico.map((m, i) => {
                  const lay = layoutProgreso(m.produccion, totalProd);
                  const color = COLORES[i % COLORES.length];
                  const nula = !(Number(m.produccion) > 0);
                  return (
                    <div
                      key={String(m.medicoId || m.nombre)}
                      className={`fila${nula ? " nula" : ""}`}
                      role="row"
                      tabIndex={0}
                      title={m.ejemplo ? "Reparto de ejemplo" : undefined}
                      onClick={() => abrir(fichaDoc(m))}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(fichaDoc(m)); } }}
                    >
                      <span className="qui">
                        <i className="ini" style={{ background: "var(--dc-bg-alt)", color: "var(--dc-ink-500)" }}>{inicialesDe(m.nombre)}</i>
                        <span>
                          <b>{m.nombre}</b>
                          <em>{m.especialidad || "—"}</em>
                        </span>
                      </span>
                      <span className="der num">{m.atendidas || 0}</span>
                      {nula || !lay.dibujar ? (
                        <span className="vacia">sin producción</span>
                      ) : (
                        <span className="pista">
                          <i className="seg" style={{ width: animReady || quieto ? `${lay.pct}%` : "0%", background: color }} />
                        </span>
                      )}
                      <span className="der num">{moneyFmt(m.produccion)}</span>
                      <span className="der pc">{lay.dibujar ? `${lay.pct.toFixed(1)}%` : "0%"}</span>
                      <span className={`der num${nula ? "" : " c-ok"}`}>{moneyFmt(m.comision)}</span>
                    </div>
                  );
                })}
                <div className="fila pie" role="row">
                  <span><b>Total</b></span>
                  <span className="der num">{totalCitas}</span>
                  <span />
                  <span className="der num">{moneyFmt(totalProd)}</span>
                  <span className="der pc">100%</span>
                  <span className="der num">{moneyFmt(totalCom)}</span>
                </div>
              </div>
            </div>
            <p className="dc-card__foot">
              Misma regla que el panel gerencial (atendidas × precio base). El <b>{moneyFmt(totalProd)}</b> coincide
              con «Producción del mes» cuando eliges el mismo tramo de fechas; el gerencial por defecto es mes en curso
              y aquí, si no filtras, suelen ser 6 meses.
            </p>
          </section>

          <div className="dc-grid g-2a">
            <section className="dc-card">
              <div className="dc-card__head">
                <span className="vin" style={{ background: "var(--dc-accent-cyan)" }} />
                <h2>Ingresos cobrados · acumulado</h2>
                <span className="dc-card__meta">{rangoLabel}</span>
                <button type="button" className="dc-info" aria-label="Detalle de ingresos" onClick={() => abrir({
                  t: "Ingresos cobrados",
                  s: "Acumulado del periodo",
                  cifra: moneyFmt(totalCobrado),
                  micro: [
                    ["Facturado", moneyFmt(totalProd)],
                    ["Descuadre", `${descuadre >= 0 ? "+" : ""}${moneyFmt(Math.abs(descuadre)).replace("S/ ", "S/ ")}`],
                  ],
                  como: "Suma de cobros de caja por mes. El descuadre frente a lo facturado puede venir de saldos de meses anteriores.",
                  cols: [["Mes"], ["Cobrado", "n"]],
                  filas: cobros.map((m) => [m.mesLargo || m.mes, moneyFmt(m.cobrado)]),
                  total: moneyFmt(totalCobrado),
                  tono: "cian",
                })}>i</button>
              </div>
              <div className="dc-card__body dc-card__body--alto">
                <dl className="dc-datos">
                  <div><dt>Cobrado</dt><dd>{moneyFmt(totalCobrado)}</dd></div>
                  <div onClick={() => abrir({
                    t: "Descuadre cobrado vs facturado",
                    s: "Misma ventana de fechas",
                    cifra: `${descuadre >= 0 ? "+" : "−"}${moneyFmt(Math.abs(descuadre))}`,
                    como: "Cobrado del periodo − producción facturada del mismo tramo. Puede ser positivo si se cobran tratamientos de antes.",
                    cols: [["Concepto"], ["Monto", "n"]],
                    filas: [["Cobrado", moneyFmt(totalCobrado)], ["Facturado", moneyFmt(totalProd)], ["Diferencia", moneyFmt(descuadre)]],
                    tono: "aviso",
                  })}>
                    <dt>Sobre lo facturado</dt>
                    <dd style={{ color: "var(--dc-warn-700)" }}>
                      {descuadre >= 0 ? "+" : "−"}{moneyFmt(Math.abs(descuadre))}
                    </dd>
                  </div>
                  <div><dt>Meses con cobro</dt><dd>{mesesConCobro} de {cobros.length || 6}</dd></div>
                </dl>
                <CanvasIngresos
                  meses={cobros.map((m) => m.mes)}
                  cobrados={cobros.map((m) => Number(m.cobrado) || 0)}
                  onOpen={() => abrir({
                    t: "Curva acumulada",
                    s: rangoLabel,
                    cifra: moneyFmt(totalCobrado),
                    como: "Escalón acumulado mes a mes; cada mes escribe lo cobrado bajo el eje para que montos chicos se lean.",
                    tono: "cian",
                  })}
                />
              </div>
              <p className="dc-card__foot">
                Acumulado en vez de barras sueltas, con lo cobrado de cada mes escrito bajo su nombre.
              </p>
            </section>

            <section className="dc-card">
              <div className="dc-card__head">
                <span className="vin" style={{ background: "var(--dc-ok-700)" }} />
                <h2>Cuánto rinde cada cita</h2>
                <span className="dc-card__meta">escala hasta {moneyFmt(techo)}</span>
                <button type="button" className="dc-info" aria-label="Detalle de rendimiento" onClick={() => abrir({
                  t: "Cuánto rinde cada cita",
                  s: "Producción ÷ citas",
                  cifra: moneyFmt(mediaClinica),
                  parte: "media clínica",
                  como: `Escala fija a ${moneyFmt(techo)} (no al máximo de la serie). La marca gris es la media de la clínica.`,
                  cols: [["Odontólogo"], ["Citas", "n"], ["Ticket", "n"]],
                  filas: porMedico.map((m) => [
                    m.nombre,
                    String(m.atendidas || 0),
                    m.atendidas > 0 ? moneyFmt(Number(m.produccion) / m.atendidas) : "—",
                  ]),
                  tono: "ok",
                })}>i</button>
              </div>
              <div className="dc-card__body">
                <div className="dc-barras">
                  {porMedico.map((m, i) => {
                    const ticket = m.atendidas > 0 ? Number(m.produccion) / m.atendidas : 0;
                    const lay = layoutRinde(ticket, techo);
                    const color = COLORES[i % COLORES.length];
                    if (!lay.dibujar) {
                      return (
                        <div key={String(m.medicoId)} className="hb hb--nula" title={`${m.nombre} · sin citas`}>
                          <span className="n">{m.nombre}</span>
                          <span className="v">—</span>
                          <span className="pc">0 citas</span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={String(m.medicoId)}
                        className="hb"
                        tabIndex={0}
                        onClick={() => abrir(fichaDoc(m))}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(fichaDoc(m)); } }}
                      >
                        <span className="n">{m.nombre}</span>
                        <span className="v">{moneyFmt(ticket)}</span>
                        <span className="pc">{m.atendidas} citas</span>
                        <div className="pista">
                          <div className="seg" style={{ width: animReady || quieto ? `${lay.pct}%` : "0%", background: color }} />
                          {mediaPct != null && <i className="marca" style={{ left: `${mediaPct}%` }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="dc-card__foot">
                La marca gris es la <b>media de la clínica: {moneyFmt(mediaClinica)} por cita</b>.
              </p>
            </section>
          </div>

          <div className="dc-pie">
            <span>Comisión sobre <b>producción facturada</b>, no sobre lo cobrado</span>
            <span>El porcentaje se define en la ficha de cada odontólogo</span>
            {can?.("comisiones", "editar") && (
              <span>Puedes registrar pagos de comisión desde esta pantalla</span>
            )}
          </div>
        </>
      )}

      {ficha && <FichaDato dato={ficha} onClose={cerrar} />}
    </div>
  );
}
