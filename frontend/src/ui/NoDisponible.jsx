import React from "react";

/**
 * R5-02: lo que se muestra cuando la carga de un dato falló. Antes el bloque caía a «S/ 0»,
 * «sin saldo» o «Nada pendiente por ahora», que se leen como datos reales de la clínica.
 * Dice «No disponible · Reintentar» (el botón solo si hay onReintentar).
 *   - en línea (por defecto): para el valor de una cifra o la cabecera de una tarjeta;
 *   - bloque: ocupa el cuerpo de la tarjeta, con un detalle opcional.
 */
export default function NoDisponible({ onReintentar = null, texto = "No disponible", detalle = null, bloque = false, className = "" }) {
  const Tag = bloque ? "div" : "span";
  return (
    <Tag className={["dc-nodisp", bloque ? "is-bloque" : "", className].filter(Boolean).join(" ")} role={bloque ? "status" : undefined}>
      <span className="dc-nodisp__t">{texto}</span>
      {onReintentar && (
        <>
          <span aria-hidden="true">·</span>
          <button type="button" className="dc-nodisp__btn" onClick={(e) => { e.stopPropagation(); onReintentar(); }}>Reintentar</button>
        </>
      )}
      {bloque && detalle && <small className="dc-nodisp__det">{detalle}</small>}
    </Tag>
  );
}
