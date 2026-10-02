import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import api, { auth } from "../api/client";
import { snapshotAGuardados } from "../util/odontogramaBridge.js";
import { apiRowsAHtmlDatos } from "../util/odontogramaHydrate.js";
import { pedirAnexoAlIframe } from "../util/odontogramaAnexo.js";
import { useDatosImpresion } from "../util/membrete";
import { MEDICOS } from "../comun";

/* Profesional que firma los documentos del odontograma: el odontólogo que tiene la
   sesión abierta; si imprime otra persona (recepción), el médico tratante del
   paciente. El COP sale del registro del médico. Quien imprime queda en la traza. */
function profesionalDoc(medicoTratante) {
  let u = null;
  try { u = JSON.parse(localStorage.getItem("dc_usuario") || "null"); } catch { u = null; }
  const u2 = u || auth.sesion || {};
  const esMedico = /medico|odont/i.test(String(u2.rol || ""));
  const nombre = (esMedico ? u2.nombre : "") || medicoTratante || "";
  const m = MEDICOS.find((x) => (u2.medicoId != null && x.id === u2.medicoId) || (nombre && x.nombre === nombre));
  const cop = String((esMedico && u2.cop) || (m && m.cop) || "").replace(/^\s*COP\s*/i, "");
  return { nombre: nombre || (m && m.nombre) || "", cop, impreso: u2.nombre || "" };
}

export { snapshotAGuardados };

/* Hallazgos guardados en la ficha (formato de la app) → formato del dibujo anatómico. */
const CARA_APP = { top: "V", left: "M", right: "D", center: "O" };
const ID_APP = { obturado: "restaur", obturacion: "restaur", extraer: "extraccion" };
const AZUL = new Set(["obturado", "restaur", "corona", "endodoncia", "implante", "sellante", "ausente", "espigo", "pulpotomia"]);
export function estadosAppAHtml(est = {}) {
  const datos = {};
  for (const [n, d] of Object.entries(est || {})) {
    if (!d) continue;
    const sup = [1, 2, 5, 6].includes(Math.floor(Number(n) / 10));
    const caras = {};
    for (const [k, v] of Object.entries(d.caras || {})) {
      if (!v || v === "sano") continue;
      const code = k === "bottom" ? (sup ? "P" : "L") : CARA_APP[k];
      if (code) caras[code] = { h: ID_APP[v] || v, c: AZUL.has(v) ? "a" : "r" };
    }
    const pieza = d.whole && d.whole !== "sano" ? [{ h: ID_APP[d.whole] || d.whole, c: AZUL.has(d.whole) ? "a" : "r" }] : [];
    if (Object.keys(caras).length || pieza.length) datos[String(n)] = { caras, raices: {}, pieza, nota: d.nota || "" };
  }
  return datos;
}

/* Estilos del sistema dentro del iframe: misma fuente, paleta y tipo oración. */
function injectarEstiloSistema(doc) {
  try {
    if (!doc || doc.getElementById("dc-integrado")) return;
    const reglas = [];
    for (const sh of Array.from(document.styleSheets)) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      for (const r of Array.from(rules || [])) {
        if (r.type === 5 && /Inter|Manrope/i.test(r.cssText)) {
          const base = sh.href || document.baseURI;
          reglas.push(r.cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => { try { return `url("${new URL(u, base).href}")`; } catch { return m; } }));
        }
      }
    }
    const st = doc.createElement("style");
    st.id = "dc-integrado";
    // ODO-02 / ODO-04: el presupuesto vive en «Plan y cuenta» y sus botones están en la
    // barra del sistema; aquí no se repiten.
    const ocultos = "section.ppto,#b-resumen{display:none!important}";
    st.textContent = ocultos + reglas.join("\n") + `
:root:root:root{--ui:"Inter Variable","Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:var(--ui);
  --fondo:#FFFFFF;--panel:#FFFFFF;--papel:#FFFFFF;--panel-2:#F4F9F9;--linea:#E3EFEF;--linea-2:#CFE3E4;
  --t900:#10262B;--t700:#33494F;--t500:#5B7075;--t400:#7C9499;--t300:#A9BCBF;
  --marca:#0B6C78;--marca-2:#14A3A8;--marca-luz:#E6F5F5;--marca-borde:#BFE3E4;
  --rojo:#D2463A;--rojo-luz:#FDECEA;--rojo-borde:#F6C9C3;--azul:#2F6FDE;--azul-luz:#EAF1FD;--azul-borde:#C9DAF8;
  --ok:#15803D;--ok-luz:#E3F7EC;--ambar:#B45309;--ambar-luz:#FFF4DE;--ambar-borde:#F6DFA6;
  --mesa-1:#F7FBFB;--mesa-2:#EEF6F6;--r3:18px}
html,body{background:transparent!important;font-family:var(--ui)!important}
.env{padding:0!important}
.tarjeta{border:0!important;box-shadow:none!important;border-radius:0!important;background:transparent!important}
.tarjeta > header{background:transparent!important;border-bottom:1px solid #EEF4F4!important;padding:4px 2px 12px!important}
.et,.grupo>span,.rot-et,.cuad-rot,.lupa-et{text-transform:none!important;letter-spacing:0!important}
.cuad-rot{font-size:12px!important;font-weight:650!important;fill:#7C9499!important}
.pieza .num,.pieza .sig,.lupa-sig,.norma,.exp-sub b,.grupo>i,kbd{font-family:var(--ui)!important;letter-spacing:0!important;font-variant-numeric:tabular-nums}
.pieza .num{font-size:12px!important;font-weight:650!important;fill:#7C9499!important}
.pieza.sel .num{fill:#0B6C78!important;font-weight:800!important}
.lienzo{background:radial-gradient(60% 70% at 50% 45%,#F7FBFB 0%,#FFFFFF 70%)!important;border-radius:16px}
.cruz{stroke:#CFE3E4!important}
button{font-family:var(--ui)!important}
th,.ppto th,[class*="et"]{text-transform:none!important;letter-spacing:0!important}
.abajo > *, .ppto, .pie{background:#fff!important;border:0!important;border-radius:18px!important;box-shadow:inset 0 0 0 1px #E3EFEF,0 12px 26px -24px rgba(14,42,51,.55)!important}
.malla{gap:14px!important}
.abajo > * > header,.ppto > header,.abajo header{padding:12px 16px!important}
.abajo{gap:14px!important;align-items:start!important}
.ppto th{background:#F4F9F9!important;color:#5B7075!important;font-size:12px!important}
.ppto button,.pie button{border-radius:999px!important}
`;
    doc.head.appendChild(st);
    const g = doc.querySelector('link[href*="fonts.googleapis"]');
    if (g) g.remove();
  } catch { /* */ }
}

const OdontogramaAnatomico = forwardRef(function OdontogramaAnatomico({
  pacienteId,
  pacienteNombre = "",
  pacienteDni = "",
  pacienteEdad = "",
  pacienteHc = "",
  pacienteSede = "",
  medicoTratante = "",
  capa = "inicial",
  denticion = "adulto",
  /** null = autoaltura al contenido de la maqueta (referencia completa). */
  height = null,
  zoom = 100,
  notify,
  editable = true,
  onNavTab,
  conExpediente = true,
  /** Expediente clínico: foto de la fase, sin herramientas ni presupuesto. */
  soloLectura = false,
  onFaseChange,
  demoEstados = null,
  /** Demostración: dibujo guardado en la ficha (formato del iframe) y aviso de cambios. */
  demoDatos = null,
  onDemoCambio = null,
  /** Dentro del sistema el presupuesto se arma en «Plan y cuenta» (ODO-02): se oculta el del iframe. */
  ocultarPlanPropio = true,
}, ref) {
  const iframeRef = useRef(null);
  const [syncState, setSyncState] = useState("idle");
  const [frameReady, setFrameReady] = useState(false);
  const [autoH, setAutoH] = useState(860);
  const lastJson = useRef("");
  const lastDemo = useRef("");
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
    q.set("theme", "light");
    if (!conExpediente) q.set("expediente", "0");
    if (soloLectura) q.set("ro", "1");
    return `${import.meta.env.BASE_URL}odontograma-anatomico/index.html?${q.toString()}`;
  }, [pacienteId, pacienteNombre, pacienteDni, pacienteEdad, pacienteHc, pacienteSede, conExpediente, soloLectura]);

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
      // Alto real del contenido (no el del documento, que nunca baja del alto del iframe).
      const env = doc.querySelector(".env") || doc.body;
      const h = Math.ceil(env ? env.getBoundingClientRect().height : 0) || doc.body?.scrollHeight || 0;
      if (!h) return;
      setAutoH((prev) => { const n = Math.min(Math.max(h + 4, 420), 5000); return Math.abs(n - prev) > 2 ? n : prev; });
    } catch { /* cross-origin unlikely same-origin */ }
  }, []);

  const capturarAnexo = useCallback(async () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) throw new Error("Vista anatómica no cargada");
    return pedirAnexoAlIframe(win);
  }, []);

  // Abre el documento del odontograma (plan de inversión o resumen) desde la barra del sistema.
  const abrirDocumento = useCallback((que) => { postToIframe({ type: "dento-odontograma-documento", que }); }, [postToIframe]);
  useImperativeHandle(ref, () => ({ capturarAnexo, abrirDocumento }), [capturarAnexo, abrirDocumento]);

  const hidratarDesdeApi = useCallback(async () => {
    if (!pacienteId) return;
    if (!auth.token) {
      // Sin servidor: el dibujo muestra los mismos hallazgos que la ficha.
      const datos = demoDatos || estadosAppAHtml(demoEstados || {});
      postToIframe({ type: "dento-odontograma-hydrate", fase: capa, datos });
      hydrated.current = true;
      lastJson.current = JSON.stringify(datos);
      lastDemo.current = JSON.stringify(datos);
      setTimeout(measureIframe, 80);
      return;
    }
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
  }, [pacienteId, capa, postToIframe, measureIframe, demoEstados]);

  const datosDoc = useDatosImpresion();
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
    postToIframe({ type: "dento-odontograma-profesional", profesional: profesionalDoc(medicoTratante) });
    // Membrete de los documentos del odontograma (resumen y plan de inversión): los
    // mismos datos de empresa y de la sede activa que el resto del sistema.
    postToIframe({
      type: "dento-odontograma-clinica",
      clinica: {
        nombre: datosDoc.empresa.nombre, razon: datosDoc.empresa.razonSocial, ruc: datosDoc.empresa.ruc,
        web: datosDoc.empresa.web, logo: datosDoc.empresa.logo, bajada: datosDoc.empresa.bajada,
        sede: datosDoc.sede.nombre, dir: datosDoc.sede.direccion, tel: datosDoc.sede.telefonos,
        horario: datosDoc.sede.horario, correo: datosDoc.sede.correo, serie: datosDoc.sede.serieDocumento,
      },
    });
  }, [postToIframe, zoom, pacienteNombre, pacienteDni, pacienteEdad, pacienteHc, pacienteSede, pacienteId, datosDoc, medicoTratante]);

  const persistir = useCallback(async (payload) => {
    if (!editable || !pacienteId || !payload?.datos || !auth.token) return;
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
        if (!auth.token && typeof onDemoCambio === "function" && d.datos && hydrated.current) {
          const js = JSON.stringify(d.datos);
          if (js !== lastDemo.current) { lastDemo.current = js; onDemoCambio(d.datos, d.fase || capa); }
        }
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
  }, [persistir, onNavTab, onFaseChange, measureIframe, onDemoCambio, capa]);

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
    injectarEstiloSistema(iframeRef.current?.contentDocument);
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
  const seamless = true; // integrado en la página: sin marco propio

  return (
    <div style={{ display: "grid", gap: 0 }}>
      <div style={{ position: "relative", minHeight: frameReady ? 0 : (height != null ? height : 480) }}>
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
              background: "var(--dc-surface)",
              color: "var(--dc-ink-500)",
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
            background: "var(--dc-surface)",
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
