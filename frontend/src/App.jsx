import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Baby, Calendar, Clock, Users, Stethoscope, Bell, CheckCircle2, MessageSquare, CreditCard,
  FileText, Plus, Search, ChevronRight, LayoutDashboard, Building2, Activity, Send, Bot, UserCheck,
  Sparkles, Lock, Smile, MapPin, ClipboardList, DollarSign, Zap, Menu, ArrowRight, TrendingUp,
  TrendingDown, LogOut, Eye, EyeOff, Shield, Briefcase, UserCog, Plug, Star, AlertTriangle,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Percent, Wallet, CalendarCheck, X, Settings,
  Phone, Server, ShieldCheck, UserPlus, Power, Trash2, KeyRound, Pencil, Mail, Check, Globe,
  Ticket, Repeat, Package, FlaskConical, AlertCircle, Minus, Umbrella, BellRing, Scan, Camera,
  Upload, Crown, Navigation, ChevronDown, ChevronUp, ArrowLeft, Filter, Download, ExternalLink,
  Copy, RefreshCw, MoreHorizontal, Layers, Grid3X3, List, SlidersHorizontal, CircleDot, Hash,
  Link2, Unlink, QrCode, Wifi, WifiOff, Database, HardDrive, Cpu, MemoryStick, Timer, Hourglass,
  CalendarClock, CalendarPlus, CalendarX2, UserMinus, UserX, Ban, CircleAlert, CircleCheck,
  CircleX, Info, HelpCircle, MessageCircle, MessagesSquare, Mic, MicOff, Volume2, VolumeX, Image,
  Images, FileImage, FilePlus, FileMinus, FileCheck, FileX, Folder, FolderOpen, FolderPlus,
  Archive, Inbox, SendHorizonal, Reply, Forward, Bookmark, Flag, Pin, PinOff, ThumbsUp, ThumbsDown,
  Heart, HeartOff, Share2, Printer, Syringe, Pill, HeartPulse, ShieldPlus, Target, ArrowUpDown,
  Megaphone, User, CheckCheck, Monitor, FileSpreadsheet, Banknote, Smartphone, Landmark, Coins, Calculator, Vault, Receipt, Scale
} from "lucide-react";
import api, { auth, ApiError, alFallarPeticion, alCerrarSesion, isTokenExpired, parseJwt } from "./api/client";
import { hashDeVista, irHash, parseHash, sedeApiUuid, canonVista } from "./routing";
// Carga diferida: módulos pesados solo se descargan al abrirlos (chunk aparte).
const FichaMedica = React.lazy(() => import("./FichaMedica"));
const Reportes = React.lazy(() => import("./modulos/ProduccionComisiones"));
const Disponibilidad = React.lazy(() => import("./modulos/Disponibilidad"));
const Configuracion = React.lazy(() => import("./modulos/Configuracion"));
const Recall = React.lazy(() => import("./modulos/Recall"));
const WhatsAppInbox = React.lazy(() => import("./modulos/WhatsAppInbox"));
const PanelGerencial = React.lazy(() => import("./modulos/PanelGerencial"));
const Metas = React.lazy(() => import("./modulos/Metas"));
import { AgendarRecepcionModal, BtnReniec, reniecLookup } from "./compartido/AgendarRecepcionModal";
import { ymdLima, contarEventosHoy, mapAuditoriaApiRows, resumenDispositivo } from "./util/fechaLima";
import { layoutBarras } from "./util/barras";
import { normalizarProduccionEsp } from "./util/produccionEsp";
import { layoutProgreso } from "./util/progreso";
import { coberturaDias, estadoStock, pctCoberturaBarra, requierenCompra, sugeridoPedir } from "./util/inventarioCalc";
import { margenCatalogo, precioMedioCatalogo } from "./util/serviciosCatalogo";
import {
  ESTADOS_ODO,
  FASES_ODO,
  DENTICIONES_ODO,
  denticionApi,
  normalizarCarasAnatomicas,
  carasParaPintar,
  geoAAnatomica,
} from "./util/odontogramaCatalogo";
import { metaEstado, colorEstado, labelEstado, inicialCara } from "./util/odontogramaEstado";
import { formatearFDI } from "./util/formatearFDI";
import PlanInversionDocumento from "./modulos/PlanInversionDocumento";
import OdontogramaAnatomico from "./modulos/OdontogramaAnatomico";

/* ============================================================================
   Dento Check v3 — SaaS dental multi-sede – AWG Technology Group
   Login + roles funcionales – Dashboard gerencial – Agente IA WhatsApp –
   Odontograma – Tratamientos – Integraciones reales del mercado peruano.
   Navy var(--dc-navy) / Rojo var(--dc-red)
   ============================================================================ */
// Núcleo compartido (tokens DS, primitivos, permisos, helpers, datos demo).
// Vive en ./comun para que los módulos se puedan cargar en chunks separados.
import {EnCabecera, MenuAcciones, DIAS_SEM, EDAD_PEDIATRICA, EDAD_TRANSICION, EmblemaNino, HORAS_SEL, aniosParaAdulto, caraOdontoLabel, colorPediatrico, denticionPorEdad, etapaFicha, PED, PED_LINEA, PED_SUAVE, pluralEs, Select, TimeSelect, acentoFicha, esPediatrico, validarFormPaciente, ACCIONES, ACCION_IDS, AUDITORIA, BG, Badge, Btn, CITAS_INIT, CLINICAS_INIT, Card, DISPLAY_FONT, DS, DashLienzo, DataTable, ESPECIALIDADES, ESTADO_BADGE, FICHA_CLINICA, Field, INK, KpiCard, MEDICOS, MODULOS, ModHead, Modal, NAVY, PACIENTES_INIT, PLAN_MODULOS, PLAN_NOMBRE, PacienteBar, RED, ROLES, ROL_PERMS, SEDES, SEDE_IDS, STAFF_INIT, TEAL, UI, USUARIOS, Vacio, WARM, addDays, calcEdad, colorDe, cortaSede, espsDe, etiquetaSedes, exportarExcel, exportarPDF, fechaLegible, fmt, hoy, iniciales, minutosViaje, modDeVista, modulosVisibles, tonoAviso, jornadaClinica, horasEntre, horarioDeSede, nombreSede, normSedes, permisosEfectivos, planMinimo, puede, sedeMasCercana, sedesDe, setSedesCatalogo, toMin, usePersist, tint} from "./comun";
/** Accesos de demostración: en desarrollo, o en una compilación de revisión hecha
    con VITE_DEMO=1 (nunca en la de producción normal). */
const MODO_DEMO = !import.meta.env.PROD || import.meta.env.VITE_DEMO === "1";

function Login({ onLogin }) {
  const [modo, setModo] = useState("login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(() => {
    try {
      const m = sessionStorage.getItem("dc_sesion_msg");
      if (m) { sessionStorage.removeItem("dc_sesion_msg"); return m; }
    } catch { /* */ }
    return "";
  });
  const [reg, setReg] = useState({ clinica: "", nombre: "", email: "", pass: "", ruc: "" });
  const [regPac, setRegPac] = useState({ nombre: "", dni: "", telefono: "" });
  const [verDemo, setVerDemo] = useState(false);
  // NEW-44/45: panel demo y portal hardcodeado solo fuera de producción.
  const demoLoginOk = MODO_DEMO;

  const [cargando, setCargando] = useState(false);
  // Convierte UUID de sede a número (1 o 2) para compatibilidad con el resto del frontend
  const sedeInt = (uuid) => (uuid && String(uuid).endsWith("a2")) ? 2 : 1;
  
  const entrar = async () => {
    const id = user.trim();
    // 1) Email → login staff conectado.
    if (id.includes("@")) {
      setCargando(true); setError("");
      try {
        const r = await api.login(id.toLowerCase(), pass);
        setCargando(false);
        // BUGFIX BUG-101: Convertir sedeId (UUID) a número para que coincida con el filtro de pacientes
        const sedeNum = r.sedeId ? sedeInt(r.sedeId) : null;
        onLogin({ rol: r.rol, nombre: r.nombre, sedes: sedeNum ? [sedeNum] : "all",
                  organizacionId: r.organizacionId, sedeId: sedeNum, conectado: true,
                  permisos: r.permisos || null });
        return;
      } catch (e) {
        setCargando(false);
        setError(e instanceof ApiError && e.status === 401
          ? "Credenciales inválidas."
          : "No se pudo conectar con el servidor. Revisa el backend o usa un acceso demo.");
        return;
      }
    }
    // 2) DNI (solo dígitos) → portal del paciente conectado.
    if (/^\d{6,12}$/.test(id)) {
      setCargando(true); setError("");
      try {
        const r = await api.portalLogin(id, pass);
        setCargando(false);
        onLogin({
          rol: "paciente",
          nombre: r.nombre,
          pacienteId: r.pacienteId,
          organizacionId: r.organizacionId,
          conectado: true,
        });
        return;
      } catch (e) {
        setCargando(false);
        setError(e instanceof ApiError && (e.status === 401 || e.status === 403)
          ? "DNI o contraseña del portal incorrectos."
          : "No se pudo abrir el portal. Revisa el backend o usa un acceso demo.");
        return;
      }
    }
    // 3) Fallback: modo demo (usuario/clave de la lista de accesos rápidos).
    const u = demoLoginOk && USUARIOS.find((x) => x.user === id.toLowerCase() && x.pass === pass);
    if (u) { setError(""); onLogin({ ...u, demo: true }); }
    else setError("Usuario o contraseña incorrectos. Usa un email, tu DNI del portal, o los accesos demo de abajo.");
  };

  const entrarPortalDemo = async () => {
    // NEW-45: nunca autenticar portal real desde el panel público en producción.
    if (!demoLoginOk) {
      setError("Los accesos de demostración no están disponibles en este entorno.");
      return;
    }
    setCargando(true); setError("");
    // Solo demo local (sin llamar API con credenciales embebidas).
    const demo = USUARIOS.find((u) => u.rol === "paciente");
    setCargando(false);
    if (demo) onLogin({ ...demo, demo: true });
    else setError("Portal demo local no disponible.");
  };
  // P2-5: auto-registro del paciente por el link → crea su cuenta y entra a su portal.
  const registrarPaciente = () => {
    if (!regPac.nombre.trim() || !regPac.dni.trim()) { setError("Ingresa tu nombre y DNI para crear tu cuenta."); return; }
    const pid = 1000 + Math.floor((PACIENTES_INIT.length + regPac.dni.length));
    setError("");
    onLogin({ rol: "paciente", nombre: regPac.nombre.trim(), pacienteId: pid, nuevo: true, pacienteData: { id: pid, nombre: regPac.nombre.trim(), dni: regPac.dni.trim(), telefono: regPac.telefono.trim(), email: "", sede: 1, sedes: [1], ultima: "—" } });
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.05fr .95fr", gridTemplateRows: "minmax(100vh,auto)", fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }} className="dc-login">
      {/* Panel izquierdo de marca — dental teal, limpio (Apple) */}
      <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, var(--dc-brand-600) 0%, var(--dc-ink-alt) 100%)", minHeight: "100vh", padding: "48px 52px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff" }} className="dc-login-brand">
        <NeuralDentalBackground />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,.16)", borderRadius: "var(--dc-r-md)", width: 46, height: 46, display: "grid", placeItems: "center", backdropFilter: "blur(6px)" }}><Smile size={26} strokeWidth={1.75} color="#fff" /></div>
            <div style={{ fontWeight: 500, fontSize: 18, letterSpacing: "-.01em", color: "#fff" }}>Dento <span style={{ color: "var(--dc-green-soft)" }}>Check</span></div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.14)", color: "#fff", borderRadius: "var(--dc-r-full)", padding: "7px 14px", fontSize: 13, fontWeight: 500, backdropFilter: "blur(6px)" }}><Sparkles size={14} strokeWidth={1.75} /> 14 días gratis</span>
        </div>

        <div style={{ maxWidth: 480, position: "relative" }}>
          <h1 style={{ fontFamily: DISPLAY_FONT, fontSize: "clamp(32px,3.4vw,46px)", fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.03em", margin: 0, color: "#fff" }}>Tu clínica dental,<br />en orden y en calma.</h1>
          <p style={{ color: "rgba(255,255,255,.82)", fontSize: 14, marginTop: 18, lineHeight: 1.6, maxWidth: 430 }}>Agenda, historia clínica, cobros y un asistente con IA que atiende tu WhatsApp 24/7 — en todas tus sedes.</p>
          <div style={{ display: "flex", gap: 30, marginTop: 32, flexWrap: "wrap" }}>
            {/* Decía "Cobros – boleta SUNAT". La emisión electrónica está pendiente de
                credenciales y el propio comprobante avisa de que aún no se envía: es lo
                primero que ve quien entra, y es lo que cree que ha comprado. */}
            {[["Agenda", "sin ausencias"], ["WhatsApp", "con IA 24/7"], ["Cobros", "y estado de cuenta"]].map(([n, l]) => (
              <div key={n}><div style={{ fontFamily: DISPLAY_FONT, fontSize: 18, fontWeight: 600, letterSpacing: "-.01em", color: "#fff" }}>{n}</div><div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginTop: 2 }}>{l}</div></div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", fontSize: 12, color: "rgba(255,255,255,.7)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ShieldCheck size={14} strokeWidth={1.75} /> Datos cifrados</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MessageSquare size={14} strokeWidth={1.75} /> Soporte en Perú</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CreditCard size={14} strokeWidth={1.75} /> Visa – Mastercard – Yape</span>
        </div>
      </div>

      </div>
      {/* Panel derecho — formulario */}
      <div className="dc-login-right" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px", background: "#fff" }}>
        <div style={{ width: "100%", maxWidth: 396 }}>
          <div className="dc-login-mobilelogo" style={{ display: "none", alignItems: "center", gap: 11, marginBottom: 26 }}>
            <div style={{ background: `linear-gradient(135deg,${DS.c.primary},${DS.c.primaryDark})`, borderRadius: "var(--dc-r-md)", width: 42, height: 42, display: "grid", placeItems: "center" }}><Smile size={24} strokeWidth={1.75} color="#fff" /></div>
            <div style={{ fontWeight: 500, fontSize: 18, color: DS.c.ink }}>Dento <span style={{ color: DS.c.primary }}>Check</span></div>
          </div>

          {modo === "login" ? (
            <div>
              <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 21, fontWeight: 600, color: INK, margin: "0 0 5px", letterSpacing: "-.01em" }}>Bienvenido de vuelta</h2>
              <p style={{ color: "var(--dc-ink-400)", fontSize: 14, margin: "0 0 26px" }}>Staff con correo, o portal del paciente con DNI.</p>
              <div style={{ display: "grid", gap: 16 }}>
                <Field label="Correo o DNI" value={user} onChange={setUser} placeholder="admin@sonrie.pe o 44567890" icon={<UserCheck size={16} strokeWidth={1.75} />} />
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Contraseña</span>
                    <button onClick={() => setError("Contacta al administrador de tu clínica o a soporte para restablecer tu contraseña.")} style={{ background: "none", border: "none", color: DS.c.primary, fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0 }}>¿La olvidaste?</button>
                  </div>
                  <div className="dc-input-container" style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: "var(--dc-ink-500)", transition: "color .2s", pointerEvents: "none" }}><Lock size={16} strokeWidth={1.75} /></span>
                    <input className="dc-premium-inp" type={showPass ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} placeholder="Tu contraseña"
                      style={{ width: "100%", padding: "12px 40px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box", color: NAVY, transition: "border-color .2s, box-shadow .2s" }} />
                    <button aria-label="Mostrar u ocultar la contraseña" onClick={() => setShowPass((s) => !s)} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, display: "grid", placeItems: "center", padding: 0, borderRadius: "var(--dc-r-sm)", background: "none", border: "none", cursor: "pointer", color: "var(--dc-ink-500)" }}>{showPass ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}</button>
                  </div>
                </div>
                {error && <div style={{ background: "var(--dc-danger-soft)", color: "var(--dc-danger-700)", border: "1px solid var(--dc-danger-mid)", fontSize: 13, padding: "10px 12px", borderRadius: "var(--dc-r-md)" }}>{error}</div>}
                <button className="dc-login-btn" onClick={entrar} disabled={cargando} style={{ width: "100%", padding: "13px 16px", borderRadius: "var(--dc-r-lg)", border: "none", background: cargando ? "var(--dc-brand-soft)" : `linear-gradient(135deg,${DS.c.primary},${DS.c.primaryDark})`, color: "#fff", fontSize: 14, fontWeight: 500, cursor: cargando ? "default" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 12px 24px -12px ${DS.c.primary}` }}>{cargando ? "Ingresando…" : <>Iniciar sesión <ArrowRight size={16} strokeWidth={1.75} /></>}</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 4px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--dc-line)" }} /><span style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500 }}>¿Aún no tienes cuenta?</span><div style={{ flex: 1, height: 1, background: "var(--dc-line)" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="dc-outline-btn" onClick={() => { setModo("registro"); setError(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "#fff", color: NAVY, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Registrar mi clínica</button>
                <button className="dc-outline-btn" onClick={() => { setModo("paciente"); setError(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "#fff", color: NAVY, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Soy paciente</button>
              </div>
              {demoLoginOk && (
                <div style={{ marginTop: 22, textAlign: "center" }}>
                  <button onClick={() => setVerDemo((v) => !v)} style={{ background: "none", border: "none", color: "var(--dc-ink-400)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{verDemo ? "Ocultar accesos de demostración" : "Explorar en modo demostración →"}</button>
                </div>
              )}
              {demoLoginOk && verDemo && (
                <div style={{ marginTop: 12, background: "var(--dc-bg-soft2)", border: "1px dashed var(--dc-bg)", borderRadius: "var(--dc-r-lg)", padding: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--dc-ink-500)", marginBottom: 10 }}>Accesos locales de desarrollo (no llaman al portal de producción).</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                    {USUARIOS.filter((u) => u.rol !== "superadmin").map((u) => { const R = ROLES[u.rol]; const Ic = R.icon; return (
                      <button key={u.user} onClick={() => (u.rol === "paciente" ? entrarPortalDemo() : onLogin({ ...u, demo: true }))} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-line)", background: "#fff", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = R.color; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--dc-line)"; }}>
                        <span style={{ background: tint(R.color, 0.094), color: R.color, width: 28, height: 28, borderRadius: "var(--dc-r-sm)", display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={15} strokeWidth={1.75} /></span>
                        <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 12, fontWeight: 500, color: NAVY, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{R.label}</span><span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{u.rol === "paciente" ? "demo local" : `@${u.user}`}</span></span>
                      </button>
                    ); })}
                  </div>
                  <button onClick={() => onLogin({ ...USUARIOS.find((u) => u.rol === "superadmin"), demo: true })} style={{ marginTop: 8, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 10px", borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-info-100)", background: "var(--dc-bg)", cursor: "pointer", color: "var(--dc-purple)", fontSize: 12, fontWeight: 500 }}><Globe size={15} strokeWidth={1.75} /> Entrar al BackOffice AWG (Super Admin)</button>
                </div>
              )}
            </div>
          ) : modo === "registro" ? (
            <Card style={{ padding: 28, boxShadow: "0 20px 45px -28px rgba(15,27,56,.4)" }}>
              <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 21, fontWeight: 600, color: INK, margin: "0 0 4px" }}>Empieza tu prueba gratis</h2>
              <p style={{ color: "var(--dc-ink-400)", fontSize: 14, margin: "0 0 20px" }}>14 días sin costo, sin tarjeta. La configuras en minutos.</p>
              <div style={{ display: "grid", gap: 14 }}>
                <Field label="Nombre de la clínica" value={reg.clinica} onChange={(v) => setReg({ ...reg, clinica: v })} placeholder="Clínica Dental Sonríe+" icon={<Building2 size={16} strokeWidth={1.75} />} />
                <Field label="RUC" value={reg.ruc} onChange={(v) => setReg({ ...reg, ruc: v })} placeholder="20123456789" icon={<FileText size={16} strokeWidth={1.75} />} />
                <Field label="Tu nombre" value={reg.nombre} onChange={(v) => setReg({ ...reg, nombre: v })} placeholder="Nombre del responsable" icon={<UserCheck size={16} strokeWidth={1.75} />} />
                <Field label="Correo" value={reg.email} onChange={(v) => setReg({ ...reg, email: v })} placeholder="tucorreo@mail.com" type="email" icon={<MessageSquare size={16} strokeWidth={1.75} />} />
                <Btn full kind="red" onClick={() => onLogin({ ...USUARIOS.find((u) => u.user === "admin"), demo: true })}>Crear cuenta y empezar <ArrowRight size={16} strokeWidth={1.75} /></Btn>
                <p style={{ fontSize: 12, color: "var(--dc-ink-500)", textAlign: "center", margin: 0 }}>En la demo, registrarte te ingresa como Administrador General para que veas todo.</p>
              </div>
            </Card>
          ) : (
            <Card style={{ padding: 28, boxShadow: "0 20px 45px -28px rgba(15,27,56,.4)" }}>
              <h2 style={{ fontFamily: DISPLAY_FONT, fontSize: 21, fontWeight: 600, color: INK, margin: "0 0 4px" }}>Crea tu cuenta de paciente</h2>
              <p style={{ color: "var(--dc-ink-400)", fontSize: 14, margin: "0 0 20px" }}>Reserva y sigue tus citas, pagos y tratamiento desde tu celular. Sin contraseña en la demo.</p>
              <div style={{ display: "grid", gap: 14 }}>
                <Field label="Nombre completo" value={regPac.nombre} onChange={(v) => setRegPac({ ...regPac, nombre: v })} placeholder="Ej. Ana Torres" icon={<UserCheck size={16} strokeWidth={1.75} />} />
                <Field label="DNI" value={regPac.dni} onChange={(v) => setRegPac({ ...regPac, dni: v })} placeholder="44567890" icon={<FileText size={16} strokeWidth={1.75} />} />
                <Field label="Celular" value={regPac.telefono} onChange={(v) => setRegPac({ ...regPac, telefono: v })} placeholder="987 654 321" icon={<Phone size={16} strokeWidth={1.75} />} />
                {error && <div style={{ background: "var(--dc-fee)", color: "var(--dc-danger-700)", fontSize: 13, padding: "9px 12px", borderRadius: "var(--dc-r-sm)" }}>{error}</div>}
                <Btn full kind="red" onClick={registrarPaciente}>Crear mi cuenta y entrar <ArrowRight size={16} strokeWidth={1.75} /></Btn>
                <p style={{ fontSize: 12, color: "var(--dc-ink-500)", textAlign: "center", margin: 0 }}>Entrarás a tu portal para reservar tu primera cita.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================================
   AGENTE IA — motor de intención. En producción lo atiende el backend
   (AgenteIaService), que llama a OpenAI con function calling para consultar el
   catálogo, ver la disponibilidad real y agendar. Esto de aquí es el espejo en
   el navegador que usa la demostración cuando no hay backend.
   =========================================================================== */

/* ===========================================================================
   DASHBOARD GERENCIAL (rol dueño) — KPIs, tendencias, ranking
   =========================================================================== */
function MiniBar({ data, color }) {
  // Barras honestas (A29–A32): escala = max serie, cero sin segmento, color plano.
  const layout = layoutBarras(data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: "100%", minHeight: 44 }}>
      {layout.map((b, i) => {
        if (!b.dibujar) {
          return <div key={i} style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", minHeight: 0 }}><span style={{ fontSize: 10, color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums" }}>{b.valor || ""}</span></div>;
        }
        return <div key={i} style={{ flex: 1, height: `${b.pct}%`, background: color, borderRadius: "var(--dc-r-sm) var(--dc-r-sm) 0 0", opacity: 0.55 + (i / layout.length) * 0.45 }} />;
      })}
    </div>
  );
}
/* Gráfico de área SVG con degradado — se estira al contenedor. */
/**
 * Gráfico de área. Antes solo dibujaba la FORMA: se veía subir y bajar, pero no había
 * ni un número, así que era imposible leer cuánto se facturó en un mes concreto (el caso
 * de "Ingresos – últimos 12 meses", que enseñaba solo "E F M A M J J A S O N D").
 * Ahora marca el techo del periodo con una guía punteada y muestra ese máximo y el
 * último valor. `formato` permite que salgan como moneda.
 */
function AreaChart({ data, color = DS.c.primary, labels, formato }) {
  const fmtV = formato || ((v) => Number(v || 0).toLocaleString());
  // La escala arranca en CERO a proposito: escalar entre min y max hace que una
  // diferencia de dos citas ocupe toda la altura y parezca un despegue.
  const max = Math.max(...data, 1), min = 0;
  const n = data.length, W = 100, H = 40;
  const X = (i) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const Y = (v) => H - ((v - min) / (max - min || 1)) * (H - 8) - 1.5;
  const pts = data.map((v, i) => `${X(i).toFixed(2)},${Y(v).toFixed(2)}`);
  const line = "M" + pts.join(" L");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const gid = "ag_" + Math.abs([...color].reduce((a, c) => a + c.charCodeAt(0), 0));
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 0, flex: "1 1 auto", minHeight: 96, overflow: "visible" }}>
        <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.38" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={Y(max)} x2={W} y2={Y(max)} stroke="var(--dc-line)" strokeWidth="1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        {/* Sin marcadores por punto: con preserveAspectRatio="none" el SVG se estira y
            cualquier círculo sale ovalado. La línea ya dice la forma. */}
      </svg>
      {data.length <= 7 ? (
        // Serie corta (una semana): cabe la cifra encima de cada punto.
        <div style={{ display: "flex", marginTop: 2 }}>
          {data.map((v, i) => (
            <div key={"v" + i} style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 500, color: v === max ? color : "var(--dc-ink-400)" }}>{fmtV(v)}</div>
          ))}
        </div>
      ) : (
        // Serie larga (doce meses): doce importes completos en columnas de veinte
        // píxeles no se leen. Se dicen los dos que importan.
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--dc-ink-400)", marginTop: 4 }}>
          <span>máx {fmtV(max)}</span>
          <span style={{ color, fontWeight: 500 }}>último {fmtV(data[data.length - 1])}</span>
        </div>
      )}
      {labels && <div style={{ display: "flex", marginTop: 4 }}>{labels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 12, color: "var(--dc-ink-500)" }}>{l}</div>)}</div>}
    </div>
  );
}
function Donut({ segments, label = "citas/mes", center }) {
  const total = segments.reduce((a, s) => a + s.v, 0);
  let acc = 0; const R = 52, C = 2 * Math.PI * R;
  const centro = center != null ? center : total;
  return (
    <svg viewBox="0 0 140 140" style={{ width: 140, height: 140 }}>
      {segments.map((s, i) => { const frac = s.v / total; const dash = frac * C; const off = acc * C; acc += frac;
        return <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={s.c} strokeWidth="18" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />; })}
      <text x="70" y="66" textAnchor="middle" fontSize={String(centro).length > 5 ? "16" : "22"} fontWeight="800" fill={NAVY}>{centro}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="var(--dc-ink-500)">{label}</text>
    </svg>
  );
}
// Placeholder de un dato que aún no está. Si la petición falló no dice "Cargando…":
// ese dato ya no va a llegar y quien mira se queda esperando.
/**
 * Para un widget cuyo dato todavía NO tiene backend. Con sesión abierta enseñar el
 * ejemplo sería enseñar cifras falsas como propias de la clínica: se dice qué falta.
 */
function SinConectar({ que }) {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center", padding: "0 18px" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-400)", marginBottom: 4 }}>Endpoint en desarrollo</div>
        <div style={{ fontSize: 12, color: "var(--dc-ink-400)", lineHeight: 1.5 }}>{que}</div>
      </div>
    </div>
  );
}

function SinDato({ dato, texto = "Cargando…" }) {
  const fallo = dato && dato.errorDeCarga;
  return <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--dc-ink-400)", fontSize: 13, textAlign: "center", padding: "0 14px" }}>{fallo ? "No se pudo cargar del servidor." : texto}</div>;
}

function Gerencial({ citas, sede }) {
  return <PanelGerencial citas={citas} sede={sede} />;
}

/* ---- Pendientes de hoy: bandeja de tareas accionables para todos los roles ---- */

function Dashboard({ citas: citasProp, pacientes: pacProp, rol, notify = () => {}, onIr = () => {}, horarioClinica = { horario: {}, feriados: [] }, sedeActiva = "all" }) {
  const enviarConfMañana = () => {
    if (!(!!auth.token)) { notify("Disponible al iniciar sesión."); return; }
    api.citas.enviarConfirmaciones(addDays(1)).then((r) => notify(`Confirmaciones enviadas: ${r.enviados}/${r.total} citas de mañana por WhatsApp.`)).catch(() => notify("No se pudo enviar las confirmaciones."));
  };
  const esMed = rol === "medico";
  const esRec = rol === "recepcion", esAdmin = rol === "admin", esTI = rol === "ti";
  const esGer = rol === "gerencia", esAdmSede = rol === "admin_sede";
  const conectado = !!auth.token;
  const mapCD = (c) => ({ id: c.id, paciente: c.paciente || "—", pacienteId: c.pacienteId || null, medicoId: c.medicoId, medico: c.medico || null, especialidad: c.especialidad || null, esp: c.especialidadId, sede: c.sedeId, fecha: c.fecha, hora: (c.hora || "").slice(0, 5), motivo: c.motivo, estado: c.estado, llegada: !!c.llegada, valor: c.valor });
  const [remC, setRemC] = useState(null);
  // Cierre de caja real del día, para que el widget "Caja del día" deje de ser cuatro
  // cifras fijas que contradecían al KPI "Ingresos del día" de esta misma pantalla.
  const [cierreCaja, setCierreCaja] = useState(null);
  const [cajaDeuda, setCajaDeuda] = useState(null);
  // NEW-29/30: cobros reales (misma base que Caja), filtrados por sede activa.
  const [pagosHist, setPagosHist] = useState(null);
  const [usrTiDash, setUsrTiDash] = useState(null);
  useEffect(() => {
    if (conectado && esAdmin) {
      api.pagos.cierre().then(setCierreCaja).catch(() => {});
      api.caja().then(setCajaDeuda).catch(() => setCajaDeuda({ porCobrar: [] }));
    }
    if (conectado && (esAdmin || esAdmSede || esRec || esGer)) {
      api.pagos.historial().then((h) => setPagosHist(h || [])).catch(() => setPagosHist({ errorDeCarga: true }));
    }
    // NEW-49: directorio para panel TI.
    if (conectado && esTI) {
      api.usuarios.listar().then((u) => setUsrTiDash(u || [])).catch(() => setUsrTiDash([]));
    }
  }, []); // eslint-disable-line
  const [remP, setRemP] = useState(null);
  // NEW-35: forzar re-render al volver a la pestaña / cada minuto por si cruzó medianoche.
  const [, setDiaTick] = useState(0);
  useEffect(() => {
    const bump = () => setDiaTick((n) => n + 1);
    const onVis = () => { if (document.visibilityState === "visible") bump(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", bump);
    const id = setInterval(bump, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", bump);
      clearInterval(id);
    };
  }, []);
  // Produccion real del medico en sesion: el widget "Mi meta del mes" mostraba
  // 9200 fijos contra una meta de 12000 escrita a mano, asi que ni la produccion
  // ni la meta eran suyas. Es el mismo endpoint que usa la pantalla Mi produccion.
  const [miProd, setMiProd] = useState(null);
  useEffect(() => {
    if (conectado && esMed) api.miProduccion().then(setMiProd).catch(() => setMiProd({ errorDeCarga: true }));
  }, []); // eslint-disable-line
  const [pendEvo, setPendEvo] = useState(null);   // {pendientes, soloMias, items}
  // Sin argumentos el backend devuelve SOLO las de hoy, así que "Citas – últimos 7 días"
  // salía con seis días en cero y recepción nunca veía la tarea de confirmar las de
  // mañana. Se pide el rango que la pantalla necesita: seis días atrás y uno adelante.
  // NEW-37/47: sede siempre (default 1 si falta UUID) + ultima desde creadoEn; luego se enriquece con citas.
  const sedeDash = (uuid) => (uuid && String(uuid).endsWith("a2")) ? 2 : 1;
  const cargarDash = () => {
    if (!conectado) return;
    // NEW-48: TI no tiene agenda:ver — no pedir citas (evita 403 en consola/cartel).
    if (!esTI) {
      api.citas.listar(null, addDays(-6), addDays(1)).then((r) => setRemC((r || []).map(mapCD))).catch(() => {});
    } else {
      setRemC([]);
    }
    // NEW-48: TI no tiene pacientes:ver — no pedir padrón ni evoluciones.
    if (!esTI) {
      api.pacientes.listar().then((r) => setRemP((r || []).map((p) => {
        const s = sedeDash(p.sedeRegistroId);
        const ult = (p.creadoEn || "").toString().slice(0, 10) || null;
        return { id: p.id, nombre: p.nombre, dni: p.dni || "", ultima: ult, sede: s, sedes: [s], sedeRegistroId: p.sedeRegistroId || null };
      }))).catch(() => {});
      api.evolucionesPendientes().then(setPendEvo).catch(() => {});
    }
  };
  useEffect(() => { cargarDash(); }, []); // eslint-disable-line
  const citas = conectado ? (remC || []) : citasProp;
  const pacientesAllRaw = conectado ? (remP || []) : pacProp;
  // NEW-47: enriquecer ultima visita con la cita más reciente del rango cargado.
  const pacientesAll = useMemo(() => {
    if (!conectado || !remP) return pacientesAllRaw;
    const ultPorPac = {};
    for (const c of (remC || [])) {
      if (!c.pacienteId || !c.fecha) continue;
      const prev = ultPorPac[c.pacienteId];
      if (!prev || c.fecha > prev) ultPorPac[c.pacienteId] = c.fecha;
    }
    return remP.map((p) => {
      const u = ultPorPac[p.id];
      return u && (!p.ultima || u > String(p.ultima).slice(0, 10)) ? { ...p, ultima: u } : p;
    });
  }, [conectado, remP, remC, pacientesAllRaw]);
  // BUG-111 / NEW-37: Filtrar pacientes por sede activa (campo sede conservado).
  const pacientes = sedeActiva === "all" ? pacientesAll : pacientesAll.filter((p) => sedesDe(p).includes(Number(sedeActiva)));
  // NEW-29/30: resolver UUID de sede como Caja (lista real), no solo a1/a2 hardcode.
  const [sedesDash, setSedesDash] = useState([]);
  useEffect(() => { if (conectado) api.sedes.listar().then((s) => setSedesDash(s || [])).catch(() => {}); }, []); // eslint-disable-line
  // NEW-38: médico solo ve sus citas también en el gráfico (no abrir el filtro con `conectado`).
  const normMedNom = (s) => String(s || "").replace(/^(?:\s*(?:dr\(a\)\.?|dra\.?|dr\.?)\s*)+/i, "").trim().toLowerCase();
  const citasMed = !esMed ? citas : (!conectado
    ? citas.filter((c) => c.medicoId === 1)
    : citas.filter((c) => {
        const yo = normMedNom(auth.sesion?.nombre);
        if (!yo) return true;
        const med = normMedNom(c.medico);
        return !med || med === yo || med.includes(yo) || yo.includes(med);
      }));
  const chAll = citasMed.filter((c) => c.fecha === fmt(hoy));
  const esCitaActivaHoy = (c) => !["cancelada", "no_show", "reprogramada", "cerrada_sistema"].includes(c.estado);
  // Médico: ya filtrado en citasMed.
  const ch = chAll;
  const citasHoyKpi = ch.filter(esCitaActivaHoy);
  const [det, setDet] = useState(null); // KPI abierto en modal de detalle
  const rowsCitas = (arr) => [...arr].sort((a, b) => a.hora.localeCompare(b.hora)).map((c) => ({ izq: `${c.hora} – ${c.paciente}`, der: (ESTADO_BADGE[c.estado] || {}).l || c.estado }));
  // Con sesión manda el valor que envía el backend (precio base de la especialidad).
  // Antes se buscaba en ESPECIALIDADES, la constante de demostración con ids 1..5,
  // mientras c.esp es un UUID: no casaba nunca y todas las citas valían 100 soles.
  const precio = (c) => (c.valor != null ? Number(c.valor) || 0
    : conectado ? 0 : (ESPECIALIDADES.find((e) => e.id === c.esp)?.precio || 100));
  const produccionDia = ch.filter((c) => c.estado === "atendida" || c.estado === "en_atencion").reduce((s, c) => s + precio(c), 0);
  // NEW-29/30: filtrar pagos como Caja (sede activa del selector).
  const pagosEnSedeActiva = (lista) => {
    if (!lista) return [];
    if (sedeActiva === "all") return lista;
    const want = Number(sedeActiva) === 2 ? "a2" : "a1";
    const uuidHard = sedeApiUuid(sedeActiva);
    const uuidApi = sedesDash.find((s) => String(s.id).endsWith(want))?.id || sedesDash[Number(sedeActiva) - 1]?.id;
    const sid = uuidApi || uuidHard;
    const nom = sedesDash.find((s) => s.id === sid)?.nombre || nombreSede(sedeActiva);
    const corta = cortaSede(sedeActiva);
    return lista.filter((p) => {
      if (p.sedeId && sid) {
        if (p.sedeId === sid || String(p.sedeId).endsWith(want)) return true;
      }
      if (p.sede && nom) {
        if (p.sede === nom || String(p.sede).includes(corta)) return true;
      }
      // Si no hay sede en el pago, no inventar match.
      return false;
    });
  };
  const hoyIso = fmt(hoy);
  const mesIso = hoyIso.slice(0, 7);
  // NEW-55: distinguir «cargando» / «falló» / «array vacío real».
  const pagosHistFalló = !!(pagosHist && pagosHist.errorDeCarga);
  const pagosHistOk = Array.isArray(pagosHist);
  const pagosSede = pagosEnSedeActiva(pagosHistOk ? pagosHist : []);
  const cobradoHoyCaja = pagosSede.filter((p) => (p.fecha || "").toString().slice(0, 10) === hoyIso)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const cobradoMesCaja = pagosSede.filter((p) => (p.fecha || "").toString().slice(0, 7) === mesIso)
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  // Médico: producción de atenciones. Resto conectado: cobrado en caja (alineado con Caja).
  const ingresos = esMed || !conectado
    ? produccionDia
    : (pagosHistFalló ? null : (pagosHist == null ? null : cobradoHoyCaja));
  const cobrosHoyRows = !esMed && conectado && pagosHistOk
    ? pagosSede.filter((p) => (p.fecha || "").toString().slice(0, 10) === hoyIso)
        .map((p) => ({ izq: p.paciente || "—", der: `S/ ${Number(p.monto || 0).toLocaleString()}` }))
    : null;
  // La jornada de hoy sale del horario de la clínica: una que abre 9–19 y otra que abre
  // solo sábados por la mañana no pueden tener la misma rejilla ni la misma capacidad.
  // Antes eran once horas fijas de 8 a 18 para todo el mundo.
  // El horario es de cada SEDE: con una sede concreta se usa el suyo; con "todas" se
  // usa el general de la clínica, porque no hay una jornada única que valga para varias.
  const jornadaHoy = jornadaClinica(horarioDeSede(horarioClinica.horario, sedeActiva), horarioClinica.feriados, fmt(hoy));
  const HH = jornadaHoy.abierta ? horasEntre(jornadaHoy.abre, jornadaHoy.cierra) : [];
  const capHora = esMed ? 2 : 4;
  // La capacidad del día es la jornada por los cupos de cada hora, que es justo lo que
  // dibuja la rejilla "Agenda de hoy por hora". Antes era un 16 suelto que no cuadraba
  // con esa rejilla: la ocupación salía sobre 16 y los cupos libres sobre 44.
  const capacidad = HH.length * capHora;
  // Integraciones del panel de sistemas. Definidas aquí y no dentro de su tarjeta
  // porque la cabecera también necesita saber cuántas están con incidencia.
  const INTEGRACIONES_TI = [["WhatsApp Business API (Meta)", "operativo", "Última sync hace 2 min"],
                            ["Pasarela de pago (Culqi)", "operativo", "Transacciones OK"],
                            // Decía "incidencia – 2 comprobantes observados", que da por hecha una
                            // integración activa con SUNAT, mientras la tarjeta de administración de
                            // esta misma demostración dice que todavía no se envían.
                            ["Facturación electrónica (SUNAT)", "pendiente", "Integración aún no activada"],
                            ["Respaldo automático", "operativo", "Último backup 03:00 h"],
                            ["Servidor de correo", "operativo", "Cola vacía"]];
  const incidenciasTI = INTEGRACIONES_TI.filter(([, e]) => e === "incidencia").length;
  // Sin capacidad (día cerrado) no hay ocupación que calcular: 0/0 daba NaN y la tarjeta
  // escribía "NaN%" con una barra de ancho "NaN%".
  const ocupacion = capacidad > 0 ? Math.min(100, Math.round((ch.length / capacidad) * 100)) : null;
  const proxima = ch.filter((c) => c.estado === "confirmada" || c.estado === "pendiente").sort((a, b) => a.hora.localeCompare(b.hora))[0];
  const dias = [...Array(7)].map((_, i) => { const f = addDays(i - 6); return { v: citasMed.filter((c) => c.fecha === f).length, lbl: new Date(f + "T00:00:00").toLocaleDateString("es-PE", { weekday: "short" }).slice(0, 2) }; });
  const estados = [
    { k: "pendiente", c: "var(--dc-warn)" }, { k: "confirmada", c: DS.c.primary }, { k: "en_atencion", c: "var(--dc-purple)" }, { k: "atendida", c: "var(--dc-ok-700)" }, { k: "cancelada", c: "var(--dc-red)" },
  ].map((e) => ({ ...e, v: ch.filter((c) => c.estado === e.k).length })).filter((e) => e.v > 0);
  const totalEstados = estados.reduce((s, e) => s + e.v, 0) || 1;
  const prodRows = cobrosHoyRows || ch.filter((c) => c.estado === "atendida" || c.estado === "en_atencion").map((c) => ({ izq: c.paciente, der: `S/ ${precio(c)}` }));
  const pacRows = [...pacientes].sort((a, b) => (b.ultima || "").localeCompare(a.ultima || "")).slice(0, 30).map((p) => ({ izq: p.nombre, der: p.ultima ? (fechaLegible(p.ultima) || p.ultima) : "—" }));
  const kpis = esMed ? [
    ["Mis citas hoy", ch.length, Calendar, NAVY, rowsCitas(ch)],
    ["Atendidas", ch.filter((c) => c.estado === "atendida").length, CheckCircle2, "var(--dc-ok-700)", rowsCitas(ch.filter((c) => c.estado === "atendida"))],
    ["En atención", ch.filter((c) => c.estado === "en_atencion").length, Activity, "var(--dc-purple)", rowsCitas(ch.filter((c) => c.estado === "en_atencion"))],
    ["Producción de hoy", `S/ ${(ingresos ?? 0).toLocaleString()}`, Wallet, RED, prodRows],
    // Es el total de la SEDE, no los pacientes del médico: sale el mismo número que le
    // sale al administrador de la sede. Se llama como lo que es hasta que exista un
    // recuento propio por médico.
    ["Pacientes de la sede", pacientes.length, Users, DS.c.primary, pacRows],
  ] : [
    ["Citas hoy", citasHoyKpi.length, Calendar, NAVY, rowsCitas(citasHoyKpi)],
    ["Confirmadas", ch.filter((c) => c.estado === "confirmada").length, CheckCircle2, DS.c.primary, rowsCitas(ch.filter((c) => c.estado === "confirmada"))],
    ["En atención", ch.filter((c) => c.estado === "en_atencion").length, Activity, "var(--dc-purple)", rowsCitas(ch.filter((c) => c.estado === "en_atencion"))],
    ["Atendidas", ch.filter((c) => c.estado === "atendida").length, CheckCircle2, "var(--dc-ok-700)", rowsCitas(ch.filter((c) => c.estado === "atendida"))],
    ["Ingresos del día", pagosHistFalló ? "No disponible" : (pagosHist == null && conectado ? "…" : `S/ ${(ingresos ?? 0).toLocaleString()}`), Wallet, RED, pagosHistFalló ? [{ izq: "No se pudo cargar el historial de pagos", der: "Reintenta" }] : prodRows],
    ["Pacientes", pacientes.length, Users, DS.c.primary, pacRows],
  ];
  const porHora = HH.map((h) => { const n = ch.filter((c) => parseInt(c.hora, 10) === h).length; return { h, n, pct: Math.min(100, Math.round((n / capHora) * 100)) }; });
  const maxN = Math.max(1, ...porHora.map((x) => x.n));
  const pico = porHora.reduce((a, b) => (b.n > a.n ? b : a), porHora[0]);
  // Solo lo que queda POR DELANTE: contar las franjas de la mañana ya pasada hacía que a
  // las seis de la tarde el asistente propusiera llenar las nueve de la mañana.
  const horaAhora = new Date().getHours();
  const porHoraQuedan = porHora.filter((x) => x.h >= horaAhora);
  const libres = porHoraQuedan.filter((x) => x.n === 0).length;    // franjas sin cita que aún quedan
  const cuposLibres = Math.max(0, porHoraQuedan.length * capHora - ch.filter((c) => parseInt(c.hora, 10) >= horaAhora).length);
  const colHora = (x) => x.n === 0 ? "var(--dc-line)" : x.pct >= 100 ? "var(--dc-red)" : x.pct >= 60 ? "var(--dc-warn-600)" : DS.c.primary;
  // Gerencia mira el negocio entero: conversion de presupuestos, deuda y cartera.
  // Administrador de sede mira su operacion: ocupacion y ausentismo de SU sede
  // (el backend ya recorta /gerencial/reportes a las sedes del usuario).
  const [indGer, setIndGer] = useState(null);
  const [repSede, setRepSede] = useState(null);
  useEffect(() => {
    if (!conectado) return;
    if (esGer) api.gerencialIndicadores().then(setIndGer).catch(() => {});
    if (esAdmSede) api.gerencialReportes().then(setRepSede).catch(() => {});
  }, [conectado]); // eslint-disable-line
  const num = (v) => Number(v || 0).toLocaleString();
  const bloque = (valor, color, pie) => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
      <div style={{ fontSize: 21, fontWeight: 600, color, fontFamily: DISPLAY_FONT, lineHeight: 1.1 }}>{valor}</div>
      <div style={{ fontSize: 12, color: "var(--dc-ink-400)", lineHeight: 1.35 }}>{pie}</div>
    </div>
  );
  const kpiBody = (l, v, rows) => <div onClick={() => setDet({ titulo: l, rows: rows || [] })} style={{ cursor: "pointer", height: "100%", display: "flex", alignItems: "center" }}><div style={{ fontSize: 27, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, lineHeight: 1 }}>{v}</div></div>;
  // Recepción usa la misma bandeja de pendientes que el resto de roles.
  const nPend = pendEvo?.pendientes || 0;

  // Una frase por rol, con el mismo criterio que usa recepción: primero cómo va la
  // jornada, después lo que queda por hacer. Un número suelto no dice si el día va
  // bien; "3 de 8 atendidos" sí.
  const saludo = horaAhora < 12 ? "Buenos días" : horaAhora < 19 ? "Buenas tardes" : "Buenas noches";
  const miNombre = (auth.sesion && (auth.sesion.nombre || "").split(" ")[0]) || "";
  const atendidasHoy = ch.filter((c) => c.estado === "atendida").length;
  const sinConfirmar = ch.filter((c) => c.estado === "pendiente").length;
  const frase = esMed
    ? (ch.length === 0 ? "Hoy no tienes pacientes agendados." : `Hoy atiendes a ${pluralEs(ch.length, "paciente", "pacientes")}. Llevas ${atendidasHoy}.`)
    : esTI
      // Decía "Todo operativo" incluso con la incidencia de SUNAT abierta en la tarjeta
      // de abajo. Cuenta las que hay, sobre la misma lista que pinta esa tarjeta.
      ? (incidenciasTI === 0
          ? "Todo operativo. Sin incidencias en las integraciones."
          : `${incidenciasTI} integración(es) con incidencia. Revísalas antes que nada.`)
      : esGer
        ? (ch.length === 0 ? "Hoy no hay citas agendadas en la clínica." : `La clínica tiene ${pluralEs(ch.length, "cita", "citas")} hoy y ${pluralEs(cuposLibres, "cupo sin vender", "cupos sin vender")}.`)
        : (ch.length === 0 ? "Hoy no hay citas agendadas." : `${pluralEs(ch.length, "cita", "citas")} hoy${sinConfirmar ? `, ${pluralEs(sinConfirmar, "sin confirmar", "sin confirmar")}` : ""}. Quedan ${pluralEs(cuposLibres, "cupo libre", "cupos libres")}.`);
  const avance = ch.length ? Math.round((atendidasHoy / ch.length) * 100) : 0;

  // ======================================================================
  // PENDIENTES DE HOY — bandeja de tareas accionables. Sustituye al lienzo de
  // tarjetas, que repetía cifras del Dashboard gerencial y de la Agenda.
  // Cada fila dice qué falta hacer y lleva al sitio donde se resuelve.
  // ======================================================================
  const manana = addDays(1);
  const mananaSinConf = citasMed.filter((c) => c.fecha === manana && c.estado === "pendiente");
  const sinConfHoy = ch.filter((c) => c.estado === "pendiente");
  const mesesDesde = (iso) => { if (!iso) return 0; const d = new Date(iso + "T00:00:00"); return (hoy.getFullYear() - d.getFullYear()) * 12 + (hoy.getMonth() - d.getMonth()); };
  const porReactivar = pacientes.filter((p) => p.ultima && mesesDesde(p.ultima) >= 6);
  const DEUDORES_DEMO = [["Elena Vargas", 1240, 45], ["Marco Salas", 860, 31], ["Julia Ríos", 640, 62], ["Andrés Paz", 420, 18], ["Nora Campos", 300, 8]];
  const deudores = conectado
    ? ((cajaDeuda && cajaDeuda.porCobrar) || []).filter((r) => Number(r.saldo) > 0).map((r) => ({ n: r.paciente || "—", v: Number(r.saldo) || 0 }))
    : DEUDORES_DEMO.filter(([, , d]) => d > 30).map(([n, v]) => ({ n, v }));
  const verCaja = esAdmin || esGer || esAdmSede;
  const nombres = (arr, k = "paciente") => arr.slice(0, 3).map((x) => x[k]).join(", ") + (arr.length > 3 ? ` y ${arr.length - 3} más` : "");
  const tareas = [
    esTI && INTEGRACIONES_TI.some(([, e]) => e === "pendiente") && { id: "tiPend", tono: "info", icon: <Plug size={18} strokeWidth={1.75} />, titulo: `${pluralEs(INTEGRACIONES_TI.filter(([, e]) => e === "pendiente").length, "integración por activar", "integraciones por activar")}`, detalle: INTEGRACIONES_TI.filter(([, e]) => e === "pendiente").map(([n]) => n).join(", ") + ".", accion: "Ver integraciones", ir: () => onIr("integraciones") },
    esTI && incidenciasTI > 0 && { id: "ti", tono: "peligro", icon: <Plug size={18} strokeWidth={1.75} />, titulo: `${pluralEs(incidenciasTI, "integración con incidencia", "integraciones con incidencia")}`, detalle: "Revisa el estado y reconecta antes de que afecte a la atención.", accion: "Ver integraciones", ir: () => onIr("integraciones") },
    nPend > 0 && { id: "evo", tono: "aviso", icon: <ClipboardList size={18} strokeWidth={1.75} />, titulo: `${pluralEs(nPend, "evolución sin completar", "evoluciones sin completar")}`, detalle: `${(pendEvo.items || []).slice(0, 3).map((x) => x.paciente).join(", ")}${nPend > 3 ? ` y ${nPend - 3} más` : ""}. La producción cuenta cuando las completas.`, accion: "Completar", ir: () => { const primer = (pendEvo.items || [])[0]; if (primer?.pacienteId) onIr("pacientes", { pacienteId: primer.pacienteId }); else onIr("pacientes"); } },
    !esTI && sinConfHoy.length > 0 && { id: "confHoy", tono: "aviso", icon: <CalendarCheck size={18} strokeWidth={1.75} />, titulo: `${pluralEs(sinConfHoy.length, "cita de hoy sin confirmar", "citas de hoy sin confirmar")}`, detalle: nombres([...sinConfHoy].sort((a, b) => a.hora.localeCompare(b.hora)).map((c) => ({ paciente: `${c.hora} ${c.paciente}` }))), accion: "Ir a la agenda", ir: () => onIr("agenda") },
    !esTI && !esMed && mananaSinConf.length > 0 && { id: "confMan", tono: "info", icon: <Send size={18} strokeWidth={1.75} />, titulo: `${pluralEs(mananaSinConf.length, "cita de mañana por confirmar", "citas de mañana por confirmar")}`, detalle: "Envía el recordatorio por WhatsApp para que confirmen hoy.", accion: "Enviar confirmaciones", ir: enviarConfMañana },
    verCaja && deudores.length > 0 && { id: "deuda", tono: "peligro", icon: <Wallet size={18} strokeWidth={1.75} />, titulo: `${pluralEs(deudores.length, "paciente con saldo vencido", "pacientes con saldo vencido")} – S/ ${deudores.reduce((a, d) => a + d.v, 0).toLocaleString("es-PE")}`, detalle: nombres(deudores, "n"), accion: "Ir a caja", ir: () => onIr("facturacion") },
    esAdmin && !conectado && { id: "sunat", tono: "peligro", icon: <FileText size={18} strokeWidth={1.75} />, titulo: "2 comprobantes observados por SUNAT", detalle: "Y 9 pendientes de envío. Corrígelos para no perder el plazo de emisión.", accion: "Revisar", ir: () => onIr("facturacion") },
    esAdmin && !conectado && { id: "seguros", tono: "info", icon: <Umbrella size={18} strokeWidth={1.75} />, titulo: "1 liquidación de seguro observada", detalle: "La Positiva – S/ 1,900. Mapfre tiene S/ 3,100 por enviar.", accion: "Ver seguros", ir: () => onIr("seguros") },
    esMed && !conectado && { id: "controles", tono: "info", icon: <BellRing size={18} strokeWidth={1.75} />, titulo: "2 controles vencen esta semana", detalle: "María Fernanda López (ortodoncia) y Carlos Quispe (post-endodoncia).", accion: "Ver pacientes", ir: () => onIr("pacientes") },
    !esTI && !esMed && porReactivar.length > 0 && { id: "reactivar", tono: "info", icon: <Repeat size={18} strokeWidth={1.75} />, titulo: `${pluralEs(porReactivar.length, "paciente para reactivar", "pacientes para reactivar")}`, detalle: `Más de 6 meses sin venir: ${nombres(porReactivar, "nombre")}.`, accion: "Enviar recordatorio", ir: () => onIr("recall") },
  ].filter(Boolean);
  const ordenTono = { peligro: 0, aviso: 1, info: 2 };
  tareas.sort((a, b) => ordenTono[a.tono] - ordenTono[b.tono]);
  const ahoraHM = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const activasHoy = [...ch].filter(esCitaActivaHoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const proximas = (() => { const q = activasHoy.filter((c) => c.hora >= ahoraHM && c.estado !== "atendida"); return (q.length ? q : activasHoy).slice(0, 6); })();
  const fechaHoy = (() => { const f = hoy.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" }); return f.charAt(0).toUpperCase() + f.slice(1); })();
  const cifras = esTI
    ? [["Integraciones operativas", `${INTEGRACIONES_TI.filter(([, e]) => e === "operativo").length}/${INTEGRACIONES_TI.length}`], ["Con incidencia", incidenciasTI], ["Por activar", INTEGRACIONES_TI.filter(([, e]) => e === "pendiente").length], ["Usuarios", usrTiDash ? usrTiDash.length : STAFF_INIT.length]]
    : [["Citas hoy", citasHoyKpi.length], ["Atendidas", atendidasHoy], ["Por confirmar", sinConfirmar], [esMed ? "Producción hoy" : "Cobrado hoy", ingresos == null ? "—" : `S/ ${Number(ingresos).toLocaleString("es-PE")}`]];
  return (
    <div className="dc-hoy">
      <section className="dc-hero">
        <div className="dc-hero__txt">
          <span className="dc-hero__fecha">{fechaHoy}</span>
          <h2>{saludo}{miNombre ? `, ${miNombre}` : ""}</h2>
          <p>{frase}</p>
        </div>
        <div className="dc-hero__cifras">
          {cifras.map(([l, v]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
        </div>
        {!esTI && <button type="button" className="dc-hero__btn" onClick={() => onIr("agenda")}><Calendar size={15} strokeWidth={1.75} /> Ver agenda</button>}
      </section>

      <div className={`dc-hoy__grid${esTI ? " dc-hoy__grid--solo" : ""}`}>
        <Card className="dc-hoy__tareas">
          <div className="dc-hoy__cab">
            <h3>Por hacer</h3>
            <span className="dc-hoy__num">{tareas.length}</span>
          </div>
          {tareas.length === 0 ? (
            <div className="dc-hoy__vacio"><CheckCircle2 size={28} strokeWidth={1.5} /><b>Todo al día</b><span>No hay nada pendiente por ahora.</span></div>
          ) : tareas.map((t) => (
            <div key={t.id} className={`dc-tarea dc-tarea--${t.tono}`}>
              <span className="dc-tarea__ico">{t.icon}</span>
              <div className="dc-tarea__txt"><b>{t.titulo}</b><span>{t.detalle}</span></div>
              <Btn small kind={t.tono === "peligro" ? "primary" : "ghost"} onClick={t.ir}>{t.accion} <ChevronRight size={14} strokeWidth={1.75} /></Btn>
            </div>
          ))}
        </Card>

        <div className="dc-hoy__lado">
          {!esTI && ch.length > 0 && (() => {
            const grupos = [
              ["Atendidas", ["atendida"], "#16A36A"],
              ["En clínica", ["en_sala", "en_atencion"], "#F2A531"],
              ["Confirmadas", ["confirmada"], "#0E8C95"],
              ["Por confirmar", ["pendiente"], "#9AAAB0"],
              ["No vinieron", ["no_show", "cancelada"], "#E06A58"],
            ].map(([l, est, c]) => ({ l, c, n: ch.filter((x) => est.includes(x.estado)).length })).filter((g) => g.n > 0);
            const tot = grupos.reduce((a, g) => a + g.n, 0) || 1;
            return (
              <Card className="dc-hoy__estado">
                <div className="dc-hoy__cab"><h3>Avance del día</h3><span className="dc-hoy__pct">{avance}%</span></div>
                <div className="dc-hoy__estado-cuerpo">
                  <div className="dc-hoy__barra" role="img" aria-label={grupos.map((g) => `${g.l}: ${g.n}`).join(", ")}>
                    {grupos.map((g) => <i key={g.l} style={{ width: `${(g.n / tot) * 100}%`, background: g.c }} />)}
                  </div>
                  <ul className="dc-hoy__ley">
                    {grupos.map((g) => <li key={g.l}><i style={{ background: g.c }} />{g.l}<b>{g.n}</b></li>)}
                  </ul>
                </div>
              </Card>
            );
          })()}
          {!esTI && (
            <Card className="dc-hoy__proximas">
              <div className="dc-hoy__cab"><h3>{esMed ? "Tus próximos pacientes" : "Próximas citas"}</h3><button type="button" className="dc-hoy__link" onClick={() => onIr("agenda")}>Ver todas</button></div>
              {proximas.length === 0 ? <div className="dc-hoy__vacio dc-hoy__vacio--mini"><span>No hay citas para hoy.</span></div> : proximas.map((c) => {
                const e = ESTADO_BADGE[c.estado] || ESTADO_BADGE.pendiente;
                return (
                  <div key={c.id} className="dc-cita">
                    <span className="dc-cita__hora">{c.hora}</span>
                    <div className="dc-cita__txt"><b>{c.paciente}</b><span>{c.motivo || "Consulta"}</span></div>
                    <span className="dc-cita__estado" style={{ background: e.bg, color: e.fg }}>{e.l}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>
      {det && <Modal icon={<BarChart3 size={20} strokeWidth={1.75} />} titulo={det.titulo} sub={`${det.rows.length} registro(s)`} onClose={() => setDet(null)} maxW={520}>
        {det.rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Sin registros para mostrar.</div> : det.rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: i ? "1px solid var(--dc-line)" : "none", fontSize: 13 }}><span style={{ color: "var(--dc-ink-700)" }}>{r.izq}</span><span style={{ fontWeight: 500, color: NAVY }}>{r.der}</span></div>
        ))}
      </Modal>}
    </div>
  );
}


/* ---- Agenda con acciones de flujo ---- */
/* Resumen de estados del odontograma para la ficha. */
const DIENTE_INFO = {
  caries: { l: "Caries", c: "var(--dc-red)" }, obturado: { l: "Obturado", c: DS.c.primary }, corona: { l: "Corona", c: "var(--dc-warn-700)" }, sellante: { l: "Sellante", c: "var(--dc-ok-700)" },
  ausente: { l: "Ausente", c: "var(--dc-ink-500)" }, endodoncia: { l: "Endodoncia", c: "var(--dc-purple)" }, implante: { l: "Implante", c: "var(--dc-blue)" }, extraer: { l: "Por extraer", c: "var(--dc-red)" }, fractura: { l: "Fractura", c: "var(--dc-warn-600)" } };
const ATENCION = ["caries", "extraer", "fractura"];

/* Ficha del paciente con DATOS REALES del backend (endpoint ficha360). */
function FichaReal({ data, onClose, notify = () => {} }) {
  const p = data?.paciente || {};
  const r = data?.resumen || {};
  const money = (n) => "S/ " + (Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const edad = calcEdad(p.fechaNacimiento);
  const arr = (x) => Array.isArray(x) ? x : [];
  const secTit = { fontSize: 13, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 7 };
  const box = { border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "12px 14px", background: "#fff" };
  const kpi = (l, v, c) => <div style={{ ...box, flex: "1 1 130px" }}><div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".04em" }}>{l}</div><div style={{ fontSize: 18, fontWeight: 600, color: c || NAVY, fontFamily: DISPLAY_FONT, marginTop: 3 }}>{v}</div></div>;
  const Sec = ({ icon, titulo, children, vacio }) => (
    <div style={{ marginTop: 16 }}>
      <div style={secTit}>{icon} {titulo}</div>
      {children ?? <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{vacio}</div>}
    </div>
  );
  const filaL = { display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--dc-bg-alt)", fontSize: 13 };
  const citas = arr(data?.citas), trat = arr(data?.tratamientos), pagos = arr(data?.pagos), odo = arr(data?.odontograma),
        rec = arr(data?.recetas), lab = arr(data?.laboratorio), hist = arr(data?.historia), resenas = arr(data?.resenas);
  const EST_TRAT = { pendiente: "var(--dc-ink-200)", en_progreso: "var(--dc-warn)", completada: "var(--dc-ok-700)" };
  const [tab, setTab] = useState("resumen");
  const TABS = [{id:"resumen",label:"Resumen"},{id:"clinico",label:"Historia clínica"},{id:"pagos",label:"Finanzas"}];
  return (
    <Modal icon={<User size={20} strokeWidth={1.75} />} titulo={p.nombre || "Ficha del paciente"}
      sub={[p.dni ? `DNI ${p.dni}` : null, p.telefono, (p.fechaNacimiento && edad != null) ? `${edad} años` : null, p.distrito, p.aseguradora && p.aseguradora !== "Ninguno" ? p.aseguradora : null].filter(Boolean).join(" – ")}
      onClose={onClose} maxW={720}>
      {/* Bug D19 re-test: Alergias siempre visibles en header */}
      {(arr(p.alergias).length > 0 || arr(p.antecedentes).length > 0) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, padding: "0 0 12px", borderBottom: "1px solid var(--dc-line)" }}>
          {arr(p.alergias).map((a) => <span key={"al" + a} style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-danger-700)", background: "var(--dc-fee2)", padding: "4px 10px", borderRadius: "var(--dc-r-full)" }}>⚠ Alergia: {a}</span>)}
          {arr(p.antecedentes).map((a) => <span key={"an" + a} style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", padding: "4px 10px", borderRadius: "var(--dc-r-full)" }}>{a}</span>)}
        </div>
      )}
      {/* Bug D20 re-test: Botones de acción rápida en header */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Btn small onClick={() => notify("Función 'Agendar cita' próximamente")}><Calendar size={14} strokeWidth={1.75} /> Agendar cita</Btn>
        <Btn small onClick={() => notify("Función 'Registrar cobro' próximamente")}><CreditCard size={14} strokeWidth={1.75} /> Registrar cobro</Btn>
      </div>
      {/* KPIs */}
      {/* Bug D21 re-test: Navegación responsive en móvil */}
      <div style={{ display: "flex", gap: 24, margin: "0 -24px 16px", padding: "0 24px", borderBottom: "1px solid var(--dc-line)", background: "var(--dc-bg)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 0", border: "none", background: "none", borderBottom: `2px solid ${tab === t.id ? DS.c.primary : "transparent"}`, color: tab === t.id ? NAVY : "var(--dc-ink-500)", fontWeight: tab === t.id ? 800 : 600, fontSize: 13, cursor: "pointer", transition: "background-color 150ms ease, color 150ms ease", whiteSpace: "nowrap", flexShrink: 0 }}>{t.label}</button>
        ))}
      </div>
      
      {tab === "resumen" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {kpi("Saldo", money(r.saldo), (Number(r.saldo) || 0) > 0.5 ? "var(--dc-warn-600)" : "var(--dc-ok-700)")}
            {kpi("Invertido", money(r.invertido))}
            {/* Bug #16 re-test: Usar trat.length directamente, no confiar en r.tratamientos que puede ser 0 */}
            {kpi("Tratamientos", trat.length)}
            {kpi("Piezas por atender", r.piezasPorAtender ?? "—", "var(--dc-danger)")}
          </div>
          {p.comentario && <div style={{ ...box, marginTop: 12, fontSize: 13, color: "var(--dc-ink-700)", background: "var(--dc-bg-soft2)" }}>{p.comentario}</div>}
          
          <Sec icon={<Calendar size={15} strokeWidth={1.75} color={DS.c.primary} />} titulo={`Histórico de citas (${citas.length})`} vacio="Sin citas registradas.">
            {citas.length > 0 && <div style={box}>
              <div style={{ ...filaL, fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid var(--dc-line)" }}>
                <span style={{ width: 140 }}>Fecha / hora</span><span style={{ flex: 1 }}>Especialidad – Médico</span><span style={{ width: 72, textAlign: "center" }}>Sillón</span><span style={{ width: 100, textAlign: "right" }}>Estado</span>
              </div>
              {citas.slice(0, 20).map((c, i) => (
              <div key={i} style={filaL}>
                <span style={{ color: NAVY, fontWeight: 500, width: 140 }}>{c.fecha || "—"}{c.hora ? " – " + c.hora : ""}</span>
                <span style={{ color: "var(--dc-ink-400)", flex: 1 }}>{c.especialidad} – {c.medico}</span>
                <span style={{ width: 72, textAlign: "center", fontWeight: 500, color: c.sillon ? NAVY : "var(--dc-ink-400)" }}>{c.sillon ? `S${c.sillon}` : "—"}</span>
                <span style={{ width: 100, textAlign: "right", fontWeight: 500, color: "var(--dc-ink-700)" }}>{(ESTADO_BADGE[c.estado] || {}).l || c.estado}</span>
              </div>
            ))}
            </div>}
          </Sec>
        </>
      )}

      {tab === "clinico" && (
        <>
          <Sec icon={<Smile size={15} strokeWidth={1.75} color={DS.c.primary} />} titulo={`Odontograma (${odo.length})`} vacio="Sin hallazgos.">
            {odo.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", padding: "12px 8px", background: "var(--dc-bg-soft2)", borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-line)" }}>
                  {odo.map((o, i) => {
                    const info = DIENTE_INFO[o.estado] || { l: o.estado || "Marcada", c: "var(--dc-danger-700)" };
                    return (
                      <div key={i} title={o.nota || info.l} style={{ width: 44, textAlign: "center" }}>
                        <div style={{ width: 36, height: 42, margin: "0 auto 4px", borderRadius: "6px 6px 10px 10px", border: `2px solid ${info.c}`, background: tint(info.c, 0.133), display: "grid", placeItems: "center", fontSize: 12, fontWeight: 500, color: info.c }}>{o.pieza}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: info.c, lineHeight: 1.2 }}>{info.l}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>Numeración FDI – R.M. 559-2022-MINSA. Abre la ficha completa en Pacientes para editar el odontograma gráfico.</div>
              </div>
            )}
          </Sec>
            
            <Sec icon={<FlaskConical size={15} strokeWidth={1.75} color={DS.c.primary} />} titulo={`Laboratorio (${lab.length})`} vacio="Sin envíos.">
              {/* Bug D24 re-test: Verificado que muestra trabajo, proveedor (lab) y estado */}
              {lab.length > 0 && <div style={box}>{lab.map((l, i) => (
                <div key={i} style={filaL}><span style={{ color: NAVY, fontWeight: 500 }}>{l.trabajo}</span><span style={{ color: "var(--dc-ink-400)" }}>{l.lab}</span><span style={{ fontWeight: 500, color: "var(--dc-warn-600)" }}>{l.estado}</span></div>
              ))}</div>}
            </Sec>

          <Sec icon={<ClipboardList size={15} strokeWidth={1.75} color={DS.c.primary} />} titulo={`Plan de tratamiento (${trat.length})`} vacio="Sin plan de tratamiento.">
            {trat.length > 0 && <div style={box}>{trat.map((t, i) => (
              <div key={i} style={filaL}><span style={{ color: NAVY, fontWeight: 500 }}>{t.nombre}{t.pieza ? ` – pieza ${t.pieza}` : ""}</span><span style={{ color: EST_TRAT[t.estado] || "var(--dc-ink-400)", fontWeight: 500 }}>{t.estado}</span><span style={{ fontWeight: 500 }}>{money(t.costo)}</span></div>
            ))}</div>}
          </Sec>
          
          <Sec icon={<FileText size={15} strokeWidth={1.75} color={DS.c.primary} />} titulo={`Recetas (${rec.length})`} vacio="Sin recetas.">
            {rec.length > 0 && <div style={box}>{rec.slice(0, 8).map((x, i) => (
              <div key={i} style={filaL}><span style={{ color: NAVY, fontWeight: 500 }}>{x.fecha || "—"}</span><span style={{ color: "var(--dc-ink-400)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.indicaciones || "—"}</span><span style={{ color: "var(--dc-ink-400)" }}>{x.medico}</span></div>
            ))}</div>}
          </Sec>
        </>
      )}

      {tab === "pagos" && (
        <Sec icon={<CreditCard size={15} strokeWidth={1.75} color={DS.c.primary} />} titulo={`Historial de Pagos (${pagos.length})`} vacio="Sin pagos registrados.">
          {pagos.length > 0 && <div style={box}>{pagos.map((pg, i) => (
            <div key={i} style={filaL}><span style={{ color: NAVY, fontWeight: 500 }}>{pg.fecha || "—"}</span><span style={{ color: "var(--dc-ink-400)", flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pg.concepto || "—"}</span><span style={{ fontWeight: 500, color: "var(--dc-ok-700)" }}>{money(pg.monto)}</span></div>
          ))}</div>}
        </Sec>
      )}
    </Modal>
  );
}

/* Ficha del paciente (modal reutilizable): odontograma, plan, pagos e historia. */
function FichaPaciente({ nombre, onClose, fichas, cita }) {
  const p = PACIENTES_INIT.find((x) => x.nombre === nombre);
  const ficha = p && ((fichas && fichas[p.id]) || FICHA_CLINICA[p.id]);
  const trat = (ficha && ficha.tratamiento) || [];
  const total = trat.reduce((s, f) => s + f.costo, 0);
  const pagado = trat.filter((f) => f.estado === "atendida").reduce((s, f) => s + f.costo, 0);
  const saldo = total - pagado;
  const pend = trat.filter((f) => f.estado === "pendiente").length;
  const piezas = Object.entries((ficha && ficha.odontograma) || {}).map(([n, d]) => {
    const partes = [];
    if (d.whole) partes.push({ parte: "Toda la pieza", estado: d.whole });
    if (d.caras) Object.entries(d.caras).forEach(([k, e]) => partes.push({ parte: caraOdontoLabel(n, k), estado: e }));
    return { n, partes, nota: (ficha && ficha.notas && ficha.notas[n]) || "" };
  }).filter((x) => x.partes.length);
  const piezasAtencion = piezas.filter((x) => x.partes.some((pt) => ATENCION.includes(pt.estado))).length;
  const ini = (s) => (s || "?").split(" ").map((w) => w[0]).join("").slice(0, 2);
  const TEAL = DS.c.primary;
  const sub = { fontSize: 13, fontWeight: 500, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 };
  const secc = { background: "#fff", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-lg)", padding: "16px 18px", boxShadow: "0 1px 2px rgba(16,24,40,.03)" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "grid", placeItems: "center", zIndex: 200, padding: 20 }}>
      <div className="dc-modal dc-ficha-modal" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "min(860px,96vw)", maxHeight: "92vh", borderRadius: "var(--dc-r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 44px 110px -34px rgba(15,27,56,.62)", animation: "dcModal .28s cubic-bezier(.2,.7,.2,1)" }}>
        <div className="dc-modal__head" style={{ position: "relative", padding: "22px 26px", color: "#fff", flexShrink: 0 }}>
          <button aria-label="Cerrar" className="dc-modal__x" onClick={onClose} style={{ position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,.15)", border: "none", borderRadius: "var(--dc-r-sm)", width: 30, height: 30, cursor: "pointer", color: "#fff", display: "grid", placeItems: "center" }}><X size={16} strokeWidth={1.75} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: "var(--dc-r-lg)", background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", fontWeight: 600, fontFamily: DISPLAY_FONT, fontSize: 16 }}>{ini(nombre)}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: DISPLAY_FONT }}>{nombre}</div>
              <div className="dc-ficha-chips">{p ? <><span>DNI {p.dni}</span><span><MapPin size={12} strokeWidth={2} /> {etiquetaSedes(p.sedes ?? p.sede)}</span>{p.ultima && <span><Clock size={12} strokeWidth={2} /> Última visita {fechaLegible(p.ultima)}</span>}</> : <span>Paciente</span>}</div>
            </div>
          </div>
          {/* La ficha puede existir sin estas listas -updFicha la crea vacia y le anade solo
              lo que se guarde-, asi que .length a secas reventaba la pantalla. */}
          {ficha && ((ficha.alergias || []).length > 0 || (ficha.antecedentes || []).length > 0) && (
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {ficha.alergias.map((a) => <span key={a} style={{ background: "rgba(248,113,113,.22)", color: "var(--dc-fee)", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: "var(--dc-r-full)" }}>⚠ {a}</span>)}
              {ficha.antecedentes.map((a) => <span key={a} style={{ background: "rgba(255,255,255,.14)", color: "var(--dc-bg)", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: "var(--dc-r-full)" }}>{a}</span>)}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {cita && (
          <div style={{ padding: "16px 26px", background: "var(--dc-bg)", borderBottom: "1px solid var(--dc-line)" }}>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: .6, textTransform: "uppercase", color: "var(--dc-ink-500)", marginBottom: 10 }}>Cita seleccionada</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 26px" }}>
              {[["Hora", cita.hora], ["Odontólogo", (MEDICOS.find((m) => m.id === cita.medicoId) || {}).nombre || "—"], ["Sede", nombreSede(cita.sede)], ["Motivo", cita.motivo]].map(([k, v]) => (
                <div key={k} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)", textTransform: "uppercase", letterSpacing: .4, marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!ficha ? (
          <Vacio icon={<FileText size={24} strokeWidth={1.75} />} titulo="Sin historia clínica registrada" sub="Este paciente aún no tiene fichas. Se crearán en su primera atención." />
        ) : (
          <div style={{ padding: 20, display: "grid", gap: 14, background: "var(--dc-bg)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
              {[["Saldo", `S/ ${saldo.toFixed(0)}`, saldo > 0 ? RED : "var(--dc-ok-700)", <DollarSign size={16} strokeWidth={1.75} />], ["Invertido", `S/ ${(ficha.pagos || []).reduce((s, x) => s + x.monto, 0)}`, "var(--dc-ok-700)", <Wallet size={16} strokeWidth={1.75} />], ["Piezas por atender", piezasAtencion, TEAL, <Smile size={16} strokeWidth={1.75} />], ["Tratamientos", pend, DS.c.primary, <ClipboardList size={16} strokeWidth={1.75} />]].map(([l, v, c, ic]) => (
                <div key={l} style={{ background: tint(c, 0.051), border: "1px solid " + tint(c, 0.133), borderRadius: "var(--dc-r-lg)", padding: "13px 15px" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500 }}>{l}</span><span style={{ color: c }}>{ic}</span></div><div style={{ fontSize: 21, fontWeight: 600, color: c, fontFamily: DISPLAY_FONT }}>{v}</div></div>
              ))}
            </div>

            <div style={secc}>
              <h4 style={sub}><Smile size={14} strokeWidth={1.75} color={TEAL} /> Odontograma — hallazgos por pieza</h4>
              {piezas.length === 0 ? <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Sin hallazgos registrados. Boca sana.</div> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10 }}>
                  {piezas.map((x) => { const att = x.partes.some((pt) => ATENCION.includes(pt.estado)); return (
                    <div key={x.n} style={{ border: `1px solid ${att ? "var(--dc-danger-mid)" : "var(--dc-line)"}`, borderRadius: "var(--dc-r-md)", padding: 12, background: att ? "var(--dc-white)" : "var(--dc-bg)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                        <span style={{ width: 30, height: 30, borderRadius: "var(--dc-r-sm)", background: NAVY, color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13, fontFamily: DISPLAY_FONT }}>{x.n}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)" }}>Pieza {x.n}</span>
                      </div>
                      <div style={{ display: "grid", gap: 5 }}>
                        {x.partes.map((pt, i) => { const info = DIENTE_INFO[pt.estado] || { l: pt.estado, c: "var(--dc-ink-400)" }; return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                            <span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-sm)", background: info.c, flexShrink: 0 }} />
                            <span style={{ color: "var(--dc-ink-700)", flex: 1 }}>{pt.parte}</span>
                            <span style={{ background: tint(info.c, 0.094), color: info.c, fontWeight: 500, fontSize: 12, padding: "2px 8px", borderRadius: "var(--dc-r-full)" }}>{info.l}</span>
                          </div>
                        ); })}
                      </div>
                      {x.nota && <div style={{ fontSize: 12, color: "var(--dc-ink-500)", marginTop: 8, fontStyle: "italic", display: "flex", gap: 5 }}><FileText size={12} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> {x.nota}</div>}
                    </div>
                  ); })}
                </div>
              )}
            </div>

            <div style={secc}>
              <h4 style={sub}><ClipboardList size={14} strokeWidth={1.75} color={DS.c.primary} /> Plan de tratamiento</h4>
              {trat.length === 0 ? <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Sin plan activo.</div> : trat.map((f, i) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: i ? "1px solid var(--dc-bg)" : "none" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "var(--dc-r-full)", background: f.estado === "atendida" ? TEAL : "#fff", color: f.estado === "atendida" ? "#fff" : "var(--dc-ink-500)", border: f.estado === "atendida" ? "none" : "2px solid var(--dc-bg)", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{f.estado === "atendida" ? <Check size={13} strokeWidth={1.75} /> : i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 500, color: NAVY, fontSize: 13 }}>{f.nombre}</span>
                  <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>S/ {f.costo.toFixed(0)}</span>
                  <Badge estado={f.estado} />
                </div>
              ))}
            </div>

            {(ficha.pagos || []).length > 0 && (
              <div style={secc}>
                <h4 style={sub}><CreditCard size={14} strokeWidth={1.75} color="var(--dc-ok-700)" /> Pagos</h4>
                {ficha.pagos.map((pg, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--dc-bg)" : "none", fontSize: 13 }}>
                    <CheckCircle2 size={16} strokeWidth={1.75} color="var(--dc-ok-700)" /><span style={{ flex: 1, color: "var(--dc-ink-700)" }}>{pg.fecha} – {pg.concepto} <span style={{ color: "var(--dc-ink-500)" }}>({pg.metodo})</span></span><span style={{ fontWeight: 500, color: NAVY }}>S/ {pg.monto}</span>
                  </div>
                ))}
              </div>
            )}

            {(ficha.recetas || []).length > 0 && (
              <div style={secc}>
                <h4 style={sub}><FileText size={14} strokeWidth={1.75} color={DS.c.primary} /> Recetas</h4>
                {ficha.recetas.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--dc-bg)" : "none", fontSize: 13 }}>
                    <span style={{ color: DS.c.primary, fontWeight: 500 }}>℞</span><span style={{ flex: 1, color: "var(--dc-ink-700)" }}>{r.texto}</span><span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{r.fecha}</span>
                  </div>
                ))}
              </div>
            )}

            {(ficha.lab || []).length > 0 && (
              <div style={secc}>
                <h4 style={sub}><FlaskConical size={14} strokeWidth={1.75} color={DS.c.primary} /> Trabajos de laboratorio</h4>
                {ficha.lab.map((l, i) => { const I = LAB_INFO[l.estado] || { l: l.estado, bg: "var(--dc-line)", fg: "var(--dc-ink-400)" }; return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--dc-bg)" : "none", fontSize: 13 }}>
                    <FlaskConical size={15} strokeWidth={1.75} color={DS.c.primary} /><span style={{ flex: 1, color: "var(--dc-ink-700)" }}>{l.trabajo} <span style={{ color: "var(--dc-ink-500)" }}>– {l.lab}</span></span><span style={{ fontSize: 12, fontWeight: 500, color: I.fg, background: I.bg, padding: "2px 9px", borderRadius: "var(--dc-r-full)" }}>{I.l}</span>
                  </div>
                ); })}
              </div>
            )}

            {(ficha.historia || []).length > 0 && (
              <div style={secc}>
                <h4 style={sub}><Activity size={14} strokeWidth={1.75} color={TEAL} /> Historia de visitas</h4>
                {ficha.historia.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < ficha.historia.length - 1 ? 14 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ width: 9, height: 9, borderRadius: "var(--dc-r-full)", background: TEAL, marginTop: 5 }} />{i < ficha.historia.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--dc-line)", marginTop: 3 }} />}</div>
                    <div><div style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{h.titulo}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", margin: "1px 0 3px" }}>{h.fecha}</div><div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>{h.detalle}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

/* ---- Primitivos modernos (reutilizables) ---- */
// Número que cuenta hacia arriba al montar (micro-animación).
function useCountUp(target, ms = 650) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
// Anillo de progreso claro y animado (sobre fondo blanco).
const RingLight = ({ pct, size = 48, color = DS.c.primary, track = "var(--dc-line)", sw = 6 }) => {
  const r = (size - sw) / 2, C = 2 * Math.PI * r;
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 90); return () => clearTimeout(t); }, []);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${(on ? pct : 0) / 100 * C} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray .9s cubic-bezier(.2,.7,.2,1)" }} />
    </svg>
  );
};

// Anillos de actividad concéntricos (estilo Apple Health).

/* ---- Vista Calendario semanal de la Agenda ---- */
// Paleta estable de colores por doctor (estilo Doctocliq: cada agenda su color).
const DOC_PAL = [DS.c.primary, "var(--dc-purple)", "var(--dc-red)", "var(--dc-warn-700)", "var(--dc-primary-alt)", "var(--dc-ok-700)", "var(--dc-warn-700)", "var(--dc-danger)", "var(--dc-purple)", "var(--dc-primary-alt)"];
const EST_LABEL = { pendiente: "Pendiente", confirmada: "Confirmada", en_atencion: "En atención", atendida: "Atendida", cancelada: "Cancelada", no_show: "No asistió", reprogramada: "Reprogramada", cerrada_sistema: "Cerrada por sistema" };

const SILLONES_CAL = [1, 2, 3, 4];
/** Sillón real de la cita; null / "sin" si no hay número válido (DC-31: sin hash). */
const sillonDe = (c) => {
  const n = Number(c.sillon);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
};

function CalendarioAgenda({ citas, onCita, onReagendar, horario = {}, feriados = [], bloqueos = [], onNuevo, onRango }) {
  const [modo, setModo] = useState("semana");   // mes | semana | dia | sillon
  const [dlOpen, setDlOpen] = useState(false);   // menú de descarga del rango visible
  const [off, setOff] = useState(0);             // semana
  const [diaOff, setDiaOff] = useState(0);       // dia / sillon
  const [mesOff, setMesOff] = useState(0);       // mes
  const [oculto, setOculto] = useState(() => new Set());
  const [estadoF, setEstadoF] = useState("all");
  const [sedeF, setSedeF] = useState("all");     // filtro por sede
  const [drag, setDrag] = useState(null);        // cita arrastrada
  const [over, setOver] = useState(null);        // celda destino resaltada
  const [sillonesCat, setSillonesCat] = useState(SILLONES_CAL.map((n) => ({ numero: n, nombre: `Sillón ${n}` })));
  useEffect(() => {
    if (!auth.token) return;
    api.sillones.listar().then((rows) => {
      const list = (rows || []).map((r) => ({ numero: Number(r.numero) || 0, nombre: r.nombre || `Sillón ${r.numero}` })).filter((s) => s.numero > 0);
      if (list.length) setSillonesCat(list.sort((a, b) => a.numero - b.numero));
    }).catch(() => {});
  }, []);

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hoyD = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const hoyISO = iso(hoyD);
  const lun = (() => { const d = new Date(hoyD); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow + off * 7); return d; })();
  const semana = [...Array(6)].map((_, i) => { const d = new Date(lun); d.setDate(lun.getDate() + i); return d; });
  const diaSel = (() => { const d = new Date(hoyD); d.setDate(d.getDate() + diaOff); return d; })();
  const HORAS = [...Array(14)].map((_, i) => 8 + i); // 08:00 – 21:00
  const NOM = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const NOML = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MESc = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const docs = (() => {
    const map = new Map();
    for (const c of citas) { const k = c.medicoId || c.medico || "sin"; if (!map.has(k)) map.set(k, c.medico || "Sin asignar"); }
    const arr = [...map.entries()].map(([key, nombre]) => ({ key, nombre }));
    arr.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return arr.map((d, i) => ({ ...d, color: DOC_PAL[i % DOC_PAL.length] }));
  })();
  const colorDe = (c) => (docs.find((d) => d.key === (c.medicoId || c.medico || "sin")) || {}).color || "var(--dc-ink-200)";
  const sedesCal = [...new Set(citas.map((c) => c.sedeNombre || c.sede).filter(Boolean).map(String))];
  const visible = (c) => !oculto.has(c.medicoId || c.medico || "sin") && (estadoF === "all" || c.estado === estadoF) && (sedeF === "all" || String(c.sedeNombre || c.sede) === sedeF);
  const toggle = (key) => setOculto((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const citasDe = (dISO) => citas.filter((c) => c.fecha === dISO && visible(c));
  const enCelda = (dISO, h) => citasDe(dISO).filter((c) => parseInt(c.hora || "99", 10) === h);

  // Estado de atención de un día (para sombrear cerrado / fuera de horario).
  // Config: horario["0".."6"] (getDay) = {abre,cierra,cerrado}; feriados=[{fecha,cerrado,abre,cierra}].
  const hhNum = (s) => { if (!s) return null; const n = parseInt(String(s).split(":")[0], 10); return Number.isFinite(n) ? n : null; };
  const estadoDiaCal = (d) => {
    const fer = (feriados || []).find((x) => x && x.fecha === iso(d));
    if (fer) return fer.cerrado ? { cerrado: true } : { cerrado: false, abre: hhNum(fer.abre), cierra: hhNum(fer.cierra) };
    const cfg = horario && horario[String(d.getDay())];
    if (cfg) return cfg.cerrado ? { cerrado: true } : { cerrado: false, abre: hhNum(cfg.abre), cierra: hhNum(cfg.cierra) };
    return { cerrado: false, abre: null, cierra: null };
  };
  const fueraHorario = (d, h) => { if (!d) return false; const e = estadoDiaCal(d); if (e.cerrado) return true; if (e.abre != null && h < e.abre) return true; if (e.cierra != null && h >= e.cierra) return true; return false; };
  // Bloqueo (almuerzo/ausencia/mantenimiento) que cubre esa fecha+hora.
  const bloqueoEnCelda = (d, h) => {
    if (!d) return null;
    const isoD = iso(d), dow = d.getDay(), hh = String(h).padStart(2, "0");
    return (bloqueos || []).find((b) => {
      const aplica = (b.fecha && String(b.fecha).slice(0, 10) === isoD) || (!b.fecha && Number(b.diaSemana) === dow);
      if (!aplica) return false;
      const ini = (b.horaInicio || "").slice(0, 2), fin = (b.horaFin || "").slice(0, 2);
      return hh >= ini && hh < fin;
    }) || null;
  };
  // Fin de la cita según su duración (para mostrar el rango horario en el bloque).
  const finCita = (c) => { if (!c.hora) return ""; const [h, m] = c.hora.split(":").map(Number); const dur = Number(c.duracionMin) || 30; const t = h * 60 + m + dur; return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

  // Mes
  const mesRef = new Date(hoyD.getFullYear(), hoyD.getMonth() + mesOff, 1);
  const mesGrid = (() => { const startDow = (mesRef.getDay() + 6) % 7; const start = new Date(mesRef); start.setDate(1 - startDow); return [...Array(42)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; }); })();

  const soft = DS.card;
  const navBtn = (ic, fn, label) => <button type="button" className="dc-icon-btn" aria-label={label} onClick={fn} style={{ width: 32, height: 32, borderRadius: "var(--dc-r-sm)", border: "1px solid var(--dc-line)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--dc-ink-700)" }}>{ic}</button>;
  const prev = () => modo === "mes" ? setMesOff(mesOff - 1) : modo === "semana" ? setOff(off - 1) : setDiaOff(diaOff - 1);
  const next = () => modo === "mes" ? setMesOff(mesOff + 1) : modo === "semana" ? setOff(off + 1) : setDiaOff(diaOff + 1);
  const irHoy = () => { setMesOff(0); setOff(0); setDiaOff(0); };
  const enHoy = modo === "mes" ? mesOff === 0 : modo === "semana" ? off === 0 : diaOff === 0;
  const titulo = modo === "mes" ? `${MES[mesRef.getMonth()]} ${mesRef.getFullYear()}`
    : (modo === "semana") ? `${semana[0].getDate()} ${MESc[semana[0].getMonth()]} – ${semana[5].getDate()} ${MESc[semana[5].getMonth()]} ${semana[5].getFullYear()}`
    : `${NOML[(diaSel.getDay() + 6) % 7]} ${diaSel.getDate()} ${MESc[diaSel.getMonth()]} ${diaSel.getFullYear()}`;

  // Columnas de la grilla horaria según el modo
  const docsVis = docs.filter((d) => !oculto.has(d.key));
  const columnas = modo === "sillon"
    ? [
        ...sillonesCat.map((s) => ({ key: "s" + s.numero, label: s.nombre || `Sillón ${s.numero}`, sub: null, on: false, sil: s.numero, dISO: iso(diaSel), date: diaSel })),
        { key: "sin", label: "Sin asignar", sub: null, on: false, sil: null, dISO: iso(diaSel), date: diaSel },
      ]
    : modo === "doctores"
    ? (docsVis.length ? docsVis : [{ key: "sin", nombre: "Sin asignar" }]).map((d) => ({ key: "d" + d.key, label: d.nombre, sub: null, on: false, medKey: d.key, dISO: iso(diaSel), date: diaSel }))
    : (modo === "dia" ? [diaSel] : semana).map((d) => ({ key: iso(d), label: NOM[(d.getDay() + 6) % 7], sub: d.getDate(), on: iso(d) === hoyISO, dISO: iso(d), date: d }));
  const celda = (colDef, h) => modo === "sillon" ? enCelda(colDef.dISO, h).filter((c) => sillonDe(c) === colDef.sil)
    : modo === "doctores" ? enCelda(colDef.dISO, h).filter((c) => (c.medicoId || c.medico || "sin") === colDef.medKey)
    : enCelda(colDef.dISO, h);
  const patchDe = (colDef, h) => modo === "sillon" ? { fecha: colDef.dISO, hora: `${String(h).padStart(2, "0")}:00`, sillon: colDef.sil }
    : modo === "doctores" ? { fecha: colDef.dISO, hora: `${String(h).padStart(2, "0")}:00`, medicoId: colDef.medKey }
    : { fecha: colDef.dISO, hora: `${String(h).padStart(2, "0")}:00` };
  const gcols = `52px repeat(${columnas.length},minmax(0,1fr))`;
  const minW = modo === "dia" ? 420 : modo === "sillon" ? Math.max(620, columnas.length * 140) : modo === "doctores" ? Math.max(620, columnas.length * 170) : 820;

  // Que citas hacen falta para lo que se esta mirando. El padre las pide al backend
  // en vez de traerse el historico entero: se manda un mes de margen a cada lado para
  // que pasar al mes vecino no dispare otra peticion.
  useEffect(() => {
    if (!onRango) return;
    const foco = modo === "mes" ? mesRef : (modo === "dia" || modo === "sillon") ? diaSel : semana[0];
    const desde = new Date(foco.getFullYear(), foco.getMonth() - 1, 1);
    const hasta = new Date(foco.getFullYear(), foco.getMonth() + 2, 0);   // fin del mes siguiente
    onRango(iso(desde), iso(hasta));
  }, [modo, off, diaOff, mesOff]); // eslint-disable-line

  // Descarga del rango visible (día / semana / mes) en Excel o PDF.
  const rangoCitas = (() => {
    let ds;
    if (modo === "mes") ds = mesGrid.filter((d) => d.getMonth() === mesRef.getMonth()).map(iso);
    else if (modo === "semana" || modo === "tabla") ds = semana.map(iso);
    else ds = [iso(diaSel)];
    const set = new Set(ds);
    return citas.filter((c) => set.has(c.fecha) && visible(c)).sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));
  })();
  const COLS_CAL = [
    { key: "fecha", label: "Fecha", w: 12 }, { key: "hora", label: "Hora", w: 8 },
    { key: "paciente", label: "Paciente", w: 26 }, { key: "medico", label: "Doctor", w: 24 }, { key: "estado", label: "Estado", w: 14 },
  ];
  const descargarRango = (tipo) => {
    setDlOpen(false);
    const filas = rangoCitas.map((c) => ({ fecha: c.fecha, hora: c.hora, paciente: c.paciente, medico: c.medico || "—", estado: EST_LABEL[c.estado] || c.estado }));
    if (!filas.length) return;
    if (tipo === "excel") exportarExcel({ nombreArchivo: `agenda_${modo}_${iso(hoyD)}.xlsx`, hoja: "Agenda", titulo: `Agenda — ${titulo}`, columnas: COLS_CAL, filas });
    else exportarPDF({ titulo: `Agenda — ${titulo}`, subtitulo: `${filas.length} cita(s)`, columnas: COLS_CAL, filas });
  };

  const Bloque = ({ c }) => { const col = colorDe(c); const cancel = c.estado === "cancelada"; const arrastrable = !!onReagendar && !cancel; const horaLbl = (modo === "dia" || modo === "sillon") ? `${c.hora}–${finCita(c)}` : c.hora;
    // El alto refleja la duración en Día/Sillón (30 min ≈ 26px): más largo = bloque más alto.
    const alto = (modo === "dia" || modo === "sillon") ? Math.max(26, Math.round((Number(c.duracionMin) || 30) / 30 * 26)) : undefined; return (
    <div draggable={arrastrable} onDragStart={(e) => { setDrag(c); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDrag(null); setOver(null); }}
      onClick={() => onCita && onCita(c)} title={`${c.hora}–${finCita(c)} (${Number(c.duracionMin) || 30} min) – ${c.paciente} – ${c.medico || ""} – ${EST_LABEL[c.estado] || ""}${arrastrable ? " – arrastra para mover" : ""}`}
      style={{ textAlign: "left", border: `1px solid ${tint(col, 0.251)}`, borderLeft: `4px solid ${col}`, background: `linear-gradient(135deg, ${tint(col, 0.082)}, ${tint(col, 0.02)})`, backdropFilter: "blur(8px)", borderRadius: "var(--dc-r-md)", padding: "5px 8px", cursor: arrastrable ? "grab" : "pointer", minWidth: 0, opacity: cancel ? 0.55 : 1, minHeight: alto, boxShadow: `0 4px 12px ${tint(col, 0.082)}, inset 0 2px 4px rgba(255,255,255,0.6)`, transition: "all .15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 6px 16px ${tint(col, 0.145)}, inset 0 2px 4px rgba(255,255,255,0.8)`; if (arrastrable) e.currentTarget.style.transform = "translateY(-1px) scale(1.01)"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 4px 12px ${tint(col, 0.082)}, inset 0 2px 4px rgba(255,255,255,0.6)`; if (arrastrable) e.currentTarget.style.transform = "none"; }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: cancel ? "line-through" : "none", display: "flex", alignItems: "center", gap: 3 }}>{c.confirmadoWa && <CheckCheck size={11} strokeWidth={1.75} color="var(--dc-ok-700)" style={{ flexShrink: 0 }} />}{c.agendadoPorIa && !c.confirmadoWa && <MessageSquare size={10} strokeWidth={1.75} color="var(--dc-ok-700)" style={{ flexShrink: 0 }} />}<span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{horaLbl} {c.paciente}</span></div>
      <div style={{ fontSize: 12, color: col, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: "var(--dc-r-full)", background: col, flexShrink: 0 }} />{c.medico || c.motivo || ""}</div>
    </div>
  ); };

  return (
    <div style={{ ...soft, overflow: "hidden" }}>
      {/* Barra superior */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-bg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {navBtn(<ChevronRight size={16} strokeWidth={1.75} style={{ transform: "rotate(180deg)" }} />, prev, "Anterior")}
            <button onClick={irHoy} style={{ padding: "7px 13px", borderRadius: "var(--dc-r-sm)", border: "1px solid var(--dc-line)", background: enHoy ? DS.c.primary : "#fff", color: enHoy ? "#fff" : "var(--dc-ink-700)", fontWeight: 500, fontSize: 13, cursor: "pointer", boxShadow: enHoy ? "0 2px 6px -1px " + tint(DS.c.primary, 0.376) : "0 1px 2px rgba(16,24,40,.04)" }}>Hoy</button>
            {navBtn(<ChevronRight size={16} strokeWidth={1.75} />, next, "Siguiente")}
          </div>
          <div style={{ fontWeight: 600, color: INK, fontSize: 16, fontFamily: DISPLAY_FONT, textTransform: "capitalize", letterSpacing: "-.01em" }}>{titulo}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Select small width={172} ariaLabel="Filtrar por estado" value={estadoF} onChange={setEstadoF}
                  options={[{ value: "all", label: "Todos los estados" },
                            ...Object.entries(EST_LABEL).map(([k, l]) => ({ value: k, label: l }))]} />
          {sedesCal.length > 1 && (
            <Select small width={158} ariaLabel="Filtrar por sede" value={sedeF} onChange={setSedeF}
                    options={[{ value: "all", label: "Todas las sedes" },
                              ...sedesCal.map((s) => ({ value: s, label: s }))]} />
          )}
          <div style={{ display: "inline-flex", background: "var(--dc-bg-alt)", borderRadius: "var(--dc-r-md)", padding: 3 }}>
            {[["mes", "Mes"], ["semana", "Semana"], ["dia", "Día"], ["doctores", "Doctores"], ["sillon", "Sillón"], ["tabla", "Tabla"]].map(([k, lbl]) => (
              <button key={k} onClick={() => setModo(k)} style={{ padding: "6px 13px", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: modo === k ? "#fff" : "transparent", color: modo === k ? DS.c.primary : "var(--dc-ink-400)", boxShadow: modo === k ? "0 1px 2px rgba(16,24,40,.12)" : "none" }}>{lbl}</button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setDlOpen((v) => !v)} title="Descargar lo visible" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: "var(--dc-r-sm)", border: "1px solid var(--dc-line)", background: "#fff", fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", cursor: "pointer" }}><Download size={15} strokeWidth={1.75} /> Descargar</button>
            {dlOpen && (<>
              <div onClick={() => setDlOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 41, background: "#fff", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", boxShadow: "0 18px 40px -18px rgba(16,24,40,.4)", overflow: "hidden", minWidth: 220 }}>
                <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid var(--dc-bg)" }}>{modo === "mes" ? "Mes visible" : (modo === "semana" || modo === "tabla") ? "Semana visible" : "Día visible"} – {rangoCitas.length} cita(s)</div>
                <button onClick={() => descargarRango("excel")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 13px", border: "none", background: "#fff", cursor: "pointer", fontSize: 13, color: NAVY, fontWeight: 500 }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}><FileSpreadsheet size={16} strokeWidth={1.75} color="var(--dc-ok-700)" /> Excel (.xlsx)</button>
                <button onClick={() => descargarRango("pdf")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 13px", border: "none", borderTop: "1px solid var(--dc-bg)", background: "#fff", cursor: "pointer", fontSize: 13, color: NAVY, fontWeight: 500 }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}><FileText size={16} strokeWidth={1.75} color="var(--dc-red)" /> PDF</button>
              </div>
            </>)}
          </div>
        </div>
      </div>

      {/* Filtro de doctores (chips) */}
      {docs.length > 0 && (
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--dc-bg)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".05em", marginRight: 2 }}>Agendas</span>
          {docs.map((d) => { const on = !oculto.has(d.key); return (
            <button key={d.key} onClick={() => toggle(d.key)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: "var(--dc-r-full)", border: `1px solid ${on ? tint(d.color, 0.314) : "var(--dc-line)"}`, background: on ? tint(d.color, 0.063) : "var(--dc-bg)", color: on ? d.color : "var(--dc-ink-400)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              <span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-full)", background: on ? d.color : "var(--dc-line-alt2)" }} />{d.nombre}
            </button>
          ); })}
          {docs.length > 1 && <button onClick={() => setOculto(oculto.size ? new Set() : new Set(docs.map((d) => d.key)))} style={{ marginLeft: "auto", fontSize: 12, fontWeight: 500, color: DS.c.primary, background: "none", border: "none", cursor: "pointer" }}>{oculto.size ? "Ver todas" : "Ocultar todas"}</button>}
        </div>
      )}

      {modo === "mes" ? (
        <div style={{ padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((n) => <div key={n} style={{ textAlign: "center", fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase" }}>{n}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {mesGrid.map((d, i) => { const dISO = iso(d); const cs = citasDe(dISO).sort((a, b) => (a.hora || "").localeCompare(b.hora || "")); const otroMes = d.getMonth() !== mesRef.getMonth(); const esHoy = dISO === hoyISO; return (
              <div key={i} onClick={() => { setModo("dia"); setDiaOff(Math.round((d - hoyD) / 86400000)); }} className="dc-rise" style={{ minHeight: 110, borderRadius: "var(--dc-r-lg)", border: `1px solid ${esHoy ? tint(DS.c.primary, 0.502) : "rgba(228,231,236,0.6)"}`, background: esHoy ? "rgba(255,255,255,0.9)" : otroMes ? "rgba(245,247,250,0.5)" : "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", padding: "10px 12px", cursor: "pointer", opacity: otroMes ? 0.7 : 1, display: "flex", flexDirection: "column", gap: 5, transition: "all .2s", boxShadow: esHoy ? `0 8px 24px -10px ${tint(DS.c.primary, 0.251)}, inset 0 2px 4px rgba(255,255,255,1)` : "none" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = tint(DS.c.primary, 0.376); e.currentTarget.style.boxShadow = `0 10px 24px -12px ${tint(DS.c.primary, 0.251)}, inset 0 2px 4px rgba(255,255,255,1)`; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = esHoy ? tint(DS.c.primary, 0.502) : "rgba(228,231,236,0.6)"; e.currentTarget.style.boxShadow = esHoy ? `0 8px 24px -10px ${tint(DS.c.primary, 0.251)}, inset 0 2px 4px rgba(255,255,255,1)` : "none"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: esHoy ? DS.c.primary : NAVY, textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: otroMes ? 0.5 : 1 }}>{d.getDate()}</div>
                {cs.slice(0, 4).map((c) => { const col = colorDe(c); return <div key={c.id} style={{ fontSize: 12, fontWeight: 500, color: NAVY, background: `linear-gradient(135deg, ${tint(col, 0.125)}, ${tint(col, 0.02)})`, border: `1px solid ${tint(col, 0.251)}`, borderLeft: `3px solid ${col}`, borderRadius: "var(--dc-r-sm)", padding: "3px 7px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(4px)" }}><span style={{ fontWeight: 500, color: col }}>{c.hora}</span> <span>{c.paciente}</span></div>; })}
                {cs.length > 4 && <div style={{ fontSize: 12, fontWeight: 500, color: DS.c.primary, background: tint(DS.c.primary, 0.071), padding: "2px 7px", borderRadius: "var(--dc-r-full)", alignSelf: "flex-start", marginTop: 2 }}>+{cs.length - 4} más</div>}
              </div>
            ); })}
          </div>
        </div>
      ) : modo === "tabla" ? (() => {
        const ESTC = { pendiente: "var(--dc-ink-200)", confirmada: DS.c.primary, en_atencion: "var(--dc-warn)", atendida: "var(--dc-ok-700)", cancelada: "var(--dc-red)", no_show: "var(--dc-warn-600)", reprogramada: "var(--dc-purple)", cerrada_sistema: "var(--dc-ink-400)" };
        const rows = semana.flatMap((d) => citasDe(iso(d)).map((c) => ({ ...c, _d: d }))).sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));
        return (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "var(--dc-bg-soft2)" }}>
              {["Día", "Hora", "Paciente", "Doctor", "Estado"].map((h) => <th key={h} style={{ textAlign: "left", padding: "12px 18px", fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid var(--dc-line)", whiteSpace: "nowrap" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((c) => { const col = colorDe(c); const ec = ESTC[c.estado] || "var(--dc-ink-200)"; const cancel = c.estado === "cancelada"; return (
                <tr key={c.id} onClick={() => onCita && onCita(c)} style={{ cursor: "pointer", borderBottom: "1px solid var(--dc-bg)", opacity: cancel ? 0.6 : 1 }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg-soft)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 18px", color: iso(c._d) === hoyISO ? DS.c.primary : "var(--dc-ink-700)", fontWeight: iso(c._d) === hoyISO ? 700 : 500, whiteSpace: "nowrap" }}>{NOM[(c._d.getDay() + 6) % 7]} {c._d.getDate()}</td>
                  <td style={{ padding: "12px 18px", fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, fontVariantNumeric: "tabular-nums" }}>{c.hora}</td>
                  <td style={{ padding: "12px 18px", fontWeight: 500, color: NAVY, textDecoration: cancel ? "line-through" : "none" }}>{c.paciente}</td>
                  <td style={{ padding: "12px 18px", color: "var(--dc-ink-700)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "var(--dc-r-full)", background: col, flexShrink: 0 }} />{c.medico || c.motivo || "—"}</span></td>
                  <td style={{ padding: "12px 18px" }}><span style={{ fontSize: 12, fontWeight: 500, color: ec, background: tint(ec, 0.094), padding: "3px 11px", borderRadius: "var(--dc-r-full)", whiteSpace: "nowrap" }}>{EST_LABEL[c.estado] || c.estado}</span></td>
                </tr>
              ); })}
              {rows.length === 0 && <tr><td colSpan={5} style={{ padding: "34px 18px", textAlign: "center", color: "var(--dc-ink-400)" }}>Sin citas en esta semana.</td></tr>}
            </tbody>
          </table>
        </div>
        );
      })() : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: minW }}>
            <div style={{ display: "grid", gridTemplateColumns: gcols, borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div />
              {columnas.map((col, i) => { const cerrado = estadoDiaCal(col.date).cerrado; return (
                <div key={i} title={cerrado ? "Clínica cerrada" : undefined} style={{ textAlign: "center", padding: "9px 4px", borderLeft: "1px solid rgba(15,23,42,0.04)", opacity: cerrado ? 0.55 : 1 }}>
                  <div style={{ fontSize: 12, color: col.on ? DS.c.primary : "var(--dc-ink-500)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".04em" }}>{col.label}</div>
                  {col.sub != null && <div style={{ fontSize: 16, fontWeight: 500, color: col.on ? "#fff" : NAVY, fontFamily: DISPLAY_FONT, width: 30, height: 30, borderRadius: "var(--dc-r-full)", margin: "3px auto 0", display: "grid", placeItems: "center", background: col.on ? DS.c.primary : "transparent", boxShadow: col.on ? `0 4px 10px -2px ${tint(DS.c.primary, 0.502)}` : "none" }}>{col.sub}</div>}
                  {cerrado && <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".04em", marginTop: 1 }}>Cerrado</div>}
                </div>
              ); })}
            </div>
            {HORAS.map((h) => (
              <div key={h} style={{ display: "grid", gridTemplateColumns: gcols, borderBottom: "1px solid rgba(15,23,42,0.04)", minHeight: modo === "dia" || modo === "sillon" ? 58 : 52 }}>
                <div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500, padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{String(h).padStart(2, "0")}:00</div>
                {columnas.map((col, i) => { const cs = celda(col, h); const overKey = col.key + "-" + h; const isOver = over === overKey; const cerr = fueraHorario(col.date, h); const blk = bloqueoEnCelda(col.date, h); const libre = cs.length === 0 && !blk && !cerr && !!onNuevo; return (
                  <div key={i} title={blk ? `Bloqueado: ${blk.motivo || "no disponible"}` : cerr ? "Fuera del horario de atención" : (libre ? "Clic para agendar aquí" : undefined)}
                    onClick={libre ? () => onNuevo(patchDe(col, h)) : undefined}
                    onDragOver={onReagendar && !blk ? (e) => { if (drag) { e.preventDefault(); if (over !== overKey) setOver(overKey); } } : undefined}
                    onDragLeave={onReagendar ? () => { if (over === overKey) setOver(null); } : undefined}
                    onDrop={onReagendar && !blk ? (e) => { if (drag) { e.preventDefault(); onReagendar(drag.id, patchDe(col, h)); setDrag(null); setOver(null); } } : undefined}
                    style={{ borderLeft: "1px solid rgba(15,23,42,0.04)", padding: 3, display: "flex", flexDirection: "column", gap: 3, cursor: libre ? "pointer" : "default", background: isOver ? (tint(DS.c.primary, 0.071)) : blk ? "repeating-linear-gradient(45deg,var(--dc-bg),var(--dc-bg) 6px,var(--dc-fee) 6px,var(--dc-fee) 12px)" : (cerr ? "repeating-linear-gradient(45deg,var(--dc-bg),var(--dc-bg) 6px,var(--dc-bg) 6px,var(--dc-bg) 12px)" : "transparent"), outline: isOver ? `2px dashed ${DS.c.primary}` : "none", outlineOffset: -2 }}>
                    {blk && cs.length === 0 && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-danger-700)", opacity: .8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{blk.motivo || "Bloqueado"}</span>}
                    {cs.map((c) => <Bloque key={c.id} c={c} />)}
                  </div>
                ); })}
              </div>
            ))}
          </div>
        </div>
      )}
      {onReagendar && modo !== "mes" && modo !== "tabla" && <div style={{ padding: "8px 18px", borderTop: "1px solid var(--dc-bg)", fontSize: 12, color: "var(--dc-ink-400)", display: "flex", alignItems: "center", gap: 6 }}><Repeat size={13} strokeWidth={1.75} /> Arrastra una cita para cambiar {modo === "sillon" ? "sillón u hora" : "fecha u hora"}.</div>}
    </div>
  );
}

/* ---- Modo TV: pantalla de sala de espera (llama al paciente) ---- */
function SalaTV({ onClose, citasDemo = [] }) {
  const conectado = !!auth.token;
  const [citas, setCitas] = useState([]);
  const [reloj, setReloj] = useState(() => new Date());
  const cargar = () => { if (conectado) api.citas.listar().then((r) => setCitas((r || []).map((c) => ({ id: c.id, paciente: c.paciente, medico: c.medico, sede: c.sede, hora: (c.hora || "").slice(0, 5), estado: c.estado, llegada: !!c.llegada })))).catch(() => {}); };
  useEffect(() => { cargar(); const a = setInterval(cargar, 12000); const b = setInterval(() => setReloj(new Date()), 1000); return () => { clearInterval(a); clearInterval(b); }; }, []); // eslint-disable-line
  const fuente = conectado ? citas : citasDemo.map((c) => ({ id: c.id, paciente: c.paciente, medico: (MEDICOS.find((m) => m.id === c.medicoId) || {}).nombre, sede: nombreSede(c.sede), hora: c.hora, estado: c.estado, llegada: c.llegada }));
  const corto = (n) => { const p = (n || "").trim().split(" ").filter(Boolean); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : (n || "—"); };
  const enAtencion = fuente.filter((c) => c.estado === "en_atencion");
  const enEspera = fuente.filter((c) => c.llegada && c.estado !== "en_atencion" && c.estado !== "atendida" && c.estado !== "cancelada").sort((a, b) => a.hora.localeCompare(b.hora));
  const hh = reloj.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  const fecha = reloj.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "radial-gradient(1200px 700px at 20% -10%, var(--dc-brand-700), var(--dc-ink-900) 60%)", color: "#fff", display: "flex", flexDirection: "column", padding: "3vh 3vw", fontFamily: DISPLAY_FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 54, height: 54, borderRadius: "var(--dc-r-lg)", background: `linear-gradient(135deg, ${DS.c.accent}, ${DS.c.primary})`, display: "grid", placeItems: "center" }}><Smile size={30} strokeWidth={1.75} color="#fff" /></div>
          <div><div style={{ fontSize: "clamp(20px,2.2vw,34px)", fontWeight: 500 }}>Dento Check</div><div style={{ fontSize: "clamp(11px,1vw,15px)", color: "var(--dc-brand-soft)", textTransform: "capitalize" }}>{fecha}</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: "clamp(30px,4vw,64px)", fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: "-.02em" }}>{hh}</div>
          <button aria-label="Cerrar" onClick={onClose} style={{ background: "rgba(255,255,255,.12)", border: "none", borderRadius: "var(--dc-r-md)", width: 44, height: 44, cursor: "pointer", color: "#fff", display: "grid", placeItems: "center" }}><X size={22} strokeWidth={1.75} /></button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "3vw", flex: 1, minHeight: 0 }}>
        <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "clamp(14px,1.3vw,20px)", fontWeight: 500, color: "var(--dc-green-soft)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "1.6vh", display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 12, height: 12, borderRadius: "var(--dc-r-full)", background: "var(--dc-ok)", boxShadow: "0 0 0 6px rgba(34,197,94,.25)" }} /> Llamando – en atención</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))", gap: "1.6vh", overflowY: "auto", alignContent: "start" }}>
            {enAtencion.length === 0 ? <div style={{ color: "var(--dc-slate)", fontSize: "clamp(16px,1.6vw,24px)", fontWeight: 500 }}>Sin pacientes en atención por ahora.</div> : enAtencion.map((c) => (
              <div key={c.id} style={{ background: "linear-gradient(135deg,var(--dc-ok),var(--dc-ok-700))", borderRadius: "var(--dc-r-lg)", padding: "clamp(14px,1.8vw,26px)", boxShadow: "0 18px 40px -18px rgba(22,163,74,.6)" }}>
                <div style={{ fontSize: "clamp(24px,2.6vw,44px)", fontWeight: 500, lineHeight: 1.05 }}>{corto(c.paciente)}</div>
                <div style={{ fontSize: "clamp(13px,1.2vw,19px)", color: "var(--dc-bg)", marginTop: 6 }}>{c.medico || "Consultorio"} – {c.sede || ""}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "clamp(14px,1.3vw,20px)", fontWeight: 500, color: "var(--dc-amber-soft)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "1.6vh" }}>En espera ({enEspera.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1vh", overflowY: "auto" }}>
            {enEspera.length === 0 ? <div style={{ color: "var(--dc-slate)", fontSize: "clamp(15px,1.4vw,20px)", fontWeight: 500 }}>Nadie en espera.</div> : enEspera.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "var(--dc-r-lg)", padding: "clamp(10px,1.2vw,18px)" }}>
                <div style={{ fontSize: "clamp(16px,1.5vw,26px)", fontWeight: 500, color: "var(--dc-amber-soft)", fontVariantNumeric: "tabular-nums", minWidth: "2.5ch" }}>{c.hora}</div>
                <div style={{ fontSize: "clamp(16px,1.5vw,26px)", fontWeight: 500, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{corto(c.paciente)}</div>
                <div style={{ fontSize: "clamp(11px,1vw,15px)", color: "var(--dc-brand-soft)", whiteSpace: "nowrap" }}>{c.medico || ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Registro de evolución clínica ligado a la cita (cierra el trabajo del doctor y habilita su producción). */
function EvolucionModal({ cita, onClose, onGuardada, notify }) {
  const conectado = !!auth.token;
  const [f, setF] = useState({ diagnostico: "", detalle: "", receta: "" });
  const [guardando, setGuardando] = useState(false);
  const inp = { width: "100%", padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" };
  const lbl = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
  const guardar = () => {
    if (!f.diagnostico.trim() && !f.detalle.trim()) { notify("Escribe al menos el diagnóstico o la evolución."); return; }
    if (conectado) {
      setGuardando(true);
      api.historia.crear({ pacienteId: cita.pacienteId, citaId: cita.id, medicoId: cita.medicoId, titulo: "Evolución", diagnostico: f.diagnostico, detalle: f.detalle, receta: f.receta || null })
        .then(() => onGuardada())
        .catch(() => { setGuardando(false); notify("No se pudo guardar la evolución."); });
      return;
    }
    onGuardada();
  };
  return (
    <Modal icon={<Stethoscope size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Evolución de la atención" sub={`${cita.paciente || "Paciente"}${cita.fecha ? " – " + cita.fecha : ""}`} onClose={onClose} maxW={560}
      footer={<><Btn small kind="ghost" onClick={onClose}>Cancelar</Btn><Btn small onClick={guardar} disabled={guardando}><Check size={15} strokeWidth={1.75} /> Guardar evolución</Btn></>}>
      <div style={{ display: "grid", gap: 14 }}>
        <div><label style={lbl}>Diagnóstico</label><input className="dc-premium-inp" value={f.diagnostico} onChange={(e) => setF({ ...f, diagnostico: e.target.value })} placeholder="Ej. Caries oclusal pieza 36" style={inp} /></div>
        <div><label style={lbl}>Evolución / procedimiento realizado</label><textarea className="dc-premium-inp" value={f.detalle} onChange={(e) => setF({ ...f, detalle: e.target.value })} rows={4} placeholder="Describe lo realizado en la atención…" style={inp} /></div>
        <div><label style={lbl}>Indicaciones / receta (opcional)</label><textarea className="dc-premium-inp" value={f.receta} onChange={(e) => setF({ ...f, receta: e.target.value })} rows={2} placeholder="Ej. Ibuprofeno 400mg c/8h por 3 días…" style={inp} /></div>
        <div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>Al guardar, esta atención cuenta en tu producción.</div>
      </div>
    </Modal>
  );
}

/* Cancelar cita con motivo (trazabilidad + reprogramación). */
function CancelarCitaModal({ cita, onClose, onConfirm }) {
  const MOTIVOS = ["El paciente no puede asistir", "El paciente reprogramó", "No contesta / no confirma", "Emergencia del doctor", "Duplicada / error", "Otro"];
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [nota, setNota] = useState("");
  const selSty = { width: "100%", padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, fontWeight: 500, cursor: "pointer", boxSizing: "border-box" };
  const lblSty = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
  return (
    <Modal icon={<X size={20} strokeWidth={1.75} />} tone={RED} titulo="Cancelar cita" sub={`${cita.paciente || "Paciente"}${cita.hora ? " – " + cita.hora : ""}`} onClose={onClose} maxW={460}
      footer={<><Btn small kind="ghost" onClick={onClose}>No cancelar</Btn><Btn small kind="red" onClick={() => onConfirm([motivo, nota.trim()].filter(Boolean).join(" — "))}><X size={15} strokeWidth={1.75} /> Confirmar cancelación</Btn></>}>
      <div style={{ display: "grid", gap: 14 }}>
        <div><label style={lblSty}>Motivo de la cancelación</label>
          <Select value={motivo} onChange={setMotivo} options={MOTIVOS.map((m) => ({ value: m, label: m }))} />
        </div>
        <div><label style={lblSty}>Nota (opcional)</label><input className="dc-premium-inp" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalle…" style={{ ...selSty, cursor: "text", fontWeight: 400 }} /></div>
        <div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>Si hay pacientes en lista de espera, se ofrecerá el cupo liberado.</div>
      </div>
    </Modal>
  );
}

function Agenda({ citas: citasProp, setCitas, medicos, rol, usuario, notify, onAtender, ofrecerCupo, fichas, esperaState = [], setEspera = () => {}, pacientes = [], setPacientes = () => {}, vistaInicial = "dia", onIrEspera, can, agendarDesdeFicha = null, onAgendarDesdeFichaDone = () => {}, crearIntent = false, onIntentDone = () => {}, sedeActiva = 1 }) {
  // Reprogramar y cancelar es operar la agenda. Antes se decidía con `rol !== "medico"`
  // y gerencia -que solo lee- pasaba el filtro y podía cancelar cualquier cita.
  const puedeOperarAgenda = can ? can("agenda", "editar") : rol !== "medico";
  const conectado = !!auth.token;
  const mapCita = (c) => ({ id: c.id, pacienteId: c.pacienteId, paciente: c.paciente || "—", dni: c.dni || "", medicoId: c.medicoId, medico: c.medico || "—", sede: c.sedeId, sedeNombre: c.sede || "—", esp: c.especialidadId, fecha: c.fecha, hora: (c.hora || "").slice(0, 5), duracionMin: c.duracionMin || null, sillon: c.sillon || null, motivo: c.motivo, estado: c.estado, llegada: !!c.llegada, confirmadoWa: !!c.confirmadoWa, agendadoPorIa: !!c.agendadoPorIa });
  const [remoto, setRemoto] = useState(null);
  const [saldos, setSaldos] = useState({});   // pacienteId → saldo por cobrar (para cobrar desde la fila)
  const [pago, setPago] = useState(null);      // { pid, nombre, monto, sedeId }
  const [vista, setVista] = useState(vistaInicial); // dia (citas + espera) | calendario (agenda)
  const [tv, setTv] = useState(false);          // modo TV sala de espera
  const [remotoAll, setRemotoAll] = useState(null); // todas las citas (para el calendario)
  const [nuevaCita, setNuevaCita] = useState(null);  // id de cita recién creada (resaltar)
  const [asignarPac, setAsignarPac] = useState(null); // paciente de espera a asignarle cupo (elige doctor/fecha/hora) — modo demo
  const [asignarBase, setAsignarBase] = useState(null); // prefill del modal REAL de agendado al asignar desde espera (conectado)
  const [espKey, setEspKey] = useState(0);              // fuerza recarga de la lista de espera tras asignar
  const [reprog, setReprog] = useState(null);           // reprogramar una cita sin arrastrar: { id, paciente, fecha, hora }
  const [dlOpen, setDlOpen] = useState(false);          // menú de descarga (Excel / PDF)
  const [evoCita, setEvoCita] = useState(null);         // cita para registrar evolución clínica
  const [cancelCita, setCancelCita] = useState(null);   // cita a cancelar (con motivo)
  const cancelarConMotivo = (c, motivo) => {
    if (conectado) { api.citas.cambiarEstado(c.id, "cancelada", motivo).then(() => { notify(`Cita de ${c.paciente} cancelada.`); recargar(); recargarAll(); }).catch(() => notify("Error al cancelar.")); }
    else { setCitas((cs) => cs.map((x) => x.id === c.id ? { ...x, estado: "cancelada" } : x)); notify(`Cita de ${c.paciente} cancelada.`); }
    ofrecerCupo && ofrecerCupo(c);
    setCancelCita(null);
  };
  const recargar = () => { if (conectado) api.citas.listar(fmt(hoy)).then((r) => setRemoto((r || []).map(mapCita))).catch(() => notify("No se pudieron cargar las citas.")); };
  // El calendario pedia fecha=all: TODO el historico de la clinica al navegador, y
  // creciendo sin techo. Ahora pide solo el rango que esta mirando (el propio
  // CalendarioAgenda lo informa al navegar de mes o de semana) con un mes de margen
  // a cada lado, para que moverse al mes vecino no dispare otra peticion.
  const rangoCargado = useRef("");
  const cargarRango = (desde, hasta) => {
    if (!conectado || !desde || !hasta) return;
    const clave = desde + "_" + hasta;
    if (rangoCargado.current === clave) return;   // ya lo tenemos
    rangoCargado.current = clave;
    api.citas.listar(null, desde, hasta)
      .then((r) => setRemotoAll((r || []).map(mapCita)))
      .catch(() => { rangoCargado.current = ""; });   // que un fallo no bloquee el reintento
  };
  // Tras crear o mover una cita hay que releer el rango que se esta viendo.
  const recargarAll = () => { const c = rangoCargado.current; rangoCargado.current = ""; if (c) { const [d, h] = c.split("_"); cargarRango(d, h); } };
  const recargarSaldos = () => {
    if (!conectado || (can && !can("facturacion", "ver"))) return;
    api.caja().then((c) => { const m = {}; (c?.porCobrar || []).forEach((r) => { m[r.pacienteId] = Number(r.saldo) || 0; }); setSaldos(m); }).catch(() => {});
  };
  const [horarioClinica, setHorarioClinica] = useState({ horario: {}, feriados: [] }); // para sombrear cerrado/feriados en el calendario
  const [bloqueos, setBloqueos] = useState([]);         // bloqueos de agenda (almuerzo/ausencia/mantenimiento)
  const [bloqForm, setBloqForm] = useState(null);       // modal para crear bloqueo
  const [esperaResumen, setEsperaResumen] = useState([]); // resumen de la lista de espera (el gestor vive en su submódulo)
  const recargarBloqueos = () => { if (conectado) api.bloqueos.listar().then((r) => setBloqueos(r || [])).catch(() => {}); };
  useEffect(() => { recargar(); recargarSaldos(); recargarBloqueos(); if (conectado) { api.clinica.get().then((r) => setHorarioClinica({ horario: (r?.horario && typeof r.horario === "object") ? r.horario : {}, feriados: Array.isArray(r?.feriados) ? r.feriados : [] })).catch(() => {}); api.espera.listar().then((r) => setEsperaResumen(r || [])).catch(() => {}); } }, []); // eslint-disable-line
  useEffect(() => {
    if (!agendarDesdeFicha) return;
    setAgendar(agendarDesdeFicha);
    onAgendarDesdeFichaDone();
  }, [agendarDesdeFicha]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!crearIntent) return;
    setAgendar(true);
    onIntentDone();
  }, [crearIntent]); // eslint-disable-line react-hooks/exhaustive-deps
  const citas = conectado ? (remoto || []) : citasProp;
  const [ficha, setFicha] = useState(null);
  const [fichaCita, setFichaCita] = useState(null);
  const [fmId, setFmId] = useState(null);               // ficha médica conectada (no texto demo)
  const abrirFichaCita = (c) => {
    if (conectado && c?.pacienteId) { setFmId(c.pacienteId); setFichaCita(c); return; }
    setFicha(c?.paciente); setFichaCita(c);
  };
  const [agendar, setAgendar] = useState(false);
  const puedeAgendar = conectado && (rol === "recepcion" || rol === "admin" || rol === "gerencia");
  // En demo filtra por id numérico de MEDICOS. Conectado el backend restringe por rol;
  // no comparar UUID de la API con id de demostración (dejaba el calendario vacío).
  const miId = rol === "medico" && !conectado ? (medicos.find((m) => m.nombre === usuario?.nombre) || {}).id : null;
  const esCitaActivaHoy = (c) => !["cancelada", "no_show", "reprogramada", "cerrada_sistema"].includes(c.estado);
  const todasHoy = citas.filter((c) => c.fecha === fmt(hoy) && (miId == null || c.medicoId === miId));
  const citasHoyActivas = todasHoy.filter(esCitaActivaHoy);
  const esPresenteHoy = (c) => !!(c.llegada || c.estado === "en_atencion" || c.estado === "atendida");
  const presentesHoy = citasHoyActivas.filter(esPresenteHoy);
  const porLlegarHoy = citasHoyActivas.filter((c) => !esPresenteHoy(c));
  const nom = (id) => medicos.find((m) => m.id === id)?.nombre || "—";
  const set = (id, estado, msg) => { if (conectado) { api.citas.cambiarEstado(id, estado).then(() => { msg && notify(msg); recargar(); }).catch(() => notify("Error al cambiar el estado.")); return; } setCitas((cs) => cs.map((c) => c.id === id ? { ...c, estado } : c)); msg && notify(msg); };
  const checkIn = (id) => { if (conectado) { api.citas.checkin(id).then(() => { notify("Check-in registrado."); recargar(); }).catch(() => notify("Error en el check-in.")); return; } setCitas((cs) => cs.map((c) => c.id === id ? { ...c, llegada: true, estado: c.estado === "pendiente" ? "confirmada" : c.estado } : c)); notify("Check-in registrado."); };
  // Reprogramar (drag en el calendario): cambia fecha/hora (y sillón si aplica).
  const reagendarCita = (id, patch) => {
    if (conectado) { api.put(`/citas/${id}`, patch).then(() => { notify("Cita reprogramada."); recargar(); recargarAll(); }).catch(() => notify("Error al reprogramar.")); return; }
    setCitas((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
    notify(`Cita reprogramada a ${patch.hora}${patch.fecha ? " – " + fechaLegible(patch.fecha) : ""}.`);
  };
  const stats = [["Citas hoy", citasHoyActivas.length, NAVY], ["Presentes", presentesHoy.length, "var(--dc-ok-700)"], ["Por llegar", porLlegarHoy.length, "var(--dc-warn-600)"]];
  // Amarre espera → citas: "Asignar" abre un modal para elegir doctor, fecha y hora.
  const asignarDeEspera = (p) => {
    // Conectado: abre el modal real de agendado (crea la cita en el backend) y recuerda la fila de espera a retirar.
    if (conectado) {
      setAsignarBase({ pacienteId: p.pacienteId || "", motivo: `${p.e || "Consulta"} (desde lista de espera)`, canal: "presencial", _esperaId: p.id });
      return;
    }
    // Demo (sin backend): flujo ligero con datos de ejemplo.
    const med = MEDICOS.find((m) => m.nombre === p.medico) || MEDICOS[0];
    const usadas = new Set(todasHoy.map((c) => c.hora));
    let hh = 9; while (hh < 20 && usadas.has(`${String(hh).padStart(2, "0")}:00`)) hh++;
    setAsignarPac({ ...p, medicoId: med.id, fecha: fmt(hoy), hora: `${String(hh).padStart(2, "0")}:00` });
  };
  const confirmarAsignar = () => {
    const p = asignarPac;
    if (!p.medicoId || !p.fecha || !p.hora) { notify("Elige doctor, fecha y hora."); return; }
    const nid = Date.now();
    const sede = todasHoy[0]?.sede ?? 1;
    setCitas((cs) => [...cs, { id: nid, pacienteId: p.pacienteId || null, paciente: p.n, dni: "", medicoId: p.medicoId, esp: 1, sede, fecha: p.fecha, hora: p.hora, motivo: `${p.e} (desde lista de espera)`, estado: "confirmada", llegada: false }]);
    setEspera((e) => (e || []).filter((x) => x.id !== p.id));
    const esHoy = p.fecha === fmt(hoy);
    if (esHoy) { setNuevaCita(nid); setTimeout(() => setNuevaCita((v) => (v === nid ? null : v)), 6000); }
    const medNom = (MEDICOS.find((m) => m.id === p.medicoId) || {}).nombre || "";
    notify(`Cita creada para ${p.n} con ${medNom} el ${esHoy ? "hoy" : fechaLegible(p.fecha)} a las ${p.hora}.${esHoy ? " Resaltada en verde." : ""}`);
    setAsignarPac(null);
  };

  const atend = todasHoy.filter((c) => c.estado === "atendida").length;
  const avance = todasHoy.length ? Math.round((atend / todasHoy.length) * 100) : 0;
  const EST = { pendiente: { c: "var(--dc-ink-500)", l: "Pendiente" }, confirmada: { c: DS.c.primary, l: "Confirmada" }, en_sala: { c: "var(--dc-purple)", l: "En sala" }, en_atencion: { c: "var(--dc-warn-600)", l: "En atención" }, atendida: { c: "var(--dc-ok-700)", l: "Atendida" }, cancelada: { c: "var(--dc-red)", l: "Cancelada" }, no_show: { c: "var(--dc-warn-600)", l: "No asistió" }, reprogramada: { c: "var(--dc-purple)", l: "Reprogramada" }, cerrada_sistema: { c: "var(--dc-ink-400)", l: "Cerrada por sistema" } };
  const COLS_AGENDA = [
    { key: "hora", label: "Hora", get: (c) => c.hora, w: "76px", a: "center",
      cell: (c) => { const e = EST[c.estado] || EST.pendiente; const esProx = proxima && c.id === proxima.id; const pasada = c.estado === "atendida" || c.estado === "cancelada"; return (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, fontVariantNumeric: "tabular-nums" }}>{c.hora}</div>
          {c.id === nuevaCita ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)", letterSpacing: .4 }}><CheckCircle2 size={9} strokeWidth={1.75} /> NUEVA</span> : esProx && !pasada ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 500, color: e.c, letterSpacing: .4 }}><span style={{ width: 5, height: 5, borderRadius: "var(--dc-r-full)", background: e.c, animation: "dcBlink 1.6s ease-in-out infinite" }} /> PRÓXIMA</span> : null}
        </div>); } },
    { key: "paciente", label: "Paciente", get: (c) => c.paciente + " " + c.dni, w: "minmax(160px,1.6fr)", a: "left",
      cell: (c) => { const pasada = c.estado === "atendida" || c.estado === "cancelada"; return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 11, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "var(--dc-r-full)", background: pasada ? "var(--dc-bg-alt)" : tint(colorDe(c.paciente), 0.14), color: pasada ? "var(--dc-ink-400)" : colorDe(c.paciente), display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12.5, flexShrink: 0, boxShadow: pasada ? "none" : `inset 0 0 0 1.5px ${tint(colorDe(c.paciente), 0.25)}` }}>{iniciales(c.paciente)}</div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 500, color: NAVY, fontSize: 14, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{c.paciente}{c.confirmadoWa && <span title="Confirmó asistencia por WhatsApp" style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)", background: "var(--dc-ok-soft)", padding: "1px 5px", borderRadius: "var(--dc-r-full)", flexShrink: 0 }}><CheckCheck size={10} strokeWidth={1.75} /> WA</span>}</span>
            <span style={{ fontSize: 12, color: "var(--dc-ink-500)", fontVariantNumeric: "tabular-nums", display: "inline-flex", alignItems: "center", gap: 5 }}>DNI {c.dni}{c.agendadoPorIa && <span title="Agendada por el asistente de WhatsApp" style={{ display: "inline-flex", alignItems: "center", gap: 2, color: "var(--dc-ok-700)", fontWeight: 500 }}><MessageSquare size={10} strokeWidth={1.75} /> IA</span>}</span>
          </div>
        </div>); } },
    { key: "medico", label: "Odontólogo", get: (c) => c.medico || nom(c.medicoId), w: "minmax(128px,1.2fr)", a: "left",
      cell: (c) => { const med = medicos.find((m) => m.id === c.medicoId); return <div style={{ fontSize: 13, color: "var(--dc-ink-700)", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 7, minWidth: 0 }}><span style={{ width: 8, height: 8, borderRadius: "var(--dc-r-full)", background: med?.color || NAVY, flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.medico || nom(c.medicoId)}</span></div>; } },
    { key: "sede", label: "Sede", get: (c) => c.sedeNombre || nombreSede(c.sede), w: "minmax(100px,0.8fr)", a: "left",
      cell: (c) => <div style={{ fontSize: 13, color: "var(--dc-ink-400)", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 6, minWidth: 0 }}><MapPin size={12} strokeWidth={1.75} color="var(--dc-ink-400)" style={{ flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sedeNombre || cortaSede(c.sede)}</span></div> },
    { key: "motivo", label: "Motivo", get: (c) => c.motivo, w: "minmax(120px,1.3fr)", a: "left",
      cell: (c) => { const base = c.motivo.replace(/\s*\([^)]*\)\s*/g, " ").trim(); const hasDet = base !== c.motivo; return (
        <div style={{ fontSize: 13, color: "var(--dc-ink-700)", display: "flex", alignItems: "center", gap: 6, minWidth: 0 }} title={c.motivo}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{base}</span>
          {hasDet && <Info size={13} strokeWidth={1.75} color={DS.c.primary} style={{ flexShrink: 0 }} />}
        </div>); } },
    { key: "llegada", label: "Llegada", get: (c) => (c.llegada ? "Presente" : "Por llegar"), w: "minmax(104px,0.8fr)", a: "center",
      cell: (c) => { const pasada = c.estado === "atendida" || c.estado === "cancelada"; return <div style={{ display: "flex", justifyContent: "center" }}>{pasada ? <span style={{ fontSize: 13, color: "var(--dc-line)" }}>—</span> : c.llegada
        ? <span className="dc-pill is-ok"><CheckCircle2 size={12} strokeWidth={2} /> Presente</span>
        : <span className="dc-pill is-aviso"><Clock size={12} strokeWidth={2} /> Por llegar</span>}</div>; } },
    { key: "estado", label: "Estado", get: (c) => (EST[c.estado] || EST.pendiente).l, w: "minmax(108px,0.8fr)", a: "center",
      cell: (c) => { const e = EST[c.estado] || EST.pendiente; return <div style={{ display: "flex", justifyContent: "center" }}><span className="dc-pill" style={{ "--c": e.c }}><i /> {e.l}</span></div>; } },
    // Ancho fijo: cada fila es su propia rejilla, así que un ancho "según contenido"
    // descuadraba la columna de una fila a otra.
    // Una acción principal visible según el estado de la cita; el resto en el menú ⋯.
    { key: "acc", label: "Acciones", w: "176px", a: "right", noFilter: true, noSort: true, sticky: true,
      cell: (c) => {
        const abierta = c.estado !== "cancelada" && c.estado !== "atendida" && c.estado !== "no_show";
        const principal =
          rol === "medico" && c.estado === "confirmada" && c.llegada ? <ActionBtn onClick={() => { set(c.id, "en_atencion"); onAtender && onAtender(c); }} color={DS.c.primary}>Iniciar</ActionBtn>
          : rol === "medico" && c.estado === "en_atencion" ? <ActionBtn onClick={() => { set(c.id, "atendida", `Consulta de ${c.paciente} finalizada. Registra la evolución.`); setEvoCita(c); }} color="var(--dc-ok-700)">Finalizar</ActionBtn>
          : rol === "medico" && c.estado === "atendida" ? <ActionBtn subtle onClick={() => setEvoCita(c)} color={DS.c.primary}>Evolución</ActionBtn>
          : rol !== "medico" && c.estado === "confirmada" && c.llegada ? <ActionBtn onClick={() => set(c.id, "en_atencion", `Llamando a ${c.paciente} a consultorio…`)} color="var(--dc-warn-600)">Llamar</ActionBtn>
          : rol !== "medico" && conectado && c.pacienteId && saldos[c.pacienteId] > 0 ? <ActionBtn onClick={() => setPago({ pid: c.pacienteId, nombre: c.paciente, monto: saldos[c.pacienteId], sedeId: c.sede })} color={DS.c.primary}>Cobrar S/ {saldos[c.pacienteId].toFixed(0)}</ActionBtn>
          : puedeOperarAgenda && abierta ? <ActionBtn subtle onClick={() => setReprog({ id: c.id, paciente: c.paciente, fecha: c.fecha, hora: c.hora })} color={DS.c.primary}>Reprogramar</ActionBtn>
          : null;
        const opciones = puedeOperarAgenda && abierta ? [
          { label: "Reprogramar", onClick: () => setReprog({ id: c.id, paciente: c.paciente, fecha: c.fecha, hora: c.hora }) },
          !c.llegada && { label: "Marcar no asistió", onClick: () => set(c.id, "no_show", `${c.paciente}: marcada como no asistió.`) },
          { label: "Cancelar cita", peligro: true, onClick: () => setCancelCita(c) },
        ] : [];
        return (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center", width: "100%" }} onClick={(e) => e.stopPropagation()}>
            {principal}
            <MenuAcciones opciones={opciones} />
          </div>
        );
      } },
  ];
  const lista = [...todasHoy].sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
  const fechaRaw = new Date(fmt(hoy) + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
  const fechaLarga = fechaRaw.charAt(0).toUpperCase() + fechaRaw.slice(1);
  const ahora = new Date(); const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  const activa = (c) => c.estado !== "atendida" && c.estado !== "cancelada";
  const proxima = lista.filter(activa).find((c) => toMin(c.hora) >= ahoraMin) || lista.filter(activa)[0];
  const nCitas = useCountUp(citasHoyActivas.length), nPres = useCountUp(stats[1][1]), nLleg = useCountUp(stats[2][1]), nAv = useCountUp(avance);
  const kpis = [["Citas hoy", nCitas, NAVY, <Calendar size={16} strokeWidth={1.75} />], ["Presentes", nPres, "var(--dc-ok-700)", <CheckCircle2 size={16} strokeWidth={1.75} />], ["Por llegar", nLleg, "var(--dc-warn-600)", <Clock size={16} strokeWidth={1.75} />], ["Avance", nAv + "%", DS.c.primary, <TrendingUp size={16} strokeWidth={1.75} />]];
  const comp = [
    { l: "Atendidas", c: EST.atendida.c, n: todasHoy.filter((c) => c.estado === "atendida").length },
    { l: "En atención", c: EST.en_atencion.c, n: todasHoy.filter((c) => c.estado === "en_atencion").length },
    { l: "Confirmadas", c: EST.confirmada.c, n: todasHoy.filter((c) => c.estado === "confirmada").length },
    { l: "Pendientes", c: EST.pendiente.c, n: todasHoy.filter((c) => c.estado === "pendiente").length },
    { l: "Canceladas", c: EST.cancelada.c, n: todasHoy.filter((c) => c.estado === "cancelada").length },
    { l: "No asistió", c: EST.no_show.c, n: todasHoy.filter((c) => c.estado === "no_show").length },
    { l: "Reprogramadas", c: EST.reprogramada.c, n: todasHoy.filter((c) => c.estado === "reprogramada").length },
  ].filter((x) => x.n > 0);
  const lbl = { fontSize: 12, fontWeight: 500, letterSpacing: .7, textTransform: "uppercase", color: "var(--dc-ink-500)" };
  const soft = DS.card;
  // Descarga de la agenda del día (Excel real / PDF).
  const COLS_EXPORT = [
    { key: "hora", label: "Hora", w: 8 }, { key: "paciente", label: "Paciente", w: 26 }, { key: "dni", label: "DNI", w: 12 },
    { key: "medico", label: "Odontólogo", w: 24 }, { key: "sede", label: "Sede", w: 18 }, { key: "motivo", label: "Motivo", w: 32 },
    { key: "estado", label: "Estado", w: 14 }, { key: "llegada", label: "Llegada", w: 12 },
  ];
  const filasExport = () => [...todasHoy].sort((a, b) => (a.hora || "").localeCompare(b.hora || "")).map((c) => ({
    hora: c.hora, paciente: c.paciente, dni: c.dni, medico: c.medico || nom(c.medicoId),
    sede: c.sedeNombre || nombreSede(c.sede), motivo: c.motivo,
    estado: (EST[c.estado] || EST.pendiente).l, llegada: c.llegada ? "Presente" : "Por llegar" }));
  const descargar = (tipo) => {
    setDlOpen(false);
    const filas = filasExport();
    if (!filas.length) { notify("No hay citas para descargar hoy."); return; }
    if (tipo === "excel") exportarExcel({ nombreArchivo: `agenda_${fmt(hoy)}.xlsx`, hoja: `Agenda ${fmt(hoy)}`, titulo: `Agenda del día — ${fechaLarga}`, columnas: COLS_EXPORT, filas }).catch(() => notify("No se pudo generar el Excel."));
    else { const ok = exportarPDF({ titulo: `Agenda del día — ${fechaLarga}`, subtitulo: pluralEs(filas.length, "cita", "citas"), columnas: COLS_EXPORT, filas }); if (!ok) notify("Permite las ventanas emergentes para generar el PDF."); }
  };
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Encabezado: la fecha y las acciones del día, sin tarjeta alrededor. */}
      {/* Acciones de la agenda en la cabecera de la app, junto al título. */}
      <EnCabecera><div className="dc-ag-acc">
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Action Icons (el calendario trae su propio botón Descargar) */}
          {vista !== "calendario" && <div style={{ position: "relative" }}>
            <button type="button" className="dc-icon-btn" aria-label="Descargar agenda" onClick={() => setDlOpen((v) => !v)} title="Descargar agenda" style={{ width: 36, height: 36, borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-line)", background: "#fff", color: "var(--dc-ink-700)", cursor: "pointer", display: "grid", placeItems: "center" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg-soft)")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}><Download size={16} strokeWidth={1.75} /></button>
            {dlOpen && (<>
              <div onClick={() => setDlOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 41, background: "#fff", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", boxShadow: "0 18px 40px -18px rgba(16,24,40,.4)", overflow: "hidden", minWidth: 210 }}>
                <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid var(--dc-bg)" }}>Agenda del día</div>
                <button onClick={() => descargar("excel")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 13px", border: "none", background: "#fff", cursor: "pointer", fontSize: 13, color: NAVY, fontWeight: 500 }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}><FileSpreadsheet size={16} strokeWidth={1.75} color="var(--dc-ok-700)" /> Excel (.xlsx)</button>
                <button onClick={() => descargar("pdf")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 13px", border: "none", borderTop: "1px solid var(--dc-bg)", background: "#fff", cursor: "pointer", fontSize: 13, color: NAVY, fontWeight: 500 }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}><FileText size={16} strokeWidth={1.75} color="var(--dc-red)" /> PDF (imprimir/guardar)</button>
              </div>
            </>)}
          </div>}
          {puedeAgendar && <button type="button" className="dc-icon-btn" aria-label="Bloquear horario" onClick={() => setBloqForm({ tipo: "dia", fecha: fmt(hoy), diaSemana: String(hoy.getDay()), horaInicio: "13:00", horaFin: "14:00", motivo: "Almuerzo" })} title="Bloquear horario" style={{ width: 36, height: 36, borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-line)", background: "#fff", color: "var(--dc-ink-700)", cursor: "pointer", display: "grid", placeItems: "center" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg-soft)")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}><Lock size={16} strokeWidth={1.75} /></button>}
          {puedeAgendar && <button type="button" className="dc-icon-btn" aria-label="Sala TV" onClick={() => setTv(true)} title="Sala TV" style={{ width: 36, height: 36, borderRadius: "var(--dc-r-md)", border: "1px solid var(--dc-line)", background: "#fff", color: "var(--dc-ink-700)", cursor: "pointer", display: "grid", placeItems: "center" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg-soft)")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}><Monitor size={16} strokeWidth={1.75} /></button>}
          {puedeAgendar && <Btn onClick={() => setAgendar(true)}><Plus size={16} strokeWidth={1.75} /> Agendar cita</Btn>}
        </div>
      </div></EnCabecera>
      {agendar && <AgendarRecepcionModal rol={rol} base={typeof agendar === "object" ? agendar : undefined} onClose={() => setAgendar(false)} onCreada={() => { setAgendar(false); recargar(); recargarAll(); }} notify={notify} />}
      {asignarBase && <AgendarRecepcionModal rol={rol} base={asignarBase} notify={notify} onClose={() => setAsignarBase(null)}
        onCreada={() => { const eid = asignarBase._esperaId; setAsignarBase(null); recargar(); recargarAll();
          if (conectado && eid) api.espera.resolver(eid).catch(() => {}).finally(() => setEspKey((k) => k + 1)); else setEspKey((k) => k + 1); }} />}
      {asignarPac && (() => {
        const selSty = { width: "100%", padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, fontWeight: 500, cursor: "pointer", boxSizing: "border-box" };
        const lblSty = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
        return (
        <Modal icon={<Bell size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Asignar cupo" sub={`${asignarPac.n} – sale de la lista de espera`} onClose={() => setAsignarPac(null)} maxW={520}
          footer={<><Btn small kind="ghost" onClick={() => setAsignarPac(null)}>Cancelar</Btn><Btn small onClick={confirmarAsignar}><CheckCircle2 size={15} strokeWidth={1.75} /> Crear cita</Btn></>}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--dc-white)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-md)", padding: "11px 13px", marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--dc-r-full)", background: tint(NAVY, 0.071), color: NAVY, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 13, flexShrink: 0 }}>{iniciales(asignarPac.n)}</div>
            <div><div style={{ fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>{asignarPac.n}</div><div style={{ fontSize: 13, color: "var(--dc-brand-500)" }}>{asignarPac.e} – prefiere {String(asignarPac.pref).toLowerCase()}</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lblSty}>Doctor</label>
              <Select value={asignarPac.medicoId} onChange={(v) => setAsignarPac({ ...asignarPac, medicoId: Number(v) })}
                      options={MEDICOS.map((m) => ({ value: m.id, label: m.nombre }))} />
            </div>
            <div>
              <label style={lblSty}>Fecha</label>
              <input className="dc-premium-inp" type="date" value={asignarPac.fecha} onChange={(e) => setAsignarPac({ ...asignarPac, fecha: e.target.value })} style={{ ...selSty, cursor: "text" }} />
            </div>
            <div>
              <label style={lblSty}>Hora</label>
              <Select value={asignarPac.hora} onChange={(v) => setAsignarPac({ ...asignarPac, hora: v })}
                      options={HORAS_SEL.map((h) => ({ value: h, label: h }))} />
            </div>
          </div>
        </Modal>
        );
      })()}

      {/* Resumen del día — Bento Grid Premium */}
      {vista !== "calendario" && (() => {
        const total = todasHoy.length || 1;
        const cnt = (s) => todasHoy.filter((c) => c.estado === s).length;
        const presentes = stats[1][1];
        const desglose = [
          { l: "Confirmadas", c: "#7FE0DD", n: cnt("confirmada") },
          { l: "Presentes", c: "#6EE7A8", n: presentes },
          { l: "En atención", c: "#FBBF5A", n: cnt("en_atencion") },
          { l: "Atendidas", c: "#A5B4FC", n: atend },
          { l: "Pendientes", c: "rgba(255,255,255,.45)", n: cnt("pendiente") },
          { l: "Canceladas", c: "#F59A8D", n: cnt("cancelada") },
        ].filter((x) => x.n > 0);
        // Una sola franja: tres cifras principales y el desglose por estado. Antes eran
        // ocho tarjetas en dos filas que repetían los mismos números.
        // Cabecera del día con color de marca: fecha, próxima cita, cifras y una barra
        // que reparte el día por estado. Sustituye a la franja gris.
        const medProx = proxima ? (proxima.medico || (medicos.find((m) => m.id === proxima.medicoId) || {}).nombre) : null;
        const segs = desglose.map((a) => ({ ...a, pct: (a.n / total) * 100 }));
        return (
          <section className="dc-ag-hero">
            <div className="dc-ag-hero__dia">
              <h2>{fechaLarga}</h2>
              <p>{pluralEs(todasHoy.length, "cita", "citas")} hoy</p>
            </div>
            <div className="dc-ag-hero__cifras">
              <div><b>{nCitas}</b><span>Activas</span></div>
              <div><b>{stats[1][1]}</b><span>Presentes</span></div>
              <div><b>{stats[2][1]}</b><span>Por llegar</span></div>
              <div><b>{nAv}%</b><span>Avance</span></div>
            </div>
            {proxima && (
              <div className="dc-ag-hero__prox">
                <span className="dc-ag-hero__eyebrow">Próxima</span>
                <div className="dc-ag-hero__prox-fila">
                  <b className="dc-ag-hero__hora">{proxima.hora}</b>
                  <div><strong>{proxima.paciente}</strong><span>{proxima.motivo}{medProx ? ` – ${medProx}` : ""}</span></div>
                </div>
              </div>
            )}
            {segs.length > 0 && (
              <div className="dc-ag-hero__estados">
                <div className="dc-ag-hero__barra" role="img" aria-label={segs.map((a) => `${a.l}: ${a.n}`).join(", ")}>
                  {segs.map((a) => <i key={a.l} style={{ width: `${a.pct}%`, background: a.c }} />)}
                </div>
                <div className="dc-ag-hero__leyenda">
                  {segs.map((a) => <span key={a.l}><i style={{ background: a.c }} />{a.l} <b>{a.n}</b></span>)}
                </div>
              </div>
            )}
            <div className="dc-ag-hero__acc" data-slot-acciones />
          </section>
        );
      })()}

      {/* Lista o Calendario según el toggle */}
      {vista !== "calendario" ? (<>
      <DataTable titulo="Citas de hoy" sub="citas" minWidth={980} rows={lista} defaultSort={{ key: "hora", dir: "asc" }}
        rowClassName={(c) => `dc-ag-fila${proxima && c.id === proxima.id && c.estado !== "atendida" ? " is-prox" : ""}${c.estado === "cancelada" || c.estado === "atendida" ? " is-pasada" : ""}`}
        onRowClick={(c) => abrirFichaCita(c)}
        empty={<Vacio icon={<Calendar size={24} strokeWidth={1.75} />} titulo="Sin citas programadas" sub="Tu agenda para hoy está libre." />}
        cols={COLS_AGENDA} />
      </>) : <CalendarioAgenda onRango={cargarRango} citas={(conectado ? (remotoAll || []) : citasProp.map((c) => ({ ...c, medico: c.medico || (MEDICOS.find((m) => m.id === c.medicoId) || {}).nombre }))).filter((c) => miId == null || c.medicoId === miId)} onCita={abrirFichaCita} onReagendar={reagendarCita} horario={horarioClinica.horario} feriados={horarioClinica.feriados} bloqueos={bloqueos} onNuevo={puedeAgendar ? (patch) => setAgendar(patch) : undefined} />}
      {fmId && (
        <React.Suspense fallback={<div style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", background: "rgba(15,23,42,.35)", color: "#fff", fontSize: 14 }}>Cargando ficha…</div>}>
          <FichaMedica pacienteId={fmId} onClose={() => { setFmId(null); setFichaCita(null); }} notify={notify} can={can} rol={rol}
            sedeId={sedeApiUuid(sedeActiva != null && sedeActiva !== "all" ? sedeActiva : 1)}
            onAgendar={(pac) => { setFmId(null); setFichaCita(null); setAgendar({ pacienteId: pac.id || fmId, motivo: "Consulta" }); }}
            onCobrar={(pac) => { const pid = pac.id || fmId; setFmId(null); setFichaCita(null); setPago({ pid, nombre: pac.nombre || "Paciente", monto: saldos[pid] || 0, sedeId: null }); }} />
        </React.Suspense>
      )}
      {ficha && !fmId && <FichaPaciente nombre={ficha} onClose={() => { setFicha(null); setFichaCita(null); }} fichas={fichas} cita={fichaCita} />}
      {tv && <SalaTV onClose={() => setTv(false)} citasDemo={citasProp} />}
      {pago && <ModalCobro monto={pago.monto} pacienteId={pago.pid} sedeId={pago.sedeId} paciente={pago.nombre} concepto="Cobro en Agenda" onClose={() => setPago(null)} onAprobado={(res) => { setPago(null); notify(`Cobrado S/ ${(res?.montoCobrado ?? pago.monto).toFixed(2)} de ${pago.nombre}. ${auth.token ? "Comprobante registrado (todavía no se envía a SUNAT)." : "Comprobante de demostración (sin envío a SUNAT)."}`); recargar(); recargarSaldos(); }} />}
      {evoCita && <EvolucionModal cita={evoCita} notify={notify} onClose={() => setEvoCita(null)} onGuardada={() => { setEvoCita(null); notify("Evolución registrada. La producción de esta atención ya cuenta."); }} />}
      {cancelCita && <CancelarCitaModal cita={cancelCita} onClose={() => setCancelCita(null)} onConfirm={(motivo) => cancelarConMotivo(cancelCita, motivo)} />}
      {bloqForm && (() => {
        const selSty = { width: "100%", padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, fontWeight: 500, cursor: "pointer", boxSizing: "border-box" };
        const lblSty = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
        const DIAS_B = [["1", "Lunes"], ["2", "Martes"], ["3", "Miércoles"], ["4", "Jueves"], ["5", "Viernes"], ["6", "Sábado"], ["0", "Domingo"]];
        const guardarBloq = () => {
          if (bloqForm.horaFin <= bloqForm.horaInicio) { notify("La hora de fin debe ser mayor que la de inicio."); return; }
          const payload = { horaInicio: bloqForm.horaInicio, horaFin: bloqForm.horaFin, motivo: bloqForm.motivo || "Bloqueado",
            fecha: bloqForm.tipo === "dia" ? bloqForm.fecha : null, diaSemana: bloqForm.tipo === "semanal" ? Number(bloqForm.diaSemana) : null };
          if (!conectado) { notify("Bloqueo registrado (demo)."); setBloqForm(null); return; }
          api.bloqueos.crear(payload).then(() => { notify("Horario bloqueado."); setBloqForm(null); recargarBloqueos(); }).catch(() => notify("No se pudo crear el bloqueo."));
        };
        return (
        <Modal icon={<Lock size={20} strokeWidth={1.75} />} tone={RED} titulo="Bloquear horario" sub="Almuerzo, ausencia o mantenimiento — no se podrá agendar en ese rango" onClose={() => setBloqForm(null)} maxW={480}
          footer={<><Btn small kind="ghost" onClick={() => setBloqForm(null)}>Cancelar</Btn><Btn small kind="red" onClick={guardarBloq}><Lock size={15} strokeWidth={1.75} /> Bloquear</Btn></>}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "inline-flex", background: "var(--dc-bg-alt)", borderRadius: "var(--dc-r-md)", padding: 3 }}>
              {[["dia", "Un día"], ["semanal", "Cada semana"]].map(([k, l]) => (
                <button key={k} onClick={() => setBloqForm({ ...bloqForm, tipo: k })} style={{ padding: "7px 14px", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13, background: bloqForm.tipo === k ? "#fff" : "transparent", color: bloqForm.tipo === k ? NAVY : "var(--dc-ink-400)", boxShadow: bloqForm.tipo === k ? DS.sh.sm : "none" }}>{l}</button>
              ))}
            </div>
            {bloqForm.tipo === "dia"
              ? <div><label style={lblSty}>Fecha</label><input className="dc-premium-inp" type="date" value={bloqForm.fecha} onChange={(e) => setBloqForm({ ...bloqForm, fecha: e.target.value })} style={{ ...selSty, cursor: "text" }} /></div>
              : <div><label style={lblSty}>Día de la semana</label><Select value={bloqForm.diaSemana} onChange={(v) => setBloqForm({ ...bloqForm, diaSemana: v })} options={DIAS_B.map(([v, l]) => ({ value: v, label: l }))} /></div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div><label style={lblSty}>Desde</label><input className="dc-premium-inp" type="time" value={bloqForm.horaInicio} onChange={(e) => setBloqForm({ ...bloqForm, horaInicio: e.target.value })} style={{ ...selSty, cursor: "text" }} /></div>
              <div><label style={lblSty}>Hasta</label><input className="dc-premium-inp" type="time" value={bloqForm.horaFin} onChange={(e) => setBloqForm({ ...bloqForm, horaFin: e.target.value })} style={{ ...selSty, cursor: "text" }} /></div>
            </div>
            <div><label style={lblSty}>Motivo</label>
              <Select value={bloqForm.motivo} onChange={(v) => setBloqForm({ ...bloqForm, motivo: v })}
                      options={["Almuerzo", "Reunión", "Ausencia del doctor", "Mantenimiento de sillón", "Capacitación", "Otro"].map((m) => ({ value: m, label: m }))} />
            </div>
          </div>
        </Modal>
        );
      })()}
      {reprog && (() => {
        const selSty = { width: "100%", padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, fontWeight: 500, cursor: "pointer", boxSizing: "border-box" };
        const lblSty = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
        const guardar = () => {
          if (!reprog.fecha || !reprog.hora) { notify("Elige fecha y hora."); return; }
          reagendarCita(reprog.id, { fecha: reprog.fecha, hora: reprog.hora.length === 5 ? reprog.hora : reprog.hora.slice(0, 5) });
          setReprog(null);
        };
        return (
        <Modal icon={<Repeat size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Reprogramar cita" sub={reprog.paciente} onClose={() => setReprog(null)} maxW={460}
          footer={<><Btn small kind="ghost" onClick={() => setReprog(null)}>Cancelar</Btn><Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> Guardar cambio</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={lblSty}>Nueva fecha</label>
              <input className="dc-premium-inp" type="date" value={reprog.fecha} onChange={(e) => setReprog({ ...reprog, fecha: e.target.value })} style={{ ...selSty, cursor: "text" }} />
            </div>
            <div>
              <label style={lblSty}>Nueva hora</label>
              <input className="dc-premium-inp" type="time" value={reprog.hora} onChange={(e) => setReprog({ ...reprog, hora: e.target.value })} style={{ ...selSty, cursor: "text" }} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--dc-ink-400)", marginTop: 12 }}>Se valida que el horario no choque con otra cita del mismo doctor.</div>
        </Modal>
        );
      })()}
    </div>
  );
}
const ActionBtn = ({ children, onClick, color, subtle }) => <button type="button" className={`dc-accion${subtle ? " is-sutil" : ""}`} style={{ "--c": color }} onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}>{children}</button>;

/* ---- Pacientes ---- */
const CANALES = ["Recomendación", "Instagram", "Facebook", "Google", "TikTok", "Volante", "Pasó por el local", "Convenio empresa"];
const GENEROS = ["Femenino", "Masculino", "Prefiere no decir"];
const DISTRITOS = ["San Isidro", "Miraflores", "Surco", "San Borja", "La Molina", "Barranco", "Lince", "Jesús María", "Magdalena", "Otro"];
const ASEGS = ["Ninguno", "Pacífico EPS", "Rímac Seguros", "Mapfre", "La Positiva", "SIS"];
/* Quien puede responder por un menor. Lista cerrada para que el dato sirva
   despues (avisar a la madre, exigir firma del tutor legal…) en vez de ser
   texto libre con veinte formas de escribir "mamá". */
const PARENTESCOS = ["Madre", "Padre", "Abuelo/a", "Tutor legal", "Hermano/a mayor", "Tío/a", "Otro"];
/* ---- Historia clínica / anamnesis (adulto y pediátrica) ---- */
const HC_ADULTO = [
  { t: "Motivo de consulta", f: [{ k: "motivo", type: "area", ph: "¿Por qué acude el paciente?" }] },
  { t: "Antecedentes médicos", f: [{ k: "antecedentes", type: "checks", opts: ["Diabetes", "Hipertensión", "Cardiopatía", "Asma", "Hepatitis", "Anticoagulantes", "Epilepsia", "Embarazo", "Ninguno"] }] },
  { t: "Alergias", f: [{ k: "alergias", type: "checks", opts: ["Penicilina", "Anestesia local", "Látex", "AINEs", "Ninguna"] }, { k: "alergiasOtras", type: "text", ph: "Otras alergias / detalle" }] },
  { t: "Medicación actual", f: [{ k: "medicacion", type: "area", ph: "Medicamentos que toma habitualmente" }] },
  { t: "Antecedentes odontológicos", f: [{ k: "odonto", type: "checks", opts: ["Sangrado de encías", "Bruxismo", "Sensibilidad", "Extracciones previas", "Ortodoncia previa"] }, { k: "ultimaVisita", type: "text", ph: "Última visita al dentista" }] },
  // Ver HABITOS_DE_ADULTO: se ocultan por debajo de la edad de transicion.
  { t: "Hábitos", f: [{ k: "habitos", type: "checks", opts: ["Tabaco", "Alcohol", "Rechina los dientes"] }, { k: "cepillado", type: "select", opts: ["1 vez/día", "2 veces/día", "3+ veces/día"], ph: "Frecuencia de cepillado" }] },
];
/* Preguntas que no se le hacen a un nino. Se filtran aunque alguien cambie la
   pestana a "Adulto" en la ficha de un menor: preguntarle a uno de 7 anios si fuma
   no tiene sentido y ensucia su historia. Desde los 13 (EDAD_TRANSICION) si salen,
   porque es la edad en la que empiezan a tener sentido. */
const HABITOS_DE_ADULTO = ["Tabaco", "Alcohol"];
const HC_PEDIATRICO = [
  { t: "Motivo de consulta", f: [{ k: "motivo", type: "area", ph: "Motivo de la visita" }] },
  { t: "Antecedentes perinatales", f: [{ k: "perinatal", type: "checks", opts: ["Parto normal", "Cesárea", "Embarazo sin complicaciones", "Prematuro"] }, { k: "pesoNacer", type: "text", ph: "Peso al nacer" }] },
  { t: "Alimentación", f: [{ k: "alimentacion", type: "checks", opts: ["Lactancia materna", "Biberón", "Alimentación mixta"] }, { k: "destete", type: "text", ph: "Edad de destete" }] },
  { t: "Hábitos de succión / orales", f: [{ k: "succion", type: "checks", opts: ["Succión digital (dedo)", "Chupón", "Onicofagia (uñas)", "Respirador bucal", "Ninguno"] }] },
  { t: "Desarrollo dental", f: [{ k: "erupcion", type: "text", ph: "Erupción del primer diente" }, { k: "primeraVisita", type: "text", ph: "Primera visita dental" }] },
  { t: "Antecedentes médicos", f: [{ k: "antecedentes", type: "checks", opts: ["Asma", "Cardiopatía", "Convulsiones", "Vacunas completas", "Ninguno"] }] },
  // Las mismas claves que en la historia de adulto (alergias, alergiasOtras, medicacion):
  // así lo que se anote aquí acaba donde ya lo lee el resto del sistema -el aviso de
  // alergias de la ficha y la receta-. Antes solo había una casilla "Alergias" dentro de
  // antecedentes: un sí/no sin decir a qué, y en un niño la dosis va por peso y edad.
  { t: "Alergias", f: [{ k: "alergias", type: "checks", opts: ["Penicilina", "Anestesia local", "Látex", "AINEs", "Ninguna"] }, { k: "alergiasOtras", type: "text", ph: "Otras alergias / detalle" }] },
  { t: "Medicación actual", f: [{ k: "medicacion", type: "area", ph: "Medicamentos que toma habitualmente (jarabes, inhaladores…)" }] },
  // Dos cosas que solo existen en odontopediatria y que un odontopediatra espera
  // encontrar en la ficha:
  //  - La escala de Frankl clasifica como se porto el nino en el sillon. Sirve para
  //    decidir si la proxima cita necesita mas tiempo, acompanamiento o sedacion.
  //  - El riesgo de caries marca cada cuanto hay que citarlo a control y si toca
  //    fluor o sellantes, que es de lo que mas se hace a esta edad.
  { t: "Conducta en el sillón (escala de Frankl)", f: [{ k: "frankl", type: "select", ph: "¿Cómo se portó?",
    opts: ["1 – Claramente negativo (rechaza, llora, no colabora)",
           "2 – Negativo (reticente, poco colaborador)",
           "3 – Positivo (acepta, algo cauteloso)",
           "4 – Claramente positivo (colabora, disfruta)"] }] },
  { t: "Riesgo de caries y prevención", f: [
    { k: "riesgoCaries", type: "select", ph: "Nivel de riesgo", opts: ["Bajo", "Moderado", "Alto"] },
    { k: "prevencion", type: "checks", opts: ["Aplicación de flúor", "Sellantes", "Instrucción de higiene", "Control de dieta azucarada"] },
    { k: "cepilladoSupervisado", type: "text", ph: "¿Quién le cepilla o supervisa?" }] },
];
function HistoriaClinica({ paciente, ficha, onClose, onSave, notify = () => {}, onEditarPaciente }) {
  const edad = calcEdad(paciente?.nacimiento);
  const prev = ficha?.historiaClinica || {};
  // El umbral vive en comun.jsx: aqui cortaba en 14 y en FichaMedica en 15, asi que
  // un chico de 14 salia pediatrico en una pantalla y adulto en la otra.
  const pedPorEdad = esPediatrico(paciente?.nacimiento);
  // Tres etapas (comun.jsx): en la de transicion la ficha arranca ya en adulto,
  // porque es la que va a usar a partir de ahora, pero se avisa del cambio.
  const etapa = etapaFicha(paciente?.nacimiento);
  // Celeste nino, rosa nina, turquesa si no consta (comun.jsx: colorPediatrico).
  const CP = colorPediatrico(paciente?.genero);
  const PED = CP.c, PED_SUAVE = CP.suave, PED_LINEA = CP.linea;
  const faltanAnios = aniosParaAdulto(paciente?.nacimiento);
  const [tipo, setTipo] = useState(prev.tipo || (etapa === "pediatrico" ? "pediatrico" : "adulto"));
  const esPed = tipo === "pediatrico";
  const [hc, setHc] = useState(prev);
  const secc = tipo === "pediatrico" ? HC_PEDIATRICO : HC_ADULTO;
  const setF = (k, v) => setHc((s) => ({ ...s, [k]: v }));
  const toggleChk = (k, opt) => setHc((s) => { const a = s[k] || []; return { ...s, [k]: a.includes(opt) ? a.filter((x) => x !== opt) : [...a, opt] }; });
  const guardar = () => { onSave({ ...hc, tipo, actualizado: fmt(hoy) }); notify(`Historia clínica de ${paciente?.nombre || "paciente"} guardada.`); onClose(); };
  const inp = { width: "100%", padding: "10px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const acc = acentoFicha(esPed);

  // Sin fecha de nacimiento no se sabe qué historia toca. Antes se suponía "adulto" y
  // se abría el formulario de adulto con sus pestañas: a un niño se le acababa
  // preguntando por tabaco, alcohol y embarazo. Ahora se pide la fecha primero.
  if (edad == null) return (
    <Modal icon={<FileText size={20} strokeWidth={1.75} />} titulo="Historia clínica" sub={paciente?.nombre || ""} onClose={onClose} maxW={520}
      footer={<><Btn small kind="ghost" onClick={onClose}>Cerrar</Btn>{onEditarPaciente && <Btn small onClick={onEditarPaciente}><Users size={15} strokeWidth={1.75} /> Completar la fecha</Btn>}</>}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "var(--dc-warn-soft)", border: "1px solid var(--dc-amber-soft)", borderRadius: "var(--dc-r-md)", padding: "14px 16px" }}>
        <AlertTriangle size={20} strokeWidth={1.75} color="var(--dc-warn-600)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: "var(--dc-warn-ink)", lineHeight: 1.55 }}>
          <b>Falta la fecha de nacimiento de {paciente?.nombre || "este paciente"}.</b><br />
          La historia clínica no es la misma para un niño que para un adulto: cambian los
          antecedentes que se preguntan, los hábitos y hasta las dosis. Complétala en la
          ficha del paciente y vuelve a abrir la historia.
        </div>
      </div>
    </Modal>
  );

  return (
    <Modal icon={<FileText size={20} strokeWidth={1.75} />} tone={acc} titulo="Historia clínica" sub={`${paciente?.nombre || ""}${edad != null ? ` – ${edad} años` : ""}`} onClose={onClose} maxW={680}
      footer={<><Btn small kind="ghost" onClick={onClose}>Cancelar</Btn><Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> Guardar historia</Btn></>}>
      {/* A un nino de 7 anios no se le enseña la pestaña de adulto: no es un modo que
          le corresponda, y tenerla ahi solo invita a rellenar la ficha equivocada. Las
          dos pestañas salen unicamente en la etapa de transicion (13-14), que es cuando
          de verdad conviven, y en un adulto que tenga historia pediatrica que consultar.
          En un nino se muestra una etiqueta fija que dice lo que es. */}
      {etapa === "pediatrico" ? (
        // La insignia dice el cuestionario ABIERTO, no la edad: si una historia se guardó
        // como de adulto, se veía "Ficha pediátrica" encima del formulario de adulto y no
        // había manera de volver, porque el conmutador solo sale desde los 13.
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: esPed ? PED_SUAVE : "var(--dc-warn-soft)", border: `1px solid ${esPed ? PED_LINEA : "var(--dc-amber-soft)"}`,
                        borderRadius: "var(--dc-r-md)", padding: "7px 14px", color: esPed ? PED : "var(--dc-warn-600)", fontWeight: 500, fontSize: 13 }}>
            <EmblemaNino size={17} /> {esPed ? "Ficha pediátrica" : "Cuestionario de adulto"}
          </div>
          {!esPed && (
            <div style={{ fontSize: 13, color: "var(--dc-warn-600)", marginTop: 7, lineHeight: 1.5 }}>
              Este paciente tiene {edad} años y su historia se guardó con el cuestionario de adulto.{" "}
              <button onClick={() => setTipo("pediatrico")} style={{ background: "none", border: "none", padding: 0, color: PED, fontWeight: 500, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Volver a la ficha pediátrica</button>
              {" "}(lo ya escrito no se pierde).
            </div>
          )}
        </div>
      ) : (
      <div style={{ display: "inline-flex", background: "var(--dc-bg-alt)", borderRadius: "var(--dc-r-md)", padding: 3, marginBottom: 16 }}>
        {[["adulto", "Adulto", User], ["pediatrico", "Pediátrico", null]].map(([k, l, Ic]) => {
          const on = tipo === k;
          const col = acentoFicha(k === "pediatrico");
          return (
            <button key={k} onClick={() => setTipo(k)} aria-pressed={on}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer",
                       fontWeight: 500, fontSize: 13, background: on ? "#fff" : "transparent", color: on ? col : "var(--dc-ink-400)",
                       boxShadow: on ? "0 1px 2px rgba(16,24,40,.12)" : "none", transition: "color .15s, background .15s" }}>
              {Ic ? <Ic size={15} strokeWidth={1.9} /> : <EmblemaNino size={16} />} {l}
            </button>);
        })}
      </div>
      )}
      {etapa === "transicion" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: PED_SUAVE, border: `1px solid ${PED_LINEA}`, borderRadius: "var(--dc-r-md)", padding: "10px 13px", marginBottom: 14 }}>
          <span style={{ color: PED, flexShrink: 0, display: "grid", placeItems: "center" }}><EmblemaNino size={22} /></span>
          <div style={{ fontSize: 13, color: "var(--dc-ink-500)", lineHeight: 1.5 }}>
            Con {edad} años está pasando de ficha pediátrica a la de adulto: en {faltanAnios} año{faltanAnios === 1 ? "" : "s"} será solo de adulto.
            Puedes seguir usando las dos — lo que ya se registró de niño <b>no se pierde</b>.
          </div>
        </div>
      )}
      {edad != null && etapa !== "transicion" && (esPed !== pedPorEdad) && <div style={{ fontSize: 12, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", borderRadius: "var(--dc-r-md)", padding: "8px 12px", marginBottom: 14 }}>El paciente tiene {edad} años — normalmente sería {pedPorEdad ? "pediátrico" : "adulto"}.</div>}
      {/* Apoderado: se lee de la ficha del paciente, no se vuelve a pedir aqui.
          Si falta, se dice donde completarlo en vez de callarlo. */}
      {esPed && (paciente?.apoderadoNombre
        ? <div style={{ display: "flex", alignItems: "center", gap: 10, background: PED_SUAVE, border: `1px solid ${PED_LINEA}`, borderRadius: "var(--dc-r-md)", padding: "10px 13px", marginBottom: 14 }}>
            <Baby size={17} strokeWidth={1.75} color={PED} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: "var(--dc-warn-700)", lineHeight: 1.5 }}>
              Responsable: <b>{paciente.apoderadoNombre}</b>
              {paciente.apoderadoParentesco ? ` – ${paciente.apoderadoParentesco}` : ""}
              {paciente.apoderadoTelefono ? ` – ${paciente.apoderadoTelefono}` : ""}
            </div>
          </div>
        : <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--dc-warn-soft)", borderRadius: "var(--dc-r-md)", padding: "10px 13px", marginBottom: 14 }}>
            <Baby size={17} strokeWidth={1.75} color="var(--dc-warn-600)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: "var(--dc-warn-ink)", lineHeight: 1.5 }}>
              Este menor no tiene apoderado registrado. Añádelo desde <b>Pacientes → editar</b>: sin él nadie puede firmar sus consentimientos.
            </div>
          </div>)}
      <div style={{ display: "grid", gap: 18 }}>
        {secc.map((s) => (
          <div key={s.t}>
            <div style={{ fontSize: 12, fontWeight: 500, color: acc, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10 }}>{s.t}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {s.f.map((fld) => {
                if (fld.type === "checks") return (
                  <div key={fld.k} style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {fld.opts.filter((opt) => !(etapa === "pediatrico" && HABITOS_DE_ADULTO.includes(opt)))
                      .map((opt) => { const on = (hc[fld.k] || []).includes(opt); return (
                      <button key={opt} onClick={() => toggleChk(fld.k, opt)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: "var(--dc-r-full)", border: on ? `1.5px solid ${acc}` : "1.5px solid var(--dc-line)", background: on ? tint(acc, 0.078) : "#fff", color: on ? acc : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{on ? <Check size={13} strokeWidth={1.75} /> : <Plus size={13} strokeWidth={1.75} />} {opt}</button>
                    ); })}
                  </div>
                );
                if (fld.type === "area") return <textarea className="dc-premium-inp" key={fld.k} value={hc[fld.k] || ""} onChange={(e) => setF(fld.k, e.target.value)} placeholder={fld.ph} rows={2} style={{ ...inp, resize: "vertical" }} />;
                if (fld.type === "select") return <Select key={fld.k} value={hc[fld.k] || ""} onChange={(v) => setF(fld.k, v)} placeholder={fld.ph} options={[{ value: "", label: fld.ph }, ...fld.opts.map((o) => ({ value: o, label: o }))]} />;
                return <input className="dc-premium-inp" key={fld.k} value={hc[fld.k] || ""} onChange={(e) => setF(fld.k, e.target.value)} placeholder={fld.ph} style={inp} />;
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

const TAG_COLOR = { VIP: "var(--dc-warn-700)", Impuntual: "var(--dc-danger)", Ortodoncia: "var(--dc-purple)", Deudor: "var(--dc-warn-600)", Nuevo: DS.c.primary, Recurrente: "var(--dc-ok-700)" };
const TAGS_DISP = ["VIP", "Impuntual", "Ortodoncia", "Deudor", "Nuevo", "Recurrente"];

function fmtTelDir(tel) {
  if (!tel) return "";
  const d = String(tel).replace(/\D/g, "");
  if (!d) return "";
  // DIR-01: 51 + 9 → mostrar solo móvil local; menos de 9 dígitos = incompleto
  const local = d.length >= 11 && d.startsWith("51") ? d.slice(-9) : d.length > 9 ? d.slice(-9) : d;
  if (local.length === 9) return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  if (local.length > 0 && local.length < 9) return "—";
  return "—";
}

function PacientesView({ pacientes, setPacientes, fichas, updFicha = () => {}, notify = () => {}, crearIntent = false, onIntentDone = () => {}, can, rol, sedeIds = [1, 2], onAgendarPaciente, onCobrarPaciente }) {
  // Dar de alta un paciente y lanzar campañas es trabajo de recepción y administración.
  // Gerencia entra aquí a consultar la cartera, no a escribir en ella.
  const puedeGestionar = can ? can("pacientes", "crear") : true;
  const [histPac, setHistPac] = useState(null); // paciente para historia clínica
  // Modo conectado (JWT presente): los datos vienen del backend real; si no, demo.
  const conectado = !!auth.token;
  const sedeInt = (uuid) => (uuid && String(uuid).endsWith("a2")) ? 2 : 1;
  const mapPac = (p) => ({ id: p.id, nombre: p.nombre, dni: p.dni || "", telefono: p.telefono || "", email: p.email || "", sede: sedeInt(p.sedeRegistroId), sedes: [sedeInt(p.sedeRegistroId)], ultima: (p.creadoEn || "").toString().slice(0, 10) || null, nacimiento: p.fechaNacimiento || "", creadoEn: p.creadoEn || null, alergias: p.alergias || [], genero: p.genero || "", distrito: p.distrito || "", aseguradora: p.aseguradora || "", comentario: p.comentario || "", tags: Array.isArray(p.tags) ? p.tags : [], marketing: p.marketing === true, canal: p.canal || null,
    // El backend los devuelve (PacienteController 56-59) y aqui se descartaban: al editar
    // un menor quedaban vacios en el formulario y al guardar se borraba su apoderado.
    apoderadoNombre: p.apoderadoNombre || "", apoderadoParentesco: p.apoderadoParentesco || "",
    apoderadoDni: p.apoderadoDni || "", apoderadoTelefono: p.apoderadoTelefono || "" });
  const [remoto, setRemoto] = useState(null);
  // Saldo por paciente: resumen-financiero (pacientes:ver). Fallback a /caja si hay facturacion:ver.
  const [saldos, setSaldos] = useState(null);
  useEffect(() => {
    if (!conectado) return;
    const mapRows = (rows) => {
      const m = {};
      for (const x of (rows || []))
        m[x.pacienteId] = { total: Number(x.total) || 0, pagado: Number(x.pagado) || 0 };
      setSaldos(m);
    };
    api.pacientes.resumenFinanciero().then(mapRows).catch(() => {
      if (can && !can("facturacion", "ver")) { setSaldos({}); return; }
      api.caja().then((c) => {
        const m = {};
        for (const x of (c && Array.isArray(c.porCobrar) ? c.porCobrar : []))
          m[x.pacienteId] = { total: Number(x.total) || 0, pagado: Number(x.pagado) || 0 };
        setSaldos(m);
      }).catch(() => setSaldos({}));
    });
  }, []); // eslint-disable-line
  // NAV-05: ante 5xx no pintar «0 registrados» como dato — conservar último listado bueno.
  const [listaError, setListaError] = useState(false);
  const recargar = () => {
    if (!conectado) return;
    api.pacientes.listar()
      .then((r) => { setListaError(false); setRemoto((r || []).map(mapPac)); })
      .catch(() => {
        setListaError(true);
        notify("No se pudieron cargar los pacientes del servidor.");
      });
  };
  // En conectado, la última visita y la próxima cita vienen ya resueltas del backend
  // (GET /pacientes/resumen-citas). Antes se pedía `citas.listar("all")`, que traía TODO
  // el histórico de citas de la clínica al navegador para derivar solo esos dos datos.
  // En demo se siguen calculando en memoria sobre CITAS_INIT.
  const [citasSrc, setCitasSrc] = useState(conectado ? [] : CITAS_INIT);
  const [resumenCitas, setResumenCitas] = useState(null);   // { pacienteId: {ultimaVisita, proximaFecha, proximaHora} }
  useEffect(() => {
    recargar();
    if (conectado) api.pacientes.resumenCitas()
      .then((r) => { const m = {}; (r || []).forEach((x) => { if (x.pacienteId) m[x.pacienteId] = x; }); setResumenCitas(m); })
      .catch(() => setResumenCitas({}));
  }, []); // eslint-disable-line
  const listaBase = conectado ? (remoto || []) : pacientes;
  const lista = useMemo(() => {
    // Conectado: el padrón viene de GET /pacientes (org completa). Filtrar por sedeInt
    // demo escondía fichas Surco y dejaba KPI 23 ≠ 34.
    if (conectado) return listaBase;
    return listaBase.filter((p) => sedesDe(p).some((s) => sedeIds.includes(s)));
  }, [listaBase, sedeIds, conectado]);
  const hoyISO = fmt(hoy);
  // Última visita real (cita atendida más reciente) por paciente.
  const ultimaVisita = useMemo(() => {
    if (conectado) {
      const m = {};
      Object.entries(resumenCitas || {}).forEach(([id, x]) => { if (x.ultimaVisita) m[id] = x.ultimaVisita; });
      return m;
    }
    const m = {};
    (citasSrc || []).forEach((c) => {
      if (c.estado === "atendida" && c.fecha) { const k = c.pacienteId; if (k && (!m[k] || c.fecha > m[k])) m[k] = c.fecha; }
    });
    return m;
  }, [conectado, resumenCitas, citasSrc]);
  const ultimaDe = (p) => p.ultima || ultimaVisita[p.id] || null;
  // Próxima cita del paciente (futura, más cercana, ni cancelada ni atendida).
  const proxima = (p) => {
    if (conectado) {
      const x = resumenCitas && p.id ? resumenCitas[p.id] : null;
      return x && x.proximaFecha ? { fecha: x.proximaFecha, hora: x.proximaHora || "" } : null;
    }
    const mias = citasSrc.filter((c) => (c.pacienteId && p.id && c.pacienteId === p.id) || (c.dni && p.dni && c.dni === p.dni) || (!conectado && c.paciente === p.nombre));
    const fut = mias.filter((c) => c.fecha >= hoyISO && c.estado !== "cancelada" && c.estado !== "atendida").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    return fut[0] || null;
  };
  const relFecha = (iso, futuro) => { const d = Math.round((new Date(iso + "T00:00:00") - new Date(hoyISO + "T00:00:00")) / 86400000); const n = Math.abs(d); const txt = n === 0 ? "Hoy" : n < 30 ? `${n} día${n > 1 ? "s" : ""}` : n < 365 ? `${Math.round(n / 30)} mes${Math.round(n / 30) > 1 ? "es" : ""}` : `${Math.round(n / 365)} año${Math.round(n / 365) > 1 ? "s" : ""}`; return futuro ? (n === 0 ? "Hoy" : `En ${txt}`) : (n === 0 ? "Hoy" : `Hace ${txt}`); };
  const [ficha, setFicha] = useState(null);
  const [ficha360, setFicha360] = useState(null);   // ficha real (backend) en modo conectado
  const [fmId, setFmId] = useState(() => {
    const { pacienteId } = parseHash(typeof window !== "undefined" ? window.location.hash : "");
    return pacienteId || null;
  });
  const [fmTab, setFmTab] = useState(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  useEffect(() => {
    const { pacienteId } = parseHash(window.location.hash);
    if (pacienteId) setFmId(pacienteId);
    const onHash = () => {
      const { pacienteId: pid } = parseHash(window.location.hash);
      setFmId(pid || null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []); // eslint-disable-line
  useEffect(() => {
    const { pacienteId } = parseHash(window.location.hash);
    if (fmId) {
      if (pacienteId !== String(fmId)) irHash("pacientes", { pacienteId: fmId });
    } else if (pacienteId) {
      // No borrar el deep-link en el primer render antes de hidratar fmId
    }
  }, [fmId]); // eslint-disable-line
  const cerrarFm = () => { setFmId(null); setFmTab(null); irHash("pacientes"); };
  /**
   * Historia clinica. Conectado abre la Ficha medica, que es la que guarda de verdad
   * (paciente.fichaClinica en el servidor). El modal ligero guardaba en localStorage
   * y avisaba "guardada": la anamnesis se perdia al recargar, no la veia nadie mas
   * del equipo, y encima arrancaba con los datos de ejemplo de otro paciente.
   * En demostracion se conserva el modal, que es donde tiene sentido.
   */
  const abrirHistoria = (p) => {
    if (conectado && p?.id) { setFmTab(null); setFmId(p.id); return; }
    setHistPac(p);
  };
  const verFicha = (p) => {
    if (conectado && p?.id) { setFmTab(null); setFmId(p.id); return; }
    setFicha(p.nombre);
  };
  const abrirOdontograma = (p) => {
    if (conectado && p?.id) { setFmTab("odontograma"); setFmId(p.id); return; }
    notify("Abre un paciente con sesión conectada para ver el odontograma.");
  };
  const [form, setForm] = useState(null); // datos + segmentación de marketing
  const [camp, setCamp] = useState(null); // compositor de campaña de marketing
  const nuevo = () => { setFormErr({}); setForm({ nombre: "", dni: "", telefono: "", email: "", nacimiento: "", genero: "", distrito: "", canal: "Recomendación", aseguradora: "Ninguno", marketing: false, sedes: [1], tags: [], comentario: "", tarea: "", apoderadoNombre: "", apoderadoParentesco: "", apoderadoDni: "", apoderadoTelefono: "" }); };
  const [formErr, setFormErr] = useState({});
  const editar = (p) => setForm({ id: p.id, nombre: p.nombre, dni: p.dni || "", telefono: p.telefono || "", email: p.email || "", nacimiento: p.nacimiento || "", genero: p.genero || "", distrito: p.distrito || "", canal: p.canal || "Recomendación", aseguradora: p.aseguradora || "Ninguno", marketing: p.marketing === true, sedes: normSedes(p.sedes ?? p.sede ?? [1]), tags: p.tags || [], comentario: p.comentario || "", tarea: p.tarea || "", apoderadoNombre: p.apoderadoNombre || "", apoderadoParentesco: p.apoderadoParentesco || "", apoderadoDni: p.apoderadoDni || "", apoderadoTelefono: p.apoderadoTelefono || "" });
  const toggleTag = (t) => setForm((f) => { const a = f.tags || []; return { ...f, tags: a.includes(t) ? a.filter((x) => x !== t) : [...a, t] }; });
  useEffect(() => { if (crearIntent) { nuevo(); onIntentDone(); } }, [crearIntent]); // eslint-disable-line
  // BUG-105: Helper para actualizar campo y limpiar su error específico
  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setFormErr((err) => {
      const newErr = { ...err };
      delete newErr[field];
      return newErr;
    });
  };
  // Autocompletar DNI vía RENIEC (backend real + fallback demo) — helper compartido
  const autoDNI = async () => { const r = await reniecLookup(form.dni); if (r.ok) setForm((f) => ({ ...f, nombre: r.nombre })); notify(r.msg); };
  const toggleSede = (id) => setForm((f) => { const a = normSedes(f.sedes); return { ...f, sedes: a.includes(id) ? a.filter((x) => x !== id) : [...a, id].sort() }; });
  const guardar = async () => {
    const v = validarFormPaciente(form, hoyISO);
    if (!v.ok) { setFormErr(v.errors); notify(v.errors[v.first] || "Revisa los campos marcados."); return; }
    setFormErr({});
    if (conectado) {
      const sedesForm = normSedes(form.sedes);
      if (!sedesForm.length) { notify("Selecciona al menos una sede."); return; }
      const payload = { nombre: form.nombre.trim(), dni: form.dni.trim(), telefono: (form.telefono || "").replace(/\D/g, "").replace(/^51/, "").slice(-9) || null, email: (form.email || "").trim() || null, fechaNacimiento: form.nacimiento || null, genero: form.genero || null, distrito: form.distrito || null, canal: form.canal || null, aseguradora: form.aseguradora || null, marketing: !!form.marketing, comentario: form.comentario || null, tags: form.tags || [], sedeRegistroId: sedeApiUuid(sedesForm[0]),
        // Se manda "" y no null para poder BORRAR el apoderado (el backend ignora los nulos).
        apoderadoNombre: form.apoderadoNombre || "", apoderadoParentesco: form.apoderadoParentesco || "",
        apoderadoDni: form.apoderadoDni || "", apoderadoTelefono: form.apoderadoTelefono || "" };
      try {
        if (form.id) await api.pacientes.actualizar(form.id, payload); else await api.pacientes.crear(payload);
        notify(form.id ? "Paciente actualizado." : `${form.nombre} registrado.`);
        setForm(null); recargar();
      } catch (e) {
        const msg = e.message || "Error desconocido";
        notify(msg);
        console.error("Error al guardar paciente:", e, payload);
      }
      return;
    }
    const sedes = form.sedes.length ? form.sedes : [1];
    const d = { nombre: form.nombre, dni: form.dni, telefono: form.telefono, email: form.email, nacimiento: form.nacimiento, genero: form.genero, distrito: form.distrito, canal: form.canal, aseguradora: form.aseguradora, marketing: form.marketing, sedes, tags: form.tags || [], comentario: form.comentario || "", tarea: form.tarea || "", apoderadoNombre: form.apoderadoNombre || "", apoderadoParentesco: form.apoderadoParentesco || "", apoderadoDni: form.apoderadoDni || "", apoderadoTelefono: form.apoderadoTelefono || "" };
    if (form.id) setPacientes((ps) => ps.map((p) => p.id === form.id ? { ...p, ...d } : p));
    else setPacientes((ps) => [...ps, { id: Math.max(0, ...ps.map((p) => p.id)) + 1, ...d, ultima: fmt(hoy) }]);
    notify(form.id ? "Paciente actualizado." : `${form.nombre} registrado con sus datos de marketing.`);
    setForm(null);
  };
  const eliminar = () => {
    if (conectado) {
      if (!confirm(`¿Archivar a ${form.nombre}? Dejará de aparecer en el listado (no se borra su historial).`)) return;
      api.pacientes.eliminar(form.id).then(() => { notify(`${form.nombre} archivado.`); setForm(null); recargar(); }).catch(() => notify("No se pudo archivar el paciente."));
      return;
    }
    setPacientes((ps) => ps.filter((p) => p.id !== form.id)); setForm(null);
  };
  const eliminarPaciente = async (p) => {
    if (!conectado) {
      if (!confirm(`¿Eliminar permanentemente a ${p.nombre}?`)) return;
      setPacientes((ps) => ps.filter((x) => x.id !== p.id));
      notify(`${p.nombre} eliminado.`);
      return;
    }
    try {
      const r = await api.pacientes.tieneHistoria(p.id);
      const tieneHistoria = r?.tieneHistoria || false;
      if (tieneHistoria) {
        notify("Este paciente tiene citas/tratamientos registrados. No se puede eliminar. Sugerencia: inactivar desde Editar.");
        return;
      }
      if (!confirm(`¿Eliminar permanentemente a ${p.nombre}? Esta acción no se puede deshacer.`)) return;
      await api.pacientes.eliminar(p.id);
      notify(`${p.nombre} eliminado exitosamente.`);
      recargar();
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        notify(e.message || "No se puede eliminar un paciente con historia clínica.");
      } else {
        notify("No se pudo eliminar el paciente.");
      }
    }
  };
  const [enviandoRec, setEnviandoRec] = useState(false);
  const enviarRecordatoriosReactivar = async () => {
    if (!conectado) { notify(`Recordatorio de control enviado por WhatsApp a ${reactivar} pacientes.`); return; }
    const objetivo = lista.filter((p) => mesesSinVenir(p) >= 6 && diasDesdeAlta(p) > 30 && p.telefono && p.telefono.trim());
    if (!objetivo.length) { notify("No hay pacientes con teléfono para recordar."); return; }
    if (!confirm(`Se enviará un recordatorio de control por WhatsApp a ${pluralEs(objetivo.length, "paciente", "pacientes")}. ¿Continuar?`)) return;
    setEnviandoRec(true);
    let ok = 0;
    for (const p of objetivo) { try { const r = await api.automatizaciones.enviarRecall(p.id); if (r?.ok) ok++; } catch (e) { /* continua */ } }
    setEnviandoRec(false);
    notify(ok > 0
      ? `Recordatorio enviado a ${ok}/${objetivo.length} ${objetivo.length === 1 ? "paciente" : "pacientes"} por WhatsApp.`
      : `No se pudo enviar el recordatorio por WhatsApp (0/${objetivo.length}).`);
  };
  const acBtn = (c) => ({ background: "#fff", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: 7, cursor: "pointer", color: c, display: "grid", placeItems: "center" });
  const dias = (p) => { const uv = ultimaDe(p); return uv ? Math.max(0, Math.round((new Date(fmt(hoy)) - new Date(uv)) / 86400000)) : 999; };
  // Misma escala que relFecha («Hace N meses» = round(días/30)): KPI + lista alineados.
  const mesesSinVenir = (p) => { const d = dias(p); if (d >= 999) return 999; return d < 30 ? 0 : Math.round(d / 30); };
  const diasDesdeAlta = (p) => {
    if (!p.creadoEn) return 999;
    const c = String(p.creadoEn).slice(0, 10);
    return Math.max(0, Math.round((new Date(hoyISO + "T00:00:00") - new Date(c + "T00:00:00")) / 86400000));
  };
  // Antes: 7 recorridos completos de la lista de pacientes en CADA render (5 filter + reduce + sort).
  // Ahora: una sola pasada, y solo cuando cambian los pacientes o sus últimas visitas.
  const { activos, reactivar, nuevos, cumpleMes, optIn, canalTop } = useMemo(() => {
    let activos = 0, reactivar = 0, nuevos = 0, cumpleMes = 0, optIn = 0;
    const canalCount = {};
    const mesHoy = hoy.getMonth();
    for (const p of lista) {
      const meses = mesesSinVenir(p);
      const d = dias(p);
      const alta = diasDesdeAlta(p);
      if (meses < 6 || alta <= 30) activos++;
      if (meses >= 6 && alta > 30) reactivar++;
      if (d <= 30 || alta <= 30) nuevos++;
      if (p.nacimiento && new Date(p.nacimiento + "T00:00:00").getMonth() === mesHoy) cumpleMes++;
      if (p.marketing || (!conectado && (Number(p.id) || 0) % 3 !== 0)) optIn++;
      // Demo: canal de ejemplo repartido por id para que la vista no salga vacía.
      const CANAL_DEMO = ["Recomendación", "Instagram", "Google", "Recomendación", "Facebook", "Pasó por el local", "Instagram", "Convenio empresa", "TikTok"];
      const canalKey = p.canal && String(p.canal).trim() ? p.canal : (!conectado ? CANAL_DEMO[(Number(p.id) || 0) % CANAL_DEMO.length] : "Sin registrar");
      canalCount[canalKey] = (canalCount[canalKey] || 0) + 1;
    }
    return { activos, reactivar, nuevos, cumpleMes, optIn,
             canalTop: Object.entries(canalCount).sort((a, b) => b[1] - a[1]).slice(0, 8) };
  }, [lista, ultimaVisita]); // eslint-disable-line
  const canalMax = Math.max(1, ...canalTop.map((c) => c[1]));
  const canalCol = { "Recomendación": "#16A36A", "Instagram": "#E0487A", "Facebook": "#2F6FDE", "Google": "#F2A93B", "TikTok": "#1F3A40", "Volante": "#D97706", "Pasó por el local": "#0E9199", "Convenio empresa": "#6D4FD1", "Sin registrar": "#B7C8CB" };
  const segmentos = [
    { k: "cumple", label: "Cumpleaños este mes", sub: "Saludo con descuento", n: cumpleMes, color: "#E0487A", icon: <Sparkles size={16} strokeWidth={1.75} />,
      plantilla: "¡Feliz cumpleaños, {nombre}! 🎉 En Sonríe+ queremos celebrar contigo: este mes tienes 20% de descuento en tu limpieza dental. Escríbenos para agendar." },
    { k: "react", label: "Para reactivar", sub: "Más de 6 meses sin venir", n: reactivar, color: "#D97706", icon: <BellRing size={16} strokeWidth={1.75} />,
      plantilla: "Hola {nombre}, ¡te extrañamos en Sonríe+! Hace más de 6 meses de tu última visita. Reserva tu control con 15% de descuento este mes. Tu sonrisa lo agradecerá 😁" },
    { k: "opt", label: "Aceptan campañas", sub: "Dieron su consentimiento", n: optIn, color: "#0E9199", icon: <Megaphone size={16} strokeWidth={1.75} />,
      plantilla: "Hola {nombre}, en Sonríe+ tenemos una promoción especial para ti este mes. Escríbenos y agenda tu cita con beneficios exclusivos. ¡Te esperamos!" },
  ];
  const segmentoPac = (k) => lista.filter((p) => p.telefono && String(p.telefono).trim() && (
    k === "cumple" ? (p.nacimiento && new Date(p.nacimiento + "T00:00:00").getMonth() === hoy.getMonth())
    : k === "react" ? (dias(p) > 180 && diasDesdeAlta(p) > 30)
    : k === "opt" ? (p.marketing || (!conectado && (Number(p.id) || 0) % 3 !== 0)) : false));
  const enviarCamp = async () => {
    const canalTxt = camp.canal === "ambos" ? "WhatsApp y email" : camp.canal === "email" ? "email" : "WhatsApp";
    // Envío REAL por WhatsApp (salvo canal solo-email, que aún no está integrado).
    if (conectado && camp.canal !== "email") {
      const objetivo = segmentoPac(camp.k);
      if (!objetivo.length) { notify("No hay destinatarios con teléfono en este segmento."); return; }
      if (!confirm(`Se enviará la campaña por WhatsApp a ${objetivo.length} paciente(s). ¿Continuar?`)) return;
      try {
        const r = await api.pacientes.campana(objetivo.map((p) => p.id), camp.msg);
        notify(`Campaña enviada por WhatsApp a ${r?.enviados ?? 0}/${r?.total ?? objetivo.length} paciente(s).`);
      } catch (e) { notify("No se pudo enviar la campaña."); }
      setCamp(null); return;
    }
    notify(`Campaña "${camp.label}" enviada por ${canalTxt} a ${camp.n} paciente(s).`);
    setCamp(null);
  };
  const cols = [
    { key: "paciente", label: "Paciente", w: "minmax(160px,1.5fr)", a: "left", get: (p) => p.nombre + " " + (p.email || ""), cell: (p) => { const col = colorDe(p.nombre); return (
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: "var(--dc-r-full)", background: tint(col, 0.102), color: col, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 13, flexShrink: 0 }}>{iniciales(p.nombre)}</div>
        <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={p.nombre}>{p.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><Phone size={11} strokeWidth={1.75} style={{ flexShrink: 0 }} /> {fmtTelDir(p.telefono) || p.email || "—"}</div>{(p.tags || []).length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>{(p.tags || []).slice(0, 3).map((tg) => { const tc = TAG_COLOR[tg] || "var(--dc-slate)"; return <span key={tg} style={{ fontSize: 12, fontWeight: 500, color: tc, background: tint(tc, 0.086), padding: "1px 6px", borderRadius: "var(--dc-r-sm)" }}>{tg}</span>; })}</div>}</div>
      </div>
    ); } },
    { key: "ultima", label: "Última cita", w: "minmax(120px,0.9fr)", a: "left", get: (p) => ultimaDe(p) || "", cell: (p) => { const u = ultimaDe(p); if (!u) return <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Sin visitas</span>; const m = mesesSinVenir(p); const c = m >= 6 ? "var(--dc-warn-600)" : m >= 3 ? "var(--dc-ink-400)" : "var(--dc-ok-700)"; return <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={13} strokeWidth={1.75} color={c} style={{ flexShrink: 0 }} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, color: c, fontWeight: 500 }}>{relFecha(u, false)}</div><div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums" }}>{fechaLegible(u)}</div></div></div>; } },
    { key: "proxima", label: "Próxima cita", w: "minmax(120px,0.9fr)", a: "left", get: (p) => proxima(p)?.fecha || "zzz", cell: (p) => { const px = proxima(p); if (!px) return <span style={{ fontSize: 13, color: "var(--dc-ink-400)", display: "inline-flex", alignItems: "center", gap: 5 }}><Calendar size={12} strokeWidth={1.75} /> Sin agendar</span>; return <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "var(--dc-r-full)", background: DS.c.primary, flexShrink: 0 }} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, color: DS.c.primary, fontWeight: 500 }}>{relFecha(px.fecha, true)}</div><div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums" }}>{fechaLegible(px.fecha)} – {(px.hora || "").slice(0, 5)}</div></div></div>; } },
    // "Tarea" no existe en el backend: con sesión salía "—" en todas las filas.
    ...(conectado ? [] : [{ key: "tarea", label: "Tarea", w: "minmax(130px,0.9fr)", a: "left", get: (p) => p.tarea || "zzz", cell: (p) => { const t = p.tarea; if (!t) return <span style={{ fontSize: 12, color: "var(--dc-line-alt)" }}>—</span>; return <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", padding: "4px 10px", borderRadius: "var(--dc-r-sm)", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><BellRing size={12} strokeWidth={1.75} /> {t}</span>; } }]),
    // Con sesión, el saldo real del paciente (plan menos pagos); en la demostración, el
    // presupuesto de ejemplo que lleva cada ficha.
    // Con sesión: columna de deuda (saldo pendiente). Verde solo si está al día.
    { key: "presupuesto", label: conectado ? "Saldo pendiente" : "Presupuesto", w: "minmax(120px,1fr)", a: "left", get: (p) => { const q = conectado ? (saldos ? saldos[p.id] : null) : p.presupuesto; return q ? Math.max(0, q.total - q.pagado) : -1; }, cell: (p) => { const pr = conectado ? (saldos ? saldos[p.id] : null) : p.presupuesto; if (!pr || !pr.total) return <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>—</span>; const total = Math.max(0, Number(pr.total) || 0); const pagado = Math.min(Math.max(0, Number(pr.pagado) || 0), total); const saldo = Math.max(0, total - pagado); const full = saldo <= 0.5; const pctDeuda = total > 0 ? Math.min(100, Math.round((saldo / total) * 100)) : 0; return (
      <div style={{ minWidth: 0, width: "100%", overflow: "hidden" }}>
        {full ? (
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ok-700)" }}>Al día</div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dc-warn-700)", fontVariantNumeric: "tabular-nums" }}>S/ {saldo.toLocaleString("es-PE")}</div>
            <div style={{ fontSize: 12, color: "var(--dc-ink-400)", marginBottom: 4 }}>de S/ {total.toLocaleString("es-PE")}</div>
            {(() => { const lp = layoutProgreso(pctDeuda); if (!lp.dibujar && !lp.soloTexto) return null; if (lp.soloTexto) return <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-600)" }}>{Math.round(lp.pct)}%</div>; return <div style={{ height: 7, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}><div style={{ width: `${Math.min(99, Math.max(4, lp.pct))}%`, height: "100%", background: "var(--dc-warn)", borderRadius: "var(--dc-r-full)" }} /></div>; })()}
          </>
        )}
      </div>
    ); } },
    // Fuera del listado "Fuente" y "Comentario": con ocho columnas la tabla pedia 1220 px
    // y se cortaban las cabeceras. Las dos siguen en la ficha del paciente -se abre al
    // pulsar la fila- y la fuente ademas tiene su propia tarjeta, "Como nos conocen".
    // Las dos acciones clínicas más usadas a la vista; ficha, editar y eliminar en ⋯.
    { key: "acc", label: "Acciones", w: "128px", a: "right", sticky: true, noFilter: true, noSort: true, cell: (p) => (
      <div className="dc-row-actions" style={{ display: "inline-flex", gap: 4, justifyContent: "flex-end", alignItems: "center", flexWrap: "nowrap" }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dc-row-action" onClick={() => abrirHistoria(p)} title="Historia clínica" aria-label="Historia clínica"><Stethoscope size={15} strokeWidth={1.75} /></button>
        <button type="button" className="dc-row-action" onClick={() => abrirOdontograma(p)} title="Odontograma" aria-label="Odontograma"><Smile size={15} strokeWidth={1.75} /></button>
        <MenuAcciones opciones={[
          { label: "Ver ficha", onClick: () => verFicha(p) },
          { label: "Editar datos", onClick: () => editar(p) },
          puedeGestionar && { label: "Eliminar paciente", peligro: true, onClick: () => eliminarPaciente(p) },
        ]} />
      </div>
    ) },
  ];
  return (
    <div className="dc-pacientes-root" style={{ display: "grid", gap: 16, minWidth: 0, width: "100%", overflowX: "hidden" }}>
      <section className="dc-esp-hero dc-pac-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{listaError && !lista.length ? "—" : lista.length}</b><span>pacientes</span></div>
          <p>{listaError && !lista.length ? "No se pudo cargar el directorio" : "En el directorio – toca una fila para abrir la ficha"}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          {activos < lista.length ? <div><b>{activos}</b><span>Activos</span></div> : <div><b>{cumpleMes}</b><span>Cumpleaños del mes</span></div>}
          <div><b>{nuevos}</b><span>Nuevos – 30 días</span></div>
          {reactivar === 0 && <div><b>0</b><span>Para reactivar</span></div>}
        </div>
        {reactivar > 0 ? (
          <div className="dc-esp-hero__prox dc-pac-hero__reac">
            <span className="dc-pac-hero__ico"><BellRing size={15} strokeWidth={1.75} /></span>
            <div className="dc-esp-hero__prox-txt"><span>+6 meses sin venir</span><b>{reactivar} por reactivar</b></div>
            {puedeGestionar && <button type="button" className="dc-esp-hero__btn" onClick={enviarRecordatoriosReactivar} disabled={enviandoRec}><Send size={13} strokeWidth={1.75} /> {enviandoRec ? "Enviando…" : "Recordar"}</button>}
          </div>
        ) : <span />}
        {puedeGestionar && <button type="button" className="dc-esp-hero__agregar" onClick={nuevo}><Plus size={15} strokeWidth={2} /> Nuevo paciente</button>}
      </section>
      <DataTable titulo="Directorio de pacientes" maxHeight={560} sub={listaError && !lista.length ? "error de carga" : "personas"} cols={cols} rows={lista} onRowClick={(p) => verFicha(p)} minWidth={0} defaultSort={{ key: "paciente", dir: "asc" }} empty={<Vacio icon={<Users size={22} strokeWidth={1.75} />} titulo={listaError ? "Sin datos" : "Sin pacientes"} sub={listaError ? "El servidor no respondió; reintenta más tarde. No se muestran ceros inventados." : "Registra el primer paciente o ajusta el filtro."} />} />
      <section className="dc-mkt">
        <header className="dc-mkt__cab"><span><Megaphone size={16} strokeWidth={2} /></span><div><h3>Marketing</h3><small>De dónde llegan tus pacientes y a quién escribirle hoy{!conectado ? " (datos de ejemplo)" : ""}</small></div></header>
        <div className="dc-mkt__grid">
          <div className="dc-mkt__canal">
            <h4>Cómo nos conocen</h4>
            {canalTop.length === 0 || (canalTop.length === 1 && canalTop[0][0] === "Sin registrar") ? (
              <p className="dc-mkt__nada">Aún no registramos el canal de captación. Al dar de alta, indica «¿Cómo nos conoció?».</p>
            ) : (() => { const tot = canalTop.reduce((x, [, n]) => x + n, 0) || 1; let acc = 0; const grad = canalTop.map(([c, n]) => { const a0 = acc; acc += (n / tot) * 100; return `${canalCol[c] || "#9AAEB2"} ${a0}% ${acc}%`; }).join(", "); const top = canalTop.find(([c]) => c !== "Sin registrar"); return (
              <div className="dc-mkt__canalin">
                <div className="dc-mkt__dona" style={{ background: `radial-gradient(closest-side, #fff 64%, transparent 66% 100%), conic-gradient(${grad})` }}><div><b>{top ? Math.round((top[1] / tot) * 100) : 0}%</b><small>{top ? top[0] : "—"}</small></div></div>
                <ul>
                  {canalTop.map(([c, n]) => (
                    <li key={c} style={{ "--c": canalCol[c] || "#9AAEB2" }}><i /><span>{c}</span><b>{n}</b><small>{Math.round((n / tot) * 100)}%</small></li>
                  ))}
                </ul>
              </div>
            ); })()}
          </div>
          <div className="dc-mkt__segs">
            <h4>Segmentos para campaña</h4>
            {segmentos.map((sg) => (
              <div key={sg.k} className={`dc-mkt__seg${sg.n ? "" : " is-vacio"}`} style={{ "--c": sg.color }}>
                <span className="dc-mkt__sico">{sg.icon}</span>
                <div><b>{sg.label}</b><small>{sg.sub}</small></div>
                <em>{sg.n}</em>
                {puedeGestionar && <button type="button" onClick={() => setCamp({ ...sg, canal: "ambos", msg: sg.plantilla })} disabled={!sg.n}><Send size={13} strokeWidth={2} /> Enviar</button>}
              </div>
            ))}
          </div>
        </div>
      </section>
      {ficha && <FichaPaciente nombre={ficha} onClose={() => setFicha(null)} fichas={fichas} />}
      {ficha360 && <FichaReal data={ficha360} onClose={() => setFicha360(null)} notify={notify} />}
      {fmId && (
        <React.Suspense fallback={<div style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", background: "rgba(15,23,42,.35)", color: "#fff", fontSize: 14 }}>Cargando ficha…</div>}>
          <FichaMedica pacienteId={fmId} onClose={cerrarFm} notify={notify} can={can} rol={rol}
            sedeId={sedeApiUuid(sedeIds?.[0] ?? 1)}
            initialTab={fmTab}
            onAgendar={(pac) => { cerrarFm(); onAgendarPaciente?.(pac); }}
            onCobrar={(pac) => { cerrarFm(); onCobrarPaciente?.(pac); }} />
        </React.Suspense>
      )}
      {histPac && <HistoriaClinica paciente={histPac} ficha={fichas[histPac.id]} notify={notify} onClose={() => setHistPac(null)} onEditarPaciente={() => { const p = histPac; setHistPac(null); editar(p); }} onSave={(hc) => updFicha(histPac.id, (cur) => ({ ...cur, historiaClinica: hc }))} />}
      {camp && (() => {
        const canales = [["whatsapp", "WhatsApp", <MessageSquare size={15} strokeWidth={1.75} />], ["email", "Email", <Mail size={15} strokeWidth={1.75} />], ["ambos", "Ambos", <Send size={15} strokeWidth={1.75} />]];
        const preview = (camp.msg || "").replace(/\{nombre\}/g, lista.find((p) => p.marketing)?.nombre?.split(" ")[0] || "Ana");
        return (
          <Modal icon={<Megaphone size={20} strokeWidth={1.75} />} tone={camp.color} titulo="Nueva campaña de marketing" sub={`Segmento: ${camp.label} – ${camp.n} destinatario(s)`} onClose={() => setCamp(null)} maxW={600}
            footer={<><Btn small kind="ghost" onClick={() => setCamp(null)}>Cancelar</Btn><Btn small onClick={enviarCamp}><Send size={15} strokeWidth={1.75} /> Enviar a {camp.n}</Btn></>}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: tint(camp.color, 0.071), border: `1px solid ${tint(camp.color, 0.2)}`, borderRadius: "var(--dc-r-lg)", padding: "12px 14px", marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: "var(--dc-r-md)", background: tint(camp.color, 0.133), color: camp.color, display: "grid", placeItems: "center", flexShrink: 0 }}>{camp.icon}</div>
              <div><div style={{ fontSize: 18, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, lineHeight: 1 }}>{camp.n}</div><div style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>pacientes en «{camp.label}»</div></div>
            </div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 7 }}>Canal de envío</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {canales.map(([k, l, ic]) => { const on = camp.canal === k; return (
                <button key={k} onClick={() => setCamp({ ...camp, canal: k })} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: "var(--dc-r-md)", border: on ? `1.5px solid ${TEAL}` : "1.5px solid var(--dc-line)", background: on ? "var(--dc-accent-soft)" : "#fff", color: on ? "var(--dc-brand-600)" : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{ic} {l}</button>
              ); })}
            </div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 7 }}>Mensaje <span style={{ color: "var(--dc-ink-400)", fontWeight: 500 }}>– usa {"{nombre}"} para personalizar</span></label>
            <textarea className="dc-premium-inp" value={camp.msg} onChange={(e) => setCamp({ ...camp, msg: e.target.value })} rows={4} style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "var(--dc-bg)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
            <div style={{ marginTop: 14, background: "var(--dc-white)", border: "1px solid var(--dc-green-soft)", borderRadius: "var(--dc-r-lg)", padding: "13px 15px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--dc-ok-700)", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}><Eye size={13} strokeWidth={1.75} /> Vista previa</div>
              <div style={{ fontSize: 13, color: "var(--dc-ok-700)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{preview || "Escribe el mensaje de la campaña…"}</div>
            </div>
          </Modal>
        );
      })()}
      {form && (() => {
        const edad = calcEdad(form.nacimiento);
        const selSty = { width: "100%", padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, fontWeight: 500, cursor: "pointer", appearance: "none", backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='4 6 8 10 12 6'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };
        const lblSty = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
        const errSty = { fontSize: 12, color: RED, marginTop: 4 };
        const secTit = { fontSize: 12, fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", color: TEAL, margin: "22px 0 12px", display: "flex", alignItems: "center", gap: 7 };
        return (
        <Modal icon={<Users size={20} strokeWidth={1.75} />} titulo={form.id ? "Editar paciente" : "Nuevo paciente"} sub={form.id ? "Actualiza los datos del paciente" : "Registra un nuevo paciente y sus datos para marketing"} onClose={() => setForm(null)} size="largo" maxW={720}
        footer={<>{form.id && <span style={{ marginRight: "auto" }}><Btn small kind="ghost" onClick={eliminar}><Trash2 size={15} strokeWidth={1.75} /> Eliminar</Btn></span>}<Btn small kind="ghost" onClick={() => setForm(null)}>Cancelar</Btn><Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> {form.id ? "Guardar cambios" : "Crear paciente"}</Btn></>}>
        <div style={secTit}><User size={14} strokeWidth={1.75} /> Datos personales</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={lblSty}>DNI <span style={{ color: RED }}>*</span> <span style={{ color: "var(--dc-ink-400)", fontWeight: 500 }}>– consulta RENIEC</span></label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="dc-premium-inp" value={form.dni} onChange={(e) => updateField('dni', e.target.value.replace(/[^\d]/g, "").slice(0, 8))} placeholder="12345678" style={{ flex: 1, minWidth: 0, padding: "11px 12px", background: "var(--dc-bg)", border: `1.5px solid ${formErr.dni ? RED : "var(--dc-line)"}`, borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontVariantNumeric: "tabular-nums" }} />
              <button type="button" onClick={autoDNI} title="Traer nombres desde RENIEC" style={{ whiteSpace: "nowrap", background: (tint(DS.c.primary, 0.078)), color: DS.c.primary, border: "1.5px solid " + tint("var(--dc-accent-cyan)", 0.2), borderRadius: "var(--dc-r-md)", padding: "0 12px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Search size={14} strokeWidth={1.75} /> Autocompletar</button>
            </div>
            {formErr.dni && <div style={errSty}>{formErr.dni}</div>}
          </div>
          <div>
            <Field label="Nombre completo *" value={form.nombre} onChange={(v) => updateField('nombre', v)} placeholder="Ej. Ana Torres" />
            {formErr.nombre && <div style={errSty}>{formErr.nombre}</div>}
          </div>
          <div>
            <Field label="Celular" value={form.telefono} onChange={(v) => updateField('telefono', v)} placeholder="999 888 777" icon={<Phone size={15} strokeWidth={1.75} />} />
            {formErr.telefono && <div style={errSty}>{formErr.telefono}</div>}
          </div>
          <div>
            <Field label="Email" value={form.email} onChange={(v) => updateField('email', v)} placeholder="ana@mail.com" icon={<Mail size={15} strokeWidth={1.75} />} />
            {formErr.email && <div style={errSty}>{formErr.email}</div>}
          </div>
          <div>
            <label style={lblSty}>Fecha de nacimiento <span style={{ color: RED }}>*</span> {edad != null && <span style={{ color: TEAL, fontWeight: 500 }}>– {edad} años</span>}</label>
            <input className="dc-premium-inp" type="date" max={hoyISO} value={form.nacimiento} onChange={(e) => updateField('nacimiento', e.target.value)} style={{ ...selSty, backgroundImage: "none", cursor: "text", borderColor: formErr.nacimiento ? RED : "var(--dc-line)" }} />
            {formErr.nacimiento && <div style={errSty}>{formErr.nacimiento}</div>}
          </div>
          <div>
            <label style={lblSty}>Género</label>
            <Select value={form.genero} onChange={(v) => setForm({ ...form, genero: v })} placeholder="Seleccionar…"
                    options={[{ value: "", label: "Seleccionar…" }, ...GENEROS.map((g) => ({ value: g, label: g }))]} />
          </div>
        </div>
        {/* Apoderado. Aparece solo si el paciente es menor: a un adulto no se le
            piden estos datos, y sin la fecha de nacimiento no hay forma de saberlo. */}
        {edad != null && edad < EDAD_PEDIATRICA && (<>
          <div style={{ ...secTit, color: PED }}><EmblemaNino size={16} /> Apoderado – quien responde por el menor</div>
          <div style={{ background: PED_SUAVE, border: `1px solid ${PED_LINEA}`, borderRadius: "var(--dc-r-md)", padding: 14 }}>
            <div style={{ fontSize: 13, color: "var(--dc-warn-700)", marginBottom: 12, lineHeight: 1.5 }}>
              {form.nombre ? form.nombre.split(" ")[0] : "El paciente"} tiene {edad} año{edad === 1 ? "" : "s"}. Quien firme los consentimientos y responda
              en una urgencia tiene que estar registrado aquí.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={lblSty}>Nombre del apoderado</label>
                <input className="dc-premium-inp" value={form.apoderadoNombre || ""} onChange={(e) => setForm({ ...form, apoderadoNombre: e.target.value })} placeholder="Ej. Rosa Delgado Ríos" style={selSty} />
              </div>
              <div>
                <label style={lblSty}>Parentesco</label>
                <Select value={form.apoderadoParentesco || ""} onChange={(v) => setForm({ ...form, apoderadoParentesco: v })} placeholder="— Selecciona —"
                  options={[{ value: "", label: "— Selecciona —" }, ...PARENTESCOS.map((x) => ({ value: x, label: x }))]} />
              </div>
              <div>
                <label style={lblSty}>DNI del apoderado</label>
                <input className="dc-premium-inp" value={form.apoderadoDni || ""} onChange={(e) => setForm({ ...form, apoderadoDni: e.target.value.replace(/D/g, "").slice(0, 8) })} placeholder="8 dígitos" inputMode="numeric" style={selSty} />
              </div>
              <div>
                <label style={lblSty}>Teléfono de contacto</label>
                <input className="dc-premium-inp" value={form.apoderadoTelefono || ""} onChange={(e) => setForm({ ...form, apoderadoTelefono: e.target.value })} placeholder="9XX XXX XXX" inputMode="tel" style={selSty} />
              </div>
            </div>
          </div>
        </>)}
        <div style={secTit}><Megaphone size={14} strokeWidth={1.75} /> Marketing y segmentación</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={lblSty}>Distrito / zona</label>
            <Select value={form.distrito} onChange={(v) => setForm({ ...form, distrito: v })} placeholder="Seleccionar…"
                    options={[{ value: "", label: "Seleccionar…" }, ...DISTRITOS.map((d) => ({ value: d, label: d }))]} />
          </div>
          <div>
            <label style={lblSty}>¿Cómo nos conoció?</label>
            <Select value={form.canal} onChange={(v) => setForm({ ...form, canal: v })}
                    options={CANALES.map((c) => ({ value: c, label: c }))} />
          </div>
          <div>
            <label style={lblSty}>Aseguradora / EPS</label>
            <Select value={form.aseguradora} onChange={(v) => setForm({ ...form, aseguradora: v })}
                    options={ASEGS.map((a) => ({ value: a, label: a }))} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" onClick={() => setForm({ ...form, marketing: !form.marketing })} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: form.marketing ? `1.5px solid ${TEAL}` : "1.5px solid var(--dc-line)", background: form.marketing ? "var(--dc-accent-soft)" : "#fff", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 38, height: 22, borderRadius: "var(--dc-r-full)", background: form.marketing ? TEAL : "var(--dc-ink-200)", position: "relative", flexShrink: 0, transition: "background .15s" }}><span style={{ position: "absolute", top: 2, left: form.marketing ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} /></span>
              <span style={{ fontSize: 13, fontWeight: 500, color: form.marketing ? DS.c.primary : "var(--dc-ink-400)", lineHeight: 1.25 }}>Acepta campañas<br /><span style={{ fontWeight: 500, fontSize: 12 }}>WhatsApp, email, promos</span></span>
            </button>
          </div>
        </div>
        <div style={secTit}><Ticket size={14} strokeWidth={1.75} /> Etiquetas del paciente</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TAGS_DISP.map((t) => { const on = (form.tags || []).includes(t); const col = TAG_COLOR[t] || "var(--dc-slate)"; return (
            <button key={t} type="button" onClick={() => toggleTag(t)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: "var(--dc-r-full)", border: on ? `1.5px solid ${col}` : "1.5px solid var(--dc-line)", background: on ? tint(col, 0.086) : "#fff", color: on ? col : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{on ? <Check size={14} strokeWidth={1.75} /> : <Plus size={14} strokeWidth={1.75} />} {t}</button>
          ); })}
        </div>
        <div style={secTit}><MessageSquare size={14} strokeWidth={1.75} /> Nota / comentario</div>
        <textarea className="dc-premium-inp" value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} rows={2} placeholder="Ej. Prefiere horarios de mañana; requiere premedicación…" style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "var(--dc-bg)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
        <div style={secTit}><MapPin size={14} strokeWidth={1.75} /> Sedes donde se atiende</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(conectado ? SEDES.filter((s) => sedeIds.includes(s.id)) : SEDES).map((s) => { const on = normSedes(form.sedes).includes(s.id); return (
            <button key={s.id} type="button" onClick={() => toggleSede(s.id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 13px", borderRadius: "var(--dc-r-md)", border: on ? `1.5px solid ${NAVY}` : "1.5px solid var(--dc-line)", background: on ? "var(--dc-bg)" : "#fff", color: on ? NAVY : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{on ? <CheckCircle2 size={15} strokeWidth={1.75} color={NAVY} /> : <MapPin size={15} strokeWidth={1.75} />} {s.nombre}</button>
          ); })}
        </div>
        </Modal>
        );
      })()}
    </div>
  );
}

/* ---- Odontograma avanzado: caras del diente, dentición adulta/infantil, notas ---- */
/* Nombres y colores del odontograma según R.M. 559-2022-MINSA (DC-11b/c/e):
   rojo = patología / requiere tratamiento; azul = hecho consumado o tratado;
   verde claro = prevención (sellante). Sin ámbar en la norma. */
/* NAV-06 / ODO: catálogo único (util/odontogramaCatalogo). */
const ESTADOS_DIENTE = {
  sano: { l: "Sano", color: "#fff", borde: "var(--dc-ink-400)", porCara: false },
  ...ESTADOS_ODO,
};
const CARAS = (pieza) => [
  { k: "top", l: "Vestibular" },
  { k: "bottom", l: ES_SUPERIOR(pieza) ? "Palatino" : "Lingual" },
  { k: "left", l: "Mesial" }, { k: "right", l: "Distal" },
  { k: "center", l: (Number(String(pieza).slice(-1)) >= 1 && Number(String(pieza).slice(-1)) <= 3) ? "Incisal" : "Oclusal" },
];
const DIENTES_ADULTO = {
  sup: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  inf: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] };
const DIENTES_NINO = {
  sup: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  inf: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] };
/* Denticion MIXTA (aprox. 6 a 12 anios): conviven los temporales que aun no se han
   caido con los permanentes que ya erupcionaron. Es la boca real de casi todo
   paciente de odontopediatria, y sin ella habia que elegir entre marcar en una
   arcada de adulto que el nino no tiene, o en una de leche a la que le faltan
   dientes. Se dibujan las dos arcadas, la permanente por fuera y la temporal por
   dentro, que es como se ve un odontograma mixto de verdad. */
const DIENTES_MIXTA = {
  // NEW-42: incluir 2.º y 3.º molares permanentes (erupción ~12 años / mixta).
  supPerm: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  supTemp: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  infTemp: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
  infPerm: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] };

/* Que denticion le toca a cada edad. Sin esto el odontograma abria SIEMPRE en
   adulto: al atender a un nino de 7 anios salian 32 dientes permanentes que no
   tiene, y habia que acordarse de cambiarlo a mano antes de marcar nada. */
/* Bug #37 re-test: Corregir umbrales de dentición para que coincidan con la spec.
   Spec: 0-6 años = leche, 7-12 años = mixta, 13+ años = adulto.
   Anterior lógica: < 6 = nino, < 13 = mixta — la edad 6 iba a "nino" pero debería ser "mixta". */
const DENTICION_POR_EDAD = (edad) => edad == null ? "adulto" : edad <= 6 ? "infantil" : edad < 13 ? "mixta" : "adulto";

/* Filas del odontograma segun la denticion. La mixta lleva cuatro. */
const FILAS_DENTICION = {
  adulto: { sup: [DIENTES_ADULTO.sup], inf: [DIENTES_ADULTO.inf], ancho: 480 },
  infantil: { sup: [DIENTES_NINO.sup], inf: [DIENTES_NINO.inf], ancho: 380 },
  nino: { sup: [DIENTES_NINO.sup], inf: [DIENTES_NINO.inf], ancho: 380 }, // alias legacy
  mixta: { sup: [DIENTES_MIXTA.supPerm, DIENTES_MIXTA.supTemp],
            inf: [DIENTES_MIXTA.infTemp, DIENTES_MIXTA.infPerm], ancho: 560 },
};

/* ---- Anatomía de la pieza ----
   La forma sale del número FDI: el último dígito dice qué diente es (1 y 2
   incisivos, 3 canino, 4 y 5 premolares, 6 a 8 molares) y el primero en qué
   cuadrante está, lo que decide si las raíces van hacia arriba o hacia abajo.

   El dibujo sigue las tres partes que se ven en un odontograma de verdad:
   raíces separadas, una banda clara en el cuello y la corona acampanada. En
   molares y premolares la cara que muerde se representa como un rombo con un
   aspa dentro — así es como se marca en papel, mirando el diente desde arriba. */
const TIPO_PIEZA = (n) => {
  const d = Number(String(n).slice(-1));
  if (d <= 2) return "incisivo";
  if (d === 3) return "canino";
  if (d <= 5) return "premolar";
  return "molar";
};
/** Los cuadrantes 1, 2, 5 y 6 son de arriba: sus raíces suben. */
const ES_SUPERIOR = (n) => [1, 2, 5, 6].includes(Number(String(n)[0]));

/* Medidas en el lienzo de 54×112. `raices` son las posiciones respecto al centro. */
const ANATOMIA = {
  incisivo: { corona: 25, cuello: 20, alto: 40, raices: [0],        anchoRaiz: 13, largoRaiz: 50, oclusal: false },
  canino:   { corona: 27, cuello: 21, alto: 42, raices: [0],        anchoRaiz: 14, largoRaiz: 56, oclusal: false },
  premolar: { corona: 33, cuello: 25, alto: 38, raices: [-6, 6],    anchoRaiz: 11, largoRaiz: 46, oclusal: true },
  molar:    { corona: 42, cuello: 33, alto: 38, raices: [-12, 0, 12], anchoRaiz: 12, largoRaiz: 44, oclusal: true },
};

/**
 * Una pieza dental.
 *
 * La corona se divide en las cuatro caras laterales (vestibular, lingual,
 * mesial, distal) más la oclusal del centro. Los estados que afectan a toda la
 * pieza —corona, endodoncia, ausente, extracción— se dibujan ENCIMA con la
 * marca que se usa en un odontograma de papel, no rellenando el diente de
 * color: así se distingue lo que le pasa a una cara de lo que le pasa a la
 * pieza entera.
 */
function DienteSVG({ n, data, onCara, onWhole }) {
  const tipo = TIPO_PIEZA(n);
  const arriba = ES_SUPERIOR(n);
  const a = ANATOMIA[tipo];
  const W = 54, H = 112, cx = W / 2;
  const g = `d${n}`;

  const whole = data?.whole;
  const wEst = whole ? metaEstado(whole) : null;
  const wholeOverlay = wEst && !wEst.porCara;
  const marcada = (k) => !!data?.caras?.[k];
  const colorDe = (k) => (marcada(k) ? colorEstado(data.caras[k]) : "transparent");

  // De fuera hacia dentro: corona en el borde, raíces hacia el centro de la boca.
  const s = arriba ? -1 : 1;                       // sentido de las raíces
  const yBorde = arriba ? H - 6 : 6;               // punta de la corona
  const yCuello = yBorde + s * a.alto;             // dónde acaba la corona
  const yRaiz = yCuello + s * 7;                   // tras la banda del cuello
  const yPunta = yRaiz + s * a.largoRaiz;

  const xC = a.corona / 2, xN = a.cuello / 2;      // medias anchuras
  const yMed = yBorde + s * a.alto * 0.52;         // centro de la corona
  const r = Math.min(11, a.corona * 0.28);         // radio del rombo oclusal

  // Las cuatro caras laterales, como cuñas entre el borde de la corona y el rombo.
  const P = (x, y) => `${cx + x},${y}`;
  const caras = {
    top:    [P(-xN, yCuello), P(xN, yCuello), P(r * 0.75, yMed - r * 0.75), P(-r * 0.75, yMed - r * 0.75)],
    bottom: [P(-xC * 0.92, yBorde - s * 2), P(xC * 0.92, yBorde - s * 2), P(r * 0.75, yMed + r * 0.75), P(-r * 0.75, yMed + r * 0.75)],
    left:   [P(-xN, yCuello), P(-r * 0.75, yMed - r * 0.75), P(-r * 0.75, yMed + r * 0.75), P(-xC * 0.92, yBorde - s * 2)],
    right:  [P(xN, yCuello), P(r * 0.75, yMed - r * 0.75), P(r * 0.75, yMed + r * 0.75), P(xC * 0.92, yBorde - s * 2)],
  };
  const rombo = [P(0, yMed - r), P(r, yMed), P(0, yMed + r), P(-r, yMed)].join(" ");

  const cara = (k, pts) => (
    <polygon key={k} points={Array.isArray(pts) ? pts.join(" ") : pts}
      fill={colorDe(k)} fillOpacity={marcada(k) ? 0.88 : 0}
      stroke={marcada(k) ? colorEstado(data.caras[k]) : "var(--dc-line)"}
      strokeWidth={marcada(k) ? 1.3 : 0.75}
      onClick={(e) => { e.stopPropagation(); onCara(n, k); }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ cursor: "pointer", display: "block" }}>
        <defs>
          {/* El esmalte va más claro en el borde que muerde y más cálido hacia la raíz. */}
          <linearGradient id={`${g}c`} x1="0" y1={arriba ? "1" : "0"} x2="0" y2={arriba ? "0" : "1"}>
            <stop offset="0%" stopColor="var(--dc-white)" />
            <stop offset="45%" stopColor="var(--dc-bg)" />
            <stop offset="100%" stopColor="var(--dc-danger-soft)" />
          </linearGradient>
          <linearGradient id={`${g}r`} x1="0" y1={arriba ? "1" : "0"} x2="0" y2={arriba ? "0" : "1"}>
            <stop offset="0%" stopColor="var(--dc-danger-mid)" />
            <stop offset="100%" stopColor="var(--dc-amber-soft)" />
          </linearGradient>
        </defs>

        {/* raíces */}
        {a.raices.map((dx, i) => {
          const rx = cx + dx, w = a.anchoRaiz / 2;
          return (
            <path key={i}
              d={`M${rx - w} ${yRaiz}
                  C${rx - w + 0.5} ${yRaiz + s * a.largoRaiz * 0.55} ${rx - 2.5} ${yPunta - s * 4} ${rx} ${yPunta}
                  C${rx + 2.5} ${yPunta - s * 4} ${rx + w - 0.5} ${yRaiz + s * a.largoRaiz * 0.55} ${rx + w} ${yRaiz}Z`}
              fill={`url(#${g}r)`} stroke="var(--dc-ink-200)" strokeWidth="0.9" strokeLinejoin="round" />
          );
        })}

        {/* banda del cuello: la franja clara donde la corona se une a la raíz */}
        <path d={`M${cx - xN} ${yRaiz} L${cx + xN} ${yRaiz} L${cx + xN} ${yCuello} L${cx - xN} ${yCuello}Z`}
          fill="var(--dc-bg)" stroke="var(--dc-ink-200)" strokeWidth="0.8" />

        {/* corona acampanada */}
        <path d={`M${cx - xN} ${yCuello}
                  C${cx - xC} ${yCuello + s * a.alto * 0.38} ${cx - xC} ${yBorde - s * a.alto * 0.18} ${cx - xC * 0.9} ${yBorde - s * 3}
                  Q${cx} ${yBorde + s * 2.5} ${cx + xC * 0.9} ${yBorde - s * 3}
                  C${cx + xC} ${yBorde - s * a.alto * 0.18} ${cx + xC} ${yCuello + s * a.alto * 0.38} ${cx + xN} ${yCuello}Z`}
          fill={`url(#${g}c)`} stroke="var(--dc-ink-200)" strokeWidth="1.15" strokeLinejoin="round" />

        {/* caras marcables */}
        {Object.entries(caras).map(([k, pts]) => cara(k, pts))}

        {/* la cara que muerde: rombo en molares y premolares, franja en los de delante */}
        {a.oclusal
          ? <>
              {cara("center", rombo)}
              {!marcada("center") && (
                <g stroke="var(--dc-line)" strokeWidth="0.75" pointerEvents="none">
                  <line x1={cx - r} y1={yMed} x2={cx + r} y2={yMed} />
                  <line x1={cx} y1={yMed - r} x2={cx} y2={yMed + r} />
                </g>
              )}
            </>
          : cara("center", [P(-xC * 0.62, yBorde - s * 9), P(xC * 0.62, yBorde - s * 9),
                            P(xC * 0.72, yBorde - s * 3), P(-xC * 0.72, yBorde - s * 3)])}

        {/* estados de la pieza entera, con la marca del odontograma de papel */}
        {wholeOverlay && (
          <g onClick={(e) => { e.stopPropagation(); onWhole(n); }}>
            {whole === "corona" && (
              <path d={`M${cx - xN - 2} ${yCuello}
                        C${cx - xC - 2} ${yCuello + s * a.alto * 0.38} ${cx - xC - 2} ${yBorde - s * a.alto * 0.18} ${cx - xC * 0.9 - 1} ${yBorde - s * 2}
                        Q${cx} ${yBorde + s * 4} ${cx + xC * 0.9 + 1} ${yBorde - s * 2}
                        C${cx + xC + 2} ${yBorde - s * a.alto * 0.18} ${cx + xC + 2} ${yCuello + s * a.alto * 0.38} ${cx + xN + 2} ${yCuello}Z`}
                fill="none" stroke={wEst.color} strokeWidth="2.3" strokeDasharray="3.2 2.6" strokeLinejoin="round" />
            )}
            {whole === "endodoncia" && a.raices.map((dx, i) => (
              <line key={i} x1={cx + dx} y1={yRaiz + s * 2} x2={cx + dx} y2={yPunta - s * 5}
                stroke={wEst.color} strokeWidth="2.5" strokeLinecap="round" />
            ))}
            {whole === "implante" && (
              <g stroke={wEst.color} strokeWidth="2.1" strokeLinecap="round">
                <line x1={cx} y1={yRaiz} x2={cx} y2={yPunta - s * 3} />
                {[0.2, 0.4, 0.6, 0.8].map((f) => (
                  <line key={f} x1={cx - 6} y1={yRaiz + s * a.largoRaiz * f} x2={cx + 6} y2={yRaiz + s * a.largoRaiz * f} />
                ))}
              </g>
            )}
            {whole === "extraer" && (
              <g stroke={wEst.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <line x1={cx} y1={yPunta} x2={cx} y2={yBorde - s * 4} />
                <path d={`M${cx - 5} ${yBorde - s * 11} L${cx} ${yBorde - s * 4} L${cx + 5} ${yBorde - s * 11}`} />
              </g>
            )}
            {whole === "ausente" && (
              <g stroke={wEst.color} strokeWidth="2.6" strokeLinecap="round">
                <line x1={cx - xC * 0.85} y1={yCuello} x2={cx + xC * 0.85} y2={yBorde - s * 3} />
                <line x1={cx + xC * 0.85} y1={yCuello} x2={cx - xC * 0.85} y2={yBorde - s * 3} />
              </g>
            )}
            {whole === "fractura" && (
              <path d={`M${cx - 7} ${yCuello + s * 3} L${cx + 4} ${yMed} L${cx - 5} ${yBorde - s * 5}`} fill="none"
                stroke={wEst.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

/* Procedimiento y precio sugeridos por hallazgo, para pasar del odontograma al plan. */
const SUGERENCIA_PLAN = { caries: { p: "Obturación", c: 120 }, fractura: { p: "Reconstrucción", c: 180 }, extraer: { p: "Extracción", c: 200 }, ausente: { p: "Implante / prótesis", c: 900 }, corona: { p: "Corona", c: 450 }, endodoncia: { p: "Endodoncia", c: 350 } };
function Odontograma({ pacientes: pacProp, fichas, updFicha, notify, pacienteActivo, sedeActiva = 1, can, rol }) {
  const conectado = !!auth.token;
  const [pacRemoto, setPacRemoto] = useState(null);
  // Hace falta el nacimiento: sin el no se puede saber que denticion le toca.
  // El género viaja también: dos líneas más abajo se pinta el color pediátrico con él, y
  // sin traerlo llegaba undefined y todos los niños salían en el turquesa de "no consta".
  useEffect(() => { if (conectado) api.pacientes.listar().then((r) => setPacRemoto((r || []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    nacimiento: p.fechaNacimiento,
    genero: p.genero || "",
    dni: p.dni || "",
    alergias: Array.isArray(p.alergias) ? p.alergias : [],
    sede: p.sedeRegistroId || p.sedeId || p.sede || null,
    sedeRegistroId: p.sedeRegistroId || null,
    sedeNombre: p.sedeNombre || null,
  })))).catch(() => {}); }, []); // eslint-disable-line
  const pacientes = conectado ? (pacRemoto || []) : pacProp;
  const [pacienteId, setPacienteId] = useState(pacienteActivo || (auth.token ? null : pacProp[0]?.id) || null);
  const [fmTab, setFmTab] = useState(null); // overlay ficha sin salir del módulo Odontograma
  const [fmOpen, setFmOpen] = useState(false);
  const [fmShield, setFmShield] = useState(false); // absorbe click-through al cerrar overlay
  const cerrarFichaOdo = () => {
    setFmOpen(false);
    setFmTab(null);
    setFmShield(true);
    // Reafirmar módulo: un click fantasma al sidebar no debe dejarnos en perio/pacientes.
    irHash("odontograma");
    window.setTimeout(() => setFmShield(false), 220);
  };
  useEffect(() => { if (pacienteActivo) setPacienteId(pacienteActivo); }, [pacienteActivo]);
  useEffect(() => {
    if (!conectado || !pacRemoto) return;
    if (!pacRemoto.length) { setPacienteId(null); return; }
    // NEW-59: no sembrar con el primer paciente remoto; pedir elección explícita.
    if (pacienteId && !pacRemoto.some((p) => p.id === pacienteId)) setPacienteId(null);
  }, [pacRemoto]); // eslint-disable-line
  const edadPac = calcEdad((pacientes.find((x) => x.id === pacienteId) || {}).nacimiento);
  const esPed = edadPac != null && edadPac < EDAD_PEDIATRICA;
  const CP = colorPediatrico((pacientes.find((x) => x.id === pacienteId) || {}).genero);
  const PED = CP.c, PED_SUAVE = CP.suave, PED_LINEA = CP.linea;
  const [denticion, setDenticion] = useState(() => DENTICION_POR_EDAD(edadPac));
  // Al cambiar de paciente se recalcula: pasar de un adulto a un nino y seguir viendo
  // 32 dientes permanentes es la forma facil de marcar una caries en la pieza equivocada.
  const pacDenticion = useRef(pacienteId);
  useEffect(() => {
    if (pacDenticion.current === pacienteId) return;
    pacDenticion.current = pacienteId;
    setDenticion(DENTICION_POR_EDAD(edadPac));
  }, [pacienteId, edadPac]);
  /* Las tres fases del odontograma (API: fase = inicial | evolucion | alta). */
  const [fase, setFase] = useState("inicial");
  // Solo existe la vista anatómica; la clásica se retiró de la interfaz.
  const vistaOdo = "anatomico";
  const [showPlanInv, setShowPlanInv] = useState(false);
  const [anexoPlan, setAnexoPlan] = useState(null);
  const anatomicoRef = useRef(null);
  const abrirPlanInv = async () => {
    let anexo = null;
    try {
      if (anatomicoRef.current?.capturarAnexo) {
        anexo = await anatomicoRef.current.capturarAnexo();
      }
    } catch {
      notify && notify("No se pudo capturar el odontograma del paciente. Revisa el odontograma.");
    }
    setAnexoPlan(anexo);
    setShowPlanInv(true);
  };
  const sedeIdPlan = sedeApiUuid(sedeActiva != null && sedeActiva !== "all" ? sedeActiva : 1);
  const [zoom, setZoom] = useState(100);              // % del tamaño (clásico + anatómico)
  const [pincel, setPincel] = useState("caries");
  /** Borra lo marcado en la fase que se esta viendo. Las otras dos no se tocan:
      si se limpiara todo, se perderia el diagnostico al rehacer el plan. */
  const limpiarCapa = () => {
    const nombre = (FASES_ODO.find(([k]) => k === fase) || [, fase])[1];
    const marcadas = Object.keys(estados).filter((n) => { const d = estados[n]; return d && (d.whole || Object.keys(d.caras || {}).length); });
    if (!marcadas.length) { notify(`La fase ${nombre} ya está vacía.`); return; }
    if (!confirm(`¿Borrar las ${marcadas.length} marcas de ${nombre}? Las otras fases no se tocan.`)) return;
    if (conectado) {
      const dent = denticionApi(denticion);
      Promise.all(marcadas.map((n) => api.odontograma.guardar({ pacienteId, denticion: dent, fase, numeroPieza: Number(n), estadoPieza: null, estadosCara: "{}", nota: null })))
        .then(() => { notify(`${nombre} limpia.`); recargarOd(); })
        .catch(() => notify("No se pudo limpiar la fase."));
      return;
    }
    setOdon({});
    notify(`${nombre} limpia.`);
  };
  const [selNota, setSelNota] = useState(null);
  const [notaInput, setNotaInput] = useState("");
  const [detP, setDetP] = useState(null); // pieza abierta en modal de detalle

  // Odontograma remoto (conectado): {estados, notas} armados desde odontograma_pieza.
  const [odRemoto, setOdRemoto] = useState({ estados: {}, notas: {} });
  const recargarOd = () => {
    if (conectado && pacienteId) {
      api.odontograma.porPaciente(pacienteId, fase).then((rows) => {
        const est = {}, nts = {};
        (rows || []).forEach((r) => {
          const d = {};
          if (r.estadoPieza) d.whole = r.estadoPieza;
          try {
            const raw = r.estadosCara;
            const c = typeof raw === "object" && raw ? raw : JSON.parse(raw || "{}");
            if (c && Object.keys(c).length) d.caras = normalizarCarasAnatomicas(r.numeroPieza, c);
          } catch { /* */ }
          est[r.numeroPieza] = d;
          if (r.nota) nts[r.numeroPieza] = r.nota;
        });
        setOdRemoto({ estados: est, notas: nts });
      }).catch(() => {});
    } else setOdRemoto({ estados: {}, notas: {} });
  };
  // Al cambiar de fase hay que releer: cada una guarda sus propias marcas.
  useEffect(() => { recargarOd(); }, [pacienteId, conectado, fase]); // eslint-disable-line

  const paciente = pacientes.find((p) => p.id === pacienteId) || { id: pacienteId, nombre: "Selecciona un paciente" };
  const sedeLabelOdo = (() => {
    const fromPac = nombreSede(paciente.sede ?? paciente.sedeRegistroId);
    if (fromPac && fromPac !== "—") return fromPac;
    if (paciente.sedeNombre) return paciente.sedeNombre;
    const fromActiva = nombreSede(sedeActiva);
    return fromActiva !== "—" ? fromActiva : "";
  })();
  // Fuente única: la ficha central (demo) o el backend (conectado).
  const estados = conectado ? odRemoto.estados : (fichas[pacienteId]?.odontograma || {});
  const notas = conectado ? odRemoto.notas : (fichas[pacienteId]?.notas || {});
  // DC-11d — tomas datadas (snapshot local; fases API: inicial / evolucion / alta)
  const tomaKey = (pid) => `dc_odonto_tomas_${pid}`;
  const [tomas, setTomas] = useState([]);
  const [tomaSel, setTomaSel] = useState("");
  useEffect(() => {
    if (!pacienteId) { setTomas([]); return; }
    try { setTomas(JSON.parse(localStorage.getItem(tomaKey(pacienteId)) || "[]")); } catch { setTomas([]); }
  }, [pacienteId]);
  const guardarToma = () => {
    if (!pacienteId) return;
    const etiqueta = prompt("Nombre de la toma (ej. Control 6 meses)", `Toma ${fmt(hoy)}`);
    if (etiqueta == null) return;
    const snap = { id: "t" + Date.now(), fecha: fmt(hoy), etiqueta: (etiqueta.trim() || `Toma ${fmt(hoy)}`), fase, denticion, estados: JSON.parse(JSON.stringify(estados)), notas: { ...notas } };
    const next = [snap, ...tomas].slice(0, 40);
    localStorage.setItem(tomaKey(pacienteId), JSON.stringify(next));
    setTomas(next);
    notify(`Toma guardada: ${snap.etiqueta}.`);
  };
  const cargarToma = (id) => {
    const t0 = tomas.find((x) => x.id === id);
    if (!t0) return;
    if (!confirm(`¿Ver la toma «${t0.etiqueta}» del ${t0.fecha}? Se muestra en pantalla; el odontograma guardado en servidor no se modifica hasta que edites una pieza.`)) return;
    setFase(t0.fase || "inicial");
    if (t0.denticion) setDenticion(denticionApi(t0.denticion));
    setOdRemoto({ estados: t0.estados || {}, notas: t0.notas || {} });
    if (!conectado && updFicha) updFicha(pacienteId, (cur) => ({ ...cur, odontograma: t0.estados || {}, notas: t0.notas || {} }));
    setTomaSel(id);
    notify(`Vista de toma «${t0.etiqueta}».`);
  };
  const setOdon = (fn) => updFicha(pacienteId, (cur) => ({ ...cur, odontograma: fn(cur.odontograma || {}) }));
  const upsertPieza = (n, d) => {
    const carasAna = normalizarCarasAnatomicas(n, d.caras || {});
    return api.odontograma.guardar({
      pacienteId,
      denticion: denticionApi(denticion),
      fase,
      numeroPieza: n,
      estadoPieza: d.whole || null,
      estadosCara: JSON.stringify(carasAna),
      nota: notas[n] || null,
    }).then(recargarOd).catch(() => notify("Error al guardar la pieza."));
  };
  const filas = FILAS_DENTICION[denticion] || FILAS_DENTICION.adulto;
  // "borrar" no esta en ESTADOS_DIENTE: sin el ?. esto reventaba al elegirlo,
  // y el build no lo detecta porque solo falla al pulsar el boton.
  const esPorCara = ESTADOS_DIENTE[pincel]?.porCara ?? true;

  // SPEC §7.3: estados destructivos de pieza completa piden confirmación.
  const confirmarDestructivo = (estado) => {
    if (estado !== "extraer" && estado !== "ausente") return true;
    const lbl = estado === "extraer" ? "extracción indicada" : "ausente";
    return window.confirm(`¿Marcar la pieza como «${lbl}»? Esta acción es destructiva en el odontograma.`);
  };
  const aplicarCara = (n, caraGeo) => {
    const cara = geoAAnatomica(n, caraGeo);
    setSelNota(n); setNotaInput(notas[n] || "");
    // El borrador quita la marca de esa cara en vez de poner una nueva.
    if (pincel === "borrar") {
      const cleaned = normalizarCarasAnatomicas(n, (estados[n] || {}).caras || {});
      delete cleaned[cara];
      if (conectado) { upsertPieza(n, { whole: null, caras: cleaned }); return; }
      setOdon((st) => ({ ...st, [n]: { ...(st[n] || {}), caras: cleaned, whole: undefined } }));
      return;
    }
    if (!esPorCara && !confirmarDestructivo(pincel)) return;
    if (conectado) {
      const cur = estados[n] || {};
      const base = normalizarCarasAnatomicas(n, cur.caras || {});
      const d = esPorCara ? { caras: { ...base, [cara]: pincel } } : { whole: pincel, caras: base };
      upsertPieza(n, d);
      return;
    }
    setOdon((s) => {
      const d = { ...(s[n] || {}) };
      if (esPorCara) {
        d.caras = { ...normalizarCarasAnatomicas(n, d.caras || {}), [cara]: pincel };
        delete d.whole;
      } else { d.whole = pincel; }
      return { ...s, [n]: d };
    });
  };
  const aplicarWhole = (n) => {
    setSelNota(n); setNotaInput(notas[n] || "");
    if (pincel === "borrar") {                       // deja la pieza como estaba, sin marca
      if (conectado) { upsertPieza(n, { whole: null, caras: {} }); return; }
      setOdon((st) => { const c = { ...st }; delete c[n]; return c; });
      return;
    }
    if (!confirmarDestructivo(pincel)) return;
    if (conectado) { upsertPieza(n, { whole: pincel, caras: (estados[n] || {}).caras }); return; } setOdon((s) => ({ ...s, [n]: { ...(s[n] || {}), whole: pincel } })); };
  const limpiar = (n) => { if (conectado) { api.odontograma.guardar({ pacienteId, denticion: denticionApi(denticion), fase, numeroPieza: n, estadoPieza: null, estadosCara: "{}", nota: null }).then(recargarOd).catch(() => {}); return; } setOdon((s) => { const c = { ...s }; delete c[n]; return c; }); };

  const resumen = useMemo(() => {
    const cont = {};
    Object.values(estados).forEach((d) => {
      if (d.whole) cont[d.whole] = (cont[d.whole] || 0) + 1;
      if (d.caras) { const tipos = new Set(Object.values(d.caras)); tipos.forEach((t) => cont[t] = (cont[t] || 0) + 1); }
    });
    return cont;
  }, [estados]);

  const guardarNota = () => { if (!selNota) return; if (conectado) { const d = estados[selNota] || {}; api.odontograma.guardar({ pacienteId, denticion: denticionApi(denticion), fase, numeroPieza: selNota, estadoPieza: d.whole || null, estadosCara: JSON.stringify(normalizarCarasAnatomicas(selNota, d.caras || {})), nota: notaInput }).then(recargarOd).catch(() => {}); return; } updFicha(pacienteId, (cur) => ({ ...cur, notas: { ...(cur.notas || {}), [selNota]: notaInput } })); };
  // Bug #38 re-test: Estados que indican tratamiento completado (sano) NO deben contar como "afectadas"
  const ESTADOS_SANOS = ["obturado", "sellante", "corona", "endodoncia", "implante"];
  const esPiezaSana = (n) => {
    const d = estados[n];
    if (!d) return true; // sin estado = sana
    const ests = d.whole ? [d.whole] : Object.values(d.caras || {});
    // Si TODOS los estados de la pieza son tratamientos completados, la pieza es sana
    return ests.length > 0 && ests.every((e) => ESTADOS_SANOS.includes(e));
  };
  const piezasAfectadas = Object.keys(estados).filter((n) => {
    const tieneEstados = estados[n].whole || (estados[n].caras && Object.keys(estados[n].caras).length);
    return tieneEstados && !esPiezaSana(n);
  });
  // P0-2: del hallazgo al plan de tratamiento (misma ficha).
  const yaEnPlan = (nombre) => (fichas[pacienteId]?.tratamiento || []).some((f) => f.nombre === nombre);
  const agregarAlPlan = (n) => {
    const d = estados[n]; const ests = d.whole ? [d.whole] : Object.values(d.caras || {});
    const sug = ests.map((e) => SUGERENCIA_PLAN[e]).find(Boolean);
    if (!sug) { notify && notify("Esta pieza no requiere un procedimiento."); return; }
    const nombre = `${sug.p} – pieza ${n}`;
    if (yaEnPlan(nombre)) { notify && notify("Ya está en el plan de tratamiento."); return; }
    updFicha(pacienteId, (cur) => ({ ...cur, tratamiento: [...(cur.tratamiento || []), { id: Date.now(), nombre, costo: sug.c, estado: "pendiente", origen: "odontograma" }] }));
    notify && notify(`Agregado al plan: ${nombre} (S/ ${sug.c}).`);
  };

  const totalPiezas = [...filas.sup, ...filas.inf].reduce((n, f) => n + f.length, 0);
  const afectadas = piezasAfectadas.length;
  const atencionCount = piezasAfectadas.filter((n) => { const d = estados[n]; const ests = d.whole ? [d.whole] : Object.values(d.caras || {}); return ests.some((e) => ATENCION.includes(e)); }).length;
  const enPlan = (fichas[pacienteId]?.tratamiento || []).filter((f) => f.origen === "odontograma").length;
  /**
   * Indice de caries de la OMS. Cuenta PIEZAS (no caras): cariadas + perdidas por
   * caries + obturadas. Se escribe CPO-D en dientes permanentes y ceo-d, en
   * minusculas, en dientes de leche: son dos indices distintos y no se suman.
   * Un diente de leche se reconoce por su numero: la FDI les da del 51 al 85.
   */
  const indiceCaries = (temporales) => {
    let n = 0;
    for (const num of Object.keys(estados)) {
      const esTemporal = Number(num) >= 51;
      if (esTemporal !== temporales) continue;
      const d = estados[num] || {};
      const ests = d.whole ? [d.whole] : Object.values(d.caras || {});
      // DC-48: corona cuenta como Obturado (O) — R.M. 559-2022.
      if (ests.some((e) => ["caries", "obturado", "corona", "ausente", "extraer"].includes(e))) n++;
    }
    return n;
  };
  const cpod = indiceCaries(false);   // permanentes
  const ceod = indiceCaries(true);    // de leche
  const sinTomaEvol = fase === "evolucion" && Object.keys(estados).length === 0;
  const saludPct = sinTomaEvol ? null : Math.round(((totalPiezas - afectadas) / totalPiezas) * 100);
  const saludColor = saludPct == null ? "var(--dc-ink-400)" : saludPct >= 85 ? "var(--dc-ok-700)" : saludPct >= 60 ? "var(--dc-warn-600)" : "var(--dc-red)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: vistaOdo === "anatomico" ? 8 : 16 }}>
      {vistaOdo !== "anatomico" && (
        <PacienteBar pacientes={pacientes} pacienteId={pacienteId} setPacienteId={setPacienteId} modulo="Odontograma" sedeLabel={sedeLabelOdo || null} />
      )}

      {vistaOdo !== "anatomico" && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <KpiCard label="Salud bucal" value={sinTomaEvol ? "Sin toma" : `${saludPct}%`} color={saludColor} icon={<Smile size={18} strokeWidth={1.75} />} sub={sinTomaEvol ? "sin odontograma de evolución" : `${totalPiezas - afectadas} de ${totalPiezas} piezas sanas`} />
        <KpiCard label="Piezas afectadas" value={afectadas} color={NAVY} icon={<AlertCircle size={18} strokeWidth={1.75} />} sub="con hallazgos" />
        <KpiCard label="Requieren atención" value={atencionCount} color="var(--dc-red)" icon={<AlertTriangle size={18} strokeWidth={1.75} />} sub="caries, fractura, extraer…" />
        <KpiCard label="En plan" value={enPlan} color="var(--dc-ok-700)" icon={<ClipboardList size={18} strokeWidth={1.75} />} sub="derivadas a tratamiento" />
        {denticion === "mixta"
          ? <KpiCard label="ceo-d / CPO-D" value={`${ceod} / ${cpod}`} color={PED} icon={<Activity size={18} strokeWidth={1.75} />} sub="leche / permanentes – corona = O (R.M. 559-2022)" />
          : <KpiCard label={denticion === "infantil" || denticion === "nino" ? "Índice ceo-d" : "Índice CPO-D"} value={denticion === "infantil" || denticion === "nino" ? ceod : cpod}
              color={denticion === "infantil" || denticion === "nino" ? PED : NAVY} icon={<Activity size={18} strokeWidth={1.75} />}
              sub={(denticion === "infantil" || denticion === "nino" ? "dientes de leche" : "dientes permanentes") + " – corona = O (R.M. 559-2022)"} />}
      </div>
      )}
      {vistaOdo !== "anatomico" && odRemoto.precargaInicial && fase === "evolucion" && (
        <div style={{ fontSize: 13, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", borderRadius: "var(--dc-r-md)", padding: "9px 13px" }}>
          Vista precargada desde odontograma inicial (aún no hay toma de evolución guardada).
        </div>
      )}

    <div style={{ display: "grid", gridTemplateColumns: vistaOdo === "anatomico" ? "1fr" : "1fr 300px", gap: 16 }} className="dc-trat">
      <div>
        <Card style={vistaOdo === "anatomico"
          ? { padding: 0, marginBottom: 0, background: "transparent", border: "none", boxShadow: "none" }
          : { padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: vistaOdo === "anatomico" ? 8 : 8 }}>
            {vistaOdo !== "anatomico" && (
              <>
                <h3 style={{ margin: 0, color: NAVY, fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  Odontograma — {paciente.nombre}
                  {edadPac != null && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-500)" }}>– {edadPac} años</span>}
                  {esPed && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: "var(--dc-r-full)", background: PED_SUAVE, border: `1px solid ${PED_LINEA}`, color: PED, fontSize: 12, fontWeight: 500, letterSpacing: ".03em", textTransform: "uppercase" }}>
                    <EmblemaNino size={14} /> Odontopediatría
                  </span>}
                </h3>
                <div style={{ fontSize: 12, color: "var(--dc-ink-500)", margin: "4px 0 0", width: "100%" }}>Numeración FDI con punto – R.M. 559-2022-MINSA</div>
              </>
            )}
            <div className={vistaOdo === "anatomico" ? "dc-odo-bar" : undefined} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: "100%" }}>
              {vistaOdo === "anatomico" && paciente && paciente.nombre && (
                <span className="dc-odo-bar__av" style={{ "--av": colorDe(paciente.nombre) }}>{iniciales(paciente.nombre)}</span>
              )}
              {vistaOdo === "anatomico" && (
                <Select
                  width={240}
                  ariaLabel="Paciente"
                  value={(pacienteId == null || (typeof pacienteId === "number" && Number.isNaN(pacienteId))) ? "" : pacienteId}
                  onChange={(v) => setPacienteId(/^\d+$/.test(String(v)) ? Number(v) : v)}
                  placeholder="Selecciona un paciente…"
                  options={[
                    { value: "", label: "Selecciona un paciente…", disabled: true },
                    ...pacientes.map((x) => ({ value: x.id, label: x.nombre })),
                  ]}
                />
              )}
              {vistaOdo !== "anatomico" && (
                <div style={{ display: "flex", gap: 4, background: "var(--dc-bg-alt)", padding: 4, borderRadius: "var(--dc-r-md)" }}>
                  {FASES_ODO.map(([k, l]) => (
                    <button key={k} onClick={() => setFase(k)} aria-pressed={fase === k}
                      style={{ padding: "6px 14px", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                               background: fase === k ? "#fff" : "transparent", color: fase === k ? NAVY : "var(--dc-ink-400)",
                               boxShadow: fase === k ? "0 1px 2px rgba(16,24,40,.12)" : "none" }}>{l}</button>
                  ))}
                </div>
              )}
              {pacienteId && <Btn small kind="ghost" onClick={() => { setFmTab("historia"); setFmOpen(true); }}><FileText size={14} strokeWidth={1.75} /> Ficha del paciente</Btn>}
              {/* En la vista anatómica el plan de inversión ya está dentro del odontograma. */}
              {vistaOdo !== "anatomico" && <Btn small kind="ghost" onClick={abrirPlanInv} title="Plan de inversión imprimible"><Printer size={14} strokeWidth={1.75} /> Plan de inversión</Btn>}
              <label className="dc-odo-bar__zoom" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--dc-line)", borderRadius: 999, padding: "4px 12px", marginLeft: "auto" }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>Zoom</span>
                <input type="range" min="50" max="130" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="Tamaño de los dientes" style={{ width: 110, accentColor: DS.c.primary }} />
                <span style={{ fontSize: 12, color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums", width: 36 }}>{zoom}%</span>
              </label>
              {vistaOdo !== "anatomico" && (
                <>
                  <button onClick={guardarToma} title="Guardar snapshot datado de la fase actual"
                    style={{ padding: "7px 12px", borderRadius: "var(--dc-r-sm)", border: "1px solid var(--dc-line)", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, color: DS.c.primary }}>Guardar toma</button>
                  {tomas.length > 0 && (
                    <Select small width={200} ariaLabel="Tomas guardadas" value={tomaSel} onChange={(v) => { setTomaSel(v); if (v) cargarToma(v); }}
                      options={[{ value: "", label: "Tomas guardadas…" }, ...tomas.map((tm) => ({ value: tm.id, label: `${tm.fecha} – ${tm.etiqueta}` }))]} />
                  )}
                </>
              )}
            </div>
          </div>
          {vistaOdo !== "anatomico" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={limpiarCapa}
              style={{ marginLeft: "auto", background: "#fff", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "8px 14px",
                       cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--dc-red)" }}>
              Limpiar fase
            </button>
            <div style={{ display: "flex", gap: 5, background: "var(--dc-bg)", padding: 4, borderRadius: "var(--dc-r-sm)" }}>
              {DENTICIONES_ODO.map(([k, l]) => (
                <button key={k} onClick={() => setDenticion(k)} style={{ padding: "6px 13px", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: denticionApi(denticion) === k ? NAVY : "transparent", color: denticionApi(denticion) === k ? "#fff" : "var(--dc-ink-400)" }}>{l}</button>
              ))}
            </div>
          </div>
          )}
          {vistaOdo !== "anatomico" && edadPac != null && denticionApi(denticion) !== DENTICION_POR_EDAD(edadPac) && (
            <div style={{ fontSize: 13, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", borderRadius: "var(--dc-r-md)", padding: "9px 13px", margin: "0 0 14px" }}>
              Con {edadPac} año{edadPac === 1 ? "" : "s"} lo normal sería la dentición
              <b> {{ infantil: "de leche", mixta: "mixta", adulto: "de adulto" }[DENTICION_POR_EDAD(edadPac)]}</b>. Comprueba que estás marcando en la pieza correcta.
            </div>
          )}
          <div style={{ display: vistaOdo === "anatomico" ? "block" : "none" }}>
            <OdontogramaAnatomico
              ref={anatomicoRef}
              pacienteId={pacienteId}
              pacienteNombre={(pacientes.find((x) => x.id === pacienteId) || {}).nombre || ""}
              pacienteDni={(pacientes.find((x) => x.id === pacienteId) || {}).dni || ""}
              pacienteEdad={edadPac != null ? edadPac : ""}
              pacienteHc=""
              pacienteSede={sedeLabelOdo}
              capa={fase}
              denticion={denticionApi(denticion)}
              zoom={zoom}
              notify={notify}
              editable={conectado}
              conExpediente={false}
              onFaseChange={(f) => { if (f && f !== fase) setFase(f); }}
              onNavTab={(tab) => {
                if (!pacienteId) { notify && notify("Elige un paciente primero."); return; }
                // Pestaña Odontograma del chrome: volver al chart sin overlay.
                if (tab === "odontograma") { cerrarFichaOdo(); return; }
                // Abrir ficha encima sin cambiar de módulo (antes #/pacientes te sacaba del odontograma).
                setFmTab(tab || "historia");
                setFmOpen(true);
              }}
            />
          </div>
          {vistaOdo === "clasico" && (<>
          {/* El indice de caries cambia de nombre segun la denticion: en dientes de
              leche se escribe en minusculas (ceo-d) y en permanentes en mayusculas
              (CPO-D). Es la convencion de la OMS y un odontopediatra lo espera asi. */}
          <p style={{ color: "var(--dc-ink-400)", margin: "0 0 16px", fontSize: 14 }}>
            Elige un estado y toca la <strong>cara</strong> del diente (vestibular, lingual/palatino, mesial, distal u oclusal/incisal).
            Los que van marcados como <em>(pieza)</em> se aplican al diente entero. Toca el <strong>número</strong> para escribir una nota de esa pieza.
          </p>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 18 }}>
            {[...Object.entries(ESTADOS_DIENTE).filter(([k]) => k !== "sano"),
              ["borrar", { l: "Borrar", color: "var(--dc-bg)", borde: "var(--dc-ink-400)", porCara: true }]].map(([k, v]) => (
              <button key={k} onClick={() => setPincel(k)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: "var(--dc-r-full)", cursor: "pointer", border: `1.5px solid ${pincel === k ? NAVY : "var(--dc-line)"}`, background: pincel === k ? "var(--dc-bg)" : "#fff", fontSize: 13, fontWeight: 500, color: NAVY }}>
                <span style={{ width: 13, height: 13, borderRadius: "var(--dc-r-sm)", background: v.color, border: `1.5px solid ${v.borde}` }} /> {v.l}
                {!v.porCara && <span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>(pieza)</span>}
              </button>
            ))}
          </div>
          {/* En mixta son cuatro filas: los permanentes por fuera y los de leche por
              dentro, que es como se dibuja un odontograma mixto de verdad. */}
          <div style={{ background: esPed ? PED_SUAVE : "var(--dc-bg)", border: esPed ? `1px solid ${PED_LINEA}` : "1px solid transparent", borderRadius: "var(--dc-r-lg)", padding: "20px 12px", overflowX: "hidden", maxWidth: "100%" }}>
            {/* Numeración en píldoras y cuadrantes rotulados, como en un odontograma
                de verdad: el odontólogo dicta "pieza 26" y necesita encontrarla sin
                contar dientes. La píldora se oscurece si esa pieza tiene algo marcado,
                así se ve de un vistazo dónde hay hallazgos sin leer el detalle. */}
            {(() => {
              const pildora = (n) => {
                const d = estados[n];
                const tocada = !!(d && (d.whole || Object.keys(d.caras || {}).length));
                return (
                  <span key={"p" + n} onClick={() => setSelNota(n)} title={`Pieza ${formatearFDI(n)}`}
                    style={{ width: 30, display: "inline-grid", placeItems: "center", height: 21, borderRadius: "var(--dc-r-full)",
                             fontSize: 11, fontWeight: 500, cursor: "pointer",
                             background: tocada ? NAVY : "#fff", color: tocada ? "#fff" : "var(--dc-ink-400)",
                             border: `1px solid ${tocada ? NAVY : "var(--dc-line)"}` }}>{formatearFDI(n)}</span>);
              };
              const filaNumeros = (fila, key) => (
                <div key={key} style={{ display: "flex", gap: 5, justifyContent: "center", minWidth: filas.ancho }}>
                  {fila.map((n) => <span key={n} style={{ width: 54, display: "grid", placeItems: "center" }}>{pildora(n)}</span>)}
                </div>
              );
              const filaDientes = (fila, key) => (
                <div key={key} style={{ display: "flex", gap: 5, justifyContent: "center", minWidth: filas.ancho }}>
                  {fila.map((n) => <DienteSVG key={n} n={n} data={estados[n] ? { ...estados[n], caras: carasParaPintar(n, estados[n].caras) } : estados[n]} onCara={aplicarCara} onWhole={aplicarWhole} />)}
                </div>
              );
              const rotulo = { fontSize: 12, fontWeight: 500, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--dc-ink-400)" };
              return (
                <div style={{ position: "relative", transform: `scale(${zoom / 74})`, transformOrigin: "top center",
                              // el alto se ajusta al zoom para que no queden huecos ni recortes
                              marginBottom: zoom > 74 ? (zoom - 74) * 3 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={rotulo}>Superior derecho – cuadrante {denticionApi(denticion) === "infantil" ? 5 : 1}</span>
                    <span style={rotulo}>Superior izquierdo – cuadrante {denticionApi(denticion) === "infantil" ? 6 : 2}</span>
                  </div>
                  {filas.sup.map((f, i) => [filaNumeros(f, "ns" + i), filaDientes(f, "ds" + i)])}
                  <div style={{ borderTop: `1px dashed ${esPed ? PED_LINEA : "var(--dc-ink-200)"}`, margin: "12px 0" }} />
                  {filas.inf.map((f, i) => [filaDientes(f, "di" + i), filaNumeros(f, "ni" + i)])}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={rotulo}>Inferior derecho – cuadrante {denticionApi(denticion) === "infantil" ? 8 : 4}</span>
                    <span style={rotulo}>Inferior izquierdo – cuadrante {denticionApi(denticion) === "infantil" ? 7 : 3}</span>
                  </div>
                  {/* la línea media, que separa el lado derecho del izquierdo */}
                  <div style={{ position: "absolute", left: "50%", top: 22, bottom: 22, borderLeft: "1px dashed var(--dc-ink-200)", pointerEvents: "none" }} />
                </div>
              );
            })()}
            {denticion === "mixta" && (
              <div style={{ textAlign: "center", fontSize: 12, color: PED, marginTop: 12, fontWeight: 500 }}>
                Filas de fuera: dientes permanentes – Filas de dentro: dientes de leche
              </div>
            )}
          </div>
          </>)}
        </Card>

        {/* Hallazgos listados */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--dc-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT, display: "flex", alignItems: "center", gap: 7 }}><ClipboardList size={15} strokeWidth={1.75} color={NAVY} /> Hallazgos del paciente</h3>
            {piezasAfectadas.length > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", background: "var(--dc-line)", padding: "3px 10px", borderRadius: "var(--dc-r-full)" }}>{piezasAfectadas.length} pieza(s)</span>}
          </div>
          {piezasAfectadas.length === 0 && <Vacio icon={<Smile size={24} strokeWidth={1.75} />} titulo="Boca sana" sub="Marca un estado y haz clic en una cara del diente." />}
          {piezasAfectadas.sort((a, b) => Number(a) - Number(b)).map((n) => {
            const d = estados[n];
            // DC-52: excluir estado sano de la tabla de hallazgos.
            const partes = (d.whole
              ? [{ parte: "Toda la pieza", est: d.whole }]
              : Object.entries(d.caras || {}).map(([cara, est]) => ({ parte: caraOdontoLabel(n, cara), est }))
            ).filter((pt) => pt.est && pt.est !== "sano");
            if (!partes.length) return null;
            const att = partes.some((pt) => ATENCION.includes(pt.est));
            return (
              <div key={n} onClick={() => setDetP(n)} title="Ver detalle de la pieza" style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 20px", borderTop: "1px solid var(--dc-line)", background: att ? "var(--dc-white)" : "#fff" }}>
                <div style={{ width: 40, height: 34, borderRadius: "var(--dc-r-sm)", background: NAVY, color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12, fontFamily: DISPLAY_FONT, flexShrink: 0 }}>{formatearFDI(n)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {partes.map((pt, i) => { const v = metaEstado(pt.est); const ini = inicialCara(n, pt.parte); return (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: "3px 9px", fontSize: 12 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-sm)", background: v.color, border: `1px solid ${v.borde}` }} />
                        {ini ? <span style={{ color: "var(--dc-ink-400)", fontWeight: 600 }}>{ini}</span> : null}
                        <span style={{ color: "var(--dc-ink-400)", fontWeight: 500 }}>{pt.parte}</span><span style={{ color: v.borde, fontWeight: 500 }}>{v.l}</span>
                      </span>
                    ); })}
                  </div>
                  {notas[n] && <div style={{ fontSize: 12, color: "var(--dc-ink-500)", marginTop: 6, fontStyle: "italic", display: "flex", gap: 5 }}><FileText size={12} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> {notas[n]}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => agregarAlPlan(n)} title="Agregar al plan de tratamiento" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--dc-bg)", border: "1px solid var(--dc-line-alt2)", borderRadius: "var(--dc-r-sm)", padding: "5px 9px", cursor: "pointer", color: NAVY, fontWeight: 500, fontSize: 12 }}><Plus size={13} strokeWidth={1.75} /> Al plan</button>
                  <button type="button" className="dc-icon-btn" aria-label="Quitar" onClick={() => limpiar(n)} title="Quitar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dc-ink-500)" }}><X size={16} strokeWidth={1.75} /></button>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Panel lateral: solo en vista clásica (la anatómica trae lupa/hallazgos propios). */}
      {vistaOdo !== "anatomico" && (
      <div>
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 14px", color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Resumen clínico</h3>
          {Object.keys(resumen).length === 0 && <p style={{ color: "var(--dc-ink-500)", fontSize: 13 }}>Sin datos aún.</p>}
          {Object.entries(resumen).map(([k, v]) => {
            const meta = metaEstado(k);
            return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0" }}>
              <span style={{ width: 13, height: 13, borderRadius: "var(--dc-r-sm)", background: meta.color, border: `1.5px solid ${meta.borde}` }} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--dc-ink-700)" }}>{meta.l}</span>
              <span style={{ fontWeight: 500, color: NAVY }}>{v}</span>
            </div>
            );
          })}
        </Card>
        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 6px", color: NAVY, fontSize: 14, fontWeight: 500 }}>Nota de la pieza {selNota}</h3>
          <p style={{ color: "var(--dc-ink-500)", fontSize: 13, margin: "0 0 10px" }}>Haz clic en un diente para seleccionarlo y escribir una observación.</p>
          <textarea className="dc-premium-inp" value={notaInput} onChange={(e) => setNotaInput(e.target.value)} placeholder="Ej. Caries profunda, evaluar endodoncia..." style={{ width: "100%", minHeight: 90, padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: NAVY }} />
          <div style={{ marginTop: 10 }}><Btn small full onClick={guardarNota}><CheckCircle2 size={15} strokeWidth={1.75} /> Guardar nota</Btn></div>
        </Card>
      </div>
      )}
    </div>
    {detP && (() => { const d = estados[detP] || {}; const partes = d.whole ? [{ parte: "Toda la pieza", est: d.whole }] : Object.entries(d.caras || {}).map(([cara, est]) => ({ parte: caraOdontoLabel(detP, cara), est })); return (
      <Modal icon={<span style={{ fontWeight: 500, fontSize: 14 }}>{formatearFDI(detP)}</span>} tone={NAVY} titulo={`Pieza ${formatearFDI(detP)}`} sub="Detalle del hallazgo" onClose={() => setDetP(null)} maxW={440}
        footer={<><Btn small kind="ghost" onClick={() => { limpiar(detP); setDetP(null); }}><Trash2 size={15} strokeWidth={1.75} /> Quitar</Btn><Btn small onClick={() => { agregarAlPlan(detP); setDetP(null); }}><Plus size={15} strokeWidth={1.75} /> Al plan</Btn></>}>
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {partes.map((pt, i) => { const v = metaEstado(pt.est); return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "10px 13px" }}>
              <span style={{ width: 14, height: 14, borderRadius: "var(--dc-r-sm)", background: v.color, border: `1.5px solid ${v.borde}`, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>{pt.parte}</span>
              <span style={{ fontSize: 13, color: v.borde, fontWeight: 500 }}>{v.l}</span>
            </div>
          ); })}
        </div>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Nota clínica</label>
        <textarea className="dc-premium-inp" defaultValue={notas[detP] || ""} onChange={(e) => updFicha(pacienteId, (cur) => ({ ...cur, notas: { ...(cur.notas || {}), [detP]: e.target.value } }))} rows={3} placeholder="Observación de la pieza…" style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "var(--dc-bg)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
      </Modal>
    ); })()}
    {showPlanInv && (
      <PlanInversionDocumento
        paciente={{ nombre: paciente.nombre, documento: paciente.dni }}
        pacienteId={pacienteId}
        capa={fase}
        sedeId={sedeIdPlan}
        anexoDataUrl={anexoPlan}
        hallazgos={piezasAfectadas.flatMap((n) => {
          const d = estados[n] || {};
          const rows = [];
          if (d.whole && d.whole !== "sano") rows.push([Number(n), d.whole, "pieza"]);
          Object.entries(d.caras || {}).forEach(([cara, est]) => {
            if (est && est !== "sano") rows.push([Number(n), est, caraOdontoLabel(n, cara)]);
          });
          return rows;
        })}
        onClose={() => { setShowPlanInv(false); setAnexoPlan(null); }}
      />
    )}
    {fmOpen && pacienteId && (
      <React.Suspense fallback={<div style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", background: "rgba(15,23,42,.35)", color: "#fff", fontSize: 14 }}>Cargando ficha…</div>}>
        <FichaMedica
          pacienteId={pacienteId}
          onClose={cerrarFichaOdo}
          notify={notify}
          can={can}
          rol={rol}
          sedeId={sedeIdPlan}
          initialTab={fmTab || "historia"}
        />
      </React.Suspense>
    )}
    {fmShield && (
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 80, cursor: "default" }} />
    )}
    </div>
  );
}

/* ---- Tratamientos (plan de tratamiento = fuente de los cargos) ---- */
function Tratamientos({ pacientes: pacProp, fichas, updFicha, notify, pacienteActivo, consumirInsumos, can }) {
  // Cobrar una fase es caja, no plan de tratamiento. Gerencia consulta el plan; el
  // cobro lo hace quien tiene caja (recepción, administración).
  const puedeCobrar = can ? can("facturacion", "crear") : true;
  const conectado = !!auth.token;
  const [pacRemoto, setPacRemoto] = useState(null);
  const [sedes, setSedes] = useState([]);
  useEffect(() => { if (conectado) { api.pacientes.listar().then((r) => setPacRemoto((r || []).map((p) => ({ id: p.id, nombre: p.nombre })))).catch(() => {}); api.sedes.listar().then((s) => setSedes(s || [])).catch(() => {}); } }, []); // eslint-disable-line
  const pacientes = conectado ? (pacRemoto || []) : pacProp;
  const [pacienteId, setPacienteId] = useState(pacienteActivo || (auth.token ? null : pacProp[0]?.id) || null);
  useEffect(() => { if (pacienteActivo) setPacienteId(pacienteActivo); }, [pacienteActivo]);
  useEffect(() => {
    if (!conectado || !pacRemoto) return;
    if (!pacRemoto.length) { setPacienteId(null); return; }
    if (pacienteId && !pacRemoto.some((p) => p.id === pacienteId)) setPacienteId(null);
  }, [pacRemoto]); // eslint-disable-line
  const [nueva, setNueva] = useState(null); // { nombre, costo } al agregar fase
  const [detF, setDetF] = useState(null); // fase abierta en modal de detalle
  const [planId, setPlanId] = useState(null);
  const [fasesRem, setFasesRem] = useState([]);
  const recargarTrat = () => { if (conectado && pacienteId) api.tratamientos.porPaciente(pacienteId).then((planes) => { const ps = planes || []; setPlanId(ps[0]?.plan?.id || null); const fs = []; ps.forEach((pf) => (pf.fases || []).forEach((f) => fs.push({ id: f.id, nombre: f.nombre, costo: Number(f.costo) || 0, estado: f.estado, planId: f.planId, piezaNumero: f.piezaNumero ?? null, cara: f.cara || null, servicioId: f.servicioId || null }))); setFasesRem(fs); }).catch(() => {}); };
  useEffect(() => { if (pacienteId) recargarTrat(); else setFasesRem([]); }, [pacienteId, conectado]); // eslint-disable-line
  const paciente = pacientes.find((p) => p.id === pacienteId) || { id: pacienteId, nombre: "Selecciona un paciente" };
  const fases = conectado ? fasesRem : (fichas[pacienteId]?.tratamiento || []);
  const piezaDeFase = (f) => {
    if (f.piezaNumero != null && f.piezaNumero !== "") return String(f.piezaNumero);
    const m = String(f.nombre || "").match(/pieza\s*(\d+)/i);
    return m ? m[1] : "—";
  };
  const caraDeFase = (f) => (f.cara && String(f.cara).trim()) || "—";
  const nombreFaseLimpio = (f) => String(f.nombre || "").replace(/\s*[-–]?\s*pieza\s*\d+/i, "").trim() || f.nombre;
  const total = fases.reduce((s, f) => s + f.costo, 0), pagado = fases.filter((f) => f.estado === "atendida").reduce((s, f) => s + f.costo, 0), saldo = total - pagado;
  const inp = { width: "100%", padding: "9px 11px", borderRadius: "var(--dc-r-sm)", border: "1.5px solid var(--dc-line)", fontSize: 13, color: NAVY, outline: "none", boxSizing: "border-box" };
  const sedePago = () => (sedes[0]?.id) || null;
  const setTrat = (fn) => updFicha(pacienteId, (cur) => ({ ...cur, tratamiento: fn(cur.tratamiento || []) }));
  const addPago = (concepto, monto) => updFicha(pacienteId, (cur) => ({ ...cur, pagos: [...(cur.pagos || []), { fecha: fmt(hoy), concepto, monto, metodo: "Caja" }] }));
  const agregarFase = () => {
    if (!nueva.nombre.trim()) { notify("Indica el nombre de la fase."); return; }
    if (conectado) {
      const payload = { nombre: nueva.nombre.trim(), costo: Number(nueva.costo) || 0 };
      if (nueva.servicioId) payload.servicioId = nueva.servicioId;
      if (nueva.pieza) payload.piezaNumero = Number(nueva.pieza);
      if (nueva.cara && String(nueva.cara).trim()) payload.cara = String(nueva.cara).trim();
      const doAdd = (pid) => api.tratamientos.agregarFase(pid, payload).then(() => { notify("Fase agregada al plan."); setNueva(null); recargarTrat(); }).catch(() => notify("Error al agregar la fase."));
      if (planId) doAdd(planId); else api.tratamientos.crearPlan({ pacienteId, nombre: "Plan de tratamiento" }).then((p) => { setPlanId(p.id); doAdd(p.id); }).catch(() => notify("Error al crear el plan."));
      return;
    }
    setTrat((t) => [...t, { id: Date.now(), nombre: nueva.nombre.trim(), costo: Number(nueva.costo) || 0, estado: "pendiente", servicioId: nueva.servicioId || null, piezaNumero: nueva.pieza ? Number(nueva.pieza) : null, cara: nueva.cara || null }]); notify("Fase agregada al plan."); setNueva(null);
  };
  const quitarFase = (f) => { if (conectado) { api.tratamientos.borrarFase(f.id).then(() => { notify("Fase eliminada del plan."); recargarTrat(); }).catch(() => notify("Error al eliminar la fase.")); return; } setTrat((t) => t.filter((x) => x.id !== f.id)); notify("Fase eliminada del plan."); };
  const esInvasivo = (nom) => /endodoncia|cirug|implante|extracci|bracket|ortodoncia/i.test(nom || "");
  const cobrarFase = (f) => {
    if (conectado) {
      api.tratamientos.actualizarFase(f.id, { estado: "atendida" })
        .then(() => api.pagos.registrar({ pacienteId, sedeId: sedePago(), faseId: f.id, concepto: f.nombre, monto: f.costo, metodo: "efectivo" }))
        .then(() => { notify(`Cobrado: ${f.nombre} — S/ ${f.costo.toFixed(2)}. Comprobante registrado (todavía no se envía a SUNAT).`); recargarTrat(); })
        .catch((err) => notify((err && err.message) || "Error al cobrar la fase. Verifica el consentimiento firmado."));
      return;
    }
    if (esInvasivo(f.nombre)) {
      notify(`Aviso: ${f.nombre} es un procedimiento invasivo. Asegúrate de que el consentimiento informado esté firmado.`);
    }
    setTrat((t) => t.map((x) => x.id === f.id ? { ...x, estado: "atendida" } : x)); addPago(f.nombre, f.costo); consumirInsumos && consumirInsumos(f.nombre); notify(`Cobrado: ${f.nombre} — S/ ${f.costo.toFixed(2)}. Boleta emitida – insumos descontados.`);
  };
  const cobrarSaldo = () => { const pend = fases.filter((f) => f.estado !== "atendida"); if (!pend.length) { notify("No hay saldo por cobrar."); return; } if (conectado) { Promise.all(pend.map((f) => api.tratamientos.actualizarFase(f.id, { estado: "atendida" }))).then(() => api.pagos.registrar({ pacienteId, sedeId: sedePago(), concepto: "Saldo del plan de tratamiento", monto: saldo, metodo: "efectivo" })).then(() => { notify(`Pago registrado: S/ ${saldo.toFixed(2)}. Comprobante registrado (todavía no se envía a SUNAT).`); recargarTrat(); }).catch(() => notify("Error al cobrar el saldo.")); return; } pend.forEach((f) => consumirInsumos && consumirInsumos(f.nombre)); setTrat((t) => t.map((x) => x.estado !== "atendida" ? { ...x, estado: "atendida" } : x)); addPago("Saldo del plan de tratamiento", saldo); notify(`Pago registrado: S/ ${saldo.toFixed(2)}. Boleta emitida – insumos descontados.`); };
  const atendidas = fases.filter((f) => f.estado === "atendida").length;
  const avance = fases.length ? Math.round((atendidas / fases.length) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 16 }}>
      <PacienteBar pacientes={pacientes} pacienteId={pacienteId} setPacienteId={setPacienteId} modulo="Plan de tratamiento" extra={fases.length > 0 && (
        <div className="dc-trat-met">
          <div className="dc-trat-met__anillo" style={{ "--p": avance }}><b>{avance}%</b><span>avance</span></div>
          <div className="dc-trat-met__cifras">
            <div><b>S/ {total.toLocaleString("es-PE")}</b><span>Total del plan</span></div>
            <div><b>S/ {pagado.toLocaleString("es-PE")}</b><span>Cobrado</span></div>
            <div className={saldo > 0 ? "is-saldo" : ""}><b>S/ {saldo.toLocaleString("es-PE")}</b><span>{saldo > 0 ? "Por cobrar" : "Al día"}</span></div>
          </div>
        </div>
      )} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }} className="dc-trat">
      <Card className="dc-trat-plan" style={{ padding: 0, overflow: "hidden", height: "fit-content" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ margin: 0, color: NAVY, fontSize: 14.5, fontWeight: 700 }}>Fases del plan <span className="dc-trat-plan__n">{atendidas}/{fases.length} atendidas</span></h3><Btn small onClick={() => setNueva({ nombre: "", costo: "", pieza: "", cara: "" })}><Plus size={15} strokeWidth={1.75} /> Fase</Btn></div>
        {nueva && (
          <div style={{ padding: "14px 20px", background: "var(--dc-bg)", borderBottom: "1px solid var(--dc-line)", display: "grid", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--dc-ink-700)", fontWeight: 500 }}>Del catálogo de servicios <span style={{ color: "var(--dc-ink-400)", fontWeight: 500 }}>– autocompleta procedimiento y precio</span><br />
              <Select value="" placeholder="Elegir servicio…"
                      onChange={(v) => { const s = getServicios().find((x) => String(x.id) === String(v)); if (s) setNueva({ ...nueva, nombre: s.nombre, costo: String(s.monto), servicioId: s.id }); }}
                      options={getServicios().map((s) => ({ value: s.id, label: `${s.nombre} — S/ ${s.monto}` }))} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 0.7fr 1fr auto", gap: 10, alignItems: "end" }}>
              <label style={{ fontSize: 12, color: "var(--dc-ink-700)", fontWeight: 500 }}>Procedimiento<br /><input className="dc-premium-inp" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value, servicioId: undefined })} placeholder="Ej. Obturación" style={{ ...inp, marginTop: 4 }} /></label>
              <label style={{ fontSize: 12, color: "var(--dc-ink-700)", fontWeight: 500 }}>Pieza<br /><input className="dc-premium-inp" value={nueva.pieza || ""} onChange={(e) => setNueva({ ...nueva, pieza: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="16" style={{ ...inp, marginTop: 4 }} /></label>
              <label style={{ fontSize: 12, color: "var(--dc-ink-700)", fontWeight: 500 }}>Cara<br /><input className="dc-premium-inp" value={nueva.cara || ""} onChange={(e) => setNueva({ ...nueva, cara: e.target.value })} placeholder="O" style={{ ...inp, marginTop: 4 }} /></label>
              <label style={{ fontSize: 12, color: "var(--dc-ink-700)", fontWeight: 500 }}>Costo (S/)<br /><input className="dc-premium-inp" type="number" value={nueva.costo} onChange={(e) => setNueva({ ...nueva, costo: e.target.value })} placeholder="120" style={{ ...inp, marginTop: 4 }} /></label>
              <div style={{ display: "flex", gap: 6 }}><Btn small onClick={agregarFase}><Check size={15} strokeWidth={1.75} /></Btn><Btn small kind="ghost" onClick={() => setNueva(null)}><X size={15} strokeWidth={1.75} /></Btn></div>
            </div>
          </div>
        )}
        {fases.length === 0 && !nueva && <Vacio icon={<ClipboardList size={24} strokeWidth={1.75} />} titulo="Sin tratamiento" sub="Agrega la primera fase, o créalas desde el odontograma." />}
        {fases.length > 0 && (
          <div className="dc-table-head" style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1.6fr) 64px 72px 96px 150px", gap: 8, padding: "8px 20px", borderBottom: "1px solid var(--dc-line)", fontSize: 11, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            <span>#</span><span>Procedimiento</span><span>Pieza</span><span>Cara</span><span style={{ textAlign: "right" }}>Costo</span><span style={{ textAlign: "right" }}>Estado</span>
          </div>
        )}
        {fases.map((f, i) => (
          <div key={f.id} className={`dc-trat-fila${f.estado === "atendida" ? " is-ok" : ""}`} onClick={() => setDetF(f)} title="Ver detalle" style={{ cursor: "pointer", display: "grid", gridTemplateColumns: "40px minmax(0,1.6fr) 64px 72px 96px 150px", gap: 8, alignItems: "center", padding: "14px 20px", borderBottom: i < fases.length - 1 ? "1px solid var(--dc-line)" : "none" }}>
            <div className="dc-trat-num" style={{ width: 28, height: 28, borderRadius: "var(--dc-r-sm)", background: f.estado === "atendida" ? "var(--dc-ok-soft)" : "var(--dc-line)", color: f.estado === "atendida" ? "var(--dc-ok-700)" : "var(--dc-ink-500)", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 13, flexShrink: 0 }}>{f.estado === "atendida" ? "✓" : i + 1}</div>
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY }}>{nombreFaseLimpio(f)} {f.origen === "odontograma" && <span style={{ fontSize: 12, color: DS.c.primary, background: "var(--dc-accent-soft)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-full)", padding: "1px 7px", fontWeight: 500 }}>del odontograma</span>}</div></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, fontVariantNumeric: "tabular-nums" }}>{piezaDeFase(f)}</div>
            <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>{caraDeFase(f)}</div>
            <div style={{ fontSize: 13, color: "var(--dc-ink-700)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>S/ {f.costo.toFixed(2)}</div>
            {f.estado === "atendida"
              ? <div style={{ display: "flex", justifyContent: "flex-end" }}><Badge estado={f.estado} /></div>
              : <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>{puedeCobrar && <button type="button" className="dc-accion" onClick={() => cobrarFase(f)}><DollarSign size={13} strokeWidth={2} style={{ marginRight: 4 }} />Cobrar</button>}{puedeCobrar && <button type="button" className="dc-icon-btn" aria-label="Quitar" onClick={() => quitarFase(f)} title="Quitar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dc-ink-500)" }}><X size={16} strokeWidth={1.75} /></button>}</div>}
          </div>
        ))}
      </Card>
      {detF && (() => { const f = fases.find((x) => x.id === detF.id) || detF; return (
        <Modal icon={<ClipboardList size={20} strokeWidth={1.75} />} tone={NAVY} titulo={f.nombre} sub={`Fase del plan – ${paciente.nombre}`} onClose={() => setDetF(null)} maxW={460}
          footer={(f.estado === "atendida" || !puedeCobrar) ? <Btn small kind="ghost" onClick={() => setDetF(null)}>Cerrar</Btn> : <><Btn small kind="ghost" onClick={() => { quitarFase(f); setDetF(null); }}><Trash2 size={15} strokeWidth={1.75} /> Quitar</Btn><Btn small onClick={() => { cobrarFase(f); setDetF(null); }}><DollarSign size={15} strokeWidth={1.75} /> Cobrar S/ {f.costo.toFixed(0)}</Btn></>}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Procedimiento</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500, textAlign: "right" }}>{nombreFaseLimpio(f)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Pieza</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{piezaDeFase(f)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Cara</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{caraDeFase(f)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Costo</span><span style={{ fontSize: 14, color: NAVY, fontWeight: 600, fontFamily: DISPLAY_FONT }}>S/ {f.costo.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Estado</span><Badge estado={f.estado} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Origen</span><span style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>{f.origen === "odontograma" ? "Derivado del odontograma" : "Agregado manualmente"}</span></div>
          </div>
        </Modal>
      ); })()}
      <Card className="dc-trat-fin" style={{ padding: 22, height: "fit-content" }}>
        <h3 style={{ margin: "0 0 12px", color: NAVY, fontSize: 14.5, fontWeight: 700 }}>Resumen financiero</h3>
        <div className="dc-trat-fin__barra" role="img" aria-label={`Cobrado ${total ? Math.round((pagado / total) * 100) : 0}% del plan`}><i style={{ width: `${total ? Math.min(100, (pagado / total) * 100) : 0}%` }} /></div>
        <div className="dc-trat-fin__ley"><span><i className="is-ok" />Cobrado {total ? Math.round((pagado / total) * 100) : 0}%</span><span><i />Pendiente {total ? 100 - Math.round((pagado / total) * 100) : 0}%</span></div>
        {[["Total del plan", total, "var(--dc-ink-700)"], ["Cobrado", pagado, "var(--dc-ok-700)"], ["Saldo", saldo, RED]].map(([l, v, c]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--dc-line)" }}><span style={{ color: "var(--dc-ink-400)", fontSize: 14 }}>{l}</span><span style={{ fontWeight: 500, color: c, fontSize: 14 }}>S/ {v.toFixed(2)}</span></div>)}
        {saldo > 0 && <div style={{ marginTop: 14, background: "var(--dc-bg)", borderRadius: "var(--dc-r-md)", padding: 14 }}><div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 8 }}>Pago en cuotas</div><div style={{ fontSize: 13, color: "var(--dc-ink-400)", marginBottom: 10 }}>Saldo S/ {saldo.toFixed(2)} en 3 cuotas de S/ {(saldo / 3).toFixed(2)}</div>{puedeCobrar && <Btn small full onClick={cobrarSaldo}><CreditCard size={15} strokeWidth={1.75} /> Registrar pago del saldo</Btn>}</div>}
      </Card>
    </div>
    </div>
  );
}

/* ---- Lista de espera detallada ---- */
const URGENCIA = { alta: { l: "Alta", bg: "var(--dc-fee)", fg: "var(--dc-danger-700)" }, media: { l: "Media", bg: "var(--dc-warn-soft)", fg: "var(--dc-warn-600)" }, baja: { l: "Baja", bg: "var(--dc-info-soft)", fg: "var(--dc-info-ink)" } };
const ESPERA_INIT = [
  { id: 1, n: "Lucía Vargas", tel: "987 111 222", e: "Ortodoncia", medico: "Dr. Luis Paredes", pref: "Tardes", urg: "media", desde: "2 días", ofrecido: [] },
  { id: 2, n: "Andrés Soto", tel: "912 333 444", e: "Odontología general", medico: "Cualquiera", pref: "Mañanas", urg: "baja", desde: "1 día", ofrecido: [] },
  { id: 3, n: "Elena Ríos", tel: "998 555 666", e: "Endodoncia", medico: "Dra. Ana Quispe", pref: "Indiferente", urg: "alta", desde: "Hoy", ofrecido: ["Cupo 09:00 (rechazado)"] },
  { id: 4, n: "Marco Salas", tel: "956 204 118", e: "Cirugía oral", medico: "Dr. Jorge Ramos", pref: "Mañanas", urg: "alta", desde: "1 día", ofrecido: [] },
  { id: 5, n: "Valeria Núñez", tel: "944 870 312", e: "Odontopediatría", medico: "Cualquiera", pref: "Tardes", urg: "media", desde: "3 días", ofrecido: [] },
  { id: 6, n: "Óscar Medina", tel: "981 445 097", e: "Limpieza dental", medico: "Cualquiera", pref: "Sábados", urg: "baja", desde: "5 días", ofrecido: [] },
];
function Espera({ notify, esp: espProp, setEsp, onAsignar, embedded = false, pacientes = [], setPacientes = () => {} }) {
  const conectado = !!auth.token;
  const mapEsp = (r) => {
    const creado = r.creadoEn || r.creado_en || null;
    let desde = "—";
    if (creado) {
      const t = new Date(creado).getTime();
      if (!Number.isNaN(t)) {
        const dias = Math.max(0, Math.floor((Date.now() - t) / 86400000));
        desde = dias === 0 ? "Hoy" : pluralEs(dias, "día", "días");
      }
    }
    return { id: r.id, n: r.paciente || "—", tel: r.telefono || "", e: r.especialidad || "—", medico: r.medico || "Cualquiera", pref: r.preferenciaHorario || "Indiferente", urg: r.urgencia || "media", desde, creadoEn: creado, ofrecido: (() => { try { return JSON.parse(r.ofertas || "[]"); } catch { return []; } })(), pacienteId: r.pacienteId || null };
  };
  const [remoto, setRemoto] = useState(null);
  const [asignarBase, setAsignarBase] = useState(null); // prefill del modal real de agendado (standalone)
  const [nuevoEsp, setNuevoEsp] = useState(null); // form para agregar paciente a espera
  const [busca, setBusca] = useState("");         // buscador de paciente registrado
  const [abrePac, setAbrePac] = useState(false);  // dropdown de pacientes abierto
  const recargar = () => { if (conectado) api.espera.listar().then((r) => setRemoto((r || []).map(mapEsp))).catch(() => notify("No se pudo cargar la lista de espera.")); };
  useEffect(() => { recargar(); }, []); // eslint-disable-line
  const esp = conectado ? (remoto || []) : espProp;
  const ordenada = [...esp].sort((a, b) => ({ alta: 0, media: 1, baja: 2 }[a.urg] - { alta: 0, media: 1, baja: 2 }[b.urg]));

  const ofrecer = (p) => {
    notify(`Oferta de cupo enviada a ${p.n} por WhatsApp. Esperando respuesta.`);
    if (!conectado) setEsp((e) => e.map((x) => x.id === p.id ? { ...x, ofrecido: [...x.ofrecido, `Cupo ofrecido hoy`] } : x));
  };
  // "Asignar" abre el flujo del padre (elegir doctor/fecha/hora); el padre quita de la lista al confirmar.
  // "Asignar": en Agenda lo maneja el padre (onAsignar). En el módulo standalone, abre el
  // agendado real (crea la cita) y al confirmar retira de la lista.
  const asignar = (p) => {
    if (onAsignar) { onAsignar(p); return; }
    if (conectado) { setAsignarBase({ pacienteId: p.pacienteId || "", motivo: `${p.e || "Consulta"} (desde lista de espera)`, canal: "presencial", _esperaId: p.id }); return; }
    setEsp((e) => e.filter((x) => x.id !== p.id)); notify(`Cupo asignado a ${p.n}.`);
  };
  const nuevoEspera = () => { setBusca(""); setAbrePac(false); setNuevoEsp({ pacienteId: null, n: "", tel: "", dni: "", e: "Odontología general", medico: "Cualquiera", pref: "Indiferente", urg: "media", esNuevo: false }); };
  const elegirPac = (p) => { setNuevoEsp((f) => ({ ...f, pacienteId: p.id, n: p.nombre, tel: p.telefono || p.tel || "", dni: p.dni || "", esNuevo: false })); setAbrePac(false); setBusca(""); };
  const modoNuevoPac = () => { setNuevoEsp((f) => ({ ...f, pacienteId: null, esNuevo: true, n: (busca || f.n || "") })); setAbrePac(false); };
  const guardarEsp = () => {
    if (!nuevoEsp.n.trim()) { notify("Elige un paciente registrado o registra uno nuevo."); return; }
    const finalizar = (pacienteId) => {
      if (conectado) { api.espera.crear({ paciente: nuevoEsp.n, telefono: nuevoEsp.tel, especialidad: nuevoEsp.e, medico: nuevoEsp.medico, preferenciaHorario: nuevoEsp.pref, urgencia: nuevoEsp.urg, pacienteId }).then(() => { notify(`${nuevoEsp.n} agregado a la lista de espera.`); recargar(); }).catch(() => notify("Error al agregar a espera.")); setNuevoEsp(null); return; }
      setEsp((e) => [...(e || []), { id: Date.now(), n: nuevoEsp.n, tel: nuevoEsp.tel, e: nuevoEsp.e, medico: nuevoEsp.medico, pref: nuevoEsp.pref, urg: nuevoEsp.urg, desde: "Hoy", ofrecido: [], pacienteId }]);
      notify(`${nuevoEsp.n} agregado a la lista de espera${pacienteId ? " (ligado a su ficha)" : ""}.`); setNuevoEsp(null);
    };
    // Paciente no registrado → se registra primero y queda ligado
    if (nuevoEsp.esNuevo && !nuevoEsp.pacienteId) {
      if (conectado) { api.pacientes.crear({ nombre: nuevoEsp.n, dni: nuevoEsp.dni, telefono: nuevoEsp.tel }).then((p) => finalizar(p?.id || null)).catch(() => notify("No se pudo registrar el paciente.")); return; }
      const nid = Math.max(0, ...pacientes.map((p) => p.id || 0)) + 1;
      setPacientes((ps) => [...ps, { id: nid, nombre: nuevoEsp.n, dni: nuevoEsp.dni, telefono: nuevoEsp.tel, sede: 1, ultima: null }]);
      notify(`${nuevoEsp.n} registrado como paciente nuevo.`);
      finalizar(nid); return;
    }
    finalizar(nuevoEsp.pacienteId || null);
  };
  const pacF = (busca.trim() ? pacientes.filter((p) => (p.nombre || "").toLowerCase().includes(busca.toLowerCase()) || String(p.dni || "").includes(busca.trim())) : pacientes).slice(0, 6);

  return (
    <div style={{ overflowX: "auto", maxWidth: "100%", width: "100%" }}>
      {!embedded && (() => { const top = ordenada[0]; const u = top ? URGENCIA[top.urg] : null; const nAlta = esp.filter((x) => x.urg === "alta").length; const nOf = esp.filter((x) => x.ofrecido.length).length; const nEsp = new Set(esp.map((x) => x.e)).size; return (
        <>
        <section className="dc-esp-hero">
          <div className="dc-esp-hero__txt">
            <div className="dc-esp-hero__num"><b>{esp.length}</b><span>en espera</span></div>
            <p title="Si se libera un cupo, se ofrece por WhatsApp al primero compatible; si no responde en 15 min, pasa al siguiente.">Ordenados por urgencia – oferta automática por WhatsApp</p>
          </div>
          <div className="dc-esp-hero__cifras">
            <div><b>{nAlta}</b><span>Urgentes</span></div>
            <div><b>{nOf}</b><span>Con oferta</span></div>
            <div><b>{nEsp}</b><span>Especialidades</span></div>
          </div>
          {top && (
            <div className="dc-esp-hero__prox">
              <span className="dc-rec__av" style={{ width: 34, height: 34, fontSize: 12, background: "rgba(255,255,255,.18)", color: "#fff" }}>{iniciales(top.n)}</span>
              <div className="dc-esp-hero__prox-txt"><span><Sparkles size={11} strokeWidth={2} /> Próximo cupo</span><b>{top.n}</b></div>
              <button type="button" className="dc-esp-hero__btn" onClick={() => ofrecer(top)}><Bell size={14} strokeWidth={1.75} /> Ofrecer</button>
            </div>
          )}
          <button type="button" className="dc-esp-hero__agregar" onClick={nuevoEspera}><Plus size={15} strokeWidth={2} /> Agregar</button>
        </section>
        </>
      ); })()}
      {embedded ? (
      <DataTable titulo="Pacientes esperando cupo" sub="en espera" minWidth={940} rows={ordenada} rowClassName={(p) => (ordenada[0] && p.id === ordenada[0].id ? "dc-esp-fila is-sug" : "dc-esp-fila")} accion={<Btn small onClick={nuevoEspera}><Plus size={15} strokeWidth={1.75} /> Agregar a espera</Btn>} empty={<Vacio icon={<Bell size={24} strokeWidth={1.75} />} titulo="Lista vacía" sub="Agrega un paciente que quedó esperando cupo." />} cols={[
        { key: "paciente", label: "Paciente", w: "minmax(158px,1.4fr)", a: "left", get: (p) => p.n, cell: (p) => <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: tint(colorDe(p.n), 0.14), color: colorDe(p.n), display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{iniciales(p.n)}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.n}</div>{p.ofrecido.length > 0 && <div style={{ fontSize: 12, color: "var(--dc-warn-600)", display: "flex", alignItems: "center", gap: 4 }}><Bell size={10} strokeWidth={1.75} /> {p.ofrecido.length} oferta(s)</div>}</div></div> },
        { key: "urg", label: "Urgencia", w: "minmax(88px,0.7fr)", a: "center", get: (p) => URGENCIA[p.urg].l, cell: (p) => { const u = URGENCIA[p.urg]; return <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: "var(--dc-r-full)", background: u.bg, color: u.fg }}>{u.l}</span>; } },
        { key: "tel", label: "Contacto", w: "minmax(112px,1fr)", a: "left", get: (p) => p.tel, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)", display: "inline-flex", alignItems: "center", gap: 5 }}><Phone size={12} strokeWidth={1.75} color="var(--dc-ink-400)" /> {p.tel}</span> },
        { key: "esp", label: "Especialidad", w: "minmax(120px,1fr)", a: "left", get: (p) => p.e, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-700)", display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}><Stethoscope size={13} strokeWidth={1.75} color="var(--dc-ink-400)" style={{ flexShrink: 0 }} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.e}</span></span> },
        { key: "medico", label: "Médico", w: "minmax(112px,1fr)", a: "left", get: (p) => p.medico, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{p.medico}</span> },
        { key: "pref", label: "Preferencia", w: "minmax(92px,0.9fr)", a: "center", get: (p) => p.pref, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{p.pref}</span> },
        { key: "desde", label: "Espera", w: "minmax(80px,0.7fr)", a: "center", get: (p) => p.desde, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)", display: "inline-flex", alignItems: "center", gap: 5 }}><Clock size={12} strokeWidth={1.75} color="var(--dc-ink-400)" /> {p.desde}</span> },
        { key: "acc", label: "Acciones", w: "176px", a: "center", noFilter: true, noSort: true, cell: (p) => <div className="dc-esp-acc"><button type="button" className="dc-esp-ofrecer" onClick={() => ofrecer(p)} title="Ofrecer cupo por WhatsApp" aria-label={`Ofrecer cupo a ${p.n} por WhatsApp`}><Bell size={15} strokeWidth={1.75} /></button><Btn small onClick={() => asignar(p)}><CheckCircle2 size={14} strokeWidth={1.75} /> Asignar cupo</Btn></div> },
      ]} />
      ) : (
        <Card className="dc-esp-tablero">
          {ordenada.length === 0 ? <Vacio icon={<Bell size={24} strokeWidth={1.75} />} titulo="Lista vacía" sub="Agrega un paciente que quedó esperando cupo." /> : (
            <div className="dc-esp-cols">
              {["alta", "media", "baja"].map((k) => { const u = URGENCIA[k]; const lista = ordenada.filter((p) => p.urg === k); return (
                <section key={k} className={`dc-esp-col is-${k}`}>
                  <h4><i /> Urgencia {u.l.toLowerCase()} <span>{lista.length}</span></h4>
                  {lista.length === 0 && <div className="dc-esp-col__vacio">Sin pacientes</div>}
                  {lista.map((p) => { const col = colorDe(p.n); const sug = ordenada[0] && p.id === ordenada[0].id; return (
                    <article key={p.id} className={`dc-esp-card${sug ? " is-sug" : ""}`}>
                      <div className="dc-esp-card__top">
                        <span className="dc-rec__av" style={{ width: 38, height: 38, fontSize: 12.5, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(p.n)}</span>
                        <div className="dc-esp-card__nom"><b>{p.n}</b><span><Phone size={11} strokeWidth={1.75} /> {p.tel}</span></div>
                        {sug && <span className="dc-esp-card__sug"><Sparkles size={11} strokeWidth={2} /> Siguiente</span>}
                      </div>
                      <ul className="dc-esp-card__meta">
                        <li><Stethoscope size={13} strokeWidth={1.75} /> {p.e}</li>
                        <li><User size={13} strokeWidth={1.75} /> {p.medico}</li>
                        <li><Clock size={13} strokeWidth={1.75} /> Espera {String(p.desde).toLowerCase()} – {p.pref}</li>
                      </ul>
                      {p.ofrecido.length > 0 && <div className="dc-esp-card__oferta"><Bell size={12} strokeWidth={1.75} /> {p.ofrecido.length === 1 ? "1 oferta enviada" : `${p.ofrecido.length} ofertas enviadas`}{p.ofrecido[p.ofrecido.length - 1] ? ` – ${p.ofrecido[p.ofrecido.length - 1]}` : ""}</div>}
                      <div className="dc-esp-card__acc">
                        <button type="button" className="dc-esp-ofrecer" onClick={() => ofrecer(p)} title="Ofrecer cupo por WhatsApp" aria-label={`Ofrecer cupo a ${p.n} por WhatsApp`}><Bell size={15} strokeWidth={1.75} /></button>
                        <Btn small kind={sug ? undefined : "ghost"} onClick={() => asignar(p)}><CheckCircle2 size={14} strokeWidth={1.75} /> Asignar cupo</Btn>
                      </div>
                    </article>
                  ); })}
                </section>
              ); })}
            </div>
          )}
        </Card>
      )}
      {asignarBase && <AgendarRecepcionModal base={asignarBase} notify={notify} onClose={() => setAsignarBase(null)} onCreada={() => { const eid = asignarBase._esperaId; setAsignarBase(null); if (conectado && eid) api.espera.resolver(eid).catch(() => {}).finally(recargar); else recargar(); }} />}
      {nuevoEsp && (() => {
        const selSty = { width: "100%", padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, fontWeight: 500, cursor: "pointer", boxSizing: "border-box" };
        const lblSty = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
        return (
        <Modal icon={<Bell size={20} strokeWidth={1.75} />} tone="var(--dc-warn-600)" titulo="Agregar a lista de espera" sub="Paciente que quiere cita pero no hay cupo disponible" onClose={() => setNuevoEsp(null)} maxW={560}
          footer={<><Btn small kind="ghost" onClick={() => setNuevoEsp(null)}>Cancelar</Btn><Btn small onClick={guardarEsp}><Check size={15} strokeWidth={1.75} /> Agregar a espera</Btn></>}>
          {/* Selector de paciente registrado (o registrar nuevo) */}
          <div style={{ marginBottom: 16 }}>
            <label style={lblSty}>Paciente</label>
            {nuevoEsp.pacienteId ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--dc-ok-soft)", border: "1px solid var(--dc-green-soft)", borderRadius: "var(--dc-r-md)", padding: "10px 13px" }}>
                <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: tint("var(--dc-ok)", 0.133), color: "var(--dc-ok-700)", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12 }}>{iniciales(nuevoEsp.n)}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nuevoEsp.n}</div><div style={{ fontSize: 12, color: "var(--dc-ok-700)" }}>Registrado – ligado a su ficha{nuevoEsp.dni ? ` – DNI ${nuevoEsp.dni}` : ""}</div></div>
                <button onClick={() => setNuevoEsp({ ...nuevoEsp, pacienteId: null, esNuevo: false, n: "", dni: "" })} style={{ background: "none", border: "none", color: DS.c.primary, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Cambiar</button>
              </div>
            ) : nuevoEsp.esNuevo ? (
              <div style={{ background: "var(--dc-white)", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-md)", padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-600)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><UserPlus size={13} strokeWidth={1.75} /> Registrar paciente nuevo</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>DNI <span style={{ color: "var(--dc-ink-400)", fontWeight: 500 }}>– consulta RENIEC</span></label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="dc-premium-inp" value={nuevoEsp.dni} onChange={(e) => setNuevoEsp({ ...nuevoEsp, dni: e.target.value.replace(/[^\d]/g, "").slice(0, 8) })} placeholder="45678901" style={{ flex: 1, minWidth: 0, padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontVariantNumeric: "tabular-nums" }} />
                      <BtnReniec dni={nuevoEsp.dni} onNombre={(n) => setNuevoEsp((x) => ({ ...x, n }))} notify={notify} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
                    <Field label="Nombre completo" value={nuevoEsp.n} onChange={(v) => setNuevoEsp({ ...nuevoEsp, n: v })} placeholder="Ej. Ana Torres" />
                    <Field label="Teléfono" value={nuevoEsp.tel} onChange={(v) => setNuevoEsp({ ...nuevoEsp, tel: v })} placeholder="999 888 777" icon={<Phone size={15} strokeWidth={1.75} />} />
                  </div>
                </div>
                <button onClick={() => setNuevoEsp({ ...nuevoEsp, esNuevo: false })} style={{ marginTop: 8, background: "none", border: "none", color: DS.c.primary, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>← Buscar registrado</button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input className="dc-premium-inp" value={busca} onChange={(e) => { setBusca(e.target.value); setAbrePac(true); }} onFocus={() => setAbrePac(true)} placeholder="Busca por nombre o DNI…" style={{ width: "100%", padding: "11px 12px", background: "var(--dc-bg)", border: "1.5px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box" }} />
                {abrePac && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, background: "#fff", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", boxShadow: "0 14px 34px -14px rgba(16,24,40,.3)", padding: 6, maxHeight: 240, overflowY: "auto" }}>
                    {pacF.map((p) => (
                      <button key={p.id} onClick={() => elegirPac(p)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: "var(--dc-r-sm)", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dc-bg)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <div style={{ width: 30, height: 30, borderRadius: "var(--dc-r-full)", background: tint(NAVY, 0.071), color: NAVY, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{iniciales(p.nombre)}</div>
                        <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>{p.dni ? `DNI ${p.dni}` : "sin DNI"}{p.telefono ? ` – ${p.telefono}` : ""}</div></div>
                      </button>
                    ))}
                    {pacF.length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-400)", padding: "8px 10px" }}>Sin coincidencias.</div>}
                    <button onClick={modoNuevoPac} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", borderRadius: "var(--dc-r-sm)", border: "none", borderTop: "1px solid var(--dc-bg)", background: "transparent", cursor: "pointer", color: DS.c.primary, fontWeight: 500, fontSize: 13 }}><UserPlus size={15} strokeWidth={1.75} /> Registrar paciente nuevo{busca.trim() ? ` "${busca.trim()}"` : ""}</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={lblSty}>Especialidad</label>
              <Select value={nuevoEsp.e} onChange={(v) => setNuevoEsp({ ...nuevoEsp, e: v })} options={ESPECIALIDADES.map((x) => ({ value: x.nombre, label: x.nombre }))} />
            </div>
            <div>
              <label style={lblSty}>Médico preferido</label>
              <Select value={nuevoEsp.medico} onChange={(v) => setNuevoEsp({ ...nuevoEsp, medico: v })} options={[{ value: "Cualquiera", label: "Cualquiera" }, ...MEDICOS.map((m) => ({ value: m.nombre, label: m.nombre }))]} />
            </div>
            <div>
              <label style={lblSty}>Preferencia de horario</label>
              <Select value={nuevoEsp.pref} onChange={(v) => setNuevoEsp({ ...nuevoEsp, pref: v })} options={["Indiferente", "Mañanas", "Tardes"].map((x) => ({ value: x, label: x }))} />
            </div>
            <div>
              <label style={lblSty}>Urgencia</label>
              <Select value={nuevoEsp.urg} onChange={(v) => setNuevoEsp({ ...nuevoEsp, urg: v })} options={[["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]].map(([v, l]) => ({ value: v, label: l }))} />
            </div>
          </div>
        </Modal>
        );
      })()}
    </div>
  );
}

/* ---- Caja / Facturación (fuente única: el plan de tratamiento de cada ficha) ---- */
const EGRESO_CATS = ["Insumos", "Laboratorio", "Alquiler", "Servicios (luz/agua)", "Planilla", "Marketing", "Equipos", "Otros"];
const EGRESOS_DEMO = [
  { id: 3, fecha: fmt(hoy), concepto: "Movilidad y mensajería", categoria: "Otros", monto: 35, metodo: "efectivo" },
  { id: 1, fecha: fmt(hoy), concepto: "Resinas y adhesivos", categoria: "Insumos", monto: 320, metodo: "transferencia" },
  { id: 2, fecha: fmt(hoy), concepto: "Trabajo de laboratorio — corona zirconio", categoria: "Laboratorio", monto: 180, metodo: "transferencia" },
  { id: 3, fecha: addDays(-1), concepto: "Campaña Instagram Ads", categoria: "Marketing", monto: 150, metodo: "tarjeta" },
];
const LINKS_DEMO = [
  { id: 1, paciente: "Rosa Linares", concepto: "Abono ortodoncia", monto: 250, estado: "pagado", fecha: addDays(-1) },
  { id: 2, paciente: "Pedro Gómez", concepto: "Saldo endodoncia", monto: 400, estado: "pendiente", fecha: fmt(hoy) },
];

/* Icono y color de cada medio de pago en Caja. */
const MEDIO_UI = {
  efectivo: [Banknote, "#16A36A"], pos: [CreditCard, "#2F6FDE"], tarjeta: [CreditCard, "#2F6FDE"],
  yape: [Smartphone, "#7B3FE4"], plin: [Smartphone, "#0E9EB0"], transferencia: [Landmark, "#28527A"], seguro: [ShieldCheck, "#E0694F"],
};
const medioUi = (t) => MEDIO_UI[String(t || "").toLowerCase()] || [Wallet, "#0E9199"];
const DENOMS = [[200, "b"], [100, "b"], [50, "b"], [20, "b"], [10, "b"], [5, "m"], [2, "m"], [1, "m"], [0.5, "m"], [0.2, "m"], [0.1, "m"]];

function Facturacion({ pacientes = [], fichas = {}, updFicha, notify, consumirInsumos, rol = "", can, sedeActiva = 1, sedeFiltro = null, misSedes = [1, 2], cobroDesdeFicha = null, onCobroDesdeFichaDone = () => {}, tab: tabProp = null, onTab = null }) {
  // Autorización granular: si llega `can` se usa la matriz; si no, se cae al rol.
  const puedeEgresos = can ? can("facturacion", "aprobar") : rol !== "recepcion" && rol !== "gerencia";
  // Bug #26 re-test: Gerencia debe VER la pestaña Ingresos/egresos (solo lectura), aunque no pueda crear egresos
  const puedeVerMovimientos = can ? can("facturacion", "ver") : rol !== "recepcion";
  const puedeAbrirCaja = can ? can("facturacion", "crear") : rol !== "gerencia";
  const puedeConfig = can ? can("facturacion", "configurar") : rol !== "recepcion" && rol !== "gerencia";
  const conectado = !!auth.token;
  // Conectado se dice la verdad; en demostracion se conserva el ejemplo de siempre.
  const textoComprobante = conectado
    ? "Comprobante registrado (todavía no se envía a SUNAT)."
    : "Comprobante de demostración (sin envío a SUNAT).";
  const [pago, setPago] = useState(null); // { pid, nombre, monto }
  const [caja, setCaja] = useState({ porCobrar: [], boletasHoy: [], montoPorCobrar: 0, montoHoy: 0 });
  const [cajaError, setCajaError] = useState(false);
  const [histError, setHistError] = useState(false);
  const [sedes, setSedes] = useState([]);
  const [hist, setHist] = useState([]);
  const [verHist, setVerHist] = useState(false);
  const [pacsHoy, setPacsHoy] = useState(new Set());   // pacientes con cita hoy (para "por cobrar de hoy")
  // Las pestañas son submódulos del menú lateral (Caja → Cobros, Apertura…): la vista manda.
  const [tabLocal, setTabLocal] = useState("cobros");  // cobros | apertura | cierre | historial | movimientos | links
  const [busCob, setBusCob] = useState("");
  const [ordCob, setOrdCob] = useState("saldo");
  const tab = tabProp || tabLocal;
  const setTab = (t) => (onTab ? onTab(t) : setTabLocal(t));
  // CAJA-01: sede explícita para abrir/cerrar (nunca "all" → primera sede a escondidas).
  const [cajaSedePick, setCajaSedePick] = useState(null); // uuid o null
  const sedeRequierePick = sedeFiltro === "all";
  const sedeUuid = () => {
    if (sedeRequierePick) {
      if (cajaSedePick) return cajaSedePick;
      return null;
    }
    if (conectado && sedes.length) {
      const want = Number(sedeActiva) === 2 ? "a2" : "a1";
      const hit = sedes.find((s) => String(s.id).endsWith(want)) || sedes[0];
      return hit?.id || null;
    }
    return sedeApiUuid(sedeActiva);
  };
  const sedeNombre = () => {
    const u = sedeUuid();
    if (!u && sedeRequierePick) return "elige una sede";
    const hit = sedes.find((s) => s.id === u);
    return hit?.nombre || nombreSede(sedeActiva) || "Sede";
  };
  const sedeNombreCobros = () => {
    if (sedeFiltro === "all") return "todas tus sedes";
    return sedeNombre();
  };
  const sedesUsuarioUuid = () => {
    if (!sedes.length) return misSedes.map((n) => sedeApiUuid(n)).filter(Boolean);
    return misSedes.map((n) => {
      const want = Number(n) === 2 ? "a2" : "a1";
      return sedes.find((s) => String(s.id).endsWith(want))?.id;
    }).filter(Boolean);
  };
  const sedesUsuarioNombres = () => {
    const uuids = sedesUsuarioUuid();
    return sedes.filter((s) => uuids.includes(s.id)).map((s) => s.nombre);
  };
  const pagoEnSedeActiva = (p) => {
    const sid = sedeUuid();
    const nombreActivo = sedes.find((s) => s.id === sid)?.nombre || nombreSede(sedeActiva);
    if (sedeFiltro !== "all" && sedeFiltro != null) {
      if (p.sedeId && sid) return p.sedeId === sid;
      return p.sede === nombreActivo || p.sede === sid;
    }
    const uuids = sedesUsuarioUuid();
    const nombres = sedesUsuarioNombres();
    if (p.sedeId && uuids.length) return uuids.includes(p.sedeId);
    if (p.sede && nombres.length) return nombres.includes(p.sede);
    return true;
  };
  const mesActual = fmt(hoy).slice(0, 7);
  const histFiltrado = hist.filter(pagoEnSedeActiva).filter((p) => (p.fecha || "").slice(0, 7) === mesActual);
  const cajaStorageKey = () => `dc_caja_apertura_${fmt(hoy)}_${sedeActiva || "all"}`;
  const [apertura, setApertura] = useState(null);
  const [jornadaAbiertaPrevia, setJornadaAbiertaPrevia] = useState(null);
  const [cierreAdmin, setCierreAdmin] = useState(null); // { id, fecha, sedeId, fondo }
  const [cierreAdminForm, setCierreAdminForm] = useState({ contado: "", justificacion: "" });
  const [cierreAdminBusy, setCierreAdminBusy] = useState(false);
  const mapAperturaApi = (r) => {
    if (!r) return null;
    if (!r.abierta && !r.id) return null;
    if (!r.abierta) {
      return {
        id: r.id,
        abierta: false,
        fondo: Number(r.fondo) || 0,
        nota: r.nota || "",
        abiertaEn: r.abiertaEn || null,
        abiertaPorNombre: r.abiertaPorNombre || null,
        cerradaEn: r.cerradaEn || null,
        cerradaPorNombre: r.cerradaPorNombre || null,
        efectivoContado: r.efectivoContado != null ? Number(r.efectivoContado) : null,
        efectivoEsperado: r.efectivoEsperado != null ? Number(r.efectivoEsperado) : null,
        diferencia: r.diferencia != null ? Number(r.diferencia) : null,
        justificacion: r.justificacion || "",
        destinosActivos: r.destinosActivos || null,
        sede: sedeNombre(),
        fecha: r.fecha || null,
      };
    }
    return {
      id: r.id,
      abierta: true,
      fondo: Number(r.fondo) || 0,
      nota: r.nota || "",
      abiertaEn: r.abiertaEn || null,
      abiertaPorNombre: r.abiertaPorNombre || null,
      destinosActivos: r.destinosActivos || null,
      sede: sedeNombre(),
      fecha: r.fecha || null,
    };
  };
  const DESTINOS_BASE = [
    { id: "efectivo", tipo: "efectivo", label: "Efectivo caja" },
    { id: "pos", tipo: "pos", label: "POS / Tarjeta" },
    { id: "yape", tipo: "yape", label: "Yape" },
    { id: "plin", tipo: "plin", label: "Plin" },
    { id: "transferencia", tipo: "transferencia", label: "Transferencia" },
    { id: "seguro", tipo: "seguro", label: "Seguro" },
  ];
  const [destinosCatalogo, setDestinosCatalogo] = useState(DESTINOS_BASE);
  const [destinosSel, setDestinosSel] = useState(() => new Set(["efectivo", "yape", "plin", "pos", "transferencia"]));
  const [cierreForm, setCierreForm] = useState({ contado: "", justificacion: "", observaciones: "" });
  const [denoms, setDenoms] = useState({});
  const [cierreBusy, setCierreBusy] = useState(false);
  const [cajaMovs, setCajaMovs] = useState([]);
  const [movForm, setMovForm] = useState(null); // { tipo, monto, nota }
  const [histCaja, setHistCaja] = useState(() => conectado ? [] : [
    { id: "dj1", fecha: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1)), sedeNombre: "Sede San Isidro", abiertaPorNombre: "Carla Mendoza", abiertaEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 8, 5).toISOString(), cerradaPorNombre: "Carla Mendoza", cerradaEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 19, 40).toISOString(), fondo: 100, efectivoEsperado: 860, efectivoContado: 860, diferencia: 0, abierta: false },
    { id: "dj2", fecha: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1)), sedeNombre: "Sede Surco", abiertaPorNombre: "Luis Paredes", abiertaEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 8, 30).toISOString(), cerradaPorNombre: "Luis Paredes", cerradaEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 19, 10).toISOString(), fondo: 100, efectivoEsperado: 540, efectivoContado: 530, diferencia: -10, abierta: false },
    { id: "dj3", fecha: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 2)), sedeNombre: "Sede San Isidro", abiertaPorNombre: "Carla Mendoza", abiertaEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 2, 8, 0).toISOString(), cerradaPorNombre: "Roberto Díaz", cerradaEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 2, 20, 5).toISOString(), fondo: 150, efectivoEsperado: 1220, efectivoContado: 1225, diferencia: 5, abierta: false },
    { id: "dj4", fecha: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 3)), sedeNombre: "Sede Surco", abiertaPorNombre: "Luis Paredes", abiertaEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 3, 8, 15).toISOString(), cerradaPorNombre: "Luis Paredes", cerradaEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 3, 18, 55).toISOString(), fondo: 100, efectivoEsperado: 410, efectivoContado: 410, diferencia: 0, abierta: false },
  ]);
  const [histCajaRango, setHistCajaRango] = useState({ desde: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 14)), hasta: fmt(hoy) });
  useEffect(() => {
    if (!conectado) { setDestinosCatalogo(DESTINOS_BASE); return; }
    api.clinica.get().then((r) => {
      const arr = Array.isArray(r?.cajaDestinos) ? r.cajaDestinos.filter((d) => d && (d.id || d.tipo)) : [];
      const norm = arr.map((d, i) => ({
        id: String(d.id || d.tipo || `d${i}`),
        tipo: String(d.tipo || d.id || "efectivo"),
        label: String(d.label || d.tipo || d.id || "Destino"),
        detalle: d.detalle || "",
      }));
      setDestinosCatalogo(norm.length ? norm : DESTINOS_BASE);
      if (norm.length) setDestinosSel(new Set(norm.map((d) => d.id)));
    }).catch(() => setDestinosCatalogo(DESTINOS_BASE));
  }, [conectado]); // eslint-disable-line react-hooks/exhaustive-deps
  const recargarApertura = () => {
    const sid = sedeUuid();
    if (conectado && sid) {
      api.cajaApertura.get(sid, fmt(hoy))
        .then((r) => {
          setApertura(mapAperturaApi(r));
          setJornadaAbiertaPrevia(r?.jornadaAbiertaPrevia || null);
        })
        .catch(() => { setApertura(null); setJornadaAbiertaPrevia(null); notify("No se pudo leer la apertura de caja del servidor."); });
      return;
    }
    if (sedeRequierePick && !sid) { setApertura(null); setJornadaAbiertaPrevia(null); return; }
    try { setApertura(JSON.parse(localStorage.getItem(cajaStorageKey()) || "null")); } catch { setApertura(null); }
    setJornadaAbiertaPrevia(null);
  };
  const recargarCajaMovs = () => {
    if (!conectado || !apertura?.id || !apertura.abierta) { setCajaMovs([]); return; }
    api.cajaMovimientos.listar(apertura.id).then((rows) => setCajaMovs(rows || [])).catch(() => setCajaMovs([]));
  };
  const recargarHistCaja = () => {
    if (!conectado) return;
    const sid = sedeRequierePick ? (cajaSedePick || undefined) : sedeUuid();
    api.cajaApertura.historial({ sedeId: sid || undefined, desde: histCajaRango.desde, hasta: histCajaRango.hasta })
      .then((rows) => setHistCaja(Array.isArray(rows) ? rows : []))
      .catch(() => { setHistCaja([]); notify("No se pudo cargar el historial de caja."); });
  };
  useEffect(() => { recargarApertura(); }, [conectado, sedeActiva, sedes.length, cajaSedePick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { recargarCajaMovs(); }, [conectado, apertura?.id, apertura?.abierta]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === "historial" && conectado) recargarHistCaja(); }, [tab, histCajaRango.desde, histCajaRango.hasta, cajaSedePick, sedeActiva]); // eslint-disable-line react-hooks/exhaustive-deps
  const [aperturaForm, setAperturaForm] = useState({ fondo: "100", nota: "" });
  const abrirCaja = () => {
    if (!puedeAbrirCaja) { notify("Tu rol solo consulta la caja; recepción o administración la abren."); return; }
    const sid = sedeUuid();
    if (!sid) { notify("Elige una sede concreta antes de abrir la caja. No se puede abrir «todas» a la vez."); return; }
    if (!conectado) {
      if (MODO_DEMO) {
        const fondoDemo = Number(aperturaForm.fondo) || 0;
        setApertura({ id: "demo", abierta: true, fondo: fondoDemo, nota: aperturaForm.nota || "", abiertaEn: new Date().toISOString(), abiertaPorNombre: "Recepción", destinosActivos: destinosCatalogo.filter((d) => destinosSel.has(d.id)) });
        notify(`Caja abierta (demo) con fondo S/ ${fondoDemo.toFixed(2)}.`);
        setTab("cobros");
        return;
      }
      notify("Conéctate al servidor para abrir caja; las jornadas colgadas se validan ahí.");
      return;
    }
    if (jornadaAbiertaPrevia?.id) {
      notify(`Hay una jornada abierta del ${jornadaAbiertaPrevia.fecha || "día anterior"}. Ciérrala en Historial antes de abrir otra (una caja abierta por sede).`);
      setTab("historial");
      recargarHistCaja();
      return;
    }
    const fondo = Number(aperturaForm.fondo) || 0;
    const destinosActivos = JSON.stringify(destinosCatalogo.filter((d) => destinosSel.has(d.id)));
    api.cajaApertura.abrir({ sedeId: sid, fondo, nota: aperturaForm.nota || null, fecha: ymdLima(new Date()) || fmt(hoy), destinosActivos })
      .then((r) => { setApertura(mapAperturaApi({ ...r, abierta: true })); setJornadaAbiertaPrevia(null); notify(`Caja abierta en ${sedeNombre()} con fondo S/ ${fondo.toFixed(2)}.`); setTab("cobros"); })
      .catch((e) => {
        notify(e?.message || "No se pudo abrir la caja en el servidor.");
        if (e?.status === 409) { recargarApertura(); setTab("historial"); }
      });
  };
  const cerrarJornadaAdmin = () => {
    if (!puedeAbrirCaja) { notify("Tu rol no puede cerrar la caja."); return; }
    if (!cierreAdmin?.id) return;
    if (!(cierreAdminForm.justificacion || "").trim()) {
      notify("La justificación es obligatoria para cerrar una jornada fuera de fecha.");
      return;
    }
    const contado = cierreAdminForm.contado === "" ? Number(cierreAdmin.fondo) || 0 : Number(cierreAdminForm.contado);
    if (Number.isNaN(contado)) { notify("Efectivo contado inválido."); return; }
    const just = (cierreAdminForm.justificacion || "").trim();
    if (!confirm(`¿Cerrar la jornada del ${cierreAdmin.fecha} fuera de fecha?\n\nJustificación: ${just}`)) return;
    setCierreAdminBusy(true);
    // Omitir efectivoEsperado: el API calcula fondo ± movimientos (CAJA-08).
    api.cajaApertura.cerrar(cierreAdmin.id, {
      efectivoContado: contado,
      justificacion: just,
    })
      .then(() => {
        notify(`Jornada del ${cierreAdmin.fecha} cerrada (fuera de fecha).`);
        setCierreAdmin(null);
        setCierreAdminForm({ contado: "", justificacion: "" });
        recargarHistCaja();
        recargarApertura();
      })
      .catch((e) => notify(e?.message || "No se pudo cerrar la jornada."))
      .finally(() => setCierreAdminBusy(false));
  };
  const netoMovsCaja = cajaMovs.reduce((s, m) => {
    if (m.tipo === "ingreso") return s + (Number(m.monto) || 0);
    if (m.tipo === "retiro") return s - (Number(m.monto) || 0);
    return s; // turno u otros: no afectan efectivo esperado
  }, 0);
  const registrarCambioTurno = () => {
    if (!puedeAbrirCaja) { notify("Tu rol no puede registrar cambio de turno."); return; }
    if (!apertura?.id || !apertura.abierta) { notify("Abre la caja primero."); return; }
    const cajero = window.prompt("Nombre del cajero entrante:");
    if (cajero == null) return;
    if (!(cajero || "").trim()) { notify("Indica el nombre del cajero entrante."); return; }
    const contadoRaw = window.prompt("Efectivo contado parcial (S/):", "0");
    if (contadoRaw == null) return;
    const contado = Number(contadoRaw);
    if (Number.isNaN(contado) || contado < 0) { notify("Monto contado inválido."); return; }
    const nota = `CAMBIO_TURNO|contado=${contado}|cajero=${cajero.trim()}`;
    if (conectado) {
      api.cajaMovimientos.crear({ aperturaId: apertura.id, tipo: "turno", monto: 0, nota })
        .then(() => { notify(`Cambio de turno registrado – ${cajero.trim()} – contado S/ ${contado.toFixed(2)}.`); recargarCajaMovs(); })
        .catch((e) => notify(e?.message || "No se pudo registrar el cambio de turno."));
      return;
    }
    setCajaMovs((ms) => [...ms, { id: Date.now(), tipo: "turno", monto: 0, nota, creadoEn: new Date().toISOString() }]);
    notify(`Cambio de turno registrado – ${cajero.trim()}.`);
  };
  const anularPagoHoy = (pagoId) => {
    if (!puedeAbrirCaja) { notify("Tu rol no puede anular cobros."); return; }
    if (!pagoId) return;
    const motivo = window.prompt("Motivo de la anulación / devolución:");
    if (motivo == null) return;
    if (!(motivo || "").trim()) { notify("El motivo es obligatorio."); return; }
    if (!conectado) { notify("Conéctate para anular un cobro real."); return; }
    api.pagos.anular(pagoId, { motivo: motivo.trim() })
      .then(() => { notify("Pago anulado."); recargarCaja(); recargarCierre(); recargarHist(); })
      .catch((e) => notify(e?.message || "No se pudo anular el pago."));
  };
  const cerrarApertura = (esperadoEfectivo) => {
    if (!puedeAbrirCaja) { notify("Tu rol no puede cerrar la caja."); return; }
    if (cierreForm.contado === "" || cierreForm.contado == null) { notify("Indica el efectivo contado antes de cerrar."); return; }
    const contado = Number(cierreForm.contado);
    if (Number.isNaN(contado)) { notify("Efectivo contado inválido."); return; }
    const esperado = Number(esperadoEfectivo);
    const diff = Math.round((contado - esperado) * 100) / 100;
    if (Math.abs(diff) > 0.009 && !(cierreForm.justificacion || "").trim()) {
      notify("La justificación es obligatoria cuando hay descuadre.");
      return;
    }
    const resumen = `Esperado S/ ${esperado.toFixed(2)} – Contado S/ ${contado.toFixed(2)} – Diferencia S/ ${diff.toFixed(2)}${diff === 0 ? " (cuadra)" : diff > 0 ? " (sobra)" : " (falta)"}`;
    if (!confirm(`¿Cerrar la caja del día?\n\n${resumen}\n\nNo se podrán registrar más cobros hasta reabrir.`)) return;
    const body = {
      efectivoContado: contado,
      efectivoEsperado: esperado,
      justificacion: (cierreForm.justificacion || "").trim() || null,
    };
    setCierreBusy(true);
    if (conectado && apertura?.id) {
      api.cajaApertura.cerrar(apertura.id, body)
        .then(() => { setApertura(null); setCierreForm({ contado: "", justificacion: "", observaciones: "" }); notify("Caja cerrada. " + resumen); setTab("historial"); })
        .catch((e) => notify(e?.message || "No se pudo cerrar la caja."))
        .finally(() => setCierreBusy(false));
      return;
    }
    localStorage.removeItem(cajaStorageKey());
    setApertura(null);
    setCierreBusy(false);
    notify("Caja cerrada. " + resumen);
  };
  const guardarMovCaja = () => {
    if (!movForm || !(Number(movForm.monto) > 0)) { notify("Indica el monto del movimiento."); return; }
    if (!apertura?.id) { notify("Abre la caja primero."); return; }
    if (conectado) {
      api.cajaMovimientos.crear({ aperturaId: apertura.id, tipo: movForm.tipo, monto: Number(movForm.monto), nota: movForm.nota || null })
        .then(() => { notify(movForm.tipo === "retiro" ? "Retiro de efectivo registrado." : "Ingreso de efectivo registrado."); setMovForm(null); recargarCajaMovs(); })
        .catch(() => notify("No se pudo registrar el movimiento."));
      return;
    }
    setCajaMovs((ms) => [...ms, { id: Date.now(), tipo: movForm.tipo, monto: Number(movForm.monto), nota: movForm.nota, creadoEn: new Date().toISOString() }]);
    setMovForm(null);
  };
  const cajaAbierta = !!apertura?.abierta;
  const intentarCobrar = (payload) => {
    if (!cajaAbierta) {
      notify(jornadaAbiertaPrevia?.id
        ? "Cierra la jornada anterior en Historial antes de cobrar."
        : "Abre la caja del día antes de cobrar.");
      setTab(jornadaAbiertaPrevia?.id ? "historial" : "apertura");
      return;
    }
    setPago(payload);
  };
  const [cierre, setCierre] = useState(null);
  const recargarCierre = () => { if (conectado) api.pagos.cierre().then(setCierre).catch(() => {}); };
  const [egresosDemo, setEgresosDemo] = usePersist("egresos_demo", EGRESOS_DEMO);
  const [egresosApi, setEgresosApi] = useState([]);
  const egresos = conectado ? egresosApi : egresosDemo;
  const setEgresos = conectado ? setEgresosApi : setEgresosDemo;
  const recargarEgresos = () => { if (conectado) api.egresos.listar().then((r) => setEgresos((r || []).map((e) => ({ id: e.id, fecha: (e.fecha || "").slice(0, 10), concepto: e.concepto, categoria: e.categoria || "Otros", monto: Number(e.monto) || 0, metodo: e.metodo || "efectivo" })))).catch(() => {}); };
  const [egForm, setEgForm] = useState(null);           // { concepto, categoria, monto, metodo }
  // Con sesión se arranca vacío: los dos cobros de ejemplo alimentaban el KPI "Cobrado
  // por links S/ 250 – pagados", dinero que nadie ha pagado.
  const [links, setLinks] = useState(auth.token ? [] : LINKS_DEMO);
  const [linkForm, setLinkForm] = useState(null);       // { paciente, monto, concepto }
  const [boletaVer, setBoletaVer] = useState(null);     // boleta a mostrar
  const [datosFact, setDatosFact] = useState(false);    // config de facturación
  const recargarCaja = () => {
    if (!conectado) return;
    setCajaError(false);
    api.caja().then((c) => {
      if (c?.errorDeCarga) {
        setCaja({ porCobrar: [], boletasHoy: [], montoPorCobrar: 0, montoHoy: 0 });
        setCajaError(true);
        return;
      }
      setCaja(c || { porCobrar: [], boletasHoy: [], montoPorCobrar: 0, montoHoy: 0 });
      setCajaError(false);
    })
      .catch(() => { setCaja({ porCobrar: [], boletasHoy: [], montoPorCobrar: 0, montoHoy: 0 }); setCajaError(true); });
  };
  const recargarHist = () => {
    if (!conectado) return;
    setHistError(false);
    api.pagos.historial().then((h) => {
      setHist((h || []).map((p) => ({
        id: p.id, paciente: p.paciente || "—", sede: p.sede || "—", sedeId: p.sedeId || null,
        concepto: p.concepto || "", monto: Number(p.monto) || 0, metodo: String(p.metodo || ""),
        comprobante: `${p.comprobanteTipo || ""} ${p.comprobanteSerie || ""} ${p.comprobanteNumero != null ? fmtComprobante(p.comprobanteNumero) : ""}`.trim(),
        comprobanteSerie: p.comprobanteSerie, comprobanteNumero: p.comprobanteNumero, fecha: (p.fecha || "").slice(0, 10),
      })));
      setHistError(false);
    }).catch(() => { setHist([]); setHistError(true); });
  };
  useEffect(() => { if (conectado) { recargarCaja(); recargarHist(); recargarCierre(); recargarEgresos(); api.sedes.listar().then((s) => setSedes(s || [])).catch(() => {}); api.citas.listar().then((cs) => setPacsHoy(new Set((cs || []).map((c) => c.pacienteId).filter(Boolean)))).catch(() => {}); } }, []); // eslint-disable-line
  useEffect(() => {
    if (!conectado || !cobroDesdeFicha?.pid) return;
    const hit = (caja.porCobrar || []).find((r) => r.pacienteId === cobroDesdeFicha.pid);
    const saldo = hit ? Number(hit.saldo) || 0 : 0;
    if (saldo > 0.5) intentarCobrar({ pid: cobroDesdeFicha.pid, nombre: cobroDesdeFicha.nombre, monto: saldo });
    else notify(`${cobroDesdeFicha.nombre} no tiene saldo pendiente en caja.`);
    onCobroDesdeFichaDone();
  }, [cobroDesdeFicha, conectado, caja.porCobrar?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (conectado && tab === "cierre") recargarCierre(); }, [tab]); // eslint-disable-line
  const saldoDe = (pid) => { const t = fichas[pid]?.tratamiento || []; const total = t.reduce((s, f) => s + f.costo, 0); const pagado = t.filter((f) => f.estado === "atendida").reduce((s, f) => s + f.costo, 0); return { total, pagado, saldo: total - pagado, pend: t.filter((f) => f.estado !== "atendida").length }; };
  // Ítems del plan pendientes (para itemizar la boleta): precio con IGV, importe base.
  const itemsDe = (pid) => (fichas[pid]?.tratamiento || []).filter((f) => f.estado !== "atendida").map((f) => ({ cant: 1, desc: f.nombre, precio: f.costo, importe: Math.round((f.costo / 1.18) * 100) / 100 }));
  const porCobrar = conectado
    ? (caja.porCobrar || []).map((r) => ({ p: { id: r.pacienteId, nombre: r.paciente, dni: "", sedes: "", sedeNombre: r.sede || "" }, total: Number(r.total) || 0, pagado: Number(r.pagado) || 0, saldo: Number(r.saldo) || 0, pend: r.pend || 0 }))
    : pacientes.map((p) => ({ p, ...saldoDe(p.id) })).filter((x) => x.saldo > 0).sort((a, b) => b.saldo - a.saldo);
  const porCobrarHoy = conectado ? porCobrar.filter((x) => pacsHoy.has(x.p.id)) : [];
  const boletasHoy = conectado
    ? (caja.boletasHoy || []).map((b) => ({ id: b.id, paciente: b.paciente, concepto: b.concepto, monto: Number(b.monto) || 0, metodo: String(b.metodo || ""), fecha: fmt(hoy), comprobanteSerie: b.comprobanteSerie, comprobanteNumero: b.comprobanteNumero, anulado: !!b.anulado, anuladoMotivo: b.anuladoMotivo || "" }))
    : pacientes.flatMap((p) => (fichas[p.id]?.pagos || []).filter((pg) => pg.fecha === fmt(hoy)).map((pg) => ({ ...pg, paciente: p.nombre, anulado: false })));
  const boletasHoyActivas = boletasHoy.filter((b) => !b.anulado);
  const montoPorCobrar = conectado ? (Number(caja.montoPorCobrar) || 0) : porCobrar.reduce((s, x) => s + x.saldo, 0);
  const montoHoy = conectado ? (Number(caja.montoHoy) || 0) : boletasHoyActivas.reduce((s, b) => s + b.monto, 0);
  const fiscalReadOnly = rol === "admin_sede" || (can && !can("config", "editar"));
  const abrirBoleta = (b) => {
    if (!emisorBoletaListo()) { notify("Completa la razón social y un RUC válido (11 dígitos con DV) en Configuración → Datos de facturación."); return; }
    const em = getEmisor();
    const serie = b.comprobanteSerie || em.serie;
    const numeroRaw = b.comprobanteNumero;
    if (conectado && (numeroRaw == null || numeroRaw === "" || !serie)) {
      notify("Este pago no tiene serie/número de comprobante registrado en el servidor.");
      return;
    }
    const numero = numeroRaw != null ? fmtComprobante(numeroRaw) : peekBoletaLocal(em.serie);
    setBoletaVer({ serie, numero, cliente: b.paciente, dni: b.dni || "", fecha: b.fecha || fmt(hoy), total: Number(b.monto) || 0, concepto: b.concepto, metodo: String(b.metodo || "").toLowerCase(), items: b.items && b.items.length ? b.items : undefined });
  };
  const metodoLabel = { tarjeta: "Tarjeta (Niubiz)", yape: "Yape (Niubiz)", efectivo: "Efectivo", transferencia: "Transferencia" };
  // El ModalCobro ya registró el pago (backend). Aquí solo marcamos las fases como
  // atendidas para saldar el plan y refrescamos la caja.
  const aprobar = (res) => {
    const met = (res && res.metodo) || "pago";
    const cobrado = (res && res.montoCobrado != null) ? Number(res.montoCobrado) : pago.monto;
    const esParcial = !!(res && res.parcial);
    // Modelo por abonos: el ModalCobro ya registró el pago; el saldo se recalcula
    // solo desde los pagos. Aquí basta refrescar.
    if (conectado) {
      // No se afirma que la boleta llego a SUNAT: la integracion con el OSE no existe
      // todavia (frente 1 del README §10). Decir "emitida (SUNAT)" hacia creer a la
      // clinica que estaba declarando ese cobro, que es justo lo contrario de la verdad.
      notify(`Cobrado S/ ${cobrado.toFixed(2)} de ${pago.nombre} – ${metodoLabel[met] || met}${esParcial ? " (abono parcial)" : ""}. ${textoComprobante}`);
      setPago(null); recargarCaja(); recargarHist(); recargarCierre();
      return;
    }
    // Demo: abona; salda las fases solo si el pago cubre todo el saldo.
    // Ítems para la boleta: los tratamientos que se saldan (solo en cobro total).
    const itemsFact = !esParcial ? (fichas[pago.pid]?.tratamiento || []).filter((f) => f.estado !== "atendida").map((f) => ({ cant: 1, desc: f.nombre, precio: f.costo, importe: Math.round((f.costo / 1.18) * 100) / 100 })) : null;
    if (!esParcial) (fichas[pago.pid]?.tratamiento || []).filter((f) => f.estado !== "atendida").forEach((f) => consumirInsumos && consumirInsumos(f.nombre));
    updFicha(pago.pid, (cur) => ({ ...cur, tratamiento: (cur.tratamiento || []).map((f) => (!esParcial && f.estado !== "atendida") ? { ...f, estado: "atendida" } : f), pagos: [...(cur.pagos || []), { fecha: fmt(hoy), concepto: esParcial ? "Abono en caja" : "Cobro de saldo en caja", monto: cobrado, metodo: metodoLabel[met] || "Cobro", items: itemsFact && itemsFact.length ? itemsFact : undefined }] }));
    notify(`Cobrado S/ ${cobrado.toFixed(2)} de ${pago.nombre}${esParcial ? " (abono)" : ""}. ${textoComprobante}`);
    setPago(null);
  };
  const pagosAll = pacientes.flatMap((p) => (fichas[p.id]?.pagos || []));
  const cobradoMes = conectado ? histFiltrado.reduce((s, pg) => s + pg.monto, 0) : pagosAll.filter((pg) => (pg.fecha || "").slice(0, 7) === mesActual).reduce((s, pg) => s + pg.monto, 0);
  const ticketProm = conectado ? (boletasHoyActivas.length ? Math.round(boletasHoyActivas.reduce((s, b) => s + b.monto, 0) / boletasHoyActivas.length) : 0) : (pagosAll.length ? Math.round(pagosAll.reduce((s, pg) => s + pg.monto, 0) / pagosAll.length) : 0);
  const planTotalGlobal = porCobrar.reduce((s, x) => s + x.total, 0);
  const pctCobradoGlobal = planTotalGlobal ? Math.round((porCobrar.reduce((s, x) => s + x.pagado, 0) / planTotalGlobal) * 100) : 0;
  // Ingresos y egresos del día (ledger)
  const egresosHoy = egresos.filter((e) => e.fecha === fmt(hoy));
  const totEgresosHoy = egresosHoy.reduce((s, e) => s + e.monto, 0);
  const ingresosHoy = montoHoy;
  const netoHoy = ingresosHoy - totEgresosHoy;
  const guardarEgreso = () => {
    if (!egForm.concepto.trim() || !(Number(egForm.monto) > 0)) { notify("Completa concepto y monto del egreso."); return; }
    if (conectado) {
      api.egresos.crear({ fecha: fmt(hoy), concepto: egForm.concepto, categoria: egForm.categoria, monto: Number(egForm.monto), metodo: egForm.metodo })
        .then(() => { notify(`Egreso registrado: ${egForm.concepto} – S/ ${Number(egForm.monto).toFixed(2)}.`); setEgForm(null); recargarEgresos(); })
        .catch(() => notify("No se pudo registrar el egreso."));
      return;
    }
    setEgresos((es) => [{ id: Math.max(0, ...es.map((e) => e.id)) + 1, fecha: fmt(hoy), concepto: egForm.concepto, categoria: egForm.categoria, monto: Number(egForm.monto), metodo: egForm.metodo }, ...es]);
    notify(`Egreso registrado: ${egForm.concepto} – S/ ${Number(egForm.monto).toFixed(2)}.`);
    setEgForm(null);
  };
  const eliminarEgreso = (id) => { if (conectado) { api.egresos.eliminar(id).then(() => { notify("Egreso eliminado."); recargarEgresos(); }).catch(() => notify("No se pudo eliminar.")); return; } setEgresos((es) => es.filter((e) => e.id !== id)); };
  const crearLink = () => {
    if (!linkForm.paciente.trim() || !(Number(linkForm.monto) > 0)) { notify("Indica paciente y monto para el link."); return; }
    setLinks((ls) => [{ id: Math.max(0, ...ls.map((l) => l.id)) + 1, paciente: linkForm.paciente, concepto: linkForm.concepto || "Pago de tratamiento", monto: Number(linkForm.monto), estado: "pendiente", fecha: fmt(hoy) }, ...ls]);
    notify(`Link de ejemplo creado para ${linkForm.paciente} – S/ ${Number(linkForm.monto).toFixed(2)}. Todavía no se puede cobrar con él: falta conectar la pasarela.`);
    setLinkForm(null);
  };
  const TABS = [["apertura", "Apertura", KeyRound], ["cobros", "Cobros", CreditCard], ["cierre", "Cierre del día", DollarSign], ["historial", "Historial", Clock], ...(puedeVerMovimientos ? [["movimientos", "Ingresos y egresos", Wallet]] : []), ["links", "Links de pago", Zap]];
  const METODO_LBL = { efectivo: "Efectivo", tarjeta: "Tarjeta", yape: "Yape", plin: "Plin", transferencia: "Transferencia", seguro: "Seguro" };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {tab === "cobros" && <section className="dc-esp-hero dc-caja-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>S/ {montoPorCobrar.toLocaleString("es-PE")}</b><span>por cobrar</span></div>
          <p>{porCobrar.length} {porCobrar.length === 1 ? "plan en curso" : "planes en curso"}, {conectado ? "boleta aún sin envío a SUNAT" : "demo sin envío a SUNAT"}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div title={`Cobrado este mes – ${sedeNombreCobros()}`}><b>S/ {cobradoMes.toLocaleString("es-PE")}</b><span>Cobrado este mes</span></div>
          <div><b>{porCobrar.filter((x) => x.pagado === 0).length}</b><span>Sin ningún pago</span></div>
        </div>
        <span />
        {puedeConfig && <button type="button" className="dc-esp-hero__agregar" onClick={() => setDatosFact(true)}><FileText size={15} strokeWidth={1.9} /> Datos de facturación</button>}
      </section>}

      {tab === "apertura" && (
        <div className="dc-ap" style={{ display: "grid", gap: 16 }}>
          <section className="dc-esp-hero dc-caja-sub">
            <div className="dc-esp-hero__txt">
              <div className="dc-esp-hero__num"><b>{cajaAbierta ? "Abierta" : "Cerrada"}</b><span>caja del día</span></div>
              <p>{fechaLegible(fmt(hoy))} – {sedeNombre()}</p>
            </div>
            <div className="dc-esp-hero__cifras">
              <div><b>S/ {Number(cajaAbierta ? apertura?.fondo || 0 : aperturaForm.fondo || 0).toLocaleString("es-PE")}</b><span>Fondo inicial</span></div>
              <div><b>{destinosSel.size}</b><span>Medios activos</span></div>
              <div><b>{porCobrar.length}</b><span>Planes por cobrar</span></div>
            </div>
            <span />
            {cajaAbierta && <div className="dc-hero-acc"><button type="button" className="dc-esp-hero__btn" onClick={() => setTab("cobros")}><CreditCard size={14} strokeWidth={1.9} /> Ir a cobros</button></div>}
          </section>
          {(() => {
            const sedesOpc = sedes.length
              ? sedes.filter((x) => sedesUsuarioUuid().includes(x.id))
              : misSedes.map((n) => ({ id: sedeApiUuid(n), nombre: nombreSede(n) })).filter((x) => x.id);
            const sedeTxt = cajaAbierta ? sedeNombre() : ((sedes.length ? sedes : misSedes.map((n) => ({ id: sedeApiUuid(n), nombre: nombreSede(n) }))).find((x) => x.id === cajaSedePick)?.nombre || (sedeRequierePick ? "Sin elegir" : sedeNombre()));
            const fondoVal = Number(cajaAbierta ? apertura?.fondo || 0 : aperturaForm.fondo || 0);
            const bloqueado = (sedeRequierePick && !cajaSedePick) || !!jornadaAbiertaPrevia?.id;
            const destActivos = cajaAbierta && apertura?.destinosActivos
              ? (() => { try { const arr = typeof apertura.destinosActivos === "string" ? JSON.parse(apertura.destinosActivos) : apertura.destinosActivos; return arr || []; } catch { return []; } })()
              : destinosCatalogo.filter((d) => destinosSel.has(d.id));
            let n = 0;
            const Paso = ({ icon: Ico, tono, titulo, sub, children }) => { n += 1; return (
              <section className="dc-ap2__paso" style={{ "--t": tono }}>
                <header><span className="dc-ap2__ico"><Ico size={20} strokeWidth={1.9} /><i>{n}</i></span><div><h3>{titulo}</h3><span>{sub}</span></div></header>
                <div className="dc-ap2__cuerpo">{children}</div>
              </section>
            ); };
            return (
            <div className="dc-ap2">
              <div className="dc-ap2__main">
                {cajaAbierta ? (
                  <section className="dc-ap2__abierta">
                    <div className="dc-ap2__ok">
                      <span><CheckCircle2 size={26} strokeWidth={2} /></span>
                      <div><small>Caja abierta en {sedeNombre()}</small><b>Lista para cobrar</b><p>Desde {apertura.abiertaEn ? new Date(apertura.abiertaEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "—"}{apertura.abiertaPorNombre ? `, por ${apertura.abiertaPorNombre}` : ""}{apertura.nota ? ` – ${apertura.nota}` : ""}</p></div>
                    </div>
                    <div className="dc-ap2__atajos">
                      <button type="button" style={{ "--t": "#0E9199" }} onClick={() => setTab("cobros")}><span><CreditCard size={19} strokeWidth={1.9} /></span><b>Cobrar</b><small>Saldos de pacientes</small></button>
                      <button type="button" style={{ "--t": "#6D4FD1" }} onClick={() => setTab("cierre")}><span><Calculator size={19} strokeWidth={1.9} /></span><b>Cierre y arqueo</b><small>Cuenta la gaveta</small></button>
                      <button type="button" style={{ "--t": "#D97706" }} onClick={() => setMovForm({ tipo: "retiro", monto: "", nota: "" })}><span><ArrowUpDown size={19} strokeWidth={1.9} /></span><b>Retiro o ingreso</b><small>Mover efectivo</small></button>
                      {puedeAbrirCaja && <button type="button" style={{ "--t": "#28527A" }} onClick={registrarCambioTurno}><span><Repeat size={19} strokeWidth={1.9} /></span><b>Cambio de turno</b><small>Registrar relevo</small></button>}
                    </div>
                  </section>
                ) : (
                  <>
                    {jornadaAbiertaPrevia?.id && (
                      <div className="fm-aviso-edad is-mal">
                        <AlertTriangle size={15} strokeWidth={2} />
                        <span><b>Hay una jornada sin cerrar</b> del {jornadaAbiertaPrevia.fecha || "—"}{(histCaja || []).filter((h) => h?.abierta && h.id !== jornadaAbiertaPrevia.id).length ? " y otras más" : ""}. Ciérrala antes de abrir otra caja en esta sede.</span>
                        <button type="button" onClick={() => { setTab("historial"); setCierreAdmin({ id: jornadaAbiertaPrevia.id, fecha: jornadaAbiertaPrevia.fecha, sedeId: jornadaAbiertaPrevia.sedeId, fondo: Number(jornadaAbiertaPrevia.fondo) || 0 }); setCierreAdminForm({ contado: String(Number(jornadaAbiertaPrevia.fondo) || 0), justificacion: "" }); }}>Cerrar jornada</button>
                      </div>
                    )}
                    {sedeRequierePick && Paso({ icon: Building2, tono: "#0E9199", titulo: "¿En qué sede abres?", sub: "Cada sede lleva su propia caja", children: (
                      <div className="dc-ap2__sedes" role="radiogroup" aria-label="Sede para abrir caja">
                        {sedesOpc.map((x) => (
                          <button key={x.id} type="button" role="radio" aria-checked={cajaSedePick === x.id} className={cajaSedePick === x.id ? "is-on" : ""} onClick={() => setCajaSedePick(x.id)}>
                            <span><MapPin size={16} strokeWidth={2} /></span><b>{x.nombre}</b>{cajaSedePick === x.id && <Check size={15} strokeWidth={3} />}
                          </button>
                        ))}
                      </div>
                    ) })}
                    {Paso({ icon: Coins, tono: "#D97706", titulo: "Fondo inicial", sub: "El sencillo con el que empieza la gaveta", children: (
                      <>
                        <div className="dc-ap2__fondo">
                          <label className="dc-ap2__monto"><span>S/</span><input inputMode="decimal" aria-label="Fondo inicial (S/)" value={aperturaForm.fondo} onChange={(e) => setAperturaForm({ ...aperturaForm, fondo: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0.00" /></label>
                          <div className="dc-ap2__rapidos">{[50, 100, 150, 200, 300].map((v) => <button key={v} type="button" className={Number(aperturaForm.fondo) === v ? "is-on" : ""} onClick={() => setAperturaForm({ ...aperturaForm, fondo: String(v) })}>S/ {v}</button>)}</div>
                        </div>
                        <label className="dc-ap2__nota"><Pencil size={14} strokeWidth={2} /><input aria-label="Nota o turno" value={aperturaForm.nota} onChange={(e) => setAperturaForm({ ...aperturaForm, nota: e.target.value })} placeholder="Nota o turno (opcional), ej. turno mañana" /></label>
                      </>
                    ) })}
                    {Paso({ icon: Wallet, tono: "#6D4FD1", titulo: "Medios de pago de hoy", sub: `${destinosSel.size} de ${destinosCatalogo.length} activos`, children: (
                      <div className="dc-ap2__medios">
                        {destinosCatalogo.map((d) => { const on = destinosSel.has(d.id); const [Ico, col] = medioUi(d.tipo || d.id); return (
                          <button key={d.id} type="button" role="checkbox" aria-checked={on} className={on ? "is-on" : ""} style={{ "--m": col }} onClick={() => setDestinosSel((prev) => { const nx = new Set(prev); if (nx.has(d.id)) nx.delete(d.id); else nx.add(d.id); return nx; })}>
                            <span className="dc-ap2__mico"><Ico size={18} strokeWidth={1.9} /></span>
                            <b>{d.label}</b>
                            <i>{on && <Check size={11} strokeWidth={3.2} />}</i>
                          </button>
                        ); })}
                      </div>
                    ) })}
                  </>
                )}
              </div>
              <aside className="dc-ap2__ticket">
                <div className="dc-ap2__tcab">
                  <span><KeyRound size={18} strokeWidth={2} /></span>
                  <div><small>{fechaLegible(fmt(hoy))}</small><b>Apertura de caja</b></div>
                </div>
                <ul>
                  <li><span>Sede</span><b className={sedeTxt === "Sin elegir" ? "is-falta" : ""}>{sedeTxt}</b></li>
                  <li><span>Responsable</span><b>{cajaAbierta ? (apertura?.abiertaPorNombre || "—") : "Tú"}</b></li>
                  <li><span>Medios activos</span><b>{destActivos.length}</b></li>
                </ul>
                <div className="dc-ap2__tmedios">{destActivos.map((d) => { const [Ico, col] = medioUi(d.tipo || d.id); return <span key={d.id || d.label} style={{ "--m": col }}><Ico size={12} strokeWidth={2.2} /> {d.label || d.tipo}</span>; })}</div>
                <div className="dc-ap2__tcorte" />
                <div className="dc-ap2__ttotal"><span>Fondo inicial</span><b>S/ {fondoVal.toFixed(2)}</b></div>
                {cajaAbierta ? (
                  <button type="button" className="dc-ap2__cta is-alt" onClick={() => setTab("cierre")}><Calculator size={16} strokeWidth={2} /> Ir al cierre del día</button>
                ) : (
                  <>
                    <button type="button" className="dc-ap2__cta" onClick={abrirCaja} disabled={bloqueado}><KeyRound size={16} strokeWidth={2} /> Abrir caja</button>
                    <p>{sedeRequierePick && !cajaSedePick ? "Elige la sede para continuar." : "Debes abrir la caja antes de registrar cobros."}</p>
                  </>
                )}
              </aside>
            </div>
            );
          })()}
          {movForm && (
            <Card style={{ padding: 16 }}>
              <h4 style={{ margin: "0 0 10px", color: NAVY }}>Movimiento de efectivo</h4>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <Btn small kind={movForm.tipo === "ingreso" ? "green" : "ghost"} onClick={() => setMovForm({ ...movForm, tipo: "ingreso" })}>Ingreso</Btn>
                <Btn small kind={movForm.tipo === "retiro" ? "red" : "ghost"} onClick={() => setMovForm({ ...movForm, tipo: "retiro" })}>Retiro</Btn>
              </div>
              <Field label="Monto (S/)" value={movForm.monto} onChange={(v) => setMovForm({ ...movForm, monto: v })} placeholder="500.00" />
              <Field label="Nota" value={movForm.nota} onChange={(v) => setMovForm({ ...movForm, nota: v })} placeholder="Ej. Saco efectivo a bóveda / traigo sencillo" />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn small onClick={guardarMovCaja}>Guardar</Btn>
                <Btn small kind="ghost" onClick={() => setMovForm(null)}>Cancelar</Btn>
              </div>
            </Card>
          )}
          {cajaMovs.length > 0 && (
            <Card style={{ padding: 14 }}>
              <div style={{ fontWeight: 500, color: NAVY, marginBottom: 8 }}>Movimientos intermedios de hoy</div>
              {cajaMovs.map((m, i) => (
                <div key={m.id || i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderTop: i ? "1px solid var(--dc-line)" : "none" }}>
                  <span>{m.tipo === "retiro" ? "Retiro" : m.tipo === "turno" ? "Cambio de turno" : "Ingreso"}{m.nota ? ` – ${m.nota}` : ""}</span>
                  <span style={{ fontWeight: 500, color: m.tipo === "retiro" ? RED : m.tipo === "turno" ? NAVY : "var(--dc-ok-700)", fontVariantNumeric: "tabular-nums" }}>{m.tipo === "turno" ? "—" : `${m.tipo === "retiro" ? "−" : "+"} S/ ${Number(m.monto).toFixed(2)}`}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {tab === "cobros" && (<div style={{ display: "grid", gap: 16 }}>
      {conectado && cajaError && (
        <Card style={{ padding: 14, background: "var(--dc-danger-soft)", border: "1px solid var(--dc-danger-mid)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <AlertTriangle size={18} strokeWidth={1.75} color="var(--dc-red)" />
            <div style={{ flex: 1, fontSize: 13, color: "var(--dc-danger-700)" }}>No se pudieron cargar los saldos de caja. No uses los datos de abajo como reales.</div>
            <Btn small kind="ghost" onClick={recargarCaja}><Repeat size={14} strokeWidth={1.75} /> Reintentar</Btn>
          </div>
        </Card>
      )}
      {conectado && porCobrarHoy.length > 0 && (
        <Card style={{ overflow: "hidden", border: "1px solid var(--dc-amber-soft)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--dc-warn-soft)", background: "var(--dc-white)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: "var(--dc-r-sm)", background: "var(--dc-warn-600)", display: "grid", placeItems: "center" }}><Clock size={17} strokeWidth={1.75} color="#fff" /></div><div><div style={{ fontWeight: 600, color: NAVY, fontSize: 14, fontFamily: DISPLAY_FONT }}>Por cobrar de hoy</div><div style={{ fontSize: 13, color: "var(--dc-warn-700)" }}>{porCobrarHoy.length} paciente(s) del día con saldo – cobra aquí al salir de atención</div></div></div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dc-warn-600)", fontFamily: DISPLAY_FONT }}>S/ {porCobrarHoy.reduce((s, x) => s + x.saldo, 0).toLocaleString()}</span>
          </div>
          {porCobrarHoy.map((x, i) => (
            <div key={x.p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderTop: i ? "1px solid var(--dc-bg)" : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: tint(NAVY, 0.071), color: NAVY, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{iniciales(x.p.nombre)}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.p.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{x.pend} fase(s) pendiente(s) – plan S/ {x.total.toFixed(0)}</div></div>
              <span style={{ fontWeight: 600, color: RED, fontFamily: DISPLAY_FONT, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>S/ {x.saldo.toFixed(2)}</span>
              <Btn small disabled={!cajaAbierta} onClick={() => intentarCobrar({ pid: x.p.id, nombre: x.p.nombre, monto: x.saldo })}><CreditCard size={14} strokeWidth={1.75} /> Cobrar</Btn>
            </div>
          ))}
        </Card>
      )}
      <div className="dc-cob">
        <Card className="dc-cob__lista">
          <div className="dc-cob__cab">
            <div><h3>Saldos por cobrar</h3><span>{porCobrar.length} {porCobrar.length === 1 ? "paciente" : "pacientes"} con plan en curso</span></div>
            <div className="dc-cob__herr">
              <label className="dc-cob__buscar"><Search size={15} strokeWidth={1.9} /><input value={busCob} onChange={(e) => setBusCob(e.target.value)} placeholder="Buscar paciente" aria-label="Buscar paciente" /></label>
              <div className="dc-env__filtros" role="tablist" aria-label="Ordenar">
                {[["saldo", "Mayor saldo"], ["avance", "Menor avance"], ["nombre", "A–Z"]].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={ordCob === k} onClick={() => setOrdCob(k)}>{l}</button>)}
              </div>
            </div>
          </div>
          {conectado && cajaError ? <Vacio icon={<AlertTriangle size={24} strokeWidth={1.75} />} titulo="Error al cargar saldos" sub="Reintenta o contacta soporte. No hay saldos reales que mostrar." /> : (() => {
            const q = busCob.trim().toLowerCase();
            const lista = porCobrar.filter((x) => !q || String(x.p.nombre || "").toLowerCase().includes(q)).sort((a, b) => ordCob === "nombre" ? String(a.p.nombre).localeCompare(String(b.p.nombre)) : ordCob === "avance" ? (a.pagado / (a.total || 1)) - (b.pagado / (b.total || 1)) : b.saldo - a.saldo);
            if (!lista.length) return <Vacio icon={<CheckCircle2 size={24} strokeWidth={1.75} />} titulo={q ? "Sin resultados" : "Todo cobrado"} sub={q ? "Prueba con otro nombre." : "No hay saldos pendientes en esta sede."} />;
            return (
              <div className="dc-cob__filas">
                {lista.map((x) => { const pct = x.total ? Math.round((x.pagado / x.total) * 100) : 0; const col = colorDe(x.p.nombre); const pc = pct >= 75 ? "#16A36A" : pct >= 40 ? "#0E9199" : "#D97706"; return (
                  <div key={x.p.id} className="dc-cob__fila">
                    <span className="dc-rec__av" style={{ width: 40, height: 40, fontSize: 13, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(x.p.nombre)}</span>
                    <div className="dc-cob__quien"><b>{x.p.nombre}</b><span><MapPin size={11} strokeWidth={2} /> {x.p.sedeNombre || etiquetaSedes(x.p.sedes ?? x.p.sede ?? "")} <i /> {x.pend} {x.pend === 1 ? "fase pendiente" : "fases pendientes"}</span></div>
                    <div className="dc-cob__avance" title={`Cobrado S/ ${x.pagado} de S/ ${x.total}`}>
                      <span className="dc-cob__anillo" style={{ "--p": pct, "--c": pc }}><b>{pct}%</b></span>
                      <div><small>Cobrado</small><span>S/ {Number(x.pagado).toLocaleString("es-PE")} de {Number(x.total).toLocaleString("es-PE")}</span></div>
                    </div>
                    <div className="dc-cob__saldo"><small>Saldo</small><b>S/ {x.saldo.toFixed(2)}</b></div>
                    <button type="button" className="dc-cob__btn" disabled={!cajaAbierta} title={cajaAbierta ? "Registrar cobro" : "Abre la caja para cobrar"} onClick={() => intentarCobrar({ pid: x.p.id, nombre: x.p.nombre, monto: x.saldo })}><DollarSign size={15} strokeWidth={2} /> Cobrar</button>
                  </div>
                ); })}
              </div>
            );
          })()}
        </Card>
        <aside className="dc-cob__lado">
          <div className={`dc-cob__estado${cajaAbierta ? " is-abierta" : ""}`}>
            <span className="dc-cob__estado-ico"><KeyRound size={18} strokeWidth={1.9} /></span>
            <div><small>{!cajaAbierta && jornadaAbiertaPrevia?.id ? `Jornada del ${jornadaAbiertaPrevia.fecha} sin cerrar` : "Caja del día"}</small><b>{cajaAbierta ? "Abierta" : "Cerrada"}</b></div>
            {!cajaAbierta && <button type="button" onClick={() => setTab(jornadaAbiertaPrevia?.id ? "historial" : "apertura")}>{jornadaAbiertaPrevia?.id ? "Ir a historial" : "Abrir caja"}</button>}
          </div>
          <div className="dc-cob__hoy">
            <div><small>Cobrado hoy</small><b>S/ {montoHoy.toLocaleString("es-PE")}</b></div>
            <div><small>Boletas hoy</small><b className="is-neutro">{boletasHoyActivas.length}</b></div>
          </div>
          <Card className="dc-cob__boletas">
            <div className="dc-cob__boletas-cab"><h4>Boletas de hoy</h4><span>{boletasHoy.length}</span></div>
        {boletasHoy.length === 0 ? <Vacio icon={<FileText size={24} strokeWidth={1.75} />} titulo="Sin boletas hoy" sub="Los comprobantes del día aparecerán aquí." />
          : boletasHoy.map((b, i) => (
            <div key={b.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderTop: i ? "1px solid var(--dc-line)" : "none", opacity: b.anulado ? 0.65 : 1 }}>
              <div style={{ background: b.anulado ? "var(--dc-danger-soft)" : "var(--dc-ok-soft)", color: b.anulado ? "var(--dc-danger-700)" : "var(--dc-ok-700)", width: 34, height: 34, borderRadius: "var(--dc-r-sm)", display: "grid", placeItems: "center", flexShrink: 0 }}><CheckCircle2 size={17} strokeWidth={1.75} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY }}>{b.paciente}{b.anulado ? <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: "var(--dc-danger-700)", background: "var(--dc-danger-soft)", padding: "2px 8px", borderRadius: "var(--dc-r-full)" }}>Anulado</span> : null}</div><div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{b.concepto} – {b.metodo}{b.anulado && b.anuladoMotivo ? ` – ${b.anuladoMotivo}` : ""}</div></div>
              <div style={{ fontWeight: 600, color: b.anulado ? "var(--dc-ink-400)" : NAVY, fontFamily: DISPLAY_FONT, textDecoration: b.anulado ? "line-through" : "none" }}>S/ {b.monto.toFixed(2)}</div>
              <button onClick={() => abrirBoleta(b)} style={{ background: "none", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: "6px 11px", cursor: "pointer", color: DS.c.primary, fontWeight: 500, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}><FileText size={14} strokeWidth={1.75} /> Boleta</button>
              {conectado && puedeAbrirCaja && b.id && !b.anulado && (
                <button onClick={() => anularPagoHoy(b.id)} style={{ background: "none", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-sm)", padding: "6px 11px", cursor: "pointer", color: "var(--dc-danger-700)", fontWeight: 500, fontSize: 13 }}>Anular</button>
              )}
            </div>
          ))}
          </Card>
        </aside>
      </div>
      {conectado && (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: verHist ? "1px solid var(--dc-line)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Todos los pagos</h3><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>{histFiltrado.length} pagos este mes – S/ {histFiltrado.reduce((s, p) => s + p.monto, 0).toLocaleString()} – {sedeNombre()}</div></div>
            <Btn small kind="ghost" onClick={() => setVerHist((v) => !v)}>{verHist ? "Ocultar" : "Ver historial"}</Btn>
          </div>
          {histError && (
            <div style={{ padding: "12px 20px", background: "var(--dc-danger-soft)", borderBottom: "1px solid var(--dc-danger-mid)", fontSize: 13, color: "var(--dc-danger-700)", display: "flex", gap: 10, alignItems: "center" }}>
              <AlertTriangle size={16} strokeWidth={1.75} /> No se pudo cargar el historial de pagos.
              <Btn small kind="ghost" onClick={recargarHist}><Repeat size={13} strokeWidth={1.75} /> Reintentar</Btn>
            </div>
          )}
          {verHist && (
            <DataTable titulo="" sub="pagos" bare minWidth={880} rows={histFiltrado} empty={<Vacio icon={<Wallet size={22} strokeWidth={1.75} />} titulo={histError ? "Error al cargar pagos" : "Sin pagos este mes"} sub={histError ? "Reintenta la carga." : "Los cobros del mes aparecerán aquí."} />} cols={[
              { key: "paciente", label: "Paciente", w: "minmax(160px,1.3fr)", a: "left", get: (p) => p.paciente, cell: (p) => <span style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{p.paciente}</span> },
              { key: "sede", label: "Sede", w: "minmax(120px,1fr)", a: "left", get: (p) => p.sede, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{p.sede || "—"}</span> },
              { key: "fecha", label: "Fecha", w: "116px", a: "center", get: (p) => p.fecha, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums" }}>{p.fecha}</span> },
              { key: "concepto", label: "Concepto", w: "minmax(160px,1.4fr)", a: "left", get: (p) => p.concepto, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>{p.concepto}</span> },
              { key: "metodo", label: "Método", w: "130px", a: "center", get: (p) => p.metodo, cell: (p) => { const c = { tarjeta: DS.c.primary, yape: "var(--dc-ink-500)", efectivo: "var(--dc-ok-700)", transferencia: "var(--dc-navy)" }[p.metodo] || "var(--dc-ink-400)"; return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: c, background: tint(c, 0.078), padding: "3px 10px", borderRadius: "var(--dc-r-full)", textTransform: "capitalize" }}>{p.metodo}</span>; } },
              { key: "comprobante", label: "Comprobante", w: "130px", a: "center", get: (p) => p.comprobante, cell: (p) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)", textTransform: "capitalize" }}>{p.comprobante || "—"}</span> },
              { key: "boleta", label: "Boleta", w: "100px", a: "center", noFilter: true, noSort: true, cell: (p) => (p.comprobanteSerie && p.comprobanteNumero != null) ? (
                <button onClick={(e) => { e.stopPropagation(); abrirBoleta({ paciente: p.paciente, comprobanteSerie: p.comprobanteSerie, comprobanteNumero: p.comprobanteNumero, fecha: p.fecha, monto: p.monto, concepto: p.concepto, metodo: p.metodo }); }} style={{ background: "none", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: "5px 9px", cursor: "pointer", color: DS.c.primary, fontWeight: 500, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><FileText size={13} strokeWidth={1.75} /> Ver</button>
              ) : <span style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>—</span> },
              { key: "monto", label: "Monto", w: "120px", a: "right", get: (p) => p.monto, cell: (p) => <span style={{ fontWeight: 600, color: "var(--dc-ok-700)", fontFamily: DISPLAY_FONT, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>S/ {p.monto.toFixed(2)}</span> },
            ]} />
          )}
        </Card>
      )}
      </div>)}

      {tab === "cierre" && (() => {
        const c = cierre || (conectado ? { total: 0, cantidad: 0, porMetodo: {}, movimientos: [] } : (() => {
          const pm = {};
          boletasHoyActivas.forEach((b) => { const m = String(b.metodo || "efectivo").toLowerCase() === "pos" ? "tarjeta" : String(b.metodo || "efectivo").toLowerCase(); pm[m] = (pm[m] || 0) + b.monto; });
          return { total: boletasHoyActivas.reduce((a, b) => a + b.monto, 0), cantidad: boletasHoyActivas.length, porMetodo: pm, movimientos: boletasHoyActivas.map((b, i) => ({ id: null, hora: b.hora || "", paciente: b.paciente, concepto: b.concepto, metodo: String(b.metodo || "").toLowerCase(), monto: b.monto, _k: i })) };
        })());
        const metodos = Object.entries(c.porMetodo || {}).filter(([, v]) => Number(v) > 0);
        const COMISION_PCT = { efectivo: 0, tarjeta: 4.06, yape: 0, plin: 0, transferencia: 0, seguro: 0 };
        const comisionDe = (k, bruto) => Math.round(Number(bruto) * (COMISION_PCT[k] || 0) / 100 * 100) / 100;
        const totalComision = metodos.reduce((s, [k, v]) => s + comisionDe(k, v), 0);
        const netoHoyCierre = Math.round((Number(c.total) - totalComision) * 100) / 100;
        const fondoIni = Number(apertura?.fondo) || 0;
        const cobradoEfectivo = Number((c.porMetodo || {}).efectivo) || 0;
        const egresosEfectivo = egresosHoy.filter((e) => (e.metodo || "efectivo") === "efectivo").reduce((s, e) => s + e.monto, 0);
        const esperadoEfectivo = cajaAbierta
          ? Math.round((fondoIni + cobradoEfectivo - egresosEfectivo + netoMovsCaja) * 100) / 100
          : null;
        const contadoNum = cierreForm.contado === "" ? null : Number(cierreForm.contado);
        const diffNum = (contadoNum != null && esperadoEfectivo != null && !Number.isNaN(contadoNum))
          ? Math.round((contadoNum - esperadoEfectivo) * 100) / 100
          : null;
        const nfmt = (n) => (Number(n) < 0 ? "− " : "") + "S/ " + Math.abs(Number(n) || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const semaforo = diffNum == null ? null : Math.abs(diffNum) < 0.01 ? "cuadra" : diffNum > 0 ? "sobra" : "falta";
        return (
          <div style={{ display: "grid", gap: 16 }}>
            <section className="dc-esp-hero dc-caja-sub">
              <div className="dc-esp-hero__txt">
                <div className="dc-esp-hero__num"><b>{esperadoEfectivo == null ? "—" : nfmt(esperadoEfectivo)}</b><span>efectivo esperado</span></div>
                <p>{cajaAbierta ? `Arqueo de hoy – ${sedeNombre()}${apertura?.abiertaPorNombre ? `, abierta por ${apertura.abiertaPorNombre}` : ""}` : `Caja cerrada – ${sedeNombre()} – ${fechaLegible(fmt(hoy))}`}</p>
              </div>
              <div className="dc-esp-hero__cifras">
                <div><b>{nfmt(c.total)}</b><span>Cobrado hoy</span></div>
                <div><b>{nfmt(netoHoyCierre)}</b><span>Neto estimado</span></div>
                <div><b>{c.cantidad}</b><span>Cobros</span></div>
              </div>
              <span />
              <div className="dc-hero-acc">
                <button type="button" className="dc-esp-hero__agregar" onClick={recargarCierre}><Repeat size={14} strokeWidth={1.9} /> Actualizar</button>
                <button type="button" className="dc-esp-hero__agregar" onClick={() => window.print()}><FileText size={14} strokeWidth={1.9} /> Imprimir</button>
              </div>
            </section>
            <div className="dc-cz">
              <div className="dc-cz__main">
                <Card className="dc-cz__arq">
                  <div className="dc-cz__cab"><span className="dc-cz__cico" style={{ "--t": "#0E9199" }}><Vault size={20} strokeWidth={1.9} /></span><div><h3>Efectivo que debería haber</h3><span>Fondo + cobros en efectivo − egresos ± movimientos</span></div></div>
                  <ul className="dc-cz__libro">
                    <li style={{ "--t": "#0E9199" }}><span className="dc-cz__lico"><Wallet size={16} strokeWidth={2} /></span><div><b>Fondo inicial</b><small>Con el que abriste la caja</small></div><em>{cajaAbierta ? nfmt(fondoIni) : "—"}</em></li>
                    <li style={{ "--t": "#16A36A" }}><span className="dc-cz__lico"><Banknote size={16} strokeWidth={2} /></span><div><b>Cobros en efectivo</b><small>Pagos recibidos en la gaveta</small></div><em>+ {nfmt(cobradoEfectivo)}</em></li>
                    <li style={{ "--t": "#E0694F" }}><span className="dc-cz__lico"><ArrowUpRight size={16} strokeWidth={2} /></span><div><b>Egresos en efectivo</b><small>Gastos pagados desde caja</small></div><em>− {nfmt(egresosEfectivo)}</em></li>
                    <li style={{ "--t": "#6D4FD1" }}><span className="dc-cz__lico"><ArrowUpDown size={16} strokeWidth={2} /></span><div><b>Retiros e ingresos</b><small>Movimientos intermedios</small></div><em>{netoMovsCaja < 0 ? "− " : "+ "}{nfmt(Math.abs(netoMovsCaja))}</em></li>
                  </ul>
                  <div className="dc-cz__esp"><div><small>Efectivo esperado</small><span>{cajaAbierta ? "Compáralo con lo que cuentes" : "Se calcula al abrir la caja"}</span></div><b>{esperadoEfectivo == null ? "—" : nfmt(esperadoEfectivo)}</b></div>
                </Card>
                {cajaAbierta ? (
                  <Card className="dc-cz__conteo">
                    <div className="dc-cz__cab"><span className="dc-cz__cico" style={{ "--t": "#D97706" }}><Coins size={20} strokeWidth={1.9} /></span><div><h3>Cuenta la gaveta</h3><span>Suma billetes y monedas, o escribe el total directamente</span></div>
                      {Object.values(denoms).some((v) => v > 0) && <button type="button" className="dc-cz__limpiar" onClick={() => { setDenoms({}); setCierreForm({ ...cierreForm, contado: "" }); }}>Limpiar</button>}
                    </div>
                    {[["b", "Billetes", Banknote], ["m", "Monedas", Coins]].map(([grp, glbl, GIco]) => (
                    <div key={grp} className="dc-cz__grupo">
                    <div className="dc-cz__glbl"><GIco size={13} strokeWidth={2} /> {glbl}<span>S/ {DENOMS.filter(([, t]) => t === grp).reduce((a2, [dv]) => a2 + dv * (denoms[dv] || 0), 0).toFixed(2)}</span></div>
                    <div className={`dc-cz__denoms is-${grp}`}>
                      {DENOMS.filter(([, t]) => t === grp).map(([v, t]) => { const q = denoms[v] || 0; const set = (nq) => { const nd = { ...denoms, [v]: Math.max(0, nq) }; setDenoms(nd); const tot = DENOMS.reduce((a, [dv]) => a + dv * (nd[dv] || 0), 0); setCierreForm({ ...cierreForm, contado: tot ? tot.toFixed(2) : "" }); }; return (
                        <div key={v} className={`dc-cz__den is-${t}${q ? " is-on" : ""}`}>
                          <span className="dc-cz__dval">{v >= 1 ? `S/ ${v}` : `${Math.round(v * 100)} ct`}</span>
                          <div className="dc-cz__step">
                            <button type="button" className="dc-mini-btn" aria-label={`Quitar ${v}`} onClick={() => set(q - 1)} disabled={!q}><Minus size={13} strokeWidth={2.4} /></button>
                            <input inputMode="numeric" aria-label={`Cantidad de ${v}`} value={q || ""} placeholder="0" onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")) || 0)} />
                            <button type="button" className="dc-mini-btn" aria-label={`Agregar ${v}`} onClick={() => set(q + 1)}><Plus size={13} strokeWidth={2.4} /></button>
                          </div>
                        </div>
                      ); })}
                    </div>
                    </div>
                    ))}
                    <div className="dc-cz__cuadre">
                      <label className="dc-cz__contado"><small>Efectivo contado</small><div><span>S/</span><input inputMode="decimal" aria-label="Efectivo contado (S/)" value={cierreForm.contado} onChange={(e) => { setDenoms({}); setCierreForm({ ...cierreForm, contado: e.target.value.replace(/[^\d.]/g, "") }); }} placeholder={esperadoEfectivo != null ? esperadoEfectivo.toFixed(2) : "0.00"} /></div></label>
                      <div className={`dc-cz__res is-${semaforo || "nada"}`}>
                        <span>{semaforo === "cuadra" ? <CheckCircle2 size={22} strokeWidth={2} /> : semaforo === "falta" ? <TrendingDown size={22} strokeWidth={2} /> : semaforo === "sobra" ? <TrendingUp size={22} strokeWidth={2} /> : <Scale size={22} strokeWidth={2} />}</span>
                        <div><small>Resultado del arqueo</small><b>{semaforo === "cuadra" ? "Cuadra exacto" : semaforo === "falta" ? `Faltan ${nfmt(Math.abs(diffNum))}` : semaforo === "sobra" ? `Sobran ${nfmt(diffNum)}` : "Esperando el conteo"}</b></div>
                      </div>
                    </div>
                    <div className="dc-cz__notas">
                      <Field label={Math.abs(diffNum || 0) > 0.009 ? "Justificación (obligatoria)" : "Justificación (si hay descuadre)"} value={cierreForm.justificacion} onChange={(v) => setCierreForm({ ...cierreForm, justificacion: v })} placeholder="Ej. Faltante por cambio no registrado" />
                      <Field label="Observaciones (opcional)" value={cierreForm.observaciones} onChange={(v) => setCierreForm({ ...cierreForm, observaciones: v })} placeholder="Notas del acta" />
                    </div>
                    <div className="dc-cz__pie">
                      <span><Lock size={13} strokeWidth={2} /> Al cerrar no se registran más cobros hasta reabrir.</span>
                      <button type="button" className="dc-ap2__cta" disabled={cierreBusy || !puedeAbrirCaja} onClick={() => cerrarApertura(esperadoEfectivo)}><Lock size={15} strokeWidth={2} /> {cierreBusy ? "Cerrando…" : "Cerrar caja del día"}</button>
                    </div>
                  </Card>
                ) : (
                  <Card className="dc-cz__bloq">
                    <span><Lock size={24} strokeWidth={1.9} /></span>
                    <div><b>El arqueo se habilita con la caja abierta</b><p>Abre la caja del día para contar la gaveta y cerrar con el resultado del cuadre.</p></div>
                    <button type="button" className="dc-ap2__cta" onClick={() => setTab("apertura")}><KeyRound size={15} strokeWidth={2} /> Ir a apertura</button>
                  </Card>
                )}
              </div>
              <aside className="dc-cz__lado">
                <Card className="dc-cz__cobros">
                  <div className="dc-cz__cab"><span className="dc-cz__cico" style={{ "--t": "#16A36A" }}><Receipt size={20} strokeWidth={1.9} /></span><div><h3>Cobros de hoy</h3><span>{c.cantidad} {c.cantidad === 1 ? "cobro" : "cobros"}</span></div></div>
                  {(() => {
                    const lst = metodos.map(([k, v]) => ({ k, v: Number(v), col: medioUi(k)[1], Ico: medioUi(k)[0] }));
                    let acc = 0;
                    const grad = lst.length && c.total > 0 ? lst.map((m) => { const a = acc; acc += (m.v / c.total) * 100; return `${m.col} ${a}% ${acc}%`; }).join(", ") : "#E6EEEF 0 100%";
                    return (
                      <>
                        <div className="dc-cz__dona" style={{ background: `radial-gradient(closest-side, #fff 70%, transparent 71% 100%), conic-gradient(${grad})` }}><div><small>Total</small><b>{nfmt(c.total)}</b></div></div>
                        {lst.length === 0 ? <p className="dc-cz__nada">Aún no hay cobros registrados hoy.</p> : (
                          <ul className="dc-cz__met">
                            {lst.map((m) => <li key={m.k} style={{ "--m": m.col }}><span><m.Ico size={14} strokeWidth={2} /></span><b>{METODO_LBL[m.k] || m.k}</b><small>{c.total ? Math.round((m.v / c.total) * 100) : 0}%</small><em>{nfmt(m.v)}</em></li>)}
                          </ul>
                        )}
                      </>
                    );
                  })()}
                  <div className="dc-cz__tot">
                    <div><span>Comisión estimada</span><b className="is-mal">− {nfmt(totalComision)}</b></div>
                    <div className="is-neto"><span>Neto estimado</span><b>{nfmt(netoHoyCierre)}</b></div>
                  </div>
                </Card>
                <Card className="dc-cz__movs">
                  <div className="dc-cz__movcab"><h4>Movimientos del día</h4><span>{(c.movimientos || []).length}</span></div>
                  {(c.movimientos || []).length === 0 ? <p className="dc-cz__nada">Los cobros del día aparecerán aquí.</p> : (c.movimientos || []).map((m, i) => { const [Ico, col] = medioUi(m.metodo); return (
                    <div key={m.id || m._k || i} className="dc-cz__mov">
                      <span className="dc-cz__mico" style={{ "--m": col }}><Ico size={14} strokeWidth={2} /></span>
                      <div><b>{m.paciente}</b><small>{m.hora ? `${m.hora} – ` : ""}{m.concepto || "Cobro"}</small></div>
                      <em>{nfmt(m.monto)}</em>
                      {m.id && <div className="dc-cz__macc">
                        <button type="button" className="dc-mini-btn" title="Enviar boleta por WhatsApp" aria-label="Enviar boleta por WhatsApp" onClick={() => api.pagos.enviarWa(m.id).then((r) => notify(r?.ok ? `Boleta enviada a ${m.paciente} por WhatsApp.` : "No se pudo enviar (¿el paciente tiene teléfono?).")).catch(() => notify("No se pudo enviar la boleta."))}><MessageSquare size={13} strokeWidth={2} /></button>
                        {puedeAbrirCaja && <button type="button" className="dc-mini-btn is-mal" title="Anular cobro" aria-label="Anular cobro" onClick={() => anularPagoHoy(m.id)}><X size={13} strokeWidth={2.2} /></button>}
                      </div>}
                    </div>
                  ); })}
                </Card>
              </aside>
            </div>
          </div>
        );
      })()}

      {tab === "historial" && (
        <div style={{ display: "grid", gap: 16 }}>
          {(() => { const js = histCaja || []; const abiertas = js.filter((r) => r.abierta).length; const dif = js.reduce((a, r) => a + (r.diferencia != null ? Number(r.diferencia) : 0), 0); return (
          <section className="dc-esp-hero dc-caja-sub">
            <div className="dc-esp-hero__txt">
              <div className="dc-esp-hero__num"><b>{js.length}</b><span>{js.length === 1 ? "jornada" : "jornadas"}</span></div>
              <p>Esperado frente a contado por sede</p>
            </div>
            <div className="dc-esp-hero__cifras">
              <div><b>{abiertas}</b><span>Abiertas</span></div>
              <div><b>{js.length - abiertas}</b><span>Cerradas</span></div>
              <div><b>{dif < 0 ? "− " : ""}S/ {Math.abs(dif).toFixed(2)}</b><span>Diferencia total</span></div>
            </div>
            <span />
            <div className="dc-hero-acc dc-rango">
              <label><span>Desde</span><input type="date" aria-label="Desde" value={histCajaRango.desde} onChange={(e) => setHistCajaRango({ ...histCajaRango, desde: e.target.value })} /></label>
              <label><span>Hasta</span><input type="date" aria-label="Hasta" value={histCajaRango.hasta} onChange={(e) => setHistCajaRango({ ...histCajaRango, hasta: e.target.value })} /></label>
              <button type="button" className="dc-esp-hero__btn" onClick={recargarHistCaja}><Repeat size={14} strokeWidth={1.9} /> Actualizar</button>
            </div>
          </section>
          ); })()}
          {cierreAdmin && (
            <Card style={{ padding: 16, display: "grid", gap: 12, maxWidth: 520, border: "1px solid var(--dc-warn-600)" }}>
              <h4 style={{ margin: 0, color: NAVY }}>Cerrar jornada fuera de fecha</h4>
              <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Fecha <strong>{cierreAdmin.fecha}</strong> – sede {sedes.find((s) => s.id === cierreAdmin.sedeId)?.nombre || "—"} – fondo S/ {Number(cierreAdmin.fondo || 0).toFixed(2)}</div>
              <Field label="Efectivo contado (S/)" value={cierreAdminForm.contado} onChange={(v) => setCierreAdminForm({ ...cierreAdminForm, contado: v })} placeholder={String(Number(cierreAdmin.fondo || 0).toFixed(2))} />
              <Field label="Justificación (obligatoria)" value={cierreAdminForm.justificacion} onChange={(v) => setCierreAdminForm({ ...cierreAdminForm, justificacion: v })} placeholder="Ej. Jornada histórica sin arqueo – cierre admin QA" />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn kind="navy" disabled={cierreAdminBusy || !puedeAbrirCaja} onClick={cerrarJornadaAdmin}>{cierreAdminBusy ? "Cerrando…" : "Cerrar con justificación"}</Btn>
                <Btn kind="ghost" onClick={() => { setCierreAdmin(null); setCierreAdminForm({ contado: "", justificacion: "" }); }}>Cancelar</Btn>
              </div>
            </Card>
          )}
          {(histCaja || []).length === 0 ? <Card><Vacio icon={<Clock size={22} strokeWidth={1.75} />} titulo="Sin jornadas en el rango" sub="Abre y cierra caja para ver el historial." /></Card> : (
          <div className="dc-jor">
            {histCaja.map((r) => {
              const f = new Date(`${r.fecha}T12:00:00`);
              const hora = (x) => x ? new Date(x).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "—";
              const d = r.diferencia != null ? Number(r.diferencia) : null;
              const est = r.abierta ? "abierta" : d == null ? "cerrada" : Math.abs(d) < 0.01 ? "cuadra" : d < 0 ? "falta" : "sobra";
              const hoyLima = ymdLima(new Date()) || fmt(hoy);
              const esp = Number(r.efectivoEsperado) || 0, con = Number(r.efectivoContado) || 0;
              return (
              <article key={r.id || r.fecha} className={`dc-jor__card is-${est}`}>
                <div className="dc-jor__fecha"><b>{isNaN(f) ? "—" : f.getDate()}</b><span>{isNaN(f) ? r.fecha : f.toLocaleDateString("es-PE", { month: "short" }).replace(".", "")}</span><small>{isNaN(f) ? "" : f.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "")}</small></div>
                <div className="dc-jor__info">
                  <b><MapPin size={13} strokeWidth={2} /> {sedes.find((x) => x.id === r.sedeId)?.nombre || r.sedeNombre || "—"}</b>
                  <span><Clock size={12} strokeWidth={2} /> {hora(r.abiertaEn)} a {r.abierta ? "en curso" : hora(r.cerradaEn)}</span>
                  <span className="dc-jor__quien">Abrió {r.abiertaPorNombre || "—"}{!r.abierta && r.cerradaPorNombre ? `, cerró ${r.cerradaPorNombre}` : ""}</span>
                </div>
                <div className="dc-jor__arq">
                  <div><small>Fondo</small><b>S/ {Number(r.fondo || 0).toFixed(2)}</b></div>
                  <div><small>Esperado</small><b>{r.efectivoEsperado != null ? `S/ ${esp.toFixed(2)}` : "—"}</b></div>
                  <div><small>Contado</small><b>{r.efectivoContado != null ? `S/ ${con.toFixed(2)}` : "—"}</b></div>
                </div>
                <div className="dc-jor__res">
                  <span className="dc-jor__dif">{est === "abierta" ? "Abierta" : est === "cuadra" ? "Cuadra exacto" : est === "cerrada" ? "Cerrada" : `${est === "falta" ? "Faltan" : "Sobran"} S/ ${Math.abs(d).toFixed(2)}`}</span>
                  {r.abierta && puedeAbrirCaja && r.fecha !== hoyLima && <button type="button" onClick={() => { setCierreAdmin({ id: r.id, fecha: r.fecha, sedeId: r.sedeId, fondo: Number(r.fondo) || 0 }); setCierreAdminForm({ contado: String(Number(r.fondo) || 0), justificacion: "" }); }}>Cerrar jornada</button>}
                  {r.abierta && r.fecha === hoyLima && <button type="button" onClick={() => setTab("cierre")}>Ir a cierre</button>}
                </div>
              </article>
              );
            })}
          </div>
          )}
        </div>
      )}

      {tab === "movimientos" && puedeVerMovimientos && (() => {
        if (conectado && cajaError) {
          return (
            <Card style={{ padding: 20, background: "var(--dc-danger-soft)", border: "1px solid var(--dc-danger-mid)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <AlertTriangle size={20} strokeWidth={1.75} color="var(--dc-red)" />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 500, color: "var(--dc-danger-700)", fontSize: 14 }}>No se pudieron cargar los movimientos</div>
                  <div style={{ fontSize: 13, color: "var(--dc-danger-700)", marginTop: 4, lineHeight: 1.45 }}>No interpretés ceros aquí: la carga de caja falló. Reintenta para ver ingresos y egresos reales del día.</div>
                </div>
                <Btn small kind="ghost" onClick={recargarCaja}><Repeat size={14} strokeWidth={1.75} /> Reintentar</Btn>
              </div>
            </Card>
          );
        }
        const metCol = { tarjeta: DS.c.primary, yape: "var(--dc-ink-500)", efectivo: "var(--dc-ok-700)", transferencia: "var(--dc-navy)" };
        const movs = [
          ...boletasHoyActivas.map((b, i) => ({ id: "i" + i, tipo: "ingreso", concepto: b.concepto || "Cobro", detalle: b.paciente, monto: b.monto, metodo: String(b.metodo || "").toLowerCase() })),
          ...egresosHoy.map((e) => ({ id: "e" + e.id, tipo: "egreso", concepto: e.concepto, detalle: e.categoria, monto: e.monto, metodo: e.metodo })),
        ];
        return (
        <div style={{ display: "grid", gap: 16 }}>
          <section className="dc-esp-hero dc-caja-sub">
            <div className="dc-esp-hero__txt">
              <div className="dc-esp-hero__num"><b className={netoHoy < 0 ? "is-neg" : ""}>{netoHoy < 0 ? "− " : ""}S/ {Math.abs(netoHoy).toLocaleString("es-PE")}</b><span>neto del día</span></div>
              <p>Flujo de caja de hoy – {fechaLegible(fmt(hoy))}</p>
            </div>
            <div className="dc-esp-hero__cifras">
              <div><b>S/ {ingresosHoy.toLocaleString("es-PE")}</b><span>Ingresos, {boletasHoyActivas.length} {boletasHoyActivas.length === 1 ? "cobro" : "cobros"}</span></div>
              <div><b>S/ {totEgresosHoy.toLocaleString("es-PE")}</b><span>Egresos, {egresosHoy.length} {egresosHoy.length === 1 ? "gasto" : "gastos"}</span></div>
            </div>
            <span />
            {puedeEgresos && <div className="dc-hero-acc"><button type="button" className="dc-esp-hero__btn is-coral" onClick={() => setEgForm({ concepto: "", categoria: "Insumos", monto: "", metodo: "efectivo" })}><Plus size={14} strokeWidth={2} /> Nuevo egreso</button></div>}
          </section>
          <div className="dc-flujo">
            {[["ingreso", "Ingresos", "Cobros a pacientes", ingresosHoy, ArrowDownRight], ["egreso", "Egresos", "Gastos de la clínica", totEgresosHoy, ArrowUpRight]].map(([t, tit, sub, tot, Ico]) => {
              const lista = movs.filter((m) => m.tipo === t);
              return (
              <section key={t} className={`dc-flujo__col is-${t}`}>
                <header>
                  <span className="dc-flujo__ico"><Ico size={18} strokeWidth={2} /></span>
                  <div><h3>{tit}</h3><span>{sub} – {lista.length} {lista.length === 1 ? "movimiento" : "movimientos"}</span></div>
                  <b>{t === "ingreso" ? "+" : "−"} S/ {tot.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</b>
                </header>
                {lista.length === 0 ? (
                  <div className="dc-flujo__vacio">{t === "ingreso" ? "Aún no hay cobros hoy." : "Sin gastos registrados hoy."}
                    {t === "egreso" && puedeEgresos && <button type="button" onClick={() => setEgForm({ concepto: "", categoria: "Insumos", monto: "", metodo: "efectivo" })}><Plus size={13} strokeWidth={2} /> Registrar egreso</button>}
                  </div>
                ) : (
                  <ul>
                    {lista.map((m) => { const c = metCol[m.metodo] || "var(--dc-ink-400)"; return (
                      <li key={m.id}>
                        <div className="dc-flujo__txt"><b>{m.concepto}</b><span>{m.detalle}</span></div>
                        <span className="dc-flujo__met" style={{ color: c, background: tint(c, 0.08) }}>{m.metodo || "—"}</span>
                        <b className="dc-flujo__monto">{t === "ingreso" ? "+" : "−"} S/ {Number(m.monto).toFixed(2)}</b>
                      </li>
                    ); })}
                  </ul>
                )}
              </section>
              );
            })}
          </div>
        </div>
        );
      })()}

      {tab === "links" && (() => {
        const activos = links.filter((l) => l.estado === "pendiente");
        const cobrado = links.filter((l) => l.estado === "pagado").reduce((s, l) => s + l.monto, 0);
        const pend = activos.reduce((s, l) => s + l.monto, 0);
        return (
        <div style={{ display: "grid", gap: 16 }}>
          <section className="dc-esp-hero dc-caja-sub">
            <div className="dc-esp-hero__txt">
              <div className="dc-esp-hero__num"><b>{links.length}</b><span>{links.length === 1 ? "link de pago" : "links de pago"}</span></div>
              <p>Cobra a distancia desde el celular del paciente</p>
            </div>
            <div className="dc-esp-hero__cifras">
              <div><b>{activos.length}</b><span>Esperando pago</span></div>
              <div><b>S/ {cobrado.toLocaleString("es-PE")}</b><span>Cobrado</span></div>
              <div><b>S/ {pend.toLocaleString("es-PE")}</b><span>Pendiente</span></div>
            </div>
            <span />
            <div className="dc-hero-acc"><button type="button" className="dc-esp-hero__btn" onClick={() => setLinkForm({ paciente: "", monto: "", concepto: "" })}><Plus size={14} strokeWidth={2} /> Nuevo link</button></div>
          </section>
          <div className="fm-aviso-edad is-info">
            <Zap size={15} strokeWidth={2} />
            <span><b>Pasarela sin conectar.</b> Cuando se conecte (Niubiz, Culqi o similar), el paciente pagará desde su celular y el cobro entrará a Caja.</span>
          </div>
          {links.length === 0 ? <Card><Vacio icon={<Zap size={22} strokeWidth={1.75} />} titulo="Sin links" sub="Crea el primer link de pago." /></Card> : (
          <div className="dc-tickets">
            {links.map((l) => {
              const url = `pay.dentocheck.pe/${String(l.id).padStart(4, "0")}${l.paciente.split(" ")[0].toLowerCase()}`;
              const pagado = l.estado === "pagado";
              const col = colorDe(l.paciente);
              return (
              <article key={l.id} className={`dc-ticket${pagado ? " is-pagado" : ""}`}>
                <div className="dc-ticket__top">
                  <span className="dc-rec__av" style={{ width: 38, height: 38, fontSize: 12.5, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(l.paciente)}</span>
                  <div className="dc-ticket__quien"><b>{l.paciente}</b><span>{l.concepto || "Pago de tratamiento"}</span></div>
                  <span className={`dc-pill ${pagado ? "is-ok" : "is-warn"}`}>{pagado ? <><CheckCircle2 size={12} strokeWidth={2} /> Pagado</> : <><Clock size={12} strokeWidth={2} /> Pendiente</>}</span>
                </div>
                <div className="dc-ticket__monto"><small>Monto</small><b>S/ {l.monto.toFixed(2)}</b></div>
                <div className="dc-ticket__corte" aria-hidden="true" />
                <div className="dc-ticket__pie">
                  <span className="dc-ticket__url"><Link2 size={13} strokeWidth={2} /> {url}</span>
                  <div className="dc-ticket__acc">
                    <button type="button" onClick={() => { try { navigator.clipboard?.writeText(url); notify("Link de ejemplo copiado. Todavía no resuelve: falta conectar la pasarela."); } catch { notify(`Link: ${url}`); } }} title="Copiar link"><Copy size={14} strokeWidth={2} /> Copiar</button>
                    {!pagado && <button type="button" className="is-wa" onClick={() => notify("Los links de pago todavía no están conectados a una pasarela: no se envió nada.")} title="Enviar por WhatsApp"><MessageSquare size={14} strokeWidth={2} /> Enviar</button>}
                  </div>
                </div>
              </article>
              );
            })}
          </div>
          )}
        </div>
        );
      })()}

      {pago && <ModalCobro monto={pago.monto} pacienteId={conectado ? pago.pid : null} sedeId={sedeUuid()} paciente={pago.nombre} items={itemsDe(pago.pid)} concepto="Cobro de saldo en caja" onClose={() => setPago(null)} onAprobado={aprobar} notify={notify} />}
      {boletaVer && <BoletaView boleta={boletaVer} onClose={() => setBoletaVer(null)} />}
      {datosFact && <DatosFacturacion onClose={() => setDatosFact(false)} notify={notify} readOnly={fiscalReadOnly} />}
      {egForm && (() => {
        const mets = [["efectivo", "Efectivo", DollarSign], ["tarjeta", "Tarjeta", CreditCard], ["transferencia", "Transferencia", Wallet], ["yape", "Yape", Zap]];
        return (
        <Modal icon={<Wallet size={20} strokeWidth={1.75} />} tone={RED} titulo="Registrar egreso" sub="Gasto de la clínica que sale de caja" onClose={() => setEgForm(null)} maxW={520}
          footer={<><Btn small kind="ghost" onClick={() => setEgForm(null)}>Cancelar</Btn><Btn small kind="red" onClick={guardarEgreso}><Check size={15} strokeWidth={1.75} /> Registrar egreso</Btn></>}>
          <Field label="Concepto" value={egForm.concepto} onChange={(v) => setEgForm({ ...egForm, concepto: v })} placeholder="Ej. Compra de guantes y mascarillas" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Categoría</label>
              <Select value={egForm.categoria} onChange={(v) => setEgForm({ ...egForm, categoria: v })}
                      options={EGRESO_CATS.map((c) => ({ value: c, label: c }))} />
            </div>
            <Field label="Monto (S/)" value={egForm.monto} onChange={(v) => setEgForm({ ...egForm, monto: v.replace(/[^\d.]/g, "") })} placeholder="0.00" />
          </div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", margin: "16px 0 7px" }}>Método de pago</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {mets.map(([k, l, Ic]) => { const on = egForm.metodo === k; return (
              <button key={k} onClick={() => setEgForm({ ...egForm, metodo: k })} style={{ flex: "1 1 100px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: "var(--dc-r-md)", border: on ? "1.5px solid var(--dc-danger-700)" : "1.5px solid var(--dc-line)", background: on ? "var(--dc-fee2)" : "#fff", color: on ? "var(--dc-danger-700)" : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}><Ic size={15} strokeWidth={1.75} /> {l}</button>
            ); })}
          </div>
        </Modal>
        );
      })()}
      {linkForm && (() => {
        const url = linkForm.paciente ? `pay.dentocheck.pe/${linkForm.paciente.split(" ")[0].toLowerCase()}${(linkForm.monto || "0")}` : "pay.dentocheck.pe/…";
        return (
        <Modal icon={<Zap size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Nuevo link de pago" sub="Vista previa: todavía no se puede cobrar con estos links" onClose={() => setLinkForm(null)} maxW={520}
          footer={<><Btn small kind="ghost" onClick={() => setLinkForm(null)}>Cancelar</Btn><Btn small onClick={crearLink}><Zap size={15} strokeWidth={1.75} /> Generar link</Btn></>}>
          <Field label="Paciente" value={linkForm.paciente} onChange={(v) => setLinkForm({ ...linkForm, paciente: v })} placeholder="Nombre del paciente" />
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginTop: 14 }}>
            <Field label="Concepto" value={linkForm.concepto} onChange={(v) => setLinkForm({ ...linkForm, concepto: v })} placeholder="Ej. Abono de ortodoncia" />
            <Field label="Monto (S/)" value={linkForm.monto} onChange={(v) => setLinkForm({ ...linkForm, monto: v.replace(/[^\d.]/g, "") })} placeholder="0.00" />
          </div>
          <div style={{ marginTop: 16, background: "var(--dc-white)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-lg)", padding: "13px 15px" }}>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--dc-accent-cyan)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Zap size={13} strokeWidth={1.75} /> Vista previa del link</div>
            <div style={{ fontSize: 13, color: "var(--dc-brand-500)", fontWeight: 500, wordBreak: "break-all" }}>{url}</div>
          </div>
        </Modal>
        );
      })()}
    </div>
  );
}

/* ---- Tickets de citas (rol Recepción): cada cita es un ticket con su estado y
   la relación de pagos del paciente; permite check-in y cobro del saldo. ---- */
function Tickets({ citas, setCitas, fichas = {}, notify }) {
  const [detalle, setDetalle] = useState(null); // cita para el modal de detalle
  const [pago, setPago] = useState(null); // { monto, nombre }
  const idPorNombre = useMemo(() => Object.fromEntries(PACIENTES_INIT.map((p) => [p.nombre, p.id])), []);
  const datosPago = (nombre) => {
    const ficha = fichas[idPorNombre[nombre]];
    if (!ficha) return { pagos: [], saldo: 0, total: 0, pagado: 0 };
    const trat = ficha.tratamiento || [];
    const total = trat.reduce((s, f) => s + f.costo, 0);
    const pagado = trat.filter((f) => f.estado === "atendida").reduce((s, f) => s + f.costo, 0);
    return { pagos: ficha.pagos || [], saldo: total - pagado, total, pagado };
  };
  const ordenadas = [...citas].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const checkin = (c) => { setCitas((cs) => cs.map((x) => x.id === c.id ? { ...x, llegada: !x.llegada } : x)); notify(c.llegada ? `Llegada anulada de ${c.paciente}.` : `${c.paciente} marcó llegada.`); };

  const pill = (bg, fg, ic, t) => <span style={{ fontSize: 12, fontWeight: 500, color: fg, background: bg, padding: "4px 10px", borderRadius: "var(--dc-r-full)", display: "inline-flex", alignItems: "center", gap: 5 }}>{ic}{t}</span>;
  const enSala = ordenadas.filter((c) => c.llegada).length;
  const porCobrar = ordenadas.filter((c) => datosPago(c.paciente).saldo > 0);
  const saldoTotal = porCobrar.reduce((s, c) => s + datosPago(c.paciente).saldo, 0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 12 }}>
      <Card style={{ padding: 16, background: "linear-gradient(120deg, rgba(254,243,199,0.7), rgba(254,243,199,0.3))", border: "1px solid rgba(253,230,138,0.8)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Ticket size={18} strokeWidth={1.75} color={RED} /><div style={{ fontSize: 13, color: "var(--dc-warn-600)" }}>Cada cita es un <strong>ticket</strong>. Marca la llegada, abre el ticket para ver la relación de pagos y cobra el saldo pendiente. Solo ves las citas de tu sede.</div></div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <KpiCard label="Tickets de hoy" value={ordenadas.length} color={NAVY} icon={<Ticket size={18} strokeWidth={1.75} />} sub="citas de tu sede" />
        <KpiCard label="En sala" value={enSala} color="var(--dc-ok-700)" icon={<UserCheck size={18} strokeWidth={1.75} />} sub="pacientes presentes" />
        <KpiCard label="Por cobrar" value={porCobrar.length} color={porCobrar.length ? RED : "var(--dc-ok-700)"} icon={<CreditCard size={18} strokeWidth={1.75} />} sub="con saldo pendiente" />
        <KpiCard label="Saldo en sala" value={`S/ ${saldoTotal.toLocaleString()}`} color={TEAL} icon={<Wallet size={18} strokeWidth={1.75} />} sub="por recaudar hoy" />
      </div>
      <DataTable titulo="Tickets de citas" sub="tickets" minWidth={1040} rows={ordenadas} onRowClick={(c) => setDetalle(c)} defaultSort={{ key: "hora", dir: "asc" }} empty={<Vacio icon={<Ticket size={24} strokeWidth={1.75} />} titulo="Sin tickets" sub="No hay citas en tu sede por ahora." />} cols={[
        { key: "id", label: "Ticket", w: "minmax(72px,0.6fr)", a: "right", get: (c) => String(c.id).padStart(3, "0"), cell: (c) => <span style={{ fontWeight: 600, color: NAVY, fontSize: 13, fontFamily: DISPLAY_FONT }}>#{String(c.id).padStart(3, "0")}</span> },
        { key: "hora", label: "Hora", w: "72px", a: "center", get: (c) => c.hora, cell: (c) => <span style={{ fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, fontVariantNumeric: "tabular-nums" }}>{c.hora}</span> },
        { key: "paciente", label: "Paciente", w: "minmax(150px,1.4fr)", a: "left", get: (c) => c.paciente, cell: (c) => <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: tint(NAVY, 0.071), color: NAVY, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{iniciales(c.paciente)}</div><span style={{ fontWeight: 500, color: NAVY, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.paciente}</span></div> },
        { key: "motivo", label: "Motivo", w: "minmax(130px,1.3fr)", a: "left", get: (c) => c.motivo, cell: (c) => <span style={{ fontSize: 13, color: "var(--dc-ink-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.motivo}</span> },
        { key: "medico", label: "Odontólogo", w: "minmax(124px,1.1fr)", a: "left", get: (c) => (MEDICOS.find((m) => m.id === c.medicoId) || {}).nombre || "—", cell: (c) => { const m = MEDICOS.find((x) => x.id === c.medicoId); return <span style={{ fontSize: 13, color: "var(--dc-ink-700)", display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}><span style={{ width: 8, height: 8, borderRadius: "var(--dc-r-full)", background: m?.color || NAVY, flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m?.nombre || "—"}</span></span>; } },
        { key: "llegada", label: "Llegada", w: "minmax(100px,0.8fr)", a: "center", get: (c) => c.llegada ? "En sala" : "Por llegar", cell: (c) => c.llegada ? pill("var(--dc-ok-soft)", "var(--dc-ok-700)", <CheckCircle2 size={13} strokeWidth={1.75} />, "En sala") : pill("var(--dc-warn-soft)", "var(--dc-warn-600)", <Clock size={12} strokeWidth={1.75} />, "Por llegar") },
        { key: "estado", label: "Estado", w: "minmax(100px,0.8fr)", a: "center", get: (c) => c.estado, cell: (c) => <Badge estado={c.estado} /> },
        { key: "saldo", label: "Saldo", w: "minmax(88px,0.7fr)", a: "right", get: (c) => datosPago(c.paciente).saldo, cell: (c) => { const s = datosPago(c.paciente).saldo; return <span style={{ fontWeight: 600, fontFamily: DISPLAY_FONT, color: s > 0 ? RED : "var(--dc-ok-700)" }}>S/ {s.toFixed(0)}</span>; } },
        { key: "acc", label: "Acciones", w: "minmax(150px,1.1fr)", a: "center", noFilter: true, noSort: true, cell: (c) => { const dp = datosPago(c.paciente); return <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}><Btn small kind="ghost" onClick={() => checkin(c)}><UserCheck size={14} strokeWidth={1.75} /> {c.llegada ? "Anular" : "Llegada"}</Btn>{dp.saldo > 0 && <Btn small kind="red" onClick={() => setPago({ monto: dp.saldo, nombre: c.paciente })}><CreditCard size={14} strokeWidth={1.75} /> Cobrar</Btn>}</span>; } },
      ]} />
      {detalle && (() => { const dp = datosPago(detalle.paciente); const med = MEDICOS.find((m) => m.id === detalle.medicoId); return (
        <Modal icon={<Ticket size={20} strokeWidth={1.75} />} titulo={`Ticket #${String(detalle.id).padStart(3, "0")} – ${detalle.paciente}`} sub={`${detalle.hora} – ${detalle.motivo}${med ? ` – ${med.nombre}` : ""}`} onClose={() => setDetalle(null)} maxW={560} footer={dp.saldo > 0 ? <Btn kind="red" onClick={() => { setPago({ monto: dp.saldo, nombre: detalle.paciente }); setDetalle(null); }}><CreditCard size={15} strokeWidth={1.75} /> Cobrar S/ {dp.saldo.toFixed(0)}</Btn> : <Btn kind="ghost" onClick={() => setDetalle(null)}>Cerrar</Btn>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
            {[["Total", dp.total, NAVY], ["Pagado", dp.pagado, "var(--dc-ok-700)"], ["Saldo", dp.saldo, dp.saldo > 0 ? RED : "var(--dc-ok-700)"]].map(([l, v, col]) => <div key={l} style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-lg)", padding: "12px 14px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500 }}>{l}</div><div style={{ fontSize: 18, fontWeight: 600, color: col, fontFamily: DISPLAY_FONT, marginTop: 2 }}>S/ {v.toFixed(2)}</div></div>)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 8 }}>Relación de pagos del paciente</div>
          {dp.pagos.length === 0 ? <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Sin pagos registrados.</div> : dp.pagos.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i ? "1px solid var(--dc-line)" : "none", fontSize: 13 }}>
              <span style={{ color: "var(--dc-ink-700)" }}>{p.fecha} – {p.concepto} <span style={{ color: "var(--dc-ink-500)" }}>({p.metodo})</span></span>
              <span style={{ fontWeight: 500, color: NAVY }}>S/ {p.monto}</span>
            </div>
          ))}
        </Modal>
      ); })()}
      {pago && <ModalCobro monto={pago.monto} onClose={() => setPago(null)} onAprobado={() => { setPago(null); notify(`Pago de ${pago.nombre} aprobado. ${auth.token ? "Comprobante registrado (todavía no se envía a SUNAT)." : "Boleta electrónica emitida (SUNAT)."}`); }} />}
    </div>
  );
}

/* ---- Disponibilidad (rol médico): horario semanal + bloqueos por horas ---- */
/* Selector de hora con estilo propio (reemplaza al spinner nativo). */

/* ---- Mi producción (rol médico: solo SUS números) ---- */
function MiProduccion({ usuario, citas }) {
  const conectado = !!auth.token;
  // Conectado: los números REALES del médico en sesión (GET /api/mi-produccion).
  // Antes todo esto era inventado: producción del mes fija en 9200, 58 atenciones,
  // una tendencia [6200, 7100, ...] escrita a mano y un desglose por tratamiento fijo.
  const [real, setReal] = useState(null);
  const [detK, setDetK] = useState(null);
  useEffect(() => {
    if (conectado) api.miProduccion().then(setReal).catch(() => setReal({ fallo: true }));
  }, []); // eslint-disable-line

  const miId = 1; // demo: doctor logueado = Dra. Mendoza
  const misCitas = citas.filter((c) => c.medicoId === miId);
  const precio = (c) => ESPECIALIDADES.find((x) => x.id === c.esp)?.precio || 100;
  const miMed = MEDICOS.find((m) => m.nombre === usuario.nombre) || MEDICOS[0];
  // La meta la fija gerencia (endpoint /medicos/{id}/meta). Conectado se lee de ahi;
  // si nadie la fijo llega null y la tarjeta lo dice, en vez del 12000 que habia aqui.
  const meta = real && real.esMedico ? (Number(real.meta) || null) : (miMed.meta || null);

  const R = real && real.esMedico ? real : null;
  const prodHoy = R ? (Number(R.produccionHoy) || 0)
    : misCitas.filter((c) => c.fecha === fmt(hoy) && (c.estado === "atendida" || c.estado === "en_atencion")).reduce((s, c) => s + precio(c), 0);
  const mesProd = R ? (Number(R.produccionMes) || 0) : (Number(miMed.prodDemo) || 0);
  const mesAnterior = R ? (Number(R.produccionMesAnterior) || 0) : 7900;
  const comision = R ? (Number(R.comisionMes) || 0) : mesProd * 0.4;
  // El porcentaje pactado con este medico. En demostracion, el 40 del ejemplo.
  const pctComision = R ? (R.porcentajeComision != null ? Number(R.porcentajeComision) : null) : 40;
  const atenciones = R ? (R.atenciones || 0) : (Number(miMed.citasDemo) || 0);
  const ticket = R ? Math.round(Number(R.ticketPromedio) || 0) : Math.round(mesProd / atenciones);
  const deltaProd = mesAnterior > 0 ? Math.round(((mesProd - mesAnterior) / mesAnterior) * 100) : 0;
  // DEV-12: sin relleno de tasa inventada; sin dato → null y la UI muestra guion.
  const noShow = R && R.ausentismo != null ? Number(R.ausentismo) : null;
  const pct = meta > 0 ? Math.min(100, Math.round((mesProd / meta) * 100)) : null;
  const tend = R?.tendencia?.length
    ? R.tendencia.map((t) => Math.round(Number(t.produccion) || 0))
    : [];
  // El nombre de cada mes viene con la serie. Estaba rotulado E-F-M-A-M-J fijo, así que
  // en agosto las seis barras decían ser de enero a junio.
  const tendMeses = R?.tendencia?.length
    ? R.tendencia.map((t) => String(t.mes || "").slice(0, 3))
    : (() => { const M = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"], d = new Date(), o = [];
        for (let i = 5; i >= 0; i--) o.push(M[(d.getMonth() - i + 12) % 12]); return o; })();
  // Las citas de hoy del médico en sesión. Se contaban sobre el array de la
  // demostración filtrado por medicoId === 1, o sea las de la doctora del ejemplo.
  const citasHoyN = R ? (Number(R.citasHoy) || 0) : misCitas.filter((c) => c.fecha === fmt(hoy)).length;
  const promedio = tend.length ? Math.round(tend.reduce((a, b) => a + b, 0) / tend.length) : 0;
  const PALETA = ["var(--dc-purple)", DS.c.accent, DS.c.primary, "var(--dc-ok-700)", "var(--dc-ink-500)"];
  const porTrat = R?.porEspecialidad?.length
    ? R.porEspecialidad.slice(0, 5).map((e, i) => ({ n: e.especialidad, v: Math.round(Number(e.produccion) || 0), c: PALETA[i] || "var(--dc-ink-500)" }))
    : [
    { n: "Endodoncia", v: 3500, c: "var(--dc-purple)" }, { n: "Ortodoncia", v: 2400, c: DS.c.primary },
    { n: "Rehabilitación", v: 1900, c: DS.c.primary }, { n: "Limpieza / Profilaxis", v: 900, c: "var(--dc-ok-700)" }, { n: "Otros", v: 500, c: "var(--dc-ink-500)" },
  ];
  const totalTrat = porTrat.reduce((s, t) => s + t.v, 0) || 1;
  const top = porTrat[0] || { n: "—", v: 0 }; const topPct = Math.round((top.v / totalTrat) * 100);

  // Si el usuario conectado NO es odontólogo (un administrador, recepción), este módulo
  // no aplica: se dice claramente en vez de caer a los números de demostración, que era
  // justo el problema — un admin viendo "su" producción inventada.
  if (conectado && real && real.fallo) {
    return (
      <Vacio icon={<AlertTriangle size={26} strokeWidth={1.75} />}
             titulo="No se pudieron cargar tus números"
             sub="No llegó la respuesta del servidor. Se prefiere no mostrar nada antes que enseñar cifras que no son tuyas." />
    );
  }
  if (conectado && real && real.esMedico === false) {
    return (
      <Vacio icon={<Stethoscope size={26} strokeWidth={1.75} />}
             titulo="Este panel es para odontólogos"
             sub="Muestra la producción y la comisión de quien atiende pacientes, y tu usuario no tiene ficha de médico. Para ver los números de toda la clínica, entra a Comisiones o al Dashboard gerencial." />
    );
  }
  const kpis = [
    { l: "Producción del mes", v: `S/ ${mesProd.toLocaleString()}`, icon: Wallet, color: NAVY, delta: deltaProd, desc: `Suma de tus tratamientos facturados este mes. Vas ${deltaProd >= 0 ? "+" : ""}${deltaProd}% vs. el mes anterior (S/ ${mesAnterior.toLocaleString()}).` },
    // El porcentaje sale del que tiene pactado este médico (backend: porcentajeComision),
    // no de un 40% escrito a mano: el importe ya se calculaba con el suyo y la etiqueta
    // decía otra cosa.
    { l: pctComision != null ? `Mi comisión (${pctComision}%)` : "Mi comisión", v: `S/ ${comision.toLocaleString()}`, icon: Percent, color: RED, sub: "Se paga el 5 del mes", desc: pctComision != null ? `El ${pctComision}% de tu producción (S/ ${mesProd.toLocaleString()}). Se liquida el día 5 del mes siguiente.` : `Sobre una producción de S/ ${mesProd.toLocaleString()}. Se liquida el día 5 del mes siguiente. Tu porcentaje lo fija administración.` },
    { l: "Producción de hoy", v: `S/ ${prodHoy.toLocaleString()}`, icon: TrendingUp, color: "var(--dc-ok-700)", sub: `${citasHoyN} citas hoy`, desc: `Lo facturado en tus atenciones de hoy (${citasHoyN} citas programadas).` },
    { l: "Promedio por atención", v: `S/ ${ticket}`, icon: CreditCard, color: DS.c.primary, sub: `${atenciones} atenciones del mes`, desc: `Producción del mes dividida entre tus ${atenciones} atenciones. Subirlo con tratamientos de mayor valor mejora tu comisión.` },
    { l: "Tasa de ausentismo", v: noShow != null ? `${noShow}%` : "—", icon: TrendingDown, color: DS.c.primary, sub: "de tus citas", desc: `Porcentaje de citas canceladas o no asistidas sobre tu agenda. Los recordatorios automáticos ayudan a bajarlo.` },
    // La calificación real de este médico (backend: calificacion / resenas). Era un
    // "4.9 ★ – 120 reseñas" escrito a mano: un doctor sin una sola reseña lo veía igual.
    ...(R
      ? (R.calificacion != null
          ? [{ l: "Calificación", v: `${R.calificacion} ★`, icon: Star, color: "var(--dc-warn-600)", sub: `${R.resenas} reseña${R.resenas === 1 ? "" : "s"}`, desc: `Tu promedio en ${R.resenas} reseña${R.resenas === 1 ? "" : "s"} de pacientes. Una nota alta atrae más pacientes por recomendación.` }]
          : [{ l: "Calificación", v: "—", icon: Star, color: "var(--dc-warn-600)", sub: "sin reseñas todavía", desc: "Todavía ningún paciente ha calificado tu atención. Las encuestas automáticas se envían tras la cita." }])
      : [{ l: "Calificación", v: "4.9 ★", icon: Star, color: "var(--dc-warn-600)", sub: "120 reseñas", desc: `Tu promedio de calificación en 120 reseñas de pacientes. Una nota alta atrae más pacientes por recomendación.` }]),
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card style={{ padding: 16, background: "linear-gradient(90deg,var(--dc-bg),#fff)", border: "1px solid var(--dc-info-soft)" }}>
        <div style={{ fontSize: 14, color: "var(--dc-info-ink)", display: "flex", alignItems: "center", gap: 9 }}><Shield size={17} strokeWidth={1.75} /> Reporte personal de {usuario.nombre}. Solo tú ves estos números — tus colegas no aparecen aquí.</div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
        {kpis.map((k, i) => { const Ic = k.icon; return (
          <Card key={i} onClick={() => setDetK(k)} style={{ animation: "dcTabSlide 0.18s ease-out forwards", padding: 18, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>{k.l}</div>
              <div style={{ background: tint(k.color, 0.082), color: k.color, width: 36, height: 36, borderRadius: "var(--dc-r-md)", display: "grid", placeItems: "center" }}><Ic size={18} strokeWidth={1.75} /></div>
            </div>
            <div style={{ fontSize: 21, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>{k.v}</div>
            {k.delta != null ? <div style={{ fontSize: 12, fontWeight: 500, color: k.delta >= 0 ? "var(--dc-ok-700)" : RED, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}><ArrowUpRight size={13} strokeWidth={1.75} style={{ transform: k.delta < 0 ? "rotate(90deg)" : "none" }} /> {k.delta >= 0 ? "+" : ""}{k.delta}% vs mes anterior</div> : <div style={{ fontSize: 12, color: "var(--dc-ink-500)", marginTop: 2 }}>{k.sub}</div>}
          </Card>
        ); })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }} className="dc-gerencial-row">
        <Card style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Mi producción — últimos 6 meses</h3>
            <span style={{ fontSize: 12, color: "var(--dc-ink-400)", display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 0, borderTop: "2px dashed var(--dc-ink-200)" }} /> Promedio S/ {promedio.toLocaleString()}</span>
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 10, height: 160 }}>
            {tend.length === 0 ? (
              <div style={{ color: "var(--dc-ink-500)", fontSize: 13, alignSelf: "center", width: "100%", textAlign: "center" }}>Sin datos de producción de meses anteriores.</div>
            ) : (<>
            {(() => { const max = Math.max(...tend); const y = (max - promedio) / max * 130 + 18; return <div style={{ position: "absolute", left: 0, right: 0, top: y, borderTop: "2px dashed var(--dc-ink-200)", zIndex: 1 }} />; })()}
            {tend.map((v, i) => { const max = Math.max(...tend); return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>{(v / 1000).toFixed(1)}k</span>
                <div style={{ width: "100%", height: `${(v / max) * 130}px`, background: i === tend.length - 1 ? RED : NAVY, borderRadius: "5px 5px 0 0", opacity: i === tend.length - 1 ? 1 : 0.4 + (i / 6) * 0.6 }} />
                <span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{tendMeses[i]}</span>
              </div>
            ); })}
            </>)}
          </div>
        </Card>
        <Card style={{ padding: 22 }}>
          <h3 style={{ margin: "0 0 16px", color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Meta del mes</h3>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 27, fontWeight: 600, color: meta == null ? "var(--dc-ink-400)" : pct >= 100 ? "var(--dc-ok-700)" : NAVY, fontFamily: DISPLAY_FONT }}>{meta == null ? "—" : pct + "%"}</div>
            <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>
              {meta == null ? `S/ ${mesProd.toLocaleString()} producidos este mes` : `S/ ${mesProd.toLocaleString()} de S/ ${meta.toLocaleString()}`}
            </div>
          </div>
          <div style={{ height: 12, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}><div style={{ width: `${pct || 0}%`, height: "100%", background: pct >= 100 ? "var(--dc-ok)" : `linear-gradient(90deg,${RED},var(--dc-red))` }} /></div>
          {/* Tres estados distintos: sin meta, meta pendiente y meta superada. Antes
              siempre decia "te faltan", y al pasarse mostraba un importe negativo y
              un numero de atenciones negativo. */}
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--dc-ink-700)", background: "var(--dc-bg)", padding: 12, borderRadius: "var(--dc-r-md)" }}>
            {meta == null
              ? <>Aún no tienes una meta del mes. La fija gerencia o administración desde <strong style={{ color: NAVY }}>Producción y comisiones</strong>.</>
              : mesProd >= meta
                ? <>Meta cumplida: llevas <strong style={{ color: "var(--dc-ok-700)" }}>S/ {(mesProd - meta).toLocaleString()}</strong> por encima.</>
                : <>Te faltan <strong style={{ color: NAVY }}>S/ {(meta - mesProd).toLocaleString()}</strong> para tu meta.{ticket > 0 && <> Son <strong>{Math.ceil((meta - mesProd) / ticket)}</strong> atenciones más a tu ticket promedio.</>}</>}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }} className="dc-gerencial-row">
        <Card style={{ padding: 22 }}>
          <h3 style={{ margin: "0 0 4px", color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>¿De dónde vienen tus ingresos?</h3>
          <p style={{ fontSize: 13, color: "var(--dc-ink-500)", margin: "0 0 16px" }}>Producción del mes por tipo de tratamiento.</p>
          <div style={{ display: "grid", gap: 13 }}>
            {porTrat.map((t) => { const p = Math.round((t.v / totalTrat) * 100); return (
              <div key={t.n}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--dc-ink-700)", fontWeight: 500 }}><span style={{ width: 10, height: 10, borderRadius: "var(--dc-r-sm)", background: t.c }} /> {t.n}</span><span style={{ fontWeight: 500, color: NAVY }}>S/ {t.v.toLocaleString()} <span style={{ color: "var(--dc-ink-500)", fontWeight: 500 }}>– {p}%</span></span></div>
                <div style={{ height: 8, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}><div style={{ width: `${p}%`, height: "100%", background: t.c }} /></div>
              </div>
            ); })}
          </div>
        </Card>
        <Card style={{ padding: 22 }}>
          <h3 style={{ margin: "0 0 14px", color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT, display: "flex", alignItems: "center", gap: 7 }}><Sparkles size={16} strokeWidth={1.75} color="var(--dc-warn-600)" /> Para decidir</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              [`${top.n} es tu mayor fuente: ${topPct}% de tus ingresos. Reservar más cupos de esta especialidad sube tu producción.`, DS.c.primary],
              [`Tu producción creció ${deltaProd}% vs el mes anterior. Si mantienes el ritmo, cierras el mes en ~S/ ${Math.round(mesProd * 1.05).toLocaleString()}.`, "var(--dc-ok-700)"],
              [`Tus atenciones dejan de media S/ ${ticket}. Proponer tratamientos integrales (no solo limpiezas) lo sube.`, DS.c.primary],
              [noShow != null
                ? `Ausentismo ${noShow}%. Confirmar por WhatsApp 24h antes reduce los espacios vacíos.`
                : "Sin dato de ausentismo todavía. Cuando haya citas en el mes, verás el porcentaje aquí.", DS.c.primary],
            ].map(([txt, c], i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--dc-ink-700)", lineHeight: 1.45 }}><span style={{ width: 6, height: 6, borderRadius: "var(--dc-r-full)", background: c, marginTop: 6, flexShrink: 0 }} /><span>{txt}</span></div>
            ))}
          </div>
        </Card>
      </div>
      {detK && (() => { const Ic = detK.icon; return (
        <Modal icon={<Ic size={20} strokeWidth={1.75} />} tone={detK.color} titulo={detK.l} sub="Cómo se calcula" onClose={() => setDetK(null)} maxW={440} footer={<Btn small kind="ghost" onClick={() => setDetK(null)}>Cerrar</Btn>}>
          <div style={{ fontSize: 27, fontWeight: 600, color: detK.color, fontFamily: DISPLAY_FONT, marginBottom: 10 }}>{detK.v}</div>
          <div style={{ fontSize: 14, color: "var(--dc-ink-700)", lineHeight: 1.6, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "13px 15px" }}>{detK.desc}</div>
        </Modal>
      ); })()}
    </div>
  );
}

/* ---- Productividad / Reportes (estilo Doctocliq: embudo de ventas + reportes) ---- */
/* ---- Integraciones (recomendaciones reales del mercado peruano) ---- */
function Integraciones({ notify }) {
  const cats = [
    { cat: "Facturación electrónica (SUNAT)", ic: Receipt, c: "#D97706", items: [
      // NEW-51: Caja confirma que aún no hay OSE — no mentir «Conectado».
      { n: "NubeFacT", d: "Emisión de boletas/facturas XML UBL 2.1 vía OSE. Certificado ISO 27001. Aún no conectado en esta clínica: las boletas se registran en el sistema sin envío a SUNAT.", estado: "pendiente", rec: true },
      { n: "Doctocliq Facturación", d: "Facturación SUNAT integrada para Perú, México y Ecuador.", estado: "disponible" },
    ] },
    { cat: "Pagos en línea y POS", ic: CreditCard, c: "#2F6FDE", items: [
      { n: "Culqi", d: "Tarjeta + Yape + Plin. 3.44% + IGV, sin mensualidad, liquidez el mismo día con BCP. Ideal para clínicas.", estado: "conectado", rec: true },
      { n: "Izipay", d: "POS físico + web, abono inmediato. Bueno si la clínica ya cobra presencial.", estado: "disponible" },
      { n: "Niubiz", d: "Acepta Amex/Diners y cuotas. Conviene a alto volumen con tarifa negociada.", estado: "disponible" },
    ] },
    { cat: "Mensajería e IA", ic: MessageSquare, c: "#16A36A", items: [
      { n: "WhatsApp Cloud API (Meta)", d: "Canal oficial para el agente IA. Más económico a escala que intermediarios.", estado: "conectado", rec: true },
      // Aquí figuraba otro proveedor del que la aplicación no depende. El motor real es
      // OpenAI (application.yml: openai.base-url), y solo con OPENAI_API_KEY cargada:
      // sin ella el asistente cae al motor de reglas.
      { n: "API de OpenAI", d: "Motor del agente conversacional con function calling para consultar precios, ver disponibilidad y agendar. Sin clave, el asistente responde con el motor de reglas.", estado: "conectado", rec: true },
    ] },
    { cat: "Captación de pacientes", ic: Users, c: "#6D4FD1", items: [
      { n: "Doctoralia", d: "Directorio público con gran tráfico orgánico; sincroniza agenda para captar pacientes nuevos.", estado: "disponible" },
    ] },
  ];
  const its = cats.flatMap((c) => c.items);
  const conectadas = its.filter((i) => i.estado === "conectado").length;
  const pendientesInt = its.filter((i) => i.estado === "pendiente").length;
  const [detInt, setDetInt] = useState(null);
  const [catSel, setCatSel] = useState("todas");
  const EST_INT = { conectado: ["Conectado", "is-ok"], pendiente: ["Pendiente", "is-warn"], disponible: ["Disponible", ""] };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{conectadas}</b><span>{conectadas === 1 ? "integración activa" : "integraciones activas"}</span></div>
          <p>Proveedores reales del mercado peruano para tu clínica</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{pendientesInt}</b><span>Por activar</span></div>
          <div><b>{its.length - conectadas - pendientesInt}</b><span>Disponibles</span></div>
          <div><b>{its.filter((i) => i.rec).length}</b><span>Recomendadas</span></div>
        </div>
        <span />
      </section>
      <div className="dc-us__roles" role="tablist" aria-label="Categoría">
        <button type="button" role="tab" aria-selected={catSel === "todas"} className={catSel === "todas" ? "is-on" : ""} style={{ "--c": "#0E9199" }} onClick={() => setCatSel("todas")}><Plug size={13} strokeWidth={2} /> Todas <i>{its.length}</i></button>
        {cats.map((c) => { const CI = c.ic; return <button key={c.cat} type="button" role="tab" aria-selected={catSel === c.cat} className={catSel === c.cat ? "is-on" : ""} style={{ "--c": c.c }} onClick={() => setCatSel(c.cat)}><CI size={13} strokeWidth={2} /> {c.cat} <i>{c.items.length}</i></button>; })}
      </div>
      {cats.filter((c) => catSel === "todas" || catSel === c.cat).map((c) => { const CI = c.ic; return (
        <section key={c.cat} className="dc-int__cat" style={{ "--c": c.c }}>
          <div className="dc-int__cab"><span><CI size={15} strokeWidth={2} /></span><h3>{c.cat}</h3><small>{c.items.filter((x) => x.estado === "conectado").length} de {c.items.length} conectadas</small></div>
          <div className="dc-int__grid">
            {c.items.map((it) => { const [el, ec] = EST_INT[it.estado] || EST_INT.disponible; const col = colorDe(it.n); return (
              <article key={it.n} className={`dc-int__card is-${it.estado}`} onClick={() => setDetInt({ ...it, cat: c.cat })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setDetInt({ ...it, cat: c.cat }); }}>
                <div className="dc-int__top">
                  <span className="dc-int__logo" style={{ background: `linear-gradient(135deg, ${col}, ${tint(col, 0.75)})` }}>{it.n.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                  <div><b>{it.n}</b>{it.rec && <small className="dc-int__rec"><Star size={10} strokeWidth={2.4} /> Recomendado</small>}</div>
                  <span className={`dc-int__est ${ec}`}><i />{el}</span>
                </div>
                <p>{it.d}</p>
                <div className="dc-int__pie">
                  {it.estado === "conectado"
                    ? <span className="dc-int__ok"><CheckCircle2 size={14} strokeWidth={2} /> Funcionando</span>
                    : <button type="button" className={it.estado === "pendiente" ? "is-warn" : ""} onClick={(e) => { e.stopPropagation(); setDetInt({ ...it, cat: c.cat }); }}><Plug size={13} strokeWidth={2} /> {it.estado === "pendiente" ? "Terminar conexión" : "Conectar"}</button>}
                  <em>Ver detalle <ChevronRight size={13} strokeWidth={2.2} /></em>
                </div>
              </article>
            ); })}
          </div>
        </section>
      ); })}
      {its.length === 0 && <Card style={{ padding: 0 }}><Vacio icon={<Plug size={22} strokeWidth={1.75} />} titulo="Sin integraciones" sub="No hay conectores disponibles por ahora." /></Card>}
      {detInt && <Modal icon={<Plug size={20} strokeWidth={1.75} />} tone={detInt.estado === "conectado" ? "var(--dc-ok-700)" : NAVY} titulo={detInt.n} sub={detInt.cat} onClose={() => setDetInt(null)} maxW={480}
        footer={detInt.estado === "conectado" ? <Btn small kind="ghost" onClick={() => setDetInt(null)}>Cerrar</Btn> : <><Btn small kind="ghost" onClick={() => setDetInt(null)}>Cancelar</Btn><Btn small onClick={() => { notify(`Integración con ${detInt.n} iniciada (demo).`); setDetInt(null); }}><Plug size={15} strokeWidth={1.75} /> Conectar</Btn></>}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          {detInt.rec && <span style={{ fontSize: 12, fontWeight: 500, background: "var(--dc-ok-soft)", color: "var(--dc-ok-700)", padding: "3px 9px", borderRadius: "var(--dc-r-sm)", display: "inline-flex", alignItems: "center", gap: 4 }}><Star size={10} strokeWidth={1.75} /> Recomendado</span>}
          {detInt.estado === "conectado" ? <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ok-700)", display: "inline-flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={14} strokeWidth={1.75} /> Conectado</span> : <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-warn-600)", display: "inline-flex", alignItems: "center", gap: 5 }}><Clock size={13} strokeWidth={1.75} /> Disponible</span>}
        </div>
        <div style={{ fontSize: 14, color: "var(--dc-ink-700)", lineHeight: 1.6, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "13px 15px" }}>{detInt.d}</div>
      </Modal>}
    </div>
  );
}

/* Roles que el perfil de TI puede asignar al personal (el paciente se gestiona aparte). */
const ROLES_ASIGNABLES = ["admin", "gerencia", "admin_sede", "ti", "medico", "recepcion"];

/* ---- Gestión de usuarios (módulo TI / Administrador) ---- */
function GestionUsuarios({ staff: staffProp, setStaff, notify, rolePerms = {}, usuarioActual, can }) {
  const conectado = !!auth.token;
  const [permOpen, setPermOpen] = useState(false);   // editor de permisos por usuario
  const sedeIntU = (uuid) => (uuid && String(uuid).endsWith("a2")) ? 2 : 1;
  const mapU = (u) => {
    const ua = u.ultimoAcceso;
    let ultimo = "Nunca";
    if (ua) {
      try {
        const d = new Date(ua);
        ultimo = Number.isNaN(d.getTime()) ? String(ua) : d.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
      } catch { ultimo = String(ua); }
    }
    return { id: u.id, nombre: u.nombre, user: (u.email || "").split("@")[0], email: u.email, rol: u.rol, sedes: u.sedeId ? [sedeIntU(u.sedeId)] : "all", activo: u.activo, ultimo };
  };
  const [remoto, setRemoto] = useState(null);
  const [usuariosError, setUsuariosError] = useState(null);
  const recargar = () => {
    if (!conectado) return;
    setUsuariosError(null);
    api.usuarios.listar()
      .then((r) => setRemoto((r || []).map(mapU)))
      .catch((e) => {
        setRemoto([]);
        setUsuariosError(e?.status === 404
          ? "El módulo de usuarios todavía no está conectado al servidor (GET /usuarios no existe)."
          : "No se pudieron cargar los usuarios.");
        notify(e?.status === 404
          ? "Usuarios: el endpoint aún no está disponible en el servidor."
          : "No se pudieron cargar los usuarios.");
      });
  };
  useEffect(() => { recargar(); }, []); // eslint-disable-line
  const staff = conectado ? (remoto || []) : staffProp;
  const cargaFallida = conectado && !!usuariosError;
  const [q, setQ] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [form, setForm] = useState(null); // null = cerrado

  // Roles que siempre abarcan toda la cuenta (no se restringen por sede).
  const orgWide = (rol) => rol === "admin" || rol === "ti";
  const lista = staff.filter((u) =>
    (filtroRol === "todos" || u.rol === filtroRol) &&
    (q.trim() === "" || (u.nombre + " " + u.user + " " + u.email).toLowerCase().includes(q.toLowerCase())));
  const activos = staff.filter((u) => u.activo).length;
  const porRol = ROLES_ASIGNABLES.map((r) => ({ r, n: staff.filter((u) => u.rol === r).length }));

  const nuevo = () => setForm({ nombre: "", user: "", email: "", rol: "recepcion", sedes: [1], activo: true });
  const editar = (u) => setForm({ ...u, sedes: u.sedes === "all" ? "all" : normSedes(u.sedes) });
  const toggleSedeForm = (id) => setForm((f) => { const a = normSedes(f.sedes); return { ...f, sedes: a.includes(id) ? a.filter((x) => x !== id) : [...a, id].sort() }; });
  const guardar = () => {
    if (!form.nombre.trim() || !form.user.trim()) { notify("Completa nombre y usuario."); return; }
    if (conectado) {
      const payload = { nombre: form.nombre, email: form.email || form.user, rol: form.rol, activo: form.activo !== false, permisos: form.permisos || null };
      (form.id ? api.usuarios.actualizar(form.id, payload) : api.usuarios.crear({ ...payload, password: "demo" }))
        .then(() => { notify(form.id ? `Usuario ${form.nombre} actualizado.` : `Usuario ${form.nombre} creado (clave inicial: demo).`); setForm(null); recargar(); })
        .catch((e) => notify("Error al guardar: " + (e.message || "")));
      return;
    }
    const sedes = orgWide(form.rol) ? "all" : (normSedes(form.sedes).length ? normSedes(form.sedes) : [1]);
    if (!orgWide(form.rol) && !sedes.length) { notify("Asigna al menos una sede."); return; }
    if (form.id) {
      setStaff((s) => s.map((u) => u.id === form.id ? { ...form, sedes } : u));
      notify(`Usuario ${form.nombre} actualizado.`);
    } else {
      const id = Math.max(0, ...staff.map((u) => u.id)) + 1;
      setStaff((s) => [...s, { ...form, id, sedes, ultimo: "Nunca" }]);
      notify(`Usuario ${form.nombre} creado como ${ROLES[form.rol].label}.`);
    }
    setForm(null);
  };
  const toggle = (u) => { if (conectado) { (u.activo ? api.usuarios.desactivar(u.id) : api.usuarios.actualizar(u.id, { activo: true })).then(() => { notify(`${u.nombre} ${u.activo ? "desactivado" : "activado"}.`); recargar(); }).catch(() => notify("Error al cambiar el estado.")); return; } setStaff((s) => s.map((x) => x.id === u.id ? { ...x, activo: !x.activo } : x)); notify(`${u.nombre} ${u.activo ? "desactivado" : "activado"}.`); };
  const eliminar = (u) => {
    if (!confirm(`¿Dar de baja a ${u.nombre}? Perderá el acceso a la clínica de inmediato.`)) return;
    if (conectado) { api.usuarios.desactivar(u.id).then(() => { notify(`${u.nombre} desactivado.`); recargar(); }).catch(() => notify("No se pudo desactivar al usuario.")); return; }
    setStaff((s) => s.filter((x) => x.id !== u.id)); notify(`${u.nombre} dado de baja.`);
  };
  const resetPass = (u) => notify(`Se envió un enlace para restablecer la contraseña de ${u.nombre} a ${u.email || u.user}. (Help Desk TI)`);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{cargaFallida ? "—" : staff.length}</b><span>{staff.length === 1 ? "usuario" : "usuarios"}</span></div>
          <p>Crea cuentas y asigna a cada persona el rol con sus permisos</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{cargaFallida ? "—" : activos}</b><span>Activos</span></div>
          <div><b>{cargaFallida ? "—" : staff.length - activos}</b><span>Inactivos</span></div>
          <div><b>{cargaFallida ? "—" : porRol.filter((x) => x.n > 0).length}</b><span>Roles en uso</span></div>
        </div>
        <span />
        <div className="dc-hero-acc"><button type="button" className="dc-esp-hero__btn" onClick={nuevo}><UserPlus size={14} strokeWidth={2} /> Nuevo usuario</button></div>
      </section>
      {cargaFallida && <div className="fm-aviso-edad is-mal"><AlertTriangle size={15} strokeWidth={2} /><span><b>Usuarios sin API.</b> {usuariosError} No es un padrón vacío: el listado no pudo cargarse.</span></div>}
      <div className="dc-us__barra">
        <label className="dc-cob__buscar dc-us__buscar"><Search size={15} strokeWidth={1.9} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, usuario o correo" aria-label="Buscar usuario" /></label>
        <div className="dc-us__roles" role="tablist" aria-label="Filtrar por rol">
          <button type="button" role="tab" aria-selected={filtroRol === "todos"} className={filtroRol === "todos" ? "is-on" : ""} style={{ "--c": "#0E9199" }} onClick={() => setFiltroRol("todos")}>Todos <i>{staff.length}</i></button>
          {porRol.filter((x) => x.n > 0).map(({ r, n }) => { const R = ROLES[r]; const RIc = R.icon; return (
            <button key={r} type="button" role="tab" aria-selected={filtroRol === r} className={filtroRol === r ? "is-on" : ""} style={{ "--c": R.color }} onClick={() => setFiltroRol(r)}><RIc size={13} strokeWidth={2} /> {R.label} <i>{n}</i></button>
          ); })}
        </div>
      </div>

        {/* Formulario alta/edición */}
        {form && (
          <Modal icon={form.id ? <Pencil size={20} strokeWidth={1.75} /> : <UserPlus size={20} strokeWidth={1.75} />} titulo={form.id ? "Editar usuario" : "Nuevo usuario"} sub={ROLES[form.rol].desc} onClose={() => setForm(null)} maxW={620}
            footer={<>{form.id && <span style={{ marginRight: "auto", display: "inline-flex", gap: 6 }}><Btn small kind="ghost" onClick={() => resetPass(form)}><KeyRound size={15} strokeWidth={1.75} /> Restablecer clave</Btn><Btn small kind="ghost" onClick={() => { eliminar(form); setForm(null); }}><Trash2 size={15} strokeWidth={1.75} /> Eliminar</Btn></span>}<Btn small kind="ghost" onClick={() => setForm(null)}>Cancelar</Btn><Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> {form.id ? "Guardar cambios" : "Crear usuario"}</Btn></>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              <Field label="Nombre completo" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Ej. Ana Torres" />
              <Field label="Usuario" value={form.user} onChange={(v) => setForm({ ...form, user: v })} placeholder="atorres" icon={<UserCheck size={15} strokeWidth={1.75} />} />
              <Field label="Correo" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="ana@sonrie.pe" type="email" icon={<Mail size={15} strokeWidth={1.75} />} />
              <label style={{ display: "block" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Rol</span>
                <Select value={form.rol} onChange={(v) => setForm({ ...form, rol: v })}
                        options={ROLES_ASIGNABLES.map((r) => ({ value: r, label: ROLES[r].label }))} />
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 8 }}>Sedes {!orgWide(form.rol) && <span style={{ color: "var(--dc-ink-500)", fontWeight: 500 }}>– puede ser más de una</span>}</span>
              {orgWide(form.rol) ? (
                <div style={{ padding: "11px 14px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: "var(--dc-ink-700)", background: "var(--dc-line)", display: "flex", alignItems: "center", gap: 7 }}><Globe size={15} strokeWidth={1.75} color={DS.c.primary} /> Todas las sedes (acceso a toda la cuenta)</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SEDES.map((s) => { const on = normSedes(form.sedes).includes(s.id); return (
                    <button key={s.id} type="button" onClick={() => toggleSedeForm(s.id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 13px", borderRadius: "var(--dc-r-md)", border: on ? `1.5px solid ${NAVY}` : "1.5px solid var(--dc-line)", background: on ? "var(--dc-bg)" : "#fff", color: on ? NAVY : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                      {on ? <CheckCircle2 size={15} strokeWidth={1.75} color={NAVY} /> : <MapPin size={15} strokeWidth={1.75} />} {s.nombre}
                    </button>
                  ); })}
                </div>
              )}
            </div>
            {/* Permisos: hereda del rol, personalizable por usuario */}
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 8 }}>Permisos</span>
              {form.permisos ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "11px 14px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-amber-soft)", background: "var(--dc-warn-soft)" }}>
                  <Shield size={16} strokeWidth={1.75} color="var(--dc-warn-600)" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-warn-ink)", flex: 1, minWidth: 140 }}>Permisos personalizados ({modulosVisibles(form.permisos).length} módulos visibles)</span>
                  <Btn small kind="ghost" onClick={() => setPermOpen(true)}><Pencil size={14} strokeWidth={1.75} /> Editar matriz</Btn>
                  <Btn small kind="ghost" onClick={() => setForm({ ...form, permisos: undefined })}><Repeat size={14} strokeWidth={1.75} /> Volver al rol</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "11px 14px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "var(--dc-bg)" }}>
                  <ShieldCheck size={16} strokeWidth={1.75} color={ROLES[form.rol].color} />
                  <span style={{ fontSize: 13, color: "var(--dc-ink-700)", flex: 1, minWidth: 140 }}>Hereda los permisos del rol <strong style={{ color: ROLES[form.rol].color }}>{ROLES[form.rol].label}</strong></span>
                  <Btn small kind="ghost" onClick={() => { setForm({ ...form, permisos: JSON.parse(JSON.stringify(rolePerms[form.rol] || ROL_PERMS[form.rol] || {})) }); setPermOpen(true); }}><Shield size={14} strokeWidth={1.75} /> Personalizar</Btn>
                </div>
              )}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: "var(--dc-ink-400)", display: "flex", alignItems: "center", gap: 7, background: "var(--dc-bg)", padding: "10px 12px", borderRadius: "var(--dc-r-md)" }}><ShieldCheck size={15} strokeWidth={1.75} color={ROLES[form.rol].color} /> {ROLES[form.rol].desc}</div>
          </Modal>
        )}
        {/* Matriz de permisos por usuario (override) */}
        {form && permOpen && (
          <Modal icon={<Shield size={20} strokeWidth={1.75} />} titulo={`Permisos de ${form.nombre || "usuario"}`} sub="Ajusta qué puede hacer esta persona en cada módulo. Sobrescribe los permisos de su rol." onClose={() => setPermOpen(false)} maxW={860}
            footer={<><Btn small kind="ghost" onClick={() => { setForm({ ...form, permisos: undefined }); setPermOpen(false); }}><Repeat size={14} strokeWidth={1.75} /> Restaurar rol</Btn><Btn small onClick={() => setPermOpen(false)}><Check size={15} strokeWidth={1.75} /> Listo</Btn></>}>
            <PermisosGrupos perms={form.permisos || {}} onToggle={(mod, acc) => setForm((f) => ({ ...f, permisos: togglePermAccion(f.permisos || (rolePerms[f.rol] || ROL_PERMS[f.rol] || {}), mod, acc) }))} />
          </Modal>
        )}

        <DataTable titulo="Directorio de usuarios" sub="usuarios" minWidth={880} maxHeight={560} rows={lista} defaultSort={{ key: "usuario", dir: "asc" }} empty={<Vacio icon={<UserCog size={22} strokeWidth={1.75} />} titulo="Sin usuarios" sub="No hay usuarios que coincidan." />} cols={[
          { key: "usuario", label: "Usuario", w: "minmax(220px,1.8fr)", a: "left", get: (u) => u.nombre + " " + u.user + " " + u.email, cell: (u) => { const R = ROLES[u.rol]; return <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, opacity: u.activo ? 1 : 0.55 }}><span className="dc-rec__av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg, ${tint(R.color, 0.22)}, ${tint(R.color, 0.08)})`, color: R.color, flexShrink: 0 }}>{iniciales(u.nombre.replace(/^Dra?\.\s*/, ""))}</span><div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>{u.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{u.user} – {u.email}</div></div></div>; } },
          { key: "rol", label: "Rol", w: "minmax(140px,1fr)", a: "center", get: (u) => ROLES[u.rol].label, cell: (u) => { const R = ROLES[u.rol]; const RIc = R.icon; return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: R.color, background: tint(R.color, 0.078), padding: "4px 10px", borderRadius: "var(--dc-r-full)" }}><RIc size={13} strokeWidth={1.75} /> {R.label}</span>; } },
          { key: "sede", label: "Sede", w: "minmax(120px,1fr)", a: "center", get: (u) => etiquetaSedes(u.sedes), cell: (u) => <span style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>{etiquetaSedes(u.sedes)}</span> },
          { key: "ultimo", label: "Último acceso", w: "150px", a: "center", get: (u) => u.ultimo, cell: (u) => <span style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{u.ultimo}</span> },
          { key: "estado", label: "Estado", w: "110px", a: "center", get: (u) => u.activo ? "Activo" : "Inactivo", cell: (u) => <span className={`dc-us__est${u.activo ? " is-on" : ""}`}><i />{u.activo ? "Activo" : "Inactivo"}</span> },
          { key: "acc", label: "Acciones", w: "130px", a: "center", noFilter: true, noSort: true, cell: (u) => <div className="dc-us__acc"><button type="button" className="dc-row-action" aria-label="Editar" title="Editar" onClick={() => editar(u)}><Pencil size={14} strokeWidth={2} /></button><button type="button" className={`dc-row-action ${u.activo ? "is-warn" : "is-ok"}`} aria-label={u.activo ? "Desactivar" : "Activar"} title={u.activo ? "Desactivar" : "Activar"} onClick={() => toggle(u)}><Power size={14} strokeWidth={2} /></button><button type="button" className="dc-row-action is-mal" aria-label="Eliminar" title="Eliminar" onClick={() => eliminar(u)}><Trash2 size={14} strokeWidth={2} /></button></div> },
        ]} />
    </div>
  );
}

/* ---- Permisos (editable) — módulo TI / Administrador ----
   Modelo híbrido: cada ROL trae permisos por defecto a nivel de MÓDULO × ACCIÓN.
   Se editan aquí y también pueden personalizarse por usuario (override) desde
   Gestión de usuarios. Quitar "Ver" oculta el módulo por completo para ese rol.
   El rol TI conserva siempre "Ver" en usuarios y permisos para no bloquearse. ---- */
const BLOQUEADOS = { ti: ["usuarios", "permisos"] };

/* Activa/desactiva una acción en un set de permisos {modId:[acciones]}.
   Quitar "ver" limpia el módulo; agregar cualquier acción implica "ver". */
const togglePermAccion = (perms, mod, acc) => {
  const cur = new Set(perms[mod] || []);
  if (cur.has(acc)) { if (acc === "ver") cur.clear(); else cur.delete(acc); }
  else { cur.add(acc); if (acc !== "ver") cur.add("ver"); }
  return { ...perms, [mod]: ACCION_IDS.filter((a) => cur.has(a)) };
};

/* Matriz reutilizable Módulo × Acción. `perms` = {modId:[acciones]}. */
function MatrizPermisos({ perms, onToggle, lockVer, solo }) {
  const lista = solo ? MODULOS.filter((m) => solo.includes(m.id)) : MODULOS;
  return (
    <div className="dc-mp">
      <table>
        <thead>
          <tr>
            <th>Módulo</th>
            {ACCIONES.map((a) => <th key={a.id}>{a.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {lista.map((m) => { const acts = perms[m.id] || []; const visible = acts.includes("ver"); return (
            <tr key={m.id} className={visible ? "" : "is-oculto"}>
              <td><span className="dc-mp__mod"><i className={visible ? "is-on" : ""} />{m.label}</span><small>{visible ? `${acts.length}/${ACCIONES.length}` : "Oculto"}</small></td>
              {ACCIONES.map((a) => { const on = acts.includes(a.id); const locked = a.id === "ver" && lockVer && lockVer(m.id); const lbl = locked ? "Obligatorio (no editable)" : on ? `Quitar ${a.label}` : `Dar ${a.label}`; return (
                <td key={a.id}>
                  <button type="button" className={`dc-mini-btn dc-mp__t${on ? " is-on" : ""}${a.id === "ver" ? " is-ver" : ""}${locked ? " is-lock" : ""}`} aria-label={lbl} title={lbl} aria-pressed={on} onClick={() => { if (!locked) onToggle(m.id, a.id); }}>
                    {on ? (locked ? <Lock size={11} strokeWidth={2.4} /> : <Check size={12} strokeWidth={3} />) : null}
                  </button>
                </td>
              ); })}
            </tr>
          ); })}
        </tbody>
      </table>
    </div>
  );
}

/* Permisos agrupados por área: interruptor "Ver" y acciones como etiquetas. */
const GRUPOS_PERM = [
  { id: "gestion", label: "Gestión y reportes", icon: BarChart3, c: "#6D4FD1", mods: ["gerencial", "reportes", "comisiones", "metas", "miproduccion"] },
  { id: "atencion", label: "Atención y agenda", icon: CalendarCheck, c: "#0E9199", mods: ["dashboard", "whatsapp", "agenda", "disponibilidad", "espera", "tickets", "recall", "formularios", "resenas"] },
  { id: "clinico", label: "Clínico", icon: Stethoscope, c: "#2F6FDE", mods: ["pacientes", "odontograma", "tratamientos", "recetas", "consentimientos", "perio", "radiografias", "laboratorio"] },
  { id: "caja", label: "Caja y recursos", icon: Wallet, c: "#D97706", mods: ["facturacion", "seguros", "servicios", "inventario"] },
  { id: "admin", label: "Administración", icon: Settings, c: "#E0694F", mods: ["plan", "integraciones", "config", "usuarios", "permisos", "auditoria"] },
];
function PermisosGrupos({ perms, onToggle, lockVer, onGrupo }) {
  const [q, setQ] = useState("");
  const [abiertos, setAbiertos] = useState(() => new Set(GRUPOS_PERM.map((g) => g.id)));
  const otros = MODULOS.filter((m) => !GRUPOS_PERM.some((g) => g.mods.includes(m.id))).map((m) => m.id);
  const grupos = otros.length ? [...GRUPOS_PERM, { id: "otros", label: "Otros", icon: Layers, c: "#28527A", mods: otros }] : GRUPOS_PERM;
  const extra = ACCIONES.filter((a) => a.id !== "ver");
  const txt = q.trim().toLowerCase();
  return (
    <div className="dc-pg2">
      <label className="dc-cob__buscar dc-pg2__buscar"><Search size={15} strokeWidth={1.9} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar módulo" aria-label="Buscar módulo" /></label>
      {grupos.map((g) => {
        const mods = g.mods.map((id) => MODULOS.find((m) => m.id === id)).filter(Boolean).filter((m) => !txt || m.label.toLowerCase().includes(txt));
        if (!mods.length) return null;
        const vis = mods.filter((m) => (perms[m.id] || []).includes("ver")).length;
        const abierto = abiertos.has(g.id) || !!txt;
        const GI = g.icon;
        return (
          <section key={g.id} className="dc-pg2__grupo" style={{ "--c": g.c }}>
            <header>
              <button type="button" className="dc-pg2__plegar" aria-expanded={abierto} onClick={() => setAbiertos((s0) => { const n = new Set(s0); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}>
                <span className="dc-pg2__gico"><GI size={16} strokeWidth={2} /></span>
                <b>{g.label}</b>
                <small>{vis} de {mods.length} visibles</small>
                <ChevronDown size={15} strokeWidth={2.2} className={abierto ? "is-abierto" : ""} />
              </button>
              {onGrupo && <div className="dc-pg2__gacc"><button type="button" onClick={() => onGrupo(mods.map((m) => m.id), "todo")}>Dar todo</button><button type="button" onClick={() => onGrupo(mods.map((m) => m.id), "ver")}>Solo ver</button><button type="button" onClick={() => onGrupo(mods.map((m) => m.id), "nada")}>Quitar</button></div>}
            </header>
            {abierto && (
              <div className="dc-pg2__filas">
                {mods.map((m) => { const acts = perms[m.id] || []; const ver = acts.includes("ver"); const locked = lockVer && lockVer(m.id); return (
                  <div key={m.id} className={`dc-pg2__fila${ver ? " is-ver" : ""}`}>
                    <button type="button" role="switch" aria-checked={ver} aria-label={`${ver ? "Ocultar" : "Mostrar"} ${m.label}`} className={`dc-mini-btn dc-pg2__sw${ver ? " is-on" : ""}${locked ? " is-lock" : ""}`} onClick={() => { if (!locked) onToggle(m.id, "ver"); }} title={locked ? "Obligatorio para este rol" : ver ? "Visible: toca para ocultar" : "Oculto: toca para mostrar"}><i>{locked && <Lock size={9} strokeWidth={2.6} />}</i></button>
                    <div className="dc-pg2__mod"><b>{m.label}</b><small>{ver ? `${acts.length - 1} de ${extra.length} acciones` : "Oculto para este rol"}</small></div>
                    <div className="dc-pg2__acts">
                      {extra.map((a) => { const on = acts.includes(a.id); return (
                        <button key={a.id} type="button" className={`dc-mini-btn dc-pg2__chip${on ? " is-on" : ""}`} aria-pressed={on} aria-label={`${on ? "Quitar" : "Dar"} ${a.label} en ${m.label}`} onClick={() => onToggle(m.id, a.id)}>{a.label}</button>
                      ); })}
                    </div>
                  </div>
                ); })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function GestionPermisos({ rolePerms, setRolePerms, notify, onRefreshMe }) {
  const [rolSel, setRolSel] = useState("admin");
  const [desdeServidor, setDesdeServidor] = useState(false);
  const [matrizError, setMatrizError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (!auth.token) return;
    setMatrizError(null);
    api.permisos.matriz().then((r) => {
      if (r?.porRol) { setRolePerms((prev) => ({ ...prev, ...r.porRol })); setDesdeServidor(true); }
    }).catch((e) => {
      const det = e?.message || e?.status ? `Error ${e.status || ""}${e.message ? ": " + e.message : ""}`.trim() : "No se pudo cargar la matriz de permisos del servidor.";
      setMatrizError(det);
      setDesdeServidor(false);
      notify(det);
    });
  }, []); // eslint-disable-line
  const perms = rolePerms[rolSel] || ROL_PERMS[rolSel] || {};
  const lockVer = (mod) => (BLOQUEADOS[rolSel] || []).includes(mod);
  const onToggle = (mod, acc) => {
    if (acc === "ver" && lockVer(mod)) { notify(`"${MODULOS.find((m) => m.id === mod)?.label}" es obligatorio para ${ROLES[rolSel].label}.`); return; }
    setRolePerms((p) => ({ ...p, [rolSel]: togglePermAccion(p[rolSel] || ROL_PERMS[rolSel] || {}, mod, acc) }));
  };
  const restaurar = () => { setRolePerms((p) => ({ ...p, [rolSel]: JSON.parse(JSON.stringify(ROL_PERMS[rolSel] || {})) })); notify(`Permisos de ${ROLES[rolSel].label} restaurados por defecto.`); };
  const onGrupo = (mods, modo) => setRolePerms((p) => {
    const cur = { ...(p[rolSel] || ROL_PERMS[rolSel] || {}) };
    mods.forEach((m) => { cur[m] = modo === "todo" ? [...ACCION_IDS] : modo === "ver" || lockVer(m) ? ["ver"] : []; });
    return { ...p, [rolSel]: cur };
  });
  const guardar = () => {
    if (!auth.token) { notify("Permisos guardados en este navegador."); return; }
    setGuardando(true);
    api.permisos.guardar({ porRol: rolePerms })
      .then((r) => { if (r?.porRol) setRolePerms((prev) => ({ ...prev, ...r.porRol })); setDesdeServidor(true); setMatrizError(null); notify("Matriz de permisos guardada en el servidor."); return onRefreshMe?.(); })
      .catch((e) => notify(e?.message || "No se pudo guardar la matriz en el servidor."))
      .finally(() => setGuardando(false));
  };
  const R = ROLES[rolSel]; const RIc = R.icon;
  const nMods = modulosVisibles(perms).length;
  const nAcc = Object.values(perms).reduce((s, a) => s + a.length, 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {!!auth.token && matrizError && <div className="fm-aviso-edad is-mal"><AlertTriangle size={15} strokeWidth={2} /><span><b>Error al cargar permisos.</b> {matrizError} Lo que ves puede ser solo local.</span></div>}
      {!!auth.token && !matrizError && <div className="fm-aviso-edad is-info"><Shield size={15} strokeWidth={2} /><span><b>Fuente de verdad: el servidor.</b> {desdeServidor ? "Matriz cargada del servidor. Pulsa «Guardar en el servidor» para persistir; el menú se refresca al guardar." : "Cargando la matriz del servidor…"}</span></div>}
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{ROLES_ASIGNABLES.length}</b><span>roles del personal</span></div>
          <p>Qué puede hacer cada rol en cada módulo</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{MODULOS.length}</b><span>Módulos</span></div>
          <div><b>{ACCIONES.length}</b><span>Acciones por módulo</span></div>
          <div><b>{nAcc}</b><span>Permisos de {R.label.toLowerCase()}</span></div>
        </div>
        <span />
        <div className="dc-hero-acc">
          <button type="button" className="dc-esp-hero__agregar" onClick={restaurar}><Repeat size={14} strokeWidth={1.9} /> Restaurar rol</button>
          <button type="button" className="dc-esp-hero__btn" onClick={guardar} disabled={guardando}><Check size={14} strokeWidth={2} /> {guardando ? "Guardando…" : auth.token ? "Guardar en el servidor" : "Guardar"}</button>
        </div>
      </section>
      <div className="dc-perm">
        <aside className="dc-perm__roles" role="tablist" aria-label="Rol">
          {ROLES_ASIGNABLES.map((r) => { const RR = ROLES[r]; const Ic = RR.icon; const on = r === rolSel; const pr = rolePerms[r] || ROL_PERMS[r] || {}; const vis = modulosVisibles(pr).length; return (
            <button key={r} type="button" role="tab" aria-selected={on} className={on ? "is-on" : ""} style={{ "--c": RR.color }} onClick={() => setRolSel(r)}>
              <span className="dc-perm__rico"><Ic size={16} strokeWidth={2} /></span>
              <div><b>{RR.label}</b><small>{vis} de {MODULOS.length} módulos</small><span className="dc-perm__mini"><i style={{ width: `${Math.round((vis / MODULOS.length) * 100)}%` }} /></span></div>
            </button>
          ); })}
        </aside>
        <section className="dc-perm__main" style={{ "--c": R.color }}>
          <header className="dc-perm__cab">
            <span className="dc-perm__rico is-grande"><RIc size={20} strokeWidth={2} /></span>
            <div><b>{R.label}</b><p>{R.desc}</p></div>
            <div className="dc-perm__nums"><div><b>{nMods}</b><small>Visibles</small></div><div><b>{nAcc}</b><small>Permisos</small></div></div>
          </header>
          <PermisosGrupos perms={perms} onToggle={onToggle} lockVer={lockVer} onGrupo={onGrupo} />
        </section>
      </div>
    </div>
  );
}

/* ---- Plataforma multi-tenant (módulo del Superusuario AWG) ---- */
const PLAN_LABEL = { pequena: "Pequeña", mediana: "Mediana", grande: "Grande" };
const ESTADO_CLINICA = {
  activa:      { l: "Activa", bg: "var(--dc-ok-soft)", fg: "var(--dc-ok-700)" },
  trial:       { l: "En prueba", bg: "var(--dc-warn-soft)", fg: "var(--dc-warn-600)" },
  suspendida:  { l: "Suspendida", bg: "var(--dc-fee)", fg: "var(--dc-danger-700)" } };
function Plataforma({ notify }) {
  const [clinicas, setClinicas] = useState(CLINICAS_INIT);
  const [q, setQ] = useState("");
  const [detC, setDetC] = useState(null);
  const activas = clinicas.filter((c) => c.estado === "activa").length;
  const trial = clinicas.filter((c) => c.estado === "trial").length;
  const mrr = clinicas.reduce((s, c) => s + c.mrr, 0);
  const usuarios = clinicas.reduce((s, c) => s + c.usuarios, 0);
  const lista = clinicas.filter((c) => q.trim() === "" || (c.nombre + " " + c.ruc).toLowerCase().includes(q.toLowerCase()));
  const toggle = (c) => {
    const nuevo = c.estado === "suspendida" ? "activa" : "suspendida";
    setClinicas((cs) => cs.map((x) => x.id === c.id ? { ...x, estado: nuevo, mrr: nuevo === "suspendida" ? 0 : (x.plan === "grande" ? 499 : x.plan === "mediana" ? 299 : 0) } : x));
    notify(`${c.nombre} ${nuevo === "suspendida" ? "suspendida" : "reactivada"}.`);
  };
  const suspend = clinicas.filter((c) => c.estado === "suspendida").length;
  const porPlan = ["grande", "mediana", "pequena"].map((p) => ({ p, n: clinicas.filter((c) => c.plan === p).length }));
  // Eran once literales en miles y un duodécimo punto con el MRR real dividido entre
  // 1000: el gráfico rotulaba "máx 11" y "último 1.596" y dibujaba un desplome que no
  // había ocurrido. Toda la curva se construye ahora sobre el MRR, en su misma escala.
  const mrrTrend = [0.55, 0.61, 0.66, 0.68, 0.73, 0.79, 0.84, 0.86, 0.90, 0.94, 0.97, 1].map((k) => Math.round(mrr * k));
  const nuevas = [1, 0, 1, 2, 1, 2];
  const kpiBig = (v, sub, c) => <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}><div style={{ fontSize: 27, fontWeight: 600, color: c || NAVY, fontFamily: DISPLAY_FONT, lineHeight: 1 }}>{v}</div>{sub && <div style={{ fontSize: 12, color: "var(--dc-ink-500)", marginTop: 5 }}>{sub}</div>}</div>;
  const PLANC = { grande: "var(--dc-navy)", mediana: DS.c.primary, pequena: DS.c.accent };
  const widgets = [
    { id: "mrr", title: "MRR – ingreso recurrente mensual", icon: TrendingUp, color: DS.c.primary, w: 2, h: 2, render: () => (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}><div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 21, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>S/ {mrr.toLocaleString()}</span><span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)" }}>+9% MoM</span></div><div style={{ flex: 1, minHeight: 0 }}><AreaChart data={mrrTrend} color={DS.c.primary} formato={(v) => `S/ ${Math.round(v).toLocaleString()}`} /></div></div>
    ) },
    { id: "clinicas", title: "Clínicas conectadas", icon: Building2, color: NAVY, w: 1, h: 1, render: () => kpiBig(clinicas.length, `${activas} activas`, NAVY) },
    { id: "activas", title: "Activas", icon: CheckCircle2, color: "var(--dc-ok-700)", w: 1, h: 1, render: () => kpiBig(activas, "de pago", "var(--dc-ok-700)") },
    { id: "trial", title: "En prueba", icon: Star, color: "var(--dc-warn-600)", w: 1, h: 1, render: () => kpiBig(trial, "por convertir", "var(--dc-warn-600)") },
    { id: "usuarios", title: "Usuarios totales", icon: Users, color: "var(--dc-brand-mid)", w: 1, h: 1, render: () => kpiBig(usuarios, "en la red", "var(--dc-brand-mid)") },
    { id: "porplan", title: "Clínicas por plan", icon: PieChart, color: DS.c.primary, w: 1, h: 2, render: () => {
      /* Era el ultimo donut con el truco `v: x.n || 0.01`: con cero clinicas en un plan
          el anillo se dibujaba LLENO. Y la leyenda de debajo ya daba los mismos numeros.
          Barras, como en "Citas por especialidad" y "Caja del dia". */
      const tot = porPlan.reduce((a, x) => a + (x.n || 0), 0) || 1;
      return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ fontSize: 21, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, lineHeight: 1 }}>{tot}</span>
            <span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>clínicas</span>
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            {porPlan.map((x) => (
              <div key={x.p}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12, marginBottom: 3 }}>
                  <span style={{ flex: 1, color: "var(--dc-ink-700)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{PLAN_LABEL[x.p]}</span>
                  <b style={{ color: NAVY, fontVariantNumeric: "tabular-nums" }}>{x.n}</b>
                  <span style={{ color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums", minWidth: 30, textAlign: "right" }}>{tot ? Math.round((x.n / tot) * 100) : 0}%</span>
                </div>
                {/* Parte del total de clínicas, igual que el porcentaje de al lado. */}
                <div style={{ height: 7, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}>
                  <div style={{ width: `${((x.n || 0) / tot) * 100}%`, height: "100%", background: PLANC[x.p], borderRadius: "var(--dc-r-full)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } },
    { id: "crecimiento", title: "Clínicas nuevas – 6 meses", icon: BarChart3, color: "var(--dc-ok-700)", w: 2, h: 2, render: () => { const max = Math.max(...nuevas, 1); return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}><div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 8 }}>{nuevas.map((v, i) => { const pct = (v / max) * 100; return <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }}><span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)" }}>{v || ""}</span>{pct >= 5 ? <div style={{ width: "100%", maxWidth: 30, height: `${pct}%`, background: "linear-gradient(180deg,var(--dc-ok),var(--dc-ok-700))", borderRadius: "6px 6px 2px 2px" }} /> : <div style={{ width: "100%", maxWidth: 30, height: 0 }} />}<span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{["E", "F", "M", "A", "M", "J"][i]}</span></div>; })}</div></div>
    ); } },
    { id: "topmrr", title: "Top clínicas por MRR", icon: Wallet, color: DS.c.primary, w: 2, h: 2, render: () => { const top = [...clinicas].sort((a, b) => b.mrr - a.mrr).slice(0, 5); const max = top[0]?.mrr || 1; return (
      <div style={{ display: "flex", flexDirection: "column", gap: 11, height: "100%", justifyContent: "center" }}>{top.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 28, height: 28, borderRadius: "var(--dc-r-sm)", background: DS.c.primary, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><Building2 size={14} strokeWidth={1.75} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontWeight: 500, color: NAVY, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nombre}</span><span style={{ fontSize: 13, fontWeight: 500, color: NAVY, flexShrink: 0, marginLeft: 6 }}>S/ {c.mrr}</span></div><div style={{ height: 6, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}><div style={{ width: `${(c.mrr / max) * 100}%`, height: "100%", background: `linear-gradient(90deg,var(--dc-brand-soft),${DS.c.primary})`, borderRadius: "var(--dc-r-full)" }} /></div></div></div>
      ))}</div>
    ); } },
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DashLienzo role="superadmin" titulo="Plataforma AWG" sub="Métricas del negocio SaaS – arrastra y redimensiona" widgets={widgets} />
      <div style={{ display: "none" }}>
        {[].map((k) => (
          <Card key={k.l} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>{k.l}</div>
              <div style={{ background: tint(k.c, 0.082), color: k.c, width: 34, height: 34, borderRadius: "var(--dc-r-sm)", display: "grid", placeItems: "center" }}>{k.icon}</div>
            </div>
            <div style={{ fontSize: 21, fontWeight: 500, color: k.c, marginTop: 6 }}>{k.v}</div>
          </Card>
        ))}
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 500 }}>Clínicas en la plataforma</h3>
            <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>Cada clínica es un tenant aislado. Aquí solo se ve el estado de la cuenta, nunca su historia clínica.</div>
          </div>
          <div style={{ position: "relative", minWidth: 220 }}>
            <span style={{ position: "absolute", left: 12, top: 10, color: "var(--dc-ink-500)" }}><Search size={16} strokeWidth={1.75} /></span>
            <input className="dc-premium-inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar clínica o RUC"
              style={{ width: "100%", padding: "9px 12px 9px 38px", borderRadius: "var(--dc-r-sm)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box", color: NAVY }} />
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
            <thead><tr style={{ background: "var(--dc-bg)", textAlign: "left" }}>{["Clínica", "Plan", "Sedes", "Usuarios", "Pacientes", "MRR", "Estado", ""].map((h) => <th key={h} style={{ padding: "11px 16px", fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>
              {lista.map((c) => { const E = ESTADO_CLINICA[c.estado]; return (
                <tr key={c.id} style={{ borderTop: "1px solid var(--dc-line)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => setDetC(c)} title="Ver detalle" style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-sm)", background: DS.c.primary, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><Building2 size={17} strokeWidth={1.75} /></div>
                      <div><div style={{ fontWeight: 500, color: NAVY }}>{c.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>RUC {c.ruc}</div></div>
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--dc-ink-700)" }}>{PLAN_LABEL[c.plan]}</td>
                  <td style={{ padding: "12px 16px", color: "var(--dc-ink-700)" }}>{c.sedes}</td>
                  <td style={{ padding: "12px 16px", color: "var(--dc-ink-700)" }}>{c.usuarios}</td>
                  <td style={{ padding: "12px 16px", color: "var(--dc-ink-700)" }}>{c.pacientes}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: NAVY }}>S/ {c.mrr}</td>
                  <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, fontWeight: 500, color: E.fg, background: E.bg, padding: "3px 10px", borderRadius: "var(--dc-r-full)" }}>{E.l}</span></td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button aria-label="Activar o desactivar" onClick={() => toggle(c)} style={{ background: "none", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: c.estado === "suspendida" ? "var(--dc-ok-700)" : "var(--dc-warn-600)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Power size={14} strokeWidth={1.75} /> {c.estado === "suspendida" ? "Reactivar" : "Suspender"}
                    </button>
                  </td>
                </tr>
              ); })}
              {lista.length === 0 && <tr><td colSpan={8} style={{ padding: 28, textAlign: "center", color: "var(--dc-ink-500)" }}>No hay clínicas que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {detC && (() => { const E = ESTADO_CLINICA[detC.estado]; return (
        <Modal icon={<Building2 size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo={detC.nombre} sub={`RUC ${detC.ruc} – Plan ${PLAN_LABEL[detC.plan]}`} onClose={() => setDetC(null)} maxW={500}
          footer={<><Btn small kind="ghost" onClick={() => setDetC(null)}>Cerrar</Btn><Btn small kind={detC.estado === "suspendida" ? "primary" : "red"} onClick={() => { toggle(detC); setDetC(null); }}><Power size={15} strokeWidth={1.75} /> {detC.estado === "suspendida" ? "Reactivar" : "Suspender"}</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {[["Sedes", detC.sedes], ["Usuarios", detC.usuarios], ["Pacientes", detC.pacientes]].map(([l, v]) => <div key={l} style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "12px 14px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>{v}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500 }}>{l}</div></div>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderTop: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Facturación mensual (MRR)</span><span style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>S/ {detC.mrr}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderTop: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Estado de la cuenta</span><span style={{ fontSize: 12, fontWeight: 500, color: E.fg, background: E.bg, padding: "4px 12px", borderRadius: "var(--dc-r-full)" }}>{E.l}</span></div>
        </Modal>
      ); })()}
    </div>
  );
}

/* ---- Auditoría y accesos (módulo del perfil TI) ---- */
/* Registro de auditoría como línea de tiempo agrupada por día. */
function AuditoriaVista({ rows, hoyN, usuarios, alertas, sub, onDet, niv }) {
  const [filtro, setFiltro] = useState("todos");
  const [q, setQ] = useState("");
  const tipoDe = (a) => { const t = String(a.accion || "").toLowerCase(); return a.nivel === "warn" ? "alerta" : t.includes("sesión") || t.includes("sesion") ? "sesion" : t.includes("historia") || t.includes("odontograma") || t.includes("paciente") ? "clinico" : "cambio"; };
  const TIPOS = { sesion: [LogOut, "#2F6FDE", "Sesiones"], clinico: [Stethoscope, "#0E9199", "Clínico"], cambio: [Settings, "#6D4FD1", "Cambios"], alerta: [AlertTriangle, "#E0694F", "Alertas"] };
  const txt = q.trim().toLowerCase();
  const lista = rows.filter((a) => (filtro === "todos" || tipoDe(a) === filtro) && (!txt || `${a.usuario} ${a.accion} ${a.detalle} ${a.ip}`.toLowerCase().includes(txt)));
  const grupos = [];
  lista.forEach((a) => { const f = String(a.fecha || "—"); const k = f.lastIndexOf(" "); const dia = k > 0 ? f.slice(0, k).replace(/,$/, "") : f; const hora = k > 0 ? f.slice(k + 1) : ""; const g = grupos.find((x) => x.dia === dia); const it = { ...a, _hora: hora }; if (g) g.items.push(it); else grupos.push({ dia, items: [it] }); });
  return (
    <>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{rows.length}</b><span>eventos registrados</span></div>
          <p>{sub}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{hoyN}</b><span>Hoy</span></div>
          <div><b>{usuarios}</b><span>Usuarios con actividad</span></div>
          <div><b>{alertas}</b><span>Alertas</span></div>
        </div>
        <span />
      </section>
      <div className="dc-us__barra">
        <label className="dc-cob__buscar dc-us__buscar"><Search size={15} strokeWidth={1.9} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar usuario, acción o IP" aria-label="Buscar en auditoría" /></label>
        <div className="dc-us__roles" role="tablist" aria-label="Tipo de evento">
          <button type="button" role="tab" aria-selected={filtro === "todos"} className={filtro === "todos" ? "is-on" : ""} style={{ "--c": "#0E9199" }} onClick={() => setFiltro("todos")}>Todos <i>{rows.length}</i></button>
          {Object.entries(TIPOS).map(([k, [TI, c, l]]) => { const n = rows.filter((a) => tipoDe(a) === k).length; return n ? <button key={k} type="button" role="tab" aria-selected={filtro === k} className={filtro === k ? "is-on" : ""} style={{ "--c": c }} onClick={() => setFiltro(k)}><TI size={13} strokeWidth={2} /> {l} <i>{n}</i></button> : null; })}
        </div>
      </div>
      {grupos.length === 0 ? <Card><Vacio icon={<ShieldCheck size={22} strokeWidth={1.75} />} titulo="Sin eventos" sub="No hay registros que coincidan." /></Card> : grupos.map((g) => (
        <section key={g.dia} className="dc-aud__dia">
          <div className="dc-aud__dtit"><b>{g.dia}</b><span>{g.items.length} {g.items.length === 1 ? "evento" : "eventos"}</span></div>
          <div className="dc-aud__lista">
            {g.items.map((a) => { const [TI, c] = TIPOS[tipoDe(a)]; const R = ROLES[a.rol]; return (
              <button key={a.id} type="button" className={`dc-aud__ev${a.nivel === "warn" ? " is-warn" : ""}`} style={{ "--c": c }} onClick={() => onDet(a)}>
                <span className="dc-aud__hora">{a._hora}</span>
                <span className="dc-aud__ico"><TI size={15} strokeWidth={2} /></span>
                <div className="dc-aud__txt"><b>{a.accion}</b><span>{a.detalle}</span></div>
                <div className="dc-aud__quien"><b>{a.usuario}</b><span style={{ color: R?.color }}>{R?.label || a.rol}</span></div>
                <code>{a.ip}</code>
                {a.nivel === "warn" ? <span className="dc-int__est is-warn"><i />Alerta</span> : <span className="dc-int__est is-ok"><i />{niv.ok.l}</span>}
              </button>
            ); })}
          </div>
        </section>
      ))}
    </>
  );
}

function Auditoria() {
  // NEW-50/57/58: datos reales de GET /auditoria. KPI Hoy por fecha Lima YYYY-MM-DD. Sin filas inventadas.
  const conectado = !!auth.token;
  const niv = { ok: { bg: "var(--dc-ok-soft)", fg: "var(--dc-ok-700)", l: "OK" }, warn: { bg: "var(--dc-warn-soft)", fg: "var(--dc-warn-600)", l: "Alerta" } };
  const [det, setDet] = useState(null);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const hoyLima = ymdLima(new Date());
  useEffect(() => {
    if (!conectado) return;
    let cancelled = false;
    api.auditoria().then((list) => {
      if (cancelled) return;
      const mapped = mapAuditoriaApiRows(list).map((base) => {
        const a = base.raw || {};
        const accion = a.accion || "—";
        const creado = a.creadoEn ? new Date(a.creadoEn) : null;
        const fecha = creado && !isNaN(creado)
          ? creado.toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" })
          : "—";
        return {
          ...base,
          fecha,
          usuario: a.usuario || "—",
          rol: a.rol || "—",
          accion: accion === "HC_ACCESO" ? "Acceso a historia clínica" : accion === "LOGIN" ? "Inicio de sesión" : accion,
          nivel: "ok",
          dispositivo: base.dispositivo || resumenDispositivo(base.userAgent),
        };
      });
      setRows(mapped);
      setErr(null);
    }).catch(() => {
      if (cancelled) return;
      setRows(null);
      setErr("No se pudo cargar el registro de auditoría.");
    });
    return () => { cancelled = true; };
  }, [conectado]);
  if (!conectado) {
    const alertas = AUDITORIA.filter((a) => a.nivel === "warn").length;
    const usuarios = new Set(AUDITORIA.filter((a) => a.usuario !== "—").map((a) => a.usuario)).size;
    const hoyN = AUDITORIA.filter((a) => a.fecha.startsWith("Hoy")).length;
    const colsDemo = [
      { key: "fecha", label: "Fecha", w: "minmax(110px,0.9fr)", a: "left", get: (a) => a.orden ?? a.fecha, cell: (a) => <span style={{ fontSize: 13, color: "var(--dc-ink-700)", fontWeight: 500, whiteSpace: "nowrap" }}>{a.fecha}</span> },
      { key: "usuario", label: "Usuario", w: "minmax(150px,1.2fr)", a: "left", get: (a) => a.usuario + " " + (ROLES[a.rol]?.label || a.rol), cell: (a) => { const R = ROLES[a.rol]; return <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.usuario}</div><div style={{ fontSize: 12, color: R?.color || "var(--dc-ink-500)", fontWeight: 500 }}>{R?.label || a.rol}</div></div>; } },
      { key: "accion", label: "Acción", w: "minmax(150px,1.1fr)", a: "left", get: (a) => a.accion, cell: (a) => <span style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{a.accion}</span> },
      { key: "detalle", label: "Detalle", w: "minmax(180px,1.6fr)", a: "left", get: (a) => a.detalle, cell: (a) => <span style={{ color: "var(--dc-ink-700)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{a.detalle}</span> },
      { key: "dispositivo", label: "Dispositivo", w: "minmax(140px,1fr)", a: "left", get: (a) => a.dispositivo || resumenDispositivo(a.userAgent), cell: (a) => <span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{a.dispositivo || resumenDispositivo(a.userAgent)}</span> },
      { key: "ip", label: "IP", w: "minmax(116px,0.8fr)", a: "center", get: (a) => a.ip, cell: (a) => <span style={{ color: "var(--dc-ink-500)", fontFamily: "monospace", fontSize: 13 }}>{a.ip}</span> },
      { key: "nivel", label: "Estado", w: "minmax(100px,0.7fr)", a: "center", get: (a) => niv[a.nivel].l, cell: (a) => { const N = niv[a.nivel]; return <span style={{ fontSize: 12, fontWeight: 500, color: N.fg, background: N.bg, padding: "3px 10px", borderRadius: "var(--dc-r-full)", display: "inline-flex", alignItems: "center", gap: 5 }}>{a.nivel === "warn" ? <AlertTriangle size={11} strokeWidth={1.75} /> : <CheckCircle2 size={11} strokeWidth={1.75} />} {N.l}</span>; } },
    ];
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <AuditoriaVista rows={AUDITORIA.map((a, i) => ({ ...a, id: i }))} hoyN={hoyN} usuarios={usuarios} alertas={alertas} sub="Datos de ejemplo, sin sesión" onDet={setDet} niv={niv} />
        {det && (() => { const R = ROLES[det.rol]; const N = niv[det.nivel]; return (
          <Modal icon={<ShieldCheck size={20} strokeWidth={1.75} />} tone={det.nivel === "warn" ? "var(--dc-warn-600)" : DS.c.primary} titulo={det.accion} sub={`${det.fecha} – ${det.usuario}`} onClose={() => setDet(null)} maxW={480} footer={<Btn small kind="ghost" onClick={() => setDet(null)}>Cerrar</Btn>}>
            <div style={{ display: "grid", gap: 10 }}>
              {[["Usuario", det.usuario], ["Rol", R?.label || det.rol], ["Acción", det.accion], ["Detalle", det.detalle], ["Dirección IP", det.ip], ["User-Agent", det.userAgent || "—"], ["Fecha y hora", det.fecha]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>{l}</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500, textAlign: "right", wordBreak: "break-word", maxWidth: "62%" }}>{v}</span></div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Estado</span><span style={{ fontSize: 12, fontWeight: 500, color: N.fg, background: N.bg, padding: "4px 12px", borderRadius: "var(--dc-r-full)" }}>{N.l}</span></div>
            </div>
          </Modal>
        ); })()}
      </div>
    );
  }
  if (err && rows == null) {
    return <Card style={{ padding: 22, color: "var(--dc-danger-700)" }}>{err}</Card>;
  }
  if (rows == null) {
    return <Card style={{ padding: 22, color: "var(--dc-ink-500)" }}>Cargando auditoría…</Card>;
  }
  const hoyN = contarEventosHoy(rows, hoyLima);
  const usuarios = new Set(rows.map((a) => a.usuario).filter((u) => u && u !== "—")).size;
  const cols = [
    { key: "fecha", label: "Fecha", w: "minmax(130px,0.9fr)", a: "left", get: (a) => a.orden, cell: (a) => <span style={{ fontSize: 13, color: "var(--dc-ink-700)", fontWeight: 500, whiteSpace: "nowrap" }}>{a.fecha}</span> },
    { key: "usuario", label: "Usuario", w: "minmax(150px,1.2fr)", a: "left", get: (a) => a.usuario + " " + (ROLES[a.rol]?.label || a.rol), cell: (a) => { const R = ROLES[a.rol]; return <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.usuario}</div><div style={{ fontSize: 12, color: R?.color || "var(--dc-ink-500)", fontWeight: 500 }}>{R?.label || a.rol}</div></div>; } },
    { key: "accion", label: "Acción", w: "minmax(180px,1.2fr)", a: "left", get: (a) => a.accion, cell: (a) => <span style={{ fontWeight: 500, color: NAVY, fontSize: 13 }}>{a.accion}</span> },
    { key: "detalle", label: "Detalle", w: "minmax(180px,1.6fr)", a: "left", get: (a) => a.detalle, cell: (a) => <span style={{ color: "var(--dc-ink-700)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{a.detalle}</span> },
    { key: "dispositivo", label: "Dispositivo", w: "minmax(150px,1.1fr)", a: "left", get: (a) => a.dispositivo || resumenDispositivo(a.userAgent), cell: (a) => <span style={{ fontSize: 12, color: "var(--dc-ink-500)" }} title={a.userAgent || ""}>{a.dispositivo || resumenDispositivo(a.userAgent)}</span> },
    { key: "ip", label: "IP", w: "minmax(116px,0.8fr)", a: "center", get: (a) => a.ip, cell: (a) => <span style={{ color: "var(--dc-ink-500)", fontFamily: "monospace", fontSize: 13 }}>{a.ip}</span> },
    { key: "nivel", label: "Estado", w: "minmax(100px,0.7fr)", a: "center", get: (a) => niv[a.nivel].l, cell: (a) => { const N = niv[a.nivel]; return <span style={{ fontSize: 12, fontWeight: 500, color: N.fg, background: N.bg, padding: "3px 10px", borderRadius: "var(--dc-r-full)", display: "inline-flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={11} strokeWidth={1.75} /> {N.l}</span>; } },
  ];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {err && <div className="fm-aviso-edad is-mal"><AlertTriangle size={15} strokeWidth={2} /><span>{err}</span></div>}
      <AuditoriaVista rows={rows} hoyN={hoyN} usuarios={usuarios} alertas={rows.filter((r) => r.nivel === "warn").length} sub="Inicios de sesión y aperturas de historia clínica (Ley 29733)" onDet={setDet} niv={niv} />
      {det && (() => { const R = ROLES[det.rol]; const N = niv[det.nivel]; return (
        <Modal icon={<ShieldCheck size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo={det.accion} sub={`${det.fecha} – ${det.usuario}`} onClose={() => setDet(null)} maxW={480} footer={<Btn small kind="ghost" onClick={() => setDet(null)}>Cerrar</Btn>}>
          <div style={{ display: "grid", gap: 10 }}>
            {[["Usuario", det.usuario], ["Rol", R?.label || det.rol], ["Acción", det.accion], ["Detalle", det.detalle], ["Dirección IP", det.ip], ["User-Agent", det.userAgent || "—"], ["Fecha y hora", det.fecha]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>{l}</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500, textAlign: "right", wordBreak: "break-word", maxWidth: "62%" }}>{v}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Estado</span><span style={{ fontSize: 12, fontWeight: 500, color: N.fg, background: N.bg, padding: "4px 12px", borderRadius: "var(--dc-r-full)" }}>{N.l}</span></div>
          </div>
        </Modal>
      ); })()}
    </div>
  );
}

/* ---- Recetas médicas con firma electrónica (paridad con Doctocliq) ---- */
function Recetas({ pacientes: pacProp, notify, updFicha }) {
  const conectado = !!auth.token;
  const [pacRemoto, setPacRemoto] = useState(null);
  useEffect(() => { if (conectado) api.pacientes.listar().then((r) => setPacRemoto((r || []).map((p) => ({ id: p.id, nombre: p.nombre })))).catch(() => {}); }, []); // eslint-disable-line
  const pacientes = conectado ? (pacRemoto || []) : pacProp;
  const nombrePac = (id) => (pacRemoto || []).find((p) => p.id === id)?.nombre || "—";
  const [recetasDemo, setRecetasDemo] = useState(() => {
    const out = [];
    Object.entries(FICHA_CLINICA).forEach(([pid, f]) => (f.recetas || []).forEach((r, i) => {
      const p = PACIENTES_INIT.find((x) => x.id === Number(pid));
      if (p) out.push({ id: pid + "-" + i, paciente: p.nombre, fecha: r.fecha, items: [{ med: r.texto, detalle: "" }], indic: "", firmada: true });
    }));
    return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
  });
  const [recetasRem, setRecetasRem] = useState([]);
  const recargarRecetas = () => { if (conectado) api.recetas.listar().then((rows) => setRecetasRem((rows || []).map((r) => { let its = []; try { its = JSON.parse(r.items || "[]"); } catch { its = []; } return { id: r.id, paciente: nombrePac(r.pacienteId), fecha: r.fecha, indic: r.indicaciones || "", firmada: true, items: Array.isArray(its) ? its : [] }; }).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")))).catch(() => {}); };
  useEffect(() => { recargarRecetas(); }, [conectado, pacRemoto]); // eslint-disable-line
  const recetas = conectado ? recetasRem : recetasDemo;
  const setRecetas = setRecetasDemo;
  const [form, setForm] = useState(null);
  const inp = { width: "100%", padding: "9px 11px", borderRadius: "var(--dc-r-sm)", border: "1.5px solid var(--dc-line)", fontSize: 13, color: NAVY, outline: "none", boxSizing: "border-box" };
  const nuevo = () => setForm({ paciente: pacientes[0]?.nombre || "", items: [{ med: "", dosis: "", frec: "", dur: "" }], indic: "" });
  const setItem = (i, k, v) => setForm((f) => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const emitir = () => {
    const items = form.items.filter((x) => x.med.trim());
    if (!items.length) { notify("Agrega al menos un medicamento."); return; }
    if (conectado) {
      const pid = (pacientes.find((p) => p.nombre === form.paciente) || {}).id;
      if (!pid) { notify("Selecciona un paciente válido."); return; }
      const itemsBk = items.map((x) => ({ med: `${x.med}${x.dosis ? " " + x.dosis : ""}`, detalle: [x.frec, x.dur].filter(Boolean).join(" – ") }));
      api.recetas.crear({ pacienteId: pid, fecha: fmt(hoy), indicaciones: form.indic, items: JSON.stringify(itemsBk) })
        .then(() => { notify("Receta emitida y firmada. Queda en la ficha del paciente."); recargarRecetas(); setForm(null); })
        .catch(() => notify("No se pudo emitir la receta."));
      return;
    }
    setRecetas((rs) => [{ id: Date.now(), paciente: form.paciente, fecha: fmt(hoy), indic: form.indic, firmada: true,
      items: items.map((x) => ({ med: `${x.med}${x.dosis ? " " + x.dosis : ""}`, detalle: [x.frec, x.dur].filter(Boolean).join(" – ") })) }, ...rs]);
    // Queda en la historia clínica del paciente (visible en su ficha).
    const pid = (pacientes.find((p) => p.nombre === form.paciente) || PACIENTES_INIT.find((p) => p.nombre === form.paciente))?.id;
    const texto = items.map((x) => `${x.med}${x.dosis ? " " + x.dosis : ""}${x.frec ? " " + x.frec : ""}${x.dur ? " por " + x.dur : ""}`).join("; ");
    if (pid && updFicha) updFicha(pid, (cur) => ({ ...cur, recetas: [{ fecha: fmt(hoy), texto }, ...(cur.recetas || [])] }));
    notify("Receta emitida y firmada. Queda en la ficha del paciente y se envía por WhatsApp/correo.");
    setForm(null);
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {(() => { const total = recetas.length; const firmadas = recetas.filter((r) => r.firmada).length; const mesN = recetas.filter((r) => new Date(r.fecha + "T00:00:00").getMonth() === hoy.getMonth()).length; const pacs = new Set(recetas.map((r) => r.paciente)).size; return (
        <section className="dc-esp-hero dc-rx-hero">
          <div className="dc-esp-hero__txt">
            <div className="dc-esp-hero__num"><b>{total}</b><span>{total === 1 ? "receta emitida" : "recetas emitidas"}</span></div>
            <p>Firmadas digitalmente y guardadas en la historia del paciente</p>
          </div>
          <div className="dc-esp-hero__cifras">
            <div><b>{firmadas}</b><span>Con firma</span></div>
            <div><b>{mesN}</b><span>Este mes</span></div>
            <div><b>{pacs}</b><span>Pacientes</span></div>
          </div>
          <span />
          <button type="button" className="dc-esp-hero__btn" onClick={nuevo}><Plus size={14} strokeWidth={2} /> Nueva receta</button>
        </section>
      ); })()}
      {form && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, color: NAVY, marginBottom: 14, fontFamily: DISPLAY_FONT, display: "flex", alignItems: "center", gap: 8 }}><FileText size={16} strokeWidth={1.75} color={DS.c.primary} /> Nueva receta</div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Paciente<br />
            <div style={{ maxWidth: 320 }}><Select value={form.paciente} onChange={(v) => setForm({ ...form, paciente: v })} options={pacientes.map((p) => ({ value: p.nombre, label: p.nombre }))} /></div>
          </label>
          <div style={{ margin: "16px 0 8px", fontSize: 13, fontWeight: 500, color: NAVY }}>Medicamentos</div>
          <div style={{ display: "grid", gap: 8 }}>
            {form.items.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.3fr 1fr auto", gap: 8, alignItems: "center" }}>
                <input className="dc-premium-inp" value={it.med} onChange={(e) => setItem(i, "med", e.target.value)} placeholder="Medicamento" style={inp} />
                <input className="dc-premium-inp" value={it.dosis} onChange={(e) => setItem(i, "dosis", e.target.value)} placeholder="500mg" style={inp} />
                <input className="dc-premium-inp" value={it.frec} onChange={(e) => setItem(i, "frec", e.target.value)} placeholder="c/8h" style={inp} />
                <input className="dc-premium-inp" value={it.dur} onChange={(e) => setItem(i, "dur", e.target.value)} placeholder="7 días" style={inp} />
                <button type="button" className="dc-icon-btn" aria-label="Quitar" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dc-ink-500)" }} title="Quitar"><X size={16} strokeWidth={1.75} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setForm((f) => ({ ...f, items: [...f.items, { med: "", dosis: "", frec: "", dur: "" }] }))} style={{ marginTop: 8, background: "none", border: "none", color: DS.c.primary, fontWeight: 500, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Plus size={14} strokeWidth={1.75} /> Agregar medicamento</button>
          <div style={{ marginTop: 14 }}><label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Indicaciones<br /><textarea className="dc-premium-inp" value={form.indic} onChange={(e) => setForm({ ...form, indic: e.target.value })} rows={2} placeholder="Tomar después de las comidas, no manejar..." style={{ ...inp, marginTop: 4, resize: "vertical" }} /></label></div>
          <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}><Btn small kind="ghost" onClick={() => setForm(null)}>Cancelar</Btn><Btn small onClick={emitir}><Check size={15} strokeWidth={1.75} /> Firmar y emitir</Btn></div>
        </Card>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {recetas.length === 0 && !form && <Card style={{ padding: 0 }}><Vacio icon={<FileText size={22} strokeWidth={1.75} />} titulo="Sin recetas" sub="Emite la primera receta; queda firmada en la historia del paciente." /></Card>}
        {recetas.length > 0 && (
          <div className="dc-rx-grid">
            {recetas.map((r) => { const col = colorDe(r.paciente); return (
              <article key={r.id} className="dc-rx">
                <header className="dc-rx__cab">
                  <span className="dc-rec__av" style={{ width: 40, height: 40, fontSize: 13, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(r.paciente)}</span>
                  <div className="dc-rx__quien"><b>{r.paciente}</b><span><Calendar size={12} strokeWidth={1.75} /> {fechaLegible(r.fecha)}</span></div>
                  <span className="dc-pill is-ok"><ShieldCheck size={12} strokeWidth={2} /> Firmada</span>
                </header>
                <ul className="dc-rx__items">
                  {r.items.map((it, i) => <li key={i}><span className="dc-rx__rx">℞</span><div><b>{it.med}</b>{it.detalle && <span>{it.detalle}</span>}</div></li>)}
                </ul>
                {r.indic && <p className="dc-rx__indic">{r.indic}</p>}
              </article>
            ); })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Consentimientos informados con firma (paridad con Doctocliq) ---- */
const CONSENT_TIPOS = ["Consentimiento informado de tratamiento", "Endodoncia", "Exodoncia (extracción)", "Ortodoncia", "Cirugía / implante", "Uso de datos personales (Ley 29733)"];
// Pad de firma digital (canvas) dentro de un modal centrado.
function FirmaModal({ doc, onClose, onConfirm, esMenor = false, firmante, setFirmante }) {
  const cvs = useRef(null);
  const [dib, setDib] = useState(false);
  useEffect(() => {
    const c = cvs.current; if (!c) return; const ctx = c.getContext("2d");
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "var(--dc-ink-alt)";
    let drawing = false, last = null;
    const pos = (e) => { const r = c.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; const sx = c.width / r.width, sy = c.height / r.height; return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy }; };
    const down = (e) => { drawing = true; last = pos(e); e.preventDefault(); };
    const move = (e) => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; setDib(true); e.preventDefault(); };
    const up = () => { drawing = false; };
    c.addEventListener("mousedown", down); c.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    c.addEventListener("touchstart", down, { passive: false }); c.addEventListener("touchmove", move, { passive: false }); window.addEventListener("touchend", up);
    return () => { c.removeEventListener("mousedown", down); c.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); c.removeEventListener("touchstart", down); c.removeEventListener("touchmove", move); window.removeEventListener("touchend", up); };
  }, []);
  const limpiar = () => { const c = cvs.current; if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height); setDib(false); };
  return (
    <Modal icon={<Pencil size={20} strokeWidth={1.75} />} titulo={esMenor ? `Firma del apoderado – ${doc.tipo}` : `Firma del paciente – ${doc.tipo}`} sub={doc.paciente} onClose={onClose} maxW={520}
      footer={<><Btn small kind="ghost" onClick={limpiar}>Limpiar</Btn><Btn small onClick={onConfirm} disabled={!dib || (esMenor && !(firmante?.nombre || "").trim())}><ShieldCheck size={15} strokeWidth={1.75} /> Confirmar firma</Btn></>}>
      {/* Un menor no consiente por si mismo: firma su padre, madre o tutor, y el
          documento debe decir quien fue. Se precarga con el apoderado de su ficha. */}
      {esMenor && (
        <div style={{ background: PED_SUAVE, border: `1px solid ${PED_LINEA}`, borderRadius: "var(--dc-r-md)", padding: 13, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 500, color: PED, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>
            <EmblemaNino size={16} /> Paciente menor de edad
          </div>
          <div style={{ fontSize: 13, color: "var(--dc-warn-700)", lineHeight: 1.5, marginBottom: 10 }}>
            Quien firma no es {doc.paciente}, sino quien responde por él o ella. Queda registrado en el documento.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 9 }}>
            <input className="dc-premium-inp" value={firmante?.nombre || ""} onChange={(e) => setFirmante((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre de quien firma *" style={{ width: "100%", padding: "9px 11px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            <Select small value={firmante?.relacion || ""} onChange={(v) => setFirmante((f) => ({ ...f, relacion: v }))} placeholder="Parentesco"
              options={[{ value: "", label: "Parentesco" }, ...PARENTESCOS.map((x) => ({ value: x, label: x }))]} />
            <input className="dc-premium-inp" value={firmante?.dni || ""} onChange={(e) => setFirmante((f) => ({ ...f, dni: e.target.value.replace(/D/g, "").slice(0, 8) }))}
              placeholder="DNI de quien firma" inputMode="numeric" style={{ width: "100%", padding: "9px 11px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
        </div>
      )}
      <div style={{ fontSize: 13, color: "var(--dc-ink-400)", marginBottom: 10 }}>{esMenor ? "El apoderado" : "El paciente"} dibuja su firma en el recuadro. Al confirmar queda archivada con fecha y hora registrada.</div>
      <canvas ref={cvs} width={460} height={180} style={{ width: "100%", height: 180, border: "1.5px dashed var(--dc-line)", borderRadius: "var(--dc-r-lg)", background: "var(--dc-bg)", touchAction: "none", cursor: "crosshair", display: "block" }} />
      <div style={{ fontSize: 12, color: "var(--dc-ink-500)", marginTop: 8, textAlign: "center" }}>{esMenor ? "Firma aquí el padre, la madre o el tutor" : "Firma aquí con el dedo o el mouse"}</div>
    </Modal>
  );
}
function Consentimientos({ pacientes: pacProp, notify }) {
  const conectado = !!auth.token;
  const [pacRemoto, setPacRemoto] = useState(null);
  // Se traen tambien nacimiento y apoderado: hacen falta para saber si el paciente es
  // menor y, en ese caso, quien puede firmar por el.
  useEffect(() => { if (conectado) api.pacientes.listar().then((r) => setPacRemoto((r || []).map((p) => ({
    id: p.id, nombre: p.nombre, nacimiento: p.fechaNacimiento,
    apoderadoNombre: p.apoderadoNombre, apoderadoParentesco: p.apoderadoParentesco, apoderadoDni: p.apoderadoDni,
  })))).catch(() => {}); }, []); // eslint-disable-line
  const pacientes = conectado ? (pacRemoto || []) : pacProp;
  const nombrePac = (id) => (pacRemoto || []).find((p) => p.id === id)?.nombre || "—";
  const [docsDemo, setDocsDemo] = useState([
    { id: 1, paciente: "Rosa Linares", tipo: "Endodoncia", fecha: addDays(-3), estado: "firmado" },
    { id: 2, paciente: "María Chávez", tipo: "Exodoncia (extracción)", fecha: addDays(-1), estado: "pendiente" },
    { id: 3, paciente: "Elena Ríos", tipo: "Ortodoncia", fecha: addDays(-5), estado: "firmado" },
    // Menor: al firmarlo se pide quien responde por el. Sin un caso asi, la regla
    // del apoderado no se podia ver en modo demostracion.
    { id: 4, paciente: "Mateo Ríos", tipo: "Odontopediatría (sellantes)", fecha: fmt(hoy), estado: "pendiente" },
  ]);
  const [docsRem, setDocsRem] = useState([]);
  const recargarDocs = () => { if (conectado) api.consentimientos.listar().then((rows) => setDocsRem((rows || []).map((c) => ({ id: c.id, paciente: nombrePac(c.pacienteId), tipo: c.tipo || c.titulo || "Consentimiento", fecha: (c.fechaFirma || c.creadoEn || "").slice(0, 10), estado: c.firmado ? "firmado" : "pendiente", contenido: c.contenido, firmaUrl: c.firmaUrl,
    firmanteNombre: c.firmanteNombre, firmanteDni: c.firmanteDni, firmanteRelacion: c.firmanteRelacion })))).catch(() => {}); };
  useEffect(() => { recargarDocs(); }, [conectado, pacRemoto]); // eslint-disable-line
  const docs = conectado ? docsRem : docsDemo;
  const setDocs = setDocsDemo;
  const [form, setForm] = useState(null);
  const [firmaDoc, setFirmaDoc] = useState(null);
  const [firmante, setFirmante] = useState({ nombre: "", dni: "", relacion: "" });
  // El paciente del documento que se esta firmando, con sus datos completos.
  const pacDeDoc = firmaDoc ? (pacientes.find((p) => p.nombre === firmaDoc.paciente) || null) : null;
  const firmaEsDeMenor = !!pacDeDoc && esPediatrico(pacDeDoc.nacimiento);
  // Al abrir la firma de un menor se precarga su apoderado: casi siempre es quien firma.
  const abrirFirma = (d) => {
    const pac = pacientes.find((p) => p.nombre === d.paciente);
    setFirmante({ nombre: pac?.apoderadoNombre || "", dni: pac?.apoderadoDni || "", relacion: pac?.apoderadoParentesco || "" });
    setFirmaDoc(d);
  };
  const inp = { width: "100%", padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box", cursor: "pointer" };
  const enviar = () => {
    if (conectado) {
      const pid = (pacientes.find((p) => p.nombre === form.paciente) || {}).id;
      if (!pid) { notify("Selecciona un paciente válido."); return; }
      api.consentimientos.crear({ pacienteId: pid, tipo: form.tipo, titulo: form.tipo })
        .then(() => { notify("Consentimiento enviado al paciente para firma en línea."); recargarDocs(); setForm(null); })
        .catch(() => notify("No se pudo enviar el consentimiento."));
      return;
    }
    setDocs((d) => [{ id: Date.now(), paciente: form.paciente, tipo: form.tipo, fecha: fmt(hoy), estado: "pendiente" }, ...d]); notify("Consentimiento enviado al paciente para firma en línea."); setForm(null);
  };
  const confirmarFirma = () => {
    // Un menor no consiente por si mismo: sin quien firme, no se archiva.
    // El backend lo valida igual; esto solo evita el viaje y explica antes.
    if (firmaEsDeMenor && !firmante.nombre.trim()) {
      notify("El paciente es menor: escribe quién firma (padre, madre o tutor).");
      return;
    }
    if (conectado) {
      api.consentimientos.firmar(firmaDoc.id, "firma://" + firmaDoc.id,
        firmaEsDeMenor ? { firmanteNombre: firmante.nombre, firmanteDni: firmante.dni, firmanteRelacion: firmante.relacion } : null)
        .then(() => { notify("Consentimiento firmado digitalmente y archivado con fecha y hora."); recargarDocs(); setFirmaDoc(null); })
        .catch(() => notify("No se pudo registrar la firma."));
      return;
    }
    setDocs((d) => d.map((x) => x.id === firmaDoc.id ? { ...x, estado: "firmado", fecha: fmt(hoy) } : x)); notify("Consentimiento firmado digitalmente y archivado con fecha y hora."); setFirmaDoc(null);
  };
  const kpis = [["Firmados", docs.filter((d) => d.estado === "firmado").length, "var(--dc-ok-700)", <ShieldCheck size={18} strokeWidth={1.75} />], ["Pendientes", docs.filter((d) => d.estado === "pendiente").length, "var(--dc-warn-600)", <Clock size={18} strokeWidth={1.75} />], ["Total", docs.length, NAVY, <Shield size={18} strokeWidth={1.75} />]];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {(() => { const nF = docs.filter((d) => d.estado === "firmado").length; const pct = docs.length ? Math.round((nF / docs.length) * 100) : 0; return (
        <section className="dc-esp-hero dc-form-hero">
          <div className="dc-esp-hero__txt">
            <div className="dc-esp-hero__num"><b>{pct}%</b><span>firmados</span></div>
            <p>El paciente firma en línea y queda archivado con fecha y hora</p>
          </div>
          <div className="dc-esp-hero__cifras">
            <div><b>{nF}</b><span>Firmados</span></div>
            <div><b>{docs.length - nF}</b><span>Por firmar</span></div>
            <div><b>{docs.length}</b><span>Documentos</span></div>
          </div>
          <div className="dc-form-hero__barra" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
          <button type="button" className="dc-esp-hero__btn" onClick={() => setForm({ paciente: pacientes[0]?.nombre || "", tipo: CONSENT_TIPOS[0] })}><Send size={14} strokeWidth={1.75} /> Enviar consentimiento</button>
        </section>
      ); })()}
      {form && (
        <Modal icon={<Shield size={20} strokeWidth={1.75} />} titulo="Enviar consentimiento" sub="El paciente lo firma en línea con fecha registrada" onClose={() => setForm(null)} maxW={540} footer={<><Btn small kind="ghost" onClick={() => setForm(null)}>Cancelar</Btn><Btn small onClick={enviar}><Send size={15} strokeWidth={1.75} /> Enviar al paciente</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Paciente<br /><Select value={form.paciente} onChange={(v) => setForm({ ...form, paciente: v })} options={pacientes.map((p) => ({ value: p.nombre, label: p.nombre }))} /></label>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Tipo<br /><Select value={form.tipo} onChange={(v) => setForm({ ...form, tipo: v })} options={CONSENT_TIPOS.map((t) => ({ value: t, label: t }))} /></label>
          </div>
          <div style={{ marginTop: 16, background: "var(--dc-accent-soft)", border: "1px solid var(--dc-info-soft)", borderRadius: "var(--dc-r-lg)", padding: "13px 15px" }}>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".05em", textTransform: "uppercase", color: DS.c.primary, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><MessageSquare size={13} strokeWidth={1.75} /> Así lo recibe el paciente</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, color: "var(--dc-brand-600)" }}>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Send size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> Llega un enlace por WhatsApp a <strong>{form.paciente || "el paciente"}</strong>.</span>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Pencil size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> Lee el documento y firma con el dedo en su celular.</span>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><ShieldCheck size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> Queda archivado con <strong>fecha y hora registrada</strong>.</span>
            </div>
          </div>
        </Modal>
      )}
      <DataTable titulo="Consentimientos" sub="documentos" minWidth={680} rows={docs} empty={<Vacio icon={<Shield size={22} strokeWidth={1.75} />} titulo="Sin consentimientos" sub="Envía el primer consentimiento para que el paciente lo firme en línea." />} cols={[
        { key: "paciente", label: "Paciente", w: "minmax(160px,1.3fr)", a: "left", get: (d) => d.paciente, cell: (d) => { const col = colorDe(d.paciente); return <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}><span className="dc-rec__av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(d.paciente)}</span><span style={{ fontWeight: 600, color: "var(--dc-ink-900)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.paciente}</span></span>; } },
        { key: "tipo", label: "Documento", w: "minmax(190px,1.6fr)", a: "left", get: (d) => d.tipo, cell: (d) => <span className="dc-doc-tipo"><span><Shield size={14} strokeWidth={1.9} /></span>{d.tipo}</span> },
        { key: "fecha", label: "Fecha", w: "150px", a: "center", get: (d) => d.fecha, cell: (d) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{fechaLegible(d.fecha)}</span> },
        { key: "estado", label: "Estado", w: "140px", a: "center", get: (d) => d.estado, cell: (d) => d.estado === "firmado"
          ? <span className="dc-pill is-ok"><ShieldCheck size={12} strokeWidth={2} /> Firmado</span>
          : <span className="dc-pill is-aviso"><Clock size={12} strokeWidth={2} /> Por firmar</span> },
        { key: "acc", label: "Acción", w: "140px", a: "center", noFilter: true, noSort: true, cell: (d) => d.estado === "pendiente"
          ? <ActionBtn color="var(--dc-primary-alt)" onClick={() => abrirFirma(d)}><Pencil size={12} strokeWidth={2} style={{ marginRight: 6 }} />Firmar</ActionBtn>
          : <ActionBtn subtle onClick={() => {
              const w = window.open("", "_blank"); if (!w) { notify("Permite ventanas emergentes para descargar el PDF."); return; }
              const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
              w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.tipo)} - ${esc(d.paciente)}</title><style>*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--dc-brand-900);padding:40px;max-width:720px;margin:0 auto}h1{font-size:20px;color:var(--dc-teal);margin:0 0 4px}.meta{color:var(--dc-slate);font-size:13px;margin-bottom:24px}.box{border:1px solid var(--dc-line);border-radius:12px;padding:20px;font-size:13.5px;line-height:1.7}.firma{margin-top:28px;border-top:1px solid var(--dc-line);padding-top:14px}img{max-width:280px;border:1px solid var(--dc-line);border-radius:8px}@media print{@page{margin:16mm}}</style></head><body><h1>${esc(d.tipo)}</h1><div class="meta">Paciente: <b>${esc(d.paciente)}</b> &middot; Fecha: ${esc(d.fecha)} &middot; Estado: ${esc(d.estado)}</div><div class="box">${d.contenido ? esc(d.contenido) : "El paciente firmó y aceptó este consentimiento informado de forma electrónica."}</div>${d.firmaUrl ? `<div class="firma"><div style="font-size:12px;color:var(--dc-slate);margin-bottom:6px">${d.firmanteNombre ? "Firma del apoderado:" : "Firma del paciente:"}</div><img src="${d.firmaUrl}"/>${d.firmanteNombre ? `<div style="font-size:12.5px;color:var(--dc-brand-900);margin-top:8px">Firmado por <b>${esc(d.firmanteNombre)}</b>${d.firmanteRelacion ? ` (${esc(d.firmanteRelacion.toLowerCase())})` : ""}${d.firmanteDni ? ` &middot; DNI ${esc(d.firmanteDni)}` : ""}, en representación del paciente por ser menor de edad.</div>` : ""}</div>` : ""}<div class="firma" style="color:var(--dc-ink-400);font-size:11px;border:none">Generado por Dento Check</div><script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>`);
              w.document.close();
            }}><FileText size={12} strokeWidth={2} style={{ marginRight: 6 }} />PDF</ActionBtn> },
      ]} />
      {firmaDoc && <FirmaModal doc={firmaDoc} onClose={() => setFirmaDoc(null)} onConfirm={confirmarFirma} esMenor={firmaEsDeMenor} firmante={firmante} setFirmante={setFirmante} />}
    </div>
  );
}

/* ---- Inventario de insumos (paridad con Doctocliq) ---- */
const INVENTARIO_INIT = [
  { id: 1, nombre: "Guantes de nitrilo (caja)", cat: "Bioseguridad", stock: 24, min: 10, unidad: "cajas", dia: 1.5, precio: 35 },
  { id: 2, nombre: "Anestesia lidocaína 2%", cat: "Anestesia", stock: 8, min: 15, unidad: "cartuchos", dia: 4, precio: 3 },
  { id: 3, nombre: "Agujas dentales cortas", cat: "Instrumental", stock: 60, min: 20, unidad: "unid", dia: 6, precio: 1.2 },
  { id: 4, nombre: "Resina compuesta A2", cat: "Restauración", stock: 5, min: 6, unidad: "jeringas", dia: 0.6, precio: 45 },
  { id: 5, nombre: "Algodón en rollos", cat: "Consumibles", stock: 40, min: 15, unidad: "paq", dia: 2, precio: 8 },
  { id: 6, nombre: "Fresas de diamante", cat: "Instrumental", stock: 0, min: 10, unidad: "unid", dia: 1.2, precio: 12 },
  { id: 7, nombre: "Ácido grabador 37%", cat: "Restauración", stock: 12, min: 5, unidad: "jeringas", dia: 0.4, precio: 18 },
  { id: 8, nombre: "Barbijos quirúrgicos", cat: "Bioseguridad", stock: 30, min: 20, unidad: "cajas", dia: 2, precio: 22 },
];
/* ---- Configuración de la clínica: sedes, doctores, servicios y horarios (CRUD real) ---- */

// Bancos del Perú con la longitud típica de su número de cuenta (referencial; varía por
// tipo de cuenta soles/dólares y ahorro/corriente). El CCI interbancario SIEMPRE es 20 dígitos.

/* ---- Servicios / catálogo (estilo Doctocliq: Administración > Servicios) ---- */
const SERV_CATS = ["Odontología general", "Ortodoncia", "Endodoncia", "Periodoncia", "Cirugía", "Estética", "Odontopediatría", "Prótesis"];
const SERV_CAT_COL = { "Odontología general": DS.c.primary, Ortodoncia: "var(--dc-purple)", Endodoncia: "var(--dc-red)", Periodoncia: "var(--dc-ok-700)", Cirugía: "var(--dc-danger)", Estética: "var(--dc-warn-700)", Odontopediatría: PED, Prótesis: "#2563EB" };
const SERVICIOS_INIT = [
  { id: 1, nombre: "Consulta / evaluación", cat: "Odontología general", monto: 50 },
  { id: 2, nombre: "Profilaxis (limpieza dental)", cat: "Odontología general", monto: 120 },
  { id: 3, nombre: "Blanqueamiento dental", cat: "Estética", monto: 400 },
  { id: 4, nombre: "Resina / obturación", cat: "Odontología general", monto: 150 },
  { id: 5, nombre: "Endodoncia (unirradicular)", cat: "Endodoncia", monto: 350 },
  { id: 6, nombre: "Extracción simple", cat: "Cirugía", monto: 120 },
  { id: 7, nombre: "Corona de porcelana", cat: "Prótesis", monto: 800 },
  { id: 8, nombre: "Ortodoncia — cuota inicial", cat: "Ortodoncia", monto: 500 },
  { id: 9, nombre: "Ortodoncia — cuota mensual", cat: "Ortodoncia", monto: 180 },
];
// Catálogo de servicios vigente (lo edita el módulo Servicios; default SERVICIOS_INIT).
const getServicios = () => { try { const s = JSON.parse(localStorage.getItem("dc_data_v1_servicios") || "null"); return Array.isArray(s) && s.length ? s : SERVICIOS_INIT; } catch { return SERVICIOS_INIT; } };
function Servicios({ notify = () => {}, crearIntent = false, onIntentDone = () => {}, can }) {
  // Quien solo puede ver no crea servicios ni toca precios. El odontólogo entra aquí
  // para consultar el catálogo cuando presupuesta, no para gestionarlo.
  const puedeGestionar = can ? can("servicios", "crear") : true;
  // Con sesión el catálogo es UNO: especialidades del backend (alias /servicios),
  // con duración/categoría/coste/activo persistidos en servidor (SRV-01).
  const conectado = !!auth.token;
  const mapApi = (e) => ({
    id: e.id,
    nombre: e.nombre,
    cat: e.categoria || "General",
    monto: Number(e.precioBase) || 0,
    duracionMin: e.duracionMin != null ? Number(e.duracionMin) : 30,
    especialidad: e.areaClinica || e.especialidad || e.nombre || "General",
    categoria: e.categoria || "General",
    // null = sin coste cargado (no inventar margen = precio)
    coste: e.costeDirecto != null && Number(e.costeDirecto) > 0 ? Number(e.costeDirecto) : null,
    seguro: false,
    activo: e.activo !== false,
  });
  const [demoItems, setDemoItems] = usePersist("servicios", SERVICIOS_INIT);
  const [srv, setSrv] = useState([]);
  const cargar = () => {
    if (!conectado) return;
    api.catalogo.especialidades()
      .then((r) => setSrv((r || []).map(mapApi)))
      .catch(() => {});
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line
  const items = conectado ? srv : demoItems.map((row) => ({
    ...row,
    duracionMin: row.duracionMin ?? 30,
    especialidad: row.especialidad ?? row.cat ?? row.nombre,
    categoria: row.categoria ?? row.cat ?? "General",
    coste: row.coste ?? 0,
    activo: row.activo !== false,
  }));
  const setItems = setDemoItems;
  const [form, setForm] = useState(null);
  useEffect(() => { if (crearIntent) { setForm({ nombre: "", especialidad: "Odontología general", categoria: "Preventivo", monto: "", duracionMin: "30", coste: "", seguro: false, activo: true }); onIntentDone(); } }, [crearIntent]); // eslint-disable-line
  const [cat, setCat] = useState("all");
  const cats = [...new Set(items.map((s) => s.categoria || s.cat).filter(Boolean))];
  const filtrados = cat === "all" ? items : items.filter((s) => (s.categoria || s.cat) === cat);
  const { media: ticket, n: nConPrecio } = precioMedioCatalogo(items);
  const blank = () => ({ nombre: "", especialidad: "Odontología general", categoria: "Preventivo", monto: "", duracionMin: "30", coste: "", seguro: false, activo: true });
  const nuevo = () => setForm(blank());
  const editar = (s) => setForm({ ...s, monto: String(s.monto), duracionMin: String(s.duracionMin ?? 30), coste: s.coste != null && s.coste > 0 ? String(s.coste) : "", seguro: !!s.seguro, activo: s.activo !== false });
  const guardar = () => {
    if (!form.nombre.trim()) { notify("Ponle un nombre al servicio."); return; }
    if (!(Number(form.monto) > 0)) { notify("Indica el precio del servicio (mayor que cero)."); return; }
    const costeNum = form.coste === "" || form.coste == null ? null : Number(form.coste);
    const fields = {
      duracionMin: Number(form.duracionMin) || 30,
      especialidad: form.especialidad || form.nombre,
      categoria: form.categoria || "General",
      coste: costeNum != null && Number.isFinite(costeNum) ? costeNum : 0,
      seguro: !!form.seguro,
      activo: form.activo !== false,
    };
    if (conectado) {
      const payload = {
        nombre: form.nombre.trim(),
        precioBase: Number(form.monto) || 0,
        duracionMin: fields.duracionMin,
        categoria: fields.categoria,
        costeDirecto: costeNum != null && costeNum > 0 ? costeNum : null,
        activo: fields.activo,
        areaClinica: fields.especialidad,
      };
      (form.id ? api.catalogo.actualizarEspecialidad(form.id, payload) : api.catalogo.crearEspecialidad(payload))
        .then(() => {
          notify(form.id ? "Servicio actualizado. El nuevo precio ya se aplica a las próximas citas." : `Servicio «${form.nombre}» creado.`);
          setForm(null); cargar();
        })
        .catch(() => notify("No se pudo guardar el servicio."));
      return;
    }
    const clean = { nombre: form.nombre, cat: form.categoria, monto: Number(form.monto) || 0, ...fields };
    if (form.id) { setItems((it) => it.map((x) => x.id === form.id ? { ...x, ...clean } : x)); }
    else {
      const id = Math.max(0, ...items.map((x) => Number(x.id) || 0)) + 1;
      setItems((it) => [...it, { id, ...clean }]);
    }
    notify(form.id ? "Servicio actualizado." : `Servicio «${form.nombre}» creado.`); setForm(null);
  };
  const eliminar = () => {
    if (!confirm(`¿Eliminar «${form.nombre}» del catálogo? Los presupuestos y el asistente de WhatsApp dejarán de ofrecerlo.`)) return;
    setItems((it) => it.filter((x) => x.id !== form.id)); setForm(null);
  };
  const acBtn = { width: 30, height: 30, borderRadius: "var(--dc-r-sm)", border: "1px solid var(--dc-line)", background: "#fff", cursor: "pointer", color: NAVY, display: "grid", placeItems: "center", flexShrink: 0 };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="dc-esp-hero dc-serv-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{items.filter((s) => s.activo !== false).length}</b><span>servicios activos</span></div>
          <p>{puedeGestionar ? "Catálogo con duración, especialidad y precio" : "Catálogo de consulta"}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          {puedeGestionar && <div><b>S/ {ticket.toLocaleString("es-PE")}</b><span>Precio medio</span></div>}
          {puedeGestionar && <div><b>S/ {Math.max(0, ...serviciosConPrecioSafe(items).map((s) => s.monto)).toLocaleString("es-PE")}</b><span>Más caro</span></div>}
          <div><b>{cats.length}</b><span>Especialidades</span></div>
        </div>
        <span />
        {puedeGestionar && <button type="button" className="dc-esp-hero__btn" onClick={nuevo}><Plus size={14} strokeWidth={2} /> Nuevo servicio</button>}
      </section>
      {cats.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[["all", "Todas"], ...cats.map((c) => [c, c])].map(([k, l]) => { const on = cat === k; const col = k === "all" ? NAVY : (SERV_CAT_COL[k] || "var(--dc-ink-400)"); return (
          <button key={k} type="button" className={`dc-cat${on ? " is-on" : ""}`} style={{ "--c": col }} onClick={() => setCat(k)}>{k !== "all" && <i />}{l}<span>{k === "all" ? items.length : items.filter((x) => (x.especialidad || x.cat) === k).length}</span></button>
        ); })}
      </div>}
      <DataTable titulo="Catálogo de servicios" sub="servicios" minWidth={980} rows={filtrados} onRowClick={(s) => editar(s)} defaultSort={{ key: "servicio", dir: "asc" }} empty={<Vacio icon={<ClipboardList size={22} strokeWidth={1.75} />} titulo="Sin servicios" sub="Crea el primer servicio del catálogo." />} cols={[
        { key: "servicio", label: "Servicio", w: "minmax(200px,1.6fr)", a: "left", get: (s) => s.nombre, cell: (s) => { const col = SERV_CAT_COL[s.especialidad || s.cat] || "var(--dc-primary-alt)"; return <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}><span className="dc-serv-ico" style={{ "--c": col }}><ClipboardList size={15} strokeWidth={1.9} /></span><span style={{ fontWeight: 600, color: "var(--dc-ink-900)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nombre}</span></span>; } },
        { key: "esp", label: "Especialidad", w: "minmax(140px,1.1fr)", a: "left", get: (s) => s.especialidad || s.cat || "—", cell: (s) => { const k = s.especialidad || s.cat; return k ? <span className="dc-pill" style={{ "--c": SERV_CAT_COL[k] || "var(--dc-primary-alt)" }}><i /> {k}</span> : <span style={{ color: "var(--dc-ink-400)" }}>—</span>; } },
        { key: "dur", label: "Duración", w: "100px", a: "center", get: (s) => s.duracionMin || 30, cell: (s) => <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{s.duracionMin || 30} min</span> },
        { key: "monto", label: "Precio", w: "minmax(110px,0.8fr)", a: "right", get: (s) => s.monto, cell: (s) => <span className="dc-money" style={{ fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>S/ {Number(s.monto).toFixed(2)}</span> },
        { key: "margen", label: "Margen", w: "140px", a: "right", get: (s) => margenCatalogo(s) ?? -1, cell: (s) => { const m = margenCatalogo(s); if (m == null) return <span style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>sin coste cargado</span>; return <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: m >= 0 ? "var(--dc-ok-700)" : "var(--dc-danger-700)" }}>S/ {m.toFixed(0)}</span>; } },
        { key: "estado", label: "Estado", w: "110px", a: "center", get: (s) => s.activo === false ? "Inactivo" : "Activo", cell: (s) => s.activo === false
          ? <span className="dc-pill" style={{ "--c": "#8A9CA1" }}><i /> Inactivo</span>
          : <span className="dc-pill is-ok"><i /> Activo</span> },
        ...(puedeGestionar ? [{ key: "acc", label: "Acciones", w: "108px", a: "center", noFilter: true, noSort: true, cell: (s) => <div style={{ display: "flex", gap: 6, justifyContent: "center" }} onClick={(e) => e.stopPropagation()}><button type="button" className="dc-icon-btn" aria-label="Editar" onClick={() => editar(s)} title="Editar" style={acBtn}><Pencil size={15} strokeWidth={1.75} /></button></div> }] : []),
      ]} />
      {form && (
        <Modal icon={<ClipboardList size={20} strokeWidth={1.75} />} titulo={form.id ? "Editar servicio" : "Nuevo servicio"} sub={form.id ? "Actualiza el servicio" : "Agrega un servicio al catálogo"} onClose={() => setForm(null)} size="largo" maxW={720}
          footer={<>{form.id && !conectado && <span style={{ marginRight: "auto" }}><Btn small kind="ghost" onClick={eliminar}><Trash2 size={15} strokeWidth={1.75} /> Eliminar</Btn></span>}<Btn small kind="ghost" onClick={() => setForm(null)}>Cancelar</Btn><Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> {form.id ? "Guardar" : "Crear"}</Btn></>}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--dc-ink-500)", marginBottom: 10 }}>Identidad y precio</div>
          <Field label="Nombre del servicio" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Ej. Profilaxis (limpieza dental)" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <Field label="Especialidad" value={form.especialidad || ""} onChange={(v) => setForm({ ...form, especialidad: v })} placeholder="Odontología general" />
            {/* DC-34: catálogo operativo completo (API o ESPECIALIDADES ampliado), no solo 5 genéricos */}
            <div style={{ marginTop: -8 }}>
              <Select value={form.especialidad || ""} placeholder="Elegir del catálogo…"
                      onChange={(v) => setForm({ ...form, especialidad: v })}
                      options={(conectado ? items : ESPECIALIDADES).map((e) => ({
                        value: e.especialidad || e.nombre || e.areaClinica || "",
                        label: `${e.especialidad || e.nombre}${e.duracionMin ? ` – ${e.duracionMin} min` : ""}`,
                      })).filter((o) => o.value)} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Categoría</label>
              <Select value={form.categoria || "Preventivo"} onChange={(v) => setForm({ ...form, categoria: v })}
                      options={["Preventivo", "Restaurador", "Quirúrgico", "Estético", "Odontología general", ...(SERV_CATS || [])].filter((v, i, a) => a.indexOf(v) === i).map((c) => ({ value: c, label: c }))} />
            </div>
            <Field label="Monto (S/)" value={String(form.monto)} onChange={(v) => setForm({ ...form, monto: v.replace(/[^\d.]/g, "") })} placeholder="0.00" />
            <Field label="Coste directo (S/)" value={String(form.coste ?? "")} onChange={(v) => setForm({ ...form, coste: v.replace(/[^\d.]/g, "") })} placeholder="opcional" />
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--dc-ink-500)", margin: "20px 0 10px" }}>Operación y contabilidad</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Duración estimada (min)" value={String(form.duracionMin ?? "30")} onChange={(v) => setForm({ ...form, duracionMin: v.replace(/\D/g, "") })} placeholder="30" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.seguro} onChange={(e) => setForm({ ...form, seguro: e.target.checked })} /> Cubierto por seguro / EPS
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", cursor: "pointer" }}>
                <input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo en el catálogo
              </label>
            </div>
          </div>
          {conectado && form.id && <div style={{ fontSize: 13, color: "var(--dc-ink-400)", marginTop: 12, lineHeight: 1.55 }}>
            Un servicio ya creado todavía no se puede eliminar del servidor: desactívalo.
          </div>}
        </Modal>
      )}
    </div>
  );
}
function serviciosConPrecioSafe(items) {
  return (items || []).filter((s) => s.activo !== false && (Number(s.monto) || 0) > 0);
}

const COMPRAS_DEMO = [
  { id: 1, fecha: fmt(hoy), proveedor: "DentalStock Perú", items: "Guantes nitrilo x5 cajas – Anestesia x2", total: 340, estado: "recibida" },
  { id: 2, fecha: addDays(-2), proveedor: "3M ESPE", items: "Resina Filtek x3 – Adhesivo x2", total: 520, estado: "recibida" },
  { id: 3, fecha: addDays(-1), proveedor: "Distribuidora Odonto", items: "Fresas de diamante x1 kit", total: 180, estado: "en_camino" },
];
const PROVEEDORES_DEMO = [
  { id: 1, nombre: "DentalStock Perú", contacto: "Ventas – 987 654 321", categoria: "Consumibles", compras: 12, total: 4820 },
  { id: 2, nombre: "3M ESPE", contacto: "distribuidor@3m.pe", categoria: "Resinas / adhesivos", compras: 8, total: 6140 },
  { id: 3, nombre: "Distribuidora Odonto", contacto: "922 110 044", categoria: "Instrumental", compras: 5, total: 2380 },
  { id: 4, nombre: "Laboratorio Dental Lima", contacto: "labdentallima@mail.com", categoria: "Prótesis / laboratorio", compras: 9, total: 5300 },
];
const CONSUMO_DEMO = [
  { id: 1, fecha: fmt(hoy), insumoId: 1, insumo: "Guantes de nitrilo (caja)", cant: 1, unidad: "cajas", paciente: "Rosa Linares", medico: "Dra. Carla Mendoza" },
  { id: 2, fecha: fmt(hoy), insumoId: 2, insumo: "Anestesia lidocaína 2%", cant: 2, unidad: "cartuchos", paciente: "Pedro Gómez", medico: "Dra. Carla Mendoza" },
  { id: 3, fecha: addDays(-1), insumoId: 4, insumo: "Resina compuesta A2", cant: 1, unidad: "jeringas", paciente: "Elena Ríos", medico: "Dr. Luis Paredes" },
  { id: 4, fecha: addDays(-1), insumoId: 5, insumo: "Algodón en rollos", cant: 1, unidad: "paq", paciente: "Diego Castro", medico: "Dra. Ana Quispe" },
];

function Inventario({ notify, items: itemsProp = INVENTARIO_INIT, setItems, can, tabInicial = "productos", onTab }) {
  // Quien solo puede ver entra a saber si queda material, no a comprarlo. Sin permiso
  // de gestión: nada de valor del almacén, compras, proveedores ni altas de insumo.
  const puedeGestionar = can ? can("inventario", "crear") : true;
  const conectado = !!auth.token;
  // Cada pestaña es un submódulo del menú lateral (Inventario → Productos, Compras…).
  const [tab, setTabLocal] = useState(tabInicial);   // productos | compras | consumo | proveedores
  const setTab = (t) => (onTab ? onTab(t) : setTabLocal(t));
  const mapInv = (i) => ({ id: i.id, nombre: i.nombre, cat: i.categoria || "", unidad: i.unidad || "unid", stock: Number(i.stock) || 0, min: Number(i.stockMinimo) || 0, precio: Number(i.costoUnitario) || 0, dia: 1, lote: i.lote || "", fechaVencimiento: i.fechaVencimiento || "" });
  const [remoto, setRemoto] = useState(null);
  const recargar = () => { if (conectado) api.inventario.listar().then((r) => setRemoto((r || []).map(mapInv))).catch(() => notify("No se pudo cargar el inventario del servidor.")); };
  useEffect(() => { recargar(); }, []); // eslint-disable-line
  const items = conectado ? (remoto || []) : itemsProp;
  const [form, setForm] = useState(null); // {id?, nombre, cat, stock, min, unidad, lote?, fechaVencimiento?}

  // ── Ordenes de compra ──
  // Antes "Nueva compra" y "Generar orden de compra" solo mostraban un aviso y la
  // lista era COMPRAS_DEMO: la clinica sabia que le faltaban guantes pero no tenia
  // forma de saber si ya los habia pedido.
  const [ordenes, setOrdenes] = useState(null);
  const [nuevaOC, setNuevaOC] = useState(null);   // { proveedor, nota, lineas: [{inventarioId, nombre, cantidad, costoUnitario}] }
  const [ocBusy, setOcBusy] = useState(false);
  const recargarOC = () => { if (conectado) api.ordenesCompra.listar().then(setOrdenes).catch(() => {}); };
  // Proveedores REALES: se agregan de las ordenes que se les han hecho, en vez de
  // los cuatro de ejemplo que se mostraban incluso con la clinica ya operando.
  // Las anuladas no cuentan: no se le compro nada.
  const proveedoresReales = useMemo(() => {
    const m = new Map();
    for (const x of (ordenes || [])) {
      const o = x.orden;
      if (o.estado === "anulada") continue;
      const k = (o.proveedor || "").trim(); if (!k) continue;
      const a = m.get(k) || { id: k, nombre: k, contacto: "—", categoria: "—", compras: 0, total: 0, ultima: null };
      a.compras++; a.total += Number(o.total) || 0;
      const f = (o.creadoEn || "").slice(0, 10);
      if (f && (!a.ultima || f > a.ultima)) a.ultima = f;
      m.set(k, a);
    }
    return [...m.values()].map((x) => ({ ...x, categoria: x.ultima ? `última compra ${fechaLegible(x.ultima)}` : "—" }));
  }, [ordenes]);
  useEffect(() => { if (tab === "compras" || tab === "proveedores") recargarOC(); }, [tab, conectado]); // eslint-disable-line

  const accionOC = (id, accion, ok) => {
    setOcBusy(true);
    api.ordenesCompra[accion](id)
      .then(() => { notify(ok); recargarOC(); if (accion === "recibir") recargar(); })   // recibir suma al stock
      .catch((e) => notify(e?.message || "No se pudo completar la operación."))
      .finally(() => setOcBusy(false));
  };

  const guardarOC = () => {
    const v = nuevaOC;
    if (!v.proveedor.trim()) { notify("Indica el proveedor."); return; }
    const lineas = v.lineas.filter((l) => Number(l.cantidad) > 0);
    if (!lineas.length) { notify("Añade al menos un insumo con cantidad."); return; }
    setOcBusy(true);
    api.ordenesCompra.crear({ proveedor: v.proveedor.trim(), nota: v.nota || null,
      lineas: lineas.map((l) => ({ inventarioId: l.inventarioId, nombre: l.nombre, cantidad: Number(l.cantidad), costoUnitario: Number(l.costoUnitario) || 0 })) })
      .then(() => { notify("Orden de compra creada."); setNuevaOC(null); recargarOC(); })
      .catch((e) => notify(e?.message || "No se pudo crear la orden."))
      .finally(() => setOcBusy(false));
  };

  /** Abre la orden ya rellenada con lo que hace falta reponer. */
  const ocDesdeUrgentes = (lista) => setNuevaOC({
    proveedor: "", nota: "Reposición automática por stock bajo / cobertura < 2 semanas",
    lineas: lista.map((i) => ({ inventarioId: i.id, nombre: i.nombre, cantidad: Math.max(1, pedir(i)), costoUnitario: i.precio || 0 })),
  });
  const estado = (i) => estadoStock(i);
  const cobertura = (i) => coberturaDias(i);
  const pedir = (i) => sugeridoPedir(i);
  const covColor = (d) => (d <= 7 ? "var(--dc-red)" : d <= 14 ? "var(--dc-warn-600)" : "var(--dc-ok-700)");
  const ajustar = (id, d) => { if (conectado) { const it = items.find((x) => x.id === id); if (!it) return; api.inventario.actualizar(id, { stock: Math.max(0, it.stock + d) }).then(recargar).catch(() => notify("Error al ajustar stock.")); return; } setItems((it) => it.map((x) => x.id === id ? { ...x, stock: Math.max(0, x.stock + d) } : x)); };
  const requieren = requierenCompra(items);
  const agotadosN = items.filter((i) => estado(i) === "agotado").length;
  const bajosN = items.filter((i) => estado(i) === "bajo").length;
  const valorTotal = items.reduce((s, i) => s + i.stock * (i.precio || 0), 0);
  const covMinHoy = items.length ? Math.min(...items.map((i) => { const d = cobertura(i); return d >= 999 ? Infinity : d; }).filter((d) => d !== Infinity), Infinity) : Infinity;
  const covMinInsumo = (() => { let best = null; for (const i of items) { const d = cobertura(i); if (d >= 999) continue; if (!best || d < best.d) best = { d, nombre: i.nombre }; } return best; })();
  const diasVenc = (f) => {
    if (!f) return null;
    const t = new Date(f + "T00:00:00").getTime();
    if (isNaN(t)) return null;
    const h = new Date().setHours(0, 0, 0, 0);
    return Math.round((t - h) / (1000 * 60 * 60 * 24));
  };
  const vencenPronto = items.filter((i) => {
    const d = diasVenc(i.fechaVencimiento);
    return d !== null && d <= 60;
  });
  const nuevo = () => setForm({ nombre: "", cat: "Consumibles", stock: 0, min: 5, unidad: "unid", dia: 1, precio: 0, lote: "", fechaVencimiento: "" });
  const editar = (it) => setForm({ ...it, lote: it.lote || "", fechaVencimiento: it.fechaVencimiento || "" });
  const guardar = async () => {
    if (!form.nombre.trim()) { notify("Indica el nombre del insumo."); return; }
    if (conectado) {
      const payload = {
        nombre: form.nombre,
        categoria: form.cat,
        unidad: form.unidad,
        stock: Number(form.stock) || 0,
        stockMinimo: Number(form.min) || 0,
        costoUnitario: Number(form.precio) || 0,
        lote: form.lote ? form.lote.trim() : null,
        fechaVencimiento: form.fechaVencimiento ? form.fechaVencimiento.trim() : null,
      };
      try {
        if (form.id) await api.inventario.actualizar(form.id, payload);
        else await api.inventario.crear(payload);
        notify(form.id ? "Insumo actualizado." : `${form.nombre} agregado.`);
        setForm(null);
        recargar();
      } catch (e) {
        notify("Error al guardar: " + (e.message || ""));
      }
      return;
    }
    const clean = {
      ...form,
      stock: Number(form.stock) || 0,
      min: Number(form.min) || 0,
      dia: Number(form.dia) || 0,
      precio: Number(form.precio) || 0,
      lote: form.lote ? form.lote.trim() : "",
      fechaVencimiento: form.fechaVencimiento ? form.fechaVencimiento.trim() : "",
    };
    if (form.id) setItems((it) => it.map((x) => x.id === form.id ? clean : x));
    else setItems((it) => [...it, { ...clean, id: Math.max(0, ...it.map((x) => x.id)) + 1 }]);
    notify(form.id ? "Insumo actualizado." : `${form.nombre} agregado al inventario.`);
    setForm(null);
  };
  const eliminar = () => {
    if (!confirm(`¿Eliminar «${form.nombre || "este insumo"}» del inventario? Se pierde su stock y su historial de consumo.`)) return;
    if (conectado) { api.inventario.borrar(form.id).then(recargar).catch(() => notify("No se pudo eliminar el insumo.")); setForm(null); return; }
    setItems((it) => it.filter((x) => x.id !== form.id)); setForm(null);
  };
  const acBtn = { width: 30, height: 30, borderRadius: "var(--dc-r-sm)", border: "1px solid var(--dc-line)", background: "#fff", cursor: "pointer", color: NAVY, display: "grid", placeItems: "center", flexShrink: 0 };
  const badge = (e) => e === "ok"
    ? <span className="dc-pill is-ok"><i /> En stock</span>
    : e === "bajo" ? <span className="dc-pill is-aviso"><i /> Bajo mínimo</span>
    : <span className="dc-pill" style={{ "--c": "#C0392B" }}><i /> Agotado</span>;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {tab === "compras" && puedeGestionar && (() => {
        // Conectado: ordenes REALES. En demostracion se conserva el ejemplo de siempre.
        const filas = conectado
          ? (ordenes || []).map((x) => ({
              id: x.orden.id, fecha: (x.orden.creadoEn || "").slice(0, 10), proveedor: x.orden.proveedor,
              items: x.lineas.map((l) => `${l.nombre} x${Number(l.cantidad)}`).join(" – ") || "sin líneas",
              total: Number(x.orden.total) || 0, estado: x.orden.estado,
            }))
          : COMPRAS_DEMO;
        const EST_OC = {
          borrador: { l: "Borrador", c: "var(--dc-ink-400)", bg: "var(--dc-bg-alt)" },
          enviada:  { l: "Enviada",  c: "var(--dc-warn-600)", bg: "var(--dc-warn-soft)" },
          en_camino:{ l: "En camino", c: "var(--dc-warn-600)", bg: "var(--dc-warn-soft)" },
          recibida: { l: "Recibida", c: "var(--dc-ok-700)", bg: "var(--dc-ok-soft)" },
          anulada:  { l: "Anulada",  c: "var(--dc-danger-700)", bg: "var(--dc-fee)" },
        };
        const totalOC = filas.reduce((a, c) => a + (Number(c.total) || 0), 0);
        const pendOC = filas.filter((c) => c.estado === "borrador" || c.estado === "enviada" || c.estado === "en_camino").length;
        const recOC = filas.filter((c) => c.estado === "recibida").length;
        const OC_COL = { borrador: "#8A9CA1", enviada: "#D97706", en_camino: "#2563EB", recibida: "#16A36A", anulada: "#D0563F" };
        return (
        <>
        <section className="dc-esp-hero dc-inv-hero">
          <div className="dc-esp-hero__txt">
            <div className="dc-esp-hero__num"><b>{filas.length}</b><span>{filas.length === 1 ? "orden de compra" : "órdenes de compra"}</span></div>
            <p>El stock sube al marcar la orden como recibida</p>
          </div>
          <div className="dc-esp-hero__cifras">
            <div><b>S/ {totalOC.toLocaleString("es-PE")}</b><span>Total comprado</span></div>
            <div><b>{pendOC}</b><span>Por recibir</span></div>
            <div><b>{recOC}</b><span>Recibidas</span></div>
          </div>
          <span />
          <div className="dc-hero-acc"><button type="button" className="dc-esp-hero__btn" onClick={() => conectado ? setNuevaOC({ proveedor: "", nota: "", lineas: [] }) : notify("Disponible al iniciar sesión.")}><Plus size={14} strokeWidth={2} /> Nueva compra</button></div>
        </section>
        <Card className="dc-env">
          <div className="dc-env__cab"><h3>Órdenes de compra</h3></div>
          {filas.length === 0 && <Vacio icon={<Send size={22} strokeWidth={1.75} />} titulo="Sin órdenes" sub="Todavía no has registrado ninguna orden de compra." />}
          <div className="dc-oc-lista">
          {filas.map((c) => { const e = EST_OC[c.estado] || EST_OC.borrador; const col = OC_COL[c.estado] || "#8A9CA1"; return (
            <div key={c.id} className="dc-oc" style={{ "--c": col }}>
              <span className="dc-serv-ico" style={{ "--c": col, width: 40, height: 40, borderRadius: 12 }}><Package size={18} strokeWidth={1.8} /></span>
              <div className="dc-oc__txt"><b>{c.proveedor}</b><span>{c.items}</span></div>
              <span className="dc-oc__fecha">{c.fecha ? fechaLegible(c.fecha) : ""}</span>
              <span className="dc-pill" style={{ "--c": col }}><i /> {e.l}</span>
              <span className="dc-oc__total">S/ {Number(c.total).toFixed(2)}</span>
              {conectado && (
                <span style={{ display: "inline-flex", gap: 6 }}>
                  {c.estado === "borrador" && <ActionBtn color={DS.c.primary} onClick={() => accionOC(c.id, "enviar", "Orden marcada como enviada al proveedor.")}>Enviar</ActionBtn>}
                  {(c.estado === "borrador" || c.estado === "enviada") && <ActionBtn color="var(--dc-ok-700)" onClick={() => accionOC(c.id, "recibir", "Orden recibida: el material entró al stock.")}>Recibir</ActionBtn>}
                  {c.estado !== "recibida" && c.estado !== "anulada" && <ActionBtn subtle color="var(--dc-danger-700)" onClick={() => accionOC(c.id, "anular", "Orden anulada.")}>Anular</ActionBtn>}
                </span>
              )}
            </div>
          ); })}
          </div>
        </Card>
        </>
        ); })()}
      {tab === "consumo" && (
        <>
        {(() => { const movs = conectado ? [] : CONSUMO_DEMO; const porInsumo = {}; movs.forEach((m) => { porInsumo[m.insumo] = (porInsumo[m.insumo] || 0) + m.cant; }); const top = Object.entries(porInsumo).sort((x, y) => y[1] - x[1])[0]; const hoyN = movs.filter((m) => m.fecha === fmt(hoy)).length; return (
          <section className="dc-esp-hero dc-inv-hero">
            <div className="dc-esp-hero__txt">
              <div className="dc-esp-hero__num"><b>{movs.length}</b><span>{movs.length === 1 ? "movimiento de consumo" : "movimientos de consumo"}</span></div>
              <p>Insumos usados en cada atención</p>
            </div>
            <div className="dc-esp-hero__cifras">
              <div><b>{hoyN}</b><span>Hoy</span></div>
              <div><b>{new Set(movs.map((m) => m.paciente)).size}</b><span>Pacientes</span></div>
              <div title={top ? top[0] : undefined}><b>{top ? top[1] : 0}</b><span>{top ? `Más usado: ${top[0]}` : "Más usado"}</span></div>
            </div>
          </section>
        ); })()}
        <DataTable titulo="Consumo de insumos" sub="movimientos" minWidth={820} rows={conectado ? [] : CONSUMO_DEMO} empty={<Vacio icon={<Activity size={22} strokeWidth={1.75} />} titulo={conectado ? "Registro de consumo no disponible" : "Sin consumo"} sub={conectado ? "El sistema ajusta el stock pero todavía no guarda un movimiento por cada uso, así que no hay nada que listar aquí. Se verá cuando se registren los movimientos de inventario." : "El uso de insumos por atención aparecerá aquí."} />} cols={[
          { key: "fecha", label: "Fecha", w: "minmax(120px,0.8fr)", a: "left", get: (c) => c.fecha, cell: (c) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)", fontVariantNumeric: "tabular-nums" }}>{fechaLegible(c.fecha)}</span> },
          { key: "insumo", label: "Insumo", w: "minmax(160px,1.3fr)", a: "left", get: (c) => c.insumo, cell: (c) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 500, color: NAVY, fontSize: 13 }}><span style={{ width: 30, height: 30, borderRadius: "var(--dc-r-sm)", background: (tint(DS.c.primary, 0.078)), color: DS.c.primary, display: "grid", placeItems: "center", flexShrink: 0 }}><Package size={15} strokeWidth={1.75} /></span>{c.insumo}</span> },
          { key: "cant", label: "Cantidad", w: "110px", a: "right", get: (c) => c.cant, cell: (c) => <span className="dc-pill" style={{ "--c": "#D0563F" }}>−{c.cant} {c.unidad}</span> },
          { key: "paciente", label: "Paciente", w: "minmax(140px,1fr)", a: "left", get: (c) => c.paciente, cell: (c) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}><span className="dc-rec__av" style={{ width: 28, height: 28, fontSize: 10.5, background: `linear-gradient(135deg, ${tint(colorDe(c.paciente), 0.2)}, ${tint(colorDe(c.paciente), 0.08)})`, color: colorDe(c.paciente) }}>{iniciales(c.paciente)}</span><span style={{ fontSize: 13, color: "var(--dc-ink-800, #243E45)", fontWeight: 500 }}>{c.paciente}</span></span> },
          { key: "medico", label: "Odontólogo", w: "minmax(140px,1fr)", a: "left", get: (c) => c.medico, cell: (c) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{c.medico}</span> },
        ]} />
        </>
      )}
      {tab === "proveedores" && puedeGestionar && (
        <>
        {(() => { const provs = conectado ? proveedoresReales : PROVEEDORES_DEMO; const tot = provs.reduce((x, p) => x + (Number(p.total) || 0), 0); const comp = provs.reduce((x, p) => x + (Number(p.compras) || 0), 0); const top = [...provs].sort((x, y) => (y.total || 0) - (x.total || 0))[0]; return (
          <section className="dc-esp-hero dc-inv-hero">
            <div className="dc-esp-hero__txt">
              <div className="dc-esp-hero__num"><b>{provs.length}</b><span>proveedores</span></div>
              <p>La lista se arma sola con tus órdenes de compra</p>
            </div>
            <div className="dc-esp-hero__cifras">
              <div><b>S/ {tot.toLocaleString("es-PE")}</b><span>Total comprado</span></div>
              <div><b>{comp}</b><span>Compras</span></div>
              <div title={top ? top.nombre : undefined}><b>{top ? `S/ ${Number(top.total).toLocaleString("es-PE")}` : "—"}</b><span>{top ? `Principal: ${top.nombre}` : "Principal"}</span></div>
            </div>
          </section>
        ); })()}
        <DataTable titulo="Proveedores" sub="proveedores" minWidth={780} rows={conectado ? proveedoresReales : PROVEEDORES_DEMO} defaultSort={{ key: "total", dir: "desc" }} empty={<Vacio icon={<Building2 size={22} strokeWidth={1.75} />} titulo="Sin proveedores" sub="La lista se arma sola con las órdenes de compra: registra una y el proveedor aparece aquí." />} cols={[
          { key: "nombre", label: "Proveedor", w: "minmax(180px,1.4fr)", a: "left", get: (p) => p.nombre, cell: (p) => <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}><div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg, ${tint(colorDe(p.nombre), 0.22)}, ${tint(colorDe(p.nombre), 0.08)})`, color: colorDe(p.nombre), fontWeight: 800, display: "grid", placeItems: "center", flexShrink: 0 }}><Building2 size={16} strokeWidth={1.75} /></div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{p.contacto}</div></div></div> },
          { key: "categoria", label: "Categoría", w: "minmax(150px,1fr)", a: "left", get: (p) => p.categoria, cell: (p) => p.categoria ? <span className="dc-pill" style={{ "--c": colorDe(p.categoria) }}><i /> {p.categoria}</span> : <span style={{ color: "var(--dc-ink-400)" }}>—</span> },
          { key: "compras", label: "Compras", w: "110px", a: "center", get: (p) => p.compras, cell: (p) => <span className="dc-pill">{p.compras} {p.compras === 1 ? "compra" : "compras"}</span> },
          { key: "total", label: "Total comprado", w: "150px", a: "right", get: (p) => p.total, cell: (p) => <span style={{ fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>S/ {p.total.toLocaleString()}</span> },
        ]} />
        </>
      )}
      {(tab === "productos" || (!puedeGestionar && (tab === "compras" || tab === "proveedores"))) && (<>
      {(() => { const totalPedir = requieren.reduce((s, i) => s + pedir(i), 0); return (
        <section className="dc-esp-hero dc-inv-hero">
          <div className="dc-esp-hero__txt">
            <div className="dc-esp-hero__num"><b>{requieren.length}</b><span>{requieren.length === 1 ? "insumo requiere compra" : "insumos requieren compra"}</span></div>
            <p>{agotadosN} agotado{agotadosN === 1 ? "" : "s"} y {bajosN} bajo mínimo{requieren.length ? `, reposición sugerida de ${totalPedir} unidades` : ""}</p>
          </div>
          <div className="dc-esp-hero__cifras">
            {puedeGestionar && <div><b>S/ {valorTotal.toLocaleString("es-PE")}</b><span>Valor en stock</span></div>}
            <div title={covMinHoy === Infinity ? undefined : (covMinInsumo ? `~${covMinHoy} d – ${covMinInsumo.nombre}` : `~${covMinHoy} d`)}><b>{covMinHoy === Infinity ? "—" : `~${covMinHoy} d`}</b><span>Cobertura mínima</span></div>
            <div><b>{vencenPronto.length}</b><span>Vencen pronto</span></div>
          </div>
          <span />
          <div className="dc-hero-acc">
            {puedeGestionar && requieren.length > 0 && <button type="button" className="dc-esp-hero__btn" onClick={() => conectado ? (ocDesdeUrgentes(requieren), setTab("compras")) : notify(`Orden de compra: ${totalPedir} unidades de ${requieren.length} insumos. (Demo)`)}><Send size={14} strokeWidth={1.9} /> Generar orden de compra</button>}
            {puedeGestionar && <button type="button" className="dc-esp-hero__agregar" onClick={nuevo}><Plus size={15} strokeWidth={2} /> Nuevo insumo</button>}
          </div>
        </section>
      ); })()}
      <DataTable titulo="Insumos" sub="insumos" minWidth={1040} rows={items} defaultSort={{ key: "cobertura", dir: "asc" }} onRowClick={(it) => editar(it)} empty={<Vacio icon={<Package size={22} strokeWidth={1.75} />} titulo="Inventario vacío" sub="Agrega tu primer insumo para controlar stock y cobertura." />} cols={[
        { key: "insumo", label: "Insumo", w: "minmax(200px,1.7fr)", a: "left", get: (it) => it.nombre, cell: (it) => { const e = estado(it); const col = e === "ok" ? DS.c.primary : e === "bajo" ? "var(--dc-warn-600)" : "var(--dc-danger-700)"; return <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}><div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-sm)", background: tint(col, 0.082), color: col, display: "grid", placeItems: "center", flexShrink: 0 }}><Package size={16} strokeWidth={1.75} /></div><div style={{ minWidth: 0 }}><div title={it.nombre} style={{ fontWeight: 500, color: NAVY, fontSize: 14, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{it.cat}</div></div></div>; } },
        { key: "loteVence", label: "Lote", w: "minmax(96px,0.7fr)", a: "left", get: (it) => it.lote || it.fechaVencimiento || "", cell: (it) => {
          const dv = diasVenc(it.fechaVencimiento);
          const estVenc = dv === null ? null : dv < 0 ? "vencido" : dv <= 60 ? "alerta" : "ok";
          return (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{it.lote ? `Lote: ${it.lote}` : <span style={{ color: "var(--dc-ink-400)", fontWeight: 400 }}>Sin lote</span>}</div>
              <div style={{ fontSize: 12, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                {it.fechaVencimiento ? (
                  <>
                    <span style={{ color: "var(--dc-ink-500)", fontVariantNumeric: "tabular-nums" }}>{it.fechaVencimiento}</span>
                    {estVenc === "vencido" ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dc-danger-700)", background: "var(--dc-fee)", padding: "1px 6px", borderRadius: "var(--dc-r-sm)" }}>Vencido</span>
                    ) : estVenc === "alerta" ? (
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", padding: "1px 6px", borderRadius: "var(--dc-r-sm)" }}>{dv === 0 ? "Hoy" : `${dv} d`}</span>
                    ) : null}
                  </>
                ) : (
                  <span style={{ color: "var(--dc-ink-400)" }}>Sin fecha</span>
                )}
              </div>
            </div>
          );
        } },
        { key: "stock", label: "Stock", w: "minmax(140px,1fr)", a: "left", get: (it) => it.stock, cell: (it) => { const e = estado(it); const col = e === "ok" ? "var(--dc-ok-700)" : e === "bajo" ? "var(--dc-warn-600)" : "var(--dc-danger-700)"; const pct = pctCoberturaBarra(it); const lp = layoutProgreso(pct); return <div style={{ minWidth: 0, paddingRight: 8 }}><div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 5 }}><span style={{ fontWeight: 600, fontFamily: DISPLAY_FONT, fontSize: 14, color: col }}>{it.stock}</span><span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)" }}>{it.unidad}</span><span style={{ fontSize: 12, color: "var(--dc-ink-400)", marginLeft: "auto" }}>mín {it.min}</span></div>{!lp.dibujar && !lp.soloTexto ? <div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>—</div> : lp.soloTexto ? <div style={{ fontSize: 12, fontWeight: 500, color: col }}>{Math.round(lp.pct)}%</div> : <div style={{ height: 6, background: "var(--dc-line)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}><div style={{ width: lp.pct + "%", height: "100%", background: col, borderRadius: "var(--dc-r-full)", transition: "width .7s cubic-bezier(.2,.7,.2,1)" }} /></div>}</div>; } },
        { key: "cobertura", label: "Cobertura", w: "minmax(100px,0.8fr)", a: "center", get: (it) => cobertura(it), cell: (it) => { const d = cobertura(it); if (d >= 999) return <span style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>—</span>; const c = covColor(d); return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: c, background: tint(c, 0.078), padding: "4px 11px", borderRadius: "var(--dc-r-full)" }}><Clock size={12} strokeWidth={1.75} /> {d === 0 ? "hoy" : `~${d} d`}</span>; } },
        { key: "pedir", label: "Pedir", w: "minmax(130px,0.9fr)", a: "right", get: (it) => pedir(it), cell: (it) => { const q = pedir(it); return q === 0 ? <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)", background: "var(--dc-ok-soft)", padding: "4px 10px", borderRadius: "var(--dc-r-full)", display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={12} strokeWidth={1.75} /> Suficiente</span> : <span title="Hasta 2× el mínimo cuando cobertura &lt; 14 d o stock bajo" style={{ fontSize: 13, fontWeight: 500, color: DS.c.primary, background: (tint(DS.c.primary, 0.078)), padding: "4px 11px", borderRadius: "var(--dc-r-full)" }}>+{q} {it.unidad}</span>; } },
        { key: "estado", label: "Estado", w: "minmax(120px,0.8fr)", a: "center", get: (it) => ({ ok: "En stock", bajo: "Bajo", agotado: "Agotado" }[estado(it)]), cell: (it) => badge(estado(it)) },
        // Ajustar o editar el stock es gestion: quien solo consulta no lo ve.
        ...(puedeGestionar ? [{ key: "acc", label: "Acciones", w: "136px", a: "center", noFilter: true, noSort: true, cell: (it) => <div style={{ display: "flex", gap: 6, justifyContent: "center" }} onClick={(e) => e.stopPropagation()}><button type="button" className="dc-icon-btn" aria-label="Restar" onClick={() => ajustar(it.id, -1)} title="Restar" style={acBtn}><Minus size={15} strokeWidth={1.75} /></button><button type="button" className="dc-icon-btn" aria-label="Sumar" onClick={() => ajustar(it.id, 1)} title="Sumar" style={acBtn}><Plus size={15} strokeWidth={1.75} /></button><button type="button" className="dc-icon-btn" aria-label="Editar" onClick={() => editar(it)} title="Editar" style={acBtn}><Pencil size={15} strokeWidth={1.75} /></button></div> }] : []),
      ]} />
      </>)}
      {form && <Modal icon={<Package size={20} strokeWidth={1.75} />} titulo={form.id ? "Editar insumo" : "Nuevo insumo"} sub={form.id ? "Actualiza los datos del insumo" : "Agrega un insumo al inventario"} onClose={() => setForm(null)} size="corto" maxW={560}
        footer={<>{form.id && <span style={{ marginRight: "auto" }}><Btn small kind="ghost" onClick={eliminar}><Trash2 size={15} strokeWidth={1.75} /> Eliminar</Btn></span>}<Btn small kind="ghost" onClick={() => setForm(null)}>Cancelar</Btn><Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> {form.id ? "Guardar" : "Crear"}</Btn></>}>
        {(() => { const st = Number(form.stock) || 0, mn = Number(form.min) || 0; const e = st === 0 ? "agotado" : st <= mn ? "bajo" : "ok"; return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "12px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--dc-ink-700)", fontWeight: 500 }}>Con {st} {form.unidad || "unid"} (mín. {mn}) el estado será</span>
            {badge(e)}
          </div>
        ); })()}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}><Field label="Insumo" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Guantes de nitrilo (caja)" /></div>
          <Field label="Categoría" value={form.cat} onChange={(v) => setForm({ ...form, cat: v })} placeholder="Consumibles" />
          <Field label="Unidad de medida" value={form.unidad} onChange={(v) => setForm({ ...form, unidad: v })} placeholder="cajas, unid, cartuchos…" />
          <Field label="Lote" value={form.lote || ""} onChange={(v) => setForm({ ...form, lote: v })} placeholder="Ej. L-2026-09" hint="Trazabilidad sanitaria (INV-01)" />
          <Field label="Fecha de vencimiento" type="date" value={form.fechaVencimiento || ""} onChange={(v) => setForm({ ...form, fechaVencimiento: v })} hint="Caducidad del lote" />
          <Field label="Stock actual" value={String(form.stock)} onChange={(v) => setForm({ ...form, stock: v })} placeholder="0" hint={`En ${form.unidad || "unidades"}`} />
          <Field label="Stock mínimo" value={String(form.min)} onChange={(v) => setForm({ ...form, min: v })} placeholder="5" hint="Avisa por debajo de este nivel" />
          <Field label="Consumo diario" value={String(form.dia ?? "")} onChange={(v) => setForm({ ...form, dia: v })} placeholder="1.5" hint="Para calcular la cobertura" />
          <Field label="Precio unitario (S/)" value={String(form.precio ?? "")} onChange={(v) => setForm({ ...form, precio: v })} placeholder="0" hint="Para el valor del inventario" />
        </div>
        {(() => { const st = Number(form.stock) || 0, di = Number(form.dia) || 0, pr = Number(form.precio) || 0; const cob = di > 0 ? Math.round(st / di) : null; return (
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "10px 13px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500 }}>Cobertura estimada</div><div style={{ fontSize: 16, fontWeight: 600, color: cob === null ? "var(--dc-ink-500)" : covColor(cob), fontFamily: DISPLAY_FONT, marginTop: 2 }}>{cob === null ? "—" : `~${cob} días`}</div></div>
            <div style={{ flex: 1, minWidth: 140, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "10px 13px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500 }}>Valor en stock</div><div style={{ fontSize: 16, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, marginTop: 2 }}>S/ {(st * pr).toLocaleString()}</div></div>
          </div>
        ); })()}
      </Modal>}
      {nuevaOC && (() => {
        const set = (k, v) => setNuevaOC((o) => ({ ...o, [k]: v }));
        const setL = (i, k, v) => setNuevaOC((o) => ({ ...o, lineas: o.lineas.map((l, j) => j === i ? { ...l, [k]: v } : l) }));
        const quitar = (i) => setNuevaOC((o) => ({ ...o, lineas: o.lineas.filter((_, j) => j !== i) }));
        const anadir = (id) => { const it = items.find((x) => String(x.id) === String(id)); if (!it) return;
          setNuevaOC((o) => o.lineas.some((l) => String(l.inventarioId) === String(it.id)) ? o
            : ({ ...o, lineas: [...o.lineas, { inventarioId: it.id, nombre: it.nombre, cantidad: pedir(it) || 1, costoUnitario: it.precio || 0 }] })); };
        const total = nuevaOC.lineas.reduce((sm, l) => sm + (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0), 0);
        const inp = { width: "100%", padding: "9px 11px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
        return (
        <Modal icon={<Package size={20} strokeWidth={1.75} />} titulo="Nueva orden de compra" sub="Se suma al stock cuando la marques como recibida" maxW={620}
          onClose={() => setNuevaOC(null)}
          footer={<><Btn small kind="ghost" onClick={() => setNuevaOC(null)}>Cancelar</Btn>
                   <Btn small onClick={guardarOC} disabled={ocBusy}><Check size={15} strokeWidth={1.75} /> {ocBusy ? "Guardando…" : "Crear orden"}</Btn></>}>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Proveedor *
              <input className="dc-premium-inp" value={nuevaOC.proveedor} onChange={(e) => set("proveedor", e.target.value)} placeholder="Ej. DentalStock Perú" style={{ ...inp, marginTop: 5 }} /></label>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Nota (opcional)
              <input className="dc-premium-inp" value={nuevaOC.nota || ""} onChange={(e) => set("nota", e.target.value)} placeholder="Ej. urgente, entregar en Surco" style={{ ...inp, marginTop: 5 }} /></label>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", marginBottom: 6 }}>Insumos</div>
              <Select value="" onChange={anadir} placeholder="+ Añadir insumo del inventario"
                options={[{ value: "", label: "+ Añadir insumo del inventario" },
                          ...items.map((it) => ({ value: String(it.id), label: it.nombre, sub: `stock ${it.stock} ${it.unidad}` }))]} />
            </div>
            {nuevaOC.lineas.length === 0
              ? <div style={{ fontSize: 13, color: "var(--dc-ink-400)", fontStyle: "italic", padding: "6px 0" }}>Aún no has añadido ningún insumo.</div>
              : <div style={{ display: "grid", gap: 8 }}>
                  {nuevaOC.lineas.map((l, i) => (
                    <div key={l.inventarioId ?? i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: NAVY, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nombre}</span>
                      <input className="dc-premium-inp" type="number" min="1" value={l.cantidad} onChange={(e) => setL(i, "cantidad", e.target.value)} title="Cantidad" style={{ ...inp, width: 74, textAlign: "right" }} />
                      <span style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>× S/</span>
                      <input className="dc-premium-inp" type="number" min="0" step="0.10" value={l.costoUnitario} onChange={(e) => setL(i, "costoUnitario", e.target.value)} title="Costo unitario" style={{ ...inp, width: 88, textAlign: "right" }} />
                      <button type="button" className="dc-icon-btn" aria-label="Quitar" onClick={() => quitar(i)} title="Quitar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dc-ink-400)", display: "grid", placeItems: "center" }}><X size={16} strokeWidth={1.9} /></button>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--dc-line)", paddingTop: 9, fontSize: 14 }}>
                    <span style={{ color: "var(--dc-ink-400)" }}>Total</span>
                    <b style={{ color: NAVY, fontFamily: DISPLAY_FONT }}>S/ {total.toFixed(2)}</b>
                  </div>
                </div>}
          </div>
        </Modal>); })()}
    </div>
  );
}

/* ---- Casos a laboratorio (paridad con Doctocliq) ---- */
const LAB_FLUJO = ["enviado", "en_proceso", "recibido", "entregado"];
const LAB_INFO = { enviado: { l: "Enviado", bg: "var(--dc-info-soft)", fg: "var(--dc-info-ink)" }, en_proceso: { l: "En proceso", bg: "var(--dc-warn-soft)", fg: "var(--dc-warn-600)" }, recibido: { l: "Recibido", bg: "#EFEAFC", fg: "#5B3FC4" }, entregado: { l: "Entregado", bg: "var(--dc-ok-soft)", fg: "var(--dc-ok-700)" } };
function Laboratorio({ pacientes, notify, updFicha, can }) {
  // Mandar un trabajo al laboratorio es dar de alta un caso. Quien solo consulta el
  // estado de las entregas -gerencia, o el odontologo segun la matriz- no lo hace.
  const puedeGestionar = can ? can("laboratorio", "crear") : true;
  const pidDe = (nombre) => (pacientes.find((p) => p.nombre === nombre) || PACIENTES_INIT.find((p) => p.nombre === nombre))?.id;
  const DEMO_CASOS = [
    { id: 1, paciente: "Rosa Linares", trabajo: "Corona de porcelana – pieza 36", lab: "Laboratorio Dental Lima", enviado: addDays(-6), entrega: addDays(2), estado: "en_proceso" },
    { id: 2, paciente: "Pedro Gómez", trabajo: "Corona pieza 47", lab: "ProDent Lab", enviado: addDays(-9), entrega: addDays(-1), estado: "recibido" },
    { id: 3, paciente: "María Chávez", trabajo: "Férula de descarga", lab: "Laboratorio Dental Lima", enviado: addDays(-2), entrega: addDays(5), estado: "enviado" },
  ];
  const conectado = !!auth.token;
  const [casos, setCasos] = useState(() => conectado ? [] : DEMO_CASOS);
  const [filtroLab, setFiltroLab] = useState("todos");
  const bE = { enviado: "solicitado", en_proceso: "en_proceso", recibido: "listo", entregado: "entregado" };
  const fE = { solicitado: "enviado", en_proceso: "en_proceso", listo: "recibido", entregado: "entregado" };
  const mapCaso = (o) => ({ id: o.id, paciente: o.paciente || "—", trabajo: o.tipoTrabajo, lab: o.laboratorio, enviado: o.fechaEnvio, entrega: o.fechaEstimada, estado: fE[o.estado] || "enviado" });
  const recargar = () => { if (conectado) api.laboratorio.listar().then((r) => setCasos((r || []).map(mapCaso))).catch(() => notify("No se pudo cargar laboratorio.")); };
  useEffect(() => { recargar(); }, []); // eslint-disable-line
  const [nuevo, setNuevo] = useState(null);
  const inp = { width: "100%", padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box" };
  const avanzar = (id) => {
    if (conectado) { const c = casos.find((x) => x.id === id); if (!c) return; const i = LAB_FLUJO.indexOf(c.estado); const n = LAB_FLUJO[Math.min(LAB_FLUJO.length - 1, i + 1)]; api.laboratorio.actualizar(id, { estado: bE[n] }).then(() => { notify(`${c.paciente}: ${LAB_INFO[n].l}.`); recargar(); }).catch(() => notify("Error al avanzar el caso.")); return; }
    setCasos((cs) => cs.map((c) => { if (c.id !== id) return c; const i = LAB_FLUJO.indexOf(c.estado); const n = LAB_FLUJO[Math.min(LAB_FLUJO.length - 1, i + 1)]; notify(`${c.paciente}: ${LAB_INFO[n].l}.`); const pid = pidDe(c.paciente); if (pid && updFicha) updFicha(pid, (cur) => ({ ...cur, lab: (cur.lab || []).map((l) => l.id === id ? { ...l, estado: n } : l) })); return { ...c, estado: n }; }));
  };
  const [detalle, setDetalle] = useState(null);
  const crear = () => { if (!nuevo.trabajo.trim()) { notify("Describe el trabajo."); return; } if (conectado) { notify("Crear envíos desde aquí estará disponible pronto en modo conectado."); setNuevo(null); return; } const id = Date.now(); const caso = { id, paciente: nuevo.paciente, trabajo: nuevo.trabajo, lab: nuevo.lab, enviado: fmt(hoy), entrega: nuevo.entrega, estado: "enviado" }; setCasos((cs) => [caso, ...cs]); const pid = pidDe(nuevo.paciente); if (pid && updFicha) updFicha(pid, (cur) => ({ ...cur, lab: [{ id, trabajo: caso.trabajo, lab: caso.lab, entrega: caso.entrega, estado: "enviado" }, ...(cur.lab || [])] })); notify("Caso enviado a laboratorio y anotado en la ficha del paciente."); setNuevo(null); };
  const faltanDias = (c) => Math.round((new Date(c.entrega) - new Date(fmt(hoy))) / 86400000);
  // DC-42: KPI y tabla desde el mismo conjunto filtrado.
  const casosVista = filtroLab === "todos" ? casos
    : filtroLab === "atrasados" ? casos.filter((c) => c.estado !== "entregado" && faltanDias(c) < 0)
    : casos.filter((c) => c.estado === filtroLab);
  const atrasados = casosVista.filter((c) => c.estado !== "entregado" && faltanDias(c) < 0);
  const kpis = [["En proceso", casosVista.filter((c) => c.estado === "en_proceso" || c.estado === "enviado").length, "var(--dc-warn-600)", <FlaskConical size={18} strokeWidth={1.75} />], ["Por entregar", casosVista.filter((c) => c.estado === "recibido").length, "var(--dc-info-ink)", <Clock size={18} strokeWidth={1.75} />], ["Atrasados", atrasados.length, "var(--dc-red)", <AlertTriangle size={18} strokeWidth={1.75} />], ["Entregados", casosVista.filter((c) => c.estado === "entregado").length, "var(--dc-ok-700)", <CheckCircle2 size={18} strokeWidth={1.75} />]];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 16 }}>
      {(() => { const activos = casos.filter((c) => c.estado !== "entregado").length; const atr = casos.filter((c) => c.estado !== "entregado" && faltanDias(c) < 0); return (
        <section className="dc-esp-hero dc-lab-hero">
          <div className="dc-esp-hero__txt">
            <div className="dc-esp-hero__num"><b>{activos}</b><span>{activos === 1 ? "caso en curso" : "casos en curso"}</span></div>
            <p>Coronas, prótesis y férulas con su fecha de entrega</p>
          </div>
          <ol className="dc-lab-flujo" aria-label="Flujo del laboratorio">
            {LAB_FLUJO.map((st, i) => { const I = LAB_INFO[st]; const n = casos.filter((c) => c.estado === st).length; return (
              <li key={st} className={`is-${st}`}><b>{n}</b><span>{I.l}</span>{i < LAB_FLUJO.length - 1 && <ChevronRight size={14} strokeWidth={2} className="dc-lab-flujo__fl" />}</li>
            ); })}
          </ol>
          {atr.length > 0 ? (
            <div className="dc-esp-hero__prox dc-lab-hero__atr">
              <span className="dc-pac-hero__ico" style={{ background: "rgba(245,154,141,.28)", color: "#FFD1C9" }}><AlertTriangle size={15} strokeWidth={1.9} /></span>
              <div className="dc-esp-hero__prox-txt"><span>{atr.length === 1 ? "1 trabajo atrasado" : `${atr.length} trabajos atrasados`}</span><b>{atr.map((c) => c.paciente).join(", ")}</b></div>
              <button type="button" className="dc-esp-hero__btn" onClick={() => notify(`Se contactó al laboratorio por ${atr.length} trabajo(s) atrasado(s).`)}><Phone size={13} strokeWidth={1.9} /> Contactar</button>
            </div>
          ) : <span />}
          {puedeGestionar && <button type="button" className="dc-esp-hero__agregar" onClick={() => setNuevo({ paciente: pacientes[0]?.nombre || "", trabajo: "", lab: "Laboratorio Dental Lima", entrega: addDays(7) })}><Plus size={15} strokeWidth={2} /> Nuevo envío</button>}
        </section>
      ); })()}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["todos", "Todos", "#0E9199"], ["enviado", "Enviado", "#2563EB"], ["en_proceso", "En proceso", "#D97706"], ["recibido", "Recibido", "#6D4FD1"], ["entregado", "Entregado", "#16A36A"], ["atrasados", "Atrasados", "#D0563F"]].map(([k, l, c]) => {
          const n = k === "todos" ? casos.length : k === "atrasados" ? casos.filter((x) => x.estado !== "entregado" && faltanDias(x) < 0).length : casos.filter((x) => x.estado === k).length;
          return <button key={k} type="button" className={`dc-cat${filtroLab === k ? " is-on" : ""}`} style={{ "--c": c }} onClick={() => setFiltroLab(k)}>{k !== "todos" && <i />}{l}<span>{n}</span></button>;
        })}
      </div>
      {nuevo && (
        <Modal icon={<FlaskConical size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Enviar caso a laboratorio" sub="Registra un trabajo (corona, prótesis, férula)" onClose={() => setNuevo(null)} maxW={560} footer={<><Btn small kind="ghost" onClick={() => setNuevo(null)}>Cancelar</Btn><Btn small onClick={crear}><Send size={15} strokeWidth={1.75} /> Enviar</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Paciente<br /><Select value={nuevo.paciente} onChange={(v) => setNuevo({ ...nuevo, paciente: v })} options={pacientes.map((p) => ({ value: p.nombre, label: p.nombre }))} /></label>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Laboratorio<br /><input className="dc-premium-inp" value={nuevo.lab} onChange={(e) => setNuevo({ ...nuevo, lab: e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", gridColumn: "1 / -1" }}>Trabajo<br /><input className="dc-premium-inp" value={nuevo.trabajo} onChange={(e) => setNuevo({ ...nuevo, trabajo: e.target.value })} placeholder="Corona de porcelana – pieza 36" style={{ ...inp, marginTop: 4 }} /></label>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Fecha de entrega<br /><input className="dc-premium-inp" type="date" value={nuevo.entrega} onChange={(e) => setNuevo({ ...nuevo, entrega: e.target.value })} style={{ ...inp, marginTop: 4 }} /></label>
          </div>
        </Modal>
      )}
      <DataTable titulo="Casos en laboratorio" sub="casos" minWidth={780} rows={casosVista} onRowClick={(c) => setDetalle(c)} empty={<Vacio icon={<FlaskConical size={22} strokeWidth={1.75} />} titulo="Sin casos" sub="Registra un envío de corona, prótesis o férula al laboratorio." />} defaultSort={{ key: "entrega", dir: "asc" }} cols={[
        { key: "paciente", label: "Paciente", w: "minmax(150px,1.2fr)", a: "left", get: (c) => c.paciente, cell: (c) => <span style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>{c.paciente}</span> },
        { key: "trabajo", label: "Trabajo", w: "minmax(200px,1.7fr)", a: "left", get: (c) => c.trabajo, cell: (c) => <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--dc-ink-700)", fontSize: 13 }}><FlaskConical size={15} strokeWidth={1.75} color={DS.c.primary} style={{ flexShrink: 0 }} /> {c.trabajo}</span> },
        { key: "lab", label: "Laboratorio", w: "minmax(140px,1.1fr)", a: "left", get: (c) => c.lab, cell: (c) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{c.lab}</span> },
        { key: "entrega", label: "Entrega", w: "minmax(160px,1.1fr)", a: "center", get: (c) => c.entrega, cell: (c) => { const d = faltanDias(c); const done = c.estado === "entregado"; const lbl = done ? "Entregado" : d < 0 ? `Atrasado ${Math.abs(d)} d` : d === 0 ? "Hoy" : d === 1 ? "Mañana" : `Faltan ${d} d`; const col = done ? "var(--dc-ok-700)" : d < 0 ? "var(--dc-red)" : d <= 2 ? "var(--dc-warn-600)" : DS.c.primary; return <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}><span style={{ fontSize: 13, fontWeight: 500, color: col, background: tint(col, 0.078), padding: "3px 11px", borderRadius: "var(--dc-r-full)" }}>{lbl}</span><span style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>{fechaLegible(c.entrega)}</span></div>; } },
        { key: "estado", label: "Estado", w: "130px", a: "center", get: (c) => (LAB_INFO[c.estado] || { l: c.estado || "—" }).l, cell: (c) => { const I = LAB_INFO[c.estado] || { l: c.estado || "—", bg: "var(--dc-line)", fg: "var(--dc-ink-400)" }; return <span style={{ fontSize: 12, fontWeight: 500, color: I.fg, background: I.bg, padding: "3px 10px", borderRadius: "var(--dc-r-full)" }}>{I.l}</span>; } },
        { key: "acc", label: "Acción", w: "130px", a: "center", noFilter: true, noSort: true, cell: (c) => c.estado !== "entregado" ? <Btn small kind="ghost" onClick={() => avanzar(c.id)}>Avanzar <ChevronRight size={14} strokeWidth={1.75} /></Btn> : <span style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>Entregado</span> },
      ]} />
      {detalle && (() => { const I = LAB_INFO[detalle.estado] || { l: detalle.estado || "—", bg: "var(--dc-line)", fg: "var(--dc-ink-400)" }; const atrasado = detalle.estado !== "entregado" && detalle.entrega < fmt(hoy); return (
        <Modal icon={<FlaskConical size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo={detalle.trabajo} sub={detalle.paciente} onClose={() => setDetalle(null)} maxW={520} footer={detalle.estado !== "entregado" ? <Btn small onClick={() => { avanzar(detalle.id); setDetalle(null); }}>Avanzar estado <ChevronRight size={14} strokeWidth={1.75} /></Btn> : <Btn small kind="ghost" onClick={() => setDetalle(null)}>Cerrar</Btn>}>
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 18 }}>
            {LAB_FLUJO.map((st, i) => { const idx = LAB_FLUJO.indexOf(detalle.estado); const done = i <= idx; return (
              <React.Fragment key={st}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: "0 0 auto", width: 62 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "var(--dc-r-full)", background: done ? DS.c.primary : "var(--dc-line)", color: done ? "#fff" : "var(--dc-ink-500)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 500 }}>{done ? <Check size={14} strokeWidth={1.75} /> : i + 1}</div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: done ? DS.c.primary : "var(--dc-ink-500)", textAlign: "center", lineHeight: 1.2 }}>{LAB_INFO[st].l}</span>
                </div>
                {i < LAB_FLUJO.length - 1 && <div style={{ flex: 1, height: 3, background: i < idx ? DS.c.primary : "var(--dc-line)", borderRadius: "var(--dc-r-sm)", marginTop: 11 }} />}
              </React.Fragment>
            ); })}
          </div>
          <div style={{ display: "grid", gap: 2 }}>
            {[["Paciente", detalle.paciente, <UserCheck size={15} strokeWidth={1.75} />], ["Laboratorio", detalle.lab, <FlaskConical size={15} strokeWidth={1.75} />], ["Enviado", fechaLegible(detalle.enviado), <Send size={15} strokeWidth={1.75} />], ["Entrega", fechaLegible(detalle.entrega) + (atrasado ? " – atrasado" : ""), <Calendar size={15} strokeWidth={1.75} />]].map(([k, v, ic]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: "1px solid var(--dc-line)" }}><span style={{ color: "var(--dc-ink-500)", display: "grid", placeItems: "center" }}>{ic}</span><span style={{ flex: 1, fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>{k}</span><span style={{ fontSize: 13, color: k === "Entrega" && atrasado ? "var(--dc-red)" : NAVY, fontWeight: 500 }}>{v}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}><span style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>Estado actual</span><span style={{ fontSize: 12, fontWeight: 500, color: I.fg, background: I.bg, padding: "4px 12px", borderRadius: "var(--dc-r-full)" }}>{I.l}</span></div>
          </div>
        </Modal>
      ); })()}
    </div>
  );
}

/* ---- Mi plan y facturación (membresía del SaaS) ---- */
function Plan({ notify, plan = "mediana", setPlan, esSuper, can }) {
  const actual = PLANES.find((p) => p.id === plan) || PLANES[1];
  const totalMods = (id) => new Set(PLAN_MODULOS[id]).size;
  const [confirmP, setConfirmP] = useState(null);
  const cambiarPlan = (p) => {
    if (setPlan) setPlan(p.id);
    notify(p.precio > actual.precio
      ? `Mejoraste al plan ${p.nombre}: se desbloquearon nuevos módulos en el menú.`
      : `Cambiaste al plan ${p.nombre}. Algunos módulos quedaron bloqueados.`);
  };
  // Bolsas de consumo e historial de cobros: ejemplo comercial. Con sesión no se
  // muestran -serían un consumo y unos pagos inventados sobre la cuenta de la clínica-
  // hasta que el servidor los mida de verdad.
  const uso = auth.token ? [] : [
    { l: "Conversaciones de IA", u: 320, lim: 500, c: DS.c.primary },
    { l: "Mensajes de WhatsApp", u: 640, lim: 1000, c: "var(--dc-ok-700)" },
    { l: "Comprobantes SUNAT", u: 210, lim: 500, c: DS.c.primary },
  ];
  const facturas = auth.token ? [] : [
    { fecha: addDays(-4), estado: "pagado" }, { fecha: "2026-05-22", estado: "pagado" }, { fecha: "2026-04-22", estado: "pagado" },
  ];
  // Consumo estructural de la cuenta: se factura por SEDE y por ODONTÓLOGO; el staff y los pacientes son ilimitados.
  // Con sesión se cuenta lo REAL de la clínica. Antes se contaban SEDES, STAFF_INIT y
  // PACIENTES_INIT -las constantes de la demostración-, así que el consumo facturable
  // que veía una clínica conectada, y las sedes u odontólogos "extra" que se le cobran,
  // salían de un ejemplo.
  const conectado = !!auth.token;
  const [consumoReal, setConsumoReal] = useState(null);
  useEffect(() => {
    if (!conectado) return;
    // NEW-48: no pedir /pacientes si el rol no lo tiene (TI → 403 + banner rojo).
    const pidePac = !can || can("pacientes", "ver");
    Promise.all([
      api.sedes.listar().catch(() => null),
      api.usuarios.listar().catch(() => null),
      pidePac ? api.pacientes.listar().catch(() => null) : Promise.resolve(null),
    ]).then(([sd, us, pa]) => setConsumoReal({
      sedes: Array.isArray(sd) ? sd.length : null,
      staff: Array.isArray(us) ? us.length : null,
      medicos: Array.isArray(us) ? us.filter((u) => u.rol === "medico").length : null,
      pacientes: Array.isArray(pa) ? pa.length : (pidePac ? null : undefined),
    }));
  }, []); // eslint-disable-line
  // null = el conteo aún no llegó. undefined = rol sin permiso (mostrar — sin error).
  const sedesUsadas = conectado ? (consumoReal?.sedes ?? null) : SEDES.length;
  const odontologos = conectado ? (consumoReal?.medicos ?? null) : STAFF_INIT.filter((u) => u.rol === "medico").length;
  const usuariosStaff = conectado ? (consumoReal?.staff ?? null) : STAFF_INIT.length;
  const totalPacientes = conectado
    ? (consumoReal?.pacientes === undefined ? null : (consumoReal?.pacientes ?? null))
    : PACIENTES_INIT.length;
  const SIN_CONTEO = "Aún no llega el conteo de tu clínica";
  const SIN_PERM = "Tu rol no consulta el padrón de pacientes";
  const sedesExtra = Math.max(0, (sedesUsadas ?? 0) - actual.sedesIncl);
  const odExtra = actual.odontologos === "ilim" ? 0 : Math.max(0, (odontologos ?? 0) - actual.odontologos);
  const cuenta = [
    { l: "Sedes", ic: <Building2 size={18} strokeWidth={1.75} />, c: NAVY, v: sedesUsadas == null ? "—" : `${sedesUsadas} / ${actual.sedesIncl} incl.`, sub: sedesUsadas == null ? SIN_CONTEO : sedesExtra > 0 ? (actual.sedeExtra ? `+${sedesExtra} adicional – S/${actual.sedeExtra}/mes` : `+${sedesExtra} — requiere plan Clínica o superior`) : actual.sedeExtra ? `Sede extra S/${actual.sedeExtra}/mes` : "Plan de 1 sede" },
    { l: "Odontólogos", ic: <Stethoscope size={18} strokeWidth={1.75} />, c: DS.c.primary, v: odontologos == null ? "—" : actual.odontologos === "ilim" ? `${odontologos} – Ilimitados` : `${odontologos} / ${actual.odontologos}`, sub: odontologos == null ? SIN_CONTEO : odExtra > 0 ? `+${odExtra} – S/${actual.odontologoExtra} c/u` : actual.odontologoExtra ? `Adicional S/${actual.odontologoExtra}/mes` : "Sin costo extra" },
    { l: "Usuarios de apoyo", ic: <Users size={18} strokeWidth={1.75} />, c: DS.c.primary, v: usuariosStaff == null ? "—" : `${usuariosStaff} – Ilimitados`, sub: usuariosStaff == null ? SIN_CONTEO : "Recepción, admin, TI…" },
    { l: "Pacientes", ic: <Smile size={18} strokeWidth={1.75} />, c: "var(--dc-ok)", v: totalPacientes == null ? "—" : `${totalPacientes} – Ilimitados`, sub: totalPacientes == null ? (consumoReal?.pacientes === undefined ? SIN_PERM : SIN_CONTEO) : "Con auto-registro por link" },
  ];
  const TONO_PLAN = ["#0E9199", "#6D4FD1", "#D97706", "#E0694F"];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{actual.nombre}</b><span>tu plan</span></div>
          <p>S/ {actual.precio}/mes – {totalMods(actual.id)} módulos activos – renueva el {fechaLegible(addDays(26))}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{sedesUsadas == null ? "—" : `${sedesUsadas}/${actual.sedesIncl}`}</b><span>Sedes incluidas</span></div>
          <div><b>{odontologos == null ? "—" : actual.odontologos === "ilim" ? odontologos : `${odontologos}/${actual.odontologos}`}</b><span>Odontólogos</span></div>
          <div><b>{totalPacientes == null ? "—" : totalPacientes}</b><span>Pacientes, ilimitados</span></div>
        </div>
        <span />
        <div className="dc-hero-acc"><span className="dc-plan__activo"><CheckCircle2 size={14} strokeWidth={2.2} /> Activo</span></div>
      </section>

      {/* Banner de prueba: los "11 de 14 días" son de ejemplo, con sesión no se enseña. */}
      {!conectado && (
        <div className="dc-plan__trial">
          <span className="dc-plan__trial-ico"><Sparkles size={17} strokeWidth={2} /></span>
          <div><b>Prueba PRO, 14 días gratis</b><span>Te quedan <strong>11 de 14 días</strong> y hasta <strong>{PACIENTES_TRIAL} pacientes</strong>. Sin tarjeta hasta que decidas.</span></div>
          <div className="dc-plan__trial-barra"><i style={{ width: "78%" }} /><small>11 días restantes</small></div>
          <button type="button" onClick={() => notify("Activa tu plan cuando quieras para no perder acceso.")}>Activar plan</button>
        </div>
      )}

      <section className="dc-plan__fila">
        {uso.map((x, k) => { const pct = Math.round((x.u / x.lim) * 100); const col = pct >= 80 ? "#D97706" : ["#0E9199", "#16A36A", "#6D4FD1"][k % 3]; return (
          <div key={x.l} className="dc-plan__med" style={{ "--c": col }}>
            <div><b>{x.l}</b><span>{x.u.toLocaleString("es-PE")}<small>/{x.lim.toLocaleString("es-PE")}</small></span></div>
            <span className="dc-plan__barra"><i style={{ width: `${pct}%` }} /></span>
          </div>
        ); })}
        <div className="dc-plan__nota">
          <Info size={14} strokeWidth={2} />
          <span>Se factura por sede y por odontólogo. {sedesExtra > 0 && actual.sedeExtra ? `Tienes ${sedesExtra} sede adicional (S/ ${actual.sedeExtra}/mes). ` : ""}{odExtra > 0 ? `${odExtra} odontólogo adicional (S/ ${actual.odontologoExtra} c/u). ` : ""}Equipo de apoyo y pacientes ilimitados.</span>
        </div>
      </section>

      <section>
        <div className="dc-plan__tit"><h3>Planes</h3><span>Cada plan incluye todo lo del anterior</span></div>
        <div className="dc-plan__planes">
          {PLANES.map((p, k) => { const esActual = p.id === actual.id; const sube = p.precio > actual.precio; return (
            <article key={p.id} className={`dc-plan__card${esActual ? " is-actual" : ""}`} style={{ "--c": TONO_PLAN[k % TONO_PLAN.length] }}>
              <div className="dc-plan__c1">
                <div><b>{p.nombre}</b><small>{p.tagline} – {totalMods(p.id)} módulos</small></div>
                <div className="dc-plan__precio"><b>S/ {p.precio}</b><span>/mes</span></div>
              </div>
              <ul>{p.incluye.slice(0, 3).map((f, i) => <li key={i}><Check size={13} strokeWidth={2.6} /> {f}</li>)}</ul>
              {esActual
                ? <span className="dc-plan__cta is-actual"><CheckCircle2 size={14} strokeWidth={2.2} /> Tu plan actual</span>
                : <button type="button" className={`dc-plan__cta${sube ? " is-sube" : ""}`} onClick={() => setConfirmP(p)}>{sube ? "Mejorar a " : "Cambiar a "}{p.nombre}</button>}
            </article>
          ); })}
        </div>
      </section>

      {facturas.length > 0 ? (
        <details className="dc-plan__hist">
          <summary>
            <span className="dc-plan__fico"><Receipt size={15} strokeWidth={2} /></span>
            <div><b>Última mensualidad pagada</b><span>{fechaLegible(facturas[0].fecha)} – S/ {actual.precio}</span></div>
            <em>Ver historial ({facturas.length}) <ChevronDown size={14} strokeWidth={2.2} /></em>
          </summary>
          <div className="dc-plan__facts">
            {facturas.map((f, i) => (
              <div key={i}>
                <div><b>Plan {actual.nombre}</b><span>{fechaLegible(f.fecha)}</span></div>
                <em>S/ {actual.precio}</em>
                <button type="button" onClick={() => notify("Descargando comprobante...")}><Download size={13} strokeWidth={2.2} /> Comprobante</button>
              </div>
            ))}
          </div>
        </details>
      ) : <p className="dc-seg__nada">{conectado ? "El historial de cobros de tu membresía todavía no está conectado." : "Aún no hay cobros de tu membresía."}</p>}
      {confirmP && (() => { const sube = confirmP.precio > actual.precio; const gana = PLAN_MODULOS[confirmP.id].filter((m) => !PLAN_MODULOS[actual.id].includes(m)); const pierde = PLAN_MODULOS[actual.id].filter((m) => !PLAN_MODULOS[confirmP.id].includes(m)); return (
        <Modal icon={<CreditCard size={20} strokeWidth={1.75} />} tone={sube ? "var(--dc-ok)" : NAVY} titulo={`Cambiar a plan ${confirmP.nombre}`} sub={`S/ ${confirmP.precio}/mes – ${confirmP.tagline}`} onClose={() => setConfirmP(null)}
          footer={<><Btn small kind="ghost" onClick={() => setConfirmP(null)}>Cancelar</Btn><Btn small kind={sube ? "navy" : "red"} onClick={() => { cambiarPlan(confirmP); setConfirmP(null); }}><Check size={15} strokeWidth={1.75} /> Confirmar cambio</Btn></>}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "12px 15px", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{PLAN_NOMBRE[actual.id]} <span style={{ color: "var(--dc-ink-400)" }}>→</span> <strong style={{ color: NAVY }}>{confirmP.nombre}</strong></span>
            <span style={{ fontSize: 14, fontWeight: 600, color: sube ? "var(--dc-ok-700)" : NAVY, fontFamily: DISPLAY_FONT }}>S/ {confirmP.precio}/mes</span>
          </div>
          {gana.length > 0 && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ok-700)", marginBottom: 6 }}>Se desbloquean {gana.length} módulo(s)</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{gana.map((m) => <span key={m} style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)", background: "var(--dc-ok-soft)", border: "1px solid var(--dc-green-soft)", borderRadius: "var(--dc-r-full)", padding: "3px 9px" }}>{MODULOS.find((x) => x.id === m)?.label || m}</span>)}</div></div>}
          {pierde.length > 0 && <div><div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-warn-600)", marginBottom: 6 }}>Se bloquean {pierde.length} módulo(s)</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{pierde.map((m) => <span key={m} style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-warn-600)", background: "var(--dc-warn-soft)", border: "1px solid var(--dc-amber-soft)", borderRadius: "var(--dc-r-full)", padding: "3px 9px" }}>{MODULOS.find((x) => x.id === m)?.label || m}</span>)}</div></div>}
          {gana.length === 0 && pierde.length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Mismos módulos, distinto costo mensual.</div>}
        </Modal>
      ); })()}
    </div>
  );
}

/* ---- Periodontograma (sondaje) — clínico premium ---- */
function Periodontograma({ pacientes: pacProp, notify }) {
  const DIENTES = [18, 17, 16, 15, 14, 13, 12, 11];
  const conectado = !!auth.token;
  const [pacRemoto, setPacRemoto] = useState(null);
  useEffect(() => { if (conectado) api.pacientes.listar().then((r) => setPacRemoto((r || []).map((p) => ({ id: p.id, nombre: p.nombre })))).catch(() => {}); }, []); // eslint-disable-line
  const pacientes = conectado ? (pacRemoto || []) : pacProp;
  const [pid, setPid] = useState(auth.token ? null : (pacProp[0]?.id || null));
  useEffect(() => {
    if (!conectado || !pacRemoto) return;
    if (!pacRemoto.length) { setPid(null); return; }
    if (pid && !pacRemoto.some((p) => p.id === pid)) setPid(null);
  }, [pacRemoto]); // eslint-disable-line
  // Sondaje de ejemplo para la demostración. Con sesión NO se usa: alimentaba el
  // diagnóstico que la propia pantalla emite —"Periodontitis", "7 bolsas ≥4 mm"— así que
  // un paciente al que nadie ha sondado aparecía con periodontitis diagnosticada.
  const seed = () => Object.fromEntries(DIENTES.map((n) => [n, { d: [2 + (n % 3), 2 + (n % 2), 3 + (n % 2)], bleed: n === 16 || n === 14 }]));
  const enBlanco = () => Object.fromEntries(DIENTES.map((n) => [n, { d: [0, 0, 0], bleed: false }]));
  const [datos, setDatos] = useState(() => (auth.token ? enBlanco() : seed()));
  // Filas crudas del backend: se guardan para no perder, al escribir, lo que este
  // modulo no captura (cara palatina, recesion, movilidad y furca).
  const [filasPerio, setFilasPerio] = useState([]);
  const jsonSeguro = (v, porDefecto) => { try { const x = JSON.parse(v); return Array.isArray(x) ? x : porDefecto; } catch { return porDefecto; } };
  useEffect(() => {
    if (conectado && pid) {
      api.perio.porPaciente(pid).then((rows) => {
        const filas = rows || [];
        setFilasPerio(filas);
        // Una fila por pieza, con 6 sitios. Aqui solo se pintan los 3 vestibulares.
        const m = {};
        for (const r of filas) {
          if (!DIENTES.includes(Number(r.numeroPieza))) continue;
          const prof = jsonSeguro(r.profundidad, []);
          const sang = jsonSeguro(r.sangrado, []);
          m[Number(r.numeroPieza)] = {
            d: [Number(prof[0]) || 0, Number(prof[1]) || 0, Number(prof[2]) || 0],
            bleed: !!(sang[0] || sang[1] || sang[2]),
          };
        }
        // Sin sondaje guardado se queda en blanco, no se inventa uno.
        setDatos(DIENTES.every((n) => m[n]) ? m : enBlanco());
      // Si la peticion falla tampoco se inventa un sondaje: seria diagnosticar
      // periodontitis a un paciente al que nadie ha sondado.
      }).catch(() => { setFilasPerio([]); setDatos(enBlanco()); });
    } else { setFilasPerio([]); setDatos(seed()); }
  }, [pid, conectado]); // eslint-disable-line
  const paciente = pacientes.find((p) => p.id === pid) || { id: pid, nombre: "Paciente" };
  const color = (v) => v >= 6 ? "var(--dc-red)" : v >= 4 ? "var(--dc-warn-600)" : "var(--dc-ok-700)";
  const setD = (n, i, v) => setDatos((s) => ({ ...s, [n]: { ...s[n], d: s[n].d.map((x, j) => j === i ? Math.max(0, Math.min(12, Number(v) || 0)) : x) } }));
  const toggleB = (n) => setDatos((s) => ({ ...s, [n]: { ...s[n], bleed: !s[n].bleed } }));
  const todos = Object.values(datos).flatMap((x) => x.d);
  const prom = (todos.reduce((a, b) => a + b, 0) / todos.length).toFixed(1);
  const bolsas = todos.filter((v) => v >= 4).length;
  const sangrado = Object.values(datos).filter((x) => x.bleed).length;
  const isb = Math.round((sangrado / DIENTES.length) * 100);
  // Sin ningun valor registrado no se dice "Sano": a un paciente al que nadie ha
  // sondado no se le puede dar un alta periodontal. Se dice que falta el sondaje.
  // Bug #34 re-test: No auto-etiquetar "Periodontitis", solo mostrar métricas numéricas
  const haySondaje = todos.some((v) => v > 0) || sangrado > 0;
  // Calculamos los indicadores pero NO emitimos diagnóstico automático
  const estadoSondaje = !haySondaje ? "sin_sondaje" : (bolsas >= 6 || Number(prom) >= 5) ? "grave" : (isb > 20 || bolsas > 0) ? "moderado" : "sano";
  const estadoColor = estadoSondaje === "grave" ? "var(--dc-red)" : estadoSondaje === "moderado" ? "var(--dc-warn-600)" : estadoSondaje === "sin_sondaje" ? "var(--dc-ink-500)" : "var(--dc-ok-700)";
  const [informe, setInforme] = useState(false);
  const recomend = estadoSondaje === "grave" ? ["Raspado y alisado radicular por cuadrantes", "Reevaluación a las 4–6 semanas", "Refuerzo de higiene y control de placa"] : estadoSondaje === "moderado" ? ["Profilaxis y destartraje", "Instrucción de higiene bucal", "Control en 3 meses"] : ["Mantenimiento cada 6 meses", "Seguir con buena higiene"];
  // Se guarda PIEZA POR PIEZA (asi esta la tabla desde la migracion 0031), fusionando
  // con lo que ya hubiera: este modulo solo mide la cara vestibular, y la palatina,
  // la recesion, la movilidad y la furca vienen de la Ficha medica.
  const guardarPerio = () => {
    if (!conectado) { notify("Sondaje periodontal guardado."); return; }
    const previa = Object.fromEntries(filasPerio.map((r) => [Number(r.numeroPieza), r]));
    Promise.all(DIENTES.map((n) => {
      const ant = previa[n] || {};
      const prof = jsonSeguro(ant.profundidad, []);
      const sang = jsonSeguro(ant.sangrado, []);
      const d = datos[n]?.d || [0, 0, 0];
      const sangra = !!datos[n]?.bleed;
      return api.perio.guardar({
        pacienteId: pid,
        numeroPieza: n,
        profundidad: JSON.stringify([d[0], d[1], d[2], prof[3] ?? 0, prof[4] ?? 0, prof[5] ?? 0]),
        recesion: ant.recesion ?? JSON.stringify([0, 0, 0, 0, 0, 0]),
        sangrado: JSON.stringify([sangra, sangra, sangra, sang[3] ?? false, sang[4] ?? false, sang[5] ?? false]),
        movilidad: ant.movilidad ?? null,
        furca: ant.furca ?? null,
      });
    }))
      .then(() => { notify("Sondaje guardado en el expediente del paciente."); return api.perio.porPaciente(pid); })
      .then((rows) => setFilasPerio(rows || []))
      .catch(() => notify("No se pudo guardar el sondaje."));
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 16 }}>
      <PacienteBar pacientes={pacientes} pacienteId={pid} setPacienteId={setPid} modulo="Periodontograma" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        {/* Bug #34 re-test: No mostrar diagnóstico auto-etiquetado, solo métricas */}
        <KpiCard label="Profundidad prom." value={`${prom} mm`} color={NAVY} icon={<Activity size={18} strokeWidth={1.75} />} sub="al sondaje" />
        <KpiCard label="Bolsas ≥4mm" value={bolsas} color={bolsas ? "var(--dc-warn-600)" : "var(--dc-ok-700)"} icon={<AlertCircle size={18} strokeWidth={1.75} />} sub="sitios comprometidos" />
        <KpiCard label="Índice de sangrado" value={`${isb}%`} color={isb > 20 ? "var(--dc-red)" : "var(--dc-ok-700)"} icon={<Activity size={18} strokeWidth={1.75} />} sub="ISB al sondaje" />
        <KpiCard label="Estado" value={!haySondaje ? "Sin sondaje" : "Medido"} color={estadoColor} icon={<Stethoscope size={18} strokeWidth={1.75} />} sub={haySondaje ? "registrado" : "registra el sondaje"} />
      </div>
      <Card style={{ padding: 20, overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Sondaje — arcada superior derecha</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, color: "var(--dc-ink-400)" }}>
            {[["≤3", "var(--dc-ok-700)"], ["4–5", "var(--dc-warn-600)"], ["≥6", "var(--dc-red)"]].map(([l, c]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "var(--dc-r-sm)", background: c }} /> {l} mm</span>)}
            <Btn small kind="ghost" onClick={() => setInforme(true)}><FileText size={14} strokeWidth={1.75} /> Ver informe</Btn>
            <Btn small onClick={guardarPerio}><Check size={14} strokeWidth={1.75} /> Guardar sondaje</Btn>
          </div>
        </div>
        <div style={{ minWidth: 560, display: "grid", gridTemplateColumns: "72px repeat(8,1fr)", gap: 5, alignItems: "center" }}>
          <div />
          {DIENTES.map((n) => <div key={n} style={{ textAlign: "center", fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>{n}</div>)}
          {["Mesial", "Central", "Distal"].map((cara, ci) => (
            <React.Fragment key={cara}>
              <div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500, textAlign: "right", paddingRight: 4 }}>{cara}</div>
              {DIENTES.map((n) => { const v = datos[n].d[ci]; return (
                <input className="dc-premium-inp" key={n} type="number" value={v} onChange={(e) => setD(n, ci, e.target.value)} style={{ width: "100%", textAlign: "center", padding: "7px 2px", borderRadius: "var(--dc-r-sm)", border: "1px solid var(--dc-line)", fontSize: 13, fontWeight: 500, color: color(v), background: tint(color(v), 0.071), outline: "none", boxSizing: "border-box" }} />
              ); })}
            </React.Fragment>
          ))}
          <div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500, textAlign: "right", paddingRight: 4 }}>Sangrado</div>
          {DIENTES.map((n) => (
            <button type="button" key={n} className="dc-icon-btn" aria-label="Sangrado al sondaje" onClick={() => toggleB(n)} title="Sangrado al sondaje" style={{ height: 26, borderRadius: "var(--dc-r-sm)", border: "1px solid var(--dc-line)", cursor: "pointer", background: datos[n].bleed ? "var(--dc-fee)" : "#fff", display: "grid", placeItems: "center" }}>{datos[n].bleed && <span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-full)", background: "var(--dc-red)" }} />}</button>
          ))}
        </div>
      </Card>
      {informe && (
        <Modal icon={<Activity size={20} strokeWidth={1.75} />} tone={estadoColor} titulo="Informe periodontal" sub={paciente?.nombre} onClose={() => setInforme(false)} maxW={500} footer={<Btn small kind="ghost" onClick={() => setInforme(false)}>Cerrar</Btn>}>
          {/* Bug #34 re-test: Informe sin auto-diagnóstico, solo métricas */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: tint(estadoColor, 0.071), border: `1px solid ${tint(estadoColor, 0.2)}`, borderRadius: "var(--dc-r-lg)", padding: "13px 15px", marginBottom: 16 }}>
            <Stethoscope size={22} strokeWidth={1.75} color={estadoColor} /><div><div style={{ fontSize: 16, fontWeight: 600, color: estadoColor, fontFamily: DISPLAY_FONT, lineHeight: 1 }}>Sondaje registrado</div><div style={{ fontSize: 13, color: "var(--dc-ink-400)", marginTop: 3 }}>Métricas periodontales medidas</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {[["Profundidad prom.", `${prom} mm`], ["Bolsas ≥4mm", bolsas], ["ISB", `${isb}%`]].map(([l, v]) => <div key={l} style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "11px 13px", textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>{v}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500 }}>{l}</div></div>)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 8 }}>Recomendaciones</div>
          <div style={{ display: "grid", gap: 7 }}>
            {recomend.map((r, i) => <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "var(--dc-ink-700)" }}><CheckCircle2 size={16} strokeWidth={1.75} color={TEAL} style={{ flexShrink: 0, marginTop: 1 }} /> {r}</div>)}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---- Reseñas y reputación (captación) ---- */
function Resenas({ notify, citas = [], can }) {
  // Pedir reseñas manda WhatsApp a los pacientes y responder publica una respuesta:
  // las dos salen de la clínica. Quien solo consulta las lee.
  const puedeResponder = can ? can("resenas", "crear") : true;
  const conectadoR = !!auth.token;
  const [solicitando, setSolicitando] = useState(false);
  const solicitarResenas = async () => {
    if (!conectadoR) { notify("Solicitud de reseña enviada por WhatsApp a pacientes recientes."); return; }
    const hoyISO = fmt(hoy);
    const desde = fmt(new Date(Date.now() - 30 * 86400000));
    const ids = [...new Set(citas.filter((c) => c.estado === "atendida" && c.fecha >= desde && c.fecha <= hoyISO && c.pacienteId).map((c) => c.pacienteId))];
    if (!ids.length) { notify("No hay pacientes atendidos en los últimos 30 días para solicitar reseña."); return; }
    if (!confirm(`Se enviará una solicitud de reseña por WhatsApp a ${ids.length} paciente(s) atendidos recientemente. ¿Continuar?`)) return;
    setSolicitando(true);
    try {
      const msg = "Hola {nombre} 😊 ¿Nos ayudas con una reseña de tu última atención? Cuéntanos cómo te fue y cómo podemos mejorar. ¡Gracias!";
      const r = await api.pacientes.campana(ids, msg);
      notify(`Solicitud de reseña enviada a ${r?.enviados ?? 0}/${r?.total ?? ids.length} paciente(s) por WhatsApp.`);
    } catch (e) { notify("No se pudo enviar la solicitud."); }
    setSolicitando(false);
  };
  const encuestasAuto = citas.filter((c) => c.estado === "atendida").length; // P2-3: NPS automático tras atención
  const [reviews, setReviews] = useState([
    { id: 1, nombre: "Lucía V.", estrellas: 5, fecha: addDays(-1), texto: "Excelente atención, la Dra. Mendoza muy amable y el local impecable.", resp: "" },
    { id: 2, nombre: "Andrés P.", estrellas: 5, fecha: addDays(-3), texto: "Me agendaron por WhatsApp en segundos, todo súper rápido.", resp: "¡Gracias Andrés! Te esperamos en tu control." },
    { id: 3, nombre: "María C.", estrellas: 4, fecha: addDays(-6), texto: "Buen servicio, solo esperé un poco más de lo previsto.", resp: "" },
    { id: 4, nombre: "Diego C.", estrellas: 5, fecha: addDays(-9), texto: "Precios claros y me explicaron todo el tratamiento. Recomendado.", resp: "" },
    { id: 5, nombre: "Rosa L.", estrellas: 5, fecha: addDays(-12), texto: "El portal para ver mis pagos y citas es muy práctico.", resp: "" },
  ]);
  const conectado = !!auth.token;
  const mapRev = (r) => ({ id: r.id, nombre: r.paciente || "Paciente", estrellas: r.calificacion || 0, fecha: r.fecha, texto: r.comentario || "", resp: r.respondida ? "Respondida" : "" });
  const recargar = () => { if (conectado) api.resenas.listar().then((r) => setReviews((r || []).map(mapRev))).catch(() => notify("No se pudo cargar reseñas.")); };
  useEffect(() => { recargar(); }, []); // eslint-disable-line
  const [resp, setResp] = useState({});
  const [sel, setSel] = useState(null); // reseña abierta en modal de detalle/respuesta
  const [filtroRes, setFiltroRes] = useState("todas");
  const prom = (reviews.reduce((a, r) => a + r.estrellas, 0) / reviews.length).toFixed(1);
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.estrellas === s).length }));
  const recomiendan = reviews.length ? Math.round((reviews.filter((r) => r.estrellas >= 4).length / reviews.length) * 100) : 0;
  const sinResp = reviews.filter((r) => !r.resp).length;
  const responder = (id) => { const t = (resp[id] || "").trim(); if (conectado) { api.resenas.marcar(id, true).then(() => { notify("Reseña marcada como respondida."); recargar(); }).catch(() => notify("Error al responder.")); setResp((s) => ({ ...s, [id]: "" })); return; } if (!t) return; setReviews((rs) => rs.map((r) => r.id === id ? { ...r, resp: t } : r)); setResp((s) => ({ ...s, [id]: "" })); notify("Respuesta publicada."); };
  const estrellas = (n, size = 15) => [1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} strokeWidth={1.75} color="var(--dc-warn)" fill={i <= n ? "var(--dc-warn)" : "none"} />);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="dc-sat-hero dc-res-hero">
        <div className="dc-sat-hero__nps">
          <span className="dc-sat-hero__eti">Calificación de pacientes</span>
          <b>{reviews.length ? prom : "—"}</b>
          <span className="dc-res-hero__stars">{estrellas(Math.round(prom), 14)} <em>{reviews.length} reseñas</em></span>
        </div>
        <div className="dc-res-hero__dist">
          {dist.map(({ s: st, n }) => { const pct = reviews.length ? Math.round((n / reviews.length) * 100) : 0; return (
            <div key={st}><span>{st}<Star size={10} strokeWidth={2} fill="#FBBF5A" color="#FBBF5A" /></span><div><i style={{ width: `${pct}%` }} /></div><b>{n}</b></div>
          ); })}
        </div>
        <div className="dc-esp-hero__cifras dc-res-hero__cifras">
          <div><b>{recomiendan}%</b><span>Recomiendan</span></div>
          <div><b>{sinResp}</b><span>Por responder</span></div>
          <div><b>{encuestasAuto}</b><span>Encuestas</span></div>
        </div>
        {puedeResponder && <button type="button" className="dc-esp-hero__btn" onClick={solicitarResenas} disabled={solicitando}><Send size={14} strokeWidth={1.75} /> {solicitando ? "Enviando…" : "Solicitar reseñas"}</button>}
      </section>
      <Card className="dc-env">
        <div className="dc-env__cab">
          <h3>Reseñas de pacientes</h3>
          <div className="dc-env__filtros" role="tablist" aria-label="Filtrar reseñas">
            {[["todas", "Todas", reviews.length], ["pendientes", "Por responder", sinResp], ["respondidas", "Respondidas", reviews.length - sinResp]].map(([k, l, c]) => (
              <button key={k} type="button" role="tab" aria-selected={filtroRes === k} onClick={() => setFiltroRes(k)}>{l} <span>{c}</span></button>
            ))}
          </div>
        </div>
        {(() => { const lista = [...reviews].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).filter((r) => filtroRes === "todas" ? true : filtroRes === "pendientes" ? !r.resp : !!r.resp); return lista.length === 0
          ? <Vacio icon={<Star size={22} strokeWidth={1.75} />} titulo={reviews.length ? "Nada con este filtro" : "Sin reseñas"} sub={reviews.length ? "Prueba con otro filtro." : "Solicita reseñas a tus pacientes recientes para construir tu reputación."} />
          : (
          <div className="dc-sat__grid">
            {lista.map((r) => { const col = colorDe(r.nombre); const tono = r.estrellas >= 5 ? "prom" : r.estrellas <= 3 ? "det" : "neutro"; return (
              <figure key={r.id} className={`dc-sat__com is-${tono} dc-res-card`} onClick={() => setSel(r)}>
                <div className="dc-res-card__top"><span className="dc-sat__estrellas">{estrellas(r.estrellas, 13)}</span><span className="dc-res-card__fecha">{fechaLegible(r.fecha)}</span></div>
                <blockquote>{r.texto}</blockquote>
                <figcaption>
                  <span className="dc-rec__av" style={{ width: 32, height: 32, fontSize: 12, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(r.nombre)}</span>
                  <div><b>{r.nombre}</b>{r.resp ? <span className="dc-res-card__ok"><CheckCircle2 size={12} strokeWidth={2} /> Respondida</span> : <span className="dc-res-card__pend">Esperando respuesta</span>}</div>
                  {!r.resp && puedeResponder ? <button type="button" className="dc-accion" onClick={(e) => { e.stopPropagation(); setSel(r); }}>Responder</button> : <button type="button" className="dc-accion is-sutil" onClick={(e) => { e.stopPropagation(); setSel(r); }}>Ver</button>}
                </figcaption>
              </figure>
            ); })}
          </div>
        ); })()}
      </Card>
      {sel && (() => { const r = reviews.find((x) => x.id === sel.id) || sel; const col = colorDe(r.nombre); return (
        <Modal icon={<Star size={20} strokeWidth={1.75} />} tone="var(--dc-warn-600)" titulo={r.nombre} sub={`${fechaLegible(r.fecha)} – reseña pública`} onClose={() => setSel(null)} maxW={520}
          footer={r.resp ? <Btn small kind="ghost" onClick={() => setSel(null)}>Cerrar</Btn> : <><Btn small kind="ghost" onClick={() => setSel(null)}>Cancelar</Btn><Btn small onClick={() => { responder(r.id); setSel(null); }}><Send size={15} strokeWidth={1.75} /> Publicar respuesta</Btn></>}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--dc-r-full)", background: tint(col, 0.102), color: col, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 14, flexShrink: 0 }}>{r.nombre[0]}</div>
            <div><div style={{ display: "flex", gap: 1 }}>{estrellas(r.estrellas, 17)}</div><div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>{r.estrellas} de 5 estrellas</div></div>
          </div>
          <div style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "13px 15px", fontSize: 14, color: "var(--dc-ink-700)", lineHeight: 1.55 }}>{r.texto}</div>
          {r.resp ? (
            <div style={{ marginTop: 14, background: "var(--dc-ok-soft)", border: "1px solid var(--dc-green-soft)", borderRadius: "var(--dc-r-md)", padding: "13px 15px" }}><div style={{ fontWeight: 500, color: "var(--dc-ok-700)", fontSize: 12, marginBottom: 3 }}>Clínica Sonríe+ respondió</div><span style={{ color: "var(--dc-ok-700)", fontSize: 13 }}>{r.resp}</span></div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Tu respuesta pública</label>
              <textarea className="dc-premium-inp" value={resp[r.id] || ""} onChange={(e) => setResp((s) => ({ ...s, [r.id]: e.target.value }))} rows={3} placeholder="Agradece y responde con calidez…" style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "var(--dc-bg)", fontSize: 14, color: INK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
            </div>
          )}
        </Modal>
      ); })()}
    </div>
  );
}

/* ---- Recordatorios y recall automáticos (anti-ausentismo) ---- */

/* ---- Seguros y EPS (convenios, coberturas y liquidaciones) ---- */
function Seguros({ notify, pacientes = [], fichas = {} }) {
  const conectado = !!auth.token;
  // Los convenios y sus coberturas los pacta cada clínica: estos cinco son el ejemplo.
  // Se enseñaban también con sesión abierta, y alimentaban "Cobertura promedio" y
  // "Aseguradoras 4/5", así que recepción acababa diciéndole a un paciente que su seguro
  // le cubre el 80% de un convenio que su clínica no tiene.
  const convenios = conectado ? [] : [
    { n: "Pacífico EPS", cob: 80, estado: "activo" }, { n: "Rímac Seguros", cob: 70, estado: "activo" },
    { n: "Mapfre", cob: 60, estado: "activo" }, { n: "La Positiva", cob: 50, estado: "activo" }, { n: "SIS", cob: 100, estado: "evaluación" },
  ];
  // Liquidaciones ligadas al paciente por ID; el total sale del cargo real de su ficha (plan).
  const [liq, setLiq] = useState(auth.token ? [] : [
    { id: 1, pid: 2, aseg: "Pacífico EPS", cobPct: 80, estado: "aprobado" },
    { id: 2, pid: 3, aseg: "Rímac Seguros", cobPct: 70, estado: "enviado" },
    { id: 3, pid: 5, aseg: "Mapfre", cobPct: 60, estado: "pagado" },
    { id: 4, pid: 8, aseg: "Pacífico EPS", cobPct: 80, estado: "enviado" },
  ]);
  const mapEstadoSeg = (be) => ({ por_enviar: "enviado", enviado: "enviado", en_revision: "aprobado", pagado: "pagado", observado: "enviado" }[be] || "enviado");
  const [remoto, setRemoto] = useState(null);
  const [segurosError, setSegurosError] = useState(null);
  const recargarLiq = () => {
    if (!conectado) return;
    setSegurosError(null);
    api.seguros.listar()
      .then((r) => setRemoto((r || []).map((l) => ({ id: l.id, paciente: l.paciente || "—", aseg: l.aseguradora, total: Number(l.monto) || 0, cob: Number(l.monto) || 0, copago: 0, estado: mapEstadoSeg(l.estado), estadoBE: l.estado }))))
      .catch((e) => {
        setRemoto([]);
        setSegurosError(e?.status === 404
          ? "El módulo de seguros todavía no está conectado al servidor (GET /seguros no existe)."
          : "No se pudieron cargar las liquidaciones de seguros.");
        notify(e?.status === 404 ? "Seguros: endpoint aún no disponible." : "No se pudo cargar seguros.");
      });
  };
  useEffect(() => { recargarLiq(); }, []); // eslint-disable-line
  const LI = { enviado: { l: "Enviado", bg: "var(--dc-info-soft)", fg: "var(--dc-info-ink)" }, aprobado: { l: "Aprobado", bg: "var(--dc-info-soft)", fg: "var(--dc-info-ink)" }, pagado: { l: "Pagado", bg: "var(--dc-ok-soft)", fg: "var(--dc-ok-700)" } };
  const [detalleLiq, setDetalleLiq] = useState(null);
  const totalDe = (pid) => (fichas[pid]?.tratamiento || []).reduce((s, f) => s + f.costo, 0);
  const nombreDe = (pid) => (pacientes.find((p) => p.id === pid) || PACIENTES_INIT.find((p) => p.id === pid))?.nombre || "—";
  const liqView = conectado ? (remoto || []) : liq.map((l) => { const total = totalDe(l.pid) || 0; const cob = Math.round(total * l.cobPct / 100); return { ...l, paciente: nombreDe(l.pid), total, cob, copago: total - cob }; });
  const avanzar = (id) => { if (conectado) { const it = (remoto || []).find((x) => x.id === id); if (!it) return; const flow = ["por_enviar", "enviado", "en_revision", "pagado"]; const n = flow[Math.min(flow.length - 1, flow.indexOf(it.estadoBE) + 1)]; api.seguros.actualizar(id, { estado: n }).then(() => { notify(`${it.paciente}: liquidación actualizada.`); recargarLiq(); }).catch(() => notify("Error al avanzar la liquidación.")); return; } setLiq((l) => l.map((x) => { if (x.id !== id) return x; const f = ["enviado", "aprobado", "pagado"]; const n = f[Math.min(2, f.indexOf(x.estado) + 1)]; notify(`${nombreDe(x.pid)}: liquidación ${LI[n].l.toLowerCase()}.`); return { ...x, estado: n }; })); };
  const porCobrar = liqView.filter((l) => l.estado !== "pagado").reduce((s, l) => s + l.cob, 0);
  const recuperado = liqView.filter((l) => l.estado === "pagado").reduce((s, l) => s + l.cob, 0);
  // DC-43: cobertura promedio + # aseguradoras desde liquidaciones (misma fuente que la tabla).
  const cobPctDe = (l) => {
    if (l.cobPct != null && Number.isFinite(Number(l.cobPct))) return Number(l.cobPct);
    const t = Number(l.total) || 0;
    const c = Number(l.cob) || 0;
    return t > 0 ? Math.round((c / t) * 100) : null;
  };
  const cobVals = liqView.map(cobPctDe).filter((x) => x != null);
  const cobProm = cobVals.length ? Math.round(cobVals.reduce((s, x) => s + x, 0) / cobVals.length) : 0;
  const aseguradoras = [...new Set(liqView.map((l) => l.aseg).filter(Boolean))];
  const pendConv = (n) => liqView.filter((l) => l.aseg === n && l.estado !== "pagado").reduce((s, l) => s + l.cob, 0);
  const nLiq = (n) => liqView.filter((l) => l.aseg === n).length;
  const kpis = [["Por liquidar", segurosError ? "—" : `S/ ${porCobrar.toLocaleString()}`, "var(--dc-warn-600)", <Umbrella size={18} strokeWidth={1.75} />], ["Recuperado del seguro", segurosError ? "—" : `S/ ${recuperado.toLocaleString()}`, "var(--dc-ok-700)", <ShieldCheck size={18} strokeWidth={1.75} />], ["Cobertura promedio", segurosError ? "—" : (cobVals.length ? `${cobProm}%` : "—"), DS.c.primary, <Percent size={18} strokeWidth={1.75} />], ["Aseguradoras", segurosError ? "—" : String(aseguradoras.length), NAVY, <Building2 size={18} strokeWidth={1.75} />]];
  // Convenios derivados de liquidaciones cuando no hay catálogo de convenios (modo conectado).
  const conveniosVista = convenios.length
    ? convenios
    : aseguradoras.map((n) => {
      const vals = liqView.filter((l) => l.aseg === n).map(cobPctDe).filter((x) => x != null);
      const cob = vals.length ? Math.round(vals.reduce((s, x) => s + x, 0) / vals.length) : 0;
      return { n, cob, estado: "activo" };
    });
  const iniAseg = (n) => String(n || "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  const COLS_LIQ = [["enviado", "Enviadas", "Esperan respuesta de la aseguradora", "#2F6FDE", Send], ["aprobado", "Aprobadas", "Listas para cobrar", "#6D4FD1", CheckCircle2], ["pagado", "Pagadas", "Ya recuperadas", "#16A36A", Wallet]];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="dc-esp-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{segurosError ? "—" : `S/ ${porCobrar.toLocaleString("es-PE")}`}</b><span>por liquidar</span></div>
          <p>{liqView.length} {liqView.length === 1 ? "liquidación" : "liquidaciones"} con aseguradoras y EPS</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{segurosError ? "—" : `S/ ${recuperado.toLocaleString("es-PE")}`}</b><span>Recuperado</span></div>
          <div><b>{segurosError ? "—" : (cobVals.length ? `${cobProm}%` : "—")}</b><span>Cobertura promedio</span></div>
          <div><b>{segurosError ? "—" : conveniosVista.length}</b><span>Aseguradoras</span></div>
        </div>
        <span />
      </section>
      {segurosError && <div className="fm-aviso-edad is-mal"><AlertTriangle size={15} strokeWidth={2} /><span><b>Módulo no conectado.</b> {segurosError} No significa que la clínica no tenga convenios.</span><button type="button" onClick={recargarLiq}>Reintentar</button></div>}
      <section className="dc-seg__conv">
        <div className="dc-seg__tit"><h3>Convenios</h3><span>Cobertura pactada y lo pendiente por aseguradora</span></div>
        {conveniosVista.length === 0 ? <p className="dc-seg__nada">Todavía no hay convenios cargados. Cada clínica pacta los suyos; aquí aparecerán con su cobertura y lo que queda por liquidar.</p> : (
          <div className="dc-seg__convs">
            {conveniosVista.map((c) => { const col = colorDe(c.n); const pend = pendConv(c.n); return (
              <article key={c.n} className="dc-seg__card" style={{ "--c": col }}>
                <div className="dc-seg__top">
                  <span className="dc-seg__logo">{iniAseg(c.n)}</span>
                  <div><b>{c.n}</b><span className={`dc-pill ${c.estado === "activo" ? "is-ok" : "is-warn"}`}>{c.estado === "activo" ? "Activo" : "En evaluación"}</span></div>
                  <span className="dc-seg__anillo" style={{ "--p": c.cob }}><b>{c.cob}%</b></span>
                </div>
                <div className="dc-seg__pie"><span>{nLiq(c.n)} {nLiq(c.n) === 1 ? "caso" : "casos"}</span><b className={pend > 0 ? "is-pend" : "is-ok"}>{pend > 0 ? `S/ ${pend.toLocaleString("es-PE")} por liquidar` : "Al día"}</b></div>
              </article>
            ); })}
          </div>
        )}
      </section>
      <div className="dc-seg__tablero">
        {COLS_LIQ.map(([k, tit, sub, col, Ico]) => { const items = liqView.filter((l) => l.estado === k); const tot = items.reduce((a, l) => a + (Number(l.cob) || 0), 0); return (
          <section key={k} className="dc-seg__col" style={{ "--c": col }}>
            <header><span className="dc-seg__cico"><Ico size={16} strokeWidth={2} /></span><div><h4>{tit} <i>{items.length}</i></h4><small>{sub}</small></div><b>S/ {tot.toLocaleString("es-PE")}</b></header>
            {items.length === 0 ? <p className="dc-seg__nada">Sin liquidaciones aquí.</p> : items.map((x) => { const pc = x.total ? Math.round((x.cob / x.total) * 100) : 0; return (
              <article key={x.id} className="dc-seg__liq" onClick={() => setDetalleLiq(x)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setDetalleLiq(x); }}>
                <div className="dc-seg__lq1"><b>{x.paciente}</b><span>{x.aseg}</span></div>
                <div className="dc-seg__split" title={`Seguro ${pc}%, copago ${100 - pc}%`}><i style={{ width: `${pc}%` }} /></div>
                <div className="dc-seg__lq2">
                  <span>Seguro <b className="is-ok">S/ {Number(x.cob).toLocaleString("es-PE")}</b></span>
                  <span>Copago <b className="is-warn">S/ {Number(x.copago).toLocaleString("es-PE")}</b></span>
                  <span>Total <b>S/ {Number(x.total).toLocaleString("es-PE")}</b></span>
                </div>
                {x.estado !== "pagado" && <button type="button" className="dc-seg__av" onClick={(e) => { e.stopPropagation(); avanzar(x.id); }}>{x.estado === "enviado" ? "Marcar aprobada" : "Marcar pagada"} <ChevronRight size={13} strokeWidth={2.2} /></button>}
              </article>
            ); })}
          </section>
        ); })}
      </div>
      {detalleLiq && (() => { const x = detalleLiq; const I = LI[x.estado]; return (
        <Modal icon={<Umbrella size={20} strokeWidth={1.75} />} titulo={`Liquidación – ${x.paciente}`} sub={x.aseg} onClose={() => setDetalleLiq(null)} maxW={520} footer={x.estado !== "pagado" ? <Btn small onClick={() => { avanzar(x.id); setDetalleLiq(null); }}>Avanzar estado <ChevronRight size={14} strokeWidth={1.75} /></Btn> : <Btn small kind="ghost" onClick={() => setDetalleLiq(null)}>Cerrar</Btn>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {[["Total tratamiento", `S/ ${x.total}`, NAVY], ["Cubre seguro", `S/ ${x.cob}`, "var(--dc-ok-700)"], ["Copago paciente", `S/ ${x.copago}`, "var(--dc-warn-600)"]].map(([l, v, col]) => <div key={l} style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-lg)", padding: "12px 14px" }}><div style={{ fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500 }}>{l}</div><div style={{ fontSize: 16, fontWeight: 600, color: col, fontFamily: DISPLAY_FONT, marginTop: 2 }}>{v}</div></div>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderTop: "1px solid var(--dc-line)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>Aseguradora</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{x.aseg} – {x.cobPct}%</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderTop: "1px solid var(--dc-line)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>Estado</span><span style={{ fontSize: 12, fontWeight: 500, color: I.fg, background: I.bg, padding: "4px 12px", borderRadius: "var(--dc-r-full)" }}>{I.l}</span></div>
        </Modal>
      ); })()}
    </div>
  );
}

/* ---- Formularios / anamnesis digital pre-cita ---- */
const FORM_TIPOS = ["Ficha de admisión", "Anamnesis / historia médica", "Declaración de salud", "Actualización de datos"];
function Formularios({ pacientes: pacProp, notify }) {
  const conectado = !!auth.token;
  const [pacRemoto, setPacRemoto] = useState(null);
  useEffect(() => { if (conectado) api.pacientes.listar().then((r) => setPacRemoto((r || []).map((p) => ({ id: p.id, nombre: p.nombre })))).catch(() => {}); }, []); // eslint-disable-line
  const pacientes = conectado ? (pacRemoto || []) : pacProp;
  const [docsDemo, setDocsDemo] = useState([
    { id: 1, paciente: "Rosa Linares", tipo: "Anamnesis / historia médica", estado: "completado", fecha: addDays(-2) },
    { id: 2, paciente: "Carlos Ruiz", tipo: "Ficha de admisión", estado: "pendiente", fecha: addDays(-1) },
    { id: 3, paciente: "Lucía Vega", tipo: "Declaración de salud", estado: "completado", fecha: addDays(-4) },
  ]);
  const [docsRem, setDocsRem] = useState([]);
  const recargarEnvios = () => { if (conectado) api.formularios.envios().then((rows) => setDocsRem((rows || []).map((e) => ({ id: e.id, paciente: e.paciente || "—", tipo: e.tipo, estado: e.estado, fecha: (e.enviadoEn || "").slice(0, 10), respuestas: e.respuestas || null })))).catch(() => {}); };
  const [verResp, setVerResp] = useState(null); // envío cuyas respuestas se están viendo
  useEffect(() => { recargarEnvios(); }, [conectado]); // eslint-disable-line
  const docs = conectado ? docsRem : docsDemo;
  const setDocs = setDocsDemo;
  const [form, setForm] = useState(null);
  const inp = { width: "100%", padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box", cursor: "pointer" };
  const enviar = () => {
    if (conectado) {
      const pid = (pacientes.find((p) => p.nombre === form.paciente) || {}).id;
      if (!pid) { notify("Selecciona un paciente válido."); return; }
      api.formularios.enviar({ pacienteId: pid, tipo: form.tipo, canal: "whatsapp" })
        .then(() => { notify("Formulario enviado al paciente por WhatsApp."); recargarEnvios(); setForm(null); })
        .catch(() => notify("No se pudo enviar el formulario."));
      return;
    }
    setDocs((d) => [{ id: Date.now(), paciente: form.paciente, tipo: form.tipo, estado: "pendiente", fecha: fmt(hoy) }, ...d]); notify("Formulario enviado al paciente por WhatsApp."); setForm(null);
  };
  const kpis = [["Completados", docs.filter((d) => d.estado === "completado").length, "var(--dc-ok-700)", <CheckCircle2 size={18} strokeWidth={1.75} />], ["Pendientes", docs.filter((d) => d.estado === "pendiente").length, "var(--dc-warn-600)", <Clock size={18} strokeWidth={1.75} />], ["Total", docs.length, NAVY, <ClipboardList size={18} strokeWidth={1.75} />]];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {(() => { const nC = docs.filter((d) => d.estado === "completado").length; const pct = docs.length ? Math.round((nC / docs.length) * 100) : 0; return (
        <section className="dc-esp-hero dc-form-hero">
          <div className="dc-esp-hero__txt">
            <div className="dc-esp-hero__num"><b>{pct}%</b><span>completados</span></div>
            <p>El paciente los llena desde su celular antes de llegar.</p>
          </div>
          <div className="dc-esp-hero__cifras">
            <div><b>{nC}</b><span>Completados</span></div>
            <div><b>{docs.length - nC}</b><span>Pendientes</span></div>
            <div><b>{docs.length}</b><span>Enviados</span></div>
          </div>
          <div className="dc-form-hero__barra" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
          <button type="button" className="dc-esp-hero__btn" onClick={() => setForm({ paciente: pacientes[0]?.nombre || "", tipo: FORM_TIPOS[0] })}><Send size={14} strokeWidth={1.75} /> Enviar formulario</button>
        </section>
      ); })()}
      {form && (
        <Modal icon={<ClipboardList size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Enviar formulario" sub="El paciente lo llena desde su celular" onClose={() => setForm(null)} maxW={540} footer={<><Btn small kind="ghost" onClick={() => setForm(null)}>Cancelar</Btn><Btn small onClick={enviar}><Send size={15} strokeWidth={1.75} /> Enviar</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Paciente<br /><Select value={form.paciente} onChange={(v) => setForm({ ...form, paciente: v })} options={pacientes.map((p) => ({ value: p.nombre, label: p.nombre }))} /></label>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Formulario<br /><Select value={form.tipo} onChange={(v) => setForm({ ...form, tipo: v })} options={FORM_TIPOS.map((t) => ({ value: t, label: t }))} /></label>
          </div>
          <div style={{ marginTop: 16, background: "var(--dc-accent-soft)", border: "1px solid var(--dc-info-soft)", borderRadius: "var(--dc-r-lg)", padding: "13px 15px" }}>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: ".05em", textTransform: "uppercase", color: DS.c.primary, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><MessageSquare size={13} strokeWidth={1.75} /> Así lo recibe el paciente</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, color: "var(--dc-brand-600)" }}>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Send size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> Llega un enlace por WhatsApp a <strong>{form.paciente || "el paciente"}</strong> antes de su cita.</span>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><ClipboardList size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> Completa <strong>{form.tipo}</strong> desde su celular en 2 minutos.</span>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>{/* Decía "llega lista a la ficha, sin transcribir a mano": la respuesta se guarda en
                  el envío y ahí se queda; nadie la vuelca sobre la ficha del paciente. */}
              <CheckCircle2 size={14} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} /> La respuesta queda guardada en el envío y se consulta desde aquí, sin papel.</span>
            </div>
          </div>
        </Modal>
      )}
      <DataTable titulo="Formularios enviados" sub="formularios" minWidth={720} rows={docs} empty={<Vacio icon={<ClipboardList size={22} strokeWidth={1.75} />} titulo="Sin formularios" sub="Envía un formulario para que el paciente lo complete desde su celular." />} cols={[
        { key: "paciente", label: "Paciente", w: "minmax(170px,1.3fr)", a: "left", get: (d) => d.paciente, cell: (d) => { const col = colorDe(d.paciente); return <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}><span className="dc-rec__av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(d.paciente)}</span><span style={{ fontWeight: 600, color: "var(--dc-ink-900)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.paciente}</span></span>; } },
        { key: "tipo", label: "Formulario", w: "minmax(190px,1.5fr)", a: "left", get: (d) => d.tipo, cell: (d) => <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--dc-ink-700)", fontSize: 13 }}><ClipboardList size={15} strokeWidth={1.75} color={DS.c.primary} style={{ flexShrink: 0 }} /> {d.tipo}</span> },
        { key: "fecha", label: "Fecha", w: "150px", a: "center", get: (d) => d.fecha, cell: (d) => <span style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{fechaLegible(d.fecha)}</span> },
        { key: "estado", label: "Estado", w: "150px", a: "center", get: (d) => d.estado, cell: (d) => d.estado === "completado"
          ? <span className="dc-pill is-ok"><CheckCircle2 size={12} strokeWidth={2} /> Completado</span>
          : <span className="dc-pill is-aviso"><Clock size={12} strokeWidth={2} /> Pendiente</span> },
        { key: "acc", label: "Acción", w: "150px", a: "center", noFilter: true, noSort: true, cell: (d) => d.estado === "completado"
          ? <ActionBtn subtle onClick={() => setVerResp(d)}>Ver respuestas</ActionBtn>
          : <ActionBtn color="var(--dc-primary-alt)" onClick={() => { if (conectado) { api.formularios.recordar(d.id).then(() => notify("Recordatorio de formulario reenviado.")).catch(() => notify("No se pudo enviar el recordatorio.")); } else notify("Recordatorio de formulario reenviado."); }}><Send size={12} strokeWidth={2} style={{ marginRight: 6 }} />Recordar</ActionBtn> },
      ]} />
      {verResp && (() => {
        let resp = null; try { resp = verResp.respuestas ? JSON.parse(verResp.respuestas) : null; } catch { resp = verResp.respuestas; }
        const entradas = resp && typeof resp === "object" && !Array.isArray(resp) ? Object.entries(resp) : null;
        return (
        <Modal icon={<ClipboardList size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo={`Respuestas – ${verResp.tipo}`} sub={verResp.paciente} onClose={() => setVerResp(null)} maxW={560}
          footer={<Btn small kind="ghost" onClick={() => setVerResp(null)}>Cerrar</Btn>}>
          {!resp && <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Este formulario aún no tiene respuestas guardadas.</div>}
          {entradas && <div style={{ display: "grid", gap: 8 }}>{entradas.map(([k, v]) => (
            <div key={k} style={{ border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "10px 12px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", textTransform: "uppercase", letterSpacing: ".03em" }}>{k}</div>
              <div style={{ fontSize: 13, color: NAVY, marginTop: 2 }}>{typeof v === "boolean" ? (v ? "Sí" : "No") : String(v)}</div>
            </div>
          ))}</div>}
          {resp && !entradas && <pre style={{ fontSize: 13, color: "var(--dc-ink-700)", whiteSpace: "pre-wrap", margin: 0 }}>{typeof resp === "string" ? resp : JSON.stringify(resp, null, 2)}</pre>}
        </Modal>
        );
      })()}
    </div>
  );
}

/* ---- Radiografías e imágenes clínicas ---- */
const RX_TIPOS = { panoramica: "Panorámica", periapical: "Periapical", bitewing: "Bitewing", foto: "Foto intraoral" };
function Radiografias({ pacientes: pacProp, notify, sedeActiva = 1, misSedes = SEDE_IDS, can, soloFotos = false }) {
  // Borrar del expediente es irreversible: se pide el permiso explicito de eliminar,
  // no basta con poder subir. El backend lo exige igual (radiografias.eliminar).
  const puedeBorrarRx = can ? can("radiografias", "eliminar") : true;
  const conectado = !!auth.token;
  const [pacRemoto, setPacRemoto] = useState(null);
  useEffect(() => { if (conectado) api.pacientes.listar().then((r) => setPacRemoto((r || []).map((p) => ({ id: p.id, nombre: p.nombre })))).catch(() => {}); }, []); // eslint-disable-line
  const pacientes = conectado ? (pacRemoto || []) : pacProp;
  const [pid, setPid] = useState(auth.token ? null : (pacProp[0]?.id || null));
  useEffect(() => {
    if (!conectado || !pacRemoto) return;
    if (!pacRemoto.length) { setPid(null); return; }
    if (pid && !pacRemoto.some((p) => p.id === pid)) setPid(null);
  }, [pacRemoto]); // eslint-disable-line
  const [visor, setVisor] = useState(null); // estudio abierto en el visor modal
  const [estudios, setEstudios] = useState({
    1: [{ id: 1, tipo: "panoramica", fecha: addDays(-30), sede: 1 }, { id: 2, tipo: "periapical", fecha: addDays(-5), sede: 2 }, { id: 3, tipo: "foto", fecha: addDays(-5), sede: 1 }],
    3: [{ id: 4, tipo: "bitewing", fecha: addDays(-12), sede: 2 }] });
  const [rxRem, setRxRem] = useState([]);
  const recargarRx = () => { if (conectado && pid) api.radiografias.porPaciente(pid).then((rows) => setRxRem((rows || []).map((r) => ({ id: r.id, tipo: r.tipo || "periapical", fecha: r.fecha, sede: 1, url: r.url, nota: r.nota })))).catch(() => {}); else setRxRem([]); };
  useEffect(() => { recargarRx(); }, [pid, conectado]); // eslint-disable-line
  const paciente = pacientes.find((p) => p.id === pid) || { id: pid, nombre: "Selecciona un paciente" };
  const lista = conectado ? rxRem : (estudios[pid] || []);
  const listaVista = soloFotos ? lista.filter((s) => s.tipo === "foto") : lista;
  // Sede donde se registra el estudio: por defecto la sede activa (geolocalizada), editable.
  // Se limita a las sedes del usuario que además atiende al paciente (que puede ser multi-sede).
  const sedesPac = sedesDe(paciente).filter((s) => misSedes.includes(s));
  const opcionesSede = sedesPac.length ? sedesPac : misSedes;
  const [sedeReg, setSedeReg] = useState(opcionesSede.includes(sedeActiva) ? sedeActiva : opcionesSede[0]);
  useEffect(() => { setSedeReg(opcionesSede.includes(sedeActiva) ? sedeActiva : opcionesSede[0]); }, [pid, sedeActiva]);
  const fileRef = useRef(null);
  const [subiendo, setSubiendo] = useState(null); // { url, tipo, nota, nombre }
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (!f.type.startsWith("image/")) { notify("Selecciona una imagen (JPG o PNG)."); e.target.value = ""; return; }
    if (f.size > 8 * 1024 * 1024) { notify("La imagen supera 8 MB. Usa una más liviana."); e.target.value = ""; return; }
    const rd = new FileReader();
    rd.onload = () => setSubiendo({ url: rd.result, tipo: soloFotos || /foto|intraoral/i.test(f.name) ? "foto" : /pano/i.test(f.name) ? "panoramica" : "periapical", nota: "", nombre: f.name });
    rd.readAsDataURL(f);
    e.target.value = "";
  };
  const [borrarRx, setBorrarRx] = useState(null);   // estudio pendiente de confirmar
  const confirmarBorrado = () => {
    const s = borrarRx;
    if (conectado) {
      api.radiografias.borrar(s.id)
        .then(() => { notify("Estudio eliminado del expediente."); setBorrarRx(null); setVisor(null); recargarRx(); })
        .catch(() => notify("No se pudo eliminar el estudio."));
      return;
    }
    setEstudios((e) => ({ ...e, [pid]: (e[pid] || []).filter((x) => x.id !== s.id) }));
    notify("Estudio eliminado del expediente.");
    setBorrarRx(null); setVisor(null);
  };
  const guardarEstudio = () => {
    const s = subiendo;
    if (conectado) { api.radiografias.crear({ pacienteId: pid, tipo: s.tipo, fecha: fmt(hoy), url: s.url, nota: s.nota }).then(() => { notify("Imagen subida al expediente del paciente."); recargarRx(); }).catch(() => notify("Error al subir la imagen.")); setSubiendo(null); return; }
    setEstudios((e) => ({ ...e, [pid]: [{ id: Date.now(), tipo: s.tipo, fecha: fmt(hoy), sede: sedeReg, url: s.url, nota: s.nota }, ...(e[pid] || [])] }));
    notify(`Imagen subida al expediente en ${nombreSede(sedeReg)}.`);
    setSubiendo(null);
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {soloFotos && <Card style={{ padding: 14, background: "var(--dc-white)", border: "1px solid var(--dc-sky)" }}><div style={{ fontSize: 13, color: "var(--dc-brand-500)" }}>Galería de <strong>fotografía clínica</strong> (intra/extraoral). Se guarda en el expediente del paciente.</div></Card>}
      <PacienteBar pacientes={pacientes} pacienteId={pid} setPacienteId={setPid} modulo={soloFotos ? "Fotografía clínica" : "Radiografías"} accion={
        <div className="dc-rx-acc">
          <label className="dc-rx-sede" title="Sede donde se registra el estudio">
            <MapPin size={14} strokeWidth={1.9} />
            <span>Registrar en</span>
            <Select small width={170} ariaLabel="Sede" value={sedeReg} onChange={(v) => setSedeReg(Number(v))} options={opcionesSede.map((s) => ({ value: s, label: `${nombreSede(s)}${s === sedeActiva ? " (aquí)" : ""}` }))} />
          </label>
          <button type="button" className="dc-esp-hero__btn" onClick={() => fileRef.current && fileRef.current.click()}><Upload size={14} strokeWidth={1.9} /> Subir imagen</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        </div>
      } />
      {(() => { const base = listaVista; const rx = base.filter((s) => s.tipo !== "foto").length; const fotos = base.filter((s) => s.tipo === "foto").length; const ult = base.length ? [...base].map((s) => s.fecha).sort().slice(-1)[0] : null; return (
        <Card className="dc-env dc-gal">
          <div className="dc-env__cab">
            <h3>{soloFotos ? "Fotos del expediente" : "Estudios del expediente"}</h3>
            <div className="dc-gal__cifras">
              <span className="dc-gal__c"><b>{base.length}</b> {soloFotos ? "fotos" : "estudios"}</span>
              {!soloFotos && <span className="dc-gal__c is-rx"><Scan size={13} strokeWidth={2} /><b>{rx}</b> radiografías</span>}
              <span className="dc-gal__c is-foto"><Camera size={13} strokeWidth={2} /><b>{fotos}</b> fotos</span>
              {ult && <span className="dc-gal__c"><Calendar size={13} strokeWidth={2} /> Última toma {fechaLegible(ult)}</span>}
            </div>
          </div>
          {base.length === 0 ? (
            <Vacio icon={soloFotos ? <Camera size={24} strokeWidth={1.75} /> : <Scan size={24} strokeWidth={1.75} />} titulo={soloFotos ? "Sin fotos" : "Sin estudios"} sub={soloFotos ? "Sube la primera foto clínica de este paciente." : "Sube la primera radiografía o foto de este paciente."} />
          ) : (
            <div className="dc-gal__grid">
              {base.map((s) => { const esFoto = s.tipo === "foto"; return (
                <article key={s.id} className={`dc-gal__item${esFoto ? " is-foto" : ""}`}>
                  <button type="button" className="dc-gal__img" onClick={() => setVisor(s)} aria-label={`Abrir ${RX_TIPOS[s.tipo]}`}>
                    {s.url ? <img src={s.url} alt={RX_TIPOS[s.tipo]} /> : (esFoto ? <Camera size={34} strokeWidth={1.5} /> : <Scan size={34} strokeWidth={1.5} />)}
                    <span className="dc-gal__tipo">{esFoto ? <Camera size={12} strokeWidth={2} /> : <Scan size={12} strokeWidth={2} />} {RX_TIPOS[s.tipo]}</span>
                  </button>
                  <div className="dc-gal__pie">
                    <div className="dc-gal__meta"><b>{fechaLegible(s.fecha)}</b>{s.sede ? <span><MapPin size={11} strokeWidth={2} /> {cortaSede(s.sede)}</span> : null}</div>
                    <button type="button" className="dc-gal__btn" onClick={() => setVisor(s)} title="Abrir visor" aria-label="Abrir visor"><Eye size={15} strokeWidth={1.9} /></button>
                    {puedeBorrarRx && <button type="button" className="dc-gal__btn is-del" onClick={() => setBorrarRx(s)} title="Eliminar estudio" aria-label="Eliminar estudio"><Trash2 size={15} strokeWidth={1.9} /></button>}
                  </div>
                </article>
              ); })}
            </div>
          )}
        </Card>
      ); })()}
      {borrarRx && (
        <Modal icon={<Trash2 size={20} strokeWidth={1.75} />} tone="var(--dc-red)" titulo="Eliminar estudio"
          sub={`${RX_TIPOS[borrarRx.tipo] || "Estudio"} – ${paciente.nombre}`} maxW={430} onClose={() => setBorrarRx(null)}
          footer={<><Btn small kind="ghost" onClick={() => setBorrarRx(null)}>Cancelar</Btn>
                   <Btn small kind="red" onClick={confirmarBorrado}><Trash2 size={15} strokeWidth={1.75} /> Eliminar</Btn></>}>
          <div style={{ fontSize: 13, color: "var(--dc-ink-700)", lineHeight: 1.6 }}>
            Se quita del expediente de <b style={{ color: NAVY }}>{paciente.nombre}</b> y <b>no se puede recuperar</b>.
            Si el estudio es correcto pero está mal clasificado, es mejor volver a subirlo con el tipo adecuado que borrarlo sin más.
          </div>
        </Modal>
      )}
      {visor && (() => { const esFoto = visor.tipo === "foto"; return (
        <Modal icon={esFoto ? <Camera size={20} strokeWidth={1.75} /> : <Scan size={20} strokeWidth={1.75} />} tone={NAVY} titulo={RX_TIPOS[visor.tipo]} sub={`${fechaLegible(visor.fecha)}${visor.sede ? " – " + nombreSede(visor.sede) : ""}`} onClose={() => setVisor(null)} maxW={620}
          footer={<><Btn small kind="ghost" onClick={() => setVisor(null)}>Cerrar</Btn><Btn small onClick={() => { if (visor.url) { const a = document.createElement("a"); a.href = visor.url; a.download = `${(RX_TIPOS[visor.tipo] || "estudio").replace(/\s+/g, "_")}_${visor.fecha || ""}.jpg`; document.body.appendChild(a); a.click(); a.remove(); } else notify("Este estudio no tiene imagen para descargar."); }}><Upload size={15} strokeWidth={1.75} /> Descargar</Btn></>}>
          <div style={{ height: 300, borderRadius: "var(--dc-r-lg)", background: esFoto ? "linear-gradient(135deg, var(--dc-ink-alt), var(--dc-navy))" : "radial-gradient(circle at 50% 40%, var(--dc-ink-700), var(--dc-ink-900))", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
            {visor.url ? <img src={visor.url} alt={RX_TIPOS[visor.tipo]} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : (esFoto ? <Camera size={54} strokeWidth={1.75} color="rgba(255,255,255,.5)" /> : <Scan size={54} strokeWidth={1.75} color="rgba(255,255,255,.55)" />)}
            <span style={{ position: "absolute", top: 12, left: 12, fontSize: 12, fontWeight: 500, color: "#fff", background: "rgba(0,0,0,.5)", padding: "4px 11px", borderRadius: "var(--dc-r-full)" }}>{RX_TIPOS[visor.tipo]}</span>
            {!visor.url && <span style={{ position: "absolute", bottom: 12, right: 12, fontSize: 12, color: "rgba(255,255,255,.7)" }}>Vista de demostración</span>}
          </div>
          {visor.nota && <div style={{ marginTop: 12, fontSize: 13, color: "var(--dc-ink-700)" }}>{visor.nota}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 14, fontSize: 13, color: "var(--dc-ink-400)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Calendar size={13} strokeWidth={1.75} color="var(--dc-ink-400)" /> {fechaLegible(visor.fecha)}</span>
            {visor.sede && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={13} strokeWidth={1.75} color="var(--dc-ink-400)" /> {nombreSede(visor.sede)}</span>}
          </div>
        </Modal>
      ); })()}
      {subiendo && (
        <Modal icon={<Upload size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Subir imagen al expediente" sub={`${paciente.nombre} – ${nombreSede(sedeReg)}`} onClose={() => setSubiendo(null)} maxW={560}
          footer={<><Btn small kind="ghost" onClick={() => setSubiendo(null)}>Cancelar</Btn><Btn small onClick={guardarEstudio}><Check size={15} strokeWidth={1.75} /> Guardar en el expediente</Btn></>}>
          <div style={{ borderRadius: "var(--dc-r-lg)", background: "var(--dc-ink-900)", display: "grid", placeItems: "center", overflow: "hidden", maxHeight: 300 }}>
            <img src={subiendo.url} alt="Previsualización" style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain", display: "block" }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--dc-ink-400)", margin: "8px 0 14px", display: "flex", alignItems: "center", gap: 6 }}><Camera size={13} strokeWidth={1.75} /> {subiendo.nombre}</div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Tipo de estudio</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {Object.entries(RX_TIPOS).filter(([k]) => !soloFotos || k === "foto").map(([k, l]) => { const on = subiendo.tipo === k; return (
              <button key={k} onClick={() => setSubiendo({ ...subiendo, tipo: k })} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: "var(--dc-r-md)", border: on ? "1.5px solid var(--dc-accent-cyan)" : "1.5px solid var(--dc-line)", background: on ? (tint(DS.c.primary, 0.078)) : "#fff", color: on ? DS.c.primary : "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{k === "foto" ? <Camera size={14} strokeWidth={1.75} /> : <Scan size={14} strokeWidth={1.75} />} {l}</button>
            ); })}
          </div>
          <Field label="Nota (opcional)" value={subiendo.nota} onChange={(v) => setSubiendo({ ...subiendo, nota: v })} placeholder="Ej. Control post-endodoncia pieza 36" />
        </Modal>
      )}
    </div>
  );
}

/* ===========================================================================
   APP PRINCIPAL
   =========================================================================== */
// Cada paso declara el módulo que necesita: quien no lo tiene, no ve el paso. Antes se
// enseñaban los cinco a todos, y quien lleva el sistema -que no tiene agenda, ni
// pacientes, ni caja- se quedaba mirando cinco tareas imposibles en "0/5" para siempre.
const PASOS_ONB = [
  { id: "cita", label: "Crear cita", desc: "Agenda la primera cita de la clínica", icon: CalendarCheck, target: "agenda" },
  { id: "paciente", label: "Crear paciente", desc: "Registra a un paciente nuevo", icon: UserPlus, target: "pacientes" },
  { id: "presupuesto", label: "Crear presupuesto", desc: "Arma un plan de tratamiento", icon: ClipboardList, target: "tratamientos" },
  { id: "pago", label: "Registrar un pago", desc: "Cobra un saldo en Caja", icon: CreditCard, target: "facturacion" },
  { id: "evolucion", label: "Registrar evolución", desc: "Anota en el odontograma / historia", icon: Smile, target: "odontograma" },
  // Los de sistemas: es por donde empieza quien administra la plataforma.
  { id: "usuario", label: "Dar de alta un usuario", desc: "Crea la cuenta de alguien del equipo", icon: UserPlus, target: "usuarios" },
  { id: "integracion", label: "Conectar una integración", desc: "WhatsApp, pagos o facturación electrónica", icon: Plug, target: "integraciones" },
];

/**
 * Avisa cuando el backend falla, para que nadie tome por suyos unos datos de ejemplo.
 *
 * Sin esto, un fallo del servidor deja al modulo con su respaldo de demostracion y no
 * hay forma de notarlo: fue exactamente lo que paso con Reportes para el administrador
 * de sede y el odontologo, que veian cifras inventadas sin saberlo.
 */
function AvisoBackend({ vista, onReintentar }) {
  const [fallo, setFallo] = useState(null);
  useEffect(() => alFallarPeticion((f) => setFallo(f)), []);

  // Al cambiar de módulo el aviso describía la pantalla anterior. Se limpia aquí y no
  // en un efecto para que no se pinte ni un frame con el mensaje equivocado.
  const vistaPrevia = useRef(vista);
  if (vistaPrevia.current !== vista) { vistaPrevia.current = vista; if (fallo) setFallo(null); }

  if (!fallo || !auth.token) return null;
  const esPermiso = fallo.estado === 403;
  const sinConexion = fallo.estado === 0;
  const esServidor = fallo.estado >= 500;
  const titulo = esPermiso
    ? "No tienes acceso a parte de esta pantalla."
    : sinConexion
      ? "Hubo un problema temporal de conexión."
      : esServidor
        ? "El servidor devolvió un error."
        : "Hubo un problema al cargar datos.";
  // CON-01: no afirmar que los datos son de ejemplo; con sesión los datos cargados son reales.
  const detalle = esPermiso
    ? "Algunas acciones pueden no estar disponibles para tu rol."
    : sinConexion
      ? "Una petición no respondió a tiempo (a veces por arranque del servidor). Los datos ya cargados en pantalla siguen siendo reales."
      : esServidor
        ? "La operación falló en el servidor; los datos ya cargados en pantalla siguen siendo reales."
        : "Revisa el mensaje e inténtalo de nuevo.";
  const reintentar = () => {
    setFallo(null);
    if (typeof onReintentar === "function") onReintentar();
    else window.dispatchEvent(new CustomEvent("dc-reintentar-vista"));
  };
  return (
    <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 12,
                  background: "var(--dc-danger-soft)", border: "1px solid var(--dc-danger-mid)", borderRadius: "var(--dc-r-md)" }}>
      <AlertTriangle size={17} strokeWidth={1.75} color="var(--dc-red)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--dc-danger-700)", lineHeight: 1.4 }}>
        <b>{titulo}</b>{" "}{detalle}
        <span style={{ color: "var(--dc-warn-600)" }}> ({fallo.estado || "sin conexión"} – {fallo.path})</span>
      </div>
      {!esPermiso && (
        <button type="button" onClick={reintentar}
          style={{ flexShrink: 0, minHeight: "var(--dc-tap-min)", padding: "8px 14px", borderRadius: "var(--dc-r-md)",
                   border: "1.5px solid var(--dc-danger-mid)", background: "#fff", color: "var(--dc-danger-700)",
                   fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          Reintentar
        </button>
      )}
      <button type="button" onClick={() => setFallo(null)} title="Descartar" aria-label="Descartar"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--dc-danger-700)",
                       fontSize: 14, lineHeight: 1, padding: 2, minWidth: 28, minHeight: 28 }}>×</button>
    </div>
  );
}

function MainApp({ usuario, setUsuario, onLogout }) {
  const globalStyles = "\n<style>{`\n  @keyframes dcBackdropFade {\n    from { opacity: 0; }\n    to { opacity: 1; }\n  }\n  @keyframes dcModalSlide {\n    from { opacity: 0; transform: translateY(8px) scale(0.985); }\n    to { opacity: 1; transform: translateY(0) scale(1); }\n  }\n  @keyframes dcTabSlide {\n    from { opacity: 0; transform: translateX(6px); }\n    to { opacity: 1; transform: translateX(0); }\n  }\n  @media (prefers-reduced-motion: reduce) {\n    * {\n      animation-duration: 0.01ms !important;\n      animation-iteration-count: 1 !important;\n      transition-duration: 0.01ms !important;\n      scroll-behavior: auto !important;\n    }\n  }\n`}</style>\n";
  const rol = usuario.rol;
  const R = ROLES[rol];
  // Sedes a las que pertenece este usuario (N:M). "all" = toda la cuenta.
  const misSedes = sedesDe(usuario);
  const multisede = usuario.sedes === "all" || misSedes.length > 1;
  const [sede, setSede] = useState(() => multisede ? "all" : (misSedes[0] ?? 1));
  const [agendarDesdeFicha, setAgendarDesdeFicha] = useState(null);
  const [cobroDesdeFicha, setCobroDesdeFicha] = useState(null);
  const [vista, setVistaRaw] = useState(() => {
    const base = modulosVisibles(ROL_PERMS[rol] || {});
    const fromHash = parseHash(typeof window !== "undefined" ? window.location.hash : "");
    if (fromHash.vista && base.includes(modDeVista(fromHash.vista))) return canonVista(fromHash.vista);
    const v = localStorage.getItem("dc_vista_" + rol);
    return v && base.includes(modDeVista(v)) ? v : (base[0] || "dashboard");
  });
  const setVista = (v, extra) => {
    const dest = (v === "fotos") ? "fotos" : canonVista(v);
    setVistaRaw(dest);
    irHash(dest, extra);
  };
  useEffect(() => { localStorage.setItem("dc_vista_" + rol, vista); }, [vista, rol]);
  const [citas, setCitas] = usePersist("citas", CITAS_INIT);
  const [pacientes, setPacientes] = usePersist("pacientes", PACIENTES_INIT);
  // Historia clínica ÚNICA y editable (antes era una constante estática): todos los
  // módulos clínicos leen y escriben aquí. Es la columna vertebral del proceso.
  const [fichas, setFichas] = usePersist("fichas", () => JSON.parse(JSON.stringify(FICHA_CLINICA)));
  const fichaDe = (pid) => fichas[pid] || {};
  const updFicha = (pid, patch) => setFichas((f) => { const cur = f[pid] || {}; const nx = typeof patch === "function" ? patch(cur) : { ...cur, ...patch }; return { ...f, [pid]: nx }; });
  const [espera, setEspera] = usePersist("espera", ESPERA_INIT);   // lista de espera compartida (P1-3)
  const [pacienteActivo, setPacienteActivo] = useState(null); // paciente en atención (P1-1)
  const [inventario, setInventario] = usePersist("inventario", INVENTARIO_INIT); // insumos (P2-1)
  // P2-1: al ejecutar/cobrar un procedimiento se descuentan los insumos usados.
  const consumirInsumos = (proc = "") => {
    const kit = ["Guantes de nitrilo (caja)", "Algodón en rollos", "Barbijos quirúrgicos"];
    if (/endodon|extrac|cirug|implante|corona/i.test(proc)) kit.push("Anestesia lidocaína 2%", "Agujas dentales cortas");
    if (/obtura|resina|reconstr/i.test(proc)) kit.push("Resina compuesta A2", "Ácido grabador 37%");
    setInventario((its) => its.map((x) => kit.some((k) => x.nombre === k || x.nombre.includes(k)) ? { ...x, stock: Math.max(0, x.stock - 1) } : x));
  };
  const [staff, setStaff] = usePersist("staff", STAFF_INIT);
  // Permisos por ROL a nivel de acción (defaults editables): { rol: { modId: [acciones] } }.
  // Es la base; cada usuario puede además tener un override individual (usuario.permisos).
  const [rolePerms, setRolePerms] = usePersist("permisos_v2", () => JSON.parse(JSON.stringify(ROL_PERMS)));
  // Migración aditiva: si se agregó un módulo/rol nuevo, aparece sin restablecer datos.
  useEffect(() => {
    setRolePerms((prev) => {
      let changed = false; const next = { ...prev };
      Object.keys(ROL_PERMS).forEach((r) => {
        if (!next[r]) { next[r] = JSON.parse(JSON.stringify(ROL_PERMS[r])); changed = true; return; }
        Object.keys(ROL_PERMS[r]).forEach((mod) => {
          if (!next[r][mod]) { next[r] = { ...next[r], [mod]: [...ROL_PERMS[r][mod]] }; changed = true; }
        });
      });
      return changed ? next : prev;
    });
  }, []); // eslint-disable-line
  // Onboarding "Primeros pasos"
  const [pasos, setPasos] = usePersist("onboarding", () => ({}));
  const [onbDismissed, setOnbDismissed] = usePersist("onboarding_dismissed", false);
  const [showPasos, setShowPasos] = useState(false);
  // Botón global "Crear"
  const [crearMenu, setCrearMenu] = useState(false);
  const [crearIntent, setCrearIntent] = useState(null); // "paciente" | "servicio"
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [colap, setColap] = usePersist("sidebar_colap", false);
  const [subAbierto, setSubAbierto] = useState({}); // submenús del sidebar abiertos (por etiqueta del padre)
  const [toast, setToast] = useState(null);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(null), 4200); };

  // Plan de membresía contratado por la clínica (demo: se puede cambiar en vivo desde "Mi plan").
  const esSuper = rol === "superadmin";
  const [plan, setPlan] = useState("mediana");
  // Horario de atención de la clínica (Configuración › Horario de atención). Se carga
  // una vez aquí y se reparte: manda sobre la capacidad del día en el dashboard y sobre
  // los días y horas que el odontólogo puede ofrecer. Sin sesión vale lo guardado en el
  // navegador, y si no hay nada, HORARIO_DEF.
  const [horarioClinica, setHorarioClinica] = usePersist("clinica_horario", () => ({ horario: {}, feriados: [] }));
  const [sedesOrg, setSedesOrg] = useState([]);
  useEffect(() => {
    if (!auth.token) {
      const local = localStorage.getItem("dc_plan");
      if (local && PLAN_MODULOS[local]) setPlan(local);
      return;
    }
    api.clinica.get().then((r) => {
      hydrateEmisor(r);
      setHorarioClinica({
        horario: (r?.horario && typeof r.horario === "object") ? r.horario : {},
        feriados: Array.isArray(r?.feriados) ? r.feriados : [],
      });
      const p = r?.plan === "cadena" ? "grande" : r?.plan;
      if (p && PLAN_MODULOS[p]) setPlan(p);
    }).catch(() => { /* sin respuesta se conserva lo que hubiera */ });
    api.sedes.listar().then((s) => {
      const list = s || [];
      setSedesOrg(list);
      setSedesCatalogo(list);
    }).catch(() => { setSedesOrg([]); setSedesCatalogo([]); });
  }, []); // eslint-disable-line
  useEffect(() => { if (!auth.token) localStorage.setItem("dc_plan", plan); }, [plan]);
  const planMods = PLAN_MODULOS[plan] || PLAN_MODULOS.mediana;
  // Un módulo está disponible si el rol lo permite Y el plan lo incluye. "plan" siempre disponible.
  const modAllowed = (id) => esSuper || id === "plan" || planMods.includes(id);

  // Permisos EFECTIVOS: en modo conectado manda el mapa del login/API (no localStorage).
  const conectado = !!auth.token || !!usuario?.conectado || !!usuario?.organizacionId;
  const effPerms = useMemo(() => {
    if (conectado && usuario?.permisos && typeof usuario.permisos === "object") {
      return usuario.permisos;
    }
    return permisosEfectivos(usuario, rolePerms);
  }, [usuario, rolePerms, conectado]);
  // Módulos visibles = los que tienen la acción "ver" habilitada.
  const mods = useMemo(() => modulosVisibles(effPerms), [effPerms]);
  useEffect(() => {
    const onHash = () => {
      const { vista: v, desconocida } = parseHash(window.location.hash);
      if (!v) return;
      const canon = canonVista(v);
      // NEW-34: hash mentiroso (#/sedes) → reescribir al destino efectivo.
      if (desconocida) {
        const dest = mods.find((m) => modAllowed(m)) || mods[0] || "dashboard";
        setVistaRaw(dest);
        irHash(dest);
        return;
      }
      const mod = modDeVista(canon);
      if (!mods.includes(mod)) {
        const dest = mods.find((m) => modAllowed(m)) || mods[0] || "dashboard";
        setVistaRaw(dest);
        irHash(dest);
        return;
      }
      if (!modAllowed(mod)) {
        setVistaRaw("plan");
        irHash("plan");
        notify(`“${canon}” se desbloquea desde el plan ${PLAN_NOMBRE[planMinimo(mod)]}.`);
        return;
      }
      setVistaRaw(canon);
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    if (!window.location.hash) irHash(vista);
    return () => window.removeEventListener("hashchange", onHash);
  }, [mods, plan]); // eslint-disable-line
  // DC-03: al cambiar de módulo, forzar scroll al inicio del contenido
  useEffect(() => {
    const main = document.getElementById("dc-main");
    const scroller = main && main.querySelector("[data-dc-scroll]");
    if (scroller) scroller.scrollTop = 0;
    else if (main) main.scrollTop = 0;
  }, [vista]);
  // Autorización granular por acción para el usuario en sesión.
  const can = useMemo(() => (mod, acc = "ver") => puede(effPerms, mod, acc), [effPerms]);
  const refreshMe = () => {
    if (!auth.token) return Promise.resolve();
    return api.me().then((r) => {
      if (!r?.permisos) return;
      setUsuario((u) => (u ? { ...u, nombre: r.nombre || u.nombre, rol: r.rol || u.rol, permisos: r.permisos, conectado: true } : u));
    }).catch(() => {});
  };
  // PERM-01: refrescar permisos al volver a la pestaña (sin forzar re-login).
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") refreshMe(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []); // eslint-disable-line
  // CON-01: Reintentar del banner remonta el módulo actual (sin location.reload).
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    const onRetry = () => setRetryTick((t) => t + 1);
    window.addEventListener("dc-reintentar-vista", onRetry);
    return () => window.removeEventListener("dc-reintentar-vista", onRetry);
  }, []);
  // Solo los primeros pasos que este rol puede completar. Con la lista entera, quien no
  // tiene el módulo veía la tarea en gris y nunca llegaba al 100%.
  const misPasos = PASOS_ONB.filter((p) => mods.includes(p.target) && can(p.target, "crear"));
  // Acciones del botón "Crear", cada una con el módulo que necesita. La de sistemas es
  // dar de alta un usuario; sin ella el desplegable le salía vacío.
  const ACCIONES_CREAR = [["cita", "Nueva cita", Calendar, "agenda", "Agenda un paciente", "#0E8C95"], ["paciente", "Nuevo paciente", UserPlus, "pacientes", "Crea su ficha", "#6D4FD1"],
                          ["servicio", "Nuevo servicio", ClipboardList, "servicios", "Tratamiento y precio", "#2563EB"], ["egreso", "Registrar egreso", Wallet, "facturacion", "Gasto de caja", "#D0563F"],
                          ["usuario", "Nuevo usuario", UserPlus, "usuarios", "Acceso para el equipo", "#B7791F"]];
  const hayQueCrear = ACCIONES_CREAR.some(([, , , t]) => mods.includes(t) && can(t, "crear"));
  // Si el módulo abierto deja de estar permitido (rol/permiso o plan), redirige al primero disponible.
  useEffect(() => {
    if (!mods.length) return;
    const mod = modDeVista(vista);
    if (!mods.includes(mod) || !modAllowed(mod)) {
      const dest = mods.find((m) => modAllowed(m)) || mods[0];
      if (dest) setVista(dest);
    }
  }, [mods, vista, plan]);

  // ── Notificación de mensajes nuevos de WhatsApp (badge + toast + sonido) ──
  const [waUnread, setWaUnread] = useState(0);
  const waPrevRef = useRef(null);
  // Audio compartido: los navegadores bloquean el sonido hasta que el usuario
  // interactúa. Creamos un único AudioContext y lo "desbloqueamos" al primer clic.
  const audioCtxRef = useRef(null);
  const getAudio = () => { try { if (!audioCtxRef.current) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; audioCtxRef.current = new AC(); } return audioCtxRef.current; } catch (e) { return null; } };
  useEffect(() => {
    const unlock = () => { const a = getAudio(); if (a && a.state === "suspended") a.resume().catch(() => {}); };
    window.addEventListener("click", unlock); window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("click", unlock); window.removeEventListener("keydown", unlock); };
  }, []);
  const beep = () => {
    const a = getAudio(); if (!a) return;
    try {
      if (a.state === "suspended") a.resume();
      const doble = (freq, t0) => { const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.type = "sine"; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18); o.start(t0); o.stop(t0 + 0.2); };
      doble(880, a.currentTime); doble(1175, a.currentTime + 0.14);   // dos tonos, tipo notificación
    } catch (e) {}
  };
  // Pide permiso de notificaciones del navegador una vez (si el rol usa WhatsApp).
  useEffect(() => {
    if (auth.token && mods.includes("whatsapp") && "Notification" in window && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch (e) {}
    }
    // eslint-disable-next-line
  }, [mods]);
  useEffect(() => {
    if (!auth.token || !mods.includes("whatsapp")) return;
    // WA-16: en vista WhatsApp el inbox ya hace poll; no duplicar /conversaciones.
    if (vista === "whatsapp") return;
    let cancel = false;
    const tick = () => api.conversaciones.listar().then((cv) => {
      if (cancel) return;
      const lista = cv || [];
      setWaUnread(lista.reduce((s, c) => s + (c.porResponder || 0), 0));
      // Avisa cuando ENTRA un mensaje nuevo del paciente (aunque la IA lo responda solo).
      let maxE = "", nueva = null;
      for (const c of lista) { if (c.ultimoEntranteEn && c.ultimoEntranteEn > maxE) { maxE = c.ultimoEntranteEn; nueva = c; } }
      const prev = waPrevRef.current;
      if (prev != null && maxE && maxE > prev) {
        const quien = nueva && nueva.nombreContacto ? nueva.nombreContacto : "un paciente";
        notify(`💬 Nuevo mensaje de WhatsApp de ${quien}.`);
        beep();
        if ("Notification" in window && Notification.permission === "granted") {
          try { new Notification("💬 WhatsApp — " + quien, { body: nueva && nueva.ultimoMensaje ? nueva.ultimoMensaje : "Nuevo mensaje", tag: "dc-wa" }); } catch (e) {}
        }
      }
      if (maxE) waPrevRef.current = maxE; else if (prev == null) waPrevRef.current = "";
    }).catch(() => {});
    tick();
    const t = setInterval(tick, 30000);
    return () => { cancel = true; clearInterval(t); };
    // eslint-disable-next-line
  }, [mods, vista]);

  // Filtrado por sede: "all" = todas las sedes del usuario; si no, la sede activa.
  const cf = useMemo(() => { const ids = sede === "all" ? misSedes : [sede]; return citas.filter((c) => ids.includes(c.sede)); }, [citas, sede]);
  const pf = useMemo(() => { const ids = sede === "all" ? misSedes : [sede]; return pacientes.filter((p) => sedesDe(p).some((s) => ids.includes(s))); }, [pacientes, sede]);

  // Geolocalización: detecta la sede más cercana y la propone como "sede activa" para
  // registrar (cita, examen, tratamiento). Siempre editable: el usuario puede estar
  // físicamente en una sede pero trabajando para otra.
  const [sedeDetectada, setSedeDetectada] = useState(null);
  const [geoEstado, setGeoEstado] = useState("idle"); // idle | buscando | ok | error
  const detectarSede = () => {
    if (!navigator.geolocation) { notify("Tu navegador no permite geolocalización."); return; }
    setGeoEstado("buscando");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const cand = SEDES.filter((s) => misSedes.includes(s.id));
        const near = sedeMasCercana(pos.coords.latitude, pos.coords.longitude, cand.length ? cand : SEDES);
        if (near) { setSedeDetectada(near.s.id); setSede(near.s.id); setGeoEstado("ok"); notify(`Estás a ${near.d.toFixed(1)} km de ${near.s.nombre}. La marqué como sede activa; puedes cambiarla.`); }
        else setGeoEstado("error");
      },
      () => { setGeoEstado("error"); notify("No pudimos obtener tu ubicación. Elige la sede manualmente."); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };
  // Sede concreta donde se registran las cosas nuevas (nunca "all").
  const sedeActiva = sede === "all" ? (sedeDetectada ?? misSedes[0] ?? 1) : sede;

  const onAgendarIA = () => { setCitas((cs) => [...cs, { id: Date.now(), paciente: "Nuevo (vía IA)", dni: "00000000", medicoId: 1, esp: 1, sede: sedeActiva, fecha: fmt(hoy), hora: "16:30", motivo: "Agendado por agente IA", estado: "confirmada", llegada: false }]); notify(`El agente IA agendó una cita en ${nombreSede(sedeActiva)}.`); };

  // P1-1: iniciar atención → abre el espacio clínico del paciente de esa cita.
  const atenderCita = (cita) => {
    const pac = pacientes.find((p) => p.dni === cita.dni) || pacientes.find((p) => p.nombre === cita.paciente);
    if (pac) setPacienteActivo(pac.id);
    setVista("odontograma");
    notify(`Atención iniciada con ${cita.paciente}.`);
  };
  // P1-3: al cancelar una cita, ofrece el cupo al primer paciente compatible de la lista de espera.
  const ofrecerCupo = (cita) => {
    const espNom = ESPECIALIDADES.find((e) => e.id === cita.esp)?.nombre;
    const target = espera.find((x) => !x.ofrecido.some((o) => o.includes("hoy")) && (x.e === espNom || x.e === "Odontología general" || x.medico === "Cualquiera"));
    if (target) { setEspera((es) => es.map((x) => x.id === target.id ? { ...x, ofrecido: [...x.ofrecido, `Cupo ${cita.hora} ofrecido hoy`] } : x)); notify(`Cupo liberado ofrecido a ${target.n} (lista de espera) por WhatsApp.`); }
    else notify("Cupo liberado. No hay pacientes compatibles en la lista de espera.");
  };

  // NAV-01 (Excel 08/09/2026 + revision2): Lista de espera y Comisiones top-level si hay permiso.
  const NAV_GRUPOS = [
    { grupo: "General", items: [
      { id: "plataforma", label: "Plataforma (clínicas)", icon: Globe },
      { id: "gerencial", label: "Dashboard gerencial", icon: BarChart3 },
      { label: "Producción y comisiones", icon: TrendingUp, children: [
        { id: "reportes", label: "Resumen", mod: "reportes" },
        { id: "reportes_aus", label: "Ausentismo", mod: "reportes" },
      ] },
      // NAV-11: #/comisiones es alias de reportes (sin segunda entrada de menú)
    ] },
    { grupo: "Atención", items: [
      { id: "dashboard", label: "Pendientes de hoy", icon: LayoutDashboard },
      { id: "whatsapp", label: "WhatsApp + IA", icon: MessageSquare, tag: "IA" },
      { label: "Agenda", icon: Calendar, children: [
        { id: "agenda", label: "Hoy", mod: "agenda" },
        { id: "agenda_cal", label: "Calendario", mod: "agenda" },
      ] },
      { id: "espera", label: "Lista de espera", icon: Bell },
      { id: "disponibilidad", label: "Mi disponibilidad", icon: Clock },
      { label: "Recordatorios", icon: BellRing, children: [
        { id: "recall", label: "Automatizaciones", mod: "recall" },
        { id: "recall_hist", label: "Historial de envíos", mod: "recall" },
        { id: "recall_sat", label: "Satisfacción", mod: "recall" },
      ] },
      { id: "formularios", label: "Formularios", icon: ClipboardList },
      { id: "resenas", label: "Reseñas", icon: Star },
    ] },
    { grupo: "Clínico", items: [
      { id: "pacientes", label: "Pacientes", icon: Users },
      { id: "odontograma", label: "Odontograma", icon: Smile },
      { id: "perio", label: "Periodontograma", icon: HeartPulse },
      { id: "tratamientos", label: "Tratamientos", icon: ClipboardList },
      { id: "recetas", label: "Recetas", icon: Pill },
      { id: "consentimientos", label: "Consentimientos", icon: ShieldPlus },
      { id: "radiografias", label: "Radiografías", icon: Scan },
    ] },
    { grupo: "Operaciones", items: [
      { id: "servicios", label: "Servicios", icon: ClipboardList },
      { label: "Inventario", icon: Package, children: [
        { id: "inventario", label: "Productos", mod: "inventario" },
        { id: "inventario_compras", label: "Compras", mod: "inventario" },
        { id: "inventario_consumo", label: "Consumo", mod: "inventario" },
        { id: "inventario_prov", label: "Proveedores", mod: "inventario" },
      ] },
      { id: "laboratorio", label: "Laboratorio", icon: FlaskConical },
    ] },
    { grupo: "Finanzas", items: [
      { label: "Caja", icon: CreditCard, children: [
        { id: "facturacion", label: "Cobros", mod: "facturacion" },
        { id: "caja_apertura", label: "Apertura", mod: "facturacion" },
        { id: "caja_cierre", label: "Cierre del día", mod: "facturacion" },
        { id: "caja_historial", label: "Historial", mod: "facturacion" },
        ...(can("facturacion", "ver") ? [{ id: "caja_movimientos", label: "Ingresos y egresos", mod: "facturacion" }] : []),
        { id: "caja_links", label: "Links de pago", mod: "facturacion" },
      ] },
      { id: "metas", label: "Metas de producción", icon: Target },
      { id: "seguros", label: "Seguros y EPS", icon: Umbrella },
      { id: "miproduccion", label: "Mi producción", icon: TrendingUp },
    ] },
    { grupo: "Administración", items: [
      { id: "plan", label: "Mi plan", icon: CreditCard },
      { id: "usuarios", label: "Usuarios", icon: UserCog },
      { id: "permisos", label: "Permisos por rol", icon: Shield },
      { id: "integraciones", label: "Integraciones", icon: Plug },
      // Faltaba la entrada: la pantalla existía, el permiso existía y el backend
      // también, pero no había dónde pulsar para abrirla.
      { id: "config", label: "Configuración", icon: Settings },
      { id: "auditoria", label: "Auditoría y accesos", icon: ShieldCheck },
    ] },
  ].map((g) => ({
    ...g,
    items: g.items
      .map((it) => (it.children ? { ...it, children: it.children.filter((c) => mods.includes(c.mod)) } : it))
      .filter((it) => (it.children ? it.children.length > 0 : mods.includes(modDeVista(it.id)))),
  })).filter((g) => g.items.length);
  const NAV = NAV_GRUPOS.flatMap((g) => g.items.flatMap((it) => it.children ? it.children : [it]));

  const sedesDelSelector = useMemo(() => {
    // Con API: UUIDs reales. Sin API: ids demo 1/2.
    if (auth.token && sedesOrg.length) {
      const mine = misSedes.map(String);
      const todas = sedesOrg.map((s) => ({
        id: s.id,
        nombre: s.nombre || "Sede",
      }));
      if (usuario.sedes === "all") return todas;
      const filtradas = todas.filter((s) => mine.includes(String(s.id)));
      return filtradas.length ? filtradas : todas;
    }
    return SEDES.filter((s) => misSedes.includes(s.id) || misSedes.map(Number).includes(s.id));
  }, [auth.token, sedesOrg, misSedes, usuario.sedes]);

  const etiquetaSedeActiva = useMemo(() => {
    if (sede === "all") return usuario.sedes === "all" ? "Todas las sedes" : "Todas mis sedes";
    const hit = sedesDelSelector.find((s) => String(s.id) === String(sede));
    if (hit?.nombre) return hit.nombre;
    // Fallback demo numérico
    const demo = nombreSede(sede);
    return demo && demo !== "—" ? demo : (sedesOrg[0]?.nombre || "Sede");
  }, [sede, sedesDelSelector, usuario.sedes, sedesOrg]);

  const orgUnaSede = auth.token ? (sedesOrg.length > 0 ? sedesOrg.length === 1 : false) : false;
  const puedeMultisede = multisede && !esSuper && !orgUnaSede && sedesDelSelector.length > 1;

  const irCaja = (t) => setVista({ cobros: "facturacion", apertura: "caja_apertura", cierre: "caja_cierre", historial: "caja_historial", movimientos: "caja_movimientos", links: "caja_links" }[t] || "facturacion");
  const irInventario = (t) => setVista({ productos: "inventario", compras: "inventario_compras", consumo: "inventario_consumo", proveedores: "inventario_prov" }[t] || "inventario");
  const render = () => {
    switch (vista) {
      case "plataforma": return <Plataforma notify={notify} />;
      case "gerencial": return <Gerencial citas={cf} sede={sede} />;
      case "reportes": return <Reportes citas={cf} can={can} />;
      case "reportes_aus": return <Reportes citas={cf} can={can} tab="ausencias" />;
      case "servicios": return <Servicios notify={notify} can={can} crearIntent={crearIntent === "servicio"} onIntentDone={() => setCrearIntent(null)} />;
      case "dashboard": return <Dashboard citas={cf} pacientes={pf} rol={rol} notify={notify} onIr={setVista} horarioClinica={horarioClinica} sedeActiva={sede} />;
      case "whatsapp": return <WhatsAppInbox onAgendar={onAgendarIA} notify={notify} />;
      case "agenda": return <Agenda key="agenda-dia" vistaInicial="dia" citas={cf} setCitas={setCitas} medicos={MEDICOS} rol={rol} can={can} usuario={usuario} notify={notify} onAtender={atenderCita} ofrecerCupo={ofrecerCupo} fichas={fichas} esperaState={espera} setEspera={setEspera} pacientes={pf} setPacientes={setPacientes} onIrEspera={() => setVista("espera")} agendarDesdeFicha={agendarDesdeFicha} onAgendarDesdeFichaDone={() => setAgendarDesdeFicha(null)} crearIntent={crearIntent === "cita"} onIntentDone={() => setCrearIntent(null)} sedeActiva={sedeActiva} />;
      case "agenda_cal": return <Agenda key="agenda-cal" vistaInicial="calendario" citas={cf} setCitas={setCitas} medicos={MEDICOS} rol={rol} can={can} usuario={usuario} notify={notify} onAtender={atenderCita} ofrecerCupo={ofrecerCupo} fichas={fichas} esperaState={espera} setEspera={setEspera} pacientes={pf} setPacientes={setPacientes} onIrEspera={() => setVista("espera")} agendarDesdeFicha={agendarDesdeFicha} onAgendarDesdeFichaDone={() => setAgendarDesdeFicha(null)} crearIntent={crearIntent === "cita"} onIntentDone={() => setCrearIntent(null)} sedeActiva={sedeActiva} />;
      case "disponibilidad": return <Disponibilidad notify={notify} usuario={usuario} citas={citas} setCitas={setCitas} horarioClinica={horarioClinica} />;
      case "pacientes": return <PacientesView pacientes={pf} setPacientes={setPacientes} fichas={fichas} updFicha={updFicha} notify={notify} can={can} rol={rol} sedeIds={sede === "all" ? misSedes : [sede]} crearIntent={crearIntent === "paciente"} onIntentDone={() => setCrearIntent(null)}
        onAgendarPaciente={(pac) => { setAgendarDesdeFicha({ pacienteId: pac.id, motivo: "Consulta" }); setVista("agenda"); }}
        onCobrarPaciente={(pac) => { setCobroDesdeFicha({ pid: pac.id, nombre: pac.nombre }); setVista("caja"); }} />;
      case "odontograma": return <Odontograma pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} pacienteActivo={pacienteActivo} sedeActiva={sedeActiva} can={can} rol={rol} />;
      case "tratamientos": return <Tratamientos pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} can={can} pacienteActivo={pacienteActivo} consumirInsumos={consumirInsumos} />;
      case "recetas": return <Recetas pacientes={pf} notify={notify} updFicha={updFicha} />;
      case "consentimientos": return <Consentimientos pacientes={pf} notify={notify} />;
      case "inventario": return <Inventario key="inv-productos" notify={notify} can={can} items={inventario} setItems={setInventario} onTab={irInventario} />;
      case "inventario_compras": return <Inventario key="inv-compras" tabInicial="compras" notify={notify} can={can} items={inventario} setItems={setInventario} onTab={irInventario} />;
      case "inventario_consumo": return <Inventario key="inv-consumo" tabInicial="consumo" notify={notify} can={can} items={inventario} setItems={setInventario} onTab={irInventario} />;
      case "inventario_prov": return <Inventario key="inv-prov" tabInicial="proveedores" notify={notify} can={can} items={inventario} setItems={setInventario} onTab={irInventario} />;
      case "laboratorio": return <Laboratorio pacientes={pf} notify={notify} can={can} updFicha={updFicha} />;
      case "perio": return <Periodontograma pacientes={pf} />;
      case "radiografias": return <Radiografias pacientes={pf} notify={notify} sedeActiva={sedeActiva} misSedes={misSedes} can={can} />;
      case "fotos": return <Radiografias pacientes={pf} notify={notify} sedeActiva={sedeActiva} misSedes={misSedes} can={can} soloFotos />;
      case "recall": return <Recall pacientes={pf} notify={notify} can={can} setCitas={setCitas} sedeActiva={sedeActiva} />;
      case "recall_hist": return <Recall pacientes={pf} notify={notify} can={can} setCitas={setCitas} sedeActiva={sedeActiva} tab="historial" />;
      case "recall_sat": return <Recall pacientes={pf} notify={notify} can={can} setCitas={setCitas} sedeActiva={sedeActiva} tab="satisfaccion" />;
      case "formularios": return <Formularios pacientes={pf} notify={notify} />;
      case "seguros": return <Seguros notify={notify} pacientes={pf} fichas={fichas} />;
      case "resenas": return <Resenas notify={notify} can={can} citas={cf} />;
      case "plan": return <Plan notify={notify} plan={plan} setPlan={setPlan} esSuper={esSuper} can={can} />;
      case "espera": return <Espera notify={notify} esp={espera} setEsp={setEspera} />;
      case "tickets": return <Tickets citas={cf} setCitas={setCitas} fichas={fichas} notify={notify} />;
      case "facturacion": return <Facturacion key="caja" tab="cobros" onTab={irCaja} pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} consumirInsumos={consumirInsumos} rol={rol} can={can} sedeActiva={sedeActiva} sedeFiltro={sede} misSedes={misSedes} cobroDesdeFicha={cobroDesdeFicha} onCobroDesdeFichaDone={() => setCobroDesdeFicha(null)} />;
      case "caja_apertura": return <Facturacion key="caja" tab="apertura" onTab={irCaja} pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} consumirInsumos={consumirInsumos} rol={rol} can={can} sedeActiva={sedeActiva} sedeFiltro={sede} misSedes={misSedes} cobroDesdeFicha={cobroDesdeFicha} onCobroDesdeFichaDone={() => setCobroDesdeFicha(null)} />;
      case "caja_cierre": return <Facturacion key="caja" tab="cierre" onTab={irCaja} pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} consumirInsumos={consumirInsumos} rol={rol} can={can} sedeActiva={sedeActiva} sedeFiltro={sede} misSedes={misSedes} cobroDesdeFicha={cobroDesdeFicha} onCobroDesdeFichaDone={() => setCobroDesdeFicha(null)} />;
      case "caja_historial": return <Facturacion key="caja" tab="historial" onTab={irCaja} pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} consumirInsumos={consumirInsumos} rol={rol} can={can} sedeActiva={sedeActiva} sedeFiltro={sede} misSedes={misSedes} cobroDesdeFicha={cobroDesdeFicha} onCobroDesdeFichaDone={() => setCobroDesdeFicha(null)} />;
      case "caja_movimientos": return <Facturacion key="caja" tab="movimientos" onTab={irCaja} pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} consumirInsumos={consumirInsumos} rol={rol} can={can} sedeActiva={sedeActiva} sedeFiltro={sede} misSedes={misSedes} cobroDesdeFicha={cobroDesdeFicha} onCobroDesdeFichaDone={() => setCobroDesdeFicha(null)} />;
      case "caja_links": return <Facturacion key="caja" tab="links" onTab={irCaja} pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} consumirInsumos={consumirInsumos} rol={rol} can={can} sedeActiva={sedeActiva} sedeFiltro={sede} misSedes={misSedes} cobroDesdeFicha={cobroDesdeFicha} onCobroDesdeFichaDone={() => setCobroDesdeFicha(null)} />;
      case "caja": return <Facturacion pacientes={pf} fichas={fichas} updFicha={updFicha} notify={notify} consumirInsumos={consumirInsumos} rol={rol} can={can} sedeActiva={sedeActiva} sedeFiltro={sede} misSedes={misSedes} cobroDesdeFicha={cobroDesdeFicha} onCobroDesdeFichaDone={() => setCobroDesdeFicha(null)} />;
      case "metas": return <Metas notify={notify} can={can} />;
      // Alias históricos → misma pantalla Producción y comisiones (2 pestañas).
      case "comisiones": return <Reportes citas={cf} can={can} />;
      case "miproduccion": return <MiProduccion usuario={usuario} citas={citas} />;
      case "integraciones": return <Integraciones notify={notify} />;
      case "config": return <Configuracion notify={notify} rol={rol} can={can} />;
      case "usuarios": return <GestionUsuarios staff={staff} setStaff={setStaff} notify={notify} rolePerms={rolePerms} usuarioActual={usuario} can={can} />;
      case "permisos": return <GestionPermisos rolePerms={rolePerms} setRolePerms={setRolePerms} notify={notify} onRefreshMe={refreshMe} />;
      case "auditoria": return <Auditoria />;
      default: return null;
    }
  };

  const RolIcon = R.icon;
  return (
    <div className="dc-shell" style={{ display: "flex", height: "100vh", overflow: "hidden", background: BG, fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }}>
      <a href="#dc-main" style={{ position: "absolute", left: -9999, top: 0, zIndex: 200, padding: "10px 14px", background: NAVY, color: "#fff", fontWeight: 500, borderRadius: "var(--dc-r-sm)" }}
         onFocus={(e) => { e.currentTarget.style.left = "12px"; e.currentTarget.style.top = "12px"; }}
         onBlur={(e) => { e.currentTarget.style.left = "-9999px"; e.currentTarget.style.top = "0"; }}>Saltar al contenido</a>
      <aside className={`dc-side dc-sb${colap ? " is-colap" : ""}${sidebarOpen ? " open" : ""}`}>
        <div className="dc-sb__brand">
          <button type="button" className="dc-sb__logo" aria-label={colap ? "Expandir menú" : "Contraer menú"} title={colap ? "Expandir menú" : "Contraer menú"} onClick={() => setColap((c) => !c)}>
            <span className="dc-sb__mark"><Smile size={18} strokeWidth={2} color="#fff" /></span>
            {!colap && <span className="dc-sb__name"><span>Dento <b>Check</b></span><small>Sonríe+</small></span>}
          </button>
          {rol !== "superadmin" && hayQueCrear && (
            <button type="button" className="dc-sb__mas" aria-label="Crear" title="Crear: cita, paciente, servicio…" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCrearMenu((v) => (v ? false : { top: r.bottom + 8, left: Math.max(8, r.left - (colap ? 0 : 180)) })); }}><Plus size={16} strokeWidth={2.25} /></button>
          )}
        </div>
        <div className={`dc-sb__acc${colap ? " is-colap" : ""}`}>
            {crearMenu && (<>
              <div onClick={() => setCrearMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 140 }} />
              <div className="dc-sb__crearmenu" role="menu" style={{ top: crearMenu.top, left: crearMenu.left }}>
                <div className="dc-sb__crearmenu-tit">Crear nuevo</div>
                {ACCIONES_CREAR.filter(([, , , t]) => mods.includes(t) && can(t, "crear")).map(([k, l, Ic, t, sub, col]) => (
                  <button key={k} type="button" role="menuitem" style={{ "--c": col }} onClick={() => { setCrearMenu(false); setVista(t); setSidebarOpen(false); if (k === "paciente" || k === "servicio" || k === "cita") setCrearIntent(k); }}><span className="dc-sb__crearico"><Ic size={16} strokeWidth={1.9} /></span><span className="dc-sb__creartxt"><b>{l}</b><small>{sub}</small></span></button>
                ))}
              </div>
            </>)}
            {colap ? (puedeMultisede && <button type="button" className="dc-sb__crear dc-sb__crear--sede" aria-label="Cambiar sede" title={`Sede: ${etiquetaSedeActiva}`} onClick={() => setColap(false)}><MapPin size={16} strokeWidth={1.75} /></button>) : (
            <div className="dc-sb__sedefila">
          {puedeMultisede ? (
            <>
              {/* Llevaba fondo var(--dc-bg) y ningun borde sobre una cabecera casi blanca: 1,07:1 de
                  contraste de superficie, o sea invisible como control. El boton de al lado si
                  tiene borde, y por eso se veia uno y el otro no. Ahora los dos igual. */}
              <div className="dc-sb__sede" title="Sede activa"><MapPin size={15} strokeWidth={1.75} color={sedeDetectada && String(sede) === String(sedeDetectada) ? "var(--dc-ok-700)" : "var(--dc-ink-500)"} /><Select small ariaLabel="Sede activa" value={sede} onChange={(v) => {
                if (v === "all") { setSede("all"); return; }
                // UUID de API: no Number()
                setSede(typeof v === "string" && v.includes("-") ? v : Number(v));
              }} options={[...sedesDelSelector.map((s) => ({ value: s.id, label: `${s.nombre}${sedeDetectada != null && String(sedeDetectada) === String(s.id) ? " – aquí" : ""}` })), { value: "all", label: usuario.sedes === "all" ? "Todas las sedes" : "Todas mis sedes" }]} /></div>
              {/* Bug D12 re-test: Ocultar botón "Detectar mi sede" cuando solo tiene 1 sede */}
              {sedesDelSelector.length > 1 && (
                <button type="button" onClick={detectarSede} className="dc-sb__gps" aria-label={geoEstado === "buscando" ? "Ubicando…" : geoEstado === "ok" ? "Ubicación detectada" : "Detectar mi sede"} title={geoEstado === "ok" ? "Ubicación detectada" : "Detectar mi sede por ubicación (siempre puedes cambiarla)"} style={{ color: geoEstado === "ok" ? "var(--dc-ok-700)" : undefined }}><Navigation size={16} strokeWidth={1.75} /></button>
              )}
            </>
          ) : rol === "superadmin" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: DS.c.primary, fontSize: 13, fontWeight: 500 }}><Globe size={15} strokeWidth={1.75} /> Plataforma global – AWG</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--dc-ink-700)", fontSize: 13, fontWeight: 500 }}><MapPin size={15} strokeWidth={1.75} color={NAVY} /> {etiquetaSedeActiva}</div>
          )}
            </div>
            )}
        </div>
        <nav className="dc-sb__nav" aria-label="Módulos">
          {NAV_GRUPOS.map((g) => (
            <div key={g.grupo} className="dc-sb__grupo">
              {NAV_GRUPOS.length > 1 && !colap && <div className="dc-sb__titulo">{g.grupo}</div>}
              {g.items.map((it) => {
                if (it.children) {
                  const Icon = it.icon;
                  const algunActivo = it.children.some((c) => c.id === vista);
                  if (colap) {
                    return (
                      <button type="button" key={it.label} className={`dc-sb__item${algunActivo ? " is-on" : ""}`} aria-label={it.label} title={it.label} onClick={() => { setVista(it.children[0].id); setSidebarOpen(false); }}>
                        <Icon size={18} strokeWidth={1.75} />
                      </button>
                    );
                  }
                  const abierto = subAbierto[it.label] ?? algunActivo;
                  return (
                    <div key={it.label}>
                      <button type="button" className={`dc-sb__item${algunActivo && !abierto ? " is-on" : ""}`} aria-expanded={abierto} onClick={() => {
                          const next = !abierto;
                          setSubAbierto((s) => ({ ...s, [it.label]: next }));
                          // DC-03: primer clic también navega al primer hijo desbloqueado
                          if (next && !algunActivo) {
                            const dest = it.children.find((c) => modAllowed(c.mod));
                            if (dest) { setVista(dest.id); setSidebarOpen(false); }
                          }
                        }}>
                        <Icon size={18} strokeWidth={1.75} />
                        <span className="dc-sb__label">{it.label}</span>
                        <ChevronDown size={15} strokeWidth={1.75} className="dc-sb__chev" style={{ transform: abierto ? "none" : "rotate(-90deg)" }} />
                      </button>
                      {abierto && <div className="dc-sb__sub">{it.children.map((c) => { const locked = !modAllowed(c.mod); const active = vista === c.id && !locked; return (
                        <button type="button" key={c.id} className={`dc-sb__subitem${active ? " is-on" : ""}${locked ? " is-locked" : ""}`} aria-current={active ? "page" : undefined} title={locked ? `Disponible desde el plan ${PLAN_NOMBRE[planMinimo(c.mod)]}` : c.label} onClick={() => { if (locked) { setVista("plan"); notify(`“${c.label}” se desbloquea desde el plan ${PLAN_NOMBRE[planMinimo(c.mod)]}.`); } else { setVista(c.id); } setSidebarOpen(false); }}>
                          <span className="dc-sb__label">{c.label}</span>
                          {locked && <Lock size={12} strokeWidth={1.75} />}
                        </button>
                      ); })}</div>}
                    </div>
                  );
                }
                const Icon = it.icon; const locked = !modAllowed(modDeVista(it.id)); const active = vista === it.id && !locked; return (
                <button type="button" key={it.id} className={`dc-sb__item${active ? " is-on" : ""}${locked ? " is-locked" : ""}`} aria-label={colap ? it.label : undefined} title={locked ? `Disponible desde el plan ${PLAN_NOMBRE[planMinimo(it.id)]}` : it.label} aria-current={active ? "page" : undefined} onClick={() => { if (locked) { setVista("plan"); notify(`“${it.label}” se desbloquea desde el plan ${PLAN_NOMBRE[planMinimo(it.id)]}.`); } else { setVista(it.id); } setSidebarOpen(false); }}>
                  <span className="dc-sb__ico"><Icon size={18} strokeWidth={1.75} />{colap && it.id === "whatsapp" && waUnread > 0 && <span className="dc-sb__dot" />}</span>
                  {!colap && <>
                    <span className="dc-sb__label">{it.label}</span>
                    {it.id === "whatsapp" && waUnread > 0 && <span className="dc-sb__count" title="Mensajes por responder">{waUnread}</span>}
                    {locked ? <Lock size={13} strokeWidth={1.75} /> : it.tag && <span className="dc-sb__tag">{it.tag}</span>}
                  </>}
                </button>
              ); })}
            </div>
          ))}
        </nav>
        <div className="dc-sb__pie">
            {rol !== "superadmin" && !onbDismissed && misPasos.length > 0 && (() => { const done = misPasos.filter((p) => pasos[p.id]).length; if (done >= misPasos.length) return null; return (
              <div className="dc-sb__onb">
                <button type="button" onClick={() => setShowPasos(true)} title="Tus tareas de primeros pasos (el checklist de la clínica está en Configuración)">
                  <span className="dc-sb__onbnum">{done}/{misPasos.length}</span>{!colap && " Primeros pasos"}
                </button>
                <button type="button" className="dc-mini-btn dc-sb__onbx" aria-label="Ocultar primeros pasos" title="Ocultar primeros pasos" onClick={(e) => { e.stopPropagation(); setOnbDismissed(true); }}><X size={14} strokeWidth={2} /></button>
              </div>
            ); })()}
          {!esSuper && (mods.includes("plan") ? (
            <button type="button" className="dc-sb__plan" title={`Plan ${PLAN_NOMBRE[plan]}`} aria-label={`Plan ${PLAN_NOMBRE[plan]}`} onClick={() => { setVista("plan"); setSidebarOpen(false); }}>
              <Crown size={15} strokeWidth={1.75} />{!colap && <><span>Plan <b>{PLAN_NOMBRE[plan]}</b></span><ChevronRight size={14} strokeWidth={1.75} /></>}
            </button>
          ) : (
            <div className="dc-sb__plan" title={`Plan ${PLAN_NOMBRE[plan]}`}><Crown size={15} strokeWidth={1.75} />{!colap && <span>Plan <b>{PLAN_NOMBRE[plan]}</b></span>}</div>
          ))}
          <div className="dc-sb__user">
            <div className="dc-sb__avatar" title={usuario.nombre} style={{ background: R.color }}>{usuario.nombre.split(" ").map((x) => x[0]).join("").slice(0, 2)}</div>
            {!colap && <div className="dc-sb__who"><div className="dc-sb__uname">{usuario.nombre}</div><div className="dc-sb__urol">{R.label}</div></div>}
            <button type="button" className="dc-icon-btn dc-sb__out" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}><LogOut size={16} strokeWidth={1.75} /></button>
          </div>
          {!colap && !auth.token && !usuario?.conectado && <button type="button" className="dc-sb__reset" onClick={() => { if (confirm("¿Restablecer los datos de demostración? Se perderán los cambios guardados en este navegador.")) { Object.keys(localStorage).filter((k) => k.startsWith("dc_data_")).forEach((k) => localStorage.removeItem(k)); location.reload(); } }} title="Volver a los datos de demo"><Repeat size={13} strokeWidth={1.75} /> Restablecer datos de demo</button>}
        </div>
      </aside>

      <main id="dc-main" style={{ flex: 1, minWidth: 0, height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Solo en celular: botón del menú y nombre de la vista. En escritorio la vista
            ya se ve marcada en el menú lateral y la barra se quitaba espacio a todas. */}
        <header className="dc-top">
          <div className="dc-top__izq">
            <button aria-label="Abrir o cerrar el menú" className="dc-burger" onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: NAVY, display: "none", minWidth: "var(--dc-tap-min)", minHeight: "var(--dc-tap-min)" }}><Menu size={22} strokeWidth={1.75} /></button>
            <h1 className="dc-top__titulo">{NAV.find((n) => n.id === vista)?.label}</h1>
          </div>
        </header>
        <div data-dc-scroll className="dc-contenido" style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}><div className={`dc-pagina${vista === "whatsapp" ? " dc-pagina--chat" : ""}`}><div id="dc-top-slot" className="dc-vista-acc" /><AvisoBackend vista={vista} /><React.Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: DS.c.muted, fontSize: 14 }}>Cargando módulo…</div>}>{render()}</React.Suspense></div></div>
      </main>

      {showPasos && (() => {
        const done = misPasos.filter((p) => pasos[p.id]).length;
        const irPaso = (p) => { setPasos((s) => ({ ...s, [p.id]: true })); if (mods.includes(p.target)) setVista(p.target); setShowPasos(false); notify(`«${p.label}» — ¡empecemos!`); };
        const marcar = (p) => setPasos((s) => ({ ...s, [p.id]: !s[p.id] }));
        return (
        <div onClick={() => setShowPasos(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,27,56,.42)", zIndex: 130, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} className="dc-onb-panel" style={{ width: 400, maxWidth: "92vw", height: "100%", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-24px 0 60px rgba(0,0,0,.22)" }}>
            <div style={{ background: "linear-gradient(135deg,var(--dc-primary-alt),var(--dc-ink-alt))", color: "#fff", padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--dc-r-md)", background: "rgba(255,255,255,.16)", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{done}/{misPasos.length}</div>
                <div><div style={{ fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Primeros pasos</div><div style={{ fontSize: 13, opacity: .85 }}>Tareas tuyas ({done} de {misPasos.length}). El checklist de la clínica está en Configuración › Puesta en marcha.</div></div>
              </div>
              <button aria-label="Cerrar los primeros pasos" onClick={() => setShowPasos(false)} style={{ background: "rgba(255,255,255,.18)", border: "none", borderRadius: "var(--dc-r-sm)", width: 32, height: 32, cursor: "pointer", color: "#fff", display: "grid", placeItems: "center" }}><X size={18} strokeWidth={1.75} /></button>
            </div>
            <div style={{ height: 5, background: "var(--dc-line)" }}><div style={{ width: `${misPasos.length ? (done / misPasos.length) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg,var(--dc-primary-alt),var(--dc-ok))", transition: "width .3s" }} /></div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {misPasos.map((p) => { const on = !!pasos[p.id]; const Ic = p.icon; const disp = mods.includes(p.target); return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: "var(--dc-r-lg)", border: "1px solid " + (on ? "var(--dc-green-soft)" : "var(--dc-line)"), background: on ? "var(--dc-white)" : "#fff" }}>
                  <button type="button" className="dc-icon-btn" aria-label={on ? "Marcar pendiente" : "Marcar hecho"} onClick={() => marcar(p)} title={on ? "Marcar pendiente" : "Marcar hecho"} style={{ width: 24, height: 24, borderRadius: "var(--dc-r-full)", border: on ? "none" : "2px solid var(--dc-line-alt2)", background: on ? "var(--dc-ok)" : "#fff", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>{on && <Check size={14} color="#fff" strokeWidth={3.5} />}</button>
                  <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-md)", background: on ? tint("var(--dc-ok)", 0.094) : (tint(DS.c.primary, 0.078)), color: on ? "var(--dc-ok-700)" : DS.c.primary, display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={17} strokeWidth={1.75} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 14, textDecoration: on ? "line-through" : "none", opacity: on ? .7 : 1 }}>{p.label}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{p.desc}</div></div>
                  {!on && <button onClick={() => irPaso(p)} style={{ background: disp ? DS.c.primary : "var(--dc-line)", color: disp ? "#fff" : "var(--dc-ink-400)", border: "none", borderRadius: "var(--dc-r-sm)", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>Iniciar</button>}
                </div>
              ); })}
            </div>
            {done >= misPasos.length && <div style={{ padding: "14px 18px", background: "var(--dc-white)", borderTop: "1px solid var(--dc-green-soft)", color: "var(--dc-ok-700)", fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={17} strokeWidth={1.75} /> ¡Completaste tus primeros pasos! 🎉</div>}
          </div>
        </div>
        );
      })()}
      {/* zIndex por encima del modal (200): los errores de validación se lanzan desde
          formularios que viven en un modal, y con 100 salían detrás — el usuario pulsaba
          Guardar, no pasaba nada y no veía por qué. Y el tono sale del mensaje: un
          "no se pudo" ya no se anuncia con la palomita verde de guardado. */}
      {toast && (() => { const tn = tonoAviso(toast); return (
        <div className="dc-toast" role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, background: "#fff", borderRadius: "var(--dc-r-lg)", border: `1px solid ${tn.borde}`, boxShadow: "0 12px 32px rgba(16,24,40,.18)", padding: 16, display: "flex", gap: 12, alignItems: "center", maxWidth: 340 }}>
          <div style={{ background: tn.fondo, color: tn.color, borderRadius: "var(--dc-r-md)", width: 36, height: 36, display: "grid", placeItems: "center", flexShrink: 0 }}>
            {tn.error ? <AlertTriangle size={19} strokeWidth={1.75} /> : <CheckCircle2 size={19} strokeWidth={1.75} />}
          </div>
          <div style={{ fontSize: 13, color: tn.color, fontWeight: 500 }}>{toast}</div>
        </div>
      ); })()}
    </div>
  );
}

/* ---- Cobro: elige método y procesa. Tarjeta/Yape usan el checkout hospedado
   de Niubiz (la tarjeta se teclea en Niubiz, nunca en la app → PCI-safe). ---- */
const YapeGlyph = ({ size = 22, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
    <path d="M14 14h3.5v3.5M20.5 14v7M17.5 21H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---- Boleta de venta electrónica (formato SUNAT, estilo del comprobante real) ---- */
// Z-01: el emisor es la clínica, nunca un RUC de terceros escrito en el paquete.
let emisorClinica = null;
const hydrateEmisor = (r) => {
  if (!r) return;
  emisorClinica = {
    nombre: String(r.razonSocial || r.nombre || "").trim(),
    ruc: String(r.ruc || "").replace(/\D/g, "").slice(0, 11),
    dir: String(r.direccion || "").trim(),
    tel: String(r.telefono || "").trim(),
    serie: String(r.comprobanteSerie || r.serie || "B001").toUpperCase().slice(0, 4),
  };
};
/** Dígito verificador SUNAT para RUC peruano (11 dígitos). */
const validarRucSunat = (ruc) => {
  const s = String(ruc || "").replace(/\D/g, "");
  if (s.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(s[i]) * pesos[i];
  let dv = 11 - (sum % 11);
  if (dv === 10) dv = 0;
  if (dv === 11) dv = 1;
  return dv === Number(s[10]);
};
const emisorBoletaListo = () => {
  const e = getEmisor();
  const nombre = (e.nombre || "").trim();
  return !!nombre && nombre !== "CLÍNICA" && validarRucSunat(e.ruc);
};
const getEmisor = () => {
  const vacio = { nombre: "", ruc: "", dir: "", tel: "", serie: "B001" };
  let ls = {};
  try { ls = JSON.parse(localStorage.getItem("dc_emisor") || "{}") || {}; } catch { ls = {}; }
  const clinic = emisorClinica || {};
  const nombre = (clinic.nombre || ls.nombre || "").trim();
  const ruc = String(clinic.ruc || ls.ruc || "").replace(/\D/g, "").slice(0, 11);
  return {
    nombre: nombre || "CLÍNICA",
    ruc,
    dir: clinic.dir || ls.dir || "",
    tel: clinic.tel || ls.tel || "",
    serie: String(ls.serie || clinic.serie || "B001").toUpperCase().slice(0, 4),
  };
};
const peekBoletaLocal = (serie = "B001") => String((Number(localStorage.getItem("dc_boleta_seq_" + serie) || "0") || 0) + 1).padStart(8, "0");
const nextBoletaLocal = (serie = "B001") => {
  const k = "dc_boleta_seq_" + serie;
  const n = (Number(localStorage.getItem(k) || "0") || 0) + 1;
  localStorage.setItem(k, String(n));
  return { serie, numero: String(n).padStart(8, "0") };
};
const fmtComprobante = (numero) => String(numero == null ? "" : numero).replace(/\D/g, "").padStart(8, "0") || "00000001";
function numeroALetras(num) {
  const u = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE"];
  const d = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const c = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const tres = (n) => {
    if (n === 0) return ""; if (n === 100) return "CIEN";
    const ce = Math.floor(n / 100), dd = n % 100, un = n % 10, de = Math.floor(dd / 10);
    let s = ce ? c[ce] + " " : "";
    if (dd <= 20) s += u[dd];
    else if (dd < 30) s += "VEINTI" + u[un];
    else { s += d[de]; if (un) s += " Y " + u[un]; }
    return s.trim();
  };
  const ent = Math.floor(num), cent = Math.round((num - ent) * 100);
  let p = "";
  if (ent === 0) p = "CERO";
  else {
    const millon = Math.floor(ent / 1000000), miles = Math.floor((ent % 1000000) / 1000), resto = ent % 1000;
    if (millon) p += (millon === 1 ? "UN MILLÓN" : tres(millon) + " MILLONES") + " ";
    if (miles) p += (miles === 1 ? "MIL" : tres(miles) + " MIL") + " ";
    if (resto) p += tres(resto);
  }
  return `${p.trim().replace(/\s+/g, " ")} CON ${String(cent).padStart(2, "0")}/100 SOLES`;
}
function BoletaView({ boleta, onClose }) {
  const ref = useRef(null);
  const EMISOR = getEmisor();
  const serie = boleta.serie || EMISOR.serie || "B001";
  const total = Number(boleta.total) || 0;
  const opGravada = Math.round((total / 1.18) * 100) / 100;
  const igv = Math.round((total - opGravada) * 100) / 100;
  const items = boleta.items && boleta.items.length ? boleta.items : [{ cant: 1, desc: boleta.concepto || "Servicio odontológico", precio: total, importe: opGravada }];
  const metLbl = { tarjeta: "TARJETA", yape: "YAPE", plin: "PLIN", efectivo: "EFECTIVO", transferencia: "TRANSFERENCIA" }[boleta.metodo] || "CONTADO";
  const imprimir = () => {
    const w = window.open("", "_blank", "width=460,height=680");
    if (!w) return;
    w.document.write(`<html><head><title>Boleta ${serie}-${boleta.numero}</title><meta charset="utf-8"></head><body style="margin:0;font-family:Arial,Helvetica,sans-serif">${ref.current.innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => { w.print(); }, 250);
  };
  const cell = { padding: "6px 8px", fontSize: 12, color: "var(--dc-ink-900)", borderBottom: "1px solid var(--dc-line)" };
  return (
    <Modal icon={<FileText size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Boleta de venta electrónica" sub={`${serie}-${boleta.numero}`} onClose={onClose} maxW={480}
      footer={<><Btn small kind="ghost" onClick={onClose}>Cerrar</Btn><Btn small onClick={imprimir}><Upload size={15} strokeWidth={1.75} /> Imprimir / PDF</Btn></>}>
      <div ref={ref}>
        <div style={{ border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: 18, background: "#fff", color: "var(--dc-ink-900)", fontFamily: "Arial, Helvetica, sans-serif" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid var(--dc-ink-900)", paddingBottom: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{EMISOR.nombre}</div>
            <div style={{ fontSize: 12, color: "var(--dc-ink-700)", marginTop: 2 }}>{EMISOR.dir}</div>
            <div style={{ fontSize: 12, color: "var(--dc-ink-700)" }}>Teléfono: {EMISOR.tel}</div>
            <div style={{ fontSize: 12, fontWeight: 500, marginTop: 3 }}>RUC: {EMISOR.ruc}</div>
            <div style={{ marginTop: 8, border: "1px solid var(--dc-ink-900)", borderRadius: "var(--dc-r-sm)", padding: "6px 8px", display: "inline-block" }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>BOLETA DE VENTA ELECTRÓNICA</div>
              <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: ".5px" }}>{serie}-{boleta.numero}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            <div><strong>Señor(es):</strong> {boleta.cliente}</div>
            <div><strong>Dirección:</strong> {boleta.direccion || "—"}</div>
            <div><strong>DNI:</strong> {boleta.dni || "—"}</div>
            <div><strong>F. Emisión:</strong> {boleta.fecha}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead><tr style={{ background: "var(--dc-bg)" }}>
              <th style={{ ...cell, textAlign: "center", fontWeight: 500 }}>Cant</th>
              <th style={{ ...cell, textAlign: "left", fontWeight: 500 }}>Descripción</th>
              <th style={{ ...cell, textAlign: "right", fontWeight: 500 }}>Precio</th>
              <th style={{ ...cell, textAlign: "right", fontWeight: 500 }}>Importe</th>
            </tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{ ...cell, textAlign: "center" }}>{it.cant}</td>
                  <td style={{ ...cell, textAlign: "left" }}>{it.desc}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{Number(it.precio).toFixed(2)}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{Number(it.importe).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 12, marginLeft: "auto", width: "62%" }}>
            {[["OP. GRAVADA", opGravada], ["TOTAL IGV", igv]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}><span style={{ color: "var(--dc-ink-700)" }}>{l}</span><strong>S/ {v.toFixed(2)}</strong></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--dc-ink-900)", marginTop: 3, fontWeight: 500, fontSize: 13 }}><span>IMPORTE TOTAL VENTA</span><span>S/ {total.toFixed(2)}</span></div>
          </div>
          <div style={{ fontSize: 12, marginTop: 10, borderTop: "1px dashed var(--dc-line)", paddingTop: 8, lineHeight: 1.7 }}>
            <div><strong>CONDICIÓN DE PAGO:</strong> AL CONTADO S/ {total.toFixed(2)}</div>
            <div><strong>SON:</strong> {numeroALetras(total)}</div>
            <div style={{ marginTop: 4 }}>Observación: {boleta.ref ? `${metLbl} – Op. ${boleta.ref}` : metLbl}</div>
            <div>Usuario: {boleta.usuario || "sistema"}</div>
          </div>
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--dc-ink-400)", marginTop: 12 }}>Representación impresa de la Boleta de Venta Electrónica</div>
        </div>
      </div>
    </Modal>
  );
}

// Configuración del emisor de boletas (datos de facturación por clínica)
function DatosFacturacion({ onClose, notify = () => {}, readOnly = false }) {
  const DESTINOS_TIPOS = [
    ["efectivo", "Efectivo"],
    ["pos", "POS / Tarjeta"],
    ["yape", "Yape"],
    ["plin", "Plin"],
    ["transferencia", "Transferencia"],
    ["seguro", "Seguro"],
  ];
  const [f, setF] = useState(getEmisor());
  const [cajaDestinos, setCajaDestinos] = useState([]);
  useEffect(() => {
    if (!auth.token) return;
    api.clinica.get().then((r) => {
      hydrateEmisor(r);
      const e = getEmisor();
      setF({ nombre: e.nombre === "CLÍNICA" ? (r?.razonSocial || r?.nombre || "") : e.nombre, ruc: e.ruc, dir: e.dir, tel: e.tel, serie: e.serie });
      const arr = Array.isArray(r?.cajaDestinos) ? r.cajaDestinos : [];
      setCajaDestinos(arr.map((d, i) => ({
        id: String(d.id || d.tipo || `d${i}`),
        tipo: String(d.tipo || "efectivo"),
        label: String(d.label || d.tipo || ""),
        detalle: String(d.detalle || ""),
      })));
    }).catch(() => {});
  }, []); // eslint-disable-line
  const addDestino = () => setCajaDestinos((rows) => [...rows, { id: `d${Date.now()}`, tipo: "efectivo", label: "", detalle: "" }]);
  const setDestino = (i, k, v) => setCajaDestinos((rows) => rows.map((x, j) => (j === i ? { ...x, [k]: v, ...(k === "tipo" && !x.label ? { label: DESTINOS_TIPOS.find(([t]) => t === v)?.[1] || v } : {}) } : x)));
  const delDestino = (i) => setCajaDestinos((rows) => rows.filter((_, j) => j !== i));
  const guardar = () => {
    if (readOnly) { notify("No tienes permiso para editar los datos fiscales."); return; }
    if (!f.nombre.trim()) { notify("Ingresa la razón social."); return; }
    if (!validarRucSunat(f.ruc)) { notify("Ingresa un RUC válido de 11 dígitos (con dígito verificador SUNAT)."); return; }
    const destinosClean = cajaDestinos
      .map((d) => ({
        id: String(d.id || d.tipo || "").trim() || `d${Date.now()}`,
        tipo: String(d.tipo || "efectivo").trim(),
        label: String(d.label || d.tipo || "").trim(),
        detalle: String(d.detalle || "").trim(),
      }))
      .filter((d) => d.label);
    const payload = { nombre: f.nombre.trim(), ruc: f.ruc.trim(), dir: f.dir || "", tel: f.tel || "", serie: (f.serie || "B001").toUpperCase() };
    localStorage.setItem("dc_emisor", JSON.stringify(payload));
    hydrateEmisor({ razonSocial: payload.nombre, ruc: payload.ruc, direccion: payload.dir, telefono: payload.tel, comprobanteSerie: payload.serie });
    if (auth.token) {
      api.clinica.actualizar({
        razonSocial: payload.nombre,
        ruc: payload.ruc,
        direccion: payload.dir,
        telefono: payload.tel,
        comprobanteSerie: payload.serie,
        cajaDestinos: destinosClean,
      })
        .then(() => { notify("Datos de facturación y destinos de caja guardados."); onClose(); })
        .catch(() => { notify("Se guardaron en este navegador. No se pudo actualizar la clínica."); onClose(); });
      return;
    }
    notify("Datos de facturación guardados. Las boletas usarán estos datos.");
    onClose();
  };
  const roInp = readOnly ? { readOnly: true, style: { width: "100%", padding: "12px 14px", borderRadius: "var(--dc-r-lg)", border: "1.5px solid var(--dc-line)", background: "var(--dc-bg)", fontSize: 14, boxSizing: "border-box", color: "var(--dc-ink-400)" } } : null;
  const lblF = { fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", display: "block", marginBottom: 6 };
  return (
    <Modal icon={<FileText size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo="Datos de facturación" sub="Emisor de las boletas de esta clínica" onClose={onClose} maxW={560}
      footer={<><Btn small kind="ghost" onClick={onClose}>Cancelar</Btn>{!readOnly && <Btn small onClick={guardar}><Check size={15} strokeWidth={1.75} /> Guardar</Btn>}</>}>
      <div style={{ display: "grid", gap: 14 }}>
        {readOnly && <div style={{ fontSize: 13, color: "var(--dc-info-ink)", background: "var(--dc-bg)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-md)", padding: 12 }}>Datos fiscales de solo lectura para tu rol.</div>}
        {readOnly ? (
          <>
            <label><span style={lblF}>Razón social</span><input className="dc-premium-inp" {...roInp} value={f.nombre} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
              <label><span style={lblF}>RUC</span><input className="dc-premium-inp" {...roInp} value={f.ruc} /></label>
              <label><span style={lblF}>Serie de boleta</span><input className="dc-premium-inp" {...roInp} value={f.serie} /></label>
            </div>
          </>
        ) : (
          <>
            <Field label="Razón social" value={f.nombre} onChange={(v) => setF({ ...f, nombre: v })} placeholder="Razón social de la clínica" />
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
              <Field label="RUC" value={f.ruc} onChange={(v) => setF({ ...f, ruc: v.replace(/[^\d]/g, "").slice(0, 11) })} placeholder="11 dígitos" />
              <Field label="Serie de boleta" value={f.serie} onChange={(v) => setF({ ...f, serie: v.toUpperCase().slice(0, 4) })} placeholder="B001" />
            </div>
          </>
        )}
        <Field label="Dirección" value={f.dir} onChange={(v) => setF({ ...f, dir: v })} placeholder="Av. … — distrito" />
        <Field label="Teléfono" value={f.tel} onChange={(v) => setF({ ...f, tel: v })} placeholder="(01) 000 0000" />
        <div style={{ borderTop: "1px solid var(--dc-line)", paddingTop: 14, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>Cuentas de destino de caja</div>
              <div style={{ fontSize: 12, color: "var(--dc-ink-400)" }}>Catálogo usado al abrir caja (efectivo, POS, Yape…)</div>
            </div>
            {!readOnly && <Btn small kind="ghost" onClick={addDestino}><Plus size={14} strokeWidth={1.75} /> Agregar</Btn>}
          </div>
          {cajaDestinos.length === 0 && <div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>Sin destinos configurados: se usarán los predeterminados al abrir caja.</div>}
          {cajaDestinos.map((d, i) => (
            <div key={d.id || i} style={{ display: "grid", gridTemplateColumns: readOnly ? "1fr 1.2fr 1fr" : "1fr 1.2fr 1fr auto", gap: 8, alignItems: "end" }}>
              <label>
                <span style={lblF}>Tipo</span>
                <select disabled={readOnly} value={d.tipo} onChange={(e) => setDestino(i, "tipo", e.target.value)} style={{ width: "100%", minHeight: 44, padding: "10px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: readOnly ? "var(--dc-bg)" : "#fff", fontSize: 14 }}>
                  {DESTINOS_TIPOS.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
                </select>
              </label>
              <Field label="Etiqueta" value={d.label} onChange={(v) => setDestino(i, "label", v)} placeholder="Ej. Yape recepción" />
              <Field label="Detalle" value={d.detalle} onChange={(v) => setDestino(i, "detalle", v)} placeholder="N° / CCI (opcional)" />
              {!readOnly && <Btn small kind="ghost" onClick={() => delDestino(i)}>Quitar</Btn>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "var(--dc-ink-400)", lineHeight: 1.5 }}>Cada clínica emite con su propio RUC. En producción, la boleta oficial la genera tu proveedor SUNAT (NubeFacT/similar) con estos mismos datos.</div>
    </Modal>
  );
}

function ModalCobro({ monto, pacienteId, sedeId, concepto = "Cobro en caja", email, paciente, dni, items = null, onClose, onAprobado, notify = () => {} }) {
  const real = !!auth.token && !!pacienteId;
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const [posting, setPosting] = useState(false);
  const postingRef = useRef(false);
  const [metodo, setMetodo] = useState(null);
  const [paso, setPaso] = useState("elegir");            // elegir | datos | mixto | procesando | aprobado | rechazado
  const [ref, setRef] = useState("");                    // N° de operación (transferencia)
  const [banco, setBanco] = useState("");                // banco de la transferencia
  const [foto, setFoto] = useState(null);                // foto del comprobante (dataURL)
  const [recibidoEfectivo, setRecibidoEfectivo] = useState(""); // CAJA-07 vuelto
  const [mixEf, setMixEf] = useState("");                 // CAJA-07 pago mixto – efectivo
  const [mixOtro, setMixOtro] = useState("");             // CAJA-07 pago mixto – otro método
  const [mixOtroMetodo, setMixOtroMetodo] = useState("yape");
  const fotoRef = useRef(null);
  const [verBoleta, setVerBoleta] = useState(false);
  const [resultado, setResultado] = useState(null);
  const closeRef = useRef(null);
  const [boletaNum] = useState(() => peekBoletaLocal(getEmisor().serie));
  const [msg, setMsg] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const saldoMax = Number(monto) || 0;
  const [montoCobrar, setMontoCobrar] = useState(saldoMax);  // monto a cobrar (abono parcial)
  const [cuotas, setCuotas] = useState(1);                   // cuotas de la clínica
  const [desc, setDesc] = useState(0);                       // descuento / promoción
  const [moneda, setMoneda] = useState("PEN");               // DC-13 PEN | USD (UI)
  const [tcUsd, setTcUsd] = useState(() => {
    const raw = Number(localStorage.getItem("dc_tipo_cambio") || "3.75");
    return Number.isFinite(raw) && raw > 0 ? raw : 3.75;
  });
  const [tcFuente, setTcFuente] = useState("local"); // clinica | local
  useEffect(() => {
    if (!auth.token) return;
    api.clinica.get().then((r) => {
      const v = Number(r?.tipoCambio);
      if (Number.isFinite(v) && v > 0) {
        setTcUsd(v);
        setTcFuente("clinica");
        localStorage.setItem("dc_tipo_cambio", String(v));
      }
    }).catch(() => {});
  }, []); // eslint-disable-line
  const TC_USD = tcUsd;
  const sym = moneda === "USD" ? "US$" : "S/";
  const aUi = (pen) => moneda === "USD" ? Math.round((Number(pen) / TC_USD) * 100) / 100 : Number(pen) || 0;
  const aPen = (ui) => moneda === "USD" ? Math.round((Number(ui) * TC_USD) * 100) / 100 : Number(ui) || 0;
  const net = Math.max(0, Math.round(((Number(montoCobrar) || 0) - (Number(desc) || 0)) * 100) / 100);
  const netPen = aPen(net);                                  // backend siempre en soles
  const conceptoFull = cuotas > 1 ? `${concepto} – Cuota 1 de ${cuotas}` : concepto;
  const parcial = netPen > 0 && netPen < saldoMax - 0.009;

  const METODOS = [
    { k: "tarjeta", label: "Tarjeta (POS)", sub: "Visa – Mastercard – Amex", color: DS.c.primary, icon: <CreditCard size={22} strokeWidth={1.75} color="#fff" /> },
    { k: "yape", label: "Yape / QR", sub: "Valida en el POS", color: "var(--dc-ink-500)", icon: <YapeGlyph /> },
    { k: "plin", label: "Plin / QR", sub: "Valida en el POS", color: "var(--dc-primary-alt)", icon: <YapeGlyph /> },
    { k: "transferencia", label: "Transferencia", sub: "Código + foto – interbancaria", color: DS.c.primary, icon: <Building2 size={22} strokeWidth={1.75} color="#fff" /> },
    { k: "efectivo", label: "Efectivo", sub: "Se contabiliza en caja", color: "var(--dc-ok-700)", icon: <Wallet size={22} strokeWidth={1.75} color="#fff" /> },
  ];
  const BANCOS = ["BCP", "Interbank", "BBVA", "Scotiabank", "BanBif", "Interbancaria (CCI)"];
  const metaMet = metodo === "mixto"
    ? { k: "mixto", label: "Pago mixto", color: "var(--dc-ink-alt)", icon: <Wallet size={22} strokeWidth={1.75} color="#fff" /> }
    : (METODOS.find((m) => m.k === metodo) || {});

  const aprobado = (res) => { setResultado(res); setPaso("aprobado"); closeRef.current = setTimeout(() => onAprobado && onAprobado(res), 2800); };
  const fallo = (m) => { setMsg(m || "El pago no pudo procesarse."); setPaso("rechazado"); };

  const onFoto = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; if (!f.type.startsWith("image/")) { setMsg("Sube una imagen (foto/captura del comprobante)."); return; } const rd = new FileReader(); rd.onload = () => setFoto(rd.result); rd.readAsDataURL(f); e.target.value = ""; };
  // Efectivo / Transferencia / POS validado → registro directo (sin pasarela online)
  const cobrarDirecto = (m) => {
    if (postingRef.current || posting) return;
    postingRef.current = true;
    setPaso("procesando");
    setPosting(true);
    const liberar = () => { postingRef.current = false; setPosting(false); };
    let concept = conceptoFull;
    if (m === "transferencia") { if (ref.trim()) concept += ` – Op. ${ref.trim()}`; if (banco) concept += ` – ${banco}`; }
    if (moneda === "USD") concept += ` – US$ ${net.toFixed(2)} (TC ${TC_USD})`;
    if (!real) { setTimeout(() => { liberar(); const loc = nextBoletaLocal(getEmisor().serie); aprobado({ metodo: m, referencia: ref, banco, montoCobrado: netPen, parcial, moneda, comprobanteSerie: loc.serie, comprobanteNumero: loc.numero }); }, 700); return; }
    api.pagos.registrar({ pacienteId, sedeId, concepto: concept, monto: netPen, metodo: m, descuento: aPen(Number(desc) || 0) }, { headers: { "Idempotency-Key": idempotencyKey } })
      .then((r) => {
        if (r?.comprobanteNumero == null || r?.comprobanteNumero === "") {
          liberar();
          fallo("El servidor no asignó número de comprobante. Revisa la configuración de facturación.");
          return;
        }
        liberar();
        aprobado({ metodo: m, referencia: ref, banco, montoCobrado: netPen, parcial, moneda, comprobanteSerie: r?.comprobanteSerie, comprobanteNumero: r?.comprobanteNumero, pagoId: r?.id });
      })
      .catch((e) => {
        liberar();
        const st = e?.status;
        if (st >= 500) fallo("El servidor no pudo registrar el cobro. Reintenta en unos segundos.");
        else if (st === 0) fallo("Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.");
        else fallo(e?.message || "No se pudo registrar el cobro.");
      });
  };

  // Tarjeta / Yape → sesión Niubiz + checkout hospedado
  const cobrarNiubiz = (m) => {
    if (postingRef.current || posting) return;
    postingRef.current = true;
    setPaso("procesando");
    setPosting(true);
    const liberar = () => { postingRef.current = false; setPosting(false); };
    if (!real) { setTimeout(() => { liberar(); aprobado({ metodo: m, montoCobrado: netPen, parcial, moneda }); }, 1400); return; }
    api.pagos.niubizSesion(netPen, email).then((s) => {
      if (!s) { liberar(); return fallo("No se pudo iniciar la sesión de pago."); }
      if (s.simulado) {
        setSandbox(true);
        return api.pagos.niubizConfirmar({ transactionToken: "SANDBOX", purchaseNumber: s.purchaseNumber, monto: netPen, pacienteId, sedeId, concepto: conceptoFull, metodo: m })
          .then((r) => {
            liberar();
            if (!(r && r.aprobado)) return fallo(r && r.mensaje);
            if (r.comprobanteNumero == null || r.comprobanteNumero === "") return fallo("El servidor no asignó número de comprobante.");
            return aprobado({ metodo: m, pagoId: r.pagoId, montoCobrado: netPen, parcial, moneda, comprobanteSerie: r.comprobanteSerie, comprobanteNumero: r.comprobanteNumero });
          }).catch((e) => {
            liberar();
            const st = e?.status;
            if (st >= 500) fallo("El servidor no pudo registrar el cobro. Reintenta en unos segundos.");
            else if (st === 0) fallo("Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.");
            else fallo(e?.message || "No se pudo registrar el cobro.");
          });
      }
      liberar();
      return abrirLightbox(s, m);
    }).catch(() => { liberar(); fallo("No se pudo conectar con Niubiz."); });
  };

  // Checkout hospedado de Niubiz (solo cuando NIUBIZ_ENABLED=true). La tarjeta se
  // ingresa en el iframe de Niubiz; al completar, el backend autoriza y registra.
  const abrirLightbox = (s, m) => {
    const configurar = () => {
      try {
        window.VisanetCheckout.configure({
          sessiontoken: s.sessionKey, channel: "web", merchantid: s.merchantId,
          purchasenumber: s.purchaseNumber, amount: Number(netPen),
          expirationminutes: "10", formbuttoncolor: DS.c.primary,
          complete: (params) => {
            const token = params && (params.transactionToken || params.customerToken || params.tokenId);
            api.pagos.niubizConfirmar({ transactionToken: token, purchaseNumber: s.purchaseNumber, monto: netPen, pacienteId, sedeId, concepto: conceptoFull, metodo: m })
              .then((r) => {
                if (!(r && r.aprobado)) return fallo(r && r.mensaje);
                if (r.comprobanteNumero == null || r.comprobanteNumero === "") return fallo("El servidor no asignó número de comprobante.");
                return aprobado({ metodo: m, pagoId: r.pagoId, montoCobrado: netPen, parcial, moneda, comprobanteSerie: r.comprobanteSerie, comprobanteNumero: r.comprobanteNumero });
              });
          } });
        window.VisanetCheckout.open();
      } catch (e) { fallo("No se pudo abrir el checkout de Niubiz."); }
    };
    if (window.VisanetCheckout) return configurar();
    const sc = document.createElement("script");
    sc.src = "https://static-content-qas.vnforapps.com/v2/js/checkout.js";
    sc.onload = configurar; sc.onerror = () => fallo("No se pudo cargar el checkout de Niubiz.");
    document.body.appendChild(sc);
  };

  const elegir = (m) => {
    if (net <= 0) return;
    setMetodo(m);
    if (m === "efectivo") {
      setRecibidoEfectivo(String(net));
      setPaso("datos");
    } else if (m === "transferencia") setPaso("datos");
    else if (real) cobrarNiubiz(m);
    else setPaso("pos");
  };
  const abrirMixto = () => {
    if (net <= 0) return;
    const mitad = Math.round((net / 2) * 100) / 100;
    setMixEf(String(mitad));
    setMixOtro(String(Math.round((net - mitad) * 100) / 100));
    setMixOtroMetodo("yape");
    setMetodo("mixto");
    setRecibidoEfectivo(String(mitad));
    setPaso("mixto");
  };
  const cobrarMixto = () => {
    if (postingRef.current || posting) return;
    const efUi = Math.round((Number(mixEf) || 0) * 100) / 100;
    const otUi = Math.round((Number(mixOtro) || 0) * 100) / 100;
    if (efUi <= 0 || otUi <= 0) { setMsg("Ambas partes del pago mixto deben ser mayores a 0."); setPaso("rechazado"); return; }
    if (Math.abs(efUi + otUi - net) > 0.009) { setMsg(`La suma debe ser ${sym} ${net.toFixed(2)}.`); setPaso("rechazado"); return; }
    const rec = Number(recibidoEfectivo);
    if (!(rec >= efUi - 0.009)) { setMsg("El efectivo recibido debe cubrir la parte en efectivo."); setPaso("rechazado"); return; }
    postingRef.current = true;
    setPaso("procesando");
    setPosting(true);
    const liberar = () => { postingRef.current = false; setPosting(false); };
    const efPen = aPen(efUi);
    const otPen = aPen(otUi);
    const vueltoUi = Math.max(0, Math.round((rec - efUi) * 100) / 100);
    let conceptBase = conceptoFull + " – Pago mixto";
    if (moneda === "USD") conceptBase += ` – US$ ${net.toFixed(2)} (TC ${TC_USD})`;
    if (vueltoUi > 0) conceptBase += ` – Vuelto ${sym} ${vueltoUi.toFixed(2)}`;
    const key2 = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${idempotencyKey}-b`;
    if (!real) {
      setTimeout(() => {
        liberar();
        const loc = nextBoletaLocal(getEmisor().serie);
        aprobado({ metodo: "mixto", montoCobrado: netPen, parcial, moneda, mixto: { efectivo: efPen, [mixOtroMetodo]: otPen }, vuelto: aPen(vueltoUi), comprobanteSerie: loc.serie, comprobanteNumero: loc.numero });
      }, 700);
      return;
    }
    api.pagos.registrar({ pacienteId, sedeId, concepto: `${conceptBase} – Efectivo`, monto: efPen, metodo: "efectivo", descuento: 0 }, { headers: { "Idempotency-Key": idempotencyKey } })
      .then((r1) => {
        if (r1?.comprobanteNumero == null || r1?.comprobanteNumero === "") {
          liberar();
          fallo("El servidor no asignó número de comprobante (parte efectivo).");
          return null;
        }
        return api.pagos.registrar(
          { pacienteId, sedeId, concepto: `${conceptBase} – ${mixOtroMetodo}`, monto: otPen, metodo: mixOtroMetodo, descuento: aPen(Number(desc) || 0) },
          { headers: { "Idempotency-Key": key2 } }
        ).then((r2) => ({ r1, r2 }));
      })
      .then((pair) => {
        if (!pair) return;
        liberar();
        const { r1, r2 } = pair;
        if (r2?.comprobanteNumero == null || r2?.comprobanteNumero === "") {
          fallo("Se registró la parte en efectivo, pero falló el segundo método. Revisa el historial de caja.");
          return;
        }
        aprobado({ metodo: "mixto", montoCobrado: netPen, parcial, moneda, mixto: { efectivo: efPen, [mixOtroMetodo]: otPen }, vuelto: aPen(vueltoUi), comprobanteSerie: r2?.comprobanteSerie || r1?.comprobanteSerie, comprobanteNumero: r2?.comprobanteNumero || r1?.comprobanteNumero, pagoId: r2?.id || r1?.id });
      })
      .catch((e) => {
        liberar();
        const st = e?.status;
        if (st >= 500) fallo("El servidor no pudo registrar el cobro mixto. Reintenta.");
        else if (st === 0) fallo("Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.");
        else fallo(e?.message || "No se pudo registrar el pago mixto.");
      });
  };
  const volver = () => { setMetodo(null); setRef(""); setBanco(""); setFoto(null); setRecibidoEfectivo(""); setMixEf(""); setMixOtro(""); setPaso("elegir"); };
  const serieBoleta = resultado?.comprobanteSerie || getEmisor().serie;
  const numeroBoleta = resultado?.comprobanteNumero != null ? fmtComprobante(resultado.comprobanteNumero) : (real ? null : boletaNum);
  const abrirBoletaAprobada = () => {
    if (!emisorBoletaListo()) { notify("Completa la razón social y un RUC válido en Configuración → Datos de facturación."); return; }
    if (real && numeroBoleta == null) { notify("El servidor no devolvió número de comprobante."); return; }
    setVerBoleta(true);
  };
  const boletaObj = { serie: serieBoleta, numero: numeroBoleta, cliente: paciente || "Cliente", dni: dni || "", direccion: "", fecha: fmt(hoy), total: netPen, concepto, metodo, ref, items: (!parcial && items && items.length) ? items : undefined };
  const chip = (active) => ({ fontSize: 12, fontWeight: 500, padding: "5px 11px", borderRadius: "var(--dc-r-full)", cursor: "pointer", border: active ? "1.5px solid var(--dc-accent-cyan)" : "1.5px solid var(--dc-line)", background: active ? (tint(DS.c.primary, 0.078)) : "#fff", color: active ? DS.c.primary : "var(--dc-ink-400)" });
  const inp2 = { padding: "7px 10px", borderRadius: "var(--dc-r-sm)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box" };

  const wrap = (children, pad = 22) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,56,.55)", zIndex: 200, display: "grid", placeItems: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "var(--dc-r-lg)", width: "100%", maxWidth: 460, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.3)", animation: "dcModal .26s cubic-bezier(.2,.7,.2,1)" }}>
        <div style={{ background: "linear-gradient(105deg,var(--dc-primary-alt),var(--dc-ink-alt))", padding: "18px 22px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, opacity: .82, letterSpacing: 1, fontWeight: 500 }}>{auth.token ? "COBRO – COMPROBANTE" : "COBRO – DEMO"}</div>
            <div style={{ fontSize: 21, fontWeight: 600, fontFamily: DISPLAY_FONT, marginTop: 2 }}>{sym} {aUi(netPen).toFixed(2)}</div>
            {parcial && <div style={{ fontSize: 12, opacity: .9 }}>Abono – saldo {sym} {aUi(saldoMax).toFixed(2)}</div>}
            {moneda === "USD" && <div style={{ fontSize: 12, opacity: .85 }}>≈ S/ {Number(netPen).toFixed(2)} – TC {TC_USD}</div>}
          </div>
          <button type="button" className="dc-icon-btn" aria-label="Cerrar" onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: "var(--dc-r-sm)", width: 44, height: 44, minWidth: 44, minHeight: 44, cursor: "pointer", color: "#fff", display: "grid", placeItems: "center" }}><X size={17} strokeWidth={1.75} /></button>
        </div>
        <div style={{ padding: pad }}>{children}</div>
      </div>
    </div>
  );

  if (paso === "elegir") return wrap(
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {[["PEN", "Soles (PEN)"], ["USD", "Dólares (USD)"]].map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => {
            if (k === moneda) return;
            const prevUi = Number(montoCobrar) || 0;
            const pen = moneda === "USD" ? Math.round(prevUi * TC_USD * 100) / 100 : prevUi;
            const nextUi = k === "USD" ? Math.round((pen / TC_USD) * 100) / 100 : pen;
            const descPen = moneda === "USD" ? Math.round((Number(desc) || 0) * TC_USD * 100) / 100 : Number(desc) || 0;
            setMoneda(k);
            setMontoCobrar(nextUi);
            setDesc(k === "USD" ? Math.round((descPen / TC_USD) * 100) / 100 : descPen);
            setCuotas(1);
          }} style={chip(moneda === k)}>{lbl}</button>
        ))}
        {moneda === "USD" && (
          <label style={{ fontSize: 12, color: "var(--dc-ink-500)", display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            TC
            <input className="dc-premium-inp" type="number" step="0.01" min="0.01" value={tcUsd}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v) || v <= 0) return;
                setTcUsd(v);
                localStorage.setItem("dc_tipo_cambio", String(v));
              }}
              onBlur={() => {
                if (!auth.token || !(Number(tcUsd) > 0)) return;
                api.clinica.actualizar({ tipoCambio: Number(tcUsd) })
                  .then(() => setTcFuente("clinica"))
                  .catch(() => { /* sin permiso config: queda override de sesión */ });
              }}
              style={{ ...inp2, width: 72 }} title={tcFuente === "clinica" ? "Tipo de cambio de la clínica" : "Tipo de cambio (sesión)"} />
          </label>
        )}
      </div>
      {moneda === "USD" && (
        <div style={{ fontSize: 12, color: "var(--dc-ink-400)", marginBottom: 10 }}>
          TC {tcFuente === "clinica" ? "de la clínica" : "de esta sesión"}: {TC_USD} (PEN por 1 USD)
        </div>
      )}
      {saldoMax > 0 && (
        <div style={{ marginBottom: 14, padding: 14, background: "var(--dc-bg)", borderRadius: "var(--dc-r-lg)", border: "1px solid var(--dc-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)" }}>Monto a cobrar <span style={{ color: "var(--dc-ink-400)" }}>(saldo {sym} {aUi(saldoMax).toFixed(2)})</span></span>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: 8, fontSize: 13, color: "var(--dc-ink-500)" }}>{sym}</span>
              <input className="dc-premium-inp" type="number" value={montoCobrar} onChange={(e) => { setMontoCobrar(e.target.value); setCuotas(1); }} style={{ ...inp2, width: 118, paddingLeft: moneda === "USD" ? 38 : 30, fontWeight: 500, textAlign: "right" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => { setMontoCobrar(aUi(saldoMax)); setCuotas(1); }} style={chip(cuotas === 1 && !parcial)}>Total</button>
            {[2, 3, 4, 6].map((n) => <button key={n} onClick={() => { setCuotas(n); setMontoCobrar(Math.round((aUi(saldoMax) / n) * 100) / 100); }} style={chip(cuotas === n)}>{n} cuotas</button>)}
          </div>
          <div style={{ marginTop: 11, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--dc-ink-500)", display: "flex", alignItems: "center", gap: 6 }}>Descuento promo {sym} <input className="dc-premium-inp" type="number" value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...inp2, width: 66, padding: "5px 8px", fontSize: 13 }} /></label>
            <div style={{ fontSize: 13, color: "var(--dc-ink-alt)", fontWeight: 500 }}>Cobra ahora: {sym} {net.toFixed(2)}{moneda === "USD" ? ` (S/ ${netPen.toFixed(2)})` : ""}{cuotas > 1 ? ` – 1 de ${cuotas}` : ""}{parcial ? " – abono" : ""}</div>
          </div>
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", marginBottom: 12 }}>¿Cómo va a pagar?</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {METODOS.map((m) => (
          <button key={m.k} onClick={() => elegir(m.k)} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", padding: "14px 14px", borderRadius: "var(--dc-r-lg)", border: "1.5px solid var(--dc-line)", background: "#fff", cursor: "pointer", textAlign: "left", transition: "all .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.boxShadow = `0 6px 18px ${tint(m.color, 0.133)}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--dc-line)"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--dc-r-md)", background: m.color, display: "grid", placeItems: "center" }}>{m.icon}</div>
            <div><div style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>{m.label}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", marginTop: 1 }}>{m.sub}</div></div>
          </button>
        ))}
      </div>
      <button type="button" onClick={abrirMixto} style={{ width: "100%", marginTop: 10, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--dc-r-lg)", border: "1.5px dashed var(--dc-line-alt2)", background: "var(--dc-bg-soft)", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 40, height: 40, borderRadius: "var(--dc-r-md)", background: "var(--dc-ink-alt)", display: "grid", placeItems: "center" }}><Wallet size={20} strokeWidth={1.75} color="#fff" /></div>
        <div><div style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>Pago mixto</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", marginTop: 1 }}>Efectivo + Yape / tarjeta / transferencia – con vuelto</div></div>
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, fontSize: 12, color: "var(--dc-ink-500)" }}>
        <ShieldCheck size={13} strokeWidth={1.75} /> Tarjeta, Yape y Plin se validan en el POS antes de cargar.
      </div>
    </>
  );

  if (paso === "mixto") {
    const efUi = Math.round((Number(mixEf) || 0) * 100) / 100;
    const otUi = Math.round((Number(mixOtro) || 0) * 100) / 100;
    const sumaOk = Math.abs(efUi + otUi - net) <= 0.009 && efUi > 0 && otUi > 0;
    const rec = Number(recibidoEfectivo) || 0;
    const vueltoUi = Math.max(0, Math.round((rec - efUi) * 100) / 100);
    const OTROS = [
      { k: "yape", label: "Yape / QR" },
      { k: "plin", label: "Plin / QR" },
      { k: "tarjeta", label: "Tarjeta" },
      { k: "transferencia", label: "Transferencia" },
    ];
    return wrap(
      <>
        <button type="button" onClick={volver} style={{ background: "none", border: "none", color: DS.c.primary, fontWeight: 500, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 }}>‹ Cambiar método</button>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", marginBottom: 10 }}>Divide el cobro ({sym} {net.toFixed(2)})</div>
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Parte en efectivo</span>
          <input className="dc-premium-inp" type="number" min="0" step="0.01" value={mixEf}
            onChange={(e) => {
              const v = e.target.value;
              setMixEf(v);
              const rest = Math.max(0, Math.round((net - (Number(v) || 0)) * 100) / 100);
              setMixOtro(String(rest));
              if (!recibidoEfectivo || Number(recibidoEfectivo) < Number(v)) setRecibidoEfectivo(v);
            }}
            style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Efectivo recibido (para vuelto)</span>
          <input className="dc-premium-inp" type="number" min="0" step="0.01" value={recibidoEfectivo}
            onChange={(e) => setRecibidoEfectivo(e.target.value)}
            style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          {efUi > 0 && rec >= efUi - 0.009 && (
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: vueltoUi > 0 ? "var(--dc-ok-700)" : "var(--dc-ink-500)" }}>
              Vuelto: {sym} {vueltoUi.toFixed(2)}
            </div>
          )}
        </label>
        <label style={{ display: "block", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Segundo método</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {OTROS.map((o) => (
              <button key={o.k} type="button" onClick={() => setMixOtroMetodo(o.k)} style={chip(mixOtroMetodo === o.k)}>{o.label}</button>
            ))}
          </div>
          <input className="dc-premium-inp" type="number" min="0" step="0.01" value={mixOtro}
            onChange={(e) => {
              const v = e.target.value;
              setMixOtro(v);
              setMixEf(String(Math.max(0, Math.round((net - (Number(v) || 0)) * 100) / 100)));
            }}
            style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </label>
        {!sumaOk && <div style={{ fontSize: 12, color: "var(--dc-warn-600)", marginBottom: 10 }}>La suma debe ser exactamente {sym} {net.toFixed(2)} (ahora {sym} {(efUi + otUi).toFixed(2)}).</div>}
        <Btn full onClick={cobrarMixto} disabled={posting || !sumaOk || rec < efUi - 0.009} style={{ opacity: (posting || !sumaOk || rec < efUi - 0.009) ? 0.55 : 1 }}>
          <CheckCircle2 size={16} strokeWidth={1.75} /> {posting ? "Registrando…" : `Confirmar mixto ${sym} ${net.toFixed(2)}`}
        </Btn>
      </>, 22
    );
  }

  // POS: tarjeta / Yape / Plin (demo) → el operador confirma cuando el POS aprueba
  if (paso === "pos") return wrap(
    <>
      <button onClick={volver} style={{ background: "none", border: "none", color: DS.c.primary, fontWeight: 500, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 }}>‹ Cambiar método</button>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: "var(--dc-r-md)", background: metaMet.color, display: "grid", placeItems: "center" }}>{metaMet.icon}</div>
        <div><div style={{ fontWeight: 500, color: NAVY }}>{metaMet.label}</div><div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{metodo === "tarjeta" ? "Pasa o inserta la tarjeta en el POS" : "Muestra el QR / cobra en el POS"}</div></div>
      </div>
      <div style={{ background: "var(--dc-white)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-lg)", padding: "14px 16px", marginBottom: 16, display: "flex", gap: 11, alignItems: "center" }}>
        <CreditCard size={20} strokeWidth={1.75} color="var(--dc-accent-cyan)" />
        <div style={{ fontSize: 13, color: "var(--dc-brand-500)" }}>Envía <strong>{sym} {net.toFixed(2)}</strong> al POS y espera la aprobación. El cobro se registra <strong>solo cuando el POS valida</strong> el pago.</div>
      </div>
      <Btn full onClick={() => cobrarDirecto(metodo)} disabled={posting}><CheckCircle2 size={16} strokeWidth={1.75} /> {posting ? "Registrando…" : `Pago validado por el POS — cobrar ${sym} ${net.toFixed(2)}`}</Btn>
      <button onClick={volver} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>El POS rechazó / cancelar</button>
    </>, 22
  );

  if (paso === "datos") {
    const faltaTransf = metodo === "transferencia" && (!ref.trim() || !foto);
    return wrap(
    <>
      <button onClick={volver} style={{ background: "none", border: "none", color: DS.c.primary, fontWeight: 500, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 }}>‹ Cambiar método</button>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "var(--dc-r-md)", background: metaMet.color, display: "grid", placeItems: "center" }}>{metaMet.icon}</div>
        <div><div style={{ fontWeight: 500, color: NAVY }}>{metaMet.label}</div><div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{metodo === "efectivo" ? "Confirma la recepción del efectivo" : "Valida la transferencia con código y foto"}</div></div>
      </div>
      {metodo === "efectivo" && (
        <label style={{ display: "block", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Efectivo recibido</span>
          <input className="dc-premium-inp" type="number" min="0" step="0.01" value={recibidoEfectivo}
            onChange={(e) => setRecibidoEfectivo(e.target.value)}
            style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          {(() => {
            const rec = Number(recibidoEfectivo) || 0;
            const vuelto = Math.max(0, Math.round((rec - net) * 100) / 100);
            if (!(rec >= net - 0.009)) return <div style={{ marginTop: 8, fontSize: 12, color: "var(--dc-warn-600)" }}>Debe cubrir al menos {sym} {net.toFixed(2)}</div>;
            return <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500, color: vuelto > 0 ? "var(--dc-ok-700)" : "var(--dc-ink-500)" }}>Vuelto: {sym} {vuelto.toFixed(2)}</div>;
          })()}
        </label>
      )}
      {metodo === "transferencia" && (<>
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Código de operación <span style={{ color: "var(--dc-red)" }}>*</span></span>
          <input className="dc-premium-inp" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ej. 00456789" style={{ width: "100%", padding: "11px 13px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Banco / tipo</span>
          <Select value={banco} onChange={setBanco} placeholder="Selecciona el banco…"
                  options={BANCOS.map((b) => ({ value: b, label: b }))} />
        </label>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 }}>Foto del comprobante <span style={{ color: "var(--dc-red)" }}>*</span></span>
          <input ref={fotoRef} type="file" accept="image/*" onChange={onFoto} style={{ display: "none" }} />
          {foto ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--dc-green-soft)", background: "var(--dc-ok-soft)", borderRadius: "var(--dc-r-md)", padding: 8 }}>
              <img src={foto} alt="comprobante" style={{ width: 46, height: 46, objectFit: "cover", borderRadius: "var(--dc-r-sm)" }} />
              <span style={{ fontSize: 13, color: "var(--dc-ok-700)", fontWeight: 500, flex: 1 }}>Comprobante cargado</span>
              <button onClick={() => fotoRef.current && fotoRef.current.click()} style={{ background: "none", border: "none", color: DS.c.primary, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Cambiar</button>
            </div>
          ) : (
            <button onClick={() => fotoRef.current && fotoRef.current.click()} style={{ width: "100%", border: "1.5px dashed var(--dc-line-alt2)", background: "var(--dc-bg-soft)", borderRadius: "var(--dc-r-md)", padding: "13px", cursor: "pointer", color: "var(--dc-ink-400)", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Camera size={16} strokeWidth={1.75} /> Adjuntar foto / captura</button>
          )}
        </div>
      </>)}
      {(() => {
        const faltaEfectivo = metodo === "efectivo" && !(Number(recibidoEfectivo) >= net - 0.009);
        const bloquear = posting || faltaTransf || faltaEfectivo;
        const confirmarEfectivo = () => {
          if (metodo === "efectivo") {
            const vuelto = Math.max(0, Math.round(((Number(recibidoEfectivo) || 0) - net) * 100) / 100);
            if (vuelto > 0) {
              // anotar vuelto en concepto vía cobro (patch local del concept en registrar)
              const prevConcepto = conceptoFull;
              // cobrarDirecto lee conceptoFull del closure; reutilizar con wrapper
              if (postingRef.current || posting) return;
              postingRef.current = true;
              setPaso("procesando");
              setPosting(true);
              const liberar = () => { postingRef.current = false; setPosting(false); };
              let concept = `${prevConcepto} – Vuelto ${sym} ${vuelto.toFixed(2)}`;
              if (moneda === "USD") concept += ` – US$ ${net.toFixed(2)} (TC ${TC_USD})`;
              if (!real) { setTimeout(() => { liberar(); const loc = nextBoletaLocal(getEmisor().serie); aprobado({ metodo: "efectivo", montoCobrado: netPen, parcial, moneda, vuelto: aPen(vuelto), comprobanteSerie: loc.serie, comprobanteNumero: loc.numero }); }, 700); return; }
              api.pagos.registrar({ pacienteId, sedeId, concepto: concept, monto: netPen, metodo: "efectivo", descuento: aPen(Number(desc) || 0) }, { headers: { "Idempotency-Key": idempotencyKey } })
                .then((r) => {
                  if (r?.comprobanteNumero == null || r?.comprobanteNumero === "") { liberar(); fallo("El servidor no asignó número de comprobante."); return; }
                  liberar();
                  aprobado({ metodo: "efectivo", montoCobrado: netPen, parcial, moneda, vuelto: aPen(vuelto), comprobanteSerie: r?.comprobanteSerie, comprobanteNumero: r?.comprobanteNumero, pagoId: r?.id });
                })
                .catch((e) => {
                  liberar();
                  const st = e?.status;
                  if (st >= 500) fallo("El servidor no pudo registrar el cobro. Reintenta en unos segundos.");
                  else if (st === 0) fallo("Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.");
                  else fallo(e?.message || "No se pudo registrar el cobro.");
                });
              return;
            }
          }
          cobrarDirecto(metodo);
        };
        return (
          <>
            <Btn full onClick={confirmarEfectivo} disabled={bloquear} style={{ opacity: bloquear ? 0.55 : 1, pointerEvents: bloquear ? "none" : "auto" }}><CheckCircle2 size={16} strokeWidth={1.75} /> {posting ? "Registrando…" : `Confirmar cobro de ${sym} ${net.toFixed(2)}`}</Btn>
            {faltaTransf && <div style={{ textAlign: "center", fontSize: 12, color: "var(--dc-warn-600)", marginTop: 8 }}>Ingresa el código y adjunta la foto para validar.</div>}
          </>
        );
      })()}
    </>, 22
    );
  }

  if (paso === "procesando") return wrap(
    <div style={{ padding: 28, textAlign: "center" }}>
      <div style={{ width: 52, height: 52, border: "4px solid var(--dc-line)", borderTopColor: DS.c.primary, borderRadius: "50%", margin: "0 auto 18px", animation: "dcspin .8s linear infinite" }} />
      <div style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>Procesando cobro…</div>
      <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 4 }}>{real && (metodo === "tarjeta" || metodo === "yape") ? "Autorizando con Niubiz" : "Registrando el cobro"}{sandbox ? " – sandbox" : ""}</div>
      <style>{`@keyframes dcspin{to{transform:rotate(360deg)}}`}</style>
    </div>, 22
  );

  if (paso === "rechazado") return wrap(
    <div style={{ padding: 20, textAlign: "center" }}>
      <div style={{ width: 60, height: 60, background: "var(--dc-bg)", borderRadius: "50%", margin: "0 auto 16px", display: "grid", placeItems: "center" }}><AlertCircle size={32} strokeWidth={1.75} color={RED} /></div>
      <div style={{ fontWeight: 500, color: NAVY, fontSize: 16 }}>No se pudo cobrar</div>
      <div style={{ fontSize: 13, color: "var(--dc-ink-400)", margin: "6px 0 18px" }}>{msg}</div>
      <Btn full kind="ghost" onClick={volver}>Elegir otro método</Btn>
    </div>, 22
  );

  return (<>
    {wrap(   // aprobado
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ width: 66, height: 66, background: "var(--dc-ok-soft)", borderRadius: "50%", margin: "0 auto 18px", display: "grid", placeItems: "center" }}><CheckCircle2 size={38} strokeWidth={1.75} color="var(--dc-ok-700)" /></div>
        <div style={{ fontWeight: 500, color: NAVY, fontSize: 18, fontFamily: DISPLAY_FONT }}>¡Cobro aprobado!</div>
        {/* No se afirma el envio a SUNAT: el OSE no esta integrado (README §10, frente 1). */}
        <div style={{ fontSize: 13, color: "var(--dc-ink-400)", marginTop: 6 }}>S/ {net.toFixed(2)} – {metaMet.label}{resultado?.vuelto > 0 ? ` – vuelto S/ ${Number(resultado.vuelto).toFixed(2)}` : ""}{cuotas > 1 ? ` – cuota 1 de ${cuotas}` : ""}. {auth.token ? "Comprobante registrado (todavía no se envía a SUNAT)." : "Boleta electrónica emitida (SUNAT)."}</div>
        <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn small kind="ghost" onClick={() => { if (closeRef.current) { clearTimeout(closeRef.current); closeRef.current = null; } abrirBoletaAprobada(); }}><FileText size={15} strokeWidth={1.75} /> Ver boleta</Btn>
          <Btn small onClick={() => { if (closeRef.current) clearTimeout(closeRef.current); onAprobado && onAprobado(resultado); }}><CheckCircle2 size={15} strokeWidth={1.75} /> Listo</Btn>
        </div>
      </div>, 22
    )}
    {verBoleta && <BoletaView boleta={boletaObj} onClose={() => setVerBoleta(false)} />}
  </>);
}

/* Modal de agendamiento en línea para el paciente. */
function AgendarCitaModal({ paciente, onClose, onConfirm, base, citas = CITAS_INIT }) {
  const esReprog = !!base;
  const TEAL = DS.c.primary;
  const [esp, setEsp] = useState(base?.esp || ESPECIALIDADES[0].id);
  const [fecha, setFecha] = useState(base?.fecha || addDays(1));
  const [hora, setHora] = useState(base?.hora || "10:00");
  const [motivo, setMotivo] = useState(base?.motivo || "");
  const espObj = ESPECIALIDADES.find((e) => e.id === esp);
  // El paciente puede pertenecer a varias sedes: elige en cuál se atenderá (editable).
  const sedesPac = sedesDe(paciente);
  const [sedeSel, setSedeSel] = useState(base?.sede || sedesPac[0] || 1);
  const medico = MEDICOS.find((m) => m.esp === esp && sedesDe(m).includes(sedeSel)) || MEDICOS.find((m) => m.esp === esp) || MEDICOS[0];
  const sede = SEDES.find((s) => s.id === sedeSel) || SEDES[0];
  const conflicto = citas.some((c) => (!base || c.id !== base.id) && c.medicoId === medico.id && c.fecha === fecha && c.hora === hora && c.estado !== "cancelada");
  const confirmar = () => onConfirm({ id: base?.id || Date.now(), paciente: paciente.nombre, dni: paciente.dni, medicoId: medico.id, esp, sede: sedeSel, fecha, hora, motivo: motivo.trim() || espObj.nombre, estado: "confirmada", llegada: false });
  const lbl = { fontSize: 13, fontWeight: 500, color: "var(--dc-ink-700)", display: "block", marginBottom: 6 };
  const inp = { width: "100%", padding: "11px 12px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,27,56,.45)", display: "grid", placeItems: "center", zIndex: 200, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "var(--dc-r-lg)", width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 30px 70px -20px rgba(15,27,56,.5)", animation: "dcModal .26s cubic-bezier(.2,.7,.2,1)" }}>
        <div style={{ padding: "22px 24px", background: `linear-gradient(125deg,${TEAL},var(--dc-brand-600))`, color: "#fff", position: "relative" }}>
          <button aria-label="Cerrar" onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,.16)", border: "none", borderRadius: "var(--dc-r-sm)", width: 30, height: 30, cursor: "pointer", color: "#fff", display: "grid", placeItems: "center" }}><X size={16} strokeWidth={1.75} /></button>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: DISPLAY_FONT }}>{esReprog ? "Reprogramar cita" : "Reservar una cita"}</div>
          <div style={{ fontSize: 13, color: "var(--dc-sky)", marginTop: 2 }}>{esReprog ? "Elige la nueva fecha y hora." : "Elige el servicio y el horario que más te convenga."}</div>
        </div>
        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          <label><span style={lbl}>Servicio</span>
            <Select value={esp} onChange={(v) => setEsp(Number(v))} options={ESPECIALIDADES.map((e) => ({ value: e.id, label: `${e.nombre} — desde S/ ${e.precio}` }))} />
          </label>
          {sedesPac.length > 1 && (
            <label><span style={lbl}>Sede <span style={{ color: "var(--dc-ink-500)", fontWeight: 500 }}>– te atiendes en más de una</span></span>
              <Select value={sedeSel} onChange={(v) => setSedeSel(Number(v))} options={sedesPac.map((s) => ({ value: s, label: nombreSede(s) }))} />
            </label>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label><span style={lbl}>Fecha</span><input className="dc-premium-inp" type="date" min={fmt(hoy)} value={fecha} onChange={(e) => setFecha(e.target.value)} style={inp} /></label>
            <label><span style={lbl}>Hora</span><div><TimeSelect value={hora} onChange={setHora} width={"100%"} /></div></label>
          </div>
          <label><span style={lbl}>Motivo (opcional)</span><input className="dc-premium-inp" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={espObj.nombre} style={inp} /></label>
          <div style={{ background: "var(--dc-accent-soft)", border: "1px solid var(--dc-sky)", borderRadius: "var(--dc-r-md)", padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--dc-r-md)", background: medico.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 13, flexShrink: 0 }}>{medico.foto}</div>
            <div style={{ fontSize: 13 }}><div style={{ fontWeight: 500, color: NAVY }}>{medico.nombre}</div><div style={{ color: "var(--dc-ink-700)" }}>{sede.nombre} – {fechaLegible(fecha)} {hora}</div></div>
          </div>
          {conflicto && <div style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-fee)", borderRadius: "var(--dc-r-md)", padding: "10px 14px", display: "flex", gap: 9, alignItems: "center", fontSize: 13, color: "var(--dc-danger-700)" }}><AlertTriangle size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} /> {medico.nombre} ya tiene una cita a las {hora} el {fechaLegible(fecha)}. Elige otro horario o agenda de todos modos.</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 2 }}>
            <Btn small kind="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn small kind={conflicto ? "red" : "navy"} onClick={confirmar}><CheckCircle2 size={15} strokeWidth={1.75} /> {conflicto ? "Agendar de todos modos" : (esReprog ? "Reprogramar" : "Confirmar cita")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================================
   PORTAL DEL PACIENTE — vista limitada, solo lo suyo
   =========================================================================== */
function PortalPaciente({ usuario, onLogout }) {
  const pid = usuario.pacienteId;
  const conectado = !!auth.token;
  const [portalPac, setPortalPac] = useState(() => {
    if (conectado) return { id: pid, nombre: usuario.nombre || "Paciente", dni: "—", telefono: "", alergias: [], antecedentes: [] };
    return PACIENTES_INIT.find((p) => p.id === pid) || usuario.pacienteData || { id: pid, nombre: usuario.nombre, dni: "—", telefono: "", sedes: [1] };
  });
  const paciente = portalPac;
  const [ficha, setFicha] = useState(() => {
    if (conectado) {
      return { tratamiento: [], pagos: [], ahorro: 0, odontograma: {}, historia: [], recetas: [], alergias: [], antecedentes: [] };
    }
    return FICHA_CLINICA[pid] || { tratamiento: [], pagos: [], ahorro: 0, odontograma: {}, historia: [], recetas: [] };
  });
  const [vista, setVistaRaw] = useState(() => localStorage.getItem("dc_vista_paciente") || "inicio");
  const [navOpen, setNavOpen] = useState(false);
  const setVista = (v) => { setVistaRaw(v); setNavOpen(false); };
  useEffect(() => { localStorage.setItem("dc_vista_paciente", vista); }, [vista]);
  const [toast, setToast] = useState(null);
  const [verCita, setVerCita] = useState(null); // cita abierta en detalle
  const [verPago, setVerPago] = useState(null); // pago abierto en comprobante
  const [verVisita, setVerVisita] = useState(null); // visita de la historia
  const [verFase, setVerFase] = useState(null); // fase del tratamiento
  const [pagoModal, setPagoModal] = useState(null); // monto a pagar o null
  const notify = (m) => { setToast(m); setTimeout(() => setToast(null), 4200); };

  const [portalError, setPortalError] = useState(null);
  const [totalInvertidoApi, setTotalInvertidoApi] = useState(null);
  const [totalAhorradoApi, setTotalAhorradoApi] = useState(null);

  const tratamiento = ficha.tratamiento || [];
  const total = tratamiento.reduce((s, f) => s + (Number(f.costo) || 0), 0);
  const pagado = tratamiento.filter((f) => f.estado === "atendida").reduce((s, f) => s + (Number(f.costo) || 0), 0);
  const saldo = Math.max(0, total - pagado);
  const pendientes = tratamiento.filter((f) => f.estado === "pendiente").length;
  const invertido = totalInvertidoApi != null
    ? Number(totalInvertidoApi)
    : (ficha.pagos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const ahorro = totalAhorradoApi != null ? Number(totalAhorradoApi) : Number(ficha.ahorro || 0);

  // Resumen amigable del odontograma (sin tecnicismos)
  const piezasAtencion = Object.values(ficha.odontograma || {}).filter((d) => {
    const tieneCaries = d.whole === "caries" || d.whole === "extraer" || d.whole === "fractura" || (d.caras && Object.values(d.caras).includes("caries"));
    return tieneCaries;
  }).length;

  // Citas del paciente (con estado para poder agendar nuevas en la demo)
  const [misCitas, setMisCitas] = useState(() => conectado ? [] : CITAS_INIT.filter((c) => c.paciente === paciente.nombre));
  const cargarPortal = () => {
    if (!conectado) return;
    api.portal.resumen().then((r) => {
      setPortalError(null);
      const p = r.paciente || {};
      setPortalPac({
        id: p.id || pid,
        nombre: p.nombre || usuario.nombre || "Paciente",
        dni: p.dni || "—",
        telefono: p.telefono || "",
        alergias: p.alergias || [],
        antecedentes: p.antecedentes || [],
      });
      const pagos = (r.pagos || []).map((pg) => ({
        id: pg.id,
        monto: Number(pg.monto) || 0,
        descuento: Number(pg.descuento) || 0,
        concepto: pg.concepto || "Pago",
        metodo: pg.metodo || "—",
        fecha: pg.creadoEn ? String(pg.creadoEn).slice(0, 10) : "—",
      }));
      setFicha((prev) => ({
        ...prev,
        pagos,
        alergias: p.alergias || [],
        antecedentes: p.antecedentes || [],
        tratamiento: prev.tratamiento || [],
        odontograma: {},
        historia: [],
        recetas: [],
        ahorro: Number(r.totalAhorrado) || 0,
      }));
      setTotalInvertidoApi(r.totalInvertido != null ? r.totalInvertido : null);
      setTotalAhorradoApi(r.totalAhorrado != null ? r.totalAhorrado : null);
      setMisCitas((r.citas || []).map((c) => ({
        id: c.id,
        paciente: p.nombre || usuario.nombre,
        fecha: c.fecha,
        hora: (c.hora || "").toString().slice(0, 5),
        estado: c.estado,
        motivo: c.motivo || "Consulta",
      })));
    }).catch((e) => {
      setMisCitas([]);
      if (e?.status === 404) {
        setPortalError("No se encontró el resumen del portal (404). Verifica que el paciente exista y el API esté actualizado.");
      } else if (e?.status === 401 || e?.status === 403) {
        setPortalError("Sesión del portal inválida o sin permiso. Vuelve a iniciar sesión con tu DNI.");
      } else {
        setPortalError("No se pudo cargar el resumen del portal. Intenta de nuevo en unos momentos.");
      }
    });
  };
  useEffect(() => { cargarPortal(); }, []); // eslint-disable-line
  const [agendar, setAgendar] = useState(null); // null | "nueva" | citaObj (reprogramar)
  const proximaCita = misCitas.filter((c) => c.estado !== "cancelada" && c.fecha >= fmt(hoy)).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
  const agendarCita = (c) => {
    if (conectado) {
      notify("La reserva de citas desde el portal aún no está conectada al API. Pide una cita en recepción o WhatsApp.");
      setAgendar(null);
      return;
    }
    const existe = misCitas.some((x) => x.id === c.id);
    setMisCitas((cs) => existe ? cs.map((x) => x.id === c.id ? { ...x, ...c } : x) : [...cs, c]);
    setAgendar(null);
    notify(existe ? `Cita reprogramada: ${fechaLegible(c.fecha)} ${c.hora}.` : `Cita reservada: ${fechaLegible(c.fecha)} ${c.hora}. Te confirmamos por WhatsApp.`);
  };
  const confirmarCita = (id) => {
    setMisCitas((cs) => cs.map((x) => x.id === id ? { ...x, estado: "confirmada" } : x));
    notify("¡Cita confirmada! Te esperamos 😊");
    if (conectado) api.portal.confirmar(id).then(cargarPortal).catch(() => { notify("No se pudo confirmar."); cargarPortal(); });
  };
  const cancelarCita = (id) => {
    setMisCitas((cs) => cs.map((x) => x.id === id ? { ...x, estado: "cancelada" } : x));
    notify("Tu cita fue cancelada.");
    if (conectado) api.portal.cancelar(id).then(cargarPortal).catch(() => { notify("No se pudo cancelar."); cargarPortal(); });
  };

  const NAV = [
    { id: "inicio", label: "Inicio", icon: LayoutDashboard },
    { id: "salud", label: "Mi salud", icon: Activity },
    { id: "citas", label: "Mis citas", icon: Calendar },
    { id: "pagos", label: "Mis pagos y ahorro", icon: Wallet },
    { id: "tratamiento", label: "Mi tratamiento", icon: ClipboardList },
  ];

  const atendidasN = tratamiento.filter((f) => f.estado === "atendida").length;
  const progreso = tratamiento.length ? Math.round((atendidasN / tratamiento.length) * 100) : 0;
  const TEAL = DS.c.primary;

  // Bug D25 re-test: Hacer Tile clickeable cuando se pasa onClick
  const Tile = ({ icon, titulo, valor, sub, color, onClick }) => (
    <Card style={{ padding: 20, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>{titulo}</div>
        <div style={{ background: tint(color, 0.082), color, width: 38, height: 38, borderRadius: "var(--dc-r-md)", display: "grid", placeItems: "center" }}>{icon}</div>
      </div>
      <div style={{ fontSize: 21, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>{valor}</div>
      {sub && <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 3 }}>{sub}</div>}
    </Card>
  );

  const Ring = ({ pct, size = 92, color = TEAL }) => {
    const r = (size - 12) / 2, C = 2 * Math.PI * r;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--dc-bg)" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(pct / 100) * C} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="800" fontFamily={DISPLAY_FONT} fill={NAVY}>{pct}%</text>
      </svg>
    );
  };
  const accion = (icon, label, onClick) => (
    <button onClick={onClick} style={{ flex: 1, minWidth: 120, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: "var(--dc-r-md)", padding: "12px 10px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500 }}>{icon}{label}</button>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: BG, fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }}>
      {navOpen && <div onClick={() => setNavOpen(false)} className="dc-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,27,56,.45)", zIndex: 45 }} />}
      <aside className={`dc-side${navOpen ? " open" : ""}`} style={{ width: 230, background: "linear-gradient(180deg,var(--dc-accent-cyan),var(--dc-brand-600))", color: "#fff", flexShrink: 0, position: "relative", height: "calc(100vh - 24px)", margin: "12px 0 12px 12px", borderRadius: "var(--dc-r-lg)", boxShadow: "0 10px 40px -10px rgba(14,116,144,.3)", border: "1px solid rgba(255,255,255,.15)", display: "flex", flexDirection: "column", zIndex: 50 }}>
        <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#fff", borderRadius: "var(--dc-r-sm)", width: 34, height: 34, display: "grid", placeItems: "center" }}><Smile size={19} strokeWidth={1.75} color={DS.c.primary} /></div>
          <div><div style={{ fontWeight: 500, fontSize: 14 }}>Mi Sonríe+</div><div style={{ fontSize: 12, color: "var(--dc-sky)" }}>Portal del paciente</div></div>
        </div>
        <nav style={{ padding: 10, flex: 1 }}>
          {NAV.map((it) => { const Icon = it.icon; const active = vista === it.id; return (
            <button key={it.id} onClick={() => setVista(it.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "11px 12px", borderRadius: "var(--dc-r-sm)", marginBottom: 3, cursor: "pointer", border: "none", fontSize: 14, fontWeight: 500, background: active ? "rgba(255,255,255,.2)" : "transparent", color: "#fff" }}><Icon size={18} strokeWidth={1.75} /> {it.label}</button>
          ); })}
        </nav>
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px" }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-sm)", background: "#fff", color: DS.c.primary, display: "grid", placeItems: "center", fontWeight: 500, fontSize: 13 }}>{paciente.nombre.split(" ").map((x) => x[0]).join("").slice(0, 2)}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{paciente.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-sky)" }}>Paciente</div></div>
            <button type="button" className="dc-icon-btn" aria-label="Salir" onClick={onLogout} title="Salir" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dc-sky)" }}><LogOut size={17} strokeWidth={1.75} /></button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto", position: "relative" }}>
        <header style={{ background: "#fff", borderBottom: "1px solid var(--dc-line)", padding: "14px 22px", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <button className="dc-burger" onClick={() => setNavOpen((s) => !s)} aria-label="Abrir menú" style={{ background: "none", border: "none", cursor: "pointer", color: NAVY, display: "none", padding: 0, minWidth: "var(--dc-tap-min)", minHeight: "var(--dc-tap-min)" }}><Menu size={22} strokeWidth={1.75} /></button>
            <div style={{ fontSize: 18, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{NAV.find((n) => n.id === vista)?.label}</div>
          </div>
          <div style={{ fontSize: 13, color: "var(--dc-ink-500)", display: "flex", alignItems: "center", gap: 6 }}><Smile size={14} strokeWidth={1.75} color={TEAL} /> Clínica Dental Sonríe+</div>
        </header>

        <div style={{ padding: 22 }}>
          {portalError && (
            <Card style={{ padding: 14, marginBottom: 16, background: "var(--dc-danger-soft)", border: "1px solid var(--dc-danger-mid)" }}>
              <div style={{ fontSize: 13, color: "var(--dc-danger-700)", lineHeight: 1.5 }}><b>Portal.</b> {portalError}</div>
            </Card>
          )}
          {vista === "inicio" && (
            <div style={{ display: "grid", gap: 16 }}>
              <Card style={{ padding: 24, background: "linear-gradient(125deg,var(--dc-accent-cyan),var(--dc-brand-600))", color: "#fff", border: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 54, height: 54, borderRadius: "var(--dc-r-lg)", background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 18, fontFamily: DISPLAY_FONT, flexShrink: 0 }}>{paciente.nombre.split(" ").map((x) => x[0]).join("").slice(0, 2)}</div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, color: "var(--dc-sky)" }}>Hola,</div>
                    <div style={{ fontSize: 21, fontWeight: 600, fontFamily: DISPLAY_FONT, lineHeight: 1.1 }}>{paciente.nombre} 👋</div>
                  </div>
                </div>
                {proximaCita ? (
                  <div style={{ marginTop: 16, background: "rgba(255,255,255,.15)", borderRadius: "var(--dc-r-md)", padding: 14, display: "inline-flex", alignItems: "center", gap: 12 }}>
                    <Calendar size={20} strokeWidth={1.75} /><div><div style={{ fontSize: 12, color: "var(--dc-sky)" }}>Tu próxima cita</div><div style={{ fontWeight: 500, textTransform: "capitalize" }}>{fechaLegible(proximaCita.fecha)} – {proximaCita.hora} — {proximaCita.motivo}</div></div>
                  </div>
                ) : <div style={{ marginTop: 12, fontSize: 14, color: "var(--dc-sky)" }}>No tienes citas próximas. ¡Reserva la siguiente!</div>}
                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {accion(<Calendar size={18} strokeWidth={1.75} />, "Reservar cita", () => setAgendar("nueva"))}
                  {accion(<CreditCard size={18} strokeWidth={1.75} />, saldo > 0 ? "Pagar saldo" : "Mis pagos", () => setVista("pagos"))}
                  {accion(<ClipboardList size={18} strokeWidth={1.75} />, "Mi tratamiento", () => setVista("tratamiento"))}
                </div>
              </Card>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }} className="dc-gerencial-row">
                <Card style={{ padding: 22, display: "flex", alignItems: "center", gap: 18 }}>
                  <Ring pct={progreso} />
                  <div>
                    <div style={{ fontSize: 13, color: "var(--dc-ink-400)", fontWeight: 500 }}>Avance de tu tratamiento</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, margin: "2px 0 4px" }}>{atendidasN} de {tratamiento.length} fases</div>
                    <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{pendientes > 0 ? `${pendientes} pendiente(s) por completar` : "¡Tratamiento al día!"}</div>
                  </div>
                </Card>
                <Card style={{ padding: 22, background: piezasAtencion ? "var(--dc-white)" : "var(--dc-ok-soft)", border: `1px solid ${piezasAtencion ? "var(--dc-amber-soft)" : "var(--dc-green-soft)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontSize: 44 }}>{piezasAtencion ? "🦷" : "😁"}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>{piezasAtencion === 0 ? "Tu boca está sana" : `${piezasAtencion} pieza(s) por atender`}</div>
                      <div style={{ fontSize: 13, color: "var(--dc-ink-400)", marginTop: 3 }}>{piezasAtencion === 0 ? "Sigue así: control cada 6 meses." : "Tu odontólogo recomienda tratarlas pronto."}</div>
                      <button onClick={() => setVista("salud")} style={{ marginTop: 10, background: "none", border: "none", color: TEAL, fontWeight: 500, fontSize: 13, cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>Ver mi salud <ChevronRight size={15} strokeWidth={1.75} /></button>
                    </div>
                  </div>
                </Card>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }}>
                {/* Bug D25 re-test: Tarjeta "Saldo pendiente" clickeable navega a pagos */}
                <Tile icon={<Wallet size={19} strokeWidth={1.75} />} titulo="Saldo pendiente" valor={`S/ ${saldo.toFixed(0)}`} sub={saldo > 0 ? "Puedes pagar en cuotas" : "Estás al día"} color={RED} onClick={saldo > 0 ? () => setVista("pagos") : undefined} />
                <Tile icon={<Percent size={19} strokeWidth={1.75} />} titulo="Has ahorrado" valor={`S/ ${ahorro.toFixed(0)}`} sub="En descuentos y promos" color="var(--dc-ok-700)" />
                <Tile icon={<CreditCard size={19} strokeWidth={1.75} />} titulo="Total invertido" valor={`S/ ${invertido.toFixed(0)}`} sub="En tu salud dental" color={NAVY} />
              </div>
            </div>
          )}

          {vista === "salud" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
                <Tile icon={<Smile size={19} strokeWidth={1.75} />} titulo="Piezas por atender" valor={piezasAtencion} sub={piezasAtencion ? "Tu dentista las revisó" : "Todo en orden"} color={piezasAtencion ? "var(--dc-warn-600)" : "var(--dc-ok-700)"} />
                <Tile icon={<FileText size={19} strokeWidth={1.75} />} titulo="Recetas activas" valor={(ficha.recetas || []).length} sub="En tu historia" color={TEAL} />
                <Tile icon={<Activity size={19} strokeWidth={1.75} />} titulo="Última visita" valor={(ficha.historia || [])[0]?.fecha || "—"} sub="Registrada" color={NAVY} />
              </div>
              <Card style={{ padding: 22 }}>
                <h3 style={{ margin: "0 0 4px", color: NAVY, fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Resumen de tu salud dental</h3>
                <p style={{ color: "var(--dc-ink-400)", fontSize: 14, margin: "0 0 16px" }}>Una mirada sencilla a cómo está tu boca.</p>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, background: piezasAtencion ? "var(--dc-warn-soft)" : "var(--dc-ok-soft)", borderRadius: "var(--dc-r-md)", padding: 18 }}>
                    <div style={{ fontSize: 27 }}>{piezasAtencion ? "🦷" : "✅"}</div>
                    <div style={{ fontWeight: 500, color: NAVY, fontSize: 14, marginTop: 6 }}>{piezasAtencion ? `${piezasAtencion} pieza(s) requieren atención` : "Sin pendientes"}</div>
                    <div style={{ fontSize: 13, color: "var(--dc-ink-400)", marginTop: 4 }}>{piezasAtencion ? "Tu odontólogo te recomienda tratarlas pronto." : "¡Buen trabajo cuidando tu sonrisa!"}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200, background: "var(--dc-bg)", borderRadius: "var(--dc-r-md)", padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 8 }}>Alergias y antecedentes</div>
                    {((ficha.alergias || []).length || (ficha.antecedentes || []).length) ? (
                      <div style={{ fontSize: 13, color: "var(--dc-ink-700)", lineHeight: 1.7 }}>
                        {(ficha.alergias || []).length > 0 && <div>⚠️ Alergias: {ficha.alergias.join(", ")}</div>}
                        {(ficha.antecedentes || []).length > 0 && <div>📋 Antecedentes: {ficha.antecedentes.join(", ")}</div>}
                      </div>
                    ) : <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>Sin registros.</div>}
                  </div>
                </div>
              </Card>
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)" }}><h3 style={{ margin: 0, color: NAVY, fontSize: 14, fontWeight: 500 }}>Historia de mis visitas</h3></div>
                {ficha.historia?.map((h, i) => (
                  <div key={i} onClick={() => setVerVisita(h)} title="Ver detalle" style={{ cursor: "pointer", padding: "16px 20px", borderTop: i ? "1px solid var(--dc-line)" : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "var(--dc-r-full)", background: DS.c.primary, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 500, color: NAVY }}>{h.titulo}</div><div style={{ fontSize: 13, color: "var(--dc-ink-500)", margin: "2px 0 5px" }}>{h.fecha}</div><div style={{ fontSize: 13, color: "var(--dc-ink-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.detalle}</div></div>
                    <ChevronRight size={16} strokeWidth={1.75} color="var(--dc-ink-400)" style={{ marginTop: 3, flexShrink: 0 }} />
                  </div>
                ))}
                {(!ficha.historia || ficha.historia.length === 0) && <Vacio icon={<Activity size={22} strokeWidth={1.75} />} titulo="Sin visitas aún" sub="Tu historia clínica aparecerá aquí tras tu primera atención." />}
              </Card>
              {(ficha.recetas || []).length > 0 && (
                <Card style={{ padding: 22 }}>
                  <h3 style={{ margin: "0 0 12px", color: NAVY, fontSize: 14, fontWeight: 500 }}>Mis recetas</h3>
                  {ficha.recetas.map((r, i) => <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: i < ficha.recetas.length - 1 ? "1px solid var(--dc-line)" : "none" }}><FileText size={17} strokeWidth={1.75} color={DS.c.primary} /><div><div style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>{r.texto}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{r.fecha}</div></div></div>)}
                </Card>
              )}
            </div>
          )}

          {vista === "citas" && (
            <div style={{ display: "grid", gap: 16 }}>
              {(() => { const asis = misCitas.filter((c) => c.estado === "atendida").length; const prox = misCitas.filter((c) => c.fecha >= fmt(hoy) && c.estado !== "cancelada" && c.estado !== "atendida").length; return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
                  <Tile icon={<Calendar size={19} strokeWidth={1.75} />} titulo="Próximas citas" valor={prox} sub="agendadas" color={TEAL} />
                  <Tile icon={<CheckCircle2 size={19} strokeWidth={1.75} />} titulo="Atendidas" valor={asis} sub="visitas completadas" color="var(--dc-ok-700)" />
                  <Tile icon={<ClipboardList size={19} strokeWidth={1.75} />} titulo="Total" valor={misCitas.length} sub="en tu historial" color={NAVY} />
                </div>
              ); })()}
              {proximaCita && (
                <Card style={{ padding: 22, border: `1.5px solid var(--dc-accent-cyan)` }}>
                  <div style={{ fontSize: 13, color: DS.c.primary, fontWeight: 500, textTransform: "uppercase", marginBottom: 8 }}>Próxima cita</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div><div style={{ fontSize: 18, fontWeight: 600, color: NAVY, textTransform: "capitalize", fontFamily: DISPLAY_FONT }}>{fechaLegible(proximaCita.fecha)} – {proximaCita.hora}</div><div style={{ fontSize: 14, color: "var(--dc-ink-400)" }}>{proximaCita.motivo}</div></div>
                    <div style={{ display: "flex", gap: 8 }}><Btn small kind="ghost" onClick={() => cancelarCita(proximaCita.id)}>Cancelar</Btn><Btn small kind="ghost" onClick={() => setAgendar(proximaCita)}>Reprogramar</Btn>{proximaCita.estado !== "confirmada" && <Btn small onClick={() => confirmarCita(proximaCita.id)}>Confirmar</Btn>}</div>
                  </div>
                </Card>
              )}
              <Card style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><h3 style={{ margin: 0, color: NAVY, fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Historial de citas</h3><Btn small onClick={() => setAgendar("nueva")}><Plus size={15} strokeWidth={1.75} /> Agendar nueva</Btn></div>
                {[...misCitas].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).map((c) => (
                  <div key={c.id} onClick={() => setVerCita(c)} title="Ver detalle" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "12px 6px", borderTop: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)" }}>
                    <div style={{ width: 50, textAlign: "center" }}><div style={{ fontWeight: 500, color: NAVY }}>{c.hora}</div></div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 500, color: NAVY, textTransform: "capitalize" }}>{fechaLegible(c.fecha)}</div><div style={{ fontSize: 13, color: "var(--dc-ink-400)" }}>{c.motivo}</div></div>
                    <Badge estado={c.estado} /><ChevronRight size={16} strokeWidth={1.75} color="var(--dc-ink-400)" />
                  </div>
                ))}
                {misCitas.length === 0 && <Vacio icon={<Calendar size={22} strokeWidth={1.75} />} titulo="Sin citas" sub="Aún no tienes citas. Agenda la primera cuando quieras." />}
              </Card>
            </div>
          )}

          {vista === "pagos" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
                <Tile icon={<Wallet size={19} strokeWidth={1.75} />} titulo="Total invertido" valor={`S/ ${invertido.toFixed(0)}`} sub="En tu salud dental" color={NAVY} />
                <Tile icon={<Percent size={19} strokeWidth={1.75} />} titulo="Has ahorrado" valor={`S/ ${ahorro.toFixed(0)}`} sub="Gracias a descuentos" color="var(--dc-ok-700)" />
                <Tile icon={<CreditCard size={19} strokeWidth={1.75} />} titulo="Saldo pendiente" valor={`S/ ${saldo.toFixed(0)}`} sub={saldo > 0 ? "En cuotas disponibles" : "Estás al día"} color={RED} />
              </div>
              {saldo > 0 && (
                <Card style={{ padding: 20, background: "var(--dc-accent-soft)", border: "1px solid var(--dc-sky)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div><div style={{ fontWeight: 500, color: NAVY }}>Paga cómodo en cuotas</div><div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Saldo S/ {saldo.toFixed(2)} en 3 cuotas de S/ {(saldo / 3).toFixed(2)} con Yape, Plin o tarjeta.</div></div>
                    <Btn kind="red" onClick={() => setPagoModal(saldo)}><CreditCard size={16} strokeWidth={1.75} /> Pagar con Niubiz</Btn>
                  </div>
                </Card>
              )}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--dc-line)" }}><h3 style={{ margin: 0, color: NAVY, fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Historial de pagos</h3></div>
                {ficha.pagos.map((p, i) => (
                  <div key={i} onClick={() => setVerPago(p)} title="Ver comprobante" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderTop: i ? "1px solid var(--dc-line)" : "none" }}>
                    <div style={{ background: "var(--dc-ok-soft)", color: "var(--dc-ok-700)", width: 34, height: 34, borderRadius: "var(--dc-r-sm)", display: "grid", placeItems: "center" }}><CheckCircle2 size={17} strokeWidth={1.75} /></div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 500, color: NAVY }}>{p.concepto}</div><div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{p.fecha} – {p.metodo}</div></div>
                    <div style={{ fontWeight: 500, color: NAVY }}>S/ {p.monto}</div>
                    <button type="button" className="dc-icon-btn" aria-label="Descargar boleta" onClick={(e) => { e.stopPropagation(); notify("Descargando boleta electrónica..."); }} style={{ background: "none", border: "none", cursor: "pointer", color: DS.c.primary }} title="Descargar boleta"><FileText size={17} strokeWidth={1.75} /></button>
                  </div>
                ))}
                {(!ficha.pagos || ficha.pagos.length === 0) && <Vacio icon={<Wallet size={22} strokeWidth={1.75} />} titulo="Sin pagos" sub="Aquí verás tus boletas cuando realices un pago." />}
              </Card>
            </div>
          )}

          {vista === "tratamiento" && (
            <Card style={{ padding: 22 }}>
              <h3 style={{ margin: "0 0 4px", color: NAVY, fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT }}>Mi plan de tratamiento</h3>
              <p style={{ color: "var(--dc-ink-400)", fontSize: 14, margin: "0 0 18px" }}>Tu progreso paso a paso, fase por fase.</p>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span style={{ color: "var(--dc-ink-400)" }}>Avance general</span><span style={{ fontWeight: 600, color: TEAL, fontFamily: DISPLAY_FONT }}>{progreso}%</span></div>
                <div style={{ height: 10, background: "var(--dc-bg)", borderRadius: "var(--dc-r-full)", overflow: "hidden" }}><div style={{ width: `${progreso}%`, height: "100%", background: `linear-gradient(90deg,${TEAL},var(--dc-brand-600))` }} /></div>
              </div>
              <div style={{ position: "relative" }}>
                {tratamiento.map((f, i) => { const done = f.estado === "atendida"; return (
                  <div key={f.id} onClick={() => setVerFase(f)} title="Ver detalle" style={{ cursor: "pointer", display: "flex", gap: 14, paddingBottom: i < tratamiento.length - 1 ? 18 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 30, height: 30, borderRadius: "var(--dc-r-full)", background: done ? TEAL : "#fff", color: done ? "#fff" : "var(--dc-ink-500)", border: done ? "none" : "2px solid var(--dc-bg)", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 13, flexShrink: 0 }}>{done ? <Check size={16} strokeWidth={1.75} /> : i + 1}</div>
                      {i < tratamiento.length - 1 && <div style={{ width: 2, flex: 1, background: done ? tint(TEAL, 0.333) : "var(--dc-line)", marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1, paddingTop: 3 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 500, color: NAVY }}>{f.nombre}</div>
                        <Badge estado={f.estado} />
                      </div>
                      <div style={{ fontSize: 13, color: "var(--dc-ink-400)", marginTop: 2 }}>S/ {f.costo.toFixed(2)}</div>
                    </div>
                  </div>
                ); })}
                {tratamiento.length === 0 && <Vacio icon={<ClipboardList size={22} strokeWidth={1.75} />} titulo="Sin plan aún" sub="Cuando tu odontólogo cree tu plan de tratamiento, lo verás aquí paso a paso." />}
              </div>
              {saldo > 0 && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--dc-line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--dc-ink-700)" }}>Saldo pendiente de tu plan: <strong style={{ color: RED }}>S/ {saldo.toFixed(2)}</strong></div>
                  <Btn small kind="red" onClick={() => setVista("pagos")}><CreditCard size={15} strokeWidth={1.75} /> Ir a pagar</Btn>
                </div>
              )}
            </Card>
          )}
        </div>
      </main>

      {verCita && (() => { const c = misCitas.find((x) => x.id === verCita.id) || verCita; const futura = c.fecha >= fmt(hoy) && c.estado !== "cancelada" && c.estado !== "atendida"; return (
        <Modal icon={<Calendar size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo={fechaLegible(c.fecha)} sub={`${c.hora} – ${c.motivo}`} onClose={() => setVerCita(null)} maxW={440}
          footer={futura ? <><Btn small kind="ghost" onClick={() => { setVerCita(null); setAgendar(c); }}>Reprogramar</Btn>{c.estado !== "confirmada" && <Btn small onClick={() => { confirmarCita(c.id); setVerCita(null); }}><Check size={15} strokeWidth={1.75} /> Confirmar</Btn>}</> : <Btn small kind="ghost" onClick={() => setVerCita(null)}>Cerrar</Btn>}>
          <div style={{ display: "grid", gap: 10 }}>
            {[["Fecha", fechaLegible(c.fecha)], ["Hora", c.hora], ["Motivo", c.motivo]].map(([l, v]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>{l}</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500, textAlign: "right", textTransform: l === "Fecha" ? "capitalize" : "none" }}>{v}</span></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Estado</span><Badge estado={c.estado} /></div>
          </div>
        </Modal>
      ); })()}
      {verPago && (
        <Modal icon={<CheckCircle2 size={20} strokeWidth={1.75} />} tone="var(--dc-ok)" titulo="Comprobante de pago" sub={verPago.concepto} onClose={() => setVerPago(null)} maxW={420}
          footer={<><Btn small kind="ghost" onClick={() => setVerPago(null)}>Cerrar</Btn><Btn small onClick={() => { notify("Descargando boleta electrónica…"); setVerPago(null); }}><FileText size={15} strokeWidth={1.75} /> Descargar boleta</Btn></>}>
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "var(--dc-r-lg)", background: "var(--dc-ok-soft)", color: "var(--dc-ok-700)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}><CheckCircle2 size={26} strokeWidth={1.75} /></div>
            <div style={{ fontSize: 27, fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT }}>S/ {verPago.monto}</div>
            <div style={{ fontSize: 13, color: "var(--dc-ok-700)", fontWeight: 500, marginTop: 2 }}>Pagado</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[["Concepto", verPago.concepto], ["Fecha", verPago.fecha], ["Método", verPago.metodo], ["Comprobante", auth.token ? "Comprobante de pago" : "Boleta electrónica SUNAT"]].map(([l, v]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>{l}</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500, textAlign: "right" }}>{v}</span></div>)}
          </div>
        </Modal>
      )}
      {verVisita && (
        <Modal icon={<Activity size={20} strokeWidth={1.75} />} tone={DS.c.primary} titulo={verVisita.titulo} sub={verVisita.fecha} onClose={() => setVerVisita(null)} maxW={440} footer={<Btn small kind="ghost" onClick={() => setVerVisita(null)}>Cerrar</Btn>}>
          <div style={{ fontSize: 14, color: "var(--dc-ink-700)", lineHeight: 1.6, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "13px 15px" }}>{verVisita.detalle}</div>
        </Modal>
      )}
      {verFase && (
        <Modal icon={<ClipboardList size={20} strokeWidth={1.75} />} tone={verFase.estado === "atendida" ? "var(--dc-ok-700)" : NAVY} titulo={verFase.nombre} sub="Fase de tu tratamiento" onClose={() => setVerFase(null)} maxW={420} footer={<Btn small kind="ghost" onClick={() => setVerFase(null)}>Cerrar</Btn>}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Procedimiento</span><span style={{ fontSize: 13, color: NAVY, fontWeight: 500, textAlign: "right" }}>{verFase.nombre}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--dc-bg)" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Costo</span><span style={{ fontSize: 14, color: NAVY, fontWeight: 600, fontFamily: DISPLAY_FONT }}>S/ {verFase.costo.toFixed(2)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0" }}><span style={{ fontSize: 13, color: "var(--dc-ink-500)", fontWeight: 500 }}>Estado</span><Badge estado={verFase.estado} /></div>
          </div>
        </Modal>
      )}
      {agendar && <AgendarCitaModal paciente={paciente} base={agendar !== "nueva" ? agendar : null} onClose={() => setAgendar(null)} onConfirm={agendarCita} />}
      {pagoModal != null && <ModalCobro monto={pagoModal} onClose={() => setPagoModal(null)} onAprobado={() => { setPagoModal(null); notify(auth.token ? "¡Pago aprobado! Comprobante registrado (todavía no se envía a SUNAT ni por correo)." : "¡Pago aprobado! Boleta electrónica emitida y enviada a tu correo."); }} />}
      {toast && (() => { const tn = tonoAviso(toast); return (
        <div className="dc-toast" role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, background: "#fff", borderRadius: "var(--dc-r-lg)", border: `1px solid ${tn.borde}`, boxShadow: "0 12px 32px rgba(16,24,40,.18)", padding: 16, display: "flex", gap: 12, alignItems: "center", maxWidth: 340 }}>
          <div style={{ background: tn.error ? tn.fondo : "var(--dc-accent-soft)", color: tn.error ? tn.color : DS.c.primary, borderRadius: "var(--dc-r-md)", width: 36, height: 36, display: "grid", placeItems: "center", flexShrink: 0 }}>
            {tn.error ? <AlertTriangle size={19} strokeWidth={1.75} /> : <CheckCircle2 size={19} strokeWidth={1.75} />}
          </div>
          <div style={{ fontSize: 13, color: tn.color, fontWeight: 500 }}>{toast}</div>
        </div>
      ); })()}
    </div>
  );
}

/* Planes de membresía (mercado dental peruano). Precios en soles/mes, sin IGV.
   Cada plan incluye bolsas de lo que cuesta operar (IA, WhatsApp, SUNAT);
   el consumo adicional se cobra aparte para cuidar el margen. */
/* Modelo de cobro (verificado vs. mercado): se factura POR SEDE y POR ODONTÓLOGO.
   El staff de apoyo (recepción/admin/TI) y los PACIENTES son ilimitados en todos
   los planes de pago; solo la prueba de 14 días limita pacientes (30). */
const PACIENTES_TRIAL = 30;
const PLANES = [
  { id: "pequena", nombre: "Consultorio", precio: 129, tagline: "Para el consultorio que empieza",
    sedesIncl: 1, sedeExtra: null, odontologos: 2, odontologoExtra: 59, usuarios: "ilim", pacientes: "ilim",
    incluye: ["1 sede – 2 odontólogos", "Usuarios de apoyo ilimitados", "Pacientes ilimitados + portal", "Agenda, odontograma e historia clínica", "Boleta electrónica SUNAT – 100/mes", "Odontólogo adicional S/59/mes"] },
  { id: "mediana", nombre: "Clínica", precio: 349, tagline: "Para la clínica en crecimiento", destacado: true,
    sedesIncl: 1, sedeExtra: 149, odontologos: 6, odontologoExtra: 49, usuarios: "ilim", pacientes: "ilim",
    incluye: ["1 sede incluida – +S/149 por sede", "6 odontólogos – usuarios ilimitados", "Pacientes ilimitados + auto-registro por link", "Agente de IA en WhatsApp – 500 conv./mes", "Recall, comisiones y reportes", "SUNAT – 500 comprobantes/mes"] },
  { id: "grande", nombre: "Cadena", precio: 699, tagline: "Para varias sedes y franquicias",
    sedesIncl: 3, sedeExtra: 119, odontologos: "ilim", odontologoExtra: null, usuarios: "ilim", pacientes: "ilim",
    incluye: ["3 sedes incluidas – +S/119 por sede", "Odontólogos y usuarios ilimitados", "Pacientes ilimitados", "Seguros y EPS – panel multi-sede", "Auditoría, API y control de accesos", "Bolsas ampliadas de IA, WhatsApp y SUNAT"] },
];

/* ===========================================================================
   PANTALLA DE BIENVENIDA — guía a la clínica que abre el link sin vendedor
   =========================================================================== */
function Bienvenida({ onEntrar }) {
  const DISPLAY = "'Manrope Variable', 'Manrope', 'Inter Variable', system-ui, sans-serif";
  const ink = "var(--dc-ink-alt)", navy = NAVY, red = RED, teal = DS.c.primary, wa = "var(--dc-brand-600)";
  const bg = "var(--dc-bg)", line = "var(--dc-line)", muted = "var(--dc-slate)";
  const chat = [
    { from: "p", txt: "Hola, ¿tienen cita para limpieza dental? 🦷", t: "9:02" },
    { from: "ia", txt: "¡Hola! 😊 Claro. Tengo mañana 10:00 o el jueves 4:30 pm. ¿Cuál te queda mejor?", t: "9:02" },
    { from: "p", txt: "Mañana 10 está perfecto", t: "9:03" },
    { from: "ia", txt: "Listo ✅ Te agendé con la Dra. Mendoza, mañana 10:00 en Sede San Isidro. Te aviso un día antes.", t: "9:03" },
  ];
  const grupos = [
    { g: "Atención", c: red, items: [
      { Ic: MessageSquare, t: "Agente IA en WhatsApp", d: "Responde, agenda y confirma citas 24/7." },
      { Ic: Calendar, t: "Agenda con recordatorios", d: "Confirmaciones y lista de espera que reasigna cupos." },
      { Ic: Ticket, t: "Tickets de recepción", d: "Cada cita es un ticket: llegada, cobro y pagos del paciente." },
    ] },
    { g: "Clínico", c: teal, items: [
      { Ic: Smile, t: "Odontograma por piezas", d: "Mapa dental por cara y pieza, con notas clínicas." },
      { Ic: ClipboardList, t: "Planes de tratamiento", d: "Fases, avances y presupuesto de cada paciente." },
      { Ic: FileText, t: "Historia clínica", d: "Visitas, recetas, alergias y antecedentes." },
    ] },
    { g: "Finanzas", c: navy, items: [
      { Ic: CreditCard, t: "Cobros y SUNAT", d: "Niubiz, Yape o tarjeta y boleta electrónica." },
      { Ic: BarChart3, t: "Reportes y comisiones", d: "Producción por médico y por sede." },
      { Ic: Building2, t: "Multi-sede", d: "Varias sedes consolidadas en un panel." },
    ] },
  ];
  const rolesL = ["admin", "gerencia", "admin_sede", "ti", "medico", "recepcion"];
  const rolTag = { admin: "Control total de la clínica", gerencia: "Dirección y decisiones", admin_sede: "Operación de su(s) sede(s)", ti: "Usuarios, permisos y accesos", medico: "Odontograma y tratamientos", recepcion: "Agenda, admisión y cobros", paciente: "Su portal personal" };
  const dientes = [18, 17, 16, 15, 14, 13, 12, 11];
  const marca = { 16: red, 14: teal };
  const eyebrow = (t, c) => <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", color: c }}>{t}</div>;
  const ctaRed = { background: red, color: "#fff", border: "none", borderRadius: "var(--dc-r-md)", padding: "15px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 9 };
  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif", color: ink }}>
      {/* Barra superior */}
      <header style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ background: red, borderRadius: "var(--dc-r-md)", width: 40, height: 40, display: "grid", placeItems: "center" }}><Smile size={23} strokeWidth={1.75} color="#fff" /></div>
          <div style={{ lineHeight: 1.15 }}><div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 16, color: ink }}>Dento Check <span style={{ color: red }}>PRO</span></div><div style={{ fontSize: 12, color: muted, fontWeight: 500 }}>by AWG Technology Group</div></div>
        </div>
        <button onClick={onEntrar} style={{ background: "#fff", color: navy, border: `1.5px solid ${line}`, borderRadius: "var(--dc-r-md)", padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Entrar</button>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "30px 24px 56px" }}>
        <div className="dc-hero">
          <div>
            <div style={{ animation: "dcTabSlide 0.18s ease-out forwards", animationDelay: ".05s" }}>{eyebrow("Software dental – Perú", red)}</div>
            <h1 style={{ animation: "dcTabSlide 0.18s ease-out forwards", animationDelay: ".12s", fontFamily: DISPLAY, fontSize: "clamp(34px,6.2vw,50px)", lineHeight: 1.04, letterSpacing: "-0.02em", fontWeight: 500, color: ink, margin: "18px 0 0" }}>
              El consultorio que <span style={{ color: red }}>responde solo</span> mientras tú atiendes.
            </h1>
            <p style={{ animation: "dcTabSlide 0.18s ease-out forwards", animationDelay: ".2s", fontSize: 16, color: muted, lineHeight: 1.6, marginTop: 20, maxWidth: 520 }}>
              Un agente de IA contesta tu WhatsApp, agenda y confirma citas. Y por dentro: odontograma, historia clínica, cobros con estado de cuenta y reportes por sede.
            </p>
            <div style={{ animation: "dcTabSlide 0.18s ease-out forwards", animationDelay: ".28s", marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={onEntrar} style={ctaRed}>Probar la demo gratis <ArrowRight size={18} strokeWidth={1.75} /></button>
              <a href="#producto" style={{ background: "#fff", color: navy, border: `1.5px solid ${line}`, borderRadius: "var(--dc-r-md)", padding: "15px 24px", fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>Ver cómo funciona</a>
            </div>
            <div style={{ animation: "dcTabSlide 0.18s ease-out forwards", animationDelay: ".36s", marginTop: 18, fontSize: 13, color: muted }}>Sin instalar nada – cualquier rol – contraseña <strong style={{ color: ink }}>demo</strong></div>
          </div>

          {/* Teléfono WhatsApp — la pieza característica */}
          <div className="dc-hero-phone dc-rise" style={{ animationDelay: ".18s", width: 320, maxWidth: "100%", justifySelf: "center" }}>
            <div style={{ background: "#fff", borderRadius: "var(--dc-r-lg)", border: "1px solid " + line, boxShadow: "0 30px 60px -25px rgba(15,27,56,.45)", padding: 10 }}>
              <div style={{ borderRadius: "var(--dc-r-lg)", overflow: "hidden", background: "var(--dc-bg)" }}>
                <div style={{ background: wa, color: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-full)", background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center" }}><Smile size={18} strokeWidth={1.75} /></div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 13 }}>Clínica Sonríe+</div><div style={{ fontSize: 12, color: "var(--dc-ok-soft)" }}>en línea – responde la IA</div></div>
                  <Bot size={18} strokeWidth={1.75} />
                </div>
                <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8, minHeight: 300 }}>
                  {chat.map((m, i) => (
                    <div key={i} className="dc-bub" style={{ animationDelay: (0.5 + i * 0.4) + "s", alignSelf: m.from === "ia" ? "flex-end" : "flex-start", maxWidth: "86%", background: m.from === "ia" ? "var(--dc-ok-soft)" : "#fff", color: ink, borderRadius: "var(--dc-r-md)", borderTopRightRadius: m.from === "ia" ? 3 : 12, borderTopLeftRadius: m.from === "ia" ? 12 : 3, padding: "8px 11px", fontSize: 13, lineHeight: 1.45, boxShadow: "0 1px 1px rgba(0,0,0,.06)" }}>
                      {m.from === "ia" && <div style={{ fontSize: 12, fontWeight: 500, color: wa, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={11} strokeWidth={1.75} /> Agente IA</div>}
                      {m.txt}
                      <div style={{ fontSize: 12, color: "var(--dc-ink-400)", textAlign: "right", marginTop: 2 }}>{m.t}</div>
                    </div>
                  ))}
                  <div className="dc-bub" style={{ animationDelay: "2.2s", alignSelf: "center", background: "#fff", border: "1px solid var(--dc-ok-soft)", borderRadius: "var(--dc-r-full)", padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)", display: "inline-flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={13} strokeWidth={1.75} /> Cita agendada – mañana 10:00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Producto */}
      <section id="producto" style={{ background: "#fff", borderTop: "1px solid " + line, borderBottom: "1px solid " + line }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 24px" }}>
          <div className="dc-hero">
            <div>
              {eyebrow("Dentro del sistema", teal)}
              <h2 style={{ fontFamily: DISPLAY, fontSize: "clamp(26px,4.5vw,34px)", fontWeight: 500, color: ink, letterSpacing: "-0.01em", margin: "12px 0 10px", lineHeight: 1.1 }}>El odontograma y la agenda, donde deben estar.</h2>
              <p style={{ fontSize: 14, color: muted, lineHeight: 1.6, maxWidth: 460 }}>Marca cada pieza por cara, registra el plan de tratamiento y revisa la agenda del día. Todo conectado a la historia clínica y a los cobros.</p>
              <div style={{ marginTop: 18, display: "flex", gap: 26, flexWrap: "wrap" }}>
                {[["Piezas registradas", "32"], ["Citas hoy", "12"], ["Sedes", "2"]].map(([l, v]) => (
                  <div key={l}><div style={{ fontFamily: DISPLAY, fontSize: 21, fontWeight: 500, color: navy }}>{v}</div><div style={{ fontSize: 13, color: muted }}>{l}</div></div>
                ))}
              </div>
            </div>
            <div style={{ background: bg, borderRadius: "var(--dc-r-lg)", border: "1px solid " + line, overflow: "hidden", boxShadow: "0 24px 50px -28px rgba(15,27,56,.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid " + line, background: "#fff" }}>
                <span style={{ width: 10, height: 10, borderRadius: "var(--dc-r-full)", background: "var(--dc-danger)" }} /><span style={{ width: 10, height: 10, borderRadius: "var(--dc-r-full)", background: "var(--dc-warn)" }} /><span style={{ width: 10, height: 10, borderRadius: "var(--dc-r-full)", background: "var(--dc-ok)" }} />
                <span style={{ marginLeft: 8, fontSize: 12, color: muted, fontWeight: 500 }}>Dento Check – Odontograma</span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: navy, marginBottom: 8 }}>Rosa Linares – arcada superior derecha</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {dientes.map((n) => (
                    <div key={n} style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ height: 40, borderRadius: "var(--dc-r-sm)", background: "#fff", border: "1px solid " + line, display: "grid", placeItems: "center" }}>
                        <div style={{ width: 14, height: 18, borderRadius: "6px 6px 4px 4px", background: marca[n] ? marca[n] : "var(--dc-line)" }} />
                      </div>
                      <div style={{ fontSize: 12, color: muted, marginTop: 3 }}>{n}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: muted }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-sm)", background: red }} /> Caries</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: "var(--dc-r-sm)", background: teal }} /> Corona</span>
                </div>
                <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
                  {[["09:00", "Limpieza dental", "var(--dc-ok-700)"], ["10:00", "Dolor de muela", "var(--dc-warn-600)"], ["11:00", "Control endodoncia", "var(--dc-info-ink)"]].map(([h, m, c]) => (
                    <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid " + line, borderRadius: "var(--dc-r-sm)", padding: "8px 10px" }}>
                      <span style={{ fontWeight: 500, color: navy, fontSize: 13, width: 38 }}>{h}</span>
                      <span style={{ flex: 1, fontSize: 13, color: ink }}>{m}</span>
                      <span style={{ width: 8, height: 8, borderRadius: "var(--dc-r-full)", background: c }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capacidades agrupadas */}
      <section id="funciones" style={{ maxWidth: 1120, margin: "0 auto", padding: "60px 24px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ display: "inline-block" }}>{eyebrow("Todo en un solo lugar", red)}</div>
          <h2 style={{ fontFamily: DISPLAY, fontSize: "clamp(26px,4.5vw,34px)", fontWeight: 500, color: ink, margin: "10px 0 0", letterSpacing: "-0.01em" }}>Tres frentes, un mismo sistema</h2>
        </div>
        <div className="dc-3">
          {grupos.map((gr) => (
            <div key={gr.g} style={{ background: "#fff", border: "1px solid " + line, borderRadius: "var(--dc-r-lg)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ width: 8, height: 22, borderRadius: "var(--dc-r-sm)", background: gr.c }} />
                <span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 500, color: ink }}>{gr.g}</span>
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                {gr.items.map((it) => { const Ic = it.Ic; return (
                  <div key={it.t} style={{ display: "flex", gap: 12 }}>
                    <div style={{ background: tint(gr.c, 0.078), color: gr.c, width: 38, height: 38, borderRadius: "var(--dc-r-md)", display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={19} strokeWidth={1.75} /></div>
                    <div><div style={{ fontWeight: 500, color: ink, fontSize: 14 }}>{it.t}</div><div style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>{it.d}</div></div>
                  </div>
                ); })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Planes */}
      <section id="planes" style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 24px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block" }}>{eyebrow("Planes y precios", red)}</div>
          <h2 style={{ fontFamily: DISPLAY, fontSize: "clamp(26px,4.5vw,34px)", fontWeight: 500, color: ink, margin: "10px 0 6px", letterSpacing: "-0.01em" }}>Un plan para cada etapa de tu clínica</h2>
          <p style={{ color: muted, fontSize: 14, margin: 0 }}>Prueba <strong style={{ color: ink }}>14 días gratis</strong> (hasta {PACIENTES_TRIAL} pacientes), sin tarjeta. Se cobra <strong style={{ color: ink }}>por sede</strong> y por <strong style={{ color: ink }}>odontólogo</strong>; los pacientes son <strong style={{ color: ink }}>ilimitados</strong> en todos los planes.</p>
        </div>
        <div className="dc-3" style={{ alignItems: "stretch" }}>
          {PLANES.map((p, i) => { const dest = p.destacado; return (
            <div key={p.id} style={{ position: "relative", display: "flex", flexDirection: "column", borderRadius: "var(--dc-r-lg)", padding: "26px 24px",
              background: dest ? `linear-gradient(160deg, ${ink}, ${navy})` : "#fff", color: dest ? "#fff" : ink,
              border: dest ? "none" : `1px solid ${line}`, boxShadow: dest ? "0 24px 50px -20px rgba(15,27,56,.5)" : "0 1px 3px rgba(16,24,40,.05)", transform: dest ? "translateY(-6px)" : "none" }}>
              {dest && <span style={{ position: "absolute", top: 16, right: 16, background: red, color: "#fff", fontSize: 12, fontWeight: 500, letterSpacing: .5, padding: "4px 11px", borderRadius: "var(--dc-r-full)" }}>MÁS ELEGIDO</span>}
              <div style={{ fontSize: 13, fontWeight: 500, color: dest ? "var(--dc-green-soft)" : teal, textTransform: "uppercase", letterSpacing: 1 }}>{p.nombre}</div>
              <div style={{ fontSize: 13, color: dest ? "var(--dc-brand-soft)" : muted, marginTop: 4, minHeight: 20 }}>{p.tagline}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "16px 0 4px" }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: dest ? "var(--dc-brand-soft)" : muted }}>S/</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em" }}>{p.precio}</span>
                <span style={{ fontSize: 14, color: dest ? "var(--dc-brand-soft)" : muted }}>/ mes</span>
              </div>
              <div style={{ height: 1, background: dest ? "rgba(255,255,255,.14)" : line, margin: "16px 0" }} />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 11, flex: 1 }}>
                {i > 0 && <li style={{ fontSize: 13, fontWeight: 500, color: dest ? "var(--dc-green-soft)" : teal }}>Todo lo de {PLANES[i - 1].nombre}, y además:</li>}
                {p.incluye.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.4 }}>
                    <Check size={17} strokeWidth={1.75} color={dest ? "var(--dc-green-soft)" : teal} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: dest ? "var(--dc-bg)" : "var(--dc-ink-700)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onEntrar} style={{ marginTop: 22, width: "100%", padding: "13px", borderRadius: "var(--dc-r-md)", border: dest ? "none" : `1.5px solid ${navy}`, background: dest ? red : "#fff", color: dest ? "#fff" : navy, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                {dest ? "Empezar gratis" : "Elegir plan"}
              </button>
            </div>
          ); })}
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: muted, marginTop: 18, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>Precios en soles, no incluyen IGV. El consumo que supere las bolsas (conversaciones de IA, mensajes de WhatsApp, comprobantes SUNAT) se cobra aparte. ¿Más de 10 sedes o franquicias? <span style={{ color: navy, fontWeight: 500 }}>Plan a medida</span>.</p>
      </section>

      {/* Roles */}
      <section id="roles" style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 24px" }}>
        <div style={{ background: `linear-gradient(155deg, ${ink}, ${navy})`, borderRadius: "var(--dc-r-lg)", padding: "40px 28px", color: "#fff" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "inline-block" }}>{eyebrow("Cada quien ve lo justo", "var(--dc-danger-mid)")}</div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: "clamp(24px,4vw,30px)", fontWeight: 500, margin: "10px 0 6px" }}>Un rol para cada persona del equipo</h2>
            <p style={{ color: "var(--dc-brand-soft)", fontSize: 14, margin: 0 }}>Permisos por rol y por sede. La contraseña de la demo siempre es <strong>demo</strong>.</p>
          </div>
          <div className="dc-3">
            {rolesL.map((k) => { const R = ROLES[k]; const Ic = R.icon; return (
              <div key={k} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "var(--dc-r-lg)", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "#fff", color: R.color, width: 40, height: 40, borderRadius: "var(--dc-r-md)", display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={20} strokeWidth={1.75} /></div>
                <div><div style={{ fontWeight: 500, fontSize: 14 }}>{R.label}</div><div style={{ fontSize: 13, color: "var(--dc-brand-soft)" }}>{rolTag[k]}</div></div>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* Confianza local */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "6px 24px 40px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 500, letterSpacing: 1.5, color: muted, marginBottom: 14 }}>HECHO PARA EL PERÚ</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {["WhatsApp Business API", "Niubiz", "Yape – Plin", "Boleta electrónica SUNAT", "Multi-sede"].map((t) => (
            <span key={t} style={{ background: "#fff", border: "1px solid " + line, borderRadius: "var(--dc-r-full)", padding: "9px 16px", fontSize: 13, fontWeight: 500, color: navy }}>{t}</span>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{ background: red, color: "#fff", textAlign: "center", padding: "52px 24px" }}>
        <h2 style={{ fontFamily: DISPLAY, fontSize: "clamp(24px,4vw,30px)", fontWeight: 500, margin: 0 }}>Abre la demo y míralo funcionando</h2>
        <p style={{ color: "var(--dc-fee)", fontSize: 14, marginTop: 10 }}>En un minuto entras como gerencia, recepción, odontólogo o paciente.</p>
        <button onClick={onEntrar} style={{ background: "#fff", color: red, border: "none", borderRadius: "var(--dc-r-md)", padding: "15px 30px", fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 22, display: "inline-flex", alignItems: "center", gap: 9 }}>Entrar a la demo <ArrowRight size={19} strokeWidth={1.75} /></button>
        <div style={{ marginTop: 26, fontSize: 13, color: "var(--dc-danger-mid)" }}>© 2026 AWG Technology Group – Lima, Perú – ventas@awg.pe</div>
      </section>
    </div>
  );
}

/* ============================================================================
   NIVEL 1 – BackOffice AWG (Super Admin) — shell separado de la app de clínica.
   Administra TODO el ecosistema SaaS: clínicas (tenants), suscripciones,
   usuarios globales, auditoría, soporte y configuración de la plataforma.
   ========================================================================== */
const PRECIO_PLAN = { grande: 499, mediana: 299, pequena: 0 };

function AwgSuscripciones({ notify }) {
  const [cl, setCl] = useState(CLINICAS_INIT);
  const mrr = cl.reduce((s, c) => s + c.mrr, 0);
  const activas = cl.filter((c) => c.estado === "activa").length;
  const trial = cl.filter((c) => c.estado === "trial").length;
  const susp = cl.filter((c) => c.estado === "suspendida").length;
  const cambiarPlan = (id, plan) => { setCl((cs) => cs.map((c) => c.id === id ? { ...c, plan, mrr: c.estado === "suspendida" ? 0 : PRECIO_PLAN[plan] } : c)); notify("Plan actualizado."); };
  const cambiarEstado = (id, estado) => { setCl((cs) => cs.map((c) => c.id === id ? { ...c, estado, mrr: estado === "suspendida" ? 0 : PRECIO_PLAN[c.plan] } : c)); notify(`Suscripción ${estado}.`); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <KpiCard label="MRR total" value={`S/ ${mrr.toLocaleString()}`} color={DS.c.primary} icon={<TrendingUp size={18} strokeWidth={1.75} />} sub="ingreso recurrente" />
        <KpiCard label="Activas" value={activas} color="var(--dc-ok-700)" icon={<CheckCircle2 size={18} strokeWidth={1.75} />} sub="de pago" />
        <KpiCard label="En prueba" value={trial} color="var(--dc-warn-600)" icon={<Star size={18} strokeWidth={1.75} />} sub="por convertir" />
        <KpiCard label="Suspendidas" value={susp} color="var(--dc-danger-700)" icon={<Power size={18} strokeWidth={1.75} />} sub="sin servicio" />
      </div>
      <ModHead icon={<CreditCard size={20} strokeWidth={1.75} />} titulo="Suscripciones y licencias" sub="Plan contratado, estado de la cuenta y facturación recurrente de cada clínica." />
      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
            <thead><tr style={{ background: "var(--dc-bg)", textAlign: "left" }}>{["Clínica", "Plan", "Estado", "MRR", "Última actividad", ""].map((h) => <th key={h} style={{ padding: "11px 16px", fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>
              {cl.map((c) => { const E = ESTADO_CLINICA[c.estado]; return (
                <tr key={c.id} style={{ borderTop: "1px solid var(--dc-line)" }}>
                  <td style={{ padding: "12px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: "var(--dc-r-sm)", background: "var(--dc-purple)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><Building2 size={16} strokeWidth={1.75} /></div><div><div style={{ fontWeight: 500, color: NAVY }}>{c.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>RUC {c.ruc}</div></div></div></td>
                  <td style={{ padding: "12px 16px" }}><Select small width={150} ariaLabel="Plan" value={c.plan} onChange={(v) => cambiarPlan(c.id, v)} options={["pequena", "mediana", "grande"].map((p) => ({ value: p, label: PLAN_LABEL[p] }))} /></td>
                  <td style={{ padding: "12px 16px" }}><Select small width={140} ariaLabel="Estado de la clínica" value={c.estado} onChange={(v) => cambiarEstado(c.id, v)} options={["activa", "trial", "suspendida"].map((s) => ({ value: s, label: ESTADO_CLINICA[s].l }))} /></td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: NAVY }}>S/ {c.mrr}</td>
                  <td style={{ padding: "12px 16px", color: "var(--dc-ink-500)" }}>{c.ultimo}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}><button onClick={() => notify(`Factura de ${c.nombre} generada.`)} style={{ background: "none", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: DS.c.primary, display: "inline-flex", alignItems: "center", gap: 6 }}><FileText size={14} strokeWidth={1.75} /> Facturar</button></td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const AWG_USUARIOS = [
  { id: 1, nombre: "Roberto Díaz", tenant: "Clínica Dental Sonríe+", rol: "admin", email: "admin@sonrie.pe", estado: "activo", ultimo: "Hace 1 h" },
  { id: 2, nombre: "Patricia Salas", tenant: "Clínica Dental Sonríe+", rol: "gerencia", email: "gerente@sonrie.pe", estado: "activo", ultimo: "Hace 5 min" },
  { id: 3, nombre: "María Fernández", tenant: "OdontoSalud Perú", rol: "admin", email: "admin@odontosalud.pe", estado: "activo", ultimo: "Hace 2 h" },
  { id: 4, nombre: "Jorge Núñez", tenant: "Sonrisa Perfecta", rol: "admin", email: "jnunez@sonrisaperfecta.pe", estado: "activo", ultimo: "Ayer" },
  { id: 5, nombre: "Lucía Rojas", tenant: "OrtoKids", rol: "recepcion", email: "recepcion@ortokids.pe", estado: "activo", ultimo: "Hace 30 min" },
  { id: 6, nombre: "Carlos Prado", tenant: "Dental Plaza Norte", rol: "ti", email: "ti@plazanorte.pe", estado: "bloqueado", ultimo: "Hace 12 días" },
];
function AwgUsuariosGlobales({ notify }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState(AWG_USUARIOS);
  const lista = users.filter((u) => q.trim() === "" || (u.nombre + " " + u.tenant + " " + u.email).toLowerCase().includes(q.toLowerCase()));
  const toggle = (u) => { setUsers((us) => us.map((x) => x.id === u.id ? { ...x, estado: x.estado === "activo" ? "bloqueado" : "activo" } : x)); notify(`${u.nombre} ${u.estado === "activo" ? "bloqueado" : "desbloqueado"} (soporte AWG).`); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <KpiCard label="Usuarios en la red" value={users.length} color={NAVY} icon={<Users size={18} strokeWidth={1.75} />} sub="todos los tenants" />
        <KpiCard label="Activos" value={users.filter((u) => u.estado === "activo").length} color="var(--dc-ok-700)" icon={<UserCheck size={18} strokeWidth={1.75} />} />
        <KpiCard label="Bloqueados" value={users.filter((u) => u.estado !== "activo").length} color="var(--dc-danger-700)" icon={<Lock size={18} strokeWidth={1.75} />} />
        <KpiCard label="Tenants" value={new Set(users.map((u) => u.tenant)).size} color="var(--dc-purple)" icon={<Building2 size={18} strokeWidth={1.75} />} />
      </div>
      <ModHead icon={<Users size={20} strokeWidth={1.75} />} titulo="Usuarios de todos los tenants" sub="Soporte transversal: AWG puede bloquear/desbloquear cuentas de cualquier clínica." />
      <div style={{ position: "relative", maxWidth: 360 }}>
        <span style={{ position: "absolute", left: 12, top: 11, color: "var(--dc-ink-500)" }}><Search size={16} strokeWidth={1.75} /></span>
        <input className="dc-premium-inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar usuario, tenant o correo" style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, outline: "none", boxSizing: "border-box", color: NAVY }} />
      </div>
      <Card style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 780 }}>
            <thead><tr style={{ background: "var(--dc-bg)", textAlign: "left" }}>{["Usuario", "Tenant", "Rol", "Estado", "Último acceso", ""].map((h) => <th key={h} style={{ padding: "11px 16px", fontSize: 12, color: "var(--dc-ink-400)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>
              {lista.map((u) => { const R = ROLES[u.rol]; return (
                <tr key={u.id} style={{ borderTop: "1px solid var(--dc-line)" }}>
                  <td style={{ padding: "12px 16px" }}><div style={{ fontWeight: 500, color: NAVY }}>{u.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{u.email}</div></td>
                  <td style={{ padding: "12px 16px", color: "var(--dc-ink-700)" }}>{u.tenant}</td>
                  <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 13, fontWeight: 500, color: R.color, background: tint(R.color, 0.078), padding: "3px 10px", borderRadius: "var(--dc-r-full)" }}>{R.label}</span></td>
                  <td style={{ padding: "12px 16px" }}>{u.estado === "activo" ? <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ok-700)", background: "var(--dc-ok-soft)", padding: "3px 10px", borderRadius: "var(--dc-r-full)" }}>Activo</span> : <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-danger-700)", background: "var(--dc-fee)", padding: "3px 10px", borderRadius: "var(--dc-r-full)" }}>Bloqueado</span>}</td>
                  <td style={{ padding: "12px 16px", color: "var(--dc-ink-500)" }}>{u.ultimo}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}><button aria-label="Activar o desactivar" onClick={() => toggle(u)} style={{ background: "none", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: u.estado === "activo" ? "var(--dc-warn-600)" : "var(--dc-ok-700)", display: "inline-flex", alignItems: "center", gap: 6 }}><Power size={14} strokeWidth={1.75} /> {u.estado === "activo" ? "Bloquear" : "Desbloquear"}</button></td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const AWG_SOPORTE = [
  { id: 1, tenant: "OdontoSalud Perú", asunto: "No emite boletas SUNAT", prioridad: "alta", estado: "abierto", fecha: "Hoy 09:10" },
  { id: 2, tenant: "Dental Sur EIRL", asunto: "Migración de pacientes desde Excel", prioridad: "media", estado: "abierto", fecha: "Hoy 08:20" },
  { id: 3, tenant: "Sonrisa Perfecta", asunto: "Alta de nueva sede", prioridad: "media", estado: "en proceso", fecha: "Ayer 17:40" },
  { id: 4, tenant: "OrtoKids", asunto: "Duda sobre plan Mediana", prioridad: "baja", estado: "resuelto", fecha: "Ayer 11:05" },
];
function AwgSoporte({ notify }) {
  const [tk, setTk] = useState(AWG_SOPORTE);
  const PR = { alta: { bg: "var(--dc-fee)", fg: "var(--dc-danger-700)" }, media: { bg: "var(--dc-warn-soft)", fg: "var(--dc-warn-600)" }, baja: { bg: "var(--dc-ok-soft)", fg: "var(--dc-ok-700)" } };
  const ES = { abierto: "Abierto", "en proceso": "En proceso", resuelto: "Resuelto" };
  const avanzar = (t) => { const nx = t.estado === "abierto" ? "en proceso" : "resuelto"; setTk((ts) => ts.map((x) => x.id === t.id ? { ...x, estado: nx } : x)); notify(`Ticket de ${t.tenant}: ${ES[nx]}.`); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <KpiCard label="Tickets abiertos" value={tk.filter((t) => t.estado !== "resuelto").length} color="var(--dc-warn-600)" icon={<MessageSquare size={18} strokeWidth={1.75} />} />
        <KpiCard label="Alta prioridad" value={tk.filter((t) => t.prioridad === "alta" && t.estado !== "resuelto").length} color="var(--dc-danger-700)" icon={<AlertTriangle size={18} strokeWidth={1.75} />} />
        <KpiCard label="Resueltos" value={tk.filter((t) => t.estado === "resuelto").length} color="var(--dc-ok-700)" icon={<CheckCircle2 size={18} strokeWidth={1.75} />} />
        <KpiCard label="Tenants con caso" value={new Set(tk.map((t) => t.tenant)).size} color="var(--dc-purple)" icon={<Building2 size={18} strokeWidth={1.75} />} />
      </div>
      <ModHead icon={<MessageSquare size={20} strokeWidth={1.75} />} titulo="Soporte técnico a clínicas" sub="Mesa de ayuda de AWG hacia los tenants de la plataforma." />
      <Card style={{ overflow: "hidden" }}>
        {tk.map((t, i) => { const P = PR[t.prioridad]; return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: i ? "1px solid var(--dc-line)" : "none" }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-sm)", background: tint("var(--dc-purple)", 0.078), color: "var(--dc-purple)", display: "grid", placeItems: "center", flexShrink: 0 }}><Building2 size={16} strokeWidth={1.75} /></div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY }}>{t.asunto}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>{t.tenant} – {t.fecha}</div></div>
            <span style={{ fontSize: 12, fontWeight: 500, color: P.fg, background: P.bg, padding: "3px 10px", borderRadius: "var(--dc-r-full)" }}>{t.prioridad}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.estado === "resuelto" ? "var(--dc-ok-700)" : "var(--dc-ink-700)", background: t.estado === "resuelto" ? "var(--dc-ok-soft)" : "var(--dc-line)", padding: "3px 10px", borderRadius: "var(--dc-r-full)", minWidth: 88, textAlign: "center" }}>{ES[t.estado]}</span>
            {t.estado !== "resuelto" && <Btn small kind="ghost" onClick={() => avanzar(t)}><ArrowRight size={14} strokeWidth={1.75} /> Avanzar</Btn>}
          </div>
        ); })}
      </Card>
    </div>
  );
}

function AwgConfig({ notify }) {
  const [cfg, setCfg] = useState({ registro: true, mantenimiento: false, reniec: true, boletas: true, backups: true });
  const OPC = [
    { k: "registro", label: "Registro de nuevas clínicas abierto", desc: "Permite el auto-registro (signup) de nuevos tenants." },
    { k: "mantenimiento", label: "Modo mantenimiento", desc: "Muestra un aviso y bloquea el acceso a todas las clínicas." },
    { k: "reniec", label: "Consulta RENIEC (decolecta)", desc: "Autocompletar de DNI disponible para los tenants." },
    { k: "boletas", label: "Emisión de boletas SUNAT", desc: "Integración de facturación electrónica activa." },
    { k: "backups", label: "Copias de seguridad automáticas", desc: "Respaldo diario de la base de datos de cada tenant." },
  ];
  const flip = (k) => { setCfg((c) => ({ ...c, [k]: !c[k] })); notify("Configuración de plataforma actualizada."); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ModHead icon={<Settings size={20} strokeWidth={1.75} />} titulo="Configuración de la plataforma" sub="Parámetros globales del SaaS que afectan a todos los tenants." />
      <Card style={{ overflow: "hidden" }}>
        {OPC.map((o, i) => (
          <div key={o.k} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", borderTop: i ? "1px solid var(--dc-line)" : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500, color: NAVY, fontSize: 14 }}>{o.label}</div><div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{o.desc}</div></div>
            <button type="button" aria-label="Cambiar" onClick={() => flip(o.k)} title="Cambiar" style={{ width: 46, height: 26, borderRadius: "var(--dc-r-full)", border: "none", cursor: "pointer", background: cfg[o.k] ? "var(--dc-ok)" : "var(--dc-line-alt)", position: "relative", transition: "background .15s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: cfg[o.k] ? 23 : 3, width: 20, height: 20, borderRadius: "var(--dc-r-full)", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .15s" }} />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function BackOfficeAWG({ usuario, onLogout }) {
  const [secc, setSecc] = useState("clinicas");
  const [toast, setToast] = useState(null);
  const notify = (m) => { setToast(m); setTimeout(() => setToast(null), 4200); };
  const SECC = [
    { id: "clinicas", label: "Clínicas", icon: Building2 },
    { id: "suscripciones", label: "Suscripciones", icon: CreditCard },
    { id: "usuarios", label: "Usuarios globales", icon: Users },
    { id: "auditoria", label: "Auditoría global", icon: ShieldCheck },
    { id: "soporte", label: "Soporte", icon: MessageSquare },
    { id: "config", label: "Configuración", icon: Settings },
  ];
  const render = () => {
    switch (secc) {
      case "clinicas": return <Plataforma notify={notify} />;
      case "suscripciones": return <AwgSuscripciones notify={notify} />;
      case "usuarios": return <AwgUsuariosGlobales notify={notify} />;
      case "auditoria": return <Auditoria />;
      case "soporte": return <AwgSoporte notify={notify} />;
      case "config": return <AwgConfig notify={notify} />;
      default: return null;
    }
  };
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: BG, fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }}>
      <aside style={{ width: 236, background: "linear-gradient(180deg,var(--dc-ink-alt),var(--dc-ink-900))", color: "#fff", flexShrink: 0, position: "relative", height: "calc(100vh - 24px)", margin: "12px 0 12px 12px", borderRadius: "var(--dc-r-lg)", boxShadow: "0 10px 40px -10px rgba(33,16,66,.4)", border: "1px solid rgba(255,255,255,.1)", display: "flex", flexDirection: "column", zIndex: 50 }}>
        <div style={{ padding: "20px 18px 14px", display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ background: "linear-gradient(135deg,var(--dc-brand-soft),var(--dc-purple))", borderRadius: "var(--dc-r-md)", width: 38, height: 38, display: "grid", placeItems: "center", boxShadow: "0 8px 18px -8px rgba(124,58,237,.8)" }}><Globe size={21} strokeWidth={1.75} color="#fff" /></div>
          <div><div style={{ fontWeight: 600, fontSize: 14, fontFamily: DISPLAY_FONT }}>BackOffice</div><div style={{ fontSize: 12, color: "var(--dc-brand-soft)", fontWeight: 500, letterSpacing: 1 }}>AWG – PLATAFORMA</div></div>
        </div>
        <nav style={{ padding: "6px 10px", flex: 1, overflowY: "auto" }}>
          {SECC.map((s) => { const Ic = s.icon; const on = secc === s.id; return (
            <button key={s.id} onClick={() => setSecc(s.id)} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", padding: "11px 13px", borderRadius: "var(--dc-r-md)", marginBottom: 3, cursor: "pointer", border: "none", fontSize: 13, fontWeight: on ? 700 : 600, background: on ? "rgba(167,139,250,.22)" : "transparent", color: on ? "#fff" : "var(--dc-brand-soft)" }}>
              <Ic size={17} strokeWidth={1.75} /> {s.label}
            </button>
          ); })}
        </nav>
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: "var(--dc-r-md)", background: "rgba(255,255,255,.08)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "var(--dc-r-md)", background: "var(--dc-purple)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 500, fontSize: 12, flexShrink: 0 }}>{usuario.nombre.split(" ").map((x) => x[0]).join("").slice(0, 2)}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{usuario.nombre}</div><div style={{ fontSize: 12, color: "var(--dc-brand-soft)", fontWeight: 500 }}>Super Admin AWG</div></div>
            <button type="button" className="dc-icon-btn" aria-label="Cerrar sesión" onClick={onLogout} title="Cerrar sesión" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dc-brand-soft)", display: "grid", placeItems: "center" }}><LogOut size={17} strokeWidth={1.75} /></button>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto", position: "relative" }}>
        <header style={{ background: "#fff", borderBottom: "1px solid var(--dc-line)", padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div><div style={{ fontSize: 16, fontWeight: 500, color: NAVY }}>{SECC.find((s) => s.id === secc)?.label}</div><div style={{ fontSize: 12, color: "var(--dc-ink-500)", display: "flex", alignItems: "center", gap: 5 }}><Globe size={12} strokeWidth={1.75} /> Administración global de la plataforma SaaS</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--dc-purple)", fontSize: 13, fontWeight: 500 }}><ShieldCheck size={15} strokeWidth={1.75} /> AWG Technology Group</div>
        </header>
        <div style={{ padding: "22px 26px 48px", width: "100%" }}><React.Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: DS.c.muted, fontSize: 14 }}>Cargando módulo…</div>}>{render()}</React.Suspense></div>
      </main>
      {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: NAVY, color: "#fff", padding: "12px 20px", borderRadius: "var(--dc-r-md)", fontSize: 13, fontWeight: 500, boxShadow: "0 16px 40px rgba(0,0,0,.28)", zIndex: 200 }}>{toast}</div>}
    </div>
  );
}




const DienteIcon = ({size=32, strokeWidth=1.5}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 22L7 16C6.5 13 4 12 4 9C4 5 7 3 12 3C17 3 20 5 20 9C20 12 17.5 13 17 16L16 22"/>
    <path d="M12 22V15"/>
  </svg>
);
const EspejoIcon = ({size=32, strokeWidth=1.5}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="22" x2="12" y2="12"/>
    <circle cx="9" cy="9" r="5"/>
  </svg>
);

const NeuralDentalBackground = () => {
  const canvasRef = useRef(null);
  const iconRefs = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      // Only track if mouse is over the left panel (the canvas area)
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      } else {
        mouseRef.current = { x: -1000, y: -1000 };
      }
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const particles = [];
    const numParticles = 18; 
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        // Slower speed! 0.3 instead of 0.8
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15 });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off walls gently
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        // Anti-collision zone for text
        const inTextX = p.x < canvas.width * 0.65;
        const inTextY = p.y > canvas.height * 0.25 && p.y < canvas.height * 0.85;
        if (inTextX && inTextY) {
            p.vx += 0.01; 
            if (p.y < canvas.height * 0.55) p.vy -= 0.01; 
            else p.vy += 0.01;
        }

        // Mouse Repulsion
        const dxM = p.x - mouseRef.current.x;
        const dyM = p.y - mouseRef.current.y;
        const distM = Math.sqrt(dxM*dxM + dyM*dyM);
        if (distM < 200) {
           const angle = Math.atan2(dyM, dxM);
           const force = (200 - distM) / 200;
           p.vx += Math.cos(angle) * force * 0.8;
           p.vy += Math.sin(angle) * force * 0.8;
        }

        // Speed limit
        const maxSpeed = 1.2;
        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        if (speed > maxSpeed) {
           p.vx = (p.vx / speed) * maxSpeed;
           p.vy = (p.vy / speed) * maxSpeed;
        }

        const el = iconRefs.current[i];
        if (el) {
          el.style.transform = `translate(${p.x - 16}px, ${p.y - 16}px)`;
        }
      });
      
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          const maxDist = window.innerWidth < 768 ? 120 : 180;
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist/maxDist) * 0.14})`;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const icons = [DienteIcon, EspejoIcon, DienteIcon, EspejoIcon, DienteIcon, EspejoIcon, DienteIcon, DienteIcon, EspejoIcon, DienteIcon, EspejoIcon, DienteIcon, EspejoIcon, DienteIcon, DienteIcon, EspejoIcon, DienteIcon, EspejoIcon];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {/* canvas receives pointer events so we can track the mouse */}
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {icons.map((Icon, i) => (
        <div key={i} ref={el => iconRefs.current[i] = el} style={{ position: 'absolute', top: 0, left: 0, color: 'rgba(255,255,255,0.2)', willChange: 'transform', pointerEvents: 'none' }}>
          <Icon size={28} strokeWidth={1.5} />
        </div>
      ))}
    </div>
  );
};
/** Sesión de los accesos de demostración: solo existe fuera de producción. */
const esSesionDemo = (u) => MODO_DEMO && !!u?.demo;

export default function App() {
  const [usuario, setUsuario] = useState(() => { try { return JSON.parse(localStorage.getItem("dc_usuario")) || null; } catch { return null; } });
  const [entro, setEntro] = useState(() => localStorage.getItem("dc_entro") === "1" || !!localStorage.getItem("dc_usuario"));
  useEffect(() => { if (usuario) localStorage.setItem("dc_usuario", JSON.stringify(usuario)); else localStorage.removeItem("dc_usuario"); }, [usuario]);
  useEffect(() => { localStorage.setItem("dc_entro", entro ? "1" : "0"); }, [entro]);

  // NEW-18: 401/logout limpia identidad en React (no solo el token en localStorage)
  useEffect(() => alCerrarSesion(() => {
    setUsuario(null);
    setEntro(false);
  }), []);

  // NEW-18 + NEW-33: sin token → Login; con token y #/login → NO logout silencioso.
  useEffect(() => {
    const syncSesion = () => {
      const hashLogin = /^#\/?login(\/|$)/.test(window.location.hash || "");
      if (hashLogin && auth.token) {
        // Sesión viva: volver al tablero sin destruir el trabajo (replace evita #/login en historial).
        const dest = "#/dashboard";
        if (window.location.hash !== dest) {
          window.history.replaceState(null, "", dest);
        }
        return;
      }
      if (!auth.token && !esSesionDemo(usuario) && (usuario || entro)) {
        setUsuario(null);
        setEntro(false);
      }
    };
    syncSesion();
    window.addEventListener("hashchange", syncSesion);
    window.addEventListener("focus", syncSesion);
    window.addEventListener("storage", syncSesion);
    return () => {
      window.removeEventListener("hashchange", syncSesion);
      window.removeEventListener("focus", syncSesion);
      window.removeEventListener("storage", syncSesion);
    };
  }, [usuario, entro]);
  
  // BUG-113: Validar token al cargar; C15: refrescar permisos desde /auth/me
  useEffect(() => {
    const token = auth.token;
    if (entro && token && isTokenExpired(token)) {
      try { sessionStorage.setItem("dc_sesion_msg", "Tu sesión expiró. Vuelve a iniciar sesión."); } catch { /* */ }
      auth.logout();
      setUsuario(null);
      setEntro(false);
      setTimeout(() => {
        window.location.hash = "#/login";
      }, 100);
      return;
    }
    if (!token || !entro || usuario?.rol === "paciente") return;
    // C23: extraer sedes del JWT al refrescar
    const payload = parseJwt(token);
    const sedesFromJwt = payload?.sedes || "all";
    api.me().then((r) => {
      if (!r?.permisos) return;
      setUsuario((u) => {
        if (!u || u.rol === "paciente") return u;
        return {
          ...u,
          nombre: r.nombre || u.nombre,
          rol: r.rol || u.rol,
          organizacionId: r.organizacionId || u.organizacionId,
          permisos: r.permisos,
          sedes: sedesFromJwt,  // C23: agregar sedes del JWT
          conectado: true,
        };
      });
    }).catch(() => { /* sin me: se usa lo del login o fallback local */ });
  }, []); // Solo al montar
  
  // BUG-001: Limpiar datos demo al cambiar a modo conectado
  const handleLogin = (u) => {
    // Si es login conectado (tiene organizacionId o conectado=true), limpiar datos demo
    if (u && (u.organizacionId || u.conectado)) {
      // Limpiar todos los datos demo de localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("dc_data_")) {
          localStorage.removeItem(key);
        }
      });
    }
    setUsuario(u);
  };

  // NEW-18: exige token + identidad; sin token → Login aunque quede basura en estado
  // Los accesos de demostración (solo fuera de producción) no tienen token del backend.
  const haySesion = !!(usuario && (auth.token || esSesionDemo(usuario)));
  
  return (
    <>
      <style>{`
        /* Las fuentes se enlazan en index.html: con @import aqui el navegador no
           las descubria hasta ejecutar el JS y los titulos daban un salto. */
        *{box-sizing:border-box;} body{margin:0;font-family:var(--dc-font);background:var(--dc-bg);font-size:var(--dc-fs-md);line-height:var(--dc-lh-md);font-weight:var(--dc-fw-normal);color:var(--dc-ink-700);}
        .dc-money,.dc-tabular{font-variant-numeric:tabular-nums;}
        .dc-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .dc-scroll::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.12); border-radius: 99px; }
        .dc-scroll::-webkit-scrollbar-track { background: transparent; }
        .dc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,0.25); }
        
        /* Foco de teclado: ver estilos/tokens.css (*:focus-visible !important) */
        
        /* Fondo estático: meshDrift + backdrop-filter hacían “vibrar” el shell al scroll/menú */
        .mesh-animated {
          background-size: 100% 100% !important;
          animation: none !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .mesh-animated, .dc-rise { animation: none !important; }
        }
        
        input:focus-visible,textarea:focus-visible,select:focus-visible{box-shadow:var(--dc-focus)!important;outline:none!important;}
        .dc-premium-inp { background: var(--dc-white); border: 1px solid var(--dc-bg); transition: all 0.2s cubic-bezier(.2,.7,.2,1); }
        .dc-premium-inp:focus { background: var(--dc-white); border-color: var(--dc-primary-alt); box-shadow: var(--dc-focus); outline: none !important; }
        .dc-premium-inp::placeholder { color: var(--dc-ink-400); }
        @keyframes dcUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dcTabSlide{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}
        @keyframes dcPop{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes dcBlink{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes dcSlideR{from{transform:translateX(40px);opacity:.3}to{transform:none;opacity:1}}
        @keyframes dcModal{from{transform:translateY(12px) scale(.98);opacity:0}to{transform:none;opacity:1}}
        @media(prefers-reduced-motion:reduce){[style*="dcSlideR"],[style*="dcModal"]{animation:none!important}}
        @keyframes dcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .dc-rise{opacity:0;animation:dcUp .7s cubic-bezier(.2,.7,.2,1) forwards}
        
@keyframes float1 { 0% { transform: translateY(0) rotate(0deg) scale(1); } 100% { transform: translateY(-40px) rotate(15deg) scale(1.1); } }
@keyframes float2 { 0% { transform: translateY(0) translateX(0) rotate(0deg); } 100% { transform: translateY(30px) translateX(-20px) rotate(-10deg); } }
@keyframes float3 { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-20px) scale(0.9); } }

        /* Tarjetas 3D del dashboard personalizable */
        /* Tarjetas del dashboard: misma superficie que el resto (blanca, borde fino). */
        .dw-card{position:relative;border-radius:var(--dc-r-lg);background:var(--dc-surface);border:1px solid var(--dc-line);box-shadow:var(--dc-sh-1);overflow:hidden;transition:border-color .15s, box-shadow .15s}
        .dw-card:hover{border-color:var(--dc-ink-200)}
        .dw-card:active{cursor:grabbing}
        .dc-th::placeholder{color:var(--dc-ink-500);text-transform:uppercase;font-weight:700;letter-spacing:.6px;font-size:10.5px}
        .dc-side nav::-webkit-scrollbar{width:6px}
        .dc-side nav::-webkit-scrollbar-thumb{background:var(--dc-bg);border-radius:9px}
        .dc-side nav::-webkit-scrollbar-track{background:transparent}
        .dc-side nav{scrollbar-width:thin;scrollbar-color:var(--dc-bg) transparent}
        .dc-bub{opacity:0;animation:dcPop .5s cubic-bezier(.2,.7,.2,1) forwards}
        .dc-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
        .dc-2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
        .dc-3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .dc-split{display:grid;gap:16px;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
        @media(max-width:767px){.dc-split{grid-template-columns:1fr}}
        @media(max-width:1023px){
          .dc-hero{grid-template-columns:1fr;gap:36px}
          .dc-2{grid-template-columns:1fr}
          .dc-3{grid-template-columns:1fr}
          .dc-hero-phone{margin:0 auto}
        }
        @media(max-width:767px){
          .dc-login{grid-template-columns:1fr!important;}
          .dc-login-brand{display:none!important;}
          .dc-login-mobilelogo{display:flex!important;}
          .dc-side{position:fixed!important;z-index:50;transform:translateX(calc(-100% - 24px));transition:transform .25s;}
          .dc-side.open{transform:translateX(0)!important;}
          .dc-burger{display:inline-flex!important;}
          .dc-trat,.dc-gerencial-row,.dc-inbox,.dc-rec-grid{grid-template-columns:1fr!important;}
          .dc-inbox{display:block!important;}
        }
        @media(prefers-reduced-motion:reduce){
          .dc-rise,.dc-bub{animation:none!important;opacity:1!important}
          .dc-float{animation:none!important}
        }
      `}</style>
      {haySesion
        ? (usuario.rol === "paciente"
            ? <PortalPaciente usuario={usuario} onLogout={() => { auth.logout(); setUsuario(null); }} />
            : usuario.rol === "superadmin"
              ? <BackOfficeAWG usuario={usuario} onLogout={() => { auth.logout(); setUsuario(null); }} />
              : <MainApp usuario={usuario} setUsuario={setUsuario} onLogout={() => { auth.logout(); setUsuario(null); }} />)
        : <Login onLogin={handleLogin} />}
    </>
  );
}
