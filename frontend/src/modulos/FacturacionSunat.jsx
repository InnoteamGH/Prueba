/* Facturación electrónica (SUNAT) — pestaña de Caja.
   El sistema no habla directo con SUNAT: emite el comprobante y lo manda a un proveedor
   autorizado (OSE/PSE: Nubefact, Efact, Bizlinks…), que lo firma, lo envía y devuelve
   la constancia de SUNAT (CDR). Aquí se ve el estado de cada comprobante, lo que falta
   atender, el resumen diario de boletas, las series por sede y la conexión.
   Sin sesión es una vista previa con comprobantes simulados: no se envía nada. */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Clock, Cloud, FileCheck2, FileText, FileX2, KeyRound, Link2, PlugZap, Receipt, RefreshCw, Send, Settings, ShieldCheck, Smartphone, Undo2, Wallet } from "lucide-react";
import api, { auth } from "../api/client";
import { Btn, DataTable, Modal, Select, fmt, hoy, nombreSede } from "../comun";
import { datosImpresion } from "../util/membrete";

const CLAVE_CFG = "dc_data_v1_sunat_cfg";
const CLAVE_EST = "dc_data_v1_sunat_estados";
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* almacenamiento lleno o bloqueado */ } };

export const PROVEEDORES = [
  { id: "nubefact", n: "Nubefact", d: "OSE y PSE. API REST con ruta y token." },
  { id: "efact", n: "Efact", d: "OSE. Integración por API o archivo." },
  { id: "bizlinks", n: "Bizlinks", d: "OSE para alto volumen." },
  { id: "otro", n: "Otro OSE / PSE", d: "Cualquier proveedor autorizado por SUNAT." },
];
const AFECTACION = [
  { v: "gravado", l: "Gravado (IGV 18 %)" },
  { v: "exonerado", l: "Exonerado" },
  { v: "inafecto", l: "Inafecto" },
];
const ESTADO = {
  aceptado: { l: "Aceptado", c: "is-ok", ic: CheckCircle2 },
  pendiente: { l: "Por enviar", c: "is-pend", ic: Clock },
  observado: { l: "Observado", c: "is-aviso", ic: AlertTriangle },
  rechazado: { l: "Rechazado", c: "is-mal", ic: FileX2 },
  anulado: { l: "Anulado con NC", c: "is-off", ic: Undo2 },
};
const sol = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num8 = (n) => String(n).padStart(8, "0");

const cfgDefecto = (sedes) => ({
  proveedor: "", ambiente: "pruebas", url: "", token: "", afectacion: "gravado", envioAuto: true, horaResumen: "23:00",
  series: Object.fromEntries((sedes.length ? sedes : [{ id: 1 }, { id: 2 }]).map((s, i) => [String(s.id), { boleta: `B00${i + 1}`, factura: `F00${i + 1}`, ncBoleta: `BC0${i + 1}`, ncFactura: `FC0${i + 1}` }])),
});

/* Comprobantes simulados a partir de los cobros reales de la demostración: los de días
   pasados aceptados (uno observado y uno rechazado, para ver cómo se atienden) y los de
   hoy por enviar, porque las boletas van en el resumen diario de la noche. */
function simular(pagos, cfg, overrides) {
  const orden = [...pagos].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const cont = {};
  const hoyISO = fmt(hoy);
  // Los dos comprobantes pasados más recientes salen observado y rechazado (simulado),
  // para mostrar cómo se atienden.
  const pasados = orden.map((p, i) => [p, i]).filter(([p]) => String(p.fecha).slice(0, 10) < hoyISO).map(([, i]) => i);
  const iObs = pasados[pasados.length - 2], iRech = pasados[pasados.length - 4];
  const lista = orden.map((p, i) => {
    const sede = String(p.sede ?? 1);
    const serie = (cfg.series[sede] || cfg.series[Object.keys(cfg.series)[0]] || { boleta: "B001" }).boleta;
    cont[serie] = (cont[serie] || 0) + 1;
    const total = Number(p.monto) || 0;
    const base = cfg.afectacion === "gravado" ? Math.round((total / 1.18) * 100) / 100 : total;
    let estado = String(p.fecha).slice(0, 10) >= hoyISO ? "pendiente" : "aceptado", mensaje = "";
    if (i === iObs) { estado = "observado"; mensaje = "4332 · La dirección del cliente supera los 100 caracteres. SUNAT aceptó el comprobante con observación."; }
    if (i === iRech) { estado = "rechazado"; mensaje = "2800 · El número de DNI del cliente no es válido. Corrige el dato y vuelve a enviar."; }
    const id = `${serie}-${num8(cont[serie])}`;
    return { id, tipo: "Boleta", serie, numero: cont[serie], fecha: String(p.fecha).slice(0, 10), cliente: p.paciente || "Cliente", doc: p.dni ? `DNI ${p.dni}` : "Sin documento", concepto: p.concepto || "Atención odontológica", base, igv: Math.round((total - base) * 100) / 100, total, metodo: p.metodo || "", sede, estado, mensaje, pago: p, ...(overrides[id] || {}) };
  });
  // Notas de crédito emitidas desde esta pantalla (demo).
  Object.values(overrides).filter((o) => o.nc).forEach((o) => lista.push(o.nc));
  return lista.sort((a, b) => (b.fecha + b.id).localeCompare(a.fecha + a.id));
}

export default function FacturacionSunat({ pagos = [], sedes = [], notify = () => {}, puedeConfig = false, onDatosFact = () => {}, abrirBoleta = () => {} }) {
  const conectado = !!auth.token;
  const listaSedes = sedes.length ? sedes : [{ id: 1, nombre: nombreSede(1) }, { id: 2, nombre: nombreSede(2) }];
  const [cfg, setCfg] = useState(() => ({ ...cfgDefecto(listaSedes), ...leer(CLAVE_CFG, {}) }));
  const [overrides, setOverrides] = useState(() => leer(CLAVE_EST, {}));
  const [remoto, setRemoto] = useState(null);          // { comprobantes, resumenes } o { error }
  const [filtro, setFiltro] = useState("todos");
  const [editCfg, setEditCfg] = useState(null);
  const [nc, setNc] = useState(null);
  const [probando, setProbando] = useState(false);
  useEffect(() => { guardar(CLAVE_EST, overrides); }, [overrides]);
  useEffect(() => {
    if (!conectado) return;
    Promise.all([api.sunat.config().catch(() => null), api.sunat.comprobantes().catch((e) => ({ error: e?.status || true }))])
      .then(([c, r]) => { if (c) setCfg((x) => ({ ...x, ...c })); setRemoto(r?.error ? { error: r.error } : { comprobantes: r?.comprobantes || r || [], resumenes: r?.resumenes || [] }); });
  }, [conectado]);

  const comprobantes = useMemo(() => conectado ? (remoto?.comprobantes || []) : simular(pagos, cfg, overrides), [conectado, remoto, pagos, cfg, overrides]);
  const mes = fmt(hoy).slice(0, 7);
  const delMes = comprobantes.filter((c) => c.fecha.slice(0, 7) === mes);
  const cuenta = (e) => comprobantes.filter((c) => c.estado === e).length;
  const atender = comprobantes.filter((c) => c.estado === "observado" || c.estado === "rechazado");
  const deHoy = comprobantes.filter((c) => c.fecha === fmt(hoy) && c.tipo === "Boleta");
  const conectadoProv = !!cfg.proveedor;
  const visibles = filtro === "todos" ? comprobantes : filtro === "atender" ? atender : comprobantes.filter((c) => c.estado === filtro);

  const reenviar = (c) => {
    if (conectado) { api.sunat.reenviar(c.id).then(() => notify("Reenviado al proveedor.")).catch(() => notify("No se pudo reenviar.")); return; }
    setOverrides((o) => ({ ...o, [c.id]: { ...(o[c.id] || {}), estado: "aceptado", mensaje: "Reenviado y aceptado (simulado)." } }));
    notify(`${c.id} reenviado: aceptado (simulación).`);
  };
  const emitirNc = () => {
    const c = nc.c; const motivo = (nc.motivo || "").trim();
    if (!motivo) { notify("Indica el motivo de la nota de crédito."); return; }
    if (conectado) { api.sunat.notaCredito(c.id, { motivo, tipoMotivo: nc.tipo }).then(() => { notify("Nota de crédito emitida."); setNc(null); }).catch(() => notify("No se pudo emitir la nota de crédito.")); return; }
    const serie = (cfg.series[c.sede] || { ncBoleta: "BC01" }).ncBoleta;
    const usados = Object.values(overrides).filter((o) => o.nc && o.nc.serie === serie).length;
    const id = `${serie}-${num8(usados + 1)}`;
    const doc = { id, tipo: "Nota de crédito", serie, numero: usados + 1, fecha: fmt(hoy), cliente: c.cliente, doc: c.doc, concepto: `${nc.tipo} · ref. ${c.id}: ${motivo}`, base: -c.base, igv: -c.igv, total: -c.total, metodo: "", sede: c.sede, estado: "pendiente", mensaje: "", ref: c.id };
    setOverrides((o) => ({ ...o, [c.id]: { ...(o[c.id] || {}), estado: "anulado", mensaje: `Anulado con ${id}` }, [id]: { nc: doc } }));
    notify(`Nota de crédito ${id} lista. Sale en el próximo envío (simulación).`);
    setNc(null);
  };
  const guardarCfg = () => {
    const c = editCfg;
    if (c.proveedor && !c.url.trim()) { notify("Falta la ruta (URL) que entrega el proveedor."); return; }
    if (conectado) { api.sunat.guardarConfig(c).then(() => { setCfg(c); setEditCfg(null); notify("Conexión guardada."); }).catch(() => notify("No se pudo guardar la conexión.")); return; }
    const { token, ...sinToken } = c;   // el token nunca se guarda en el navegador
    setCfg({ ...c }); guardar(CLAVE_CFG, { ...sinToken, token: "" }); setEditCfg(null);
    notify(c.proveedor ? "Conexión guardada (demostración: no se envía nada)." : "Configuración guardada.");
  };
  const probar = () => {
    setProbando(true);
    if (conectado) { api.sunat.probar(editCfg).then((r) => notify(r?.mensaje || "Conexión correcta.")).catch((e) => notify(e?.message || "El proveedor no respondió.")).finally(() => setProbando(false)); return; }
    setTimeout(() => { setProbando(false); notify(editCfg.url && editCfg.token ? "Respuesta simulada: credenciales con formato correcto." : "Completa la ruta y el token para probar."); }, 700);
  };

  const emisor = (datosImpresion() || {}).empresa || {};
  const EstadoChip = ({ e, msg }) => { const x = ESTADO[e] || ESTADO.pendiente; const I = x.ic; return <span className={`dc-fe__chip ${x.c}`} title={msg || x.l}><I size={12} strokeWidth={2.4} /> {x.l}</span>; };

  if (conectado && remoto?.error) {
    return (
      <section className="dc-fe">
        <div className="dc-fe__estado is-off">
          <span className="dc-fe__eico"><PlugZap size={22} strokeWidth={1.9} /></span>
          <div><small>Facturación electrónica</small><h3>El servidor aún no tiene este módulo</h3><p>Hace falta la integración con el proveedor OSE/PSE en el backend (ver <code>docs/requisitos-minimos.md</code>). Mientras tanto las boletas se emiten sin envío a SUNAT.</p></div>
        </div>
      </section>
    );
  }

  return (
    <section className="dc-fe" aria-label="Facturación electrónica">
      <div className={`dc-fe__estado${conectadoProv ? (cfg.ambiente === "produccion" ? " is-prod" : " is-prueba") : " is-off"}`}>
        <span className="dc-fe__eico">{conectadoProv ? <Cloud size={22} strokeWidth={1.9} /> : <PlugZap size={22} strokeWidth={1.9} />}</span>
        <div className="dc-fe__etxt">
          <small>Facturación electrónica · SUNAT</small>
          <h3>{conectadoProv ? `Conectado con ${(PROVEEDORES.find((p) => p.id === cfg.proveedor) || {}).n || "tu proveedor"}` : "Sin proveedor conectado"}</h3>
          <p>{conectadoProv
            ? (cfg.ambiente === "produccion" ? "Producción: los comprobantes tienen valor tributario." : "Ambiente de pruebas: SUNAT valida pero no tienen valor tributario.")
            : "Las boletas se emiten en el sistema pero no llegan a SUNAT. Conecta un proveedor OSE/PSE para enviarlas."}</p>
          <div className="dc-fe__pills">
            <span><Building2 size={12} strokeWidth={2.2} /> {emisor.razonSocial || emisor.nombre || "Emisor"}{emisor.ruc ? ` · RUC ${emisor.ruc}` : ""}</span>
            <span><Receipt size={12} strokeWidth={2.2} /> {(AFECTACION.find((a) => a.v === cfg.afectacion) || {}).l}</span>
            <span><Send size={12} strokeWidth={2.2} /> {cfg.envioAuto ? "Envío automático al cobrar" : "Envío manual"}</span>
          </div>
        </div>
        <div className="dc-fe__eacc">
          {puedeConfig && <button type="button" className="dc-fe__btn is-pri" onClick={() => setEditCfg({ ...cfg, token: "" })}><Settings size={15} strokeWidth={2} /> {conectadoProv ? "Configurar conexión" : "Conectar proveedor"}</button>}
          {puedeConfig && <button type="button" className="dc-fe__btn" onClick={onDatosFact}><FileText size={15} strokeWidth={2} /> Datos del emisor</button>}
        </div>
      </div>

      {!conectado && <div className="fm-aviso-edad is-info dc-fe__demo"><ShieldCheck size={15} strokeWidth={2} /><span><b>Vista previa con comprobantes simulados</b> a partir de los cobros de la demostración. Nada se envía a SUNAT; así se verá cuando el backend esté conectado al proveedor.</span></div>}

      <ol className="dc-fe__flujo" aria-label="Cómo viaja un comprobante">
        {[[Wallet, "Cobro en caja", "Recepción cobra y elige boleta o factura"], [Receipt, "Comprobante", "Serie de la sede y número correlativo"], [KeyRound, "Firma y envío", "El proveedor OSE/PSE lo firma y lo manda"], [FileCheck2, "Respuesta SUNAT", "Aceptado, observado o rechazado (CDR)"], [Smartphone, "Al paciente", "PDF y enlace por WhatsApp o correo"]].map(([I, t, d], i) => (
          <li key={t}><span><I size={16} strokeWidth={2} /></span><div><b>{i + 1}. {t}</b><small>{d}</small></div>{i < 4 && <ArrowRight size={14} strokeWidth={2} className="dc-fe__flecha" aria-hidden="true" />}</li>
        ))}
      </ol>

      <div className="dc-fe__kpis" role="tablist" aria-label="Filtrar comprobantes">
        {[["todos", "Comprobantes emitidos", comprobantes.filter((c) => c.total > 0).length, `${sol(comprobantes.reduce((a, c) => a + c.total, 0))} · ${delMes.length} este mes`, Receipt],
          ["aceptado", "Aceptados por SUNAT", cuenta("aceptado"), "con constancia (CDR)", CheckCircle2],
          ["pendiente", "Por enviar", cuenta("pendiente"), deHoy.length ? `${deHoy.length} en el resumen de hoy` : cuenta("pendiente") ? "salen en el próximo envío" : "nada pendiente", Clock],
          ["atender", "Por atender", atender.length, atender.length ? "observados o rechazados" : "todo en orden", AlertTriangle]].map(([k, l, n, sub, I]) => (
          <button key={k} type="button" role="tab" aria-selected={filtro === k} className={`dc-fe__kpi is-${k}${filtro === k ? " is-on" : ""}`} onClick={() => setFiltro(filtro === k && k !== "todos" ? "todos" : k)}>
            <span><I size={17} strokeWidth={2} /></span><div><small>{l}</small><b>{n}</b><em>{sub}</em></div>
          </button>
        ))}
      </div>

      <div className="dc-fe__grid">
        <DataTable titulo={filtro === "todos" ? "Comprobantes" : filtro === "atender" ? "Comprobantes por atender" : `Comprobantes · ${(ESTADO[filtro] || {}).l || ""}`} sub="comprobantes" exportTitulo="Comprobantes electrónicos" minWidth={940} rows={visibles} defaultSort={{ key: "fecha", dir: "desc" }}
          empty={<div className="dc-fe__vacio"><Receipt size={22} strokeWidth={1.75} /><b>Sin comprobantes</b><span>Los cobros de caja generan aquí su boleta o factura.</span></div>}
          cols={[
            { key: "fecha", label: "Fecha", w: "96px", get: (c) => c.fecha, cell: (c) => <span className="dc-tp__sub">{c.fecha.split("-").reverse().join("/")}</span> },
            { key: "id", label: "Comprobante", w: "minmax(140px,1fr)", get: (c) => `${c.id} ${c.tipo}`, cell: (c) => <span className="dc-fe__num"><b>{c.id}</b><small>{c.tipo}{c.ref ? ` · ref. ${c.ref}` : ""}</small></span>, exportar: (c) => `${c.tipo} ${c.id}` },
            { key: "cliente", label: "Cliente", w: "minmax(160px,1.3fr)", get: (c) => `${c.cliente} ${c.doc}`, cell: (c) => <span className="dc-fe__num"><b>{c.cliente}</b><small>{c.doc}</small></span>, exportar: (c) => `${c.cliente} (${c.doc})` },
            { key: "base", label: "Base", w: "96px", a: "right", get: (c) => c.base.toFixed(2), sortVal: (c) => c.base, cell: (c) => <span className="dc-tp__num">{sol(c.base)}</span>, exportar: (c) => sol(c.base) },
            { key: "igv", label: "IGV", w: "86px", a: "right", get: (c) => c.igv.toFixed(2), sortVal: (c) => c.igv, cell: (c) => <span className="dc-tp__num">{sol(c.igv)}</span>, exportar: (c) => sol(c.igv) },
            { key: "total", label: "Total", w: "100px", a: "right", get: (c) => c.total.toFixed(2), sortVal: (c) => c.total, cell: (c) => <span className="dc-tp__num"><b>{sol(c.total)}</b></span>, exportar: (c) => sol(c.total) },
            { key: "estado", label: "Estado SUNAT", w: "136px", get: (c) => (ESTADO[c.estado] || {}).l, cell: (c) => <EstadoChip e={c.estado} msg={c.mensaje} /> },
            { key: "acc", label: "", w: "176px", a: "right", noFilter: true, noSort: true, sticky: true, cell: (c) => (
              <span className="dc-fe__acc">
                <button type="button" title="Ver comprobante" aria-label={`Ver ${c.id}`} onClick={(e) => { e.stopPropagation(); abrirBoleta({ ...(c.pago || {}), paciente: c.cliente, comprobanteSerie: c.serie, comprobanteNumero: c.numero, fecha: c.fecha, monto: Math.abs(c.total), concepto: c.concepto, metodo: c.metodo }); }}><FileText size={14} strokeWidth={2} /></button>
                <button type="button" title={conectado ? "Descargar XML firmado" : "XML: disponible al conectar el proveedor"} aria-label="XML" disabled={!conectado}><span className="dc-fe__tag">XML</span></button>
                <button type="button" title={conectado ? "Descargar constancia de SUNAT" : "CDR: disponible al conectar el proveedor"} aria-label="CDR" disabled={!conectado || c.estado !== "aceptado"}><span className="dc-fe__tag">CDR</span></button>
                {(c.estado === "rechazado" || c.estado === "observado" || c.estado === "pendiente") && <button type="button" title="Reenviar" aria-label={`Reenviar ${c.id}`} onClick={(e) => { e.stopPropagation(); reenviar(c); }}><RefreshCw size={14} strokeWidth={2} /></button>}
                {c.estado === "aceptado" && c.total > 0 && <button type="button" title="Anular con nota de crédito" aria-label={`Nota de crédito para ${c.id}`} onClick={(e) => { e.stopPropagation(); setNc({ c, tipo: "Anulación de la operación", motivo: "" }); }}><Undo2 size={14} strokeWidth={2} /></button>}
              </span>
            ) },
          ]} />

        <aside className="dc-fe__lado">
          <div className="dc-fe__card">
            <h4><AlertTriangle size={15} strokeWidth={2} /> Por atender <em>{atender.length}</em></h4>
            {atender.length === 0 ? <p className="dc-fe__ok"><CheckCircle2 size={15} strokeWidth={2} /> Ningún comprobante observado ni rechazado.</p>
              : atender.slice(0, 4).map((c) => (
                <div key={c.id} className={`dc-fe__aviso is-${c.estado}`}>
                  <div><b>{c.id}</b> <EstadoChip e={c.estado} /></div>
                  <p>{c.mensaje}</p>
                  <small>{c.cliente} · {sol(c.total)}</small>
                  {c.estado === "rechazado" ? <button type="button" onClick={() => reenviar(c)}><RefreshCw size={13} strokeWidth={2} /> Corregir y reenviar</button>
                    : <button type="button" onClick={() => reenviar(c)}><CheckCircle2 size={13} strokeWidth={2} /> Marcar revisado</button>}
                </div>
              ))}
          </div>
          <div className="dc-fe__card">
            <h4><Clock size={15} strokeWidth={2} /> Resumen diario de boletas</h4>
            <p className="dc-fe__txt">Las boletas del día viajan juntas a SUNAT en un resumen. Plazo: hasta 7 días; aquí se envía cada noche.</p>
            <ul className="dc-fe__res">
              <li><span>Hoy · {fmt(hoy).split("-").reverse().join("/")}</span><b>{deHoy.length} {deHoy.length === 1 ? "boleta" : "boletas"} · {sol(deHoy.reduce((a, c) => a + c.total, 0))}</b><em className="is-pend">Sale a las {cfg.horaResumen}</em></li>
              {[1, 2].map((d) => { const f = new Date(hoy); f.setDate(f.getDate() - d); const iso = fmt(f); const bs = comprobantes.filter((c) => c.fecha === iso && c.tipo === "Boleta"); return <li key={d}><span>{iso.split("-").reverse().join("/")}</span><b>{bs.length} {bs.length === 1 ? "boleta" : "boletas"} · {sol(bs.reduce((a, c) => a + c.total, 0))}</b><em className={bs.length ? "is-ok" : ""}>{bs.length ? "Aceptado" : "Sin boletas"}</em></li>; })}
            </ul>
          </div>
          <div className="dc-fe__card">
            <h4><Receipt size={15} strokeWidth={2} /> Series por sede</h4>
            <div className="dc-fe__series">
              {listaSedes.map((s) => { const x = cfg.series[String(s.id)] || {}; return (
                <div key={s.id}><b>{s.nombre}</b><span><i>Boleta</i>{x.boleta || "—"}</span><span><i>Factura</i>{x.factura || "—"}</span><span><i>NC</i>{x.ncBoleta || "—"}</span></div>
              ); })}
            </div>
          </div>
        </aside>
      </div>

      {nc && (
        <Modal icon={<Undo2 size={20} strokeWidth={1.75} />} tone="var(--dc-red)" titulo="Nota de crédito" sub={`Anula o corrige ${nc.c.id} · ${sol(nc.c.total)}`} size="corto" onClose={() => setNc(null)}
          footer={<><Btn small kind="ghost" onClick={() => setNc(null)}>Volver</Btn><Btn small kind="red" onClick={emitirNc}><Undo2 size={14} strokeWidth={2} /> Emitir nota de crédito</Btn></>}>
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--dc-ink-700)", lineHeight: 1.5 }}>Un comprobante aceptado por SUNAT no se borra: se anula o corrige con una nota de crédito que lo referencia. La nota sale con la serie de notas de la sede.</p>
            <label className="dc-fe__lbl">Tipo<Select value={nc.tipo} onChange={(v) => setNc({ ...nc, tipo: v })} options={["Anulación de la operación", "Corrección por error en el monto", "Devolución total", "Descuento posterior"].map((x) => ({ value: x, label: x }))} /></label>
            <label className="dc-fe__lbl">Motivo (obligatorio)<input className="dc-premium-inp" value={nc.motivo} onChange={(e) => setNc({ ...nc, motivo: e.target.value })} placeholder="Ej. cobro duplicado del 28/09" /></label>
          </div>
        </Modal>
      )}

      {editCfg && (
        <Modal icon={<Link2 size={20} strokeWidth={1.75} />} titulo="Conexión con SUNAT" sub="Proveedor OSE/PSE, ambiente, IGV y series" onClose={() => setEditCfg(null)} maxW={640}
          footer={<><Btn small kind="ghost" onClick={probar} disabled={probando || !editCfg.proveedor}><PlugZap size={14} strokeWidth={2} /> {probando ? "Probando…" : "Probar conexión"}</Btn><Btn small onClick={guardarCfg}><CheckCircle2 size={14} strokeWidth={2} /> Guardar</Btn></>}>
          <div className="dc-fe__form">
            <div className="dc-msec">Proveedor</div>
            <div className="dc-fe__provs" role="radiogroup" aria-label="Proveedor">
              {PROVEEDORES.map((p) => <button key={p.id} type="button" role="radio" aria-checked={editCfg.proveedor === p.id} className={editCfg.proveedor === p.id ? "is-on" : ""} onClick={() => setEditCfg({ ...editCfg, proveedor: p.id })}><b>{p.n}</b><small>{p.d}</small></button>)}
            </div>
            <div className="dc-fe__duo">
              <label className="dc-fe__lbl">Ambiente
                <div className="dc-fe__seg">{[["pruebas", "Pruebas"], ["produccion", "Producción"]].map(([v, l]) => <button key={v} type="button" className={editCfg.ambiente === v ? "is-on" : ""} onClick={() => setEditCfg({ ...editCfg, ambiente: v })}>{l}</button>)}</div>
              </label>
              <label className="dc-fe__lbl">Afectación del IGV<Select value={editCfg.afectacion} onChange={(v) => setEditCfg({ ...editCfg, afectacion: v })} options={AFECTACION.map((a) => ({ value: a.v, label: a.l }))} /></label>
            </div>
            <p className="dc-fe__nota">Confírmalo con el contador: algunos servicios de salud tienen tratamiento especial de IGV.</p>
            <label className="dc-fe__lbl">Ruta (URL) de la API<input className="dc-premium-inp" value={editCfg.url} onChange={(e) => setEditCfg({ ...editCfg, url: e.target.value })} placeholder="https://api.proveedor.pe/v1/…" /></label>
            <label className="dc-fe__lbl">Token<input className="dc-premium-inp" type="password" autoComplete="off" value={editCfg.token} onChange={(e) => setEditCfg({ ...editCfg, token: e.target.value })} placeholder={conectado ? "Se guarda cifrado en el servidor" : "No se guarda en la demostración"} /></label>
            <div className="dc-fe__duo">
              <label className="dc-sil__chk"><input type="checkbox" checked={editCfg.envioAuto} onChange={(e) => setEditCfg({ ...editCfg, envioAuto: e.target.checked })} /><span><b>Enviar al cobrar</b><small>Facturas al instante; boletas en el resumen diario.</small></span></label>
              <label className="dc-fe__lbl">Hora del resumen diario<input className="dc-premium-inp" type="time" value={editCfg.horaResumen} onChange={(e) => setEditCfg({ ...editCfg, horaResumen: e.target.value })} /></label>
            </div>
            <div className="dc-msec">Series por sede</div>
            <div className="dc-fe__tseries">
              <div className="is-cab"><span>Sede</span><span>Boleta</span><span>Factura</span><span>NC boleta</span><span>NC factura</span></div>
              {listaSedes.map((s) => { const k = String(s.id); const x = editCfg.series[k] || {}; const setS = (campo, v) => setEditCfg({ ...editCfg, series: { ...editCfg.series, [k]: { ...x, [campo]: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) } } }); return (
                <div key={k}><span>{s.nombre}</span>{["boleta", "factura", "ncBoleta", "ncFactura"].map((c) => <input key={c} className="dc-premium-inp" aria-label={`${c} ${s.nombre}`} value={x[c] || ""} onChange={(e) => setS(c, e.target.value)} />)}</div>
              ); })}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
