/* Presupuesto imprimible del paciente: las MISMAS partidas y precios de Plan y cuenta
   (precio de la sede donde se atiende), con el membrete de esa sede. Antes el botón del
   odontograma imprimía con un tarifario propio del dibujo y no cuadraba con Caja. */
import { abrirDocumento, datosDemo } from "../util/membrete";
import { desgloseIgv } from "./catalogo";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sol = (n) => "S/ " + (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ESTADO = { pendiente: "Por hacer", aprobada: "Por hacer", en_proceso: "En curso", terminada: "Hecho · por cobrar", atendida: "Hecho · pagado" };

/** items = ficha.tratamiento; pagos = ficha.pagos; sede = id de la sede (demo 1/2) o null. */
export function imprimirPresupuesto({ paciente = {}, items = [], pagos = [], sede = null, doctor = "", datos = null }) {
  const vivos = (items || []).filter((f) => f && f.estado !== "anulado" && f.estado !== "anulada");
  const total = vivos.reduce((a, f) => a + (Number(f.costo) || 0), 0);
  const pagado = (pagos || []).reduce((a, p) => a + (Number(p.monto) || 0), 0);
  const saldo = Math.max(0, total - pagado);
  const { base, igv } = desgloseIgv(total);
  const filas = vivos.map((f, i) => `<tr><td class="c">${i + 1}</td><td>${esc(f.nombre)}</td><td class="c">${f.pieza ? esc(f.pieza) + (f.cara ? ` (${esc(f.cara)})` : "") : "—"}</td><td>${esc(ESTADO[f.estado] || f.estado || "Por hacer")}</td><td class="r">${sol(f.costo)}</td></tr>`).join("");
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
      + (vivos.length ? `<table class="pr-t"><thead><tr><th class="c">N.º</th><th>Procedimiento</th><th class="c">Pieza</th><th>Estado</th><th class="r">Importe</th></tr></thead><tbody>${filas}</tbody></table>` : `<p>No hay procedimientos en el plan.</p>`)
      + `<div class="pr-tot"><div><span>Valor de venta</span><b>${sol(base)}</b></div><div><span>IGV (18 %)</span><b>${sol(igv)}</b></div><div class="is-g"><span>Total del plan</span><span>${sol(total)}</span></div>`
      + `<div><span>Pagado</span><b>${sol(pagado)}</b></div><div><span>Saldo</span><b>${sol(saldo)}</b></div></div>`
      + `<p class="pr-nota">Precios con IGV de la sede de atención. Presupuesto referencial válido por 30 días; puede variar si cambia el diagnóstico durante el tratamiento.</p>`,
  });
}
