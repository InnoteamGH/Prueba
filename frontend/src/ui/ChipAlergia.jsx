import React from "react";

/** Chip de alergia (rojo semántico, SPEC clínico). */
export default function ChipAlergia({ children, onRemove, className = "" }) {
  return (
    <span className={`dc-chip-alergia ${className}`.trim()}>
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Quitar alergia"
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            color: "inherit",
            fontSize: 15,
            lineHeight: 1,
            fontWeight: 600,
            minWidth: 20,
            minHeight: 20,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
