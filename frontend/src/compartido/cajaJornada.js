/* Jornadas de caja: cierres anteriores de una jornada reabierta y el motivo único de «no se
   puede cobrar» según el estado real de la caja de la sede.
   Sin imports: lo usan App.jsx y node --test. */

const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const r2 = (n) => Math.round(n * 100) / 100;

/** «2026-10-10» → «10/10/2026» (lo demás, tal cual). Para los avisos de Caja (R-24). */
export function fechaDMA(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || "");
}

/** R-07: al reabrir una jornada el servidor ya guarda los cierres anteriores en
    `sesionesPrevias` (GET /caja/apertura/historial), pero el Historial solo mostraba el último:
    para quien miraba, el cierre anterior desaparecía. Devuelve esos cierres, del más antiguo
    al más reciente, con el arqueo en soles y en dólares (la diferencia en US$ se deduce si no
    viene). */
export function cierresAnteriores(jornada) {
  const lista = Array.isArray(jornada?.sesionesPrevias) ? jornada.sesionesPrevias : [];
  return lista
    .filter((s) => s && (s.abiertaEn || s.cerradaEn))
    .map((s) => {
      const esp = num(s.efectivoEsperado), con = num(s.efectivoContado);
      const espUsd = num(s.efectivoEsperadoUsd), conUsd = num(s.efectivoContadoUsd);
      return {
        id: s.id ?? `${s.abiertaEn || ""}-${s.cerradaEn || ""}`,
        abiertaEn: s.abiertaEn || null,
        cerradaEn: s.cerradaEn || null,
        abiertaPorNombre: s.abiertaPorNombre || null,
        cerradaPorNombre: s.cerradaPorNombre || null,
        fondo: num(s.fondo) ?? 0, fondoUsd: num(s.fondoUsd) ?? 0,
        efectivoEsperado: esp, efectivoContado: con,
        diferencia: num(s.diferencia) ?? (esp != null && con != null ? r2(con - esp) : null),
        efectivoEsperadoUsd: espUsd, efectivoContadoUsd: conUsd,
        diferenciaUsd: num(s.diferenciaUsd) ?? (espUsd != null && conUsd != null ? r2(conUsd - espUsd) : null),
        justificacion: s.justificacion || "", observaciones: s.observaciones || "",
      };
    })
    .sort((a, b) => String(a.abiertaEn || a.cerradaEn || "").localeCompare(String(b.abiertaEn || b.cerradaEn || "")));
}

/** Resultado de un cierre en una moneda: «cuadra», «falta» o «sobra» (null sin arqueo). */
export function resultadoCierre(dif) {
  if (dif == null || Number.isNaN(Number(dif))) return null;
  const d = Number(dif);
  return Math.abs(d) < 0.01 ? "cuadra" : d < 0 ? "falta" : "sobra";
}

/** R-27: con una jornada anterior abierta, «Registrar cobro» decía «Abre la caja de …» para un
    paciente y «Cierra la jornada anterior…» para otro (según qué respuesta llegaba antes), y el
    botón Cobrar decía «Abre la caja», aunque abrirla no era posible. Un solo texto según el
    estado real de la caja de esa sede:
      - jornada anterior sin cerrar → hay que cerrarla (en Caja › Historial) antes de cobrar;
      - si no → hay que abrir la caja de la sede.
    `accion`: «cobrar» o «registrar un egreso». */
export function motivoCajaCerrada({ sede = "", jornadaPrevia = null, accion = "cobrar", puedeCerrar = true } = {}) {
  const nombre = String(sede || "").trim() || "esta sede";
  if (jornadaPrevia && (jornadaPrevia.id || jornadaPrevia.fecha)) {
    const f = jornadaPrevia.fecha ? ` del ${fechaDMA(jornadaPrevia.fecha)}` : " anterior";
    return puedeCerrar
      ? `La caja de ${nombre} tiene abierta la jornada${f}. Ciérrala en Caja › Historial y abre la de hoy antes de ${accion}.`
      : `La caja de ${nombre} tiene abierta la jornada${f}: la cierra la sede (su administrador o recepción) antes de ${accion}.`;
  }
  return `Abre la caja de ${nombre} antes de ${accion}.`;
}

/** El mismo motivo, corto, para el `title` de un botón. */
export function tituloCajaCerrada(jornadaPrevia = null) {
  return jornadaPrevia && (jornadaPrevia.id || jornadaPrevia.fecha)
    ? `Primero cierra la jornada${jornadaPrevia.fecha ? ` del ${fechaDMA(jornadaPrevia.fecha)}` : " anterior"} (Historial) y abre la caja`
    : "Abre la caja para cobrar";
}
