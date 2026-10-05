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
import { abrirDocumento, datosImpresion } from "./util/membrete";
import { estadoInfo, ESTADOS } from "./compartido/estados.js";
import { registrarSedes, sedesRegistradas, hayRegistroSedes, idxDeUuid } from "./compartido/sedesRegistro";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {Printer, AlertTriangle, ArrowUpDown, ArrowUpRight, Briefcase, Check, ChevronDown, ChevronUp, Clock, Globe, Info, MapPin, Menu, Plus, Repeat, Search, Server, Settings, ShieldCheck, Smile, Stethoscope, UserCheck, UserCog, X, MoreHorizontal, LayoutGrid, Table2, Download, FileSpreadsheet, FileText} from "lucide-react";

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
    if (mod === "facturacion") return ["ver", "crear"];      // abre caja, cobra y registra egresos; anular es de aprobar
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
export const VISTA_ALIAS = { agenda_cal: "agenda", agenda_consolidado: "agenda", recall_hist: "recall", recall_sat: "recall", reportes_aus: "reportes", inventario_compras: "inventario", inventario_consumo: "inventario", inventario_prov: "inventario", caja_apertura: "facturacion", caja_cierre: "facturacion", caja_historial: "facturacion", caja_movimientos: "facturacion", caja_links: "facturacion", caja_sunat: "facturacion", caja: "facturacion", satisfaccion: "resenas", reportes_ocs: "reportes", reportes_mas: "reportes", comisiones: "reportes", periodontograma: "perio", fotos: "radiografias" };
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
/* Con sesión, SEDES y SEDE_IDS pasan a ser las sedes reales del servidor (GET /sedes), con
   el número corto que les da el registro. Se reescriben en su lugar para que todo lo que ya
   los importa (nombreSede, normSedes("all"), selectores) vea las sedes reales. */
const volcarRegistro = () => {
  const r = sedesRegistradas();
  if (!r.length) return;
  SEDES.splice(0, SEDES.length, ...r.map((x) => ({ id: x.n, uuid: x.uuid, nombre: x.nombre, dir: x.direccion || "" })));
  SEDE_IDS.splice(0, SEDE_IDS.length, ...SEDES.map((x) => x.id));
};
volcarRegistro();
export function aplicarSedesApi(lista) { registrarSedes(lista); volcarRegistro(); return SEDES; }
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
  return SEDES.find((s) => String(s.id) === String(id) || (s.uuid && String(s.uuid).toLowerCase() === String(id).toLowerCase()))?.nombre || "—";
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
  // CFG-02: un doctor = un usuario. El Dr. Miguel Flores atendía sin usuario propio.
  { id: 14, nombre: "Dr. Miguel Flores", user: "mflores", email: "miguel@sonrie.pe", rol: "medico", sedes: [2], activo: true, ultimo: "Ayer" },
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
  { id: 1, nombre: "Clínica Dental Sonríe+", ruc: "20123456789", plan: "mediana", sedes: 2, usuarios: 14, pacientes: 24, estado: "activa", mrr: 498, ultimo: "Hace 5 min" },
  { id: 2, nombre: "OdontoSalud Perú", ruc: "20456789012", plan: "mediana", sedes: 1, usuarios: 6, pacientes: 312, estado: "activa", mrr: 349, ultimo: "Hace 1 h" },
  { id: 3, nombre: "Dental Sur EIRL", ruc: "20567890123", plan: "pequena", sedes: 1, usuarios: 3, pacientes: 88, estado: "trial", mrr: 0, ultimo: "Hace 2 h" },
  { id: 4, nombre: "Sonrisa Perfecta", ruc: "20678901234", plan: "grande", sedes: 3, usuarios: 19, pacientes: 540, estado: "activa", mrr: 699, ultimo: "Ayer" },
  { id: 5, nombre: "Clínica Mlilenium Dental", ruc: "20789012345", plan: "mediana", sedes: 2, usuarios: 9, pacientes: 271, estado: "activa", mrr: 498, ultimo: "Hace 3 h" },
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
  { id: 1, nombre: "Dra. Carla Mendoza", cop: "24493", esp: 1, esps: [1, 4], sede: 1, sedes: [1, 2], foto: "CM", color: NAVY, meta: 12000, prodDemo: 9200, citasDemo: 58, comision: 40 },
  { id: 2, nombre: "Dr. Luis Paredes", cop: "18762", esp: 2, esps: [2], sede: 1, sedes: [1], foto: "LP", color: "var(--dc-brand-mid)", meta: 10000, prodDemo: 7800, citasDemo: 49, comision: 35 },
  { id: 3, nombre: "Dra. Ana Quispe", cop: "31045", esp: 3, esps: [3], sede: 2, sedes: [2], foto: "AQ", color: DS.c.primary, meta: 8500, prodDemo: 6400, citasDemo: 41, comision: 40 },
  { id: 4, nombre: "Dra. Sofía Torres", cop: "27318", esp: 5, esps: [5], sede: 2, sedes: [2], foto: "ST", color: DS.c.accent, meta: 7000, prodDemo: 5100, citasDemo: 33, comision: 30 },
  { id: 5, nombre: "Dr. Jorge Ramos", cop: "15984", esp: 4, esps: [4], sede: 1, sedes: [1, 2], foto: "JR", color: "var(--dc-info-ink)", meta: 6000, prodDemo: 4200, citasDemo: 28, comision: 35 },
  { id: 6, nombre: "Dr. Miguel Flores", cop: "33620", esp: 1, esps: [1], sede: 2, sedes: [2], foto: "MF", color: "var(--dc-brand-600)", meta: 5000, prodDemo: 3500, citasDemo: 22, comision: 30 },
];
// Meta y % de comisión editados en Configuración › Doctores (demostración).
try { const o = JSON.parse(localStorage.getItem("dc_data_v1_medicos_cfg") || "{}"); MEDICOS.forEach((m) => { if (o[m.id]) Object.assign(m, o[m.id]); }); } catch (e) { /* sin almacenamiento */ }
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
// SAT-01: reseñas públicas (1–5). Una sola lista: la lee Satisfacción y reseñas y
// Mi producción (las que mencionan al doctor). Cada reseña es de un local (sede): la
// de Google es la ficha de esa sede y la del portal, la sede donde se atendió.
export const RESENAS_SEED = [
  { id: 1, nombre: "Lucía V.", estrellas: 5, fecha: addDays(-1), texto: "Excelente atención, la Dra. Mendoza muy amable y el local impecable.", resp: "", medicoId: 1, origen: "google", sede: 2 },
  { id: 2, nombre: "Andrés P.", estrellas: 5, fecha: addDays(-3), texto: "Me agendaron por WhatsApp en segundos, todo súper rápido.", resp: "¡Gracias Andrés! Te esperamos en tu control.", origen: "google", sede: 1 },
  { id: 3, nombre: "María C.", estrellas: 4, fecha: addDays(-6), texto: "Buen servicio, solo esperé un poco más de lo previsto.", resp: "", origen: "portal", sede: 2 },
  { id: 4, nombre: "Diego C.", estrellas: 5, fecha: addDays(-9), texto: "Precios claros y me explicaron todo el tratamiento. Recomendado.", resp: "", medicoId: 1, origen: "google", sede: 1 },
  { id: 5, nombre: "Rosa L.", estrellas: 5, fecha: addDays(-12), texto: "El portal para ver mis pagos y citas es muy práctico.", resp: "", origen: "portal", sede: 2 },
];
export const fmtHoy = () => fmt(hoyAhora());

/* ── Exportación (Excel real .xlsx + PDF) ──
   columnas: [{ key, label, w? }]  –  filas: array de objetos por key.
   Excel: SheetJS por import dinámico (no engorda el bundle; se carga solo al exportar). */
export async function exportarExcel({ nombreArchivo, hoja = "Datos", titulo, subtitulo = "", columnas, filas }) {
  const archivo = nombreArchivo.endsWith(".xlsx") ? nombreArchivo : nombreArchivo + ".xlsx";
  try {
    await exportarExcelMembrete({ archivo, hoja, titulo, subtitulo, columnas, filas });
  } catch (e) {
    // Respaldo sin formato si la librería con estilos no carga.
    const XLSX = await import("xlsx");
    const aoa = [];
    if (titulo) { aoa.push([titulo]); aoa.push([]); }
    aoa.push(columnas.map((c) => c.label));
    for (const r of filas) aoa.push(columnas.map((c) => r[c.key] ?? ""));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = columnas.map((c) => ({ wch: c.w || 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (hoja || "Datos").slice(0, 31));
    XLSX.writeFile(wb, archivo);
  }
}
/* Excel con el membrete de la clínica: logo, nombre, razón social y RUC, datos de la
   sede que emite, título del reporte, cabecera con el color de la marca, filas
   alternadas, filtros, cabecera fija y pie con la fecha de emisión. */
async function exportarExcelMembrete({ archivo, hoja, titulo, subtitulo, columnas, filas }) {
  const ExcelJS = (await import("exceljs")).default;
  const { empresa: e = {}, sede: s = {} } = datosImpresion() || {};
  const wb = new ExcelJS.Workbook();
  wb.creator = e.nombre || "Dento Check"; wb.created = new Date();
  const n = Math.max(columnas.length, 4);
  const ws = wb.addWorksheet((hoja || "Datos").replace(/[\\/?*[\]:]/g, " ").slice(0, 31), {
    pageSetup: { paperSize: 9, orientation: columnas.length > 6 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 } },
    views: [{ showGridLines: false }],
  });
  const MARCA = "FF0B6C78", TINTA = "FF12313A", GRIS = "FF667085", LINEA = "FFD9E3E6", ZEBRA = "FFF3F8F9";
  ws.columns = columnas.map((c) => ({ width: Math.max(10, Math.min(48, c.w || 18)) }));
  // Logo (PNG o JPG) en la esquina; si no hay o es SVG, va el nombre en grande.
  let conLogo = false;
  if (e.logo) {
    try {
      const resp = await fetch(e.logo); const blob = await resp.blob();
      const ext = /png/i.test(blob.type) ? "png" : /jpe?g/i.test(blob.type) ? "jpeg" : null;
      if (ext) {
        const buf = await blob.arrayBuffer();
        const id = wb.addImage({ buffer: buf, extension: ext });
        const dim = await new Promise((ok) => { const im = new Image(); im.onload = () => ok([im.naturalWidth, im.naturalHeight]); im.onerror = () => ok([200, 60]); im.src = URL.createObjectURL(blob); });
        const alto = 54, ancho = Math.min(190, Math.round(alto * dim[0] / Math.max(1, dim[1])));
        ws.addImage(id, { tl: { col: 0.15, row: 0.25 }, ext: { width: ancho, height: alto } });
        conLogo = true;
      }
    } catch { /* sin logo */ }
  }
  const colDatos = conLogo ? Math.min(3, n) : 1;    // los datos de la empresa a la derecha del logo
  const fila = (r, txt, font, alto) => { const c = ws.getCell(r, colDatos); c.value = txt; c.font = font; c.alignment = { vertical: "middle" }; if (n > colDatos) ws.mergeCells(r, colDatos, r, n); if (alto) ws.getRow(r).height = alto; };
  fila(1, e.nombre || "Clínica", { name: "Calibri", size: 16, bold: true, color: { argb: TINTA } }, 22);
  fila(2, [e.razonSocial, e.ruc ? `RUC ${e.ruc}` : ""].filter(Boolean).join("  ·  "), { size: 10, color: { argb: GRIS } });
  fila(3, [s.nombre, s.direccion].filter(Boolean).join("  ·  "), { size: 10, color: { argb: GRIS } });
  fila(4, [s.telefonos, s.correo || e.web].filter(Boolean).join("  ·  "), { size: 10, color: { argb: GRIS } });
  // Línea de la marca bajo el membrete.
  for (let c = 1; c <= n; c++) ws.getCell(5, c).border = { bottom: { style: "medium", color: { argb: MARCA } } };
  ws.getRow(5).height = 6;
  const z = (x) => String(x).padStart(2, "0"); const ah = new Date();
  const cuando = `${z(ah.getDate())}/${z(ah.getMonth() + 1)}/${ah.getFullYear()} ${z(ah.getHours())}:${z(ah.getMinutes())}`;
  ws.getCell(7, 1).value = titulo || hoja || "Reporte";
  ws.getCell(7, 1).font = { size: 14, bold: true, color: { argb: MARCA } };
  ws.mergeCells(7, 1, 7, n);
  ws.getCell(8, 1).value = [subtitulo, `${filas.length} ${filas.length === 1 ? "registro" : "registros"}`, `Emitido ${cuando}`].filter(Boolean).join("  ·  ");
  ws.getCell(8, 1).font = { size: 10, italic: true, color: { argb: GRIS } };
  ws.mergeCells(8, 1, 8, n);
  // Cabecera de la tabla.
  const R0 = 10;
  const cab = ws.getRow(R0);
  columnas.forEach((c, i) => {
    const cell = cab.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10.5 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MARCA } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { top: { style: "thin", color: { argb: MARCA } }, bottom: { style: "thin", color: { argb: MARCA } } };
  });
  cab.height = 22;
  // Números como números (montos con dos decimales) para que se puedan sumar.
  const aNumero = (v) => {
    if (typeof v === "number") return v;
    let t = String(v ?? "").trim();
    // H-20: «− S/ 50» (signo menos tipográfico, a veces separado del monto) también es un
    // número: antes los egresos salían como texto y no se podían sumar.
    let neg = false;
    const sig = t.match(/^[-−–]\s*/);
    if (sig && /\d/.test(t)) { neg = true; t = t.slice(sig[0].length); }
    const mon = t.match(/^(S\/|US\$)\s?/);
    const moneda = mon ? mon[1] : null;
    let cuerpo = mon ? t.slice(mon[0].length) : t;
    const sig2 = cuerpo.match(/^[-−–]\s*/);
    if (sig2) { neg = !neg; cuerpo = cuerpo.slice(sig2[0].length); }
    if (/^[\d,]+(\.\d+)?%?$/.test(cuerpo) && !/^0\d/.test(cuerpo)) {
      const num = Number(cuerpo.replace(/,/g, "").replace(/%$/, ""));
      // DNI, teléfonos y códigos (enteros largos sin formato) se quedan como texto.
      const plano = !neg && !moneda && /^\d+$/.test(cuerpo);
      if (Number.isFinite(num) && cuerpo.replace(/[^\d]/g, "").length < 12 && !(plano && cuerpo.length > 6)) return { num: neg ? -num : num, moneda, pct: /%$/.test(cuerpo), dec: /\.\d/.test(cuerpo) };
    }
    return null;
  };
  filas.forEach((r, k) => {
    const row = ws.getRow(R0 + 1 + k);
    columnas.forEach((c, i) => {
      const raw = r[c.key];
      const cell = row.getCell(i + 1);
      const nv = aNumero(raw);
      if (nv && typeof nv === "object") {
        cell.value = nv.pct ? nv.num / 100 : nv.num;
        cell.numFmt = nv.pct ? "0%" : nv.moneda ? `"${nv.moneda} "#,##0.00` : nv.dec ? "#,##0.00" : "0";
        cell.alignment = { horizontal: "right", vertical: "top" };
      } else if (typeof nv === "number") {
        cell.value = nv; cell.numFmt = Number.isInteger(nv) ? "0" : "#,##0.00"; cell.alignment = { horizontal: "right", vertical: "top" };
      } else {
        cell.value = raw == null ? "" : String(raw);
        cell.alignment = { vertical: "top", wrapText: String(raw ?? "").length > 40 };
      }
      cell.font = { size: 10, color: { argb: TINTA } };
      if (k % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      cell.border = { bottom: { style: "hair", color: { argb: LINEA } } };
    });
  });
  if (filas.length) ws.autoFilter = { from: { row: R0, column: 1 }, to: { row: R0, column: columnas.length } };
  ws.views = [{ state: "frozen", ySplit: R0, showGridLines: false }];
  const pie = R0 + filas.length + 2;
  ws.getCell(pie, 1).value = `${[e.razonSocial || e.nombre, e.ruc ? `RUC ${e.ruc}` : ""].filter(Boolean).join(" · ")} — Generado con Dento Check el ${cuando}`;
  ws.getCell(pie, 1).font = { size: 9, color: { argb: GRIS } };
  ws.mergeCells(pie, 1, pie, n);
  ws.headerFooter.oddFooter = `&L&8${(e.nombre || "").replace(/&/g, "&&")}&R&8Página &P de &N`;
  ws.pageSetup.printTitlesRow = `${R0}:${R0}`;
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a"); a.href = url; a.download = archivo; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
/* Botón «Exportar» de tablas y listas: Excel o PDF, ambos con el membrete de la
   clínica. Exporta lo que se está viendo (con los filtros y el orden aplicados). */
export function BotonExportar({ titulo, cols, filas, sub = "registros" }) {
  const [abierto, setAbierto] = useState(false);
  const usables = (cols || []).filter((c) => (c.get || c.cell || c.exportar) && c.label && typeof c.label === "string" && c.key !== "acc" && !c.noExport);
  if (!usables.length) return null;
  const columnas = usables.map((c) => ({ key: c.key, label: c.label, w: Math.max(10, Math.min(40, String(c.label).length + 8)) }));
  // Se exporta lo que se ve en la celda (no el valor interno de orden o búsqueda).
  const datos = async () => {
    let aTexto = null;
    if (usables.some((c) => c.cell && !c.exportar)) {
      try {
        const { renderToStaticMarkup } = await import("react-dom/server");
        const tmp = document.createElement("div");
        aTexto = (el) => {
          tmp.innerHTML = renderToStaticMarkup(<>{el}</>).replace(/<small/g, "<i>·</i><small").replace(/<[^>]+>/g, (t) => ` ${t} `);
          // Fuera avatares con iniciales, íconos y adornos: solo el dato.
          tmp.querySelectorAll("svg, [aria-hidden=true]").forEach((x) => x.remove());
          tmp.querySelectorAll("*").forEach((x) => { const t = x.textContent.trim(); if (!x.children.length && /^[A-ZÁÉÍÓÚÑ]{1,3}$/.test(t) && /radius|__av|avatar/i.test(`${x.getAttribute("style") || ""} ${x.className || ""}`)) x.remove(); });
          return tmp.textContent.replace(/\s+/g, " ").replace(/^(· )+|( ·)+$/g, "").replace(/(· ){2,}/g, "· ").trim();
        };
      } catch { aTexto = null; }
    }
    const valor = (c, r) => {
      try {
        if (c.exportar) return c.exportar(r) ?? "";
        if (c.cell && aTexto) { const t = aTexto(c.cell(r)); if (t || !c.get) return t; }
        const v = c.get ? c.get(r) : ""; return v == null || typeof v === "object" ? "" : v;
      } catch { try { const v = c.get ? c.get(r) : ""; return v == null || typeof v === "object" ? "" : v; } catch { return ""; } }
    };
    const rows = (filas || []).map((r) => Object.fromEntries(usables.map((c) => [c.key, valor(c, r)])));
    // Ancho de columna según el contenido.
    columnas.forEach((col) => { const largo = Math.max(String(col.label).length, ...rows.slice(0, 200).map((r) => String(r[col.key] ?? "").length)); col.w = Math.max(10, Math.min(48, largo + 3)); });
    return rows;
  };
  const nombre = String(titulo || sub || "reporte").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  // H-17: fecha local del nombre del archivo (toISOString es UTC: de noche ponía la de mañana).
  const fecha = fmt(new Date());
  const excel = async () => { setAbierto(false); await exportarExcel({ nombreArchivo: `${nombre}_${fecha}.xlsx`, hoja: titulo || "Datos", titulo, subtitulo: "", columnas, filas: await datos() }); };
  const pdf = async () => { setAbierto(false); const filasPdf = await datos(); exportarPDF({ titulo, subtitulo: `${(filas || []).length} ${sub}`, columnas, filas: filasPdf }); };
  return (
    <div className="dc-exp">
      <button type="button" className="dc-exp__btn" onClick={() => setAbierto((v) => !v)} aria-haspopup="menu" aria-expanded={abierto} title="Exportar lo que se ve, con el membrete de la clínica"><Download size={14} strokeWidth={2} /> <span>Exportar</span></button>
      {abierto && <>
        <div className="dc-exp__velo" onClick={() => setAbierto(false)} />
        <div className="dc-exp__menu" role="menu">
          <small>{(filas || []).length} {sub} · con membrete</small>
          <button type="button" role="menuitem" onClick={excel}><FileSpreadsheet size={16} strokeWidth={1.9} /><span><b>Excel</b><em>Logo, datos de la empresa y filtros</em></span></button>
          <button type="button" role="menuitem" onClick={pdf}><FileText size={16} strokeWidth={1.9} /><span><b>PDF</b><em>Listo para imprimir o enviar</em></span></button>
        </div>
      </>}
    </div>
  );
}
export const escHtml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* PDF bien formateado vía ventana de impresión (Guardar como PDF). Sin dependencias extra.
   Sale con el membrete de la clínica y los datos de la sede activa (util/membrete.js). */
export function exportarPDF({ titulo, subtitulo, columnas, filas }) {
  const th = columnas.map((c) => `<th>${escHtml(c.label)}</th>`).join("");
  const trs = filas.map((r) => `<tr>${columnas.map((c) => `<td>${escHtml(r[c.key] ?? "")}</td>`).join("")}</tr>`).join("");
  return abrirDocumento({
    titulo, sub: subtitulo || "", horizontal: columnas.length > 6,
    cuerpo: `<table class="doc-tabla"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`
      + (filas.length ? "" : `<p class="doc-nota">Sin registros para este filtro.</p>`),
  });
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
    // H-14: los celulares del Perú empiezan con 9 (812345678 no es un celular).
    else if (!/^9/.test(tel.replace(/^51(?=\d{9}$)/, ""))) errors.telefono = "El celular debe empezar con 9 (ej. 999888777).";
  }

  const email = (form.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Email no válido.";

  if (!form.nacimiento) errors.nacimiento = "La fecha de nacimiento es obligatoria.";
  else if (form.nacimiento > hoyISO) errors.nacimiento = "No puede ser una fecha futura.";
  // H-14: edad máxima 120 años (1890 era un error de tipeo y se aceptaba).
  else if (String(form.nacimiento).slice(0, 10) < `${Number(String(hoyISO).slice(0, 4)) - 120}${String(hoyISO).slice(4, 10)}`) errors.nacimiento = "Revisa la fecha: la edad no puede pasar de 120 años.";

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
  // Si el navegador se queda sin espacio, se avisa (antes se perdía el cambio en silencio).
  useEffect(() => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) { try { window.dispatchEvent(new CustomEvent("dc-almacen-lleno", { detail: key })); } catch (e2) { /* sin ventana */ } } }, [K, v]);
  return [v, setV];
}

/** Lee una imagen y la devuelve reducida (lado mayor `max` px, JPEG). Una foto de celular
    de 3–5 MB queda en ~200–400 KB: suficiente para verla y comparar, y cabe al guardarla. */
export function comprimirImagen(file, max = 1600, calidad = 0.82) {
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onerror = rej;
    rd.onload = () => {
      if (!/^image\/(jpeg|png|webp)/.test(file.type || "")) { res(rd.result); return; }
      const img = new Image();
      img.onerror = () => res(rd.result);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const cx = cv.getContext("2d");
        cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        const out = cv.toDataURL("image/jpeg", calidad);
        res(out.length < rd.result.length ? out : rd.result);
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
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
      { id: 1, sede: 1, servicioId: 2, nombre: "Limpieza y profilaxis", costo: 80, estado: "atendida", atendidaEn: "2026-04-10" },
      { id: 2, sede: 1, servicioId: 3, pieza: 16, cara: "O", nombre: "Curación con resina · pieza 16 (O)", costo: 120, estado: "atendida", atendidaEn: "2026-05-12" },
      { id: 3, sede: 2, servicioId: 6, pieza: 26, nombre: "Endodoncia · pieza 26", costo: 350, estado: "terminada", terminadaEn: new Date(new Date().setHours(10, 40, 0, 0)).toISOString() },
      { id: 4, sede: 1, servicioId: 7, pieza: 36, nombre: "Corona · pieza 36", costo: 450, estado: "pendiente" },
    ],
    pagos: [
      { fecha: "2026-04-10", concepto: "Limpieza", monto: 80, metodo: "Yape", sede: 1 },
      { fecha: "2026-05-12", concepto: "Curación pieza 16", monto: 120, metodo: "Tarjeta", sede: 1 },
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
      { id: 1, sede: 1, servicioId: 6, pieza: 47, nombre: "Endodoncia · pieza 47", costo: 350, estado: "atendida", atendidaEn: "2026-04-28" },
      { id: 2, sede: 1, servicioId: 7, pieza: 47, nombre: "Corona · pieza 47", costo: 450, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-04-28", concepto: "Endodoncia pieza 47", monto: 350, metodo: "Tarjeta", sede: 1 }],
    ahorro: 40,
    recetas: [{ fecha: "2026-04-28", texto: "Amoxicilina 500mg c/8h por 7 días" }],
    historia: [{ fecha: "2026-04-28", titulo: "Endodoncia", detalle: "Tratamiento de conducto en molar inferior. Pendiente colocación de corona." }] },
  3: {
    odontograma: { 21: { caras: { center: "caries", top: "caries" } }, 38: { whole: "extraer" } },
    notas: { 38: "Tercera molar incluida, evaluar exodoncia." }, alergias: ["Látex"], antecedentes: [],
    tratamiento: [
      { id: 1, sede: 2, servicioId: 12, nombre: "Control de ortodoncia", costo: 150, estado: "atendida", atendidaEn: "2026-06-01" },
      { id: 2, sede: 1, servicioId: 9, pieza: 38, nombre: "Extracción simple · pieza 38", costo: 120, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-06-01", concepto: "Control ortodoncia", monto: 150, metodo: "Efectivo", sede: 2 }],
    ahorro: 120,
    recetas: [],
    historia: [{ fecha: "2026-06-01", titulo: "Control de ortodoncia", detalle: "Ajuste de brackets. Buena evolución del tratamiento." }] },
  4: {
    odontograma: { 16: { caras: { center: "caries" } }, 36: { whole: "corona" } },
    notas: { 16: "Caries inicial, control en próxima visita." }, alergias: [], antecedentes: [],
    tratamiento: [
      { id: 1, sede: 2, servicioId: 5, nombre: "Sellantes preventivos", costo: 120, estado: "atendida", atendidaEn: "2026-06-10" },
      { id: 2, sede: 2, servicioId: 3, pieza: 16, cara: "O", nombre: "Curación con resina · pieza 16 (O)", costo: 120, estado: "terminada", terminadaEn: new Date(new Date().setHours(9, 25, 0, 0)).toISOString() },
    ],
    pagos: [{ fecha: "2026-06-10", concepto: "Sellantes preventivos", monto: 120, metodo: "Efectivo", sede: 2 }],
    ahorro: 30, recetas: [],
    historia: [{ fecha: "2026-06-10", titulo: "Control pediátrico", detalle: "Aplicación de sellantes. Buena higiene bucal." }] },
  5: {
    odontograma: { 12: { caras: { center: "obturado" } } },
    notas: {}, alergias: [], antecedentes: [],
    tratamiento: [
      { id: 1, sede: 1, servicioId: 11, nombre: "Instalación de brackets", costo: 1500, estado: "atendida", atendidaEn: "2026-03-01" },
      { id: 2, sede: 1, servicioId: 12, nombre: "Control de ortodoncia", costo: 150, estado: "atendida", atendidaEn: "2026-05-01" },
      { id: 3, sede: 1, servicioId: 12, nombre: "Control de ortodoncia", costo: 150, estado: "pendiente" },
    ],
    pagos: [
      { fecha: "2026-03-01", concepto: "Instalación de brackets", monto: 1500, metodo: "Tarjeta", sede: 1 },
      { fecha: "2026-05-01", concepto: "Control ortodoncia", monto: 150, metodo: "Yape", sede: 1 },
    ],
    ahorro: 200, recetas: [],
    historia: [{ fecha: "2026-06-15", titulo: "Control de ortodoncia", detalle: "Ajuste de arco. Evolución favorable del tratamiento." }] },
  6: {
    odontograma: { 36: { caras: { center: "caries" } }, 46: { whole: "obturado" } },
    notas: {}, alergias: ["Aspirina"], antecedentes: [],
    tratamiento: [
      { id: 1, sede: 1, servicioId: 2, nombre: "Limpieza y profilaxis", costo: 80, estado: "atendida", atendidaEn: "2026-05-30" },
      { id: 2, sede: 1, servicioId: 3, pieza: 36, cara: "O", nombre: "Curación con resina · pieza 36 (O)", costo: 120, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-05-30", concepto: "Profilaxis", monto: 80, metodo: "Plin", sede: 1 }],
    ahorro: 0, recetas: [],
    historia: [{ fecha: "2026-05-30", titulo: "Limpieza dental", detalle: "Profilaxis y diagnóstico de caries en pieza 36." }] },
  7: {
    odontograma: { 26: { whole: "endodoncia" } },
    notas: { 26: "Endodoncia en curso, falta segunda sesión." }, alergias: [], antecedentes: ["Diabetes"],
    tratamiento: [
      { id: 1, sede: 2, servicioId: 6, pieza: 26, nombre: "Endodoncia · pieza 26", costo: 350, estado: "pendiente", etapa: "En curso: falta la 2.ª sesión" },
      { id: 2, sede: 2, servicioId: 7, pieza: 26, nombre: "Corona · pieza 26", costo: 450, estado: "pendiente" },
    ],
    pagos: [{ fecha: "2026-06-05", concepto: "Abono endodoncia pieza 26", monto: 200, metodo: "Tarjeta", sede: 2 }],
    ahorro: 50, recetas: [{ fecha: "2026-06-05", texto: "Ibuprofeno 600mg c/8h por 3 días" }],
    historia: [{ fecha: "2026-06-05", titulo: "Endodoncia", detalle: "Primera sesión de tratamiento de conducto. Sin complicaciones." }] },
  8: {
    odontograma: { 21: { caras: { center: "caries" } } },
    notas: {}, alergias: [], antecedentes: [],
    tratamiento: [{ id: 1, sede: 1, servicioId: 2, nombre: "Limpieza y profilaxis", costo: 80, estado: "atendida", atendidaEn: "2026-03-18" }],
    pagos: [{ fecha: "2026-03-18", concepto: "Limpieza dental", monto: 80, metodo: "Efectivo", sede: 1 }],
    ahorro: 0, recetas: [],
    historia: [{ fecha: "2026-03-18", titulo: "Limpieza dental", detalle: "Profilaxis de rutina. Se detecta caries incipiente en pieza 21." }] },
  9: {
    odontograma: { 11: { caras: { top: "fractura" } } },
    notas: { 11: "Fractura de esmalte, evaluar reconstrucción." }, alergias: ["Penicilina"], antecedentes: [],
    tratamiento: [{ id: 1, sede: 2, servicioId: 4, pieza: 11, cara: "V", nombre: "Reconstrucción estética · pieza 11 (V)", costo: 180, estado: "terminada", terminadaEn: new Date(Date.now() - 35 * 864e5).toISOString() }],
    pagos: [], ahorro: 0, recetas: [],
    historia: [{ fecha: "2026-06-12", titulo: "Evaluación", detalle: "Fractura en incisivo central superior. Se programa reconstrucción estética." }] },
  10: {
    odontograma: { 31: { whole: "obturado" } },
    notas: {}, alergias: [], antecedentes: ["Tabaquismo"],
    tratamiento: [
      { id: 1, sede: 1, servicioId: 13, nombre: "Destartraje (limpieza profunda)", costo: 180, estado: "atendida", atendidaEn: "2026-06-08" },
      { id: 2, sede: 1, servicioId: 14, nombre: "Control periodontal", costo: 120, estado: "terminada", terminadaEn: new Date(Date.now() - 45 * 864e5).toISOString() },
    ],
    pagos: [{ fecha: "2026-06-08", concepto: "Destartraje", monto: 180, metodo: "Yape", sede: 1 }],
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

export const EGRESOS_DEMO = [
  { id: 1, sede: 1, fecha: fmt(hoy), concepto: "Movilidad y mensajería", categoria: "Otros", monto: 35, metodo: "efectivo" },
  { id: 2, sede: 2, fecha: fmt(hoy), concepto: "Resinas y adhesivos", categoria: "Insumos", monto: 320, metodo: "transferencia" },
  { id: 3, sede: 1, fecha: fmt(hoy), concepto: "Laboratorio — corona pieza 36 (Rosa Linares)", categoria: "Laboratorio", monto: 180, metodo: "transferencia", labCasoId: 1 },
  { id: 4, sede: 2, fecha: fmt(hoy), concepto: "Repuesto de micromotor (proveedor en dólares)", categoria: "Equipos", monto: 40, metodo: "efectivo", moneda: "USD" },
  { id: 5, sede: 1, fecha: addDays(-1), concepto: "Campaña Instagram Ads", categoria: "Marketing", monto: 150, metodo: "tarjeta" },
  { id: 6, sede: 2, fecha: addDays(-3), concepto: "Guantes, mascarillas y eyectores", categoria: "Insumos", monto: 410, metodo: "transferencia" },
  { id: 7, sede: 1, fecha: addDays(-5), concepto: "Luz y agua del local", categoria: "Servicios (luz/agua)", monto: 385, metodo: "transferencia" },
  { id: 8, sede: 1, fecha: addDays(-6), concepto: "Alquiler del consultorio", categoria: "Alquiler", monto: 2800, metodo: "transferencia" },
  { id: 9, sede: 2, fecha: addDays(-8), concepto: "Prótesis parcial — laboratorio", categoria: "Laboratorio", monto: 520, metodo: "transferencia" },
  { id: 10, sede: 2, fecha: addDays(-9), concepto: "Compra varios", categoria: "Otros", monto: 260, metodo: "efectivo" },
];

/* Documentos del paciente (consentimientos y formularios): una sola entidad que leen la
   ficha (Archivos › Documentos) y la bandeja de Pendientes de hoy. */
export const DOCUMENTOS_SEED = [
  { id: "c1", clase: "consentimiento", pacienteId: 1, tipo: "Endodoncia · pieza 26", fecha: addDays(-3), estado: "firmado" },
  { id: "c2", clase: "consentimiento", pacienteId: 3, tipo: "Exodoncia · pieza 38", fecha: addDays(-1), estado: "pendiente" },
  { id: "c3", clase: "consentimiento", pacienteId: 5, tipo: "Ortodoncia", fecha: addDays(-5), estado: "firmado" },
  { id: "c4", clase: "consentimiento", pacienteId: 25, tipo: "Odontopediatría (sellantes)", fecha: fmt(hoy), estado: "pendiente" },
  { id: "f1", clase: "formulario", pacienteId: 1, tipo: "Anamnesis / historia médica", fecha: addDays(-2), estado: "completado" },
  { id: "f2", clase: "formulario", pacienteId: 4, tipo: "Ficha de admisión", fecha: addDays(-1), estado: "pendiente" },
  { id: "f3", clase: "formulario", pacienteId: 7, tipo: "Declaración de salud", fecha: addDays(-4), estado: "completado" },
];

/* Casos de laboratorio: paciente, pieza, procedimiento del presupuesto, proveedor y egreso.
   `sede` es la sede que envía el caso (la ve solo esa sede). */
export const LAB_SEED = [
  { id: 1, pacienteId: 1, paciente: "Rosa Linares", sede: 1, pieza: 36, procedimientoId: 4, trabajo: "Corona de porcelana · pieza 36", lab: "Laboratorio Dental Lima", enviado: addDays(-6), entrega: addDays(2), estado: "en_proceso", egresoId: 3 },
  { id: 2, pacienteId: 2, paciente: "Pedro Gómez", sede: 1, pieza: 47, procedimientoId: 2, trabajo: "Corona · pieza 47", lab: "ProDent Lab", enviado: addDays(-9), entrega: addDays(-1), estado: "recibido" },
  { id: 3, pacienteId: 3, paciente: "María Chávez", sede: 2, trabajo: "Férula de descarga", lab: "Laboratorio Dental Lima", enviado: addDays(-7), entrega: addDays(-1), estado: "enviado" },
];

/* Liquidaciones de seguro: Borrador → Enviada → Observada → Aprobada → Pagada.
   `sede`: donde se hizo el tratamiento que se liquida (su total suma solo esa sede). */
export const LIQ_SEED = [
  { id: 1, pid: 2, sede: 1, aseg: "Pacífico EPS", cobPct: 80, estado: "aprobado" },
  { id: 2, pid: 3, sede: 2, aseg: "Rímac Seguros", cobPct: 70, estado: "enviado" },
  { id: 3, pid: 5, sede: 1, aseg: "Mapfre", cobPct: 60, estado: "pagado" },
  { id: 4, pid: 8, sede: 1, aseg: "Pacífico EPS", cobPct: 80, estado: "enviado" },
  { id: 5, pid: 1, sede: 1, aseg: "La Positiva", cobPct: 50, estado: "observado", motivo: "Falta la radiografía periapical de la pieza 26." },
  { id: 6, pid: 6, sede: 1, aseg: "Mapfre", cobPct: 60, estado: "borrador" },
];

// R4: etiquetas y colores salen del catálogo único (compartido/estados.js).
export const ESTADO_BADGE = Object.fromEntries([
  ...Object.keys(ESTADOS.cita).map((k) => ["cita", k]),
  ["procedimiento", "terminada"],
].map(([ent, k]) => { const e = estadoInfo(ent, k); return [k, { l: e.label, bg: `color-mix(in srgb, ${e.color} 12%, transparent)`, fg: e.color }]; }));

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
/* Datos vivos de la demostración (fichas, citas) compartidos con la Ficha médica: lo que
   se registra en Agenda, Caja u Odontograma aparece en la historia y viceversa. Con
   backend conectado cada módulo lee de la API y este contexto no se usa. */
export const DatosDemoCtx = React.createContext(null);

/* Sede que se ve en toda la app. La publica MainApp:
   - sede: lo elegido en el menú ("all" o un id);
   - ids: sedes que se ven ahora (la elegida, o todas las del usuario con "all");
   - mias: todas las sedes del usuario; activa: una sede concreta para registrar;
   - pacientes / citas: ya filtrados por ids (para mostrar; para validar, el total);
   - global: el usuario es de toda la clínica; rol: su rol.
   Sin proveedor (pruebas, portal del paciente) no limita nada. */
export const SedeCtx = React.createContext(null);
/** ¿Puede abrir caja, cobrar y emitir comprobantes? Con varias sedes, el administrador
    general supervisa (ve todas las cajas) y emite cada sede: su administrador o recepción.
    Con una sola sede, el administrador general también opera la caja. */
export function useEmiteCobros(can) {
  const c = React.useContext(SedeCtx);
  const supervisor = c?.rol === "admin" && (c?.mias || []).length > 1;
  return { puede: !supervisor && (can ? can("facturacion", "crear") : true), supervisor };
}
/** Id de sede comparable: en la demo 1/2; con API llega un UUID que el resto del frontend
    ya traduce a 1/2 al iniciar sesión (sedeInt en App.jsx). Misma regla aquí. */
export const sedeNum = (x) => {
  if (x == null || x === "") return null;
  if (/^\d+$/.test(String(x))) return Number(x);
  // Con sesión: el número que el registro dio a ese UUID; uno desconocido no se confunde con otro.
  if (hayRegistroSedes()) return idxDeUuid(x) ?? String(x);
  return String(x).endsWith("a2") ? 2 : 1;   // demostración: UUID de la semilla
};
/** ¿Son la misma sede? Acepta id numérico de la demo o UUID del servidor. */
export const mismaSede = (a, b) => a != null && b != null && (String(a) === String(b) || sedeNum(a) === sedeNum(b));
/** Sede con la que se cotiza a un paciente: la elegida en el menú; con «Todas», la del
    paciente si tiene una sola entre las del usuario; si no, la activa. Devuelve siempre
    el id 1/2, que es la clave de preciosSede en el catálogo. cx = useSede(). */
export function sedeDePrecio(cx, paciente, activa = null) {
  const mias = cx?.mias || SEDE_IDS;
  const aMia = (x) => mias.find((m) => mismaSede(m, x));
  if (cx?.sede != null && cx.sede !== "all") return sedeNum(aMia(cx.sede) ?? cx.sede);
  const delPac = [...new Set(sedesDe(paciente).map(aMia).filter((x) => x != null).map(sedeNum))];
  if (delPac.length === 1) return delPac[0];
  const act = cx?.activa ?? activa;
  return act != null && act !== "all" ? sedeNum(aMia(act) ?? act) : (delPac[0] ?? sedeNum(mias[0]));
}
export function useSede() {
  const c = React.useContext(SedeCtx);
  const ver = c?.ids || null;
  const mias = c?.mias || null;
  return {
    sede: c?.sede ?? "all", ids: c?.ids ?? null, mias: c?.mias ?? null, activa: c?.activa ?? null,
    pacientes: c?.pacientes ?? null, citas: c?.citas ?? null,
    /** true = el usuario es de toda la clínica (sedes "all"); false = solo algunas sedes. */
    global: c ? c.global !== false : true, rol: c?.rol ?? null, nombre: c?.nombre ?? null,
    /** ¿Alguna de estas sedes se ve con el filtro actual? (sin sede = sí) */
    enSede: (x) => { const l = [].concat(x ?? []).filter((v) => v != null && v !== ""); return !ver || !l.length || l.some((v) => ver.some((w) => mismaSede(v, w))); },
    /** ¿La sede es del usuario (aunque el filtro muestre otra)? */
    esMia: (x) => x == null || !mias || mias.some((w) => mismaSede(x, w)),
  };
}

/* Todos los modales llevan la cabecera de la marca; el `tone` sólo distingue los que
   avisan de algo (peligro, advertencia, éxito) en el ícono y en una línea de color. */
function tonoModal(t) {
  const x = String(t || "").toLowerCase();
  if (t === RED || /red|danger|coral|#d0563f|#b42318|#e5484d/.test(x)) return "peligro";
  if (/warn|amber|#d97706/.test(x)) return "aviso";
  if (/ok|success|#16a36a/.test(x)) return "ok";
  return "marca";
}
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
      // Un desplegable abierto dentro del modal consume su Escape (preventDefault): solo se cierra él.
      if (e.key === "Escape") { if (e.defaultPrevented) return; e.stopPropagation(); onClose?.(); return; }
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
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="dc-modal-title" tabIndex={-1} className="dc-modal" data-tono={tonoModal(tone)} onClick={(e) => e.stopPropagation()} style={{ background: "var(--dc-white)", width: `min(${widthPx}px,96vw)`, maxHeight: "min(680px, 88vh)", borderRadius: "var(--dc-r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(15, 35, 42, 0.4), 0 0 0 1px rgba(15, 35, 42, 0.05)", animation: "dcModalSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards", transform: "translateZ(0)", outline: "none" }}>
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

/* Filtro por columna y orden, el mismo de la tabla de Pacientes, para cualquier lista.
   cols: [{ key, label, get:(r)=>texto, sortVal?:(r)=>valor, noFilter, noSort }]
   Devuelve la lista filtrada y ordenada y el estado que usa <FiltroCabecera>. */
export function useFiltroTabla(rows, cols, defaultSort) {
  const [sortCol, setSortCol] = useState(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState(defaultSort?.dir ?? "asc");
  const [colFilters, setColFilters] = useState({});
  const [activeCol, setActiveCol] = useState(null);
  // Búsqueda única sobre todas las columnas (listas); las tablas siguen con filtro por columna.
  const [q, setQ] = useState("");
  const toggleSort = (key) => { setActiveCol(null); if (sortCol !== key) { setSortCol(key); setSortDir("asc"); } else if (sortDir === "asc") setSortDir("desc"); else setSortCol(null); };
  const anyF = Object.values(colFilters).some((v) => v && v.trim()) || !!q.trim();
  const lista = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base = (rows || []).filter((r) => cols.every((c) => { if (c.noFilter || !c.get) return true; const f = (colFilters[c.key] || "").trim().toLowerCase(); return !f || String(c.get(r) ?? "").toLowerCase().includes(f); })
      && (!qq || cols.some((c) => !c.noFilter && c.get && String(c.get(r) ?? "").toLowerCase().includes(qq))));
    const sc = cols.find((c) => c.key === sortCol && (c.sortVal || c.get));
    if (!sc) return base;
    const val = sc.sortVal || sc.get;
    return [...base].sort((a, b) => {
      const x = val(a), y = val(b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "es", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? r : -r;
    });
  }, [rows, cols, colFilters, sortCol, sortDir, q]);
  const limpiar = () => { setColFilters({}); setActiveCol(null); setQ(""); };
  return { lista, anyF, limpiar, st: { cols, sortCol, sortDir, setSortCol, setSortDir, colFilters, setColFilters, activeCol, setActiveCol, toggleSort, q, setQ } };
}
/* Encabezado de columna que ordena: se usa en las tablas propias de cada módulo para
   que el orden viva en la tabla, no en una barra aparte. */
export function ThOrden({ st, k, children, className = "", a = "left" }) {
  const col = st && st.cols.find((c) => c.key === k);
  if (!col) return <span className={className}>{children}</span>;
  const puedeOrdenar = !col.noSort && !!(col.sortVal || col.get);
  const puedeFiltrar = !col.noFilter && !!col.get;
  const on = st.sortCol === k;
  const valor = (st.colFilters && st.colFilters[k]) || "";
  const filtrando = !!valor.trim();
  const abierto = puedeFiltrar && (st.activeCol === k || filtrando);
  const label = typeof children === "string" ? children : col.label;
  const cerrar = () => { if (!valor.trim()) st.setActiveCol(null); };
  return (
    <span className={`dc-th${on ? " is-sort" : ""}${filtrando ? " is-filt" : ""} ${className}`} style={{ justifyContent: a === "right" ? "flex-end" : a === "center" ? "center" : "flex-start" }}>
      {abierto ? (
        <span className="dc-th__in">
          <Search size={12} strokeWidth={2.2} />
          <input autoFocus={st.activeCol === k} value={valor} placeholder={label} aria-label={`Filtrar ${label}`}
            onChange={(e) => st.setColFilters((f) => ({ ...f, [k]: e.target.value }))}
            onBlur={cerrar}
            onKeyDown={(e) => {
              if (e.key === "Escape") { st.setColFilters((f) => { const n = { ...f }; delete n[k]; return n; }); st.setActiveCol(null); e.currentTarget.blur(); }
              if (e.key === "Enter") { st.setActiveCol(null); e.currentTarget.blur(); }
            }} />
          {filtrando && <button type="button" className="dc-th__x" aria-label={`Quitar filtro de ${label}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { st.setColFilters((f) => { const n = { ...f }; delete n[k]; return n; }); st.setActiveCol(null); }}><X size={11} strokeWidth={2.4} /></button>}
        </span>
      ) : (
        <button type="button" className="dc-th__lbl" disabled={!puedeFiltrar} title={puedeFiltrar ? `Escribe para filtrar por ${String(label).toLowerCase()}` : undefined} onClick={() => puedeFiltrar && st.setActiveCol(k)}>{children}</button>
      )}
      {puedeOrdenar && (
        <button type="button" className="dc-col-sort" aria-label={`Ordenar por ${label}`} title="Ordenar"
          aria-sort={on ? (st.sortDir === "asc" ? "ascending" : "descending") : "none"} onClick={() => st.toggleSort(k)}>
          {on ? (st.sortDir === "asc" ? <ChevronUp size={13} strokeWidth={2.4} /> : <ChevronDown size={13} strokeWidth={2.4} />) : <ArrowUpDown size={11} strokeWidth={2} />}
        </button>
      )}
    </span>
  );
}
/* Barra de las listas: cuántos hay y un buscador. Reemplaza la fila de
   pastillas por columna, que repetía la tabla y no se entendía. En modo tabla el orden
   lo hacen los encabezados y aquí queda sólo el buscador. */
export function FiltroCabecera({ st, total, filtradas, sub = "registros", className = "", extra = null, modoTabla = false, exportar = null }) {
  const { cols, q, setQ } = st;
  // Sin «Ordenar»: las tarjetas van siempre en orden alfabético (ListaFiltrable) y en la
  // vista Tabla se ordena con los encabezados.
  const buscable = !modoTabla && total > 6 && cols.some((c) => !c.noFilter && c.get);
  if (!buscable && !extra && !exportar) return null;
  return (
    <div className={`dc-fcab ${className}`}>
      <span className="dc-fcab__cant"><b>{filtradas}</b> {sub}{q.trim() ? ` de ${total}` : ""}</span>
      {buscable && (
        <label className="dc-fcab__buscar">
          <Search size={14} strokeWidth={2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar en ${sub}…`} aria-label={`Buscar en ${sub}`}
            onKeyDown={(e) => { if (e.key === "Escape" && q) { e.preventDefault(); setQ(""); } }} />
          {q && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQ("")}><X size={13} strokeWidth={2.2} /></button>}
        </label>
      )}
      {(extra || exportar) && <div className="dc-fcab__extra">{extra}{exportar && <BotonExportar {...exportar} sub={sub} />}</div>}
    </div>
  );
}

/* Selector de forma de ver una lista (tarjetas, lista, tabla, por estado…). Cada
   pantalla ofrece las que le sirven y se recuerda la que elige cada persona.
   opciones: [{ id, label, icon }] */
export function SelectorVista({ opciones = [], valor, onChange }) {
  if (opciones.length < 2) return null;
  return (
    <div className="dc-vsel" role="tablist" aria-label="Forma de ver">
      {opciones.map(({ id, label, icon: Ic }) => (
        <button key={id} type="button" role="tab" aria-selected={valor === id} className={valor === id ? "is-on" : ""} title={`Ver como ${label.toLowerCase()}`} onClick={() => onChange(id)}>
          {Ic && <Ic size={14} strokeWidth={2} />}<span>{label}</span>
        </button>
      ))}
    </div>
  );
}
export function useVista(clave, opciones) {
  const [v, setV] = usePersist("vista_" + clave, opciones[0]?.id);
  let valor = opciones.some((o) => o.id === v) ? v : opciones[0]?.id;
  // En celular una tabla ancha obliga a desplazarse de lado: si hay tarjetas, se usan.
  const movil = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
  if (movil && valor === "tabla") { const alt = opciones.find((o) => o.id !== "tabla"); if (alt) valor = alt.id; }
  return [valor, setV];
}

/* Envoltorio para listas en tarjetas: pone la cabecera de filtros y entrega la lista
   ya filtrada y ordenada a children(lista, vista). Con `vistas` y `vistaClave` suma el
   selector de forma de ver. Es componente (no hook suelto) para poder usarse dentro de
   ramas condicionales sin romper el orden de los hooks. */
/* Celda de persona para tablas: iniciales en su color, nombre y dato secundario. */
/* Pestañas de una página (Caja, Reportes, Usuarios y permisos, Satisfacción…).
   opciones: [{ id, label, icon, badge }]. */
export function Pestanas({ opciones = [], valor, onChange, etiqueta = "Secciones" }) {
  const lista = opciones.filter(Boolean);
  if (lista.length < 2) return null;
  return (
    <nav className="dc-pest" role="tablist" aria-label={etiqueta}>
      {lista.map((o) => { const Ic = o.icon; const on = valor === o.id; return (
        <button key={o.id} type="button" role="tab" aria-selected={on} className={on ? "is-on" : ""} onClick={() => onChange(o.id)}>
          {Ic && <Ic size={14} strokeWidth={2} />} {o.label}{o.badge ? <em>{o.badge}</em> : null}
        </button>
      ); })}
    </nav>
  );
}

/* Chip de estado único (spec R4): misma etiqueta y mismo color en toda la app. */
export function EstadoPill({ entidad, estado, children }) {
  const e = estadoInfo(entidad, estado);
  return <span className="dc-pill" style={{ "--c": e.color }}><i /> {children || e.label}</span>;
}

export function PersonaCelda({ nombre, sub, size = 34 }) {
  const col = colorDe(nombre || "");
  return (
    <span className="dc-tp__quien">
      <span className="dc-rec__av" style={{ width: size, height: size, fontSize: size > 36 ? 13 : 12, background: `linear-gradient(135deg, ${tint(col, 0.2)}, ${tint(col, 0.08)})`, color: col }}>{iniciales(nombre || "")}</span>
      <span style={{ minWidth: 0 }}><b>{nombre || "—"}</b>{sub ? <small>{sub}</small> : null}</span>
    </span>
  );
}

/* Tabla con el mismo diseño que DataTable (mismas clases: en celular pasa sola a
   tarjetas con la etiqueta de cada dato), pensada para la vista "Tabla" de las listas.
   cols: [{ key, label, w, a:"left"|"center"|"right", get, cell }] */
export function TablaPremium({ cols, rows, onRowClick, minWidth = 640, st = null }) {
  const COL = cols.map((c) => anchoElastico(c, c.w || "minmax(0,1fr)")).join(" ");
  const al = (c) => (c.a === "right" ? "end" : c.a === "center" ? "center" : "start");
  return (
    <div className="dc-table-wrap dc-tp">
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth, width: "100%" }}>
          <div className="dc-table-head" style={{ display: "grid", gridTemplateColumns: COL, gap: 14, padding: "0 18px", alignItems: "center", minHeight: 46 }}>
            {cols.map((c) => <span key={c.key} className="dc-tp__th" style={{ justifySelf: al(c), textAlign: c.a || "left" }}>{st ? <ThOrden st={st} k={c.orden || (st.cols.some((x) => x.key === c.key) ? c.key : (st.cols.find((x) => x.label === c.label) || {}).key)} a={c.a}>{c.label}</ThOrden> : c.label}</span>)}
          </div>
          {rows.map((r, i) => (
            <div key={r.id ?? i} className="dc-table-row dc-tp__row" onClick={onRowClick ? () => onRowClick(r) : undefined}
              style={{ display: "grid", gridTemplateColumns: COL, gap: 14, alignItems: "center", padding: "12px 18px", cursor: onRowClick ? "pointer" : "default" }}>
              {cols.map((c) => (
                <div key={c.key} data-label={c.label || ""} style={{ minWidth: 0, justifySelf: al(c), textAlign: c.a || "left" }}>
                  {c.cell ? c.cell(r) : <span className="dc-tp__txt">{c.get ? c.get(r) : ""}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListaFiltrable({ rows, cols, defaultSort, sub, className = "", extra = null, vistas = null, vistaClave = "", tabla = null, modoTabla = false, exportTitulo = "", alfabetico = true, children }) {
  // Orden alfabético por el nombre (paciente, doctor, proveedor…) en tarjetas y tabla.
  const colNombre = !alfabetico ? null : cols.find((c) => c.get && /paciente|nombre|doctor|m[eé]dico|odont[oó]logo|proveedor|insumo|servicio|t[ií]tulo/i.test(`${c.key} ${c.label || ""}`)) || null;
  const { lista, st } = useFiltroTabla(rows, cols, colNombre ? { key: colNombre.key, dir: "asc" } : defaultSort);
  // Con `tabla` la lista ofrece también la vista Tabla, con el diseño común del portal.
  const opciones = tabla
    ? (() => { const base = (vistas || [{ id: "tarjetas", label: "Tarjetas", icon: LayoutGrid }]).filter((v) => v.id !== "tabla"); const t = { id: "tabla", label: "Tabla", icon: Table2 }; return tabla.primero ? [t, ...base] : [...base, t]; })()
    : vistas;
  const [vista, setVista] = useVista(vistaClave || "x", opciones || []);
  vistas = opciones;
  const enTabla = modoTabla || (tabla && vista === "tabla");
  // Tarjetas: siempre alfabético (en la tabla, el encabezado puede reordenar).
  const listaAlfa = useMemo(() => (enTabla || !colNombre ? lista : [...lista].sort((a, b) => String(colNombre.get(a) ?? "").localeCompare(String(colNombre.get(b) ?? ""), "es", { sensitivity: "base", numeric: true }))), [lista, enTabla, colNombre]);
  return (
    <div className={`dc-lf ${className}`}>
      <FiltroCabecera st={st} total={(rows || []).length} filtradas={lista.length} sub={sub} modoTabla={enTabla}
        exportar={exportTitulo !== false && lista.length ? { titulo: exportTitulo || (sub ? sub[0].toUpperCase() + sub.slice(1) : "Reporte"), cols: tabla ? tabla.cols : cols, filas: lista } : null}
        extra={(extra || vistas) ? <>{extra}{vistas && <SelectorVista opciones={vistas} valor={vista} onChange={setVista} />}</> : null} />
      {lista.length === 0 && (rows || []).length > 0
        ? <Vacio icon={<Search size={22} strokeWidth={1.75} />} titulo="Sin resultados" sub="Nada coincide con la búsqueda." />
        : (tabla && vista === "tabla")
          ? <TablaPremium cols={tabla.cols} rows={lista} onRowClick={tabla.onRowClick} minWidth={tabla.minWidth} st={st} />
          : children(listaAlfa, vista, st)}
    </div>
  );
}

/* Columnas equilibradas: un ancho fijo («120px») pasa a ser su mínimo y también
   reparte el espacio sobrante en proporción a ese ancho. Así no queda una columna de
   texto enorme y las cifras apretadas a la derecha. Las fijas (acciones) no cambian. */
export function anchoElastico(c, w) {
  if (!w || c.sticky || c.noSort && c.key === "acc" || c.fijo) return w;
  const m = /^(\d+)px$/.exec(String(w).trim());
  return m ? `minmax(${m[1]}px, ${(Number(m[1]) / 100).toFixed(2)}fr)` : w;
}
export function DataTable({ cols: colsTodas, rows, onRowClick, titulo, sub, empty, minWidth = 720, bare = false, defaultSort, accion, pageSize = 25, maxHeight, rowClassName, buscar = true, exportar = true, exportTitulo = "" }) {
  // Columnas con `soloExport` no se pintan: van solo en el Excel/PDF (p. ej. base e IGV).
  const cols = colsTodas.filter((c) => !c.soloExport);
  const { lista, anyF, limpiar, st } = useFiltroTabla(rows, cols, defaultSort);
  const { sortCol, sortDir, colFilters, q, setQ } = st;
  // Mismo patrón que las listas: un buscador para toda la tabla y el orden en el encabezado.
  const conBuscar = false; // las tablas filtran escribiendo en el nombre de cada columna
  const cajaBuscar = conBuscar ? (
    <label className="dc-fcab__buscar dc-dt__buscar">
      <Search size={14} strokeWidth={2} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar en ${sub || "la tabla"}…`} aria-label={`Buscar en ${sub || "la tabla"}`} onKeyDown={(e) => { if (e.key === "Escape" && q) { e.preventDefault(); setQ(""); } }} />
      {q && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQ("")}><X size={13} strokeWidth={2.2} /></button>}
    </label>
  ) : null;
  const [visible, setVisible] = useState(pageSize);
  useEffect(() => { setVisible(pageSize); }, [rows, pageSize, colFilters, sortCol, sortDir, q]);
  const COL = cols.map((c) => anchoElastico(c, c.w)).join(" ");
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
      {titulo && <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--dc-line)", background: "var(--dc-surface)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h2 className="dc-title" style={{ margin: 0, color: "var(--dc-ink-900)", fontSize: 14, fontWeight: 500 }}>{titulo}</h2><span style={{ fontSize: 12, fontWeight: 500, color: "var(--dc-ink-500)", background: "var(--dc-bg)", borderRadius: 999, padding: "2px 9px" }}>{lista.length} {etiquetaCant(lista.length, sub)}{anyF ? ` de ${(rows || []).length}` : ""}{hayMas ? ` – mostrando ${mostradas.length}` : ""}</span>{anyF && <button type="button" className="dc-dt__limpiar" onClick={limpiar}>Limpiar filtros</button>}</div><div className="dc-dt__acc">{cajaBuscar}{accion}{exportar && lista.length > 0 && <BotonExportar titulo={exportTitulo || titulo} cols={colsTodas} filas={lista} sub={etiquetaCant(lista.length, sub)} />}</div></div>}
      {!titulo && cajaBuscar && <div className="dc-dt__barra"><span className="dc-fcab__cant"><b>{lista.length}</b> {etiquetaCant(lista.length, sub)}{anyF ? ` de ${(rows || []).length}` : ""}</span>{cajaBuscar}</div>}
      <div style={scrollStyle}>
        {/* NAV-07: width fluido (100%) cuando minWidth <= 0 para evitar desborde de 340px;
            width: max-content solo cuando minWidth > 0 explícito exige scroll horizontal. */}
        {/* La tabla ocupa todo el ancho de la tarjeta; minWidth solo fija desde dónde
            aparece el scroll horizontal. Con "max-content" las columnas fr se encogían
            a su contenido y la tabla quedaba más angosta que su tarjeta. */}
        <div style={minWidth > 0 ? { minWidth, width: "100%" } : { width: "100%", minWidth: 0, maxWidth: "100%" }}>
          <div className="dc-table-head" style={{ display: "grid", gridTemplateColumns: COL, gap: 12, padding: "4px 16px", borderBottom: "1px solid var(--dc-line)", background: "var(--dc-bg-soft)", ...(maxHeight ? { position: "sticky", top: 0, zIndex: 3 } : {}) }}>
            {cols.map((col) => {
              const just = col.a === "left" ? "flex-start" : col.a === "right" ? "flex-end" : "center";
              return (
                <div key={col.key} className="dc-dt__th" style={{ display: "flex", alignItems: "center", justifyContent: just, minWidth: 0, minHeight: 34, paddingLeft: col.a === "left" ? 12 : 0, paddingRight: col.a === "right" ? 12 : 0, ...(col.sticky ? stickyHead : {}) }}>
                  {col.noSort ? <span className="dc-dt__lbl">{col.label}</span> : <ThOrden st={st} k={col.key} a={col.a || "center"}>{col.label}</ThOrden>}
                </div>
              );
            })}
          </div>
          {lista.length === 0 ? (rows.length > 0 ? <Vacio icon={<Search size={22} strokeWidth={1.75} />} titulo="Sin resultados" sub="Nada coincide con la búsqueda." /> : (empty || <Vacio icon={<Search size={22} strokeWidth={1.75} />} titulo="Sin registros" sub="Aún no hay datos para mostrar." />)) : mostradas.map((r, i) => { return (
            <div key={r.id ?? i} className={`dc-table-row${rowClassName ? " " + (rowClassName(r) || "") : ""}`} onClick={onRowClick ? () => onRowClick(r) : undefined} style={{ display: "grid", gridTemplateColumns: COL, gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--dc-line)", cursor: onRowClick ? "pointer" : "default", background: "transparent", transition: "background .15s", position: "relative", zIndex: 1, boxSizing: "border-box", width: "100%", maxWidth: "100%", minWidth: 0 }} onMouseEnter={(ev) => { ev.currentTarget.style.background = "var(--dc-bg-soft2)"; }} onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}>
              {cols.map((col) => (
                <div key={col.key} data-label={col.label || ""} data-vacio={col.vacio && col.vacio(r) ? "" : undefined} className={col.sticky ? "dc-col-sticky" : undefined} style={{ minWidth: 0, ...(col.sticky ? stickyCell : {}), ...(col.a === "left" ? { paddingLeft: 12 }
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
/* Botón de imprimir / descargar PDF: el mismo en recetas, boleta, presupuesto, historia
   clínica y odontograma. `solido` para la acción principal de una barra. */
export function BotonPDF({ onClick, children = "Imprimir", solido = false, chico = false, title = "Abre el documento con membrete para imprimir o guardar como PDF", className = "", ...rest }) {
  return (
    <button type="button" onClick={onClick} title={title} className={`dc-btn-pdf${solido ? " is-solido" : ""}${chico ? " is-chico" : ""}${className ? ` ${className}` : ""}`} {...rest}>
      <span className="dc-btn-pdf__ico" aria-hidden="true"><Printer size={chico ? 12 : 14} strokeWidth={2.1} /></span>
      <span className="dc-btn-pdf__txt">{children}</span>
      <em className="dc-btn-pdf__tag" aria-hidden="true">PDF</em>
    </button>
  );
}
export function MenuAcciones({ opciones = [], etiqueta = "Más acciones" }) {
  // La lista va en position:fixed: dentro de una tabla con scroll horizontal una
  // lista absoluta quedaba recortada por el contenedor.
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const lista = opciones.filter(Boolean);
  useEffect(() => {
    if (!pos) return undefined;
    const cerrar = () => setPos(null);
    // Se cierra si el botón se movió (la lista quedaría lejos de su fila), no por el
    // resto de un desplazamiento suave que todavía llega justo después de abrir.
    const y0 = btnRef.current?.getBoundingClientRect().top ?? 0;
    const alDesplazar = () => { const y = btnRef.current?.getBoundingClientRect().top ?? 0; if (Math.abs(y - y0) > 4) cerrar(); };
    window.addEventListener("resize", cerrar);
    document.addEventListener("scroll", alDesplazar, true);
    return () => { window.removeEventListener("resize", cerrar); document.removeEventListener("scroll", alDesplazar, true); };
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
      {/* En el body: un ancestro con transform u overflow (animación de entrada, tabla)
          desplazaba la lista fija y el clic caía sobre la fila de otro paciente. */}
      {pos && createPortal(<>
        <div onClick={(e) => { e.stopPropagation(); setPos(null); }} style={{ position: "fixed", inset: 0, zIndex: 190 }} />
        <div className="dc-menu__lista" role="menu" style={{ position: "fixed", zIndex: 191, top: pos.top, bottom: pos.bottom, right: pos.right }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setPos(null); } }}>
          {lista.map((o) => (
            <button key={o.label} type="button" role="menuitem" className={`dc-menu__op${o.peligro ? " dc-menu__op--peligro" : ""}`} onClick={() => { setPos(null); o.onClick(); }}>{o.label}</button>
          ))}
        </div>
      </>, document.body)}
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
export const PacienteBar = ({ pacientes, pacienteId, setPacienteId, modulo, accion, sedeLabel = null, extra = null, soloAccion = false }) => {
  // Dentro de la ficha el paciente ya está en el encabezado único (GLO-08): solo las acciones.
  if (soloAccion) return accion ? <div className="dc-pbar-acc">{accion}</div> : null;
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
  // Con sesión, solo las alergias que manda el servidor (nunca las fichas de ejemplo).
  const alAPI = Array.isArray(p.alergias) ? p.alergias : (typeof p.alergias === "string" ? p.alergias.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) : []);
  const alergias = alAPI.length || conSesion()
    ? alAPI
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
            {String(p.dni || "").trim() && <span className="dc-chip" style={{ ...chip, color: "var(--dc-ink-700)", background: "var(--dc-bg)" }}>DNI {p.dni}</span>}
            <span className="dc-chip" style={{ ...chip, color: DS.c.primary, background: "var(--dc-accent-soft)", border: "1px solid var(--dc-sky)" }}><MapPin size={11} strokeWidth={1.75} /> {sedeTxt}</span>
            {p.ultima && <span className="dc-chip" style={{ ...chip, color: "var(--dc-ink-400)", background: "var(--dc-bg)" }}><Clock size={11} strokeWidth={1.75} /> Última visita {/^\d{4}-\d{2}-\d{2}/.test(String(p.ultima)) ? fechaLegible(String(p.ultima).slice(0, 10)) : p.ultima}</span>}
            {alergias.length > 0
              ? <span className="dc-chip is-alerta" style={{ ...chip, color: "var(--dc-danger-700)", background: "var(--dc-bg)", border: "1px solid var(--dc-fee)" }}><AlertTriangle size={11} strokeWidth={1.75} /> {alergias.join(", ")}</span>
              : (conSesion() && p.alergias == null ? null : <span className="dc-chip" style={{ ...chip, color: "var(--dc-ink-500)", background: "var(--dc-bg)" }}>Sin alergias</span>)}
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

/* Con sesión no se asume el horario de ejemplo (L–V 9–19): si la clínica configuró algún
   día, el que falta está cerrado; si no configuró ninguno, el día queda «sin configurar»
   (sin restricción de horas) y la Agenda avisa que hay que configurarlo. */
const conSesion = () => { try { return !!localStorage.getItem("dc_token"); } catch (e) { return false; } };
const tieneDias = (h) => !!h && Object.keys(h).some((k) => /^[0-6]$/.test(k) && h[k]);
const diaHorario = (horario, k) => {
  if (horario && horario[k]) return horario[k];
  if (!conSesion()) return HORARIO_DEF[k] || { cerrado: true };
  return tieneDias(horario) ? { cerrado: true } : { abre: "06:00", cierra: "22:00", sinConfigurar: true };
};
/** ¿Hay horario de atención cargado? (sin sesión siempre: vale el de la demostración). */
export const horarioConfigurado = (horario) => !conSesion() || tieneDias(horario);

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

/** ¿El feriado cierra la clínica? El servidor manda los feriados como {fecha, nombre}, sin
 *  horario: un feriado sin horario explícito es día cerrado. Solo abre si se marcó
 *  cerrado:false o trae su propio horario (abre/cierra). */
export function feriadoCerrado(exc) {
  if (!exc) return false;
  if (exc.cerrado === true) return true;
  if (exc.cerrado === false) return false;
  return !(exc.abre && exc.cierra);
}

/** Jornada de un día concreto: el feriado manda sobre el horario semanal. */
export function jornadaClinica(horario, feriados, fechaISO) {
  const exc = (feriados || []).find((x) => x && String(x.fecha || "").slice(0, 10) === fechaISO);
  const nota = exc ? (exc.nota || exc.nombre || "") : "";
  if (exc) return feriadoCerrado(exc) ? { abierta: false, feriado: true, nota }
    : { abierta: true, abre: exc.abre || "09:00", cierra: exc.cierra || "13:00", feriado: true, nota };
  const k = String(new Date(fechaISO + "T00:00:00").getDay());
  const d = diaHorario(horario, k);
  return d.cerrado ? { abierta: false } : { abierta: true, abre: d.abre || "09:00", cierra: d.cierra || "19:00" };
}

/** ¿Abre ese día de la semana? (0 domingo … 6 sábado) */
export function abreDiaSemana(horario, dow) {
  const d = diaHorario(horario, String(dow));
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
    const c = diaHorario(horario, String(d));
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
    <div ref={cajaRef} className={`dc-sel${abierto ? " is-open" : ""}${small ? " is-sm" : ""}`} style={{ position: "relative", width: width || "100%", display: "inline-block", zIndex: abierto ? 200 : undefined }}>
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
        <div role="listbox" ref={listaRef} onKeyDown={teclado} tabIndex={-1} className={`dc-sel__panel${haciaArriba ? " is-arriba" : ""}`}
          style={{
            position: "absolute", zIndex: 200, left: 0, right: 0,
            [haciaArriba ? "bottom" : "top"]: "calc(100% + 6px)",
            background: "var(--dc-white)", border: `1px solid ${DS.c.line}`, borderRadius: DS.r.sub,
            boxShadow: DS.sh.md, padding: 5, maxHeight: 280, overflowY: "auto",
            animation: "dcSelectIn .14s ease",
          }}>
          {buscador && (
            <div style={{ position: "sticky", top: -5, background: "var(--dc-white)", padding: "1px 1px 6px", zIndex: 1 }}>
              <input ref={buscaRef} className="dc-sel__buscar" value={filtro} onChange={(e) => { setFiltro(e.target.value); setMarcado(0); }}
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
              <div key={`${o.value}-${i}`} role="option" aria-selected={sel} className={`dc-sel__opt${sel ? " is-sel" : ""}${activo && !o.disabled ? " is-act" : ""}${o.disabled ? " is-off" : ""}`}
                onMouseEnter={() => setMarcado(i)}
                onPointerDown={(e) => { if (o.disabled) return; e.preventDefault(); elegir(o); }}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 11px",
                  borderRadius: DS.r.item - 4, cursor: o.disabled ? "not-allowed" : "pointer",
                  touchAction: "manipulation",
                  background: sel ? DS.c.primarySoft : activo && !o.disabled ? "#F0F8F8" : "transparent",
                  color: o.disabled ? DS.c.faint : sel ? DS.c.primary : DS.c.text,
                  fontSize: 13, fontWeight: sel ? 700 : 600,
                  opacity: o.disabled ? 0.6 : 1,
                }}>
                {o.icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{o.icon}</span>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
                  {o.sub && <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: DS.c.faint }}>{o.sub}</span>}
                </span>
                {sel && <span className="dc-sel__chk"><Check size={12} strokeWidth={3} /></span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
