/* Periodontograma clínico: gráfica anatómica por arcada con margen gingival y fondo de
   bolsa, captura rápida por teclado, mapa de riesgo, indicadores y orientación AAP/EFP
   2017. Lo usan la pantalla Clínico › Periodontograma y la ficha del paciente.
   El contrato con el backend está documentado en util/periodontal.js. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Droplet, FileText, Keyboard, Printer, Sparkles, X, Zap } from "lucide-react";
import api, { auth } from "../api/client";
import { SUP, INF, SITIOS, piezaVacia, desdeApi, aApi, metricas, clasificacion, ordenVisual, esMolar, esSuperior, tipoDiente, nic, colorPs, demoPerio } from "../util/periodontal";

const COLW = 58;          // ancho de cada pieza en la gráfica
const MM = 4.6;           // píxeles por milímetro
const H = 150;            // alto de la gráfica de una cara
const CARA_NOMBRE = { v: "Vestibular", l: "Palatino", li: "Lingual" };

/* Silueta de la pieza. dir = -1 raíz hacia arriba (superior), +1 hacia abajo (inferior). */
function silueta(n, cx, cej, dir) {
  const t = tipoDiente(n);
  const cw = { molar: 44, premolar: 34, canino: 30, incisivo: 27 }[t];
  const ch = { molar: 30, premolar: 32, canino: 38, incisivo: 36 }[t];
  const rh = { molar: 62, premolar: 66, canino: 84, incisivo: 70 }[t];
  const x1 = cx - cw / 2, x2 = cx + cw / 2, oy = cej - dir * ch, my = cej - dir * ch * 0.55;
  const corona = `M ${x1} ${cej} C ${x1 - 3} ${my}, ${x1 + 3} ${oy}, ${cx} ${oy} C ${x2 - 3} ${oy}, ${x2 + 3} ${my}, ${x2} ${cej} Z`;
  const raiz = (rx, rw, largo) => `M ${rx - rw / 2} ${cej} C ${rx - rw / 2} ${cej + dir * largo * 0.62}, ${rx - 2} ${cej + dir * largo}, ${rx} ${cej + dir * largo} C ${rx + 2} ${cej + dir * largo}, ${rx + rw / 2} ${cej + dir * largo * 0.62}, ${rx + rw / 2} ${cej} Z`;
  const raices = t === "molar" ? [raiz(cx - cw * 0.24, 15, rh), raiz(cx + cw * 0.24, 15, rh * 0.94)] : t === "premolar" && n % 10 === 4 && esSuperior(n) ? [raiz(cx - 6, 11, rh), raiz(cx + 6, 11, rh * 0.95)] : [raiz(cx, cw * 0.56, rh)];
  return { corona, raices, oy };
}

function Grafica({ piezas, dientes, cara, dir, sel, onSel }) {
  const W = piezas.length * COLW;
  const cej = dir < 0 ? 92 : 58;
  const y = (mm) => cej + dir * mm * MM;
  // Tramos continuos de piezas presentes: las líneas se cortan en las ausencias.
  const tramos = []; let cur = [];
  piezas.forEach((n, i) => {
    const p = dientes[n];
    if (!p || p.ausente) { if (cur.length) tramos.push(cur); cur = []; return; }
    ordenVisual(n, cara === "v" ? "v" : "l").forEach((si, k) => {
      const pd = p.pd[si]; const mg = p.mg[si] ?? 0;
      cur.push({ x: i * COLW + COLW * (0.2 + k * 0.3), pd, mg, bop: p.bop[si], sup: p.sup[si] });
    });
  });
  if (cur.length) tramos.push(cur);
  return (
    <svg className="pg-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Gráfica ${CARA_NOMBRE[cara] || cara}`}>
      {[2, 4, 6, 8, 10].map((mm) => <line key={mm} x1="0" x2={W} y1={y(mm)} y2={y(mm)} className={`pg-svg__ref${mm === 4 || mm === 6 ? " is-marca" : ""}`} />)}
      {piezas.map((n, i) => {
        const p = dientes[n] || piezaVacia(); const cx = i * COLW + COLW / 2; const s = silueta(n, cx, cej, dir);
        return (
          <g key={n} className={`pg-diente${p.ausente ? " is-ausente" : ""}${p.implante ? " is-implante" : ""}${sel === n ? " is-sel" : ""}`} onClick={() => onSel(n)}>
            <rect x={i * COLW + 1} y="0" width={COLW - 2} height={H} rx="10" className="pg-diente__hit" />
            {p.implante
              ? <path d={`M ${cx - 6} ${cej} L ${cx - 4} ${cej + dir * 60} L ${cx} ${cej + dir * 66} L ${cx + 4} ${cej + dir * 60} L ${cx + 6} ${cej} Z`} className="pg-implante" />
              : s.raices.map((d, k) => <path key={k} d={d} className="pg-raiz" />)}
            <path d={s.corona} className="pg-corona" />
            {p.implante && [12, 24, 36, 48].map((o) => <line key={o} x1={cx - 6} x2={cx + 6} y1={cej + dir * o} y2={cej + dir * (o + 3)} className="pg-rosca" />)}
            {p.ausente && <path d={`M ${cx - 9} ${cej - 9} L ${cx + 9} ${cej + 9} M ${cx + 9} ${cej - 9} L ${cx - 9} ${cej + 9}`} className="pg-ausente-x" />}
          </g>
        );
      })}
      <line x1="0" x2={W} y1={cej} y2={cej} className="pg-svg__lac" />
      {tramos.map((t, k) => {
        const mgPts = t.map((s) => `${s.x},${y(s.mg)}`).join(" ");
        const pdPts = t.map((s) => `${s.x},${y(s.mg + (s.pd ?? 0))}`).join(" ");
        const area = `${mgPts} ${[...t].reverse().map((s) => `${s.x},${y(s.mg + (s.pd ?? 0))}`).join(" ")}`;
        return (
          <g key={k} pointerEvents="none">
            <polygon points={area} className="pg-bolsa" />
            <polyline points={mgPts} className="pg-margen" />
            <polyline points={pdPts} className="pg-fondo" />
            {t.map((s, j) => s.pd != null && s.pd >= 4 && <circle key={j} cx={s.x} cy={y(s.mg + s.pd)} r={s.pd >= 6 ? 4.2 : 3.4} className={`pg-punto is-${colorPs(s.pd)}`} />)}
            {t.map((s, j) => s.bop && <circle key={`b${j}`} cx={s.x} cy={y(s.mg) - dir * 5} r="2.6" className="pg-sangra" />)}
            {t.map((s, j) => s.sup && <circle key={`s${j}`} cx={s.x} cy={y(s.mg) - dir * 11} r="2.4" className="pg-supura" />)}
          </g>
        );
      })}
    </svg>
  );
}

export default function PeriodontogramaClinico({ pacienteId, pacienteNombre = "", notify = () => {}, soloLectura = false }) {
  const conectado = !!auth.token;
  const [dientes, setDientes] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState(16);
  const [arcada, setArcada] = useState("ambas");
  const [rapida, setRapida] = useState(true);
  const [estadoGuardado, setEstadoGuardado] = useState(null); // { tipo: "ok"|"guardando"|"error", hora }
  const [informe, setInforme] = useState(false);
  const timers = useRef({});
  const inputs = useRef([]);

  useEffect(() => {
    setCargando(true); setError(false);
    const completar = (m) => { const out = {}; [...SUP, ...INF].forEach((n) => { out[n] = m[n] || piezaVacia(); }); return out; };
    if (!conectado) { setDientes(completar(demoPerio(pacienteId))); setCargando(false); return; }
    if (!pacienteId) { setDientes(completar({})); setCargando(false); return; }
    api.perio.porPaciente(pacienteId)
      .then((rows) => setDientes(completar(desdeApi(rows))))
      .catch(() => { setDientes(completar({})); setError(true); })
      .finally(() => setCargando(false));
  }, [pacienteId, conectado]);

  // Guardado pieza por pieza, con una pausa corta para no enviar cada tecla.
  const persistir = (n, p) => {
    if (!conectado || !pacienteId) return;
    clearTimeout(timers.current[n]);
    setEstadoGuardado({ tipo: "guardando" });
    timers.current[n] = setTimeout(() => {
      api.perio.guardar(aApi(pacienteId, n, p))
        .then(() => setEstadoGuardado({ tipo: "ok", hora: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) }))
        .catch(() => { setEstadoGuardado({ tipo: "error" }); notify(`No se pudo guardar la pieza ${n}.`); });
    }, 650);
  };
  const cambiar = (n, fn) => {
    if (soloLectura) return;
    const b = dientes[n] || piezaVacia();
    const p = { ...b, pd: [...b.pd], mg: [...b.mg], bop: [...b.bop], placa: [...b.placa], sup: [...b.sup] };
    fn(p);
    setDientes((d) => ({ ...d, [n]: p }));
    persistir(n, p);
  };
  const setSitio = (n, campo, i, v) => cambiar(n, (p) => { p[campo][i] = v; });
  const togSitio = (n, campo, i) => cambiar(n, (p) => { p[campo][i] = !p[campo][i]; });

  const m = useMemo(() => metricas(dientes), [dientes]);
  const dx = useMemo(() => clasificacion(m), [m]);
  const orden = [...SUP, ...INF];
  const mover = (d) => { const i = orden.indexOf(sel); let j = i; do { j = (j + d + orden.length) % orden.length; } while (dientes[orden[j]]?.ausente && j !== i); setSel(orden[j]); };

  // Captura rápida: al escribir la profundidad salta al sitio siguiente. "1" espera el
  // segundo dígito (10, 11, 12…). B, P y S marcan sangrado, placa y supuración.
  let seq = 0;
  const celdaPs = (n, si, campo) => {
    const p = dientes[n]; const idx = seq++; const v = p[campo][si];
    const sev = campo === "pd" ? colorPs(v) : null;
    return (
      <input key={`${campo}${si}`} ref={(el) => { inputs.current[idx] = el; }} className={`pg-in${sev ? ` is-${sev}` : ""}${campo === "mg" ? " is-mg" : ""}`}
        inputMode="numeric" value={v ?? ""} disabled={soloLectura || p.ausente} aria-label={`${campo === "pd" ? "Profundidad" : "Margen gingival"} ${n} ${SITIOS[si]}`}
        title={`${campo === "pd" ? "Profundidad de sondaje" : "Margen gingival (recesión +)"} – pieza ${n}, ${SITIOS[si].toLowerCase()}`}
        onFocus={(e) => { setSel(n); e.target.select(); }}
        onKeyDown={(e) => {
          const k = e.key.toLowerCase();
          if (campo === "pd" && ["b", "p", "s"].includes(k)) { e.preventDefault(); togSitio(n, k === "b" ? "bop" : k === "p" ? "placa" : "sup", si); }
          if (e.key === "ArrowRight" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); inputs.current[idx + 1]?.focus(); }
          if (e.key === "ArrowLeft" || (e.key === "Enter" && e.shiftKey)) { e.preventDefault(); inputs.current[idx - 1]?.focus(); }
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(campo === "mg" ? /[^\d-]/g : /\D/g, "").slice(0, 3);
          const val = raw === "" || raw === "-" ? null : Math.max(campo === "mg" ? -9 : 0, Math.min(15, parseInt(raw, 10)));
          setSitio(n, campo, si, val);
          if (rapida && raw !== "" && raw !== "1" && raw !== "-") setTimeout(() => inputs.current[idx + 1]?.focus(), 0);
        }} />
    );
  };

  const cara = (piezas, c, dir, arriba) => {
    const cl = c === "v" ? "v" : "l";
    const filas = (
      <div className="pg-filas">
        {c === "v" && (
          <div className="pg-fila pg-fila--num"><span className="pg-lbl" />{piezas.map((n) => <button key={n} type="button" className={`dc-mini-btn pg-num${sel === n ? " is-sel" : ""}${dientes[n]?.ausente ? " is-aus" : ""}`} onClick={() => setSel(n)}>{n}</button>)}</div>
        )}
        {c === "v" && (
          <div className="pg-fila"><span className="pg-lbl">Movilidad</span>{piezas.map((n) => { const p = dientes[n]; return (
            <button key={n} type="button" className={`dc-mini-btn pg-chip${p.movilidad ? " is-on" : ""}`} disabled={soloLectura || p.ausente} title="Movilidad (Miller 0–3): toca para cambiar"
              onClick={() => cambiar(n, (q) => { q.movilidad = ((q.movilidad || 0) + 1) % 4 || null; })}>{p.ausente ? "" : p.movilidad || "·"}</button>); })}</div>
        )}
        {c === "v" && (
          <div className="pg-fila"><span className="pg-lbl">Furca</span>{piezas.map((n) => { const p = dientes[n]; return esMolar(n) && !p.ausente ? (
            <button key={n} type="button" className={`dc-mini-btn pg-furca g${p.furca || 0}`} disabled={soloLectura} title="Furca (Hamp 0–3): toca para cambiar"
              onClick={() => cambiar(n, (q) => { q.furca = ((q.furca || 0) + 1) % 4 || null; })}>{p.furca ? ["", "I", "II", "III"][p.furca] : "·"}</button>) : <span key={n} className="pg-vacio" />; })}</div>
        )}
        <div className="pg-fila"><span className="pg-lbl">Sangrado · placa</span>{piezas.map((n) => { const p = dientes[n]; return (
          <span key={n} className="pg-tres">{p.ausente ? null : ordenVisual(n, cl).map((si) => (
            <span key={si} className="pg-marcas">
              <button type="button" className={`dc-mini-btn pg-bop${p.bop[si] ? " is-on" : ""}`} disabled={soloLectura} onClick={() => togSitio(n, "bop", si)} aria-label={`Sangrado ${n} ${SITIOS[si]}`} title="Sangrado al sondaje (B)" />
              <button type="button" className={`dc-mini-btn pg-placa${p.placa[si] ? " is-on" : ""}`} disabled={soloLectura} onClick={() => togSitio(n, "placa", si)} aria-label={`Placa ${n} ${SITIOS[si]}`} title="Placa (P)" />
            </span>))}</span>); })}</div>
        <div className="pg-fila"><span className="pg-lbl">Margen gingival</span>{piezas.map((n) => <span key={n} className="pg-tres">{dientes[n].ausente ? null : ordenVisual(n, cl).map((si) => celdaPs(n, si, "mg"))}</span>)}</div>
        <div className="pg-fila"><span className="pg-lbl">Profundidad</span>{piezas.map((n) => <span key={n} className="pg-tres">{dientes[n].ausente ? null : ordenVisual(n, cl).map((si) => celdaPs(n, si, "pd"))}</span>)}</div>
        <div className="pg-fila pg-fila--nic"><span className="pg-lbl">Nivel de inserción</span>{piezas.map((n) => { const p = dientes[n]; return (
          <span key={n} className="pg-tres">{p.ausente ? null : ordenVisual(n, cl).map((si) => { const c2 = nic(p.pd[si], p.mg[si]); return <span key={si} className={`pg-nic${c2 != null && c2 >= 5 ? " is-alto" : c2 != null && c2 >= 3 ? " is-medio" : ""}`}>{c2 ?? ""}</span>; })}</span>); })}</div>
      </div>
    );
    const graf = <div className="pg-fila pg-fila--graf"><span className="pg-lbl pg-lbl--cara">{c === "v" ? "Vestibular" : dir < 0 ? "Palatino" : "Lingual"}</span><Grafica piezas={piezas} dientes={dientes} cara={c} dir={dir} sel={sel} onSel={setSel} /></div>;
    return <div className={`pg-cara${arriba ? " is-arriba" : ""}`}>{arriba ? <>{filas}{graf}</> : <>{graf}{filas}</>}</div>;
  };

  const p = dientes[sel] || piezaVacia();
  const nivel = (n) => { const x = dientes[n]; if (!x || x.ausente) return "aus"; const mx = Math.max(-1, ...x.pd.filter((v) => v != null)); return mx < 0 ? "vacio" : mx >= 6 ? "grave" : mx >= 4 ? "moderado" : "sano"; };
  const dxColor = { sin_datos: "#64748B", salud: "#16A36A", gingivitis: "#D97706", periodontitis: "#DC2626" }[dx.estado];

  const imprimir = () => {
    const w = window.open("", "_blank"); if (!w) { notify("Permite ventanas emergentes para imprimir."); return; }
    const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const fila = (lista) => lista.map((n) => { const t = dientes[n]; return `<tr><td><b>${n}</b></td><td>${t.ausente ? "Ausente" : t.pd.map((v) => v ?? "–").join(" ")}</td><td>${t.ausente ? "" : t.mg.map((v) => v ?? "–").join(" ")}</td><td>${t.ausente ? "" : t.pd.map((v, i) => nic(v, t.mg[i]) ?? "–").join(" ")}</td><td>${t.ausente ? "" : t.bop.filter(Boolean).length}</td><td>${t.movilidad || ""}</td><td>${esMolar(n) && t.furca ? t.furca : ""}</td></tr>`; }).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Periodontograma ${esc(pacienteNombre)}</title><style>body{font-family:Inter,Arial,sans-serif;color:#0f2a33;padding:28px}h1{font-size:20px;margin:0}small{color:#64748b}.k{display:flex;gap:10px;margin:16px 0}.k div{border:1px solid #dbe7e7;border-radius:10px;padding:8px 12px}.k b{display:block;font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}td,th{border-bottom:1px solid #e5eded;padding:5px 6px;text-align:left}th{background:#f3f8f8}</style></head><body><h1>Periodontograma</h1><small>${esc(pacienteNombre)} · ${new Date().toLocaleDateString("es-PE")}</small><div class="k"><div>Sangrado<b>${m.bopPct}%</b></div><div>Placa<b>${m.placaPct}%</b></div><div>PS media<b>${m.pdMedia} mm</b></div><div>NIC medio<b>${m.calMedia} mm</b></div><div>Sitios ≥4 mm<b>${m.s4}</b></div><div>Sitios ≥6 mm<b>${m.s6}</b></div></div><p><b>${esc(dx.titulo)}</b> (orientativo AAP/EFP 2017). ${esc(dx.detalle)}</p><table><tr><th>Pieza</th><th>PS (VM VC VD PM PC PD)</th><th>Margen</th><th>NIC</th><th>Sangrado</th><th>Movilidad</th><th>Furca</th></tr>${fila(SUP)}${fila(INF)}</table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  if (cargando) return <div className="pg-cargando"><Activity size={18} /> Cargando el periodontograma…</div>;

  return (
    <div className="pg">
      {error && <div className="pg-aviso"><AlertTriangle size={15} /> No se pudo leer el sondaje guardado. Lo que registres ahora se guardará igual.</div>}

      <section className="pg-resumen">
        <div className="pg-dx" style={{ "--c": dxColor }}>
          <span className="pg-dx__ico">{dx.estado === "salud" ? <CheckCircle2 size={20} /> : dx.estado === "sin_datos" ? <Activity size={20} /> : <AlertTriangle size={20} />}</span>
          <div><small>Orientación diagnóstica · AAP/EFP 2017</small><b>{dx.titulo}</b><p>{dx.detalle}</p></div>
        </div>
        <div className="pg-kpis">
          {[["Sangrado", `${m.bopPct}%`, m.bopPct >= 30 ? "mal" : m.bopPct >= 10 ? "warn" : "ok", "de los sitios"],
            ["Placa", `${m.placaPct}%`, m.placaPct >= 30 ? "mal" : m.placaPct >= 15 ? "warn" : "ok", "O'Leary"],
            ["PS media", `${m.pdMedia}`, m.pdMedia >= 4 ? "mal" : m.pdMedia >= 3 ? "warn" : "ok", "mm"],
            ["NIC medio", `${m.calMedia}`, m.calMedia >= 4 ? "mal" : m.calMedia >= 2.5 ? "warn" : "ok", "mm"],
            ["Bolsas ≥4", m.s4, m.s4 ? "warn" : "ok", `${m.s6} de ≥6 mm`],
            ["Piezas", m.presentes, "neutro", `${m.movil} con movilidad`]].map(([l, v, t, sub]) => (
            <div key={l} className={`pg-kpi is-${t}`}><span>{l}</span><b>{v}</b><small>{sub}</small></div>
          ))}
        </div>
      </section>

      <section className="pg-duo">
        <div className="pg-mapa">
          <header><b>Mapa de riesgo</b><span>Peor bolsa de cada pieza. Toca una para editarla.</span></header>
          {[SUP, INF].map((fila, k) => (
            <div key={k} className="pg-mapa__fila">
              {fila.map((n, i) => (
                <button key={n} type="button" className={`dc-mini-btn pg-mapa__d is-${nivel(n)}${sel === n ? " is-sel" : ""}${i === 8 ? " is-medio" : ""}`} onClick={() => setSel(n)} title={`Pieza ${n}`}>
                  {n}{dientes[n]?.bop.some(Boolean) && !dientes[n]?.ausente && <i />}
                </button>
              ))}
            </div>
          ))}
          {(() => { const crit = []; [...SUP, ...INF].forEach((n) => { const t = dientes[n]; if (!t || t.ausente) return; t.pd.forEach((v, i) => { if (v != null && v >= 5) crit.push({ n, i, v, b: t.bop[i] }); }); }); crit.sort((a2, b2) => b2.v - a2.v); return crit.length ? (
            <div className="pg-crit">
              <b>Sitios críticos <i>{crit.length}</i></b>
              <div>{crit.slice(0, 8).map((c) => <button key={`${c.n}-${c.i}`} type="button" className={`dc-mini-btn is-${colorPs(c.v)}`} onClick={() => setSel(c.n)} title={SITIOS[c.i]}><strong>{c.n}</strong> {SITIOS[c.i].replace("Palatino/lingual", "P/L").replace("Vestibular", "V")} · {c.v} mm{c.b ? " · sangra" : ""}</button>)}</div>
            </div>) : <p className="pg-crit__ok"><CheckCircle2 size={14} /> Sin bolsas de 5 mm o más.</p>; })()}
          <div className="pg-leyenda"><span className="is-sano">≤3 mm</span><span className="is-moderado">4–5 mm</span><span className="is-grave">≥6 mm</span><span className="is-aus">Ausente</span><span className="is-bop">Sangrado</span></div>
        </div>

        <div className="pg-insp">
          <header>
            <button type="button" className="pg-nav" onClick={() => mover(-1)} aria-label="Pieza anterior"><ChevronLeft size={16} /></button>
            <div className="pg-insp__tit"><small>{tipoDiente(sel)} · {esSuperior(sel) ? "superior" : "inferior"}</small><b>Pieza {sel}</b></div>
            <button type="button" className="pg-nav" onClick={() => mover(1)} aria-label="Pieza siguiente"><ChevronRight size={16} /></button>
            <div className="pg-insp__tog">
              <button type="button" className={p.ausente ? "is-on" : ""} disabled={soloLectura} onClick={() => cambiar(sel, (q) => { q.ausente = !q.ausente; })}>Ausente</button>
              <button type="button" className={p.implante ? "is-on" : ""} disabled={soloLectura} onClick={() => cambiar(sel, (q) => { q.implante = !q.implante; })}>Implante</button>
            </div>
          </header>
          {p.ausente ? <p className="pg-insp__nada">Pieza marcada como ausente: no cuenta en los indicadores.</p> : (<>
            <div className="pg-sitios">
              {[["v", "Vestibular"], ["l", esSuperior(sel) ? "Palatino" : "Lingual"]].map(([c, t]) => (
                <div key={c} className="pg-sitios__cara">
                  <span className="pg-sitios__t">{t}</span>
                  {ordenVisual(sel, c).map((si) => { const c2 = nic(p.pd[si], p.mg[si]); return (
                    <div key={si} className="pg-sitio">
                      <small>{SITIOS[si].split(" ").pop()}</small>
                      <b className={`is-${colorPs(p.pd[si]) || "vacio"}`}>{p.pd[si] ?? "–"}<em>mm</em></b>
                      <span>Margen {p.mg[si] ?? "–"} · NIC {c2 ?? "–"}</span>
                      <div className="pg-sitio__tog">
                        <button type="button" className={`dc-mini-btn is-b${p.bop[si] ? " is-on" : ""}`} disabled={soloLectura} onClick={() => togSitio(sel, "bop", si)} title="Sangrado"><Droplet size={12} /></button>
                        <button type="button" className={`dc-mini-btn is-p${p.placa[si] ? " is-on" : ""}`} disabled={soloLectura} onClick={() => togSitio(sel, "placa", si)} title="Placa">P</button>
                        <button type="button" className={`dc-mini-btn is-s${p.sup[si] ? " is-on" : ""}`} disabled={soloLectura} onClick={() => togSitio(sel, "sup", si)} title="Supuración">S</button>
                      </div>
                    </div>); })}
                </div>
              ))}
            </div>
            <div className="pg-insp__pie">
              <div className="pg-seg"><span>Movilidad</span>{[0, 1, 2, 3].map((x) => <button key={x} type="button" disabled={soloLectura} className={(p.movilidad || 0) === x ? "is-on" : ""} onClick={() => cambiar(sel, (q) => { q.movilidad = x || null; })}>{x}</button>)}</div>
              {esMolar(sel) && <div className="pg-seg"><span>Furca</span>{[0, 1, 2, 3].map((x) => <button key={x} type="button" disabled={soloLectura} className={(p.furca || 0) === x ? "is-on" : ""} onClick={() => cambiar(sel, (q) => { q.furca = x || null; })}>{x ? ["", "I", "II", "III"][x] : "0"}</button>)}</div>}
              <input className="pg-nota" value={p.nota} disabled={soloLectura} placeholder="Nota de la pieza (opcional)" onChange={(e) => { const v = e.target.value; cambiar(sel, (q) => { q.nota = v; }); }} />
            </div>
          </>)}
        </div>
      </section>

      <section className="pg-carta">
        <header className="pg-barra">
          <div className="pg-seg pg-seg--arc">{[["ambas", "Ambas arcadas"], ["sup", "Superior"], ["inf", "Inferior"]].map(([k, l]) => <button key={k} type="button" className={arcada === k ? "is-on" : ""} onClick={() => setArcada(k)}>{l}</button>)}</div>
          <button type="button" className={`pg-rapida${rapida ? " is-on" : ""}`} onClick={() => setRapida((x) => !x)} title="Al escribir una profundidad pasa solo al sitio siguiente"><Zap size={14} /> Captura rápida</button>
          <span className="pg-atajos"><Keyboard size={14} /> Escribe la profundidad · <kbd>B</kbd> sangrado · <kbd>P</kbd> placa · <kbd>S</kbd> supuración · <kbd>Enter</kbd> siguiente</span>
          <span className={`pg-estado is-${estadoGuardado?.tipo || (conectado ? "idle" : "demo")}`}>
            {!conectado ? "Demostración: los cambios no se guardan" : estadoGuardado?.tipo === "guardando" ? "Guardando…" : estadoGuardado?.tipo === "error" ? "Error al guardar" : estadoGuardado?.tipo === "ok" ? `Guardado ${estadoGuardado.hora}` : "Se guarda solo al escribir"}
          </span>
          <button type="button" className="pg-btn" onClick={() => setInforme(true)}><FileText size={14} /> Informe</button>
          <button type="button" className="pg-btn" onClick={imprimir}><Printer size={14} /> Imprimir</button>
        </header>
        <div className="pg-scroll">
          <div className="pg-lienzo">
            {arcada !== "inf" && (
              <div className="pg-arcada"><span className="pg-arcada__t">Arcada superior</span>
                {cara(SUP, "v", -1, true)}
                {cara(SUP, "l", -1, false)}
              </div>
            )}
            {arcada !== "sup" && (
              <div className="pg-arcada"><span className="pg-arcada__t">Arcada inferior</span>
                {cara(INF, "l", 1, true)}
                {cara(INF, "v", 1, false)}
              </div>
            )}
          </div>
        </div>
        <footer className="pg-ley2">
          <span><i className="l-margen" /> Margen gingival</span><span><i className="l-fondo" /> Fondo de bolsa</span><span><i className="l-lac" /> Límite amelocementario</span>
          <span><i className="l-sangra" /> Sangrado</span><span><i className="l-supura" /> Supuración</span><span className="pg-ley2__nota">Margen positivo = recesión · NIC = profundidad + margen</span>
        </footer>
      </section>

      {informe && (
        <div className="pg-velo" onMouseDown={() => setInforme(false)}>
          <div className="pg-modal" onMouseDown={(e) => e.stopPropagation()}>
            <header style={{ "--c": dxColor }}><span><Sparkles size={18} /></span><div><b>Informe periodontal</b><small>{pacienteNombre || "Paciente"} · {new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}</small></div><button type="button" onClick={() => setInforme(false)} aria-label="Cerrar"><X size={18} /></button></header>
            <div className="pg-modal__cuerpo">
              <div className="pg-dx" style={{ "--c": dxColor }}><div><small>Orientación AAP/EFP 2017</small><b>{dx.titulo}</b><p>{dx.detalle}</p></div></div>
              <ul className="pg-reco">
                {(dx.estado === "periodontitis" ? [`Raspado y alisado radicular en ${m.piezasConBolsa} ${m.piezasConBolsa === 1 ? "pieza" : "piezas"} con bolsas ≥4 mm`, "Reevaluación periodontal a las 6–8 semanas", m.placaPct >= 20 ? `Control de placa: hoy ${m.placaPct}%, meta menor al 20%` : "Mantener el control de placa actual", m.furcas ? `Seguimiento de ${m.furcas} ${m.furcas === 1 ? "furca comprometida" : "furcas comprometidas"}` : "Radiografías para confirmar el estadio y definir el grado"]
                  : dx.estado === "gingivitis" ? ["Profilaxis y destartraje", "Instrucción de higiene y técnica de cepillado", "Control en 3 meses"]
                  : dx.estado === "salud" ? ["Mantenimiento periodontal cada 6 meses", "Refuerzo de higiene interproximal"]
                  : ["Registra el sondaje de las seis caras de cada pieza"]).map((r) => <li key={r}><CheckCircle2 size={15} /> {r}</li>)}
              </ul>
              <p className="pg-modal__nota">Orientativo: la clasificación final la define el profesional con radiografías, antecedentes y factores de riesgo.</p>
            </div>
            <footer><button type="button" className="pg-btn" onClick={imprimir}><Printer size={14} /> Imprimir</button><button type="button" className="pg-btn is-pri" onClick={() => setInforme(false)}>Listo</button></footer>
          </div>
        </div>
      )}
    </div>
  );
}
