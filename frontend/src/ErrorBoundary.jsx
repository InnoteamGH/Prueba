import React from "react";

/**
 * Red de seguridad para errores de render.
 *
 * Sin esto, cualquier excepción durante el render deja la pantalla EN BLANCO, sin
 * pista de qué pasó (el gotcha está anotado en el README §7). Con la app
 * partida en chunks el riesgo crece: si falla la descarga de un módulo diferido
 * —red intermitente, un deploy nuevo que invalida el hash del chunk— el fallo llega
 * como una excepción de render igual que cualquier otra.
 *
 * No usa los tokens `DS` a propósito: si lo que falló fue justamente el módulo que
 * los define, importarlos aquí volvería a romper la pantalla de error.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Queda en la consola para poder diagnosticarlo; aquí se engancharía Sentry.
    console.error("[ErrorBoundary] la interfaz falló:", error, info?.componentStack);
  }

  recargar = () => { window.location.reload(); };

  volverAlInicio = () => {
    try { window.location.assign("/"); } catch { window.location.reload(); }
  };

  render() {
    if (!this.state.error) return this.props.children;

    const esChunk = /Loading chunk|dynamically imported module|Failed to fetch/i
      .test(String(this.state.error?.message || ""));

    return (
      <div style={{ minHeight: "calc(100vh / var(--dc-z, 1))", display: "grid", placeItems: "center",
                    background: "var(--dc-white)", padding: 24,
                    fontFamily: "'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif" }}>
        <div style={{ maxWidth: 520, width: "100%", background: "var(--dc-white)", borderRadius: "var(--dc-r-lg)",
                      border: "1px solid var(--dc-line)", boxShadow: "0 10px 30px rgba(15,23,42,.05)",
                      padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 14 }} aria-hidden="true">🦷</div>

          <h1 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 500, color: "var(--dc-brand-900)" }}>
            {esChunk ? "No se pudo cargar esta sección" : "Algo se rompió en la pantalla"}
          </h1>

          <p style={{ margin: "0 0 22px", fontSize: 14, lineHeight: 1.6, color: "var(--dc-ink-500)" }}>
            {esChunk
              ? "Suele pasar cuando se publicó una versión nueva mientras tenías la app abierta. Al recargar se descarga la actualizada."
              : "El fallo es de la interfaz, no de tus datos: nada de lo que ya estaba guardado se ha perdido."}
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={this.recargar}
                    style={{ padding: "11px 20px", borderRadius: "var(--dc-r-lg)", border: "none", cursor: "pointer",
                             background: "var(--dc-teal)", color: "var(--dc-white)", fontSize: 14, fontWeight: 500 }}>
              Recargar
            </button>
            <button onClick={this.volverAlInicio}
                    style={{ padding: "11px 20px", borderRadius: "var(--dc-r-lg)", cursor: "pointer",
                             border: "1px solid var(--dc-line)", background: "var(--dc-white)", color: "var(--dc-ink-500)",
                             fontSize: 14, fontWeight: 500 }}>
              Volver al inicio
            </button>
          </div>

          <details style={{ marginTop: 22, textAlign: "left" }}>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--dc-slate)" }}>
              Detalle técnico (útil para soporte)
            </summary>
            <pre style={{ marginTop: 10, padding: 12, background: "var(--dc-white)", borderRadius: "var(--dc-r-md)",
                          fontSize: 12, color: "var(--dc-ink-500)", whiteSpace: "pre-wrap",
                          wordBreak: "break-word", maxHeight: 200, overflow: "auto" }}>
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
