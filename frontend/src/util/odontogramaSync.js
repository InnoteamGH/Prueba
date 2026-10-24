/* M8-01: protocolo entre el módulo Odontograma y el dibujo anatómico (iframe).
   El dibujo avisa su estado cada 1,2 s, al soltar el ratón y tras cada carga. Esos
   avisos pueden llegar tarde: uno generado antes de que el dibujo procesara la última
   carga trae la fase o las marcas anteriores. Antes se tomaban como cambios del usuario
   (borraba la fase inicial y reescribía colores) o como cambio de fase (bucle de
   lecturas inicial ↔ evolución). Ahora cada carga lleva un número (`seq`) que el dibujo
   devuelve en sus avisos, y solo se acepta lo que corresponde a la última carga. */

/** Espera tras la que un dibujo sin `seq` (versión anterior en caché) se da por cargado. */
export const ESPERA_SIN_SEQ_MS = 1500;

/**
 * Qué hacer con un aviso `dento-odontograma-state` del dibujo.
 * @param {object} d aviso del dibujo ({ fase, datos, ts, seq? })
 * @param {object} ctx
 * @param {string} ctx.capa fase que muestra el módulo
 * @param {object|null} ctx.pendiente carga enviada sin confirmar ({ seq, fase, datos, enviadoEn })
 * @param {number|null} ctx.seqActual número de la última carga enviada
 * @param {(a: object, b: object) => boolean} ctx.mismasMarcas compara marcas guardables
 * @returns {"ignorar"|"confirmar"|"cambio-fase"|"persistir"}
 */
export function clasificarEstado(d, { capa, pendiente, seqActual, mismasMarcas }) {
  if (!d || d.type !== "dento-odontograma-state") return "ignorar";
  const conSeq = d.seq != null;
  if (pendiente) {
    if (d.fase !== pendiente.fase) return "ignorar";
    if (conSeq) return d.seq === pendiente.seq ? "confirmar" : "ignorar";
    // Dibujo sin `seq`: confirma si ya muestra lo cargado, o si el aviso se generó
    // bastante después del envío (el dibujo procesa la carga antes de su siguiente aviso).
    if (mismasMarcas(d.datos || {}, pendiente.datos || {})) return "confirmar";
    if (d.ts != null && pendiente.enviadoEn != null && d.ts - pendiente.enviadoEn >= ESPERA_SIN_SEQ_MS) return "confirmar";
    return "ignorar";
  }
  // Sin carga confirmada no hay base para comparar: nada se guarda ni cambia de fase.
  if (seqActual == null) return "ignorar";
  // Aviso generado antes de la última carga: no es un cambio del usuario.
  if (conSeq && d.seq !== seqActual) return "ignorar";
  if (d.fase && d.fase !== capa) return "cambio-fase";
  return "persistir";
}

/**
 * Solo se guarda lo que el usuario cambió en el dibujo: tiene que haber tocado el dibujo
 * (puntero o teclado) después de que la carga quedó confirmada.
 */
export function hayAccionDelUsuario(ultimaInteraccion, confirmadoEn) {
  return ultimaInteraccion != null && confirmadoEn != null && ultimaInteraccion > confirmadoEn;
}
