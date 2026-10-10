/* Ficha clínica › Odontograma: «Evolución visual».
   La ficha es historia clínica: aquí no se marca ni se presupuesta. Se muestran las tres
   tomas del odontograma (Inicial → Evolución → Alta) como imágenes de solo lectura y la
   lista de hallazgos de la última toma. Para trabajar se abre el módulo Odontograma.

   Cada imagen se genera con el mismo dibujo del odontograma: un iframe oculto carga el
   odontograma anatómico, recibe los datos de la fase (__dentoBridge.hydrate) y se copia
   su SVG con los estilos ya calculados, así la foto es idéntica a lo que vio el doctor. */
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Smile, X } from "lucide-react";
import api, { auth } from "../api/client";
import { DatosDemoCtx } from "../comun";
import { estadosAppAHtml } from "./OdontogramaAnatomico";
import { filasADatos, listaHallazgos } from "../util/odontogramaHallazgos";

export const FASES_FOTO = [
  ["inicial", "Inicial", "#B42318", "Lo que se encontró al abrir la historia"],
  ["evolucion", "Evolución", "#B45309", "El estado durante el tratamiento"],
  ["alta", "Alta", "#15803D", "Cómo quedó al terminar"],
];
// Una fase sin ninguna marca (solo piezas seleccionadas) cuenta como vacía.
const vacio = (d) => !d || !Object.keys(d).length || hallazgosDe(d).total === 0;

/* ── Iframe oculto compartido y cola de capturas ── */
let frame = null, listo = null, cola = Promise.resolve(), cierre = null;
const cache = new Map();
function cargarFrame() {
  if (frame && listo) return listo;
  frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true"); frame.tabIndex = -1; frame.title = "odontograma";
  frame.style.cssText = "position:fixed;left:-20000px;top:0;width:1300px;height:1000px;border:0;opacity:0;pointer-events:none";
  frame.src = `${import.meta.env.BASE_URL}odontograma-anatomico/index.html?bridge=1&theme=light&expediente=0&ro=1`;
  // Sus avisos de estado no deben llegar al odontograma visible de la app.
  window.addEventListener("message", (e) => { if (frame && e.source === frame.contentWindow && e.data?.type === "dento-odontograma-state") e.stopImmediatePropagation(); }, true);
  listo = new Promise((ok, mal) => {
    const t0 = Date.now();
    const mirar = () => {
      try { const w = frame.contentWindow; if (w && w.__dentoBridge && w.document.getElementById("odo")) return ok(w); } catch { /* aún cargando */ }
      if (Date.now() - t0 > 9000) return mal(new Error("sin odontograma"));
      setTimeout(mirar, 120);
    };
    frame.addEventListener("load", mirar);
    document.body.appendChild(frame);
  });
  return listo;
}
function liberarLuego() { clearTimeout(cierre); cierre = setTimeout(() => { frame?.remove(); frame = null; listo = null; }, 4000); }
const PROPS = [["fill", ""], ["fill-opacity", "1"], ["fill-rule", "nonzero"], ["stroke", "none"], ["stroke-width", "1px"], ["stroke-opacity", "1"], ["stroke-dasharray", "none"], ["stroke-linecap", "butt"], ["stroke-linejoin", "miter"], ["opacity", "1"], ["display", "inline"], ["visibility", "visible"], ["font-family", ""], ["font-size", ""], ["font-weight", "400"], ["letter-spacing", "normal"], ["text-anchor", "start"], ["dominant-baseline", "auto"], ["paint-order", "normal"], ["stop-color", ""], ["stop-opacity", "1"]];
function svgComoImagen(w) {
  const doc = w.document;
  if (!doc.getElementById("dc-foto-st")) { const st = doc.createElement("style"); st.id = "dc-foto-st"; st.textContent = "#odo *{animation:none!important;transition:none!important}#odo .pieza{opacity:1!important;transform:none!important}#odo .halo,#odo .anillo{display:none!important}"; doc.head.appendChild(st); }
  const src = doc.getElementById("odo"), copia = src.cloneNode(true);
  const a = [src, ...src.querySelectorAll("*")], b = [copia, ...copia.querySelectorAll("*")], txt = /^(text|tspan)$/i;
  for (let i = 0; i < a.length; i++) {
    const o = a[i], d = b[i]; if (!d || /^(title|style|script)$/i.test(d.tagName)) continue;
    const cs = w.getComputedStyle(o); let st = "";
    for (const [k, def] of PROPS) { if (/^(font|letter|text-anchor|dominant)/.test(k) && !txt.test(o.tagName)) continue; const v = cs.getPropertyValue(k); if (v && v !== def) st += `${k}:${v.replace(/url\(\s*"?[^#")]*#([^")]+)"?\s*\)/g, "url(#$1)")};`; }
    d.setAttribute("style", st); d.removeAttribute("class"); d.removeAttribute("tabindex"); d.removeAttribute("role");
  }
  copia.querySelectorAll("title,style,script").forEach((n) => n.remove());
  const vb = src.viewBox && src.viewBox.baseVal;
  copia.setAttribute("width", String(vb?.width || 1440)); copia.setAttribute("height", String(vb?.height || 880)); copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(copia));
}
function fotoDe(datos, fase) {
  const k = fase + "|" + JSON.stringify(datos);
  if (cache.has(k)) return Promise.resolve(cache.get(k));
  const p = cola.then(async () => {
    clearTimeout(cierre);
    const w = await cargarFrame();
    w.__dentoBridge.hydrate({ fase, datos });
    await new Promise((r) => setTimeout(r, 220));
    const url = svgComoImagen(w); cache.set(k, url); liberarLuego(); return url;
  });
  cola = p.catch(() => null);
  return p;
}
function useFoto(datos, fase) {
  const k = fase + "|" + JSON.stringify(datos || {});
  const [url, setUrl] = useState(() => (vacio(datos) ? null : cache.get(k)));
  useEffect(() => {
    if (vacio(datos)) { setUrl(null); return undefined; }
    let vivo = true;
    if (cache.has(k)) setUrl(cache.get(k));
    else { setUrl(undefined); fotoDe(datos, fase).then((u) => vivo && setUrl(u)).catch(() => vivo && setUrl("error")); }
    return () => { vivo = false; };
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return url;
}

/* Nombres de los hallazgos: el catálogo vive en el odontograma (CAT); se lee una vez. */
let NOMBRES = null;
function useNombres() {
  const [n, setN] = useState(NOMBRES || {});
  useEffect(() => {
    if (NOMBRES) return;
    cola = cola.then(async () => {
      try { const w = await cargarFrame(); const cat = w.eval("typeof CAT !== 'undefined' ? CAT : []") || []; NOMBRES = Object.fromEntries(cat.map((x) => [x.id, x.nom])); } catch { NOMBRES = {}; }
      liberarLuego(); setN(NOMBRES);
    }).catch(() => null);
  }, []);
  return n;
}

/* Hallazgos de una toma (caras, raíces y pieza completa), ordenados por cuadrante y pieza. */
export function hallazgosDe(datos) { return listaHallazgos(datos); }
const piezaFdi = (n) => { const s = String(n); return s.length === 2 ? `${s[0]}.${s[1]}` : s; };

/* Datos de cada fase: con sesión, del servidor; en la demo, de la ficha del paciente. */
function useFases(pacienteId, ficha) {
  const conectado = !!auth.token;
  const [remoto, setRemoto] = useState(null);
  useEffect(() => {
    if (!conectado || !pacienteId) return undefined;
    let vivo = true;
    Promise.all(FASES_FOTO.map(([f]) => api.odontograma.porPaciente(pacienteId, f).then((rows) => {
      // Mismo formato que hidrata el módulo Odontograma: caras, raíces y todas las marcas
      // de pieza con su color (antes solo contaba estadoPieza y la toma salía vacía).
      return filasADatos(rows || []);
    }).catch(() => ({})))).then((xs) => vivo && setRemoto(Object.fromEntries(FASES_FOTO.map(([f], i) => [f, xs[i]]))));
    return () => { vivo = false; };
  }, [conectado, pacienteId]);
  return useMemo(() => {
    if (conectado) return remoto ? FASES_FOTO.map(([f, l, c, d]) => ({ fase: f, label: l, color: c, desc: d, datos: remoto[f] || {} })) : null;
    const html = ficha?.odoHtml || {};
    return FASES_FOTO.map(([f, l, c, d]) => {
      let datos = html[f];
      if (vacio(datos) && f === "inicial") datos = estadosAppAHtml(ficha?.odontograma || {});
      return { fase: f, label: l, color: c, desc: d, datos: datos || {} };
    });
  }, [conectado, remoto, ficha]);
}

function Foto({ datos, fase, label, color, onZoom }) {
  const url = useFoto(datos, fase);
  const sin = vacio(datos);
  return (
    <div className={`dc-ofo__img${url && url !== "error" ? " is-lista" : ""}`} role={url && url !== "error" ? "button" : undefined} tabIndex={url && url !== "error" ? 0 : undefined}
         title={url && url !== "error" ? "Ampliar" : undefined} onClick={url && url !== "error" ? () => onZoom(url, label) : undefined}
         onKeyDown={(e) => { if (e.key === "Enter" && url && url !== "error") onZoom(url, label); }}>
      {url && url !== "error" ? <img src={url} alt={`Odontograma, fase ${label}`} /> : <span>{sin ? "Sin registro en esta fase" : url === "error" ? "No se pudo generar la imagen" : "Generando imagen…"}</span>}
      <em><i style={{ background: color }} />{label}</em>
    </div>
  );
}

export default function OdontogramaFotos({ pacienteId, ficha = null, onAbrir }) {
  const db = useContext(DatosDemoCtx);
  const f = ficha || db?.fichas?.[pacienteId] || null;
  const fases = useFases(pacienteId, f);
  const [zoom, setZoom] = useState(null);
  const nombres = useNombres();
  useEffect(() => { if (!zoom) return undefined; const k = (e) => e.key === "Escape" && setZoom(null); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [zoom]);
  const conDatos = (fases || []).filter((x) => !vacio(x.datos));
  const ultima = conDatos[conDatos.length - 1];
  const h = ultima ? hallazgosDe(ultima.datos) : null;
  return (
    <div className="dc-ofo">
      <section className="dc-ofo__cab">
        <span className="dc-ofo__ico"><Smile size={18} strokeWidth={2} /></span>
        <div><b>Odontograma · historia clínica</b><small>Las tomas de cada fase en solo lectura. Para marcar hallazgos o armar el presupuesto, ábrelo en su módulo.</small></div>
        {onAbrir && <button type="button" onClick={onAbrir}>Abrir en Odontograma <ArrowRight size={14} strokeWidth={2.2} /></button>}
      </section>
      <section className="dc-ofo__card">
        <header><h3>Evolución visual</h3><small>Inicial → Evolución → Alta · toca una toma para ampliarla</small></header>
        {fases == null ? <p className="dc-ofo__vacio">Cargando…</p> : (
          <div className="dc-ofo__fases">
            {fases.map((x) => { const hx = hallazgosDe(x.datos); return (
              <div key={x.fase} className={`dc-ofo__fase${vacio(x.datos) ? " is-vacia" : ""}${ultima && ultima.fase === x.fase ? " is-ultima" : ""}`}>
                <div className="dc-ofo__fcab"><i style={{ background: x.color }} /><b>{x.label}</b><small>{vacio(x.datos) ? "sin registro" : `${hx.total} ${hx.total === 1 ? "hallazgo" : "hallazgos"}`}</small>{ultima && ultima.fase === x.fase && <span className="dc-ofo__ult">Última</span>}</div>
                <Foto datos={x.datos} fase={x.fase} label={x.label} color={x.color} onZoom={(url, l) => setZoom({ url, titulo: `Odontograma · fase ${l}` })} />
                <small className="dc-ofo__desc">{x.desc}</small>
              </div>
            ); })}
          </div>
        )}
      </section>
      {h && (
        <section className="dc-ofo__card">
          <header><h3><ClipboardList size={15} strokeWidth={2} /> Hallazgos de la última toma</h3><small>Fase {ultima.label.toLowerCase()} · {h.total} {h.total === 1 ? "hallazgo" : "hallazgos"} en {h.piezas} {h.piezas === 1 ? "pieza" : "piezas"}</small>
            <span className="dc-ofo__pills"><span className="is-mal">{h.rojo} patológicos o por hacer</span><span className="is-ok">{h.azul} en buen estado o ejecutados</span></span></header>
          <div className="dc-ofo__tabw">
            <table className="dc-ofo__tab">
              <thead><tr><th>Pieza</th><th>Zona</th><th>Hallazgo</th><th>Estado</th></tr></thead>
              <tbody>{h.lista.map((m, i) => (
                <tr key={i}><td><b>{piezaFdi(m.pieza)}</b></td><td>{m.zona}</td><td>{nombres[m.codigo] || m.nombre}</td><td><span className={`dc-ofo__est ${m.hecho ? "is-ok" : "is-mal"}`}>{m.hecho ? "Buen estado o ejecutado" : "Patológico o por hacer"}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
      {zoom && (
        <div className="dc-ofo__zoom" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <header><b>{zoom.titulo}</b><button type="button" aria-label="Cerrar" onClick={() => setZoom(null)}><X size={18} /></button></header>
            <img src={zoom.url} alt={zoom.titulo} />
          </div>
        </div>
      )}
    </div>
  );
}
