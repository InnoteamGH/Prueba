/* ============================================================================
   NÚCLEO COMPARTIDO — Dento Check
   Tokens del Design System, primitivos de UI, permisos, helpers y datos de
   demostración. Vivían dentro de App.jsx; se extrajeron aquí para que cada
   módulo pueda cargarse en su propio chunk (code splitting) sin duplicar
   estas piezas ni provocar dependencias circulares.

   OJO Antigravity: los tokens `DS` y las globales NAVY/RED/BG/INK/TEAL/WARM
   siguen siendo la fuente única de verdad; solo cambiaron de archivo. No
   renombres claves, solo valores (misma regla que antes).
   ============================================================================ */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, AlertTriangle,ArrowUpDown,ArrowUpRight,Briefcase,Check,ChevronDown,ChevronUp,Clock,Globe,Info,MapPin,Menu,Plus,Repeat,Search,Server,Settings,ShieldCheck,Smile,Stethoscope,UserCheck,UserCog,X,MoreHorizontal } from "lucide-react";

export const NAVY = "var(--dc-navy)", RED = "var(--dc-red)", BG = "var(--dc-bg)", INK = "var(--dc-ink-alt)", TEAL = "var(--dc-teal)", WARM = "var(--dc-warn-700)";

/* ============================================================================
 * DENTO CHECK – DESIGN SYSTEM (tokens únicos)
 * Fuente única de verdad para color, tipografía, espaciado, radios y sombras.
 * Regla de color: 1 acento de marca (teal). Info=azul, Éxito=verde, Oportunidad=ámbar,
 * Urgente=rojo. Neutros para el resto. La marca del asistente es "Asistente Dento".
 * ========================================================================== */
export const DS = {
  c: {
    primary: "var(--dc-primary-alt)", primaryDark: "var(--dc-brand-600)", accent: "var(--dc-accent-cyan)", primaryLight: "var(--dc-brand-100)", primarySoft: "rgba(8,126,139,.10)",
    info: "var(--dc-primary-alt)", success: "var(--dc-ok-700)", warning: "var(--dc-warn-600)", error: "var(--dc-danger)",
    ink: "var(--dc-ink-alt)", text: "var(--dc-ink-700)", muted: "var(--dc-ink-500)", faint: "var(--dc-ink-500)",
    line: "var(--dc-line)", bg: "var(--dc-bg)", surface: "var(--dc-surface)", surfaceAlt: "var(--dc-bg)" },
  r: { card: 20, sub: 16, item: 14, pill: 999 },
  s: (n) => n * 8,
  sh: { xs: "0 1px 2px rgba(16,24,40,.04)", sm: "0 4px 16px rgba(20,50,60,0.06)", md: "0 16px 40px -16px rgba(15,23,42,.22)", glass: "0 8px 32px rgba(15,23,42,0.05)" },
  f: { hero: 26, h1: 22, h2: 18, body: 15, cap: 13, micro: 11.5 },
  motion: { fast: ".16s ease", base: ".24s ease", slow: ".4s ease", spring: ".26s cubic-bezier(.2,.7,.2,1)" } };
DS.card = { background: "var(--dc-surface)", borderRadius: 16, border: "1px solid var(--dc-line)", boxShadow: "var(--dc-sh-1)" };
DS.label = { fontSize: DS.f.cap, fontWeight: 500, color: DS.c.ink, fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 };
export const DISPLAY_FONT = "'Manrope Variable', 'Manrope', 'Inter Variable', system-ui, sans-serif";

/* ============================================================================
   PALETA ESTÁNDAR — tokens semánticos estilo Apple (una sola fuente de verdad).
   Cada familia tiene: solid (icono/énfasis), deep (texto sobre tinte) y soft (fondo).
   Los grises siguen la escala neutra de SF. Usar SIEMPRE estos tokens.
   ============================================================================ */
export const UI = {
  bg: "var(--dc-bg)", card: "var(--dc-white)", border: "var(--dc-line)", fill: "var(--dc-bg)", track: "var(--dc-line)",
  ink: "var(--dc-ink-alt)", textStrong: "var(--dc-ink-700)", text: "var(--dc-ink-400)", faint: "var(--dc-ink-500)", ghost: "var(--dc-ink-400)",
  accent: DS.c.primary, accentDeep: "var(--dc-brand-600)", accentSoft: "var(--dc-accent-soft)",
  success: "var(--dc-ok-700)", successDeep: "var(--dc-ok-700)", successSoft: "var(--dc-ok-soft)",
  warn: "var(--dc-warn)", warnDeep: "var(--dc-warn-600)", warnSoft: "var(--dc-warn-soft)",
  danger: "var(--dc-red)", dangerDeep: "var(--dc-danger-700)", dangerSoft: "var(--dc-fee)",
  info: DS.c.primary, infoDeep: "var(--dc-info-ink)", infoSoft: "var(--dc-info-soft)",
  purple: "var(--dc-purple)", purpleDeep: "var(--dc-purple)", purpleSoft: "var(--dc-info-soft)" };

/* ============================================================================
   ARQUITECTURA DE AUTORIZACIÓN — SaaS multi-tenant (rediseño)
   ----------------------------------------------------------------------------
   Modelo HÍBRIDO Roles + Permisos granulares:
   - Cada usuario tiene un ROL base que define permisos por defecto.
   - Esos permisos se pueden PERSONALIZAR por usuario (override) sin tocar el rol.
   - La autorización es a nivel de MÓDULO × ACCIÓN (ver/crear/editar/eliminar/…).
   - Restricción por SEDES aplicada de forma transversal a todos los módulos.

   Dos niveles de administración:
   - Nivel 1 – Super Admin AWG (rol "superadmin"): administra TODA la plataforma
     desde un BackOffice separado (tenants, licencias, métricas, soporte). No
     pertenece a ninguna clínica.
   - Nivel 2 – Roles dentro de cada clínica (tenant): Administrador General,
     Gerencia, Administrador de Sede, Administrador TI, Recepcionista (+ Médico).
   ========================================================================== */

/* Acciones granulares que puede controlar la matriz de permisos por módulo. */
export const ACCIONES = [
  { id: "ver",        label: "Ver" },
  { id: "crear",      label: "Crear" },
  { id: "editar",     label: "Editar" },
  { id: "eliminar",   label: "Eliminar" },
  { id: "aprobar",    label: "Aprobar" },
  { id: "exportar",   label: "Exportar" },
  { id: "importar",   label: "Importar" },
  { id: "configurar", label: "Configurar" },
  { id: "administrar",label: "Administrar" },
];
export const ACCION_IDS = ACCIONES.map((a) => a.id);

/* Módulos que ve por defecto cada rol (la matriz de acciones se deriva abajo).
   El ROL es la base; el PLAN (membresía) y los overrides por usuario se aplican
   encima. Principio de mínimo privilegio por rol. */
// Lleva "espera": el administrador general declara control total, y la lista de espera
// la tenian el administrador de sede y recepcion pero no el. Se le habia quedado fuera.
export const MODS_ADMIN_GENERAL = ["gerencial","reportes","dashboard","whatsapp","agenda","espera","pacientes","odontograma","tratamientos","recetas","consentimientos","servicios","inventario","laboratorio","perio","radiografias","recall","formularios","seguros","resenas","plan","facturacion","comisiones","metas","integraciones","config","usuarios","permisos","auditoria"];
export const ROLES = {
  superadmin: { label: "Super Admin AWG", icon: Globe, color: "var(--dc-purple)",
    desc: "Operado por AWG. Administra toda la plataforma multi-tenant desde el BackOffice: clínicas, licencias, suscripciones, métricas globales, auditoría y soporte. No pertenece a ninguna clínica.",
    mods: ["plataforma","auditoria"] },
  admin:     { label: "Administrador general", icon: ShieldCheck, color: "var(--dc-brand-mid)",
    desc: "Máximo administrador de la clínica: control total de todos los módulos, todas las sedes, configuración, usuarios, permisos, facturación e integraciones.",
    mods: MODS_ADMIN_GENERAL },
  gerencia:  { label: "Gerencia", icon: Briefcase, color: NAVY,
    desc: "Gestión y toma de decisiones: dashboards, indicadores, reportes, finanzas, producción, ventas, pacientes y agenda consolidada. Vista ejecutiva (principalmente lectura). Su acceso puede limitarse a una, varias o todas las sedes.",
    mods: ["gerencial","reportes","dashboard","agenda","pacientes","odontograma","tratamientos","servicios","inventario","laboratorio","facturacion","comisiones","metas","resenas","seguros","recall","plan"] },
  admin_sede:{ label: "Administrador de sede", icon: UserCog, color: "var(--dc-brand-mid)",
    desc: "Responsable operativo de la(s) sede(s) asignada(s): agenda, personal, pacientes, cajas, inventario, laboratorio, reportes y producción de su sede. Solo ve la información de sus sedes habilitadas.",
    mods: ["dashboard","reportes","whatsapp","agenda","espera","pacientes","servicios","inventario","laboratorio","facturacion","comisiones","metas","resenas","recall","seguros","formularios","tratamientos","config","plan"] },
  ti:        { label: "Administrador TI", icon: Server, color: DS.c.primary,
    desc: "Help Desk interno de la clínica: gestión de usuarios (alta, bloqueo, reseteo de clave, roles y sedes), permisos, configuración básica, auditoría de accesos y revisión de logs. Sin acceso a la historia clínica ni a la cobranza.",
    mods: ["dashboard","usuarios","permisos","integraciones","config","auditoria","plan"] },
  medico:    { label: "Odontólogo", icon: Stethoscope, color: DS.c.primary,
    desc: "Su agenda y disponibilidad, odontograma, tratamientos, recetas y su producción, en la(s) sede(s) donde atiende.",
    // Sin "reportes": ese módulo es la producción y el pago de TODO el equipo. Lo suyo
    // es "miproduccion", que además le promete que sus colegas no aparecen ahí.
    mods: ["dashboard","agenda","disponibilidad","pacientes","odontograma","tratamientos","recetas","consentimientos","servicios","laboratorio","inventario","perio","formularios","radiografias","miproduccion","resenas"] },
  recepcion: { label: "Recepcionista", icon: UserCheck, color: RED,
    desc: "Atención diaria de su(s) sede(s): agenda, admisión y registro de pacientes, citas, confirmación de citas, cobros y caja, y el historial básico del paciente. Sin acceso a configuraciones ni a información gerencial.",
    mods: ["dashboard","whatsapp","agenda","espera","pacientes","facturacion","recall","formularios","radiografias","resenas"] },
  paciente:  { label: "Paciente", icon: Smile, color: DS.c.primary,
    desc: "Su portal personal: citas, salud, pagos y plan de tratamiento.", mods: [] } };

/* Acciones por defecto de un rol sobre un módulo (arquetipos).
   Administrador General y Super Admin: control total. Gerencia: lectura +
   exportación. Los demás según su función. La matriz se puede afinar luego. */
export const accionesRol = (rol, mod) => {
  if (rol === "admin" || rol === "superadmin") return [...ACCION_IDS];
  if (rol === "gerencia") {
    // Unica excepcion a "gerencia solo lee": fijar la meta de produccion del equipo
    // es justamente su trabajo. Sigue sin poder tocar precios, usuarios ni caja.
    // Este bloque es el espejo de Permisos.accionesRol en el backend, que es
    // quien decide de verdad; si cambias uno, cambia el otro.
    if (mod === "metas") return ["ver", "editar", "exportar"];
    return ["ver", "exportar"];
  }
  if (rol === "ti") {
    if (["usuarios", "permisos", "integraciones", "config"].includes(mod)) return ["ver", "crear", "editar", "eliminar", "configurar", "administrar"];
    if (mod === "auditoria") return ["ver", "exportar"];
    return ["ver"];
  }
  if (rol === "admin_sede") {
    if (mod === "facturacion") return ["ver", "crear", "editar", "aprobar", "exportar"];
    if (["dashboard", "reportes", "comisiones", "resenas"].includes(mod)) return ["ver", "exportar"];
    return ["ver", "crear", "editar", "exportar"];
  }
  if (rol === "medico") {
    if (["dashboard", "servicios", "inventario"].includes(mod)) return ["ver"];
    // Laboratorio: mandar la corona o la protesis es acto clinico suyo -el toma la
    // impresion y sabe que pedir-, asi que crea envios. No gestiona el resto.
    if (mod === "laboratorio") return ["ver", "crear"];
    // Agenda: ve y puede dejar agendado un control, pero no reprograma ni cancela citas
    // de otros —eso es de recepción, que es quien habla con el paciente—. Sus horarios
    // los lleva desde "Mi disponibilidad".
    if (mod === "agenda") return ["ver", "crear"];
    return ["ver", "crear", "editar"];
  }
  if (rol === "recepcion") {
    if (mod === "facturacion") return ["ver", "crear"];      // cobros; sin egresos ni aprobar
    if (mod === "dashboard") return ["ver"];
    return ["ver", "crear", "editar"];
  }
  return ["ver"];
};

/* Matriz de permisos por rol (defaults): { rol: { modId: [acciones] } }. */
export const ROL_PERMS = Object.fromEntries(
  Object.keys(ROLES).map((rol) => [rol, Object.fromEntries((ROLES[rol].mods || []).map((m) => [m, accionesRol(rol, m)]))])
);

/* Combina permisos base (del rol) con overrides por usuario (por módulo). */
export const mergePerms = (base, over) => {
  const out = { ...(base || {}) };
  if (over) Object.keys(over).forEach((m) => { out[m] = over[m]; });
  return out;
};
/* ¿El conjunto de permisos permite <accion> en <modulo>? */
export const puede = (perms, mod, acc) => (perms?.[mod] || []).includes(acc);
/* Permisos efectivos de un usuario: rol (o defaults editados) + su override. */
export const permisosEfectivos = (usuario, rolePerms) => mergePerms((rolePerms && rolePerms[usuario.rol]) || ROL_PERMS[usuario.rol] || {}, usuario.permisos);
/* Módulos visibles (los que tienen acción "ver"). */
export const modulosVisibles = (perms) => MODULOS.filter((m) => (perms?.[m.id] || []).includes("ver")).map((m) => m.id);
/* Rutas de sub-vista que pertenecen a un módulo (para permisos/validación de navegación). */
/* Rutas de sub-vista → módulo de permisos (no colapsar agenda_cal en el router). */
export const VISTA_ALIAS = { agenda_cal: "agenda", recall_hist: "recall", recall_sat: "recall", reportes_aus: "reportes", inventario_compras: "inventario", inventario_consumo: "inventario", inventario_prov: "inventario", caja_apertura: "facturacion", caja_cierre: "facturacion", caja_historial: "facturacion", caja_movimientos: "facturacion", caja_links: "facturacion", caja: "facturacion", comisiones: "reportes", periodontograma: "perio", fotos: "radiografias" };
export const modDeVista = (v) => VISTA_ALIAS[v] || v;

/* Catálogo de módulos (para la matriz de permisos y la navegación). */
export const MODULOS = [
  { id: "gerencial",    label: "Dashboard gerencial" },
  { id: "reportes",     label: "Producción y comisiones" },
  { id: "dashboard",    label: "Pendientes de hoy" },
  { id: "whatsapp",     label: "WhatsApp + IA" },
  { id: "agenda",       label: "Agenda" },
  { id: "disponibilidad", label: "Mi disponibilidad" },
  { id: "pacientes",    label: "Pacientes" },
  { id: "odontograma",  label: "Odontograma" },
  { id: "tratamientos", label: "Tratamientos" },
  { id: "recetas",      label: "Recetas" },
  { id: "consentimientos", label: "Consentimientos" },
  { id: "servicios",    label: "Servicios (catálogo)" },
  { id: "inventario",   label: "Inventario" },
  { id: "laboratorio",  label: "Laboratorio" },
  { id: "perio",        label: "Periodontograma" },
  { id: "radiografias", label: "Radiografías" },
  { id: "recall",       label: "Recordatorios y recall" },
  { id: "formularios",  label: "Formularios / anamnesis" },
  { id: "seguros",      label: "Seguros y EPS" },
  { id: "resenas",      label: "Reseñas y reputación" },
  { id: "plan",         label: "Mi plan y facturación" },
  { id: "espera",       label: "Lista de espera" },
  { id: "tickets",      label: "Tickets de citas" },
  { id: "facturacion",  label: "Facturación / cobros" },
  { id: "comisiones",   label: "Comisiones" },
  { id: "metas",        label: "Metas de producción" },
  { id: "miproduccion", label: "Mi producción" },
  { id: "integraciones",label: "Integraciones" },
  { id: "config",       label: "Configuración de la clínica" },
  { id: "usuarios",     label: "Usuarios" },
  { id: "permisos",     label: "Permisos por rol" },
  { id: "auditoria",    label: "Auditoría y accesos" },
];

/* Módulos que DESBLOQUEA cada plan de membresía (acumulativo: cada plan
   incluye todo lo del anterior). El ROL define qué puede ver un usuario;
   el PLAN define qué está contratado. Lo que el rol permite pero el plan no
   incluye se muestra bloqueado (candado) para invitar a mejorar de plan. */
export const PLAN_BASE = ["dashboard", "agenda", "disponibilidad", "tickets", "espera", "pacientes", "odontograma", "tratamientos", "recetas", "consentimientos", "radiografias", "fotos", "facturacion", "miproduccion", "usuarios", "plan"];
export const PLAN_EXTRA_MEDIANA = ["gerencial", "reportes", "whatsapp", "recall", "formularios", "comisiones", "metas", "integraciones", "servicios", "inventario", "laboratorio", "perio", "resenas", "config", "seguros"];
export const PLAN_EXTRA_GRANDE = ["permisos", "auditoria"];
export const PLAN_MODULOS = {
  pequena: PLAN_BASE,
  mediana: [...PLAN_BASE, ...PLAN_EXTRA_MEDIANA],
  grande: [...PLAN_BASE, ...PLAN_EXTRA_MEDIANA, ...PLAN_EXTRA_GRANDE] };
export const PLAN_NOMBRE = { pequena: "Consultorio", mediana: "Clínica", grande: "Cadena", cadena: "Cadena" };
/* Plan mínimo que desbloquea un módulo (para el mensaje de upsell). */
export const planMinimo = (id) => {
  const mod = VISTA_ALIAS[id] || id;
  return PLAN_MODULOS.pequena.includes(mod) || PLAN_MODULOS.pequena.includes(id) ? "pequena"
    : PLAN_MODULOS.mediana.includes(mod) || PLAN_MODULOS.mediana.includes(id) ? "mediana"
    : "grande";
};
export const USUARIOS = [
  { user: "super", pass: "demo", rol: "superadmin", nombre: "AWG Soporte", sedes: "all" },
  { user: "admin", pass: "demo", rol: "admin", nombre: "Roberto Díaz", sedes: "all" },
  { user: "gerente", pass: "demo", rol: "gerencia", nombre: "Patricia Salas", sedes: "all" },
  { user: "gerentenorte", pass: "demo", rol: "gerencia", nombre: "Andrés Vela", sedes: [1] },
  { user: "adminsede", pass: "demo", rol: "admin_sede", nombre: "Teresa Aroni", sedes: [2] },
  { user: "ti", pass: "demo", rol: "ti", nombre: "Marco Ticona", sedes: "all" },
  { user: "doctora", pass: "demo", rol: "medico", nombre: "Dra. Carla Mendoza", sedes: [1, 2] },
  { user: "recepcion", pass: "demo", rol: "recepcion", nombre: "Lucía Ramírez", sedes: [1] },
  { user: "paciente", pass: "demo", rol: "paciente", nombre: "Rosa Linares", pacienteId: 1 },
];

export const SEDES = [
  { id: 1, nombre: "Sede San Isidro", dir: "Av. Conquistadores 145", lat: -12.0977, lng: -77.0365 },
  { id: 2, nombre: "Sede Surco", dir: "Av. Caminos del Inca 890", lat: -12.1391, lng: -76.9915 },
];

/* Geolocalización: distancia (km) para detectar la sede más cercana al usuario. */
export const distKm = (aLat, aLng, bLat, bLng) => {
  const R = 6371, r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
export const sedeMasCercana = (lat, lng, entre = SEDES) => entre.map((s) => ({ s, d: distKm(lat, lng, s.lat, s.lng) })).sort((a, b) => a.d - b.d)[0];

/* Tiempo estimado de viaje entre sedes (min), ajustado por tráfico (hora punta). */
export const VEL_KMH = 22; // velocidad promedio realista en ciudad
export const horaPunta = (hhmm) => { const h = parseInt(hhmm, 10); return (h >= 7 && h < 10) || (h >= 17 && h < 20); };
export const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const kmEntreSedes = (a, b) => { const A = SEDES.find((s) => s.id === a), B = SEDES.find((s) => s.id === b); return (A && B) ? distKm(A.lat, A.lng, B.lat, B.lng) : 0; };
export const minutosViaje = (sedeA, sedeB, hora = "12:00") => {
  if (!sedeA || !sedeB || sedeA === sedeB) return 0;
  const km = kmEntreSedes(sedeA, sedeB);
  const f = horaPunta(hora) ? 1.7 : 1.2; // tráfico
  return Math.max(5, Math.round((km / VEL_KMH) * 60 * f));
};

/* ---- Multi-sede (relación N:M) ----
   Una cuenta (cliente) tiene 1..N sedes. Usuarios y pacientes pueden pertenecer
   a VARIAS sedes; las citas/tratamientos siempre son de una sede concreta.
   `sedes` acepta "all" (toda la cuenta) o un arreglo de ids. Se mantiene
   compatibilidad con los campos antiguos `sede`/`sedeFija`. */
export const SEDE_IDS = SEDES.map((s) => s.id);
export const normSedes = (v) => {
  if (v === "all") return SEDE_IDS;
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  // C23: manejar CSV de UUIDs del JWT (ej: "uuid1,uuid2,uuid3")
  if (typeof v === "string" && v.includes(",")) return v.split(",").map(s => s.trim()).filter(Boolean);
  return [v];
};
export const sedesDe = (o) => normSedes(o?.sedes ?? o?.sede ?? o?.sedeFija);
/** Catálogo vivo de sedes (API). Lo rellena MainApp al cargar; fallback = SEDES demo. */
let SEDES_CATALOGO = SEDES;
export function setSedesCatalogo(list) {
  if (Array.isArray(list) && list.length) {
    SEDES_CATALOGO = list.map((s) => ({ id: s.id, nombre: s.nombre || "Sede" }));
  } else {
    SEDES_CATALOGO = SEDES;
  }
}
export const nombreSede = (id) => {
  if (id == null || id === "" || id === "all") return "—";
  const hit = SEDES_CATALOGO.find((s) => String(s.id) === String(id));
  if (hit?.nombre) return hit.nombre;
  return SEDES.find((s) => String(s.id) === String(id))?.nombre || "—";
};
export const cortaSede = (id) => nombreSede(id).replace(/^Sede /, "");
export const etiquetaSedes = (v) => {
  if (v === "all") return "Todas las sedes";
  const a = normSedes(v);
  if (!a.length) return "—";
  if (a.length === 1) return nombreSede(a[0]);
  return a.map(cortaSede).join(" – ");
};

/* Personal de la clínica que administra el perfil de TI.
   Muchos usuarios por rol; cada uno hereda los permisos de su rol. */
export const STAFF_INIT = [
  { id: 1, nombre: "Roberto Díaz", user: "rdiaz", email: "admin@sonrie.pe", rol: "admin", sedes: "all", activo: true, ultimo: "Hace 1 h" },
  { id: 2, nombre: "Patricia Salas", user: "gerente", email: "gerente@sonrie.pe", rol: "gerencia", sedes: "all", activo: true, ultimo: "Hace 5 min" },
  { id: 13, nombre: "Andrés Vela", user: "avela", email: "gerencia.norte@sonrie.pe", rol: "gerencia", sedes: [1], activo: true, ultimo: "Hace 20 min" },
  { id: 3, nombre: "Marco Ticona", user: "ti", email: "ti@sonrie.pe", rol: "ti", sedes: "all", activo: true, ultimo: "Hace 12 min" },
  { id: 4, nombre: "Teresa Aroni", user: "taroni", email: "admin.surco@sonrie.pe", rol: "admin_sede", sedes: [2], activo: true, ultimo: "Hace 3 h" },
  { id: 5, nombre: "Dra. Carla Mendoza", user: "cmendoza", email: "carla@sonrie.pe", rol: "medico", sedes: [1, 2], activo: true, ultimo: "Hace 25 min" },
  { id: 6, nombre: "Dr. Luis Paredes", user: "lparedes", email: "luis@sonrie.pe", rol: "medico", sedes: [1], activo: true, ultimo: "Ayer" },
  { id: 7, nombre: "Dra. Ana Quispe", user: "aquispe", email: "ana@sonrie.pe", rol: "medico", sedes: [2], activo: true, ultimo: "Hace 2 h" },
  { id: 8, nombre: "Dra. Sofía Torres", user: "storres", email: "sofia@sonrie.pe", rol: "medico", sedes: [2], activo: true, ultimo: "Hace 4 h" },
  { id: 9, nombre: "Dr. Jorge Ramos", user: "jramos", email: "jorge@sonrie.pe", rol: "medico", sedes: [1, 2], activo: true, ultimo: "Hace 6 h" },
  { id: 10, nombre: "Lucía Ramírez", user: "recepcion", email: "recepcion@sonrie.pe", rol: "recepcion", sedes: [1], activo: true, ultimo: "Hace 8 min" },
  { id: 11, nombre: "Karina Soto", user: "ksoto", email: "recepcion.surco@sonrie.pe", rol: "recepcion", sedes: [2], activo: true, ultimo: "Hace 40 min" },
  { id: 12, nombre: "Diana Pérez", user: "dperez", email: "diana@sonrie.pe", rol: "recepcion", sedes: [1], activo: false, ultimo: "Hace 2 meses" },
];

/* Registro de auditoría / accesos (visible para TI). */
export const AUDITORIA = [
  { fecha: "Hoy 09:42", usuario: "Marco Ticona", rol: "ti", accion: "Inicio de sesión", detalle: "Acceso correcto", ip: "190.234.12.5", nivel: "ok" },
  { fecha: "Hoy 09:15", usuario: "Roberto Díaz", rol: "admin", accion: "Cobro registrado", detalle: "Boleta B001-1042 – S/ 180", ip: "190.234.12.8", nivel: "ok" },
  { fecha: "Hoy 08:58", usuario: "—", rol: "recepcion", accion: "Intento fallido", detalle: "Contraseña incorrecta (usuario dperez)", ip: "181.65.44.2", nivel: "warn" },
  { fecha: "Hoy 08:30", usuario: "Dra. Carla Mendoza", rol: "medico", accion: "Edición de odontograma", detalle: "Paciente Rosa Linares – pieza 16", ip: "190.234.12.9", nivel: "ok" },
  { fecha: "Ayer 18:20", usuario: "Marco Ticona", rol: "ti", accion: "Integración conectada", detalle: "WhatsApp Business API (Meta)", ip: "190.234.12.5", nivel: "ok" },
  { fecha: "Ayer 17:05", usuario: "Marco Ticona", rol: "ti", accion: "Usuario creado", detalle: "Karina Soto (Recepción – Surco)", ip: "190.234.12.5", nivel: "ok" },
  { fecha: "Ayer 16:40", usuario: "Marco Ticona", rol: "ti", accion: "Cambio de rol", detalle: "Jorge Ramos: Recepción → Odontólogo", ip: "190.234.12.5", nivel: "ok" },
  { fecha: "Ayer 12:11", usuario: "Diana Pérez", rol: "recepcion", accion: "Usuario desactivado", detalle: "Cuenta dada de baja por TI", ip: "190.234.12.5", nivel: "warn" },
  { fecha: "Ayer 09:03", usuario: "Patricia Salas", rol: "gerencia", accion: "Inicio de sesión", detalle: "Acceso correcto", ip: "200.48.10.1", nivel: "ok" },
];

/* Clínicas (tenants) conectadas a la plataforma — visible solo para el Superusuario (AWG). */
export const CLINICAS_INIT = [
  { id: 1, nombre: "Clínica Dental Sonríe+", ruc: "20123456789", plan: "grande", sedes: 2, usuarios: 12, pacientes: 24, estado: "activa", mrr: 499, ultimo: "Hace 5 min" },
  { id: 2, nombre: "OdontoSalud Perú", ruc: "20456789012", plan: "mediana", sedes: 1, usuarios: 6, pacientes: 312, estado: "activa", mrr: 299, ultimo: "Hace 1 h" },
  { id: 3, nombre: "Dental Sur EIRL", ruc: "20567890123", plan: "pequena", sedes: 1, usuarios: 3, pacientes: 88, estado: "trial", mrr: 0, ultimo: "Hace 2 h" },
  { id: 4, nombre: "Sonrisa Perfecta", ruc: "20678901234", plan: "grande", sedes: 3, usuarios: 19, pacientes: 540, estado: "activa", mrr: 499, ultimo: "Ayer" },
  { id: 5, nombre: "Clínica Mlilenium Dental", ruc: "20789012345", plan: "mediana", sedes: 2, usuarios: 9, pacientes: 271, estado: "activa", mrr: 299, ultimo: "Hace 3 h" },
  { id: 6, nombre: "OrtoKids", ruc: "20890123456", plan: "pequena", sedes: 1, usuarios: 4, pacientes: 64, estado: "trial", mrr: 0, ultimo: "Hace 30 min" },
  { id: 7, nombre: "Dental Plaza Norte", ruc: "20901234567", plan: "mediana", sedes: 1, usuarios: 7, pacientes: 195, estado: "suspendida", mrr: 0, ultimo: "Hace 12 días" },
];

export const ESPECIALIDADES = [
  { id: 1, nombre: "Odontología general", precio: 80, duracionMin: 30 },
  { id: 2, nombre: "Ortodoncia", precio: 150, duracionMin: 45 },
  { id: 3, nombre: "Endodoncia", precio: 220, duracionMin: 60 },
  { id: 4, nombre: "Periodoncia", precio: 180, duracionMin: 45 },
  { id: 5, nombre: "Odontopediatría", precio: 100, duracionMin: 30 },
  { id: 6, nombre: "Cirugía oral", precio: 250, duracionMin: 60 },
  { id: 7, nombre: "Implantología", precio: 800, duracionMin: 90 },
  { id: 8, nombre: "Prostodoncia", precio: 350, duracionMin: 60 },
  { id: 9, nombre: "Estética dental", precio: 200, duracionMin: 45 },
  { id: 10, nombre: "Radiología", precio: 60, duracionMin: 20 },
  { id: 11, nombre: "Patología oral", precio: 120, duracionMin: 30 },
  { id: 12, nombre: "ATM / dolor orofacial", precio: 160, duracionMin: 40 },
];

/* `esps` = especialidades del odontólogo (puede tener más de una). `esp` es la principal. */
/**
 * Equipo de la demostración. `prodDemo` es la producción del mes de ejemplo y la leen
 * TODAS las pantallas: antes cada una llevaba la suya y la Dra. Mendoza producía 9.200
 * en el ranking gerencial, 9.200 en "Mi producción" y 1.920 en Comisiones, contra la
 * misma meta. La demostración se contradecía sola delante del cliente.
 * `citasDemo` es el número de atenciones que corresponde a esa producción.
 */
export const MEDICOS = [
  { id: 1, nombre: "Dra. Carla Mendoza", esp: 1, esps: [1, 4], sede: 1, sedes: [1, 2], foto: "CM", color: NAVY, meta: 12000, prodDemo: 9200, citasDemo: 58 },
  { id: 2, nombre: "Dr. Luis Paredes", esp: 2, esps: [2], sede: 1, sedes: [1], foto: "LP", color: "var(--dc-brand-mid)", meta: 10000, prodDemo: 7800, citasDemo: 49 },
  { id: 3, nombre: "Dra. Ana Quispe", esp: 3, esps: [3], sede: 2, sedes: [2], foto: "AQ", color: DS.c.primary, meta: 8500, prodDemo: 6400, citasDemo: 41 },
  { id: 4, nombre: "Dra. Sofía Torres", esp: 5, esps: [5], sede: 2, sedes: [2], foto: "ST", color: DS.c.accent, meta: 7000, prodDemo: 5100, citasDemo: 33 },
  { id: 5, nombre: "Dr. Jorge Ramos", esp: 4, esps: [4], sede: 1, sedes: [1, 2], foto: "JR", color: "var(--dc-info-ink)", meta: 6000, prodDemo: 4200, citasDemo: 28 },
  { id: 6, nombre: "Dr. Miguel Flores", esp: 1, esps: [1], sede: 2, sedes: [2], foto: "MF", color: "var(--dc-brand-600)", meta: 5000, prodDemo: 3500, citasDemo: 22 },
];
export const espsDe = (m) => m ? (m.esps || [m.esp]) : [];

// NEW-35: "hoy" vivo (no congelado al boot del bundle). Proxy reenvía a new Date().
export const hoyAhora = () => new Date();
export const hoy = new Proxy({}, {
  get(_t, prop) {
    if (prop === Symbol.toPrimitive) return (hint) => {
      const d = hoyAhora();
      return hint === "string" ? d.toString() : d.valueOf();
    };
    const d = hoyAhora();
    const v = d[prop];
    return typeof v === "function" ? v.bind(d) : v;
  },
});
// Fecha LOCAL (Perú) en formato YYYY-MM-DD. Ojo: toISOString() da UTC y de noche
// devolvía el día siguiente, desalineando "Hoy" con el calendario (que usa fecha local).
export const fmt = (d) => {
  const base = (d instanceof Date) ? d : (d && typeof d.getTime === "function" ? new Date(d.getTime()) : hoyAhora());
  const z = new Date(base.getTime() - base.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const addDays = (n) => { const d = hoyAhora(); d.setDate(d.getDate() + n); return fmt(d); };
export const fmtHoy = () => fmt(hoyAhora());

/* ── Exportación (Excel real .xlsx + PDF) ──
   columnas: [{ key, label, w? }]  –  filas: array de objetos por key.
   Excel: SheetJS por import dinámico (no engorda el bundle; se carga solo al exportar). */
export async function exportarExcel({ nombreArchivo, hoja = "Datos", titulo, columnas, filas }) {
  const XLSX = await import("xlsx");
  const aoa = [];
  if (titulo) { aoa.push([titulo]); aoa.push([]); }
  aoa.push(columnas.map((c) => c.label));
  for (const r of filas) aoa.push(columnas.map((c) => r[c.key] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = columnas.map((c) => ({ wch: c.w || 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (hoja || "Datos").slice(0, 31));
  XLSX.writeFile(wb, nombreArchivo.endsWith(".xlsx") ? nombreArchivo : nombreArchivo + ".xlsx");
}
export const escHtml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* PDF bien formateado vía ventana de impresión (Guardar como PDF). Sin dependencias extra. */
export function exportarPDF({ titulo, subtitulo, columnas, filas }) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const th = columnas.map((c) => `<th>${escHtml(c.label)}</th>`).join("");
  const trs = filas.map((r) => `<tr>${columnas.map((c) => `<td>${escHtml(r[c.key] ?? "")}</td>`).join("")}</tr>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(titulo)}</title><style>
    *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--dc-brand-900);padding:26px;margin:0}
    h1{font-size:19px;margin:0 0 2px;color:var(--dc-teal)} .sub{color:var(--dc-slate);font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:11.5px} thead{display:table-header-group}
    th{background:var(--dc-teal);color:var(--dc-white);text-align:left;padding:8px 10px;font-weight:600;white-space:nowrap}
    td{padding:7px 10px;border-bottom:1px solid var(--dc-line)} tr:nth-child(even) td{background:var(--dc-white)}
    .foot{margin-top:14px;color:var(--dc-ink-400);font-size:10.5px}
    @media print{@page{margin:12mm}}
  
        .dc-login-btn { transition: all 0.2s cubic-bezier(0.2,0.8,0.2,1); }
        .dc-login-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 28px -10px var(--dc-accent-cyan) !important; filter: brightness(1.1); }
        .dc-login-btn:active:not(:disabled) { transform: translateY(0); }
        .dc-outline-btn { transition: all 0.2s; }
        .dc-outline-btn:hover { background: var(--dc-bg-soft2) !important; border-color: var(--dc-line) !important; transform: translateY(-1px); }
        .dc-input-container:focus-within svg { color: var(--dc-accent-cyan) !important; }
        .dc-login-right { box-shadow: -20px 0 60px rgba(11, 83, 102, 0.05); position: relative; z-index: 5; }

      
        .dc-kpicard { position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); border: 1px solid rgba(255,255,255,0.4); }
        .dc-kpicard:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(11,83,102,.12) !important; border-color: rgba(14,116,144,.15); }
        .dc-kpicard::after { content: ""; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); transform: skewX(-20deg); transition: none; pointer-events: none; zIndex: 10; }
        .dc-kpicard:hover::after { left: 200%; transition: all 0.6s ease-in-out; }

      </style></head><body>
    <h1>${escHtml(titulo)}</h1><div class="sub">${escHtml(subtitulo || "")}</div>
    <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
    <div class="foot">Generado por Dento Check</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>
  </body></html>`);
  w.document.close();
  return true;
}
export const fechaLegible = (s) => new Date(s + "T00:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" });
export const calcEdad = (s) => { if (!s) return null; const b = new Date(s + "T00:00:00"); if (isNaN(b)) return null; let e = hoy.getFullYear() - b.getFullYear(); const m = hoy.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && hoy.getDate() < b.getDate())) e--; return e >= 0 && e < 120 ? e : null; };

/** Pluralización simple en español: pluralEs(3, "paciente", "pacientes") → "3 pacientes" */
export const pluralEs = (n, uno, muchos) => `${n} ${n === 1 ? uno : muchos}`;

/** Dentición sugerida por edad (odontograma). */
export const denticionPorEdad = (fechaNac) => {
  const e = calcEdad(fechaNac);
  if (e == null) return "adulto";
  if (e < 6) return "infantil";
  if (e < 13) return "mixta";
  return "adulto";
};

const ES_SUPERIOR_OD = (n) => [1, 2, 5, 6].includes(Number(String(n)[0]));
const ES_ANTERIOR_OD = (n) => { const d = Number(String(n).slice(-1)); return d >= 1 && d <= 3; };

/** Nombre clínico de una cara según pieza FDI (anatómico o legacy geométrico). */
export const caraOdontoLabel = (pieza, cara) => {
  const k = String(cara || "");
  if (k === "V") return "Vestibular";
  if (k === "P") return "Palatino";
  if (k === "L") return "Lingual";
  if (k === "M") return "Mesial";
  if (k === "D") return "Distal";
  if (k === "O") return "Oclusal";
  if (k === "I") return "Incisal";
  if (cara === "center") return ES_ANTERIOR_OD(pieza) ? "Incisal" : "Oclusal";
  if (cara === "bottom") return ES_SUPERIOR_OD(pieza) ? "Palatino" : "Lingual";
  return { top: "Vestibular", left: "Mesial", right: "Distal" }[cara] || cara;
};

/** Valida el formulario de alta/edición de paciente. Devuelve { ok, errors, first }. */
export const validarFormPaciente = (form, hoyISO) => {
  const errors = {};
  const nombre = (form.nombre || "").trim();
  if (!nombre) errors.nombre = "El nombre es obligatorio.";
  else if (nombre.length > 120) errors.nombre = "Máximo 120 caracteres.";
  else if (!/^[\p{L}\p{M}'\-\s.]+$/u.test(nombre)) errors.nombre = "Solo letras, espacios, apóstrofes y guiones.";

  const dni = (form.dni || "").trim();
  if (!dni) errors.dni = "El DNI es obligatorio.";
  else if (!/^\d{8}$/.test(dni)) errors.dni = "El DNI debe tener 8 dígitos.";

  const telRaw = (form.telefono || "").trim();
  if (telRaw) {
    const tel = telRaw.replace(/\D/g, "");
    if (!/^\d{9}$/.test(tel) && !/^51\d{9}$/.test(tel)) errors.telefono = "Celular: 9 dígitos (ej. 999888777).";
  }

  const email = (form.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Email no válido.";

  if (!form.nacimiento) errors.nacimiento = "La fecha de nacimiento es obligatoria.";
  else if (form.nacimiento > hoyISO) errors.nacimiento = "No puede ser una fecha futura.";

  // M-3: menor de 18 requiere apoderado completo
  if (form.nacimiento && !errors.nacimiento) {
    const e = calcEdad(form.nacimiento);
    if (e != null && e < 18) {
      if (!(form.apoderadoNombre || "").trim()) errors.apoderadoNombre = "Obligatorio para menores de 18.";
      if (!(form.apoderadoParentesco || "").trim()) errors.apoderadoParentesco = "Obligatorio para menores de 18.";
      if (!(form.apoderadoDni || "").trim()) errors.apoderadoDni = "Obligatorio para menores de 18.";
      if (!(form.apoderadoTelefono || "").trim()) errors.apoderadoTelefono = "Obligatorio para menores de 18.";
    }
  }

  const keys = Object.keys(errors);
  return { ok: keys.length === 0, errors, first: keys[0] || null };
};

/* ---- Paciente pediatrico ----
   El umbral vivia duplicado y en desacuerdo: App.jsx cortaba en 14 anios y
   FichaMedica.jsx en 15, asi que el mismo nino salia pediatrico en una pantalla
   y adulto en la otra. Aqui hay un solo numero para toda la aplicacion.

   El color: lo pediatrico se marca en ambar y lo adulto en el teal de la marca.
   PED esta elegido para que el texto se lea sobre blanco (contraste ~5:1); no
   uses PED_SUAVE para texto, es solo fondo. */
export const EDAD_PEDIATRICA = 15;                 // menor de 15 anios cumplidos
/* El primer intento fue un naranja quemado (var(--dc-warn-600)) y estaba mal elegido: se
   confundia con el ambar de advertencia que la aplicacion ya usa para "stock bajo"
   o "cita sin confirmar", asi que la ficha de un nino parecia un aviso de problema.
   El fucsia no significa nada mas en esta aplicacion, se lee amable y no choca con
   el violeta de Ortodoncia (var(--dc-purple)) ni con el rosa de Endodoncia (var(--dc-red)).
   PED tiene ~6:1 de contraste sobre blanco, asi que vale para texto pequeno;
   PED_VIVO es mas claro y solo debe usarse en iconos, degradados y trazos gruesos. */
/* El fucsia tampoco acababa de funcionar. La ficha de un menor pasa a llevar el
   color que la clinica usa de toda la vida: celeste para nino, rosa para nina.
   Cuando no hay genero registrado se usa un turquesa neutro, para no suponerlo.
   Los tres estan elegidos con ~5:1 o mas sobre blanco, asi que valen para texto. */
export const PED_NINO  = { c: "var(--dc-accent-cyan)", suave: "var(--dc-white)", linea: "var(--dc-sky)", vivo: "var(--dc-blue)" };
export const PED_NINA  = { c: "var(--dc-red)", suave: "var(--dc-bg)", linea: "var(--dc-fee)", vivo: "var(--dc-danger-mid)" };
export const PED_NEUTRO = { c: "var(--dc-accent-cyan)", suave: "var(--dc-white)", linea: "var(--dc-info-soft)", vivo: "var(--dc-blue)" };

/** Colores de la ficha de un menor segun su genero. Sin dato, el neutro. */
export const colorPediatrico = (genero) => {
  const g = String(genero || "").toLowerCase();
  if (g.startsWith("masc")) return PED_NINO;
  if (g.startsWith("fem")) return PED_NINA;
  return PED_NEUTRO;
};

// Se conservan para lo pediatrico que NO va referido a un paciente concreto
// (la categoria "Odontopediatria" del catalogo de servicios, por ejemplo).
export const PED = PED_NEUTRO.c;                   // acento pediatrico (texto, bordes, iconos)
export const PED_VIVO = PED_NEUTRO.vivo;           // solo decorativo: nunca para texto
export const PED_SUAVE = PED_NEUTRO.suave;         // fondo de apoyo pediatrico
export const PED_LINEA = PED_NEUTRO.linea;         // borde suave pediatrico
export const esPediatrico = (fechaNacimiento) => {
  const e = calcEdad(fechaNacimiento);
  return e != null && e < EDAD_PEDIATRICA;
};

/* ---- Las tres etapas de la ficha ----
   Pasar de nino a adulto de golpe el dia que cumple 15 no funciona: a un chico de
   14 ya tiene sentido preguntarle por tabaco o alcohol, y a uno de 7 no. Por eso
   hay una etapa intermedia en la que se ven las dos partes, con aviso de que la
   ficha va a cambiar.

   Y al llegar a adulto la historia pediatrica NO desaparece: es parte de su
   expediente y se sigue pudiendo consultar. Solo deja de pedir datos nuevos. */
export const EDAD_TRANSICION = 13;                 // desde aqui se ve tambien lo de adulto

/** "pediatrico" (menos de 13) | "transicion" (13-14) | "adulto" (15 o mas, y sin fecha). */
export const etapaFicha = (fechaNacimiento) => {
  const e = calcEdad(fechaNacimiento);
  if (e == null) return "adulto";                 // sin fecha no se puede suponer que es un nino
  if (e < EDAD_TRANSICION) return "pediatrico";
  if (e < EDAD_PEDIATRICA) return "transicion";
  return "adulto";
};
/** Cuantos anios le faltan para pasar a ficha de adulto (null si ya lo es). */
/**
 * Emblema de la ficha pediatrica: un diente de leche con cara.
 *
 * Va dibujado aqui, en SVG, y no como imagen: no depende de ninguna descarga, se
 * pinta con los colores de la paleta pediatrica y se ve nitido a cualquier tamano.
 * Sirve para que se vea de un vistazo, sin leer, que esa ficha es la de un nino.
 */
export function EmblemaNino({ size = 44, dormido = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* silueta del diente */}
      <path d="M24 5c6.8 0 12 3.6 12 9.6 0 5.2-1.4 9-2.6 14.2-.9 3.9-1.3 9.4-3.6 12.6-1.7 2.4-4.6 1.9-5.3-1-.5-2.2-.6-5.4-.5-7.9-.9-.2-1.9-.2-2.8 0 .1 2.5 0 5.7-.5 7.9-.7 2.9-3.6 3.4-5.3 1-2.3-3.2-2.7-8.7-3.6-12.6C10.6 23.6 12 19.8 12 14.6 12 8.6 17.2 5 24 5Z"
        fill="var(--dc-white)" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      {/* ojos: cerrados si esta "dormido" (ficha archivada / etapa pasada) */}
      {dormido
        ? <><path d="M18 18c1.1-1.2 2.9-1.2 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M26 18c1.1-1.2 2.9-1.2 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>
        : <><circle cx="19.5" cy="18" r="2.1" fill="currentColor" />
            <circle cx="28.5" cy="18" r="2.1" fill="currentColor" /></>}
      {/* sonrisa */}
      <path d="M19 24.5c1.6 1.9 8.4 1.9 10 0" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      {/* mofletes */}
      <circle cx="15.6" cy="22.4" r="1.7" fill="currentColor" opacity=".28" />
      <circle cx="32.4" cy="22.4" r="1.7" fill="currentColor" opacity=".28" />
    </svg>
  );
}

/**
 * Avatar del paciente: su foto si la tiene, y si no una ilustracion generica
 * segun edad y genero (mujer, hombre, nina, nino).
 *
 * Las siluetas son abstractas a proposito -- no llevan tono de piel ni rasgos --
 * porque un dibujo realista tendria que elegir una etnia por el paciente, y aqui
 * solo hace falta distinguir de un vistazo de quien es la ficha. Se diferencian
 * por el pelo y por la proporcion de la cabeza: en un menor es mas grande
 * respecto a los hombros, que es lo que de verdad lee el ojo como "nino".
 */
/* Avatares genéricos: son ARCHIVOS de imagen, no un dibujo hecho aquí.
   Viven en `frontend/public/avatares/` y se sirven desde la raíz del sitio, así
   que cambiarlos es reemplazar el archivo — no hay que tocar código ni volver a
   compilar. Ver el README de esa carpeta para los nombres y el formato.

   Las ilustraciones las elige la clínica: aquí no se incluye ninguna, porque las
   de bancos de imágenes necesitan licencia y esa decisión no es del código. */
const AVATAR_GENERICO = {
  mujer: `${import.meta.env.BASE_URL}avatares/mujer.png`,
  hombre: `${import.meta.env.BASE_URL}avatares/hombre.png`,
  nina: `${import.meta.env.BASE_URL}avatares/nina.png`,
  nino: `${import.meta.env.BASE_URL}avatares/nino.png`,
};

/** Qué ilustración le toca a este paciente. */
export const avatarGenerico = (genero, pediatrico) => {
  const g = String(genero || "").toLowerCase();
  if (g.startsWith("fem")) return AVATAR_GENERICO[pediatrico ? "nina" : "mujer"];
  if (g.startsWith("masc")) return AVATAR_GENERICO[pediatrico ? "nino" : "hombre"];
  return null;                       // sin género no se supone ninguna: van las iniciales
};

/**
 * Avatar del paciente, por este orden:
 *   1. su foto, si la tiene;
 *   2. la ilustración genérica que le corresponde por edad y género;
 *   3. sus iniciales.
 *
 * El paso 3 no es solo para cuando falta el género: también es el respaldo si el
 * archivo de la ilustración no está o no carga. Así la ficha nunca enseña el
 * icono de imagen rota, que es peor que no poner nada.
 */
export function AvatarPaciente({ nombre, fotoUrl, genero, pediatrico = false, size = 88, radio = 24 }) {
  const cp = pediatrico ? colorPediatrico(genero) : null;
  const tono = cp ? cp.c : DS.c.primary;
  const fondo = cp ? cp.suave : DS.c.primaryLight;
  const [falloImg, setFalloImg] = useState(false);
  const generica = avatarGenerico(genero, pediatrico);

  const base = { width: size, height: size, borderRadius: radio, overflow: "hidden", flexShrink: 0,
                 display: "grid", placeItems: "center", background: fondo, position: "relative" };

  const src = fotoUrl || (falloImg ? null : generica);
  if (src) return (
    <div style={base}>
      <img src={src} alt={nombre ? `Foto de ${nombre}` : "Paciente"}
        onError={() => { if (!fotoUrl) setFalloImg(true); }}
        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>);

  return (
    <div style={{ ...base, background: `linear-gradient(135deg,${DS.c.accent},${tono})`, color: "var(--dc-white)",
                  fontWeight: 500, fontSize: Math.round(size / 2.9) }}>
      {iniciales(nombre)}
    </div>);
}

export const aniosParaAdulto = (fechaNacimiento) => {
  const e = calcEdad(fechaNacimiento);
  return e == null || e >= EDAD_PEDIATRICA ? null : EDAD_PEDIATRICA - e;
};
/* Acento segun el tipo de ficha: ambar para el nino, teal para el adulto. */
export const acentoFicha = (pediatrico) => (pediatrico ? PED : DS.c.primary);

/* Persistencia local: sincroniza un estado con localStorage para que los datos
   (pacientes, citas, inventario, fichas…) sobrevivan a la recarga en este demo. */
export const DATA_VER = "v1";
export function usePersist(key, init) {
  const K = `dc_data_${DATA_VER}_${key}`;
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(K); if (s) return JSON.parse(s); } catch (e) {}
    return typeof init === "function" ? init() : init;
  });
  useEffect(() => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} }, [K, v]);
  return [v, setV];
}

export const CITAS_INIT = [
  { id: 1, paciente: "Rosa Linares", dni: "44567890", medicoId: 1, esp: 1, sede: 1, fecha: fmt(hoy), hora: "09:00", motivo: "Limpieza dental", estado: "confirmada", llegada: true },
  { id: 2, paciente: "Pedro Gómez", dni: "40123456", medicoId: 1, esp: 1, sede: 1, fecha: fmt(hoy), hora: "10:00", motivo: "Dolor de muela", estado: "en_atencion", llegada: true },
  { id: 3, paciente: "María Chávez", dni: "45678901", medicoId: 3, esp: 3, sede: 2, fecha: fmt(hoy), hora: "11:00", motivo: "Control endodoncia", estado: "confirmada", llegada: true },
  { id: 4, paciente: "Carlos Ruiz", dni: "41234567", medicoId: 4, esp: 5, sede: 2, fecha: fmt(hoy), hora: "15:30", motivo: "Evaluación niño", estado: "pendiente", llegada: false },
  { id: 5, paciente: "Elena Ríos", dni: "43219876", medicoId: 2, esp: 2, sede: 1, fecha: fmt(hoy), hora: "16:00", motivo: "Ajuste de brackets", estado: "atendida", llegada: true },
  { id: 6, paciente: "Javier Soto", dni: "42987654", medicoId: 1, esp: 1, sede: 1, fecha: fmt(hoy), hora: "08:30", motivo: "Profilaxis", estado: "confirmada", llegada: false },
  { id: 7, paciente: "Lucía Vega", dni: "44112233", medicoId: 3, esp: 3, sede: 2, fecha: fmt(hoy), hora: "09:30", motivo: "Endodoncia 2da sesión", estado: "confirmada", llegada: true },
  { id: 8, paciente: "Diego Castro", dni: "41778899", medicoId: 5, esp: 4, sede: 1, fecha: fmt(hoy), hora: "12:00", motivo: "Tratamiento de encías", estado: "pendiente", llegada: false },
  { id: 9, paciente: "Sofía Herrera", dni: "45998877", medicoId: 6, esp: 1, sede: 2, fecha: fmt(hoy), hora: "10:30", motivo: "Dolor de diente", estado: "confirmada", llegada: false },
  { id: 10, paciente: "Martín Aguilar", dni: "40998811", medicoId: 2, esp: 2, sede: 1, fecha: fmt(hoy), hora: "17:00", motivo: "Control de ortodoncia", estado: "pendiente", llegada: false },
  { id: 11, paciente: "Valeria Nuñez", dni: "46332211", medicoId: 3, esp: 3, sede: 2, fecha: addDays(1), hora: "09:00", motivo: "Endodoncia molar", estado: "confirmada", llegada: false },
  { id: 12, paciente: "Fernando Díaz", dni: "41556622", medicoId: 1, esp: 1, sede: 1, fecha: addDays(1), hora: "11:00", motivo: "Extracción simple", estado: "confirmada", llegada: false },
  { id: 13, paciente: "Camila Rojas", dni: "47223344", medicoId: 4, esp: 5, sede: 2, fecha: addDays(1), hora: "16:00", motivo: "Sellantes (niño)", estado: "pendiente", llegada: false },
  { id: 14, paciente: "Patricia León", dni: "44889900", medicoId: 6, esp: 1, sede: 2, fecha: addDays(1), hora: "10:00", motivo: "Limpieza dental", estado: "confirmada", llegada: false },
  { id: 15, paciente: "Gonzalo Mejía", dni: "42334455", medicoId: 2, esp: 2, sede: 1, fecha: addDays(2), hora: "15:00", motivo: "Colocación de brackets", estado: "pendiente", llegada: false },
  { id: 16, paciente: "Sebastián Vargas", dni: "42667711", medicoId: 5, esp: 4, sede: 1, fecha: addDays(2), hora: "14:00", motivo: "Evaluación periodontal", estado: "confirmada", llegada: false },
  { id: 17, paciente: "Andrés Palma", dni: "40556677", medicoId: 1, esp: 1, sede: 1, fecha: addDays(-1), hora: "09:00", motivo: "Limpieza", estado: "atendida", llegada: true },
  { id: 18, paciente: "Daniela Paredes", dni: "45667788", medicoId: 6, esp: 1, sede: 2, fecha: addDays(-1), hora: "10:00", motivo: "Curación", estado: "atendida", llegada: true },
  { id: 19, paciente: "Ricardo Salas", dni: "40223311", medicoId: 2, esp: 2, sede: 1, fecha: addDays(-1), hora: "11:00", motivo: "Ajuste de brackets", estado: "cancelada", llegada: false },
  { id: 20, paciente: "Andrea Campos", dni: "46778822", medicoId: 3, esp: 3, sede: 2, fecha: addDays(-1), hora: "16:00", motivo: "Control endodoncia", estado: "atendida", llegada: true },
  { id: 21, paciente: "Manuel Ortega", dni: "41889944", medicoId: 1, esp: 1, sede: 1, fecha: addDays(-2), hora: "09:30", motivo: "Profilaxis", estado: "atendida", llegada: true },
  { id: 22, paciente: "Gabriela Ramos", dni: "44556633", medicoId: 4, esp: 5, sede: 2, fecha: addDays(-2), hora: "10:30", motivo: "Evaluación pediátrica", estado: "atendida", llegada: true },
  { id: 23, paciente: "Isabel Flores", dni: "45223399", medicoId: 6, esp: 1, sede: 2, fecha: addDays(3), hora: "15:30", motivo: "Limpieza dental", estado: "confirmada", llegada: false },
  { id: 24, paciente: "Hugo Medina", dni: "40778855", medicoId: 2, esp: 2, sede: 1, fecha: addDays(3), hora: "16:30", motivo: "Control de brackets", estado: "pendiente", llegada: false },
  { id: 25, paciente: "Rosa Linares", dni: "44567890", medicoId: 1, esp: 1, sede: 1, fecha: addDays(-7), hora: "09:00", motivo: "Limpieza dental", estado: "atendida", llegada: true },
  { id: 26, paciente: "Rosa Linares", dni: "44567890", medicoId: 1, esp: 1, sede: 1, fecha: addDays(10), hora: "10:00", motivo: "Control de tratamiento", estado: "confirmada", llegada: false },
  { id: 27, paciente: "María Chávez", dni: "45678901", medicoId: 1, esp: 1, sede: 2, fecha: fmt(hoy), hora: "14:00", motivo: "Limpieza (Dra. Mendoza en Surco)", estado: "confirmada", llegada: false },
  { id: 28, paciente: "Rosa Linares", dni: "44567890", medicoId: 6, esp: 1, sede: 2, fecha: addDays(-20), hora: "11:00", motivo: "Urgencia atendida en Surco", estado: "atendida", llegada: true },
  { id: 29, paciente: "Elena Ríos", dni: "43219876", medicoId: 1, esp: 4, sede: 1, fecha: addDays(1), hora: "12:00", motivo: "Tratamiento de encías (periodoncia)", estado: "confirmada", llegada: false },
];

export const PACIENTES_INIT = [
  { id: 1, nombre: "Rosa Linares", dni: "44567890", telefono: "987654321", email: "rosa@mail.com", sede: 1, sedes: [1, 2], ultima: "2026-05-12" },
  { id: 2, nombre: "Pedro Gómez", dni: "40123456", telefono: "912345678", email: "pedro@mail.com", sede: 1, ultima: "2026-04-28" },
  { id: 3, nombre: "María Chávez", dni: "45678901", telefono: "998877665", email: "maria@mail.com", sede: 2, sedes: [2, 1], ultima: "2026-06-01" },
  { id: 4, nombre: "Carlos Ruiz", dni: "41234567", telefono: "987112233", email: "carlos@mail.com", sede: 2, ultima: "2026-06-10" },
  { id: 5, nombre: "Elena Ríos", dni: "43219876", telefono: "956443322", email: "elena@mail.com", sede: 1, ultima: "2026-06-15" },
  { id: 6, nombre: "Javier Soto", dni: "42987654", telefono: "943221100", email: "javier@mail.com", sede: 1, ultima: "2026-05-30" },
  { id: 7, nombre: "Lucía Vega", dni: "44112233", telefono: "921334455", email: "lucia.vega@mail.com", sede: 2, ultima: "2026-06-05" },
  { id: 8, nombre: "Andrés Palma", dni: "40556677", telefono: "933445566", email: "andres@mail.com", sede: 1, ultima: "2026-03-18" },
  { id: 9, nombre: "Sofía Herrera", dni: "45998877", telefono: "944556677", email: "sofiah@mail.com", sede: 2, ultima: "2026-06-12" },
  { id: 10, nombre: "Diego Castro", dni: "41778899", telefono: "955667788", email: "diego@mail.com", sede: 1, ultima: "2026-06-08" },
  { id: 11, nombre: "Valeria Nuñez", dni: "46332211", telefono: "966778899", email: "valeria@mail.com", sede: 2, ultima: "2026-05-22" },
  { id: 12, nombre: "Martín Aguilar", dni: "40998811", telefono: "977889900", email: "martin@mail.com", sede: 1, ultima: "2026-04-15" },
  { id: 13, nombre: "Camila Rojas", dni: "47223344", telefono: "988990011", email: "camila@mail.com", sede: 2, ultima: "2026-06-14" },
  { id: 14, nombre: "Fernando Díaz", dni: "41556622", telefono: "911223344", email: "fernandod@mail.com", sede: 1, ultima: "2026-05-09" },
  { id: 15, nombre: "Patricia León", dni: "44889900", telefono: "922334455", email: "patricial@mail.com", sede: 2, ultima: "2026-06-03" },
  { id: 16, nombre: "Gonzalo Mejía", dni: "42334455", telefono: "933445500", email: "gonzalo@mail.com", sede: 1, ultima: "2026-02-27" },
  { id: 17, nombre: "Daniela Paredes", dni: "45667788", telefono: "944550066", email: "danielap@mail.com", sede: 2, ultima: "2026-06-11" },
  { id: 18, nombre: "Ricardo Salas", dni: "40223311", telefono: "955001122", email: "ricardo@mail.com", sede: 1, ultima: "2026-05-19" },
  { id: 19, nombre: "Andrea Campos", dni: "46778822", telefono: "966112233", email: "andrea@mail.com", sede: 2, ultima: "2026-06-07" },
  { id: 20, nombre: "Manuel Ortega", dni: "41889944", telefono: "977223344", email: "manuel@mail.com", sede: 1, ultima: "2026-04-02" },
  { id: 21, nombre: "Gabriela Ramos", dni: "44556633", telefono: "988334455", email: "gabriela@mail.com", sede: 2, ultima: "2026-06-16" },
  { id: 22, nombre: "Sebastián Vargas", dni: "42667711", telefono: "911445566", email: "sebastian@mail.com", sede: 1, ultima: "2026-05-25" },
  { id: 23, nombre: "Isabel Flores", dni: "45223399", telefono: "922556677", email: "isabel@mail.com", sede: 2, ultima: "2026-06-09" },
  { id: 24, nombre: "Hugo Medina", dni: "40778855", telefono: "933667788", email: "hugo@mail.com", sede: 1, ultima: "2026-03-11" },
  // Pacientes pediatricos. Hacen falta a proposito: el resto de la demo se genera
  // con fechas de nacimiento entre 1965 y 2009, asi que TODOS eran adultos y no
  // habia forma de ver la ficha de un nino ni su apoderado sin conectar el backend.
  { id: 25, nombre: "Mateo Ríos", dni: "88112233", telefono: "944112233", email: "", sede: 1, ultima: "2026-07-02",
    nacimiento: "2019-04-18", genero: "Masculino",
    apoderadoNombre: "Rosa Delgado Ríos", apoderadoParentesco: "Madre", apoderadoDni: "43119876", apoderadoTelefono: "944112233" },
  { id: 26, nombre: "Luciana Paredes", dni: "88445566", telefono: "955223344", email: "", sede: 2, ultima: "2026-06-21",
    nacimiento: "2014-11-05", genero: "Femenino",
    apoderadoNombre: "Carlos Paredes Soto", apoderadoParentesco: "Padre", apoderadoDni: "41552233", apoderadoTelefono: "955223344" },
  // A proposito SIN apoderado: asi se ve el aviso de que nadie puede firmar por el.
  // 14 anios: etapa de TRANSICION, para poder ver como avisa de que pasa a adulto.
  { id: 28, nombre: "Camila Espinoza", dni: "88990011", telefono: "977445566", email: "", sede: 2, ultima: "2026-08-10",
    nacimiento: "2012-03-09", genero: "Femenino",
    apoderadoNombre: "Elena Vera Loayza", apoderadoParentesco: "Madre", apoderadoDni: "42667788", apoderadoTelefono: "977445566" },
  { id: 27, nombre: "Thiago Quispe", dni: "88778899", telefono: "966334455", email: "", sede: 1, ultima: "2026-07-14",
    nacimiento: "2017-02-27", genero: "Masculino" },
].map((p) => {
  // Datos de segmentación: solo lo que viene en el seed (sin inventar VIP/tags con id%).
  // El genero se sacaba de (id % 2), asi que "Rosa Linares" salia con silueta
  // masculina en cuanto el avatar empezo a usarlo. Se deduce del nombre, que en
  // castellano acierta casi siempre; es solo para la demostracion.
  const _NOMBRES_FEM = ["isabel", "carmen", "beatriz", "raquel", "pilar", "ines", "mercedes"];
  const _genero = (nom) => {
    const pila = String(nom || "").trim().split(" ")[0].toLowerCase();
    if (_NOMBRES_FEM.includes(pila)) return "Femenino";
    return pila.endsWith("a") ? "Femenino" : "Masculino";
  };
  const _DIS = ["San Isidro", "Miraflores", "Surco", "San Borja", "La Molina", "Barranco", "Lince", "Jesús María", "Magdalena"];
  const _ASE = ["Ninguno", "Pacífico EPS", "Rímac Seguros", "Mapfre", "La Positiva", "Ninguno", "Ninguno"];
  const yy = 1965 + (p.id * 7) % 45, mm = String(1 + (p.id * 5) % 12).padStart(2, "0"), dd = String(1 + (p.id * 13) % 27).padStart(2, "0");
  // Sin fabricar VIP/tags/tarea/canal con id% (re-test #29). Solo datos explícitos del seed.
  const comentario = p.comentario !== undefined ? p.comentario : "";
  const canal = p.canal !== undefined ? p.canal : null;
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const tarea = p.tarea != null ? p.tarea : "";
  return { ...p, nacimiento: p.nacimiento || `${yy}-${mm}-${dd}`, genero: p.genero || _genero(p.nombre), distrito: p.distrito || _DIS[p.id % _DIS.length], canal, aseguradora: p.aseguradora || _ASE[p.id % _ASE.length], marketing: p.marketing === true, tags, presupuesto: { total: 0, pagado: 0 }, tarea, comentario };
});

/* Data clínica por paciente (en producción vendría de la BD, una fila por paciente).
   El odontograma usa { whole } o { caras: {cara: estado} } por número de pieza. */
export const FICHA_CLINICA = {
  1: {
    odontograma: { 16: { caras: { center: "caries" } }, 26: { caras: { top: "obturado" } }, 36: { whole: "corona" }, 46: { whole: "ausente" } },
    notas: { 16: "Caries oclusal moderada, requiere obturación." },
    alergias: ["Penicilina"], antecedentes: ["Bruxismo"],
    tratamiento: [
      { id: 1, nombre: "Limpieza y profilaxis", costo: 80, estado: "atendida" },
      { id: 2, nombre: "Curación pieza 16", costo: 120, estado: "atendida" },
      { id: 3, nombre: "Endodoncia pieza 26", costo: 350, estado: "pendiente" },
      { id: 4, nombre: "Corona pieza 36", costo: 450, estado: "pendiente" },
    ],
    pagos: [
      { fecha: "2026-04-10", concepto: "Limpieza", monto: 80, metodo: "Yape" },
      { fecha: "2026-05-12", concepto: "Curación pieza 16", monto: 120, metodo: "Tarjeta" },
    ],
    ahorro: 95, // por descuentos/promos aplicados históricamente
    recetas: [{ fecha: "2026-05-12", texto: "Ibuprofeno 400mg c/8h por 3 días" }],
    historia: [
      { fecha: "2026-05-12", titulo: "Curación de caries", detalle: "Se trató caries en muela superior derecha. Sin complicaciones." },
      { fecha: "2026-04-10", titulo: "Limpieza dental", detalle: "Profilaxis completa. Se recomienda control en 6 meses." },
    ] },
  2: {
    odontograma: { 11: { caras: { center: "obturado" } }, 47: { whole: "endodoncia" } },
    notas: {}, alergias: [], antecedentes: ["Hipertensión"],
    tratamiento: [
      { id: 1, nombre: "Endodoncia pieza 47", costo: 350, estado: "atendida" },
      { id: 2, nombre: "Corona pieza 47", costo: 450, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-04-28", concepto: "Endodoncia pieza 47", monto: 350, metodo: "Tarjeta" }],
    ahorro: 40,
    recetas: [{ fecha: "2026-04-28", texto: "Amoxicilina 500mg c/8h por 7 días" }],
    historia: [{ fecha: "2026-04-28", titulo: "Endodoncia", detalle: "Tratamiento de conducto en molar inferior. Pendiente colocación de corona." }] },
  3: {
    odontograma: { 21: { caras: { center: "caries", top: "caries" } }, 38: { whole: "extraer" } },
    notas: { 38: "Tercera molar incluida, evaluar exodoncia." }, alergias: ["Látex"], antecedentes: [],
    tratamiento: [
      { id: 1, nombre: "Control de brackets", costo: 150, estado: "atendida" },
      { id: 2, nombre: "Extracción pieza 38", costo: 200, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-06-01", concepto: "Control ortodoncia", monto: 150, metodo: "Efectivo" }],
    ahorro: 120,
    recetas: [],
    historia: [{ fecha: "2026-06-01", titulo: "Control de ortodoncia", detalle: "Ajuste de brackets. Buena evolución del tratamiento." }] },
  4: {
    odontograma: { 16: { caras: { center: "caries" } }, 36: { whole: "corona" } },
    notas: { 16: "Caries inicial, control en próxima visita." }, alergias: [], antecedentes: [],
    tratamiento: [
      { id: 1, nombre: "Sellantes preventivos", costo: 120, estado: "atendida" },
      { id: 2, nombre: "Curación pieza 16", costo: 90, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-06-10", concepto: "Sellantes preventivos", monto: 120, metodo: "Efectivo" }],
    ahorro: 30, recetas: [],
    historia: [{ fecha: "2026-06-10", titulo: "Control pediátrico", detalle: "Aplicación de sellantes. Buena higiene bucal." }] },
  5: {
    odontograma: { 12: { caras: { center: "obturado" } } },
    notas: {}, alergias: [], antecedentes: [],
    tratamiento: [
      { id: 1, nombre: "Instalación de brackets", costo: 1500, estado: "atendida" },
      { id: 2, nombre: "Control mensual", costo: 150, estado: "atendida" },
      { id: 3, nombre: "Control mensual", costo: 150, estado: "pendiente" },
    ],
    pagos: [
      { fecha: "2026-03-01", concepto: "Instalación de brackets", monto: 1500, metodo: "Tarjeta" },
      { fecha: "2026-05-01", concepto: "Control ortodoncia", monto: 150, metodo: "Yape" },
    ],
    ahorro: 200, recetas: [],
    historia: [{ fecha: "2026-06-15", titulo: "Control de ortodoncia", detalle: "Ajuste de arco. Evolución favorable del tratamiento." }] },
  6: {
    odontograma: { 36: { caras: { center: "caries" } }, 46: { whole: "obturado" } },
    notas: {}, alergias: ["Aspirina"], antecedentes: [],
    tratamiento: [
      { id: 1, nombre: "Profilaxis", costo: 80, estado: "atendida" },
      { id: 2, nombre: "Curación pieza 36", costo: 130, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-05-30", concepto: "Profilaxis", monto: 80, metodo: "Plin" }],
    ahorro: 0, recetas: [],
    historia: [{ fecha: "2026-05-30", titulo: "Limpieza dental", detalle: "Profilaxis y diagnóstico de caries en pieza 36." }] },
  7: {
    odontograma: { 26: { whole: "endodoncia" } },
    notas: { 26: "Endodoncia en curso, falta segunda sesión." }, alergias: [], antecedentes: ["Diabetes"],
    tratamiento: [
      { id: 1, nombre: "Endodoncia pieza 26 (1ra sesión)", costo: 200, estado: "atendida" },
      { id: 2, nombre: "Endodoncia pieza 26 (2da sesión)", costo: 150, estado: "pendiente" },
      { id: 3, nombre: "Corona pieza 26", costo: 450, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-06-05", concepto: "Endodoncia 1ra sesión", monto: 200, metodo: "Tarjeta" }],
    ahorro: 50, recetas: [{ fecha: "2026-06-05", texto: "Ibuprofeno 600mg c/8h por 3 días" }],
    historia: [{ fecha: "2026-06-05", titulo: "Endodoncia", detalle: "Primera sesión de tratamiento de conducto. Sin complicaciones." }] },
  8: {
    odontograma: { 21: { caras: { center: "caries" } } },
    notas: {}, alergias: [], antecedentes: [],
    tratamiento: [{ id: 1, nombre: "Limpieza dental", costo: 80, estado: "atendida" }],
    pagos: [{ fecha: "2026-03-18", concepto: "Limpieza dental", monto: 80, metodo: "Efectivo" }],
    ahorro: 0, recetas: [],
    historia: [{ fecha: "2026-03-18", titulo: "Limpieza dental", detalle: "Profilaxis de rutina. Se detecta caries incipiente en pieza 21." }] },
  9: {
    odontograma: { 11: { caras: { top: "fractura" } } },
    notas: { 11: "Fractura de esmalte, evaluar reconstrucción." }, alergias: ["Penicilina"], antecedentes: [],
    tratamiento: [{ id: 1, nombre: "Reconstrucción pieza 11", costo: 280, estado: "pendiente" }],
    pagos: [], ahorro: 0, recetas: [],
    historia: [{ fecha: "2026-06-12", titulo: "Evaluación", detalle: "Fractura en incisivo central superior. Se programa reconstrucción estética." }] },
  10: {
    odontograma: { 31: { whole: "obturado" } },
    notas: {}, alergias: [], antecedentes: ["Tabaquismo"],
    tratamiento: [
      { id: 1, nombre: "Destartraje (limpieza profunda)", costo: 180, estado: "atendida" },
      { id: 2, nombre: "Control periodontal", costo: 120, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-06-08", concepto: "Destartraje", monto: 180, metodo: "Yape" }],
    ahorro: 40, recetas: [{ fecha: "2026-06-08", texto: "Enjuague con clorhexidina 0.12% por 14 días" }],
    historia: [{ fecha: "2026-06-08", titulo: "Tratamiento periodontal", detalle: "Destartraje supragingival. Se recomienda reducir el tabaquismo." }] } };

// Demo: saldo/presupuesto = plan + pagos de FICHA_CLINICA (misma fuente que Caja en demo).
PACIENTES_INIT.forEach((p) => {
  const f = FICHA_CLINICA[p.id];
  if (!f) return;
  const total = (f.tratamiento || []).reduce((s, x) => s + (Number(x.costo) || 0), 0);
  const pagado = (f.pagos || []).reduce((s, x) => s + (Number(x.monto) || 0), 0);
  p.presupuesto = { total, pagado };
});

export const ESTADO_BADGE = {
  pendiente: { l: "Pendiente", bg: "var(--dc-warn-soft)", fg: "var(--dc-warn-600)" },
  confirmada: { l: "Confirmada", bg: "var(--dc-info-soft)", fg: "var(--dc-info-ink)" },
  en_sala: { l: "En sala", bg: "var(--dc-info-soft)", fg: "var(--dc-info-ink)" },
  en_atencion: { l: "En atención", bg: "var(--dc-info-soft)", fg: "var(--dc-info-ink)" },
  atendida: { l: "Atendida", bg: "var(--dc-ok-soft)", fg: "var(--dc-ok-700)" },
  cancelada: { l: "Cancelada", bg: "var(--dc-fee)", fg: "var(--dc-danger-700)" },
  no_show: { l: "No asistió", bg: "var(--dc-danger-soft)", fg: "var(--dc-warn-600)" },
  reprogramada: { l: "Reprogramada", bg: "var(--dc-bg)", fg: "var(--dc-purple)" },
  cerrada_sistema: { l: "Cerrada por sistema", bg: "var(--dc-bg)", fg: "var(--dc-ink-400)" },
};

/* ---- UI ---- */
// Superficie base: blanca, borde fino y sombra mínima. Sin efecto vidrio: sobre un
// fondo plano el desenfoque solo ensuciaba el color y hacía cada tarjeta distinta.
export const Card = ({ children, style, ...rest }) => <div {...rest} style={{ background: "var(--dc-surface)", borderRadius: "var(--dc-r-lg)", border: "1px solid var(--dc-line)", boxShadow: "var(--dc-sh-1)", ...style }}>{children}</div>;
export const Badge = ({ estado }) => { const e = ESTADO_BADGE[estado] || ESTADO_BADGE.pendiente; return <span style={{ background: e.bg, color: e.fg, fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: "var(--dc-r-full)", whiteSpace: "nowrap" }}>{e.l}</span>; };
/* Sistema de botones DS: primary – secundario – ghost – peligro – peligro-outline – green. */
export const Btn = ({ children, onClick, kind = "primary", small, disabled, full, type, busy, "aria-label": ariaLabel, title }) => {
  const kindClass = {
    primary: "dc-btn--primario",
    navy: "dc-btn--primario",
    red: "dc-btn--peligro",
    danger: "dc-btn--peligro",
    peligro: "dc-btn--peligro",
    green: "dc-btn--exito",
    ghost: "dc-btn--fantasma",
    secundario: "dc-btn--secundario",
    "peligro-outline": "dc-btn--peligro-outline",
  }[kind] || "dc-btn--primario";
  const solid = { primary: DS.c.primary, navy: NAVY, red: DS.c.error, danger: DS.c.error, peligro: DS.c.error, green: "var(--dc-ok-700)" }[kind] || DS.c.primary;
  const shadowColor = { primary: "rgba(15,95,117,0.3)", navy: "rgba(27,46,94,0.3)", red: "rgba(217,92,92,0.3)", danger: "rgba(217,92,92,0.3)", peligro: "rgba(217,92,92,0.3)", green: "rgba(21,128,61,0.3)" }[kind] || "rgba(0,0,0,0.1)";
  const ghost = kind === "ghost";
  const outline = kind === "secundario" || kind === "peligro-outline";
  const isBusy = !!busy;
  const outlineBg = kind === "peligro-outline" ? "var(--dc-surface)" : "var(--dc-surface)";
  const outlineColor = kind === "peligro-outline" ? "var(--dc-danger-700)" : "var(--dc-ink-900)";
  const outlineBorder = kind === "peligro-outline" ? "1.5px solid var(--dc-danger-700)" : "1.5px solid var(--dc-line)";
  // Botón en píldora, compacto y plano: sin degradado, sin brillo interior y sin
  // sombra de color, que lo hacían tosco y pesado. El hover solo oscurece un poco.
  const off = disabled || isBusy;
  const bg = off ? "var(--dc-line)" : outline ? outlineBg : ghost ? "var(--dc-white)" : solid;
  const fg = off ? "var(--dc-ink-500)" : outline ? outlineColor : ghost ? NAVY : "var(--dc-white)";
  const bd = outline ? outlineBorder.replace("1.5px", "1px") : ghost ? "1px solid var(--dc-line)" : "1px solid transparent";
  return <button type={type} className={`dc-btn ${kindClass}${small ? " dc-btn--sm" : ""}`} aria-label={ariaLabel} title={title || ariaLabel} aria-busy={isBusy ? "true" : undefined} onClick={onClick} disabled={off}
    style={{ background: bg, color: fg, border: bd, borderRadius: "var(--dc-r-full)", padding: small ? "5px 14px" : "8px 18px",
      fontSize: small ? 13 : 14, fontWeight: 500, lineHeight: 1.2, letterSpacing: "-0.005em", cursor: off ? "not-allowed" : "pointer", width: full ? "100%" : "auto",
      minHeight: small ? 32 : "var(--dc-tap-min)", whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      boxShadow: ghost || outline || off ? "none" : "0 1px 2px rgba(16,24,40,.10)", transition: "filter .15s, background .15s, border-color .15s", opacity: isBusy ? 0.85 : 1 }}
    onMouseEnter={(e) => { if (!off) { if (ghost || outline) e.currentTarget.style.background = "var(--dc-bg)"; else e.currentTarget.style.filter = "brightness(.93)"; } }}
    onMouseLeave={(e) => { if (!off) { e.currentTarget.style.background = bg; e.currentTarget.style.filter = "none"; } }}>{isBusy ? "Guardando…" : children}</button>;
};
export const Field = ({ label, value, onChange, placeholder, type = "text", icon, hint }) => (
  <label style={{ display: "block" }}>
    {label && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-400)", display: "block", marginBottom: 6, letterSpacing: .2 }}>{label}</span>}
    <div style={{ position: "relative" }}>
      {icon && <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--dc-ink-500)", display: "grid", placeItems: "center" }}>{icon}</span>}
      <input className="dc-premium-inp" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", minHeight: "var(--dc-tap-min)", padding: icon ? "12px 14px 12px 40px" : "12px 14px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", background: "var(--dc-bg)", fontSize: "var(--dc-fs-md)", outline: "none", boxSizing: "border-box", color: NAVY, transition: "border-color .15s, background .15s, box-shadow .15s" }}
        onFocus={(e) => { e.target.style.borderColor = "var(--dc-brand-500)"; e.target.style.background = "var(--dc-surface)"; e.target.style.boxShadow = "var(--dc-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--dc-line)"; e.target.style.background = "var(--dc-bg)"; e.target.style.boxShadow = "none"; }} />
    </div>
    {hint && <span style={{ fontSize: 12, color: "var(--dc-ink-500)", marginTop: 5, display: "block" }}>{hint}</span>}
  </label>
);

/* ---- Sistema visual base (consistencia entre módulos) ---- */
export const iniciales = (n) => (n || "").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
// Color estable por nombre — paleta fría de marca (teal/navy/azul), sobria y coherente.
// Paleta de avatares: tonos variados pero armónicos (todos con contraste AA sobre su
// propio tinte al 14 %), para distinguir pacientes de un vistazo.
export const AV_COLORS = ["#0E8C95", "#6D4FD1", "#D0563F", "#B7791F", "#2563EB", "#15803D", "#C2417A", "#0F6E8C"];
export const colorDe = (s) => AV_COLORS[[...(s || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
/**
 * Tinte seguro sobre tokens `var(--dc-*)` (UX-22).
 * Nunca concatenar hex alfa (`${tint(c, 0.125)}`) a un color CSS variable.
 * Mapa habitual: 05→3% – 1a→10% – 20→12% – 30→19% – 66→40% – CC→80%.
 */
export const tint = (c, a = 0.12) =>
  `color-mix(in srgb, ${c} ${Math.round(Number(a) * 100)}%, transparent)`;
// Estado vacío uniforme.
export const Vacio = ({ icon, titulo, sub }) => (
  <div style={{ padding: 40, textAlign: "center" }}>
    <div style={{ width: 52, height: 52, borderRadius: "var(--dc-r-lg)", background: "var(--dc-bg)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--dc-brand-soft)" }}>{icon}</div>
    <div style={{ fontWeight: 600, color: NAVY, fontFamily: DISPLAY_FONT, fontSize: 14 }}>{titulo}</div>
    {sub && <div style={{ fontSize: 13, marginTop: 3, color: "var(--dc-ink-500)" }}>{sub}</div>}
  </div>
);
// Tarjeta KPI reutilizable (icono + etiqueta + valor + delta/sub opcional).
/**
 * Tono de un aviso a partir de su texto: no hace falta tocar las cerca de 200 llamadas
 * a notify() repartidas por el código. Si el mensaje dice que algo no se pudo hacer o
 * que falta un dato, no se anuncia con la palomita verde de "guardado".
 */
export const tonoAviso = (msg = "") => {
  const t = String(msg).toLowerCase();
  // WA-17: mensajes de éxito no deben pintarse en rojo (p. ej. «conexión correcta»).
  if (/correcta|correctamente|conectado correctamente|conexi[oó]n con whatsapp correcta/.test(t)
      && !/incorrect|no se pud|error/.test(t)) {
    return { error: false, fondo: "var(--dc-ok-soft)", color: "var(--dc-ok-700)", borde: "var(--dc-line)" };
  }
  const malo = /no se pud|no pudo|no se pudieron|error|falta |faltan |completa |complete |indica |revisa |inv[áa]lid|incorrect|no hay |no se enc|denegad|sin permiso|no tienes|disponible al|no se envi|obligatori|justificaci[oó]n/.test(t);
  const aviso = /fallo|fallidos|[aá]mbar|con fallos/.test(t) && !malo;
  if (aviso) {
    return { error: false, fondo: "var(--dc-warn-soft)", color: "var(--dc-warn-700)", borde: "var(--dc-warn-mid, #f59e0b)" };
  }
  return malo
    ? { error: true, fondo: "var(--dc-danger-soft)", color: "var(--dc-red)", borde: "var(--dc-danger-mid)" }
    : { error: false, fondo: "var(--dc-ok-soft)", color: "var(--dc-ok-700)", borde: "var(--dc-line)" };
};

/**
 * Tarjeta KPI. Por defecto estado="dato" (callers existentes intactos).
 * estado: cargando | dato | vacio | error — en error nunca muestra 0 (usa "—").
 */
export const KpiCard = ({ icon, label, value, color = NAVY, sub, delta, up, onClick, estado = "dato", onRetry }) => {
  const st = estado || "dato";
  let shown = value;
  let shownSub = sub;
  if (st === "cargando") {
    shown = "…";
    shownSub = sub || "Cargando…";
  } else if (st === "vacio") {
    shown = "—";
    shownSub = sub || "Sin datos";
  } else if (st === "error") {
    shown = "—";
    shownSub = null;
  }
  const clickable = typeof onClick === "function" && (st === "dato" || st === "vacio");
  return (
  <div onClick={clickable ? onClick : undefined} className={`dc-kpi dc-kpi--${st}${clickable ? " dc-kpi--click" : ""}`} style={{ "--k": color, cursor: clickable ? "pointer" : "default", minWidth: 0, maxWidth: "100%", "--kpi-tinte": tint(color, 0.16) }}>
    {icon && <div className="dc-kpi__icon" style={{ background: color, color: "#fff", boxShadow: `0 8px 18px -8px ${color}` }}>{icon}</div>}
    <div className="dc-kpi__body">
      <div className="dc-kpi__label">{label}</div>
      {st === "cargando" ? (
        <div className="dc-kpi__skel" aria-hidden="true" />
      ) : (
        <div>
          <div className="dc-kpi__value dc-tabular" style={{ color: st === "error" || st === "vacio" ? "var(--dc-ink-400)" : "var(--dc-ink-900)", fontFamily: DISPLAY_FONT }}>{shown}</div>
        </div>
      )}
      {st === "error" ? (
        <div className="dc-kpi__sub" style={{ color: "var(--dc-danger-700)" }}>
          No se pudo cargar
          {onRetry ? (
            <>
              {" – "}
              <button type="button" className="dc-kpi__retry" onClick={(e) => { e.stopPropagation(); onRetry(); }}>
                Reintentar
              </button>
            </>
          ) : null}
        </div>
      ) : delta ? <div className="dc-kpi__sub" style={{ color: up ? "var(--dc-ok-700)" : "var(--dc-red)", display: "flex", alignItems: "center", gap: 3 }}><ArrowUpRight size={13} strokeWidth={1.75} style={{ transform: up ? "none" : "rotate(90deg)" }} /> {delta}</div> : shownSub ? <div className="dc-kpi__sub">{shownSub}</div> : null}
    </div>
  </div>
  );
};

/* =============================================================================
   DashLienzo — dashboard personalizable con tarjetas 3D: arrastrar para reordenar,
   redimensionar (ancho/alto) y ocultar. El layout se guarda por rol (localStorage).
   widgets: [{ id, title, icon, color, w(1-4), h(1-2), render() }]
   ========================================================================== */
// Alto de una fila de la rejilla del dashboard. Estaba en 116 y dejaba demasiado aire
// dentro de cada tarjeta. Bajar a 96 recortaba los pies de texto a media palabra, asi
// que 106 es el punto donde entra el contenido sin sobrar espacio.
// Medido en pantalla: con 106 la tarjeta de una fila deja 36,4 px de cuerpo y
// cualquier contenido de "número + pie" necesita unos 44, así que la segunda línea
// salía cortada. 114 es lo justo para que quepa sin volver al aire de antes.
export const DASH_ROWH = 114;
export function DashLienzo({ role, titulo, sub, widgets }) {
  const [cols, setCols] = useState(4);
  const gridRef = useRef(null);
  useEffect(() => {
    const el = gridRef.current; if (!el) return;
    const calc = () => { const w = el.clientWidth; if (w) setCols(w > 1040 ? 4 : w > 660 ? 2 : 1); };
    calc();
    const raf = requestAnimationFrame(calc);
    let ro; try { ro = new ResizeObserver(calc); ro.observe(el); } catch (e) { /* fallback below */ }
    window.addEventListener("resize", calc);
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); window.removeEventListener("resize", calc); };
  }, []);
  const byId = Object.fromEntries(widgets.map((w) => [w.id, w]));
  const def = () => widgets.map((w) => ({ id: w.id, w: w.w || 1, h: w.h || 1 }));
  // OJO: el tamaño de cada tarjeta se guarda por usuario, asi que cambiar w/h en el
  // codigo NO le llega a quien ya abrio el dashboard: conserva el layout guardado.
  // Al reajustar los tamaños por defecto hay que subir esta version (dash2 -> dash3...)
  // o el cambio solo lo veran los usuarios nuevos.
  // dash7_: default ≤6 widgets visibles (SPEC §16 / A15); layouts viejos se regeneran.
  const [layout, setLayout] = usePersist("dash7_" + role, def);
  const [edit, setEdit] = useState(false);
  // Auto-agrega al layout guardado cualquier widget nuevo (y descarta ids inexistentes).
  useEffect(() => {
    setLayout((L) => { const known = new Set(L.map((l) => l.id)); const clean = L.filter((l) => byId[l.id]); const nuevos = widgets.filter((w) => !known.has(w.id)); return (nuevos.length || clean.length !== L.length) ? [...clean, ...nuevos.map((w) => ({ id: w.id, w: w.w || 1, h: w.h || 1 }))] : L; });
  }, [widgets.map((w) => w.id).join("|")]);
  const dragI = useRef(null); const [over, setOver] = useState(null);
  // En una sola columna -el móvil- se enseñan las primeras y el resto tras un botón:
  // quince tarjetas seguidas son casi cinco pantallas de scroll. En escritorio, todas.
  const CORTE_MOVIL = 6;
  const [verTodo, setVerTodo] = useState(false);
  const todas = layout.filter((l) => byId[l.id]);
  const recorta = cols === 1 && !edit && !verTodo && todas.length > CORTE_MOVIL;
  const shown = recorta ? todas.slice(0, CORTE_MOVIL) : todas;
  const hidden = widgets.filter((w) => !shown.some((l) => l.id === w.id));
  const move = (from, to) => setLayout((L) => { if (from == null || to == null || from === to) return L; const a = [...L]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; });
  const cycleW = (id) => setLayout((L) => L.map((l) => l.id === id ? { ...l, w: (l.w % Math.min(4, cols)) + 1 } : l));
  const toggleH = (id) => setLayout((L) => L.map((l) => l.id === id ? { ...l, h: l.h === 1 ? 2 : 1 } : l));
  const quitar = (id) => setLayout((L) => L.filter((l) => l.id !== id));
  const add = (id) => setLayout((L) => [...L, { id, w: byId[id].w || 1, h: byId[id].h || 1 }]);
  const btn = { background: "rgba(255,255,255,.9)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", width: 26, height: 26, display: "grid", placeItems: "center", cursor: "pointer", color: NAVY, boxShadow: "0 2px 6px rgba(16,24,40,.12)" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div><h2 className="dc-title" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--dc-ink-900)" }}>{titulo}</h2>{sub && edit && <div style={{ fontSize: 13, color: "var(--dc-ink-500)", marginTop: 2 }}>{sub}</div>}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {edit && <Btn small kind="ghost" onClick={() => setLayout(def())}><Repeat size={14} strokeWidth={1.75} /> Restablecer</Btn>}
          <Btn small kind={edit ? "navy" : "ghost"} onClick={() => setEdit((e) => !e)}>{edit ? <><Check size={15} strokeWidth={1.75} /> Listo</> : <><Settings size={15} strokeWidth={1.75} /> Personalizar</>}</Btn>
        </div>
      </div>
      {edit && (
        <div style={{ background: "var(--dc-bg)", border: "1px solid var(--dc-line-alt2)", borderRadius: "var(--dc-r-lg)", padding: "12px 15px", fontSize: 13, color: "var(--dc-info-ink)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Menu size={16} strokeWidth={1.75} /> Arrastra las tarjetas para moverlas. Usa <ArrowUpDown size={13} strokeWidth={1.75} style={{ transform: "rotate(90deg)" }} /> para el ancho y <ArrowUpDown size={13} strokeWidth={1.75} /> para el alto.
          {hidden.length > 0 && <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>{hidden.map((w) => <button key={w.id} onClick={() => add(w.id)} style={{ fontSize: 12, fontWeight: 500, color: NAVY, background: "var(--dc-white)", border: "1px solid var(--dc-line-alt2)", borderRadius: "var(--dc-r-full)", padding: "4px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Plus size={12} strokeWidth={1.75} /> {w.title}</button>)}</span>}
        </div>
      )}
      {cols === 1 && !edit && todas.length > CORTE_MOVIL && verTodo && (
        <button onClick={() => setVerTodo(false)} style={{ width: "100%", marginBottom: 12, background: "var(--dc-white)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "11px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: NAVY, boxShadow: "0 1px 2px rgba(16,24,40,.06)" }}>
          Ver solo lo principal
        </button>
      )}
      <div ref={gridRef} style={{ display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gridAutoRows: `minmax(${DASH_ROWH}px, auto)`, gridAutoFlow: "dense", gap: 16 }}>
        {shown.map((l, i) => { const W = byId[l.id]; const span = Math.min(l.w, cols); const Ic = W.icon; const c = W.color || NAVY; return (
          <div key={l.id} draggable={edit} onDragStart={() => { dragI.current = i; }} onDragEnd={() => { dragI.current = null; setOver(null); }} onDragOver={(e) => { e.preventDefault(); if (over !== i) setOver(i); }} onDrop={() => { move(dragI.current, i); dragI.current = null; setOver(null); }}
            className="dw-card" style={{ gridColumn: `span ${span}`, gridRow: `span ${l.h}`, outline: edit ? `2px dashed ${over === i ? c : "var(--dc-line-alt2)"}` : "none", outlineOffset: -3, cursor: edit ? "grab" : "default" }}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px 18px", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, flexShrink: 0 }}>
                {Ic && <div style={{ width: 28, height: 28, borderRadius: 999, background: tint(c, 0.09), color: c, display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={15} strokeWidth={1.75} /></div>}
                <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--dc-ink-900)", flex: 1, minWidth: 0, margin: 0, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{W.title}</h2>
                {edit && <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  <button type="button" className="dc-icon-btn" aria-label="Ancho" title="Ancho" onClick={() => cycleW(l.id)} style={btn}><ArrowUpDown size={13} strokeWidth={1.75} style={{ transform: "rotate(90deg)" }} /></button>
                  <button type="button" className="dc-icon-btn" aria-label="Alto" title="Alto" onClick={() => toggleH(l.id)} style={btn}><ArrowUpDown size={13} strokeWidth={1.75} /></button>
                  <button type="button" className="dc-icon-btn" aria-label="Ocultar" title="Ocultar" onClick={() => quitar(l.id)} style={{ ...btn, color: "var(--dc-red)" }}><X size={14} strokeWidth={1.75} /></button>
                </div>}
              </div>
              {/* Filas con altura mínima (no fija): la tarjeta crece con su contenido en vez de
                  recortarlo a media línea. */}
              <div className="dc-scroll" style={{ flex: 1, minWidth: 0, maxHeight: l.h > 1 ? 380 : 240, overflowY: "auto", display: "flex", flexDirection: "column", pointerEvents: edit ? "none" : "auto" }}><div className="dw-body" style={{ flex: 1, minHeight: 0 }}>{W.render({ w: span, h: l.h })}</div></div>
            </div>
          </div>
        ); })}
      </div>
      {recorta && (
        <button onClick={() => setVerTodo(true)} style={{ width: "100%", marginTop: 12, background: "var(--dc-white)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-md)", padding: "11px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: NAVY, boxShadow: "0 1px 2px rgba(16,24,40,.06)" }}>
          Ver las otras {todas.length - CORTE_MOVIL} tarjetas
        </button>
      )}
    </div>
  );
}
// Modal centrado reutilizable (header con degradado + cuerpo con scroll).
// size: confirm|corto|largo → 420|560|720 (SPEC §15.7). maxW sigue disponible.
const MODAL_SIZE = { confirm: 420, corto: 560, largo: 720 };
export const Modal = ({ icon, titulo, sub, onClose, children, footer, maxW, size, tone = NAVY }) => {
  const widthPx = maxW ?? MODAL_SIZE[size] ?? MODAL_SIZE.largo;
  const panelRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const root = panelRef.current;
    const focusables = () => root ? [...root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null) : [];
    const first = focusables()[0];
    if (first) first.focus();
    else if (root) root.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== "Tab" || !root) return;
      const list = focusables();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); list[list.length - 1].focus(); }
      else if (!e.shiftKey && (i === list.length - 1 || i < 0)) { e.preventDefault(); list[0].focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); if (prev && prev.focus) try { prev.focus(); } catch { /* */ } };
  }, [onClose]);
  return (
  <div className="dc-modal-backdrop" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15, 35, 42, 0.35)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "grid", placeItems: "center", zIndex: 200, padding: 20, animation: "dcBackdropFade 0.2s ease-out forwards" }}>
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="dc-modal-title" tabIndex={-1} className="dc-modal" onClick={(e) => e.stopPropagation()} style={{ background: "var(--dc-white)", width: `min(${widthPx}px,96vw)`, maxHeight: "min(680px, 88vh)", borderRadius: "var(--dc-r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(15, 35, 42, 0.4), 0 0 0 1px rgba(15, 35, 42, 0.05)", animation: "dcModalSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards", transform: "translateZ(0)", outline: "none" }}>
      <div className="dc-modal__head" style={{ "--tono": tone === NAVY ? "#0E9199" : tone, padding: "20px 24px", background: `linear-gradient(135deg, ${DS.c.primary}, ${DS.c.primaryDark})`, color: "var(--dc-white)", flexShrink: 0, display: "flex", alignItems: "center", gap: 14 }}>
        {icon && <div style={{ width: 44, height: 44, borderRadius: "var(--dc-r-md)", background: "rgba(255,255,255,.15)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)", display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="dc-modal-title" className="dc-title" style={{ margin: 0, fontSize: 16, fontWeight: 600, fontFamily: DISPLAY_FONT, color: "inherit" }}>{titulo}</h2>
          {sub && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{sub}</div>}
        </div>
        <button type="button" aria-label="Cerrar" className="dc-icon-btn" onClick={onClose} style={{ background: "rgba(255,255,255,.10)", border: "none", borderRadius: "var(--dc-r-full)", width: 44, height: 44, cursor: "pointer", color: "var(--dc-white)", display: "grid", placeItems: "center", flexShrink: 0, transition: "background .15s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.20)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,.10)"}><X size={17} strokeWidth={2} /></button>
      </div>
      <div className="dc-scroll dc-modal__body" style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: footer ? "24px 28px 16px" : "32px 32px 40px", willChange: "transform" }}>{children}</div>
      {footer && <div className="dc-modal__footer" style={{ position: "sticky", bottom: 0, padding: "14px 24px", borderTop: "1px solid var(--dc-line)", background: "var(--dc-white)", flexShrink: 0, display: "flex", justifyContent: "flex-end", gap: 10, zIndex: 1 }}>{footer}</div>}
    </div>
  </div>
  );
};
// Tabla de datos reutilizable: título de columna centrado, filtro inline al clic,
// orden A–Z/Z–A al costado, alineación por columna y clic en fila.
// cols: [{ key, label, w, a:"left"|"center", get:(r)=>texto, cell:(r)=>JSX, noFilter, noSort }]
const CANT_SING = { doctores: "doctor", odontólogos: "odontólogo", tratamientos: "tratamiento", servicios: "servicio", insumos: "insumo", movimientos: "movimiento", pagos: "pago", pacientes: "paciente", registros: "registro", planes: "plan", citas: "cita", sedes: "sede" };
function etiquetaCant(n, sub) {
  if (!sub) return n === 1 ? "registro" : "registros";
  if (n === 1) return CANT_SING[sub] || sub.replace(/es$/, "").replace(/s$/, "");
  return sub;
}

export function DataTable({ cols, rows, onRowClick, titulo, sub, empty, minWidth = 720, bare = false, defaultSort, accion, pageSize = 25, maxHeight, rowClassName }) {
  const [sortCol, setSortCol] = useState(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState(defaultSort?.dir ?? "asc");
  const [colFilters, setColFilters] = useState({});
  const [activeCol, setActiveCol] = useState(null);
  const [visible, setVisible] = useState(pageSize);
  useEffect(() => { setVisible(pageSize); }, [rows, pageSize, colFilters, sortCol, sortDir]);
  const toggleSort = (key) => { setActiveCol(null); if (sortCol !== key) { setSortCol(key); setSortDir("asc"); } else if (sortDir === "asc") setSortDir("desc"); else setSortCol(null); };
  const COL = cols.map((c) => c.w).join(" ");
  // Ordenar no es filtrar: contarlo hacía que todas las tablas con orden por defecto
  // -que son casi todas- dijeran "– filtrado" desde el primer render, y un aviso que
  // sale siempre no avisa de nada.
  const anyF = Object.values(colFilters).some((v) => v && v.trim());
  // Filtrar y ordenar es O(filas x columnas) + O(n log n): con useMemo solo se rehace
  // cuando cambian los datos, el filtro o el orden, no en cada render del padre
  // (antes se recalculaba hasta al abrir el desplegable de una columna).
  const lista = useMemo(() => {
    const base = rows.filter((r) => cols.every((c) => { if (c.noFilter || !c.get) return true; const f = (colFilters[c.key] || "").trim().toLowerCase(); return !f || String(c.get(r)).toLowerCase().includes(f); }));
    const sc = cols.find((c) => c.key === sortCol && c.get);
    if (!sc) return base;
    return [...base].sort((a, b) => { const r = String(sc.get(a)).localeCompare(String(sc.get(b)), "es", { numeric: true, sensitivity: "base" }); return sortDir === "asc" ? r : -r; });
  }, [rows, cols, colFilters, sortCol, sortDir]);
  const mostradas = lista.slice(0, visible);
  const hayMas = lista.length > visible;
  // Columna fija a la derecha (acciones): fondo opaco y sombra para que, al hacer
  // scroll horizontal, no se lea el texto de las columnas que pasan por debajo.
  const stickyCell = { position: "sticky", right: 0, alignSelf: "stretch", alignItems: "center", background: "var(--dc-surface)", zIndex: 1 };
  const stickyHead = { ...stickyCell, background: "var(--dc-bg-soft)", zIndex: 2 };
  const scrollStyle = maxHeight
    ? { overflowX: "auto", overflowY: "auto", maxHeight }
    : { overflowX: "auto" };
  return (
    <div className={bare ? "dc-table-wrap" : "dc-rise dc-table-wrap"} style={bare ? { overflow: "hidden" } : { background: "var(--dc-surface)", borderRadius: "var(--dc-r-lg)", boxShadow: "var(--dc-sh-1)", border: "1px solid var(--dc-line)", overflow: "hidden", ...(maxHeight ? { maxHeight: typeof maxHeight === "number" ? maxHeight + 56 : maxHeight } : {}) }}>
      {titulo && <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--dc-line)", background: "var(--dc-surface)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h2 className="dc-title" style={{ margin: 0, color: "var(--dc-ink-900)", fontSize: 14, fontWeight: 500 }}>{titulo}</h2><span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)", background: "var(--dc-bg)", borderRadius: 999, padding: "2px 9px" }}>{lista.length} {etiquetaCant(lista.length, sub)}{anyF ? " – filtrado" : ""}{hayMas ? ` – mostrando ${mostradas.length}` : ""}</span></div>{accion && <div>{accion}</div>}</div>}
      <div style={scrollStyle}>
        {/* NAV-07: width fluido (100%) cuando minWidth <= 0 para evitar desborde de 340px;
            width: max-content solo cuando minWidth > 0 explícito exige scroll horizontal. */}
        {/* La tabla ocupa todo el ancho de la tarjeta; minWidth solo fija desde dónde
            aparece el scroll horizontal. Con "max-content" las columnas fr se encogían
            a su contenido y la tabla quedaba más angosta que su tarjeta. */}
        <div style={minWidth > 0 ? { minWidth, width: "100%" } : { width: "100%", minWidth: 0, maxWidth: "100%" }}>
          <div className="dc-table-head" style={{ display: "grid", gridTemplateColumns: COL, gap: 12, padding: "4px 16px", borderBottom: "1px solid var(--dc-line)", background: "var(--dc-bg-soft)", ...(maxHeight ? { position: "sticky", top: 0, zIndex: 3 } : {}) }}>
            {cols.map((col) => {
              if (col.noFilter && col.noSort) return <span key={col.key} style={{ fontSize: 12, fontWeight: 500, letterSpacing: .02, color: "var(--dc-ink-500)", textAlign: col.a === "left" ? "left" : col.a === "right" ? "right" : "center", alignSelf: "center", paddingLeft: col.a === "left" ? 12 : 0, paddingRight: col.a === "right" ? 12 : 0, lineHeight: 1.25, whiteSpace: "normal", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", ...(col.sticky ? { ...stickyHead, display: "flex", justifyContent: "center" } : {}) }}>{col.label}</span>;
              const isSort = sortCol === col.key; const isFilt = !!(colFilters[col.key] && colFilters[col.key].trim()); const open = activeCol === col.key || isFilt;
              const just = col.a === "left" ? "flex-start" : col.a === "right" ? "flex-end" : "center";
              return (
                <div key={col.key} style={{ display: "flex", alignItems: "center", justifyContent: just, gap: 4, minWidth: 0, paddingLeft: col.a === "left" ? 12 : 0, paddingRight: col.a === "right" ? 12 : 0, ...(col.sticky ? stickyHead : {}) }}>
                  {open ? (
                    <input className="dc-th dc-premium-inp" aria-label={`Filtrar ${col.label}`} autoFocus={activeCol === col.key} value={colFilters[col.key] || ""} onChange={(e) => setColFilters((f) => ({ ...f, [col.key]: e.target.value }))} onBlur={() => { if (!(colFilters[col.key] || "").trim()) setActiveCol(null); }} onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") { if (e.key === "Escape") setColFilters((f) => { const n = { ...f }; delete n[col.key]; return n; }); setActiveCol(null); e.currentTarget.blur(); } }} placeholder={col.label} style={{ flex: 1, width: "100%", minWidth: 0, minHeight: 30, textAlign: col.a === "left" ? "left" : "center", fontSize: 12, fontWeight: 500, color: NAVY, background: "var(--dc-bg)", border: "1px solid var(--dc-line)", borderRadius: "var(--dc-r-sm)", padding: "5px 8px", outline: "none", boxSizing: "border-box" }} />
                  ) : (
                    <button type="button" onClick={() => !col.noFilter && setActiveCol(col.key)} title={col.noFilter ? col.label : "Clic para filtrar"} style={{ minWidth: 0, textAlign: col.a === "left" ? "left" : col.a === "right" ? "right" : "center", fontSize: 12, fontWeight: 500, letterSpacing: .02, color: isFilt || isSort ? "var(--dc-ink-900)" : "var(--dc-ink-500)", background: "transparent", border: "none", cursor: col.noFilter ? "default" : "text", padding: "6px 0", borderRadius: "var(--dc-r-sm)", whiteSpace: "normal", lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{col.label}</button>
                  )}
                  {!col.noSort && <button type="button" className="dc-col-sort" aria-label={`Ordenar ${col.label}`} onClick={() => toggleSort(col.key)} title="Ordenar" style={{ flexShrink: 0, width: 22, height: 22, display: "grid", placeItems: "center", borderRadius: "var(--dc-r-sm)", border: "none", cursor: "pointer", background: isSort ? tint(DS.c.primary, 0.12) : "transparent", color: isSort ? DS.c.primary : "var(--dc-ink-400)", transition: "background .12s, color .12s", padding: 0 }}>{isSort ? (sortDir === "asc" ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />) : <ArrowUpDown size={12} strokeWidth={1.75} />}</button>}
                </div>
              );
            })}
          </div>
          {lista.length === 0 ? (rows.length > 0 ? <Vacio icon={<Search size={22} strokeWidth={1.75} />} titulo="Sin resultados" sub="Nada coincide con el filtro." /> : (empty || <Vacio icon={<Search size={22} strokeWidth={1.75} />} titulo="Sin registros" sub="Aún no hay datos para mostrar." />)) : mostradas.map((r, i) => { return (
            <div key={r.id ?? i} className={`dc-table-row${rowClassName ? " " + (rowClassName(r) || "") : ""}`} onClick={onRowClick ? () => onRowClick(r) : undefined} style={{ display: "grid", gridTemplateColumns: COL, gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--dc-line)", cursor: onRowClick ? "pointer" : "default", background: "transparent", transition: "background .15s", position: "relative", zIndex: 1, boxSizing: "border-box", width: "100%", maxWidth: "100%", minWidth: 0 }} onMouseEnter={(ev) => { ev.currentTarget.style.background = "var(--dc-bg-soft2)"; }} onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}>
              {cols.map((col) => (
                <div key={col.key} data-label={col.label || ""} className={col.sticky ? "dc-col-sticky" : undefined} style={{ minWidth: 0, ...(col.sticky ? stickyCell : {}), ...(col.a === "left" ? { paddingLeft: 12 }
                  : col.a === "right" ? { display: "flex", justifyContent: "flex-end", textAlign: "right", paddingRight: 12, fontVariantNumeric: "tabular-nums" }
                  : { display: "flex", justifyContent: "center", textAlign: "center" }) }}>{col.cell ? col.cell(r) : <span style={{ fontSize: 13, color: "var(--dc-ink-700)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "100%" }}>{col.get ? col.get(r) : ""}</span>}</div>
              ))}
            </div>
          ); })}
        </div>
      </div>
      {hayMas && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(16,24,40,.06)", display: "flex", justifyContent: "center" }}>
          <button type="button" className="dc-btn dc-btn--secundario" onClick={() => setVisible((n) => n + pageSize)} style={{ minHeight: "var(--dc-tap-min)" }}>
            Cargar más ({lista.length - visible} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
// Lleva controles propios de un módulo (pestañas, estado, filtros) a la cabecera de
// la app, junto al título, en vez de gastar una fila entera debajo.
export function EnCabecera({ children }) {
  const [el, setEl] = useState(null);
  // Sin barra superior: las acciones van dentro de la cabecera de color de la vista
  // si la tiene ([data-slot-acciones]); si no, en una fila discreta sobre el contenido.
  useEffect(() => { setEl(document.querySelector("#dc-main [data-slot-acciones]") || document.getElementById("dc-top-slot")); }, []);
  return el ? createPortal(children, el) : null;
}
// Menú "⋯" para las acciones secundarias de una fila: deja visible solo la acción
// principal y evita filas con cuatro botones en línea.
// opciones: [{ label, onClick, peligro }]
export function MenuAcciones({ opciones = [], etiqueta = "Más acciones" }) {
  // La lista va en position:fixed: dentro de una tabla con scroll horizontal una
  // lista absoluta quedaba recortada por el contenedor.
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const lista = opciones.filter(Boolean);
  useEffect(() => {
    if (!pos) return undefined;
    const cerrar = () => setPos(null);
    window.addEventListener("resize", cerrar);
    document.addEventListener("scroll", cerrar, true);
    return () => { window.removeEventListener("resize", cerrar); document.removeEventListener("scroll", cerrar, true); };
  }, [pos]);
  if (!lista.length) return null;
  const abrir = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const abajo = window.innerHeight - r.bottom > 44 * lista.length + 24;
    setPos({ right: Math.max(8, window.innerWidth - r.right), ...(abajo ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }) });
  };
  return (
    <div className="dc-menu" onClick={(e) => e.stopPropagation()}>
      <button ref={btnRef} type="button" className="dc-row-action" aria-label={etiqueta} title={etiqueta} aria-haspopup="menu" aria-expanded={!!pos} onClick={() => (pos ? setPos(null) : abrir())}><MoreHorizontal size={16} strokeWidth={1.75} /></button>
      {pos && (<>
        <div onClick={() => setPos(null)} style={{ position: "fixed", inset: 0, zIndex: 190 }} />
        <div className="dc-menu__lista" role="menu" style={{ position: "fixed", zIndex: 191, top: pos.top, bottom: pos.bottom, right: pos.right }} onKeyDown={(e) => { if (e.key === "Escape") setPos(null); }}>
          {lista.map((o) => (
            <button key={o.label} type="button" role="menuitem" className={`dc-menu__op${o.peligro ? " dc-menu__op--peligro" : ""}`} onClick={() => { setPos(null); o.onClick(); }}>{o.label}</button>
          ))}
        </div>
      </>)}
    </div>
  );
}
// Encabezado de módulo (título + subtítulo + acción).
// El nombre del módulo ya está en la cabecera de la app: repetirlo aquí en una
// tarjeta con icono gastaba espacio y lo mostraba dos o tres veces. Queda una
// línea con la descripción y la acción principal. `titulo` sigue aceptándose
// para no tocar las llamadas, pero no se pinta.
export const ModHead = ({ sub, accion }) => (!sub && !accion) ? null : (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", minHeight: 36 }}>
    {sub ? <p style={{ margin: 0, fontSize: 13, color: "var(--dc-ink-500)", minWidth: 0, flex: "1 1 280px" }}>{sub}</p> : <span />}
    {accion && <div style={{ flexShrink: 0, display: "flex", gap: 8 }}>{accion}</div>}
  </div>
);
// Barra de paciente unificada para los módulos clínicos.
export const PacienteBar = ({ pacientes, pacienteId, setPacienteId, modulo, accion, sedeLabel = null, extra = null }) => {
  const chip = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, borderRadius: "var(--dc-r-full)", padding: "3px 10px", whiteSpace: "nowrap" };
  const p = pacientes.find((x) => x.id === pacienteId) || null;
  if (!pacientes.length) {
    return (
      <Card style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--dc-ink-500)" }}>{modulo ? `${modulo} – ` : ""}No hay pacientes cargados.</div>
      </Card>
    );
  }
  if (!p) {
    return (
      <Card style={{ padding: "14px 18px", marginBottom: 16, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            {modulo && <div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{modulo}</div>}
            <div style={{ fontWeight: 500, color: NAVY, marginBottom: 8 }}>Elige un paciente</div>
            <Select width={280} ariaLabel="Paciente" value="" placeholder="Selecciona un paciente…"
                    onChange={(v) => setPacienteId(/^\d+$/.test(String(v)) ? Number(v) : v)}
                    options={[{ value: "", label: "Selecciona un paciente…", disabled: true }, ...pacientes.map((x) => ({ value: x.id, label: x.nombre }))]} />
          </div>
          {accion && <div style={{ flexShrink: 0 }}>{accion}</div>}
        </div>
      </Card>
    );
  }
  const alergias = (Array.isArray(p.alergias) && p.alergias.length)
    ? p.alergias
    : ((typeof FICHA_CLINICA !== "undefined" && FICHA_CLINICA[p.id]?.alergias) || []);
  // API lista trae sedeRegistroId (UUID); demo trae sedes/sede. sedeLabel = sede activa del shell.
  const sedeTxt = (() => {
    const fromPac = etiquetaSedes(p.sedes ?? p.sede ?? p.sedeRegistroId ?? p.sedeId);
    if (fromPac && fromPac !== "—") return fromPac;
    if (p.sedeNombre) return p.sedeNombre;
    if (sedeLabel && sedeLabel !== "—") return sedeLabel;
    return "—";
  })();
  return (
    <Card className="dc-pbar" style={{ padding: "14px 18px", marginBottom: 16, position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {/* La misma imagen que en la ficha: foto si la hay, y si no la silueta que
            corresponde por edad y genero. Reconocer al paciente de un vistazo evita
            trabajar sobre la ficha equivocada al cambiar de uno a otro. */}
        <AvatarPaciente nombre={p.nombre} fotoUrl={p.fotoUrl} genero={p.genero} pediatrico={esPediatrico(p.nacimiento || p.fechaNacimiento)} size={64} radio={20} />
        <div style={{ flex: 1, minWidth: 220 }}>
          {modulo && <div style={{ fontSize: 12, color: "var(--dc-ink-500)", fontWeight: 500, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{modulo}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Select width={230} ariaLabel="Paciente"
                    value={(pacienteId == null || (typeof pacienteId === "number" && Number.isNaN(pacienteId))) ? "" : pacienteId}
                    onChange={(v) => setPacienteId(/^\d+$/.test(String(v)) ? Number(v) : v)}
                    options={pacientes.map((x) => ({ value: x.id, label: x.nombre }))} />
            <span className="dc-chip" style={{ ...chip, color: "var(--dc-ink-700)", background: "var(--dc-bg)" }}>DNI {p.dni}</span>
            <span className="dc-chip" style={{ ...chip, color: DS.c.primary, background: "var(--dc-accent-soft)", border: "1px solid var(--dc-sky)" }}><MapPin size={11} strokeWidth={1.75} /> {sedeTxt}</span>
            {p.ultima && <span className="dc-chip" style={{ ...chip, color: "var(--dc-ink-400)", background: "var(--dc-bg)" }}><Clock size={11} strokeWidth={1.75} /> Última visita {/^\d{4}-\d{2}-\d{2}/.test(String(p.ultima)) ? fechaLegible(String(p.ultima).slice(0, 10)) : p.ultima}</span>}
            {alergias.length > 0
              ? <span className="dc-chip is-alerta" style={{ ...chip, color: "var(--dc-danger-700)", background: "var(--dc-bg)", border: "1px solid var(--dc-fee)" }}><AlertTriangle size={11} strokeWidth={1.75} /> {alergias.join(", ")}</span>
              : <span className="dc-chip" style={{ ...chip, color: "var(--dc-ink-500)", background: "var(--dc-bg)" }}>Sin alergias</span>}
          </div>
        </div>
        {extra && <div className="dc-pbar__extra">{extra}</div>}
        {accion && <div style={{ flexShrink: 0 }}>{accion}</div>}
      </div>
    </Card>
  );
};

/* ===========================================================================
   LOGIN / REGISTRO
   =========================================================================== */

/* Movidos desde App.jsx: los usan varios módulos (agenda, disponibilidad, configuración). */
export const DIAS_SEM = [{ v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mié" }, { v: 4, l: "Jue" }, { v: 5, l: "Vie" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" }];
/* ── Horario de atención de la clínica ──────────────────────────────────────
   Se configura en Configuración › Horario de atención y manda sobre la agenda, la
   capacidad del día y la disponibilidad del doctor. Las claves son las de
   Date.getDay(): "0" domingo … "6" sábado, igual que en la pantalla que lo edita.

   El doctor NO define en qué días trabaja la clínica: ajusta sus horas y bloqueos
   dentro de lo que la clínica abre. Por eso esto vive aquí y no en su módulo. */
export const HORARIO_DEF = {
  "1": { abre: "09:00", cierra: "19:00" }, "2": { abre: "09:00", cierra: "19:00" },
  "3": { abre: "09:00", cierra: "19:00" }, "4": { abre: "09:00", cierra: "19:00" },
  "5": { abre: "09:00", cierra: "19:00" }, "6": { abre: "09:00", cierra: "13:00" },
  "0": { cerrado: true },
};

/**
 * Horario efectivo de una sede: el suyo si lo tiene, y si no el general de la clínica.
 * La sede solo declara los días que cambia; el resto los hereda.
 */
export function horarioDeSede(horario, sedeId) {
  const base = horario || {};
  const propio = (sedeId != null && sedeId !== "all" && base.sedes) ? base.sedes[String(sedeId)] : null;
  return propio ? { ...base, ...propio } : base;
}

/** ¿Tiene esta sede un horario propio, distinto del general? */
export const sedeConHorarioPropio = (horario, sedeId) =>
  !!(horario && horario.sedes && sedeId != null && horario.sedes[String(sedeId)]);

/**
 * Días que abre al menos una de las sedes indicadas. Un doctor que atiende en dos
 * locales puede ofrecer los días que abra cualquiera de los dos.
 */
export function diasAbiertosDe(horario, sedes) {
  const lista = Array.isArray(sedes) && sedes.length ? sedes : [null];
  const abiertos = new Set();
  for (const sid of lista) {
    const h = horarioDeSede(horario, sid);
    for (let d = 0; d <= 6; d++) if (abreDiaSemana(h, d)) abiertos.add(d);
  }
  return abiertos;
}

/** Jornada de un día concreto: el feriado manda sobre el horario semanal. */
export function jornadaClinica(horario, feriados, fechaISO) {
  const exc = (feriados || []).find((x) => x && x.fecha === fechaISO);
  if (exc) return exc.cerrado ? { abierta: false, feriado: true, nota: exc.nota || "" }
    : { abierta: true, abre: exc.abre || "09:00", cierra: exc.cierra || "13:00", feriado: true, nota: exc.nota || "" };
  const k = String(new Date(fechaISO + "T00:00:00").getDay());
  const d = (horario && horario[k]) || HORARIO_DEF[k] || { cerrado: true };
  return d.cerrado ? { abierta: false } : { abierta: true, abre: d.abre || "09:00", cierra: d.cierra || "19:00" };
}

/** ¿Abre ese día de la semana? (0 domingo … 6 sábado) */
export function abreDiaSemana(horario, dow) {
  const d = (horario && horario[String(dow)]) || HORARIO_DEF[String(dow)] || { cerrado: true };
  return !d.cerrado;
}

/** Horas en punto de una jornada: "09:00"–"13:00" → [9, 10, 11, 12]. */
export const horasEntre = (abre, cierra) => {
  const a = parseInt(abre, 10), b = parseInt(cierra, 10);
  const out = [];
  for (let h = a; h < b && out.length < 24; h++) out.push(h);
  return out.length ? out : [9];
};

/** La jornada más amplia de la semana: para rejillas que pintan varios días a la vez. */
export function horasSemana(horario) {
  let ini = 24, fin = 0;
  for (let d = 0; d <= 6; d++) {
    const c = (horario && horario[String(d)]) || HORARIO_DEF[String(d)] || { cerrado: true };
    if (c.cerrado) continue;
    ini = Math.min(ini, parseInt(c.abre || "09:00", 10));
    fin = Math.max(fin, parseInt(c.cierra || "19:00", 10));
  }
  if (ini >= fin) { ini = 9; fin = 19; }
  return horasEntre(String(ini).padStart(2, "0") + ":00", String(fin).padStart(2, "0") + ":00");
}

export const HORAS_SEL = (() => { const a = []; for (let h = 6; h <= 21; h++) for (const m of ["00", "30"]) a.push(`${String(h).padStart(2, "0")}:${m}`); return a; })();
/** Selector de hora. Ahora se apoya en `Select` para que el desplegable sea el mismo
 *  de toda la app (antes era un <select> nativo con la flecha del sistema). */
export const TimeSelect = ({ value, onChange, width = 96 }) => (
  <Select width={width} small value={value} onChange={onChange} ariaLabel="Hora"
          options={HORAS_SEL.map((t) => ({ value: t, label: t }))} />
);


// La animacion del desplegable se inyecta una sola vez: no hay hoja de estilos global
// en la app (los  que existen viven dentro de componentes concretos).
if (typeof document !== "undefined" && !document.getElementById("dc-select-css")) {
  const _s = document.createElement("style");
  _s.id = "dc-select-css";
  _s.textContent = "@keyframes dcSelectIn{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}";
  document.head.appendChild(_s);
}

/* ============================================================================
 * SELECT — desplegable propio
 *
 * Sustituye al <select> nativo. El motivo no es estético sin más: el desplegable
 * de un <select> lo pinta el SISTEMA OPERATIVO y no se puede estilizar por dentro,
 * así que por muchos bordes que se le pongan al cerrado, al abrirlo se rompe la
 * identidad de la app. Este control sí es nuestro de arriba a abajo.
 *
 * API pensada para sustituir selects existentes casi 1:1:
 *   <Select value={v} onChange={(nuevoValor) => ...} options={[...]} />
 * `options` admite strings sueltos o { value, label, sub, icon, disabled }.
 * OJO: onChange recibe el VALOR, no el evento (el nativo daba e.target.value).
 *
 * Accesible: se abre con Enter/Espacio/flechas, se navega con ↑↓ (y Inicio/Fin),
 * Escape cierra, Tab y el clic fuera también. Si no cabe debajo, abre hacia arriba.
 * ========================================================================== */
export function Select({
  value, onChange, options = [], placeholder = "Selecciona…",
  disabled = false, width, small = false, ariaLabel,
}) {
  const [abierto, setAbierto] = useState(false);
  const [marcado, setMarcado] = useState(-1);
  const [haciaArriba, setHaciaArriba] = useState(false);
  // Al sustituir el <select> nativo por este se perdio poder ESCRIBIR para buscar,
  // que es como se usa una lista larga (pacientes, doctores) sin tocar el raton.
  // Con pocas opciones se salta a la que empieza por lo tecleado, como hacia el
  // nativo; con muchas aparece ademas una caja para filtrar.
  const [filtro, setFiltro] = useState("");
  const buscaRef = useRef(null);
  const tecleo = useRef({ txt: "", t: 0 });
  const cajaRef = useRef(null);
  const listaRef = useRef(null);

  const todos = options.map((o) => (typeof o === "object" && o !== null ? o : { value: o, label: String(o) }));
  const CON_BUSCADOR = 8;                       // a partir de aqui compensa filtrar
  const buscador = todos.length > CON_BUSCADOR;
  const norm = (x) => String(x ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const items = (buscador && filtro.trim())
    ? todos.filter((o) => norm(o.label).includes(norm(filtro)) || norm(o.sub).includes(norm(filtro)))
    : todos;
  const indiceActual = items.findIndex((o) => String(o.value) === String(value));
  // El elegido se busca entre TODOS: si esta filtrado fuera, la caja debe seguir
  // mostrando lo que hay seleccionado y no quedarse en blanco.
  const elegido = todos.find((o) => String(o.value) === String(value)) || null;

  // Cerrar al hacer clic/tap fuera (mousedown + pointerdown: iOS no siempre dispara mousedown).
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => { if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("pointerdown", fuera);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("pointerdown", fuera);
    };
  }, [abierto]);

  // Abrir hacia arriba si no hay sitio debajo (evita que el panel quede fuera de pantalla).
  const abrir = () => {
    if (disabled) return;
    const r = cajaRef.current?.getBoundingClientRect();
    if (r) setHaciaArriba(window.innerHeight - r.bottom < Math.min(280, items.length * 38 + 16) && r.top > 280);
    setMarcado(indiceActual >= 0 ? indiceActual : 0);
    setFiltro("");
    setAbierto(true);
    if (buscador) setTimeout(() => buscaRef.current?.focus(), 0);
  };

  const elegir = (o) => { if (o.disabled) return; onChange?.(o.value); setAbierto(false); setFiltro(""); cajaRef.current?.querySelector("button")?.focus(); };

  const mover = (paso) => {
    if (!items.length) return;
    let i = marcado;
    for (let n = 0; n < items.length; n++) {           // salta las deshabilitadas
      i = (i + paso + items.length) % items.length;
      if (!items[i].disabled) break;
    }
    setMarcado(i);
    listaRef.current?.children[i]?.scrollIntoView({ block: "nearest" });
  };

  const teclado = (e) => {
    if (disabled) return;
    if (!abierto) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setAbierto(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); mover(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); mover(-1); }
    else if (e.key === "Home") { e.preventDefault(); setMarcado(0); }
    else if (e.key === "End") { e.preventDefault(); setMarcado(items.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (items[marcado]) elegir(items[marcado]); }
    else if (e.key === "Tab") setAbierto(false);
    else if (!buscador && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Salto por escritura: las teclas seguidas dentro de un segundo se acumulan,
      // asi "ma" busca "Mateo" y no se queda en la primera que empiece por "m".
      const ahora = e.timeStamp;
      const acc = (ahora - tecleo.current.t < 1000 ? tecleo.current.txt : "") + e.key;
      tecleo.current = { txt: acc, t: ahora };
      const i = items.findIndex((o) => !o.disabled && norm(o.label).startsWith(norm(acc)));
      if (i >= 0) { setMarcado(i); listaRef.current?.children[i]?.scrollIntoView({ block: "nearest" }); }
    }
  };

  const alto = small ? "8px 30px 8px 11px" : "10px 34px 10px 13px";
  return (
    <div ref={cajaRef} style={{ position: "relative", width: width || "100%", display: "inline-block", zIndex: abierto ? 200 : undefined }}>
      <button
        type="button" disabled={disabled} onClick={() => (abierto ? setAbierto(false) : abrir())} onKeyDown={teclado}
        aria-haspopup="listbox" aria-expanded={abierto} aria-label={ariaLabel}
        style={{
          width: "100%", textAlign: "left", padding: alto, borderRadius: DS.r.item,
          border: `1px solid ${abierto ? DS.c.primary : DS.c.line}`,
          background: disabled ? "var(--dc-white)" : "var(--dc-white)",
          color: elegido ? "var(--dc-ink-900)" : DS.c.faint,
          fontSize: small ? 13 : 14, fontWeight: 500, fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer", position: "relative",
          boxShadow: abierto ? `0 0 0 3px ${DS.c.primarySoft}` : "none",
          transition: `border-color ${DS.motion.fast}, box-shadow ${DS.motion.fast}`,
          display: "flex", alignItems: "center", gap: 8, overflow: "hidden",
        }}>
        {elegido?.icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{elegido.icon}</span>}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {elegido ? elegido.label : placeholder}
        </span>
        <ChevronDown size={15} strokeWidth={2}
          style={{ position: "absolute", right: 11, color: DS.c.muted, pointerEvents: "none",
                   transform: abierto ? "rotate(180deg)" : "none", transition: `transform ${DS.motion.fast}` }} />
      </button>

      {abierto && (
        <div role="listbox" ref={listaRef} onKeyDown={teclado} tabIndex={-1}
          style={{
            position: "absolute", zIndex: 200, left: 0, right: 0,
            [haciaArriba ? "bottom" : "top"]: "calc(100% + 6px)",
            background: "var(--dc-white)", border: `1px solid ${DS.c.line}`, borderRadius: DS.r.sub,
            boxShadow: DS.sh.md, padding: 5, maxHeight: 280, overflowY: "auto",
            animation: "dcSelectIn .14s ease",
          }}>
          {buscador && (
            <div style={{ position: "sticky", top: -5, background: "var(--dc-white)", padding: "1px 1px 6px", zIndex: 1 }}>
              <input ref={buscaRef} value={filtro} onChange={(e) => { setFiltro(e.target.value); setMarcado(0); }}
                onKeyDown={(e) => {
                  // Las flechas y Enter siguen manejando la lista aunque el foco
                  // este en la caja: escribir y elegir sin soltar el teclado.
                  if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Home", "End"].includes(e.key)) teclado(e);
                }}
                placeholder="Buscar…" aria-label="Buscar en la lista"
                style={{ width: "100%", padding: "8px 11px", borderRadius: DS.r.item - 4, border: `1px solid ${DS.c.line}`,
                         fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "var(--dc-white)" }} />
            </div>
          )}
          {items.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 13, color: DS.c.faint }}>
              {filtro.trim() ? `Nada coincide con “${filtro.trim()}”` : "Sin opciones"}
            </div>
          )}
          {items.map((o, i) => {
            const sel = String(o.value) === String(value);
            const activo = i === marcado;
            return (
              <div key={`${o.value}-${i}`} role="option" aria-selected={sel}
                onMouseEnter={() => setMarcado(i)}
                onPointerDown={(e) => { if (o.disabled) return; e.preventDefault(); elegir(o); }}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 11px",
                  borderRadius: DS.r.item - 4, cursor: o.disabled ? "not-allowed" : "pointer",
                  touchAction: "manipulation",
                  background: sel ? DS.c.primarySoft : activo && !o.disabled ? "var(--dc-white)" : "transparent",
                  color: o.disabled ? DS.c.faint : sel ? DS.c.primary : DS.c.text,
                  fontSize: 13, fontWeight: sel ? 700 : 600,
                  opacity: o.disabled ? 0.6 : 1,
                }}>
                {o.icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{o.icon}</span>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
                  {o.sub && <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: DS.c.faint }}>{o.sub}</span>}
                </span>
                {sel && <Check size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
