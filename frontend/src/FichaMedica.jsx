import React, { useState, useEffect, useRef } from "react";
import api, { auth } from "./api/client";
import { buscarCie10 } from "./cie10";
import {AvatarPaciente, PACIENTES_INIT, FICHA_CLINICA, DS, EDAD_PEDIATRICA, EmblemaNino, Select, aniosParaAdulto, calcEdad, caraOdontoLabel, colorPediatrico, denticionPorEdad, esPediatrico, etapaFicha, tint} from "./comun";
import {
  ESTADOS_ODO,
  FASES_ODO,
  DENTICIONES_ODO,
  denticionApi,
  normalizarCarasAnatomicas,
  carasParaPintar,
  geoAAnatomica,
  labelCaraAnatomica,
} from "./util/odontogramaCatalogo";
import { ChipAlergia } from "./ui";
import { puedeEscribirClinico as puedeEscribirClinicoDe } from "./util/clinicoWrite";
import { formatearFDI } from "./util/formatearFDI";
import { metaEstado, inicialCara } from "./util/odontogramaEstado";
import OdontogramaAnatomico from "./modulos/OdontogramaAnatomico";
import PlanInversionDocumento from "./modulos/PlanInversionDocumento";
import {
  X, User, Phone, Stethoscope, Smile, ClipboardList, CreditCard,
  FileText, Plus, Check, Mail, MessageSquare, Camera, AlertTriangle, Tag, Braces, Image, Pill, Printer, Trash2, Baby, Eraser,
  CalendarDays, Activity, Clock, Paperclip, LayoutGrid, ChevronDown, Pencil, Search, Shield, FlaskConical, Calendar,
} from "lucide-react";

/* ── Paleta dental: mismos tokens DS del producto (D17) ── */
const NAVY = "var(--dc-navy)", INK = DS.c.ink, TEAL = DS.c.primary, ACCENT = DS.c.accent,
  BG = "var(--dc-white)", LINE = DS.c.line, TEXT = DS.c.text, MUTED = DS.c.muted,
  GREEN = DS.c.success, RED = DS.c.error, WARN = DS.c.warning;
const SOFT = "var(--dc-bg)";                                                    // hairline suave
const SHADOW = "0 1px 2px rgba(16,24,40,.04), 0 6px 20px -8px rgba(16,24,40,.10)";  // sombra premium

const money = (n) => "S/ " + (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rotuloMedico = (n) => {
  const s = String(n || "").trim();
  if (!s) return "";
  // Quitar prefijos repetidos (Dr. / Dra. / Dr(a).) y dejar uno solo.
  const limpio = s.replace(/^(?:\s*(?:dr\(a\)\.?|dra\.?|dr\.?)\s*)+/i, "").trim();
  return limpio ? `Dr(a). ${limpio}` : "";
};
const edadDe = (iso) => { if (!iso) return null; const b = new Date(iso + "T00:00:00"); if (isNaN(b)) return null; const h = new Date(); let e = h.getFullYear() - b.getFullYear(); const m = h.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && h.getDate() < b.getDate())) e--; return e >= 0 && e < 120 ? e : null; };
const iniciales = (n) => (n || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const fmtFecha = (iso) => { if (!iso) return ""; const d = new Date(iso + "T00:00:00"); if (isNaN(d)) return iso; return d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }); };
const arr = (x) => (Array.isArray(x) ? x : []);
const parseJson = (s, fb) => { if (s == null) return fb; if (typeof s !== "string") return s; try { return JSON.parse(s) ?? fb; } catch { return fb; } };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Autocomplete CIE-10: API primero, catálogo local como fallback. */
function CieDiagInput({ value, onChange, style, placeholder = "Diagnóstico (CIE-10 o texto libre)" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sug, setSug] = useState([]);
  useEffect(() => {
    if (!open) return;
    const query = (q || value || "").trim();
    if (!query) { setSug(buscarCie10("", 10)); return; }
    const t = setTimeout(() => {
      if (auth.token) {
        api.cie10.buscar(query).then((r) => {
          const rows = Array.isArray(r) ? r : (r?.items || r?.resultados || []);
          if (rows.length) setSug(rows.map((x) => ({ c: x.codigo || x.c, d: x.descripcion || x.d })));
          else setSug(buscarCie10(query, 10));
        }).catch(() => setSug(buscarCie10(query, 10)));
      } else setSug(buscarCie10(query, 10));
    }, 180);
    return () => clearTimeout(t);
  }, [q, value, open]); // eslint-disable-line
  return (
    <div style={{ position: "relative" }}>
      <input
        style={style}
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setQ(value); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && sug.length > 0 && (
        <div style={{ position: "absolute", zIndex: 40, left: 0, right: 0, top: "100%", marginTop: 4, background: "var(--dc-white)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", boxShadow: "0 8px 24px rgba(16,24,40,.12)", maxHeight: 220, overflowY: "auto" }}>
          {sug.map((x) => (
            <button key={x.c} type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(`${x.c} — ${x.d}`); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13 }}>
              <span style={{ fontWeight: 500, color: "var(--dc-primary-alt)" }}>{x.c}</span>
              <span style={{ color: "var(--dc-ink-500)" }}> – {x.d}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const parseDiagnostico = (txt) => {
  const s = String(txt || "").trim();
  if (!s) return { diagnostico: null };
  const m = s.match(/^([A-Z]\d{2}(?:\.\d+)?)\s*[—\-]\s*(.+)$/);
  if (m) return { diagnostico: s, diagnosticoCodigo: m[1], diagnosticoDescripcion: m[2].trim() };
  return { diagnostico: s };
};

/* Abre una ventana imprimible con contenido HTML (recetas, historia clínica). */
function imprimir(titulo, inner, notify) {
  const w = window.open("", "_blank", "width=820,height=940");
  if (!w) { notify && notify("Permite las ventanas emergentes para imprimir."); return; }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
    <style>
      *{box-sizing:border-box} body{font-family:'Segoe UI',Arial,sans-serif;color:var(--dc-navy);margin:0;padding:34px 40px;font-size:13px;line-height:1.5}
      h1{font-size:20px;margin:0} h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--dc-primary-alt);border-bottom:1.5px solid var(--dc-line);padding-bottom:5px;margin:22px 0 10px}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid var(--dc-primary-alt);padding-bottom:14px}
      .muted{color:var(--dc-ink-400)} .row{display:flex;gap:24px;flex-wrap:wrap;margin:3px 0}
      .row b{color:var(--dc-ink-alt)} table{width:100%;border-collapse:collapse;margin-top:6px} th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--dc-line);font-size:12.5px;vertical-align:top}
      th{background:var(--dc-bg-alt);color:var(--dc-navy);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
      .box{border:1px solid var(--dc-line);border-radius:8px;padding:10px 12px;margin:6px 0;white-space:pre-wrap}
      .rx-item{border-bottom:1px dashed var(--dc-ink-200);padding:8px 0} .rx-item b{font-size:14px}
      .firma{margin-top:52px;text-align:center;width:280px;float:right} .firma div{border-top:1px solid var(--dc-navy);padding-top:6px}
      .pill{display:inline-block;background:var(--dc-bg-alt);border-radius:999px;padding:2px 10px;margin:2px 4px 2px 0;font-size:12px}
      @media print{body{padding:16px 20px}}
    </style></head><body>${inner}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch { } }, 350);
}
function cabeceraHTML(clinica, titulo) {
  const c = clinica || {};
  return `<div class="hdr"><div><h1>${esc(c.nombre || "Clínica Dental")}</h1>
    <div class="muted">${esc([c.razonSocial, c.ruc ? "RUC " + c.ruc : "", c.direccion].filter(Boolean).join(" – "))}</div>
    <div class="muted">${esc([c.telefono, c.email].filter(Boolean).join(" – "))}</div></div>
    <div style="text-align:right"><div style="font-weight:800;font-size:15px;color:var(--dc-primary-alt)">${esc(titulo)}</div>
    <div class="muted">${new Date().toLocaleDateString("es-PE")}</div></div></div>`;
}

/* ── Odontograma ── */
const D_AD_SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const D_AD_INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const D_NI_SUP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const D_NI_INF = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const ESTADOS = ESTADOS_ODO;
const FASES = FASES_ODO;
const D_MIX_SUP_PERM = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const D_MIX_SUP_TEMP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const D_MIX_INF_TEMP = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const D_MIX_INF_PERM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const WHOLE = new Set(["extraer", "ausente"]); // estados de pieza completa (no por cara)
const ERASE = "__borrar";

/** Estilos CSS por patrón (legibles en escala de grises + color). */
function estiloPatron(color, pat) {
  if (!color) return { background: "var(--dc-white)" };
  switch (pat) {
    case "hatch":
      return {
        backgroundColor: "var(--dc-white)",
        backgroundImage: `repeating-linear-gradient(45deg, ${color}, ${color} 1.5px, transparent 1.5px, transparent 4px)`,
      };
    case "slash":
      return {
        backgroundColor: "var(--dc-white)",
        backgroundImage: `repeating-linear-gradient(-45deg, ${color}, ${color} 1.5px, transparent 1.5px, transparent 5px)`,
      };
    case "dots":
      return {
        backgroundColor: "var(--dc-white)",
        backgroundImage: `radial-gradient(${color} 1.15px, transparent 1.2px)`,
        backgroundSize: "5px 5px",
      };
    case "double":
      return {
        background: "var(--dc-white)",
        boxShadow: `inset 0 0 0 2px ${color}, inset 0 0 0 3.5px var(--dc-white), inset 0 0 0 5px ${color}`,
      };
    case "cross":
      return { background: "var(--dc-white)" };
    case "solid":
    default:
      return { background: color };
  }
}

function SwatchEstado({ e, size = 12 }) {
  const pat = e?.pat || "solid";
  const base = {
    width: size, height: size, borderRadius: "var(--dc-r-sm)", flexShrink: 0,
    border: `1px solid ${LINE}`, boxSizing: "border-box",
    position: "relative", overflow: "hidden",
    ...estiloPatron(e?.c, pat),
  };
  return (
    <span aria-hidden style={base}>
      {pat === "cross" && (
        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: e?.c, fontSize: Math.max(8, size - 2), fontWeight: 500, lineHeight: 1 }}>✕</span>
      )}
    </span>
  );
}

/* Diente con marcado por caras (vestibular/mesial/oclusal/distal/lingual) + estado de pieza completa. */
function Diente({ n, data, pincel, onFace, onWhole, editable }) {
  const whole = data?.estado || "";
  const caras = carasParaPintar(n, data?.caras || {});
  const wEst = whole && WHOLE.has(whole) ? ESTADOS[whole] : null;
  const wholeMode = WHOLE.has(pincel) || pincel === ERASE;
  const cell = (f, extra) => {
    const est = caras[f] ? ESTADOS[caras[f]] : null;
    return <div onClick={editable && !wholeMode ? (e) => { e.stopPropagation(); onFace(f); } : undefined}
      title={labelCaraAnatomica(n, f)}
      style={{ border: `0.5px solid ${LINE}`, cursor: editable && !wholeMode ? "pointer" : "default", ...estiloPatron(est?.c, est?.pat), ...extra }} />;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>{formatearFDI(n)}</span>
      <div onClick={editable && wholeMode ? () => onWhole() : undefined}
        title={whole ? `Pieza ${formatearFDI(n)} – ${ESTADOS[whole]?.l}` : `Pieza ${formatearFDI(n)}`}
        style={{ position: "relative", width: 40, height: 56, borderRadius: "var(--dc-r-sm)", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", cursor: editable && wholeMode ? "pointer" : "default", boxShadow: `0 0 0 1px ${LINE}` }}>
        {cell("top", { gridColumn: "1 / 4", gridRow: "1" })}
        {cell("left", { gridColumn: "1", gridRow: "2" })}
        {cell("center", { gridColumn: "2", gridRow: "2" })}
        {cell("right", { gridColumn: "3", gridRow: "2" })}
        {cell("bottom", { gridColumn: "1 / 4", gridRow: "3" })}
        {wEst && wEst.pat === "cross" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: wEst.c, fontSize: 21, fontWeight: 500, lineHeight: 1, pointerEvents: "none" }}>✕</div>
        )}
        {wEst && wEst.pat !== "cross" && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...estiloPatron(wEst.c, wEst.pat) }} />
        )}
      </div>
    </div>
  );
}

function Odontograma({ pacienteId, notify, onGenerado, fechaNacimiento, hallazgosSeed, soloLectura = false, pacienteNombre, pacienteDni = "", sedeId = null }) {
  const conectado = !!auth.token;
  const editable = conectado && !soloLectura;
  const [fase, setFase] = useState("inicial");
  // Solo existe la vista anatómica; la clásica se retiró de la interfaz.
  const vistaOdo = "anatomico";
  const [showPlanInv, setShowPlanInv] = useState(false);
  const [anexoPlan, setAnexoPlan] = useState(null);
  const anatomicoRef = useRef(null);
  const abrirPlanInv = async () => {
    let anexo = null;
    try {
      if (anatomicoRef.current?.capturarAnexo) {
        anexo = await anatomicoRef.current.capturarAnexo();
      }
    } catch {
      notify && notify("No se pudo capturar el odontograma del paciente. Revisa la vista Anatómico.");
    }
    setAnexoPlan(anexo);
    setShowPlanInv(true);
  };
  const generarPlan = () => {
    if (!conectado) { notify("Disponible al iniciar sesión."); return; }
    api.tratamientos.desdeOdontograma(pacienteId)
      .then((r) => { 
        const msg = r.fases ? `Plan generado con ${r.fases} fase${r.fases > 1 ? 's' : ''}` : "Plan generado";
        notify(msg); 
        onGenerado && onGenerado();
        setTimeout(() => { window.location.hash = `#/tratamientos?pacienteId=${pacienteId}`; }, 800);
      })
      .catch((e) => {
        const msg = e?.status === 403 
          ? "Tu rol no puede crear plan de tratamiento." 
          : e?.data?.error || "No se pudo generar el plan.";
        notify(msg);
      });
  };
  // La denticion sale de la edad: por debajo de 13 anios se abre la de leche, que es
  // la que toca. Antes arrancaba siempre en adulto y el odontologo tenia que cambiarla
  // a mano en cada nino.
  const dentInicial = () => {
    const k = denticionPorEdad(fechaNacimiento);
    return k === "infantil" ? "infantil" : k === "mixta" ? "mixta" : "adulto";
  };
  const [denticion, setDenticion] = useState(dentInicial);
  useEffect(() => { setDenticion(dentInicial()); }, [fechaNacimiento]); // eslint-disable-line
  const [pincel, setPincel] = useState("caries");
  const [piezas, setPiezas] = useState({}); // { numero: {estado, caras:{face:estado}, nota} }
  const seedAPiezas = (rows) => {
    const m = {};
    (rows || []).forEach((r) => {
      let caras = {};
      const raw = r.estadosCara != null ? r.estadosCara : r.caras;
      if (typeof raw === "string") { try { caras = JSON.parse(raw || "{}") || {}; } catch { caras = {}; } }
      else if (raw && typeof raw === "object") caras = raw;
      const n = r.numeroPieza != null ? r.numeroPieza : r.pieza;
      if (n == null) return;
      m[n] = { estado: r.estadoPieza || r.estado || "", caras: normalizarCarasAnatomicas(n, caras), nota: r.nota || "" };
    });
    return m;
  };
  const cargar = () => {
    if (!conectado || !pacienteId) return;
    api.odontograma.porPaciente(pacienteId, fase).then((rows) => {
      if (fase === "evolucion" && !(rows || []).length) {
        // DC-47: precargar inicial o marcar Sin toma.
        api.odontograma.porPaciente(pacienteId, "inicial").then((ini) => {
          setPiezas(seedAPiezas(ini || []));
        }).catch(() => setPiezas({}));
        return;
      }
      setPiezas(seedAPiezas(rows));
    }).catch(() => {
      // Gerencia (u otro rol) puede no tener odontograma:ver; hidrata desde ficha360.
      const seed = (hallazgosSeed || []).filter((o) => !fase || !o.fase || o.fase === fase);
      setPiezas(seedAPiezas(seed.length ? seed : hallazgosSeed));
    });
  };
  useEffect(() => { cargar(); }, [fase, pacienteId]); // eslint-disable-line — ODO-04: no re-fetch por hallazgosSeed
  const persistir = (n, next) => {
    if (!editable) return;
    const carasAna = normalizarCarasAnatomicas(n, next.caras || {});
    api.odontograma.guardar({
      pacienteId,
      denticion: denticionApi(denticion),
      fase,
      numeroPieza: n,
      estadoPieza: next.estado || null,
      estadosCara: JSON.stringify(carasAna),
      nota: next.nota || null,
    }).catch(() => notify && notify("No se pudo guardar la pieza."));
  };
  const clickFace = (n, faceGeo) => {
    if (!editable) return;
    const face = geoAAnatomica(n, faceGeo);
    setPiezas((p) => {
      const cur = p[n] || { estado: "", caras: {}, nota: "" };
      const caras = { ...normalizarCarasAnatomicas(n, cur.caras || {}) };
      if (pincel === ERASE || caras[face] === pincel) delete caras[face]; else caras[face] = pincel;
      const next = { ...cur, caras };
      persistir(n, next); return { ...p, [n]: next };
    });
  };
  const clickWhole = (n) => {
    if (!editable) return;
    const cur = piezas[n] || { estado: "", caras: {}, nota: "" };
    const estado = pincel === ERASE ? "" : (cur.estado === pincel ? "" : pincel);
    // UX-09: confirmar estados destructivos de pieza completa (Extraer / Ausente).
    if (WHOLE.has(estado) && estado !== cur.estado) {
      const lbl = ESTADOS[estado]?.l || estado;
      if (!window.confirm(`¿Marcar pieza como ${lbl}? Esta acción es destructiva en el odontograma.`)) return;
    }
    const next = { ...cur, estado };
    persistir(n, next);
    setPiezas((p) => ({ ...p, [n]: next }));
  };
  const setNota = (n, nota) => {
    if (!editable) return;
    setPiezas((p) => { const cur = p[n] || { estado: "", caras: {}, nota: "" }; const next = { ...cur, nota }; persistir(n, next); return { ...p, [n]: next }; });
  };
  const filas = denticion === "adulto" ? [D_AD_SUP, D_AD_INF]
    : denticion === "infantil" ? [D_NI_SUP, D_NI_INF]
    : [D_MIX_SUP_PERM, D_MIX_SUP_TEMP, D_MIX_INF_TEMP, D_MIX_INF_PERM];
  const hallazgos = [];
  Object.entries(piezas).forEach(([n, d]) => {
    if (d.estado && d.estado !== "sano") hallazgos.push({ pieza: n, estado: d.estado, l: metaEstado(d.estado).l, cara: "", nota: d.nota });
    Object.entries(d.caras || {}).forEach(([f, est]) => { if (est && est !== "sano") hallazgos.push({ pieza: n, estado: est, l: metaEstado(est).l, cara: labelCaraAnatomica(n, f), nota: d.nota }); });
  });
  const hallazgosPlan = [];
  Object.entries(piezas).forEach(([n, d]) => {
    if (d.estado && d.estado !== "sano") hallazgosPlan.push([Number(n), d.estado, "pieza"]);
    Object.entries(d.caras || {}).forEach(([f, est]) => {
      if (est && est !== "sano") hallazgosPlan.push([Number(n), est, labelCaraAnatomica(n, f)]);
    });
  });
  const piezasMarcadas = Object.entries(piezas).filter(([, d]) => d.estado || Object.keys(d.caras || {}).length);
  const seg = (active) => ({ padding: "7px 14px", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: active ? "var(--dc-white)" : "transparent", color: active ? NAVY : "var(--dc-ink-400)", boxShadow: active ? "0 1px 2px rgba(16,24,40,.12)" : "none" });
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fm-odo-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Las fases se eligen dentro del odontograma (Inicial / Evolución / Alta). */}
        <span />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", background: "var(--dc-bg-alt)", borderRadius: "var(--dc-r-md)", padding: 3 }}>
            {DENTICIONES_ODO.map(([k, l]) => <button key={k} onClick={() => setDenticion(k)} style={seg(denticionApi(denticion) === k)}>{l}</button>)}
          </div>
          <button type="button" onClick={abrirPlanInv} title="Plan de inversión imprimible" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: "var(--dc-r-md)", border: `1.5px solid ${NAVY}`, background: "var(--dc-white)", color: NAVY, fontSize: 13, fontWeight: 500, cursor: "pointer" }}><Printer size={15} strokeWidth={1.75} /> Plan de inversión</button>
          {editable && <button onClick={generarPlan} title="Crea las fases del plan de tratamiento a partir de los hallazgos" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: "var(--dc-r-md)", border: `1.5px solid ${TEAL}`, background: "var(--dc-white)", color: TEAL, fontSize: 13, fontWeight: 500, cursor: "pointer" }}><ClipboardList size={15} strokeWidth={1.75} /> Generar plan</button>}
        </div>
      </div>
      {showPlanInv && (
        <PlanInversionDocumento
          paciente={{ nombre: pacienteNombre || "Paciente" }}
          hallazgos={hallazgosPlan}
          pacienteId={pacienteId}
          capa={fase}
          sedeId={sedeId}
          anexoDataUrl={anexoPlan}
          onClose={() => { setShowPlanInv(false); setAnexoPlan(null); }}
        />
      )}
      <div style={{ display: vistaOdo === "anatomico" ? "block" : "none" }}>
        <OdontogramaAnatomico
          ref={anatomicoRef}
          conExpediente={false}
          pacienteId={pacienteId}
          pacienteNombre={pacienteNombre || ""}
          pacienteDni={pacienteDni || ""}
          pacienteEdad={edadDe(fechaNacimiento) != null ? edadDe(fechaNacimiento) : ""}
          pacienteHc=""
          pacienteSede=""
          capa={fase}
          denticion={denticionApi(denticion)}
          notify={notify}
          editable={editable}
          onFaseChange={(f) => { if (f) setFase(f); }}
          onNavTab={(tabKey) => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("dc-fm-tab", { detail: { tab: tabKey } }));
            }
          }}
        />
      </div>
      {vistaOdo === "clasico" && <>
      {/* Paleta de estados (pincel) — NEW-46: solo si puede escribir */}
      {editable && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(ESTADOS).map(([k, e]) => (
          <button key={k} onClick={() => setPincel(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: "var(--dc-r-full)", border: `1.5px solid ${pincel === k ? e.c : LINE}`, background: pincel === k ? tint(e.c, 0.094) : "var(--dc-white)", color: pincel === k ? e.c : "var(--dc-ink-400)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            <SwatchEstado e={e} size={11} /> {e.l}
          </button>
        ))}
        <button onClick={() => setPincel(ERASE)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: "var(--dc-r-full)", border: `1.5px solid ${pincel === ERASE ? NAVY : LINE}`, background: pincel === ERASE ? "var(--dc-bg)" : "var(--dc-white)", color: pincel === ERASE ? NAVY : "var(--dc-ink-400)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
          <Eraser size={13} strokeWidth={1.75} /> Borrar
        </button>
        <span style={{ fontSize: 12, color: MUTED, alignSelf: "center", marginLeft: 4 }}>Elige un estado y haz clic en la <b>cara</b> del diente (Extraer/Ausente/Borrar marcan la pieza completa).</span>
      </div>}
      {!editable && <div style={{ fontSize: 13, color: "var(--dc-ink-400)", padding: "8px 12px", background: "var(--dc-bg)", borderRadius: "var(--dc-r-md)" }}>Solo lectura – tu rol no edita el odontograma.</div>}
      {/* Leyenda color — una sola; si hay paleta editable, esa hace de leyenda (DC-49). */}
      {!editable && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }} aria-label="Leyenda de estados del odontograma">
          {Object.entries(ESTADOS).map(([k, e]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: MUTED, fontWeight: 500 }}>
              <SwatchEstado e={e} size={14} /> {e.l}
            </span>
          ))}
        </div>
      )}
      {/* Dientes — sin scroll horizontal forzado en expediente (DC-49). */}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--dc-r-lg)", padding: "16px 12px", background: "var(--dc-white)", overflowX: "hidden", maxWidth: "100%" }}>
        <div style={{ display: "grid", gap: 12, width: "100%", justifyItems: "center" }}>
          {filas.map((fila, i) => (
            <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: "100%" }}>
              {fila.map((n) => <Diente key={n} n={n} data={piezas[n]} pincel={pincel} editable={editable} onFace={(f) => clickFace(n, f)} onWhole={() => clickWhole(n)} />)}
            </div>
          ))}
        </div>
      </div>
      </>}
      {fase === "evolucion" && Object.keys(piezas).length === 0 && (
        <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", borderRadius: "var(--dc-r-md)" }}>Sin toma de evolución aún.</div>
      )}
      {/* Plan de tratamiento / hallazgos */}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--dc-r-lg)", overflow: "hidden", background: "var(--dc-white)" }}>
        <div style={{ background: NAVY, color: "var(--dc-white)", display: "grid", gridTemplateColumns: "70px 1fr 1fr 1.2fr", padding: "10px 14px", fontSize: 12, fontWeight: 500 }}>
          <span>N° pieza</span><span>Hallazgo</span><span>Cara</span><span>Nota</span>
        </div>
        {hallazgos.length === 0 && <div style={{ padding: "16px 14px", fontSize: 13, color: MUTED }}>Sin hallazgos registrados en esta etapa.</div>}
        {hallazgos.map((h, i) => (
          <div key={h.pieza + "-" + i} style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr 1.2fr", padding: "10px 14px", borderTop: `1px solid ${LINE}`, fontSize: 13, alignItems: "center" }}>
            <b style={{ color: NAVY }}>{formatearFDI(h.pieza)}</b>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: TEXT }}><SwatchEstado e={metaEstado(h.estado)} size={10} /> {inicialCara(h.pieza, h.cara) ? <b>{inicialCara(h.pieza, h.cara)}</b> : null} {h.l || metaEstado(h.estado).l}</span>
            <span style={{ color: h.cara ? TEXT : "var(--dc-line-alt)" }}>{h.cara || "Pieza completa"}</span>
            <span style={{ color: h.nota ? TEXT : "var(--dc-line-alt)" }}>{h.nota || "—"}</span>
          </div>
        ))}
      </div>
      {/* Notas por pieza */}
      {conectado && piezasMarcadas.length > 0 && (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--dc-r-lg)", background: "var(--dc-white)", padding: 14 }}>
          <div style={{ fontWeight: 500, color: NAVY, fontSize: 13, marginBottom: 10 }}>Notas por pieza</div>
          <div style={{ display: "grid", gap: 8 }}>
            {piezasMarcadas.map(([n, d]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <b style={{ color: NAVY, minWidth: 34 }}>{formatearFDI(n)}</b>
                <input defaultValue={d.nota || ""} onBlur={(e) => { if ((e.target.value || "") !== (d.nota || "")) setNota(n, e.target.value); }} placeholder="Nota de la pieza (material, observación…)" style={{ flex: 1, padding: "7px 10px", borderRadius: "var(--dc-r-sm)", border: `1px solid ${LINE}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Ortodoncia: controles del tratamiento de brackets ── */
const APARATOS = ["Brackets metálicos", "Brackets estéticos", "Autoligado", "Ortopedia", "Alineadores", "Retenedor"];
function Ortodoncia({ pacienteId, notify }) {
  const conectado = !!auth.token;
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ fecha: new Date().toISOString().slice(0, 10), aparato: "Brackets metálicos", actividad: "", nota: "", proximoControl: "" });
  const cargar = () => { if (conectado && pacienteId) api.ortodoncia.porPaciente(pacienteId).then((r) => setRows(r || [])).catch(() => { }); };
  useEffect(() => { cargar(); }, [pacienteId]); // eslint-disable-line
  const guardar = () => {
    if (!f.actividad.trim()) { notify("Describe la actividad del control."); return; }
    api.ortodoncia.crear({ pacienteId, fecha: f.fecha, aparato: f.aparato, actividad: f.actividad, nota: f.nota || null, proximoControl: f.proximoControl || null })
      .then(() => { setF({ ...f, actividad: "", nota: "", proximoControl: "" }); notify("Control de ortodoncia registrado."); cargar(); })
      .catch(() => notify("No se pudo guardar."));
  };
  const borrar = (id) => { api.ortodoncia.borrar(id).then(() => { notify("Control eliminado."); cargar(); }).catch(() => notify("No se pudo eliminar.")); };
  const inp = { width: "100%", padding: "10px 13px", borderRadius: "var(--dc-r-md)", border: `1px solid ${SOFT}`, fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box", background: "var(--dc-white)" };
  const lbl = { fontSize: 13, fontWeight: 500, color: TEXT, display: "block", marginBottom: 6 };
  const card = { border: `1px solid ${SOFT}`, borderRadius: "var(--dc-r-lg)", background: "var(--dc-white)", padding: 18, boxShadow: SHADOW };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={card}>
        <div style={{ fontWeight: 500, color: NAVY, fontSize: 14, marginBottom: 12 }}>Nuevo control de ortodoncia</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>Fecha</label><input type="date" style={inp} value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></div>
          <div><label style={lbl}>Aparato</label><Select value={f.aparato} onChange={(v) => setF({ ...f, aparato: v })} options={APARATOS.map((a) => ({ value: a, label: a }))} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Actividad realizada</label><input style={inp} placeholder="Ej. Cambio de arco 0.016, activación…" value={f.actividad} onChange={(e) => setF({ ...f, actividad: e.target.value })} /></div>
          <div><label style={lbl}>Próximo control</label><input type="date" style={inp} value={f.proximoControl} onChange={(e) => setF({ ...f, proximoControl: e.target.value })} /></div>
          <div><label style={lbl}>Nota</label><input style={inp} value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 14, textAlign: "right" }}><button onClick={guardar} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: "var(--dc-r-md)", border: "none", background: TEAL, color: "var(--dc-white)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}><Plus size={15} strokeWidth={1.75} /> Registrar control</button></div>
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", fontWeight: 500, color: NAVY, borderBottom: `1px solid ${LINE}` }}>Historial de controles ({rows.length})</div>
        {rows.length === 0 && <div style={{ padding: 16, fontSize: 13, color: MUTED }}>Aún no hay controles de ortodoncia.</div>}
        {rows.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderTop: `1px solid ${LINE}` }}>
            <div style={{ minWidth: 82 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{c.fecha}</div>{c.proximoControl && <div style={{ fontSize: 12, color: WARN, fontWeight: 500 }}>Próx: {c.proximoControl}</div>}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{c.actividad}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{c.aparato}{c.nota ? ` – ${c.nota}` : ""}</div>
            </div>
            <button onClick={() => borrar(c.id)} title="Eliminar" style={{ background: "none", border: "none", cursor: "pointer", color: RED, fontSize: 12, fontWeight: 500 }}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Receta médica ── */
const ITEM_VACIO = () => ({ medicamento: "", presentacion: "", dosis: "", frecuencia: "", duracion: "" });
function Receta({ pacienteId, clinica, paciente, recetas, onChange, notify }) {
  const conectado = !!auth.token;
  const [items, setItems] = useState([ITEM_VACIO()]);
  const [indicaciones, setIndicaciones] = useState("");
  const inp = { width: "100%", padding: "9px 11px", borderRadius: "var(--dc-r-sm)", border: `1.5px solid ${LINE}`, fontSize: 13, color: NAVY, outline: "none", boxSizing: "border-box", background: "var(--dc-white)" };
  const setItem = (i, k, v) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addItem = () => setItems((xs) => [...xs, ITEM_VACIO()]);
  const delItem = (i) => setItems((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== i) : xs));
  const limpiar = () => { setItems([ITEM_VACIO()]); setIndicaciones(""); };
  
  // Validaciones pediátricas
  const edad = edadDe(paciente?.fechaNacimiento);
  const esPediatrico = edad !== null && edad < 18;
  const sinFechaNac = !paciente?.fechaNacimiento;
  
  const ajustarDosisSegunEdad = (med, pres, dosis, frec, dur) => {
    if (edad === null) return { medicamento: med, presentacion: pres, dosis, frecuencia: frec, duracion: dur };
    const medLower = String(med || "").toLowerCase();
    
    // Amoxicilina
    if (medLower.includes("amoxicilina")) {
      if (edad < 6) return { medicamento: med, presentacion: "suspensión", dosis: "50 mg/kg/día (consultar peso)", frecuencia: "c/8 h", duracion: dur || "7 días" };
      if (edad < 18) return { medicamento: med, presentacion: "250 mg", dosis: "1 cápsula", frecuencia: "c/8 h", duracion: dur || "7 días" };
      return { medicamento: med, presentacion: "500 mg", dosis: "1 cápsula", frecuencia: "c/8 h", duracion: dur || "7 días" };
    }
    
    // Ibuprofeno
    if (medLower.includes("ibuprofeno")) {
      if (edad < 6) return { medicamento: med, presentacion: "suspensión", dosis: "10 mg/kg (consultar peso)", frecuencia: "c/8 h", duracion: dur || "3 días" };
      if (edad < 12) return { medicamento: med, presentacion: "200 mg", dosis: "1 tableta", frecuencia: "c/8 h", duracion: dur || "3 días" };
      return { medicamento: med, presentacion: pres || "400 mg", dosis, frecuencia: frec, duracion: dur };
    }
    
    // Paracetamol
    if (medLower.includes("paracetamol") || medLower.includes("acetaminofén") || medLower.includes("acetaminofen")) {
      if (edad < 6) return { medicamento: med, presentacion: "suspensión", dosis: "15 mg/kg (consultar peso)", frecuencia: "c/8 h", duracion: dur || "3 días" };
      if (edad < 18) return { medicamento: med, presentacion: "250 mg", dosis: "1 tableta", frecuencia: "c/8 h", duracion: dur || "3 días" };
      return { medicamento: med, presentacion: "500 mg", dosis: "1 tableta", frecuencia: "c/8 h", duracion: dur || "3 días" };
    }
    
    // Azitromicina
    if (medLower.includes("azitromicina")) {
      if (edad < 6) return { medicamento: med, presentacion: "suspensión", dosis: "10 mg/kg (consultar peso)", frecuencia: "c/24 h", duracion: dur || "3 días" };
      if (edad < 18) return { medicamento: med, presentacion: "250 mg", dosis: "1 tableta", frecuencia: "c/24 h", duracion: dur || "3 días" };
      return { medicamento: med, presentacion: "500 mg", dosis: "1 tableta", frecuencia: "c/24 h", duracion: dur || "3 días" };
    }
    
    // Cefalexina
    if (medLower.includes("cefalexina")) {
      if (edad < 6) return { medicamento: med, presentacion: "suspensión", dosis: "25-50 mg/kg/día (consultar peso)", frecuencia: "c/8 h", duracion: dur || "7 días" };
      if (edad < 18) return { medicamento: med, presentacion: "250 mg", dosis: "1 cápsula", frecuencia: "c/8 h", duracion: dur || "7 días" };
      return { medicamento: med, presentacion: "500 mg", dosis: "1 cápsula", frecuencia: "c/8 h", duracion: dur || "7 días" };
    }
    
    // Clindamicina
    if (medLower.includes("clindamicina")) {
      if (edad < 12) return { medicamento: med, presentacion: "suspensión", dosis: "8-16 mg/kg/día (consultar peso)", frecuencia: "c/8 h", duracion: dur || "7 días" };
      return { medicamento: med, presentacion: pres || "300 mg", dosis, frecuencia: frec, duracion: dur };
    }
    
    return { medicamento: med, presentacion: pres, dosis, frecuencia: frec, duracion: dur };
  };
  
  const aplicarPlantilla = (pl) => {
    const itemsAjustados = pl.items.map((x) => {
      const ajustado = ajustarDosisSegunEdad(x.medicamento, x.presentacion, x.dosis, x.frecuencia, x.duracion);
      return { ...ITEM_VACIO(), ...ajustado };
    });
    setItems(itemsAjustados);
    setIndicaciones(pl.ind || "");
  };
  
  // Chequeo de seguridad: cruza los medicamentos con las alergias del paciente (directo + por familia).
  const alertaAlergia = (validos) => {
    const alergias = arr(paciente?.alergias).map((a) => String(a).toLowerCase().trim()).filter(Boolean);
    if (!alergias.length) return [];
    const msgs = new Set();
    validos.forEach((it) => {
      const med = String(it.medicamento || "").toLowerCase();
      if (!med) return;
      alergias.forEach((al) => {
        // NEW-41: subcadena solo si ambos lados tienen longitud mínima (evita fatiga de alertas).
        if (al.length >= MIN_ALERGIA_MATCH && med.length >= MIN_ALERGIA_MATCH && (med.includes(al) || al.includes(med))) {
          msgs.add(`${it.medicamento} ↔ alergia a "${al}"`);
        }
        ALERGIA_FAMILIA.forEach((fam) => {
          if (fam.some((f) => al.includes(f)) && fam.some((f) => med.includes(f))) {
            msgs.add(`${it.medicamento} ↔ alergia a "${al}"`);
          }
        });
      });
    });
    return [...msgs];
  };
  // El aviso de alergia se da en la propia pantalla, no en un window.confirm: ese cuadro
  // trae "Aceptar" enfocado y un Enter por inercia emitiría la receta.
  const [alergiaPend, setAlergiaPend] = useState(null);
  const emitirReceta = (validos, alertas) => {
    const body = {
      pacienteId,
      indicaciones: indicaciones || null,
      items: JSON.stringify(validos),
    };
    // NEW-39: persistir alerta + override cuando se emite a pesar del choque.
    if (alertas?.length) {
      body.alertaAlergia = JSON.stringify(alertas);
      body.overrideAlergia = true;
    }
    api.recetas.crear(body)
      .then(() => {
        notify(alertas.length ? "Receta emitida (alerta de alergia registrada)." : "Receta emitida.");
        limpiar();
        setAlergiaPend(null);
        onChange && onChange();
      })
      .catch((e) => notify(e?.status === 403 ? "Tu rol no puede emitir recetas." : "No se pudo emitir la receta."));
  };
  const guardar = () => {
    const validos = items.filter((x) => x.medicamento.trim());
    if (!validos.length) { notify("Agrega al menos un medicamento."); return; }
    const alertas = alertaAlergia(validos);
    if (alertas.length) { setAlergiaPend({ validos, alertas }); return; }
    emitirReceta(validos, alertas);
  };
  const printReceta = (r) => {
    const its = arr(parseJson(r.items, []));
    const filas = its.map((x) => `<div class="rx-item"><b>${esc(x.medicamento)}</b>${x.presentacion ? " — " + esc(x.presentacion) : ""}<div class="muted">${esc([x.dosis && ("Dosis: " + x.dosis), x.frecuencia && ("Frecuencia: " + x.frecuencia), x.duracion && ("Duración: " + x.duracion)].filter(Boolean).join("  –  "))}</div></div>`).join("");
    const edad = edadDe(paciente?.fechaNacimiento);
    imprimir("Receta médica", `${cabeceraHTML(clinica, "Receta médica")}
      <div class="row"><div><b>Paciente:</b> ${esc(paciente?.nombre || "")}</div>${paciente?.dni ? `<div><b>DNI:</b> ${esc(paciente.dni)}</div>` : ""}${paciente?.fechaNacimiento && edad != null ? `<div><b>Edad:</b> ${edad} años</div>` : ""}<div><b>Fecha:</b> ${esc(r.fecha || "")}</div></div>
      <h2>Rp/</h2>${filas || '<div class="muted">—</div>'}
      ${r.indicaciones ? `<h2>Indicaciones</h2><div class="box">${esc(r.indicaciones)}</div>` : ""}
      <div class="firma"><div>${esc(r.medico && r.medico !== "—" ? r.medico : "Firma y sello del profesional")}</div></div>`, notify);
  };
  const card = { border: `1px solid ${SOFT}`, borderRadius: "var(--dc-r-lg)", background: "var(--dc-white)", padding: 18, boxShadow: SHADOW };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: NAVY, fontSize: 14, marginBottom: 12 }}><Pill size={17} strokeWidth={1.75} color={TEAL} /> Nueva receta</div>
        {alergiaPend && (
          <div role="alertdialog" aria-label="Alergia detectada" style={{ background: "var(--dc-danger-soft)", border: "2px solid var(--dc-red)", borderRadius: "var(--dc-r-lg)", padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--dc-danger-700)", fontWeight: 500, fontSize: 14, marginBottom: 8 }}>
              <AlertTriangle size={20} strokeWidth={2} /> Alergia detectada
            </div>
            <ul style={{ margin: "0 0 12px", paddingLeft: 20, color: "var(--dc-danger-700)", fontSize: 13, lineHeight: 1.6 }}>
              {alergiaPend.alertas.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {/* SPEC clínico: primario = revisar (teal); peligro outline = emitir igual */}
              <button type="button" autoFocus onClick={() => setAlergiaPend(null)}
                style={{ minHeight: "var(--dc-tap-min)", padding: "9px 16px", borderRadius: "var(--dc-r-md)", border: "none",
                         background: TEAL, color: "var(--dc-white)", fontWeight: 500, fontSize: 13, cursor: "pointer",
                         fontFamily: "inherit", boxShadow: "0 8px 16px rgba(11,83,102,.25)" }}>
                Revisar la receta
              </button>
              {/penicil|amoxi|cef/i.test((alergiaPend.alertas || []).join(" ")) && (
              <button type="button" onClick={() => {
                const alt = PLANTILLAS_RX.find((pl) => /al[eé]rgico a penicilina/i.test(pl.l));
                if (!alt) { notify("No hay plantilla alternativa disponible."); return; }
                aplicarPlantilla(alt); setAlergiaPend(null); notify("Plantilla alternativa aplicada: Alérgico a penicilina.");
              }}
                style={{ minHeight: "var(--dc-tap-min)", padding: "9px 16px", borderRadius: "var(--dc-r-md)",
                         border: `1.5px solid ${TEAL}`, background: "var(--dc-white)", color: TEAL,
                         fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Usar alternativa (Clindamicina)
              </button>
              )}
              <button type="button" onClick={() => emitirReceta(alergiaPend.validos, alergiaPend.alertas)}
                style={{ minHeight: "var(--dc-tap-min)", padding: "9px 16px", borderRadius: "var(--dc-r-md)",
                         border: "1.5px solid var(--dc-danger-700)", background: "var(--dc-white)", color: "var(--dc-danger-700)",
                         fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Emitir de todas formas
              </button>
            </div>
          </div>
        )}
        {sinFechaNac && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--dc-danger-soft)", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-md)", padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "var(--dc-red-deep)" }}>
            <AlertTriangle size={16} strokeWidth={1.9} /> <span><b>Sin fecha de nacimiento.</b> Registra la fecha de nacimiento del paciente antes de emitir recetas (obligatorio para calcular dosis pediátricas).</span>
          </div>
        )}
        {esPediatrico && !sinFechaNac && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--dc-bg)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-md)", padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "var(--dc-info-ink)", fontWeight: 500 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Pediátrico – {edad} años — Dosis ajustadas automáticamente</span>
          </div>
        )}
        {arr(paciente?.alergias).length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--dc-danger-soft)", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-md)", padding: "8px 12px", marginBottom: 10, fontSize: 13, color: "var(--dc-red-deep)" }}>
            <AlertTriangle size={15} strokeWidth={1.9} /> <span><b>Alergias del paciente:</b> {arr(paciente.alergias).join(", ")} — se validan al emitir.</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>Plantillas:</span>
          {PLANTILLAS_RX.map((pl) => <button key={pl.l} onClick={() => aplicarPlantilla(pl)} style={{ padding: "5px 11px", borderRadius: "var(--dc-r-full)", border: `1.5px solid ${LINE}`, background: "var(--dc-white)", color: TEAL, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{pl.l}</button>)}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.9fr 1fr 0.9fr 34px", gap: 8, alignItems: "center" }}>
              <input style={inp} placeholder="Medicamento" value={it.medicamento} onChange={(e) => setItem(i, "medicamento", e.target.value)} />
              <input style={inp} placeholder="Presentación (500mg…)" value={it.presentacion} onChange={(e) => setItem(i, "presentacion", e.target.value)} />
              <input style={inp} placeholder="Dosis" value={it.dosis} onChange={(e) => setItem(i, "dosis", e.target.value)} />
              <input style={inp} placeholder="Frecuencia (c/8h)" value={it.frecuencia} onChange={(e) => setItem(i, "frecuencia", e.target.value)} />
              <input style={inp} placeholder="Duración (5 días)" value={it.duracion} onChange={(e) => setItem(i, "duracion", e.target.value)} />
              <button type="button" className="dc-icon-btn" aria-label="Quitar" onClick={() => delItem(i)} title="Quitar" style={{ background: "none", border: "none", cursor: "pointer", color: items.length > 1 ? RED : "var(--dc-line-alt)", display: "grid", placeItems: "center" }}><Trash2 size={16} strokeWidth={1.75} /></button>
            </div>
          ))}
          <div><button onClick={addItem} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: "var(--dc-r-sm)", border: `1.5px dashed ${LINE}`, background: "var(--dc-white)", color: TEAL, fontSize: 13, fontWeight: 500, cursor: "pointer" }}><Plus size={14} strokeWidth={1.75} /> Agregar medicamento</button></div>
          <textarea style={{ ...inp, resize: "vertical" }} rows={2} placeholder="Indicaciones generales (reposo, alimentación, etc.)" value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button onClick={guardar} disabled={sinFechaNac} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: "var(--dc-r-md)", border: "none", background: sinFechaNac ? "var(--dc-line-alt)" : TEAL, color: "var(--dc-white)", fontSize: 13, fontWeight: 500, cursor: sinFechaNac ? "not-allowed" : "pointer", opacity: sinFechaNac ? 0.6 : 1 }}><Check size={15} strokeWidth={1.75} /> Emitir receta</button>
            {sinFechaNac && <span style={{ fontSize: 12, color: RED, fontStyle: "italic" }}>Registra la fecha de nacimiento del paciente para habilitar</span>}
          </div>
        </div>
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", fontWeight: 500, color: NAVY, borderBottom: `1px solid ${LINE}` }}>Recetas emitidas ({arr(recetas).length})</div>
        {arr(recetas).length === 0 && <div style={{ padding: 16, fontSize: 13, color: MUTED }}>Aún no hay recetas emitidas.</div>}
        {arr(recetas).map((r, i) => {
          const its = arr(parseJson(r.items, []));
          return (
            <div key={r.id || i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderTop: `1px solid ${LINE}` }}>
              <div style={{ minWidth: 82 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{r.fecha}</div><div style={{ fontSize: 12, color: MUTED }}>{r.medico}</div></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{its.length ? its.map((x) => x.medicamento).filter(Boolean).join(", ") : "Receta"}</div>
                {r.indicaciones && <div style={{ fontSize: 12, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.indicaciones}</div>}
                {r.overrideAlergia && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--dc-danger-700)", fontWeight: 500 }}>
                    ⚠ Emitida con override de alergia
                    {(() => { const al = arr(typeof r.alertaAlergia === "string" ? parseJson(r.alertaAlergia, []) : r.alertaAlergia); return al.length ? `: ${al.join("; ")}` : ""; })()}
                  </div>
                )}
              </div>
              <button onClick={() => printReceta(r)} title="Imprimir" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: `1.5px solid ${LINE}`, borderRadius: "var(--dc-r-sm)", padding: "6px 10px", cursor: "pointer", color: NAVY, fontSize: 12, fontWeight: 500 }}><Printer size={14} strokeWidth={1.75} /> Imprimir</button>
              {r.id && conectado && <button type="button" className="dc-icon-btn" aria-label="Eliminar" onClick={() => api.recetas.borrar(r.id).then(() => { notify("Receta eliminada."); onChange && onChange(); }).catch(() => notify("No se pudo eliminar."))} title="Eliminar" style={{ background: "none", border: "none", cursor: "pointer", color: RED, display: "grid", placeItems: "center" }}><Trash2 size={16} strokeWidth={1.75} /></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Periodontograma: sondaje por pieza (6 sitios) + sangrado, movilidad y furca ── */
const SITIOS = ["Vestibular mesial", "Vestibular", "Vestibular distal", "Palatino/Lingual mesial", "Palatino/Lingual", "Palatino/Lingual distal"];
const colPD = (v) => (!v && v !== 0 ? "var(--dc-line-alt)" : v >= 6 ? "var(--dc-danger)" : v >= 4 ? "var(--dc-warn-700)" : "var(--dc-ok-700)");
function Periodontograma({ pacienteId, notify }) {
  const conectado = !!auth.token;
  const [denticion, setDenticion] = useState("adulto");
  const [pz, setPz] = useState({});
  const cargar = () => {
    if (!conectado || !pacienteId) return;
    api.perio.porPaciente(pacienteId).then((rows) => {
      const m = {}; (rows || []).forEach((r) => { m[r.numeroPieza] = { profundidad: arr(parseJson(r.profundidad, [])), sangrado: arr(parseJson(r.sangrado, [])), recesion: arr(parseJson(r.recesion, [])), movilidad: r.movilidad, furca: r.furca, nota: r.nota || "" }; }); setPz(m);
    }).catch(() => { });
  };
  useEffect(() => { cargar(); }, [pacienteId]); // eslint-disable-line
  const cur = (n) => pz[n] || { profundidad: [], sangrado: [], recesion: [], movilidad: null, furca: null, nota: "" };
  const persist = (n, next) => { if (conectado) api.perio.guardar({ pacienteId, numeroPieza: n, profundidad: JSON.stringify(next.profundidad || []), recesion: JSON.stringify(next.recesion || []), sangrado: JSON.stringify(next.sangrado || []), movilidad: next.movilidad ?? null, furca: next.furca ?? null, nota: next.nota || null }).catch(() => notify && notify("No se pudo guardar la pieza.")); };
  const set6 = (a, i, v) => { const x = [...(a || [])]; while (x.length < 6) x.push(undefined); x[i] = v; return x; };
  const pdChange = (n, i, val) => { const c = cur(n); const v = val === "" ? undefined : Math.max(0, Math.min(20, parseInt(val, 10) || 0)); const next = { ...c, profundidad: set6(c.profundidad, i, v) }; setPz((p) => ({ ...p, [n]: next })); };
  const recChange = (n, i, val) => { const c = cur(n); const v = val === "" ? undefined : Math.max(0, Math.min(20, parseInt(val, 10) || 0)); const next = { ...c, recesion: set6(c.recesion, i, v) }; setPz((p) => ({ ...p, [n]: next })); };
  const pdBlur = (n) => persist(n, cur(n));
  const toggleBOP = (n, i) => { const c = cur(n); const s = set6(c.sangrado, i, !(c.sangrado || [])[i]); const next = { ...c, sangrado: s }; setPz((p) => ({ ...p, [n]: next })); persist(n, next); };
  const setMF = (n, campo, v) => { const c = cur(n); const next = { ...c, [campo]: c[campo] === v ? null : v }; setPz((p) => ({ ...p, [n]: next })); persist(n, next); };
  const filas = denticion === "adulto" ? [D_AD_SUP, D_AD_INF] : [D_NI_SUP, D_NI_INF];
  // Resumen
  let sitios4 = 0, sitios6 = 0, bop = 0, sitiosTot = 0, movil = 0;
  Object.values(pz).forEach((d) => { (d.profundidad || []).forEach((v) => { if (v || v === 0) { sitiosTot++; if (v >= 4) sitios4++; if (v >= 6) sitios6++; } }); (d.sangrado || []).forEach((b) => { if (b) bop++; }); if (d.movilidad) movil++; });
  const pctBop = sitiosTot ? Math.round((bop / (Object.keys(pz).length * 6 || 1)) * 100) : 0;
  const seg = (active) => ({ padding: "7px 14px", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: active ? "var(--dc-white)" : "transparent", color: active ? NAVY : "var(--dc-ink-400)", boxShadow: active ? "0 1px 2px rgba(16,24,40,.12)" : "none" });
  const pdInput = (n, i) => { const c = cur(n); const v = (c.profundidad || [])[i]; const r = (c.recesion || [])[i]; const b = (c.sangrado || [])[i]; return (
    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
      <div onClick={() => toggleBOP(n, i)} title="Sangrado al sondaje" style={{ width: 22, height: 5, borderRadius: "var(--dc-r-sm)", background: b ? "var(--dc-danger)" : "var(--dc-bg)", cursor: "pointer" }} />
      <input value={v ?? ""} onChange={(e) => pdChange(n, i, e.target.value)} onBlur={() => pdBlur(n)} disabled={!conectado} title={"Profundidad de sondaje – " + SITIOS[i]} inputMode="numeric" style={{ width: 26, height: 26, textAlign: "center", border: `1px solid ${LINE}`, borderRadius: "var(--dc-r-sm)", color: colPD(v), fontWeight: 500, fontSize: 13, outline: "none", background: "var(--dc-white)" }} />
      <input value={r ?? ""} onChange={(e) => recChange(n, i, e.target.value)} onBlur={() => pdBlur(n)} disabled={!conectado} title={"Recesión – " + SITIOS[i]} inputMode="numeric" style={{ width: 26, height: 20, textAlign: "center", border: `1px solid ${LINE}`, borderRadius: "var(--dc-r-sm)", color: r ? "var(--dc-purple)" : "var(--dc-line-alt)", fontWeight: 500, fontSize: 12, outline: "none", background: "var(--dc-white)" }} />
    </div>
  ); };
  const diente = (n) => { const c = cur(n); return (
    <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 4, borderRadius: "var(--dc-r-sm)", background: "var(--dc-white)", border: `1px solid ${LINE}` }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>{n}</span>
      <div style={{ display: "flex", gap: 2 }}>{[0, 1, 2].map((i) => pdInput(n, i))}</div>
      <div style={{ display: "flex", gap: 2 }}>{[3, 4, 5].map((i) => pdInput(n, i))}</div>
      {/* Estos dos siguen siendo <select> nativos a proposito, y no el Select propio:
          son controles de 10px que se repiten por cada uno de los 32 dientes. El
          componente propio los haria mas altos, metenria 64 desplegables con estado
          en una rejilla ya muy densa, y en el movil el nativo abre el selector del
          sistema, que aqui se maneja mejor. Lo que si faltaba era decir de que diente
          es cada uno: "M" y "F" no significan nada para un lector de pantalla. */}
      <div style={{ display: "flex", gap: 3, marginTop: 1 }}>
        <select aria-label={`Movilidad del diente ${n}`} value={c.movilidad ?? ""} onChange={(e) => setMF(n, "movilidad", e.target.value === "" ? null : parseInt(e.target.value, 10))} disabled={!conectado} title="Movilidad" style={{ fontSize: 12, border: `1px solid ${LINE}`, borderRadius: "var(--dc-r-sm)", color: c.movilidad ? "var(--dc-warn-600)" : MUTED, background: "var(--dc-white)", cursor: "pointer", padding: "1px" }}>
          <option value="">M</option>{[0, 1, 2, 3].map((x) => <option key={x} value={x}>M{x}</option>)}
        </select>
        <select aria-label={`Furca del diente ${n}`} value={c.furca ?? ""} onChange={(e) => setMF(n, "furca", e.target.value === "" ? null : parseInt(e.target.value, 10))} disabled={!conectado} title="Furca" style={{ fontSize: 12, border: `1px solid ${LINE}`, borderRadius: "var(--dc-r-sm)", color: c.furca ? "var(--dc-purple)" : MUTED, background: "var(--dc-white)", cursor: "pointer", padding: "1px" }}>
          <option value="">F</option>{[0, 1, 2, 3].map((x) => <option key={x} value={x}>F{x}</option>)}
        </select>
      </div>
    </div>
  ); };
  const card = { border: `1px solid ${SOFT}`, borderRadius: "var(--dc-r-lg)", background: "var(--dc-white)", padding: 18, boxShadow: SHADOW };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", background: "var(--dc-bg-alt)", borderRadius: "var(--dc-r-md)", padding: 3 }}>
          {[["adulto", "Adulto"], ["infantil", "Niño"]].map(([k, l]) => <button key={k} onClick={() => setDenticion(k)} style={seg(denticion === k)}>{l}</button>)}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
          <span style={{ color: "var(--dc-warn-700)", fontWeight: 500 }}>● Bolsa ≥4mm: {sitios4}</span>
          <span style={{ color: "var(--dc-danger)", fontWeight: 500 }}>● ≥6mm: {sitios6}</span>
          <span style={{ color: "var(--dc-red-deep)", fontWeight: 500 }}>Sangrado: {pctBop}%</span>
          <span style={{ color: "var(--dc-warn-600)", fontWeight: 500 }}>Piezas con movilidad: {movil}</span>
        </div>
      </div>
      <div style={{ ...card, overflowX: "auto" }}>
        <div style={{ display: "grid", gap: 12, minWidth: denticion === "adulto" ? 720 : 480, justifyItems: "center" }}>
          {filas.map((fila, i) => <div key={i} style={{ display: "flex", gap: 4 }}>{fila.map((n) => diente(n))}</div>)}
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>Cada pieza: 3 sitios vestibulares (bloque superior) y 3 palatinos/linguales (bloque inferior). Por sitio: barra roja = <b>sangrado</b> (clic), casilla grande = <b>profundidad de sondaje</b> (verde &lt;4 – ámbar 4-5 – rojo ≥6 mm), casilla pequeña morada = <b>recesión</b> (mm). <b>M</b> = movilidad, <b>F</b> = furca.</div>
      </div>
    </div>
  );
}

/* ── Cuestionario de antecedentes (Historia clínica) ── */
const CONDICIONES = ["Diabetes", "Hipertensión", "Problemas cardíacos", "Asma", "Problemas de coagulación", "Hepatitis", "Epilepsia", "Problemas renales", "Anemia", "Cáncer", "Tiroides", "Osteoporosis", "Embarazo", "Medicación actual"];
/* A un nino de 7 anios se le ofrecia marcar "Embarazo" y "Osteoporosis": la
   primera no viene al caso y la segunda es de edad avanzada. Ensucian la lista
   justo cuando hay que leerla rapido antes de anestesiar. */
const CONDICIONES_ADULTO = ["Embarazo", "Osteoporosis"];
/* Se preguntaba "¿Fuma?" y "¿Consume alcohol?" en la ficha de un nino de 7 anios.
   Y "Respirador bucal" y "Onicofagia" salian DOS veces -- aqui y en habitos orales
   pediatricos --, guardandose en campos distintos, asi que marcarlo en un sitio no
   se veia en el otro. Ahora cada cosa esta en un solo lugar: */
const HABITOS_ADULTO = ["Fuma", "Consume alcohol"];                 // desde la transicion
const HABITOS_COMUNES = ["Bruxismo", "Rechina los dientes"];        // a cualquier edad
const HABITOS = [...HABITOS_ADULTO, ...HABITOS_COMUNES, "Respirador bucal", "Onicofagia"];  // compat. con fichas ya guardadas
const HABITOS_ORALES = ["Succión digital", "Uso de chupón", "Biberón nocturno", "Deglución atípica", "Respirador bucal", "Onicofagia"];
// Escala de Frankl: clasifica como se porto el nino en el sillon. No es un adorno,
// decide si la proxima cita necesita mas tiempo, acompanamiento o derivacion.
const FRANKL = [
  { v: "1", l: "1 – Claramente negativo", d: "Rechaza, llora, no colabora", c: "var(--dc-red)" },
  { v: "2", l: "2 – Negativo", d: "Reticente, poco colaborador", c: "var(--dc-warn-600)" },
  { v: "3", l: "3 – Positivo", d: "Acepta, algo cauteloso", c: "var(--dc-accent-cyan)" },
  { v: "4", l: "4 – Claramente positivo", d: "Colabora y viene a gusto", c: "var(--dc-ok-700)" },
];
// Marca cada cuanto hay que citarlo a control y si toca fluor o sellantes.
const RIESGO_CARIES = [{ v: "bajo", l: "Bajo", c: "var(--dc-ok-700)" }, { v: "moderado", l: "Moderado", c: "var(--dc-warn-600)" }, { v: "alto", l: "Alto", c: "var(--dc-red)" }];
const PREVENCION = ["Aplicación de flúor", "Sellantes", "Instrucción de higiene", "Control de dieta azucarada"];
// En odontología el control relevante antes de un procedimiento con anestesia es la presión
// arterial y el pulso (riesgo cardiovascular / vasoconstrictor). El peso solo importa en niños
// (dosificación pediátrica). No es una toma hospitalaria completa de signos vitales.
/* Los ejemplos que se ven en gris dentro de cada casilla son valores NORMALES de
   referencia, y los de un nino no son los de un adulto: a los 7 anios el pulso
   ronda las 90 lpm y la presion los 95/60, no 72 y 120/80. Poner el de adulto
   hacia parecer alterado lo que es normal a esa edad. */
const VITALES = [["pa", "P. Arterial", "120/80"], ["fc", "Pulso", "72 lpm"], ["temp", "Temp.", "36.5°"]];
const VITALES_NINO = [["pa", "P. Arterial", "95/60"], ["fc", "Pulso", "90 lpm"], ["temp", "Temp.", "36.5°"]];
// Peso y talla: en pediatria se miden en cada control para seguir el crecimiento.
const VITALES_PED = [["peso", "Peso", "kg"], ["talla", "Talla", "cm"]];
const TIPOS_ARCHIVO = ["Radiografía panorámica", "Radiografía periapical", "Radiografía bitewing", "Tomografía", "Foto intraoral", "Foto extraoral", "Documento", "Otro"];
const ESTADO_CITA = { pendiente: "Pendiente", confirmada: "Confirmada", en_atencion: "En atención", atendida: "Atendida", cancelada: "Cancelada", no_show: "No asistió", cerrada_sistema: "Cerrada por sistema" };
// Plantillas rápidas para no escribir de cero (el doctor solo ajusta el detalle).
const PLANTILLAS_EVO = [
  { l: "Profilaxis", diag: "Profilaxis dental", det: "Destartraje supragingival y profilaxis con pasta profiláctica. Se refuerzan indicaciones de higiene oral y técnica de cepillado." },
  { l: "Exodoncia", diag: "Exodoncia simple", det: "Bajo anestesia local, se realiza exodoncia de la pieza ___. Hemostasia lograda. Se indican cuidados post-operatorios." },
  { l: "Restauración", diag: "Restauración con resina", det: "Remoción de caries y restauración con resina compuesta en pieza ___, cara ___. Ajuste oclusal y pulido." },
  { l: "Endodoncia", diag: "Tratamiento de conductos", det: "Apertura cameral, conductometría e instrumentación de pieza ___. Irrigación, medicación intraconducto y sellado provisional." },
  { l: "Control", diag: "Control", det: "Paciente acude a control. Se evalúa evolución del tratamiento; sin signos de complicación." },
  { l: "Post-operatorio", diag: "Control post-operatorio", det: "Zona operatoria con cicatrización favorable, sin signos de infección. Se retiran puntos (si aplica)." },
];
const PLANTILLAS_RX = [
  { l: "Post-exodoncia", items: [{ medicamento: "Amoxicilina", presentacion: "500 mg", dosis: "1 cápsula", frecuencia: "c/8 h", duracion: "7 días" }, { medicamento: "Ibuprofeno", presentacion: "400 mg", dosis: "1 tableta", frecuencia: "c/8 h", duracion: "3 días" }], ind: "Tomar con alimentos. Aplicar frío local las primeras 24 h. No enjuagar fuerte el primer día." },
  { l: "Analgesia", items: [{ medicamento: "Ibuprofeno", presentacion: "400 mg", dosis: "1 tableta", frecuencia: "c/8 h", duracion: "3 días" }], ind: "Tomar con alimentos si hay molestia gástrica." },
  { l: "Antibiótico", items: [{ medicamento: "Amoxicilina", presentacion: "500 mg", dosis: "1 cápsula", frecuencia: "c/8 h", duracion: "7 días" }], ind: "Completar el tratamiento aunque mejoren los síntomas." },
  { l: "Alérgico a penicilina", items: [{ medicamento: "Clindamicina", presentacion: "300 mg", dosis: "1 cápsula", frecuencia: "c/8 h", duracion: "7 días" }], ind: "Alternativa para pacientes alérgicos a penicilina." },
];
// Familias para el chequeo de seguridad alergia ↔ receta.
const ALERGIA_FAMILIA = [
  // NEW-40: penicilinas ↔ cefalosporinas en el mismo grupo de cruce.
  ["penicilina", "amoxicilina", "ampicilina", "amoxi", "ampi", "penicil", "cefalosporina", "cefalexina", "cefadroxilo", "cefuroxima", "cefazolina"],
  // NEW-41: metamizol/dipirona (uso frecuente en Perú).
  ["aine", "aines", "ibuprofeno", "naproxeno", "aspirina", "aspir", "ketorolaco", "diclofenaco", "ketoprofeno", "metamizol", "dipirona"],
  ["sulfa", "sulfas", "sulfametoxazol", "cotrimoxazol"],
];
const MIN_ALERGIA_MATCH = 4;

export default function FichaMedica({ pacienteId, onClose, notify = () => { }, can, onAgendar, onCobrar, rol: rolProp, sedeId = null, initialTab = null }) {
  const conectado = !!auth.token;
  const rol = rolProp || auth.sesion?.rol || "";
  // Evitar click-through: al cerrar, el mismo click puede caer en el sidebar del shell
  // y cambiar de módulo (p. ej. salir de Odontograma a Periodontograma/Pacientes).
  const cerrandoRef = useRef(false);
  const [cerrando, setCerrando] = useState(false);
  const pedirCerrar = () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    setCerrando(true);
    window.setTimeout(() => {
      try { onClose?.(); } finally { cerrandoRef.current = false; }
    }, 80);
  };
  // UX-11: odontólogo (rol "medico") → densidad clínica; recepción/admin → admin.
  const densFicha = (rol === "medico" || /odont[oó]logo/i.test(rol)) ? "clinica" : "admin";
  // NEW-46 / coherencia matriz: escritura clínica = can(odontograma, editar).
  // Fallback roles solo offline (sin sesión API).
  const puedeEscribirClinico = puedeEscribirClinicoDe({ conectado, can, rol });
  const tabMod = (mod) => !conectado || !can || can(mod, "ver");
  const puedeRecetar = !conectado || (can ? can("recetas", "ver") : ["admin", "medico"].includes(rol));
  const puedePerio = !conectado || (can ? can("perio", "ver") : ["admin", "medico"].includes(rol));
  const puedeArchivos = !conectado || !can || can("radiografias", "ver");
  const puedeOdontograma = tabMod("odontograma");
  const puedeLab = tabMod("laboratorio");
  const puedeConsent = tabMod("consentimientos");
  const puedeOrto = tabMod("odontograma") || tabMod("tratamientos");
  const [d, setD] = useState(null);   // payload de ficha360
  const [tab, setTab] = useState(initialTab || "resumen");
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab, pacienteId]);
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("dc_fm_tab");
      if (pending) {
        sessionStorage.removeItem("dc_fm_tab");
        setTab(pending);
      }
    } catch { /* */ }
    const onTab = (ev) => {
      const t = ev?.detail?.tab;
      if (t) setTab(t);
    };
    window.addEventListener("dc-fm-tab", onTab);
    return () => window.removeEventListener("dc-fm-tab", onTab);
  }, [pacienteId]);
  const [rx, setRx] = useState([]);
  const [clinica, setClinica] = useState(null);
  const [evo, setEvo] = useState({ diagnostico: "", detalle: "" });
  const [vit, setVit] = useState({});
  const [medicos, setMedicos] = useState([]);          // doctores para atribuir la evolución
  const [evoMedico, setEvoMedico] = useState("");      // doctor de la nueva evolución
  const [evoFile, setEvoFile] = useState(null);       // archivo a anexar a la evolución
  const [draftEdit, setDraftEdit] = useState({});     // edición de borradores de evolución (por id)
  const [secOpen, setSecOpen] = useState({});         // secciones colapsables de la historia
  const [filtroTL, setFiltroTL] = useState("todo");   // filtro por tipo de la línea de tiempo
  const [filtroMed, setFiltroMed] = useState("");     // filtro por doctor (nombre) de la línea de tiempo
  const [busqueda, setBusqueda] = useState("");       // buscador por palabra en la línea de tiempo
  const [rango, setRango] = useState("todo");         // rango de fechas de la línea de tiempo
  const [editEvo, setEditEvo] = useState(null);       // evolución en edición { id, diagnostico, detalle, medicoId }
  const [upTipo, setUpTipo] = useState(TIPOS_ARCHIVO[0]);
  const [upNota, setUpNota] = useState("");
  const [labOrdenes, setLabOrdenes] = useState([]);
  const [consentimientos, setConsentimientos] = useState([]);
  const [fil, setFil] = useState(null); // form de filiación (editable)
  const [fc, setFc] = useState(null);   // ficha clínica estructurada (anamnesis/examen)
  const [tagIn, setTagIn] = useState("");
  const [alergIn, setAlergIn] = useState("");
  const fotoRef = useRef(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [cargandoFicha, setCargandoFicha] = useState(true);
  const [errorFicha, setErrorFicha] = useState(null);
  const cargar = () => {
    // Modo demostración: arma la ficha con los datos de ejemplo del paciente, para
    // que la pantalla se pueda revisar sin backend.
    if (!conectado && pacienteId != null) {
      const pac = PACIENTES_INIT.find((x) => String(x.id) === String(pacienteId));
      const fc = FICHA_CLINICA[pacienteId] || {};
      if (pac) {
        const trat = (fc.tratamiento || []).map((t) => ({ ...t, estado: t.estado === "atendida" ? "completada" : t.estado }));
        const total = trat.reduce((a, t) => a + (Number(t.costo) || 0), 0);
        const pagado = (fc.pagos || []).reduce((a, g) => a + (Number(g.monto) || 0), 0);
        setD({ paciente: { ...pac, alergias: fc.alergias || [], antecedentes: fc.antecedentes || [] }, resumen: { saldo: total - pagado, total, pagado, planTotal: total, invertido: pagado }, tratamientos: trat, pagos: fc.pagos || [], recetas: fc.recetas || [], historia: fc.historia || [], citas: [] });
        setFil((f) => ({ ...f, nombre: pac.nombre || "", dni: pac.dni || "", telefono: pac.telefono || "", email: pac.email || "" }));
      }
      setCargandoFicha(false);
      return;
    }
    if (!conectado || !pacienteId) return;
    setCargandoFicha(true);
    setErrorFicha(null);
    api.pacientes.ficha360(pacienteId).then((r) => {
      setD(r);
      setFil({ nombre: r?.paciente?.nombre || "", dni: r?.paciente?.dni || "", telefono: r?.paciente?.telefono || "", email: r?.paciente?.email || "", fechaNacimiento: r?.paciente?.fechaNacimiento || "", genero: r?.paciente?.genero || "", distrito: r?.paciente?.distrito || "", aseguradora: r?.paciente?.aseguradora || "" });
      setFc(parseJson(r?.paciente?.fichaClinica, {}) || {});
      setCargandoFicha(false);
    }).catch((err) => {
      setErrorFicha(err?.message || "No se pudo cargar la ficha médica.");
      setCargandoFicha(false);
      notify("No se pudo cargar la ficha.");
    });
  };
  useEffect(() => {
    cargar();
    if (conectado && pacienteId) api.radiografias.porPaciente(pacienteId).then((r) => setRx(r || [])).catch(() => { });
    if (conectado) api.clinica.get().then(setClinica).catch(() => { });
    if (conectado) api.catalogo.medicos().then((ms) => {
      setMedicos(ms || []);
      const mine = (ms || []).find((m) => auth.sesion?.nombre && m.nombre && m.nombre.toLowerCase() === String(auth.sesion.nombre).toLowerCase());
      if (mine) setEvoMedico(String(mine.id));
    }).catch(() => { });
    if (conectado && pacienteId) {
      api.laboratorio.listar(pacienteId).then((r) => setLabOrdenes(r || [])).catch(() => setLabOrdenes([]));
      api.consentimientos.listar(pacienteId).then((r) => setConsentimientos(r || [])).catch(() => setConsentimientos([]));
    }
  }, [pacienteId]); // eslint-disable-line

  const p = d?.paciente || {};
  const r = d?.resumen || {};
  // NEW-28: saldo negativo = crédito; no mostrar «por pagar» en negativo.
  const saldoNum = Number(r.saldo) || 0;
  const porPagar = Math.max(0, saldoNum);
  const saldoAFavor = Math.max(0, -saldoNum);
  const debe = saldoNum > 0.5;
  const etiquetaSaldo = saldoAFavor > 0.005 ? "Saldo a favor" : "Por pagar";
  const montoSaldoUi = saldoAFavor > 0.005 ? saldoAFavor : porPagar;
  const edad = edadDe(p.fechaNacimiento);
  // El umbral vive en comun.jsx (EDAD_PEDIATRICA). Aqui estaba escrito a mano en 15
  // y en App.jsx en 14, asi que un chico de 14 era pediatrico aqui y adulto alli.
  const esPed = esPediatrico(p.fechaNacimiento);
  // Tres etapas en vez de un corte seco a los 15 (ver comun.jsx: etapaFicha).
  const etapa = etapaFicha(p.fechaNacimiento);
  const enTransicion = etapa === "transicion";
  const faltanAnios = aniosParaAdulto(p.fechaNacimiento);
  // La historia pediatrica sigue visible en un adulto SI tiene datos: es parte de su
  // expediente y no se borra al cumplir anios; simplemente deja de pedir datos nuevos.
  const F = fc || {};
  // "Tiene datos" es tener algo escrito, no tener la clave puesta: {} y [] son truthy en
  // JavaScript, así que un campo que se tocó y se dejó en blanco hacía aparecer para
  // siempre una "Historia pediátrica" vacía en la ficha de un adulto.
  const conContenido = (v) => {
    if (v == null) return false;
    if (Array.isArray(v)) return v.some(conContenido);
    if (typeof v === "object") return Object.values(v).some(conContenido);
    if (typeof v === "string") return v.trim() !== "";
    if (typeof v === "boolean") return v;
    return true;
  };
  const pedConDatos = [F.perinatales, F.habitosOrales, F.frankl, F.riesgoCaries, F.prevencion].some(conContenido);
  // Celeste si es nino, rosa si es nina, turquesa si no consta el genero.
  const CP = colorPediatrico(p.genero);
  const PED = CP.c, PED_SUAVE = CP.suave, PED_LINEA = CP.linea, PED_VIVO = CP.vivo;
  const verPediatrico = esPed || pedConDatos;
  const anteced = arr(p.antecedentes);
  const vitalesActivos = [...(esPed ? VITALES_NINO : VITALES), ...(esPed ? VITALES_PED : [])];
  const hoy = new Date().toISOString().slice(0, 10);

  // ── Línea de tiempo unificada: se arma de lo que YA existe en el sistema (sin doble captura) ──
  const eventos = () => {
    const ev = [];
    arr(d?.historia).forEach((h) => ev.push({ k: "evolucion", fecha: h.fecha, h }));
    arr(d?.citas).forEach((c) => ev.push({ k: "cita", fecha: c.fecha, hora: c.hora, c }));
    arr(d?.pagos).forEach((g) => ev.push({ k: "pago", fecha: g.fecha, g }));
    arr(d?.recetas).forEach((r2) => ev.push({ k: "receta", fecha: r2.fecha, r: r2 }));
    arr(rx).forEach((x) => ev.push({ k: "archivo", fecha: x.fecha, x }));
    return ev.filter((e) => e.fecha).sort((a, b) => (String(b.fecha).localeCompare(String(a.fecha))) || (String(b.hora || "").localeCompare(String(a.hora || ""))));
  };
  const linea = eventos();
  // Borradores de evolución sin llenar (creados al marcar la cita como atendida).
  const pendientes = arr(d?.historia).filter((h) => h.id && !(h.diagnostico && String(h.diagnostico).trim()) && !(h.detalle && String(h.detalle).trim()));
  // Resumen: última visita atendida y próxima cita programada.
  const citasArr = arr(d?.citas);
  const atendidas = citasArr.filter((c) => c.fecha && c.fecha <= hoy && /atend|complet|lleg/i.test(String(c.estado)));
  const ultimaVisita = (atendidas[0] || citasArr.filter((c) => c.fecha && c.fecha <= hoy)[0] || null);
  const futuras = citasArr.filter((c) => c.fecha && c.fecha >= hoy && /program|confirm|pend/i.test(String(c.estado))).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const proximaCita = futuras[0] || null;

  const guardarFiliacion = () => {
    if (!fil) return;
    const genero = fil.genero && fil.genero !== "—" ? fil.genero : null;
    const payload = {
      nombre: (fil.nombre || "").trim() || null,
      dni: (fil.dni || "").trim() || null,
      telefono: (fil.telefono || "").trim() || null,
      email: (fil.email || "").trim() || null,
      fechaNacimiento: fil.fechaNacimiento || null,
      genero,
      distrito: (fil.distrito || "").trim() || null,
      aseguradora: (fil.aseguradora || "").trim() || null,
    };
    api.pacientes.actualizar(pacienteId, payload).then(() => { notify("Filiación guardada."); cargar(); }).catch(() => notify("No se pudo guardar."));
  };
  const savePac = (patch) => api.pacientes.actualizar(pacienteId, patch).then(cargar).catch(() => notify("No se pudo guardar."));
  const addTag = () => { const t = tagIn.trim(); if (!t) return; const cur = arr(p.tags); if (!cur.includes(t)) savePac({ tags: [...cur, t] }); setTagIn(""); };
  const delTag = (t) => savePac({ tags: arr(p.tags).filter((x) => x !== t) });
  const addAlergia = () => { const a = alergIn.trim(); if (!a) return; const cur = arr(p.alergias); if (!cur.includes(a)) savePac({ alergias: [...cur, a] }); setAlergIn(""); };
  const delAlergia = (a) => savePac({ alergias: arr(p.alergias).filter((x) => x !== a) });
  const toggleAntecedente = (c) => {
    if (!puedeEscribirClinico) return;
    const cur = arr(p.antecedentes); const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]; api.pacientes.actualizar(pacienteId, { antecedentes: next }).then(cargar).catch(() => notify("No se pudo actualizar."));
  };

  // ── Ficha clínica estructurada (anamnesis + examen) ──
  const saveFc = (next) => {
    if (!puedeEscribirClinico) return;
    if (conectado) api.pacientes.actualizar(pacienteId, { fichaClinica: JSON.stringify(next) }).catch(() => notify("No se pudo guardar la ficha."));
  };
  const setFcField = (k, v) => { if (!puedeEscribirClinico) return; setFc((cur) => ({ ...(cur || {}), [k]: v })); };
  const blurFc = (k, v) => { if (!puedeEscribirClinico) return; const next = { ...(fc || {}), [k]: v }; setFc(next); saveFc(next); };
  const setFcNested = (grupo, k, v) => { if (!puedeEscribirClinico) return; setFc((cur) => ({ ...(cur || {}), [grupo]: { ...((cur || {})[grupo] || {}), [k]: v } })); };
  const blurFcNested = (grupo, k, v) => { if (!puedeEscribirClinico) return; const next = { ...(fc || {}), [grupo]: { ...((fc || {})[grupo] || {}), [k]: v } }; setFc(next); saveFc(next); };
  const toggleFcList = (grupo, val) => {
    if (!puedeEscribirClinico) return;
    const cur = arr((fc || {})[grupo]); const list = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]; const next = { ...(fc || {}), [grupo]: list }; setFc(next); saveFc(next);
  };

  const recargarRx = () => { if (conectado && pacienteId) api.radiografias.porPaciente(pacienteId).then((x) => setRx(x || [])).catch(() => { }); };
  const leerArchivo = (file) => new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = rej; rd.readAsDataURL(file); });
  const crearArchivo = (url, tipo, nota) => api.radiografias.crear({ pacienteId, tipo: tipo || "Documento", fecha: hoy, url, nota: nota || null });
  const guardarEvolucion = async () => {
    if (!evo.diagnostico.trim() && !evo.detalle.trim()) { notify("Escribe el diagnóstico o la evolución."); return; }
    if (medicos.length && !evoMedico) { notify("Indica el doctor que atendió."); return; }
    const sv = vitalesActivos.map(([k, l]) => (vit[k] ? `${l} ${vit[k]}` : "")).filter(Boolean).join(" – ");
    try {
      await api.historia.crear({ pacienteId, titulo: "Evolución", ...parseDiagnostico(evo.diagnostico), detalle: evo.detalle, signosVitales: sv || null, medicoId: evoMedico || null });
      if (evoFile) { try { const url = await leerArchivo(evoFile); await crearArchivo(url, "Foto intraoral", "Anexo de evolución" + (evo.diagnostico ? " – " + evo.diagnostico : "")); } catch { notify("La evolución se guardó, pero el archivo no se pudo anexar."); } }
      setEvo({ diagnostico: "", detalle: "" }); setVit({}); setEvoFile(null); notify("Evolución registrada."); cargar(); recargarRx();
    } catch { notify("No se pudo guardar la evolución."); }
  };
  const completarDraft = (id) => {
    const v = draftEdit[id] || {};
    if (!(v.diagnostico || "").trim() && !(v.detalle || "").trim()) { notify("Escribe el diagnóstico o la evolución."); return; }
    api.historia.actualizar(id, { ...parseDiagnostico(v.diagnostico || ""), detalle: v.detalle || null, signosVitales: v.signosVitales || null, medicoId: v.medicoId || null })
      .then(() => { notify("Evolución completada."); setDraftEdit((s) => { const n = { ...s }; delete n[id]; return n; }); cargar(); })
      .catch(() => notify("No se pudo guardar la evolución."));
  };
  const abrirEdit = (h) => setEditEvo({
    id: h.id,
    diagnostico: h.diagnostico || "",
    detalle: h.detalle || "",
    medicoId: h.medicoId || "",
    titulo: h.titulo || "",
    fecha: h.fecha || "",
    // Si ya tenía contenido clínico, editar crea adenda (append-only MVP).
    locked: !!(String(h.diagnostico || "").trim() || String(h.detalle || "").trim()) && h.titulo !== "Adenda",
  });
  const guardarEdit = () => {
    const v = editEvo; if (!v) return;
    if (!(v.diagnostico || "").trim() && !(v.detalle || "").trim()) { notify("Escribe el diagnóstico o la evolución."); return; }
    if (v.locked) {
      const ref = v.fecha ? `del ${v.fecha}` : (v.id ? `#${String(v.id).slice(0, 8)}` : "");
      api.historia.crear({
        pacienteId,
        titulo: "Adenda",
        ...parseDiagnostico(v.diagnostico || ""),
        detalle: `Adenda a evolución ${ref}. ${(v.detalle || "").trim()}`.trim(),
        medicoId: v.medicoId || null,
      })
        .then(() => { notify("Adenda registrada (la nota original no se modificó)."); setEditEvo(null); cargar(); })
        .catch(() => notify("No se pudo registrar la adenda."));
      return;
    }
    api.historia.actualizar(v.id, { ...parseDiagnostico(v.diagnostico || ""), detalle: v.detalle || null, medicoId: v.medicoId || null })
      .then(() => { notify("Evolución actualizada."); setEditEvo(null); cargar(); })
      .catch(() => notify("No se pudo actualizar la evolución."));
  };
  /** Reduce la imagen a 320px de lado y la devuelve como data URL en JPEG. */
  const reducirFoto = (file) => new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onerror = rej;
    rd.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const lado = Math.min(img.width, img.height);          // recorte cuadrado central
        const cv = document.createElement("canvas");
        cv.width = cv.height = 320;
        cv.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 320, 320);
        res(cv.toDataURL("image/jpeg", 0.82));
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
  const cambiarFoto = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { notify("Elige una imagen (JPG o PNG)."); return; }
    setSubiendoFoto(true);
    reducirFoto(f)
      .then((url) => savePac({ fotoUrl: url }))
      .then(() => notify("Foto actualizada."))
      .catch(() => notify("No se pudo procesar la imagen."))
      .finally(() => setSubiendoFoto(false));
  };
  const quitarFoto = () => {
    if (!confirm("¿Quitar la foto de este paciente?")) return;
    savePac({ fotoUrl: "" }).then(() => notify("Foto quitada."));
  };

  const subirArchivo = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) { return; }
    if (!file.type.startsWith("image/")) { notify("Sube una imagen (radiografía o foto)."); e.target.value = ""; return; }
    leerArchivo(file).then((url) => crearArchivo(url, upTipo, upNota).then(() => { notify("Archivo anexado al expediente."); setUpNota(""); recargarRx(); }).catch(() => notify("No se pudo subir el archivo.")));
    e.target.value = "";
  };
  const borrarArchivo = (id) => { api.radiografias.borrar(id).then(() => { notify("Archivo eliminado."); recargarRx(); }).catch(() => notify("No se pudo eliminar.")); };

  // ── Imprimir historia clínica completa ──
  const imprimirHC = () => {
    const seccion = (t, v) => (v ? `<h2>${esc(t)}</h2><div class="box">${esc(v)}</div>` : "");
    const chips = (label, list) => (arr(list).length ? `<h2>${esc(label)}</h2><div>${arr(list).map((x) => `<span class="pill">${esc(x)}</span>`).join("")}</div>` : "");
    const ex = F.examen || {}, pn = F.perinatales || {};
    const evos = arr(d?.historia).map((h) => `<tr><td>${esc(h.fecha || "")}</td><td><b>${esc(h.diagnostico || h.titulo || "Evolución")}</b>${h.detalle ? "<br>" + esc(h.detalle) : ""}${h.signosVitales ? `<br><span class="muted">Signos: ${esc(h.signosVitales)}</span>` : ""}</td><td>${esc(h.medico || "")}</td></tr>`).join("");
    // Una tabla por fase: lo encontrado, lo planificado y lo ejecutado son tres cosas
    // distintas y salían mezcladas en una sola lista de "hallazgos".
    const FASES = [["inicial", "Diagnóstico — lo encontrado"], ["evolucion", "Plan — lo que falta por hacer"], ["alta", "Ejecutado — trabajo realizado"]];
    const filaOdo = (o) => { const caras = parseJson(o.caras, {}); const cs = Object.entries(caras || {}).map(([f, e]) => `${caraOdontoLabel(o.pieza, f)}: ${ESTADOS[e]?.l || e}`).join(", "); return `<tr><td>${esc(o.pieza)}</td><td>${esc(o.estado ? (ESTADOS[o.estado]?.l || o.estado) : cs)}</td><td>${esc(o.nota || "")}</td></tr>`; };
    const piezas = arr(d?.odontograma).filter((o) => o.estado || o.caras);
    const odo = FASES.map(([k, titulo]) => {
      const filas = piezas.filter((o) => (o.fase || "inicial") === k).map(filaOdo).join("");
      return filas ? `<h2>Odontograma – ${esc(titulo)}</h2><table><thead><tr><th>Pieza</th><th>Hallazgo</th><th>Nota</th></tr></thead><tbody>${filas}</tbody></table>` : "";
    }).join("");
    imprimir("Historia clínica", `${cabeceraHTML(clinica, "Historia clínica")}
      <h2>Filiación</h2>
      <div class="row"><div><b>Paciente:</b> ${esc(p.nombre || "")}</div>${p.dni ? `<div><b>DNI:</b> ${esc(p.dni)}</div>` : ""}${p.fechaNacimiento && edad != null ? `<div><b>Edad:</b> ${edad} años</div>` : ""}${p.genero ? `<div><b>Género:</b> ${esc(p.genero)}</div>` : ""}</div>
      <div class="row">${p.fechaNacimiento ? `<div><b>Fecha de nacimiento:</b> ${esc(fmtFecha(p.fechaNacimiento))}</div>` : ""}${p.telefono ? `<div><b>Teléfono:</b> ${esc(p.telefono)}</div>` : ""}${p.distrito ? `<div><b>Distrito:</b> ${esc(p.distrito)}</div>` : ""}${p.aseguradora ? `<div><b>Seguro:</b> ${esc(p.aseguradora)}</div>` : ""}</div>
      ${esPed && (p.apoderadoNombre || p.apoderadoDni) ? `<div class="row"><div><b>Apoderado:</b> ${esc(p.apoderadoNombre || "")}${p.apoderadoParentesco ? " (" + esc(p.apoderadoParentesco) + ")" : ""}</div>${p.apoderadoDni ? `<div><b>DNI del apoderado:</b> ${esc(p.apoderadoDni)}</div>` : ""}${p.apoderadoTelefono ? `<div><b>Teléfono:</b> ${esc(p.apoderadoTelefono)}</div>` : ""}</div>` : ""}
      ${esPed && !p.apoderadoNombre ? `<div class="muted">Apoderado no registrado en la ficha.</div>` : ""}
      ${seccion("Motivo de consulta", F.motivoConsulta)}
      ${seccion("Enfermedad actual", F.enfermedadActual)}
      ${chips("Alergias", p.alergias)}
      ${chips("Antecedentes patológicos", p.antecedentes)}
      ${chips("Hábitos", F.habitos)}
      ${seccion("Antecedentes familiares", F.antecedentesFamiliares)}
      ${seccion("Antecedentes quirúrgicos", F.antecedentesQuirurgicos)}
      ${seccion("Medicación actual", F.medicacionActual)}
      ${seccion("Antecedentes odontológicos", F.antecedentesOdonto)}
      ${seccion("Última visita al dentista", F.ultimaVisitaDental)}
      ${seccion("Frecuencia de cepillado", F.cepillado)}
      ${esPed ? `${seccion("Embarazo / parto", pn.embarazo)}${seccion("Lactancia", pn.lactancia)}${chips("Hábitos orales", F.habitosOrales)}` : ""}
      ${(ex.extraoral || ex.intraoral || ex.atm || ex.oclusion || ex.higiene || ex.tejidos) ? `<h2>Examen clínico</h2>${seccion("Extraoral", ex.extraoral)}${seccion("Intraoral", ex.intraoral)}${seccion("ATM", ex.atm)}${seccion("Oclusión", ex.oclusion)}${seccion("Higiene oral", ex.higiene)}${seccion("Tejidos blandos", ex.tejidos)}` : ""}
      ${odo}
      ${evos ? `<h2>Evoluciones</h2><table><thead><tr><th>Fecha</th><th>Detalle</th><th>Profesional</th></tr></thead><tbody>${evos}</tbody></table>` : ""}
      ${(() => {
        // Una historia clínica sin firmar no acredita quién la escribió. Va el profesional
        // que la imprime y, si el paciente es menor, la del apoderado que la recibe.
        const yo = (auth.sesion && auth.sesion.nombre) || "";
        const firma = (rotulo, sub) => `<div style="width:46%"><div style="border-top:1px solid #333;margin-top:56px;padding-top:6px"><b>${esc(rotulo)}</b>${sub ? `<br><span class="muted">${esc(sub)}</span>` : ""}</div></div>`;
        return `<div class="row" style="justify-content:space-between;margin-top:26px">${firma(yo || "Profesional tratante", "Firma y sello – COP")}${esPed ? firma(p.apoderadoNombre || "Apoderado", "Firma del apoderado") : firma("Paciente", "Firma")}</div>`;
      })()}`, notify);
  };

  const NAV = [
    ["resumen", "Resumen", LayoutGrid],
    ["historia", "Historia clínica", ClipboardList],
    ["odontograma", "Odontograma", Smile],
    ["perio", "Periodontograma", Activity],
    ["receta", "Receta médica", Pill],
    ["ortodoncia", "Ortodoncia", Braces],
    ["cuenta", "Estado de cuenta", CreditCard],
    ["laboratorio", "Laboratorio", FlaskConical],
    ["consentimientos", "Consentimientos", Shield],
    ["archivos", "Archivos", Image],
    ["filiacion", "Filiación", User],
  ].filter(([k]) => (k !== "receta" || puedeRecetar)
                 && (k !== "perio" || puedePerio)
                 && (k !== "archivos" || puedeArchivos)
                 && (k !== "odontograma" || puedeOdontograma)
                 && (k !== "ortodoncia" || puedeOrto)
                 && (k !== "laboratorio" || puedeLab)
                 && (k !== "consentimientos" || puedeConsent)
                 // El periodontograma mide bolsa y recesion, y eso no se hace en
                 // denticion temporal: no se le ofrece a un menor de 13. Si por un
                 // caso concreto hicieran falta, basta con que el paciente pase a la
                 // etapa de transicion o se le registre desde otra via.
                 && (k !== "perio" || etapa !== "pediatrico"));
  const card = { border: `1px solid ${SOFT}`, borderRadius: "var(--dc-r-lg)", background: "var(--dc-white)", padding: 18, boxShadow: SHADOW };
  const inp = { width: "100%", padding: "10px 13px", borderRadius: "var(--dc-r-md)", border: `1px solid ${SOFT}`, fontSize: "var(--dc-ficha-fs)", color: NAVY, outline: "none", boxSizing: "border-box", background: puedeEscribirClinico ? "var(--dc-white)" : "var(--dc-bg)" };
  const lbl = { fontSize: "var(--dc-ficha-fs)", fontWeight: 500, color: TEXT, display: "block", marginBottom: 6 };
  const secTitle = { fontWeight: 500, color: NAVY, fontSize: 14, marginBottom: 14, letterSpacing: "-.005em" };
  const btn = (kind) => ({ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: "var(--dc-r-md)", border: kind === "ghost" ? `1.5px solid ${LINE}` : "none", background: kind === "ghost" ? "var(--dc-white)" : TEAL, color: kind === "ghost" ? TEXT : "var(--dc-white)", fontSize: 13, fontWeight: 500, cursor: "pointer" });
  const chipRO = (label) => <span key={label} style={{ display: "inline-flex", alignItems: "center", padding: "5px 11px", borderRadius: "var(--dc-r-full)", background: "var(--dc-bg)", color: NAVY, fontSize: 12, fontWeight: 500 }}>{label}</span>;
  // NEW-56: anamnesis/examen solo lectura sin escritura clínica (recepción).
  const ta = (grupo, k, ph, rows = 2) => {
    const val = grupo ? ((F[grupo] || {})[k] || "") : (F[k] || "");
    if (!puedeEscribirClinico) {
      return <textarea style={{ ...inp, resize: "vertical", cursor: "default" }} rows={rows} placeholder={ph} value={val} readOnly disabled />;
    }
    return grupo
      ? <textarea style={{ ...inp, resize: "vertical" }} rows={rows} placeholder={ph} value={val} onChange={(e) => setFcNested(grupo, k, e.target.value)} onBlur={(e) => blurFcNested(grupo, k, e.target.value)} />
      : <textarea style={{ ...inp, resize: "vertical" }} rows={rows} placeholder={ph} value={val} onChange={(e) => setFcField(k, e.target.value)} onBlur={(e) => blurFc(k, e.target.value)} />;
  };
  const chip = (on, onClick, label) => puedeEscribirClinico
    ? <button key={label} className={on ? "" : "fm-chip"} onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: "var(--dc-r-full)", border: on ? `1.5px solid ${TEAL}` : `1px solid ${SOFT}`, background: on ? tint(TEAL, 0.078) : "var(--dc-white)", color: on ? TEAL : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{on ? <Check size={13} strokeWidth={1.75} /> : <Plus size={13} strokeWidth={1.75} />} {label}</button>
    : (on ? chipRO(label) : null);
  // Sección colapsable (llamada como función, no como componente, para no perder foco al re-render).
  const sec = (id, Ic, title, estado, contenido, defaultOpen = false) => {
    const open = secOpen[id] ?? defaultOpen;
    return (
      <div style={card}>
        <button className="fm-sec-h" onClick={() => setSecOpen((s) => ({ ...s, [id]: !open }))} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
          <span style={{ width: 30, height: 30, borderRadius: "var(--dc-r-sm)", background: tint(TEAL, 0.071), color: TEAL, display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={16} strokeWidth={1.9} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>{title}</div>
            {estado && <div style={{ fontSize: 12, color: estado.ok ? GREEN : MUTED, marginTop: 1, fontWeight: estado.ok ? 700 : 500 }}>{estado.ok ? "✓ " : ""}{estado.txt}</div>}
          </div>
          <ChevronDown size={18} color={MUTED} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
        </button>
        {open && <div className="fm-reveal" style={{ marginTop: 16 }}>{contenido}</div>}
      </div>
    );
  };

  // ── Render de un evento de la línea de tiempo (amarra lo que ya hay en el sistema) ──
  const EV = {
    cita: { Ic: CalendarDays, c: NAVY, bg: "var(--dc-bg)" },
    evolucion: { Ic: ClipboardList, c: TEAL, bg: "var(--dc-bg)" },
    pago: { Ic: CreditCard, c: GREEN, bg: "var(--dc-ok-soft)" },
    receta: { Ic: Pill, c: "var(--dc-purple)", bg: "var(--dc-bg)" },
    archivo: { Ic: Image, c: "var(--dc-warn-600)", bg: "var(--dc-bg)" },
  };
  const inpMini = { width: "100%", padding: "8px 11px", borderRadius: "var(--dc-r-sm)", border: `1px solid ${SOFT}`, fontSize: 13, color: NAVY, outline: "none", boxSizing: "border-box", background: "var(--dc-white)" };
  const evItem = (e, i) => {
    const cfg = EV[e.k]; const Ic = cfg.Ic;
    // Edición en línea de una evolución guardada.
    if (e.k === "evolucion" && editEvo && editEvo.id === e.h.id) {
      return (
        <div key={e.k + i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-md)", background: cfg.bg, color: cfg.c, display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={17} strokeWidth={1.75} /></div>
          <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 8 }}>
            <Select small value={editEvo.medicoId} onChange={(val) => setEditEvo({ ...editEvo, medicoId: val })}
              placeholder="— Atendido por (doctor) —"
              options={[{ value: "", label: "— Atendido por (doctor) —" }, ...medicos.map((m) => ({ value: m.id, label: m.nombre }))]} />
            <CieDiagInput style={inpMini} placeholder="Diagnóstico (CIE-10)" value={editEvo.diagnostico} onChange={(val) => setEditEvo({ ...editEvo, diagnostico: val })} />
            <textarea style={{ ...inpMini, resize: "vertical" }} rows={2} placeholder="Evolución / procedimiento" value={editEvo.detalle} onChange={(ev) => setEditEvo({ ...editEvo, detalle: ev.target.value })} />
            {editEvo.locked && (
              <div style={{ fontSize: 12, color: "var(--dc-warn-ink)", background: "var(--dc-warn-soft)", border: "1px solid var(--dc-amber-soft)", borderRadius: "var(--dc-r-sm)", padding: "8px 10px" }}>
                Esta evolución ya está cerrada. Al guardar se crea una <b>Adenda</b> (la nota original no se modifica).
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditEvo(null)} style={{ padding: "7px 12px", borderRadius: "var(--dc-r-sm)", border: `1px solid ${SOFT}`, background: "var(--dc-white)", color: TEXT, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
              <button onClick={guardarEdit} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: "var(--dc-r-sm)", border: "none", background: TEAL, color: "var(--dc-white)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}><Check size={14} strokeWidth={1.9} /> {editEvo.locked ? "Registrar Adenda" : "Guardar"}</button>
            </div>
          </div>
        </div>
      );
    }
    let titulo = "", sub = "", right = "";
    let editable = false;
    if (e.k === "cita") { const c = e.c; titulo = (c.especialidad && c.especialidad !== "—" ? c.especialidad : "Cita") + (c.estado && c.estado !== "—" ? " – " + (ESTADO_CITA[c.estado] || c.estado) : ""); sub = [c.motivo, c.medico && c.medico !== "—" ? rotuloMedico(c.medico) : "", c.hora].filter(Boolean).join(" – "); }
    else if (e.k === "evolucion") { const h = e.h; const vacia = !(h.diagnostico && String(h.diagnostico).trim()) && !(h.detalle && String(h.detalle).trim()); titulo = vacia ? "Evolución (pendiente de llenar)" : (h.diagnostico || h.titulo || "Evolución"); sub = [h.detalle, h.signosVitales ? "Signos: " + h.signosVitales : "", h.medico && h.medico !== "—" ? rotuloMedico(h.medico) : ""].filter(Boolean).join(" – "); editable = conectado && !!h.id && !vacia; }
    else if (e.k === "pago") { const g = e.g; titulo = g.concepto || "Pago"; right = money(g.monto); }
    else if (e.k === "receta") { const r2 = e.r; const its = arr(parseJson(r2.items, [])); titulo = "Receta" + (its.length ? ": " + its.map((x) => x.medicamento).filter(Boolean).join(", ") : ""); sub = r2.indicaciones || (r2.medico && r2.medico !== "—" ? rotuloMedico(r2.medico) : ""); }
    else if (e.k === "archivo") { const x = e.x; titulo = x.tipo || "Archivo"; sub = x.nota || ""; }
    return (
      <div key={e.k + i} className="fm-ev" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-md)", background: cfg.bg, color: cfg.c, display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={17} strokeWidth={1.75} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{titulo}</span>
            {right ? <span style={{ fontSize: 13, fontWeight: 500, color: GREEN }}>{right}</span>
              : editable ? <button type="button" className="fm-edit dc-icon-btn" aria-label="Editar evolución" onClick={() => abrirEdit(e.h)} title="Editar evolución" style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 2, display: "inline-flex", flexShrink: 0 }}><Pencil size={14} strokeWidth={1.9} /></button> : null}
          </div>
          {sub && <div style={{ fontSize: 12, color: TEXT, marginTop: 2 }}>{sub}</div>}
          {e.k === "archivo" && e.x.url && <img src={e.x.url} alt="" style={{ marginTop: 6, width: 90, height: 66, objectFit: "cover", borderRadius: "var(--dc-r-sm)", border: `1px solid ${LINE}` }} />}
        </div>
      </div>
    );
  };
  const timelineUI = (evs, vacio) => {
    if (!evs.length) return <div style={{ fontSize: 13, color: MUTED }}>{vacio}</div>;
    const grupos = [];
    evs.forEach((e) => { const g = grupos.find((x) => x.fecha === e.fecha); if (g) g.items.push(e); else grupos.push({ fecha: e.fecha, items: [e] }); });
    return <div style={{ display: "grid", gap: 18 }}>{grupos.map((g) => (
      <div key={g.fecha}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: TEAL, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}><CalendarDays size={13} strokeWidth={2} /> {fmtFecha(g.fecha)}</div>
        <div style={{ display: "grid", gap: 12, borderLeft: `2px solid ${LINE}`, paddingLeft: 14, marginLeft: 6 }}>{g.items.map((e, i) => evItem(e, i))}</div>
      </div>
    ))}</div>;
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(11,18,32,.55)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 24, overflowY: "auto", pointerEvents: "auto" }}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        pedirCerrar();
      }}
    >
      {cerrando && (
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 61, cursor: "default" }} />
      )}
      <div className="fm" data-densidad={densFicha} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 1200, background: BG, borderRadius: "var(--dc-r-lg)", boxShadow: "0 40px 90px -25px rgba(11,18,32,.55)", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 560, opacity: cerrando ? 0.96 : 1 }}>
        <style>{`
          .fm[data-densidad="clinica"] { --dc-ficha-fs: 17px; --dc-ficha-row: 64px; }
          .fm[data-densidad="admin"] { --dc-ficha-fs: 15px; --dc-ficha-row: 56px; }
          .fm[data-densidad="clinica"] .dc-chip-alergia { font-size: 14px; padding: 6px 12px; min-height: 28px; }
          .fm .fm-clinico label { font-size: var(--dc-ficha-fs); }
          .fm .fm-clinico .fm-hist-row { min-height: var(--dc-ficha-row); display: flex; flex-direction: column; justify-content: center; }
          .fm input, .fm textarea, .fm select { transition: border-color .15s, box-shadow .15s, background .15s; }
          .fm input:focus, .fm textarea:focus, .fm select:focus { border-color:${ACCENT} !important; box-shadow: 0 0 0 3px rgba(61,191,196,.18) !important; background:var(--dc-white) !important; }
          .fm input::placeholder, .fm textarea::placeholder { color:var(--dc-line); }
          .fm button { transition: background .15s, box-shadow .15s, transform .06s, border-color .15s; }
          .fm button:active { transform: translateY(1px); }
          .fm .fm-chip:hover { border-color:${ACCENT} !important; color:${TEAL} !important; }
          .fm .fm-nav:hover { background:var(--dc-bg); }
          .fm .fm-sec-h:hover { opacity:.85; }
          .fm .fm-edit { opacity:.55; } .fm .fm-ev:hover .fm-edit { opacity:1; } .fm .fm-edit:hover { color:${TEAL} !important; }
          .fm .fm-content::-webkit-scrollbar { width:10px; }
          .fm .fm-content::-webkit-scrollbar-thumb { background:var(--dc-bg); border-radius:8px; border:3px solid ${BG}; }
          .fm .fm-content::-webkit-scrollbar-track { background:transparent; }
          @keyframes fmIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform:none; } }
          /* Por debajo de 1023px la columna del presupuesto estrujaria el odontograma,
             que es la zona de trabajo: se retira y su contenido sigue en sus pestañas. */
          @media (max-width: 1023px) {
            .fm .fm-cols { grid-template-columns: 268px minmax(0,1fr); }
            .fm .fm-lateral { display: none; }
          }
          @media (max-width: 767px) {
            .fm .fm-cols { grid-template-columns: minmax(0,1fr); }
          }
          .fm .fm-reveal { animation: fmIn .18s ease both; }
        `}</style>
        {/* Barra superior */}
        <div className="fm-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 22px", background: "var(--dc-white)", borderBottom: `1px solid ${SOFT}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-md)", background: `linear-gradient(135deg,${ACCENT},${TEAL})`, display: "grid", placeItems: "center" }}><ClipboardList size={18} color="var(--dc-white)" strokeWidth={2} /></div>
            <div>
              <div className="fm-top__eti">Expediente clínico</div>
              <div className="fm-top__nom">{p.nombre || "Ficha médica"}</div>
              <div className="fm-top__chips">
                {[p.fechaNacimiento && edad != null ? `${edad} años` : null, p.dni ? `DNI ${p.dni}` : null, p.telefono || null].filter(Boolean).map((t) => <span key={t}>{t}</span>)}
                {!errorFicha && arr(p.alergias).length === 0 && <span className="is-ok">Sin alergias registradas</span>}
              </div>
              {errorFicha ? (
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-700)", marginTop: 6 }}>Error al consultar datos clínicos</div>
              ) : arr(p.alergias).length > 0 ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {arr(p.alergias).map((a) => (
                    <ChipAlergia key={a}>⚠ {a}</ChipAlergia>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {onAgendar && <button onClick={() => onAgendar(p)} style={btn("ghost")} title="Agendar cita"><Calendar size={15} strokeWidth={1.75} /> Agendar cita</button>}
            {onCobrar && debe && <button onClick={() => onCobrar(p)} style={btn("ghost")} title="Registrar cobro"><CreditCard size={15} strokeWidth={1.75} /> Registrar cobro</button>}
            {conectado && puedeEscribirClinico && <button onClick={imprimirHC} style={btn("ghost")}><Printer size={15} strokeWidth={1.75} /> Imprimir HC</button>}
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); pedirCerrar(); }} title="Cerrar" aria-label="Cerrar expediente" className="dc-icon-btn" style={{ width: 44, height: 44, borderRadius: "var(--dc-r-md)", background: "var(--dc-bg)", border: "none", cursor: "pointer", color: MUTED, display: "grid", placeItems: "center" }}><X size={20} strokeWidth={1.75} /></button>
          </div>
        </div>
        {errorFicha ? (
          <div style={{ padding: 48, textAlign: "center", display: "grid", gap: 16, justifyItems: "center", background: "var(--dc-white)", flex: 1 }}>
            <AlertTriangle size={42} strokeWidth={1.75} color="var(--dc-warn-600)" />
            <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>No se pudo cargar la información del paciente</div>
            <div style={{ fontSize: 14, color: "var(--dc-ink-500)", maxWidth: 440 }}>
              Ocurrió un error al consultar el expediente clínico en el servidor. Puede reintentar la operación ahora.
            </div>
            <button onClick={cargar} style={{ ...btn("teal"), fontSize: 14, padding: "9px 20px" }}>Reintentar</button>
          </div>
        ) : (
        <div className={`fm-cols${["odontograma", "perio"].includes(tab) ? " is-ancho" : ""}`} style={{ display: "grid", gridTemplateColumns: "268px minmax(0,1fr) 300px", gap: 0, flex: 1, minHeight: 0 }}>
          {/* Rail izquierdo: tarjeta paciente + sub-nav */}
          <div className="fm-rail" style={{ borderRight: `1px solid ${SOFT}`, background: "var(--dc-white)", padding: 16, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
            <div style={{ textAlign: "center" }}>
              {/* Foto del paciente si la tiene; si no, un avatar generico por edad y
                  genero (comun.jsx: AvatarPaciente). Reconocerlo de un vistazo evita
                  confundir a dos personas con el mismo nombre, que en una clinica pasa. */}
              <div className="fm-rail__foto" style={{ position: "relative", width: 96, margin: "0 auto 10px" }}>
                <AvatarPaciente nombre={p.nombre} fotoUrl={p.fotoUrl} genero={p.genero} pediatrico={esPed} size={96} radio={28} />
                {esPed && (
                  <span title="Paciente pediátrico" style={{ position: "absolute", bottom: 2, left: -2, background: "var(--dc-white)", borderRadius: "var(--dc-r-full)", padding: 4, boxShadow: "0 2px 8px rgba(16,24,40,.22)", display: "grid", placeItems: "center", color: PED }}>
                    <EmblemaNino size={22} />
                  </span>)}
                {conectado && (
                  <button onClick={() => fotoRef.current && fotoRef.current.click()} disabled={subiendoFoto}
                    title={p.fotoUrl ? "Cambiar la foto" : "Subir una foto"} aria-label={p.fotoUrl ? "Cambiar la foto" : "Subir una foto"}
                    style={{ position: "absolute", bottom: 2, right: -2, width: 32, height: 32, borderRadius: "var(--dc-r-full)", background: "var(--dc-white)",
                             border: `1px solid ${SOFT}`, boxShadow: "0 2px 6px rgba(16,24,40,.18)", cursor: subiendoFoto ? "wait" : "pointer",
                             color: TEAL, display: "grid", placeItems: "center" }}>
                    <Camera size={16} strokeWidth={1.9} />
                  </button>)}
                <input ref={fotoRef} type="file" accept="image/*" onChange={cambiarFoto} style={{ display: "none" }} />
              </div>
              {conectado && p.fotoUrl && (
                <button onClick={quitarFoto} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 12, marginBottom: 6 }}>
                  Quitar foto
                </button>)}
              <div className="fm-rail__nom">{p.nombre || "Paciente"}</div>
              <div style={{ fontSize: 13, color: MUTED }}>{p.fechaNacimiento && edad != null ? `${edad} años` : ""}{p.dni ? (p.fechaNacimiento && edad != null ? ` – DNI ${p.dni}` : `DNI ${p.dni}`) : ""}</div>
              {esPed && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, padding: "3px 10px", borderRadius: "var(--dc-r-full)", background: PED_SUAVE, border: `1px solid ${PED_LINEA}`, color: PED, fontSize: 12, fontWeight: 500, letterSpacing: ".03em", textTransform: "uppercase" }}>
                <EmblemaNino size={14} /> {enTransicion ? "Pasa pronto a adulto" : "Ficha pediátrica"}
              </div>}
              {enTransicion && (
                <div style={{ marginTop: 7, fontSize: 12, color: PED, lineHeight: 1.45, textAlign: "left", background: PED_SUAVE, border: `1px solid ${PED_LINEA}`, borderRadius: "var(--dc-r-md)", padding: "8px 10px" }}>
                  En {faltanAnios} año{faltanAnios === 1 ? "" : "s"} su ficha pasa a ser de adulto. La historia pediátrica <b>se conserva</b>.
                </div>
              )}
              {(p.telefono || p.email) && (
                <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 10 }}>
                  {p.telefono && (
                    <a href={`https://wa.me/51${String(p.telefono).replace(/D/g, "").slice(-9)}`} target="_blank" rel="noopener noreferrer"
                      title="Escribir por WhatsApp" aria-label="Escribir por WhatsApp"
                      style={{ width: 32, height: 32, borderRadius: "var(--dc-r-full)", border: `1px solid ${SOFT}`, display: "grid", placeItems: "center", color: "var(--dc-ok-700)", textDecoration: "none" }}>
                      <MessageSquare size={15} strokeWidth={1.9} />
                    </a>)}
                  {p.email && (
                    <a href={`mailto:${p.email}`} title="Escribir un correo" aria-label="Escribir un correo"
                      style={{ width: 32, height: 32, borderRadius: "var(--dc-r-full)", border: `1px solid ${SOFT}`, display: "grid", placeItems: "center", color: TEAL, textDecoration: "none" }}>
                      <Mail size={15} strokeWidth={1.9} />
                    </a>)}
                  {p.telefono && (
                    <a href={`tel:${p.telefono}`} title="Llamar" aria-label="Llamar"
                      style={{ width: 32, height: 32, borderRadius: "var(--dc-r-full)", border: `1px solid ${SOFT}`, display: "grid", placeItems: "center", color: NAVY, textDecoration: "none" }}>
                      <Phone size={15} strokeWidth={1.9} />
                    </a>)}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8, flexWrap: "wrap", fontSize: 12, color: TEXT }}>
                {p.telefono && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} strokeWidth={1.75} color={TEAL} /> {p.telefono}</span>}
              </div>
              {/* Apoderado del menor: quien firma y a quien se llama. Estaba solo como
                  texto suelto dentro del JSON de la historia, donde nadie lo veia. */}
              {esPed && (p.apoderadoNombre
                ? <div style={{ marginTop: 9, textAlign: "left", background: PED_SUAVE, border: `1px solid ${PED_LINEA}`, borderRadius: "var(--dc-r-md)", padding: "8px 10px" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: PED, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 3 }}>Apoderado</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, lineHeight: 1.3 }}>{p.apoderadoNombre}</div>
                    <div style={{ fontSize: 12, color: "var(--dc-warn-700)", marginTop: 2 }}>
                      {p.apoderadoParentesco || "Responsable"}{p.apoderadoDni ? ` – DNI ${p.apoderadoDni}` : ""}
                    </div>
                    {p.apoderadoTelefono && <a href={`tel:${p.apoderadoTelefono}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 12, fontWeight: 500, color: PED, textDecoration: "none" }}><Phone size={11} strokeWidth={2} /> {p.apoderadoTelefono}</a>}
                  </div>
                : <div style={{ marginTop: 9, textAlign: "left", background: "var(--dc-warn-soft)", borderRadius: "var(--dc-r-md)", padding: "8px 10px", fontSize: 12, color: "var(--dc-warn-ink)", lineHeight: 1.45 }}>
                    Menor <b>sin apoderado registrado</b>. Nadie puede firmar sus consentimientos.
                  </div>)}
              <div className={`fm-saldo${debe ? " is-debe" : ""}`} style={{ marginTop: 10, display: "inline-flex", alignItems: "baseline", gap: 6, background: debe ? "var(--dc-warn-soft)" : "var(--dc-ok-soft)", color: debe ? WARN : GREEN, padding: "5px 12px", borderRadius: "var(--dc-r-full)", fontWeight: 500, fontSize: 13, cursor: debe ? "pointer" : "default" }} onClick={debe ? () => setTab("cuenta") : undefined} title={debe ? "Ver estado de cuenta" : undefined}>
                {money(montoSaldoUi)} <span style={{ fontSize: 12, fontWeight: 500 }}>{saldoAFavor > 0.005 ? "saldo a favor" : "por pagar"}</span>
              </div>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {NAV.map(([k, l, Ic]) => {
                const on = tab === k;
                return <button key={k} className={`fm-navbtn${on ? " is-on" : " fm-nav"}`} onClick={() => setTab(k)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: on ? 700 : 600, background: on ? NAVY : "transparent", color: on ? "var(--dc-white)" : TEXT, boxShadow: on ? "0 6px 16px -6px rgba(27,46,94,.5)" : "none" }}><Ic size={17} strokeWidth={1.75} color={on ? ACCENT : MUTED} /> {l}</button>;
              })}
            </div>
          </div>

          {/* Contenido */}
          <div className="fm-content" style={{ padding: 22, display: "grid", gap: 14, alignContent: "start", overflowY: "auto" }}>
            {/* Etiquetas / Notas / Alergias: solo en el resumen (antes se repetían en todas
                las secciones y empujaban el contenido casi 300 px hacia abajo). */}
            {tab === "resumen" && (() => {
              const mini = { ...card, padding: 13 };
              const head = (Ic, c, txt) => <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}><span style={{ width: 22, height: 22, borderRadius: "var(--dc-r-sm)", background: tint(c, 0.086), color: c, display: "grid", placeItems: "center" }}><Ic size={13} strokeWidth={2} /></span><span style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{txt}</span></div>;
              const addInp = { width: "100%", padding: "7px 10px", borderRadius: "var(--dc-r-sm)", border: `1px solid ${SOFT}`, fontSize: 12, outline: "none", background: "var(--dc-white)", boxSizing: "border-box" };
              const pill = (c) => ({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: c, background: tint(c, 0.078), padding: "3px 7px 3px 10px", borderRadius: "var(--dc-r-full)" });
              const hayAlergia = arr(p.alergias).length > 0;
              return (
                <div className="fm-minis" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div className="fm-mini is-tags" style={mini}>
                    {head(Tag, "var(--dc-info-700)", "Etiquetas")}
                    {arr(p.tags).length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{arr(p.tags).map((t) => <span key={t} style={pill("var(--dc-info-700)")}>{t}<X size={12} strokeWidth={2} style={{ cursor: "pointer" }} onClick={() => delTag(t)} /></span>)}</div>}
                    <input value={tagIn} onChange={(e) => setTagIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTag(); }} placeholder="Agregar etiqueta…" style={addInp} />
                  </div>
                  <div className="fm-mini is-notas" style={{ ...mini, background: "var(--dc-warn-soft)", border: "1px solid var(--dc-danger-soft)" }}>
                    {head(FileText, "var(--dc-warn-600)", "Notas")}
                    <textarea defaultValue={p.comentario || ""} onBlur={(e) => { if ((e.target.value || "") !== (p.comentario || "")) savePac({ comentario: e.target.value }); }} rows={2} placeholder="Notas del paciente…" style={{ ...addInp, resize: "vertical", fontFamily: "inherit", color: TEXT }} />
                  </div>
                  <div className={`fm-mini is-alerg${hayAlergia ? " is-hay" : ""}`} style={{ ...mini, background: "var(--dc-bg)", border: `1px solid ${hayAlergia ? "var(--dc-danger-mid)" : "var(--dc-bg)"}` }}>
                    {head(AlertTriangle, "var(--dc-danger)", "Alergias")}
                    {hayAlergia && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{arr(p.alergias).map((a) => <span key={a} style={pill("var(--dc-danger)")}>{a}{puedeEscribirClinico && <X size={12} strokeWidth={2} style={{ cursor: "pointer" }} onClick={() => delAlergia(a)} />}</span>)}</div>}
                    {puedeEscribirClinico
                      ? <input value={alergIn} onChange={(e) => setAlergIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addAlergia(); }} placeholder="Agregar alergia…" style={addInp} />
                      : (!hayAlergia && <div style={{ fontSize: 12, color: MUTED }}>Sin alergias registradas – solo lectura</div>)}
                  </div>
                </div>
              );
            })()}

            {/* Sin fecha de nacimiento la ficha da por adulto al paciente sin decirlo: la
                anamnesis, el odontograma y las dosis dependen de la edad. Se avisa en
                todas las pestañas, no solo en el resumen. */}
            {!p.fechaNacimiento && tab !== "resumen" && (
              <div className="fm-aviso-edad">
                <AlertTriangle size={15} strokeWidth={2} />
                <span><b>Sin fecha de nacimiento:</b> la ficha lo trata como adulto.</span>
                {tab !== "filiacion" && <button type="button" onClick={() => setTab("filiacion")}>Registrarla</button>}
              </div>
            )}
            {!p.fechaNacimiento && tab === "resumen" && (
              <div style={{ ...card, background: "var(--dc-warn-soft)", border: "1px solid var(--dc-amber-soft)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <AlertTriangle size={18} strokeWidth={1.75} color="var(--dc-warn-600)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: "var(--dc-warn-600)", lineHeight: 1.55 }}>
                  <b style={{ color: "var(--dc-warn-600)" }}>Falta la fecha de nacimiento de {p.nombre || "este paciente"}.</b><br />
                  Mientras no esté, la ficha lo trata como <b>adulto</b>: esa es la anamnesis que se abre,
                  el odontograma sale con dentición permanente y las dosis se calculan como tales.
                  {tab !== "filiacion" && <> <button onClick={() => setTab("filiacion")} style={{ background: "none", border: "none", padding: 0, color: TEAL, fontWeight: 500, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Registrarla en Filiación</button>.</>}
                </div>
              </div>
            )}

            {/* Secciones */}
            {tab === "resumen" && (
              <>
                {/* La alergia ya se ve en la cabecera y en la tarjeta de alergias. */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {[
                    ["Última visita", ultimaVisita ? fmtFecha(ultimaVisita.fecha) : "—", ultimaVisita && ultimaVisita.especialidad !== "—" ? ultimaVisita.especialidad : "", CalendarDays, NAVY],
                    ["Próxima cita", proximaCita ? fmtFecha(proximaCita.fecha) : "Sin programar", proximaCita ? (proximaCita.hora || "") : "", Clock, TEAL],
                    ["Tratamientos", String(arr(d?.tratamientos).length || r.tratamientos || 0), "en el plan", ClipboardList, TEAL],
                    [etiquetaSaldo, money(montoSaldoUi), debe ? "pendiente" : (saldoAFavor > 0.005 ? "crédito" : "al día"), CreditCard, debe ? WARN : GREEN],
                  ].map(([l, v, s, Ic, c]) => { const clickable = l === "Tratamientos" || ((l === "Por pagar" || l === "Saldo a favor") && debe); const titlePorPagar = (l === "Por pagar" || l === "Saldo a favor") && clickable ? "Ver estado de cuenta" : (clickable ? "Ver plan / cuenta" : undefined); return (
                    <div key={l} onClick={clickable ? () => setTab("cuenta") : undefined} style={{ ...card, cursor: clickable ? "pointer" : "default" }} title={titlePorPagar}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: MUTED, textTransform: "uppercase", letterSpacing: ".04em" }}>{React.createElement(Ic, { size: 13, strokeWidth: 1.75 })} {l}</div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: c, marginTop: 4 }}>{v}{clickable && Number(v) > 0 ? <span style={{ fontSize: 12, color: TEAL, fontWeight: 500 }}> →</span> : null}</div>
                      {s ? <div style={{ fontSize: 12, color: MUTED }}>{s}</div> : null}
                    </div>
                  ); })}
                </div>
                {(F.motivoConsulta || anteced.length || arr(F.habitos).length) ? (
                  <div style={card}>
                    <div style={secTitle}>Ficha clínica</div>
                    {F.motivoConsulta && <div style={{ fontSize: 13, color: TEXT, marginBottom: 10 }}><b style={{ color: NAVY }}>Motivo:</b> {F.motivoConsulta}</div>}
                    {anteced.length > 0 && <><div style={{ fontSize: 12, fontWeight: 500, color: TEXT, margin: "6px 0" }}>Antecedentes</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{anteced.map(chipRO)}</div></>}
                    {arr(F.habitos).length > 0 && <><div style={{ fontSize: 12, fontWeight: 500, color: TEXT, margin: "6px 0" }}>Hábitos</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{arr(F.habitos).map(chipRO)}</div></>}
                  </div>
                ) : (
                  <div style={{ ...card, textAlign: "center", color: MUTED, fontSize: 13 }}>Completa la <b style={{ color: TEAL, cursor: "pointer" }} onClick={() => setTab("historia")}>Historia clínica</b> para ver el resumen del paciente.</div>
                )}
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ ...secTitle, marginBottom: 0 }}>Últimos movimientos</div>
                    <button onClick={() => setTab("historia")} style={{ background: "none", border: "none", color: TEAL, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Ver historia completa →</button>
                  </div>
                  {timelineUI(linea.slice(0, 6), "Aún no hay actividad registrada.")}
                </div>
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <FlaskConical size={16} strokeWidth={1.75} color={TEAL} />
                    <div style={{ ...secTitle, marginBottom: 0 }}>Laboratorio</div>
                  </div>
                  {labOrdenes.length === 0
                    ? <div style={{ fontSize: 13, color: MUTED }}>Sin trabajos de laboratorio registrados para este paciente.</div>
                    : <div style={{ display: "grid", gap: 8 }}>
                        {labOrdenes.map((o) => (
                          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "8px 0", borderTop: "1px solid var(--dc-line)" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 500, color: NAVY }}>{o.tipoTrabajo || o.trabajo || "Trabajo"}</div>
                              <div style={{ fontSize: 12, color: MUTED }}>{o.laboratorio || "—"}</div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontWeight: 500, color: TEAL, textTransform: "capitalize" }}>{o.estado || "—"}</div>
                              <div style={{ fontSize: 12, color: MUTED }}>Retorno: {String(o.fechaEstimada || o.entrega || o.fechaRetorno || "—").slice(0, 10)}</div>
                            </div>
                          </div>
                        ))}
                      </div>}
                </div>
              </>
            )}

            {tab === "consentimientos" && (
              <div style={card}>
                <div style={{ ...secTitle, display: "flex", alignItems: "center", gap: 8 }}><Shield size={16} strokeWidth={1.75} /> Consentimientos informados</div>
                {consentimientos.length === 0
                  ? <div style={{ fontSize: 13, color: MUTED }}>No hay consentimientos registrados para este paciente.</div>
                  : <div style={{ display: "grid", gap: 10 }}>
                      {consentimientos.map((c) => (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--dc-line)", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{c.tipo || c.titulo || "Consentimiento"}</div>
                            <div style={{ fontSize: 12, color: MUTED }}>{(c.fechaFirma || c.creadoEn || "").slice(0, 10) || "—"} – {c.firmado ? "Firmado" : "Pendiente"}</div>
                          </div>
                          {!c.firmado && conectado && (
                            <button onClick={() => api.consentimientos.firmar(c.id, `firma://${c.id}`, { firmanteNombre: p.nombre, firmanteDni: p.dni }).then(() => { notify("Consentimiento firmado."); api.consentimientos.listar(pacienteId).then((r) => setConsentimientos(r || [])); }).catch(() => notify("No se pudo firmar."))}
                              style={{ ...btn("ghost"), fontSize: 13 }}>Firmar</button>
                          )}
                        </div>
                      ))}
                    </div>}
              </div>
            )}

            {tab === "filiacion" && fil && (
              <div style={card}>
                <div style={secTitle}>Datos personales</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={lbl}>Nombre completo</label><input style={inp} value={fil.nombre} onChange={(e) => setFil({ ...fil, nombre: e.target.value })} /></div>
                  <div><label style={lbl}>DNI</label><input style={inp} value={fil.dni} onChange={(e) => setFil({ ...fil, dni: e.target.value.replace(/\D/g, "").slice(0, 8) })} /></div>
                  <div><label style={lbl}>Teléfono</label><input style={inp} value={fil.telefono} onChange={(e) => setFil({ ...fil, telefono: e.target.value })} /></div>
                  <div><label style={lbl}>Correo</label><input style={inp} value={fil.email} onChange={(e) => setFil({ ...fil, email: e.target.value })} /></div>
                  <div><label style={lbl}>Fecha de nacimiento</label><input type="date" max={hoy} style={inp} value={fil.fechaNacimiento || ""} onChange={(e) => setFil({ ...fil, fechaNacimiento: e.target.value })} /></div>
                  <div><label style={lbl}>Género</label>
                    <Select value={fil.genero} onChange={(v) => setFil({ ...fil, genero: v })} placeholder="—"
                      options={[{ value: "", label: "—" }, ...["Femenino", "Masculino", "Prefiere no decir"].map((g) => ({ value: g, label: g }))]} />
                  </div>
                  <div><label style={lbl}>Distrito</label><input style={inp} value={fil.distrito} onChange={(e) => setFil({ ...fil, distrito: e.target.value })} /></div>
                  <div><label style={lbl}>Aseguradora / EPS</label><input style={inp} value={fil.aseguradora} onChange={(e) => setFil({ ...fil, aseguradora: e.target.value })} placeholder="Ninguno" /></div>
                </div>
                <div style={{ marginTop: 16, textAlign: "right" }}><button onClick={guardarFiliacion} style={btn()}><Check size={15} strokeWidth={1.75} /> Guardar filiación</button></div>
              </div>
            )}

            {tab === "historia" && (
              <div className="fm-clinico">
                {puedeEscribirClinico && pendientes.length > 0 && (
                  <div style={{ ...card, border: "1px solid var(--dc-amber-soft)", background: "var(--dc-warn-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--dc-warn-600)", fontSize: 14 }}><Clock size={17} strokeWidth={1.75} /> Evoluciones pendientes por completar ({pendientes.length})</div>
                    <div style={{ fontSize: 12, color: "var(--dc-warn-600)", margin: "4px 0 12px" }}>Se crearon solas al marcar la cita como atendida. Complétalas para que cuente la producción del doctor.</div>
                    <div style={{ display: "grid", gap: 12 }}>
                      {pendientes.map((h) => { const v = draftEdit[h.id] || {}; return (
                        <div key={h.id} style={{ border: `1px solid ${SOFT}`, borderRadius: "var(--dc-r-md)", padding: 12, background: "var(--dc-white)" }}>
                          <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>{fmtFecha(h.fecha)}</div>
                          <div style={{ display: "grid", gap: 8 }}>
                            <Select value={v.medicoId !== undefined ? v.medicoId : (h.medicoId || "")}
                              onChange={(val) => setDraftEdit((s) => ({ ...s, [h.id]: { ...v, medicoId: val } }))}
                              placeholder="— Atendido por (doctor) —"
                              options={[{ value: "", label: "— Atendido por (doctor) —" }, ...medicos.map((m) => ({ value: m.id, label: m.nombre }))]} />
                            <CieDiagInput style={inp} placeholder="Diagnóstico (CIE-10 o texto libre)" value={v.diagnostico || ""} onChange={(val) => setDraftEdit((s) => ({ ...s, [h.id]: { ...v, diagnostico: val } }))} />
                            <textarea style={{ ...inp, resize: "vertical" }} rows={2} placeholder="Evolución / procedimiento realizado" value={v.detalle || ""} onChange={(e) => setDraftEdit((s) => ({ ...s, [h.id]: { ...v, detalle: e.target.value } }))} />
                            <div style={{ textAlign: "right" }}><button onClick={() => completarDraft(h.id)} style={btn()}><Check size={15} strokeWidth={1.75} /> Completar</button></div>
                          </div>
                        </div>
                      ); })}
                    </div>
                  </div>
                )}
                <div style={card}>
                  <div style={secTitle}>Motivo de consulta y enfermedad actual {!puedeEscribirClinico && <span style={{ fontWeight: 500, color: MUTED, fontSize: 12 }}>– solo lectura</span>}</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div className="fm-hist-row"><label style={lbl}>Motivo de consulta</label>{ta(null, "motivoConsulta", "¿Por qué acude el paciente?")}</div>
                    <div className="fm-hist-row"><label style={lbl}>Enfermedad / dolencia actual</label>{ta(null, "enfermedadActual", "Tiempo de enfermedad, síntomas, evolución…")}</div>
                  </div>
                </div>

                {(() => {
                  const ex = F.examen || {}, pn = F.perinatales || {};
                  const antOk = anteced.length || arr(F.habitos).length || F.antecedentesFamiliares || F.antecedentesQuirurgicos || F.medicacionActual || F.antecedentesOdonto || F.ultimaVisitaDental || F.cepillado;
                  const exOk = ex.extraoral || ex.intraoral || ex.atm || ex.oclusion || ex.higiene || ex.tejidos;
                  const pedOk = pn.embarazo || pn.lactancia || arr(F.habitosOrales).length;
                  return (
                    <>
                      {sec("antecedentes", ClipboardList, "Antecedentes y hábitos",
                        { ok: !!antOk, txt: antOk ? "Con datos registrados" : "Toca para registrar" },
                        <>
                          <div style={{ fontWeight: 500, color: TEXT, fontSize: 13, marginBottom: 8 }}>Antecedentes patológicos</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                            {/* Embarazo y osteoporosis no se le ofrecen a un menor. Si alguno
                                estuviera ya marcado se sigue mostrando: es un dato clinico y
                                no se oculta, solo se deja de ofrecer. */}
                            {CONDICIONES.filter((c) => !(etapa === "pediatrico" && CONDICIONES_ADULTO.includes(c)) || anteced.includes(c))
                              .map((c) => chip(anteced.includes(c), () => toggleAntecedente(c), c))}
                          </div>
                          <div style={{ fontWeight: 500, color: TEXT, fontSize: 13, margin: "4px 0 8px" }}>Hábitos</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {/* Tabaco y alcohol solo desde los 13: a un nino de 7 no se le
                                pregunta, y a un chico de 14 ya si. Los orales de un menor
                                estan en su seccion, no aqui, para no duplicarlos. */}
                            {[...(etapa === "pediatrico" ? [] : HABITOS_ADULTO), ...HABITOS_COMUNES]
                              .map((h) => chip(arr(F.habitos).includes(h), () => toggleFcList("habitos", h), h))}
                          </div>
                          {enTransicion && (
                            <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
                              Se preguntan por primera vez porque {p.nombre ? p.nombre.split(" ")[0] : "el paciente"} entra en la edad en la que suelen empezar.
                            </div>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                            <div className="fm-hist-row"><label style={lbl}>Antecedentes familiares</label>{ta(null, "antecedentesFamiliares", "Diabetes, cáncer, cardiopatías…")}</div>
                            <div className="fm-hist-row"><label style={lbl}>Antecedentes quirúrgicos</label>{ta(null, "antecedentesQuirurgicos", "Cirugías, hospitalizaciones…")}</div>
                            <div className="fm-hist-row" style={{ gridColumn: "1 / -1" }}><label style={lbl}>Medicación actual</label>{ta(null, "medicacionActual", "Fármacos que toma actualmente…")}</div>
                            {/* Las tres preguntas dentales que solo existían en el cuestionario de la
                                demostración: son las que un odontólogo espera encontrar en la ficha, y
                                las que la clínica vio antes de comprar. */}
                            <div className="fm-hist-row" style={{ gridColumn: "1 / -1" }}><label style={lbl}>Antecedentes odontológicos</label>{ta(null, "antecedentesOdonto", "Sangrado de encías, bruxismo, sensibilidad, extracciones previas, ortodoncia previa…")}</div>
                            <div className="fm-hist-row"><label style={lbl}>Última visita al dentista</label>{ta(null, "ultimaVisitaDental", "Hace cuánto y por qué motivo")}</div>
                            <div className="fm-hist-row">
                              <label style={lbl}>Frecuencia de cepillado</label>
                              {puedeEscribirClinico
                                ? <Select value={F.cepillado || ""} onChange={(v) => blurFc("cepillado", v)} placeholder="— Sin registrar —"
                                      options={["1 vez al día", "2 veces al día", "3 o más veces al día", "No se cepilla a diario"].map((x) => ({ value: x, label: x }))} />
                                : <div style={{ ...inp, color: F.cepillado ? NAVY : MUTED }}>{F.cepillado || "— Sin registrar —"}</div>}
                            </div>
                          </div>
                        </>)}

                      {verPediatrico && sec("pediatrico", Baby,
                        esPed ? "Historia pediátrica" : "Historia pediátrica (etapa anterior)",
                        { ok: !!pedOk,
                          txt: !esPed ? "De cuando era menor – se conserva"
                               : pedOk ? "Con datos registrados" : "Toca para registrar" },
                        <>
                          {!esPed && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--dc-bg)", borderRadius: "var(--dc-r-md)", padding: "10px 13px", marginBottom: 14 }}>
                              <span style={{ color: MUTED, flexShrink: 0, display: "grid", placeItems: "center" }}><EmblemaNino size={26} dormido /></span>
                              <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>
                                {p.nombre ? p.nombre.split(" ")[0] : "Este paciente"} ya pasó a ficha de adulto. Esto es lo que se registró cuando era menor:
                                <b> se conserva</b> porque forma parte de su historia, y sigue explicando cosas de su boca de hoy.
                              </div>
                            </div>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div className="fm-hist-row"><label style={lbl}>Embarazo / parto</label>{ta("perinatales", "embarazo", "Controlado, a término…")}</div>
                            <div className="fm-hist-row"><label style={lbl}>Lactancia</label>{ta("perinatales", "lactancia", "Materna / fórmula, duración…")}</div>
                          </div>
                          <div style={{ fontWeight: 500, color: TEXT, fontSize: 13, margin: "18px 0 8px" }}>Conducta en el sillón <span style={{ fontWeight: 500, color: MUTED }}>– escala de Frankl</span></div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {FRANKL.filter((f) => puedeEscribirClinico || F.frankl === f.v).map((f) => { const on = F.frankl === f.v; return (
                              <button key={f.v} onClick={() => blurFc("frankl", on ? "" : f.v)} title={f.d} disabled={!puedeEscribirClinico}
                                style={{ textAlign: "left", padding: "8px 12px", borderRadius: "var(--dc-r-md)", cursor: puedeEscribirClinico ? "pointer" : "default",
                                  border: on ? `1.5px solid ${f.c}` : `1.5px solid ${LINE}`, background: on ? tint(f.c, 0.078) : "var(--dc-white)" }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: on ? f.c : TEXT }}>{f.l}</div>
                                <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{f.d}</div>
                              </button>); })}
                            {!puedeEscribirClinico && !F.frankl && <span style={{ fontSize: 13, color: MUTED }}>Sin registrar</span>}
                          </div>
                          <div style={{ fontWeight: 500, color: TEXT, fontSize: 13, margin: "18px 0 8px" }}>Riesgo de caries</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {RIESGO_CARIES.filter((r) => puedeEscribirClinico || F.riesgoCaries === r.v).map((r) => { const on = F.riesgoCaries === r.v; return (
                              <button key={r.v} onClick={() => blurFc("riesgoCaries", on ? "" : r.v)} disabled={!puedeEscribirClinico}
                                style={{ padding: "7px 16px", borderRadius: "var(--dc-r-full)", cursor: puedeEscribirClinico ? "pointer" : "default", fontSize: 13, fontWeight: 500,
                                  border: on ? `1.5px solid ${r.c}` : `1.5px solid ${LINE}`, background: on ? tint(r.c, 0.078) : "var(--dc-white)", color: on ? r.c : TEXT }}>
                                {r.l}
                              </button>); })}
                            {!puedeEscribirClinico && !F.riesgoCaries && <span style={{ fontSize: 13, color: MUTED }}>Sin registrar</span>}
                          </div>
                          <div style={{ fontWeight: 500, color: TEXT, fontSize: 13, margin: "18px 0 8px" }}>Prevención aplicada</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{PREVENCION.map((x) => chip(arr(F.prevencion).includes(x), () => toggleFcList("prevencion", x), x))}</div>
                          <div className="fm-hist-row" style={{ marginTop: 14 }}><label style={lbl}>¿Quién le cepilla o supervisa?</label>{ta(null, "cepilladoSupervisado", "Ej. la madre por la noche, él solo por la mañana…", 1)}</div>
                          <div style={{ fontWeight: 500, color: TEXT, fontSize: 13, margin: "18px 0 8px" }}>Hábitos orales</div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{HABITOS_ORALES.map((h) => chip(arr(F.habitosOrales).includes(h), () => toggleFcList("habitosOrales", h), h))}</div>
                        </>)}

                      {sec("examen", Stethoscope, "Examen clínico estomatológico",
                        { ok: !!exOk, txt: exOk ? "Con hallazgos registrados" : "Toca para registrar" },
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div className="fm-hist-row"><label style={lbl}>Extraoral</label>{ta("examen", "extraoral", "Simetría facial, ganglios, piel…")}</div>
                          <div className="fm-hist-row"><label style={lbl}>Intraoral</label>{ta("examen", "intraoral", "Encías, mucosa, lengua, paladar…")}</div>
                          <div className="fm-hist-row"><label style={lbl}>ATM</label>{ta("examen", "atm", "Apertura, chasquidos, dolor…", 1)}</div>
                          <div className="fm-hist-row"><label style={lbl}>Oclusión</label>{ta("examen", "oclusion", "Clase I/II/III, mordida…", 1)}</div>
                          <div className="fm-hist-row"><label style={lbl}>Higiene oral</label>{ta("examen", "higiene", "Placa, cálculo, sangrado…", 1)}</div>
                          <div className="fm-hist-row"><label style={lbl}>Tejidos blandos</label>{ta("examen", "tejidos", "Lesiones, frenillos…", 1)}</div>
                        </div>)}
                    </>
                  );
                })()}

                {puedeEscribirClinico && <div style={card}>
                  <div style={secTitle}>Nueva nota de evolución</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>Plantillas:</span>
                    {PLANTILLAS_EVO.map((pl) => <button key={pl.l} onClick={() => setEvo({ diagnostico: pl.diag, detalle: pl.det })} style={{ padding: "5px 11px", borderRadius: "var(--dc-r-full)", border: `1.5px solid ${LINE}`, background: "var(--dc-white)", color: TEAL, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{pl.l}</button>)}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <label style={lbl}>Atendido por <span style={{ color: RED }}>*</span></label>
                      <Select value={evoMedico} onChange={setEvoMedico} placeholder="— Selecciona el doctor —"
                        options={medicos.map((m) => ({ value: m.id, label: m.nombre }))} />
                    </div>
                    <CieDiagInput style={inp} placeholder="Diagnóstico (CIE-10 o texto libre)" value={evo.diagnostico} onChange={(v) => setEvo({ ...evo, diagnostico: v })} />
                    <textarea style={{ ...inp, resize: "vertical" }} rows={3} placeholder="Evolución / procedimiento realizado" value={evo.detalle} onChange={(e) => setEvo({ ...evo, detalle: e.target.value })} />
                    <div>
                      <label style={lbl}>Control pre-operatorio <span style={{ color: MUTED, fontWeight: 400 }}>(opcional — antes de anestesia)</span></label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {vitalesActivos.map(([k, l, ph]) => (
                          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, border: `1.5px solid ${LINE}`, borderRadius: "var(--dc-r-sm)", padding: "4px 8px", background: "var(--dc-white)" }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>{l}</span>
                            <input value={vit[k] || ""} onChange={(e) => setVit({ ...vit, [k]: e.target.value })} placeholder={ph} style={{ width: 70, border: "none", outline: "none", fontSize: 13, color: NAVY, background: "transparent" }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: "var(--dc-r-sm)", border: `1.5px dashed ${LINE}`, background: "var(--dc-white)", color: evoFile ? TEAL : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                        <Paperclip size={14} strokeWidth={1.75} /> {evoFile ? evoFile.name : "Anexar radiografía / foto"}
                        <input type="file" accept="image/*" onChange={(e) => setEvoFile(e.target.files && e.target.files[0])} style={{ display: "none" }} />
                        {evoFile && <X size={13} strokeWidth={2} onClick={(e) => { e.preventDefault(); setEvoFile(null); }} />}
                      </label>
                      <button onClick={guardarEvolucion} style={btn()}><Plus size={15} strokeWidth={1.75} /> Registrar evolución</button>
                    </div>
                  </div>
                </div>}
                {(() => {
                  const cuenta = (k) => linea.filter((e) => e.k === k).length;
                  const FILTROS = [["todo", "Todo", linea.length], ["evolucion", "Evoluciones", cuenta("evolucion")], ["cita", "Citas", cuenta("cita")], ["receta", "Recetas", cuenta("receta")], ["pago", "Pagos", cuenta("pago")], ["archivo", "Archivos", cuenta("archivo")]];
                  const docDe = (e) => e.k === "evolucion" ? e.h.medico : e.k === "cita" ? e.c.medico : e.k === "receta" ? e.r.medico : null;
                  const textoDe = (e) => (e.k === "evolucion" ? [e.h.diagnostico, e.h.detalle, e.h.titulo, e.h.medico]
                    : e.k === "cita" ? [e.c.especialidad, e.c.motivo, e.c.medico]
                    : e.k === "receta" ? [e.r.indicaciones, e.r.medico, ...arr(parseJson(e.r.items, [])).map((x) => x.medicamento)]
                    : e.k === "pago" ? [e.g.concepto]
                    : e.k === "archivo" ? [e.x.tipo, e.x.nota] : []).filter(Boolean).join(" ").toLowerCase();
                  const docs = [...new Set(linea.map(docDe).filter((n) => n && n !== "—"))].sort();
                  const MESES = { "3m": 3, "6m": 6, "12m": 12 };
                  let cutoff = null;
                  if (MESES[rango]) { const dd = new Date(); dd.setMonth(dd.getMonth() - MESES[rango]); cutoff = dd.toISOString().slice(0, 10); }
                  const q = busqueda.trim().toLowerCase();
                  let filtrada = filtroTL === "todo" ? linea : linea.filter((e) => e.k === filtroTL);
                  if (filtroMed) filtrada = filtrada.filter((e) => docDe(e) === filtroMed);
                  if (cutoff) filtrada = filtrada.filter((e) => String(e.fecha) >= cutoff);
                  if (q) filtrada = filtrada.filter((e) => textoDe(e).includes(q));
                  const selStyle = (activo) => ({ padding: "6px 10px", borderRadius: "var(--dc-r-full)", border: activo ? `1.5px solid ${TEAL}` : `1px solid ${SOFT}`, background: activo ? tint(TEAL, 0.063) : "var(--dc-white)", color: activo ? TEAL : "var(--dc-ink-400)", fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none" });
                  return (
                    <div style={card}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: NAVY, fontSize: 14 }}><Activity size={17} strokeWidth={1.75} color={TEAL} /> Línea de tiempo del paciente</div>
                      <div style={{ fontSize: 12, color: MUTED, margin: "4px 0 12px" }}>Se arma sola con las citas, evoluciones, pagos, recetas y archivos ya registrados — sin volver a capturarlos.</div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                          <Search size={15} strokeWidth={1.9} color={MUTED} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en la historia (diagnóstico, medicamento…)" style={{ ...inp, padding: "9px 12px 9px 34px" }} />
                        </div>
                        <Select small width={170} ariaLabel="Rango de fechas" value={rango} onChange={setRango}
                          options={[{ value: "todo", label: "Todo el tiempo" }, { value: "3m", label: "Últimos 3 meses" },
                                    { value: "6m", label: "Últimos 6 meses" }, { value: "12m", label: "Último año" }]} />
                        {docs.length > 1 && (
                          <Select small width={190} ariaLabel="Filtrar por doctor" value={filtroMed} onChange={setFiltroMed} placeholder="Todos los doctores"
                            options={[{ value: "", label: "Todos los doctores" }, ...docs.map((n) => ({ value: n, label: rotuloMedico(n) || n }))]} />
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
                        {FILTROS.map(([k, l, n]) => { const on = filtroTL === k; return (
                          <button key={k} className={on ? "" : "fm-chip"} onClick={() => setFiltroTL(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: "var(--dc-r-full)", border: on ? `1.5px solid ${TEAL}` : `1px solid ${SOFT}`, background: on ? tint(TEAL, 0.078) : "var(--dc-white)", color: on ? TEAL : "var(--dc-ink-400)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                            {l} <span style={{ fontSize: 12, fontWeight: 500, color: on ? TEAL : MUTED, background: on ? "var(--dc-white)" : "var(--dc-bg-alt)", borderRadius: "var(--dc-r-full)", padding: "0 6px" }}>{n}</span>
                          </button>
                        ); })}
                      </div>
                      {timelineUI(filtrada, q || filtroMed || cutoff ? "Sin registros para estos filtros." : filtroTL === "evolucion" ? "Aún no hay evoluciones registradas." : "Sin actividad registrada.")}
                    </div>
                  );
                })()}
              </div>
            )}

            {tab === "odontograma" && <div style={card}><Odontograma pacienteId={pacienteId} notify={notify} onGenerado={cargar} fechaNacimiento={p.fechaNacimiento} hallazgosSeed={arr(d?.odontograma)} soloLectura={!puedeEscribirClinico} pacienteNombre={p.nombre || p.nombres} pacienteDni={p.dni || ""} sedeId={sedeId} /></div>}

            {tab === "perio" && puedePerio && <div style={card}><Periodontograma pacienteId={pacienteId} notify={notify} /></div>}

            {tab === "receta" && puedeRecetar && <Receta pacienteId={pacienteId} clinica={clinica} paciente={p} recetas={d?.recetas} onChange={cargar} notify={notify} />}

            {tab === "ortodoncia" && <Ortodoncia pacienteId={pacienteId} notify={notify} />}

            {tab === "laboratorio" && (
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FlaskConical size={16} strokeWidth={1.75} color={TEAL} />
                  <div style={{ ...secTitle, marginBottom: 0 }}>Laboratorio</div>
                </div>
                {labOrdenes.length === 0
                  ? <div style={{ fontSize: 13, color: MUTED }}>Sin trabajos de laboratorio registrados para este paciente.</div>
                  : <div style={{ display: "grid", gap: 8 }}>
                      {labOrdenes.map((o) => (
                        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "8px 0", borderTop: "1px solid var(--dc-line)" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500, color: NAVY }}>{o.tipoTrabajo || o.trabajo || "Trabajo"}</div>
                            <div style={{ fontSize: 12, color: MUTED }}>{o.laboratorio || "—"}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontWeight: 500, color: TEAL, textTransform: "capitalize" }}>{o.estado || "—"}</div>
                            <div style={{ fontSize: 12, color: MUTED }}>Retorno: {String(o.fechaEstimada || o.entrega || o.fechaRetorno || "—").slice(0, 10)}</div>
                          </div>
                        </div>
                      ))}
                    </div>}
              </div>
            )}

            {tab === "cuenta" && (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -4 }}>
                  {onCobrar && debe && (
                    <button onClick={() => onCobrar(p)} style={btn()} title="Registrar cobro"><CreditCard size={15} strokeWidth={1.75} /> Cobrar</button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: saldoAFavor > 0.005 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    ["Total plan", money(r.planTotal), NAVY],
                    ["Pagado", money(r.invertido), GREEN],
                    ["Por pagar", money(porPagar), debe ? WARN : GREEN],
                    ...(saldoAFavor > 0.005 ? [["Saldo a favor", money(saldoAFavor), GREEN]] : []),
                  ].map(([l, v, c]) => (
                    <div key={l} className="fm-cta" style={{ "--c": l === "Total plan" ? "#0E9199" : l === "Pagado" ? "#16A36A" : (debe ? "#D97706" : "#16A36A") }}><span>{l}</span><b>{v}</b></div>
                  ))}
                </div>
                <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", fontWeight: 500, color: NAVY, borderBottom: `1px solid ${LINE}` }}>Plan de tratamiento</div>
                  {arr(d?.tratamientos).length === 0 && <div style={{ padding: 16, fontSize: 13, color: MUTED }}>Sin plan de tratamiento.</div>}
                  {arr(d?.tratamientos).map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderTop: i ? `1px solid ${LINE}` : "none", fontSize: 13 }}>
                      <span style={{ color: NAVY, fontWeight: 600, flex: 1 }}>{t.nombre}{t.pieza ? ` – pieza ${t.pieza}` : ""}</span>
                      <span className={`dc-pill${t.estado === "completada" ? " is-ok" : " is-aviso"}`} style={{ margin: "0 16px" }}><i /> {t.estado === "completada" ? "Completada" : "Pendiente"}</span>
                      <span style={{ fontWeight: 700, minWidth: 90, textAlign: "right", fontFamily: "var(--dc-font-title)" }}>{money(t.costo)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", fontWeight: 500, color: NAVY, borderBottom: `1px solid ${LINE}` }}>Pagos ({arr(d?.pagos).length})</div>
                  {arr(d?.pagos).length === 0 && <div style={{ padding: 16, fontSize: 13, color: MUTED }}>Sin pagos registrados.</div>}
                  {arr(d?.pagos).slice(0, 15).map((pg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderTop: i ? `1px solid ${LINE}` : "none", fontSize: 13 }}>
                      <span style={{ color: NAVY, fontWeight: 500 }}>{pg.fecha ? new Date(pg.fecha + "T00:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                      <span style={{ color: "var(--dc-ink-400)", flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 10px" }}>{pg.concepto || "—"}</span>
                      <span style={{ color: GREEN, fontWeight: 500 }}>{money(pg.monto)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "archivos" && (
              <div style={card}>
                <div style={{ fontWeight: 500, color: NAVY, fontSize: 14, marginBottom: 12 }}>Radiografías, fotos y documentos ({rx.length})</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                  <Select width={180} value={upTipo} onChange={setUpTipo} options={TIPOS_ARCHIVO.map((t) => ({ value: t, label: t }))} />
                  <input value={upNota} onChange={(e) => setUpNota(e.target.value)} placeholder="Nota (opcional)" style={{ ...inp, flex: 1, minWidth: 160 }} />
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 15px", borderRadius: "var(--dc-r-md)", background: TEAL, color: "var(--dc-white)", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <Plus size={15} strokeWidth={1.75} /> Subir archivo
                    <input type="file" accept="image/*" onChange={subirArchivo} style={{ display: "none" }} />
                  </label>
                </div>
                {rx.length === 0 && <div style={{ fontSize: 13, color: MUTED }}>Sin archivos aún. Elige el tipo, agrega una nota y sube una radiografía o foto.</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                  {rx.map((x) => (
                    <div key={x.id} style={{ border: `1px solid ${LINE}`, borderRadius: "var(--dc-r-md)", overflow: "hidden", background: "var(--dc-ink-alt)", position: "relative" }}>
                      <button onClick={() => borrarArchivo(x.id)} title="Eliminar del expediente" aria-label="Eliminar del expediente" style={{ position: "absolute", top: 6, right: 6, zIndex: 2, width: 24, height: 24, borderRadius: "var(--dc-r-full)", border: "none", background: "rgba(0,0,0,.55)", color: "var(--dc-white)", cursor: "pointer", display: "grid", placeItems: "center" }}><Trash2 size={13} strokeWidth={2} /></button>
                      <a href={x.url || undefined} target="_blank" rel="noreferrer" style={{ display: "block", height: 104 }}>{x.url ? <img src={x.url} alt={x.tipo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center" }}><Image size={26} color="rgba(255,255,255,.5)" /></div>}</a>
                      <div style={{ padding: "7px 10px", background: "var(--dc-white)" }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.tipo || "Estudio"}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>{x.fecha || ""}{x.nota ? " – " + x.nota : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: el dinero y la ultima evolucion, siempre a la vista.
              Estaban en sus pestañas, asi que para saber cuanto debe el paciente habia
              que salir del odontograma y volver. Se oculta por debajo de 1180px, donde
              ya no cabe sin estrujar la zona de trabajo. */}
          <aside className={`fm-lateral${["odontograma", "perio"].includes(tab) ? " is-oculta" : ""}`} style={{ borderLeft: `1px solid ${SOFT}`, background: "var(--dc-white)", padding: 16, overflowY: "auto", display: "grid", gap: 14, alignContent: "start" }}>
            <div>
              <div style={{ fontWeight: 500, color: NAVY, fontSize: 14, marginBottom: 10 }}>Presupuesto</div>
              {arr(d?.tratamientos).length === 0
                ? <div style={{ fontSize: 13, color: MUTED }}>Sin plan de tratamiento todavía.</div>
                : <div style={{ display: "grid", gap: 7 }}>
                    {arr(d?.tratamientos).slice(0, 6).map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-full)", flexShrink: 0, border: `2px solid ${t.estado === "completada" ? GREEN : ACCENT}`, background: t.estado === "completada" ? GREEN : "transparent" }} />
                        <span style={{ flex: 1, minWidth: 0, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.nombre}{t.pieza ? ` (${t.pieza})` : ""}
                        </span>
                        <span style={{ color: TEXT, fontWeight: 500, flexShrink: 0 }}>{money(t.costo)}</span>
                      </div>
                    ))}
                    {arr(d?.tratamientos).length > 6 && (
                      <div style={{ fontSize: 12, color: MUTED }}>y {arr(d.tratamientos).length - 6} más…</div>
                    )}
                  </div>}
            </div>

            <div style={{ background: "var(--dc-bg)", borderRadius: "var(--dc-r-lg)", padding: "13px 15px", display: "grid", gap: 7 }}>
              {[
                ["Total", money(r.planTotal), NAVY],
                ["Pagado", money(r.invertido), GREEN],
                ["Por pagar", money(porPagar), debe ? WARN : GREEN],
                ...(saldoAFavor > 0.005 ? [["Saldo a favor", money(saldoAFavor), GREEN]] : []),
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13 }}>
                  <span style={{ color: TEXT, fontWeight: 500 }}>{l}:</span>
                  <b style={{ color: c, fontSize: 14, fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }}>{v}</b>
                </div>
              ))}
            </div>

            <div style={{ borderTop: `1px solid ${SOFT}`, paddingTop: 13 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                <span style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>Nota de evolución</span>
                <button onClick={() => setTab("historia")} title="Ver todas las evoluciones" aria-label="Ver todas las evoluciones"
                  style={{ background: "none", border: `1px solid ${SOFT}`, borderRadius: "var(--dc-r-sm)", width: 26, height: 26, cursor: "pointer", color: TEAL, display: "grid", placeItems: "center" }}>
                  <Plus size={15} strokeWidth={2} />
                </button>
              </div>
              {(() => {
                const ult = arr(d?.historia)[0];
                if (!ult) return <div style={{ fontSize: 13, color: MUTED }}>Todavía no hay evoluciones.</div>;
                return (
                  <div>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>
                      {fmtFecha(ult.fecha)}{ult.medico ? ` – ${rotuloMedico(ult.medico) || ult.medico}` : ""}
                    </div>
                    {ult.diagnostico && <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 4, lineHeight: 1.4 }}>{ult.diagnostico}</div>}
                    {ult.detalle && <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.55 }}>{ult.detalle}</div>}
                  </div>
                );
              })()}
            </div>
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}
