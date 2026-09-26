import React from "react";

const VARIANTES = {
  primario: "dc-btn--primario",
  exito: "dc-btn--exito",
  peligro: "dc-btn--peligro",
  secundario: "dc-btn--secundario",
  fantasma: "dc-btn--fantasma",
  "peligro-outline": "dc-btn--peligro-outline",
};

/**
 * Botón del design system (clases .dc-btn).
 * variante: primario | exito | peligro | secundario | fantasma | peligro-outline
 */
export default function Boton({
  children,
  variante = "primario",
  type = "button",
  disabled,
  busy,
  small,
  className = "",
  onClick,
  autoFocus,
  ...rest
}) {
  const cls = [
    "dc-btn",
    VARIANTES[variante] || VARIANTES.primario,
    small ? "dc-btn--sm" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || busy}
      aria-busy={busy ? "true" : undefined}
      onClick={onClick}
      autoFocus={autoFocus}
      {...rest}
    >
      {children}
    </button>
  );
}
