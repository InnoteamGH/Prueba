import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import api from "../api/client";
import { snapshotAGuardados } from "../util/odontogramaBridge.js";
import { apiRowsAHtmlDatos } from "../util/odontogramaHydrate.js";
import { pedirAnexoAlIframe } from "../util/odontogramaAnexo.js";

export { snapshotAGuardados };

const OdontogramaAnatomico = forwardRef(function OdontogramaAnatomico({
  pacienteId,
  pacienteNombre = "",
  pacienteDni = "",
  pacienteEdad = "",
  pacienteHc = "",
  pacienteSede = "",
  capa = "inicial",
  denticion = "adulto",
  /** null = autoaltura al contenido de la maqueta (referencia completa). */
  height = null,
  zoom = 100,
  notify,
  editable = true,
  onNavTab,
  onFaseChange,
}, ref) {
  const iframeRef = useRef(null);
  const [syncState, setSyncState] = useState("idle");
  const [frameReady, setFrameReady] = useState(false);
  const [autoH, setAutoH] = useState(1100);
  const lastJson = useRef("");
  const hydrated = useRef(false);
  const faseDesdeIframe = useRef(null);

  const src = useMemo(() => {
    const q = new URLSearchParams();
    if (pacienteId) q.set("pacienteId", String(pacienteId));
    // No incluir capa en la URL: al cambiar Inicial/Evolución/Alta el iframe
    // no debe remountarse (parpadeaba y volvía a inicial).
    q.set("bridge", "1");
    if (pacienteNombre) q.set("nombre", pacienteNombre);
    if (pacienteDni) q.set("dni", String(pacienteDni));
    if (pacienteEdad != null && pacienteEdad !== "") q.set("edad", String(pacienteEdad));
    if (pacienteHc) q.set("hc", String(pacienteHc));
    if (pacienteSede) q.set("sede", String(pacienteSede));
    q.set("theme", "dark");
    return `/odontograma-anatomico/index.html?${q.toString()}`;
  }, [pacienteId, pacienteNombre, pacienteDni, pacienteEdad, pacienteHc, pacienteSede]);

  useEffect(() => {
    setFrameReady(false);
  }, [src]);

  const postToIframe = useCallback((msg) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(msg, "*");
    } catch { /* */ }
  }, []);

  const measureIframe = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc?.documentElement) return;
      const h = Math.max(
        doc.documentElement.scrollHeight || 0,
        doc.body?.scrollHeight || 0,
        900,
      );
      setAutoH(Math.min(Math.max(h + 8, 900), 4200));
    } catch { /* cross-origin unlikely same-origin */ }
  }, []);

  const capturarAnexo = useCallback(async () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) throw new Error("Vista anatómica no cargada");
    return pedirAnexoAlIframe(win);
  }, []);

  useImperativeHandle(ref, () => ({ capturarAnexo }), [capturarAnexo]);

  const hidratarDesdeApi = useCallback(async () => {
    if (!pacienteId) return;
    try {
      const rows = await api.odontograma.porPaciente(pacienteId, capa);
      const datos = apiRowsAHtmlDatos(rows || []);
      postToIframe({ type: "dento-odontograma-hydrate", fase: capa, datos });
      hydrated.current = true;
      lastJson.current = JSON.stringify(datos);
      setSyncState("ok");
      setTimeout(measureIframe, 80);
    } catch {
      hydrated.current = true;
      setSyncState("idle");
    }
  }, [pacienteId, capa, postToIframe, measureIframe]);

  const syncChrome = useCallback(() => {
    postToIframe({ type: "dento-odontograma-zoom", zoom });
    postToIframe({
      type: "dento-odontograma-paciente",
      paciente: {
        nombre: pacienteNombre || (pacienteId ? "Paciente" : "Selecciona un paciente"),
        dni: pacienteDni || "",
        edad: pacienteEdad != null && pacienteEdad !== "" ? String(pacienteEdad) : "",
        hc: pacienteHc || "",
        sede: pacienteSede || "",
      },
    });
  }, [postToIframe, zoom, pacienteNombre, pacienteDni, pacienteEdad, pacienteHc, pacienteSede, pacienteId]);

  const persistir = useCallback(async (payload) => {
    if (!editable || !pacienteId || !payload?.datos) return;
    if (!hydrated.current) return;
    const json = JSON.stringify(payload.datos);
    if (json === lastJson.current) return;
    lastJson.current = json;
    const rows = snapshotAGuardados(payload.datos);
    if (!rows.length) return;
    setSyncState("syncing");
    try {
      for (const row of rows) {
        await api.odontograma.guardar({
          pacienteId,
          denticion,
          fase: payload.fase || capa,
          numeroPieza: row.numeroPieza,
          estadoPieza: row.estadoPieza,
          estadosCara: row.estadosCara,
          nota: row.nota,
        });
      }
      setSyncState("ok");
    } catch {
      setSyncState("err");
      notify && notify("No se pudo sincronizar el odontograma anatómico.");
    }
  }, [editable, pacienteId, denticion, capa, notify]);

  useEffect(() => {
    const onMsg = (ev) => {
      const d = ev?.data;
      if (!d) return;
      if (d.type === "dento-odontograma-state") {
        persistir(d);
        if (d.fase && typeof onFaseChange === "function") {
          faseDesdeIframe.current = d.fase;
          onFaseChange(d.fase);
        }
        setTimeout(measureIframe, 60);
      }
      if (d.type === "dento-odontograma-nav" && d.tab && typeof onNavTab === "function") {
        onNavTab(d.tab, d.label);
      }
      if (d.type === "dento-odontograma-resize") measureIframe();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [persistir, onNavTab, onFaseChange, measureIframe]);

  useEffect(() => {
    hydrated.current = false;
    lastJson.current = "";
    setSyncState("idle");
  }, [pacienteId, src]);

  // Cambio de fase sin remount: rehidratar solo si el padre lo pidió (no el iframe).
  const capaPrev = useRef(capa);
  useEffect(() => {
    if (!frameReady) return;
    if (capaPrev.current === capa) return;
    capaPrev.current = capa;
    if (faseDesdeIframe.current === capa) {
      faseDesdeIframe.current = null;
      hydrated.current = true;
      return;
    }
    hydrated.current = false;
    lastJson.current = "";
    hidratarDesdeApi();
  }, [capa, frameReady, hidratarDesdeApi]);

  useEffect(() => {
    syncChrome();
  }, [syncChrome]);

  useEffect(() => {
    if (!frameReady) return undefined;
    measureIframe();
    const t = setInterval(measureIframe, 800);
    return () => clearInterval(t);
  }, [frameReady, measureIframe]);

  const cargado = useRef(false);
  useEffect(() => { cargado.current = false; }, [src]);
  const onIframeLoad = () => {
    if (cargado.current) return;
    cargado.current = true;
    setFrameReady(true);
    capaPrev.current = capa;
    syncChrome();
    setTimeout(() => {
      hidratarDesdeApi();
      measureIframe();
    }, 120);
  };

  // El evento load del iframe espera a TODO (incluidas las fuentes de Google): si esa
  // petición tarda o falla, el odontograma se quedaba en "Cargando…" para siempre.
  // Basta con que el documento ya esté parseado para mostrarlo y hablar con él.
  useEffect(() => {
    if (frameReady) return undefined;
    const t = setInterval(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc && doc.URL !== "about:blank" && doc.readyState !== "loading") onIframeLoad();
      } catch { /* */ }
    }, 150);
    return () => clearInterval(t);
  });

  if (!pacienteId) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: 280,
          border: "1px solid var(--dc-line)",
          borderRadius: "var(--dc-r-lg)",
          background: "var(--dc-bg)",
          color: "var(--dc-ink-500)",
          fontSize: 14,
          padding: 24,
          textAlign: "center",
        }}
      >
        Elige un paciente arriba para abrir su odontograma anatómico.
      </div>
    );
  }

  const syncLabel =
    syncState === "syncing" ? "guardando…"
      : syncState === "ok" ? "sincronizado"
        : syncState === "err" ? "error al guardar"
          : "listo";

  const hCss = height != null ? height : `${autoH}px`;
  const seamless = true; // embebido: sin marco blanco que rompa la maqueta oscura

  return (
    <div style={{ display: "grid", gap: 0 }}>
      <div style={{ position: "relative", minHeight: height != null ? height : 480 }}>
        {!frameReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              display: "grid",
              placeItems: "center",
              border: seamless ? "none" : "1px solid var(--dc-line)",
              borderRadius: seamless ? 0 : "var(--dc-r-lg)",
              background: "#0A0F16",
              color: "#94A2B8",
              fontSize: 13,
            }}
          >
            Cargando odontograma…
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={src}
          title="Odontograma anatómico Dento Check"
          src={src}
          onLoad={onIframeLoad}
          style={{
            width: "100%",
            height: hCss,
            border: seamless ? "none" : "1px solid var(--dc-line)",
            borderRadius: seamless ? 0 : "var(--dc-r-lg)",
            background: "#0A0F16",
            opacity: frameReady ? 1 : 0,
            transition: "opacity .12s ease, height .15s ease",
            display: "block",
          }}
        />
      </div>
      {editable && syncState === "err" && (
        <div style={{ fontSize: 12, color: "var(--dc-danger-700)", padding: "6px 2px" }}>
          No se pudo sincronizar el odontograma ({syncLabel}).
        </div>
      )}
    </div>
  );
});

export default OdontogramaAnatomico;
