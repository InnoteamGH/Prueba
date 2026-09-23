import React from "react";
import { tint } from "../comun";

/**
 * Tarjeta KPI con estados: cargando | dato | vacio | error.
 * En error NUNCA muestra 0 — muestra "—" + "No se pudo cargar · Reintentar".
 */
export default function TarjetaKPI({
  icon,
  label,
  value,
  color = "var(--dc-brand-700)",
  sub,
  estado = "dato",
  onRetry,
  onClick,
  className = "",
}) {
  const st = estado || "dato";
  let displayValue = value;
  let displaySub = sub;

  if (st === "cargando") {
    displayValue = null;
    displaySub = sub || "Cargando…";
  } else if (st === "vacio") {
    displayValue = "—";
    displaySub = sub || "Sin datos";
  } else if (st === "error") {
    displayValue = "—";
    displaySub = null;
  }

  return (
    <div
      className={`dc-kpi dc-kpi--${st} ${className}`.trim()}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
      role={onClick ? "button" : undefined}
    >
      {icon && (
        <div
          className="dc-kpi__icon"
          style={{
            background: tint(color, 0.12),
            border: `1px solid ${tint(color, 0.19)}`,
            color,
          }}
        >
          {icon}
        </div>
      )}
      <div className="dc-kpi__body">
        <div className="dc-kpi__label">{label}</div>
        {st === "cargando" ? (
          <div className="dc-kpi__skel" aria-hidden="true" />
        ) : (
          <div className="dc-kpi__value">{displayValue}</div>
        )}
        {st === "error" ? (
          <div className="dc-kpi__sub">
            No se pudo cargar
            {onRetry ? (
              <>
                {" · "}
                <button type="button" className="dc-kpi__retry" onClick={(e) => { e.stopPropagation(); onRetry(); }}>
                  Reintentar
                </button>
              </>
            ) : null}
          </div>
        ) : displaySub ? (
          <div className="dc-kpi__sub">{displaySub}</div>
        ) : null}
      </div>
    </div>
  );
}
