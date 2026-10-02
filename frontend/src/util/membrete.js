/* Membrete único de los documentos que se imprimen o descargan en PDF.
 *
 * Dos fuentes, siempre del sistema:
 *   – empresa: nombre comercial, razón social, RUC, web y logo. Son los mismos en
 *     todas las sedes y se editan en Configuración → Datos de la clínica.
 *   – sede: dirección, teléfonos, horario, correo y serie de documentos. Son los de la
 *     sede desde donde se emite el documento (la sede activa de la sesión).
 *
 * Con sesión se leen de GET /clinica/impresion?sedeId= (el mismo contrato que ya usa
 * el plan de inversión). Sin sesión (demostración) se arman con los datos de ejemplo
 * y lo que se haya editado en Configuración, guardado en este navegador.
 *
 * Los documentos se abren en una ventana aparte, que no carga las hojas de estilo del
 * sistema: por eso las variables CSS (var(--dc-…)) se resuelven a su valor antes de
 * escribir el HTML. Sin eso, cabeceras de tabla y bordes salían en blanco. */
import { useSyncExternalStore } from "react";

const BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/";
export const LOGO_DEMO = `${BASE}marca/logo-clinica.png`;
export const CLAVE_DEMO = "dc_demo_clinica_impresion";

const EMPRESA_DEMO = {
  nombre: "Odonto Sonrisa",
  razonSocial: "ODONTOSONRISA MEDICAL",
  ruc: "20612478636",
  web: "odontosonrisa.pe",
  bajada: "Centro odontológico",
  logo: LOGO_DEMO,
};
const SEDES_DEMO = {
  1: { id: 1, codigo: "SAN-ISIDRO", nombre: "Sede San Isidro", direccion: "Av. Conquistadores 145 — San Isidro", telefonos: "(01) 233 4998 – 997 091 083", horario: "Lun a vie 9:00–19:00 – sáb 9:00–14:00", correo: "sanisidro@odontosonrisa.pe", serieDocumento: "SI" },
  2: { id: 2, codigo: "SURCO", nombre: "Sede Surco", direccion: "Av. Caminos del Inca 890 — Santiago de Surco", telefonos: "(01) 271 5530 – 986 402 117", horario: "Lun a sáb 9:00–19:00", correo: "surco@odontosonrisa.pe", serieDocumento: "SU" },
};

/** Lo editado en Configuración sin sesión: { empresa: {...}, sedes: { [id]: {...} } }. */
export function leerDemo() {
  try { return JSON.parse(localStorage.getItem(CLAVE_DEMO) || "null") || {}; } catch { return {}; }
}
export function guardarDemo(parcial) {
  const prev = leerDemo();
  const sig = {
    empresa: { ...(prev.empresa || {}), ...(parcial.empresa || {}) },
    sedes: { ...(prev.sedes || {}) },
  };
  Object.entries(parcial.sedes || {}).forEach(([k, v]) => { sig.sedes[k] = { ...(sig.sedes[k] || {}), ...v }; });
  try { localStorage.setItem(CLAVE_DEMO, JSON.stringify(sig)); } catch { /* almacenamiento lleno o bloqueado */ }
  return sig;
}
export const empresaDemo = () => { const e = { ...EMPRESA_DEMO, ...(leerDemo().empresa || {}) }; return { ...e, logo: urlLogo(e.logo) }; };
export const sedeDemo = (id) => {
  const k = String(id ?? 1);
  const base = SEDES_DEMO[k] || { id, nombre: `Sede ${k}`, direccion: "", telefonos: "", horario: "" };
  return { ...base, ...((leerDemo().sedes || {})[k] || {}) };
};
export const datosDemo = (sedeId) => ({ empresa: empresaDemo(), sede: sedeDemo(sedeId), demo: true });

/** Ruta de logo usable en el documento: data URL, URL absoluta o relativa a la app. */
export function urlLogo(logo) {
  if (!logo) return "";
  const s = String(logo);
  if (/^(data:|blob:)/i.test(s)) return s;
  const rel = /^(https?:|\/)/i.test(s) ? s : `${BASE}${s.replace(/^\.?\//, "")}`;
  // Absoluta: el documento se abre en otra ventana y el odontograma vive en un iframe
  // con otra ruta, así que una ruta relativa apuntaría a otro sitio.
  try { return typeof location !== "undefined" ? new URL(rel, location.href).href : rel; } catch { return rel; }
}

/** Acepta la respuesta de /clinica/impresion (forma del plan de inversión) o /clinica. */
export function normalizarImpresion(c, sedeId, extra = {}) {
  const e = (c && c.empresa) || c || {};
  const s = (c && Array.isArray(c.sedes) && c.sedes[0]) || (c && c.sede) || {};
  const x = extra || {};
  return {
    empresa: {
      nombre: e.nombreParaDocumento || e.nombreComercial || e.nombre || x.nombre || "",
      razonSocial: e.razonSocial || x.razonSocial || "",
      ruc: e.ruc || x.ruc || "",
      web: e.web || x.web || "",
      bajada: e.bajada || "",
      logo: urlLogo(e.logo || e.logoUrl || x.logo || x.logoUrl || ""),
    },
    sede: {
      id: sedeId ?? s.id ?? null,
      codigo: s.codigo || "",
      nombre: s.nombre || x.sedeNombre || "",
      direccion: s.direccion || x.direccion || "",
      telefonos: s.telefonos || s.telefono || x.telefono || "",
      horario: s.horario || "",
      correo: s.correo || s.email || x.email || "",
      serieDocumento: s.serieDocumento || "",
    },
  };
}

/* ── almacén: lo fija MainApp al cambiar de sede; lo leen todas las descargas ── */
let actual = datosDemo(1);
const subs = new Set();
export function fijarDatosImpresion(d) { actual = d; subs.forEach((f) => f()); }
export const datosImpresion = () => actual;
/** Tras editar Configuración sin sesión: vuelve a leer lo guardado para la sede vigente. */
export function refrescarDatosDemo() { if (actual.demo) fijarDatosImpresion(datosDemo(actual.sede.id)); }

/** Reduce una imagen subida a un PNG liviano (alto máx. 240 px) para usarla como logo. */
export function logoDesdeArchivo(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error("tipo")); return; }
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("lectura"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("imagen"));
      img.onload = () => {
        const alto = Math.min(240, img.naturalHeight || 240);
        const k = alto / (img.naturalHeight || alto);
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round((img.naturalWidth || alto) * k)); cv.height = Math.max(1, Math.round(alto));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL("image/png"));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
export function useDatosImpresion() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => actual, () => actual);
}

/* ── HTML ── */
export const escDoc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Cabecera: logo (o nombre) a la izquierda; empresa y datos de la sede a la derecha. */
export function membreteHTML(titulo, sub, d = actual) {
  const { empresa: e, sede: s } = d;
  const marca = e.logo
    ? `<img class="mbr-logo" src="${escDoc(e.logo)}" alt="${escDoc(e.nombre)}">`
    : `<div class="mbr-marca"><span class="mbr-nom">${escDoc(e.nombre || "Clínica")}</span>${e.bajada ? `<span class="mbr-baj">${escDoc(e.bajada)}</span>` : ""}</div>`;
  const datos = [e.ruc ? `RUC ${e.ruc}` : "", s.nombre, s.direccion, s.telefonos, s.correo || e.web, s.horario].filter(Boolean);
  return `<header class="mbr">${marca}<div class="mbr-datos"><b>${escDoc(e.nombre || "Clínica")}</b>${datos.map(escDoc).join("<br>")}</div></header>`
    + (titulo ? `<h1 class="doc-h1">${escDoc(titulo)}</h1>` : "")
    + (sub ? `<p class="doc-sub">${escDoc(sub)}</p>` : "");
}

/** Pie: empresa, RUC, sede y momento de emisión. */
export function pieHTML(d = actual) {
  const { empresa: e, sede: s } = d;
  const ahora = new Date();
  const z = (n) => String(n).padStart(2, "0");
  const cuando = `${z(ahora.getDate())}/${z(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${z(ahora.getHours())}:${z(ahora.getMinutes())}`;
  return `<footer class="doc-pie"><span>${escDoc([e.razonSocial || e.nombre, e.ruc ? `RUC ${e.ruc}` : ""].filter(Boolean).join(" – "))}</span><span>${escDoc([s.nombre, `Emitido ${cuando}`].filter(Boolean).join(" · "))}</span></footer>`;
}

/** Estilos del documento: los mismos del membrete del odontograma (hoja A4). */
export const CSS_DOC = `
*{box-sizing:border-box}
html,body{margin:0;background:#EEF1F4}
body{font:12px/1.45 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1B1614;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.hoja{width:210mm;max-width:100%;min-height:290mm;margin:18px auto;padding:12mm 14mm 22mm;background:#fff;
  position:relative;box-shadow:0 12px 34px rgba(16,32,52,.18)}
.hoja.is-horizontal{width:297mm;min-height:200mm}
.mbr{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:2px solid #1B1614;padding-bottom:8px}
.mbr-logo{height:46px;width:auto;max-width:220px;object-fit:contain;display:block}
.mbr-marca{display:flex;flex-direction:column;gap:2px;flex:none;white-space:nowrap}
.mbr-nom{font-size:20px;font-weight:800;letter-spacing:-.01em;line-height:1.1}
.mbr-baj{font-size:9.4px;letter-spacing:.16em;text-transform:uppercase;color:#7d746a}
.mbr-datos{margin-left:auto;text-align:right;font-size:9.4px;line-height:1.55;color:#5d564f}
.mbr-datos b{display:block;font-size:12px;letter-spacing:.06em;color:#1B1614;margin-bottom:2px}
.doc-h1{text-align:center;font-size:17px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin:14px 0 3px}
.doc-sub{text-align:center;font-size:10px;color:#5d564f;margin:0 0 12px}
.doc-pie{position:absolute;left:14mm;right:14mm;bottom:9mm;display:flex;justify-content:space-between;gap:12px;
  border-top:1px solid #B7AEA2;padding-top:5px;font-size:8.6px;color:#7d746a}
table.doc-tabla{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
table.doc-tabla thead{display:table-header-group}
table.doc-tabla th{background:#1B1614;color:#fff;text-align:left;padding:7px 9px;font-weight:600;font-size:10px;
  letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
table.doc-tabla td{padding:6px 9px;border-bottom:1px solid #D9D3CA;vertical-align:top}
table.doc-tabla tr:nth-child(even) td{background:#F7F5F0}
table.doc-tabla .num{text-align:right;white-space:nowrap}
.doc-nota{margin-top:10px;color:#7d746a;font-size:10px}
@media screen and (max-width:820px){.hoja{padding:10mm 8mm 20mm}}
@media print{
  @page{size:A4;margin:0}
  html,body{background:#fff}
  .hoja{margin:0;box-shadow:none;width:auto;min-height:297mm;break-after:page}
  .hoja:last-child{break-after:auto}
}`;

/** Sustituye var(--x[, reserva]) por el valor vigente del token en la app. */
export function resolverVars(str) {
  const s = String(str ?? "");
  if (s.indexOf("var(--") < 0 || typeof document === "undefined") return s;
  const cs = getComputedStyle(document.documentElement);
  const cache = {};
  let out = s, prev;
  // Hasta 3 pasadas: una reserva puede contener otra var().
  for (let i = 0; i < 3 && out !== prev && out.indexOf("var(--") >= 0; i++) {
    prev = out;
    out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, n, fb) => {
      if (!(n in cache)) cache[n] = cs.getPropertyValue(n).trim();
      return cache[n] || (fb != null ? fb.trim() : "");
    });
  }
  return out;
}

/**
 * Abre el documento en una ventana imprimible con membrete y pie.
 * cuerpo: HTML del contenido. css: estilos propios del documento.
 * Devuelve false si el navegador bloqueó la ventana emergente.
 */
export function abrirDocumento({ titulo, sub, cuerpo, css = "", tituloVentana, horizontal = false, sinMembrete = false, datos = actual, imprimir = true }) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escDoc(tituloVentana || titulo || "Documento")}</title><style>${CSS_DOC}${horizontal ? "@media print{@page{size:A4 landscape}}" : ""}${resolverVars(css)}</style></head>
<body><div class="hoja${horizontal ? " is-horizontal" : ""}">${sinMembrete ? "" : membreteHTML(titulo, sub, datos)}${resolverVars(cuerpo)}${pieHTML(datos)}</div>
${imprimir ? `<script>(function(){var ya=false;function go(){if(ya)return;ya=true;setTimeout(function(){window.focus();window.print();},250);}
var imgs=[].slice.call(document.images).filter(function(i){return !i.complete;});
if(!imgs.length){go();return;}var n=imgs.length;imgs.forEach(function(i){i.onload=i.onerror=function(){if(--n===0)go();};});
setTimeout(go,2500);})();<\/script>` : ""}
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
