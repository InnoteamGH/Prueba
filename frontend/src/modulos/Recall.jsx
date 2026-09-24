/* Módulo Recall. Extraído de App.jsx para servirse en un chunk aparte (code splitting). */
import React, { useState, useEffect } from "react";
import { AlertTriangle, BellRing, CalendarCheck, Check, CheckCheck, CheckCircle2, ChevronRight, Clock, MessageSquare, Power, Repeat, Send, Shield, Smile, Sparkles, Star, Zap } from "lucide-react";
import api, { auth } from "../api/client";
import {EnCabecera, Btn, Card, DISPLAY_FONT, DS, INK, KpiCard, MEDICOS, Modal, NAVY, Vacio, addDays, colorDe, espsDe, fechaLegible, fmt, hoy, iniciales, tint} from "../comun";

function Recall({ pacientes, notify, setCitas, sedeActiva = 1, can }) {
  // Activar una automatización o pulsar "Enviar a todos" manda WhatsApp a los pacientes.
  // Es una acción que sale de la clínica: quien solo consulta no la lanza.
  const puedeEnviar = can ? can("recall", "crear") : true;
  const conectado = !!auth.token;
  // Icono + color por automatización (la lógica y las plantillas viven en el backend).
  const AUT_META = {
    confirmacion: { icon: CalendarCheck, color: DS.c.primary },
    recordatorio_48h: { icon: Clock, color: DS.c.primary },
    recordatorio_2h: { icon: BellRing, color: DS.c.primary },
    encuesta: { icon: Star, color: "var(--dc-warn)" },
    recall: { icon: Repeat, color: "var(--dc-ok-700)" },
    recuperar_noshow: { icon: AlertTriangle, color: "var(--dc-red)" },
    cumpleanos: { icon: Smile, color: DS.c.primary } };
  const DEFAULT_REGLAS = [
    { clave: "confirmacion", l: "Confirmación al agendar", timing: "Al instante", antes: true, on: true, stat: "por WhatsApp", icon: CalendarCheck, color: DS.c.primary, plantilla: "¡Hola {nombre}! 😊 Tu cita quedó agendada para el {fecha} a las {hora} con {doctor} en {sede}. ¡Te esperamos! 🦷" },
    { clave: "recordatorio_48h", l: "Recordatorio 48 h antes", timing: "−48 h", antes: true, on: true, stat: "por WhatsApp", icon: Clock, color: DS.c.primary, plantilla: "Hola {nombre}, te recordamos tu cita el {fecha} a las {hora} con {doctor} en {sede}. Responde *SÍ* para confirmar. 🦷" },
    { clave: "recordatorio_2h", l: "Recordatorio 2 h antes", timing: "−2 h", antes: true, on: true, stat: "por WhatsApp", icon: BellRing, color: DS.c.primary, plantilla: "Hola {nombre}, tu cita es hoy a las {hora} con {doctor} en {sede}. ¡Te esperamos! 😁" },
    { clave: "encuesta", l: "Encuesta de satisfacción", timing: "Tras atender", antes: false, on: true, stat: "por WhatsApp", icon: Star, color: "var(--dc-warn)", plantilla: "Hola {nombre}, ¿cómo estuvo tu atención en {sede}? Cuéntanos con una calificación del 1 al 10 🙏 Tu opinión nos ayuda a mejorar." },
    { clave: "recall", l: "Recall de control", timing: "+6 meses", antes: false, on: true, stat: "por WhatsApp", icon: Repeat, color: "var(--dc-ok-700)", plantilla: "Hola {nombre} 😊 Ya pasaron 6 meses de tu último control. ¿Agendamos tu limpieza para mantener tu sonrisa sana? Escríbenos y te doy el próximo cupo. 🦷" },
    { clave: "recuperar_noshow", l: "Recuperar no-show", timing: "Si falta", antes: false, on: false, stat: "sin activar", icon: AlertTriangle, color: "var(--dc-red)", plantilla: "Hola {nombre}, notamos que no pudiste asistir a tu cita del {fecha}. ¿La reagendamos? Escríbenos y te damos el próximo cupo disponible. 🦷" },
    { clave: "cumpleanos", l: "Saludo de cumpleaños", timing: "En su día", antes: false, on: false, stat: "sin activar", icon: Smile, color: DS.c.primary, plantilla: "¡Feliz cumpleaños, {nombre}! 🎉🎂 De parte de todo el equipo. Este mes te regalamos 20% en tu próxima limpieza. 😁" },
  ];
  // Con sesión no se dan por activas hasta que el servidor lo confirme: si la carga
  // falla, decir que las cinco están "funcionando solas" hace que nadie revise por qué
  // los pacientes no reciben nada.
  const [reglas, setReglas] = useState(() => auth.token ? DEFAULT_REGLAS.map((r) => ({ ...r, on: false })) : DEFAULT_REGLAS);
  const [resumen, setResumen] = useState(null);
  const [histReal, setHistReal] = useState(null);
  const [resenasNps, setResenasNps] = useState(null);
  const mapReglas = (items) => (items || []).map((a) => ({
    clave: a.clave, l: a.label, timing: a.timing, antes: a.antes, on: a.activo, plantilla: a.plantilla || "",
    hsmNombre: a.hsmNombre || "", hsmIdioma: a.hsmIdioma || "es",
    stat: a.enviadasMes ? `${a.enviadasMes} este mes` : (a.enviadas ? `${a.enviadas} enviadas` : "sin envíos aún"),
    ...(AUT_META[a.clave] || { icon: Zap, color: NAVY }) }));
  const cargar = () => {
    if (!conectado) return;
    api.automatizaciones.listar().then((r) => { if (r?.automatizaciones) setReglas(mapReglas(r.automatizaciones)); setResumen(r?.resumen || null); }).catch(() => {});
    api.automatizaciones.historial().then((h) => setHistReal(h || [])).catch(() => setHistReal([]));
    api.automatizaciones.recallPendientes().then((r) => setCola((r || []).map((x) => ({ id: x.id, nombre: x.nombre, ultima: x.ultimaVisita, telefono: x.telefono, estado: x.contactado ? "enviado" : "por_contactar" })))).catch(() => {});
    api.resenas.listar().then((rs) => setResenasNps(rs || [])).catch(() => setResenasNps([]));
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line
  const toggle = (clave) => {
    const r = reglas.find((x) => x.clave === clave); if (!r) return;
    const nuevo = !r.on;
    setReglas((rs) => rs.map((x) => x.clave === clave ? { ...x, on: nuevo } : x));
    notify(nuevo ? `Automatización "${r.l}" activada.` : `Automatización "${r.l}" pausada.`);
    if (conectado) api.automatizaciones.actualizar(clave, { activo: nuevo }).then(cargar).catch(() => { notify("No se pudo guardar el cambio."); cargar(); });
  };
  const [cfg, setCfg] = useState(null);       // {clave,l,timing,color,icon,on,plantilla}
  const [cfgMsg, setCfgMsg] = useState("");
  const [cfgHsm, setCfgHsm] = useState("");
  const [probarTel, setProbarTel] = useState("");
  const abrirCfg = (r) => { setCfg(r); setCfgMsg(r.plantilla || ""); setCfgHsm(r.hsmNombre || ""); setProbarTel(""); };
  // Vista previa: reemplaza las variables con datos de ejemplo (como llegaría al paciente).
  const previewMsg = (t) => (t || "").replace(/\{nombre\}/g, "María").replace(/\{fecha\}/g, addDays(2)).replace(/\{hora\}/g, "10:00").replace(/\{doctor\}/g, "Dra. Carla Mendoza").replace(/\{sede\}/g, "Sede San Isidro");
  const probarAhora = () => {
    if (!cfg) return;
    const tel = (probarTel || "").replace(/\D/g, "");
    if (tel.length < 9) { notify("Ingresa un número válido (con código de país, ej. 51987654321)."); return; }
    if (conectado) api.automatizaciones.probar(cfg.clave, tel).then((r) => notify(r?.ok ? `Mensaje de prueba enviado a ${tel} por WhatsApp.` : "No se pudo enviar (revisa que el número esté habilitado en Meta).")).catch(() => notify("No se pudo enviar la prueba."));
    else notify(`(Demo) Se enviaría a ${tel}: ${previewMsg(cfgMsg).slice(0, 40)}…`);
  };
  const guardarCfg = () => {
    if (conectado && cfg) api.automatizaciones.actualizar(cfg.clave, { plantilla: cfgMsg, hsmNombre: cfgHsm }).then(() => { notify(`"${cfg.l}" actualizado.`); cargar(); }).catch(() => notify("No se pudo guardar."));
    else notify(`"${cfg?.l}" actualizado.`);
    setCfg(null);
  };
  const probarHsm = () => {
    if (!cfg) return;
    const tel = (probarTel || "").replace(/\D/g, "");
    if (tel.length < 9) { notify("Ingresa un número válido."); return; }
    if (!cfgHsm.trim()) { notify("Primero guarda el nombre de la plantilla HSM aprobada en Meta."); return; }
    if (conectado) api.automatizaciones.probarHsm(cfg.clave, tel).then((r) => notify(r?.ok ? `Plantilla "${r.plantilla}" enviada a ${tel}.` : "No se pudo enviar (¿plantilla aprobada en Meta?).")).catch(() => notify("No se pudo enviar la plantilla."));
    else notify(`(Demo) Se enviaría la plantilla "${cfgHsm}" a ${tel}.`);
  };
  const [cola, setCola] = useState(() => conectado ? [] : pacientes.filter((p) => p.ultima && p.ultima < "2026-04-01").slice(0, 6).map((p) => ({ ...p, estado: "por_contactar" })));
  const enviar = (id) => {
    const p = cola.find((x) => x.id === id);
    setCola((c) => c.map((x) => x.id === id ? { ...x, estado: "enviado" } : x));
    if (conectado) {
      api.automatizaciones.enviarRecall(id).then(() => notify(`Recall enviado a ${p?.nombre || "paciente"} por WhatsApp. El agente agenda cuando responda.`)).catch(() => { notify("No se pudo enviar el recall."); cargar(); });
      return;
    }
    if (p && setCitas) {
      const med = MEDICOS.find((m) => espsDe(m).includes(1)) || MEDICOS[0];
      setCitas((cs) => [...cs, { id: Date.now(), paciente: p.nombre, dni: p.dni || "—", medicoId: med.id, esp: 1, sede: (p.sede || sedeActiva), fecha: addDays(7), hora: "10:00", motivo: "Control de rutina (recall)", estado: "pendiente", llegada: false }]);
    }
    notify(`Recordatorio enviado a ${p?.nombre || "paciente"}.`);
  };
  const enviarTodos = () => {
    const pend = cola.filter((x) => x.estado === "por_contactar");
    if (!pend.length) { notify("No hay pacientes por contactar."); return; }
    // Un WhatsApp a decenas de pacientes no se lanza con un clic y sin preguntar.
    if (!confirm(`Se enviará un WhatsApp a ${pend.length} paciente(s). ¿Continuar?`)) return;
    if (conectado) {
      // Antes se marcaba TODA la cola como "enviado" antes de saber si salía, y los
      // fallos se tragaban: la pantalla decía que se envió y esos pacientes no se
      // volvían a contactar nunca. Ahora solo se marca lo que de verdad salió.
      Promise.all(pend.map((x) => api.automatizaciones.enviarRecall(x.id).then(() => x.id).catch(() => null)))
        .then((ids) => {
          const ok = new Set(ids.filter(Boolean));
          setCola((c) => c.map((x) => (ok.has(x.id) ? { ...x, estado: "enviado" } : x)));
          const fallidos = pend.length - ok.size;
          notify(fallidos === 0 && ok.size > 0
            ? `Recall enviado a ${ok.size} paciente(s) por WhatsApp.`
            : ok.size === 0
              ? `No se pudo enviar a ninguno de los ${pend.length} paciente(s). Siguen por contactar.`
              : `Enviado a ${ok.size} de ${pend.length}. No se pudo enviar a ${fallidos}; siguen por contactar.`);
        });
      return;
    }
    setCola((c) => c.map((x) => (x.estado === "por_contactar" ? { ...x, estado: "enviado" } : x)));
    notify(`Recordatorio enviado a ${pend.length} paciente(s).`);
  };
  const activas = reglas.filter((r) => r.on).length;
  const [subtab, setSubtab] = useState("automatizaciones");   // automatizaciones | historial
  const HIST_ENVIOS = [
    { id: 1, paciente: "Rosa Linares", regla: "Recordatorio 48 h antes", fecha: fmt(hoy), hora: "08:12", estado: "leido" },
    { id: 2, paciente: "Pedro Gómez", regla: "Confirmación al agendar", fecha: fmt(hoy), hora: "08:05", estado: "entregado" },
    { id: 3, paciente: "María Chávez", regla: "Recordatorio 2 h antes", fecha: fmt(hoy), hora: "07:40", estado: "leido" },
    { id: 4, paciente: "Elena Ríos", regla: "Encuesta de satisfacción", fecha: addDays(-1), hora: "18:30", estado: "respondido", nps: 9, calificacion: 5, comentario: "Muy buena atención, la Dra. fue clara con el plan." },
    { id: 5, paciente: "Diego Castro", regla: "Recall de control", fecha: addDays(-1), hora: "10:15", estado: "entregado" },
    { id: 6, paciente: "Lucía Vega", regla: "Recordatorio 48 h antes", fecha: addDays(-2), hora: "09:00", estado: "leido" },
  ];
  const RESENAS_DEMO = HIST_ENVIOS.filter((h) => h.estado === "respondido" && h.nps != null).map((h) => ({ paciente: h.paciente, nps: h.nps, calificacion: h.calificacion, comentario: h.comentario }));
  const ESTADO_ENVIO = { entregado: { l: "Entregado", bg: "var(--dc-line)", fg: "var(--dc-ink-700)", ic: Check }, leido: { l: "Leído", bg: "var(--dc-info-soft)", fg: "var(--dc-info-ink)", ic: CheckCircle2 }, respondido: { l: "Respondió", bg: "var(--dc-ok-soft)", fg: "var(--dc-ok-700)", ic: MessageSquare }, error: { l: "No enviado", bg: "var(--dc-fee2)", fg: "var(--dc-danger-700)", ic: AlertTriangle } };
  const histView = (histReal && histReal.length ? histReal : (conectado ? [] : HIST_ENVIOS));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
      <EnCabecera>
        <div className="dc-rec-top">
          <nav className="dc-segmento" role="tablist" aria-label="Vistas de recordatorios">
            {[["automatizaciones", "Automatizaciones"], ["historial", "Historial de envíos"], ["satisfaccion", "Satisfacción"]].map(([k, lbl]) => (
              <button key={k} type="button" role="tab" aria-selected={subtab === k} onClick={() => setSubtab(k)}>{lbl}</button>
            ))}
          </nav>
        </div>
      </EnCabecera>
      {subtab === "satisfaccion" ? (() => {
        const fuenteResenas = (resenasNps && resenasNps.length) ? resenasNps : (conectado ? [] : RESENAS_DEMO);
        const rs = fuenteResenas.filter((r) => r.nps != null);
        const n = rs.length;
        const prom = rs.filter((r) => r.nps >= 9).length, det = rs.filter((r) => r.nps <= 6).length, pas = n - prom - det;
        const nps = n ? Math.round((prom - det) / n * 100) : 0;
        const califAvg = n ? (rs.reduce((s, r) => s + (r.calificacion || 0), 0) / n).toFixed(1) : "—";
        const pct = (x) => n ? Math.round(x / n * 100) : 0;
        const comentarios = fuenteResenas.filter((r) => r.comentario && r.comentario.trim()).slice(0, 12);
        const bajos = rs.filter((r) => r.nps <= 6);
        const npsColor = nps >= 50 ? "var(--dc-ok-700)" : nps >= 0 ? "var(--dc-warn-600)" : "var(--dc-red)";
        return (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
            <KpiCard label="NPS" value={n ? (nps > 0 ? `+${nps}` : `${nps}`) : "—"} color={npsColor} icon={<Star size={18} strokeWidth={1.75} />} sub={`${n} respuestas`} />
            <KpiCard label="Calificación media" value={califAvg} color={NAVY} icon={<Star size={18} strokeWidth={1.75} />} sub="de 1 a 5" />
            <KpiCard label="Promotores" value={`${pct(prom)}%`} color="var(--dc-ok-700)" icon={<Smile size={18} strokeWidth={1.75} />} sub={`${prom} pacientes (9-10)`} />
            <KpiCard label="Detractores" value={`${pct(det)}%`} color="var(--dc-red)" icon={<AlertTriangle size={18} strokeWidth={1.75} />} sub={`${det} pacientes (0-6)`} />
          </div>
          {bajos.length > 0 && (
            <Card style={{ padding: "14px 18px", border: "1.5px solid var(--dc-danger-mid)", background: "var(--dc-bg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--dc-danger-700)", fontWeight: 600, fontSize: 14, fontFamily: DISPLAY_FONT }}><AlertTriangle size={17} strokeWidth={1.75} /> {bajos.length} paciente(s) con calificación baja — requieren seguimiento</div>
              <div style={{ fontSize: 13, color: "var(--dc-warn-700)", marginTop: 3 }}>El agente ya se disculpó y ofreció derivar; conviene que una persona del equipo los contacte.</div>
            </Card>
          )}
          <Card style={{ padding: "18px 20px" }}>
            <h3 style={{ margin: "0 0 12px", color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Distribución de opiniones</h3>
            <div style={{ display: "flex", height: 14, borderRadius: "var(--dc-r-full)", overflow: "hidden", background: "var(--dc-line)" }}>
              {prom > 0 && <div style={{ width: `${pct(prom)}%`, background: "var(--dc-ok)" }} title={`Promotores ${pct(prom)}%`} />}
              {pas > 0 && <div style={{ width: `${pct(pas)}%`, background: "var(--dc-warn)" }} title={`Neutrales ${pct(pas)}%`} />}
              {det > 0 && <div style={{ width: `${pct(det)}%`, background: "var(--dc-red)" }} title={`Detractores ${pct(det)}%`} />}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: "var(--dc-ink-700)", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-full)", background: "var(--dc-ok)" }} /> Promotores {pct(prom)}%</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-full)", background: "var(--dc-warn)" }} /> Neutrales {pct(pas)}%</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-full)", background: "var(--dc-red)" }} /> Detractores {pct(det)}%</span>
            </div>
          </Card>
          <Card style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)" }}><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Comentarios recientes</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Capturados por la encuesta automática de WhatsApp</div></div>
            {comentarios.length === 0 && <Vacio icon={<MessageSquare size={24} strokeWidth={1.75} />} titulo="Sin comentarios aún" sub="Aparecerán cuando los pacientes respondan la encuesta." />}
            {comentarios.map((r, i) => { const col = colorDe(r.paciente || "Paciente"); const bajo = r.nps != null && r.nps <= 6; return (
              <div key={r.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderTop: i ? "1px solid var(--dc-line)" : "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: tint(col, 0.102), color: col, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{iniciales(r.paciente || "P")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontWeight: 500, color: NAVY }}>{r.paciente || "Paciente"}</span>{r.medico && <span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>· {r.medico}</span>}</div>
                  <div style={{ fontSize: 13, color: "var(--dc-ink-700)", marginTop: 2 }}>{r.comentario}</div>
                </div>
                {r.nps != null && <span style={{ fontSize: 12, fontWeight: 500, color: bajo ? "var(--dc-danger-700)" : "var(--dc-ok-700)", background: bajo ? "var(--dc-fee2)" : "var(--dc-ok-soft)", padding: "4px 11px", borderRadius: "var(--dc-r-full)", whiteSpace: "nowrap" }}>{r.nps}/10</span>}
              </div>
            ); })}
          </Card>
        </>
        ); })() : subtab === "historial" ? (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)" }}><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Historial de envíos</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Mensajes automáticos enviados por WhatsApp · últimos días</div></div>
          {histView.length === 0 && <Vacio icon={<Send size={24} strokeWidth={1.75} />} titulo="Aún sin envíos" sub="Cuando una automatización envíe un WhatsApp, aparecerá aquí." />}
          {histView.map((h, i) => { const es = ESTADO_ENVIO[h.estado] || ESTADO_ENVIO.entregado; const EIc = es.ic; const col = colorDe(h.paciente); return (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderTop: i ? "1px solid var(--dc-line)" : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: tint(col, 0.102), color: col, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{iniciales(h.paciente)}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.paciente}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", display: "inline-flex", alignItems: "center", gap: 5 }}><MessageSquare size={11} strokeWidth={1.75} color="var(--dc-ok-700)" /> {h.regla}</div></div>
              <div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fechaLegible(h.fecha)} · {h.hora}</div>
              <span style={{ fontSize: 12, fontWeight: 500, color: es.fg, background: es.bg, padding: "4px 11px", borderRadius: "var(--dc-r-full)", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><EIc size={12} strokeWidth={1.75} /> {es.l}</span>
            </div>
          ); })}
        </Card>
      ) : (<>
      <Card className="dc-rec">
        <div className="dc-rec__cab">
          <div className="dc-rec__tit">
            <h3><Sparkles size={16} strokeWidth={1.75} /> Recorrido automático del paciente</h3>
            <p>Cada paso se envía solo por WhatsApp. Toca uno para editar su mensaje.</p>
          </div>
          <div className="dc-rec__cifras">
            <div><b>{activas}/{reglas.length}</b><span>Activas</span></div>
            <div><b>{resumen && resumen.mensajesMes > 0 ? resumen.mensajesMes.toLocaleString("es-PE") : "0"}</b><span>Enviados este mes</span></div>
            <div><b>{resumen && resumen.mensajesMes > 0 ? `${resumen.tasaEntrega}%` : "—"}</b><span>Entrega</span></div>
            <span className="dc-rec__dnd" title="No se envían automatizaciones fuera de este horario ni más de 3 por paciente al día"><Shield size={13} strokeWidth={1.75} /> No molestar 21:00–08:00 · máx. 3 al día</span>
          </div>
        </div>
        <div className="dc-rec__fases">
          {[[true, "Antes de la cita", Clock], [false, "Después de la cita", CalendarCheck]].map(([antes, tit, FIc]) => (
            <section key={tit} className="dc-rec__fase">
              <h4><FIc size={14} strokeWidth={1.75} /> {tit}</h4>
              {reglas.filter((r) => !!r.antes === antes).map((r) => { const Ic = r.icon || (AUT_META[r.clave] || {}).icon || Zap; const color = r.color || (AUT_META[r.clave] || {}).color || DS.c.primary; return (
                <div key={r.clave} className={`dc-rec__paso${r.on ? " is-on" : ""}`} style={{ "--paso": color }} onClick={() => abrirCfg(r)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") abrirCfg(r); }} title="Editar mensaje">
                  <span className="dc-rec__ico" style={{ background: tint(color, 0.12), color }}><Ic size={16} strokeWidth={1.75} /></span>
                  <div className="dc-rec__txt"><b>{r.l}</b><span>{!r.on ? "Pausado" : r.stat === "por WhatsApp" ? "Activo" : r.stat}<em className="dc-rec__cuando-m"> · {r.timing}</em></span></div>
                  <span className="dc-rec__cuando">{r.timing}</span>
                  <button type="button" className={`dc-rec__switch${r.on ? " is-on" : ""}`} role="switch" aria-checked={r.on} aria-label={`${r.on ? "Pausar" : "Activar"} ${r.l}`} onClick={(e) => { e.stopPropagation(); toggle(r.clave); }}><i /></button>
                </div>
              ); })}
            </section>
          ))}
        </div>
      </Card>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div><h3 style={{ margin: 0, color: NAVY, fontSize: 14.5, fontWeight: 700, fontFamily: DISPLAY_FONT, display: "flex", alignItems: "center", gap: 8 }}>Pacientes por volver {cola.some((c) => c.estado === "por_contactar") && <span className="dc-rec__pend">{cola.filter((c) => c.estado === "por_contactar").length} por contactar</span>}</h3><div style={{ fontSize: 12.5, color: "var(--dc-ink-500)", marginTop: 2 }}>Sin control hace más de 6 meses. El recall les propone una cita automáticamente.</div></div>
          {puedeEnviar && cola.some((c) => c.estado === "por_contactar") && <Btn small onClick={enviarTodos}><Send size={14} strokeWidth={1.75} /> Enviar a todos</Btn>}
        </div>
        {cola.map((p) => { const col = colorDe(p.nombre); return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderTop: "1px solid var(--dc-line)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: tint(col, 0.102), color: col, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{iniciales(p.nombre)}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY }}>{p.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>Última visita: {p.ultima}</div></div>
            {p.estado === "enviado" ? <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)", background: "var(--dc-ok-soft)", padding: "4px 11px", borderRadius: "var(--dc-r-full)", display: "inline-flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={13} strokeWidth={1.75} /> Enviado</span> : <Btn small kind="ghost" onClick={() => enviar(p.id)}><Send size={13} strokeWidth={1.75} /> Recordar</Btn>}
          </div>
        ); })}
        {cola.length === 0 && <Vacio icon={<CheckCircle2 size={24} strokeWidth={1.75} />} titulo="Todos al día" sub="No hay pacientes pendientes de recall." />}
      </Card>
      </>)}
      {cfg && (() => { const Ic = cfg.icon; return (
        <Modal icon={<Ic size={20} strokeWidth={1.75} />} tone={cfg.color} titulo={cfg.l} sub={`Automatización · se envía ${cfg.timing.toLowerCase()}`} onClose={() => setCfg(null)} maxW={520}
          footer={<><Btn small kind="ghost" onClick={() => setCfg(null)}>Cancelar</Btn><Btn small onClick={guardarCfg}><Check size={15} strokeWidth={1.75} /> Guardar mensaje</Btn></>}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "11px 13px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500 }}>Cuándo se envía</div><div style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, marginTop: 2 }}>{cfg.timing}</div></div>
            <div style={{ flex: 1, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "11px 13px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500 }}>Canal</div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--dc-ok-700)", fontFamily: DISPLAY_FONT, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}><MessageSquare size={14} strokeWidth={1.75} /> WhatsApp</div></div>
            <div style={{ flex: 1, background: cfg.on ? "var(--dc-ok-soft)" : "var(--dc-bg)", border: `1px solid ${cfg.on ? "var(--dc-green-soft)" : "var(--dc-line)"}`, borderRadius: "var(--dc-r-md)", padding: "11px 13px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500 }}>Estado</div><div style={{ fontSize: 14, fontWeight: 600, color: cfg.on ? "var(--dc-ok-700)" : "var(--dc-ink-500)", fontFamily: DISPLAY_FONT, marginTop: 2 }}>{cfg.on ? "Activo" : "Pausado"}</div></div>
          </div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 7 }}>Mensaje <span style={{ color: "var(--dc-ink-500)", fontWeight: 500 }}>· {"{nombre}"}, {"{fecha}"}, {"{hora}"}, {"{doctor}"}, {"{sede}"} se reemplazan solos</span></label>
          <textarea className="dc-premium-inp" value={cfgMsg} onChange={(e) => setCfgMsg(e.target.value)} rows={4} style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "var(--dc-bg)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
          {/* Vista previa tipo burbuja de WhatsApp */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><MessageSquare size={13} strokeWidth={1.75} color="var(--dc-ok-700)" /> Vista previa (así le llega al paciente)</div>
            <div style={{ background: "var(--dc-bg)", borderRadius: "var(--dc-r-md)", padding: "14px 12px", display: "flex", justifyContent: "flex-end" }}>
              <div style={{ maxWidth: "82%", background: "var(--dc-ok-soft)", borderRadius: "12px 12px 2px 12px", padding: "8px 11px", boxShadow: "0 1px 1px rgba(0,0,0,.12)", fontSize: 13, color: "var(--dc-ink-900)", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                {previewMsg(cfgMsg) || "…"}
                <div style={{ fontSize: 12, color: "var(--dc-ink-400)", textAlign: "right", marginTop: 3, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>10:00 <CheckCheck size={13} strokeWidth={1.75} color="var(--dc-brand-soft)" /></div>
              </div>
            </div>
          </div>
          {/* Probar ahora */}
          <div style={{ marginTop: 14, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "12px 13px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", marginBottom: 7 }}>Probar ahora <span style={{ color: "var(--dc-ink-500)", fontWeight: 500 }}>· envíate este mensaje a un número real</span></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="dc-premium-inp" value={probarTel} onChange={(e) => setProbarTel(e.target.value)} placeholder="51987654321" inputMode="tel" style={{ flex: 1, minWidth: 160, padding: "9px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "var(--dc-white)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box" }} />
              <Btn small kind="ghost" onClick={probarAhora}><Send size={14} strokeWidth={1.75} /> Enviar prueba</Btn>
            </div>
          </div>
          {/* Plantilla HSM (envíos fuera de la ventana de 24 h de Meta) */}
          <div style={{ marginTop: 14, background: "var(--dc-warn-soft)", border: "1px solid var(--dc-amber-soft)", borderRadius: "var(--dc-r-md)", padding: "12px 13px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-warn-ink)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Shield size={13} strokeWidth={1.75} /> Plantilla aprobada de Meta (HSM)</div>
            <div style={{ fontSize: 12, color: "var(--dc-warn-ink)", marginBottom: 8, lineHeight: 1.4 }}>Necesaria para escribirle al paciente si no nos ha escrito en 24 h. Registra la plantilla en Meta y pon aquí su nombre exacto. Dentro de las 24 h se usa el mensaje de arriba.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="dc-premium-inp" value={cfgHsm} onChange={(e) => setCfgHsm(e.target.value)} placeholder="nombre_de_plantilla_aprobada" style={{ flex: 1, minWidth: 200, padding: "9px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-amber-soft)", background: "var(--dc-white)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box" }} />
              <Btn small kind="ghost" onClick={probarHsm}><Send size={14} strokeWidth={1.75} /> Probar plantilla</Btn>
            </div>
          </div>
          {puedeEnviar && <button aria-label="Activar o desactivar" onClick={() => { toggle(cfg.clave); setCfg({ ...cfg, on: !cfg.on }); }} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 9, background: cfg.on ? "var(--dc-warn-soft)" : "var(--dc-ok-soft)", border: "none", borderRadius: "var(--dc-r-md)", padding: "9px 13px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: cfg.on ? "var(--dc-warn-600)" : "var(--dc-ok-700)" }}>{cfg.on ? <><Power size={15} strokeWidth={1.75} /> Pausar automatización</> : <><Zap size={15} strokeWidth={1.75} /> Activar automatización</>}</button>}
        </Modal>
      ); })()}
    </div>
  );
}

export default Recall;
