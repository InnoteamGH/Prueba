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
import { limpiarRegistroSedes } from "../compartido/sedesRegistro";
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

/** Con sesión real no debe quedar nada de la demostración ni de otra cuenta: se borran
    todas las claves dc_* del navegador (datos, emisor, tipo de cambio, correlativos, cajas,
    tomas del odontograma…) salvo la sesión y las preferencias de pantalla. */
const CONSERVAR = /^dc_(token|sesion|sesion_msg|usuario|entro|vista_|fm_tab|wa_info_oculta)/;
export function limpiarDatosLocales({ conservarSedes = false } = {}) {
  try {
    Object.keys(localStorage).forEach((k) => {
      if (!k.startsWith("dc_") || CONSERVAR.test(k)) return;
      if (conservarSedes && k === "dc_sedes_registro") return;
      localStorage.removeItem(k);
    });
  } catch { /* sin almacenamiento */ }
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
    // Sesión real: se borra lo clínico que pudiera quedar en el navegador. En la
    // demostración los datos son de ejemplo y se conservan, para poder seguir el flujo
    // entre roles (recepción agenda, la doctora atiende, caja cobra).
    const eraReal = !!this.token;
    this.token = null;
    this.sesion = null;
    if (eraReal) { limpiarCacheClinicaLocal(); limpiarDatosLocales(); limpiarRegistroSedes(); }
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

function avisarFallo(estado, path, mensaje, method = "GET") {
  // Un 403 al LEER no levanta el aviso global: casi siempre es una llamada de fondo (p. ej.
  // /clinica/impresion o los saldos) y el banner rojo quedaba en todas las pantallas. Cada
  // pantalla que lista algo muestra «Sin permiso para ver…» donde falta el dato.
  if (estado === 403 && method === "GET") return;
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

/** Query string con los parámetros que tienen valor; las listas van separadas por comas. */
function conQuery(o) {
  const q = Object.entries(o || {}).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}=${encodeURIComponent(Array.isArray(v) ? v.join(",") : v)}`);
  return q.length ? `?${q.join("&")}` : "";
}

/* Horario de la clínica: el servidor lo guarda por nombre de día
   ({ lunes: { activo, abre, cierra }, … }) y el frontend trabaja con índices 0–6
   (0 = domingo; { abre, cierra } o { cerrado: true }). Se traduce aquí, al leer y al
   guardar, para que ninguna pantalla vea el otro formato. Antes el horario real se
   ignoraba (Configuración mostraba 09–19 y al guardar lo pisaba). */
const DIAS_SRV = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const sinTilde = (k) => String(k).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function diasDeServidor(h) {
  const out = {};
  Object.entries(h || {}).forEach(([k, v]) => {
    const i = DIAS_SRV.indexOf(sinTilde(k));
    if (i < 0) { out[k] = v; return; }
    out[String(i)] = !v || v.activo === false || v.cerrado ? { cerrado: true } : { abre: v.abre, cierra: v.cierra };
  });
  return out;
}
export function horarioDeServidor(h) {
  if (!h || typeof h !== "object") return h;
  const out = diasDeServidor(h);
  if (h.sedes && typeof h.sedes === "object") out.sedes = Object.fromEntries(Object.entries(h.sedes).map(([k, v]) => [k, diasDeServidor(v)]));
  return out;
}
function diasAlServidor(h) {
  const out = {};
  Object.entries(h || {}).forEach(([k, v]) => {
    if (/^[0-6]$/.test(k)) out[DIAS_SRV[Number(k)]] = !v || v.cerrado ? { activo: false, abre: "00:00", cierra: "00:00" } : { activo: true, abre: v.abre, cierra: v.cierra };
    else if (k !== "sedes") out[k] = v;
  });
  return out;
}
export function horarioAlServidor(h) {
  if (!h || typeof h !== "object") return h;
  const out = diasAlServidor(h);
  if (h.sedes && typeof h.sedes === "object") out.sedes = Object.fromEntries(Object.entries(h.sedes).map(([k, v]) => [k, diasAlServidor(v)]));
  return out;
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
          if (st === 0 || st) avisarFallo(st, path, e.message, method);
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
    // then(ok, err) en lugar de finally: finally devuelve otra promesa que repite el
    // rechazo y, como nadie la escucha, cada GET fallido salía como error no controlado.
    const limpiar = () => inflightGet.delete(dedupeKey);
    promise.then(limpiar, limpiar);
  }
  return promise;
}

function safeJson(t) { try { return JSON.parse(t); } catch { return t; } }

export class ApiError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

/** ¿La petición falló por falta de permiso (403)? Para mostrar «Sin permiso para ver…» en
    vez de una lista vacía que parece real. */
export const esSinPermiso = (e) => !!e && (e.status === 403 || e._httpStatus === 403);

/** Motivo que dio el servidor, sin la coletilla técnica «(409 PATCH /citas/…)». */
export function msgServidor(e, porDefecto = "") {
  const d = e && e.data;
  const m = (d && typeof d === "object" && (d.message || d.error || d.mensaje)) || (e && e.message) || "";
  const limpio = String(m).replace(/\s*\(\d{3} [A-Z]+ [^)]*\)\s*$/, "").trim();
  return limpio || porDefecto;
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
    // Sin el claim no se asume «todas»: decide el rol en App (falla cerrado).
    const sedes = payload?.sedes || null;
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
    // sedeIds (opcional): solo las citas de esas sedes (filtro de sede del menú).
    listar: (fecha, desde, hasta, sedeIds) => request("GET",
      desde && hasta ? `/citas${conQuery({ desde, hasta, sedeIds })}` : `/citas${conQuery({ fecha, sedeIds })}`),
    crear: (c) => request("POST", "/citas", c),
    actualizar: (id, c) => request("PUT", `/citas/${id}`, c),
    cambiarEstado: (id, estado, motivo) => request("PATCH", `/citas/${id}/estado?estado=${estado}${motivo ? `&motivo=${encodeURIComponent(motivo)}` : ""}`),
    checkin: (id) => request("PATCH", `/citas/${id}/checkin`),
    comprobante: (id) => request("POST", `/citas/${id}/comprobante`),
    enviarConfirmaciones: (fecha, sedes) => request("POST", `/citas/enviar-confirmaciones${conQuery({ fecha, sedeIds: sedes })}`),
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
    // sedeIds: saldo solo de lo atendido en esas sedes (lo de otra sede se cobra allá).
    resumenFinanciero: (sedeIds) => request("GET", `/pacientes/resumen-financiero${conQuery({ sedeIds })}`),
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
    get: () => request("GET", "/clinica").then((r) => { if (r && r.horario) r.horario = horarioDeServidor(r.horario); return r; }),
    actualizar: (d) => request("PUT", "/clinica", d && d.horario ? { ...d, horario: horarioAlServidor(d.horario) } : d),
    impresion: (sedeId) =>
      request("GET", `/clinica/impresion${sedeId ? `?sedeId=${sedeId}` : ""}`),
    planSueltos: () => request("GET", "/clinica/plan-sueltos"),
  },
  promociones: {
    // sedes: las que se ven; las promociones de toda la clínica (sin sede) vienen siempre.
    listar: (sedes) => request("GET", `/promociones${conQuery({ sedeIds: sedes })}`),
    crear: (p) => request("POST", "/promociones", p),
    actualizar: (id, p) => request("PUT", `/promociones/${id}`, p),
    borrar: (id) => request("DELETE", `/promociones/${id}`),
  },
  catalogo: {
    especialidades: () => request("GET", "/especialidades"),
    // Catálogo completo de servicios con precio (GET /especialidades solo trae las 5
    // especialidades). Si el servidor aún no tiene la ruta, cae a /especialidades.
    servicios: () => request("GET", "/servicios").catch((e) => { if (e?.status === 404 || e?.status === 405) return request("GET", "/especialidades"); throw e; }),
    medicos: (especialidadId) => request("GET", `/medicos${especialidadId ? `?especialidadId=${especialidadId}` : ""}`),
    crearEspecialidad: (e) => request("POST", "/especialidades", e),
    actualizarEspecialidad: (id, e) => request("PUT", `/especialidades/${id}`, e),
    crearMedico: (m) => request("POST", "/medicos", m),
    actualizarMedico: (id, m) => request("PUT", `/medicos/${id}`, m),
    // La meta va por su propia ruta y su propio permiso ("metas"), no por
    // "config": quien fija metas es gerencia, que no administra la clinica.
    fijarMeta: (id, metaMensual) => request("PUT", `/medicos/${id}/meta`, { metaMensual }),
    // Meta y % de comisión del doctor en una sede (requisitos-minimos.md, punto 42).
    fijarMetaSede: (id, sedeId, body) => request("PUT", `/medicos/${id}/metas/${sedeId}`, body),
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
    listar: (sedes) => request("GET", `/usuarios${conQuery({ sedeIds: sedes })}`),
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
    // sedeIds (opcional): solo lo producido en esas sedes (UUID). Si el servidor aún no
    // filtra por sede, lo ignora y devuelve toda la clínica.
    resumen: (desde, hasta, { especialidadId, areaClinica, sedeIds } = {}) => {
      const q = new URLSearchParams();
      if (desde) q.set("desde", desde);
      if (hasta) q.set("hasta", hasta);
      if (especialidadId) q.set("especialidadId", especialidadId);
      if (areaClinica) q.set("areaClinica", areaClinica);
      if (Array.isArray(sedeIds) && sedeIds.length) q.set("sedeIds", sedeIds.join(","));
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
    crear: (d) => request("POST", "/sillones", d),
    actualizar: (id, d) => request("PUT", `/sillones/${id}`, d),
    // Turnos del día: un sillón asignado a un doctor en una fecha y rango de horas.
    asignaciones: (desde, hasta) => request("GET", `/sillones/asignaciones${desde ? `?desde=${desde}&hasta=${hasta || desde}` : ""}`),
    asignar: (d) => request("POST", "/sillones/asignaciones", d),
    quitarAsignacion: (id) => request("DELETE", `/sillones/asignaciones/${id}`),
  },
  egresos: {
    // q = { sedeIds }: egresos de esas sedes (el cuerpo de crear lleva sedeId).
    listar: (q) => request("GET", `/egresos${conQuery(q)}`),
    crear: (e) => request("POST", "/egresos", e),
    // Reclasificar (categoría) o corregir un egreso. Body parcial: { categoria?, concepto?, monto?, moneda? }
    actualizar: (id, e) => request("PUT", `/egresos/${id}`, e),
    eliminar: (id) => request("DELETE", `/egresos/${id}`),
  },
  espera: {
    listar: (sedeIds) => request("GET", `/espera${conQuery({ sedeIds })}`),
    crear: (e) => request("POST", "/espera", e),
    resolver: (id) => request("DELETE", `/espera/${id}`),
  },
    pagos: {
    listar: (pacienteId) => request("GET", `/pagos${pacienteId ? `?pacienteId=${pacienteId}` : ""}`),
    historial: (q) => request("GET", `/pagos/historial${conQuery(q)}`),
    registrar: (p, opts) => request("POST", "/pagos", p, opts?.headers),
    // Cierre del día de la caja de una sede: q = { sedeIds }.
    cierre: (fecha, q) => request("GET", `/pagos/cierre${conQuery({ fecha: fecha || null, ...(q || {}) })}`),
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
  // sedes: ids que se ven (filtro global o sedes del usuario). El servidor debe filtrar
  // igual aunque no llegue (requisitos-minimos.md, punto 40).
  comisiones: (desde, hasta, sedes) => request("GET", `/comisiones${conQuery({ desde: desde && hasta ? desde : null, hasta: desde && hasta ? hasta : null, sedeIds: sedes })}`),
  /** Pagos de comisión al odontólogo (DEV-08). Distinto de liquidación de seguros. */
  comisionesPagos: {
    listar: () => request("GET", "/comisiones/pagos"),
    registrar: (body) => request("POST", "/comisiones/pagos", body),
  },
  // Numeros del medico en sesion. Devuelve { esMedico: false } si el usuario no atiende.
  miProduccion: (sedes) => request("GET", `/mi-produccion${conQuery({ sedeIds: sedes })}`),
  gerencial: (sedes) => request("GET", `/gerencial/kpis${conQuery({ sedeIds: sedes })}`),
  // Indicadores de gestion calculados sobre la base: conversion de presupuestos,
  // deuda por antiguedad, ocupacion de agenda y estado de la cartera.
  gerencialIndicadores: (sedes) => request("GET", `/gerencial/indicadores${conQuery({ sedeIds: sedes })}`),
  gerencialReportes: (sedes) => request("GET", `/gerencial/reportes${conQuery({ sedeIds: sedes })}`),
  gerencialProduccion: (desde, hasta) => request("GET", `/gerencial/produccion${desde ? `?desde=${desde}&hasta=${hasta}` : ""}`),
  evolucionesPendientes: (sedes) => request("GET", `/alertas/evoluciones-pendientes${conQuery({ sedeIds: sedes })}`),
  // q = { sedeIds }: saldos, terminados y cobros de hoy de esas sedes (sin q, todas las del usuario).
  caja: (q) => request("GET", `/caja${conQuery(q)}`),
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
  // Facturación electrónica (proveedor OSE/PSE). Nuevo en el backend: ver docs/requisitos-minimos.md.
  sunat: {
    config: () => request("GET", "/facturacion-electronica/config"),
    guardarConfig: (cfg) => request("PUT", "/facturacion-electronica/config", cfg),
    probar: (cfg) => request("POST", "/facturacion-electronica/probar", cfg),
    comprobantes: (desde, hasta, q) => request("GET", `/facturacion-electronica/comprobantes${conQuery({ desde: desde || null, hasta: desde ? (hasta || desde) : null, ...(q || {}) })}`),
    reenviar: (id) => request("POST", `/facturacion-electronica/comprobantes/${encodeURIComponent(id)}/reenviar`),
    notaCredito: (id, d) => request("POST", `/facturacion-electronica/comprobantes/${encodeURIComponent(id)}/nota-credito`, d),
  },
  automatizaciones: {
    listar: () => request("GET", "/automatizaciones"),
    actualizar: (clave, cfg) => request("PUT", `/automatizaciones/${clave}`, cfg),
    historial: (sedeIds) => request("GET", `/automatizaciones/historial${conQuery({ sedeIds })}`),
    recallPendientes: (sedeIds) => request("GET", `/automatizaciones/recall-pendientes${conQuery({ sedeIds })}`),
    enviarRecall: (pacienteId) => request("POST", `/automatizaciones/recall/${pacienteId}`),
    probar: (clave, telefono) => request("POST", `/automatizaciones/${clave}/probar`, { telefono }),
    probarHsm: (clave, telefono) => request("POST", `/automatizaciones/${clave}/probar-hsm`, { telefono }),
  },
  // Sin parámetros: registro de toda la clínica. Con { pacienteId }: solo los accesos
  // y cambios de esa historia clínica (el servidor puede ignorar el filtro; la ficha
  // vuelve a filtrar por su lado).
  auditoria: (q = {}) => {
    const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v != null && v !== "")).toString();
    return request("GET", `/auditoria${qs ? `?${qs}` : ""}`);
  },
  // ── Grupo B (módulos operativos/clínicos) ──
  inventario: {
    // sedes: UUID de las sedes que se ven (cada sede tiene su almacén); sin sedes = todas las del usuario.
    listar: (sedes) => request("GET", `/inventario${conQuery({ sedeIds: sedes })}`),
    crear: (i) => request("POST", "/inventario", i),
    actualizar: (id, i) => request("PUT", `/inventario/${id}`, i),
    borrar: (id) => request("DELETE", `/inventario/${id}`),
  },
  laboratorio: {
    listar: (pacienteId, sedes) => request("GET", `/laboratorio${conQuery({ pacienteId, sedeIds: sedes })}`),
    crear: (o) => request("POST", "/laboratorio", o),
    actualizar: (id, o) => request("PATCH", `/laboratorio/${id}`, o),
    borrar: (id) => request("DELETE", `/laboratorio/${id}`),
  },
  seguros: {
    listar: (sedes) => request("GET", `/seguros${conQuery({ sedeIds: sedes })}`),
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
    listar: (sedes) => request("GET", `/ordenes-compra${conQuery({ sedeIds: sedes })}`),
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
    listar: (sedeIds) => request("GET", `/resenas${conQuery({ sedeIds })}`),
    crear: (r) => request("POST", "/resenas", r),
    marcar: (id, respondida) => request("PATCH", `/resenas/${id}`, { respondida }),
  },
};

export default api;
