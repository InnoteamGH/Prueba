/* Facturación electrónica (SUNAT).
   - FacturacionSunat (Caja › Facturación): lo que necesita quien cobra — la lista de
     comprobantes (boletas, facturas y notas de crédito, en soles o dólares), su estado
     ante SUNAT y qué hacer con los observados o rechazados.
   - ConexionSunat (Integraciones, para TI): proveedor OSE/PSE, ambiente, credenciales,
     IGV, series por sede y resumen diario. Lo técnico no se muestra en Caja.
   El sistema no habla directo con SUNAT: emite el comprobante y lo manda al proveedor,
   que lo firma, lo envía y devuelve la constancia (CDR).
   Sin sesión son comprobantes de ejemplo armados con los cobros de la demostración. */
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Cloud, FileCheck2, FileText, FileX2, KeyRound, Link2, PlugZap, Receipt, RefreshCw, Smartphone, Undo2, Wallet } from "lucide-react";
import api, { auth } from "../api/client";
import { BotonExportar, Btn, DataTable, MenuAcciones, Modal, SEDES, Select, fmt, hoy, mismaSede, nombreSede } from "../comun";
import { datosImpresion } from "../util/membrete";
import { fijarProveedorSunat } from "../compartido/integraciones";

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
  sin_enviar: { l: "Sin enviar", c: "is-off", ic: Clock },
  aceptado: { l: "Aceptado", c: "is-ok", ic: CheckCircle2 },
  pendiente: { l: "Por enviar", c: "is-pend", ic: Clock },
  observado: { l: "Observado", c: "is-aviso", ic: AlertTriangle },
  rechazado: { l: "Rechazado", c: "is-mal", ic: FileX2 },
  anulado: { l: "Anulado con NC", c: "is-off", ic: Undo2 },
};
const TIPO = { Boleta: "is-bol", Factura: "is-fac", "Nota de crédito": "is-nc" };
const dinero = (n, moneda = "PEN") => `${moneda === "USD" ? "US$" : "S/"} ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num8 = (n) => String(n).padStart(8, "0");
const fechaCorta = (iso) => String(iso || "").slice(0, 10).split("-").reverse().join("/");

const cfgDefecto = (sedes) => ({
  proveedor: "", ambiente: "pruebas", url: "", token: "", afectacion: "gravado", envioAuto: true, horaResumen: "23:00",
  series: Object.fromEntries((sedes.length ? sedes : SEDES).map((s, i) => [String(s.id), { boleta: `B00${i + 1}`, factura: `F00${i + 1}`, ncBoleta: `BC0${i + 1}`, ncFactura: `FC0${i + 1}` }])),
});
// Con sesión la configuración es solo la del servidor (GET /facturacion-electronica/config):
// ni lo guardado en este navegador ni series sugeridas que nadie configuró.
const leerCfg = (sedes) => (auth.token ? { ...cfgDefecto([]), series: {} } : { ...cfgDefecto(sedes), ...leer(CLAVE_CFG, {}) });
/* Copia de la configuración del servidor para serieSede (la boleta la lee sin React). */
let cfgServidor = null;
let cfgPedida = false;
export function fijarCfgSunat(c) { if (c && typeof c === "object") { cfgServidor = c; fijarProveedorSunat(c.proveedor); } }
const cfgParaSerie = () => {
  if (!auth.token) return leerCfg(sedesPorDefecto());
  if (!cfgServidor && !cfgPedida) { cfgPedida = true; api.sunat.config().then(fijarCfgSunat).catch(() => {}); }
  return cfgServidor || { series: {} };
};
// Sin lista de sedes (demostración), las sedes de la clínica; nunca un par fijo.
const sedesPorDefecto = () => SEDES.map((s) => ({ id: s.id, nombre: nombreSede(s.id) }));
/** Series de una sede: la clave puede ser el id de la demo (1/2) o el UUID del servidor. */
const seriesDe = (cfg, sede) => {
  const series = (cfg && cfg.series) || {};
  if (sede != null && series[String(sede)]) return series[String(sede)];
  const k = sede == null ? null : Object.keys(series).find((x) => mismaSede(x, sede));
  return (k && series[k]) || null;
};
/** Serie de la sede para el comprobante (boleta por defecto) según lo configurado en
    Integraciones › Facturación electrónica; null si esa sede no tiene serie. */
export function serieSede(sede, tipo = "boleta") {
  if (sede == null || sede === "all") return null;
  const x = seriesDe(cfgParaSerie(), sede);
  return (x && x[tipo]) || null;
}

/* Empresas de ejemplo: algunos pacientes piden factura a nombre de su empresa. */
const EMPRESAS_DEMO = [
  { nombre: "Constructora Andina S.A.C.", ruc: "20548712369" },
  { nombre: "Inversiones Pacífico E.I.R.L.", ruc: "20603145872" },
];

/* Comprobantes de ejemplo a partir de los cobros de la demostración: boletas a
   pacientes, algunas facturas a empresas, uno en dólares, los de hoy por enviar y dos
   pasados observado y rechazado, para ver cómo se atienden. */
function simular(pagos, cfg, overrides) {
  const orden = [...pagos].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const cont = {};
  const hoyISO = fmt(hoy);
  const pasados = orden.map((p, i) => [p, i]).filter(([p]) => String(p.fecha).slice(0, 10) < hoyISO).map(([, i]) => i);
  const iObs = pasados[pasados.length - 2], iRech = pasados[pasados.length - 4], iUsd = pasados[pasados.length - 3];
  const lista = orden.map((p, i) => {
    // La serie es la de la sede donde se cobró; un cobro sin sede usa la primera configurada.
    const sede = p.sede ?? null;
    const ser = seriesDe(cfg, sede) || cfg.series[Object.keys(cfg.series)[0]] || { boleta: "B001", factura: "F001" };
    const esFactura = i % 4 === 2;
    const empresa = EMPRESAS_DEMO[i % EMPRESAS_DEMO.length];
    const serie = esFactura ? ser.factura : ser.boleta;
    cont[serie] = (cont[serie] || 0) + 1;
    // Moneda: la del cobro; en la demostración uno se cobró en dólares.
    const moneda = p.moneda === "USD" || i === iUsd ? "USD" : "PEN";
    const total = moneda === "USD" ? (p.montoOriginal != null ? Number(p.montoOriginal) : Math.round((Number(p.monto) || 0) / 3.75 * 100) / 100) : (Number(p.monto) || 0);
    const base = cfg.afectacion === "gravado" ? Math.round((total / 1.18) * 100) / 100 : total;
    let estado = String(p.fecha).slice(0, 10) >= hoyISO ? "pendiente" : "aceptado", mensaje = "";
    // FAC-01: sin proveedor conectado nada llega a SUNAT: todos quedan «Sin enviar».
    if (!cfg.proveedor) { estado = "sin_enviar"; }
    else if (i === iObs) { estado = "observado"; mensaje = "La dirección del cliente supera los 100 caracteres. SUNAT lo aceptó con observación."; }
    if (i === iRech) { estado = "rechazado"; mensaje = "El número de documento del cliente no es válido. Corrígelo y vuelve a enviar."; }
    const id = `${serie}-${num8(cont[serie])}`;
    return {
      id, tipo: esFactura ? "Factura" : "Boleta", serie, numero: cont[serie], fecha: String(p.fecha).slice(0, 10),
      cliente: esFactura ? empresa.nombre : (p.paciente || "Cliente"),
      docTipo: esFactura ? "RUC" : (p.dni ? "DNI" : "—"), docNum: esFactura ? empresa.ruc : (p.dni || ""),
      paciente: p.paciente || "", concepto: p.concepto || "Atención odontológica", moneda, base, igv: Math.round((total - base) * 100) / 100, total,
      metodo: p.metodo || "", sede, estado, mensaje, pago: p, ...(overrides[id] || {}),
    };
  });
  Object.values(overrides).filter((o) => o.nc).forEach((o) => lista.push(o.nc));
  return lista.sort((a, b) => (b.fecha + b.id).localeCompare(a.fecha + a.id));
}

/* H-25: con sesión, los cobros de Caja que ya tienen boleta (serie y número) y que el
   registro de facturación electrónica todavía no devuelve se listan igual, «Por enviar»,
   para que Caja › Hoy y esta pestaña no se contradigan («0 boletas» frente a 3 emitidas). */
function desdeCobros(cobros, cfg) {
  return (cobros || []).filter((p) => p && p.comprobanteSerie && p.comprobanteNumero != null && !p.anulado).map((p) => {
    const serie = String(p.comprobanteSerie);
    const esFactura = /^F/i.test(serie) || /factura/i.test(String(p.comprobanteTipo || ""));
    const moneda = p.moneda === "USD" ? "USD" : "PEN";
    const total = moneda === "USD" && Number(p.montoOriginal) > 0 ? Number(p.montoOriginal) : (Number(p.monto) || 0);
    const base = cfg.afectacion === "gravado" ? Math.round((total / 1.18) * 100) / 100 : total;
    const estado = { aceptado: "aceptado", observado: "observado", rechazado: "rechazado" }[String(p.sunatEstado || "").toLowerCase()] || "pendiente";
    return {
      id: `${serie}-${num8(p.comprobanteNumero)}`, tipo: esFactura ? "Factura" : "Boleta", serie, numero: Number(p.comprobanteNumero), fecha: String(p.fecha || fmt(hoy)).slice(0, 10),
      cliente: p.paciente || "Cliente", docTipo: p.dni ? "DNI" : "—", docNum: p.dni || "", paciente: p.paciente || "", concepto: p.concepto || "Atención odontológica",
      moneda, base, igv: Math.round((total - base) * 100) / 100, total, tipoCambio: p.tipoCambio ?? null, metodo: p.metodo || "", sedeId: p.sedeId ?? null, sede: p.sedeId ?? p.sede ?? null,
      estado, mensaje: p.sunatMensaje || "", pago: p, origen: "caja",
    };
  });
}

const EstadoChip = ({ e, msg }) => { const x = ESTADO[e] || ESTADO.pendiente; const I = x.ic; return <span className={`dc-fe__chip ${x.c}`} title={msg || x.l}><I size={12} strokeWidth={2.4} /> {x.l}</span>; };

/* ───────────────────────── Caja › Facturación ───────────────────────── */
/* pagos: los cobros de toda la clínica (con su sede) para numerar igual en cualquier filtro;
   verSedes: sedes que se muestran (null = todas); consulta: { sedeIds } para el servidor. */
export default function FacturacionSunat({ pagos = [], cobrosServidor = [], sedes = [], verSedes = null, consulta = null, notify = () => {}, abrirBoleta = () => {}, onIntegraciones = null, puedeEmitir = true }) {
  const conectado = !!auth.token;
  const listaSedes = sedes.length ? sedes : sedesPorDefecto();
  const seVe = (sd) => !verSedes || sd == null || sd === "" || verSedes.some((v) => mismaSede(sd, v));
  const claveConsulta = JSON.stringify(consulta || {});
  const claveVer = verSedes ? verSedes.map(String).join(",") : "*";
  const [cfg, setCfg] = useState(() => leerCfg(listaSedes));
  const [overrides, setOverrides] = useState(() => leer(CLAVE_EST, {}));
  const [remoto, setRemoto] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [nc, setNc] = useState(null);
  useEffect(() => { guardar(CLAVE_EST, overrides); }, [overrides]);
  useEffect(() => {
    if (!conectado) return;
    Promise.all([api.sunat.config().catch(() => null), api.sunat.comprobantes(null, null, consulta || undefined).catch((e) => ({ error: e?.status || true }))])
      .then(([c, r]) => { if (c) { fijarCfgSunat(c); setCfg((x) => ({ ...x, ...c })); } setRemoto(r?.error ? { error: r.error } : { comprobantes: r?.comprobantes || r || [] }); });
  }, [conectado, claveConsulta]); // eslint-disable-line react-hooks/exhaustive-deps

  // Primero se simulan (o llegan) todos; después se recortan a las sedes que se ven, con las
  // notas de crédito incluidas (cada NC lleva la sede del comprobante que anula).
  const comprobantes = useMemo(() => {
    if (!conectado) return simular(pagos, cfg, overrides).filter((c) => seVe(c.sedeId ?? c.sede));
    const srv = remoto?.comprobantes || [];
    const ya = new Set(srv.map((c) => String(c.id || `${c.serie}-${num8(c.numero)}`)));
    const deCaja = desdeCobros(cobrosServidor, cfg).filter((c) => !ya.has(c.id) && (ya.add(c.id), true));
    return [...srv, ...deCaja].filter((c) => seVe(c.sedeId ?? c.sede));
  }, [conectado, remoto, pagos, cobrosServidor, cfg, overrides, claveVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const deCajaN = comprobantes.filter((c) => c.origen === "caja").length;
  const cuenta = (e) => comprobantes.filter((c) => c.estado === e).length;
  const atender = comprobantes.filter((c) => c.estado === "observado" || c.estado === "rechazado");
  const FILTROS = [
    ["todos", "Todos", comprobantes.length],
    ["Boleta", "Boletas", comprobantes.filter((c) => c.tipo === "Boleta").length],
    ["Factura", "Facturas", comprobantes.filter((c) => c.tipo === "Factura").length],
    ...(cfg.proveedor || conectado ? [["pendiente", "Por enviar", cuenta("pendiente")]] : [["sin_enviar", "Sin enviar", cuenta("sin_enviar")]]),
    ["atender", "Por atender", atender.length],
  ];
  const visibles = filtro === "todos" ? comprobantes
    : filtro === "atender" ? atender
    : (filtro === "Boleta" || filtro === "Factura") ? comprobantes.filter((c) => c.tipo === filtro)
    : comprobantes.filter((c) => c.estado === filtro);
  const totalesMes = ["PEN", "USD"].map((m) => [m, comprobantes.filter((c) => c.moneda === m && c.fecha.slice(0, 7) === fmt(hoy).slice(0, 7)).reduce((a, c) => a + c.total, 0)]);

  const reenviar = (c) => {
    if (conectado) { api.sunat.reenviar(c.id).then(() => notify("Reenviado.")).catch(() => notify("No se pudo reenviar.")); return; }
    setOverrides((o) => ({ ...o, [c.id]: { ...(o[c.id] || {}), estado: "aceptado", mensaje: "" } }));
    notify(`${c.id} reenviado y aceptado (ejemplo).`);
  };
  const emitirNc = () => {
    const c = nc.c; const motivo = (nc.motivo || "").trim();
    if (!motivo) { notify("Indica el motivo de la nota de crédito."); return; }
    if (conectado) { api.sunat.notaCredito(c.id, { motivo, tipoMotivo: nc.tipo }).then(() => { notify("Nota de crédito emitida."); setNc(null); }).catch(() => notify("No se pudo emitir la nota de crédito.")); return; }
    const ser = seriesDe(cfg, c.sede) || { ncBoleta: "BC01", ncFactura: "FC01" };
    const serie = c.tipo === "Factura" ? ser.ncFactura : ser.ncBoleta;
    const usados = Object.values(overrides).filter((o) => o.nc && o.nc.serie === serie).length;
    const id = `${serie}-${num8(usados + 1)}`;
    const doc = { ...c, id, tipo: "Nota de crédito", serie, numero: usados + 1, fecha: fmt(hoy), concepto: `${nc.tipo}: ${motivo}`, base: -c.base, igv: -c.igv, total: -c.total, estado: "pendiente", mensaje: "", ref: c.id, pago: null };
    setOverrides((o) => ({ ...o, [c.id]: { ...(o[c.id] || {}), estado: "anulado", mensaje: `Anulado con ${id}` }, [id]: { nc: doc } }));
    notify(`Nota de crédito ${id} emitida (ejemplo).`);
    setNc(null);
  };

  const cols = [
          { key: "fecha", label: "Fecha", w: "88px", a: "left", get: (c) => fechaCorta(c.fecha), sortVal: (c) => c.fecha },
          { key: "tipo", label: "Tipo", w: "96px", a: "left", get: (c) => c.tipo, cell: (c) => <span className={`dc-fe__tipo ${TIPO[c.tipo] || ""}`}>{c.tipo}</span> },
          { key: "id", label: "Número", w: "128px", a: "left", get: (c) => c.id, cell: (c) => <span className="dc-fe__mono" title={c.ref ? `Referencia: ${c.ref}` : undefined}>{c.id}</span> },
          { key: "cliente", label: "Cliente", w: "minmax(140px,1.4fr)", a: "left", get: (c) => c.cliente, cell: (c) => <span className="dc-fe__txt1" title={c.tipo === "Factura" && c.paciente ? `Paciente: ${c.paciente}` : undefined}>{c.cliente}</span> },
          { key: "doc", label: "Documento", w: "128px", a: "left", get: (c) => (c.docNum ? `${c.docTipo} ${c.docNum}` : "—"), cell: (c) => c.docNum ? <span className="dc-fe__mono"><small>{c.docTipo}</small> {c.docNum}</span> : <span className="dc-tp__sub">—</span> },
          { key: "moneda", label: "Moneda", w: "100px", a: "left", get: (c) => (c.moneda === "USD" ? "Dólares" : "Soles"), cell: (c) => <span className={`dc-fe__mon${c.moneda === "USD" ? " is-usd" : ""}`}>{c.moneda === "USD" ? "US$" : "S/"}</span> },
          { key: "base", label: "Base", soloExport: true, w: "96px", a: "right", get: (c) => dinero(c.base, c.moneda), sortVal: (c) => c.base },
          { key: "igv", label: "IGV", soloExport: true, w: "86px", a: "right", get: (c) => dinero(c.igv, c.moneda), sortVal: (c) => c.igv },
          { key: "total", label: "Total", w: "108px", a: "right", get: (c) => dinero(c.total, c.moneda), sortVal: (c) => c.total, cell: (c) => <b className="dc-fe__total" title={`Base ${dinero(c.base, c.moneda)} + IGV ${dinero(c.igv, c.moneda)}`}>{dinero(c.total, c.moneda)}</b> },
          { key: "estado", label: "Estado", w: "128px", a: "left", get: (c) => (ESTADO[c.estado] || {}).l, cell: (c) => <EstadoChip e={c.estado} msg={c.mensaje} /> },
          ...(filtro === "atender" ? [{ key: "mensaje", label: "Qué dijo SUNAT", w: "minmax(220px,1.6fr)", a: "left", get: (c) => c.mensaje || "", cell: (c) => <span className="dc-fe__msg">{c.mensaje}</span> }] : []),
          { key: "acc", label: "", w: "116px", a: "right", noFilter: true, noSort: true, sticky: true, cell: (c) => (
            <span className="dc-fe__acc">
              {/* abrirBoleta recibe el cobro como en Caja: monto en soles y, si fue en dólares,
                  montoOriginal (US$) y su TC; así la boleta es la misma que la del cobro. */}
              <button type="button" title="Ver comprobante" aria-label={`Ver ${c.id}`} onClick={(e) => { e.stopPropagation(); abrirBoleta({ ...(c.pago || {}), paciente: c.cliente, comprobanteSerie: c.serie, comprobanteNumero: c.numero, fecha: c.fecha, ...(c.moneda === "USD" ? { monto: Number(c.pago?.monto) || null, montoOriginal: Math.abs(c.total), tipoCambio: c.tipoCambio ?? c.pago?.tipoCambio ?? null } : { monto: Math.abs(c.total) }), moneda: c.moneda, concepto: c.concepto, metodo: c.metodo, tipo: c.tipo, docTipo: c.docTipo, docNum: c.docNum, refComprobante: c.ref }); }}><FileText size={14} strokeWidth={2} /></button>
              {(c.estado === "rechazado" || c.estado === "observado" || c.estado === "pendiente")
                ? puedeEmitir && c.origen !== "caja" && <button type="button" title="Reenviar a SUNAT" aria-label={`Reenviar ${c.id}`} onClick={(e) => { e.stopPropagation(); reenviar(c); }}><RefreshCw size={14} strokeWidth={2} /></button>
                : null}
              <MenuAcciones opciones={[
                puedeEmitir && c.origen !== "caja" && c.estado === "aceptado" && c.total > 0 && { label: "Anular con nota de crédito", peligro: true, onClick: () => setNc({ c, tipo: "Anulación de la operación", motivo: "" }) },
                // Con sesión solo se ofrece si el servidor manda el enlace del archivo (xmlUrl / cdrUrl).
                (!conectado || c.xmlUrl) && { label: "Descargar XML", onClick: () => (conectado ? window.open(c.xmlUrl, "_blank", "noopener") : notify("El XML se descarga cuando el envío a SUNAT esté activo.")) },
                c.estado === "aceptado" && (!conectado || c.cdrUrl) && { label: "Descargar constancia (CDR)", onClick: () => (conectado ? window.open(c.cdrUrl, "_blank", "noopener") : notify("La constancia de SUNAT se descarga cuando el envío esté activo.")) },
              ]} />
            </span>
          ) },
  ];

  if (conectado && remoto?.error && !deCajaN) {
    return (
      <section className="dc-fe">
        <div className="dc-fe__aviso-sin"><PlugZap size={18} strokeWidth={2} /><div><b>La facturación electrónica aún no está activa</b><span>Las boletas se emiten en el sistema sin envío a SUNAT. La conexión la configura TI en Administración › Integraciones.</span></div></div>
      </section>
    );
  }

  return (
    <section className="dc-fe" aria-label="Comprobantes electrónicos">
      <div className="dc-fe__barra">
        <div className="dc-fe__tit">
          <h3><Receipt size={16} strokeWidth={2} /> Comprobantes electrónicos</h3>
          <span>
            Emitido este mes: <b>{dinero(totalesMes[0][1])}</b>{totalesMes[1][1] ? <> · <b>{dinero(totalesMes[1][1], "USD")}</b></> : null}
            {!conectado ? " · comprobantes de ejemplo" : !cfg.proveedor ? " · envío a SUNAT aún no activo" : ""}
          </span>
        </div>
        <div className="dc-fe__filtros" role="tablist" aria-label="Filtrar comprobantes">
          {FILTROS.map(([k, l, n]) => (
            <button key={k} type="button" role="tab" aria-selected={filtro === k} className={`${filtro === k ? "is-on" : ""}${k === "atender" && n ? " is-alerta" : ""}`} onClick={() => setFiltro(k)}>{l} <i>{n}</i></button>
          ))}
        </div>
        <BotonExportar titulo="Comprobantes electrónicos" cols={cols} filas={visibles} sub="comprobantes" />
      </div>

      {conectado && deCajaN > 0 && (
        <div className="dc-fe__aviso-sin"><Receipt size={18} strokeWidth={2} /><div><b>{deCajaN} {deCajaN === 1 ? "comprobante emitido" : "comprobantes emitidos"} en Caja aún sin registro electrónico</b><span>Son las boletas de los cobros: se muestran aquí con su serie y número hasta que el servidor las registre para el envío a SUNAT.</span></div></div>
      )}
      {!cfg.proveedor && (
        <div className="dc-fe__aviso-sin"><PlugZap size={18} strokeWidth={2} /><div><b>Sin proveedor de facturación electrónica</b><span>Los comprobantes se emiten en el sistema y quedan «Sin enviar» hasta conectar un proveedor (OSE/PSE).</span></div>{onIntegraciones && <button type="button" className="dc-fe__btn" onClick={onIntegraciones}>Ir a Integraciones</button>}</div>
      )}
      <DataTable sub="comprobantes" minWidth={0} rows={visibles} defaultSort={{ key: "fecha", dir: "desc" }}
        empty={<div className="dc-fe__vacio"><Receipt size={22} strokeWidth={1.75} /><b>Sin comprobantes</b><span>Los cobros de caja generan aquí su boleta o factura.</span></div>}
        cols={cols} exportar={false} />

      {nc && (
        <Modal icon={<Undo2 size={20} strokeWidth={1.75} />} tone="var(--dc-red)" titulo="Nota de crédito" sub={`Anula o corrige ${nc.c.tipo.toLowerCase()} ${nc.c.id} · ${dinero(nc.c.total, nc.c.moneda)}`} size="corto" onClose={() => setNc(null)}
          footer={<><Btn small kind="ghost" onClick={() => setNc(null)}>Volver</Btn><Btn small kind="red" onClick={emitirNc}><Undo2 size={14} strokeWidth={2} /> Emitir nota de crédito</Btn></>}>
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--dc-ink-700)", lineHeight: 1.5 }}>Un comprobante aceptado por SUNAT no se borra: se anula o corrige con una nota de crédito que lo referencia, en la misma moneda.</p>
            <label className="dc-fe__lbl">Tipo<Select value={nc.tipo} onChange={(v) => setNc({ ...nc, tipo: v })} options={["Anulación de la operación", "Corrección por error en el monto", "Devolución total", "Descuento posterior"].map((x) => ({ value: x, label: x }))} /></label>
            <label className="dc-fe__lbl">Motivo (obligatorio)<input className="dc-premium-inp" value={nc.motivo} onChange={(e) => setNc({ ...nc, motivo: e.target.value })} placeholder="Ej. cobro duplicado del 28/09" /></label>
          </div>
        </Modal>
      )}
    </section>
  );
}

/* ─────────────────── Integraciones › Facturación electrónica (TI) ─────────────────── */
export function ConexionSunat({ notify = () => {}, sedes = null }) {
  const conectado = !!auth.token;
  // CONFIG-18: las series son de las sedes reales de la clínica (con sesión, las de /sedes,
  // con su UUID como clave), no un par fijo de la demostración.
  const [sedesApi, setSedesApi] = useState(null);
  useEffect(() => { if (conectado && !(sedes && sedes.length)) api.sedes.listar().then((r) => setSedesApi((r || []).map((x) => ({ id: x.id, nombre: x.nombre || nombreSede(x.id) })))).catch(() => {}); }, [conectado]); // eslint-disable-line react-hooks/exhaustive-deps
  const listaSedes = sedes && sedes.length ? sedes : sedesApi && sedesApi.length ? sedesApi : sedesPorDefecto();
  const [cfg, setCfg] = useState(() => leerCfg(listaSedes));
  // Al llegar las sedes del servidor, las que aún no tienen serie toman la sugerida.
  // Con sesión no se inventan series: las sugeridas solo se proponen al editar (placeholder).
  useEffect(() => { if (!conectado) setCfg((x) => ({ ...x, series: { ...cfgDefecto(listaSedes).series, ...(x.series || {}) } })); }, [listaSedes.map((s) => s.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const [editCfg, setEditCfg] = useState(null);
  const [probando, setProbando] = useState(false);
  useEffect(() => { if (conectado) api.sunat.config().then((c) => { if (c) { fijarCfgSunat(c); setCfg((x) => ({ ...x, ...c })); } }).catch(() => {}); }, [conectado]);
  const emisor = (datosImpresion() || {}).empresa || {};
  const conectadoProv = !!cfg.proveedor;
  const guardarCfg = () => {
    const c = editCfg;
    if (c.proveedor && !c.url.trim()) { notify("Falta la ruta (URL) que entrega el proveedor."); return; }
    if (conectado) { api.sunat.guardarConfig(c).then(() => { setCfg(c); fijarCfgSunat(c); setEditCfg(null); notify("Conexión guardada."); }).catch(() => notify("No se pudo guardar la conexión.")); return; }
    const { token, ...sinToken } = c;   // el token nunca se guarda en el navegador
    setCfg({ ...c }); guardar(CLAVE_CFG, { ...sinToken, token: "" }); setEditCfg(null);
    notify(c.proveedor ? "Conexión guardada (demostración: no se envía nada)." : "Configuración guardada.");
  };
  const probar = () => {
    setProbando(true);
    if (conectado) { api.sunat.probar(editCfg).then((r) => notify(r?.mensaje || "Conexión correcta.")).catch((e) => notify(e?.message || "El proveedor no respondió.")).finally(() => setProbando(false)); return; }
    setTimeout(() => { setProbando(false); notify(editCfg.url && editCfg.token ? "Respuesta simulada: credenciales con formato correcto." : "Completa la ruta y el token para probar."); }, 700);
  };
  return (
    <section className="dc-fe dc-fe--ti" aria-label="Conexión con SUNAT">
      <div className={`dc-fe__estado${conectadoProv ? (cfg.ambiente === "produccion" ? " is-prod" : " is-prueba") : " is-off"}`}>
        <span className="dc-fe__eico">{conectadoProv ? <Cloud size={22} strokeWidth={1.9} /> : <PlugZap size={22} strokeWidth={1.9} />}</span>
        <div className="dc-fe__etxt">
          <small>Facturación electrónica · SUNAT</small>
          <h3>{conectadoProv ? `Conectado con ${(PROVEEDORES.find((p) => p.id === cfg.proveedor) || {}).n || "el proveedor"} · ${cfg.ambiente === "produccion" ? "producción" : "pruebas"}` : "Sin proveedor conectado"}</h3>
          <p>{conectadoProv ? `Emisor ${emisor.razonSocial || emisor.nombre || ""}${emisor.ruc ? ` · RUC ${emisor.ruc}` : ""} · ${(AFECTACION.find((a) => a.v === cfg.afectacion) || {}).l} · resumen diario de boletas a las ${cfg.horaResumen}.` : "Mientras no se conecte, Caja emite boletas sin envío a SUNAT."}</p>
          <div className="dc-fe__series dc-fe__series--fila">
            {listaSedes.map((s) => { const x = seriesDe(cfg, s.id) || {}; return <div key={s.id}><b>{s.nombre}</b><span><i>Boleta</i>{x.boleta || "—"}</span><span><i>Factura</i>{x.factura || "—"}</span><span><i>NC</i>{x.ncBoleta || "—"}/{x.ncFactura || "—"}</span></div>; })}
          </div>
        </div>
        <div className="dc-fe__eacc"><button type="button" className="dc-fe__btn is-pri" onClick={() => setEditCfg({ ...cfg, token: "" })}><KeyRound size={15} strokeWidth={2} /> {conectadoProv ? "Configurar" : "Conectar proveedor"}</button></div>
      </div>
      <details className="dc-fe__como"><summary>¿Cómo viaja un comprobante hasta SUNAT?</summary>
      <ol className="dc-fe__flujo" aria-label="Cómo viaja un comprobante">
        {[[Wallet, "Cobro en caja", "Boleta o factura, soles o dólares"], [Receipt, "Comprobante", "Serie de la sede y correlativo"], [KeyRound, "Firma y envío", "Lo firma y envía el proveedor"], [FileCheck2, "Respuesta SUNAT", "Aceptado, observado o rechazado"], [Smartphone, "Al paciente", "PDF por WhatsApp o correo"]].map(([I, t, d], i) => (
          <li key={t}><span><I size={16} strokeWidth={2} /></span><div><b>{i + 1}. {t}</b><small>{d}</small></div>{i < 4 && <ArrowRight size={14} strokeWidth={2} className="dc-fe__flecha" aria-hidden="true" />}</li>
        ))}
      </ol>
      </details>
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
                <div key={k}><span>{s.nombre}</span>{["boleta", "factura", "ncBoleta", "ncFactura"].map((c) => <input key={c} className="dc-premium-inp" aria-label={`${c} ${s.nombre}`} value={x[c] || ""} placeholder={(cfgDefecto(listaSedes).series[k] || {})[c] || ""} onChange={(e) => setS(c, e.target.value)} />)}</div>
              ); })}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
