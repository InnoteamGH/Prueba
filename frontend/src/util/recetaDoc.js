/* Receta médica en PDF: una sola plantilla para la ficha del paciente y el módulo Recetas.
   M4-14: cada pantalla armaba la suya y no coincidían (una con la fecha completa y la edad,
   la otra con «jue, 08 oct.» sin año ni edad, y con otro formato para los medicamentos).
   Las dos llaman a imprimirReceta con los mismos datos. */
import { abrirDocumento, escDoc as esc } from "./membrete";
import { itemsDeReceta, textoIndicaciones } from "../compartido/recetaItems";
import { conCop } from "./cop";

const CSS_RECETA = `.rx-m{display:flex;gap:22px;flex-wrap:wrap;border:1px solid #D9D3CA;border-left:3px solid #1B1614;background:#F4F1EA;padding:8px 12px;font-size:12px;margin:6px 0 14px}
.rx-h{font-size:15px;margin:14px 0 4px;color:#1B1614}
.rx-i{padding:8px 0;border-bottom:1px dashed #D9D3CA;font-size:13px}.rx-i b{font-size:14px}.rx-i small{display:block;color:#6b635a;margin-top:2px}
.rx-ind{border:1px solid #D9D3CA;border-radius:6px;padding:9px 11px;margin:6px 0;white-space:pre-wrap;font-size:12.5px}
.rx-f{margin-top:52px;text-align:center;font-size:12px}.rx-f div{display:inline-block;border-top:1px solid #1B1614;padding-top:6px;min-width:260px}`;

/** Edad en años cumplidos (null si no hay fecha válida). */
const edadDe = (iso) => {
  if (!iso) return null;
  const b = new Date(String(iso).slice(0, 10) + "T00:00:00");
  if (isNaN(b)) return null;
  const h = new Date();
  let e = h.getFullYear() - b.getFullYear();
  const m = h.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < b.getDate())) e--;
  return e >= 0 && e < 120 ? e : null;
};
/** «08/10/2026». */
const fechaDMA = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "");

/** Cuerpo HTML de la receta (sin membrete). Exportado para probarlo aparte. */
export function cuerpoReceta({ paciente = {}, receta = {}, cop = "" }) {
  const its = itemsDeReceta(receta);
  const edad = edadDe(paciente.fechaNacimiento ?? paciente.nacimiento);
  const filas = its.map((x) => {
    const como = [x.dosis && `Dosis: ${x.dosis}`, x.frecuencia && `Frecuencia: ${x.frecuencia}`, x.duracion && `Duración: ${x.duracion}`, x.detalle].filter(Boolean).join(" · ");
    return `<div class="rx-i"><b>${esc(x.medicamento)}</b>${x.presentacion ? ` — ${esc(x.presentacion)}` : ""}${como ? `<small>${esc(como)}</small>` : ""}</div>`;
  }).join("");
  const ind = textoIndicaciones(receta.indicaciones ?? receta.indic);
  const copTxt = conCop(cop);
  const medico = receta.medico && receta.medico !== "—" ? receta.medico : "Firma y sello del profesional";
  return `<div class="rx-m"><span><b>Paciente:</b> ${esc(paciente.nombre || "")}</span>${paciente.dni ? `<span><b>DNI:</b> ${esc(paciente.dni)}</span>` : ""}${edad != null ? `<span><b>Edad:</b> ${edad} años</span>` : ""}<span><b>Fecha:</b> ${esc(fechaDMA(receta.fecha))}</span></div>`
    + `<h3 class="rx-h">Rp/</h3>${filas || '<div class="rx-i">—</div>'}`
    + (ind ? `<h3 class="rx-h">Indicaciones</h3><div class="rx-ind">${esc(ind)}</div>` : "")
    + `<div class="rx-f"><div>${esc(medico)}${copTxt ? ` · ${esc(copTxt)}` : ""}</div></div>`;
}

/** Abre la receta lista para imprimir o guardar en PDF. Devuelve false si el navegador
    bloqueó la ventana. datos: membrete de otra sede (demo). */
export function imprimirReceta({ paciente = {}, receta = {}, cop = "", datos }) {
  return abrirDocumento({
    titulo: "Receta médica", tituloVentana: `Receta - ${paciente.nombre || ""}`,
    css: CSS_RECETA, cuerpo: cuerpoReceta({ paciente, receta, cop }),
    ...(datos ? { datos } : {}),
  });
}
