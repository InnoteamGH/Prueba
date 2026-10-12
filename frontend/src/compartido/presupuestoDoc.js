/* Presupuesto imprimible del paciente: las MISMAS partidas y precios de Plan y cuenta
   (precio de la sede donde se atiende), con el membrete de esa sede. Antes el botón del
   odontograma imprimía con un tarifario propio del dibujo y no cuadraba con Caja. */
import { abrirDocumento, datosDemo } from "../util/membrete";
import { desgloseIgv } from "./catalogo";
import { estadoFaseUi } from "./estados";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sol = (n) => "S/ " + (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ESTADO = { pendiente: "Por hacer", aprobada: "Por hacer", en_proceso: "En curso", terminada: "Hecho · por cobrar", atendida: "Hecho · pagado" };

// M5-07: el odontograma nombra la partida con su pieza y su cara al final
// («Resina / obturación · pieza 15 (O)»). Solo ese sufijo se quita cuando la pieza va en su
// propia columna; antes se borraba cualquier «pieza N» del texto que escribió la persona
// («QA procedimiento pieza 11 cara V» quedaba «QA procedimiento cara V»).
const SUFIJO_PIEZA = /\s*[·–-]\s*pieza\s*(\d{1,2})(\s*\(([A-Za-z,\s/]+)\))?\s*$/i;
/** Nombre de la partida sin el sufijo « · pieza N (cara)» del odontograma. Si se indica la
    pieza, solo se quita cuando es la misma. */
export function nombreSinSufijoPieza(nombre, pieza = null) {
  const s = String(nombre || "");
  const m = s.match(SUFIJO_PIEZA);
  if (!m) return s.trim();
  if (pieza != null && pieza !== "" && String(Number(pieza)) !== String(Number(m[1]))) return s.trim();
  return s.slice(0, m.index).trim() || s.trim();
}
/** Nombre con la cara entre paréntesis, sin repetirla si el nombre ya la trae
    («… pieza 15 (O)» no pasa a «… (O) (O)»). */
export function nombreConCara(nombre, cara) {
  const s = String(nombre || "").trim();
  const c = String(cara || "").trim();
  if (!c) return s;
  const yaLaTrae = new RegExp(`\\(\\s*${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\)\\s*$`, "i").test(s);
  return yaLaTrae ? s : `${s} (${c})`;
}

/** items = ficha.tratamiento; pagos = ficha.pagos (null = sin acceso a los pagos); sede = id de la sede (demo 1/2) o null.
    pagado (opcional) = lo pagado ya sumado (resumen de la ficha o resumen financiero), para
    quien no puede leer GET /pagos (el doctor): antes recibía [] y el PDF decía «Pagado S/ 0.00». */
export function imprimirPresupuesto({ paciente = {}, items = [], pagos = [], pagado: pagadoDado = null, sede = null, doctor = "", datos = null }) {
  // El servidor guarda la anulación como «cancelada»: tampoco entra al presupuesto.
  const vivos = (items || []).filter((f) => f && estadoFaseUi(f.estado) !== "anulado");
  const total = vivos.reduce((a, f) => a + (Number(f.costo) || 0), 0);
  // Un pago anulado no cuenta como pagado.
  const conPagado = pagadoDado != null && Number.isFinite(Number(pagadoDado));
  const pagado = conPagado ? Number(pagadoDado) : (pagos || []).filter((p) => p && !p.anulado && !/anulad/i.test(String(p.estado || ""))).reduce((a, p) => a + (Number(p.monto) || 0), 0);
  // Pieza y cara del ítem: con sesión llegan como piezaNumero/cara; en la demo, pieza/cara.
  const pz = (f) => { const v = f.piezaNumero ?? f.pieza; return v != null && v !== "" ? String(v) : ""; };
  const cara = (f) => String(f.cara || f.caras || "").trim();
  const saldo = Math.max(0, total - pagado);
  const { base, igv } = desgloseIgv(total);
  const filas = vivos.map((f, i) => `<tr><td class="c">${i + 1}</td><td>${esc(f.nombre)}</td><td class="c">${pz(f) ? esc(pz(f)) + (cara(f) ? ` (${esc(cara(f))})` : "") : (cara(f) ? esc(cara(f)) : "—")}</td><td>${esc(ESTADO[estadoFaseUi(f.estado)] || f.estado || "Por hacer")}</td><td class="r">${sol(f.costo)}</td></tr>`).join("");
  const hoy = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
  return abrirDocumento({
    titulo: "Presupuesto de tratamiento",
    tituloVentana: `Presupuesto - ${paciente.nombre || "Paciente"}`,
    sub: `Fecha: ${hoy}`,
    datos: datos || (sede != null ? datosDemo(sede) : undefined),
    css: `.pr-meta{display:flex;gap:22px;flex-wrap:wrap;border:1px solid #D9D3CA;border-left:3px solid #1B1614;background:#F4F1EA;padding:8px 12px;font-size:12px;margin:6px 0 14px}
      .pr-t{width:100%;border-collapse:collapse;font-size:12px}.pr-t th{text-align:left;border-bottom:1.5px solid #1B1614;padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
      .pr-t td{border-bottom:1px solid #E4DED5;padding:7px 8px}.pr-t .c{text-align:center}.pr-t .r{text-align:right;white-space:nowrap}
      .pr-tot{margin:14px 0 0 auto;width:300px;font-size:12px}.pr-tot div{display:flex;justify-content:space-between;padding:4px 0}
      .pr-tot .is-g{border-top:1.5px solid #1B1614;font-weight:700;font-size:14px;padding-top:7px}.pr-nota{margin-top:18px;font-size:11px;color:#6b635a;line-height:1.6}`,
    cuerpo: `<div class="pr-meta"><span><b>Paciente:</b> ${esc(paciente.nombre || "—")}</span>${paciente.dni ? `<span><b>DNI:</b> ${esc(paciente.dni)}</span>` : ""}${doctor ? `<span><b>Odontólogo:</b> ${esc(doctor)}</span>` : ""}</div>`
      + (vivos.length ? `<table class="pr-t"><thead><tr><th class="c">N.º</th><th>Procedimiento</th><th class="c">Pieza (cara)</th><th>Estado</th><th class="r">Importe</th></tr></thead><tbody>${filas}</tbody></table>` : `<p>No hay procedimientos en el plan.</p>`)
      + `<div class="pr-tot"><div><span>Valor de venta</span><b>${sol(base)}</b></div><div><span>IGV (18 %)</span><b>${sol(igv)}</b></div><div class="is-g"><span>Total del plan</span><span>${sol(total)}</span></div>`
      // pagos === null: quien imprime no ve los pagos (p. ej. el doctor); no se inventa «Pagado S/ 0».
      + (pagos === null && !conPagado ? "" : `<div><span>Pagado</span><b>${sol(pagado)}</b></div><div><span>Saldo</span><b>${sol(saldo)}</b></div>`) + `</div>`
      + `<p class="pr-nota">Precios con IGV de la sede de atención. Presupuesto referencial válido por 30 días; puede variar si cambia el diagnóstico durante el tratamiento.</p>`,
  });
}
