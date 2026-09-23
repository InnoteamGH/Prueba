// ── Cliente de API del backend DentalCloud ──────────────────────────────────
// Capa única para hablar con el backend Spring Boot. Maneja el token JWT,
// el header Authorization y los errores. El resto del frontend usa `api.*`
// en vez de tener fetch() sueltos por todos lados.
//
// La URL base sale de la variable de entorno de Vite:
//   VITE_API_URL (ej. http://localhost:8080/api  o  https://api.tu-dominio.com/api)
// Si no está definida, cae a localhost para desarrollo.

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/$/, "");
const TOKEN_KEY = "dc_token";
const CLINICAL_KEYS = ["dc_data_v1_pacientes", "dc_data_v1_fichas", "dc_data_v1_citas"];
/** NEW-59 / ODO-01: forma UUID 8-4-4-4-12 (incluye seeds nil v0). Rechaza demo `"1"` / `1`. */
const UUID_PACIENTE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function esPacienteIdApi(pacienteId) {
  return typeof pacienteId === "string" && UUID_PACIENTE.test(pacienteId);
}

/** Al iniciar sesión, descarta datos clínicos obsoletos del navegador (BUG-001/012). */
export function limpiarCacheClinicaLocal() {
  for (const k of CLINICAL_KEYS) {
    try { localStorage.removeItem(k); } catch { /* */ }
  }
}

/** Verifica si un token JWT está expirado (BUG-113). */
export function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    // JWT exp está en segundos, Date.now() en milisegundos
    return !payload.exp || (payload.exp * 1000) < Date.now();
  } catch {
    return true;
  }
}

/** Decodifica el payload de un JWT (C23: extraer campo sedes). */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

// Peticiones GET en vuelo: evita duplicados (React StrictMode, varios módulos) — BUG-020.
const inflightGet = new Map();

export const auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  set token(v) { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); },
  get sesion() { try { return JSON.parse(localStorage.getItem("dc_sesion") || "null"); } catch { return null; } },
  set sesion(v) { v ? localStorage.setItem("dc_sesion", JSON.stringify(v)) : localStorage.removeItem("dc_sesion"); },
  logout() {
    this.token = null;
    this.sesion = null;
    limpiarCacheClinicaLocal();
    emitirCierreSesion();
  },
};

// Quien quiera enterarse de que una peticion fallo se suscribe aqui. Se usa para
// avisar en pantalla en vez de dejar al usuario mirando datos de ejemplo.
const oyentesFallo = new Set();

// Al abrir la app los modulos piden datos antes de que la cabecera monte su aviso,
// asi que el primer fallo se emitia sin que escuchara nadie. Se guarda para
// entregarselo a quien se suscriba enseguida.
let ultimoFallo = null;
const VENTANA_FALLO_MS = 15000; // pasado esto ya no describe la pantalla actual

export function alFallarPeticion(fn) {
  oyentesFallo.add(fn);
  if (ultimoFallo && Date.now() - ultimoFallo.cuando < VENTANA_FALLO_MS) fn(ultimoFallo);
  return () => oyentesFallo.delete(fn);
}

/** NEW-18: suscriptores cuando la sesión se invalida (401 / logout). */
const oyentesSesion = new Set();
export function alCerrarSesion(fn) {
  oyentesSesion.add(fn);
  return () => oyentesSesion.delete(fn);
}
function emitirCierreSesion() {
  for (const fn of oyentesSesion) { try { fn(); } catch { /* */ } }
}

function avisarFallo(estado, path, mensaje) {
  // 403 = permiso; 0 = no hay servidor; 5xx = el backend se cayo. El resto suele
  // ser una validacion que el modulo ya muestra por su cuenta.
  // /caja sin permiso de facturación es esperado (p. ej. odontólogo en Pacientes):
  // no mostrar banner global que sugiera que los datos son de ejemplo.
  if (estado === 403 && /^\/caja(\/|$|\?)/.test(path || "")) return;
  // NEW-48: 403 de endpoints que el cliente a veces pide de más no deben gritar en rojo.
  if (estado === 403 && /^\/(alertas\/|pacientes(\/|$)|go-live)/.test(path || "")) return;
  if (!(estado === 403 || estado === 0 || estado >= 500)) return;
  ultimoFallo = { estado, path, mensaje, cuando: Date.now() };
  for (const fn of oyentesFallo) { try { fn(ultimoFallo); } catch { /* un oyente roto no rompe la peticion */ } }
}

async function request(method, path, body, extraHeaders) {
  const dedupeKey = method + " " + path;
  if (method === "GET" && inflightGet.has(dedupeKey)) {
    return inflightGet.get(dedupeKey);
  }
  const runOnce = async () => {
  const headers = { "Content-Type": "application/json", ...(extraHeaders || {}) };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // CON-01 / DC-40: «¿backend corriendo?» solo en fallos de red (sin response HTTP).
    throw new ApiError(0, "No se pudo conectar con el servidor. ¿El backend está corriendo?");
  }
  // BUG-113 / NEW-18: sesión expirada → limpiar UI y mensaje en Login
  if (res.status === 401) {
    try { sessionStorage.setItem("dc_sesion_msg", "Tu sesión expiró. Vuelve a iniciar sesión."); } catch { /* */ }
    auth.logout();
    if (!window.__redirecting401) {
      window.__redirecting401 = true;
      avisarFallo(401, path, "Tu sesión expiró. Vuelve a iniciar sesión.");
      setTimeout(() => {
        window.location.hash = "#/login";
        setTimeout(() => { window.__redirecting401 = false; }, 1000);
      }, 800);
    }
    throw new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    // DC-40: mensaje honesto con status + path (no fingir caída de red).
    const base = (data && (data.error || data.message)) || `Error ${res.status}`;
    const msg = `${base} (${res.status} ${method} ${path})`;
    const err = new ApiError(res.status, msg, data);
    err._httpStatus = res.status;
    throw err;
  }
  return data;
  };
  const run = async () => {
    // BE-01 / WA-16: GET hasta 3 intentos ante 502/503/0; backoff desde 800ms (espaciado).
    const maxAttempts = method === "GET" ? 3 : 1;
    let last;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await runOnce();
      } catch (e) {
        last = e;
        const st = e && (e.status || e._httpStatus);
        const retriable = st === 503 || st === 502 || st === 0;
        if (attempt === maxAttempts || !retriable) {
          if (st === 0 || st) avisarFallo(st, path, e.message);
          throw e;
        }
        const delayMs = Math.min(5000, 800 * (2 ** (attempt - 1)));
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw last;
  };
  const promise = run();
  if (method === "GET") {
    inflightGet.set(dedupeKey, promise);
    promise.finally(() => inflightGet.delete(dedupeKey));
  }
  return promise;
}

function safeJson(t) { try { return JSON.parse(t); } catch { return t; } }

export class ApiError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

export const api = {
  base: BASE,
  get: (p) => request("GET", p),
  post: (p, b, opts) => request("POST", p, b, opts?.headers),
  put: (p, b) => request("PUT", p, b),
  patch: (p, b) => request("PATCH", p, b),
  del: (p) => request("DELETE", p),

  // ── Endpoints tipados (se van agregando a medida que se conecta cada módulo) ──
  async login(email, password) {
    const r = await request("POST", "/auth/login", { email, password });
    auth.token = r.token;
    // C23: extraer campo sedes del JWT (admin="all", otros=CSV de UUIDs)
    const payload = parseJwt(r.token);
    const sedes = payload?.sedes || "all";
    auth.sesion = { 
      nombre: r.nombre, 
      rol: r.rol, 
      organizacionId: r.organizacionId, 
      sedeId: r.sedeId,
      sedes  // C23: agregar sedes del JWT
    };
    limpiarCacheClinicaLocal();
    return r;
  },
  me: () => request("GET", "/auth/me"),
  async portalLogin(dni, password) {
    const r = await request("POST", "/auth/portal/login", { dni, password });
    auth.token = r.token;
    auth.sesion = { nombre: r.nombre, rol: "paciente", organizacionId: r.organizacionId, pacienteId: r.pacienteId };
    return r;
  },
  portal: {
    resumen: () => request("GET", `/portal/${auth.sesion?.pacienteId}/resumen`),
    confirmar: (citaId) => request("PATCH", `/portal/citas/${citaId}/confirmar`),
    cancelar: (citaId) => request("PATCH", `/portal/citas/${citaId}/cancelar`),
  },
  citas: {
    // El backend ya aceptaba desde+hasta; solo faltaba pedirselo. Sin rango, el
    // calendario pedia fecha=all y se traia TODO el historico de la clinica.
    listar: (fecha, desde, hasta) => request("GET",
      desde && hasta ? `/citas?desde=${desde}&hasta=${hasta}` : `/citas${fecha ? `?fecha=${fecha}` : ""}`),
    crear: (c) => request("POST", "/citas", c),
    actualizar: (id, c) => request("PUT", `/citas/${id}`, c),
    cambiarEstado: (id, estado, motivo) => request("PATCH", `/citas/${id}/estado?estado=${estado}${motivo ? `&motivo=${encodeURIComponent(motivo)}` : ""}`),
    checkin: (id) => request("PATCH", `/citas/${id}/checkin`),
    comprobante: (id) => request("POST", `/citas/${id}/comprobante`),
    enviarConfirmaciones: (fecha) => request("POST", `/citas/enviar-confirmaciones${fecha ? `?fecha=${fecha}` : ""}`),
  },
  pacientes: {
    listar: () => request("GET", "/pacientes"),
    ver: (id) => request("GET", `/pacientes/${id}`),
    crear: (p) => request("POST", "/pacientes", p),
    actualizar: (id, p) => request("PUT", `/pacientes/${id}`, p),
    activarPortal: (id, password) => request("PATCH", `/pacientes/${id}/portal`, { password }),
    tieneHistoria: (id) => request("GET", `/pacientes/${id}/tiene-historia`),
    eliminar: (id) => request("DELETE", `/pacientes/${id}`),
    campana: (ids, mensaje) => request("POST", "/pacientes/campana", { ids, mensaje }),
    ficha360: (id) => request("GET", `/pacientes/${id}/ficha360`),
    // Ultima visita + proxima cita por paciente, agregado en la BD. Sustituye al
    // citas.listar("all"), que traia todo el historico de la clinica al navegador.
    resumenCitas: () => request("GET", "/pacientes/resumen-citas"),
    // Plan total / pagado / saldo por paciente (pacientes:ver). Alinea directorio con Caja.
    resumenFinanciero: () => request("GET", "/pacientes/resumen-financiero"),
    resumen: () => request("GET", "/pacientes/resumen"),
  },
  agente: {
    metricas: () => request("GET", "/whatsapp/metricas"),
    getInstrucciones: () => request("GET", "/whatsapp/instrucciones"),
    setInstrucciones: (payload) => request("PUT", "/whatsapp/instrucciones", typeof payload === "string" ? { instrucciones: payload } : payload),
    salud: () => request("GET", "/whatsapp/salud"),
    conexion: () => request("GET", "/whatsapp/conexion"),
  },
  goLive: () => request("GET", "/go-live"),
  clinica: {
    get: () => request("GET", "/clinica"),
    actualizar: (d) => request("PUT", "/clinica", d),
    impresion: (sedeId) =>
      request("GET", `/clinica/impresion${sedeId ? `?sedeId=${sedeId}` : ""}`),
    planSueltos: () => request("GET", "/clinica/plan-sueltos"),
  },
  promociones: {
    listar: () => request("GET", "/promociones"),
    crear: (p) => request("POST", "/promociones", p),
    actualizar: (id, p) => request("PUT", `/promociones/${id}`, p),
    borrar: (id) => request("DELETE", `/promociones/${id}`),
  },
  catalogo: {
    especialidades: () => request("GET", "/especialidades"),
    medicos: (especialidadId) => request("GET", `/medicos${especialidadId ? `?especialidadId=${especialidadId}` : ""}`),
    crearEspecialidad: (e) => request("POST", "/especialidades", e),
    actualizarEspecialidad: (id, e) => request("PUT", `/especialidades/${id}`, e),
    crearMedico: (m) => request("POST", "/medicos", m),
    actualizarMedico: (id, m) => request("PUT", `/medicos/${id}`, m),
    // La meta va por su propia ruta y su propio permiso ("metas"), no por
    // "config": quien fija metas es gerencia, que no administra la clinica.
    fijarMeta: (id, metaMensual) => request("PUT", `/medicos/${id}/meta`, { metaMensual }),
  },
  disponibilidad: {
    listar: (medicoId) => request("GET", `/disponibilidad${medicoId ? `?medicoId=${medicoId}` : ""}`),
    crear: (d) => request("POST", "/disponibilidad", d),
    guardarMi: (payload) => request("PUT", "/disponibilidad/mi", payload),
    borrar: (id) => request("DELETE", `/disponibilidad/${id}`),
  },
  permisos: {
    matriz: () => request("GET", "/permisos"),
    roles: () => request("GET", "/roles"),
    guardar: (d) => request("PUT", "/permisos", d),
  },
  usuarios: {
    listar: () => request("GET", "/usuarios"),
    crear: (u) => request("POST", "/usuarios", u),
    actualizar: (id, u) => request("PUT", `/usuarios/${id}`, u),
    desactivar: (id) => request("DELETE", `/usuarios/${id}`),
  },
  sedes: {
    listar: () => request("GET", "/sedes"),
    crear: (s) => request("POST", "/sedes", s),
    actualizar: (id, s) => request("PUT", `/sedes/${id}`, s),
  },
  tratamientos: {
    porPaciente: (pacienteId) => {
      if (!esPacienteIdApi(pacienteId)) return Promise.resolve([]);
      return request("GET", `/tratamientos?pacienteId=${pacienteId}`);
    },
    crearPlan: (p) => request("POST", "/tratamientos", p),
    agregarFase: (planId, f) => request("POST", `/tratamientos/${planId}/fases`, f),
    actualizarFase: (id, f) => request("PATCH", `/tratamientos/fases/${id}`, f),
    borrarFase: (id) => request("DELETE", `/tratamientos/fases/${id}`),
    desdeOdontograma: (pacienteId) => request("POST", `/tratamientos/desde-odontograma?pacienteId=${pacienteId}`),
    resumen: (desde, hasta, { especialidadId, areaClinica } = {}) => {
      const q = new URLSearchParams();
      if (desde) q.set("desde", desde);
      if (hasta) q.set("hasta", hasta);
      if (especialidadId) q.set("especialidadId", especialidadId);
      if (areaClinica) q.set("areaClinica", areaClinica);
      const qs = q.toString();
      return request("GET", `/tratamientos/resumen${qs ? `?${qs}` : ""}`);
    },
  },
  pacientesResumen: () => request("GET", "/pacientes/resumen"),
  actividad: (fecha) => request("GET", `/actividad${fecha ? `?fecha=${fecha}` : ""}`),
  odontograma: {
    porPaciente: (pacienteId, fase) => {
      if (!esPacienteIdApi(pacienteId)) return Promise.resolve([]);
      return request("GET", `/odontograma?pacienteId=${pacienteId}${fase ? `&fase=${fase}` : ""}`);
    },
    guardar: (pieza) => request("PUT", "/odontograma", pieza),
    tomaHash: (pacienteId, fase) => {
      if (!esPacienteIdApi(pacienteId)) return Promise.resolve({ tomaHash: null });
      return request("GET", `/odontograma/toma-hash?pacienteId=${pacienteId}${fase ? `&fase=${fase}` : ""}`);
    },
  },
  planes: {
    crear: (body) => request("POST", "/planes", body),
    documento: (id) => request("GET", `/planes/${id}/documento`),
  },
  historia: {
    porPaciente: (pacienteId) => {
      if (!esPacienteIdApi(pacienteId)) return Promise.resolve([]);
      return request("GET", `/historia?pacienteId=${pacienteId}`);
    },
    crear: (h) => request("POST", "/historia", h),
    actualizar: (id, h) => request("PUT", `/historia/${id}`, h),
  },
  perio: {
    porPaciente: (pacienteId) => {
      if (!esPacienteIdApi(pacienteId)) return Promise.resolve([]);
      return request("GET", `/periodontograma?pacienteId=${pacienteId}`);
    },
    guardar: (p) => request("PUT", "/periodontograma", p),
  },
  bloqueos: {
    listar: () => request("GET", "/bloqueos"),
    crear: (b) => request("POST", "/bloqueos", b),
    eliminar: (id) => request("DELETE", `/bloqueos/${id}`),
  },
  ausencias: {
    listar: () => request("GET", "/ausencias"),
    crear: (b) => request("POST", "/ausencias", b),
  },
  monedas: {
    listar: () => request("GET", "/monedas"),
  },
  tipoCambio: {
    get: () => request("GET", "/tipo-cambio"),
    actualizar: (tipoCambio) => request("PUT", "/tipo-cambio", { tipoCambio }),
  },
  sillones: {
    listar: (sedeId) => request("GET", `/sillones${sedeId ? `?sedeId=${sedeId}` : ""}`),
  },
  egresos: {
    listar: () => request("GET", "/egresos"),
    crear: (e) => request("POST", "/egresos", e),
    eliminar: (id) => request("DELETE", `/egresos/${id}`),
  },
  espera: {
    listar: () => request("GET", "/espera"),
    crear: (e) => request("POST", "/espera", e),
    resolver: (id) => request("DELETE", `/espera/${id}`),
  },
    pagos: {
    listar: (pacienteId) => request("GET", `/pagos${pacienteId ? `?pacienteId=${pacienteId}` : ""}`),
    historial: () => request("GET", "/pagos/historial"),
    registrar: (p, opts) => request("POST", "/pagos", p, opts?.headers),
    cierre: (fecha) => request("GET", `/pagos/cierre${fecha ? `?fecha=${fecha}` : ""}`),
    anular: (id, body) => request("POST", `/pagos/${id}/anular`, body || {}),
    enviarWa: (id) => request("POST", `/pagos/${id}/enviar-wa`),
    // Niubiz: crear sesión de pago (paso A) y confirmar tras el checkout (paso B)
    niubizSesion: (monto, email) => request("POST", "/pagos/niubiz/sesion", { monto, email }),
    niubizConfirmar: (d) => request("POST", "/pagos/niubiz/confirmar", d),
  },
  // ── RENIEC (autocompletar DNI vía proxy del backend) ──
  reniec: (dni) => request("GET", `/reniec/${dni}`),
  rucLookup: (ruc) => request("GET", `/reniec/ruc/${ruc}`),
  // ── Registro de clínica (signup) ──
  registro: (datos) => request("POST", "/auth/registro", datos),
  // ── Grupo A ──
  comisiones: (desde, hasta) => request("GET", `/comisiones${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ""}`),
  /** Pagos de comisión al odontólogo (DEV-08). Distinto de liquidación de seguros. */
  comisionesPagos: {
    listar: () => request("GET", "/comisiones/pagos"),
    registrar: (body) => request("POST", "/comisiones/pagos", body),
  },
  // Numeros del medico en sesion. Devuelve { esMedico: false } si el usuario no atiende.
  miProduccion: () => request("GET", "/mi-produccion"),
  gerencial: () => request("GET", "/gerencial/kpis"),
  // Indicadores de gestion calculados sobre la base: conversion de presupuestos,
  // deuda por antiguedad, ocupacion de agenda y estado de la cartera.
  gerencialIndicadores: () => request("GET", "/gerencial/indicadores"),
  gerencialReportes: () => request("GET", "/gerencial/reportes"),
  gerencialProduccion: (desde, hasta) => request("GET", `/gerencial/produccion${desde ? `?desde=${desde}&hasta=${hasta}` : ""}`),
  evolucionesPendientes: () => request("GET", "/alertas/evoluciones-pendientes"),
  caja: () => request("GET", "/caja"),
  cajaApertura: {
    get: (sedeId, fecha) => request("GET", `/caja/apertura?sedeId=${encodeURIComponent(sedeId)}${fecha ? `&fecha=${fecha}` : ""}`),
    historial: (params = {}) => {
      const q = new URLSearchParams();
      if (params.sedeId) q.set("sedeId", params.sedeId);
      if (params.desde) q.set("desde", params.desde);
      if (params.hasta) q.set("hasta", params.hasta);
      const qs = q.toString();
      return request("GET", `/caja/apertura/historial${qs ? `?${qs}` : ""}`);
    },
    abrir: (body) => request("POST", "/caja/apertura", body),
    cerrar: (id, body) => request("POST", `/caja/apertura/${id}/cerrar`, body || {}),
    cerrarPorSede: (body) => request("POST", "/caja/apertura/cerrar", body),
  },
  cajaMovimientos: {
    listar: (aperturaId) => request("GET", `/caja/movimientos?aperturaId=${encodeURIComponent(aperturaId)}`),
    crear: (body) => request("POST", "/caja/movimientos", body),
  },
  conversaciones: {
    listar: () => request("GET", "/conversaciones"),
    mensajes: (id) => request("GET", `/conversaciones/${id}/mensajes`),
    crear: (c) => request("POST", "/conversaciones", c),
    enviar: (id, m) => request("POST", `/conversaciones/${id}/mensajes`, m),
    simular: (id, texto) => request("POST", `/conversaciones/${id}/simular`, { texto }),
    modo: (id, modo) => request("PATCH", `/conversaciones/${id}/modo?modo=${modo}`),
    eliminar: (id) => request("DELETE", `/conversaciones/${id}`),
  },
  notificaciones: {
    listar: () => request("GET", "/notificaciones"),
    crear: (n) => request("POST", "/notificaciones", n),
  },
  automatizaciones: {
    listar: () => request("GET", "/automatizaciones"),
    actualizar: (clave, cfg) => request("PUT", `/automatizaciones/${clave}`, cfg),
    historial: () => request("GET", "/automatizaciones/historial"),
    recallPendientes: () => request("GET", "/automatizaciones/recall-pendientes"),
    enviarRecall: (pacienteId) => request("POST", `/automatizaciones/recall/${pacienteId}`),
    probar: (clave, telefono) => request("POST", `/automatizaciones/${clave}/probar`, { telefono }),
    probarHsm: (clave, telefono) => request("POST", `/automatizaciones/${clave}/probar-hsm`, { telefono }),
  },
  auditoria: () => request("GET", "/auditoria"),
  // ── Grupo B (módulos operativos/clínicos) ──
  inventario: {
    listar: () => request("GET", "/inventario"),
    crear: (i) => request("POST", "/inventario", i),
    actualizar: (id, i) => request("PUT", `/inventario/${id}`, i),
    borrar: (id) => request("DELETE", `/inventario/${id}`),
  },
  laboratorio: {
    listar: (pacienteId) => request("GET", `/laboratorio${pacienteId ? `?pacienteId=${pacienteId}` : ""}`),
    crear: (o) => request("POST", "/laboratorio", o),
    actualizar: (id, o) => request("PATCH", `/laboratorio/${id}`, o),
    borrar: (id) => request("DELETE", `/laboratorio/${id}`),
  },
  seguros: {
    listar: () => request("GET", "/seguros"),
    crear: (s) => request("POST", "/seguros", s),
    actualizar: (id, s) => request("PATCH", `/seguros/${id}`, s),
    borrar: (id) => request("DELETE", `/seguros/${id}`),
  },
  formularios: {
    listar: () => request("GET", "/formularios"),
    crear: (f) => request("POST", "/formularios", f),
    respuestas: (pacienteId) => request("GET", `/formularios/respuestas?pacienteId=${pacienteId}`),
    responder: (r) => request("POST", "/formularios/respuestas", r),
    borrar: (id) => request("DELETE", `/formularios/${id}`),
    // Envíos con estado (pendiente/completado)
    envios: () => request("GET", "/formularios/envios"),
    enviar: (e) => request("POST", "/formularios/envios", e),
    recordar: (id) => request("PATCH", `/formularios/envios/${id}/recordar`),
    completar: (id, respuestas) => request("PATCH", `/formularios/envios/${id}/completar`, respuestas ? { respuestas } : {}),
    borrarEnvio: (id) => request("DELETE", `/formularios/envios/${id}`),
  },
  // Ordenes de compra a proveedor. El stock solo se toca al RECIBIR la orden:
  // hasta que la caja no llega, ese material no esta en la clinica.
  ordenesCompra: {
    listar: () => request("GET", "/ordenes-compra"),
    crear: (o) => request("POST", "/ordenes-compra", o),
    enviar: (id) => request("PATCH", `/ordenes-compra/${id}/enviar`),
    recibir: (id) => request("PATCH", `/ordenes-compra/${id}/recibir`),
    anular: (id) => request("PATCH", `/ordenes-compra/${id}/anular`),
  },
  consentimientos: {
    listar: (pacienteId) => request("GET", `/consentimientos${pacienteId ? `?pacienteId=${pacienteId}` : ""}`),
    crear: (c) => request("POST", "/consentimientos", c),
    // firmante: solo para menores. El backend lo EXIGE si el paciente lo es
    // (un nino no consiente por si mismo) y lo ignora si es adulto.
    firmar: (id, firmaUrl, firmante) => request("PATCH", `/consentimientos/${id}/firmar`, { firmaUrl, ...(firmante || {}) }),
    borrar: (id) => request("DELETE", `/consentimientos/${id}`),
  },
  recetas: {
    listar: (pacienteId) => request("GET", `/recetas${pacienteId ? `?pacienteId=${pacienteId}` : ""}`),
    crear: (r) => request("POST", "/recetas", r),
    borrar: (id) => request("DELETE", `/recetas/${id}`),
  },
  radiografias: {
    porPaciente: (pacienteId) => {
      if (!esPacienteIdApi(pacienteId)) return Promise.resolve([]);
      return request("GET", `/radiografias?pacienteId=${pacienteId}`);
    },
    crear: (r) => request("POST", "/radiografias", r),
    borrar: (id) => request("DELETE", `/radiografias/${id}`),
  },
  fotos: {
    porPaciente: (pacienteId) => {
      if (!esPacienteIdApi(pacienteId)) return Promise.resolve([]);
      return request("GET", `/fotos?pacienteId=${pacienteId}`);
    },
    crear: (r) => request("POST", "/fotos", r),
    borrar: (id) => request("DELETE", `/fotos/${id}`),
  },
  cie10: {
    buscar: (q) => request("GET", `/cie10${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  },
  ortodoncia: {
    porPaciente: (pacienteId) => {
      if (!esPacienteIdApi(pacienteId)) return Promise.resolve([]);
      return request("GET", `/ortodoncia?pacienteId=${pacienteId}`);
    },
    crear: (c) => request("POST", "/ortodoncia", c),
    borrar: (id) => request("DELETE", `/ortodoncia/${id}`),
  },
  resenas: {
    listar: () => request("GET", "/resenas"),
    crear: (r) => request("POST", "/resenas", r),
    marcar: (id, respondida) => request("PATCH", `/resenas/${id}`, { respondida }),
  },
};

export default api;
