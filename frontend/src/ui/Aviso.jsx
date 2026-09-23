import React from "react";
import Boton from "./Boton.jsx";

const TIPOS = {
  info: "dc-aviso--info",
  ok: "dc-aviso--ok",
  aviso: "dc-aviso--aviso",
  error: "dc-aviso--error",
};

/**
 * Banner de aviso. tipo: info | ok | aviso | error.
 * En error, onRetry opcional muestra botón "Reintentar".
 */
export default function Aviso({
  tipo = "info",
  children,
  titulo,
  onRetry,
  onDismiss,
  className = "",
  role,
}) {
  const cls = ["dc-aviso", TIPOS[tipo] || TIPOS.info, className].filter(Boolean).join(" ");
  return (
    <div className={cls} role={role || (tipo === "error" ? "alert" : "status")}>
      <div className="dc-aviso__body">
        {titulo && <b>{titulo} </b>}
        {children}
      </div>
      {(onRetry || onDismiss) && (
        <div className="dc-aviso__actions">
          {tipo === "error" && onRetry && (
            <Boton variante="secundario" small onClick={onRetry}>
              Reintentar
            </Boton>
          )}
          {onDismiss && (
            <Boton variante="fantasma" small onClick={onDismiss} aria-label="Descartar">
              ×
            </Boton>
          )}
        </div>
      )}
    </div>
  );
}
