/* Módulo WhatsApp + IA (inbox, agente, configuración del asistente).
   Extraído de App.jsx para servirse en un chunk aparte (code splitting). */
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, PanelRightClose, PanelRightOpen, AlertTriangle, Bot, Building2, Calendar, Check, CheckCheck, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Info, MessageSquare, Phone, Plus, Repeat, Search, Send, Settings, Smile, Sparkles, Star, Trash2, TrendingUp, User, UserCheck, UserPlus, X, Zap } from "lucide-react";
import api, { auth } from "../api/client";
import {EnCabecera, Btn, Card, DISPLAY_FONT, DS, ESPECIALIDADES, Field, HORARIO_DEF, INK, Modal, NAVY, RED, ROL_PERMS, hoy, puede, tint} from "../comun";
import { AgendarRecepcionModal, BtnReniec } from "../compartido/AgendarRecepcionModal";
import "./whatsappInbox.css";

function respuestaAgente(texto, ctx) {
  const t = texto.toLowerCase();
  if (/(reclamo|queja|molest|mal aten|deman|urgenc|emergencia|sangr|much[oa] dolor|me duele mucho)/.test(t))
    return { texto: "Uy, lamento mucho que te haya pasado esto 🙏 Déjame coordinarlo con el área de atención al paciente para darte una solución hoy mismo. Te escriben por aquí en unos minutos, ¿te parece?", escalar: true, tools: ["derivar_area"] };
  if (/(precio|costo|cu[aá]nto|tarifa|cuesta)/.test(t)) {
    let esp = ESPECIALIDADES.find((e) => t.includes(e.nombre.split(" ")[0].toLowerCase()));
    if (/limpieza|profilaxis/.test(t)) esp = ESPECIALIDADES[0];
    if (/brackets|ortodonc/.test(t)) esp = ESPECIALIDADES[1];
    if (esp) return { texto: `Una consulta de ${esp.nombre} cuesta S/ ${esp.precio}. ¿Te agendo una cita? Tengo cupos esta semana. 😊`, tools: ["consultar_precio"], propone: true };
    return { texto: "Con gusto. Nuestras consultas van desde S/ 80 (general) hasta S/ 220 (endodoncia). ¿Para qué especialidad quieres saber?", tools: ["consultar_precio"] };
  }
  if (/(cita|agendar|reservar|turno|disponib|atend)/.test(t)) {
    if (/ortodonc|brackets/.test(t)) return { texto: "¡Claro! Para ortodoncia tengo al Dr. Luis Paredes en San Isidro. Veo cupo mañana 10:00 o jueves 16:00. ¿Cuál prefieres?", tools: ["ver_disponibilidad"], propone: true };
    if (/niñ|hijo|pediatr|menor/.test(t)) return { texto: "Perfecto, para tu niño tenemos odontopediatría con la Dra. Sofía Torres en Surco. Hay cupo hoy 15:30. ¿Lo reservo? 🧒", tools: ["ver_disponibilidad"], propone: true };
    return { texto: "¡Con gusto te agendo! ¿Qué necesitas? Tenemos general, ortodoncia, endodoncia, periodoncia y odontopediatría. ¿Prefieres San Isidro o Surco?", tools: ["ver_disponibilidad"] };
  }
  if (ctx.proponiendo && /(s[ií]|confirmo|ya|dale|reserva|ese|esa|jueves|mañana|hoy|10:00|15:30|16:00)/.test(t))
    return { texto: "¡Listo! ✅ Tu cita quedó agendada. Te envío confirmación por WhatsApp y correo, y te recuerdo 48 h y 2 h antes. ¿Algo más?", tools: ["agendar_cita", "enviar_confirmacion"], agenda: true };
  if (/(cancelar|reprogramar|cambiar|no podr[eé]|otro d[ií]a)/.test(t))
    return { texto: "Sin problema, reprogramo tu cita. Veo que tienes una el viernes 09:00. ¿Para qué día la movemos? Hay cupos lunes y martes.", tools: ["buscar_cita", "ver_disponibilidad"] };
  if (/(d[oó]nde|direcci[oó]n|ubicad|sede|horario|abren)/.test(t))
    return { texto: "Tenemos 📍 San Isidro (Av. Conquistadores 145) y 📍 Surco (Av. Caminos del Inca 890). Atendemos L-S de 8:00 a 18:00. ¿A cuál vienes?", tools: ["consultar_sedes"] };
  if (/(hola|buenas|buenos|qué tal|hey)/.test(t))
    return { texto: "¡Hola! 👋 Bienvenido a Clínica Dental Sonríe+. Soy el asistente virtual. Puedo agendar tu cita, darte precios o resolver dudas. ¿En qué te ayudo?", tools: [] };
  return { texto: "Mmm, déjame ayudarte mejor 😊 Puedo agendarte una cita, darte precios, horarios o cómo llegar. ¿Qué te gustaría hacer? Si lo prefieres, también te derivo con el área de atención.", tools: [] };
}

// Fechas de la demostración relativas a hoy: un chat de hoy, uno de ayer, uno de
// esta semana y uno más antiguo, para que la lista muestre los cuatro formatos.
const haceDias = (n, hm) => { const d = new Date(); d.setDate(d.getDate() - n); const [h, m] = hm.split(":").map(Number); d.setHours(h, m, 0, 0); return d.toISOString(); };
const CHATS_INIT = [
  { id: 1, nombre: "Rosa Linares", tel: "+51 987 654 321", modo: "ia", noLeidos: 0, actualizado: haceDias(0, "14:03"), msgs: [
    { de: "paciente", txt: "Hola buenas tardes", t: "14:02" },
    { de: "ia", txt: "¡Hola! 👋 Bienvenida a Sonríe+. Soy el asistente virtual. ¿En qué te ayudo hoy?", t: "14:02" },
    { de: "paciente", txt: "Quiero una cita para limpieza", t: "14:03" },
    { de: "ia", txt: "¡Con gusto! Una limpieza cuesta S/ 80. Tengo cupo mañana 09:00 con la Dra. Carla Mendoza en San Isidro. ¿Te lo reservo? 😊", t: "14:03", tools: ["consultar_precio","ver_disponibilidad"] },
  ] },
  { id: 2, nombre: "Jorge Núñez", tel: "+51 912 887 445", modo: "ia", noLeidos: 2, actualizado: haceDias(1, "13:50"), msgs: [
    { de: "paciente", txt: "cuánto cuestan los brackets?", t: "13:45" },
    { de: "ia", txt: "Una consulta de Ortodoncia cuesta S/ 150. Ahí el especialista evalúa tu caso y te da el plan. ¿Te agendo? 😊", t: "13:45", tools: ["consultar_precio"] },
    { de: "paciente", txt: "sí porfa para el sábado", t: "13:50" },
  ] },
  { id: 3, nombre: "Ana Beltrán", tel: "+51 998 112 334", modo: "humano", noLeidos: 1, actualizado: haceDias(3, "12:30"), msgs: [
    { de: "paciente", txt: "Estoy muy molesta, esperé 1 hora y no me atendieron", t: "12:30" },
    { de: "ia", txt: "Uy, lamento muchísimo la espera, de verdad no debió pasar 🙏 Ya estoy coordinando con el área de atención al paciente para resolverlo; te escriben enseguida por aquí.", t: "12:30", tools: ["derivar_area"] },
    { de: "sistema", txt: "— Conversación derivada al área de atención al paciente —", t: "12:30" },
  ] },
  { id: 4, nombre: "Luis Paredes", tel: "+51 945 330 218", modo: "ia", noLeidos: 0, actualizado: haceDias(12, "10:15"), msgs: [
    { de: "paciente", txt: "¿Atienden los domingos?", t: "10:14" },
    { de: "ia", txt: "Atendemos de lunes a sábado de 8:00 a. m. a 6:00 p. m. 🕗 ¿Te busco un horario?", t: "10:15" },
  ] },
];

function WhatsAppInbox({ onAgendar, notify = () => {} }) {
  const conectado = !!auth.token;
  const [chats, setChats] = useState(conectado ? [] : CHATS_INIT);
  const [agendar, setAgendar] = useState(null);   // {canal, motivo} para abrir el modal
  const abrirAgendar = (motivo) => { if (conectado) setAgendar({ canal: "whatsapp", motivo: motivo || "" }); else onAgendar?.(); };
  const [activo, setActivo] = useState(conectado ? null : 1);
  const [input, setInput] = useState("");
  const [ctx, setCtx] = useState({});
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");   // todos | ia | humano
  // Ficha 360, métricas del agente y editor de instrucciones
  const [ficha360, setFicha360] = useState(null);        // datos de la ficha 360 en modal
  const [metricas, setMetricas] = useState(null);
  const [instrOpen, setInstrOpen] = useState(false);
  const [iaTab, setIaTab] = useState("identidad");
  const [instrText, setInstrText] = useState("");
  const [infoText, setInfoText] = useState("");
  const [perfil, setPerfil] = useState({ nombreComercial: "", trato: "usted", tono: "cercano", emojis: "poco", empatia: "alto", personalidad: "cercana", iniciativa: "cerrar" });
  const [objetivos, setObjetivos] = useState([]);   // objetivos comerciales (chips)
  const [serviciosPrio, setServiciosPrio] = useState([]);   // servicios prioritarios (chips)
  const [nuevoServicio, setNuevoServicio] = useState("");
  const [nuevoObjetivo, setNuevoObjetivo] = useState("");
  const [salud, setSalud] = useState(null);
  const [conexion, setConexion] = useState(null);
  const [conexionOpen, setConexionOpen] = useState(false);
  const [listError, setListError] = useState(null);
  const [listLoaded, setListLoaded] = useState(!conectado);
  const [listLoading, setListLoading] = useState(!!conectado);
  const modoDemo = conectado && !!salud?.demo;
  const [probando, setProbando] = useState(false);
  const [probarResultado, setProbarResultado] = useState(null); // { ok: boolean, texto: string }
  const permsWa = auth.sesion?.permisos || ROL_PERMS[auth.sesion?.rol] || {};
  const puedeConfigurarWa = puede(permsWa, "whatsapp", "configurar") || ["admin", "ti"].includes(auth.sesion?.rol);
  const mensajeSaludUi = (s) => {
    const raw = (s?.mensaje || "").toString();
    if (!raw) return "WhatsApp no está conectado. Avisa a soporte.";
    if (/quarkus|endpoint|WHATSAPP_|OPENAI_/i.test(raw)) return "WhatsApp no está conectado. Avisa a soporte.";
    return raw;
  };
  const cargarSalud = () => { if (!conectado) return; api.agente.salud().then(setSalud).catch(() => {}); };
  const cargarConexion = () => { if (!conectado || !puedeConfigurarWa) return; api.agente.conexion().then(setConexion).catch(() => {}); };
  const probarConexion = () => {
    setProbando(true);
    setProbarResultado(null);
    api.agente.salud().then((s) => {
      setSalud(s);
      const fallos = Number(s?.fallos24h) || 0;
      const ok = !!s?.ok;
      let texto;
      if (ok && fallos === 0) texto = "Conexión con WhatsApp correcta.";
      else if (ok && fallos > 0) texto = mensajeSaludUi(s) || `Hay ${fallos} fallo(s) en 24 h.`;
      else texto = mensajeSaludUi(s);
      setProbarResultado({ ok, texto });
      notify(texto);
      cargarConexion();
    }).catch(() => {
      setProbarResultado({ ok: false, texto: "No se pudo probar la conexión." });
      notify("No se pudo probar la conexión.");
    }).finally(() => setProbando(false));
  };
  useEffect(() => { if (conectado) { api.agente.metricas().then(setMetricas).catch(() => {}); cargarSalud(); cargarConexion(); } }, []); // eslint-disable-line
  // Sedes y servicios de ESTA clínica, para las respuestas rápidas de recepción.
  const [sedesReales, setSedesReales] = useState([]);
  const [espsReales, setEspsReales] = useState([]);
  useEffect(() => {
    if (!conectado) return;
    api.sedes.listar().then((x) => setSedesReales(Array.isArray(x) ? x : [])).catch(() => {});
    api.catalogo.especialidades().then((x) => setEspsReales(Array.isArray(x) ? x : [])).catch(() => {});
  }, []); // eslint-disable-line
  /**
   * Horario de atención en una línea ("lunes a sábado de 09:00 a 19:00"), leído de donde
   * lo guarda Configuración. Si la clínica no lo ha cargado devuelve "" y la respuesta
   * rápida de horarios no se ofrece: mejor que ofrecer un horario que no es el suyo.
   */
  const horarioTexto = () => {
    let h = null;
    try { h = (JSON.parse(localStorage.getItem("dc_data_v1_clinica_horario") || "null") || {}).horario; } catch { h = null; }
    if (!h || !Object.keys(h).length) return "";
    const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const tramos = [];
    for (const d of [1, 2, 3, 4, 5, 6, 0]) {
      const j = h[String(d)] || HORARIO_DEF[String(d)];
      if (!j || j.cerrado) continue;
      const franja = `de ${(j.abre || "").slice(0, 5)} a ${(j.cierra || "").slice(0, 5)}`;
      const ult = tramos[tramos.length - 1];
      if (ult && ult.franja === franja) ult.hasta = d; else tramos.push({ desde: d, hasta: d, franja });
    }
    if (!tramos.length) return "";
    return tramos.map((t) => (t.desde === t.hasta ? DIAS[t.desde] : `${DIAS[t.desde]} a ${DIAS[t.hasta]}`) + " " + t.franja).join(", y ");
  };
  const abrirFicha = (pid, nombre) => {
    if (!conectado || !pid) { notify(`${nombre || "El contacto"}: abre el módulo Pacientes para ver su ficha completa.`); return; }
    api.pacientes.ficha360(pid).then((d) => setFicha360(d)).catch(() => notify("No se pudo cargar la ficha.")); // WA-10
  };
  const abrirInstrucciones = () => { api.agente.getInstrucciones().then((r) => { setInstrText(r?.instrucciones || ""); setInfoText(r?.informacion || ""); setPerfil({ nombreComercial: r?.nombreComercial || "", trato: r?.trato || "usted", tono: r?.tono || "cercano", emojis: r?.emojis || "poco", empatia: r?.empatia || "alto", personalidad: r?.personalidad || "cercana", iniciativa: r?.iniciativa || "cerrar" }); setObjetivos((r?.objetivos || "").split("\n").map((s) => s.trim()).filter(Boolean)); setServiciosPrio((r?.serviciosPrioritarios || "").split("\n").map((s) => s.trim()).filter(Boolean)); setInstrOpen(true); }).catch(() => { setInstrText(""); setInfoText(""); setInstrOpen(true); }); };
  const guardarInstrucciones = () => { api.agente.setInstrucciones({ instrucciones: instrText, informacion: infoText, nombreComercial: perfil.nombreComercial, trato: perfil.trato, tono: perfil.tono, emojis: perfil.emojis, empatia: perfil.empatia, personalidad: perfil.personalidad, iniciativa: perfil.iniciativa, serviciosPrioritarios: serviciosPrio.join("\n"), objetivos: objetivos.join("\n") }).then(() => { notify("Configuración del agente actualizada."); setInstrOpen(false); cargarSalud(); }).catch(() => notify("No se pudieron guardar.")); };
  const OBJETIVOS_SUG = ["Priorizar citas del mismo día", "Promover consulta / evaluación", "Reactivar pacientes inactivos"];
  const SERVICIOS_SUG = ["Consulta / evaluación", "Blanqueamiento dental", "Ortodoncia — cuota mensual", "Profilaxis (limpieza dental)", "Resina / obturación", "Ortodoncia — cuota inicial"];
  const toggleObjetivo = (o) => setObjetivos((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]);
  const toggleServicio = (o) => setServiciosPrio((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]);
  const agregarServicio = () => { const v = nuevoServicio.trim(); if (v && !serviciosPrio.includes(v)) setServiciosPrio((p) => [...p, v]); setNuevoServicio(""); };
  const agregarObjetivo = () => { const v = nuevoObjetivo.trim(); if (v && !objetivos.includes(v)) setObjetivos((p) => [...p, v]); setNuevoObjetivo(""); };
  // Perfiles de personalidad: aplican combos de estilo/empatía/emojis/trato de una vez.
  const PERSONALIDADES = [
    ["cercana", "Cercana ★", { tono: "cercano", empatia: "alto", emojis: "poco", trato: "usted" }],
    ["profesional", "Profesional", { tono: "profesional", empatia: "alto", emojis: "poco", trato: "usted" }],
    ["premium", "Premium", { tono: "premium", empatia: "alto", emojis: "poco", trato: "usted" }],
    ["infantil", "Infantil", { tono: "muy_cercano", empatia: "muy_alto", emojis: "normal", trato: "tu" }],
    ["familiar", "Familiar", { tono: "muy_cercano", empatia: "alto", emojis: "poco", trato: "tu" }],
    ["ejecutiva", "Ejecutiva", { tono: "profesional", empatia: "normal", emojis: "nunca", trato: "usted" }],
  ];
  const aplicarPersonalidad = (id, combo) => setPerfil((p) => ({ ...p, personalidad: id, ...combo }));
  const scrollRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  // Móvil: se ve la lista o la conversación, como en WhatsApp. Escritorio mediano:
  // el panel del contacto se abre a demanda con el botón de información.
  const [enHilo, setEnHilo] = useState(false);
  const [verInfo, setVerInfo] = useState(false);
  // En pantallas grandes el panel del contacto está fijo pero se puede ocultar
  // para dar más ancho a la conversación (se recuerda en este navegador).
  const [ocultarInfo, setOcultarInfo] = useState(() => { try { return localStorage.getItem("dc_wa_info_oculta") === "1"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("dc_wa_info_oculta", ocultarInfo ? "1" : "0"); } catch { /* */ } }, [ocultarInfo]);
  const PANEL_FIJO = 1500;
  const [, setAncho] = useState(0);
  useEffect(() => { const f = () => setAncho(window.innerWidth); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const alternarInfo = () => { if (window.innerWidth > PANEL_FIJO) setOcultarInfo((v) => !v); else setVerInfo((v) => !v); };
  const chat = chats.find((c) => c.id === activo);
  const scrollBottom = (smooth) => { const el = scrollRef.current; if (el) { el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" }); setAtBottom(true); } };
  // Al abrir una conversación: baja al último mensaje.
  useEffect(() => { const t = setTimeout(() => scrollBottom(false), 40); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [activo]);
  // Al llegar un mensaje nuevo: baja solo si ya estabas abajo (como WhatsApp).
  useEffect(() => { if (atBottom) scrollBottom(false); /* eslint-disable-next-line */ }, [chat?.msgs.length]);
  const ahora = () => new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  // Hora en la lista de chats, como WhatsApp: hoy → hora; ayer → "Ayer"; en los
  // últimos 7 días → día de la semana; antes → fecha corta.
  const cuandoLista = (iso) => {
    if (!iso) return "";
    const d = new Date(iso); if (isNaN(d)) return "";
    const ahora = new Date();
    const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dif = Math.round((dia(ahora) - dia(d)) / 86400000);
    if (dif <= 0) return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (dif === 1) return "Ayer";
    if (dif < 7) { const w = d.toLocaleDateString("es-PE", { weekday: "long" }); return w.charAt(0).toUpperCase() + w.slice(1); }
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };
  const hhmm = (iso) => { try { return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  const fechaDe = (iso) => { try { return new Date(iso).toISOString().slice(0, 10); } catch { return null; } };
  const diaLabel = (f) => {
    if (!f) return "";
    const hoy = new Date().toISOString().slice(0, 10);
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (f === hoy) return "Hoy"; if (f === ayer) return "Ayer";
    try { return new Date(f + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }); } catch { return f; }
  };
  const fmtCreado = (iso) => { try { return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; } };

  // ── Modo conectado: conversaciones reales desde el backend (WhatsApp) ──
  const mapConv = (c) => {
    // Un número = un contacto de WhatsApp que puede gestionar a varias personas (familia).
    // La identidad de la conversación es el contacto (nombre de perfil de WhatsApp), NO un paciente.
    const pacs = Array.isArray(c.pacientes) ? c.pacientes : (c.pacienteId ? [{ id: c.pacienteId, nombre: c.pacienteNombre, proximaCita: c.proximaCita, ultimaCita: c.ultimaCita }] : []);
    const nombre = c.nombreContacto || c.pacienteNombre || c.telefono;
    return { id: c.id, nombre, tel: c.telefono, modo: c.modo || "ia", ejemplo: !!c.ejemplo, creado: c.creadoEn, actualizado: c.actualizadoEn, esPaciente: !!c.esPaciente, pacienteId: c.pacienteId || null, pacienteNombre: c.pacienteNombre || null, pacientes: pacs, ultimoMensaje: c.ultimoMensaje || null, porResponder: c.porResponder || 0, proximaCita: c.proximaCita || null, ultimaCita: c.ultimaCita || null, msgs: [] };
  };
  const cargarMensajes = (id) => {
    if (!conectado || !id) return;
    api.conversaciones.mensajes(id)
      .then((ms) => setChats((cs) => cs.map((c) => c.id === id ? { ...c, msgs: (ms || []).map((m) => ({ de: m.emisor, txt: m.texto, t: hhmm(m.creadoEn), fecha: fechaDe(m.creadoEn), tools: m.toolsUsadas, estado: m.estado })) } : c)))
      .catch(() => {}); // WA-10: 404/errores aislados — no tumbar la bandeja
  };
  // Refresca la lista SIN perder los mensajes ya cargados (merge por id) — antes
  // recreaba la lista con msgs vacío y se "borraba" la conversación abierta.
  // En entorno conectado (no demo) nunca mostrar chats de ejemplo.
  const soloReales = (cv) => (cv || []).filter((c) => !c.ejemplo || !!salud?.demo);
  const cargarConversaciones = () => {
    if (!conectado) return;
    setListLoading(true);
    api.conversaciones.listar()
      .then((cv) => {
        setListError(null);
        const rows = soloReales(cv);
        setChats((prev) => {
          const prevMsgs = Object.fromEntries(prev.map((c) => [c.id, c.msgs]));
          return rows.map((c) => ({ ...mapConv(c), msgs: prevMsgs[c.id] || [] }));
        });
        setActivo((a) => {
          if (a && rows.some((c) => c.id === a)) return a;
          return rows[0] ? rows[0].id : null;
        });
      })
      .catch((e) => {
        // No vaciar la bandeja ante 5xx intermitentes (pool): conserva lo ya cargado.
        const msg = (e && e.message) || "No se pudieron cargar las conversaciones.";
        setListError(msg);
        notify(msg);
      })
      .finally(() => { setListLoading(false); setListLoaded(true); });
  };
  useEffect(() => { cargarConversaciones(); /* eslint-disable-next-line */ }, []);
  // Al cambiar de conversación, carga sus mensajes.
  useEffect(() => { if (conectado && activo) cargarMensajes(activo); /* eslint-disable-next-line */ }, [activo, conectado]);
  // Refresco periódico (sin websockets): lista + mensajes de la conversación abierta.
  // Se pausa cuando la pestaña no está visible: antes seguía pidiendo lista + mensajes
  // cada 12 s aunque el navegador estuviera en otra pestaña o minimizado, cargando al
  // backend sin que nadie lo estuviera mirando. Al volver refresca de inmediato, así
  // que no se pierde nada.
  useEffect(() => {
    if (!conectado) return;
    const refrescar = () => { cargarConversaciones(); if (activo) cargarMensajes(activo); };
    let t = null;
    const arrancar = () => { if (t == null) t = setInterval(refrescar, 30000); };
    const parar = () => { if (t != null) { clearInterval(t); t = null; } };
    const alCambiarVisibilidad = () => {
      if (document.hidden) parar();
      else { refrescar(); arrancar(); }
    };
    if (!document.hidden) arrancar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => { parar(); document.removeEventListener("visibilitychange", alCambiarVisibilidad); };
    /* eslint-disable-next-line */
  }, [conectado, activo]);
  const seleccionar = (id) => { setActivo(id); setEnHilo(true); if (conectado) cargarMensajes(id); else setChats((cs) => cs.map((c) => c.id === id ? { ...c, noLeidos: 0 } : c)); };
  const eliminarChat = (id) => {
    if (!id) return;
    if (!window.confirm("¿Eliminar esta conversación y sus mensajes? No se puede deshacer.")) return;
    if (!conectado) { setChats((cs) => cs.filter((c) => c.id !== id)); if (activo === id) setActivo(null); return; }
    api.conversaciones.eliminar(id)
      .then(() => { setChats((cs) => cs.filter((c) => c.id !== id)); if (activo === id) setActivo(null); notify("Conversación eliminada."); })
      .catch(() => notify("No se pudo eliminar la conversación."));
  };
  // Registrar el contacto de WhatsApp como paciente (teléfono precargado + RENIEC).
  const [nuevoPac, setNuevoPac] = useState(null);
  const abrirRegistro = () => setNuevoPac({ nombre: chat && chat.nombre && chat.nombre !== chat.tel ? chat.nombre : "", dni: "", telefono: chat ? chat.tel : "" });
  const guardarPaciente = (agendarDespues) => {
    if (!nuevoPac.nombre.trim()) { notify("Ingresa el nombre del paciente."); return; }
    const tel = (nuevoPac.telefono || "").replace(/\D/g, "").replace(/^51/, "").slice(-9);
    if (tel && tel.length !== 9) { notify("Celular: 9 dígitos (ej. 999888777)."); return; }
    if (conectado) {
      api.pacientes.crear({ nombre: nuevoPac.nombre, dni: nuevoPac.dni || null, telefono: tel || null })
        .then(() => { notify(`${nuevoPac.nombre} registrado como paciente.`); setNuevoPac(null); cargarConversaciones(); if (agendarDespues) abrirAgendar(`Cita para ${nuevoPac.nombre} (desde WhatsApp)`); })
        .catch((e) => notify("No se pudo registrar: " + ((e && e.message) || "")));
    } else { notify("En demo, registra pacientes desde el módulo Pacientes."); setNuevoPac(null); if (agendarDespues) abrirAgendar("Registrado desde WhatsApp"); }
  };

  const recibir = (txt) => {
    if (modoDemo && activo) {
      api.conversaciones.simular(activo, txt)
        .then(() => { cargarMensajes(activo); cargarConversaciones(); })
        .catch(() => notify("No se pudo simular el mensaje."));
      return;
    }
    // Solo sin backend: simula un mensaje del paciente y la respuesta IA en el cliente.
    setChats((cs) => cs.map((c) => c.id === activo ? { ...c, actualizado: new Date().toISOString(), msgs: [...c.msgs, { de: "paciente", txt, t: ahora() }] } : c));
    if (chat.modo === "humano") return;
    setTimeout(() => {
      const r = respuestaAgente(txt, ctx);
      setChats((cs) => cs.map((c) => {
        if (c.id !== activo) return c;
        const add = [{ de: "ia", txt: r.texto, t: ahora(), tools: r.tools }];
        if (r.escalar) add.push({ de: "sistema", txt: "— Conversación derivada al área de atención al paciente —", t: ahora() });
        return { ...c, modo: r.escalar ? "humano" : c.modo, msgs: [...c.msgs, ...add] };
      }));
      setCtx({ proponiendo: !!r.propone });
      if (r.agenda) abrirAgendar("Agendado desde WhatsApp");
    }, 650);
  };
  const enviarHumano = () => {
    if (!input.trim()) return;
    const txt = input; setInput("");
    if (conectado) {
      setChats((cs) => cs.map((c) => c.id === activo ? { ...c, actualizado: new Date().toISOString(), msgs: [...c.msgs, { de: "agente", txt, t: ahora(), fecha: fechaDe(new Date().toISOString()) }] } : c));
      api.conversaciones.enviar(activo, { emisor: "agente", texto: txt })
        .then(() => cargarMensajes(activo))
        .catch(() => notify("No se pudo enviar el mensaje."));
      return;
    }
    setChats((cs) => cs.map((c) => c.id === activo ? { ...c, actualizado: new Date().toISOString(), msgs: [...c.msgs, { de: "agente", txt, t: ahora() }] } : c));
  };
  const tomar = () => {
    if (conectado) {
      const nuevo = chat.modo === "ia" ? "humano" : "ia";
      setChats((cs) => cs.map((c) => c.id === activo ? { ...c, modo: nuevo } : c));
      api.conversaciones.modo(activo, nuevo).then(() => notify(nuevo === "humano" ? "Tomaste el control de la conversación." : "La IA vuelve a responder.")).catch(() => { cargarConversaciones(); notify("No se pudo cambiar el modo."); });
      return;
    }
    setChats((cs) => cs.map((c) => c.id === activo ? { ...c, modo: c.modo === "ia" ? "humano" : "ia" } : c));
  };

  // Burbuja al estilo WhatsApp: entrante en blanco a la izquierda; saliente a la
  // derecha (verde si escribe recepción, aqua si responde el asistente IA). La hora
  // y los ticks van dentro de la burbuja, abajo a la derecha. La "colita" solo en
  // el primer mensaje de cada racha del mismo emisor.
  const burbuja = (m, i, primero) => {
    if (m.de === "sistema") return <div key={i} className="wa-sis"><span>{m.txt}</span></div>;
    const sale = m.de !== "paciente";
    const cls = `wa-b ${sale ? "wa-b--out" : "wa-b--in"}${m.de === "ia" ? " wa-b--ia" : ""}${primero ? " wa-b--cola" : ""}`;
    return (
      <div key={i} className={`wa-fila ${sale ? "wa-fila--out" : ""}${primero ? " wa-fila--primero" : ""}`}>
        <div className={cls}>
          {primero && m.de === "ia" && <div className="wa-b__autor"><Bot size={12} strokeWidth={2} /> Asistente IA</div>}
          {primero && m.de === "agente" && <div className="wa-b__autor wa-b__autor--rec"><UserCheck size={12} strokeWidth={2} /> Recepción</div>}
          <span className="wa-b__txt">{m.txt}</span>
          {m.tools?.length > 0 && <div className="wa-b__tools">{m.tools.map((tl, k) => <span key={k}><Zap size={10} strokeWidth={2} /> {tl}()</span>)}</div>}
          <span className="wa-b__meta">{m.t}{sale && ticks(m.estado)}</span>
        </div>
      </div>
    );
  };
  // Indicador de entrega tipo WhatsApp: ✓ enviado, ✓✓ entregado, ✓✓ azul leído, ⚠ fallido.
  const ticks = (estado) => {
    if (!estado || estado === "pendiente") return null;
    if (estado === "fallido") return <span title="No se pudo entregar" style={{ color: "var(--dc-danger)", fontWeight: 500 }}>⚠</span>;
    if (estado === "leido") return <CheckCheck size={15} strokeWidth={2} style={{ color: "#53BDEB" }} />;
    if (estado === "entregado") return <CheckCheck size={13} strokeWidth={1.75} style={{ color: "var(--dc-slate)" }} />;
    if (estado === "enviado") return <Check size={13} strokeWidth={1.75} style={{ color: "var(--dc-ink-400)" }} />;
    return null;
  };
  // Renderiza los mensajes con separadores de fecha (Hoy / Ayer / fecha).
  const hilo = (msgs) => {
    let ultima = null;
    return msgs.map((m, i) => {
      const sep = m.fecha && m.fecha !== ultima;
      if (m.fecha) ultima = m.fecha;
      const prev = msgs[i - 1];
      const primero = sep || !prev || prev.de !== m.de || prev.de === "sistema";
      return (
        <React.Fragment key={i}>
          {sep && <div className="wa-fecha"><span>{m.fecha}</span></div>}
          {burbuja(m, i, primero)}
        </React.Fragment>
      );
    });
  };
  const sugs = ["Hola, quiero agendar", "¿Cuánto cuesta una limpieza?", "Quiero brackets para el sábado", "Sí, confirma esa hora", "¿Dónde están ubicados?", "Cita para mi hijo", "Quiero un reclamo, estoy molesta"];
  const inicial = (n) => (n || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  // Respuestas rápidas para recepción (se insertan en el input para poder editarlas antes
  // de enviar). Las tres primeras venían con la dirección, el horario y los precios de la
  // clínica de ejemplo: recepción pulsa y envía, y el paciente recibe la dirección de otra
  // clínica. Con sesión se arman con lo suyo, y la que no tenga dato no se ofrece.
  const PLANTILLAS = (() => {
    const fijas = [
      ["Confirmar", "¡Tu cita quedó confirmada! Te esperamos. Cualquier cambio nos avisas por aquí. 🦷"],
      ["Gracias", "¡Gracias por escribirnos! Quedamos atentos a cualquier consulta. 😊"],
    ];
    if (!conectado) return [
      ["Precios", "Nuestras consultas van desde S/ 80 (general). ¿Para qué especialidad deseas el precio? 😊"],
      ["Horarios", "Atendemos de lunes a sábado de 8:00 a. m. a 6:00 p. m. 🕗"],
      ["Ubicación", "Estamos en 📍 San Isidro (Av. Conquistadores 145) y 📍 Surco (Av. Caminos del Inca 890)."],
      ...fijas,
    ];
    const out = [];
    const conPrecio = (espsReales || []).filter((e) => Number(e.precioBase) > 0);
    if (conPrecio.length) {
      const barato = conPrecio.reduce((a, b) => (Number(a.precioBase) <= Number(b.precioBase) ? a : b));
      out.push(["Precios", `Nuestras atenciones van desde S/ ${Number(barato.precioBase).toLocaleString()} (${(barato.nombre || "").toLowerCase()}). ¿Para qué atención deseas el precio? 😊`]);
    }
    const txtHorario = horarioTexto();
    if (txtHorario) out.push(["Horarios", `Atendemos ${txtHorario}. 🕗`]);
    const conDir = (sedesReales || []).filter((x) => (x.direccion || "").trim());
    if (conDir.length) out.push(["Ubicación", `Estamos en ${conDir.map((x) => `📍 ${x.nombre} (${x.direccion.trim()})`).join(" y ")}.`]);
    return [...out, ...fijas];
  })();

  const FILTROS = [["todos", "Todos"], ["pendientes", "Pendientes"], ["ia", "IA"], ["humano", "Recepción"]];
  const normQ = (s) => String(s || "").replace(/\D/g, "");
  // Más reciente arriba, como en WhatsApp.
  const porFecha = (a, b) => String(b.actualizado || "").localeCompare(String(a.actualizado || ""));
  const lista = [...chats].sort(porFecha).filter((c) => {
    if (!(filtro === "todos" || (filtro === "pendientes" ? (c.porResponder || 0) > 0 : c.modo === filtro))) return false;
    const raw = q.trim();
    if (!raw) return true;
    const hay = ((c.nombre || "") + " " + (c.tel || "")).toLowerCase();
    if (hay.includes(raw.toLowerCase())) return true;
    const qDigits = normQ(raw);
    if (qDigits.length >= 6) {
      const telDigits = normQ(c.tel);
      if (telDigits.includes(qDigits) || qDigits.includes(telDigits.slice(-9))) return true;
    }
    return false;
  });
  const busquedaActiva = q.trim() !== "" || filtro !== "todos";

  return (
    <div>
      {(() => { 
        const total = chats.length; 
        const porIA = chats.filter((c) => c.modo === "ia").length; 
        const humano = total - porIA; 
        const msgs = chats.reduce((s, c) => s + c.msgs.length, 0); 
        
        const sem = conectado ? (salud?.semaforo || "gris") : "verde";
        const cfg = { verde: ["var(--dc-ok-700)", "var(--dc-ok-soft)", "IA Conectada"], ambar: ["var(--dc-warn-600)", "var(--dc-warn-soft)", "Con fallos"], rojo: ["var(--dc-red-deep)", "var(--dc-danger-soft)", "Desconectado"], gris: ["var(--dc-ink-400)", "var(--dc-bg)", "Comprobando…"] }[sem];

        return (
          // Estado del canal y acciones en la cabecera de la app: toda la altura queda para el chat.
          <EnCabecera><div className="wa-estado">
            <div className="wa-estado__datos">
              <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: "var(--dc-r-full)", background: cfg[1], color: cfg[0], display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: 0, boxShadow: "0 2px 8px -2px "+tint(cfg[0], 0.251) }}>
                <span style={{ width: 6, height: 6, borderRadius: "var(--dc-r-full)", background: cfg[0] }}/> {cfg[2]}
              </span>
              <span className="wa-estado__sep" />
              <span><b>{total}</b> chats</span>
              <span style={{color: "var(--dc-ink-400)"}}>•</span>
              <span><b style={{color: "var(--dc-ok-700)", fontWeight: 500}}>{porIA}</b> IA</span>
              <span style={{color: "var(--dc-ink-400)"}}>•</span>
              <span><b style={{color: "var(--dc-warn-600)", fontWeight: 500}}>{humano}</b> Recepción</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="dc-inbox-header-actions">
              {/* WA-07: Probar conexión siempre visible con sesión (llama GET /salud). */}
              {conectado && (
                <Btn small kind="ghost" onClick={probarConexion} disabled={probando}>
                  {probando ? "Probando…" : "Probar conexión"}
                </Btn>
              )}
              {conectado && Number(salud?.fallos24h) > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-warn-mid, #f59e0b)", background: "var(--dc-warn-soft)", color: "var(--dc-warn-700)", fontSize: 12, fontWeight: 500 }}>
                  <AlertTriangle size={14} strokeWidth={2}/> Con fallos · {salud.fallos24h} en 24 h
                </span>
              )}
              {conectado && probarResultado && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "var(--dc-r-md)", fontSize: 12, fontWeight: 500,
                  border: `1px solid ${probarResultado.ok ? "var(--dc-ok-mid, #86efac)" : "var(--dc-danger-mid)"}`,
                  background: probarResultado.ok ? "var(--dc-ok-soft)" : "var(--dc-danger-soft)",
                  color: probarResultado.ok ? "var(--dc-ok-700)" : "var(--dc-red-deep)",
                }}>
                  {probarResultado.texto}
                </span>
              )}
              {conectado && puedeConfigurarWa && <Btn small kind="ghost" onClick={() => { setConexionOpen(true); cargarConexion(); }}><Phone size={14} strokeWidth={1.75} /> Conexión WhatsApp</Btn>}
              {conectado && <Btn small kind="ghost" onClick={abrirInstrucciones}><Settings size={14} strokeWidth={1.75} /> Configurar IA</Btn>}
            </div>
          </div></EnCabecera>
        ); 
      })()}
      {conectado && puedeConfigurarWa && conexionOpen && (
        <div className="dc-inbox-conexion">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ color: NAVY }}>Conexión WhatsApp</strong>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small onClick={probarConexion} disabled={probando}>{probando ? "Probando…" : "Probar conexión"}</Btn>
              <Btn small kind="ghost" onClick={() => setConexionOpen(false)}>Cerrar</Btn>
            </div>
          </div>
          <div><b>Número:</b> {conexion?.numero || salud?.numero || "—"}</div>
          <div><b>Estado:</b> {conexion?.estado || salud?.estado || "—"} · {mensajeSaludUi(conexion || salud)}</div>
          {(Number(salud?.fallos24h) > 0 || Number(conexion?.fallos24h) > 0) && (
            <div><b>Fallos 24 h:</b> {salud?.fallos24h ?? conexion?.fallos24h}</div>
          )}
        </div>
      )}
      {conectado && listError && (
        <div role="alert" style={{ marginBottom: 12, padding: "10px 14px", borderRadius: "var(--dc-r-md)", background: "var(--dc-danger-soft)", border: "1px solid var(--dc-danger-mid)", color: "var(--dc-red-deep)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AlertTriangle size={16} strokeWidth={2} /> No se pudo cargar la bandeja: {listError}</span>
          <Btn small onClick={cargarConversaciones}>Reintentar</Btn>
        </div>
      )}
      <Card className={`dc-inbox wa${enHilo && chat ? " is-hilo" : ""}${verInfo ? " is-info" : ""}${ocultarInfo ? " sin-info" : ""}`}>
        {/* Columna 1 · lista con búsqueda y filtros */}
        <div className="dc-inbox-list">
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--dc-line)", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 600, color: NAVY, fontSize: 14, fontFamily: DISPLAY_FONT }}>Chats</span>
              {conectado && <button type="button" className="dc-icon-btn" aria-label="Actualizar" onClick={cargarConversaciones} title="Actualizar" style={{ background: "none", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: 6, cursor: "pointer", color: DS.c.primary, display: "grid", placeItems: "center" }}><Repeat size={14} strokeWidth={1.75} /></button>}
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: 9, color: "var(--dc-ink-400)" }}><Search size={15} strokeWidth={1.75} /></span>
              <input className="dc-premium-inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contacto o número" style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: "var(--dc-r-sm)", border: "1.5px solid var(--dc-line)", fontSize: 13, outline: "none", boxSizing: "border-box", color: NAVY }} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTROS.map(([k, l]) => { const on = filtro === k; const n = k === "pendientes" ? chats.filter((c) => (c.porResponder || 0) > 0).length : 0; return (
                <button key={k} onClick={() => setFiltro(k)} style={{ padding: "5px 10px", borderRadius: "var(--dc-r-full)", border: on ? "1.5px solid var(--dc-accent-cyan)" : "1.5px solid var(--dc-line)", background: on ? (tint(DS.c.primary, 0.071)) : "var(--dc-white)", color: on ? DS.c.primary : "var(--dc-ink-400)", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>{l}{k === "pendientes" && n > 0 && <span style={{ background: "var(--dc-line)", color: INK, borderRadius: "var(--dc-r-full)", fontSize: 12, fontWeight: 500, minWidth: 16, height: 16, padding: "0 4px", display: "grid", placeItems: "center" }}>{n}</span>}</button>
              ); })}
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
            {/* WA-14: empty copy solo tras carga exitosa; no tratar [] inicial como vacío. */}
            {conectado && listLoading && !listLoaded && (
              <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--dc-ink-500)", fontSize: 13 }}>Cargando conversaciones…</div>
            )}
            {conectado && listLoaded && !listLoading && !listError && lista.length === 0 && chats.length === 0 && (
              <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--dc-ink-500)", fontSize: 13 }}>Aún no hay conversaciones de WhatsApp. Cuando un paciente escriba, aparecerá aquí.</div>
            )}
            {conectado && listLoaded && !listLoading && !listError && lista.length === 0 && chats.length > 0 && busquedaActiva && (
              <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--dc-ink-500)", fontSize: 13 }}>Ningún chat coincide con la búsqueda o filtro.</div>
            )}
            {!conectado && lista.length === 0 && (
              <div style={{ padding: "28px 18px", textAlign: "center", color: "var(--dc-ink-500)", fontSize: 13 }}>Sin conversaciones.</div>
            )}
            {lista.map((c) => (
              <button key={c.id} onClick={() => seleccionar(c.id)} className={`wa-item${activo === c.id ? " is-on" : ""}`}>
                <div className="wa-av">{inicial(c.nombre)}</div>
                {/* Dos líneas como en WhatsApp: nombre + hora arriba; último mensaje + estado abajo. */}
                <div className="wa-item__cuerpo">
                  <div className="wa-item__fila">
                    <span className="wa-item__nom">{c.nombre}</span>
                    {c.ejemplo && <span className="dc-inbox-ejemplo">Ejemplo</span>}
                    {conectado && <span title={c.esPaciente ? "Paciente registrado" : "Contacto nuevo (lead)"} style={{ width: 7, height: 7, borderRadius: "var(--dc-r-full)", background: c.esPaciente ? "var(--dc-ok)" : "var(--dc-line-alt)", flexShrink: 0 }} />}
                    {c.actualizado && <span className={`wa-item__hora${(conectado ? c.porResponder : c.noLeidos) > 0 ? " is-nuevo" : ""}`}>{cuandoLista(c.actualizado)}</span>}
                  </div>
                  <div className="wa-item__fila">
                    <span className={`wa-item__prev${(conectado ? c.porResponder : c.noLeidos) > 0 ? " is-nuevo" : ""}`}>{c.msgs.length ? c.msgs[c.msgs.length - 1].txt : (c.ultimoMensaje || c.tel)}</span>
                    <span className={`wa-item__modo${c.modo === "ia" ? "" : " is-rec"}`}>{c.modo === "ia" ? "IA" : "Recepción"}</span>
                    {(conectado ? c.porResponder : c.noLeidos) > 0 && <span className="wa-item__nuevos" title="Mensajes sin leer">{conectado ? c.porResponder : c.noLeidos}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Columna 2 · hilo de conversación */}
        {!chat ? (
          <div className="wa-vacio">
            <div><MessageSquare size={34} strokeWidth={1.75} color="var(--dc-ink-400)" /><div style={{ marginTop: 10 }}>{conectado ? "Selecciona una conversación para verla." : "Sin conversación."}</div></div>
          </div>
        ) : (<>
        <div className="dc-inbox-thread">
          <div className="dc-inbox-chat-head">
            <button type="button" className="wa-volver" aria-label="Volver a los chats" onClick={() => setEnHilo(false)}><ArrowLeft size={18} strokeWidth={2} /></button>
            <div className="dc-inbox-chat-head-name" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><div className="wa-av wa-av--sm">{inicial(chat.nombre)}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.nombre}{chat.ejemplo ? <span className="dc-inbox-ejemplo" style={{ marginLeft: 6 }}>Ejemplo</span> : null}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.tel}{chat.pacientes && chat.pacientes.length > 1 ? ` · ${chat.pacientes.length} pacientes` : ""}</div></div></div>
            <div className="dc-inbox-chat-head-actions">
              {conectado && <Btn small onClick={() => abrirAgendar("Solicitud por WhatsApp")}><Calendar size={15} strokeWidth={1.75} /> Agendar</Btn>}
              {/* Un solo botón: oculta el panel del contacto y, al pulsarlo otra vez, lo muestra. */}
              {(() => { const abierto = window.innerWidth > PANEL_FIJO ? !ocultarInfo : verInfo; return (
                <button type="button" className="wa-info" aria-label={abierto ? "Ocultar datos del contacto" : "Mostrar datos del contacto"} title={abierto ? "Ocultar datos del contacto" : "Mostrar datos del contacto"} aria-expanded={abierto} onClick={alternarInfo}>
                  {abierto ? <PanelRightClose size={18} strokeWidth={1.8} /> : <PanelRightOpen size={18} strokeWidth={1.8} />}
                </button>); })()}
              <Btn small kind={chat.modo === "ia" ? "primary" : "ghost"} onClick={tomar}>{chat.modo === "ia" ? <><UserCheck size={15} strokeWidth={1.75} /> Tomar control</> : <><Bot size={15} strokeWidth={1.75} /> Devolver a IA</>}</Btn>
            </div>
          </div>
          <div ref={scrollRef} className="wa-hilo" onScroll={(e) => { const el = e.currentTarget; setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80); }}>{hilo(chat.msgs)}</div>
          {!atBottom && <button type="button" className="dc-icon-btn" aria-label="Ir al último mensaje" onClick={() => scrollBottom(true)} title="Ir al último mensaje" className="wa-bajar"><ChevronDown size={20} strokeWidth={1.75} /></button>}
          {chat.modo === "ia" && conectado && !modoDemo ? (
            <div className="wa-pie wa-pie--nota">
              <Bot size={14} strokeWidth={1.75} /> El asistente IA responde automáticamente por WhatsApp. Usa <b>&nbsp;Tomar control&nbsp;</b> para responder tú.
            </div>
          ) : chat.modo === "ia" ? (
            <div className="wa-pie">
              <div className="wa-pie__ayuda"><Bot size={13} strokeWidth={1.75} /> {modoDemo ? "Modo demo: simula un mensaje del paciente (como si escribiera por WhatsApp):" : "La IA responde sola. Simula un mensaje del paciente:"}</div>
              <div className="wa-chips">{sugs.map((s, i) => <button key={i} type="button" className="wa-chip" onClick={() => recibir(s)}>{s}</button>)}</div>
            </div>
          ) : (
            <div className="wa-pie">
              <div className="wa-chips">
                <span className="wa-chips__et"><Zap size={13} strokeWidth={2} style={{marginRight: 2}}/> Respuestas:</span>
                {PLANTILLAS.map(([et, txt]) => <button key={et} type="button" className="wa-chip" title={txt} onClick={() => setInput(txt)}>{et}</button>)}
              </div>
              <div className="wa-compositor">
                <input className="wa-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarHumano()} placeholder="Escribe un mensaje" onFocus={(e) => e.target.style.borderColor = DS.c.primary} onBlur={(e) => e.target.style.borderColor = "var(--dc-line)"} />
                <button type="button" aria-label="Enviar el mensaje" onClick={enviarHumano} className="wa-enviar" disabled={!input.trim()}><Send size={18} strokeWidth={1.75} style={{ marginLeft: 2 }} /></button>
              </div>
            </div>
          )}
        </div>
        {/* Columna 3 · panel del contacto */}
        <div className="dc-inbox-side">

          <div style={{ padding: "32px 20px 24px", textAlign: "center", borderBottom: "1px solid var(--dc-line)" }}>
            <div style={{ width: 84, height: 84, borderRadius: "var(--dc-r-full)", background: "var(--dc-bg)", color: INK, border: "1px solid var(--dc-line)", boxShadow: "0 8px 24px -6px rgba(16,24,40,.08)", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 27, margin: "0 auto 16px" }}>{inicial(chat.nombre)}</div>
            <div style={{ fontWeight: 600, color: NAVY, fontSize: 16, fontFamily: DISPLAY_FONT }}>{chat.nombre}</div>
            <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 4 }}>{chat.tel}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
              {conectado && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: "var(--dc-r-full)", background: chat.esPaciente ? "var(--dc-ok-soft)" : "var(--dc-warn-soft)", color: chat.esPaciente ? "var(--dc-ok-700)" : "var(--dc-warn-600)", border: "1px solid " + (chat.esPaciente ? "var(--dc-green-soft)" : "var(--dc-amber-soft)") }}>{chat.esPaciente ? <><CheckCircle2 size={13} strokeWidth={2} /> {chat.pacientes && chat.pacientes.length > 1 ? `${chat.pacientes.length} pacientes` : "Paciente"}</> : <><UserPlus size={13} strokeWidth={2} /> Lead (nuevo)</>}</span>}
            </div>
          </div>
          <div style={{ padding: 20, display: "grid", gap: 16 }}>
            <div style={{ background: "var(--dc-bg-soft)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-lg)", padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: .6, textTransform: "uppercase", color: "var(--dc-ink-400)", marginBottom: 12 }}>Detalles del contacto</div>
              <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: INK, fontWeight: 500 }}><Phone size={15} strokeWidth={1.75} color="var(--dc-ink-400)" /> {chat.tel}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: INK, fontWeight: 500 }}><Calendar size={15} strokeWidth={1.75} color="var(--dc-ink-400)" /> Creado {conectado ? fmtCreado(chat.creado) : "hoy"}</div>
              </div>
            </div>
            {chat.pacientes && chat.pacientes.length > 0 && (
              <div style={{ background: "var(--dc-bg-soft)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-lg)", padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: .6, textTransform: "uppercase", color: "var(--dc-ink-400)", marginBottom: 10 }}>{chat.pacientes.length > 1 ? "Pacientes en este número" : "Paciente"}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {chat.pacientes.map((pp) => (
                    <button key={pp.id} onClick={() => abrirFicha(pp.id, pp.nombre)} title="Ver ficha del paciente" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-line)", background: "var(--dc-white)", cursor: "pointer", transition: "border-color .15s, box-shadow .15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = DS.c.primary; e.currentTarget.style.boxShadow = "0 2px 8px rgba(16,24,40,.06)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--dc-line)"; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: DS.c.primarySoft, color: DS.c.primary, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 13, flexShrink: 0 }}>{inicial(pp.nombre)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: NAVY, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pp.nombre}</div>
                        <div style={{ fontSize: 12, color: pp.proximaCita ? "var(--dc-ok-700)" : "var(--dc-ink-400)" }}>{pp.proximaCita ? `Próxima cita: ${fmtCreado(pp.proximaCita + "T12:00:00")}` : "Sin cita próxima"}</div>
                      </div>
                      <ChevronRight size={16} strokeWidth={1.75} color="var(--dc-ink-400)" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
              <button onClick={() => abrirAgendar("Solicitud por WhatsApp")} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 16px", borderRadius: "var(--dc-r-md)", border: "none", background: DS.c.primary, color: "var(--dc-white)", fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: "0 2px 6px " + tint(DS.c.primary, 0.376), transition: "transform .1s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"} onMouseUp={e => e.currentTarget.style.transform = "none"} onMouseLeave={e => e.currentTarget.style.transform = "none"}><Calendar size={15} strokeWidth={1.75} /> Agendar cita</button>
              {!chat.esPaciente && <Btn small kind="ghost" full onClick={abrirRegistro}><UserPlus size={15} strokeWidth={1.75} /> Registrar como paciente</Btn>}
              <button onClick={() => eliminarChat(chat.id)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "10px 16px", borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-fee)", background: "var(--dc-white)", color: RED, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--dc-danger-soft)"} onMouseLeave={e => e.currentTarget.style.background = "var(--dc-white)"}><Trash2 size={14} strokeWidth={1.75} /> Eliminar chat</button>
            </div>
          </div>
        </div>
        </>)}
      </Card>
      {agendar && <AgendarRecepcionModal base={agendar} onClose={() => setAgendar(null)} onCreada={() => { setAgendar(null); notify("Cita agendada desde WhatsApp."); }} notify={notify} />}
      {/* Ficha 360 del paciente */}
      {ficha360 && (() => { const p = ficha360.paciente || {}; const EST = { confirmada: ["var(--dc-info-soft)", "var(--dc-info-ink)"], atendida: ["var(--dc-ok-soft)", "var(--dc-ok-700)"], pendiente: ["var(--dc-warn-soft)", "var(--dc-warn-600)"], cancelada: ["var(--dc-fee2)", "var(--dc-danger-700)"], no_show: ["var(--dc-fee2)", "var(--dc-danger-700)"], en_atencion: ["var(--dc-bg)", "var(--dc-accent-cyan)"] }; return (
        <Modal icon={<User size={20} strokeWidth={1.75} />} titulo={p.nombre || "Paciente"} sub={`DNI ${p.dni || "—"} · ${p.telefono || ""}`} onClose={() => setFicha360(null)} maxW={620}
          footer={<Btn small onClick={() => setFicha360(null)}>Cerrar</Btn>}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
              {[["DNI", p.dni], ["Teléfono", p.telefono], ["Email", p.email || "—"], ["Nacimiento", p.fechaNacimiento || "—"]].map(([k, v]) => (
                <div key={k} style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "9px 12px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500 }}>{k}</div><div style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{v || "—"}</div></div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>Citas ({(ficha360.citas || []).length})</div>
              <div style={{ display: "grid", gap: 6, maxHeight: 190, overflowY: "auto" }}>
                {(ficha360.citas || []).length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Sin citas registradas.</div>}
                {(ficha360.citas || []).map((c, i) => { const es = EST[c.estado] || ["var(--dc-line)", "var(--dc-ink-700)"]; return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{c.fecha || "—"} {c.hora ? "· " + c.hora : ""}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{c.especialidad} · {c.medico} · {c.sede}</div></div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: es[1], background: es[0], padding: "3px 9px", borderRadius: "var(--dc-r-full)", whiteSpace: "nowrap" }}>{(c.estado || "").replace("_", " ")}</span>
                  </div>
                ); })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>Reseñas ({(ficha360.resenas || []).length})</div>
              <div style={{ display: "grid", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                {(ficha360.resenas || []).length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Sin reseñas.</div>}
                {(ficha360.resenas || []).map((r, i) => { const bajo = r.nps != null && r.nps <= 6; return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 11px", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)" }}>
                    {r.nps != null && <span style={{ fontSize: 12, fontWeight: 500, color: bajo ? "var(--dc-danger-700)" : "var(--dc-ok-700)", background: bajo ? "var(--dc-fee2)" : "var(--dc-ok-soft)", padding: "3px 8px", borderRadius: "var(--dc-r-full)", whiteSpace: "nowrap" }}>{r.nps}/10</span>}
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>{r.comentario || "(sin comentario)"}</div><div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>{r.fecha} · {r.medico}</div></div>
                  </div>
                ); })}
              </div>
            </div>
          </div>
        </Modal>
      ); })()}
      {/* Editor de instrucciones del agente */}
                        {instrOpen && (() => {
        const inp = { width: "100%", padding: "10px 13px", borderRadius: "var(--dc-r-md)", fontSize: 14, color: DS.c.ink, boxSizing: "border-box", fontFamily: "inherit" };
        const secTit = { fontSize: 13, fontWeight: 500, color: DS.c.ink, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 };
        const secCard = { background: "var(--dc-white)", border: "1px solid var(--dc-bg)", borderRadius: "var(--dc-r-lg)", padding: "28px 32px", boxShadow: "0 4px 16px rgba(20, 50, 60, 0.06)" };
        const lbl = { fontSize: 13, fontWeight: 500, color: DS.c.muted, display: "block", marginBottom: 8 };
        
        const Segmented = ({ options, value, onChange }) => (
          <div style={{ display: "inline-flex", background: "var(--dc-bg)", padding: 3, borderRadius: "var(--dc-r-md)", gap: 2 }}>
            {options.map(([val, label]) => (
              <button key={val} onClick={() => onChange(val)} style={{ padding: "8px 16px", borderRadius: "var(--dc-r-sm)", border: "none", background: value === val ? "var(--dc-white)" : "transparent", color: value === val ? DS.c.ink : "var(--dc-slate)", fontWeight: value === val ? 600 : 500, fontSize: 13, cursor: "pointer", transition: "all 180ms ease", boxShadow: value === val ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none" }}>{label}</button>
            ))}
          </div>
        );
        
        const pill = (on) => ({ padding: "8px 16px", borderRadius: "var(--dc-r-md)", border: on ? `1px solid ${DS.c.primary}` : "1px solid var(--dc-bg)", background: on ? "var(--dc-bg)" : "var(--dc-white)", color: on ? DS.c.primaryDark : DS.c.muted, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 150ms ease", display: "inline-flex", alignItems: "center", gap: 6 });
        
        const IconBox = ({ children }) => <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "var(--dc-r-md)", background: "var(--dc-bg)", color: DS.c.primary }}>{children}</div>;
        
        return (
        <Modal icon={<Bot size={20} strokeWidth={1.75} />} titulo="Configurar el asistente" sub="Personaliza la identidad y la forma de atención del agente." onClose={() => setInstrOpen(false)} maxW={1080}
          footer={<><button onClick={() => setInstrOpen(false)} style={{ background: "transparent", border: "1px solid var(--dc-bg)", borderRadius: "var(--dc-r-md)", padding: "10px 18px", color: "var(--dc-ink-700)", fontWeight: 500, fontSize: 14, cursor: "pointer", transition: "background 150ms" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--dc-white)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>Cancelar</button><button onClick={guardarInstrucciones} style={{ background: DS.c.primary, border: "none", borderRadius: "var(--dc-r-md)", padding: "10px 24px", color: "var(--dc-white)", fontWeight: 500, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 2px 4px rgba(8,126,139,0.15)", transition: "all 120ms ease" }} onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"} onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = DS.c.primary; }} onMouseEnter={(e) => e.currentTarget.style.background = DS.c.primaryDark}><Check size={16} strokeWidth={2} /> Guardar</button></>}>
          
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", alignItems: "stretch", margin: "-32px -32px -40px -32px", minHeight: "65vh" }}>
            
            {/* SIDEBAR */}
            <div style={{ position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 4, background: "var(--dc-white)", padding: "32px 16px", borderRight: "1px solid var(--dc-bg)" }}>
              {[
                ["identidad", "Identidad y Tono"],
                ["ventas", "Ventas y Objetivos"],
                ["reglas", "Reglas y FAQ"],
                ["urgencias", "Urgencias"]
              ].map(([id, label]) => (
                <button key={id} onClick={() => setIaTab(id)} style={{ padding: "12px 16px", borderRadius: "var(--dc-r-sm)", border: "none", background: iaTab === id ? "var(--dc-bg)" : "transparent", color: iaTab === id ? DS.c.primaryDark : "var(--dc-ink-400)", fontWeight: iaTab === id ? 600 : 500, fontSize: 13, cursor: "pointer", transition: "all 150ms ease", textAlign: "left", boxShadow: iaTab === id ? `inset 3px 0 0 ${DS.c.primary}` : "none" }} onMouseEnter={(e) => { if (iaTab !== id) { e.currentTarget.style.background = "var(--dc-bg)"; e.currentTarget.style.color = DS.c.primary; } }} onMouseLeave={(e) => { if (iaTab !== id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--dc-ink-400)"; } }}>{label}</button>
              ))}
            </div>

            {/* CONTENT */}
            <div style={{ padding: "40px", background: "var(--dc-white)", overflowY: "auto" }} className="dc-scroll">
              {iaTab === "identidad" && (
                <div style={{ animation: "dcTabSlide 0.18s ease-out forwards", display: "grid", gap: 24 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div style={secCard}>
                      <div style={secTit}><IconBox><Building2 size={16} strokeWidth={2} /></IconBox> Identidad de la clínica</div>
                      <div style={{ fontSize: 13, color: DS.c.muted, marginBottom: 16 }}>El agente lo mencionará con naturalidad.</div>
                      <label style={lbl}>Nombre comercial</label>
                      <input className="dc-premium-inp" style={{...inp, height: 44}} value={perfil.nombreComercial} onChange={(e) => setPerfil({ ...perfil, nombreComercial: e.target.value })} placeholder="Ej. Odonto Sonrisa" />
                    </div>
                    <div style={secCard}>
                      <div style={secTit}><IconBox><Sparkles size={16} strokeWidth={2} /></IconBox> Personalidad</div>
                      <div style={{ fontSize: 13, color: DS.c.muted, marginBottom: 16 }}>Elige un perfil base para configurar rápidamente.</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {PERSONALIDADES.map(([id, l, combo]) => <span key={id} onClick={() => aplicarPersonalidad(id, combo)} style={pill(perfil.personalidad === id)}>{l}</span>)}
                      </div>
                    </div>
                  </div>

                  <div style={secCard}>
                    <div style={secTit}><IconBox><Smile size={16} strokeWidth={2} /></IconBox> Ajustes finos de atención</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 24 }}>
                      <div>
                        <label style={lbl}>¿Cómo trata al paciente?</label>
                        <Segmented options={[["usted", "De usted"], ["tu", "De tú"]]} value={perfil.trato} onChange={(v) => setPerfil({ ...perfil, trato: v })} />
                      </div>
                      <div>
                        <label style={lbl}>Uso de emojis</label>
                        <Segmented options={[["nunca", "Nunca"], ["poco", "Pocos"], ["normal", "Normal"]]} value={perfil.emojis} onChange={(v) => setPerfil({ ...perfil, emojis: v })} />
                      </div>
                      <div>
                        <label style={lbl}>Estilo de conversación</label>
                        <Segmented options={[["muy_cercano", "Muy cercano"], ["cercano", "Cercano"], ["profesional", "Profesional"], ["premium", "Premium"]]} value={perfil.tono} onChange={(v) => setPerfil({ ...perfil, tono: v })} />
                      </div>
                      <div>
                        <label style={lbl}>Nivel de empatía</label>
                        <Segmented options={[["normal", "Normal"], ["alto", "Alto"], ["muy_alto", "Muy alto"]]} value={perfil.empatia} onChange={(v) => setPerfil({ ...perfil, empatia: v })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {iaTab === "ventas" && (
                <div style={{ animation: "dcTabSlide 0.18s ease-out forwards", display: "grid", gap: 24 }}>
                  <div style={secCard}>
                    <div style={secTit}><IconBox><TrendingUp size={16} strokeWidth={2} /></IconBox> Iniciativa comercial</div>
                    <div style={{ fontSize: 13, color: DS.c.muted, marginBottom: 20 }}>Cuánto empuja el asistente hacia agendar una cita (nunca presiona al paciente).</div>
                    <Segmented options={[["responder", "Solo responder"], ["recomendar", "Recomendar cita"], ["cerrar", "Buscar cerrar citas ★"]]} value={perfil.iniciativa} onChange={(v) => setPerfil({ ...perfil, iniciativa: v })} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div style={secCard}>
                      <div style={secTit}><IconBox><Star size={16} strokeWidth={2} /></IconBox> Servicios a impulsar</div>
                      <div style={{ fontSize: 13, color: DS.c.muted, marginBottom: 16 }}>Dará mayor visibilidad a estos tratamientos de forma natural.</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {[...new Set([...SERVICIOS_SUG, ...serviciosPrio])].map((o) => <span key={o} onClick={() => toggleServicio(o)} style={pill(serviciosPrio.includes(o))}>{serviciosPrio.includes(o) ? "✓ " : ""}{o}</span>)}
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                        <input value={nuevoServicio} onChange={(e) => setNuevoServicio(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarServicio(); } }} placeholder="Agregar otro…" className="dc-premium-inp" style={{ ...inp, height: 44, flex: 1 }} />
                        <Btn small onClick={agregarServicio}><Plus size={14} strokeWidth={2} /> Add</Btn>
                      </div>
                    </div>

                    <div style={secCard}>
                      <div style={secTit}><IconBox><TrendingUp size={16} strokeWidth={2} /></IconBox> Objetivos comerciales</div>
                      <div style={{ fontSize: 13, color: DS.c.muted, marginBottom: 16 }}>El asistente aprovechará oportunidades para cumplir estos objetivos.</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {[...new Set([...OBJETIVOS_SUG, ...objetivos])].map((o) => <span key={o} onClick={() => toggleObjetivo(o)} style={pill(objetivos.includes(o))}>{objetivos.includes(o) ? "✓ " : ""}{o}</span>)}
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                        <input value={nuevoObjetivo} onChange={(e) => setNuevoObjetivo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarObjetivo(); } }} placeholder="Agregar otro…" className="dc-premium-inp" style={{ ...inp, height: 44, flex: 1 }} />
                        <Btn small onClick={agregarObjetivo}><Plus size={14} strokeWidth={2} /> Add</Btn>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {iaTab === "reglas" && (
                <div style={{ animation: "dcTabSlide 0.18s ease-out forwards", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, height: "100%" }}>
                  <div style={{ ...secCard, display: "flex", flexDirection: "column" }}>
                    <div style={secTit}><IconBox><ClipboardList size={16} strokeWidth={2} /></IconBox> Indicaciones para el asistente</div>
                    <div style={{ fontSize: 13, color: DS.c.muted, marginBottom: 16 }}>Escribe las políticas de tu clínica (una por línea). El asistente las aplicará de forma natural, sin mencionarlas literalmente.</div>
                    <textarea value={instrText} onChange={(e) => setInstrText(e.target.value)} placeholder={"Ejemplos:\n• Siempre prioriza la sede principal.\n• No prometas resultados ni tiempos.\n• Los menores deben venir con un adulto."} className="dc-premium-inp dc-scroll" style={{ ...inp, padding: "16px", resize: "none", flex: 1, minHeight: 300 }} />
                  </div>

                  <div style={{ ...secCard, display: "flex", flexDirection: "column" }}>
                    <div style={secTit}><IconBox><Info size={16} strokeWidth={2} /></IconBox> Información de la clínica (FAQ)</div>
                    <div style={{ fontSize: 13, color: DS.c.muted, marginBottom: 16 }}>Escribe información general para los pacientes que el asistente debe saber para resolver sus dudas frecuentes.</div>
                    <textarea value={infoText} onChange={(e) => setInfoText(e.target.value)} placeholder={"Ej.\n• Dirección: Av. Principal 123.\n• Aceptamos Yape, Plin y tarjetas.\n• Cancelaciones con 24 h de anticipación."} className="dc-premium-inp dc-scroll" style={{ ...inp, padding: "16px", resize: "none", flex: 1, minHeight: 300 }} />
                  </div>
                </div>
              )}

              {iaTab === "urgencias" && (
                <div style={{ animation: "dcTabSlide 0.18s ease-out forwards", display: "grid", gap: 24 }}>
                  <div style={{ fontSize: 14, color: DS.c.primaryDark, background: DS.c.primaryLight, border: `1px solid ${DS.c.primarySoft}`, borderRadius: "var(--dc-r-lg)", padding: "20px 24px", lineHeight: 1.6 }}>
                    El manejo de urgencias viene incorporado en la inteligencia del agente. Está programado con protocolos de triaje dental internacional y siempre dará prioridad a salvaguardar la salud del paciente.
                  </div>
                  <div style={{ ...secCard, background: "var(--dc-white)", border: "1px solid rgba(214, 158, 46, 0.3)" }}>
                    <div style={{ ...secTit, color: DS.c.warning }}><div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "var(--dc-r-md)", background: "rgba(214, 158, 46, 0.12)" }}><AlertTriangle size={16} strokeWidth={2} color={DS.c.warning} /></div> Protocolo de urgencias <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: DS.c.success, background: "var(--dc-ok-soft)", padding: "4px 12px", borderRadius: "var(--dc-r-full)", fontSize: 12, marginLeft: 10 }}>Siempre activo</span></div>
                    <div style={{ fontSize: 13, color: DS.c.ink, display: "grid", gap: 16, marginTop: 24 }}>
                      <div style={{ display: "flex", gap: 12 }}>✅ <span>Primero <b>tranquiliza al paciente</b> mediante empatía y luego busca la atención más cercana.</span></div>
                      <div style={{ display: "flex", gap: 12 }}>✅ <span>Da <b>primeros auxilios básicos</b> cuando corresponde (ej. qué hacer con un diente avulsionado).</span></div>
                      <div style={{ display: "flex", gap: 12 }}>✅ <span>Prioriza y fuerza la <b>atención más cercana</b> disponible en la agenda.</span></div>
                      <div style={{ display: "flex", gap: 12 }}>🚨 <span style={{ color: DS.c.danger, fontWeight: 500 }}>Deriva a emergencias médicas hospitalarias si detecta signos de gravedad sistémica (infección severa, fiebre alta, dificultad para tragar).</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
        );
      })()}

      {nuevoPac && (
        <Modal icon={<UserPlus size={20} strokeWidth={1.75} />} titulo="Registrar como paciente" sub="Crea la ficha del contacto de WhatsApp. El teléfono viene precargado." onClose={() => setNuevoPac(null)} maxW={480}
          footer={<><Btn small kind="ghost" onClick={() => setNuevoPac(null)}>Cancelar</Btn><Btn small kind="ghost" onClick={() => guardarPaciente(true)}><Calendar size={15} strokeWidth={1.75} /> Registrar y agendar</Btn><Btn small onClick={() => guardarPaciente(false)}><Check size={15} strokeWidth={1.75} /> Registrar</Btn></>}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>DNI</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="dc-premium-inp" value={nuevoPac.dni} onChange={(e) => setNuevoPac((f) => ({ ...f, dni: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="8 dígitos" style={{ flex: 1, padding: "11px 14px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", color: NAVY, boxSizing: "border-box" }} />
                <BtnReniec dni={nuevoPac.dni} onNombre={(nom) => setNuevoPac((f) => ({ ...f, nombre: nom }))} notify={notify} />
              </div>
            </div>
            <Field label="Nombre completo" value={nuevoPac.nombre} onChange={(v) => setNuevoPac((f) => ({ ...f, nombre: v }))} placeholder="Nombre del paciente" />
            <Field label="Teléfono" value={nuevoPac.telefono} onChange={(v) => setNuevoPac((f) => ({ ...f, telefono: v }))} placeholder="51987654321" icon={<Phone size={15} strokeWidth={1.75} />} />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default WhatsAppInbox;
