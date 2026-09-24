import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import confDefault from "../util/planInversionConf.js";
import {
  SUELTOS_PARTIDA,
  resolverLineas,
  calcularTotales,
  rotuloPieza,
  necesitaSelectorMaxilar,
  opcionesMaxilar,
  formatearFDI,
} from "../util/planInversion.js";
import {
  partirLineasEnHojas,
  totalPaginasDocumento,
  etiquetaPie,
  paginasDesdeAlturaMm,
} from "../util/planInversionPaginacion.js";
import { altAnexoOdontograma } from "../util/odontogramaAnexo.js";

const CONDICIONES_FALLBACK = [
  ["Alcance", "Esta propuesta sale de los hallazgos marcados en mal estado en el odontograma del paciente, más los servicios añadidos en recepción. No incluye lo que ya está ejecutado ni las observaciones que no requieren tratamiento."],
  ["Vigencia", "Válida por {diasVigencia} días contados desde la fecha de emisión."],
  ["Variación", "Los importes son los del catálogo vigente y pueden variar si al iniciar el tratamiento cambia el diagnóstico."],
  ["Aceptación", "No constituye un presupuesto aceptado hasta que el paciente firme su conformidad al pie de este documento."],
  ["Pago", "La forma de pago y las cuotas se acuerdan en recepción y quedan registradas en el estado de cuenta del paciente."],
  ["Tratamientos pagados", "Los importes pagados por un tratamiento no son objeto de devolución en efectivo. Si el tratamiento no llega a realizarse o el paciente decide cambiarlo, el importe permanece a su favor como saldo en su estado de cuenta y puede aplicarse a cualquier otro servicio. Quedan excluidos los casos en que el cambio se deba a causa imputable a la clínica."],
];

function textoCond(txt, dias) {
  return String(txt || "").replace(/\{diasVigencia\}/g, String(dias ?? 30));
}

function Pie({ n, total, empresa }) {
  return (
    <div className="doc-pie">
      <span>{empresa.nombreParaDocumento || empresa.nombreComercial} – RUC {empresa.ruc}</span>
      <span data-pie-pagina>{etiquetaPie(n, total)}</span>
    </div>
  );
}

/**
 * Plan de inversión E3: hojas A4 explícitas + pie «Página N de T» (A-25).
 */
export default function PlanInversionDocumento({
  paciente = {},
  hallazgos = [],
  conf: confProp,
  tomaHash = null,
  capa = "inicial",
  pacienteId = null,
  sedeId = null,
  anexoDataUrl = null,
  onClose,
}) {
  const [confApi, setConfApi] = useState(null);
  const conf = confProp || confApi || confDefault;
  const sedeOrigen = conf.sedes?.[0]?.origenSedeDocumento || (sedeId ? "toma_o_activa" : "fallback");
  const sede = (conf.sedes && conf.sedes[0]) || {};
  const doc = conf.documento || {};
  const empresa = conf.empresa || {};
  const dias = doc.diasVigencia ?? 30;
  const condiciones = (conf.textos?.condiciones?.length === 6
    ? conf.textos.condiciones
    : CONDICIONES_FALLBACK);

  const [sueltosUI, setSueltosUI] = useState([{ cod: 26, pz: null, max: null }]);
  const [codAdd, setCodAdd] = useState(26);
  const [maxAdd, setMaxAdd] = useState("sup");
  const [piezaAdd, setPiezaAdd] = useState("");
  const [aviso, setAviso] = useState("");
  const [planRemote, setPlanRemote] = useState(null);
  const [tomaHashApi, setTomaHashApi] = useState(null);
  const tomaHashEfectivo = tomaHash ?? tomaHashApi;
  const scrollRef = useRef(null);
  const [anexoLive, setAnexoLive] = useState(anexoDataUrl);

  useEffect(() => {
    setAnexoLive(anexoDataUrl || null);
  }, [anexoDataUrl]);

  useEffect(() => {
    if (confProp) return;
    api.clinica?.impresion?.(sedeId || undefined)
      .then((c) => { if (c && typeof c === "object") setConfApi(c); })
      .catch(() => {});
  }, [confProp, sedeId]);

  useEffect(() => {
    if (tomaHash != null || !pacienteId || !api.odontograma?.tomaHash) return;
    let cancel = false;
    api.odontograma.tomaHash(pacienteId, capa)
      .then((r) => { if (!cancel) setTomaHashApi(r?.tomaHash ?? null); })
      .catch(() => { if (!cancel) setTomaHashApi(null); });
    return () => { cancel = true; };
  }, [pacienteId, capa, tomaHash]);

  const servicioAdd = SUELTOS_PARTIDA.find((s) => s.cod === Number(codAdd));

  const { lineas, descartes, totales } = useMemo(() => {
    const sueltos = sueltosUI.map((s) => [s.pz, s.cod, s.max]);
    const { lineas: L, descartes: D } = resolverLineas(hallazgos, sueltos);
    const totales = calcularTotales(L, doc.descuento || { activo: false });
    return { lineas: L, descartes: D, totales };
  }, [hallazgos, sueltosUI, doc.descuento]);

  const hojasPlan = useMemo(() => partirLineasEnHojas(lineas), [lineas]);
  const mostrarOdo = doc.mostrarOdontograma !== false;
  const totalPaginas = totalPaginasDocumento({
    numHojasPlan: hojasPlan.length,
    conAnexo: mostrarOdo,
  });

  /** E3 §7: medir altura real de cada hoja en beforeprint y fijar «Página N de T». */
  useEffect(() => {
    const medirYActualizarPies = () => {
      const root = scrollRef.current;
      if (!root) return;
      const hojas = [...root.querySelectorAll(".hoja")];
      if (!hojas.length) return;
      const pxPorMm = 96 / 25.4;
      const porHoja = hojas.map((el) => {
        const mm = el.getBoundingClientRect().height / pxPorMm;
        return paginasDesdeAlturaMm(mm);
      });
      const total = Math.max(1, porHoja.reduce((a, b) => a + b, 0));
      let acc = 0;
      hojas.forEach((el, i) => {
        acc += porHoja[i];
        const pie = el.querySelector("[data-pie-pagina]");
        if (pie) pie.textContent = etiquetaPie(acc, total);
        el.setAttribute("data-pagina", String(acc));
        el.setAttribute("data-paginas-totales", String(total));
      });
    };
    window.addEventListener("beforeprint", medirYActualizarPies);
    return () => window.removeEventListener("beforeprint", medirYActualizarPies);
  }, [hojasPlan, totalPaginas, lineas]);

  const addSuelto = () => {
    const s = servicioAdd;
    if (!s) return;
    if (s.amb === "pieza" && !piezaAdd) {
      setAviso("Elige primero la pieza en el odontograma.");
      return;
    }
    setAviso("");
    const pz = s.amb === "pieza" ? Number(piezaAdd) : null;
    const max = s.amb === "maxilar" ? (s.fijo || maxAdd) : null;
    setSueltosUI((u) => [...u, { cod: s.cod, pz, max }]);
  };

  const mostrarRNE = !!doc.mostrarRNE;
  const correo = sede.correo || null;
  const igvNota = conf.documento?.igvNota ?? null;

  const registrarPlan = async () => {
    if (!pacienteId || !api.planes?.crear) return;
    try {
      const r = await api.planes.crear({
        pacienteId,
        capa,
        tomaHash: tomaHashEfectivo,
        sueltos: sueltosUI,
        hallazgos,
      });
      setPlanRemote(r);
      setAviso("");
    } catch (e) {
      const st = e?.status ?? e?._httpStatus;
      const msg = e?.message || String(e);
      if (st === 409 || /409/.test(msg)) setAviso("La toma del odontograma cambió (409). Recarga y vuelve a generar.");
      else if (st === 422 || /422/.test(msg)) setAviso("Hay un servicio sin precio (422).");
      else setAviso("No se pudo registrar el plan en servidor.");
    }
  };

  return (
    <div className="plan-inv-root" style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", padding: 16 }}>
      <style>{`
        .plan-inv-scroll { width:min(920px,96vw); max-height:92vh; overflow:auto; }
        .plan-inv-toolbar { display:flex; gap:8px; justify-content:flex-end; padding:10px 14px; border-bottom:1px solid #e5e2dc; background:#F4F1EA; position:sticky; top:0; z-index:2; border-radius:12px 12px 0 0; }
        .hoja { position:relative; background:#fff; color:#1B1614; width:210mm; max-width:100%; min-height:294mm; margin:0 auto 16px; padding:14mm 14mm 18mm; box-sizing:border-box; box-shadow:0 8px 28px rgba(0,0,0,.18); border-radius:4px; page-break-after:always; }
        .hoja:last-child { page-break-after:auto; }
        .hoja table { width:100%; border-collapse:collapse; font-family:system-ui,sans-serif; font-size:13px; }
        .hoja th { background:#B7AEA2; color:#1B1614; text-align:left; padding:8px 10px; }
        .hoja td { padding:8px 10px; border-bottom:1px solid #e8e4de; }
        .hoja td.pieza { text-align:center; font-weight:700; white-space:nowrap; }
        .hoja td.imp, .hoja th.imp { text-align:right; }
        .plan-inv-muted { color:#6b6560; font-size:12px; font-family:system-ui,sans-serif; }
        .doc-pie { position:absolute; left:14mm; right:14mm; bottom:5mm; display:flex; justify-content:space-between; font-family:system-ui,sans-serif; font-size:11px; color:#6b6560; border-top:1px solid #e8e4de; padding-top:6px; }
        .plan-inv-anexo img { width:100%; max-width:180mm; height:auto; display:block; margin:12px auto; }
        @page { size: A4; margin: 0; }
        @media print {
          .plan-inv-root { position:static; background:#fff; padding:0; display:block; }
          .plan-inv-toolbar, .plan-inv-no-print { display:none !important; }
          .plan-inv-scroll { max-height:none; overflow:visible; width:auto; }
          .hoja { box-shadow:none; margin:0; border-radius:0; width:auto; }
        }
      `}</style>
      <div className="plan-inv-scroll" ref={scrollRef} role="dialog" aria-label="Plan de inversión">
        <div className="plan-inv-toolbar plan-inv-no-print">
          {pacienteId && <button type="button" onClick={registrarPlan} style={btnGhost}>Registrar en API</button>}
          <button type="button" onClick={() => {
            if (mostrarOdo && !anexoLive) {
              setAviso("Falta el anexo del odontograma de este paciente. Ábrelo desde la vista Anatómico e inténtalo de nuevo.");
              return;
            }
            window.print();
          }} style={btnPrimary}>Imprimir / PDF</button>
          <button type="button" onClick={onClose} style={btnGhost}>Cerrar</button>
        </div>

        <div className="plan-inv-no-print" style={{ margin: "12px 16px", padding: 12, background: "#F4F1EA", borderRadius: 8, fontFamily: "system-ui,sans-serif", fontSize: 13 }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Añadir servicio suelto</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <select value={codAdd} onChange={(e) => setCodAdd(Number(e.target.value))} style={inp}>
              {SUELTOS_PARTIDA.map((s) => (
                <option key={s.cod} value={s.cod}>
                  {s.cod} – {s.nom}
                  {s.amb === "pieza" ? " – sobre la pieza elegida" : ""}
                  {s.amb === "maxilar" && !s.fijo ? " – por maxilar" : ""}
                  {s.fijo === "ambos" ? " – ambos maxilares" : ""}
                </option>
              ))}
            </select>
            {servicioAdd?.amb === "pieza" && (
              <input placeholder="Pieza (ej. 16)" value={piezaAdd} onChange={(e) => setPiezaAdd(e.target.value)} style={{ ...inp, width: 100 }} />
            )}
            {necesitaSelectorMaxilar(servicioAdd) && (
              <select value={maxAdd} onChange={(e) => setMaxAdd(e.target.value)} style={inp}>
                {opcionesMaxilar().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <button type="button" onClick={addSuelto} style={btnPrimary}>Añadir</button>
          </div>
          {aviso && <div style={{ color: "#b45309", marginTop: 6 }}>{aviso}</div>}
          {planRemote?.numeroDocumento && (
            <div style={{ marginTop: 6, color: "#166534" }}>Documento {planRemote.numeroDocumento} – {totalPaginas} páginas</div>
          )}
          {descartes.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <b>Aviso interno:</b>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {descartes.map((d, i) => (
                  <li key={i}>{formatearFDI(d.pz) || "—"} – {d.h}: {d.motivo}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {hojasPlan.map((chunk, hi) => {
          const pageN = hi + 1;
          const esUltimaPlan = hi === hojasPlan.length - 1;
          return (
            <section className="hoja" key={`plan-${hi}`} data-pagina={pageN} data-paginas-totales={totalPaginas}>
              {hi === 0 && (
                <>
                  <header style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 16, fontFamily: "Georgia, serif" }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 600 }}>{empresa.nombreParaDocumento || empresa.nombreComercial || "Clínica"}</div>
                      <div className="plan-inv-muted">RUC {empresa.ruc}</div>
                      {empresa.web && <div className="plan-inv-muted">{empresa.web}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{doc.titulo || "PLAN DE INVERSIÓN"}</div>
                      {planRemote?.numeroDocumento && <div className="plan-inv-muted">{planRemote.numeroDocumento}</div>}
                      <div className="plan-inv-muted">{sede.nombre}</div>
                      <div className="plan-inv-muted">{sede.direccion}</div>
                      <div className="plan-inv-muted">{sede.telefonos}</div>
                      {correo ? <div className="plan-inv-muted">{correo}</div> : null}
                    </div>
                  </header>
                  <section style={{ marginBottom: 14, fontFamily: "system-ui,sans-serif", fontSize: 13 }}>
                    <div><b>Paciente:</b> {paciente.nombre || "—"}</div>
                    {paciente.documento && <div><b>Documento:</b> {paciente.documento}</div>}
                    {mostrarRNE && paciente.rne ? <div><b>RNE:</b> {paciente.rne}</div> : null}
                  </section>
                </>
              )}

              <table>
                <thead>
                  <tr>
                    <th style={{ width: 72 }}>Pieza</th>
                    <th>Tratamiento</th>
                    <th style={{ width: 48 }}>Cant.</th>
                    <th className="imp" style={{ width: 88 }}>P. unit.</th>
                    <th className="imp" style={{ width: 96 }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((l, i) => (
                    <tr key={`${l.cod}-${l.pz}-${l.max}-${i}`}>
                      <td className="pieza">{rotuloPieza(l)}</td>
                      <td>{l.nom}</td>
                      <td>{l.cant}</td>
                      <td className="imp">S/ {Number(l.v).toFixed(2)}</td>
                      <td className="imp">S/ {(Number(l.v) * Number(l.cant)).toFixed(2)}</td>
                    </tr>
                  ))}
                  {chunk.length === 0 && (
                    <tr><td colSpan={5} style={{ color: "#6b6560" }}>Sin líneas de tratamiento.</td></tr>
                  )}
                </tbody>
              </table>

              {esUltimaPlan && (
                <>
                  <div style={{ marginTop: 14, textAlign: "right", fontFamily: "system-ui,sans-serif", fontSize: 14 }}>
                    <div>Subtotal: <b>S/ {totales.subtotal.toFixed(2)}</b></div>
                    {doc.descuento?.activo ? <div>Descuento: <b>− S/ {totales.descuento.toFixed(2)}</b></div> : null}
                    <div style={{ fontSize: 18, marginTop: 4 }}>Total: <b>S/ {totales.total.toFixed(2)}</b></div>
                    {igvNota ? <div className="plan-inv-muted">{igvNota}</div> : null}
                  </div>
                  <section style={{ marginTop: 22 }}>
                    <h3 style={{ fontSize: 14, fontFamily: "system-ui,sans-serif" }}>Condiciones</h3>
                    <ol style={{ fontFamily: "system-ui,sans-serif", fontSize: 12, lineHeight: 1.45, paddingLeft: 18 }}>
                      {condiciones.map(([tit, txt], i) => (
                        <li key={i} style={{ marginBottom: 8 }}><b>{tit}.</b> {textoCond(txt, dias)}</li>
                      ))}
                    </ol>
                  </section>
                  <footer style={{ marginTop: 36, display: "flex", justifyContent: "space-between", gap: 24, fontFamily: "system-ui,sans-serif", fontSize: 12 }}>
                    <div style={{ flex: 1, borderTop: "1px solid #1B1614", paddingTop: 8 }}>Firma del paciente</div>
                    <div style={{ flex: 1, borderTop: "1px solid #1B1614", paddingTop: 8 }}>Firma del profesional</div>
                  </footer>
                </>
              )}
              <Pie n={pageN} total={totalPaginas} empresa={empresa} />
            </section>
          );
        })}

        {mostrarOdo && (
          <section className="hoja plan-inv-anexo" data-pagina={totalPaginas} data-paginas-totales={totalPaginas}>
            <h3 style={{ fontSize: 14, fontFamily: "system-ui,sans-serif" }}>Anexo – Odontograma</h3>
            {anexoLive ? (
              <img
                src={anexoLive}
                alt={altAnexoOdontograma(paciente, capa)}
              />
            ) : (
              <p className="plan-inv-muted" style={{ marginTop: 24 }}>
                Anexo del paciente pendiente: abre la vista Anatómico con este paciente para generar el odontograma de la toma
                (no se imprime una imagen genérica).
              </p>
            )}
            <p className="plan-inv-muted" style={{ marginTop: 8 }}>
              Sede del documento: {sede.nombre || "—"}
              {sede.origenSedeDocumento || sedeOrigen ? ` – origen ${sede.origenSedeDocumento || sedeOrigen}` : ""}
            </p>
            <Pie n={totalPaginas} total={totalPaginas} empresa={empresa} />
          </section>
        )}
      </div>
    </div>
  );
}

const btnPrimary = { padding: "8px 14px", borderRadius: 8, border: "none", background: "#1B1614", color: "#fff", fontWeight: 500, cursor: "pointer", fontSize: 13 };
const btnGhost = { padding: "8px 14px", borderRadius: 8, border: "1px solid #cfc8be", background: "#fff", cursor: "pointer", fontSize: 13 };
const inp = { padding: "6px 10px", borderRadius: 6, border: "1px solid #cfc8be", fontSize: 13 };
