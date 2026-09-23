import React from "react";

/** Campo de texto etiquetado (.dc-campo). */
export default function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  error,
  disabled,
  id,
  className = "",
  ...rest
}) {
  const inputId = id || (label ? `dc-campo-${String(label).replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <label className={`dc-campo ${className}`.trim()} htmlFor={inputId}>
      {label && <span className="dc-campo__label">{label}</span>}
      <input
        id={inputId}
        className="dc-campo__input"
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value, e)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        {...rest}
      />
      {error ? <span className="dc-campo__error">{error}</span> : hint ? <span className="dc-campo__hint">{hint}</span> : null}
    </label>
  );
}
