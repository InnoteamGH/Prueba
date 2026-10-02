/* Periodontograma → proforma y informe.
 *
 * El plan se sugiere a partir del sondaje (misma lógica del prototipo aprobado v4):
 * fase inicial, reevaluación, fase correctiva (condicional) y mantenimiento. El doctor
 * puede quitar o agregar partidas, cambiar cantidades y precios antes de emitirla.
 * Los documentos salen con el membrete de la empresa y de la sede que emite
 * (util/membrete.js). */
import { SUP, INF, esMolar, nic, ordenVisual } from "./periodontal";
import { abrirDocumento, escDoc as esc } from "./membrete";

export const CATALOGO_PERIO = {
  IHO: { nombre: "Instrucción de higiene oral y control de placa", precio: 60, fase: 1 },
  PRO: { nombre: "Profilaxis y destartraje supragingival", precio: 120, fase: 1 },
  RAR: { nombre: "Raspado y alisado radicular (por cuadrante)", precio: 250, fase: 1 },
  REE: { nombre: "Reevaluación periodontal (6–8 semanas)", precio: 80, fase: 2 },
  CIR: { nombre: "Cirugía periodontal a colgajo (por sextante)", precio: 900, fase: 3 },
  FUR: { nombre: "Tratamiento de lesión de furca (por pieza)", precio: 350, fase: 3 },
  FER: { nombre: "Ferulización (por segmento)", precio: 300, fase: 3 },
  MAN: { nombre: "Mantenimiento periodontal (por sesión)", precio: 150, fase: 4 },
};
export const FASES_PERIO = { 1: "Fase inicial (causal)", 2: "Reevaluación", 3: "Fase correctiva", 4: "Mantenimiento" };
const QN = { 1: "Q1 sup. der.", 2: "Q2 sup. izq.", 3: "Q3 inf. izq.", 4: "Q4 inf. der." };
const sext = (n) => { const q = Math.floor(n / 10), d = n % 10; return q === 1 ? (d >= 4 ? "18–14" : "13–23") : q === 2 ? (d >= 4 ? "24–28" : "13–23") : q === 3 ? (d >= 4 ? "38–34" : "33–43") : (d >= 4 ? "44–48" : "33–43"); };

/* Precios editados por la clínica: se recuerdan para la próxima proforma. */
const CLAVE_PRECIOS = "dc_perio_precios";
export function preciosGuardados() { try { return JSON.parse(localStorage.getItem(CLAVE_PRECIOS) || "{}") || {}; } catch { return {}; } }
export function guardarPrecio(cod, precio) { const p = preciosGuardados(); p[cod] = precio; try { localStorage.setItem(CLAVE_PRECIOS, JSON.stringify(p)); } catch { /* sin espacio */ } }

/** Partidas sugeridas según el sondaje y la orientación diagnóstica. */
export function sugerirPlan(dientes, dx) {
  const pr = preciosGuardados(), it = [];
  const add = (c, cant, det, extra = {}) => {
    if (cant > 0) it.push({ id: c, cod: c, nombre: CATALOGO_PERIO[c].nombre, precio: pr[c] ?? CATALOGO_PERIO[c].precio, cant, det, fase: CATALOGO_PERIO[c].fase, incluir: true, ...extra });
  };
  const q4 = new Set(), s6 = new Set(), fur = [], mov = new Set();
  [...SUP, ...INF].forEach((n) => {
    const p = dientes[n]; if (!p || p.ausente) return;
    p.pd.forEach((v) => { if (v >= 4) q4.add(Math.floor(n / 10)); if (v >= 6) s6.add(sext(n)); });
    if (esMolar(n) && (p.furca || 0) >= 2) fur.push(n);
    if ((p.movilidad || 0) >= 2) mov.add(sext(n));
  });
  add("IHO", 1, "Técnica de cepillado e interproximales");
  if (dx.estado === "periodontitis") {
    add("RAR", q4.size, [...q4].sort().map((q) => QN[q]).join(" · "));
    add("REE", 1, "Nuevo periodontograma para comparar");
    add("CIR", s6.size, [...s6].map((s) => `Sextante ${s}`).join(" · "), { incluir: false, cond: "Solo si persisten bolsas ≥ 6 mm tras la reevaluación" });
    add("FUR", fur.length, fur.map((n) => `Pieza ${n}`).join(" · "));
    add("FER", mov.size, [...mov].map((s) => `Sextante ${s}`).join(" · "));
    add("MAN", 4, "Cada 3 meses durante el primer año");
  } else {
    add("PRO", 1, "Limpieza profesional");
    if (dx.estado === "gingivitis") add("REE", 1, "Control a las 4–6 semanas");
    add("MAN", dx.estado === "gingivitis" ? 2 : 1, "Controles semestrales");
  }
  return it;
}

export function totalesPlan(plan, descPct = 0) {
  const sub = plan.filter((x) => x.incluir).reduce((a, x) => a + (Number(x.cant) || 0) * (Number(x.precio) || 0), 0);
  const desc = Math.round(sub * (Number(descPct) || 0)) / 100;
  return { sub, desc, total: Math.round((sub - desc) * 100) / 100, n: plan.filter((x) => x.incluir).length };
}

const sol = (n) => "S/ " + (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hoyLargo = () => new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });

const CSS_PERIO = `
.ficha{display:flex;gap:24px;border:1px solid #D9D3CA;border-left:3px solid #1B1614;padding:8px 12px;background:#F4F1EA;font-size:12px;margin:4px 0 12px}
.ficha>div{flex:1;min-width:0} .ficha p{margin:2px 0}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.07em;margin:16px 0 6px;border-bottom:1.5px solid #D9D3CA;padding-bottom:4px}
.dx{border:1px solid #D9D3CA;border-radius:6px;padding:9px 12px;font-size:12px;line-height:1.55}
.dx b{font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(6,1fr);border:1px solid #D9D3CA;border-radius:6px;overflow:hidden;margin-top:8px}
.kpis div{padding:7px 8px;text-align:center;border-left:1px solid #D9D3CA} .kpis div:first-child{border-left:0}
.kpis small{display:block;font-size:8.6px;letter-spacing:.1em;text-transform:uppercase;color:#7d746a} .kpis b{font-size:14px}
.num{text-align:right;white-space:nowrap} .c{text-align:center}
.g6{color:#B42318;font-weight:700} .g4{color:#B54708;font-weight:700}
.fase td{background:#EFEBE3!important;font-weight:700;font-size:10px;letter-spacing:.06em;text-transform:uppercase}
.det{display:block;color:#7d746a;font-size:10px;margin-top:1px}
.tot{margin-left:auto;width:280px;margin-top:10px;font-size:12px}
.tot div{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #EFEBE3}
.tot .big{font-size:15px;font-weight:800;border-bottom:2px solid #1B1614}
.cond{font-size:11px;line-height:1.55;color:#3d3833;margin-top:14px}
.cond p{margin:3px 0}
.firmas{display:flex;gap:40px;margin-top:54px}.firmas div{flex:1;border-top:1px solid #1B1614;padding-top:6px;text-align:center;font-size:11px}
.nota{font-size:10px;color:#7d746a;margin-top:10px}`;

function fichaHTML(pac, prof) {
  return `<div class="ficha"><div><p><b>Paciente:</b> ${esc(pac.nombre || "—")}</p>${pac.dni ? `<p><b>DNI:</b> ${esc(pac.dni)}</p>` : ""}${pac.hc ? `<p><b>Historia clínica:</b> ${esc(pac.hc)}</p>` : ""}</div>`
    + `<div><p><b>Fecha:</b> ${esc(hoyLargo())}</p>${prof ? `<p><b>Profesional:</b> ${esc(prof)}</p>` : ""}</div></div>`;
}

/** Proforma periodontal (tratamiento propuesto y costo). */
export function abrirProformaPerio({ plan, descPct = 0, paciente = {}, profesional = "", dx, vigenciaDias = 30 }) {
  const t = totalesPlan(plan, descPct);
  const filas = [1, 2, 3, 4].map((f) => {
    const its = plan.filter((x) => x.incluir && x.fase === f);
    if (!its.length) return "";
    return `<tr class="fase"><td colspan="4">${esc(FASES_PERIO[f])}</td></tr>` + its.map((x) =>
      `<tr><td>${esc(x.nombre)}${x.det ? `<span class="det">${esc(x.det)}</span>` : ""}${x.cond ? `<span class="det">${esc(x.cond)}</span>` : ""}</td><td class="c">${esc(x.cant)}</td><td class="num">${sol(x.precio)}</td><td class="num">${sol(x.cant * x.precio)}</td></tr>`).join("");
  }).join("");
  const opcionales = plan.filter((x) => !x.incluir);
  return abrirDocumento({
    titulo: "Proforma de tratamiento periodontal",
    sub: dx?.titulo ? `Diagnóstico: ${dx.titulo}` : "",
    tituloVentana: `Proforma periodontal - ${paciente.nombre || ""}`,
    css: CSS_PERIO,
    cuerpo: fichaHTML(paciente, profesional)
      + `<table class="doc-tabla"><thead><tr><th>Tratamiento</th><th class="c">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead><tbody>${filas || `<tr><td colspan="4">Sin partidas incluidas.</td></tr>`}</tbody></table>`
      + `<div class="tot"><div><span>Subtotal</span><b>${sol(t.sub)}</b></div>${t.desc ? `<div><span>Descuento (${descPct}%)</span><b>− ${sol(t.desc)}</b></div>` : ""}<div class="big"><span>Total</span><span>${sol(t.total)}</span></div></div>`
      + (opcionales.length ? `<h2>Tratamientos que podrían requerirse</h2><table class="doc-tabla"><tbody>${opcionales.map((x) => `<tr><td>${esc(x.nombre)}${x.det ? `<span class="det">${esc(x.det)}</span>` : ""}${x.cond ? `<span class="det">${esc(x.cond)}</span>` : ""}</td><td class="num">${esc(x.cant)} × ${sol(x.precio)}</td></tr>`).join("")}</tbody></table>` : "")
      + `<div class="cond"><h2>Condiciones</h2><p><b>Vigencia:</b> válida por ${vigenciaDias} días desde la fecha de emisión.</p><p><b>Variación:</b> el plan puede cambiar según la respuesta al tratamiento y la reevaluación periodontal.</p><p><b>Pago:</b> la forma de pago y las cuotas se acuerdan en recepción y quedan registradas en el estado de cuenta.</p></div>`
      + `<div class="firmas"><div>${esc(profesional || "Firma y sello del profesional")}</div><div>Conformidad del paciente</div></div>`,
  });
}

/** Informe periodontal (clínico): diagnóstico, índices y sondaje por pieza. */
export function abrirInformePerio({ dientes, m, dx, criticos = [], paciente = {}, profesional = "", plan = null }) {
  const pieza = (n) => {
    const p = dientes[n];
    if (!p || p.ausente) return `<tr><td class="c"><b>${n}</b></td><td colspan="7" style="color:#7d746a">Ausente</td></tr>`;
    const ps = (cara) => ordenVisual(n, cara).map((i) => { const v = p.pd[i]; return v == null ? "·" : `<span class="${v >= 6 ? "g6" : v >= 4 ? "g4" : ""}">${v}</span>`; }).join(" ");
    const nics = p.pd.map((v, i) => nic(v, p.mg[i])).filter((v) => v != null);
    const cuenta = (k) => p[k].filter(Boolean).length;
    return `<tr><td class="c"><b>${n}</b>${p.implante ? " (imp.)" : ""}</td><td class="c">${ps("v")}</td><td class="c">${ps("l")}</td><td class="c">${nics.length ? Math.max(...nics) : "·"}</td><td class="c">${cuenta("bop") || ""}</td><td class="c">${cuenta("placa") || ""}</td><td class="c">${p.movilidad ? ["", "I", "II", "III"][p.movilidad] : ""}</td><td class="c">${esMolar(n) && p.furca ? ["", "I", "II", "III"][p.furca] : ""}</td></tr>`;
  };
  const tabla = (arco, titulo) => `<h2>${titulo}</h2><table class="doc-tabla"><thead><tr><th class="c">Pieza</th><th class="c">PS vestibular (M C D)</th><th class="c">PS ${arco === SUP ? "palatino" : "lingual"}</th><th class="c">NIC máx.</th><th class="c">Sangrado</th><th class="c">Placa</th><th class="c">Movilidad</th><th class="c">Furca</th></tr></thead><tbody>${arco.map(pieza).join("")}</tbody></table>`;
  const kpi = [["Sangrado", `${m.bopPct}%`], ["Placa", `${m.placaPct}%`], ["PS media", `${m.pdMedia.toFixed(1)} mm`], ["NIC medio", `${m.calMedia.toFixed(1)} mm`], ["Sitios ≥ 4", m.s4], ["Sitios ≥ 6", m.s6]];
  const t = plan ? totalesPlan(plan) : null;
  return abrirDocumento({
    titulo: "Informe periodontal",
    sub: "Periodontograma · clasificación AAP/EFP 2017",
    tituloVentana: `Informe periodontal - ${paciente.nombre || ""}`,
    css: CSS_PERIO,
    cuerpo: fichaHTML(paciente, profesional)
      + `<div class="dx"><b>${esc(dx.titulo)}</b><br>${esc(dx.detalle)}</div>`
      + `<div class="kpis">${kpi.map(([l, v]) => `<div><small>${esc(l)}</small><b>${esc(v)}</b></div>`).join("")}</div>`
      + tabla(SUP, "Arcada superior") + tabla(INF, "Arcada inferior")
      + (criticos.length ? `<h2>Sitios de 5 mm o más</h2><p style="font-size:11px;line-height:1.7">${criticos.slice(0, 30).map((x) => `<b>${x.n}</b> ${esc(x.sitio)}: <span class="${x.v >= 6 ? "g6" : "g4"}">${x.v} mm</span>${x.b ? " (sangra)" : ""}`).join(" · ")}</p>` : "")
      + (plan ? `<h2>Plan propuesto</h2><table class="doc-tabla"><tbody>${plan.filter((x) => x.incluir).map((x) => `<tr><td>${esc(FASES_PERIO[x.fase])}</td><td>${esc(x.nombre)}${x.det ? `<span class="det">${esc(x.det)}</span>` : ""}</td><td class="c">${esc(x.cant)}</td></tr>`).join("")}</tbody></table><p class="nota">Costo estimado del plan: ${sol(t.total)}. El detalle de precios va en la proforma.</p>` : "")
      + `<p class="nota">Orientación diagnóstica basada en el sondaje. El estadio IV y el grado requieren radiografía, piezas perdidas por periodontitis y factores de riesgo.</p>`
      + `<div class="firmas"><div>${esc(profesional || "Firma y sello del profesional")}</div></div>`,
  });
}

