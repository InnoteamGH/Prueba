/* M7-02: el «Plan de inversión» trataba como propuesto lo que ya está hecho y no descontaba lo
   pagado. Con QA Prueba Doctor listaba «4.6 QA Endodoncia molar · 220.00» (terminada, por
   cobrar) entre los «Tratamientos propuestos» y cerraba con «Total a pagar S/ 340.00», mientras
   su cláusula 1 dice «No incluye lo que ya está ejecutado» y el Presupuesto PDF del mismo
   paciente dice «Pagado S/ 30.75 · Saldo S/ 309.25».
   Ahora lo realizado de Plan y cuenta va aparte («Ya realizado»), el total del plan lo suma, y
   se muestran lo pagado y el saldo, como en el Presupuesto PDF. La misma regla la copia el
   dibujo del odontograma (public/odontograma-anatomico/index.html), que no puede importar
   módulos del sistema.
   Sin JSX: lo usan PlanInversionDocumento.jsx, OdontogramaAnatomico.jsx y node --test. */
import { estadoFaseUi } from "../compartido/estados.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** ¿La partida de Plan y cuenta ya se hizo? (terminada = por cobrar; atendida = pagada). */
export function faseRealizada(estado) {
  const e = String(estadoFaseUi(estado) || "").toLowerCase();
  return e === "terminada" || e === "atendida" || e === "completada";
}

/** Rótulo de una partida ya hecha, el mismo criterio del Presupuesto PDF. */
export function etiquetaRealizada(estado) {
  const e = String(estadoFaseUi(estado) || "").toLowerCase();
  return e === "atendida" || e === "completada" ? "Realizado · pagado" : "Realizado · por cobrar";
}

/** Lo pagado si se sabe (número finito), o null: sin ese dato no se inventa «Pagado S/ 0». */
export function pagadoConocido(pagado) {
  if (pagado == null || pagado === "") return null;
  const n = Number(pagado);
  return Number.isFinite(n) ? r2(n) : null;
}

/**
 * Filas de totales del plan, en dos grupos:
 *  - `propuesto`: van al pie de la tabla de tratamientos propuestos.
 *  - `cuenta`: van al pie de lo ya realizado (o, si no hay nada realizado, siguen al propuesto).
 * Cada fila es { rotulo, monto, total } (total = la fila que cierra, en negrita).
 * Sin nada realizado ni pagado se conserva el cierre de siempre: Subtotal y «Total a pagar».
 */
export function filasTotalesPlan({ subtotal = 0, descuento = 0, etiquetaDescuento = "Descuento", totalRealizado = 0, hayRealizadas = false, pagado = null } = {}) {
  const sub = r2(subtotal), desc = r2(descuento) > 0 ? r2(descuento) : 0;
  const totalPropuesto = r2(sub - desc);
  const pag = pagadoConocido(pagado);
  const enCuenta = !!hayRealizadas || (pag != null && pag > 0);
  const propuesto = [];
  if (!enCuenta) {
    propuesto.push({ rotulo: "Subtotal", monto: sub });
    if (desc) propuesto.push({ rotulo: etiquetaDescuento, monto: -desc });
    propuesto.push({ rotulo: "Total a pagar", monto: totalPropuesto, total: true });
    return { propuesto, cuenta: [], totalPropuesto, totalPlan: totalPropuesto, pagado: pag, saldo: null };
  }
  if (desc) { propuesto.push({ rotulo: "Subtotal propuesto", monto: sub }); propuesto.push({ rotulo: etiquetaDescuento, monto: -desc }); }
  propuesto.push({ rotulo: "Total propuesto", monto: totalPropuesto });
  const realizado = r2(totalRealizado);
  const totalPlan = r2(totalPropuesto + (hayRealizadas ? realizado : 0));
  const cuenta = [];
  if (hayRealizadas) cuenta.push({ rotulo: "Ya realizado", monto: realizado });
  cuenta.push({ rotulo: "Total del plan", monto: totalPlan, total: pag == null });
  let saldo = null;
  if (pag != null) {
    saldo = r2(Math.max(0, totalPlan - pag));
    cuenta.push({ rotulo: "Pagado", monto: pag });
    cuenta.push({ rotulo: "Saldo a pagar", monto: saldo, total: true });
  }
  return { propuesto, cuenta, totalPropuesto, totalPlan, pagado: pag, saldo };
}

/** Lo pagado por el paciente en las filas de GET /pacientes/resumen-financiero, o null. */
export function pagadoEnResumen(filas, pacienteId) {
  const fila = (Array.isArray(filas) ? filas : []).find((x) => x && String(x.pacienteId) === String(pacienteId));
  return fila ? pagadoConocido(fila.pagado) : null;
}
